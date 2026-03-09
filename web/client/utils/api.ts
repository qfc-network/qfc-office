// Types shared between client and server
export interface Member {
  name: string;
  chineseName: string;
  role: string;
  type: "human" | "ai";
  emoji: string;
  status: "online" | "busy" | "idle" | "offline";
  statusMessage: string;
  room: string;
}

export interface Message {
  timestamp: string;
  sender: string;
  room: string;
  text: string;
}

export interface Room {
  name: string;
  description: string;
}

export interface OfficeState {
  members: Member[];
  rooms: Room[];
  messages: Message[];
  currentUser: string | null;
}

export interface ChainInfo {
  blockNumber: number | null;
  networkName: string;
  online: boolean;
}

// --- HTTP API ---
const BASE = "";

async function post(url: string, body: object) {
  const res = await fetch(BASE + url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function fetchState(): Promise<OfficeState> {
  const res = await fetch(BASE + "/api/state");
  return res.json();
}

export async function checkin(name: string) {
  return post("/api/checkin", { name });
}

export async function checkout(name: string) {
  return post("/api/checkout", { name });
}

export async function setStatus(name: string, status: string, message: string) {
  return post("/api/status", { name, status, message });
}

export async function moveToRoom(name: string, room: string) {
  return post("/api/move", { name, room });
}

export async function sendMessage(name: string, room: string, content: string) {
  return post("/api/message", { name, room, content });
}

export async function fetchChain(): Promise<ChainInfo> {
  const res = await fetch(BASE + "/api/chain");
  return res.json();
}

// --- WebSocket ---
export type StateCallback = (state: OfficeState) => void;

export class OfficeSocket {
  private ws: WebSocket | null = null;
  private listeners: StateCallback[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/ws`;
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "state") {
        for (const cb of this.listeners) {
          cb(msg.data);
        }
      }
    };

    this.ws.onclose = () => {
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  onState(cb: StateCallback) {
    this.listeners.push(cb);
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}
