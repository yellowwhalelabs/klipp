// Seed demo vesting grants on a deployed KLIPPVesting (Stylus) contract.
// Run via the GitHub Actions "Seed demo grants" workflow, which provides the
// deployer key + target via env. The key is read from process.env only — it is
// never placed on a command line / argv.
//
// Env: DEPLOYER_PRIVATE_KEY, RPC_URL, CHAIN_ID, CONTRACT
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  formatUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const { DEPLOYER_PRIVATE_KEY, RPC_URL, CHAIN_ID, CONTRACT } = process.env;
if (!DEPLOYER_PRIVATE_KEY || !RPC_URL || !CHAIN_ID || !CONTRACT) {
  throw new Error("Missing DEPLOYER_PRIVATE_KEY / RPC_URL / CHAIN_ID / CONTRACT");
}

const account = privateKeyToAccount(
  DEPLOYER_PRIVATE_KEY.startsWith("0x") ? DEPLOYER_PRIVATE_KEY : `0x${DEPLOYER_PRIVATE_KEY}`
);

const chain = defineChain({
  id: Number(CHAIN_ID),
  name: `chain-${CHAIN_ID}`,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const wallet = createWalletClient({ account, chain, transport: http(RPC_URL) });
const pub = createPublicClient({ chain, transport: http(RPC_URL) });

const ABI = [
  { name: "initialize", type: "function", inputs: [], outputs: [], stateMutability: "nonpayable" },
  {
    name: "createGrant",
    type: "function",
    inputs: [
      { name: "grantId", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "totalAmount", type: "uint256" },
      { name: "startTime", type: "uint64" },
      { name: "cliffSeconds", type: "uint64" },
      { name: "durationSeconds", type: "uint64" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "getGrant",
    type: "function",
    inputs: [{ name: "grantId", type: "uint256" }],
    outputs: [
      { name: "beneficiary", type: "address" },
      { name: "total", type: "uint256" },
      { name: "start", type: "uint256" },
      { name: "cliff", type: "uint256" },
      { name: "duration", type: "uint256" },
      { name: "claimed", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    name: "vestedAmount",
    type: "function",
    inputs: [
      { name: "grantId", type: "uint256" },
      { name: "currentTime", type: "uint64" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
];

const E18 = 10n ** 18n;
const YEAR = 31_536_000;          // 365d
const DURATION = 126_144_000;     // 4 years
const CLIFF_6MO = 15_552_000;     // 180d
const NOW = Math.floor(Date.now() / 1000);
const BENEFICIARY = "0xadD4B90a6cDc08A3062527b1652F2B2A3Df47Dee";
const DEPLOYER = account.address;

// [grantId, beneficiary, total, start, cliff, duration, expected]
const GRANTS = [
  [1n, BENEFICIARY, 1_000_000n * E18, BigInt(NOW - YEAR),          BigInt(CLIFF_6MO), BigInt(DURATION), "~25% vested (cliff passed, linear)"],
  [2n, BENEFICIARY,   500_000n * E18, BigInt(NOW - 7_776_000),     BigInt(CLIFF_6MO), BigInt(DURATION), "pre-cliff (0 claimable)"],
  [3n, DEPLOYER,    2_000_000n * E18, BigInt(NOW - 157_680_000),   BigInt(CLIFF_6MO), BigInt(DURATION), "fully vested"],
];

async function send(label, fn, args) {
  console.log(`→ ${label}`);
  const hash = await wallet.writeContract({ address: CONTRACT, abi: ABI, functionName: fn, args });
  const r = await pub.waitForTransactionReceipt({ hash });
  console.log(`  ${label}: tx ${hash} (block ${r.blockNumber}, status ${r.status})`);
  if (r.status !== "success") throw new Error(`${label} reverted`);
}

console.log(`Seeding ${CONTRACT} on chain ${CHAIN_ID} as ${DEPLOYER}`);

// 1) initialize() — sets owner = deployer (required before createGrant).
try {
  await send("initialize()", "initialize", []);
} catch (e) {
  console.log(`  initialize note: ${e.shortMessage || e.message} (continuing — may already be owned)`);
}

// 2) createGrant for each demo grant.
for (const [id, ben, total, start, cliff, dur] of GRANTS) {
  await send(`createGrant(${id})`, "createGrant", [id, ben, total, start, cliff, dur]);
}

// 3) verify
console.log("\n=== verification (getGrant + vestedAmount @ now) ===");
for (const [id, , , , , , expected] of GRANTS) {
  const g = await pub.readContract({ address: CONTRACT, abi: ABI, functionName: "getGrant", args: [id] });
  const vested = await pub.readContract({ address: CONTRACT, abi: ABI, functionName: "vestedAmount", args: [id, BigInt(NOW)] });
  const total = g[1];
  const pct = total > 0n ? (Number((vested * 10000n) / total) / 100).toFixed(1) : "0";
  console.log(
    `grant ${id}: total=${formatUnits(total, 18)} vested=${formatUnits(vested, 18)} (${pct}%)  [${expected}]`
  );
}
console.log("\n✅ seeding complete");
