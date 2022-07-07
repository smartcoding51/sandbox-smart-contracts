//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyERC20 is ERC20 {
    constructor(string memory name, string memory symbol, uint256 mintAmount) ERC20(name, symbol) {
        _mint(msg.sender, mintAmount);
    }
}