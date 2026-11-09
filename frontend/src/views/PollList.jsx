import { useState, useEffect, useCallback } from "react";
import { FACTORY_ADDRESS, LEGACY_POLL_ADDRESS } from "../contract-config";
import { factoryContract, pollContract, shortAddr, formatCountdown } from "../lib";

const PAGE_SIZE = 10;

function StatusChip({ timeLeft }) {
  if (timeLeft === null) return <span className="chip">…</span>;
  return timeLeft > 0 ? (
    <span className="chip chip-open">Open · {formatCountdown(timeLeft).replace(" remaining", "")}</span>
  ) : (
    <span className="chip chip-closed">Closed</span>
  );
}

function PollRow({ poll }) {
  return (
    <li>
      <a className="poll-item" href={`#/poll/${poll.address}`}>
        <span className="poll-item-main">
          <span className="poll-item-title">{poll.title}</span>
          <span className="poll-meta mono">
            {poll.creator ? `by ${shortAddr(poll.creator)}` : "original poll"}
            {poll.createdAt ? ` · ${new Date(poll.createdAt * 1000).toLocaleDateString()}` : ""}
          </span>
        </span>
        <StatusChip timeLeft={poll.timeLeft} />
      </a>
    </li>
  );
}

async function withStatus(poll) {
  try {
    const remaining = await pollContract(poll.address).timeRemaining();
    return { ...poll, timeLeft: Number(remaining) };
  } catch {
    return { ...poll, timeLeft: null };
  }
}

export default function PollList() {
  const [polls, setPolls] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(Boolean(FACTORY_ADDRESS));
  const [error, setError] = useState("");
  const [legacy, setLegacy] = useState(null);

  const loadPage = useCallback(async (offset) => {
    setLoading(true);
    try {
      const factory = factoryContract();
      const [count, page] = await Promise.all([factory.pollCount(), factory.getPolls(offset, PAGE_SIZE)]);
      const rows = await Promise.all(
        page.map((p) =>
          withStatus({
            address: p.pollAddress,
            creator: p.creator,
            title: p.title,
            createdAt: Number(p.createdAt),
          })
        )
      );
      setTotal(Number(count));
      setPolls((prev) => (offset === 0 ? rows : [...prev, ...rows]));
      setError("");
    } catch (err) {
      console.error(err);
      setError("Couldn't load polls. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (FACTORY_ADDRESS) loadPage(0);
  }, [loadPage]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const title = await pollContract(LEGACY_POLL_ADDRESS).pollTitle();
        const row = await withStatus({ address: LEGACY_POLL_ADDRESS, title });
        if (!cancelled) setLegacy(row);
      } catch {
        /* the archive row is optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="ballot-body">
      <p className="eyebrow">Open Ballots</p>
      <h1 className="title">All polls</h1>
      <p className="lede">
        Anyone can start a poll and share its link. Every vote is recorded on the Sepolia test network.
      </p>

      <a className="btn-cast btn-link" href="#/create">
        Create a poll
      </a>

      {!FACTORY_ADDRESS && (
        <p className="hint">Poll creation isn&apos;t switched on yet — the factory contract hasn&apos;t been deployed.</p>
      )}

      {FACTORY_ADDRESS && (
        <>
          {polls.length === 0 && !loading && !error && (
            <p className="empty">No polls yet. Be the first to create one.</p>
          )}
          <ul className="poll-list">
            {polls.map((p) => (
              <PollRow key={p.address} poll={p} />
            ))}
          </ul>
          {error && <p className="status status-error">{error}</p>}
          {loading && <p className="hint">Loading polls…</p>}
          {!loading && polls.length < total && (
            <button className="btn-secondary" onClick={() => loadPage(polls.length)}>
              Show older polls
            </button>
          )}
        </>
      )}

      {legacy && (
        <>
          <p className="section-title">Original poll</p>
          <ul className="poll-list">
            <PollRow poll={legacy} />
          </ul>
        </>
      )}
    </div>
  );
}
