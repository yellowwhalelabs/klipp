// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/SoulboundCard.sol";

contract SoulboundCardTest is Test {
    SoulboundCard card;
    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");

    function setUp() public {
        card = new SoulboundCard();
    }

    // ─────────────────────────────────────────────────────────────
    // Mint
    // ─────────────────────────────────────────────────────────────

    function test_MintSucceeds() public {
        vm.prank(alice);
        uint256 id = card.mint("ipfs://QmAlice");
        assertEq(id, 1);
        assertEq(card.ownerOf(1), alice);
        assertEq(card.cardOf(alice), 1);
        assertEq(card.tokenURI(1), "ipfs://QmAlice");
        assertEq(card.totalSupply(), 1);
        assertTrue(card.hasCard(alice));
    }

    function test_TwoUsersCanEachMint() public {
        vm.prank(alice);
        card.mint("ipfs://QmAlice");

        vm.prank(bob);
        card.mint("ipfs://QmBob");

        assertEq(card.totalSupply(), 2);
        assertEq(card.cardOf(alice), 1);
        assertEq(card.cardOf(bob), 2);
    }

    function test_DoubleMintReverts() public {
        vm.startPrank(alice);
        card.mint("ipfs://QmAlice");
        vm.expectRevert(abi.encodeWithSelector(SoulboundCard.AlreadyHasCard.selector, alice));
        card.mint("ipfs://QmAlice2");
        vm.stopPrank();
    }

    // ─────────────────────────────────────────────────────────────
    // Transfer
    // ─────────────────────────────────────────────────────────────

    function test_TransferReverts() public {
        vm.prank(alice);
        card.mint("ipfs://QmAlice");

        vm.prank(alice);
        vm.expectRevert(SoulboundCard.TransfersForbidden.selector);
        card.transferFrom(alice, bob, 1);
    }

    function test_SafeTransferReverts() public {
        vm.prank(alice);
        card.mint("ipfs://QmAlice");

        vm.prank(alice);
        vm.expectRevert(SoulboundCard.TransfersForbidden.selector);
        card.safeTransferFrom(alice, bob, 1);
    }

    // ─────────────────────────────────────────────────────────────
    // Update metadata
    // ─────────────────────────────────────────────────────────────

    function test_OwnerCanUpdateMetadata() public {
        vm.prank(alice);
        card.mint("ipfs://QmAlice");

        vm.prank(alice);
        card.updateMetadata(1, "ipfs://QmAliceV2");
        assertEq(card.tokenURI(1), "ipfs://QmAliceV2");
    }

    function test_NonOwnerCannotUpdateMetadata() public {
        vm.prank(alice);
        card.mint("ipfs://QmAlice");

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(SoulboundCard.NotCardOwner.selector, bob, 1));
        card.updateMetadata(1, "ipfs://QmHacked");
    }

    // ─────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────

    function test_MintEmitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit SoulboundCard.CardMinted(alice, 1, "ipfs://QmAlice");
        card.mint("ipfs://QmAlice");
    }

    function test_UpdateEmitsEvent() public {
        vm.prank(alice);
        card.mint("ipfs://QmAlice");

        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit SoulboundCard.CardUpdated(alice, 1, "ipfs://QmV2");
        card.updateMetadata(1, "ipfs://QmV2");
    }
}
