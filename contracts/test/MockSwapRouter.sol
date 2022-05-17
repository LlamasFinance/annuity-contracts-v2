// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IUniswapRouter.sol";
import "../interfaces/IToken.sol";
import "hardhat/console.sol";

contract MockSwapRouter is IUniswapRouter, Ownable {
    AggregatorV3Interface public s_priceFeed;
    mapping(address => uint256) public refundBalance;

    function refundETH() external payable override {
        uint256 amountOwed = refundBalance[msg.sender];
        refundBalance[msg.sender] = 0;
        bool success = payable(msg.sender).send(amountOwed);
        require(success, "refund failed");
    }

    // struct ExactOutputSingleParams {
    //     address tokenIn;
    //     address tokenOut;
    //     uint24 fee;
    //     address recipient;
    //     uint256 deadline;
    //     uint256 amountOut;
    //     uint256 amountInMaximum;
    //     uint160 sqrtPriceLimitX96;
    // }

    /// @notice Swaps as little as possible of one token for `amountOut` of another token
    /// @param params The parameters necessary for the swap, encoded as `ExactOutputSingleParams` in calldata
    /// @return amountIn The amount of the input token
    function exactOutputSingle(ExactOutputSingleParams calldata params)
        external
        payable
        override
        returns (uint256 amountIn)
    {
        // usd/eth
        // price = 3000 00000000
        (, int256 price, , , ) = s_priceFeed.latestRoundData();
        uint8 priceFeedDecimals = s_priceFeed.decimals();

        // eth decimals = 18
        uint8 tokenInDecimals = IToken(params.tokenIn).decimals();
        // usd decimals = 6
        uint8 tokenOutDecimals = IToken(params.tokenOut).decimals();

        // 3000 000000
        price = scalePrice(price, priceFeedDecimals, tokenOutDecimals);

        // (3000 * 10^6 USD * 10^18) / 3000 * 10^6 USD/ETH
        uint256 requiredInputToken = (params.amountOut * 10**tokenInDecimals) /
            uint256(price);

        require(requiredInputToken <= msg.value, "Not enough input token!");

        refundBalance[msg.sender] += (msg.value - requiredInputToken);

        IToken(params.tokenOut).mint(params.recipient, params.amountOut);

        return requiredInputToken;
    }

    function scalePrice(
        int256 _price,
        uint8 _priceDecimals,
        uint8 _decimals
    ) internal pure returns (int256) {
        if (_priceDecimals < _decimals) {
            return _price * int256(10**uint256(_decimals - _priceDecimals));
        } else if (_priceDecimals > _decimals) {
            return _price / int256(10**uint256(_priceDecimals - _decimals));
        }
        return _price;
    }

    /********************/
    /* DAO / OnlyOwner Functions */
    /********************/
    function setPriceFeed(address priceFeed) external onlyOwner {
        s_priceFeed = AggregatorV3Interface(priceFeed);
    }
}
