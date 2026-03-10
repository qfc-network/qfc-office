import Phaser from "phaser";
import { OfficeScene } from "./scenes/OfficeScene";
import { UIScene } from "./scenes/UIScene";
import { OfficeSocket, fetchState, checkin } from "./utils/api";
import {
  getWalletState,
  checkInOnChain,
  initChainUI,
} from "./chain";

// --- Menu Screen Logic ---
const menuScreen = document.getElementById("menu-screen")!;
const gameContainer = document.getElementById("game-container")!;
const nameModal = document.getElementById("name-modal")!;
const nameInput = document.getElementById("name-input") as HTMLInputElement;
const nameSubmit = document.getElementById("name-submit")!;

// Populate member datalist from server state
fetchState().then((state) => {
  const datalist = document.getElementById("member-list")!;
  for (const m of state.members) {
    const opt = document.createElement("option");
    opt.value = m.name;
    opt.textContent = `${m.emoji} ${m.name} (${m.chineseName})`;
    datalist.appendChild(opt);
  }
}).catch(() => {});

// Casual → link to CLI docs
document.getElementById("btn-casual")!.addEventListener("click", () => {
  alert("Run `npm run dev` in the qfc-office root to use the CLI (v1.0).");
});

// Hardcore → coming soon
document.getElementById("btn-hardcore")!.addEventListener("click", () => {
  // disabled
});

// Normal → show name modal
document.getElementById("btn-normal")!.addEventListener("click", () => {
  nameModal.classList.add("show");
  nameInput.focus();
});

function startGame(userName: string) {
  nameModal.classList.remove("show");
  menuScreen.style.display = "none";
  gameContainer.style.display = "block";

  // Initialize Phaser
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 880,
    height: 640,
    parent: "game-container",
    backgroundColor: "#f5f5f5",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [OfficeScene, UIScene],
  };

  const game = new Phaser.Game(config);

  // Wait for scenes to be ready, then wire up state
  game.events.once("ready", () => {
    const officeScene = game.scene.getScene("OfficeScene") as OfficeScene;
    const uiScene = game.scene.getScene("UIScene") as UIScene;

    // Start both scenes with user info
    game.scene.start("OfficeScene", { currentUser: userName });
    game.scene.start("UIScene", { currentUser: userName });

    // Check in the user
    checkin(userName).catch(() => {});

    // Fetch initial state
    fetchState().then((state) => {
      officeScene.updateState(state);
      uiScene.updateState(state);
    });

    // WebSocket for real-time updates
    const socket = new OfficeSocket();
    socket.onState((state) => {
      officeScene.updateState(state);
      uiScene.updateState(state);
    });
    socket.connect();
  });
}

nameSubmit.addEventListener("click", () => {
  const name = nameInput.value.trim();
  if (name) startGame(name);
});

nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const name = nameInput.value.trim();
    if (name) startGame(name);
  }
});

// ── Chain integration (wallet UI via SDK) ──────────
initChainUI();

// Expose chain functions for Phaser scenes
(window as any).__qfcChain = { getWalletState, checkInOnChain };
