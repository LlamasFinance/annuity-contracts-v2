// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IToken is IERC20Metadata {
    function mint(address account, uint256 amount) external;
}
