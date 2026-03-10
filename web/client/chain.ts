// QFC Chain Integration for Virtual Office — uses @qfc/chain-sdk
import {
  connectWallet,
  connectWithKey,
  getWalletState,
  getChainInfo,
  getContract,
  sendTx,
  initChainUI,
  type WalletState,
} from "@qfc/chain-sdk";

const CONTRACT_ADDRESS = "0x191101A9130C2E6239aC8529fF3A9E50CCd980cC";
const ABI = [
  "function checkIn(string calldata room) external",
  "function checkOut() external",
  "function moveRoom(string calldata newRoom) external",
  "function sendMessage(string calldata room, bytes32 contentHash) external",
  "function getMemberStats(address member) external view returns (bool online, string room, uint256 totalSeconds, uint256 checkins)",
  "function isOnline(address) external view returns (bool)",
  "function currentRoom(address) external view returns (string)",
  "function totalCheckIns() external view returns (uint256)",
  "function messageCount() external view returns (uint256)",
  "event CheckIn(address indexed member, string room, uint256 timestamp)",
  "event CheckOut(address indexed member, uint256 duration, uint256 timestamp)",
  "event RoomMove(address indexed member, string fromRoom, string toRoom)",
  "event MessageSent(address indexed sender, string room, bytes32 contentHash, uint256 timestamp)",
];

export async function checkInOnChain(room: string) {
  const contract = await getContract(CONTRACT_ADDRESS, ABI);
  return sendTx(() => contract.checkIn(room));
}

export async function checkOutOnChain() {
  const contract = await getContract(CONTRACT_ADDRESS, ABI);
  return sendTx(() => contract.checkOut());
}

export async function moveRoomOnChain(newRoom: string) {
  const contract = await getContract(CONTRACT_ADDRESS, ABI);
  return sendTx(() => contract.moveRoom(newRoom));
}

export async function sendMessageOnChain(room: string, content: string) {
  const { ethers } = await import("ethers");
  const contentHash = ethers.keccak256(ethers.toUtf8Bytes(content));
  const contract = await getContract(CONTRACT_ADDRESS, ABI);
  return sendTx(() => contract.sendMessage(room, contentHash));
}

export { connectWallet, connectWithKey, getWalletState, getChainInfo, initChainUI, CONTRACT_ADDRESS, ABI };
export type { WalletState };
