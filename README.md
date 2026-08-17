# On-Chain Voting dApp

A minimal voting/poll dApp: a Solidity contract (Hardhat) + a React frontend (Vite + ethers.js) styled like an official paper ballot.

**Live:** https://onchain-voting-dapp-ahmed-ali-shahs-projects-c142f759.vercel.app
**Contract (Sepolia):** [0xED356DBd900e554658ab43E08a6f288406d5288f](https://sepolia.etherscan.io/address/0xED356DBd900e554658ab43E08a6f288406d5288f)


## Structure

```
voting-dapp/
├── contracts/Voting.sol       # the smart contract
├── test/Voting.test.js        # Hardhat test suite
├── scripts/deploy.js          # deployment script (edit poll title/candidates here)
├── hardhat.config.js
├── .env.example                # rename to .env, fill in your RPC URL + key
└── frontend/                  # React app
    ├── src/App.jsx
    ├── src/contract-config.js
    └── .env.example            # rename to .env, fill in deployed contract address
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
