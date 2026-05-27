"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { VestingProgress } from "@/components/VestingProgress";
import { TrendingUp, ArrowLeft, ExternalLink } from "lucide-react";
import { toast } from "sonner";

// Demo data — replaced by on-chain reads after deployment
const DEMO_GRANTS = [
  {
    grantId: 1n,
    company: "BuildFast Inc.",
    totalAmount: 100_000n * 10n ** 18n,
    vested: 25_000n * 10n ** 18n,
    claimed: 10_000n * 10n ** 18n,
    claimable: 15_000n * 10n ** 18n,
    vestingStart: Math.floor(Date.now() / 1000) - 365 * 24 * 3600,
    cliffSeconds: 365 * 24 * 3600,
    durationSeconds: 4 * 365 * 24 * 3600,
    active: true,
  },
];

export default function EquityDashboardPage() {
  const { ready, authenticated, user } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && !authenticated) router.push("/onboard");
  }, [ready, authenticated, router]);

  async function handleClaim(grantId: bigint) {
    toast.promise(
      new Promise((r) => setTimeout(r, 2000)), // TODO: replace with actual tx
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
              Powered by Stylus (Rust) on Robinhood Chain
            </p>
          </div>
          <a
            href="https://explorer.testnet.chain.robinhood.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Explorer <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {DEMO_GRANTS.length === 0 ? (
          <div className="text-center py-20 text-white/30">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No equity grants yet.</p>
            <p className="text-sm mt-1">Your founder will send you a grant when they issue equity.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {DEMO_GRANTS.map((g, i) => (
              <motion.div
                key={g.grantId.toString()}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{g.company}</h3>
                    <p className="text-xs text-white/40">Grant #{g.grantId.toString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    g.active
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}>
                    {g.active ? "Active" : "Revoked"}
                  </span>
                </div>

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
