import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { JsonRpcProvider } from "ethers";
import { AgentSimulator } from "./agents.js";

// --- Types (mirror of v1.0) ---
interface Member {
  name: string;
  chineseName: string;
  role: string;
  type: "human" | "ai";
  emoji: string;
  status: "online" | "busy" | "idle" | "offline";
  statusMessage: string;
  room: string;
}

interface Message {
  timestamp: string;
  sender: string;
  room: string;
  text: string;
}

interface Room {
  name: string;
  description: string;
}

interface OfficeState {
  members: Member[];
  rooms: Room[];
  messages: Message[];
  currentUser: string | null;
}

// --- State file (shared with CLI v1.0) ---
const STATE_DIR = path.join(os.homedir(), ".qfc-office");
const STATE_FILE = path.join(STATE_DIR, "state.json");

function ensureDir(): void {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

function loadState(): OfficeState {
  ensureDir();
  if (!fs.existsSync(STATE_FILE)) {
    return { members: [], rooms: [], messages: [], currentUser: null };
  }
  const raw = fs.readFileSync(STATE_FILE, "utf-8");
  return JSON.parse(raw) as OfficeState;
}

function saveState(state: OfficeState): void {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function findMember(state: OfficeState, name: string): Member | undefined {
  const lower = name.toLowerCase();
  return state.members.find(
    (m) =>
      m.name.toLowerCase() === lower ||
      m.name.split(" ")[0].toLowerCase() === lower ||
      m.chineseName === name
  );
}

// --- Chain info ---
const RPC_URL = "https://rpc.testnet.qfc.network";

async function getChainInfo() {
  try {
    const provider = new JsonRpcProvider(RPC_URL, undefined, { staticNetwork: true });
    const blockNumber = await provider.getBlockNumber();
    return { blockNumber, networkName: "Testnet", online: true };
  } catch {
    return { blockNumber: null, networkName: "Testnet", online: false };
  }
}

// --- Express + WebSocket ---
const app = express();
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
  clients.add(ws);
  // Send current state immediately
  const state = loadState();
  ws.send(JSON.stringify({ type: "state", data: state }));

  ws.on("close", () => {
    clients.delete(ws);
  });
});

function broadcast(state: OfficeState) {
  const msg = JSON.stringify({ type: "state", data: state });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}

// --- API Routes ---
app.get("/api/state", (_req, res) => {
  const state = loadState();
  res.json(state);
});

app.post("/api/checkin", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });

  const state = loadState();
  const member = findMember(state, name);
  if (!member) return res.status(404).json({ error: "member not found" });

  const wasAlreadyOnline = member.status === "online";
  member.status = "online";
  state.currentUser = member.name;

  if (!wasAlreadyOnline) {
    state.messages.push({
      timestamp: new Date().toISOString(),
      sender: "System",
      room: member.room,
      text: `${member.name} checked in`,
    });
    if (state.messages.length > 100) {
      state.messages = state.messages.slice(-100);
    }
  }

  saveState(state);
  broadcast(state);
  res.json({ ok: true, member });
});

app.post("/api/checkout", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });

  const state = loadState();
  const member = findMember(state, name);
  if (!member) return res.status(404).json({ error: "member not found" });

  member.status = "offline";
  member.statusMessage = "";
  member.room = "大厅";
  if (state.currentUser === member.name) {
    state.currentUser = null;
  }
  saveState(state);
  broadcast(state);
  res.json({ ok: true });
});

app.post("/api/status", (req, res) => {
  const { name, status, message } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });

  const state = loadState();
  const member = findMember(state, name);
  if (!member) return res.status(404).json({ error: "member not found" });

  if (status) member.status = status;
  if (message !== undefined) member.statusMessage = message;
  saveState(state);
  broadcast(state);
  res.json({ ok: true, member });
});

app.post("/api/move", (req, res) => {
  const { name, room } = req.body;
  if (!name || !room) return res.status(400).json({ error: "name and room required" });

  const state = loadState();
  const member = findMember(state, name);
  if (!member) return res.status(404).json({ error: "member not found" });

  const roomExists = state.rooms.some((r) => r.name === room);
  if (!roomExists) return res.status(404).json({ error: "room not found" });

  member.room = room;
  saveState(state);
  broadcast(state);
  res.json({ ok: true, member });
});

app.post("/api/message", (req, res) => {
  const { name, room, content } = req.body;
  if (!name || !content) return res.status(400).json({ error: "name and content required" });

  const state = loadState();
  const member = findMember(state, name);
  if (!member) return res.status(404).json({ error: "member not found" });

  const msgRoom = room || member.room;
  const msg: Message = {
    timestamp: new Date().toISOString(),
    sender: member.name,
    room: msgRoom,
    text: content,
  };
  state.messages.push(msg);
  // Keep only last 100 messages
  if (state.messages.length > 100) {
    state.messages = state.messages.slice(-100);
  }
  saveState(state);
  broadcast(state);
  res.json({ ok: true, message: msg });
});

app.get("/api/chain", async (_req, res) => {
  const info = await getChainInfo();
  res.json(info);
});

// --- Watch state file for external changes (CLI) ---
let lastStateHash = "";
setInterval(() => {
  try {
    if (!fs.existsSync(STATE_FILE)) return;
    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    if (raw !== lastStateHash) {
      lastStateHash = raw;
      const state = JSON.parse(raw) as OfficeState;
      broadcast(state);
    }
  } catch {
    // ignore read errors
  }
}, 2000);

// --- Serve static files in production ---

// 3D client (web3d)
const client3dDist = path.join(import.meta.dirname, "../../web3d/dist/client");
if (fs.existsSync(client3dDist)) {
  app.use("/3d", express.static(client3dDist));
  app.get("/3d/*", (_req, res) => {
    res.sendFile(path.join(client3dDist, "index.html"));
  });
}

// 2D client (web)
const clientDist = path.join(import.meta.dirname, "../dist/client");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// --- AI Agent Simulator ---
const sim = new AgentSimulator(loadState, saveState, broadcast);
sim.start();

const PORT = 3210;
server.listen(PORT, () => {
  console.log(`🏢 QFC Virtual Office server running on http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`   State file: ${STATE_FILE}`);
});
