// QFC Chain Integration for Virtual Office
const QFC_RPC = "https://rpc.testnet.qfc.network";
const CHAIN_ID = 9000;
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

interface WalletState {
  connected: boolean;
  address: string | null;
  balance: string | null;
  signer: any | null;
  provider: any | null;
}

let wallet: WalletState = { connected: false, address: null, balance: null, signer: null, provider: null };

export function getWalletState() { return wallet; }

export async function connectWallet(): Promise<WalletState> {
  const { ethers } = await import("ethers");
  if (typeof (window as any).ethereum !== "undefined") {
    const ethereum = (window as any).ethereum;
    await ethereum.request({ method: "eth_requestAccounts" });
    try {
      await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x2328" }] });
    } catch (e: any) {
      if (e.code === 4902) {
        await ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0x2328", chainName: "QFC Testnet", rpcUrls: [QFC_RPC], nativeCurrency: { name: "QFC", symbol: "QFC", decimals: 18 } }] });
      }
    }
    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const balance = ethers.formatEther(await provider.getBalance(address));
    wallet = { connected: true, address, balance, signer, provider };
  }
  return wallet;
}

export async function connectWithKey(key: string): Promise<WalletState> {
  const { ethers } = await import("ethers");
  const provider = new ethers.JsonRpcProvider(QFC_RPC);
  const w = new ethers.Wallet(key, provider);
  const balance = ethers.formatEther(await provider.getBalance(w.address));
  wallet = { connected: true, address: w.address, balance, signer: w, provider };
  return wallet;
}

function getContract() {
  if (!wallet.signer) throw new Error("Wallet not connected");
  const { ethers } = require("ethers");
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet.signer);
}

async function sendTx(fn: () => Promise<any>): Promise<{ txHash: string; success: boolean }> {
  try {
    const tx = await fn();
    const receipt = await tx.wait();
    return { txHash: receipt.hash, success: receipt.status === 1 };
  } catch (e: any) {
    console.error("Chain TX failed:", e);
    return { txHash: "", success: false };
  }
}

export async function checkInOnChain(room: string): Promise<{ txHash: string; success: boolean }> {
  if (!wallet.signer) throw new Error("Wallet not connected");
  const { ethers } = await import("ethers");
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet.signer);
  return sendTx(() => contract.checkIn(room));
}

export async function checkOutOnChain(): Promise<{ txHash: string; success: boolean }> {
  if (!wallet.signer) throw new Error("Wallet not connected");
  const { ethers } = await import("ethers");
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet.signer);
  return sendTx(() => contract.checkOut());
}

export async function moveRoomOnChain(newRoom: string): Promise<{ txHash: string; success: boolean }> {
  if (!wallet.signer) throw new Error("Wallet not connected");
  const { ethers } = await import("ethers");
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet.signer);
  return sendTx(() => contract.moveRoom(newRoom));
}

export async function sendMessageOnChain(room: string, content: string): Promise<{ txHash: string; success: boolean }> {
  if (!wallet.signer) throw new Error("Wallet not connected");
  const { ethers } = await import("ethers");
  const contentHash = ethers.keccak256(ethers.toUtf8Bytes(content));
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet.signer);
  return sendTx(() => contract.sendMessage(room, contentHash));
}

export async function getChainInfo(): Promise<{ blockNumber: number; chainId: number }> {
  const { ethers } = await import("ethers");
  const provider = wallet.provider || new ethers.JsonRpcProvider(QFC_RPC);
  const blockNumber = await provider.getBlockNumber();
  return { blockNumber, chainId: CHAIN_ID };
}

export { CONTRACT_ADDRESS, ABI };
