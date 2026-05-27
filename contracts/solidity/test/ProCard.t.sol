// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ProCard.sol";

contract KLIPPProCardTest is Test {
    KLIPPProCard proCard;
    address alice   = makeAddr("alice");   // holder
    uint256 issuerPk = 0xDEADBEEF;
    address issuer;

    // EIP-712 type hash (must match contract)
    bytes32 constant CLAIM_TYPEHASH = keccak256(
        "VerifiedClaim(address holder,bytes32 claimHash,uint256 nonce)"
    );

    function setUp() public {
        proCard = new KLIPPProCard();
        issuer  = vm.addr(issuerPk);
    }

    // ─────────────────────────────────────────────────────────────
    // Helper: build valid EIP-712 signature
    // ─────────────────────────────────────────────────────────────

    function _sign(address holder, bytes32 claimHash, uint256 nonce)
        internal
        view
        returns (bytes memory sig)
    {
        bytes32 structHash = keccak256(abi.encode(CLAIM_TYPEHASH, holder, claimHash, nonce));
        bytes32 domainSep  = proCard.domainSeparator();
        bytes32 digest     = keccak256(abi.encodePacked("\x19\x01", domainSep, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(issuerPk, digest);
        sig = abi.encodePacked(r, s, v);
    }

    // ─────────────────────────────────────────────────────────────
    // Add claim
    // ─────────────────────────────────────────────────────────────

    function test_AddClaimSucceeds() public {
        bytes32 claimHash = keccak256('{"type":"employment","company":"Acme"}');
        bytes memory sig  = _sign(alice, claimHash, 0);

        vm.prank(issuer);
        uint256 idx = proCard.addClaim(alice, claimHash, sig);
        assertEq(idx, 0);

        KLIPPProCard.Claim[] memory claims = proCard.getClaims(alice);
        assertEq(claims.length, 1);
        assertEq(claims[0].issuer, issuer);
        assertEq(claims[0].holder, alice);
        assertEq(claims[0].claimHash, claimHash);
        assertFalse(claims[0].revoked);
    }

    function test_AddMultipleClaims() public {
        bytes32 h1 = keccak256("claim1");
        bytes32 h2 = keccak256("claim2");

        vm.startPrank(issuer);
        proCard.addClaim(alice, h1, _sign(alice, h1, 0));
        proCard.addClaim(alice, h2, _sign(alice, h2, 1));
        vm.stopPrank();

        assertEq(proCard.claimCount(alice), 2);
    }

    function test_InvalidSignatureReverts() public {
        bytes32 claimHash = keccak256("claim");
        // Wrong signer (alice signs instead of issuer submitting)
        bytes memory badSig = _sign(alice, claimHash, 0);

        // issuer is submitting but signed with a different key
        address badIssuer = makeAddr("badIssuer");
        vm.prank(badIssuer);
        vm.expectRevert(KLIPPProCard.InvalidSignature.selector);
        proCard.addClaim(alice, claimHash, badSig);
    }

    function test_NoncePreventsReplay() public {
        bytes32 claimHash = keccak256("claim");
        bytes memory sig  = _sign(alice, claimHash, 0);

        vm.startPrank(issuer);
        proCard.addClaim(alice, claimHash, sig);

        // Same sig used again (nonce is now 1)
        vm.expectRevert(KLIPPProCard.InvalidSignature.selector);
        proCard.addClaim(alice, claimHash, sig);
        vm.stopPrank();
    }

    // ─────────────────────────────────────────────────────────────
    // Revoke claim
    // ─────────────────────────────────────────────────────────────

    function test_IssuerCanRevoke() public {
        bytes32 claimHash = keccak256("claim");
        bytes memory sig  = _sign(alice, claimHash, 0);
        vm.prank(issuer);
        proCard.addClaim(alice, claimHash, sig);

        vm.prank(issuer);
        proCard.revokeClaim(alice, 0);

        KLIPPProCard.Claim[] memory claims = proCard.getClaims(alice);
        assertTrue(claims[0].revoked);
    }

    function test_NonIssuerCannotRevoke() public {
        bytes32 claimHash = keccak256("claim");
        bytes memory sig  = _sign(alice, claimHash, 0);
        vm.prank(issuer);
        proCard.addClaim(alice, claimHash, sig);

        address other = makeAddr("other");
        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(KLIPPProCard.NotIssuer.selector, other, issuer));
        proCard.revokeClaim(alice, 0);
    }

    function test_DoubleRevokeReverts() public {
        bytes32 claimHash = keccak256("claim");
        bytes memory sig  = _sign(alice, claimHash, 0);
        vm.prank(issuer);
        proCard.addClaim(alice, claimHash, sig);

        vm.startPrank(issuer);
        proCard.revokeClaim(alice, 0);
        vm.expectRevert(abi.encodeWithSelector(KLIPPProCard.AlreadyRevoked.selector, 0));
        proCard.revokeClaim(alice, 0);
        vm.stopPrank();
    }

    function test_RevokeOutOfBoundsReverts() public {
        vm.prank(issuer);
        vm.expectRevert(abi.encodeWithSelector(KLIPPProCard.ClaimOutOfBounds.selector, 0, 0));
        proCard.revokeClaim(alice, 0);
    }
}
