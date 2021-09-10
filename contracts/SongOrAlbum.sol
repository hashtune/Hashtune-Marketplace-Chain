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
contract SongOrAlbum is ERC1155, Ownable, AccessControl {
    mapping(uint256 => uint256) public _prices;
    mapping(uint256 => address) private _tokenCreators;
    mapping(uint256 => address) private _currentOwners;
    mapping(uint256 => bool) public _listings;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    constructor (string memory uri_, address minter) ERC1155(uri_) {
        _setupRole(MINTER_ROLE, minter);
        console.log("Deploying a Greeter with uri:", uri_);
    }

    // Not sure if this is the correct override
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    // Example of such a URI: https://token-cdn-domain/{id}.json would be replaced with https://token-cdn-domain/000000000000000000000000000000000000000000000000000000000004cce0.json if the client is referring to token ID 314592/0x4CCE0.
    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    // One URI for all tokens
    function showURI(uint256 id) public view returns (string memory) {
        return uri(id);
    }

    function showSalePriceFor(uint256 id) public view returns (uint256) {
        return _prices[id];
    }

    function create(address account, uint256 id, uint256 amount, bytes memory data, uint256 salePrice)
        public
    {
		// Check that the calling account has the minter role
        require(hasRole(MINTER_ROLE, msg.sender), "Caller is not a minter");
         _prices[id] = salePrice;
         _tokenCreators[id] = msg.sender;
         _currentOwners[id] = msg.sender;
         _listings[id] = true;
       _mint(account, id, amount, data);
    }

    function setApprovalToBuy(address toApprove, uint256 tokenId) public {
        require(_currentOwners[tokenId] == msg.sender, "cannot set approval if not token owner");
        return setApprovalForAll(toApprove, true);
    }
  
    function buy(uint256 tokenId ) public payable {
        uint256 price = showSalePriceFor(tokenId);
        require(msg.value == price, "incorrect amount sent");
        //require(_listings[tokenId] == true, "art piece not for sale"); only makes sense if theres one
        require(msg.sender != address(0) && msg.sender != address(this), "cannot buy your own token");

        // Royalty
        // Assuming ether and not wei (10^18 ether)
        uint256 creatorRoyalty = (msg.value * 2) / 100;
        sendTo(payable(_tokenCreators[tokenId]), creatorRoyalty);

        // // Hashtune Cut
        address hashtuneAddress = address(0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199);
        uint256 platformCut = (msg.value * 2) / 100;
        sendTo(payable(hashtuneAddress), platformCut);

        // Current Owner
        uint256 amount = msg.value - creatorRoyalty - platformCut;
        sendTo(payable(_currentOwners[tokenId]), amount);
        bytes memory data;

        // Transfer token
        // Need to actually transfer the contract if using 721Upgradeable (?)
        safeTransferFrom(_currentOwners[tokenId], msg.sender, tokenId, 1, data);
        _currentOwners[tokenId] = msg.sender;
        //_listings[tokenId] = false; // only makes sense if there's one token
    }

    function sendTo(address payable receiver, uint256 _amount) private {
        require(receiver != address(0) && receiver != address(this));
        require(_amount > 0 && _amount <= address(this).balance);
        receiver.transfer(_amount);
    }

    // Set current price and buy could have a race condition, make sure you 
    // cannot purchase a token while updating prices by pausing contract first then unpausing
    // function setCurrentPrice(uint256 _currentPrice, uint256 tokenId) public  {
    // require msg.send = _currentOwner[tokenId]
    //     require(_currentPrice > 0);
    //     currentPrice = _currentPrice;
    // }

    // TODO separate the sales functionality into a separate contract
    // When will an ERC contract ownership ever be necessary? the idea is the artist owns it

}


