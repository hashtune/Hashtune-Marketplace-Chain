## Development

`npm install`

`npx hardhat watch compilation` to watch changes to the contract (contracts/SongOrAlbumNFT.sol)

In another terminal window:

`npm run dev:start` to run the script that calls the functions (scripts/songOrAlbumNFT.ts)

## Testing

`npx hardhat node` starts Hardhat Network, and expose it as a JSON-RPC and WebSocket server, can connect to it via http://localhost:8545

`npm run test:local` in another terminal

`npm run test:local:ws` to listen for events locally in another terminal, need to manually replace the process.env.CONTRACT with the address of a deployed contract

`UPDATE_SNAPSHOT=1 npx hardhat test` to update snapshots

### Testnet

`npm run test:ci:ws` to listen for events on the test net

`npm run test:ci` to run the tests on the test net in another terminal

## Deploying

Get binance extension
Make a dummy address
Copy password into .secret.json
Get 1BNB from https://testnet.binance.org/faucet-smart
https://docs.binance.org/smart-chain/developer/rpc.html for the RPC endpoint
https://testnet.bscscan.com/ with the public key used to deploy to view the deployment

TODO:
Run the tests on every PR with localhost
and with public test network
