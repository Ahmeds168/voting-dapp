const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("PollFactory", function () {
  let factory, creator, voter1, voter2, voter3;
  const DAY = 24 * 60 * 60;

  async function createPoll(signer, title = "Pick a city", options = ["Karachi", "Lahore", "Sukkur"], duration = DAY) {
    const tx = await factory.connect(signer).createPoll(title, options, duration);
    const receipt = await tx.wait();
    const parsed = receipt.logs
      .map((l) => {
        try {
          return factory.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "PollCreated");
    return parsed.args.pollAddress;
  }

  beforeEach(async function () {
    [creator, voter1, voter2, voter3] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PollFactory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();
  });

  describe("creating polls", function () {
    it("starts with no polls", async function () {
      expect(await factory.pollCount()).to.equal(0);
      expect(await factory.getPolls(0, 10)).to.have.lengthOf(0);
    });

    it("deploys a poll and records it", async function () {
      const addr = await createPoll(creator);
      expect(await factory.pollCount()).to.equal(1);

      const [info] = await factory.getPolls(0, 10);
      expect(info.pollAddress).to.equal(addr);
      expect(info.creator).to.equal(creator.address);
      expect(info.title).to.equal("Pick a city");
    });

    it("emits PollCreated with the new poll's address and creator", async function () {
      await expect(factory.connect(voter1).createPoll("Q?", ["A", "B"], DAY))
        .to.emit(factory, "PollCreated")
        .withArgs(
          (a) => ethers.isAddress(a),
          voter1.address,
          "Q?",
          0
        );
    });

    it("sets the creator on the poll to the caller, not the factory", async function () {
      const addr = await createPoll(voter1);
      const poll = await ethers.getContractAt("Poll", addr);
      expect(await poll.creator()).to.equal(voter1.address);
    });

    it("gives each poll its own independent state", async function () {
      const a = await ethers.getContractAt("Poll", await createPoll(creator, "Poll A", ["x", "y"]));
      const b = await ethers.getContractAt("Poll", await createPoll(creator, "Poll B", ["p", "q", "r"]));

      await a.connect(voter1).vote(0);
      expect(await a.hasVoted(voter1.address)).to.equal(true);
      // Same wallet has not voted on poll B, and can
      expect(await b.hasVoted(voter1.address)).to.equal(false);
      await b.connect(voter1).vote(2);

      const [, aCounts] = await a.getAllCandidates();
      const [, bCounts] = await b.getAllCandidates();
      expect(aCounts.map(Number)).to.deep.equal([1, 0]);
      expect(bCounts.map(Number)).to.deep.equal([0, 0, 1]);
    });

    it("lists polls newest-first and paginates", async function () {
      await createPoll(creator, "First", ["a", "b"]);
      await createPoll(creator, "Second", ["a", "b"]);
      await createPoll(creator, "Third", ["a", "b"]);

      const page1 = await factory.getPolls(0, 2);
      expect(page1.map((p) => p.title)).to.deep.equal(["Third", "Second"]);

      const page2 = await factory.getPolls(2, 2);
      expect(page2.map((p) => p.title)).to.deep.equal(["First"]);

      expect(await factory.getPolls(5, 2)).to.have.lengthOf(0);
      expect(await factory.getPolls(0, 0)).to.have.lengthOf(0);
    });

    it("lists polls by creator", async function () {
      await createPoll(creator, "Mine 1", ["a", "b"]);
      await createPoll(voter1, "Theirs", ["a", "b"]);
      await createPoll(creator, "Mine 2", ["a", "b"]);

      const mine = await factory.getPollsByCreator(creator.address);
      expect(mine.map((p) => p.title)).to.deep.equal(["Mine 1", "Mine 2"]);
      expect(await factory.getPollsByCreator(voter2.address)).to.have.lengthOf(0);
    });
  });

  describe("input validation", function () {
    it("rejects fewer than 2 options", async function () {
      await expect(factory.createPoll("Q?", ["Only"], DAY)).to.be.revertedWith("Need 2-20 candidates");
    });

    it("rejects more than 20 options", async function () {
      const many = Array.from({ length: 21 }, (_, i) => `Option ${i}`);
      await expect(factory.createPoll("Q?", many, DAY)).to.be.revertedWith("Need 2-20 candidates");
    });

    it("rejects an empty title", async function () {
      await expect(factory.createPoll("", ["A", "B"], DAY)).to.be.revertedWith("Title must be 1-200 bytes");
    });

    it("rejects an empty option name", async function () {
      await expect(factory.createPoll("Q?", ["A", ""], DAY)).to.be.revertedWith(
        "Candidate name must be 1-100 bytes"
      );
    });

    it("rejects durations that are too short or too long", async function () {
      await expect(factory.createPoll("Q?", ["A", "B"], 10)).to.be.revertedWith(
        "Duration must be 1 minute to 365 days"
      );
      await expect(factory.createPoll("Q?", ["A", "B"], 366 * DAY)).to.be.revertedWith(
        "Duration must be 1 minute to 365 days"
      );
    });

    it("does not record a poll when creation reverts", async function () {
      await expect(factory.createPoll("Q?", ["Only"], DAY)).to.be.reverted;
      expect(await factory.pollCount()).to.equal(0);
    });
  });

  describe("voting on a factory-created poll", function () {
    let poll;

    beforeEach(async function () {
      poll = await ethers.getContractAt("Poll", await createPoll(creator));
    });

    it("exposes title, candidates and an open window", async function () {
      expect(await poll.pollTitle()).to.equal("Pick a city");
      expect(await poll.candidateCount()).to.equal(3);
      expect(await poll.isVotingOpen()).to.equal(true);
      expect(Number(await poll.timeRemaining())).to.be.greaterThan(0);
    });

    it("counts one vote per wallet and tallies correctly", async function () {
      await poll.connect(voter1).vote(0);
      await poll.connect(voter2).vote(0);
      await poll.connect(voter3).vote(1);

      const [names, counts] = await poll.getAllCandidates();
      expect(names).to.deep.equal(["Karachi", "Lahore", "Sukkur"]);
      expect(counts.map(Number)).to.deep.equal([2, 1, 0]);
    });

    it("prevents double voting", async function () {
      await poll.connect(voter1).vote(0);
      await expect(poll.connect(voter1).vote(1)).to.be.revertedWith("You have already voted");
    });

    it("rejects an invalid candidate index", async function () {
      await expect(poll.connect(voter1).vote(99)).to.be.revertedWith("Invalid candidate index");
    });

    it("emits VoteCast", async function () {
      await expect(poll.connect(voter1).vote(2)).to.emit(poll, "VoteCast").withArgs(voter1.address, 2, "Sukkur");
    });

    it("blocks votes after the deadline but keeps results readable", async function () {
      await poll.connect(voter1).vote(0);
      await time.increase(DAY + 1);

      expect(await poll.isVotingOpen()).to.equal(false);
      expect(await poll.timeRemaining()).to.equal(0);
      await expect(poll.connect(voter2).vote(0)).to.be.revertedWith("Voting has ended");

      const [, counts] = await poll.getAllCandidates();
      expect(counts.map(Number)).to.deep.equal([1, 0, 0]);
    });
  });
});
