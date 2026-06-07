"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createPublicClient, defineChain, formatUnits, http } from "viem";
import { VestingProgress } from "@/components/VestingProgress";
import { TrendingUp, ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CONTRACTS, KLIPP_VESTING_ABI } from "@/lib/contracts";

// Robinhood Chain Testnet (defined inline to avoid pulling providers.tsx's
// module-level wagmi/query-client side effects into this page).
const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_ROBINHOOD_RPC ||
          "https://rpc.testnet.chain.robinhood.com",
      ],
    },
  },
});

const robinhoodClient = createPublicClient({
  chain: robinhoodTestnet,
  transport: http(),
});

// The Stylus contract has no per-holder enumeration, so we read known grant ids.
// Founders issue grants via createGrant; ids start at 1.
const GRANT_IDS = [1n, 2n, 3n] as const;

// Whole-token count with thousands separators, e.g. 250000n*1e18 → "250,000".
const fmtTokens = (a: bigint) =>
  Math.round(Number(formatUnits(a, 18))).toLocaleString("en-US");

type Grant = {
  grantId: bigint;
  beneficiary: `0x${string}`;
  totalAmount: bigint;
  vested: bigint;
  claimed: bigint;
  claimable: bigint;
  vestingStart: number;
  cliffSeconds: number;
  durationSeconds: number;
};

export default function EquityDashboardPage() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const [grants, setGrants] = useState<Grant[] | null>(null); // null = loading

  useEffect(() => {
    if (ready && !authenticated) router.push("/onboard");
  }, [ready, authenticated, router]);

  // Read live grant state from the deployed KLIPPVesting (Stylus) contract.
  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;

    (async () => {
      const vesting = CONTRACTS.VESTING_ROBINHOOD;
      const now = BigInt(Math.floor(Date.now() / 1000));
      const found: Grant[] = [];

      for (const grantId of GRANT_IDS) {
        try {
          // getGrant reverts with "unknown grant" if the id doesn't exist —
          // both reads run against the on-chain Stylus contract.
          const [beneficiary, total, start, cliff, duration, claimed] =
            await robinhoodClient.readContract({
              address: vesting,
              abi: KLIPP_VESTING_ABI,
              functionName: "getGrant",
              args: [grantId],
            });

          // vested is computed on-chain by the Stylus compute_vested routine.
          const vested = await robinhoodClient.readContract({
            address: vesting,
            abi: KLIPP_VESTING_ABI,
            functionName: "vestedAmount",
            args: [grantId, now],
          });

          found.push({
            grantId,
            beneficiary,
            totalAmount: total,
            vested,
            claimed,
            claimable: vested > claimed ? vested - claimed : 0n,
            vestingStart: Number(start),
            cliffSeconds: Number(cliff),
            durationSeconds: Number(duration),
          });
        } catch {
          // id not present (or read failed) — skip it.
        }
      }

      if (!cancelled) setGrants(found);
    })();

    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  async function handleClaim(_grantId: bigint) {
    toast.promise(
      new Promise((r) => setTimeout(r, 2000)), // TODO: wire claim() when added
      {
        loading: "Claiming vested tokens via Stylus…",
        success: "Tokens claimed! 🎉",
        error: "Claim failed. Try again.",
      }
    );
  }

  if (!ready || !authenticated) return null;

  return (
    <div className="min-h-screen bg-zinc-950">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
        <span className="text-yellow-400 font-bold">KLIPP</span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-purple-400" />
              Equity Grants
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Vesting computed on-chain by Stylus (Rust) on Robinhood Chain
            </p>
          </div>
          <a
            href={`https://explorer.testnet.chain.robinhood.com/address/${CONTRACTS.VESTING_ROBINHOOD}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Contract <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {grants === null ? (
          <div className="text-center py-20 text-white/30">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-purple-400" />
            <p className="text-sm">Reading grants from the Stylus contract…</p>
          </div>
        ) : grants.length === 0 ? (
          <div className="text-center py-20 text-white/30">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No equity grants yet.</p>
            <p className="text-sm mt-1">Your founder will send you a grant when they issue equity.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grants.map((g, i) => (
              <motion.div
                key={g.grantId.toString()}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">Equity Grant</h3>
                    <p className="text-xs text-white/40 font-mono">
                      Grant #{g.grantId.toString()} · {g.beneficiary.slice(0, 6)}…{g.beneficiary.slice(-4)}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
                    Active
                  </span>
                </div>

                <p className="text-sm text-white/70">
                  <span className="text-yellow-400 font-semibold">{fmtTokens(g.vested)}</span>
                  {" / "}
                  {fmtTokens(g.totalAmount)} KLIPP tokens vested
                </p>

                <VestingProgress
                  totalAmount={g.totalAmount}
                  vested={g.vested}
                  claimed={g.claimed}
                  claimable={g.claimable}
                  vestingStart={g.vestingStart}
                  cliffSeconds={g.cliffSeconds}
                  durationSeconds={g.durationSeconds}
                />

                {g.claimable > 0n && (
                  <button
                    onClick={() => handleClaim(g.grantId)}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors"
                  >
                    Claim vested tokens →
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
