"use client";

import { PrivyProvider } from "@privy-io/react-auth";
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
        loginMethods: ["email", "google", "apple", "passkey"],
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
          requireUserPasswordOnCreate: false,
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
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
