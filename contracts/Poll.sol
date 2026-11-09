// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Poll - a single on-chain poll, created by PollFactory
/// @notice Same read/vote interface as the original Voting contract, so the
///         frontend can display either. One vote per wallet address.
contract Poll {
    struct Candidate {
        string name;
        uint256 voteCount;
    }

    address public immutable creator;
    string public pollTitle;
    Candidate[] public candidates;
    uint256 public votingStart;
    uint256 public votingEnd;

    mapping(address => bool) public hasVoted;

    event VoteCast(address indexed voter, uint256 indexed candidateIndex, string candidateName);

    modifier onlyDuringVoting() {
        require(block.timestamp >= votingStart, "Voting has not started yet");
        require(block.timestamp <= votingEnd, "Voting has ended");
        _;
    }

    /// @param _creator The wallet that asked the factory to create this poll
    constructor(
        address _creator,
        string memory _title,
        string[] memory _candidateNames,
        uint256 _durationInSeconds
    ) {
        require(bytes(_title).length > 0 && bytes(_title).length <= 200, "Title must be 1-200 bytes");
        require(_candidateNames.length >= 2 && _candidateNames.length <= 20, "Need 2-20 candidates");
        require(_durationInSeconds >= 60 && _durationInSeconds <= 365 days, "Duration must be 1 minute to 365 days");

        creator = _creator;
        pollTitle = _title;
        votingStart = block.timestamp;
        votingEnd = block.timestamp + _durationInSeconds;

        for (uint256 i = 0; i < _candidateNames.length; i++) {
            require(bytes(_candidateNames[i]).length > 0 && bytes(_candidateNames[i]).length <= 100, "Candidate name must be 1-100 bytes");
            candidates.push(Candidate({name: _candidateNames[i], voteCount: 0}));
        }
    }

    /// @notice Cast a vote for a candidate by index
    function vote(uint256 _candidateIndex) external onlyDuringVoting {
        require(!hasVoted[msg.sender], "You have already voted");
        require(_candidateIndex < candidates.length, "Invalid candidate index");

        hasVoted[msg.sender] = true;
        candidates[_candidateIndex].voteCount += 1;

        emit VoteCast(msg.sender, _candidateIndex, candidates[_candidateIndex].name);
    }

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

    function isVotingOpen() external view returns (bool) {
        return block.timestamp >= votingStart && block.timestamp <= votingEnd;
    }

    /// @notice Seconds remaining until voting ends (0 if already ended)
    function timeRemaining() external view returns (uint256) {
        if (block.timestamp >= votingEnd) return 0;
        return votingEnd - block.timestamp;
    }
}
