const hre = require("hardhat");

async function main() {
  // Edit these before deploying
  const POLL_TITLE = "Best Language 2026";
  const CANDIDATES = ["JavaScript", "Python", "Solidity", "Rust"];
  const DURATION_SECONDS = 60 * 60 * 24 * 3; // 3 days

  console.log(`Deploying poll "${POLL_TITLE}" with candidates: ${CANDIDATES.join(", ")}`);

  const Voting = await hre.ethers.getContractFactory("Voting");
  const voting = await Voting.deploy(POLL_TITLE, CANDIDATES, DURATION_SECONDS);
  await voting.waitForDeployment();

  const address = await voting.getAddress();
  console.log("\n✅ Voting contract deployed to:", address);
  console.log("   Network:", hre.network.name);
  console.log("\nSave this address — you'll need it in the frontend's .env file (VITE_CONTRACT_ADDRESS).");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
