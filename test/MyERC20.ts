import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { MyERC20 } from "../typechain-types";
import { MyERC20__factory } from "../typechain-types/factories/contracts/MyERC20__factory";

describe("MyERC20", async () => {
  let signer: SignerWithAddress;
  let mintAmount: BigNumber;
  let myERC20: MyERC20;

  before(async () => {
    signer = (await ethers.getSigners())[0];

    const name = "Test";
    const symbol = "TST";
    mintAmount = BigNumber.from(1000);

    myERC20 = await new MyERC20__factory(signer).deploy(
      name,
      symbol,
      mintAmount
    );

    await myERC20.deployed();
  });

  it("Should minted mintAmount", async () => {
    expect(await myERC20.balanceOf(signer.address)).to.eq(mintAmount);
  });
});
