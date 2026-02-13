const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("DAO Governance Full Flow", function () {
  let token, timelock, governor;
  let deployer;

  beforeEach(async function () {
    [deployer] = await ethers.getSigners();

    // Deploy Token
    const Token = await ethers.getContractFactory("GovernanceToken");
    token = await Token.deploy();
    await token.waitForDeployment();

    // Deploy Timelock
    const minDelay = 60;
    const proposers = [];
    const executors = [];

    const TimeLock = await ethers.getContractFactory("TimeLock");
    timelock = await TimeLock.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();

    // Deploy Governor
    const Governor = await ethers.getContractFactory("MyGovernor");
    governor = await Governor.deploy(token.target, timelock.target);
    await governor.waitForDeployment();

    // Grant roles
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();

    await timelock.grantRole(PROPOSER_ROLE, governor.target);
    await timelock.grantRole(EXECUTOR_ROLE, governor.target);

    // Delegate votes
    await token.delegate(deployer.address);
  });

  it("Should complete full governance lifecycle", async function () {
    const description = "Test proposal";
    const encodedCall = governor.interface.encodeFunctionData("name");

    // Propose
    const tx = await governor.propose(
      [governor.target],
      [0],
      [encodedCall],
      description
    );

    const receipt = await tx.wait();
    const proposalId =
      receipt.logs[0].args.proposalId;

    // Mine 1 block for voting delay
    await network.provider.send("evm_mine");

    // Vote
    await governor.castVote(proposalId, 1);

    // Mine voting period blocks
    for (let i = 0; i < 25; i++) {
      await network.provider.send("evm_mine");
    }

    // Should be Succeeded
    expect(await governor.state(proposalId)).to.equal(4);

    const descriptionHash = ethers.id(description);

    // Queue
    await governor.queue(
      [governor.target],
      [0],
      [encodedCall],
      descriptionHash
    );

    // Increase time for timelock
    await network.provider.send("evm_increaseTime", [120]);
    await network.provider.send("evm_mine");

    // Execute
    await governor.execute(
      [governor.target],
      [0],
      [encodedCall],
      descriptionHash
    );

    // Should be Executed
    expect(await governor.state(proposalId)).to.equal(7);
  });
});
