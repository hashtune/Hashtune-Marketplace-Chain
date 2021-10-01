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

describe("auction", async () => {
  let context: Context;
  const tokenId = 1;
  // This is super cheap, this is a 17 USD token if 1 Ether is worth 3.4K USD
  const tokenPrice = ethers.utils.parseEther("0.005");
  const newTokenPrice = ethers.utils.parseEther("0.006");
  const highestTokenPrice = ethers.utils.parseEther("0.008");
  const lowerTokenPrice = ethers.utils.parseEther("0.004");
  beforeEach(async () => {
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
    return SOA;
  });

  describe("Auction with reserve price", () => {
    it("can create an auction for a token I own with a reserve price", async () => {
      const res = await context.soa.startAuction(1, tokenPrice);
      expect(res.from).toMatchSnapshot();
    });
    it("cannot create an auction for a token I do not own", async () => {
      const asTwo = connectAsUser(context.users.two, context);
      try {
        await asTwo.startAuction(1, tokenPrice);
      } catch (e) {
        expect(e).toMatchSnapshot();
      }
    });
    it("cannot create an auction for a token that already has an ongoing auction", async () => {
      await context.soa.startAuction(1, tokenPrice);
      try {
        await context.soa.startAuction(1, tokenPrice);
      } catch (e) {
        expect(e).toMatchSnapshot();
      }
    });
    it("can bid on an auction if my price is higher than the reserve price", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      const res = await asTwo.placeBid(1, { value: newTokenPrice });
      expect(res.from).toMatchSnapshot();
    });
    it("cannot bid on an auction if my price is lower than the reserve price", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      try {
        const res = await asTwo.placeBid(1, { value: lowerTokenPrice });
      } catch (e) {
        expect(e).toMatchSnapshot();
      }
    });
    it("cannot bid on an auction if my price is lower than the current high", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      const asThree = connectAsUser(context.users.three, context);
      await asTwo.placeBid(1, { value: newTokenPrice });
      try {
        await asThree.placeBid(1, { value: lowerTokenPrice });
      } catch (e) {
        expect(e).toMatchSnapshot();
      }
    });
    it("can bid on an auction if my price is higher than the current high", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.placeBid(1, { value: newTokenPrice });
      const asThree = connectAsUser(context.users.three, context);
      const res = await asThree.placeBid(1, { value: highestTokenPrice });
      expect(res.from).toMatchSnapshot();
    });
    it("can bid a lower reserve price and currenthigh if I already have a bid, it should be cumulative", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.placeBid(1, { value: newTokenPrice });
      const res = await asTwo.placeBid(1, { value: lowerTokenPrice });
      expect(res.from).toMatchSnapshot();
    });
    it.skip("cannot bid on an auction once it has ended", async () => {
      // You cannot close an auction that has no bids.
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.placeBid(1, { value: newTokenPrice });
      await context.soa.endAuction(1);
      try {
        await asTwo.placeBid(1, { value: newTokenPrice });
      } catch (e) {
        expect(e).toMatchSnapshot();
      }
    });
    it("cannot end an ongoing auction before the end time", async () => {
      // You cannot close an auction that has no bids.
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.placeBid(1, { value: newTokenPrice });
      try {
        await context.soa.endAuction(1);
      } catch (e) {
        expect(e).toMatchSnapshot();
      }
    });
    it.skip("can end an auction that I created", () => {});
    it("cannot end an auction I did not create", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      try {
        await asTwo.endAuction(1);
      } catch (e) {
        expect(e).toMatchSnapshot();
      }
    });
    it.skip("can receive the token if I am the last highest bidder", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.placeBid(1, { value: newTokenPrice });
      const asThree = connectAsUser(context.users.three, context);
      await asThree.placeBid(1, { value: highestTokenPrice });
      //End auction after 24hours and check new Owner and funds
      // expect(res.from).toMatchSnapshot();
    });
    it("cannot withdraw my funds out if the auction is ongoing", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.placeBid(1, { value: newTokenPrice });
      try {
        await asTwo.withdrawBidMoney(1);
      } catch (e) {
        expect(e).toMatchSnapshot();
      }
    });
    it("cannot withdraw my funds out if I did not put money in", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      const asThree = connectAsUser(context.users.three, context);
      await asTwo.placeBid(1, { value: newTokenPrice });
      try {
        await asThree.withdrawBidMoney(1);
      } catch (e) {
        expect(e).toMatchSnapshot();
      }
    });
    it.skip("can withdraw my funds out after the auction ends if I did not win", () => {});
    it.skip("cannot withdraw my funds out after the auction ends if I won", () => {});
    it.skip("can receive payment after the auction ends if I am the token owner", () => {});
    it.skip("can receive royalties after the auction ends if I am the token creator", () => {});
  });

  describe("Auction with no reserve price", () => {
    it("can create an auction for a token I own without a reserve price", () => {});
    it("cannot create an auction for a token I do not own", () => {});
    it("cannot create an auction for a token that already has an ongoing auction", async () => {});
    it("can bid on an auction if my price is higher than the current high", () => {});
    it("cannot bid on an auction if my price is lower than the current high", () => {});
    it("cannot bid on an auction once it has ended", () => {});
    it("can bid on an auction multiple times and have money pooled", () => {});
    it("can end an auction that I created", () => {});
    it("cannot end an auction I did not create", () => {});
    it("can receive the token if I am the last highest bidder when the auction ends", () => {});
    it("can withdraw my funds out after the auction ends if I did not win", () => {});
    it("cannot withdraw my funds out after the auction ends if I won", () => {});
    it("can receive payment after the auction ends if I am the token owner", () => {});
    it("can receive royalties after the auction ends if I am the token creator", () => {});
  });
  describe.skip("events", () => {});
  describe.skip("serially incrementing token Ids", () => {});
});
