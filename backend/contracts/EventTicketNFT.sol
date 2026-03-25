// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract EventTicketNFT is ERC721, Ownable {
    using Strings for uint256;

    uint256 private _nextTokenId = 1;
    string private _baseTokenURIValue;
    mapping(uint256 => string) private _eventIds;

    event TicketMinted(uint256 indexed tokenId, address indexed to, string eventId);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseTokenURI_,
        address initialOwner
    ) ERC721(name_, symbol_) {
        _baseTokenURIValue = baseTokenURI_;

        if (initialOwner != _msgSender()) {
            _transferOwnership(initialOwner);
        }
    }

    function mintTicket(address to, string memory eventId) external onlyOwner returns (uint256) {
        require(to != address(0), "Invalid recipient");
        require(bytes(eventId).length > 0, "Event ID required");

        uint256 tokenId = _nextTokenId;
        _nextTokenId += 1;

        _safeMint(to, tokenId);
        _eventIds[tokenId] = eventId;

        emit TicketMinted(tokenId, to, eventId);
        return tokenId;
    }

    function eventIdOf(uint256 tokenId) external view returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return _eventIds[tokenId];
    }

    function setBaseTokenURI(string memory newBaseTokenURI) external onlyOwner {
        _baseTokenURIValue = newBaseTokenURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");

        string memory base = _baseURI();
        if (bytes(base).length == 0) {
            return "";
        }

        return string.concat(base, tokenId.toString());
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURIValue;
    }
}
