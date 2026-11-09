const hre = require("hardhat");

async function main() {
  console.log(`Deploying PollFactory to ${hre.network.name}...`);

  const Factory = await hre.ethers.getContractFactory("PollFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();

  const address = await factory.getAddress();
  console.log("\n✅ PollFactory deployed to:", address);
  console.log("\nNext: put this address in frontend/src/contract-config.js as DEPLOYED_FACTORY_ADDRESS");
  console.log("(or set VITE_FACTORY_ADDRESS in Vercel), then push.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
