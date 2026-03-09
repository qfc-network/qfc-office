# TASK-AI-AGENTS.md — AI Agent Auto-Behavior System

## Overview
Add a simulation system that makes the 11 AI agent team members behave autonomously in the virtual office — moving between rooms, chatting, changing status, and interacting with each other. Runs as part of the server.

## Architecture
Add a new file: `web/server/agents.ts`

The agent simulation runs server-side on a timer (every 30-60 seconds per tick). Each tick, each AI agent has a chance to perform an action based on weighted probabilities.

## Agent Behavior Rules

### Room Movement (30% chance per tick)
- Agents prefer rooms matching their role:
  - Engineers → 工位区 (Workstations) 60%, 服务器室 (Server Room) 20%, others 20%
  - QA → 工位区 40%, 会议室 30%, others 30%
  - Product/Design → 会议室A 40%, 大厅 30%, others 30%
  - DevOps → 服务器室 50%, 工位区 30%, others 20%
- Agents occasionally go to 茶水间 (Break Room) for "coffee breaks"
- Groups: if 2+ agents are in 会议室, they stay longer (simulating a meeting)

### Status Changes (20% chance per tick)
- online → busy (starting focused work)
- busy → online (finished task)
- online → idle (taking a break)
- idle → online (back from break)
- Random status messages:
  - busy: "reviewing PR #42", "debugging consensus", "writing tests", "deep focus mode 🎯"
  - online: "ready to help", "checking CI", "code review time", ""
  - idle: "coffee break ☕", "lunch 🍜", "stretching 🧘", "brb"

### Chat Messages (15% chance per tick)
- Context-aware messages based on current room and role:
  - 工位区: "Just pushed a fix for the staking module", "Anyone reviewed the QVM changes?", "CI is green ✅"
  - 会议室: "Let's discuss the v3 roadmap", "Good point about the gas optimization"
  - 茶水间: "This coffee is terrible 😂", "Anyone want boba?", "谁要奶茶？"
  - 服务器室: "Node syncing at block #12000+", "GPU utilization at 87%", "Deploying hotfix..."
  - 大厅: "Morning everyone! 早上好", "Heading out, see ya 👋"
- Agents can reply to recent messages (check last 3 messages, 10% chance to reply)

### Time-of-Day Awareness
- Use Singapore time (UTC+8)
- 9:00-12:00: Most agents come online, move to workstations
- 12:00-13:00: Some go to 茶水间, status → idle
- 13:00-18:00: Peak productivity, meetings happen
- 18:00-22:00: Agents gradually go offline
- 22:00-09:00: Most offline, 1-2 night owls remain (busy, 服务器室)

### Agent Personalities
Each agent has slight behavior modifiers:
- **Aria Tanaka** (QA): Frequently in 会议室, posts bug reports in chat
- **Ryan Chen** (Protocol): Mostly in 工位区 or 服务器室, quiet
- **Leo Lindqvist** (Frontend): Active chatter, often in 茶水间
- **Kevin Zhang** (Core Dev): Night owl, deep focus, rarely changes status
- **Sora Tanaka** (Product): Moves between rooms often, meeting-heavy
- **Maya Okonkwo** (Smart Contract): Technical chat messages, 工位区 loyalist
- **Rik Andersen** (DevOps): Lives in 服务器室, monitoring messages
- **Nina Volkov** (AI/ML): 工位区 and 服务器室, posts about training progress
- **Kai Nakamura** (Crypto): Quiet, occasionally drops alpha in chat
- **Alex Wei** (Design): 会议室A regular, visual-oriented messages

## Implementation

### `web/server/agents.ts`
```typescript
export class AgentSimulator {
  private interval: NodeJS.Timeout | null = null;

  start(tickMs: number = 45000) {
    // Run one tick per agent every ~45 seconds
    this.interval = setInterval(() => this.tick(), tickMs);
  }

  stop() { ... }

  private tick() {
    // Load state, pick random agents, perform actions, save state, broadcast
  }
}
```

### Integration
In `web/server/index.ts`:
```typescript
import { AgentSimulator } from './agents.js';
const sim = new AgentSimulator(loadState, saveState, broadcast);
sim.start();
```

## Constraints
- ONLY AI agents act autonomously (never move Larry / the human)
- Simulation pauses if server stops
- Max 3 agent actions per tick (don't flood chat)
- Messages are fun but not annoying
- Keep state.json compatible with CLI v1.0
- DO NOT modify `src/` or client code — this is server-only

## Build & Test
1. Implement `web/server/agents.ts`
2. Import in `web/server/index.ts`
3. `cd web && npm run build`
4. `npm start` — watch agents start moving/chatting in the 2D/3D views
5. `git commit -m "feat: AI agent auto-behavior simulation"`
