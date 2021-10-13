//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
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
* @author Muhammad Anas Afzal, Emily Morgan
*/
contract SongOrAlbumNFT is ERC1155, ArtistControl, AccessControl {

    uint256 totalArts;
    address payable hashtuneAddress;
    uint256 hashtuneShare = 2; //represents 2%
    uint256 creatorsRoyaltyReserve = 2;
    uint256 auctionTimeLimit = 1 days;

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
    event NewBid(address by, uint256 tokenId, uint256 amount);
    event NewAuction(uint256 tokenId, uint256 auctionNum, uint256 reservePrice);
    event EndAuction(uint256 tokenId, uint256 auctionNum, address newOwner, uint256 soldFor);
    event WithdrawMoney(address receiver, uint256 withdrawnAmount);

    /**
    * @dev Throws if called by any account other than the NFT owner
    */
    modifier onlyNftOwner(uint256 tokenId) {
        require(arts[tokenId].currentOwner == msg.sender, "you are not the owner of the art");
        _;
    }
    /**
    * @dev Throws if called by the NFT owner
    */
    modifier onlyNotNftOwner(uint256 tokenId) {
        require(arts[tokenId].currentOwner != msg.sender, "you can't bid on or buy your own NFT");
        _;
    }
    /**
    * @dev Throws if called when NFT not for sale and auction
    */
    modifier onlyNotIdle(uint256 tokenId) {
        require(arts[tokenId].status != DataModel.ArtStatus.idle, "the art is not availble for sale or auction");
        _;
    }
    /**
    * @dev Throws if called when NFT is for sale
    */
    modifier onlyNotForSale(uint256 tokenId) {
        require(arts[tokenId].status != DataModel.ArtStatus.forSale, "the art is already up for sale");
        _;
    }
    /**
    * @dev Throws if called when NFT is for auction
    */
    modifier onlyNotForAuction(uint256 tokenId) {
        require(arts[tokenId].status != DataModel.ArtStatus.forAuction, "the art is already up for auction");
        _;
    }

    /**
    * @dev Intializes the contract setting deployer as initial owner, shares and royalties for parties involved
    * @param uri_ identifier to locate metadata of token
    * @param _hashtuneShare percentage amount dedicated to hashtune on every sale and auction final price
    * @param _creatorsRoyaltyReserve total percentage amount dedicated for creators on every sale and auction final price
    */
    constructor (string memory uri_, uint256 _hashtuneShare, uint256 _creatorsRoyaltyReserve, uint256 _auctionTimeLimit) ERC1155(uri_) {
        hashtuneAddress = payable(msg.sender);
        hashtuneShare = _hashtuneShare; //adding share value at the time of deployment
        creatorsRoyaltyReserve = _creatorsRoyaltyReserve;
        auctionTimeLimit = _auctionTimeLimit;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
    * @dev Mints NFT with a starting state of idle, sale, or auction
    * @param creators addresses of artist involved in the creation of the NFT. The first address MUST be the address of msg.sender.
    * @param creatorsRoyalty percentage of the royaltyReserve dedicated to each creator. Must total 100.
    * @param status choice to keep/sell/auction the NFT. 0 for idle, 1 for sale, 2 for auction.
    * @param salePrice the amount of ETH(converted to WEI) the owner wants to sell NFT for incase of sale
    * @param reservePrice the minimum amount of ETH(converted to WEI) the owner wants for NFT incase of auction. Can be 0 if no time based auction to be triggered when this number is reached.
    * @param digest hash function output converted in hex with prepended '0x'
    * @param hashFunction hash function code for the function used
    * @param size length of the digest
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
    * @dev Sets NFT for sale
    * @param tokenId unique ID of the NFT
    * @param salePrice the amount of ETH(converted to WEI) the owner wants to sell NFT for incase of sale
    */
    function setForSale(uint256 tokenId, uint256 salePrice)
        public onlyNftOwner(tokenId) onlyNotForSale(tokenId) onlyNotForAuction(tokenId) {

        require(salePrice > 0, "Sale price should be greater than 0");
        arts[tokenId].status = DataModel.ArtStatus.forSale;
        arts[tokenId].salePrice = salePrice;
        emit NewSale(tokenId, salePrice);
    }

    /**
    * @notice Its a payable function meaning you can send ETH with the transaction to buy NFT
    * @dev Allows to buy an NFT that is for sale
    * @param tokenId unique ID of the NFT
    */
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
    * @dev Handles the payment distribution on a sale
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
    * @notice If reserve price is greater than zero then the auction will run for limited time after the reserve price is met
    * @dev Allows to start an auction on NFT
    * @param tokenId unique ID of the NFT
    * @param reservePrice the minimum amount of ETH(converted to WEI) the owner wants for NFT
    */
    function startAuction(uint256 tokenId, uint256 reservePrice)
        public onlyNftOwner(tokenId) onlyNotForAuction(tokenId) onlyNotForSale(tokenId) {

        uint256 newAuctionNum = ++totalAuctions[tokenId];
        arts[tokenId].status = DataModel.ArtStatus.forAuction;
        bids[tokenId][newAuctionNum].reservePrice = reservePrice;
        emit NewAuction(tokenId, newAuctionNum, bids[tokenId][newAuctionNum].reservePrice);
    }

    /**
    * @notice If the reservePrice is given, the first bid (which must be higher than reserve price) activates the time limit for auction
    * @dev Allows to place bid for an ongoing auction
    * @param tokenId unique ID of the NFT
    */
    function placeBid(uint256 tokenId)
        public payable onlyNotIdle(tokenId) onlyNotNftOwner(tokenId) onlyNotForSale(tokenId) {

        require(msg.value > 0, "bid amount should be greater than zero");
        uint256 currentAuctionNum = totalAuctions[tokenId];
        uint256 newBidSum = msg.value + bidMoneyPool[msg.sender][tokenId][currentAuctionNum];

        if(bids[tokenId][currentAuctionNum].reservePrice > 0 && bids[tokenId][currentAuctionNum].endTime == 0) {
            bids[tokenId][currentAuctionNum].endTime = block.timestamp + auctionTimeLimit;
        }

        uint256 endTime = bids[tokenId][currentAuctionNum].endTime;
        if(endTime == 0 || block.timestamp < endTime) {
            if(bids[tokenId][currentAuctionNum].reservePrice > 0 && bids[tokenId][currentAuctionNum].currentHigh == 0) {
                require(newBidSum >= bids[tokenId][currentAuctionNum].reservePrice, "bid amount should be greater or equal to the reserved price");
            }
            else {
                require(newBidSum > bids[tokenId][currentAuctionNum].currentHigh, "bid amount should be greater than the current highest");
            }
            bidMoneyPool[msg.sender][tokenId][currentAuctionNum] += msg.value;
            bids[tokenId][currentAuctionNum].currentHigh = newBidSum;
            bids[tokenId][currentAuctionNum].currentHighBider = payable(msg.sender);
        } else {
            revert("auction is closed for this NFT");
        }
        emit NewBid(msg.sender, tokenId, msg.value);
    }

    /**
    * @notice Can not end an auction if there is endtime for auction defined
    * @dev Allows to end auction on NFT and distributes the funds
    * @param tokenId unique ID of the NFT
    */
    function endAuction(uint256 tokenId) public
        onlyNftOwner(tokenId) onlyNotIdle(tokenId) onlyNotForSale(tokenId) {
        uint256 currentAuctionNum = totalAuctions[tokenId];
        arts[tokenId].status = DataModel.ArtStatus.idle;

        if(bids[tokenId][currentAuctionNum].currentHigh != 0) {

            address payable previousOwner = arts[tokenId].currentOwner;
            arts[tokenId].currentOwner = bids[tokenId][currentAuctionNum].currentHighBider;
            bytes memory data;

            if(bids[tokenId][currentAuctionNum].endTime == 0) {
                _safeTransferFrom(previousOwner, bids[tokenId][currentAuctionNum].currentHighBider, tokenId, 1, data);
                handleAuctionPayout(tokenId, previousOwner);
            } else {
                require(bids[tokenId][currentAuctionNum].endTime < block.timestamp, "can`t end ongoing time based auction");
                _safeTransferFrom(previousOwner, bids[tokenId][currentAuctionNum].currentHighBider, tokenId, 1, data);
                handleAuctionPayout(tokenId, previousOwner);
            }
        }
        emit EndAuction(
            tokenId,
            currentAuctionNum,
            bids[tokenId][currentAuctionNum].currentHighBider,
            bids[tokenId][currentAuctionNum].currentHigh
        );
    }

    /**
    * @dev Handles the payment distribution when the auction ends
    * @param tokenId unique ID of the NFT
    * @param beneficiary the address of reciever for the auction money
    */
    function handleAuctionPayout(uint256 tokenId, address payable beneficiary) private {
        uint256 currentAuctionNum = totalAuctions[tokenId];
        address currentHighBider = bids[tokenId][currentAuctionNum].currentHighBider;
        require(bidMoneyPool[currentHighBider][tokenId][currentAuctionNum] > 0,"bidpool is empty");
        bidMoneyPool[currentHighBider][tokenId][currentAuctionNum] = 0;
        handlePayout(tokenId, beneficiary, bids[tokenId][currentAuctionNum].currentHigh);
    }

    /**
    * @notice You can withdraw all the money if the auction has ended otherwise only from the previous auctions
    * @dev Allows to withdraw ETH from the bidMoneyPool
    * @param tokenId unique ID of the NFT
    */
    function withdrawBidMoney(uint256 tokenId) public {
        uint256 currentAuctionNum = totalAuctions[tokenId];
        require(currentAuctionNum > 0, "no previous auctions happened for this NFT");
        require(
            currentAuctionNum != 1 || arts[tokenId].status != DataModel.ArtStatus.forAuction || bids[tokenId][currentAuctionNum].endTime == 0,
            "First auction is still ongoing"
        );
        uint256 balance;
        if(
            arts[tokenId].status == DataModel.ArtStatus.forAuction &&
            bids[tokenId][currentAuctionNum].endTime == 0 &&
            msg.sender != bids[tokenId][currentAuctionNum].currentHighBider
        ) {
            balance = bidMoneyPoolCalculator(tokenId, currentAuctionNum, msg.sender);
        }
        if(arts[tokenId].status == DataModel.ArtStatus.forAuction && bids[tokenId][currentAuctionNum].endTime != 0) {
            balance = bidMoneyPoolCalculator(tokenId, currentAuctionNum - 1, msg.sender);
            uint256 currentAuctionBalance = bidMoneyPool[msg.sender][tokenId][currentAuctionNum];
            require(currentAuctionBalance == 0 || balance > 0, "Can't withdraw money from on going auction");
        }
        if(arts[tokenId].status != DataModel.ArtStatus.forAuction) {
            balance = bidMoneyPoolCalculator(tokenId, currentAuctionNum, msg.sender);
        }
        require(balance > 0, "you dont have any money in the biding pool");
        payable(msg.sender).transfer(balance);

        emit WithdrawMoney(msg.sender, balance);
    }

    /**
    * @dev Calculate the amount of ETH in bidMoneyPool
    * @param tokenId unique ID of the NFT
    * @param toAuctionNum number of auction to calculate money for
    * @param bider address of bider who took part in auction
    * @return the amount of Eth in bidMoneyPool
    */
    function bidMoneyPoolCalculator(uint256 tokenId, uint256 toAuctionNum, address bider) private returns (uint256) {
        uint256 balance;
        for(uint256 i = 1; i <= toAuctionNum; i++) {
            balance += bidMoneyPool[bider][tokenId][i];
            bidMoneyPool[bider][tokenId][i] = 0;
        }
        return balance;
    }

    /**
    * @dev Overrides the ERC1155 transfer function to disallow transfers with out payments
    */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public override onlyOwner {
    }

    /**
    * @dev Overrides the ERC1155 batch transfer function to disallow transfers with out payments
    */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public override onlyOwner {
    }
}