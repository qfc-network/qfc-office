// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title QFC Office Registry — On-chain attendance & activity for virtual office
contract OfficeRegistry {
    // ── State ──────────────────────────────────────────
    mapping(address => string) public currentRoom;
    mapping(address => bool) public isOnline;
    mapping(address => uint256) public lastCheckIn;
    mapping(address => uint256) public totalOnlineSeconds;
    mapping(address => uint256) public checkInCount;

    uint256 public totalCheckIns;
    uint256 public messageCount;

    // ── Events ─────────────────────────────────────────
    event CheckIn(address indexed member, string room, uint256 timestamp);
    event CheckOut(address indexed member, uint256 duration, uint256 timestamp);
    event RoomMove(address indexed member, string fromRoom, string toRoom);
    event MessageSent(address indexed sender, string room, bytes32 contentHash, uint256 timestamp);

    /// @notice Check in to the office
    function checkIn(string calldata room) external {
        require(!isOnline[msg.sender], "Already checked in");
        isOnline[msg.sender] = true;
        currentRoom[msg.sender] = room;
        lastCheckIn[msg.sender] = block.timestamp;
        checkInCount[msg.sender]++;
        totalCheckIns++;
        emit CheckIn(msg.sender, room, block.timestamp);
    }

    /// @notice Check out from the office
    function checkOut() external {
        require(isOnline[msg.sender], "Not checked in");
        uint256 duration = block.timestamp - lastCheckIn[msg.sender];
        totalOnlineSeconds[msg.sender] += duration;
        isOnline[msg.sender] = false;
        currentRoom[msg.sender] = "";
        emit CheckOut(msg.sender, duration, block.timestamp);
    }

    /// @notice Move to a different room
    function moveRoom(string calldata newRoom) external {
        require(isOnline[msg.sender], "Not checked in");
        string memory oldRoom = currentRoom[msg.sender];
        currentRoom[msg.sender] = newRoom;
        emit RoomMove(msg.sender, oldRoom, newRoom);
    }

    /// @notice Record a message (hash only, content stays off-chain)
    function sendMessage(string calldata room, bytes32 contentHash) external {
        require(isOnline[msg.sender], "Not checked in");
        messageCount++;
        emit MessageSent(msg.sender, room, contentHash, block.timestamp);
    }

    /// @notice Get member stats
    function getMemberStats(address member) external view returns (
        bool online,
        string memory room,
        uint256 totalSeconds,
        uint256 checkins
    ) {
        return (isOnline[member], currentRoom[member], totalOnlineSeconds[member], checkInCount[member]);
    }
}
