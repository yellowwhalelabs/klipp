// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title SoulboundCard
/// @notice Layer 1 of KLIPP — a non-transferable ERC-721 digital identity card.
///         One card per address. Users mint their own card; transfers are disabled.
///         Deployed on Arbitrum Sepolia.
contract SoulboundCard is ERC721URIStorage, Ownable {
    // ─────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────

    uint256 private _nextTokenId;

    /// @dev Maps owner address to their token ID (1-indexed; 0 = no card)
    mapping(address => uint256) public cardOf;

    // ─────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────

    event CardMinted(address indexed owner, uint256 indexed tokenId, string metadataURI);
    event CardUpdated(address indexed owner, uint256 indexed tokenId, string newURI);

    // ─────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────

    error AlreadyHasCard(address owner);
    error NotCardOwner(address caller, uint256 tokenId);
    error TransfersForbidden();

    // ─────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────

    constructor() ERC721("KLIPP Card", "KLIPP") Ownable(msg.sender) {}

    // ─────────────────────────────────────────────────────────────
    // External: mint
    // ─────────────────────────────────────────────────────────────

    /// @notice Mint your own KLIPP Card. Limit: one per address.
    /// @param metadataURI IPFS / HTTPS URI for the card JSON metadata
    function mint(string calldata metadataURI) external returns (uint256 tokenId) {
        if (cardOf[msg.sender] != 0) revert AlreadyHasCard(msg.sender);

        _nextTokenId++;
        tokenId = _nextTokenId;

        cardOf[msg.sender] = tokenId;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit CardMinted(msg.sender, tokenId, metadataURI);
    }

    // ─────────────────────────────────────────────────────────────
    // External: update metadata
    // ─────────────────────────────────────────────────────────────

    /// @notice Update the metadata URI of your card. Owner only.
    /// @param tokenId The token to update
    /// @param newURI  New metadata URI
    function updateMetadata(uint256 tokenId, string calldata newURI) external {
        if (ownerOf(tokenId) != msg.sender) revert NotCardOwner(msg.sender, tokenId);
        _setTokenURI(tokenId, newURI);
        emit CardUpdated(msg.sender, tokenId, newURI);
    }

    // ─────────────────────────────────────────────────────────────
    // Soulbound: disable all transfers
    // ─────────────────────────────────────────────────────────────

    /// @dev Hook called before every transfer. Reverts for any transfer
    ///      except minting (from == address(0)).
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0)) revert TransfersForbidden();
        return super._update(to, tokenId, auth);
    }

    // ─────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────

    /// @notice Returns the total number of cards minted
    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    /// @notice Returns whether an address has minted a card
    function hasCard(address owner) external view returns (bool) {
        return cardOf[owner] != 0;
    }
}
