"use client";

/**
 * useKLIPPCard — reads live on-chain state from the deployed KLIPPCard contract.
 *
 * Returns:
 *   tokenId    — the caller's token ID (0n = no card minted yet)
 *   hasCard    — true if tokenId > 0
 *   tokenURI   — raw URI string from the contract (IPFS or data-URI)
 *   isLoading  — true while either contract read is pending
 *   error      — first error from either read, or null
 */

import { useReadContracts } from "wagmi";
import { CONTRACTS, SOULBOUND_CARD_ABI } from "@/lib/contracts";

export interface KLIPPCardState {
  tokenId: bigint;
  hasCard: boolean;
  tokenURI: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function useKLIPPCard(ownerAddress?: `0x${string}`): KLIPPCardState {
  const skip = !ownerAddress;

  const { data, isLoading, error } = useReadContracts({
    contracts: [
      // 1. cardOf(owner) → tokenId
      {
        address: CONTRACTS.SOULBOUND_CARD,
        abi: SOULBOUND_CARD_ABI,
        functionName: "cardOf",
        args: ownerAddress ? [ownerAddress] : undefined,
      },
    ],
    query: {
      enabled: !skip,
      // Refresh every 15 s so the dashboard updates shortly after a mint
      refetchInterval: 15_000,
    },
  });

  const tokenIdResult = data?.[0];
  const tokenId =
    tokenIdResult?.status === "success" && typeof tokenIdResult.result === "bigint"
      ? tokenIdResult.result
      : 0n;

  const hasCard = tokenId > 0n;

  // Second read: tokenURI(tokenId) — only if the user has a card
  const { data: uriData, isLoading: uriLoading, error: uriError } = useReadContracts({
    contracts: [
      {
        address: CONTRACTS.SOULBOUND_CARD,
        abi: SOULBOUND_CARD_ABI,
        functionName: "tokenURI",
        args: hasCard ? [tokenId] : undefined,
      },
    ],
    query: {
      enabled: hasCard,
      refetchInterval: 30_000,
    },
  });

  const uriResult = uriData?.[0];
  const tokenURI =
    uriResult?.status === "success" && typeof uriResult.result === "string"
      ? uriResult.result
      : null;

  return {
    tokenId,
    hasCard,
    tokenURI,
    isLoading: isLoading || (hasCard && uriLoading),
    error: (error ?? uriError ?? null) as Error | null,
  };
}
