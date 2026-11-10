import { useState, useEffect, useCallback, useRef } from "react";
import { NETWORK_NAME } from "../contract-config";
import Link from "../Link";
import { pollContract, shortAddr, formatCountdown, friendlyError } from "../lib";

export default function PollView({ address, wallet }) {
  const { account, hasWallet, wrongNetwork, connect, switchNetwork, getSigner } = wallet;

  const [poll, setPoll] = useState(null); // { title, candidates: [{ name, votes }] }
  const [creator, setCreator] = useState(null);
  const [endsAt, setEndsAt] = useState(null); // ms timestamp
  const [now, setNow] = useState(Date.now());
  const [loadError, setLoadError] = useState("");
  const [hasVoted, setHasVoted] = useState(false);
  const [selected, setSelected] = useState(null);
  const [peek, setPeek] = useState(false);
  const [status, setStatus] = useState({ kind: "idle", message: "" });
  const [copied, setCopied] = useState(false);
  const creatorFetched = useRef(false);

  const load = useCallback(async () => {
    try {
      const c = pollContract(address);
      const [title, [names, counts], remaining] = await Promise.all([
        c.pollTitle(),
        c.getAllCandidates(),
        c.timeRemaining(),
      ]);
      setPoll({ title, candidates: names.map((name, i) => ({ name, votes: Number(counts[i]) })) });
      setEndsAt(Date.now() + Number(remaining) * 1000);
      setLoadError("");

      if (!creatorFetched.current) {
        creatorFetched.current = true;
        try {
          setCreator(await c.creator());
        } catch {
          /* the original single-poll contract has no creator() */
        }
      }
      setHasVoted(account ? await c.hasVoted(account) : false);
    } catch (err) {
      console.error(err);
      setLoadError("Couldn't load this poll. Check the link and try again.");
    }
  }, [address, account]);

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function castVote() {
    if (selected === null) return;
    try {
      setStatus({ kind: "pending", message: "Confirm the transaction in your wallet…" });
      const signer = await getSigner();
      const tx = await pollContract(address, signer).vote(selected);
      setStatus({ kind: "pending", message: "Waiting for the transaction to be confirmed…" });
      await tx.wait();
      setStatus({ kind: "success", message: "Your vote is on-chain." });
      setHasVoted(true);
      await load();
    } catch (err) {
      console.error(err);
      setStatus({ kind: "error", message: friendlyError(err) });
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", window.location.href);
    }
  }

  if (loadError && !poll) {
    return (
      <div className="ballot-body">
        <p className="status status-error">{loadError}</p>
        <Link className="btn-secondary btn-link" to="/">
          ← All polls
        </Link>
      </div>
    );
  }

  const timeLeft = endsAt === null ? null : Math.max(0, Math.floor((endsAt - now) / 1000));
  const votingOpen = timeLeft !== null && timeLeft > 0;
  const candidates = poll?.candidates ?? [];
  const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
  const showResults = hasVoted || !votingOpen || peek;
  const topVotes = Math.max(0, ...candidates.map((c) => c.votes));
  const canPick = votingOpen && !hasVoted;

  return (
    <div className="ballot-body">
      <p className="eyebrow">Official Ballot</p>
      <h1 className="title">{poll ? poll.title : "—"}</h1>
      <p className={`countdown ${votingOpen ? "" : "closed"}`}>
        {timeLeft === null ? "Loading…" : formatCountdown(timeLeft)}
        {creator ? ` · by ${shortAddr(creator)}` : ""}
      </p>

      <ul className="candidate-list">
        {candidates.map((c, i) => (
          <li key={i}>
            <button
              className="candidate-row"
              data-selected={selected === i}
              data-disabled={!canPick}
              disabled={!canPick}
              onClick={() => setSelected(i)}
            >
              <span className="bubble" data-filled={selected === i} />
              <span className="candidate-name">{c.name}</span>
              {showResults && (
                <span className="candidate-votes mono">
                  {c.votes} vote{c.votes === 1 ? "" : "s"}
                </span>
              )}
            </button>
            {showResults && totalVotes > 0 && (
              <div className="bar-track">
                <div
                  className="bar-fill"
                  data-leader={c.votes === topVotes && topVotes > 0}
                  style={{ width: `${(c.votes / totalVotes) * 100}%` }}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      {canPick &&
        (!account ? (
          <button className="btn-cast" onClick={connect}>
            {hasWallet ? "Connect wallet to vote" : "Wallet needed to vote"}
          </button>
        ) : wrongNetwork ? (
          <button className="btn-cast" onClick={switchNetwork}>
            Switch to {NETWORK_NAME}
          </button>
        ) : (
          <button className="btn-cast" disabled={selected === null || status.kind === "pending"} onClick={castVote}>
            {status.kind === "pending" ? "Casting…" : "Cast Vote"}
          </button>
        ))}

      {canPick && !showResults && (
        <button className="link-btn peek" onClick={() => setPeek(true)}>
          View results without voting
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

      <div className="poll-actions">
        <Link className="link-btn" to="/">
          ← All polls
        </Link>
        <button className="link-btn" onClick={copyLink}>
          {copied ? "Link copied" : "Copy link to share"}
        </button>
      </div>

      <p className="poll-total mono">
        {totalVotes} total vote{totalVotes === 1 ? "" : "s"} cast
      </p>
    </div>
  );
}
