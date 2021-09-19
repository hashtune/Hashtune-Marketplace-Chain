import "@nomiclabs/hardhat-ethers"; // Adds ethers property object to hardhat run time environment
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";
import { jestSnapshotPlugin } from "mocha-chai-jest-snapshot";

import { SongOrAlbumNFT } from "../src/types/SongOrAlbumNFT";

import { connectAsUser } from "./utils";
chai.use(jestSnapshotPlugin());
const { expect } = chai;

export interface Context {
  soa: SongOrAlbumNFT;
  users: { [key: string]: SignerWithAddress };
}

describe("SongOrAlbumNFT", function () {
  // TODO move this to a separate setup file
  // Deploy contract
  const hashtuneAddress = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"; // this is the last test account provided by hardhat
  let context: Context;
  const tokenId = 1111;
  const prov = ethers.provider;
  // This is super cheap, this is a 17 USD token if 1 Ether is worth 3.4K USD
  const tokenPrice = ethers.utils.parseEther("0.005");
  this.beforeEach(async () => {
    const [one, two, three, four, five, six] = await ethers.getSigners();
    const SongOrAlbum = await hre.ethers.getContractFactory("SongOrAlbumNFT");
    const SOA: SongOrAlbumNFT = (await SongOrAlbum.deploy(
      "http://blank"
    )) as SongOrAlbumNFT;
    // Deploy the contract
    await SOA.deployed();
    context = {
      soa: SOA,
      users: {
        one, // contract owner and token creator
        two,
        three, // token feature
        four,
        five,
        six,
      },
    };
    // Create a single token
    const result = await context.soa.create(
      [context.users.one.address, context.users.three.address],
      tokenId,
      [],
      tokenPrice
    );
    if (!result.hash) {
      throw new Error("Problem setting up tests");
    }
    const eventFilter = context.soa.filters.TransferSingle();
    const events = await context.soa.queryFilter(eventFilter);
    return SOA;
  });
  describe("Contract Owner", function () {
    // User 1
    it("can change the price of the token", async function () {
      const result = await context.soa.setCurrentPrice(tokenPrice, tokenId);
      expect(result.v).toMatchSnapshot();
    });
    it("can sell the token if they own it", async function () {
      await context.soa.setApprovalToBuy(context.users.two.address, tokenId);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.buy(tokenId, {
        value: tokenPrice,
      });
      const balance = await context.soa.balanceOf(
        context.users.two.address,
        tokenId
      );
      expect(balance).toMatchSnapshot();
    });
    it("cannot change the price of the token if they no longer own it", async function () {
      try {
        await context.soa.setApprovalToBuy(context.users.two.address, tokenId);
        const asTwo = connectAsUser(context.users.two, context);
        await asTwo.buy(tokenId, {
          value: tokenPrice,
        });
        await context.soa.setCurrentPrice(tokenPrice, tokenId);
      } catch (e) {
        expect(e).toMatchSnapshot();
      }
    });
    it("cannot buy the token with an incorrect amount", async function () {
      try {
        await context.soa.buy(tokenId, {
          value: ethers.utils.parseEther("0.004"),
        });
      } catch (e) {
        expect(e).toMatchSnapshot();
      }
    });
    it.skip("cannot buy the token as the contract owner address", async function () {
      // Should this be allowed repurchase by a feature creator?
    });
    it("can change the single URI of the contracts tokens", async function () {
      await context.soa.setURI("foo");
      const result = await context.soa.showURI(tokenId);
      expect(result).toMatchSnapshot();
    });
  });
  describe("Token Creator", function () {
    // User 3
    it("cannot create a single token", async function () {
      const asThree = connectAsUser(context.users.three, context);
      try {
        await asThree.create(
          [context.users.two.address, context.users.four.address],
          tokenId,
          [],
          ethers.utils.parseEther("0.005")
        );
      } catch (e) {
        expect(e).to.matchSnapshot();
      }
    });
    it("cannot change the price of the token", async function () {
      const asThree = connectAsUser(context.users.three, context);
      try {
        await asThree.setCurrentPrice(tokenPrice, tokenId);
      } catch (e) {
        expect(e).toMatchSnapshot();
      }
    });
    it("cannot set approval to buy the token", async function () {
      const asThree = connectAsUser(context.users.three, context);
      try {
        await asThree.setApprovalToBuy(context.users.four.address, tokenId);
      } catch (e) {
        expect(e).toMatchSnapshot();
      }
    });
    it("can transfer tokens out during a sale", async () => {
      await context.soa.setApprovalToBuy(context.users.two.address, tokenId);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.buy(tokenId, {
        value: tokenPrice,
      });
      const balanceAfterFirstTransaction = await context.soa.balanceOf(
        context.users.one.address,
        tokenId
      );
      expect(balanceAfterFirstTransaction._hex).toMatchSnapshot();
    });
    it("can transfer tokens in during a sale", async () => {
      await context.soa.setApprovalToBuy(context.users.two.address, tokenId);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.buy(tokenId, {
        value: tokenPrice,
      });
      const balanceOfNewOwnerAfterFirstTransaction = await context.soa.balanceOf(
        context.users.two.address,
        tokenId
      );
      expect(balanceOfNewOwnerAfterFirstTransaction._hex).toMatchSnapshot();
    });
    it("can transfer funds in during a sale", async () => {
      await context.soa.setApprovalToBuy(context.users.two.address, tokenId);
      const asTwo = connectAsUser(context.users.two, context);
      const ownerBefore = await prov.getBalance(context.users.one.address);
      await asTwo.buy(tokenId, {
        value: tokenPrice,
      });
      // 2 percent
      const royalty = tokenPrice.mul(2).div(100);
      const ownerAfter = await prov.getBalance(context.users.one.address);
      const amount = tokenPrice.sub(royalty).sub(royalty); // Owner is also creator
      expect(ownerAfter).to.be.equal(ownerBefore.add(amount));
    });
    it("can transfer funds out during a sale", async () => {
      await context.soa.setApprovalToBuy(context.users.two.address, tokenId);
      const asTwo = connectAsUser(context.users.two, context);
      const buyerBefore = await prov.getBalance(context.users.two.address);
      const transaction = await asTwo.buy(tokenId, {
        value: tokenPrice,
      });
      const receipt = await prov.getTransactionReceipt(transaction.hash);
      // 2 percent
      const buyerAfter = await prov.getBalance(context.users.two.address);
      expect(buyerAfter).to.be.equal(
        buyerBefore
          .sub(tokenPrice)
          .sub(receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice))
      );
    });
    it("can transfer royalties during a sale", async () => {
      await context.soa.setApprovalToBuy(context.users.two.address, tokenId);
      const asTwo = connectAsUser(context.users.two, context);
      const hashtuneBeforeOne = await prov.getBalance(hashtuneAddress);
      const featureBeforeOne = await prov.getBalance(
        context.users.three.address
      );
      await asTwo.buy(tokenId, {
        value: tokenPrice,
      });
      const royalty = tokenPrice.mul(2).div(100);
      const hashtuneAfterOne = await prov.getBalance(hashtuneAddress);
      const featureAfterOne = await prov.getBalance(
        context.users.three.address
      );
      expect(hashtuneAfterOne).to.be.equal(hashtuneBeforeOne.add(royalty));
      expect(featureAfterOne).to.be.equal(featureBeforeOne.add(royalty));
    });
    it("cannot change the single URI of the contracts tokens", async function () {
      const asTwo = connectAsUser(context.users.two, context);
      try {
        await asTwo.setURI("changed");
      } catch (e) {
        expect(e).toMatchSnapshot();
      }
    });
  });
});
