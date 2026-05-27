import { arbitrumSepolia } from "viem/chains";
import { defineChain } from "viem";

export { arbitrumSepolia };

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

export const CHAIN_NAMES: Record<number, string> = {
  [arbitrumSepolia.id]: "Arbitrum Sepolia",
  [robinhoodTestnet.id]: "Robinhood Chain Testnet",
};

export const EXPLORER_URLS: Record<number, string> = {
  [arbitrumSepolia.id]: "https://sepolia.arbiscan.io",
  [robinhoodTestnet.id]: "https://explorer.testnet.chain.robinhood.com",
};

export function txUrl(chainId: number, hash: string) {
  return `${EXPLORER_URLS[chainId]}/tx/${hash}`;
}

export function addressUrl(chainId: number, address: string) {
  return `${EXPLORER_URLS[chainId]}/address/${address}`;
}
