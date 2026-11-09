import { useState } from "react";
import { FACTORY_ADDRESS, NETWORK_NAME } from "../contract-config";
import { factoryContract, byteLength, friendlyError } from "../lib";

// These limits mirror the checks inside Poll.sol.
const MAX_TITLE_BYTES = 200;
const MAX_OPTION_BYTES = 100;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 20;
const MIN_SECONDS = 60;
const MAX_SECONDS = 365 * 24 * 60 * 60;
const UNIT_SECONDS = { minutes: 60, hours: 3600, days: 86400 };
const PRESETS = [
  { label: "1 hour", value: "1", unit: "hours" },
  { label: "1 day", value: "1", unit: "days" },
  { label: "3 days", value: "3", unit: "days" },
  { label: "7 days", value: "7", unit: "days" },
];

function validate(title, options, seconds) {
  const cleanTitle = title.trim();
  if (!cleanTitle) return "Enter a question for your poll.";
  if (byteLength(cleanTitle) > MAX_TITLE_BYTES) return "That question is too long. Please shorten it.";

  const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
  if (cleanOptions.length < MIN_OPTIONS) return "Add at least two options.";
  if (cleanOptions.some((o) => byteLength(o) > MAX_OPTION_BYTES)) return "One of your options is too long.";
  const lower = cleanOptions.map((o) => o.toLowerCase());
  if (new Set(lower).size !== lower.length) return "Each option must be different.";

  if (!Number.isFinite(seconds) || seconds < MIN_SECONDS) return "Voting must stay open for at least 1 minute.";
  if (seconds > MAX_SECONDS) return "Voting can stay open for 365 days at most.";
  return "";
}

export default function CreatePoll({ wallet }) {
  const { account, hasWallet, wrongNetwork, connect, switchNetwork, getSigner } = wallet;
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [durValue, setDurValue] = useState("3");
  const [durUnit, setDurUnit] = useState("days");
  const [status, setStatus] = useState({ kind: "idle", message: "" });

  const seconds = Math.floor(Number(durValue) * UNIT_SECONDS[durUnit]);
  const problem = validate(title, options, seconds);
  const busy = status.kind === "pending";

  function setOption(i, value) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  }

  async function submit(e) {
    e.preventDefault();
    if (problem || busy) return;
    try {
      setStatus({ kind: "pending", message: "Confirm the transaction in your wallet…" });
      const signer = await getSigner();
      const factory = factoryContract(signer);
      const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
      const tx = await factory.createPoll(title.trim(), cleanOptions, seconds);
      setStatus({ kind: "pending", message: "Creating your poll on-chain. This can take a few seconds…" });
      const receipt = await tx.wait();

      let pollAddress = null;
      for (const log of receipt.logs) {
        try {
          const parsed = factory.interface.parseLog(log);
          if (parsed?.name === "PollCreated") {
            pollAddress = parsed.args.pollAddress;
            break;
          }
        } catch {
          /* not a factory event */
        }
      }
      window.location.hash = pollAddress ? `#/poll/${pollAddress}` : "#/";
    } catch (err) {
      console.error(err);
      setStatus({ kind: "error", message: friendlyError(err) });
    }
  }

  return (
    <div className="ballot-body">
      <p className="eyebrow">New Ballot</p>
      <h1 className="title">Create a poll</h1>

      {!FACTORY_ADDRESS && (
        <p className="status status-error">Poll creation isn&apos;t switched on yet — the factory contract hasn&apos;t been deployed.</p>
      )}

      <form onSubmit={submit} noValidate>
        <div className="form-field">
          <label className="form-label" htmlFor="poll-title">
            Question
          </label>
          <input
            id="poll-title"
            className="input"
            value={title}
            maxLength={120}
            placeholder="e.g. Which city should host the next meetup?"
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
          />
        </div>

        <div className="form-field">
          <span className="form-label">Options</span>
          {options.map((opt, i) => (
            <div className="option-row" key={i}>
              <input
                className="input"
                aria-label={`Option ${i + 1}`}
                value={opt}
                maxLength={60}
                placeholder={`Option ${i + 1}`}
                onChange={(e) => setOption(i, e.target.value)}
                disabled={busy}
              />
              {options.length > MIN_OPTIONS && (
                <button
                  type="button"
                  className="btn-ghost"
                  aria-label={`Remove option ${i + 1}`}
                  onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                  disabled={busy}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {options.length < MAX_OPTIONS && (
            <button type="button" className="btn-secondary" onClick={() => setOptions((p) => [...p, ""])} disabled={busy}>
              + Add option
            </button>
          )}
        </div>

        <div className="form-field">
          <span className="form-label">Voting stays open for</span>
          <div className="option-row">
            <input
              className="input input-narrow"
              type="number"
              min="1"
              step="any"
              aria-label="Duration"
              value={durValue}
              onChange={(e) => setDurValue(e.target.value)}
              disabled={busy}
            />
            <select
              className="input input-narrow"
              aria-label="Duration unit"
              value={durUnit}
              onChange={(e) => setDurUnit(e.target.value)}
              disabled={busy}
            >
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
              <option value="days">days</option>
            </select>
          </div>
          <div className="preset-row">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="chip chip-button"
                onClick={() => {
                  setDurValue(p.value);
                  setDurUnit(p.unit);
                }}
                disabled={busy}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {problem && (title || options.some(Boolean)) && <p className="hint hint-left">{problem}</p>}

        {!account ? (
          <button type="button" className="btn-cast" onClick={connect}>
            {hasWallet ? "Connect wallet to create" : "Wallet needed to create a poll"}
          </button>
        ) : wrongNetwork ? (
          <button type="button" className="btn-cast" onClick={switchNetwork}>
            Switch to {NETWORK_NAME}
          </button>
        ) : (
          <button type="submit" className="btn-cast" disabled={Boolean(problem) || busy || !FACTORY_ADDRESS}>
            {busy ? "Creating…" : "Create poll"}
          </button>
        )}

        {status.message && <p className={`status status-${status.kind}`}>{status.message}</p>}
        <p className="hint">
          Creating a poll costs a small amount of {NETWORK_NAME} test ETH in gas. Voting is one vote per wallet address.
        </p>
      </form>
    </div>
  );
}
