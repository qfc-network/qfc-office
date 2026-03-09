// --- Types (shared with v1.0/v2.0) ---
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
async function post(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function fetchState(): Promise<OfficeState> {
  const res = await fetch("/api/state");
  return res.json();
}

export async function checkin(name: string) {
  return post("/api/checkin", { name });
}

export async function checkout(name: string) {
  return post("/api/checkout", { name });
}

export async function setStatus(name: string, status: string, message?: string) {
  return post("/api/status", { name, status, message });
}

export async function moveToRoom(name: string, room: string) {
  return post("/api/move", { name, room });
}

export async function sendMessage(name: string, room: string, content: string) {
  return post("/api/message", { name, room, content });
}

export async function fetchChain(): Promise<ChainInfo> {
  const res = await fetch("/api/chain");
  return res.json();
}

// --- WebSocket ---
export class OfficeSocket {
  private ws: WebSocket | null = null;
  private listeners: Array<(state: OfficeState) => void> = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect() {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    this.ws = new WebSocket(`${proto}//${location.host}/ws`);

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "state") {
          for (const fn of this.listeners) fn(msg.data);
        }
      } catch { /* ignore */ }
    };

    this.ws.onclose = () => {
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  onState(fn: (state: OfficeState) => void) {
    this.listeners.push(fn);
  }

  destroy() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}
