"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { SignInButton } from "@/components/SignInButton";
import { CardView } from "@/components/CardView";
import { Shield, Briefcase, TrendingUp, Zap, Globe, Lock } from "lucide-react";

const DEMO_CARDS = [
  {
    layer: "klipp" as const,
    ownerAddress: "0x1234567890abcdef1234567890abcdef12345678",
    displayName: "Priya Sharma",
    bio: "Founder @ BuildFast",
  },
  {
    layer: "pro" as const,
    ownerAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdef1234",
    displayName: "Alex Chen",
    bio: "Engineer · 3 verified credentials",
    claimsCount: 3,
  },
  {
    layer: "equity" as const,
    ownerAddress: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    displayName: "Sam Patel",
    bio: "Early employee",
    companyName: "BuildFast Inc.",
    vestedPercent: 31.25,
  },
];

const FEATURES = [
  {
    icon: Shield,
    title: "No MetaMask required",
    desc: "Sign up with email or Google. Wallet auto-provisioned behind the scenes.",
  },
  {
    icon: Globe,
    title: "Multi-chain identity",
    desc: "KLIPP Card + Pro on Arbitrum Sepolia. Equity on Robinhood Chain.",
  },
  {
    icon: Briefcase,
    title: "Verified credentials",
    desc: "EIP-712 signed claims from employers, schools, and certificate issuers.",
  },
  {
    icon: TrendingUp,
    title: "Tokenized equity",
    desc: "Vesting math in Stylus (Rust) — 40–90% cheaper gas. On Robinhood Chain.",
  },
  {
    icon: Lock,
    title: "Soulbound NFTs",
    desc: "Cards are non-transferable. Your identity stays yours.",
  },
  {
    icon: Zap,
    title: "30-second onboarding",
    desc: "From zero to on-chain identity in under a minute. No install, no seed phrase.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-zinc-950/80 backdrop-blur border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 font-bold text-xl tracking-tight">KLIPP</span>
          <span className="text-white/30 text-xs hidden sm:inline">Arbitrum Open House Buildathon</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-white/60 hover:text-white transition-colors hidden sm:inline">
            Dashboard
          </Link>
          <SignInButton variant="primary" />
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto space-y-6"
        >
          <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-4 py-1.5 text-sm text-yellow-400">
            <Zap className="w-3.5 h-3.5" />
            No MetaMask · No seed phrase · 30-second setup
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white">
            Your entire identity
            <br />
            <span className="text-yellow-400">on one chain</span>
          </h1>

          <p className="text-lg text-white/60 max-w-xl mx-auto">
            Business card. Verified credentials. Tokenized equity — all in one app.
            Sign up with email or Google. No wallet install ever required.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/onboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-semibold rounded-xl transition-colors"
            >
              Get my KLIPP Card →
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/20 hover:border-white/40 text-white rounded-xl transition-colors"
            >
              View Dashboard
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Demo cards */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-sm text-white/40 uppercase tracking-widest mb-10">
            Three layers of identity
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            {DEMO_CARDS.map((card, i) => (
              <motion.div
                key={card.layer}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <CardView card={card} size="md" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-2xl font-bold text-white mb-12">
            Built different
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-2 hover:border-yellow-400/30 transition-colors"
                >
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Icon className="w-5 h-5" />
                    <span className="font-semibold text-sm">{f.title}</span>
                  </div>
                  <p className="text-sm text-white/50">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center border-t border-white/5">
        <div className="max-w-xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Ready to own your identity?
          </h2>
          <p className="text-white/50">
            Sign up with Google. Wallet auto-created. Card minted in seconds.
          </p>
          <Link
            href="/onboard"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-xl transition-colors text-lg"
          >
            Get started — it&apos;s free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/30">
          <div>
            <span className="text-yellow-400 font-bold">KLIPP</span> ·{" "}
            Arbitrum Open House Buildathon 2026
          </div>
          <div className="flex gap-4">
            <a
              href="https://github.com/yellowwhalelabs/klipp"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://sepolia.arbiscan.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Arbiscan
            </a>
            <a
              href="https://explorer.testnet.chain.robinhood.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Robinhood Explorer
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
