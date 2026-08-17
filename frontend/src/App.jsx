import { useState, useEffect, useCallback } from "react";
import { BrowserProvider, Contract } from "ethers";
import VOTING_ABI from "./contract-abi.json";
import { CONTRACT_ADDRESS, EXPECTED_CHAIN_ID_HEX, NETWORK_NAME } from "./contract-config";
import "./App.css";

function shortAddr(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

function formatCountdown(seconds) {
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

export default function App() {
  const [account, setAccount] = useState(null);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [pollTitle, setPollTitle] = useState("");
  const [candidates, setCandidates] = useState([]); // [{name, votes}]
  const [hasVoted, setHasVoted] = useState(false);
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [status, setStatus] = useState({ kind: "idle", message: "" });
  const [totalVotes, setTotalVotes] = useState(0);

  const missingAddress = !CONTRACT_ADDRESS;

  const getReadContract = useCallback(async () => {
    if (!window.ethereum) return null;
    const provider = new BrowserProvider(window.ethereum);
    return new Contract(CONTRACT_ADDRESS, VOTING_ABI, provider);
  }, []);

  const loadPollData = useCallback(async () => {
    if (missingAddress || !window.ethereum) return;
    try {
      const contract = await getReadContract();
      if (!contract) return;
      const [title, [names, counts], remaining] = await Promise.all([
        contract.pollTitle(),
        contract.getAllCandidates(),
        contract.timeRemaining(),
      ]);
      const rows = names.map((name, i) => ({ name, votes: Number(counts[i]) }));
      setPollTitle(title);
      setCandidates(rows);
      setTimeLeft(Number(remaining));
      setTotalVotes(rows.reduce((sum, c) => sum + c.votes, 0));

      if (account) {
        const voted = await contract.hasVoted(account);
        setHasVoted(voted);
      }
    } catch (err) {
      console.error(err);
      setStatus({ kind: "error", message: "Couldn't load poll data. Check the contract address and network." });
    }
  }, [account, getReadContract, missingAddress]);

  useEffect(() => {
    loadPollData();
    const interval = setInterval(loadPollData, 8000);
    return () => clearInterval(interval);
  }, [loadPollData]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  async function connectWallet() {
    if (!window.ethereum) {
      setStatus({ kind: "error", message: "No wallet found. Install MetaMask to vote." });
      return;
    }
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      setAccount(accounts[0]);
      setWrongNetwork(`0x${network.chainId.toString(16)}` !== EXPECTED_CHAIN_ID_HEX);
      setStatus({ kind: "idle", message: "" });
    } catch (err) {
      console.error(err);
      setStatus({ kind: "error", message: "Wallet connection was declined." });
    }
  }

  async function switchNetwork() {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: EXPECTED_CHAIN_ID_HEX }],
      });
      setWrongNetwork(false);
    } catch (err) {
      console.error(err);
      setStatus({ kind: "error", message: `Please switch your wallet to ${NETWORK_NAME} manually.` });
    }
  }

  async function castVote() {
    if (selected === null) return;
    try {
      setStatus({ kind: "pending", message: "Confirm the transaction in your wallet…" });
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, VOTING_ABI, signer);
      const tx = await contract.vote(selected);
      setStatus({ kind: "pending", message: "Waiting for the transaction to be mined…" });
      await tx.wait();
      setStatus({ kind: "success", message: "Your vote is on-chain." });
      setHasVoted(true);
      await loadPollData();
    } catch (err) {
      console.error(err);
      const reason = err?.reason || err?.shortMessage || "Transaction failed.";
      setStatus({ kind: "error", message: reason });
    }
  }

  const votingOpen = timeLeft !== null && timeLeft > 0;
  const leader = candidates.reduce(
    (max, c) => (c.votes > (max?.votes ?? -1) ? c : max),
    null
  );

  return (
    <div className="page">
      <div className="ballot">
        <header className="ballot-head">
          <div className="stub">
            <span className="stub-label">Voter</span>
            {account ? (
              <span className="stub-value mono">{shortAddr(account)}</span>
            ) : (
              <button className="btn-connect" onClick={connectWallet}>
                Connect Wallet
              </button>
            )}
          </div>
          <div className="stub-net">
            <span className="dot" data-ok={!wrongNetwork && !!account} />
            {account ? (wrongNetwork ? "Wrong network" : NETWORK_NAME) : "Not connected"}
          </div>
        </header>

        {wrongNetwork && (
          <div className="banner banner-warn">
            You're on the wrong network.{" "}
            <button className="link-btn" onClick={switchNetwork}>
              Switch to {NETWORK_NAME}
            </button>
          </div>
        )}

        {missingAddress && (
          <div className="banner banner-warn">
            No contract address configured. Set <code>VITE_CONTRACT_ADDRESS</code> in your{" "}
            <code>.env</code> file after deploying.
          </div>
        )}

        <div className="perforation" aria-hidden="true" />

        <main className="ballot-body">
          <p className="eyebrow">Official Ballot</p>
          <h1 className="title">{pollTitle || "—"}</h1>
          <p className={`countdown ${votingOpen ? "" : "closed"}`}>
            {timeLeft === null ? "Loading…" : formatCountdown(timeLeft)}
          </p>

          <ul className="candidate-list">
            {candidates.map((c, i) => (
              <li key={c.name}>
                <button
                  className="candidate-row"
                  data-selected={selected === i}
                  data-disabled={hasVoted || !votingOpen || !account}
                  disabled={hasVoted || !votingOpen || !account}
                  onClick={() => setSelected(i)}
                >
                  <span className="bubble" data-filled={selected === i} />
                  <span className="candidate-name">{c.name}</span>
                  {(hasVoted || !votingOpen) && (
                    <span className="candidate-votes mono">
                      {c.votes} vote{c.votes === 1 ? "" : "s"}
                    </span>
                  )}
                </button>
                {(hasVoted || !votingOpen) && totalVotes > 0 && (
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      data-leader={leader && c.name === leader.name}
                      style={{ width: `${(c.votes / totalVotes) * 100}%` }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>

          {!account && <p className="hint">Connect your wallet to cast a vote.</p>}

          {account && !hasVoted && votingOpen && (
            <button
              className="btn-cast"
              disabled={selected === null || status.kind === "pending"}
              onClick={castVote}
            >
              {status.kind === "pending" ? "Casting…" : "Cast Vote"}
            </button>
          )}

          {hasVoted && (
            <div className="stamp" aria-hidden="true">
              <span>
                Vote
                <br />
                Recorded
              </span>
            </div>
          )}

          {status.message && <p className={`status status-${status.kind}`}>{status.message}</p>}
        </main>

        <footer className="ballot-foot mono">
          {CONTRACT_ADDRESS ? (
            <a href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">
              {shortAddr(CONTRACT_ADDRESS)} ↗
            </a>
          ) : (
            "contract not configured"
          )}
          <span>
            {totalVotes} total vote{totalVotes === 1 ? "" : "s"} cast
          </span>
        </footer>
      </div>
    </div>
  );
}
