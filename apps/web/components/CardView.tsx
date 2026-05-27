"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";
import { Shield, Briefcase, TrendingUp, ExternalLink } from "lucide-react";

export type CardLayer = "klipp" | "pro" | "equity";

interface CardData {
  layer: CardLayer;
  ownerAddress: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  // Pro card
  claimsCount?: number;
  // Equity card
  companyName?: string;
  vestedPercent?: number;
}

interface CardViewProps {
  card: CardData;
  size?: "sm" | "md" | "lg";
}

const LAYER_CONFIG = {
  klipp: {
    label: "KLIPP Card",
    gradient: "from-zinc-800 via-zinc-700 to-zinc-800",
    accent: "text-yellow-400",
    border: "border-zinc-600",
    icon: Shield,
    badge: "bg-zinc-700 text-zinc-300",
  },
  pro: {
    label: "KLIPP Pro",
    gradient: "from-blue-950 via-blue-900 to-blue-950",
    accent: "text-blue-400",
    border: "border-blue-700",
    icon: Briefcase,
    badge: "bg-blue-900 text-blue-300",
  },
  equity: {
    label: "KLIPP Equity",
    gradient: "from-purple-950 via-purple-900 to-yellow-950",
    accent: "text-yellow-400",
    border: "border-purple-600",
    icon: TrendingUp,
    badge: "bg-purple-900 text-purple-300",
  },
};

const SIZES = {
  sm: { card: "w-56 h-36", text: "text-xs", avatar: "w-8 h-8" },
  md: { card: "w-80 h-48", text: "text-sm", avatar: "w-12 h-12" },
  lg: { card: "w-96 h-56", text: "text-base", avatar: "w-14 h-14" },
};

export function CardView({ card, size = "md" }: CardViewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const config  = LAYER_CONFIG[card.layer];
  const sizes   = SIZES[size];
  const Icon    = config.icon;

  // 3D tilt effect
  const x         = useMotionValue(0);
  const y         = useMotionValue(0);
  const rotateX   = useSpring(useTransform(y, [-100, 100], [10, -10]), { stiffness: 300, damping: 30 });
  const rotateY   = useSpring(useTransform(x, [-100, 100], [-10, 10]), { stiffness: 300, damping: 30 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect   = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width  / 2;
    const centerY = rect.top  + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  const shortAddr = `${card.ownerAddress.slice(0, 6)}...${card.ownerAddress.slice(-4)}`;

  return (
    <motion.div
      ref={cardRef}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`
        ${sizes.card} relative rounded-2xl border ${config.border}
        bg-gradient-to-br ${config.gradient}
        shadow-2xl cursor-pointer select-none overflow-hidden
      `}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 opacity-20 bg-gradient-to-tr from-transparent via-white to-transparent -skew-x-12 pointer-events-none" />

      {/* Content */}
      <div className="relative h-full p-4 flex flex-col justify-between">
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {card.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.avatarUrl}
                alt={card.displayName || "avatar"}
                className={`${sizes.avatar} rounded-full object-cover ring-2 ring-white/20`}
              />
            ) : (
              <div className={`${sizes.avatar} rounded-full bg-white/10 flex items-center justify-center`}>
                <span className="text-white/60 font-bold">
                  {(card.displayName || "?")[0].toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <div className={`font-bold text-white ${sizes.text}`}>
                {card.displayName || shortAddr}
              </div>
              {card.bio && (
                <div className={`text-white/60 ${size === "lg" ? "text-xs" : "text-[10px]"} max-w-[140px] truncate`}>
                  {card.bio}
                </div>
              )}
            </div>
          </div>
          <span className={`${config.badge} ${sizes.text} px-2 py-0.5 rounded-full flex items-center gap-1`}>
            <Icon className="w-3 h-3" />
            {config.label}
          </span>
        </div>

        {/* Middle: equity progress bar */}
        {card.layer === "equity" && card.vestedPercent !== undefined && (
          <div className="space-y-1">
            {card.companyName && (
              <div className="text-white/70 text-xs">{card.companyName}</div>
            )}
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${card.vestedPercent}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-purple-400"
              />
            </div>
            <div className="text-[10px] text-white/50">
              {card.vestedPercent.toFixed(1)}% vested
            </div>
          </div>
        )}

        {/* Bottom row */}
        <div className="flex items-end justify-between">
          <div className={`font-mono ${size === "lg" ? "text-xs" : "text-[10px]"} text-white/40`}>
            {shortAddr}
          </div>
          {card.claimsCount !== undefined && card.claimsCount > 0 && (
            <span className="text-[10px] text-blue-400 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {card.claimsCount} credential{card.claimsCount !== 1 ? "s" : ""}
            </span>
          )}
          <ExternalLink className="w-3 h-3 text-white/20" />
        </div>
      </div>
    </motion.div>
  );
}
