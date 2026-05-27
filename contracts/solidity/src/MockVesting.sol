// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MockVesting
/// @notice A minimal vesting contract used for demo/testnet until the Stylus
///         Rust vesting contract is deployed. Implements the same IVesting
///         interface as the real contract but computes vesting on-chain in Solidity.
///         Replace this address with the Stylus contract after `cargo stylus deploy`.
contract MockVesting {
    struct Grant {
        address beneficiary;
        uint256 totalAmount;
        uint64  startTime;
        uint64  cliffSeconds;
        uint64  durationSeconds;
    }

    mapping(uint256 => Grant) public grants;

    event GrantCreated(uint256 indexed grantId, address beneficiary, uint256 totalAmount);

    function createGrant(
        uint256 grantId,
        address beneficiary,
        uint256 totalAmount,
        uint64 startTime,
        uint64 cliffSeconds,
        uint64 durationSeconds
    ) external {
        grants[grantId] = Grant({
            beneficiary:     beneficiary,
            totalAmount:     totalAmount,
            startTime:       startTime,
            cliffSeconds:    cliffSeconds,
            durationSeconds: durationSeconds
        });
        emit GrantCreated(grantId, beneficiary, totalAmount);
    }

    function vestedAmount(uint256 grantId, uint64 currentTime)
        external
        view
        returns (uint256)
    {
        Grant memory g = grants[grantId];
        if (g.totalAmount == 0) return 0;
        if (currentTime < g.startTime + g.cliffSeconds) return 0;
        if (currentTime >= g.startTime + g.durationSeconds) return g.totalAmount;
        // Linear vesting
        return g.totalAmount * (currentTime - g.startTime) / g.durationSeconds;
    }
}
