"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SignInButton } from "@/components/SignInButton";
import { CardView } from "@/components/CardView";
import { useKLIPPCard } from "@/hooks/useKLIPPCard";
import { Shield, Briefcase, TrendingUp, Plus, ExternalLink, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const { ready, authenticated, user } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && !authenticated) router.push("/onboard");
  }, [ready, authenticated, router]);

  const walletAddress = user?.wallet?.address ?? "";
  const displayName   = user?.email?.address?.split("@")[0] ?? "KLIPP User";

  // Live on-chain card state — reads KLIPPCard.cardOf() + tokenURI().
  // MUST be called before any early return so the Rules of Hooks are satisfied
  // (every render calls the same hooks in the same order). The hook no-ops when
  // the address is undefined (pre-auth), so calling it early is safe.
  const {
    tokenId,
    hasCard,
    tokenURI,
    isLoading: cardLoading,
  } = useKLIPPCard((walletAddress as `0x${string}`) || undefined);

  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white/40 animate-pulse">Loading…</div>
      </div>
    );
  }

  function copyAddress() {
    navigator.clipboard.writeText(walletAddress);
    toast.success("Address copied");
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="text-yellow-400 font-bold text-xl tracking-tight">
          KLIPP
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={copyAddress}
            className="hidden sm:flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            <span className="font-mono">
              {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
            </span>
            <Copy className="w-3 h-3" />
          </button>
          <SignInButton variant="outline" />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Your cards</h1>
          <p className="text-white/40 text-sm mt-1">
            Welcome back, {displayName}
          </p>
        </div>

        {/* Card grid */}
        <div className="grid sm:grid-cols-3 gap-6">
          {/* Layer 1: KLIPP Card — live on-chain read */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            className="space-y-4"
          >
            <CardView
              card={{
                layer: "klipp",
                ownerAddress: walletAddress,
                displayName,
                bio: user?.email?.address,
              }}
              size="sm"
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-yellow-400" />
                  KLIPP Card
                </span>
                {cardLoading ? (
                  <span className="text-xs text-white/30 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    checking…
                  </span>
                ) : hasCard ? (
                  <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">
                    Minted #{tokenId.toString()}
                  </span>
                ) : (
                  <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full">
                    Not minted
                  </span>
                )}
              </div>
              <p className="text-xs text-white/40">
                {hasCard
                  ? "Soulbound NFT live on Arbitrum Sepolia"
                  : "Your soulbound identity NFT — not yet minted"}
              </p>
              {hasCard && tokenURI && (
                <a
                  href={tokenURI.startsWith("ipfs://")
                    ? `https://ipfs.io/ipfs/${tokenURI.slice(7)}`
                    : tokenURI}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Token metadata
                </a>
              )}
              {hasCard ? (
                <a
                  href={`https://sepolia.arbiscan.io/token/0xcD238464cFE2901aF24e6d77585a19C2064Ca62A?a=${tokenId.toString()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-yellow-400/60 hover:text-yellow-400 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on Arbiscan
                </a>
              ) : (
                <Link
                  href="/onboard"
                  className="flex items-center gap-1 text-xs text-yellow-400/60 hover:text-yellow-400 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Mint your card
                </Link>
              )}
            </div>
          </motion.div>

          {/* Layer 2: Pro Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="relative">
              <CardView
                card={{
                  layer: "pro",
                  ownerAddress: walletAddress,
                  displayName,
                  claimsCount: 0,
                }}
                size="sm"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-400" />
                  KLIPP Pro
                </span>
                <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full">
                  0 claims
                </span>
              </div>
              <p className="text-xs text-white/40">Verified credentials from issuers</p>
              <Link
                href="/dashboard/pro"
                className="flex items-center gap-1 text-xs text-blue-400/60 hover:text-blue-400 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add credentials
              </Link>
            </div>
          </motion.div>

          {/* Layer 3: Equity Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <CardView
              card={{
                layer: "equity",
                ownerAddress: walletAddress,
                displayName,
                companyName: "No grants yet",
                vestedPercent: 0,
              }}
              size="sm"
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  Equity Card
                </span>
                <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full">
                  Robinhood Chain
                </span>
              </div>
              <p className="text-xs text-white/40">Tokenized equity with vesting</p>
              <Link
                href="/dashboard/equity"
                className="flex items-center gap-1 text-xs text-purple-400/60 hover:text-purple-400 transition-colors"
              >
                <TrendingUp className="w-3 h-3" />
                View equity grants
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Quick actions */}
        <div className="border-t border-white/5 pt-8">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">
            Quick actions
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickAction
              href="/onboard"
              label="Re-mint card"
              desc="Update your card metadata"
              icon={Shield}
            />
            <QuickAction
              href="/dashboard/pro"
              label="Pro claims"
              desc="See your verified credentials"
              icon={Briefcase}
            />
            <QuickAction
              href="/dashboard/equity"
              label="Equity grants"
              desc="Check vesting progress"
              icon={TrendingUp}
            />
            <QuickAction
              href="/equity/issue"
              label="Issue equity"
              desc="Founder: issue grants to team"
              icon={Plus}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  label,
  desc,
  icon: Icon,
}: {
  href: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 p-4 rounded-xl border border-white/10 hover:border-yellow-400/20 hover:bg-white/5 transition-all"
    >
      <Icon className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs text-white/40 mt-0.5">{desc}</div>
      </div>
    </Link>
  );
}
