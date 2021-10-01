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
  const user: SongOrAlbumNFT = (await SongOrAlbum.deploy(
    "",2,2
  )) as SongOrAlbumNFT;
  await user.deployed();

  user.on("TokenCreated", (by, tokenId, creators) => {
    console.log(
      "Token created!",
      "By: ",
      by,
      "Token ID:",
      tokenId,
      "Createors:",
      creators
    );
  });

  await user.create([add1, add2], 
    [2, 2], 
    0, 
    "0x6c00000000000000000000000000000000000000000000000000000000000000", 
    ethers.utils.parseEther("0.005"), 
    "0x6c00000000000000000000000000000000000000000000000000000000000000", 
    1, 
    1);

}

main();
