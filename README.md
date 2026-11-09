# On-Chain Voting dApp

A minimal voting/poll dApp: a Solidity contract (Hardhat) + a React frontend (Vite + ethers.js) styled like an official paper ballot.

**Live:** https://onchain-voting-dapp-ahmed-ali-shahs-projects-c142f759.vercel.app
**Contract (Sepolia):** [0xED356DBd900e554658ab43E08a6f288406d5288f](https://sepolia.etherscan.io/address/0xED356DBd900e554658ab43E08a6f288406d5288f)


## Poll factory (anyone can create a poll)

`PollFactory.sol` deploys a fresh `Poll` contract each time someone calls `createPoll(title, options, durationInSeconds)` and keeps a list of every poll, so the frontend can show all of them. The app has three views: all polls (`#/`), create a poll (`#/create`), and a single poll (`#/poll/<address>`, shareable).

To switch it on (needs your wallet, so run it locally):

```bash
npx hardhat run scripts/deployFactory.js --network sepolia
```

Then set `DEPLOYED_FACTORY_ADDRESS` in `frontend/src/contract-config.js` (or `VITE_FACTORY_ADDRESS` in Vercel) to the printed address and deploy the frontend. The original poll contract stays readable and is listed as the "Original poll".

Limits enforced on-chain: 2–20 options, titles up to 200 bytes, option names up to 100 bytes, voting windows from 1 minute to 365 days. One vote per wallet address.

## Structure

```
voting-dapp/
├── contracts/
│   ├── Voting.sol             # original single-poll contract (deployed, closed)
│   ├── Poll.sol               # one poll, created by the factory
│   └── PollFactory.sol        # creates and lists polls
├── test/                      # Hardhat tests (Voting + PollFactory)
├── scripts/
│   ├── deploy.js              # deploys the original single poll
│   └── deployFactory.js       # deploys the PollFactory
├── hardhat.config.js
├── .env.example                # rename to .env, fill in your RPC URL + key
└── frontend/                  # React app (hash-routed: list, create, poll view)
    ├── src/App.jsx, views/    # PollList, CreatePoll, PollView
    ├── src/contract-config.js # factory address, chain settings, public RPC
    └── .env.example
```

## 1. Deploy the contract (you run this locally)

This step needs a wallet private key, so it has to run on your machine — not something to hand to an AI assistant.

```bash
cd voting-dapp
npm install
cp .env.example .env
```

Fill in `.env`:
- `SEPOLIA_RPC_URL` — free from [Alchemy](https://www.alchemy.com/) or [Infura](https://www.infura.io/) (create an app on the Sepolia network)
- `PRIVATE_KEY` — export from MetaMask (Account details → Show private key). **Use a throwaway/test wallet, never one holding real funds.**

Get free Sepolia test ETH from a faucet like https://sepoliafaucet.com (you need a tiny amount to pay gas).

Edit `scripts/deploy.js` to set your poll title, candidates, and voting duration. Then:

```bash
npx hardhat test              # run the test suite locally first
npx hardhat run scripts/deploy.js --network sepolia
```

Copy the deployed contract address that gets printed.

## 2. Configure and deploy the frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Paste the contract address into `frontend/.env` as `VITE_CONTRACT_ADDRESS`.

```bash
npm run dev      # local preview at localhost:5173
```

Then deploy to Vercel the same way as your other projects (push to GitHub → import in Vercel → add `VITE_CONTRACT_ADDRESS` as an environment variable in the Vercel dashboard → deploy).

## How it works

- One vote per wallet address (`hasVoted` mapping on-chain).
- Voting has a time window (`votingStart` → `votingEnd`); the UI shows a live countdown and disables voting once it closes.
- Vote counts and candidate names are read live from the contract (`getAllCandidates`), refreshed every 8 seconds.
- The frontend needs MetaMask (or another injected wallet) to sign the vote transaction; reading poll data also uses the wallet's provider.

## Notes

- This is a learning/demo project on a testnet — not audited, not for production/mainnet use with real funds.
- Anyone can see how everyone voted (voting is public on-chain), since Ethereum has no built-in privacy. That's normal for a simple on-chain poll — just worth knowing.
