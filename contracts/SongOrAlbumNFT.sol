//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// override key word means it is overriding a virtual function it inherited from
// public - all can access
// external - Cannot be accessed internally, only externally
// internal - only this contract and contracts deriving from it can access
// private - can be accessed only from this contract
// TODO add event emissions
contract SongOrAlbumNFT is ERC1155, Ownable, AccessControl {

    //TODO: convert into a seperate Library to save storage
    struct auctionInfo {
        uint256 currentHigh;
        address currentHighBider;
        uint256 endTime;
        uint256 targetPrice;
        bool isFinalized;
    }
    
    //TODO: refactor to use different structure in order to save some storage
    mapping(uint256 => uint256) public _prices;
    mapping(uint256 => address[]) private _tokenCreators;
    mapping(uint256 => address) private _currentOwners;
    mapping(uint256 => bool) public _listings;
    mapping(uint256 => mapping(uint256 => auctionInfo)) public bids;
    mapping(address => mapping(uint256 => mapping(uint256 => uint256))) public bidMoneyPool;
    mapping(uint256 => uint256) public totalAuctions; // alternative to mapping array of struct 

    // Custom Events
    event NewURI(address setBy, string newAddress);
    event TokenCreated(address by, uint256 tokenId, address[] creators);
    event TokenPurchased(address by, uint256 tokenId);
    event PayoutOccurred(address to, uint256 amount);
    event NewPrice(address setBy, uint256 newPrice, uint256 tokenId);
    event NewBid(address by, uint256 tokenId, uint256 amount);
    event NewAuction(uint256 tokenId, uint256 auctionNum, uint256 targetPrice, uint256 endTime);
    event EndAuction(uint256 tokenId, uint256 auctionNum, address newOwner, uint256 soldFor);
    event WithdrewMoney(address receiver, uint256 withdrawnAmount);
    
    constructor (string memory uri_) ERC1155(uri_) {
        console.log("Deploying a Song or Album Contract with uri:", uri_);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    // Example of such a URI: https://token-cdn-domain/{id}.json would be replaced with https://token-cdn-domain/000000000000000000000000000000000000000000000000000000000004cce0.json if the client is referring to token ID 314592/0x4CCE0.
    function setURI(string memory newuri) public onlyOwner {
        emit NewURI(msg.sender, newuri);
        _setURI(newuri);
    }

    // One URI for all tokens
    function showURI(uint256 id) public view returns (string memory) {
        return uri(id);
    }

    function showSalePriceFor(uint256 id) public view returns (uint256) {
        return _prices[id];
    }

    function create(address[] memory accounts, uint256 id, bytes memory data, uint256 salePrice) onlyOwner
        public
    {
        // Emits a TransferSingle 
        emit TokenCreated(msg.sender, id, accounts);
        _prices[id] = salePrice;
        _tokenCreators[id] = accounts;
        _currentOwners[id] = msg.sender;
        _listings[id] = true;
        _mint(msg.sender, id, 1, data);
    }

    function setApprovalToBuy(address toApprove, uint256 tokenId) public {
        // Emits setApprovalForAll
        require(_currentOwners[tokenId] == msg.sender, "cannot set approval if not token owner");
        return setApprovalForAll(toApprove, true);
    }
  
    function buy(uint256 tokenId) public payable {
        // Emits a TransferSingle 
        emit TokenPurchased(msg.sender, tokenId);
        uint256 price = showSalePriceFor(tokenId);
        require(msg.value == price, "incorrect amount sent");
        //require(_listings[tokenId] == true, "art piece not for sale"); only makes sense if theres one
        require(msg.sender != address(0) && msg.sender != address(this), "cannot buy your own token");

        // Royalty
        // TODO customize the royalty for each feature
        // Assuming ether and not wei (10^18 ether)
        // Need to restrict the number of features
        uint256 creatorRoyalty = (msg.value * 2) / 100;
        uint256 _tokenCreatorsLength = _tokenCreators[tokenId].length;
        for (uint256 i=0; i<_tokenCreatorsLength; i++) {
            sendTo(payable(_tokenCreators[tokenId][i]), creatorRoyalty);
        }
        
        // Hashtune Cut
        address hashtuneAddress = address(0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199);
        uint256 platformCut = (msg.value * 2) / 100;
        sendTo(payable(hashtuneAddress), platformCut);

        // Current Owner
        // On the first transaction the current owner is the first creator
        // and thus does not receive a royalty
        uint256 amount = msg.value - (creatorRoyalty * _tokenCreatorsLength) - platformCut;
        sendTo(payable(_currentOwners[tokenId]), amount);
        bytes memory data;

        // Transfer token
        // Need to actually transfer the contract if using 721Upgradeable (?)
        safeTransferFrom(_currentOwners[tokenId], msg.sender, tokenId, 1, data);
        _currentOwners[tokenId] = msg.sender;
    }

    function sendTo(address payable receiver, uint256 _amount) private {
        // Not sure if this emits a default transfer event?
        emit PayoutOccurred(receiver, _amount);
        require(receiver != address(0) && receiver != address(this), "receiver is contract address owner");
        require(_amount > 0 && _amount <= address(this).balance, "amount is less than contract balance");
        receiver.transfer(_amount);
    }
    
    // set listed? This will cost gas to set but prevents a sale from happening without current owners consent?
    function getCurrentOwner(uint256 tokenId) view public returns (address) {
        return _currentOwners[tokenId];
    }

    // Set current price and buy could have a race condition, make sure you 
    // TODO: disable purchase while updating prices by pausing contract first then unpausing
    function setCurrentPrice(uint256 newPrice, uint256 tokenId) public  {
        emit NewPrice(msg.sender, newPrice, tokenId);
        require(msg.sender == _currentOwners[tokenId], "cannot set the price for a token you don't currently own");
        require(newPrice > 0, "cannot set the new price of the token to zero");
        _prices[tokenId] = newPrice;
    }

    //Start the Auction on limeted time based model or without time contraint
    // TODO: implementing the limited time based auction model
    function startAuction(uint256 tokenId, uint256 targetPrice, uint256 duration) public {
        address currentOwner = _currentOwners[tokenId];
        uint256 previousAuctions = totalAuctions[tokenId];
        bool wasFinalized = bids[tokenId][previousAuctions].isFinalized;
        if(previousAuctions > 0) {
            require(wasFinalized, "previous auction is still on going.");
        }
        uint256 endTime = block.timestamp + duration;
        require(currentOwner == msg.sender, "can't start the auction of NFT you don't own");
        uint256 newAuctionNum = totalAuctions[tokenId] += 1;
        if(duration > 0) {
            require(endTime > block.timestamp, "auction endtime should be set to future");
            bids[tokenId][newAuctionNum].endTime = endTime;
        } else {
            bids[tokenId][newAuctionNum].endTime = 0;
        }
        bids[tokenId][newAuctionNum].targetPrice = targetPrice;
        bids[tokenId][newAuctionNum].currentHigh = 0;
        bids[tokenId][newAuctionNum].isFinalized = false;
        emit NewAuction(tokenId, newAuctionNum, bids[tokenId][newAuctionNum].targetPrice, endTime);
    }

    //TODO: implement safe check for whether NFT is up for auction
    function placeBid(uint256 tokenId) public payable {
        uint256 currentAuctionNum = totalAuctions[tokenId];
        uint256 newBidSum = msg.value + bidMoneyPool[msg.sender][tokenId][currentAuctionNum];
        uint256 endTime = bids[tokenId][currentAuctionNum].endTime;
        bool isEnded = bids[tokenId][currentAuctionNum].isFinalized;
        require(!isEnded, "auction is closed for this NFT");
        if(endTime == 0 || endTime < block.timestamp) {
            require(msg.value > 0, "bid amount should be greator than 0");
            require( newBidSum > bids[tokenId][currentAuctionNum].currentHigh, "bid amount should be greator than the current highest");
            bidMoneyPool[msg.sender][tokenId][currentAuctionNum] += msg.value;
            bids[tokenId][currentAuctionNum].currentHigh = newBidSum;
            bids[tokenId][currentAuctionNum].currentHighBider = msg.sender;
        } else {
            revert("auction is closed for this NFT");
        }
        emit NewBid(msg.sender, tokenId, msg.value);
    }

    //TODO: implement safe check for whether NFT is up for auction, spliting the royalties, transfering the money
    function endAuction(uint256 tokenId) public {
        uint256 currentAuctionNum = totalAuctions[tokenId];
        require(_currentOwners[tokenId] == msg.sender, "only owner of the NFT can end the auction");
        if(bids[tokenId][currentAuctionNum].endTime == 0) {
            bids[tokenId][currentAuctionNum].isFinalized = true;
            bytes memory data;
            safeTransferFrom(_currentOwners[tokenId], bids[tokenId][currentAuctionNum].currentHighBider, tokenId, 1, data);
        } else {
            require(bids[tokenId][currentAuctionNum].endTime < block.timestamp, "can`t end ongoing time based auction");
            bids[tokenId][currentAuctionNum].isFinalized = true;
            bytes memory data;
            safeTransferFrom(_currentOwners[tokenId], bids[tokenId][currentAuctionNum].currentHighBider, tokenId, 1, data);
        }
        emit EndAuction(tokenId, currentAuctionNum, bids[tokenId][currentAuctionNum].currentHighBider, bids[tokenId][currentAuctionNum].currentHigh);
    }

    //lets you withdraw your bid money when the auction is ended.
    //TODO: implement withdraw all the previous money in case the current auction is ongoing
    function withdrawBidMoney(uint tokenId) public {
        uint256 currentAuctionNum = totalAuctions[tokenId];
        uint256 currentAuctionBalance = bidMoneyPool[msg.sender][tokenId][currentAuctionNum];
        bool isFinalized = bids[tokenId][currentAuctionNum].isFinalized;
        
        uint256 balance;
        if(currentAuctionBalance == 0) {
            balance = bidMoneyPoolCalculator(tokenId, currentAuctionNum < 2 ? 0 : currentAuctionNum - 1 , msg.sender);
            if(balance > 0) {
                if(!payable(msg.sender).send(balance)) {
                    revert("withdrawal unsuccessful");
                }
            } else {
                revert("you don't have any money in the bidding pool");
            }
        } else {
            require(isFinalized, "can't withdraw money until the auction has ended");
            balance = bidMoneyPoolCalculator(tokenId, currentAuctionNum, msg.sender);
            if(balance > 0) {
                if(!payable(msg.sender).send(balance)) {
                    revert("withdrawal unsuccessful");
                }
            } else {
                revert("you don't have any money in the bidding pool");
            }
        }
        emit WithdrewMoney(msg.sender, balance);
    }

    //helper function to save storage
    function bidMoneyPoolCalculator(uint256 tokenId, uint256 toAuctionNum, address bider) internal returns (uint256) {
        require(toAuctionNum > 0, "no previous auctions happened for this NFT");
        uint256 balance;
        for(uint256 i=1; i <= toAuctionNum; i++) {
                balance += bidMoneyPool[bider][tokenId][i];
                bidMoneyPool[bider][tokenId][i] = 0;
        }
        return balance;
    }
}