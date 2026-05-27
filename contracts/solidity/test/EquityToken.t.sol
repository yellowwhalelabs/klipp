// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/EquityToken.sol";

contract EquityTokenTest is Test {
    EquityToken token;
    EquityTokenFactory factory;

    address founder  = makeAddr("founder");
    address employee = makeAddr("employee");
    address attacker = makeAddr("attacker");

    uint256 constant TOTAL = 1_000_000 ether;

    function setUp() public {
        vm.prank(founder);
        token = new EquityToken("Acme Corp", "ACME", TOTAL, founder);
        factory = new EquityTokenFactory();
    }

    // ─────────────────────────────────────────────────────────────
    // Basic ERC-20
    // ─────────────────────────────────────────────────────────────

    function test_NameAndSymbol() public view {
        assertEq(token.name(), "Acme Corp");
        assertEq(token.symbol(), "ACME");
    }

    function test_FounderReceivesFullSupply() public view {
        assertEq(token.balanceOf(founder), TOTAL);
        assertEq(token.totalSupply(), TOTAL);
    }

    function test_DirectTransferByFounder() public {
        vm.prank(founder);
        token.transfer(employee, 100 ether);
        assertEq(token.balanceOf(employee), 100 ether);
    }

    // ─────────────────────────────────────────────────────────────
    // setCapTable
    // ─────────────────────────────────────────────────────────────

    function test_OwnerCanSetCapTable() public {
        address ct = makeAddr("capTable");
        vm.prank(founder);
        token.setCapTable(ct);
        assertEq(token.capTable(), ct);
    }

    function test_CannotSetCapTableTwice() public {
        address ct = makeAddr("capTable");
        vm.startPrank(founder);
        token.setCapTable(ct);
        vm.expectRevert(EquityToken.CapTableAlreadySet.selector);
        token.setCapTable(makeAddr("capTable2"));
        vm.stopPrank();
    }

    function test_NonOwnerCannotSetCapTable() public {
        vm.prank(attacker);
        vm.expectRevert();
        token.setCapTable(attacker);
    }

    // ─────────────────────────────────────────────────────────────
    // Restricted transferFrom
    // ─────────────────────────────────────────────────────────────

    function test_CapTableCanTransferFrom() public {
        address ct = makeAddr("capTable");
        vm.prank(founder);
        token.setCapTable(ct);

        vm.prank(founder);
        token.approve(ct, 500 ether);

        vm.prank(ct);
        bool ok = token.transferFrom(founder, employee, 500 ether);
        assertTrue(ok);
        assertEq(token.balanceOf(employee), 500 ether);
    }

    function test_RandomAddressCannotTransferFrom() public {
        address ct = makeAddr("capTable");
        vm.prank(founder);
        token.setCapTable(ct);

        vm.prank(founder);
        token.approve(attacker, 500 ether);

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(EquityToken.OnlyCapTable.selector, attacker));
        token.transferFrom(founder, attacker, 500 ether);
    }

    // ─────────────────────────────────────────────────────────────
    // Factory
    // ─────────────────────────────────────────────────────────────

    function test_FactoryCreatesToken() public {
        vm.prank(founder);
        address newToken = factory.create("Beta Co", "BETA", 500_000 ether);
        assertTrue(newToken != address(0));
        assertEq(EquityToken(newToken).balanceOf(founder), 500_000 ether);
        assertEq(EquityToken(newToken).name(), "Beta Co");
    }
}
