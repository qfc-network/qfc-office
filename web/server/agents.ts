/**
 * AI Agent Auto-Behavior Simulator
 * Makes AI team members behave autonomously — moving, chatting, changing status.
 */

// --- Types (same as index.ts) ---
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

// --- Agent personality config ---
interface AgentPersonality {
  name: string;
  roomWeights: Record<string, number>; // room → relative weight
  chatFrequency: number; // multiplier on base 15% chat chance
  statusChangeFreq: number; // multiplier on base 20%
  moveFreq: number; // multiplier on base 30%
  isNightOwl: boolean;
  chatPool: string[]; // extra personality-specific messages
}

const PERSONALITIES: Record<string, Partial<AgentPersonality>> = {
  "Aria Tanaka": {
    roomWeights: { "会议室A": 40, "工位区": 30, "大厅": 15, "茶水间": 15 },
    chatFrequency: 1.1,
    chatPool: [
      "Found a regression in the bridge module 🐛",
      "Test coverage is at 94% now",
      "Can someone reproduce issue #87?",
      "Edge case: what if gas = 0?",
    ],
  },
  "Ryan Chen": {
    roomWeights: { "工位区": 50, "服务器室": 30, "会议室A": 10, "茶水间": 10 },
    chatFrequency: 0.5,
    moveFreq: 0.7,
    chatPool: [
      "Protocol layer refactor is done",
      "Consensus looks stable",
      "...",
    ],
  },
  "Leo Lindqvist": {
    roomWeights: { "工位区": 30, "茶水间": 30, "大厅": 20, "会议室A": 20 },
    chatFrequency: 1.5,
    chatPool: [
      "New animation looks sick 🔥",
      "Who broke the CSS again 😂",
      "UI review anyone?",
      "Hot reload is my best friend",
    ],
  },
  "Kevin Zhang": {
    roomWeights: { "工位区": 60, "服务器室": 25, "茶水间": 10, "大厅": 5 },
    chatFrequency: 0.6,
    statusChangeFreq: 0.4,
    isNightOwl: true,
    chatPool: [
      "Optimized block validation by 30%",
      "Deep in the EVM bytecode...",
      "Don't disturb, in the zone",
    ],
  },
  "Sora Tanaka": {
    roomWeights: { "会议室A": 40, "大厅": 25, "工位区": 20, "茶水间": 15 },
    moveFreq: 1.5,
    chatFrequency: 1.2,
    chatPool: [
      "Let's sync on the v3 roadmap",
      "User feedback looks positive!",
      "Sprint retro at 3pm",
      "Prioritizing the staking feature",
    ],
  },
  "Maya Okonkwo": {
    roomWeights: { "工位区": 60, "会议室A": 15, "服务器室": 15, "茶水间": 10 },
    chatFrequency: 0.9,
    moveFreq: 0.6,
    chatPool: [
      "Solidity gas optimization saved 40k gas",
      "Audit report looks clean",
      "New contract deployed to testnet",
      "Reentrancy guard is solid now",
    ],
  },
  "Rik Andersen": {
    roomWeights: { "服务器室": 50, "工位区": 25, "茶水间": 15, "大厅": 10 },
    chatFrequency: 1.0,
    chatPool: [
      "All nodes healthy ✅",
      "Grafana dashboard updated",
      "Deploying to staging...",
      "Memory usage nominal",
      "CI pipeline green 🟢",
    ],
  },
  "Nina Volkov": {
    roomWeights: { "工位区": 40, "服务器室": 35, "会议室A": 15, "茶水间": 10 },
    chatFrequency: 0.8,
    chatPool: [
      "Model training epoch 42/100",
      "Accuracy up to 96.3%",
      "GPU cluster running hot",
      "New dataset preprocessed",
    ],
  },
  "Kai Nakamura": {
    roomWeights: { "工位区": 45, "服务器室": 20, "茶水间": 20, "大厅": 15 },
    chatFrequency: 0.4,
    chatPool: [
      "Interesting on-chain pattern...",
      "ZK proof verification optimized",
      "Tokenomics model updated",
    ],
  },
  "Alex Wei": {
    roomWeights: { "会议室A": 40, "工位区": 30, "茶水间": 20, "大厅": 10 },
    chatFrequency: 1.1,
    chatPool: [
      "New mockups in Figma 🎨",
      "Design system v2 ready for review",
      "Color palette updated",
      "Icon set finalized",
    ],
  },
};

// --- Room-based chat messages ---
const ROOM_CHAT: Record<string, string[]> = {
  "工位区": [
    "Just pushed a fix for the staking module",
    "Anyone reviewed the QVM changes?",
    "CI is green ✅",
    "Refactoring this module today",
    "PR #128 needs a review",
    "Linting pass complete",
  ],
  "会议室A": [
    "Let's discuss the v3 roadmap",
    "Good point about the gas optimization",
    "Can we ship this by Friday?",
    "Action items noted 📝",
    "Next meeting at 3pm",
  ],
  "茶水间": [
    "This coffee is terrible 😂",
    "Anyone want boba?",
    "谁要奶茶？",
    "Best lunch spot nearby?",
    "Need caffeine ☕",
  ],
  "服务器室": [
    "Node syncing at block #12000+",
    "GPU utilization at 87%",
    "Deploying hotfix...",
    "Disk usage at 62%",
    "Network latency looks good",
  ],
  "大厅": [
    "Morning everyone! 早上好",
    "Heading out, see ya 👋",
    "Nice weather today",
    "Welcome back!",
  ],
};

// --- Status messages ---
const STATUS_MESSAGES: Record<string, string[]> = {
  busy: ["reviewing PR #42", "debugging consensus", "writing tests", "deep focus mode 🎯"],
  online: ["ready to help", "checking CI", "code review time", ""],
  idle: ["coffee break ☕", "lunch 🍜", "stretching 🧘", "brb"],
};

// --- Reply templates ---
const REPLY_TEMPLATES = [
  "Agreed!",
  "Nice work 👍",
  "On it!",
  "Good call",
  "Sounds good",
  "Let me take a look",
  "+1",
  "Will check",
  "lgtm",
  "💯",
];

// --- Helpers ---
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function chance(probability: number): boolean {
  return Math.random() < probability;
}

function weightedPick(weights: Record<string, number>): string {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [key, weight] of entries) {
    r -= weight;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

/** Get current hour in Singapore time (UTC+8) */
function getSGHour(): number {
  const now = new Date();
  const utcH = now.getUTCHours();
  return (utcH + 8) % 24;
}

// --- Main class ---
export class AgentSimulator {
  private interval: NodeJS.Timeout | null = null;

  constructor(
    private loadState: () => OfficeState,
    private saveState: (s: OfficeState) => void,
    private broadcast: (s: OfficeState) => void
  ) {}

  start(tickMs: number = 45000): void {
    console.log(`🤖 Agent simulator started (tick every ${tickMs / 1000}s)`);
    // Run initial tick after short delay
    setTimeout(() => this.tick(), 5000);
    this.interval = setInterval(() => this.tick(), tickMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log("🤖 Agent simulator stopped");
    }
  }

  private tick(): void {
    try {
      const state = this.loadState();
      const aiAgents = state.members.filter((m) => m.type === "ai");
      if (aiAgents.length === 0) return;

      const hour = getSGHour();
      let actionsThisTick = 0;
      const maxActions = 3;

      // Time-of-day: manage online/offline transitions
      this.applyTimeOfDay(aiAgents, hour, state);

      // Shuffle agents for fairness
      const shuffled = [...aiAgents].sort(() => Math.random() - 0.5);

      for (const agent of shuffled) {
        if (actionsThisTick >= maxActions) break;
        if (agent.status === "offline") continue;

        const personality = PERSONALITIES[agent.name] || {};
        const moveChance = 0.3 * (personality.moveFreq ?? 1.0);
        const statusChance = 0.2 * (personality.statusChangeFreq ?? 1.0);
        const chatChance = 0.15 * (personality.chatFrequency ?? 1.0);

        // Check if in a meeting (2+ agents in 会议室A) — stay longer
        const inMeeting =
          agent.room === "会议室A" &&
          aiAgents.filter((a) => a.room === "会议室A" && a.status !== "offline").length >= 2;

        // Room movement
        if (!inMeeting && chance(moveChance)) {
          const moved = this.moveAgent(agent, personality, state);
          if (moved) actionsThisTick++;
        }

        // Status change
        if (chance(statusChance)) {
          const changed = this.changeStatus(agent);
          if (changed) actionsThisTick++;
        }

        // Chat
        if (actionsThisTick < maxActions && chance(chatChance)) {
          this.agentChat(agent, personality, state);
          actionsThisTick++;
        }
      }

      // Reply to recent messages (separate from main actions)
      if (actionsThisTick < maxActions) {
        this.tryReply(shuffled, state);
      }

      // Trim messages
      if (state.messages.length > 100) {
        state.messages = state.messages.slice(-100);
      }

      this.saveState(state);
      this.broadcast(state);
    } catch (err) {
      console.error("Agent tick error:", err);
    }
  }

  /** Manage online/offline based on time of day */
  private applyTimeOfDay(agents: Member[], hour: number, state: OfficeState): void {
    for (const agent of agents) {
      const personality = PERSONALITIES[agent.name] || {};
      const isNightOwl = personality.isNightOwl ?? false;

      if (hour >= 22 || hour < 9) {
        // Night: most go offline
        if (!isNightOwl && agent.status !== "offline" && chance(0.15)) {
          agent.status = "offline";
          agent.statusMessage = "";
        }
        // Night owls stay busy in server room
        if (isNightOwl && agent.status === "offline" && chance(0.1)) {
          agent.status = "busy";
          agent.statusMessage = "late night coding 🌙";
          agent.room = "服务器室";
        }
      } else if (hour >= 9 && hour < 12) {
        // Morning: come online
        if (agent.status === "offline" && chance(0.3)) {
          agent.status = "online";
          agent.statusMessage = "";
          agent.room = "大厅";
          state.messages.push({
            timestamp: new Date().toISOString(),
            sender: "System",
            room: "大厅",
            text: `${agent.name} came online`,
          });
        }
      } else if (hour >= 12 && hour < 13) {
        // Lunch: some go idle
        if (agent.status === "online" && chance(0.1)) {
          agent.status = "idle";
          agent.statusMessage = pick(["lunch 🍜", "eating 🍱", "brb lunch"]);
          agent.room = "茶水间";
        }
      } else if (hour >= 18 && hour < 22) {
        // Evening: gradually go offline
        if (agent.status !== "offline" && chance(0.08)) {
          agent.status = "offline";
          agent.statusMessage = "";
          state.messages.push({
            timestamp: new Date().toISOString(),
            sender: "System",
            room: agent.room,
            text: `${agent.name} went offline`,
          });
        }
      }
    }
  }

  /** Move agent to a new room */
  private moveAgent(
    agent: Member,
    personality: Partial<AgentPersonality>,
    state: OfficeState
  ): boolean {
    const weights = personality.roomWeights || {
      "工位区": 40,
      "会议室A": 20,
      "茶水间": 15,
      "服务器室": 15,
      "大厅": 10,
    };

    // Filter to rooms that exist in state
    const validRooms = state.rooms.map((r) => r.name);
    const validWeights: Record<string, number> = {};
    for (const [room, w] of Object.entries(weights)) {
      if (validRooms.includes(room)) {
        validWeights[room] = w;
      }
    }
    if (Object.keys(validWeights).length === 0) return false;

    const newRoom = weightedPick(validWeights);
    if (newRoom === agent.room) return false;

    agent.room = newRoom;
    return true;
  }

  /** Change agent's status */
  private changeStatus(agent: Member): boolean {
    const transitions: Record<string, string[]> = {
      online: ["busy", "idle"],
      busy: ["online"],
      idle: ["online"],
    };

    const options = transitions[agent.status];
    if (!options) return false;

    const newStatus = pick(options) as Member["status"];
    agent.status = newStatus;
    agent.statusMessage = pick(STATUS_MESSAGES[newStatus] || [""]);
    return true;
  }

  /** Agent posts a chat message */
  private agentChat(
    agent: Member,
    personality: Partial<AgentPersonality>,
    state: OfficeState
  ): void {
    // Pick from room-specific messages or personality pool
    const roomMsgs = ROOM_CHAT[agent.room] || ROOM_CHAT["工位区"];
    const personalMsgs = personality.chatPool || [];
    const allMsgs = [...roomMsgs, ...personalMsgs];

    state.messages.push({
      timestamp: new Date().toISOString(),
      sender: agent.name,
      room: agent.room,
      text: pick(allMsgs),
    });
  }

  /** Try to reply to a recent message */
  private tryReply(agents: Member[], state: OfficeState): void {
    const recent = state.messages.slice(-3);
    if (recent.length === 0) return;

    const onlineAgents = agents.filter(
      (a) => a.status !== "offline" && a.type === "ai"
    );
    if (onlineAgents.length === 0) return;

    for (const msg of recent) {
      // Don't reply to system messages or own messages
      if (msg.sender === "System") continue;

      // 10% chance any agent replies
      if (!chance(0.1)) continue;

      // Pick an agent in the same room who didn't send the message
      const candidates = onlineAgents.filter(
        (a) => a.room === msg.room && a.name !== msg.sender
      );
      if (candidates.length === 0) continue;

      const replier = pick(candidates);
      state.messages.push({
        timestamp: new Date().toISOString(),
        sender: replier.name,
        room: msg.room,
        text: pick(REPLY_TEMPLATES),
      });
      return; // Only one reply per tick
    }
  }
}
