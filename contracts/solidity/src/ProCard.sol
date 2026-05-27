// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/// @title ProCard
/// @notice Layer 2 of KLIPP — EIP-712 verified credential claims attached to
///         a holder's wallet address. Issuers (employers, schools, cert bodies)
///         sign typed-data claims off-chain; anyone can submit the signature on-chain.
///         Deployed on Arbitrum Sepolia.
contract ProCard is EIP712 {
    using ECDSA for bytes32;

    // ─────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────

    struct Claim {
        address issuer;       // who signed the claim
        address holder;       // card holder the claim is about
        bytes32 claimHash;    // keccak256 of claim JSON string
        uint256 issuedAt;     // block timestamp when stored on-chain
        bool revoked;
    }

    // EIP-712 type hash for the signed claim
    bytes32 public constant CLAIM_TYPEHASH = keccak256(
        "VerifiedClaim(address holder,bytes32 claimHash,uint256 nonce)"
    );

    // ─────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────

    /// @dev holder => list of claims
    mapping(address => Claim[]) private _claims;

    /// @dev issuer => holder => nonce (prevents claim replay)
    mapping(address => mapping(address => uint256)) public nonces;

    // ─────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────

    event ClaimAdded(
        address indexed holder,
        address indexed issuer,
        uint256 indexed claimIndex,
        bytes32 claimHash
    );
    event ClaimRevoked(address indexed holder, address indexed issuer, uint256 indexed claimIndex);

    // ─────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────

    error InvalidSignature();
    error ClaimOutOfBounds(uint256 index, uint256 length);
    error NotIssuer(address caller, address issuer);
    error AlreadyRevoked(uint256 claimIndex);

    // ─────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────

    constructor() EIP712("KLIPPProCard", "1") {}

    // ─────────────────────────────────────────────────────────────
    // External: add claim
    // ─────────────────────────────────────────────────────────────

    /// @notice Submit an issuer-signed credential claim for a holder.
    /// @param holder     The card holder this claim is about
    /// @param claimHash  keccak256 of the claim JSON body
    /// @param signature  EIP-712 signature from the issuer
    function addClaim(
        address holder,
        bytes32 claimHash,
        bytes calldata signature
    ) external returns (uint256 claimIndex) {
        uint256 nonce = nonces[msg.sender][holder];

        bytes32 structHash = keccak256(
            abi.encode(CLAIM_TYPEHASH, holder, claimHash, nonce)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = digest.recover(signature);

        if (recovered != msg.sender) revert InvalidSignature();

        nonces[msg.sender][holder]++;

        claimIndex = _claims[holder].length;
        _claims[holder].push(
            Claim({
                issuer: msg.sender,
                holder: holder,
                claimHash: claimHash,
                issuedAt: block.timestamp,
                revoked: false
            })
        );

        emit ClaimAdded(holder, msg.sender, claimIndex, claimHash);
    }

    // ─────────────────────────────────────────────────────────────
    // External: revoke claim
    // ─────────────────────────────────────────────────────────────

    /// @notice Revoke a claim. Only the original issuer can revoke.
    /// @param holder     The holder whose claim to revoke
    /// @param claimIndex Index into the holder's claims array
    function revokeClaim(address holder, uint256 claimIndex) external {
        Claim[] storage claims = _claims[holder];
        if (claimIndex >= claims.length) revert ClaimOutOfBounds(claimIndex, claims.length);
        Claim storage c = claims[claimIndex];
        if (c.issuer != msg.sender) revert NotIssuer(msg.sender, c.issuer);
        if (c.revoked) revert AlreadyRevoked(claimIndex);
        c.revoked = true;
        emit ClaimRevoked(holder, msg.sender, claimIndex);
    }

    // ─────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────

    /// @notice Return all claims for a holder
    function getClaims(address holder) external view returns (Claim[] memory) {
        return _claims[holder];
    }

    /// @notice Return the count of claims for a holder
    function claimCount(address holder) external view returns (uint256) {
        return _claims[holder].length;
    }

    /// @notice Return the EIP-712 domain separator (useful for off-chain signing)
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
