//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ArtistControl is Ownable {
    mapping(address => bool) public approvedArtists;

    modifier onlyApprovedArtist {
        require(approvedArtists[msg.sender], "you are not authorized to create NFT");
        _;
    }

    function approveArtist(address artist) public onlyOwner {
        approvedArtists[artist] = true;
    }

    function approveArtistBatch(address[] memory artists) public onlyOwner {
        for(uint i= 0; i < artists.length; i++) {
            approvedArtists[artists[i]]= true;
        }
    }

    function revokeArtistApproval(address artist) public onlyOwner {
        approvedArtists[artist] = false;
    }

    function revokeArtistBatchApproval(address[] memory artists) public onlyOwner {
        for(uint i= 0; i < artists.length; i++) {
            approvedArtists[artists[i]]= false;
        }
    } 
}