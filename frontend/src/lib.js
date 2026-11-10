import { JsonRpcProvider, Contract } from "ethers";
import POLL_ABI from "./poll-abi.json";
import FACTORY_ABI from "./factory-abi.json";
import { PUBLIC_RPC_URL, EXPECTED_CHAIN_ID, FACTORY_ADDRESS } from "./contract-config";

// One shared read-only provider. Reading polls never needs a wallet.
let provider;
export function readProvider() {
  if (!provider) {
    provider = new JsonRpcProvider(PUBLIC_RPC_URL, EXPECTED_CHAIN_ID, { staticNetwork: true });
  }
  return provider;
}

export function pollContract(address, runner) {
  return new Contract(address, POLL_ABI, runner || readProvider());
}

export function factoryContract(runner) {
  return new Contract(FACTORY_ADDRESS, FACTORY_ABI, runner || readProvider());
}

export function shortAddr(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

export function formatCountdown(seconds) {
  if (seconds <= 0) return "Voting closed";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h remaining`;
  if (h > 0) return `${h}h ${m}m remaining`;
  if (m > 0) return `${m}m ${s}s remaining`;
  return `${s}s remaining`;
}

// Solidity checks string length in bytes, so the form does too.
export function byteLength(str) {
  return new TextEncoder().encode(str).length;
}

export function friendlyError(err) {
  if (err?.code === "ACTION_REJECTED" || err?.code === 4001) {
    return "You cancelled the request in your wallet.";
  }
  return err?.reason || err?.shortMessage || "Transaction failed.";
}

// ---- Path routing (History API) ----
export function navigate(path, { replace = false } = {}) {
  if (replace) window.history.replaceState(null, "", path);
  else window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
