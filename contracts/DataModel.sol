//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

library DataModel {
    enum ArtStatus{ idle, forSale, forAuction }

    struct AuctionInfo {
        uint256 currentHigh;
        address currentHighBider;
        uint256 endTime;
        uint256 reservePrice;
        bool isFinalized;
    }

    struct ArtInfo {
        ArtStatus status;
        address currentOwner;
        address[] creators;
        uint256 salePrice;
    }
}