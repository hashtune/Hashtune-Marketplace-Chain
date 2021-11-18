import { Contract } from "@ethersproject/contracts";
import "@nomiclabs/hardhat-ethers"; // Adds ethers property object to hardhat run time environment
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";

import { SongOrAlbumNFT } from "../src/types/SongOrAlbumNFT";

const { expect } = chai;

export interface Context {
  soa: Contract;
  users: { [key: string]: SignerWithAddress };
}

describe("ci", function () {
  let context: Context;
  const tokenId = 1;
  const tokenPrice = ethers.utils.parseEther("0.005");
  this.beforeAll(async () => {
    const one = await ethers.getSigner(process.env.ONE!);
    const two = await ethers.getSigner(process.env.TWO!);
    const three = await ethers.getSigner(process.env.THREE!);
    const contractInstance = await hre.ethers.getContractAt(
      "SongOrAlbumNFT",
      process.env.CONTRACT!
    );
    context = {
      soa: contractInstance,
      users: {
        one,
        two,
        three,
      },
    };
  });
  // TODO: fix
  it.skip("can sell the token if they own it", async function () {
    await context.soa.setApprovalToBuy(context.users.three.address, tokenId);
    const asThree = context.soa.connect(context.users.three);
    const result = await asThree.buy(tokenId, {
      value: tokenPrice,
    });
    const balance = await context.soa.balanceOf(
      context.users.three.address,
      tokenId
    );
    console.log({ result });
  });
});
