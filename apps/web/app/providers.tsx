"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { arbitrumSepolia } from "viem/chains";
import { http } from "viem";
import { defineChain } from "viem";

// Robinhood Chain Testnet — Chain ID 46630
export const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_ROBINHOOD_RPC ||
          "https://rpc.testnet.chain.robinhood.com",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://explorer.testnet.chain.robinhood.com",
    },
  },
  testnet: true,
});

const wagmiConfig = createConfig({
  chains: [arbitrumSepolia, robinhoodTestnet],
  transports: {
    [arbitrumSepolia.id]: http(),
    [robinhoodTestnet.id]: http(
      process.env.NEXT_PUBLIC_ROBINHOOD_RPC ||
        "https://rpc.testnet.chain.robinhood.com"
    ),
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5 }, // 5 min
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!privyAppId) {
    // Graceful fallback during development before Privy is configured
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        // Email + passkey require no external OAuth app setup, so they work
        // immediately. Google/Apple/Discord each need their own OAuth app
        // configured in the Privy dashboard — re-add them once that's done.
        loginMethods: ["email", "passkey"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        appearance: {
          theme: "dark",
          accentColor: "#FFD700",
          logo: "/klipp-logo.svg",
          walletList: ["detected_wallets", "metamask"],
        },
        defaultChain: arbitrumSepolia,
        supportedChains: [arbitrumSepolia, robinhoodTestnet],
      }}
    >
      {/*
        Smart wallets (ERC-4337) turn each user's embedded wallet into an account
        that can use a paymaster, so mints are gasless. The smart-wallet
        implementation (Alchemy) and its bundler + Gas Manager paymaster URL —
        which embeds the Alchemy API key — are configured in the PRIVY DASHBOARD
        (Smart Wallets settings). Here we only pass the Gas Manager policy id as
        the paymaster context so Alchemy sponsors the UserOperation; if the env
        var is unset, Privy falls back to the policy configured in the dashboard.
      */}
      <SmartWalletsProvider
        config={{
          paymasterContext: {
            policyId: process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID,
          },
        }}
      >
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            {children}
          </WagmiProvider>
        </QueryClientProvider>
      </SmartWalletsProvider>
    </PrivyProvider>
  );
}
