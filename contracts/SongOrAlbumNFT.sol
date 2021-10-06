//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "./DataModel.sol";
import "./ArtistControl.sol";
// override key word means it is overriding a virtual function it inherited from
// public - all can access
// external - Cannot be accessed internally, only externally
// internal - only this contract and contracts deriving from it can access
// private - can be accessed only from this contract

/**
* @title A Marketplace for Music NFT
* @author Muhammad Anas Afzal
*/
contract SongOrAlbumNFT is ERC1155, ArtistControl, AccessControl {

    uint256 totalArts;
    address payable hashtuneAddress;
    uint256 hashtuneShare = 2; //represents 2%
    uint256 creatorsRoyaltyReserve = 2;

    mapping(uint256 => DataModel.ArtInfo) public arts; // maps tokenId to artInfo
    mapping(uint256 => mapping(uint256 => DataModel.AuctionInfo)) public bids; //maps tokenId to auctionId to auctionInfo
    mapping(address => mapping(uint256 => mapping(uint256 => uint256))) public bidMoneyPool; //maps userAddress to tokenId to auctionId to money
    mapping(uint256 => uint256) public totalAuctions; // maps tokenId to numOfAuctions

    // Custom Events
    event NewURI(address setBy, string newAddress);
    event TokenCreated(
        address by,
        uint256 tokenId,
        address payable[] creators,
        uint256[] creatorsRoyalty,
        DataModel.ArtStatus status,
        bytes32 digest,
        uint8 hashFunction,
        uint8 size
    );
    event NewSale(uint256 tokenId, uint256 salePrice);
    event TokenPurchased(address by, uint256 tokenId);
    event PayoutOccurred(address to, uint256 amount);
    event NewPrice(address setBy, uint256 newPrice, uint256 tokenId);
    event NewBid(address by, uint256 tokenId, uint256 amount);
    event NewAuction(uint256 tokenId, uint256 auctionNum, uint256 reservePrice);
    event EndAuction(uint256 tokenId, uint256 auctionNum, address newOwner, uint256 soldFor);
    event WithdrawMoney(address receiver, uint256 withdrawnAmount);

    modifier onlyNftOwner(uint256 tokenId) {
        require(arts[tokenId].currentOwner == msg.sender, "you are not the owner of the art");
        _;
    }

    modifier onlyNotNftOwner(uint256 tokenId) {
        require(arts[tokenId].currentOwner != msg.sender, "you can't bid on or buy your own NFT");
        _;
    }

    modifier onlyNotIdle(uint256 tokenId) {
        require(arts[tokenId].status != DataModel.ArtStatus.idle, "the art is not availble for sale or auction");
        _;
    }

    modifier onlyNotForSale(uint256 tokenId) {
        require(arts[tokenId].status != DataModel.ArtStatus.forSale, "the art is already up for sale");
        _;
    }

    modifier onlyNotForAuction(uint256 tokenId) {
        require(arts[tokenId].status != DataModel.ArtStatus.forAuction, "the art is already up for auction");
        _;
    }

    /**
    * @dev Intializes the contract setting deployer as initial owner, shares and royalties for parties involved
    * @param uri_ identifier to locate metadata of token
    * @param _hashtuneShare amount dedicated to hashtune on every sale and auction
    * @param _creatorsRoyaltyReserve total amount dedicated for creators on every sale and auction
    */
    constructor (string memory uri_, uint256 _hashtuneShare, uint256 _creatorsRoyaltyReserve) ERC1155(uri_) {
        hashtuneAddress = payable(msg.sender);
        hashtuneShare = _hashtuneShare; //adding share value at the time of deployment
        creatorsRoyaltyReserve = _creatorsRoyaltyReserve;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
    * @dev mint NFT and based on the choice sets for sale or for auction or idle
    */
    function create(
        address payable[] memory creators,
        uint256[] memory creatorsRoyalty,
        DataModel.ArtStatus status,
        bytes memory data,
        uint256 salePrice,
        uint256 reservePrice,
        bytes32 digest,
        uint8 hashFunction,
        uint8 size
        ) public onlyApprovedArtist {

        require(creators.length == creatorsRoyalty.length, "all creators must have shares defined");
        uint256 sharePercent;
        for(uint256 i = 0; i < creatorsRoyalty.length; i++) {
            sharePercent += creatorsRoyalty[i];
        }
        require(sharePercent == 100, "accumulated share should be equal to 100 percent");
        arts[++totalArts] = DataModel.ArtInfo(
            DataModel.ArtStatus.idle,
            payable(msg.sender),
            creators,
            creatorsRoyalty,
            salePrice,
            DataModel.MultiHash(digest, hashFunction, size));
        _mint(msg.sender, totalArts, 1, data);
        if(uint8(status) == 1) {
            setForSale(totalArts, salePrice);
        }
        if(uint8(status) == 2) {
            startAuction(totalArts, reservePrice);
        }
        emit TokenCreated(msg.sender, totalArts, creators, creatorsRoyalty, status, digest, hashFunction, size);
    }

    /**
    * @dev
    */
    function setForSale(uint256 tokenId, uint256 salePrice)
        public onlyNftOwner(tokenId) onlyNotForSale(tokenId) onlyNotForAuction(tokenId) {

        require(salePrice > 0, "Sale price should be greater than 0");
        arts[tokenId].status = DataModel.ArtStatus.forSale;
        arts[tokenId].salePrice = salePrice;
        emit NewSale(tokenId, salePrice);
    }

    function buy(uint256 tokenId)
        public payable onlyNotNftOwner(tokenId) onlyNotIdle(tokenId) onlyNotForAuction(tokenId) {

        require(arts[tokenId].salePrice == msg.value, "incorrect amount sent");
        //always mutate the state first and then do external calls
        address payable previousOwner = arts[tokenId].currentOwner;
        arts[tokenId].currentOwner = payable(msg.sender);
        arts[tokenId].status = DataModel.ArtStatus.idle;
        _safeTransferFrom(previousOwner, msg.sender, tokenId, 1, "");
        handlePayout(tokenId, previousOwner, msg.value);

        emit TokenPurchased(msg.sender, tokenId);
    }

    /**
    * @dev handles the payment distribution on a sale
    * @param tokenId unique ID of the NFT
    * @param beneficiary the address of reciever for the Sale or Auction money
    * @param amount the amount of ETH(converted to WEI)
    */
    function handlePayout(uint256 tokenId, address payable beneficiary, uint256 amount) private {
        uint256 creatorsRoyaltyCut = amount * creatorsRoyaltyReserve / 100;
        uint256 hashtuneCut = amount * hashtuneShare / 100;

        hashtuneAddress.transfer(hashtuneCut);
        for(uint256 i = 0; i < arts[tokenId].creators.length; i++) {
            uint256 creatorCut = (creatorsRoyaltyCut * arts[tokenId].creatorsRoyalty[i]) / 100;
            arts[tokenId].creators[i].transfer(creatorCut);
        }

        beneficiary.transfer(amount - creatorsRoyaltyCut - hashtuneCut);
    }


    /**
    * @notice if reserve price is greator than zero then the auction will run for limited time after the reserve price is met
    * @dev start an Auction on your NFT
    * @param tokenId unique ID of the NFT
    * @param reservePrice the minimum amount of ETH(converted to WEI) the owner wants for NFT
    */
    function startAuction(uint256 tokenId, uint256 reservePrice)
        public onlyNftOwner(tokenId) onlyNotForAuction(tokenId) onlyNotForSale(tokenId) {

        uint256 newAuctionNum = ++totalAuctions[tokenId];
        arts[tokenId].status = DataModel.ArtStatus.forAuction;
        bids[tokenId][newAuctionNum].reservePrice = reservePrice;
        bids[tokenId][newAuctionNum].currentHigh = reservePrice;
        emit NewAuction(tokenId, newAuctionNum, bids[tokenId][newAuctionNum].reservePrice);
    }

    function placeBid(uint256 tokenId)
        public payable onlyNotNftOwner(tokenId) onlyNotIdle(tokenId) onlyNotForSale(tokenId) {

        uint256 currentAuctionNum = totalAuctions[tokenId];
        uint256 newBidSum = msg.value + bidMoneyPool[msg.sender][tokenId][currentAuctionNum];
        require(newBidSum > bids[tokenId][currentAuctionNum].currentHigh, "bid amount should be greator than the current highest");
        if(bids[tokenId][currentAuctionNum].reservePrice > 0 && bids[tokenId][currentAuctionNum].endTime == 0) {
            bids[tokenId][currentAuctionNum].endTime = block.timestamp + 1 days;
        }
        uint256 endTime = bids[tokenId][currentAuctionNum].endTime;
        if(endTime == 0 || block.timestamp < endTime) {
            bidMoneyPool[msg.sender][tokenId][currentAuctionNum] += msg.value;
            bids[tokenId][currentAuctionNum].currentHigh = newBidSum;
            bids[tokenId][currentAuctionNum].currentHighBider = payable(msg.sender);
        } else {
            revert("auction is closed for this NFT");
        }
        emit NewBid(msg.sender, tokenId, msg.value);
    }

    /**
    * @notice can not end an auction if there is endtime for auction defined
    * @dev end Auction on your NFT and distributes the funds
    * @param tokenId unique ID of the NFT
    */
    function endAuction(uint256 tokenId) public
        onlyNftOwner(tokenId) onlyNotIdle(tokenId) onlyNotForSale(tokenId) {
        uint256 currentAuctionNum = totalAuctions[tokenId];
        address payable previousOwner = arts[tokenId].currentOwner;
        arts[tokenId].currentOwner = bids[tokenId][currentAuctionNum].currentHighBider;
        bytes memory data;
        arts[tokenId].status = DataModel.ArtStatus.idle;
        if(bids[tokenId][currentAuctionNum].endTime == 0) {
            _safeTransferFrom(previousOwner, bids[tokenId][currentAuctionNum].currentHighBider, tokenId, 1, data);
            handleAuctionPayout(tokenId, previousOwner);
        } else {
            require(bids[tokenId][currentAuctionNum].endTime < block.timestamp, "can`t end ongoing time based auction");
            _safeTransferFrom(previousOwner, bids[tokenId][currentAuctionNum].currentHighBider, tokenId, 1, data);
            handleAuctionPayout(tokenId, previousOwner);
        }
        emit EndAuction(
            tokenId,
            currentAuctionNum,
            bids[tokenId][currentAuctionNum].currentHighBider,
            bids[tokenId][currentAuctionNum].currentHigh
        );
    }

    // handle the payment distribution on auctions
    function handleAuctionPayout(uint256 tokenId, address payable beneficiary) private {
        uint256 currentAuctionNum = totalAuctions[tokenId];
        address currentHighBider = bids[tokenId][currentAuctionNum].currentHighBider;
        require(bidMoneyPool[currentHighBider][tokenId][currentAuctionNum] > 0,"bidpool is empty");
        bidMoneyPool[currentHighBider][tokenId][currentAuctionNum] = 0;
        handlePayout(tokenId, beneficiary, bids[tokenId][currentAuctionNum].currentHigh);
    }

    //lets you withdraw your bid money when the auction is ended.
    function withdrawBidMoney(uint256 tokenId) public {
        uint256 currentAuctionNum = totalAuctions[tokenId];
        require(currentAuctionNum > 0, "no previous auctions happened for this NFT");
        require(currentAuctionNum != 1 || arts[tokenId].status != DataModel.ArtStatus.forAuction, "First auction is still ongoing");
        uint256 balance;
        if(arts[tokenId].status == DataModel.ArtStatus.forAuction) {
            balance = bidMoneyPoolCalculator(tokenId, currentAuctionNum - 1, msg.sender);
            uint256 currentAuctionBalance = bidMoneyPool[msg.sender][tokenId][currentAuctionNum];
            require(currentAuctionBalance == 0 || balance > 0, "Can't withdraw money from on going auction");
        } else {
            balance = bidMoneyPoolCalculator(tokenId, currentAuctionNum,  msg.sender);
        }
        require(balance > 0, "you dont have any money in the biding pool");
        payable(msg.sender).transfer(balance);

        emit WithdrawMoney(msg.sender, balance);
    }

    //helper function to save storage
    function bidMoneyPoolCalculator(uint256 tokenId, uint256 toAuctionNum, address bider) private returns (uint256) {
        uint256 balance;
        for(uint256 i = 1; i <= toAuctionNum; i++) {
            balance += bidMoneyPool[bider][tokenId][i];
            bidMoneyPool[bider][tokenId][i] = 0;
        }
        return balance;
    }
}