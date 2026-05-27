"use client";

import { usePrivy } from "@privy-io/react-auth";
import { LogIn, LogOut, Loader2 } from "lucide-react";

interface SignInButtonProps {
  className?: string;
  variant?: "primary" | "outline" | "ghost";
}

export function SignInButton({ className = "", variant = "primary" }: SignInButtonProps) {
  const { ready, authenticated, login, logout, user } = usePrivy();

  const base =
    "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50";

  const variants = {
    primary:
      "bg-yellow-400 hover:bg-yellow-300 text-black",
    outline:
      "border border-yellow-400 text-yellow-400 hover:bg-yellow-400/10",
    ghost:
      "text-yellow-400 hover:bg-yellow-400/10",
  };

  if (!ready) {
    return (
      <button disabled className={`${base} ${variants[variant]} ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </button>
    );
  }

  if (authenticated) {
    const displayName =
      user?.email?.address ??
      user?.google?.name ??
      (user?.wallet?.address
        ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}`
        : "Connected");

    return (
      <button
        onClick={logout}
        className={`${base} ${variants.outline} ${className}`}
      >
        <span className="max-w-[120px] truncate text-sm">{displayName}</span>
        <LogOut className="h-4 w-4 shrink-0" />
      </button>
    );
  }

  return (
    <button
      onClick={login}
      className={`${base} ${variants[variant]} ${className}`}
    >
      <LogIn className="h-4 w-4" />
      Sign in to KLIPP
    </button>
  );
}
