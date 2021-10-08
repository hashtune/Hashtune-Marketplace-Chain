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
    * @dev Throws if called by none approved artist address
    */
    modifier onlyApprovedArtist {
        require(approvedArtists[msg.sender], "you are not authorized to create NFT");
        _;
    }

    /**
    * @dev Allows to add approved artist
    * @param artist address of the artist to approve
    */
    function approveArtist(address artist) public onlyOwner {
        approvedArtists[artist] = true;
        emit ArtistApproved(artist);
    }

    /**
    * @dev Allows to add multiple approved artist
    * @param artists addresses of the artist to approve
    */
    function approveArtistBatch(address[] memory artists) public onlyOwner {
        for(uint i = 0; i < artists.length; i++) {
            approvedArtists[artists[i]] = true;
        }
        emit ArtistBatchApproved(artists);
    }

    /**
    * @dev Allows to revoke artist approval to create NFT
    * @param artist address of the artist to revoke
    */
    function revokeArtistApproval(address artist) public onlyOwner {
        approvedArtists[artist] = false;
        emit ArtistApprovalRevoked(artist);
    }

    /**
    * @dev Allows to revoke multiple artists approval to create NFT
    * @param artists addresses of the artist to revoke
    */
    function revokeArtistBatchApproval(address[] memory artists) public onlyOwner {
        for(uint i = 0; i < artists.length; i++) {
            approvedArtists[artists[i]] = false;
        }
        emit ArtistBatchApprovalRevoked(artists);
    }
}