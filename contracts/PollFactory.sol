// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Poll} from "./Poll.sol";

/// @title PollFactory - lets anyone create their own on-chain poll
/// @notice Each call to createPoll deploys a fresh Poll contract and records
///         its address, so the frontend can list every poll ever created.
contract PollFactory {
    struct PollInfo {
        address pollAddress;
        address creator;
        string title;
        uint256 createdAt;
    }

    PollInfo[] private _polls;
    mapping(address => uint256[]) private _pollsByCreator;

    event PollCreated(
        address indexed pollAddress,
        address indexed creator,
        string title,
        uint256 indexed pollId
    );

    /// @notice Deploy a new poll. The caller becomes the poll's creator.
    /// @return pollAddress Address of the newly deployed Poll contract
    function createPoll(
        string calldata title,
        string[] calldata candidateNames,
        uint256 durationInSeconds
    ) external returns (address pollAddress) {
        Poll poll = new Poll(msg.sender, title, candidateNames, durationInSeconds);
        pollAddress = address(poll);

        uint256 pollId = _polls.length;
        _polls.push(
            PollInfo({
                pollAddress: pollAddress,
                creator: msg.sender,
                title: title,
                createdAt: block.timestamp
            })
        );
        _pollsByCreator[msg.sender].push(pollId);

        emit PollCreated(pollAddress, msg.sender, title, pollId);
    }

    /// @notice Total number of polls ever created
    function pollCount() external view returns (uint256) {
        return _polls.length;
    }

    /// @notice Newest-first page of polls. offset 0 = the most recent poll.
    function getPolls(uint256 offset, uint256 limit) external view returns (PollInfo[] memory page) {
        uint256 total = _polls.length;
        if (offset >= total || limit == 0) return new PollInfo[](0);

        uint256 count = total - offset;
        if (count > limit) count = limit;

        page = new PollInfo[](count);
        for (uint256 i = 0; i < count; i++) {
            page[i] = _polls[total - 1 - offset - i];
        }
    }

    /// @notice Polls created by a specific wallet (oldest first)
    function getPollsByCreator(address creator) external view returns (PollInfo[] memory result) {
        uint256[] storage ids = _pollsByCreator[creator];
        result = new PollInfo[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = _polls[ids[i]];
        }
    }
}
