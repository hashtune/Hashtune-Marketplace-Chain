import hre from "hardhat";
import { ethers } from "hardhat";
import { SongOrAlbumNFT } from "../src/types/SongOrAlbumNFT";
import "@nomiclabs/hardhat-ethers";

async function main() {
  const provider = ethers.provider;

  const add1 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const add2 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const add3 = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  const add4 = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";

  //User flow for the auction functionalities
  const SongOrAlbum = await hre.ethers.getContractFactory("SongOrAlbumNFT");
  const contract: SongOrAlbumNFT = (await SongOrAlbum.deploy(
    "",
    2,
    2,
    10
  )) as SongOrAlbumNFT;
  await contract.deployed();

  contract.on("NewAuction", (tokenId, auctionNum, targetPrice, endTime) => {
    console.log(
      "New Auction!",
      "Token ID: ",
      tokenId,
      "Auction Num: ",
      auctionNum,
      "Target Price: ",
      targetPrice,
      "End Time: ",
      endTime
    );
  });

  contract.on("NewBid", (by, tokenId, amount) => {
    console.log(
      "New Bid!",
      "By: ",
      by,
      "Token ID: ",
      tokenId,
      "Amount: ",
      amount
    );
  });

  contract.on("EndAuction", (tokenId, auctionNum, newOwner, soldFor) => {
    console.log(
      "Auction Ended!",
      "Token ID: ",
      tokenId,
      "Auction Num: ",
      auctionNum,
      "New Owner: ",
      newOwner,
      "Sold For: ",
      soldFor
    );
  });

  contract.on("WithdrawMoney", (receiver, withdrawnAmount) => {
    console.log(
      "Bid Money Witdrawn!",
      "Receiver: ",
      receiver,
      "Withdrawn Amount: ",
      withdrawnAmount
    );
  });

  contract.on(
    "TokenCreated",
    (
      by,
      tokenId,
      creators,
      creatorsRoyalty,
      status,
      digest,
      hashFunction,
      size
    ) => {
      console.log(
        "Token created!",
        "By: ",
        by,
        "Token ID:",
        tokenId,
        "Creators:",
        creators,
        "Creators Share:",
        creatorsRoyalty,
        "Status:",
        status,
        "Digest:",
        digest,
        "Hash Function:",
        hashFunction,
        "Size:",
        size
      );
    }
  );

  contract.on("TokenPurchased", (by, tokenId) => {
    console.log("By: ", by, "tokenId: ", tokenId);
  });

  const [hashtune, artist1, artist2, bider] = await ethers.getSigners();

  console.log(
    "Balance before: ",
    "Hastune Balance: ",
    ethers.utils.formatEther(await provider.getBalance(add1)).toString(),
    "Artist 1 Balance: ",
    ethers.utils.formatEther(await provider.getBalance(add2)).toString(),
    "Artist 2 Balance: ",
    ethers.utils.formatEther(await provider.getBalance(add3)).toString(),
    "Collector Balance: ",
    ethers.utils.formatEther(await provider.getBalance(add4)).toString()
  );

  await contract.approveArtist("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");

  const contract2 = contract.connect(artist1);
  const contract3 = contract.connect(artist2);
  const contract4 = contract.connect(bider);

  await contract2.create(
    [add2, add3],
    [50, 50],
    2,
    "0x6c00000000000000000000000000000000000000000000000000000000000000",
    ethers.utils.parseEther("1"),
    ethers.utils.parseEther("0"),
    "0x6c00000000000000000000000000000000000000000000000000000000000000",
    1,
    1
  );

  await contract.placeBid(1, { value: ethers.utils.parseEther("1") });
  console.log("Bider1 Balance: ", (await provider.getBalance(add1)).toString());

  await contract4.placeBid(1, { value: ethers.utils.parseEther("2") });
  console.log("Bider2 Balance: ", (await provider.getBalance(add2)).toString());

  await contract3.placeBid(1, { value: ethers.utils.parseEther("3") });
  console.log("Bider3 Balance: ", (await provider.getBalance(add3)).toString());

  await contract.placeBid(1, { value: ethers.utils.parseEther("3") });
  await contract2.endAuction(1);

  console.log(
    "Balance before: ",
    "Hastune Balance: ",
    ethers.utils.formatEther(await provider.getBalance(add1)).toString(),
    "Artist 1 Balance: ",
    ethers.utils.formatEther(await provider.getBalance(add2)).toString(),
    "Artist 2 Balance: ",
    ethers.utils.formatEther(await provider.getBalance(add3)).toString(),
    "Bider Balance: ",
    ethers.utils.formatEther(await provider.getBalance(add4)).toString()
  );

  await contract.withdrawBidMoney(1);
  await contract3.withdrawBidMoney(1);
  await contract4.withdrawBidMoney(1);

  //await bider1.withdrawBidMoney(1);

  //await bider4.withdrawBidMoney(1);
}

main();
