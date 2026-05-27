"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Loader2, CheckCircle2, User, ImageIcon } from "lucide-react";

type Step = "sign-in" | "profile" | "mint" | "done";

export default function OnboardPage() {
  const { ready, authenticated, user, login } = usePrivy();
  const router = useRouter();
  const [step, setStep] = useState<Step>("sign-in");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [minting, setMinting] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (authenticated) setStep("profile");
  }, [ready, authenticated]);

  async function handleMint() {
    if (!displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }

    setMinting(true);
    setStep("mint");

    try {
      // Build metadata JSON and mint
      const metadata = {
        name: displayName,
        description: bio,
        attributes: [
          { trait_type: "Layer", value: "KLIPP Card" },
          { trait_type: "Auth Method", value: user?.email ? "email" : "social" },
        ],
      };

      // In production: upload metadata to Supabase Storage, get URI, call contract
      // For now: use data URI for demo
      // TODO: call SoulboundCard.mint(metadataURI) via viem + Privy wallet
      // Upload metadata to Supabase Storage, get URI, then call contract
      const _metadataURI = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;
      void _metadataURI; // used in real mint call below
      // Simulating for now
      await new Promise((r) => setTimeout(r, 2000));

      toast.success("KLIPP Card minted!");
      setStep("done");

      setTimeout(() => router.push("/dashboard"), 2000);
    } catch {
      toast.error("Minting failed. Try again.");
      setStep("profile");
    } finally {
      setMinting(false);
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 text-yellow-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <span className="text-yellow-400 font-bold text-3xl tracking-tight">KLIPP</span>
          <p className="text-white/40 text-sm mt-1">Set up your identity in 60 seconds</p>
        </div>

        {/* Steps indicator */}
        <div className="flex justify-center gap-2">
          {(["sign-in", "profile", "mint", "done"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-all duration-300 ${
                i <= ["sign-in", "profile", "mint", "done"].indexOf(step)
                  ? "bg-yellow-400 w-8"
                  : "bg-white/10 w-4"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Sign in */}
          {step === "sign-in" && (
            <motion.div
              key="sign-in"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-white">Create your account</h1>
                <p className="text-white/50 text-sm">
                  Email, Google, or passkey — no wallet install needed
                </p>
              </div>
              <button
                onClick={login}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-semibold rounded-xl transition-colors"
              >
                Sign in to KLIPP →
              </button>
              <p className="text-center text-xs text-white/30">
                Your wallet is created automatically. No MetaMask required.
              </p>
            </motion.div>
          )}

          {/* Step 2: Profile */}
          {step === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold text-white">Set up your card</h1>
                <p className="text-white/50 text-sm">
                  Signed in as{" "}
                  <span className="text-yellow-400">
                    {user?.email?.address ?? "connected"}
                  </span>
                </p>
              </div>

              {/* Avatar placeholder */}
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-yellow-400/40 transition-colors">
                  <ImageIcon className="w-6 h-6 text-white/30" />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-white/60 mb-1">Display name *</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="What do you do? (optional)"
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400/50 transition-colors resize-none"
                  />
                </div>
              </div>

              <button
                onClick={handleMint}
                disabled={!displayName.trim() || minting}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                Mint my KLIPP Card
              </button>
            </motion.div>
          )}

          {/* Step 3: Minting */}
          {step === "mint" && (
            <motion.div
              key="mint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-4 py-8"
            >
              <Loader2 className="h-12 w-12 text-yellow-400 animate-spin mx-auto" />
              <h2 className="text-xl font-semibold text-white">Minting your card…</h2>
              <p className="text-white/40 text-sm">No gas, no popups. Hold tight.</p>
            </motion.div>
          )}

          {/* Step 4: Done */}
          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4 py-8"
            >
              <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto" />
              <h2 className="text-xl font-semibold text-white">Card minted! 🎉</h2>
              <p className="text-white/40 text-sm">Redirecting to your dashboard…</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
