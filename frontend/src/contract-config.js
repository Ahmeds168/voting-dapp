// Deployed Sepolia contract address (set after running scripts/deploy.js).
// A VITE_CONTRACT_ADDRESS env var, if present, overrides this default.
const DEPLOYED_ADDRESS = "0xED356DBd900e554658ab43E08a6f288406d5288f";

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || DEPLOYED_ADDRESS;

// Sepolia testnet chain ID. Update if you deploy elsewhere.
export const EXPECTED_CHAIN_ID = 11155111n;
export const EXPECTED_CHAIN_ID_HEX = "0xaa36a7";
export const NETWORK_NAME = "Sepolia";
