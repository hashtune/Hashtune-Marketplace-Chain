import hre from "hardhat";
import { ethers } from "hardhat";
import { SongOrAlbum } from "../src/types/SongOrAlbum";
import "@nomiclabs/hardhat-ethers"; // Adds ethers property object to hardhat run time environment

async function main() {
  // Addresses
  const ownerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const buyerAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const hashtuneAddress = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
  const buyerTwoAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  const thirdAddress = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";

  // Deploy
  const SongOrAlbum = await hre.ethers.getContractFactory("SongOrAlbum");
  const SOA: SongOrAlbum = (await SongOrAlbum.deploy(
    "http://blank"
  )) as SongOrAlbum;
  await SOA.deployed();

  // Mint token with ID 1138
  console.log(
    "Minting...",
    await SOA.create(
      [ownerAddress, thirdAddress], // royalty receivers
      1138,
      [],
      ethers.utils.parseEther("0.005") // price
    )
  );

  // Gas
  let prov = ethers.provider;
  console.log("gas", await prov.getGasPrice());

  // Log account balances before
  console.log(
    "balanceOwnerBefore",
    (await prov.getBalance(ownerAddress)).toString()
  );
  console.log(
    "balanceBuyerBefore",
    (await prov.getBalance(buyerAddress)).toString()
  );
  console.log(
    "balanceHashtuneBefore",
    (await prov.getBalance(hashtuneAddress)).toString()
  );

  const [owner, spender, holder] = await ethers.getSigners();

  // Increase the price to 0.006 ether
  await SOA.setCurrentPrice(ethers.utils.parseEther("0.006"), 1138);

  // Address 2 buys token from address 1
  // Current token owner approves purchase
  await SOA.setApprovalToBuy(spender.address, 1138);

  // Execute as buyer 2
  const buyer = SOA.connect(spender);
  await buyer.buy(1138, {
    value: ethers.utils.parseEther("0.006"),
  });

  // Check token was transferred to address 2
  console.log("Balance of", await SOA.balanceOf(ownerAddress, 1138));
  console.log("Balance of", await SOA.balanceOf(buyerAddress, 1138));
  console.log("Balance of", await SOA.balanceOf(buyerTwoAddress, 1138));

  // Log account balances after transfer 1
  console.log("balanceBuyer", (await prov.getBalance(buyerAddress)).toString());

  // Decrease the price to 0.004 ether
  await buyer.setCurrentPrice(ethers.utils.parseEther("0.004"), 1138);

  // Address 3 buys token from address 2
  await buyer.setApprovalToBuy(holder.address, 1138);

  // Execute as address 3
  const buyerTwo = buyer.connect(holder);
  await buyerTwo.buy(1138, {
    value: ethers.utils.parseEther("0.004"),
  });

  // Log account balances after transfer 2
  console.log(
    "balanceBuyerAfterApproval",
    (await prov.getBalance(buyerAddress)).toString()
  );
  console.log(
    "balanceBuyerAfterPurchase",
    (await prov.getBalance(buyerAddress)).toString()
  );

  // Check tokens was transferred to address 3
  console.log("Balance of", await SOA.balanceOf(ownerAddress, 1138));
  console.log("Balance of", await SOA.balanceOf(buyerAddress, 1138));
  console.log("Balance of", await SOA.balanceOf(buyerTwoAddress, 1138));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
