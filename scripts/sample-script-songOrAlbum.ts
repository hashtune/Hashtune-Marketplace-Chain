import hre from "hardhat";
import { ethers } from "hardhat";
import { SongOrAlbum } from "../src/types/SongOrAlbum";
import "@nomiclabs/hardhat-ethers"; // Adds ethers property object to hardhat run time environment

async function main() {
  console.log(process.env.TS_NODE_DEV);
  // We get the contract to deploy, calls the constructor method
  const ownerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const buyerAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const hashtuneAddress = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
  const buyerTwoAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  const thirdAddress = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
  // introduce multiple creators.
  const SongOrAlbum = await hre.ethers.getContractFactory("SongOrAlbum");
  const SOA: SongOrAlbum = (await SongOrAlbum.deploy(
    "http://blank"
  )) as SongOrAlbum;

  await SOA.deployed();

  // Create token of id 1
  console.log(
    "Minting...",
    await SOA.create(
      [ownerAddress, thirdAddress],
      1138,
      20,
      [],
      ethers.utils.parseEther("0.005")
    )
  );
  let prov = ethers.provider;
  console.log("gas", await prov.getGasPrice());

  const balanceOwnerBefore = await (
    await prov.getBalance(ownerAddress)
  ).toString();
  console.log({ balanceOwnerBefore });
  const balanceBuyerBefore = await (
    await prov.getBalance(buyerAddress)
  ).toString();
  console.log({ balanceBuyerBefore });
  const balanceHashtuneBefore = await (
    await prov.getBalance(hashtuneAddress)
  ).toString();
  console.log({ balanceHashtuneBefore });

  // Buy the token from address 2
  const [owner, spender, holder] = await ethers.getSigners();
  await SOA.setApprovalToBuy(spender.address, 1138);
  const buyer = SOA.connect(spender);
  await buyer.buy(1138, {
    value: ethers.utils.parseEther("0.005"),
  });

  // Check balances were transferred
  console.log("Balance of", await SOA.balanceOf(ownerAddress, 1138));
  console.log("Balance of", await SOA.balanceOf(buyerAddress, 1138));
  console.log("Balance of", await SOA.balanceOf(buyerTwoAddress, 1138));

  const balanceBuyer = (await prov.getBalance(buyerAddress)).toString();
  console.log({ balanceBuyer });

  await buyer.setApprovalToBuy(holder.address, 1138);
  const balanceBuyerAfterApproval = (
    await prov.getBalance(buyerAddress)
  ).toString();
  console.log({ balanceBuyerAfterApproval });

  const buyerTwo = buyer.connect(holder);
  await buyerTwo.buy(1138, {
    value: ethers.utils.parseEther("0.005"),
  });

  const balanceBuyerAfterPurchase = (
    await prov.getBalance(buyerAddress)
  ).toString();
  console.log({ balanceBuyerAfterPurchase });

  // const balanceHashtuneAfterAfter = (
  //   await prov.getBalance(hashtuneAddress)
  // ).toString();
  // console.log({ balanceHashtuneAfterAfter });
  // Check balances were transferred
  console.log("Balance of", await SOA.balanceOf(ownerAddress, 1138));
  console.log("Balance of", await SOA.balanceOf(buyerAddress, 1138));
  console.log("Balance of", await SOA.balanceOf(buyerTwoAddress, 1138));
  console.log((await prov.getBalance(ownerAddress)).toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// graph protocol - indexing protocol to index from blockchain, you need to stake tokens for this
// this is only for views, to speed up views.
// could use our own indexing from block chain - how often do we request to view the block chain?
// individual songs
// album contain will just be one NFT and then the songs will live in the metadata.

// Paste the code into
// Remix.ethereum.org to get the price of the gas, choose Virtual Environment.

// Try it on the test net
// ropstsen test net, connect and try and do transactions
// faucet.ropsten.be - send me test ether
// gas cost ethereum etherscan
// For use as an authentication. store profile data. Main thing is we verify our users by this.
// erc 725 https://docs.ethhub.io/built-on-ethereum/identity/ERC725/
// https://github.com/ethereum/EIPs/issues/1056 decentralized identity
