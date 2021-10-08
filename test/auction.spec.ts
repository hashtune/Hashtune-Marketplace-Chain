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

describe("auction", async () => {
  let context: Context;
  const prov = ethers.provider;
  // This is super cheap, this is a 17 USD token if 1 Ether is worth 3.4K USD
  const tokenPrice = ethers.utils.parseEther("0.005");
  const newTokenPrice = ethers.utils.parseEther("0.006");
  const highestTokenPrice = ethers.utils.parseEther("0.01");
  const lowerTokenPrice = ethers.utils.parseEther("0.004");
  beforeEach(async () => {
    const [one, two, three, four, five, six] = await ethers.getSigners();
    const SongOrAlbum = await hre.ethers.getContractFactory("SongOrAlbumNFT");
    const SOA: SongOrAlbumNFT = (await SongOrAlbum.deploy(
      "http://blank",
      2,
      2,
      10
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
      0, // Idle
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
    return SOA;
  });

  describe("Auction with reserve price", () => {
    it("can create an auction for a token I own with a reserve price", async () => {
      const res = await context.soa.startAuction(1, tokenPrice);
      expect(res.hash).to.not.be.undefined;
    });
    it("cannot create an auction for a token I do not own", async () => {
      const asTwo = connectAsUser(context.users.two, context);
      try {
        await asTwo.startAuction(1, tokenPrice);
      } catch (e) {
        const message = new String(e);
        expect(message.includes("you are not the owner of the art")).to.be.true;
      }
    });
    it("cannot create an auction for a token that already has an ongoing auction", async () => {
      await context.soa.startAuction(1, tokenPrice);
      try {
        await context.soa.startAuction(1, tokenPrice);
      } catch (e) {
        const message = new String(e);
        expect(message.includes("the art is already up for auction")).to.be
          .true;
      }
    });
    it("can bid on an auction if my price is higher than the reserve price", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asThree = connectAsUser(context.users.three, context);
      const res = await asThree.placeBid(1, { value: newTokenPrice });
      expect(res.hash).to.not.be.undefined;
    });
    it("cannot bid on an auction if my price is lower than the current highest aka the reserve price", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asThree = connectAsUser(context.users.three, context);
      try {
        await asThree.placeBid(1, { value: lowerTokenPrice });
      } catch (e) {
        const message = new String(e);
        expect(
          message.includes(
            "bid amount should be greater or equal to the reserved price"
          )
        ).to.be.true;
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
        const message = new String(e);
        expect(
          message.includes(
            "bid amount should be greater than the current highest"
          )
        ).to.be.true;
      }
    });
    it("can bid on an auction if my price is higher than the current high", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.placeBid(1, { value: newTokenPrice });
      const asThree = connectAsUser(context.users.three, context);
      const res = await asThree.placeBid(1, { value: highestTokenPrice });
      expect(res.hash).to.not.be.undefined;
    });
    it("can bid a lower reserve price and currenthigh if I already have a bid, it should be cumulative", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.placeBid(1, { value: newTokenPrice });
      const res = await asTwo.placeBid(1, { value: lowerTokenPrice });
      expect(res.hash).to.not.be.undefined;
    });
    it("cannot bid on an auction once it has ended", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.placeBid(1, { value: newTokenPrice });
      await new Promise((resolve) => setTimeout(resolve, 15000));
      await context.soa.endAuction(1);
      try {
        await asTwo.placeBid(1, { value: newTokenPrice });
      } catch (e) {
        const message = new String(e);
        expect(message.includes("the art is not availble for sale or auction"))
          .to.be.true;
      }
    });
    it("cannot end an auction that I created when the reserve price is met and 24hours has not passed", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.placeBid(1, { value: newTokenPrice });
      try {
        await context.soa.endAuction(1);
      } catch (e) {
        const message = new String(e);
        expect(message.includes("can`t end ongoing time based auction")).to.be
          .true;
      }
    });
    it("cannot end an auction that I created when the reserve price is not met and 24hours has  passed", async () => {
      await context.soa.startAuction(1, tokenPrice);
      await new Promise((resolve) => setTimeout(resolve, 15000));
      try {
        await context.soa.endAuction(1);
      } catch (e) {
        const message = new String(e);
        expect(message.includes("can`t end ongoing time based auction")).to.be
          .true;
      }
    });
    it("can end an auction that I created after the reserve price is met and 24hours has passed", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.placeBid(1, { value: newTokenPrice });
      await new Promise((resolve) => setTimeout(resolve, 15000));
      const res = await context.soa.endAuction(1);
      expect(res.hash).to.not.be.undefined;
    });
    it("cannot end an auction I did not create", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      try {
        await asTwo.endAuction(1);
      } catch (e) {
        const message = new String(e);
        expect(message.includes("you are not the owner of the art")).to.be.true;
      }
    });
    it("cannot withdraw my funds out if the auction is ongoing", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.placeBid(1, { value: newTokenPrice });
      try {
        await asTwo.withdrawBidMoney(1);
      } catch (e) {
        const message = new String(e);
        expect(message.includes("First auction is still ongoing")).to.be.true;
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
        const message = new String(e);
        expect(message.includes("First auction is still ongoing")).to.be.true;
      }
    });
    it("can withdraw my funds out after the auction ends if I did not win", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      const balanceBefore = await prov.getBalance(context.users.two.address);
      const transaction1 = await asTwo.placeBid(1, { value: newTokenPrice });
      const asThree = connectAsUser(context.users.three, context);
      await asThree.placeBid(1, { value: highestTokenPrice });
      await new Promise((resolve) => setTimeout(resolve, 15000));
      await context.soa.endAuction(1);
      const transaction2 = await asTwo.withdrawBidMoney(1);
      const balanceAfter = await prov.getBalance(context.users.two.address);
      const receipt1 = await prov.getTransactionReceipt(transaction1.hash);
      const receipt2 = await prov.getTransactionReceipt(transaction2.hash);
      const royaltyFeature = highestTokenPrice.mul(2).div(100).mul(10).div(100);
      expect(balanceAfter).to.be.equal(
        balanceBefore
          .sub(receipt1.cumulativeGasUsed.mul(receipt1.effectiveGasPrice))
          .sub(receipt2.cumulativeGasUsed.mul(receipt2.effectiveGasPrice))
          .add(royaltyFeature)
      );
    });
    it("cannot withdraw my funds out after the auction ends if I won", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      await prov.getBalance(context.users.two.address);
      await asTwo.placeBid(1, { value: newTokenPrice });
      const asThree = connectAsUser(context.users.three, context);
      await asThree.placeBid(1, { value: highestTokenPrice });
      await new Promise((resolve) => setTimeout(resolve, 15000));
      await context.soa.endAuction(1);
      try {
        await asThree.withdrawBidMoney(1);
      } catch (e) {
        const message = new String(e);
        expect(message.includes("you dont have any money in the biding pool"))
          .to.be.true;
      }
    });
    it("can withdraw my funds out after the auction ends even if a new one has started and is active", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      const balanceBefore = await prov.getBalance(context.users.two.address);
      const transaction1 = await asTwo.placeBid(1, { value: newTokenPrice });
      const asThree = connectAsUser(context.users.three, context);
      await asThree.placeBid(1, { value: highestTokenPrice });
      await new Promise((resolve) => setTimeout(resolve, 15000));
      await context.soa.endAuction(1);
      // Second auction
      await asThree.startAuction(1, tokenPrice);
      const transaction2 = await asTwo.withdrawBidMoney(1);
      const balanceAfter = await prov.getBalance(context.users.two.address);
      const receipt1 = await prov.getTransactionReceipt(transaction1.hash);
      const receipt2 = await prov.getTransactionReceipt(transaction2.hash);
      const royaltyFeature = highestTokenPrice.mul(2).div(100).mul(10).div(100);
      expect(balanceAfter).to.be.equal(
        balanceBefore
          .sub(receipt1.cumulativeGasUsed.mul(receipt1.effectiveGasPrice))
          .sub(receipt2.cumulativeGasUsed.mul(receipt2.effectiveGasPrice))
          .add(royaltyFeature)
      );
    });
    it("can receive the token if I am the last highest bidder", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.placeBid(1, { value: highestTokenPrice });
      await new Promise((resolve) => setTimeout(resolve, 15000));
      await context.soa.endAuction(1);
      const balanceOfWinner = await context.soa.balanceOf(
        context.users.two.address,
        1
      );
      const balanceOfOldOwner = await context.soa.balanceOf(
        context.users.one.address,
        1
      );
      expect(balanceOfWinner).to.be.equal("0x01");
      expect(balanceOfOldOwner).to.be.equal("0x00");
    });
    it("can receive payment after the auction ends if I am the token owner", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.placeBid(1, { value: highestTokenPrice });
      await new Promise((resolve) => setTimeout(resolve, 15000));
      const balanceBefore = await prov.getBalance(context.users.one.address);
      const transaction = await context.soa.endAuction(1);
      const balanceAfter = await prov.getBalance(context.users.one.address);
      const receipt = await prov.getTransactionReceipt(transaction.hash);
      const royaltyFeature = highestTokenPrice.mul(2).div(100).mul(10).div(100);
      expect(balanceAfter).to.be.equal(
        balanceBefore
          .sub(receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice))
          .add(highestTokenPrice)
          .sub(royaltyFeature)
      );
    });
    it("can receive royalties after the auction ends if I am the token creator", async () => {
      await context.soa.startAuction(1, tokenPrice);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.placeBid(1, { value: highestTokenPrice });
      await new Promise((resolve) => setTimeout(resolve, 15000));
      await context.soa.endAuction(1);
      // Second auction
      const oneBalanceBefore = await prov.getBalance(context.users.one.address);
      await asTwo.startAuction(1, tokenPrice);
      const twoBalanceBefore = await prov.getBalance(context.users.two.address);
      const asThree = connectAsUser(context.users.three, context);
      await asThree.placeBid(1, { value: highestTokenPrice });
      await new Promise((resolve) => setTimeout(resolve, 15000));
      const transaction = await asTwo.endAuction(1);

      const oneBalanceAfter = await prov.getBalance(context.users.one.address);
      const twoBalanceAfter = await prov.getBalance(context.users.two.address);
      const receipt = await prov.getTransactionReceipt(transaction.hash);
      const royaltyCreator = highestTokenPrice.mul(2).div(100).mul(90).div(100);
      const royaltyHashtune = highestTokenPrice.mul(2).div(100);
      expect(oneBalanceAfter).to.be.equal(
        oneBalanceBefore.add(royaltyCreator).add(royaltyHashtune)
      );
      expect(twoBalanceAfter).to.be.equal(
        twoBalanceBefore
          .add(highestTokenPrice)
          .sub(receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice))
          .sub(royaltyCreator)
          .sub(royaltyHashtune)
      );
    });
  });

  describe("Auction with no reserve price", () => {
    it("can create an auction for a token I own without a reserve price", async () => {
      const res = await context.soa.startAuction(1, 0);
      expect(res.hash).to.not.be.undefined;
    });
    it("cannot create an auction for a token I do not own", async () => {
      const asTwo = connectAsUser(context.users.two, context);
      try {
        await asTwo.startAuction(1, 0);
      } catch (e) {
        const message = new String(e);
        expect(message.includes("you are not the owner of the art")).to.be.true;
      }
    });
    it("cannot create an auction for a token that already has an ongoing auction", async () => {
      const asOne = connectAsUser(context.users.one, context);
      await asOne.startAuction(1, 0);
      try {
        await asOne.startAuction(1, 0);
      } catch (e) {
        const message = new String(e);
        expect(message.includes("the art is already up for auction")).to.be
          .true;
      }
    });
    it("cannot bid on an auction if my price is equal than the current high", async () => {
      const asOne = connectAsUser(context.users.one, context);
      await asOne.startAuction(1, 0);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.placeBid(1, { value: highestTokenPrice });
      try {
        const asThree = connectAsUser(context.users.three, context);
        await asThree.placeBid(1, { value: highestTokenPrice });
      } catch (e) {
        const message = new String(e);
        expect(
          message.includes(
            "bid amount should be greater than the current highest"
          )
        ).to.be.true;
      }
    });
    it("cannot bid on an auction if my price is lower than the current high", async () => {
      const asOne = connectAsUser(context.users.one, context);
      await asOne.startAuction(1, 0);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.placeBid(1, { value: highestTokenPrice });
      try {
        const asThree = connectAsUser(context.users.three, context);
        await asThree.placeBid(1, { value: lowerTokenPrice });
      } catch (e) {
        const message = new String(e);
        expect(
          message.includes(
            "bid amount should be greater than the current highest"
          )
        ).to.be.true;
      }
    });
    it("can bid on an auction if my price is higher than the current high", async () => {
      const asOne = connectAsUser(context.users.one, context);
      await asOne.startAuction(1, 0);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.placeBid(1, { value: lowerTokenPrice });
      const asThree = connectAsUser(context.users.three, context);
      const res = await asThree.placeBid(1, { value: highestTokenPrice });
      expect(res.hash).to.not.be.undefined;
    });
    it("cannot bid on an auction once it has ended", async () => {
      const asOne = connectAsUser(context.users.one, context);
      await asOne.startAuction(1, 0);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.placeBid(1, { value: lowerTokenPrice });
      await asOne.endAuction(1);
      try {
        const asThree = connectAsUser(context.users.three, context);
        await asThree.placeBid(1, { value: highestTokenPrice });
      } catch (e) {
        const message = new String(e);
        expect(message.includes("the art is not availble for sale or auction"))
          .to.be.true;
      }
    });
    it("can bid on an auction multiple times and have money pooled", async () => {
      const asOne = connectAsUser(context.users.one, context);
      await asOne.startAuction(1, 0);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.placeBid(1, { value: lowerTokenPrice });
      await asTwo.placeBid(1, { value: lowerTokenPrice });
      const asThree = connectAsUser(context.users.three, context);
      try {
        await asThree.placeBid(1, { value: highestTokenPrice });
      } catch (e) {
        const message = new String(e);
        expect(
          message.includes(
            "bid amount should be greator than the current highest"
          )
        ).to.be.true;
      }
    });
    it("can end an auction that I created whenever I want as long as there is at least one bid", async () => {
      const asOne = connectAsUser(context.users.one, context);
      await asOne.startAuction(1, 0);
      try {
        await asOne.endAuction(1);
      } catch (e) {
        const message = new String(e);
        expect(message.includes("transfer to the zero address")).to.be.true;
      }
    });
    // Currently not possible to withdraw funds for a non ending auction
    it.skip("can withdraw funds whenever I want", async () => {
      const asOne = connectAsUser(context.users.one, context);
      await asOne.startAuction(1, 0);
      const asTwo = connectAsUser(context.users.two, context);
      await asTwo.placeBid(1, { value: lowerTokenPrice });
      const res = await asTwo.withdrawBidMoney(1);
      expect(res.hash).to.not.be.undefined;
    });
    it("cannot end an auction I did not create", async () => {
      const asOne = connectAsUser(context.users.one, context);
      await asOne.startAuction(1, 0);
      const asTwo = connectAsUser(context.users.two, context);
      try {
        await asTwo.endAuction(1);
      } catch (e) {
        const message = new String(e);
        expect(message.includes("you are not the owner of the art")).to.be.true;
      }
    });
    it("can receive the money if from the highest bidder when the auction ends", async () => {
      const asOne = connectAsUser(context.users.one, context);
      await asOne.startAuction(1, 0);
      const asThree = connectAsUser(context.users.three, context);
      await asThree.placeBid(1, { value: lowerTokenPrice });
      await asThree.placeBid(1, { value: lowerTokenPrice });
      const asFour = connectAsUser(context.users.four, context);
      await asFour.placeBid(1, { value: highestTokenPrice });
      const asOneBefore = await prov.getBalance(context.users.one.address);
      const transaction = await asOne.endAuction(1);
      const receipt = await prov.getTransactionReceipt(transaction.hash);
      const asOneAfter = await prov.getBalance(context.users.one.address);
      const royaltyFeature = highestTokenPrice.mul(2).div(100).mul(10).div(100);
      expect(asOneAfter).to.be.equal(
        asOneBefore
          .sub(receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice))
          .add(highestTokenPrice)
          .sub(royaltyFeature)
      );
    });
    it("can receive the token if I am the last highest bidder when the auction ends", async () => {
      const asOne = connectAsUser(context.users.one, context);
      await asOne.startAuction(1, 0);
      const asThree = connectAsUser(context.users.three, context);
      await asThree.placeBid(1, { value: lowerTokenPrice });
      await asThree.placeBid(1, { value: lowerTokenPrice });
      const asFour = connectAsUser(context.users.four, context);
      await asFour.placeBid(1, { value: highestTokenPrice });
      await asOne.endAuction(1);
      const balanceOfWinner = await context.soa.balanceOf(
        context.users.four.address,
        1
      );
      const balanceOfOldOwner = await context.soa.balanceOf(
        context.users.one.address,
        1
      );
      expect(balanceOfWinner).to.be.equal("0x01");
      expect(balanceOfOldOwner).to.be.equal("0x00");
    });
    it("can withdraw my funds after the owner accept someone elses bid", async () => {
      const asOne = connectAsUser(context.users.one, context);
      await asOne.startAuction(1, 0);
      const asThree = connectAsUser(context.users.three, context);
      const threeBalanceBefore = await prov.getBalance(
        context.users.three.address
      );
      const transaction1 = await asThree.placeBid(1, {
        value: lowerTokenPrice,
      });
      const transaction2 = await asThree.placeBid(1, {
        value: lowerTokenPrice,
      });
      const asFour = connectAsUser(context.users.four, context);
      await asFour.placeBid(1, {
        value: highestTokenPrice,
      });
      await asOne.endAuction(1);
      const transaction3 = await asThree.withdrawBidMoney(1);
      const receipt1 = await prov.getTransactionReceipt(transaction1.hash);
      const receipt2 = await prov.getTransactionReceipt(transaction2.hash);
      const receipt3 = await prov.getTransactionReceipt(transaction3.hash);
      const threeBalanceAfter = await prov.getBalance(
        context.users.three.address
      );
      expect(threeBalanceAfter).to.be.equal(
        threeBalanceBefore
          .sub(receipt1.cumulativeGasUsed.mul(receipt1.effectiveGasPrice))
          .sub(receipt2.cumulativeGasUsed.mul(receipt2.effectiveGasPrice))
          .sub(receipt3.cumulativeGasUsed.mul(receipt3.effectiveGasPrice))
      );
    });
    it("can receive royalties on the second auction after the auction ends if I am the token creator", async () => {
      const asOne = connectAsUser(context.users.one, context);
      // First auction
      await asOne.startAuction(1, 0);
      const asThree = connectAsUser(context.users.three, context);
      await asThree.placeBid(1, {
        value: lowerTokenPrice,
      });
      await asOne.endAuction(1);
      const oneBalanceBefore = await prov.getBalance(context.users.one.address);
      const twoBalanceBefore = await prov.getBalance(context.users.two.address);
      // Second auction
      await asThree.startAuction(1, 0);
      const asFour = connectAsUser(context.users.four, context);
      await asFour.placeBid(1, { value: highestTokenPrice });
      await asThree.endAuction(1);
      const oneBalanceAfter = await prov.getBalance(context.users.one.address);
      const twoBalanceAfter = await prov.getBalance(context.users.two.address);
      const royaltyCreator = highestTokenPrice.mul(2).div(100).mul(90).div(100);
      const royaltyFeature = highestTokenPrice.mul(2).div(100).mul(10).div(100);
      const hashtuneRoyalty = highestTokenPrice.mul(2).div(100);
      // Hashtune royalty goes to address one aswell
      expect(oneBalanceAfter).to.be.equal(
        oneBalanceBefore.add(royaltyCreator).add(hashtuneRoyalty)
      );
      expect(twoBalanceAfter).to.be.equal(twoBalanceBefore.add(royaltyFeature));
    });
  });
  describe.skip("events", () => {});
  describe.skip("serially incrementing token Ids", () => {});
});
