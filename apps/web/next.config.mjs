/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suppress the viem/ox virtualMasterPool dynamic require warning
  // These are optional modules from wallet SDKs not needed for our use case
  webpack: (config, { isServer }) => {
    // Stub out optional wallet connector modules that aren't installed
    config.resolve.fallback = {
      ...config.resolve.fallback,
      // Farcaster Solana connector (optional Privy add-on)
      "@farcaster/mini-app-solana": false,
      // MetaMask EVM connector (optional wagmi add-on)
      "@metamask/connect-evm": false,
      // Tempo internal accounts module
      accounts: false,
      // Node.js built-ins not needed in browser
      fs: false,
      net: false,
      tls: false,
    };

    // Suppress the "Critical dependency: the request of a dependency is an expression"
    // warning from viem/ox virtualMasterPool — it's a false positive for our use case
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      /Critical dependency: the request of a dependency is an expression/,
    ];

    return config;
  },

  // Transpile Privy and wagmi packages
  transpilePackages: ["@privy-io/react-auth", "@privy-io/wagmi"],

  // Required for Privy to work with strict mode
  reactStrictMode: true,

  // Image domains for avatar loading
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
