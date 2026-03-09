# QFC Virtual Office v2.0 — 2D Pixel Art Mode

Build a web-based 2D pixel art virtual office that shares state with the CLI (v1.0).

## Tech Stack
- **Game Engine**: Phaser 3 (lightweight 2D game framework)
- **Build Tool**: Vite
- **Language**: TypeScript
- **Backend**: Express.js server (reads/writes same `~/.qfc-office/state.json`)
- **WebSocket**: ws (real-time state sync between clients)
- **Assets**: Programmatic pixel art (colored rectangles + emoji, no external sprites needed for MVP)

## Architecture

```
qfc-office/
├── src/              # v1.0 CLI (existing)
├── web/              # v2.0 2D Pixel Art
│   ├── server/
│   │   └── index.ts  # Express + WebSocket server
│   ├── client/
│   │   ├── main.ts       # Phaser game entry
│   │   ├── scenes/
│   │   │   ├── OfficeScene.ts    # Main office scene
│   │   │   └── UIScene.ts       # HUD overlay (chat, status)
│   │   ├── objects/
│   │   │   ├── MemberSprite.ts   # Team member pixel avatar
│   │   │   └── RoomZone.ts       # Room boundaries
│   │   └── utils/
│   │       └── api.ts            # WebSocket client
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
```

## Server API

Express server on port 3210:

```
GET  /api/state          → full office state
POST /api/checkin        → { name: string }
POST /api/checkout       → { name: string }
POST /api/status         → { name: string, status: string, message: string }
POST /api/move           → { name: string, room: string }
POST /api/message        → { name: string, room: string, content: string }
GET  /api/chain          → { blockNumber, networkName, online }

WebSocket /ws            → real-time state push on any change
```

The server reads/writes the SAME `~/.qfc-office/state.json` that the CLI uses. Changes from CLI are picked up by the server on next read, and vice versa.

## Office Map Layout

Top-down pixel art office (800x600 canvas):

```
┌──────────────────────────────────────────────────┐
│  ☕ Break Room (160x150)  │  📋 Meeting A (160x150) │
│                           │                         │
│                           │                         │
├───────────────────────────┼─────────────────────────┤
│                           │                         │
│  💻 Workstations          │  💻 Meeting B (160x150)  │
│     (320x150)             │                         │
│                           │                         │
├───────────────────────────┴─────────────────────────┤
│                                                      │
│  🏢 Lobby (480x150)                                  │
│                                                      │
├──────────────────────┬───────────────────────────────┤
│  🚪 Entrance         │  🖥️ Server Room (240x150)     │
│     (240x150)        │                               │
└──────────────────────┴───────────────────────────────┘
```

Room boundaries defined as rectangles in the Phaser scene. Each room has:
- Background color (light tint, different per room)
- Room label text
- Furniture indicators (desks = small dark rectangles, chairs = smaller rectangles)

## Member Avatars

Each member rendered as:
- 24x24 colored rectangle (body)
- 8x8 colored rectangle on top (head)
- Color based on role (human = blue, QA = green, engineer = orange, etc.)
- Emoji indicator above: 👤 or 🤖
- Name label below (small text)
- Status dot: 🟢 green (online), 🟡 yellow (idle), 🔴 red (busy), ⚫ gray (offline)
- Speech bubble when there's a statusMessage

Members are positioned within their assigned room. When they move rooms, animate a simple walk (slide) to the new position.

## UI Overlay (UIScene)

Right side panel (200px wide):
- **Chat panel**: Shows recent messages, input box at bottom
- **Member list**: Compact list with status dots
- **Room info**: Current room name and occupants

Top bar:
- "🏢 QFC Virtual Office" title
- Block height (live from chain)
- Network status indicator

Bottom bar:
- Current user info
- Quick action buttons: Check In / Check Out / Set Status

## Interactions

- **Click on a room**: Move current user there
- **Click on a member**: Show their profile (name, role, status)
- **Chat input**: Type message, press Enter to send to current room
- **Status dropdown**: Click to change status

## Visual Style

- **Palette**: Soft pastels for room backgrounds, darker borders
- **Grid**: Optional subtle grid lines (16px or 32px)
- **Font**: Monospace for labels, system font for chat
- **Style**: Clean, minimal pixel art — think Gather.town but simpler

## Game Difficulty Selection Screen

On first load, show a fun "difficulty selection" screen:

```
🏢 QFC Virtual Office

Select your mode:

  ☕ Casual     — Terminal (v1.0)     [Link to CLI docs]
  ⚔️ Normal     — 2D Pixel (v2.0)    [Click to enter]
  💀 Hardcore   — 3D Immersive (v3.0) [Coming Soon]
```

After clicking "Normal", transition to the office scene.

## Real-time Sync

1. Server watches `state.json` for changes (fs.watch or poll every 2s)
2. On any state change, broadcast full state via WebSocket to all clients
3. Client actions (move, message, status) → POST to server → server updates state → broadcasts

## Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"tsx watch web/server/index.ts\" \"vite\"",
    "build": "vite build",
    "start": "tsx web/server/index.ts"
  }
}
```

## Requirements

1. Must share state with CLI v1.0 (same state.json)
2. No external sprite/image assets — all programmatic (rectangles, text, emoji)
3. Works in Chrome/Firefox/Safari
4. Mobile responsive (scale down, hide side panel on small screens)
5. WebSocket for real-time updates
6. Fun difficulty selection screen on first load
7. Animate member movement between rooms (simple tween)

## Do NOT:
- Use React/Vue/Angular (vanilla + Phaser is enough)
- Require user authentication (anyone can open the URL)
- Use external sprite sheets or tilesets (programmatic art only)
- Build the 3D mode (that's v3.0)
