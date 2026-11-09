import { useState, useEffect, useCallback } from "react";
import { BrowserProvider } from "ethers";
import { EXPECTED_CHAIN_ID_HEX, NETWORK_NAME, PUBLIC_RPC_URL, EXPLORER_URL } from "./contract-config";

const SEPOLIA_PARAMS = {
  chainId: EXPECTED_CHAIN_ID_HEX,
  chainName: NETWORK_NAME,
  nativeCurrency: { name: "Sepolia Ether", symbol: "SepoliaETH", decimals: 18 },
  rpcUrls: [PUBLIC_RPC_URL],
  blockExplorerUrls: [EXPLORER_URL],
};

export const NO_WALLET_MESSAGE =
  "No wallet found. On mobile, open this link inside your wallet app's built-in browser to continue. You can still browse polls and results without a wallet.";

/** Injected-wallet connection (MetaMask and compatible). Reads never need this. */
export function useWallet() {
  const hasWallet = typeof window !== "undefined" && Boolean(window.ethereum);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasWallet) return undefined;
    const eth = window.ethereum;
    let cancelled = false;

    // Passive checks: these never open a wallet popup.
    eth
      .request({ method: "eth_accounts" })
      .then((a) => !cancelled && setAccount(a[0] || null))
      .catch(() => {});
    eth
      .request({ method: "eth_chainId" })
      .then((c) => !cancelled && setChainId(c))
      .catch(() => {});

    const onAccounts = (a) => setAccount(a[0] || null);
    const onChain = (c) => setChainId(c);
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => {
      cancelled = true;
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, [hasWallet]);

  const connect = useCallback(async () => {
    if (!hasWallet) {
      setError(NO_WALLET_MESSAGE);
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0] || null);
      setChainId(await window.ethereum.request({ method: "eth_chainId" }));
      setError("");
    } catch (err) {
      console.error(err);
      setError("Wallet connection was declined.");
    }
  }, [hasWallet]);

  // Switches to Sepolia, and adds it to the wallet first if the wallet doesn't
  // list it yet (no digging through wallet menus).
  const switchNetwork = useCallback(async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: EXPECTED_CHAIN_ID_HEX }],
      });
      setError("");
    } catch (err) {
      const unknownChain = err?.code === 4902 || /unrecognized chain/i.test(err?.message || "");
      if (unknownChain) {
        try {
          await window.ethereum.request({ method: "wallet_addEthereumChain", params: [SEPOLIA_PARAMS] });
          setError("");
          return;
        } catch (addErr) {
          console.error(addErr);
        }
      }
      setError(`Couldn't switch to ${NETWORK_NAME}. Please switch networks in your wallet.`);
    }
  }, []);

  const getSigner = useCallback(async () => {
    const provider = new BrowserProvider(window.ethereum);
    return provider.getSigner();
  }, []);

  const wrongNetwork = Boolean(account && chainId && chainId.toLowerCase() !== EXPECTED_CHAIN_ID_HEX);

  return { hasWallet, account, chainId, wrongNetwork, error, setError, connect, switchNetwork, getSigner };
}
