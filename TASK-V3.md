# TASK-V3.md — v3.0 3D Immersive Virtual Office

## Overview
Build the "Hardcore" 3D immersive mode for QFC Virtual Office using Three.js. Same shared state as v1.0 CLI and v2.0 2D web. All code goes in `web3d/` directory.

## Tech Stack
- **Three.js** (lightweight WebGL)
- **Vite + TypeScript**
- **Express server** — reuse the same server from `web/server/index.ts` on port 3210 (extend it to also serve web3d)
- **WebSocket** — same `/ws` endpoint for real-time sync
- **Shared state** — `~/.qfc-office/state.json`

## Architecture
```
web3d/
├── client/
│   ├── main.ts          # Entry point, Three.js setup
│   ├── Office3D.ts      # Office scene with rooms
│   ├── MemberAvatar.ts  # 3D member representation
│   ├── RoomMesh.ts      # Room geometry and labels
│   ├── CameraController.ts  # Orbit + click-to-move
│   ├── UIOverlay.ts     # HTML overlay (chat, members panel, status)
│   └── api.ts           # Reuse from web/client/utils/api.ts (copy or import)
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Design

### Office Layout (3D)
- **Floor**: 40x30 unit plane with grid texture (programmatic)
- **Rooms**: Colored floor regions with low transparent walls (0.5 unit height)
- **Same 6 rooms** as v1.0/v2.0, arranged in a 3x2 grid:
  ```
  [茶水间 Break Room] [会议室A Meeting A]
  [工位区 Workstations] [会议室B Meeting B]  
  [大厅 Lobby ——————————————————]
  [服务器室 Server Room ————————]
  ```
- Room labels: 3D text or HTML labels floating above each room (bilingual)
- Furniture: Simple box geometries (desks = flat boxes, chairs = small cubes, server racks = tall boxes)

### Member Avatars
- **Programmatic** — no external models/textures
- Body: Capsule or box geometry (color by role, same scheme as v2.0)
- Head: Sphere on top
- Name label: HTML overlay or sprite text floating above head
- Status indicator: Colored ring/glow around base (green/yellow/red/gray)
- Emoji: 2D sprite billboard above head
- Idle animation: Gentle bobbing (sine wave on Y axis)
- Click: Show member info popup (same as v2.0)

### Camera
- **Default**: Isometric-ish view (45° angle, looking down at office)
- **OrbitControls**: Mouse drag to rotate, scroll to zoom, right-click to pan
- **Click room to move**: Click a room floor → your avatar walks there (tween animation)
- **Follow mode**: Double-click your avatar to toggle camera follow

### UI Overlay (HTML on top of WebGL canvas)
- **Top bar**: "🏢 QFC Virtual Office 3D" | Block # | Online status
- **Right panel** (same as v2.0): Room info, Members list, Chat
- **Bottom bar**: Check In/Out, Status buttons, current user info
- **Chat input**: Bottom-right
- All HTML positioned absolute within container (not fixed to viewport)

### Lighting
- Ambient light (soft white, intensity 0.6)
- Directional light (sun-like, casting soft shadows)
- Each room has a subtle point light (warm color for 茶水间, cool for 服务器室, etc.)

### Effects
- Soft shadows on floor
- Room hover highlight (glow or brighten floor)
- Member walk animation: Simple lerp/tween from current position to target
- Particle effect on check-in (small burst)

## Server Changes
Modify `web/server/index.ts` to also serve the 3D client:
- Add route: if request comes from `/3d` path, serve `web3d/dist/client/`
- OR: Update the mode selection page to redirect to `/3d/` for Hardcore mode
- Keep the same API endpoints (`/api/*`) and WebSocket (`/ws`)

## Mode Selection Update
Update `web/index.html` menu screen:
- "Hardcore" button should no longer be disabled
- Clicking it navigates to `/3d/` which serves the 3D client
- The 3D client does NOT show the mode selection screen — goes straight to login → 3D office

## package.json
```json
{
  "name": "qfc-office-web3d",
  "version": "3.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:check": "tsc --noEmit"
  },
  "dependencies": {
    "three": "^0.170.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/three": "^0.170.0",
    "vite": "^5.4.0"
  }
}
```

## Constraints
- **NO external assets** — all geometry, textures, and materials are programmatic
- **NO model files** (.glb, .obj, etc.)
- All rendering uses Three.js built-in geometries + materials
- Keep bundle size reasonable (<2MB)
- Do NOT modify `src/` (v1.0 CLI) or `web/client/` (v2.0)
- May modify `web/server/index.ts` to add 3D route serving
- May modify `web/index.html` to enable Hardcore button

## Build & Test
1. `cd web3d && npm install && npm run build`
2. `cd web && npm start` (server serves both 2D and 3D)
3. Open `http://localhost:3210` → click Hardcore → should load 3D office
4. Verify: rooms render, members appear, click to move, chat works, WebSocket sync

## Commit
`feat: v3.0 3D immersive virtual office mode`
