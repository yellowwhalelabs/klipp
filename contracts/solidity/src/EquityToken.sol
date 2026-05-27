// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title EquityToken
/// @notice A restricted ERC-20 representing equity shares in a private company.
///         Only the associated CapTable contract may call transferFrom, ensuring
///         all equity movements go through the cap table's approval logic.
///         Deployed on Robinhood Chain Testnet (Chain ID: 46630).
contract EquityToken is ERC20, Ownable {
    // ─────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────

    /// @notice Address of the CapTable contract that controls transfers
    address public capTable;

    // ─────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────

    event CapTableSet(address indexed capTable);

    // ─────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────

    error OnlyCapTable(address caller);
    error CapTableAlreadySet();

    // ─────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────

    /// @param name_         e.g. "Acme Corp Equity"
    /// @param symbol_       e.g. "ACME"
    /// @param totalSupply_  Total shares in wei (18 decimals)
    /// @param founder_      Receives all tokens initially
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        address founder_
    ) ERC20(name_, symbol_) Ownable(founder_) {
        _mint(founder_, totalSupply_);
    }

    // ─────────────────────────────────────────────────────────────
    // Admin: set cap table (one-time)
    // ─────────────────────────────────────────────────────────────

    /// @notice Set the CapTable contract address. Can only be called once by owner.
    function setCapTable(address capTable_) external onlyOwner {
        if (capTable != address(0)) revert CapTableAlreadySet();
        capTable = capTable_;
        emit CapTableSet(capTable_);
    }

    // ─────────────────────────────────────────────────────────────
    // Restricted transfer: CapTable only
    // ─────────────────────────────────────────────────────────────

    /// @inheritdoc ERC20
    /// @dev Overridden to restrict transferFrom to the CapTable contract only.
    ///      Direct approve + transferFrom by other addresses is blocked.
    function transferFrom(address from, address to, uint256 amount)
        public
        override
        returns (bool)
    {
        if (msg.sender != capTable) revert OnlyCapTable(msg.sender);
        _transfer(from, to, amount);
        return true;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────────────────

/// @title EquityTokenFactory
/// @notice Deploys a new EquityToken for each company registered on KLIPP.
contract EquityTokenFactory {
    // ─────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────

    event TokenCreated(
        address indexed token,
        address indexed founder,
        string name,
        string symbol,
        uint256 totalSupply
    );

    // ─────────────────────────────────────────────────────────────
    // External: create
    // ─────────────────────────────────────────────────────────────

    /// @notice Deploy a new EquityToken. Caller becomes the founder and receives all tokens.
    /// @return token The address of the newly deployed token
    function create(
        string calldata name,
        string calldata symbol,
        uint256 totalSupply
    ) external returns (address token) {
        EquityToken eq = new EquityToken(name, symbol, totalSupply, msg.sender);
        token = address(eq);
        emit TokenCreated(token, msg.sender, name, symbol, totalSupply);
    }
}
