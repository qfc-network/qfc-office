// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract OfficeRegistry {
    struct CheckInRecord {
        address member;
        string room;
        uint256 checkInTime;
        uint256 checkOutTime;
    }
    
    mapping(address => bool) public isOnline;
    mapping(address => string) public currentRoom;
    mapping(address => uint256) public lastCheckIn;
    mapping(address => uint256) public totalOnlineSeconds;
    
    CheckInRecord[] public records;
    
    event CheckedIn(address indexed member, string room, uint256 timestamp);
    event CheckedOut(address indexed member, uint256 duration, uint256 timestamp);
    event RoomChanged(address indexed member, string fromRoom, string toRoom);
    event MessageSent(address indexed sender, string room, bytes32 msgHash);
    
    function checkIn(string calldata room) external {
        require(!isOnline[msg.sender], "Already checked in");
        isOnline[msg.sender] = true;
        currentRoom[msg.sender] = room;
        lastCheckIn[msg.sender] = block.timestamp;
        
        records.push(CheckInRecord({
            member: msg.sender,
            room: room,
            checkInTime: block.timestamp,
            checkOutTime: 0
        }));
        
        emit CheckedIn(msg.sender, room, block.timestamp);
    }
    
    function checkOut() external {
        require(isOnline[msg.sender], "Not checked in");
        uint256 duration = block.timestamp - lastCheckIn[msg.sender];
        totalOnlineSeconds[msg.sender] += duration;
        isOnline[msg.sender] = false;
        
        // Update last record
        if (records.length > 0) {
            records[records.length - 1].checkOutTime = block.timestamp;
        }
        
        emit CheckedOut(msg.sender, duration, block.timestamp);
    }
    
    function moveRoom(string calldata newRoom) external {
        require(isOnline[msg.sender], "Not checked in");
        string memory oldRoom = currentRoom[msg.sender];
        currentRoom[msg.sender] = newRoom;
        emit RoomChanged(msg.sender, oldRoom, newRoom);
    }
    
    function sendMessage(string calldata room, string calldata text) external {
        require(isOnline[msg.sender], "Not checked in");
        emit MessageSent(msg.sender, room, keccak256(bytes(text)));
    }
    
    function getRecordCount() external view returns (uint256) {
        return records.length;
    }
}
