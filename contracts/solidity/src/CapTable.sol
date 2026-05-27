// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./EquityToken.sol";

/// @dev Minimal interface to the Stylus vesting contract
interface IVesting {
    function vestedAmount(uint256 grantId, uint64 currentTime) external view returns (uint256);
    function createGrant(
        uint256 grantId,
        address beneficiary,
        uint256 totalAmount,
        uint64 startTime,
        uint64 cliffSeconds,
        uint64 durationSeconds
    ) external;
}

/// @title CapTable
/// @notice Layer 3 of KLIPP — manages equity grants for a single company.
///         Calls the Stylus vesting contract to compute claimable amounts.
///         Deployed on Robinhood Chain Testnet (Chain ID: 46630).
contract CapTable {
    // ─────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────

    struct Grant {
        address holder;
        uint256 totalAmount;      // total equity allocated (token units, 18 dec)
        uint256 claimed;          // tokens already claimed
        uint64  vestingStart;     // unix timestamp
        uint64  cliffSeconds;
        uint64  durationSeconds;
        bool    active;
    }

    // ─────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────

    EquityToken public immutable token;
    IVesting    public immutable vestingContract;
    address     public immutable founder;
    string      public companyName;

    uint256 private _nextGrantId;

    /// @dev grantId => Grant
    mapping(uint256 => Grant) public grants;

    /// @dev holder => list of grant IDs
    mapping(address => uint256[]) public holderGrants;

    // ─────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────

    event GrantIssued(
        uint256 indexed grantId,
        address indexed holder,
        uint256 totalAmount,
        uint64 vestingStart,
        uint64 cliffSeconds,
        uint64 durationSeconds
    );
    event VestingClaimed(uint256 indexed grantId, address indexed holder, uint256 amount);
    event GrantRevoked(uint256 indexed grantId, address indexed holder);

    // ─────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────

    error OnlyFounder(address caller);
    error GrantNotActive(uint256 grantId);
    error NotGrantHolder(address caller, uint256 grantId);
    error NothingToClaimYet(uint256 grantId);
    error ZeroAmount();

    // ─────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────

    constructor(
        address token_,
        address vestingContract_,
        address founder_,
        string memory companyName_
    ) {
        token           = EquityToken(token_);
        vestingContract = IVesting(vestingContract_);
        founder         = founder_;
        companyName     = companyName_;
    }

    // ─────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────

    modifier onlyFounder() {
        if (msg.sender != founder) revert OnlyFounder(msg.sender);
        _;
    }

    // ─────────────────────────────────────────────────────────────
    // External: issue grant
    // ─────────────────────────────────────────────────────────────

    /// @notice Issue an equity grant to a holder. Founder only.
    ///         Tokens are transferred from founder → CapTable, held in escrow.
    /// @param holder          Recipient of the equity
    /// @param amount          Total tokens to vest
    /// @param vestingStart    Start timestamp (seconds)
    /// @param cliffSeconds    Cliff period in seconds (0 = no cliff)
    /// @param durationSeconds Full vesting period in seconds
    function issueGrant(
        address holder,
        uint256 amount,
        uint64 vestingStart,
        uint64 cliffSeconds,
        uint64 durationSeconds
    ) external onlyFounder returns (uint256 grantId) {
        if (amount == 0) revert ZeroAmount();

        _nextGrantId++;
        grantId = _nextGrantId;

        grants[grantId] = Grant({
            holder:          holder,
            totalAmount:     amount,
            claimed:         0,
            vestingStart:    vestingStart,
            cliffSeconds:    cliffSeconds,
            durationSeconds: durationSeconds,
            active:          true
        });
        holderGrants[holder].push(grantId);

        // Escrow tokens from founder into this contract
        token.transferFrom(founder, address(this), amount);

        // Register grant on the Stylus vesting contract
        vestingContract.createGrant(
            grantId, holder, amount, vestingStart, cliffSeconds, durationSeconds
        );

        emit GrantIssued(grantId, holder, amount, vestingStart, cliffSeconds, durationSeconds);
    }

    // ─────────────────────────────────────────────────────────────
    // External: claim vested equity
    // ─────────────────────────────────────────────────────────────

    /// @notice Claim currently vested (unclaimed) tokens for a grant.
    ///         The Stylus vesting contract computes the vested amount.
    function claimVested(uint256 grantId) external {
        Grant storage g = grants[grantId];
        if (!g.active) revert GrantNotActive(grantId);
        if (g.holder != msg.sender) revert NotGrantHolder(msg.sender, grantId);

        uint256 vested    = vestingContract.vestedAmount(grantId, uint64(block.timestamp));
        uint256 claimable = vested - g.claimed;
        if (claimable == 0) revert NothingToClaimYet(grantId);

        g.claimed += claimable;
        token.transfer(msg.sender, claimable);

        emit VestingClaimed(grantId, msg.sender, claimable);
    }

    // ─────────────────────────────────────────────────────────────
    // External: revoke grant (founder)
    // ─────────────────────────────────────────────────────────────

    /// @notice Revoke an active grant. Unvested tokens return to founder.
    function revokeGrant(uint256 grantId) external onlyFounder {
        Grant storage g = grants[grantId];
        if (!g.active) revert GrantNotActive(grantId);

        uint256 unvested = g.totalAmount - g.claimed;
        g.active = false;

        if (unvested > 0) {
            token.transfer(founder, unvested);
        }

        emit GrantRevoked(grantId, g.holder);
    }

    // ─────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────

    function getGrant(uint256 grantId) external view returns (Grant memory) {
        return grants[grantId];
    }

    function getHolderGrants(address holder) external view returns (uint256[] memory) {
        return holderGrants[holder];
    }

    function vestingPreview(uint256 grantId) external view returns (
        uint256 vested,
        uint256 claimed,
        uint256 claimable
    ) {
        Grant storage g = grants[grantId];
        vested    = vestingContract.vestedAmount(grantId, uint64(block.timestamp));
        claimed   = g.claimed;
        claimable = vested > claimed ? vested - claimed : 0;
    }

    function totalGrants() external view returns (uint256) {
        return _nextGrantId;
    }
}
