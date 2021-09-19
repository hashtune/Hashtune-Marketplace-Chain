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
    mapping(uint256 => uint256) public _prices;
    mapping(uint256 => address[]) private _tokenCreators;
    mapping(uint256 => address) private _currentOwners;
    mapping(uint256 => bool) public _listings;

    // Custom Events
    event NewURI(address setBy, string newAddress);
    event TokenCreated(address by, uint256 tokenId, address[] creators);
    event TokenPurchased(address by, uint256 tokenId);
    event PayoutOccurred(address to, uint256 amount);
    event NewPrice(address setBy, uint256 newPrice, uint256 tokenId);
    
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
}


