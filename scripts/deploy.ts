import "@nomiclabs/hardhat-ethers"; // Adds ethers property object to hardhat run time environment
import hre from "hardhat";
import { SongOrAlbumNFT } from "../src/types/SongOrAlbumNFT";

async function main() {
  //   const hastune = await hre.ethers.getSigner(process.env.ONE!);
  const SongOrAlbum = await hre.ethers.getContractFactory("SongOrAlbumNFT");
  const SOA: SongOrAlbumNFT = (await SongOrAlbum.deploy(
    "http://blank",
    2,
    2,
    10000
  )) as SongOrAlbumNFT;
  // Deploy the contract
  await SOA.deployed();
  console.log(SOA.address);

  if (!SOA) {
    throw new Error("Problem deploying the contract");
  }
}
main();
