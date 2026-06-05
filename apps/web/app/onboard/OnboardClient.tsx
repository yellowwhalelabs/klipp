"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { encodeFunctionData } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { usePublicClient } from "wagmi";
import {
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  Loader2,
  User,
} from "lucide-react";
import { CONTRACTS, SOULBOUND_CARD_ABI } from "@/lib/contracts";
import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = "sign-in" | "profile" | "minting" | "done";

type MintStage =
  | "uploading"
  | "submitting"
  | "confirming"
  | "saving";

const STAGE_TEXT: Record<MintStage, string> = {
  uploading:  "Uploading your avatar…",
  submitting: "Minting your card (gas sponsored)…",
  confirming: "Confirming on-chain (~5–10 s)…",
  saving:     "Saving your profile…",
};

// ─── Storage helpers ─────────────────────────────────────────────────────────

async function uploadToStorage(
  path: string,
  body: Blob | string,
  contentType: string
): Promise<string | null> {
  const blob =
    typeof body === "string" ? new Blob([body], { type: contentType }) : body;

  const { error } = await supabase.storage
    .from("card-images")
    .upload(path, blob, { contentType, upsert: true });

  if (error) {
    console.warn("[storage] upload failed:", error.message);
    return null;
  }

  const { data } = supabase.storage.from("card-images").getPublicUrl(path);
  return data.publicUrl;
}

async function uploadAvatar(file: File, walletAddress: string): Promise<string | null> {
  const ext  = file.name.split(".").pop() ?? "jpg";
  const path = `${walletAddress.toLowerCase()}/avatar.${ext}`;
  return uploadToStorage(path, file, file.type || "image/jpeg");
}

async function uploadMetadata(
  metadata: object,
  walletAddress: string
): Promise<string> {
  const json = JSON.stringify(metadata);
  const path = `${walletAddress.toLowerCase()}/metadata.json`;
  const url  = await uploadToStorage(path, json, "application/json");

  if (!url) {
    // Fallback: embed metadata inline as a data URI (always works, no storage needed)
    return `data:application/json;base64,${btoa(json)}`;
  }
  return url;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OnboardPage() {
  const { ready, authenticated, user, login } = usePrivy();
  const router = useRouter();

  const [step, setStep]               = useState<Step>("sign-in");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio]                 = useState("");
  const [avatarFile, setAvatarFile]   = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [mintStage, setMintStage]     = useState<MintStage | null>(null);
  const [txHash, setTxHash]           = useState<`0x${string}` | null>(null);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  // Smart-account (ERC-4337) client — mints are sent as sponsored
  // UserOperations through the Alchemy Gas Manager paymaster, so the user
  // never needs ETH. The card is owned by the smart-account address (the
  // UserOp's msg.sender), so we key the profile/storage on it.
  const { client: smartWalletClient } = useSmartWallets();
  const walletAddress = (smartWalletClient?.account?.address ??
    user?.smartWallet?.address ??
    user?.wallet?.address ??
    "") as `0x${string}`;

  const publicClient = usePublicClient({ chainId: arbitrumSepolia.id });

  // ── Auth gate ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    if (authenticated) setStep("profile");
  }, [ready, authenticated]);

  // ── Avatar picker ──────────────────────────────────────────────────────────
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  }

  // ── Main mint flow ─────────────────────────────────────────────────────────
  async function handleMint() {
    if (!displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }
    if (!smartWalletClient || !walletAddress) {
      toast.error("Your wallet is still setting up — give it a second and try again.");
      return;
    }

    setStep("minting");

    try {
      // ── 1. Upload avatar ─────────────────────────────────────────────────
      setMintStage("uploading");
      let avatarUrl = "";
      if (avatarFile) {
        avatarUrl = (await uploadAvatar(avatarFile, walletAddress)) ?? "";
      }

      // ── 2. Build & upload metadata ───────────────────────────────────────
      const metadata = {
        name:        displayName,
        description: bio || undefined,
        image:       avatarUrl || undefined,
        external_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/card/${walletAddress}`,
        attributes: [
          { trait_type: "Layer",       value: "KLIPP Card"                        },
          { trait_type: "Chain",       value: "Arbitrum Sepolia"                  },
          { trait_type: "Auth Method", value: user?.email ? "email" : "social"    },
          { trait_type: "Minted At",   value: new Date().toISOString()            },
        ],
      };
      const metadataUri = await uploadMetadata(metadata, walletAddress);

      // ── 3. Mint KLIPPCard.mint(metadataUri) as a sponsored UserOperation ──
      // The smart-account client signs invisibly with the embedded wallet and
      // the Alchemy Gas Manager pays the gas — no wallet popup, no ETH, no chain
      // switch (the client targets Arbitrum Sepolia directly).
      setMintStage("submitting");
      const hash = await smartWalletClient.sendTransaction({
        chain: arbitrumSepolia,
        to:    CONTRACTS.SOULBOUND_CARD,
        data:  encodeFunctionData({
          abi:          SOULBOUND_CARD_ABI,
          functionName: "mint",
          args:         [metadataUri],
        }),
      });

      setTxHash(hash);

      // ── 5. Wait for confirmation ─────────────────────────────────────────
      setMintStage("confirming");
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });

      if (receipt.status === "reverted") {
        throw new Error("Transaction reverted on-chain");
      }

      // ── 6. Upsert profile + card into Supabase ───────────────────────────
      setMintStage("saving");
      try {
        await fetch("/api/profile/upsert", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            walletAddress,
            displayName,
            bio:         bio || undefined,
            avatarUrl:   avatarUrl || undefined,
            metadataUri,
            txHash:      hash,
            chainId:     arbitrumSepolia.id,
          }),
        });
      } catch (saveErr) {
        // Profile save failing is non-fatal — card is already on-chain
        console.warn("[onboard] profile save failed:", saveErr);
      }

      // ── 7. Done ──────────────────────────────────────────────────────────
      setStep("done");
      toast.success("KLIPP Card minted! 🎉");
      setTimeout(() => router.push("/dashboard"), 2500);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Minting failed. Try again.";
      toast.error(msg.length > 80 ? "Minting failed. Check your wallet and try again." : msg);
      setStep("profile");
      setMintStage(null);
    }
  }

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 text-yellow-400 animate-spin" />
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">

        {/* Logo */}
        <div className="text-center">
          <span className="text-yellow-400 font-bold text-3xl tracking-tight">KLIPP</span>
          <p className="text-white/40 text-sm mt-1">Set up your identity in 60 seconds</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {(["sign-in", "profile", "minting", "done"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-all duration-300 ${
                i <= (["sign-in", "profile", "minting", "done"] as Step[]).indexOf(step)
                  ? "bg-yellow-400 w-8"
                  : "bg-white/10 w-4"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── Step 1: Sign in ─────────────────────────────────────────── */}
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

          {/* ── Step 2: Profile form ─────────────────────────────────────── */}
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
                    {user?.email?.address ?? user?.google?.email ?? "connected"}
                  </span>
                </p>
              </div>

              {/* Avatar picker */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-20 h-20 rounded-full overflow-hidden bg-white/10 border-2 border-dashed border-white/20 hover:border-yellow-400/40 transition-colors flex items-center justify-center"
                >
                  {avatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-white/30" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-medium">Change</span>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="sr-only"
                />
              </div>

              {/* Name + bio */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-white/60 mb-1">
                    Display name <span className="text-yellow-400">*</span>
                  </label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    maxLength={64}
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
                    maxLength={160}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400/50 transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Mint button — always active for signed-in users; gas is
                  sponsored, so there is no balance requirement. */}
              <button
                onClick={handleMint}
                disabled={!displayName.trim()}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                Mint my card
              </button>

              <p className="text-center text-xs text-white/30">
                No gas, no wallet popup — minting is on us.
              </p>

              {walletAddress && (
                <p className="text-center text-xs text-white/20 font-mono">
                  {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
                </p>
              )}
            </motion.div>
          )}

          {/* ── Step 3: Minting progress ─────────────────────────────────── */}
          {step === "minting" && (
            <motion.div
              key="minting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-5 py-8"
            >
              <Loader2 className="h-12 w-12 text-yellow-400 animate-spin mx-auto" />
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-white">Minting your card…</h2>
                <p className="text-white/40 text-sm">
                  {mintStage ? STAGE_TEXT[mintStage] : "Preparing…"}
                </p>
              </div>

              {/* Stage indicators */}
              <div className="space-y-2 text-left max-w-xs mx-auto">
                {(["uploading", "submitting", "confirming", "saving"] as MintStage[]).map(
                  (stage, i) => {
                    const stages: MintStage[] = [
                      "uploading",
                      "submitting",
                      "confirming",
                      "saving",
                    ];
                    const currentIdx = mintStage ? stages.indexOf(mintStage) : -1;
                    const isDone     = i < currentIdx;
                    const isActive   = i === currentIdx;

                    return (
                      <div key={stage} className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                            isDone
                              ? "bg-green-500"
                              : isActive
                              ? "bg-yellow-400"
                              : "bg-white/10"
                          }`}
                        >
                          {isDone && (
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          )}
                          {isActive && (
                            <Loader2 className="w-2.5 h-2.5 text-black animate-spin" />
                          )}
                        </div>
                        <span
                          className={`text-xs ${
                            isDone
                              ? "text-green-400"
                              : isActive
                              ? "text-yellow-400"
                              : "text-white/20"
                          }`}
                        >
                          {STAGE_TEXT[stage]}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>

              {txHash && (
                <a
                  href={`https://sepolia.arbiscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on Arbiscan
                </a>
              )}
            </motion.div>
          )}

          {/* ── Step 4: Done ─────────────────────────────────────────────── */}
          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4 py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white">Card minted! 🎉</h2>
              <p className="text-white/40 text-sm">
                Your KLIPP Card is live on Arbitrum Sepolia.
              </p>
              {txHash && (
                <a
                  href={`https://sepolia.arbiscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-yellow-400/60 hover:text-yellow-400 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View transaction
                </a>
              )}
              <p className="text-white/30 text-xs">Redirecting to your dashboard…</p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
