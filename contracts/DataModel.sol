//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

library DataModel {
    enum ArtStatus{ idle, forSale, forAuction }

    struct MultiHash {
        bytes32 digest;
        uint8 hashFunction;
        uint8 size;
    }

    struct AuctionInfo {
        uint256 currentHigh;
        address payable currentHighBider;
        uint256 endTime;
        uint256 reservePrice;
        bool isFinalized;
    }

    struct ArtInfo {
        ArtStatus status;
        address payable currentOwner;
        address payable[] creators;
        uint256[] creatorsRoyalty;
        uint256 salePrice;
        MultiHash metaData;
    }
}