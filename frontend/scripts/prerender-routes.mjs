// After `vite build`, write a static HTML shell for each route so crawlers that do not run
// JavaScript still get a correct title, description, canonical URL and readable summary.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SITE = "https://onchain-voting-dapp.vercel.app";
const dist = new URL("../dist/", import.meta.url);
const home = readFileSync(new URL("index.html", dist), "utf8");

const swap = (html, name, replacement) => {
  const re = new RegExp(`<!--seo:${name}-->[\\s\\S]*?<!--/seo:${name}-->`);
  if (!re.test(html)) throw new Error(`marker ${name} missing`);
  return html.replace(re, () => replacement);
};

function page({ path, title, description, noindex, summary }) {
  let html = home;
  const url = SITE + path;
  let head = readHead(home)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${description}"`)
    .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${url}"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${title}"`)
    .replace(/(<meta name="twitter:title" content=")[^"]*"/, `$1${title}"`)
    .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${description}"`)
    .replace(/(<meta name="twitter:description" content=")[^"]*"/, `$1${description}"`);
  if (path !== "/") head = head.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/, "");
  if (noindex) {
    // Generic shell shared by every poll address: no single canonical URL, keep out of indexes.
    head = head
      .replace(/\s*<link rel="canonical"[^>]*>/, "")
      .replace(/\s*<meta property="og:url"[^>]*>/, "");
    head += '\n    <meta name="robots" content="noindex, follow" />';
  }
  html = swap(html, "head", `<!--seo:head-->${head}<!--/seo:head-->`);
  html = swap(html, "summary", `<!--seo:summary--><main class="seo-summary">${summary}</main><!--/seo:summary-->`);
  return html;
}

function readHead(html) {
  return html.match(/<!--seo:head-->([\s\S]*?)<!--\/seo:head-->/)[1];
}

const write = (dir, html) => {
  mkdirSync(new URL(dir, dist), { recursive: true });
  writeFileSync(new URL(dir + "index.html", dist), html);
};

write(
  "create/",
  page({
    path: "/create",
    title: "Create a Poll – On-Chain Ballot",
    description:
      "Create a poll on the Ethereum Sepolia testnet: set a question, 2 to 20 options and a deadline, then share the link. Needs a browser wallet such as MetaMask.",
    summary: `<h1>Create a poll on the Ethereum Sepolia testnet</h1>
      <p>Write a question, add 2 to 20 options and pick a deadline from one minute to 365 days. Your wallet signs one transaction that deploys the poll on Sepolia, and you get a link to share. Anyone can then vote with their own wallet, one vote per wallet address.</p>
      <p>Creating a poll needs a browser wallet such as MetaMask connected to Sepolia and a little free test ETH for gas. This page needs JavaScript to work. <a href="/">See all polls</a>.</p>`,
  })
);

// /poll/<address> is rewritten to this shell by vercel.json. The content lives on-chain and is
// loaded by the app in the browser, so this shell is generic and kept out of search indexes.
write(
  "poll/",
  page({
    path: "/poll",
    title: "Poll – On-Chain Ballot",
    description: "A poll recorded on the Ethereum Sepolia testnet. Open it in a browser to read the options and vote.",
    noindex: true,
    summary: `<h1>On-chain poll</h1>
      <p>This is a poll whose votes are recorded on the Ethereum Sepolia testnet. Its question, options and results are read from the blockchain by JavaScript in your browser. Voting needs a wallet such as MetaMask connected to Sepolia.</p>
      <p><a href="/">Back to On-Chain Ballot</a>.</p>`,
  })
);
console.log("prerendered /create and /poll shells");
