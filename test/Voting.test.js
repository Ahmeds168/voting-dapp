const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Voting", function () {
  let voting, owner, addr1, addr2, addr3;
  const candidates = ["Alice", "Bob", "Charlie"];
  const duration = 3600; // 1 hour

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const Voting = await ethers.getContractFactory("Voting");
    voting = await Voting.deploy("Best Language 2026", candidates, duration);
    await voting.waitForDeployment();
  });

  it("sets the poll title and candidates correctly", async function () {
    expect(await voting.pollTitle()).to.equal("Best Language 2026");
    expect(await voting.candidateCount()).to.equal(3);
  });

  it("rejects deployment with fewer than 2 candidates", async function () {
    const Voting = await ethers.getContractFactory("Voting");
    await expect(voting.deploymentTransaction()).to.not.be.undefined;
    await expect(
      Voting.deploy("Bad Poll", ["OnlyOne"], duration)
    ).to.be.revertedWith("Need at least 2 candidates");
  });

  it("allows an address to vote once", async function () {
    await voting.connect(addr1).vote(0);
    expect(await voting.hasVoted(addr1.address)).to.equal(true);

    const [names, counts] = await voting.getAllCandidates();
    expect(names[0]).to.equal("Alice");
    expect(counts[0]).to.equal(1);
  });

  it("prevents double voting", async function () {
    await voting.connect(addr1).vote(0);
    await expect(voting.connect(addr1).vote(1)).to.be.revertedWith(
      "You have already voted"
    );
  });

  it("rejects an invalid candidate index", async function () {
    await expect(voting.connect(addr1).vote(99)).to.be.revertedWith(
      "Invalid candidate index"
    );
  });

  it("tallies votes across multiple voters correctly", async function () {
    await voting.connect(addr1).vote(0); // Alice
    await voting.connect(addr2).vote(0); // Alice
    await voting.connect(addr3).vote(1); // Bob

    const [names, counts] = await voting.getAllCandidates();
    expect(names).to.deep.equal(["Alice", "Bob", "Charlie"]);
    expect(counts.map(Number)).to.deep.equal([2, 1, 0]);
  });

  it("emits a VoteCast event", async function () {
    await expect(voting.connect(addr1).vote(2))
      .to.emit(voting, "VoteCast")
      .withArgs(addr1.address, 2, "Charlie");
  });

  it("reports voting as open right after deployment", async function () {
    expect(await voting.isVotingOpen()).to.equal(true);
  });

  it("blocks votes after the voting window ends", async function () {
    await time.increase(duration + 1);
    expect(await voting.isVotingOpen()).to.equal(false);
    await expect(voting.connect(addr1).vote(0)).to.be.revertedWith(
      "Voting has ended"
    );
  });

  it("reports decreasing time remaining", async function () {
    const remainingBefore = await voting.timeRemaining();
    await time.increase(100);
    const remainingAfter = await voting.timeRemaining();
    expect(Number(remainingAfter)).to.be.lessThan(Number(remainingBefore));
  });
});
