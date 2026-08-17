// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Voting - a simple on-chain poll contract
/// @notice Deployer creates a poll with candidates and a voting window.
///         Each address may cast exactly one vote for one candidate.
contract Voting {
    struct Candidate {
        string name;
        uint256 voteCount;
    }

    address public owner;
    string public pollTitle;
    Candidate[] public candidates;
    uint256 public votingStart;
    uint256 public votingEnd;

    mapping(address => bool) public hasVoted;

    event VoteCast(address indexed voter, uint256 indexed candidateIndex, string candidateName);
    event PollCreated(string title, uint256 votingStart, uint256 votingEnd);

    modifier onlyDuringVoting() {
        require(block.timestamp >= votingStart, "Voting has not started yet");
        require(block.timestamp <= votingEnd, "Voting has ended");
        _;
    }

    /// @param _title Title of the poll
    /// @param _candidateNames List of candidate names (must be at least 2)
    /// @param _durationInSeconds How long voting stays open, starting now
    constructor(
        string memory _title,
        string[] memory _candidateNames,
        uint256 _durationInSeconds
    ) {
        require(_candidateNames.length >= 2, "Need at least 2 candidates");
        require(_durationInSeconds > 0, "Duration must be positive");

        owner = msg.sender;
        pollTitle = _title;
        votingStart = block.timestamp;
        votingEnd = block.timestamp + _durationInSeconds;

        for (uint256 i = 0; i < _candidateNames.length; i++) {
            candidates.push(Candidate({name: _candidateNames[i], voteCount: 0}));
        }

        emit PollCreated(_title, votingStart, votingEnd);
    }

    /// @notice Cast a vote for a candidate by index
    function vote(uint256 _candidateIndex) external onlyDuringVoting {
        require(!hasVoted[msg.sender], "You have already voted");
        require(_candidateIndex < candidates.length, "Invalid candidate index");

        hasVoted[msg.sender] = true;
        candidates[_candidateIndex].voteCount += 1;

        emit VoteCast(msg.sender, _candidateIndex, candidates[_candidateIndex].name);
    }

    /// @notice Total number of candidates
    function candidateCount() external view returns (uint256) {
        return candidates.length;
    }

    /// @notice Fetch all candidates and their vote counts in one call
    function getAllCandidates() external view returns (string[] memory names, uint256[] memory voteCounts) {
        uint256 len = candidates.length;
        names = new string[](len);
        voteCounts = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            names[i] = candidates[i].name;
            voteCounts[i] = candidates[i].voteCount;
        }
    }

    /// @notice Whether the voting window is currently open
    function isVotingOpen() external view returns (bool) {
        return block.timestamp >= votingStart && block.timestamp <= votingEnd;
    }

    /// @notice Seconds remaining until voting ends (0 if already ended)
    function timeRemaining() external view returns (uint256) {
        if (block.timestamp >= votingEnd) return 0;
        return votingEnd - block.timestamp;
    }
}
