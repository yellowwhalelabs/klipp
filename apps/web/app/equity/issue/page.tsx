"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, TrendingUp, Loader2 } from "lucide-react";

const schema = z.object({
  holderAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid Ethereum address"),
  amount: z.string().min(1, "Required").refine((v) => parseFloat(v) > 0, "Must be > 0"),
  vestingStartDate: z.string().min(1, "Required"),
  cliffMonths: z.coerce.number().min(0).max(48),
  durationMonths: z.coerce.number().min(1).max(120),
});

type FormData = z.infer<typeof schema>;

export default function IssueEquityPage() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && !authenticated) router.push("/onboard");
  }, [ready, authenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      vestingStartDate: new Date().toISOString().split("T")[0],
      cliffMonths: 12,
      durationMonths: 48,
    },
  });

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      // TODO: call CapTable.issueGrant() via Privy wallet + viem
      // Convert months to seconds, amount to wei, call contract
      await new Promise((r) => setTimeout(r, 2000)); // simulate tx
      toast.success("Grant issued on Robinhood Chain!");
      router.push("/dashboard");
    } catch {
      toast.error("Transaction failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || !authenticated) return null;

  return (
    <div className="min-h-screen bg-zinc-950">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
        <span className="text-yellow-400 font-bold">KLIPP</span>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-400" />
            Issue Equity Grant
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Tokens vest on Robinhood Chain. Math computed by Stylus (Rust) contract.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Field label="Recipient wallet address" error={errors.holderAddress?.message}>
            <input
              {...register("holderAddress")}
              placeholder="0x..."
              className="input-field font-mono text-sm"
            />
          </Field>

          <Field label="Total shares (tokens)" error={errors.amount?.message}>
            <input
              {...register("amount")}
              type="number"
              placeholder="10000"
              step="any"
              className="input-field"
            />
          </Field>

          <Field label="Vesting start date" error={errors.vestingStartDate?.message}>
            <input
              {...register("vestingStartDate")}
              type="date"
              className="input-field"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Cliff (months)" error={errors.cliffMonths?.message}>
              <input
                {...register("cliffMonths")}
                type="number"
                min={0}
                max={48}
                className="input-field"
              />
            </Field>
            <Field label="Total duration (months)" error={errors.durationMonths?.message}>
              <input
                {...register("durationMonths")}
                type="number"
                min={1}
                max={120}
                className="input-field"
              />
            </Field>
          </div>

          {/* Summary */}
          <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-4 text-sm space-y-1 text-white/70">
            <p>Tokens will be locked in the CapTable contract</p>
            <p>Vesting computed by Stylus contract on Robinhood Chain</p>
            <p className="text-purple-400">Cliff + linear vesting schedule</p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Issuing grant…
              </>
            ) : (
              "Issue grant on Robinhood Chain →"
            )}
          </button>
        </form>
      </div>

      <style jsx global>{`
        .input-field {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.5rem;
          padding: 0.625rem 1rem;
          color: white;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-field:focus { border-color: rgba(168,85,247,0.5); }
        .input-field::placeholder { color: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm text-white/60">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
