import hre from "hardhat";
import "@nomiclabs/hardhat-ethers"; // Adds ethers property object to hardhat run time environment. Must be loaded last.
// After every mutation on the front end we
// send a request to the chain so we can interact with the wallet
// We have global event listeners in the back end and when something happens
// we call our back end
// from the artists public key, and when it happens we created the source
// and resolve the request successfully
async function main() {
  // const instance = await hre.ethers.getContractFactory("SongOrAlbumNFT");
  const contractInstance = await hre.ethers.getContractAt(
    "SongOrAlbumNFT",
    process.env.CONTRACT!
  );
  console.log({ contractInstance });

  // LISTENER
  const eventList = contractInstance.interface.events;
  const names = Object.keys(eventList).map((fragment) => {
    return {
      [eventList[fragment].name]: eventList[fragment].inputs.map(
        (input) => input.name
      ),
    };
  });
  names.forEach((event) => {
    const key = Object.keys(event)[0];
    contractInstance.on(key, (...args) => {
      const txIndex = args.length;
      console.log(`EVENT: ${key}:`, args);
      console.log(args[txIndex - 1]);
    });
  });

  // MUTATE (front end)
  const tokenPrice = hre.ethers.utils.parseEther("0.005");
  const tokenId = 1111;
  await contractInstance.setCurrentPrice(tokenPrice, tokenId, {
    gasLimit: 100000,
  });
}

main();
