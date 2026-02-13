const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Deploy Token
  const Token = await ethers.getContractFactory("GovernanceToken");
  const token = await Token.deploy();
  await token.waitForDeployment();
  console.log("Token deployed at:", token.target);

  // Deploy Timelock
  const minDelay = 60; // 60 seconds
  const proposers = [];
  const executors = [];

  const TimeLock = await ethers.getContractFactory("TimeLock");
  const timelock = await TimeLock.deploy(minDelay, proposers, executors);
  await timelock.waitForDeployment();
  console.log("Timelock deployed at:", timelock.target);

  // Deploy Governor
  const Governor = await ethers.getContractFactory("MyGovernor");
  const governor = await Governor.deploy(token.target, timelock.target);
  await governor.waitForDeployment();
  console.log("Governor deployed at:", governor.target);

  // Setup roles
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();

  await timelock.grantRole(PROPOSER_ROLE, governor.target);
  await timelock.grantRole(EXECUTOR_ROLE, governor.target);

  console.log("Roles granted to Governor");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
