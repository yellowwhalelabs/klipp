// Contract addresses — updated after each deployment
// Source of truth: /deployments/sepolia.json and /deployments/robinhood-testnet.json

export const CONTRACTS = {
  // Arbitrum Sepolia (Chain ID: 421614)
  SOULBOUND_CARD: (process.env.NEXT_PUBLIC_SOULBOUND_CARD_ADDRESS ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`,

  PRO_CARD: (process.env.NEXT_PUBLIC_PRO_CARD_ADDRESS ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`,

  // Robinhood Chain Testnet (Chain ID: 46630)
  EQUITY_TOKEN_FACTORY: (process.env.NEXT_PUBLIC_EQUITY_FACTORY_ADDRESS ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`,

  DEMO_CAP_TABLE: (process.env.NEXT_PUBLIC_DEMO_CAP_TABLE_ADDRESS ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`,

  DEMO_EQUITY_TOKEN: (process.env.NEXT_PUBLIC_DEMO_EQUITY_TOKEN_ADDRESS ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`,

  VESTING: (process.env.NEXT_PUBLIC_VESTING_ADDRESS ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
} as const;

// Minimal ABIs — enough for frontend interactions
export const SOULBOUND_CARD_ABI = [
  {
    name: "mint",
    type: "function",
    inputs: [{ name: "metadataURI", type: "string" }],
    outputs: [{ name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    name: "updateMetadata",
    type: "function",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "newURI", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "cardOf",
    type: "function",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "tokenId", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "hasCard",
    type: "function",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    name: "tokenURI",
    type: "function",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    name: "totalSupply",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "CardMinted",
    type: "event",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "metadataURI", type: "string", indexed: false },
    ],
  },
] as const;

export const CAP_TABLE_ABI = [
  {
    name: "issueGrant",
    type: "function",
    inputs: [
      { name: "holder", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "vestingStart", type: "uint64" },
      { name: "cliffSeconds", type: "uint64" },
      { name: "durationSeconds", type: "uint64" },
    ],
    outputs: [{ name: "grantId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    name: "claimVested",
    type: "function",
    inputs: [{ name: "grantId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "vestingPreview",
    type: "function",
    inputs: [{ name: "grantId", type: "uint256" }],
    outputs: [
      { name: "vested", type: "uint256" },
      { name: "claimed", type: "uint256" },
      { name: "claimable", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    name: "getHolderGrants",
    type: "function",
    inputs: [{ name: "holder", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    name: "getGrant",
    type: "function",
    inputs: [{ name: "grantId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "holder", type: "address" },
          { name: "totalAmount", type: "uint256" },
          { name: "claimed", type: "uint256" },
          { name: "vestingStart", type: "uint64" },
          { name: "cliffSeconds", type: "uint64" },
          { name: "durationSeconds", type: "uint64" },
          { name: "active", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
] as const;
