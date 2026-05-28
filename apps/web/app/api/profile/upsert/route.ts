import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

interface UpsertBody {
  walletAddress: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  metadataUri?: string;
  tokenId?: string | number;
  txHash?: string;
  chainId?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: UpsertBody = await request.json();
    const {
      walletAddress,
      displayName,
      bio,
      avatarUrl,
      metadataUri,
      tokenId,
      txHash,
      chainId = 421614,
    } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: "walletAddress required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const addr = walletAddress.toLowerCase();

    // 1. Upsert profile
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          wallet_address: addr,
          ...(displayName !== undefined && { display_name: displayName }),
          ...(bio !== undefined && { bio }),
          ...(avatarUrl !== undefined && { avatar_url: avatarUrl }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "wallet_address" }
      );

    if (profileError) {
      console.error("[profile/upsert] profile error:", profileError);
      // Non-fatal — card is already on-chain
    }

    // 2. Upsert klipp_card row
    const contractAddress = "0xcD238464cFE2901aF24e6d77585a19C2064Ca62A";
    const { error: cardError } = await supabase
      .from("klipp_cards")
      .upsert(
        {
          owner_address: addr,
          chain_id: chainId,
          contract_address: contractAddress,
          ...(tokenId !== undefined && { token_id: Number(tokenId) }),
          ...(metadataUri !== undefined && { metadata_uri: metadataUri }),
          ...(txHash !== undefined && { tx_hash: txHash }),
        },
        { onConflict: "chain_id,contract_address,owner_address" }
      );

    if (cardError) {
      console.error("[profile/upsert] card error:", cardError);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[profile/upsert] unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
