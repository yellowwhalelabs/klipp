"use client";

import dynamic from "next/dynamic";

// Onboarding depends on wagmi/Privy browser context (WagmiProvider) and must
// never be server-rendered or prerendered at build time — wagmi hooks throw
// "useConfig must be used within WagmiProvider" with no browser provider tree.
// Loading it client-only (ssr: false) guarantees it renders only in the browser.
const OnboardClient = dynamic(() => import("./OnboardClient"), {
  ssr: false,
});

export default function OnboardPage() {
  return <OnboardClient />;
}
