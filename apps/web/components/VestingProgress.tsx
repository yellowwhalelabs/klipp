"use client";

import { motion } from "framer-motion";
import { formatUnits } from "viem";

interface VestingProgressProps {
  totalAmount: bigint;
  vested: bigint;
  claimed: bigint;
  claimable: bigint;
  vestingStart: number; // unix seconds
  cliffSeconds: number;
  durationSeconds: number;
}

function formatTokens(amount: bigint, decimals = 18): string {
  const val = parseFloat(formatUnits(amount, decimals));
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(2)}K`;
  return val.toFixed(2);
}

export function VestingProgress({
  totalAmount,
  vested,
  claimed,
  claimable,
  vestingStart,
  cliffSeconds,
  durationSeconds,
}: VestingProgressProps) {
  const total       = totalAmount > 0n ? totalAmount : 1n; // avoid div-by-zero
  const vestedPct   = Number((vested * 10000n) / total) / 100;
  const claimedPct  = Number((claimed * 10000n) / total) / 100;

  const now         = Math.floor(Date.now() / 1000);
  const cliffAt     = vestingStart + cliffSeconds;
  const endAt       = vestingStart + durationSeconds;
  const pastCliff   = now >= cliffAt;
  const fullyVested = now >= endAt;

  const timeLeft = fullyVested
    ? "Fully vested"
    : !pastCliff
    ? `Cliff in ${daysUntil(cliffAt)}`
    : `${daysUntil(endAt)} until full`;

  return (
    <div className="space-y-3 rounded-xl bg-white/5 p-4 border border-white/10">
      {/* Bar */}
      <div className="relative w-full h-3 bg-white/10 rounded-full overflow-hidden">
        {/* Claimed (darker) */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${claimedPct}%` }}
          transition={{ duration: 0.8 }}
          className="absolute left-0 top-0 h-full bg-purple-600"
        />
        {/* Vested but unclaimed */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${vestedPct}%` }}
          transition={{ duration: 1, delay: 0.2 }}
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-500 to-yellow-400 opacity-80"
        />
        {/* Cliff marker */}
        {cliffSeconds > 0 && (
          <div
            className="absolute top-0 w-0.5 h-full bg-white/40"
            style={{ left: `${(cliffSeconds / durationSeconds) * 100}%` }}
          />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Total" value={formatTokens(totalAmount)} />
        <Stat label="Vested" value={`${vestedPct.toFixed(1)}%`} highlight />
        <Stat label="Claimable" value={formatTokens(claimable)} />
      </div>

      {/* Time label */}
      <p className="text-xs text-white/40 text-center">{timeLeft}</p>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className={`text-sm font-bold ${highlight ? "text-yellow-400" : "text-white"}`}>
        {value}
      </div>
      <div className="text-[10px] text-white/40">{label}</div>
    </div>
  );
}

function daysUntil(ts: number) {
  const diff = ts - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "now";
  const days = Math.ceil(diff / 86400);
  return `${days}d`;
}
