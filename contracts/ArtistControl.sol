//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ArtistControl is Ownable {
    mapping(address => bool) public approvedArtists;

    event ArtistApproved(address artist);
    event ArtistBatchApproved(address[] artists);
    event ArtistApprovalRevoked(address artist);
    event ArtistBatchApprovalRevoked(address[] artists);

    /**
    * @dev Throws if called by a non approved artist address
    */
    modifier onlyApprovedArtist {
        require(approvedArtists[msg.sender], "you are not authorized to create NFT");
        _;
    }

    /**
    * @dev Approve an artist for minting NFTs
    * @param artist address of the artist to approve
    */
    function approveArtist(address artist) public onlyOwner {
        approvedArtists[artist] = true;
        emit ArtistApproved(artist);
    }

    /**
    * @dev Approves multiple artists for minting NFTs at once
    * @param artists addresses of the artist to approve
    */
    function approveArtistBatch(address[] memory artists) public onlyOwner {
        for(uint i = 0; i < artists.length; i++) {
            approvedArtists[artists[i]] = true;
        }
        emit ArtistBatchApproved(artists);
    }

    /**
    * @dev Revokes artist's permission to mint NFTs
    * @param artist address to revoke
    */
    function revokeArtistApproval(address artist) public onlyOwner {
        approvedArtists[artist] = false;
        emit ArtistApprovalRevoked(artist);
    }

    /**
    * @dev Revokes multiple artists' permissions to mint NFTs
    * @param artists addresses to revoke
    */
    function revokeArtistBatchApproval(address[] memory artists) public onlyOwner {
        for(uint i = 0; i < artists.length; i++) {
            approvedArtists[artists[i]] = false;
        }
        emit ArtistBatchApprovalRevoked(artists);
    }
}