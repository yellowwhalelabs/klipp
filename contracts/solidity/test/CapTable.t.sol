// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/EquityToken.sol";
import "../src/CapTable.sol";

/// @dev Mock vesting contract for unit testing CapTable logic
contract MockVesting is IVesting {
    // Stores vested amounts that the test controls
    mapping(uint256 => uint256) public mockVested;
    mapping(uint256 => bool)    public grantCreated;

    function setVested(uint256 grantId, uint256 amount) external {
        mockVested[grantId] = amount;
    }

    function vestedAmount(uint256 grantId, uint64 /*currentTime*/)
        external
        view
        override
        returns (uint256)
    {
        return mockVested[grantId];
    }

    function createGrant(
        uint256 grantId,
        address, uint256, uint64, uint64, uint64
    ) external override {
        grantCreated[grantId] = true;
    }
}

contract CapTableTest is Test {
    EquityToken  token;
    CapTable     capTable;
    MockVesting  vesting;

    address founder  = makeAddr("founder");
    address alice    = makeAddr("alice");
    address bob      = makeAddr("bob");
    address attacker = makeAddr("attacker");

    uint256 constant TOTAL     = 10_000_000 ether;
    uint256 constant ALICE_AMT = 100_000 ether;

    function setUp() public {
        // Deploy token (founder owns all)
        vm.prank(founder);
        token = new EquityToken("Acme Corp", "ACME", TOTAL, founder);

        vesting = new MockVesting();

        // Deploy cap table
        vm.prank(founder);
        capTable = new CapTable(
            address(token),
            address(vesting),
            founder,
            "Acme Corp"
        );

        // Wire cap table into token
        vm.prank(founder);
        token.setCapTable(address(capTable));

        // Approve cap table to pull tokens from founder when issuing grants
        vm.prank(founder);
        token.approve(address(capTable), TOTAL);
    }

    // ─────────────────────────────────────────────────────────────
    // Issue grant
    // ─────────────────────────────────────────────────────────────

    function test_FounderCanIssueGrant() public {
        vm.prank(founder);
        uint256 grantId = capTable.issueGrant(
            alice, ALICE_AMT, uint64(block.timestamp), 365 days, 4 * 365 days
        );
        assertEq(grantId, 1);
        assertEq(token.balanceOf(address(capTable)), ALICE_AMT);

        CapTable.Grant memory g = capTable.getGrant(1);
        assertEq(g.holder, alice);
        assertEq(g.totalAmount, ALICE_AMT);
        assertTrue(g.active);
        assertTrue(vesting.grantCreated(1));
    }

    function test_NonFounderCannotIssueGrant() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(CapTable.OnlyFounder.selector, attacker));
        capTable.issueGrant(alice, ALICE_AMT, uint64(block.timestamp), 0, 365 days);
    }

    function test_ZeroAmountReverts() public {
        vm.prank(founder);
        vm.expectRevert(CapTable.ZeroAmount.selector);
        capTable.issueGrant(alice, 0, uint64(block.timestamp), 0, 365 days);
    }

    // ─────────────────────────────────────────────────────────────
    // Claim vested
    // ─────────────────────────────────────────────────────────────

    function test_HolderClaimsVested() public {
        vm.prank(founder);
        capTable.issueGrant(alice, ALICE_AMT, uint64(block.timestamp), 0, 365 days);

        // Simulate 50% vested
        vesting.setVested(1, ALICE_AMT / 2);

        vm.prank(alice);
        capTable.claimVested(1);

        assertEq(token.balanceOf(alice), ALICE_AMT / 2);
        assertEq(capTable.getGrant(1).claimed, ALICE_AMT / 2);
    }

    function test_ClaimTwiceOnlyGetsIncrement() public {
        vm.prank(founder);
        capTable.issueGrant(alice, ALICE_AMT, uint64(block.timestamp), 0, 365 days);

        vesting.setVested(1, ALICE_AMT / 4);
        vm.prank(alice);
        capTable.claimVested(1);

        // More vested now
        vesting.setVested(1, ALICE_AMT / 2);
        vm.prank(alice);
        capTable.claimVested(1);

        // Total received = ALICE_AMT/2
        assertEq(token.balanceOf(alice), ALICE_AMT / 2);
    }

    function test_NothingToClaimReverts() public {
        vm.prank(founder);
        capTable.issueGrant(alice, ALICE_AMT, uint64(block.timestamp), 365 days, 4 * 365 days);
        // vesting.mockVested[1] == 0 by default

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(CapTable.NothingToClaimYet.selector, 1));
        capTable.claimVested(1);
    }

    function test_WrongHolderCannotClaim() public {
        vm.prank(founder);
        capTable.issueGrant(alice, ALICE_AMT, uint64(block.timestamp), 0, 365 days);
        vesting.setVested(1, ALICE_AMT);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(CapTable.NotGrantHolder.selector, bob, 1));
        capTable.claimVested(1);
    }

    // ─────────────────────────────────────────────────────────────
    // Revoke grant
    // ─────────────────────────────────────────────────────────────

    function test_FounderRevokesGrant() public {
        vm.prank(founder);
        capTable.issueGrant(alice, ALICE_AMT, uint64(block.timestamp), 0, 365 days);

        // Alice claims half first
        vesting.setVested(1, ALICE_AMT / 2);
        vm.prank(alice);
        capTable.claimVested(1);

        uint256 founderBefore = token.balanceOf(founder);

        vm.prank(founder);
        capTable.revokeGrant(1);

        // Unvested (50%) returns to founder
        assertEq(token.balanceOf(founder), founderBefore + ALICE_AMT / 2);
        assertFalse(capTable.getGrant(1).active);
    }

    function test_CannotRevokeInactiveGrant() public {
        vm.prank(founder);
        capTable.issueGrant(alice, ALICE_AMT, uint64(block.timestamp), 0, 365 days);

        vm.startPrank(founder);
        capTable.revokeGrant(1);
        vm.expectRevert(abi.encodeWithSelector(CapTable.GrantNotActive.selector, 1));
        capTable.revokeGrant(1);
        vm.stopPrank();
    }

    // ─────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────

    function test_GetHolderGrants() public {
        vm.startPrank(founder);
        capTable.issueGrant(alice, ALICE_AMT / 2, uint64(block.timestamp), 0, 365 days);
        capTable.issueGrant(alice, ALICE_AMT / 2, uint64(block.timestamp), 0, 365 days);
        vm.stopPrank();

        uint256[] memory ids = capTable.getHolderGrants(alice);
        assertEq(ids.length, 2);
    }

    function test_VestingPreview() public {
        vm.prank(founder);
        capTable.issueGrant(alice, ALICE_AMT, uint64(block.timestamp), 0, 365 days);
        vesting.setVested(1, ALICE_AMT / 4);

        (uint256 vested, uint256 claimed, uint256 claimable) = capTable.vestingPreview(1);
        assertEq(vested, ALICE_AMT / 4);
        assertEq(claimed, 0);
        assertEq(claimable, ALICE_AMT / 4);
    }
}
