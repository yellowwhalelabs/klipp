"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Briefcase, ShieldCheck } from "lucide-react";

// KLIPP Pro — verified-credentials layer. Placeholder page so the dashboard's
// "Add credentials" / "Pro claims" links resolve instead of 404ing.
export default function ProDashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-400/10">
            <Briefcase className="h-6 w-6 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold">KLIPP Pro</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
            Verified credentials — EIP-712 signed claims from employers, schools,
            and certificate issuers, attached to your on-chain identity.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Coming soon
          </div>
        </motion.div>
      </div>
    </div>
  );
}
