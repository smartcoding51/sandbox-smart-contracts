import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Wallet } from "ethers";
import { ethers } from "hardhat";
import { Airdrop, Airdrop__factory, MyERC20 } from "../typechain-types";
import { MyERC20__factory } from "../typechain-types/factories/contracts/MyERC20__factory";
import { MerkleTree } from "merkletreejs";
import { randomBytes, randomInt } from "crypto";

const abi = new ethers.utils.AbiCoder();

describe("Airdrop", async () => {
  let owner: SignerWithAddress;
  let guy: SignerWithAddress;

  let myERC20: MyERC20;

  let listToAirdrop: {
    who: string;
    amount: BigNumber;
  }[];

  let merkleTree: MerkleTree;

  let airdrop: Airdrop;

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    owner = signers[0];
    guy = signers[1];

    const name = "Test";
    const symbol = "TST";

    listToAirdrop = new Array(10)
      .fill(0)
      .map(() => new Wallet(randomBytes(32).toString("hex")).address)
      .concat(guy.address)
      .map((x) => {
        return {
          who: x,
          amount: BigNumber.from(randomInt(9) + 1),
        };
      });

    let amountToClaim = BigNumber.from(0);

    listToAirdrop.forEach((x) => (amountToClaim = amountToClaim.add(x.amount)));

    myERC20 = await new MyERC20__factory(owner).deploy(
      name,
      symbol,
      amountToClaim
    );

    await myERC20.deployed();

    merkleTree = new MerkleTree(
      listToAirdrop.map((x) => hash(x.who, x.amount)),
      ethers.utils.keccak256,
      {
        sortPairs: true,
      }
    );

    airdrop = await new Airdrop__factory(owner).deploy(
      myERC20.address,
      merkleTree.getHexRoot()
    );

    await airdrop.deployed();

    await myERC20.connect(owner).transfer(airdrop.address, amountToClaim);
  });

  it("Should claim", async () => {
    const amount = findAmount(listToAirdrop, guy.address);
    const proof = merkleTree.getHexProof(
      hash(guy.address, findAmount(listToAirdrop, guy.address))
    );

    expect(await airdrop.canClaim(guy.address, amount, proof)).to.eq(true);

    await expect(() =>
      airdrop.connect(guy).claim(amount, proof)
    ).to.changeTokenBalances(
      myERC20,
      [airdrop, guy],
      [amount.mul(BigNumber.from(-1)), amount]
    );
  });

  it("Shouldnt claim - wrong amount", async () => {
    const amount = findAmount(listToAirdrop, guy.address);
    const proof = merkleTree.getHexProof(
      hash(guy.address, findAmount(listToAirdrop, guy.address))
    );

    const wrongAmount = amount.add(1);

    expect(await airdrop.canClaim(guy.address, wrongAmount, proof)).to.eq(
      false
    );

    await expect(
      airdrop.connect(guy).claim(wrongAmount, proof)
    ).be.revertedWith("Airdrop: You cannot claim");
  });

  it("Shouldnt claim - wrong proof", async () => {
    const amount = findAmount(listToAirdrop, guy.address);
    const proof = merkleTree.getHexProof(
      hash(guy.address, findAmount(listToAirdrop, guy.address))
    );

    const wrongProof = proof.concat(
      ethers.utils.keccak256(abi.encode(["string"], ["extra hash"]))
    );

    expect(await airdrop.canClaim(guy.address, amount, wrongProof)).to.eq(
      false
    );

    await expect(
      airdrop.connect(guy).claim(amount, wrongProof)
    ).be.revertedWith("Airdrop: You cannot claim");
  });

  it("Shouldnt claim - double claim", async () => {
    const amount = findAmount(listToAirdrop, guy.address);
    const proof = merkleTree.getHexProof(
      hash(guy.address, findAmount(listToAirdrop, guy.address))
    );

    expect(await airdrop.canClaim(guy.address, amount, proof)).to.eq(true);

    await expect(() =>
      airdrop.connect(guy).claim(amount, proof)
    ).to.changeTokenBalance(myERC20, guy, amount);

    expect(await airdrop.canClaim(guy.address, amount, proof)).to.eq(false);

    await expect(airdrop.connect(guy).claim(amount, proof)).be.revertedWith(
      "Airdrop: You cannot claim"
    );
  });
});

const hash = (who: string, amount: BigNumber): string =>
  ethers.utils.keccak256(
    abi.encode(["address", "uint256"], [who, amount.toHexString()])
  );

const findAmount = (
  listToAirdrop: {
    who: string;
    amount: BigNumber;
  }[],
  who: string
): BigNumber => {
  const result = listToAirdrop.find((x) => x.who === who);
  return result ? result.amount : BigNumber.from(0);
};
