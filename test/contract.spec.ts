import "@nomiclabs/hardhat-ethers"; // Adds ethers property object to hardhat run time environment
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";

import { SongOrAlbumNFT } from "../src/types/SongOrAlbumNFT";

import { connectAsUser } from "./utils";
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
  const tokenId = 1;
  const prov = ethers.provider;
  // This is super cheap, this is a 17 USD token if 1 Ether is worth 3.4K USD
  const tokenPrice = ethers.utils.parseEther("0.005");
  this.beforeEach(async () => {
    const [one, two, three, four, five, six] = await ethers.getSigners();
    const SongOrAlbum = await hre.ethers.getContractFactory("SongOrAlbumNFT");
    const SOA: SongOrAlbumNFT = (await SongOrAlbum.deploy(
      "http://blank",
      2,
      2
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
    // Approve myself to create a token
    SOA.approveArtist(context.users.one.address);
    // Create a single token
    const result = await context.soa.create(
      [context.users.one.address, context.users.two.address],
      [90, 10],
      1,
      "0x6c00000000000000000000000000000000000000000000000000000000000000",
      ethers.utils.parseEther("0.005"),
      "0x6c00000000000000000000000000000000000000000000000000000000000000",
      "0x6c00000000000000000000000000000000000000000000000000000000000000",
      1,
      1
    );
    if (!result.hash) {
      throw new Error("Problem setting up tests");
    }
    // Throws error on test network
    // const eventFilter = context.soa.filters.TransferSingle();
    // const events = await context.soa.queryFilter(eventFilter);
    return SOA;
  });
  describe("Contract Owner", function () {
    // User 1
    it("can change the price of the token", async function () {
      const result = await context.soa.setCurrentPrice(tokenPrice, tokenId, {
        gasLimit: 100000,
      });
      expect(result.hash).to.not.be.undefined;
    });
    it("can sell the token if they own it", async function () {
      const asOne = connectAsUser(context.users.one, context);
      await asOne.setApprovalToBuy(context.users.three.address, tokenId);
      const asThree = connectAsUser(context.users.three, context);
      await asThree.buy(tokenId, {
        value: tokenPrice,
      });
      const balance = await context.soa.balanceOf(
        context.users.three.address,
        tokenId
      );
      expect(balance._hex).to.be.equal("0x01");
    });
    it("cannot change the price of the token if they no longer own it", async function () {
      try {
        const asOne = connectAsUser(context.users.one, context);
        await asOne.setApprovalToBuy(context.users.three.address, tokenId);
        const asThree = connectAsUser(context.users.three, context);
        await asThree.buy(tokenId, {
          value: tokenPrice,
        });
        await asOne.setCurrentPrice(tokenPrice, tokenId);
      } catch (e) {
        const message = new String(e);
        console.log({ message });
        expect(message.includes("you are not the owner of the art")).to.be.true;
      }
    });
    it("cannot buy the token with an incorrect amount", async function () {
      const asOne = connectAsUser(context.users.one, context);
      await asOne.setApprovalToBuy(context.users.three.address, tokenId);
      const asThree = connectAsUser(context.users.three, context);
      try {
        await asThree.buy(tokenId, {
          value: ethers.utils.parseEther("0.004"),
        });
      } catch (e) {
        const message = new String(e);
        expect(message.includes("incorrect amount sent")).to.be.true;
      }
    });
    it.skip("cannot buy the token as the contract owner address", async function () {
      // Should this be allowed repurchase by a feature creator?
    });
  });
  describe("Token Creator", function () {
    // TODO: Make sure msg sender is the first in the creators array
    it("cannot create a single token if not an approved artist", async function () {
      const asThree = connectAsUser(context.users.three, context);
      try {
        // Create a single token
        await asThree.create(
          [context.users.three.address, context.users.four.address],
          [90, 10],
          1,
          "0x6c00000000000000000000000000000000000000000000000000000000000000",
          ethers.utils.parseEther("0.005"),
          "0x6c00000000000000000000000000000000000000000000000000000000000000",
          "0x6c00000000000000000000000000000000000000000000000000000000000000",
          1,
          1
        );
      } catch (e) {
        const message = new String(e);
        expect(message.includes("you are not authorized to create NFT")).to.be
          .true;
      }
    });
    it("cannot change the price of the token", async function () {
      const asThree = connectAsUser(context.users.three, context);
      try {
        await asThree.setCurrentPrice(tokenPrice, tokenId);
      } catch (e) {
        const message = new String(e);
        expect(message.includes("you are not the owner of the art")).to.be.true;
      }
    });
    it("cannot set approval to buy the token", async function () {
      const asThree = connectAsUser(context.users.three, context);
      try {
        await asThree.setApprovalToBuy(context.users.four.address, tokenId);
      } catch (e) {
        const message = new String(e);
        expect(message.includes("cannot set approval if not token owner")).to.be
          .true;
      }
    });
    it("can transfer tokens out during a sale", async () => {
      const asOne = connectAsUser(context.users.one, context);
      await asOne.setApprovalToBuy(context.users.two.address, tokenId);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.buy(tokenId, {
        value: tokenPrice,
      });
      const balanceAfterFirstTransaction = await context.soa.balanceOf(
        context.users.one.address,
        tokenId
      );
      expect(balanceAfterFirstTransaction._hex).to.equal("0x00");
    });
    it("can transfer tokens in during a sale", async () => {
      const asOne = connectAsUser(context.users.one, context);
      await asOne.setApprovalToBuy(context.users.two.address, tokenId);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.buy(tokenId, {
        value: tokenPrice,
      });
      const balanceOfNewOwnerAfterFirstTransaction = await context.soa.balanceOf(
        context.users.two.address,
        tokenId
      );
      expect(balanceOfNewOwnerAfterFirstTransaction._hex).to.equal("0x01");
    });
    // TODO: Fix
    it("can transfer funds in during a sale", async () => {
      const asOne = connectAsUser(context.users.one, context);
      await asOne.setApprovalToBuy(context.users.two.address, tokenId);
      const asTwo = connectAsUser(context.users.two, context);
      const ownerBefore = await prov.getBalance(context.users.one.address);
      await asTwo.buy(tokenId, {
        value: tokenPrice,
      });
      // 2 percent
      const royalty = tokenPrice.mul(2).div(100);
      const royaltyCreator = tokenPrice.mul(2).div(100).mul(90).div(100);
      const royaltyFeature = tokenPrice.mul(2).div(100).mul(10).div(100);
      const ownerAfter = await prov.getBalance(context.users.one.address);
      // We only subtract royaltyFeature because address one is hashtune and also the original creator and owner
      const amount = tokenPrice.sub(royaltyFeature);
      expect(ownerAfter).to.be.equal(ownerBefore.add(amount));
    });
    it("can transfer funds out during a sale", async () => {
      const asOne = connectAsUser(context.users.one, context);
      await asOne.setApprovalToBuy(context.users.three.address, tokenId);
      const asThree = connectAsUser(context.users.three, context);
      const buyerBefore = await prov.getBalance(context.users.three.address);
      const transaction = await asThree.buy(tokenId, {
        value: tokenPrice,
      });
      const receipt = await prov.getTransactionReceipt(transaction.hash);
      // 2 percent
      const buyerAfter = await prov.getBalance(context.users.three.address);
      expect(buyerAfter).to.be.equal(
        buyerBefore
          .sub(tokenPrice)
          .sub(receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice))
      );
    });
    it("can transfer royalties during a sale", async () => {
      const asOne = connectAsUser(context.users.one, context);
      await asOne.setApprovalToBuy(context.users.three.address, tokenId);
      const asThree = connectAsUser(context.users.three, context);
      const hashtuneBeforeOne = await prov.getBalance(
        context.users.one.address
      );
      const featureBeforeOne = await prov.getBalance(context.users.two.address);
      await asThree.buy(tokenId, {
        value: tokenPrice,
      });
      const royalty = tokenPrice.mul(2).div(100);
      const royaltyCreator = tokenPrice.mul(2).div(100).mul(90).div(100);
      const royaltyFeature = tokenPrice.mul(2).div(100).mul(10).div(100);
      const hashtuneAfterOne = await prov.getBalance(context.users.one.address);
      const featureAfterOne = await prov.getBalance(context.users.two.address);
      expect(hashtuneAfterOne).to.be.equal(
        hashtuneBeforeOne.add(tokenPrice.sub(royaltyFeature))
      );
      expect(featureAfterOne).to.be.equal(featureBeforeOne.add(royaltyFeature));
    });
    it("cannot change the single URI of the contracts tokens", async function () {
      const asTwo = connectAsUser(context.users.two, context);
      try {
        await asTwo.setURI("changed");
      } catch (e) {
        const message = new String(e);
        expect(message.includes("caller is not the owner")).to.be.true;
      }
    });
  });
});
