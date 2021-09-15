## Development

`npm install`

`npx hardhat watch compilation` to watch changes to the contract (contracts/SongOrAlbum.sol)

In another terminal window:

`npm run dev:start` to run the script that calls the functions (scripts/sample-script-songOrAlbum.ts)

## Testing

`npx hardhat test`

`UPDATE_SNAPSHOT=1 npx hardhat test` to update snapshots
