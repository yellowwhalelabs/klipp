import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  isAddress,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { createServiceClient } from "@/lib/supabase";

// Server-only route. The deployer private key is read from a NON-public env var
// and never leaves the server; the client only ever sees { success, txHash }.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Amount sent to each new embedded wallet, plus a floor we keep in the deployer
// wallet so a near-empty faucet fails cleanly instead of broadcasting doomed txs.
const FUND_AMOUNT = parseEther("0.005");
const DEPLOYER_FLOOR = parseEther("0.005");
const RPC_URL = "https://sepolia-rollup.arbitrum.io/rpc";

export async function POST(req: NextRequest) {
  // 1. Validate the requested address.
  let address: unknown;
  try {
    address = (await req.json())?.address;
  } catch {
    return NextResponse.json({ success: false, reason: "Bad request body" }, { status: 400 });
  }
  if (typeof address !== "string" || !isAddress(address)) {
    return NextResponse.json({ success: false, reason: "Invalid address" }, { status: 400 });
  }
  const checksummed = getAddress(address);
  const key = checksummed.toLowerCase();

  // 2. Deployer key — server-only secret. Absent ⇒ faucet disabled.
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    return NextResponse.json({ success: false, reason: "Faucet not configured" }, { status: 503 });
  }

  const supabase = createServiceClient();

  // 3. One-per-address lock: claim the slot by inserting first. A UNIQUE
  //    constraint on `address` turns a repeat/concurrent call into a no-op.
  const { error: claimErr } = await supabase
    .from("funded_wallets")
    .insert({ address: key });
  if (claimErr) {
    if ((claimErr as { code?: string }).code === "23505") {
      // unique_violation → already funded; idempotent success.
      return NextResponse.json({ success: true, reason: "already-funded", txHash: null });
    }
    console.error("[fund-wallet] claim failed:", claimErr.message);
    return NextResponse.json({ success: false, reason: "Faucet unavailable" }, { status: 503 });
  }

  // 4. Send the funds. On any failure, release the claim so the user can retry.
  try {
    const account = privateKeyToAccount(
      (pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`
    );
    const publicClient = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC_URL) });
    const walletClient = createWalletClient({ account, chain: arbitrumSepolia, transport: http(RPC_URL) });

    // Safeguard: never let the faucet drain itself below the floor.
    const deployerBal = await publicClient.getBalance({ address: account.address });
    if (deployerBal < FUND_AMOUNT + DEPLOYER_FLOOR) {
      await supabase.from("funded_wallets").delete().eq("address", key);
      return NextResponse.json({ success: false, reason: "Faucet balance too low" }, { status: 503 });
    }

    const hash = await walletClient.sendTransaction({ to: checksummed, value: FUND_AMOUNT });
    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ success: true, txHash: hash });
  } catch (err) {
    // Roll back the claim so a transient failure doesn't permanently block them.
    await supabase.from("funded_wallets").delete().eq("address", key);
    console.error("[fund-wallet] send failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, reason: "Funding transaction failed" }, { status: 500 });
  }
}
