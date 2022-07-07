import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";
import { Airdrop__factory, ERC20__factory } from "../typechain-types";

const abi = new ethers.utils.AbiCoder();

const hash = (who: string, amount: BigNumber): string =>
  ethers.utils.keccak256(
    abi.encode(["address", "uint256"], [who, amount.toHexString()])
  );

async function main() {
  const signer = (await ethers.getSigners())[0];

  const erc20Address = "0xdD2FD4581271e230360230F9337D5c0430Bf44C0"; // ERC20 address for airdrop (example)

  const listToAirdrop = [
    // list of addresses and amount for airdrop (example)
    {
      who: "0xdD2FD4581271e230360230F9337D5c0430Bf44C0",
      amount: BigNumber.from(228),
    },
  ];

  console.log(
    listToAirdrop.map((x) => {
      return {
        who: x.who,
        amount: x.amount.toString(),
      };
    })
  );

  let amountToTransfer = BigNumber.from(0);

  listToAirdrop.forEach(
    (x) => (amountToTransfer = amountToTransfer.add(x.amount))
  );

  console.log(`Sum of amount to claim: ${amountToTransfer.toString()}`);

  const merkleTree = new MerkleTree( // YOU SHOULD SAVE MERKLE TREE FOR FRONTEND INTERACTIONS!
    listToAirdrop.map((x) => hash(x.who, x.amount)),
    ethers.utils.keccak256,
    {
      sortPairs: true,
    }
  );

  console.log("Deploying Airdrop contract");

  const airdrop = await new Airdrop__factory(signer).deploy(
    erc20Address,
    merkleTree.getHexRoot()
  );

  await airdrop.deployed();

  console.log("Airdrop contract has been deployed");

  console.log(
    `Sending ${amountToTransfer.toString()} token(s) to Airdrop contract`
  );

  await ERC20__factory.connect(erc20Address, signer).transfer(
    airdrop.address,
    amountToTransfer
  );

  console.log("Tokens have been sended");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
