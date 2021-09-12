const { expect } = require("chai");
import hre from "hardhat";
import { ethers } from "hardhat";
import { SongOrAlbum } from "../src/types/SongOrAlbum";
import "@nomiclabs/hardhat-ethers"; // Adds ethers property object to hardhat run time environment
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { AccessList } from "ethers/lib/utils";
import { connectAsUser } from "./utils";

export type Context = {
  soa: SongOrAlbum;
  users: { [key: string]: SignerWithAddress };
};

export type TransactionResponse = {
  hash: string;
  type?: number | null;
  accessList?: AccessList;
  blockHash?: string;
  blockNumber?: number;
  [x: string]: any;
};

describe("SongOrAlbumNFT", function () {
  // Deploy contract
  let hashtuneAddress = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"; // this is the last test account provided by hardhat
  let context: Context;
  let tokenId = 1111;
  let prov = ethers.provider;
  // This is super cheap, this is a 17 USD token if 1 Ether is worth 3.4K USD
  let tokenPrice = ethers.utils.parseEther("0.005");
  this.beforeAll(async () => {
    let [one, two, three, four, five, six] = await ethers.getSigners();
    const SongOrAlbum = await hre.ethers.getContractFactory("SongOrAlbum");
    const SOA: SongOrAlbum = (await SongOrAlbum.deploy(
      "http://blank"
    )) as SongOrAlbum;
    await SOA.deployed();
    context = {
      soa: SOA,
      users: {
        one: one, // contract owner and token creator
        two: two,
        three: three, // token feature
        four: four,
        five: five,
        six: six,
      },
    };
    return SOA;
  });
  describe("Contract Owner", function () {
    // User 1
    it("can create a single token", async function () {
      const result: TransactionResponse = await context.soa.create(
        [context.users.one.address, context.users.three.address],
        tokenId,
        [],
        tokenPrice
      );
      expect(result).to.have.own.property("hash");
      const balance = await context.soa.balanceOf(
        context.users.one.address,
        tokenId
      );
      expect(balance._hex).to.be.equal("0x01");
    });
    it("can change the price of the token", async function () {
      let result: TransactionResponse = await context.soa.setCurrentPrice(
        tokenPrice,
        tokenId
      );
      expect(result.hash).to.be.a("string");
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
      expect(balance._hex).to.be.equal("0x01");
    });
    it("cannot change the price of the token if they no longer own it", async function () {
      let error: Error["message"] | null = null;
      try {
        await context.soa.setCurrentPrice(tokenPrice, tokenId);
      } catch (e) {
        if (e instanceof Error) {
          error = e.message;
        }
        expect(error).to.include(
          "cannot set the price for a token you don't currently own"
        );
      }
    });
    it("cannot buy the token with an incorrect amount", async function () {
      let error: Error["message"] | null = null;
      try {
        await context.soa.buy(tokenId, {
          value: ethers.utils.parseEther("0.004"),
        });
      } catch (e) {
        if (e instanceof Error) {
          error = e.message;
        }
        expect(error).to.include("incorrect amount sent");
      }
    });
    it.skip("cannot buy the token as the contract owner address", async function () {
      // Should this be allowed repurchase by a feature creator?
    });
    it("can change the single URI of the contracts tokens", async function () {
      await context.soa.setURI("foo");
      const result = await context.soa.showURI(tokenId);
      expect(result).to.be.equal("foo");
    });
  });
  describe("Token Creator", function () {
    // User 3
    it("cannot create a single token", async function () {
      const asThree = connectAsUser(context.users.three, context);
      let error: Error["message"] | null = null;
      try {
        await asThree.create(
          [context.users.two.address, context.users.four.address],
          tokenId,
          [],
          ethers.utils.parseEther("0.005")
        );
      } catch (e) {
        if (e instanceof Error) {
          error = e.message;
        }
        expect(error).to.include(
          "reverted with reason string 'Ownable: caller is not the owner'"
        );
      }
    });
    it("cannot change the price of the token", async function () {
      const asThree = connectAsUser(context.users.three, context);
      let error: Error["message"] | null = null;
      try {
        await asThree.setCurrentPrice(tokenPrice, tokenId);
      } catch (e) {
        if (e instanceof Error) {
          error = e.message;
        }
        expect(error).to.include(
          "cannot set the price for a token you don't currently own"
        );
      }
    });
    it("cannot set approval to buy the token", async function () {
      const asThree = connectAsUser(context.users.three, context);
      let error: Error["message"] | null = null;
      try {
        await asThree.setApprovalToBuy(context.users.four.address, tokenId);
      } catch (e) {
        if (e instanceof Error) {
          error = e.message;
        }
        expect(error).to.include("cannot set approval if not token owner");
      }
    });
    it("can receive a royalty of 2 percent, hash tune as well", async function () {
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.setApprovalToBuy(context.users.five.address, tokenId);
      const asFive = connectAsUser(context.users.five, context);
      let royaltyHashtuneBefore = await prov.getBalance(hashtuneAddress);
      let royaltyFeatureBefore = await prov.getBalance(
        context.users.three.address
      );
      let royaltyCreatorBefore = await prov.getBalance(
        context.users.one.address
      );
      await asFive.buy(tokenId, {
        value: tokenPrice,
      });

      // Check transfer
      const balance = await context.soa.balanceOf(
        context.users.two.address,
        tokenId
      );
      expect(balance._hex).to.be.equal("0x00");
      const balanceOfNewOwner = await context.soa.balanceOf(
        context.users.five.address,
        tokenId
      );
      expect(balanceOfNewOwner._hex).to.be.equal("0x01");

      // Check royalties
      let royaltyHashtuneAfter = await prov.getBalance(hashtuneAddress);
      let royaltyFeatureAfter = await prov.getBalance(
        context.users.three.address
      );
      let royaltyCreatorAfter = await prov.getBalance(
        context.users.one.address
      );
      // 2 percent
      const royalty = tokenPrice.mul(2).div(100);
      expect(royaltyHashtuneAfter).to.be.equal(
        royaltyHashtuneBefore.add(royalty)
      );
      expect(royaltyFeatureAfter).to.be.equal(
        royaltyFeatureBefore.add(royalty)
      );
      expect(royaltyCreatorAfter).to.be.equal(
        royaltyCreatorBefore.add(royalty)
      );
    });
    it("cannot change the single URI of the contracts tokens", async function () {
      const asTwo = connectAsUser(context.users.two, context);
      let error: Error["message"] | null = null;
      try {
        await asTwo.setURI("changed");
      } catch (e) {
        if (e instanceof Error) {
          error = e.message;
        }
        expect(error).to.include("caller is not the owner");
      }
    });
  });
});
