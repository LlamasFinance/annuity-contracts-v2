// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./interfaces/IToken.sol";
import "hardhat/console.sol";

enum Status {
    Pending,
    Active,
    Repaid,
    Closed
}

struct Agreement {
    uint256 deposit; // in lender's token
    uint256 collateral; // in eth
    uint256 repaidAmt; // in lender's token
    uint256 futureValue; // deposit * 1+(rate/100) * duration
    uint256 start; // in seconds
    uint256 duration; // in years
    uint256 rate; // 0-99, using one decimal place. Eg. 99 is 9.9
    Status status;
    address payable lender;
    address payable borrower;
}

error TransferFailed();
error NeedsMoreThanZero();
error NeedsToBeActive();
error NeedsToBeLender();
error NeedsToBeBorrower();

contract Exchange is ReentrancyGuard, Ownable {
    mapping(uint256 => Agreement) public s_idToAgreement;
    mapping(address => uint256[]) public s_accountToIDs;
    uint256 public s_numIDs;
    IToken public s_lenderToken;
    AggregatorV3Interface public s_priceFeed;

    // At 80% Loan to Value Ratio, the loan can be liquidated
    uint256 public constant LIQUIDATION_THRESHOLD = 80;

    event Propose(
        address indexed lender,
        uint256 indexed id,
        uint256 indexed amount
    );
    event Activate(
        address indexed borrower,
        uint256 indexed id,
        uint256 indexed amount
    );
    event AddCollateral(
        address indexed borrower,
        uint256 indexed id,
        uint256 indexed amount
    );
    event Repay(
        address indexed borrower,
        uint256 indexed id,
        uint256 indexed amount
    );
    event Repaid(
        address indexed lender,
        uint256 indexed id,
        uint256 indexed amount
    );
    event WithdrawCollateral(
        address indexed borrower,
        uint256 indexed id,
        uint256 indexed amount
    );
    event Closed(
        address indexed lender,
        address indexed borrower,
        uint256 indexed id
    );
    event Liquidate(address indexed borrower, uint256 remainingValue);
    event Received(address sender, uint256 amount);

    function propose(
        uint256 amount,
        uint256 duration,
        uint256 rate
    ) external nonReentrant moreThanZero(amount) returns (uint256 id) {
        uint256 futureValue = (amount * (1000 + rate) * duration) / 1000;
        Agreement memory newAgreement = Agreement({
            deposit: amount,
            collateral: 0,
            repaidAmt: 0,
            futureValue: futureValue,
            start: 0,
            duration: duration,
            rate: rate,
            status: Status.Pending,
            lender: payable(msg.sender),
            borrower: payable(address(0))
        });
        bool success = s_lenderToken.transferFrom(
            msg.sender,
            address(this),
            amount
        );
        if (!success) revert TransferFailed();

        s_numIDs++;
        id = s_numIDs;
        s_idToAgreement[id] = newAgreement;
        s_accountToIDs[msg.sender].push(id);
        emit Propose(msg.sender, id, amount);
    }

    function activate(uint256 id, uint256 amount)
        external
        payable
        nonReentrant
        moreThanZero(msg.value)
    {
        require(msg.value == amount, "ETH != amount");
        require(amount > getMinReqCollateral(id), "Not enough collateral");
        Agreement storage proposedAgreement = s_idToAgreement[id];
        proposedAgreement.start = block.timestamp;
        proposedAgreement.borrower = payable(msg.sender);
        proposedAgreement.status = Status.Active;
        proposedAgreement.collateral = amount;
        bool success = s_lenderToken.transfer(
            msg.sender,
            proposedAgreement.deposit
        );

        if (!success) revert TransferFailed();
        emit Activate(msg.sender, id, amount);
    }

    function addCollateral(uint256 id, uint256 amount)
        external
        payable
        nonReentrant
        onlyIfActive(id)
        moreThanZero(amount)
    {
        require(msg.value == amount, "ETH != amount");
        Agreement storage activeAgreement = s_idToAgreement[id];

        activeAgreement.collateral += amount;
        emit AddCollateral(activeAgreement.borrower, id, amount);
    }

    function repay(uint256 id, uint256 amount)
        external
        nonReentrant
        onlyIfActive(id)
        moreThanZero(amount)
    {
        Agreement storage activeAgreement = s_idToAgreement[id];

        // borrow cannot pay back more than the future value of the agreement
        uint256 futureValue = activeAgreement.futureValue;
        uint256 repaidAmt = activeAgreement.repaidAmt;
        if (repaidAmt + amount > futureValue) {
            amount = futureValue - repaidAmt;
        }

        activeAgreement.repaidAmt += amount;
        if (activeAgreement.repaidAmt == futureValue) {
            activeAgreement.status = Status.Repaid;
            emit Repaid(activeAgreement.lender, id, futureValue);
        }
        bool success = s_lenderToken.transferFrom(
            msg.sender,
            address(this),
            amount
        );
        if (!success) revert TransferFailed();
        emit Repay(activeAgreement.borrower, id, amount);
    }

    function withdrawCollateral(uint256 id, uint256 amount)
        external
        nonReentrant
        onlyIfBorrower(id)
        moreThanZero(amount)
    {
        Agreement storage agreement = s_idToAgreement[id];
        Status status = agreement.status;
        uint256 collateral = agreement.collateral;
        uint256 reqCollateral = getMinReqCollateral(id);

        if (status == Status.Active) {
            require(
                collateral - amount > reqCollateral,
                "Not enough collateral"
            );
        } else {
            require(
                status == Status.Repaid || status == Status.Closed,
                "Agreement not settled yet"
            );
        }

        agreement.collateral -= amount;
        bool success = (agreement.borrower).send(amount);
        if (!success) revert TransferFailed();
        emit WithdrawCollateral(agreement.borrower, id, amount);
    }

    function close(uint256 id)
        external
        nonReentrant
        onlyIfLender(id)
        onlyIfRepaid(id)
    {
        Agreement storage agreement = s_idToAgreement[id];
        uint256 futureValue = agreement.futureValue;
        assert(agreement.repaidAmt == futureValue);

        bool success = s_lenderToken.transfer(agreement.lender, futureValue);
        if (!success) revert TransferFailed();
        emit Closed(agreement.lender, agreement.borrower, id);
    }

    function getMinReqCollateral(uint256 id) public view returns (uint256) {
        Agreement memory agreement = s_idToAgreement[id];
        uint256 minInETH = (getEthValueFromToken(agreement.futureValue) *
            (200 - LIQUIDATION_THRESHOLD)) / 100;
        return minInETH;
    }

    function getEthValueFromToken(uint256 amount)
        public
        view
        returns (uint256)
    {
        (, int256 price, , , ) = s_priceFeed.latestRoundData();
        uint8 priceFeedDecimals = s_priceFeed.decimals();
        uint8 tokenDecimals = s_lenderToken.decimals();
        // price has 8 decimals
        // price will be something like 300000000000
        // amount will be something like (1000 * 10 ** 6 USDC)
        // eth has 18 decimals
        // amount * 10**(18-priceDecimals+tokenDecimals) / price
        //  (3000*10**6) * 10**(18+8-6) / (3000 * 10**8) = 1 ETH
        return
            (amount * (10**(18 + priceFeedDecimals - tokenDecimals))) /
            uint256(price);
    }

    function mint(address account, uint256 amount) public {
        s_lenderToken.mint(account, amount);
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    /********************/
    /* Modifiers */
    /********************/
    modifier moreThanZero(uint256 amount) {
        if (amount == 0) {
            revert NeedsMoreThanZero();
        }
        _;
    }

    modifier onlyIfActive(uint256 id) {
        if (s_idToAgreement[id].status != Status.Active) {
            revert NeedsToBeActive();
        }
        _;
    }

    modifier onlyIfRepaid(uint256 id) {
        if (s_idToAgreement[id].status != Status.Repaid) {
            revert NeedsToBeActive();
        }
        _;
    }

    modifier onlyIfLender(uint256 id) {
        if (s_idToAgreement[id].lender != msg.sender) {
            revert NeedsToBeLender();
        }
        _;
    }

    modifier onlyIfBorrower(uint256 id) {
        if (s_idToAgreement[id].borrower != msg.sender) {
            revert NeedsToBeBorrower();
        }
        _;
    }

    /********************/
    /* DAO / OnlyOwner Functions */
    /********************/
    function setLenderToken(address token, address priceFeed)
        external
        onlyOwner
    {
        s_lenderToken = IToken(token);
        s_priceFeed = AggregatorV3Interface(priceFeed);
    }
}
