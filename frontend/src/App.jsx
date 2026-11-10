import { useState, useEffect } from "react";
import { isAddress } from "ethers";
import { useWallet } from "./useWallet";
import { shortAddr } from "./lib";
import Link from "./Link";
import { FACTORY_ADDRESS, NETWORK_NAME, EXPLORER_URL } from "./contract-config";
import PollList from "./views/PollList";
import CreatePoll from "./views/CreatePoll";
import PollView from "./views/PollView";
import "./App.css";

// Tiny path router: / (list), /create, /poll/<address>
// Old shared links used hashes (#/poll/0x…); redirect them to the matching path.
function upgradeLegacyHash() {
  const m = window.location.hash.match(/^#\/(.*)$/);
  if (m) window.history.replaceState(null, "", "/" + m[1]);
}

function parsePath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] === "create") return { name: "create" };
  if (parts[0] === "poll" && isAddress(parts[1] || "")) return { name: "poll", address: parts[1] };
  return { name: "list" };
}

export default function App() {
  const [route, setRoute] = useState(() => {
    upgradeLegacyHash();
    return parsePath();
  });
  const wallet = useWallet();
  const { account, wrongNetwork, error, connect, switchNetwork } = wallet;

  useEffect(() => {
    const onNav = () => {
      setRoute(parsePath());
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", onNav);
    return () => window.removeEventListener("popstate", onNav);
  }, []);

  return (
    <div className="page">
      <div className="ballot">
        <header className="ballot-head">
          <nav className="nav" aria-label="Main">
            <Link to="/" aria-current={route.name === "list" ? "page" : undefined}>
              Polls
            </Link>
            <Link to="/create" aria-current={route.name === "create" ? "page" : undefined}>
              Create poll
            </Link>
          </nav>
          <div className="stub">
            {account ? (
              <>
                <span className="stub-value mono">{shortAddr(account)}</span>
                <span className="stub-net">
                  <span className="dot" data-ok={!wrongNetwork} />
                  {wrongNetwork ? "Wrong network" : NETWORK_NAME}
                </span>
              </>
            ) : (
              <button className="btn-connect" onClick={connect}>
                Connect Wallet
              </button>
            )}
          </div>
        </header>

        {wrongNetwork && (
          <div className="banner banner-warn">
            Your wallet is on the wrong network.{" "}
            <button className="link-btn" onClick={switchNetwork}>
              Switch to {NETWORK_NAME}
            </button>
          </div>
        )}

        {error && <div className="banner banner-warn">{error}</div>}

        <div className="perforation" aria-hidden="true" />

        {route.name === "list" && <PollList />}
        {route.name === "create" && <CreatePoll wallet={wallet} />}
        {route.name === "poll" && <PollView key={route.address} address={route.address} wallet={wallet} />}

        <footer className="ballot-foot mono">
          {FACTORY_ADDRESS ? (
            <a href={`${EXPLORER_URL}/address/${FACTORY_ADDRESS}`} target="_blank" rel="noreferrer">
              factory {shortAddr(FACTORY_ADDRESS)} ↗
            </a>
          ) : (
            <span>factory not deployed</span>
          )}
          <span>{NETWORK_NAME} testnet</span>
        </footer>
      </div>
    </div>
  );
}
