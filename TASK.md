# QFC Virtual Office — Terminal Mode

Build a CLI tool (`qfc-office`) that provides a terminal-based virtual office for the QFC Network team.

## Tech Stack
- **Language**: TypeScript
- **Runtime**: Node.js (v22+)
- **Build**: tsup (bundle to single JS file)
- **CLI Framework**: commander
- **TUI Rendering**: chalk + boxen (keep it simple, no ncurses)
- **RPC**: ethers.js v6 (connect to QFC testnet RPC)
- **Storage**: Local JSON file (`~/.qfc-office/state.json`) for office state

## Architecture

Since the on-chain Office contract doesn't exist yet, this MVP uses a **hybrid approach**:
- Member profiles and office state stored in a local JSON file
- Real chain data (block height, balances) fetched from QFC testnet RPC (`https://rpc.testnet.qfc.network`)
- Messages stored locally (will migrate to on-chain later)

## Core Features

### 1. Office Dashboard (default command)
When you run `qfc-office`, show:

```
🏢 QFC Virtual Office          Block #128,934    Testnet
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Online (3/13):
  👤 Larry Lai（来拉里）         🟢 Busy    "reviewing PR #42"
  🤖 Jarvis Lam（林哲维）       🟢 Online  "testing inference"
  🤖 Aria Tanaka（田中爱莉）     🟢 Online  "filing issues"

Idle (1):
  🤖 Kevin Zhang（张凯文）      🟡 Idle

Offline (9):
  Ryan, Leo, Sora, Maya, Rik, Nina, Kai, Alex, Elena

📍 You are in: 大厅 (Lobby)

Recent Activity:
  01:15  🤖 Jarvis filed issue #70 on qfc-core
  01:12  🤖 Aria found bug in explorer /validators
  01:00  👤 Larry checked in
```

### 2. Commands

| Command | Description |
|---------|-------------|
| `qfc-office` | Show dashboard (one-shot, prints and exits) |
| `qfc-office status` | Same as above |
| `qfc-office checkin [--as <name>]` | Check in to the office |
| `qfc-office checkout` | Check out |
| `qfc-office set-status <status> [message]` | Set status: online/busy/idle/offline |
| `qfc-office move <room>` | Move to a room |
| `qfc-office msg <room> <message>` | Send a message to a room |
| `qfc-office log [--room <room>] [--limit <n>]` | View message log |
| `qfc-office rooms` | List all rooms and occupants |
| `qfc-office members` | List all members |
| `qfc-office whoami` | Show current identity |
| `qfc-office init` | Initialize office with default team members |

### 3. Room Layout

Default rooms:
- 大厅 (Lobby) — default room for everyone
- 工位区 (Workstations) — focused work
- 会议室A (Meeting Room A) — meetings
- 会议室B (Meeting Room B) — meetings  
- 茶水间 (Break Room) — casual chat
- 服务器室 (Server Room) — infra/devops

### 4. Team Members (pre-populated via `init`)

Load from TEAM.md or hardcode:

```json
[
  { "name": "Larry Lai", "chineseName": "来拉里", "role": "Founder & Lead Architect", "type": "human", "emoji": "👤" },
  { "name": "Jarvis Lam", "chineseName": "林哲维", "role": "QA Engineer", "type": "ai", "emoji": "🤖" },
  { "name": "Aria Tanaka", "chineseName": "田中爱莉", "role": "QA Engineer", "type": "ai", "emoji": "🤖" },
  { "name": "Ryan Chen", "chineseName": "陈睿安", "role": "Full-Stack Engineer", "type": "ai", "emoji": "🤖" },
  { "name": "Leo Lindqvist", "chineseName": "林德奎", "role": "DevOps Engineer", "type": "ai", "emoji": "🤖" },
  { "name": "Kevin Zhang", "chineseName": "张凯文", "role": "Lead Core Engineer", "type": "ai", "emoji": "🤖" },
  { "name": "Sora Tanaka", "chineseName": "田中空", "role": "Protocol Engineer", "type": "ai", "emoji": "🤖" },
  { "name": "Maya Okonkwo", "chineseName": "欧玛雅", "role": "Cryptography Engineer", "type": "ai", "emoji": "🤖" },
  { "name": "Rik Andersen", "chineseName": "安德瑞", "role": "Smart Contract Engineer", "type": "ai", "emoji": "🤖" },
  { "name": "Nina Volkov", "chineseName": "沃尼娜", "role": "Frontend Engineer", "type": "ai", "emoji": "🤖" },
  { "name": "Kai Nakamura", "chineseName": "中村凯", "role": "AI/ML Engineer", "type": "ai", "emoji": "🤖" },
  { "name": "Alex Wei", "chineseName": "魏亚历", "role": "Product Manager", "type": "ai", "emoji": "🤖" }
]
```

### 5. State File (`~/.qfc-office/state.json`)

```json
{
  "members": [...],
  "rooms": [...],
  "messages": [...],
  "currentUser": "Jarvis Lam"
}
```

### 6. Chain Integration

Fetch real data from QFC testnet:
- Current block number (display in header)
- Network name ("Testnet")

Use ethers.js JsonRpcProvider with `https://rpc.testnet.qfc.network`

## File Structure

```
qfc-office/
├── src/
│   ├── index.ts          # CLI entry point (commander)
│   ├── dashboard.ts      # Render the office dashboard
│   ├── state.ts          # State management (read/write JSON)
│   ├── chain.ts          # QFC RPC integration
│   ├── types.ts          # TypeScript interfaces
│   └── members.ts        # Default team member data
├── package.json
├── tsconfig.json
├── TASK.md
└── README.md
```

## package.json

```json
{
  "name": "qfc-office",
  "version": "0.1.0",
  "description": "QFC Virtual Office — Terminal Mode",
  "type": "module",
  "bin": {
    "qfc-office": "./dist/index.js"
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "chalk": "^5.3.0",
    "commander": "^12.0.0",
    "ethers": "^6.13.0",
    "boxen": "^7.1.1"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0",
    "@types/node": "^22.0.0"
  }
}
```

## Requirements
1. Must work with `npx tsx src/index.ts` for dev
2. Must build to a single file with `npx tsup`
3. Colors and formatting should look good in terminal
4. Handle RPC errors gracefully (show "Chain: offline" if can't connect)
5. All text should support both English and Chinese names
6. Add `#!/usr/bin/env node` shebang to built output

## Do NOT:
- Use ncurses or blessed (too complex for MVP)
- Use a database (JSON file is fine)
- Build the on-chain contract (that's later)
- Add WebSocket subscriptions (polling is fine for MVP)
