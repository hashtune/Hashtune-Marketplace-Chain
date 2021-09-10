"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hardhat_1 = __importDefault(require("hardhat"));
const hardhat_2 = require("hardhat");
//https://hardhat.org/plugins/nomiclabs-hardhat-ethers.html
require("@nomiclabs/hardhat-ethers");
async function main() {
    console.log(process.env.TS_NODE_DEV);
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');
    // We get the contract to deploy, calls the constructor method
    const ownerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const buyerAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    const SongOrAlbum = await hardhat_1.default.ethers.getContractFactory("SongOrAlbum");
    const SOA = (await SongOrAlbum.deploy("http://blank", ownerAddress));
    await SOA.deployed();
    // console.log("Greeter deployed to:", SOA.address);
    // console.log("Greeter URI", await SOA.showURI(1));
    // console.log("setting URI", await SOA.setURI("CHANGED"));
    // console.log("Greeter URI", await SOA.showURI(1));
    // console.log("Balance of", await SOA.balanceOf(ownerAddress, 1138));
    // Create token of id 1
    console.log("Minting 10 of price 100", await SOA.create(ownerAddress, 1138, 20, [], 100));
    // console.log("Balance of", await SOA.balanceOf(ownerAddress, 1138));
    // console.log("Balance of", await SOA.balanceOf(ownerAddress, 1138));
    // console.log("price of", await SOA.showSalePriceFor(1138));
    // console.log("addy", SOA.buy);
    const [owner, addr1] = await hardhat_2.ethers.getSigners();
    // console.log({ owner });
    // Buy token
    // msg.value is what is set inside curly braces
    await SOA.buy(1138, ownerAddress, buyerAddress, {
        value: hardhat_2.ethers.utils.parseEther("3.0"),
    });
    console.log("Balance of", await SOA.balanceOf(ownerAddress, 1138));
    console.log("Balance of", await SOA.balanceOf(buyerAddress, 1138));
    //console.log("Balance of", await SOA.balanceOf(ownerAddress, 1138));
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then //() => process.exit(0)
()
    .catch((error) => {
    console.error(error);
    //process.exit(1);
});
