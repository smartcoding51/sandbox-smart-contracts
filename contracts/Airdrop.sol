//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Airdrop {
    using MerkleProof for bytes32[];
    using SafeERC20 for IERC20;

    bytes32 private _merkleTreeRoot;

    IERC20 private _erc20;

    mapping (address => bool) private _claimed;

    event Claim(address indexed who, uint256 amount);

    constructor(IERC20 erc20, bytes32 merkleTreeRoot) {
        _erc20 = erc20;
        _merkleTreeRoot = merkleTreeRoot;
    }

    function claim(uint256 amount, bytes32[] calldata proof) external {
        require(canClaim(msg.sender, amount, proof), "Airdrop: You cannot claim");
        
        _erc20.safeTransfer(msg.sender, amount);
        _claimed[msg.sender] = true;

        emit Claim(msg.sender, amount);
    }

    function canClaim(address who, uint256 amount, bytes32[] calldata proof) public view returns(bool) {
        return (!_claimed[who] && proof.verify(_merkleTreeRoot, keccak256(abi.encode(who, amount)))); 
    }
}
