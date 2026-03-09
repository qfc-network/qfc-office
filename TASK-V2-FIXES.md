# TASK-V2-FIXES.md — v2.0 QA Bug Fixes & Polish

## Context
QA testing of v2.0 2D Pixel Art web mode. Server + client both work, but several polish issues found.

## Bugs

### BUG-1: Bottom action buttons and status bar overlap / get cut off
The HTML action buttons (Check In, Check Out, Idle, Busy, Online) and status text at the bottom use `position: fixed; bottom: 40px` which can overlap with or get cut off by the Phaser canvas when the window is resized. The user status bar (`👤 Jarvis Lam | online | 📍 大厅`) is barely visible at the very bottom edge.

**Fix:** Move the bottom bar into the Phaser canvas (already partially done with `bottomBarBg`) and make the HTML buttons position relative to the canvas container, not the viewport. Or increase canvas height to 640 and put buttons inside.

### BUG-2: Chat input position is viewport-fixed, not canvas-relative  
`chatInput` uses `position: fixed; bottom: 10px; right: 14px`. If the browser window is larger than the canvas, the input floats away from the panel.

**Fix:** Position relative to the game container element, or use Phaser DOM elements.

### BUG-3 [RESOLVED]: npm scripts already exist
Scripts already set up correctly in package.json. No fix needed.

### BUG-4: Room labels should show Chinese name too
Room labels only show English (e.g., "Lobby", "Workstations"). Should show bilingual: "🏢 Lobby 大厅" to match the CLI v1.0 experience and state.json keys.

**Fix:** Update `ROOM_CONFIGS` labels to include Chinese: `"Lobby 大厅"`, `"Workstations 工位区"`, etc.

### BUG-5: No member dropdown/autocomplete on login
Users must type exact name. Should show a dropdown of existing team members from state.json for quick selection.

**Fix:** Fetch `/api/state` on page load, populate a `<datalist>` or clickable member list in the modal.

### BUG-6: checkin message logged even if already online
Every time you enter the office, a "[name] checked in" message is added to chat even if the member was already online.

**Fix:** Only add check-in message if status was not already "online".

## Polish / Nice-to-Have

### POLISH-1: Click on room shows room info in panel
Currently clicking a room moves you there. Would be nice to show a tooltip with room description first, and require double-click or a move button to actually move.

### POLISH-2: Member sprite tooltip on hover  
Show name + role + status on hover instead of requiring click for the popup.

### POLISH-3: Responsive scaling
Canvas is fixed 880x600. On small screens it should scale down gracefully (Phaser Scale.FIT is set but HTML overlays don't scale with it).

## Priority
BUG-1 through BUG-4 are P0 (ship blockers for demo).
BUG-5, BUG-6 are P1.
POLISH items are P2.

## Instructions
- All changes in `web/` directory only
- Do NOT modify `src/` (v1.0 CLI)
- Test by running `npm start` (port 3210) and opening browser
- Rebuild with `npm run build` after changes
