// Address of the deployed PollFactory (set after running scripts/deployFactory.js).
// A VITE_FACTORY_ADDRESS env var, if present, overrides this default.
const DEPLOYED_FACTORY_ADDRESS = "";
export const FACTORY_ADDRESS = import.meta.env.VITE_FACTORY_ADDRESS || DEPLOYED_FACTORY_ADDRESS;

// The original single-poll contract ("Best Language 2026"). Its voting window
// has closed, but it stays readable on-chain, so it is listed as an archive.
export const LEGACY_POLL_ADDRESS = "0xED356DBd900e554658ab43E08a6f288406d5288f";

// Sepolia testnet. Update all of these together if you deploy elsewhere.
export const EXPECTED_CHAIN_ID = 11155111;
export const EXPECTED_CHAIN_ID_HEX = "0xaa36a7";
export const NETWORK_NAME = "Sepolia";
export const EXPLORER_URL = "https://sepolia.etherscan.io";

// Public, no-API-key RPC used for read-only calls so polls are visible to
// anyone visiting the page, even without a wallet installed.
export const PUBLIC_RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";
