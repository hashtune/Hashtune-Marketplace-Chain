import hre from "hardhat";
import { ethers } from "hardhat";
import { SongOrAlbumNFT } from "../src/types/SongOrAlbumNFT";
import "@nomiclabs/hardhat-ethers";

async function main() {

    const provider = ethers.provider; 

    const add1 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const add2 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    const add3 = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

    //User flow for the auction functionalities
    const SongOrAlbum = await hre.ethers.getContractFactory("SongOrAlbumNFT");
    const bider1: SongOrAlbumNFT = (await SongOrAlbum.deploy("")) as SongOrAlbumNFT;
    await bider1.deployed();

    bider1.on("TokenCreated", (by, tokenId, creators) => {
        console.log("Token created!", "By: ", by, "Token ID:", tokenId, "Createors:", creators);
    });

    bider1.on("NewAuction",(tokenId, auctionNum, targetPrice, endTime) => {
        console.log("New Auction!", "Token ID: ", tokenId, "Auction Num: ", auctionNum, "Target Price: ", targetPrice, "End Time: ", endTime);
    });

    bider1.on("NewBid",(by, tokenId, amount) => {
        console.log("New Bid!", "By: ", by,"Token ID: ", tokenId,"Amount: ", amount);
    });

    bider1.on("EndAuction",(tokenId, auctionNum, newOwner, soldFor) => {
        console.log("Auction Ended!", "Token ID: ", tokenId, "Auction Num: ", auctionNum, "New Owner: ", newOwner, "Sold For: ", soldFor);
    });

    bider1.on("WithdrewMoney",(receiver, withdrawnAmount) => {
        console.log("Bid Money Witdrawn!", "Receiver: ", receiver, "Withdrawn Amount: ", withdrawnAmount);
    });

    await bider1.create([add1, add2], 1,[], ethers.utils.parseEther("0.005"));

    const [user1, user2, user3, user4] = await ethers.getSigners();

    const bider2 = bider1.connect(user2);
    const bider3 = bider1.connect(user3);
    const bider4 = bider1.connect(user4);

    await bider1.startAuction(1, 0, 0);

    await bider1.placeBid(1, {value: ethers.utils.parseEther("0.1")});
    console.log("Bider1 Balance: ", (await provider.getBalance(add1)).toString());

    await bider2.placeBid(1, {value: ethers.utils.parseEther("0.2")});
    console.log("Bider2 Balance: ", (await provider.getBalance(add2)).toString());

    await bider3.placeBid(1, {value: ethers.utils.parseEther("0.3")});
    console.log("Bider3 Balance: ", (await provider.getBalance(add3)).toString());

    await bider1.placeBid(1, {value: ethers.utils.parseEther("0.4")});
    await bider1.endAuction(1);

    await bider1.withdrawBidMoney(1);
    await bider2.withdrawBidMoney(1);
    await bider3.withdrawBidMoney(1);

    //await bider1.withdrawBidMoney(1);

    //await bider4.withdrawBidMoney(1);
}

main();