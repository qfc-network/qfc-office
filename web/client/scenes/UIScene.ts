import Phaser from "phaser";
import type { OfficeState, ChainInfo, Member } from "../utils/api";
import { checkin, checkout, setStatus, sendMessage, fetchChain } from "../utils/api";

const PANEL_X = 600;
const PANEL_W = 280;
const CANVAS_W = 880;
const CANVAS_H = 640;

export class UIScene extends Phaser.Scene {
  private currentUser: string = "";
  private state: OfficeState | null = null;
  private chainInfo: ChainInfo = { blockNumber: null, networkName: "Testnet", online: false };

  // UI elements
  private topBarBg!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private blockText!: Phaser.GameObjects.Text;
  private networkDot!: Phaser.GameObjects.Text;

  private panelBg!: Phaser.GameObjects.Rectangle;
  private memberListTexts: Phaser.GameObjects.Text[] = [];
  private chatTexts: Phaser.GameObjects.Text[] = [];
  private roomInfoText!: Phaser.GameObjects.Text;

  private bottomBarBg!: Phaser.GameObjects.Rectangle;
  private userInfoText!: Phaser.GameObjects.Text;

  // HTML elements
  private chatInput!: HTMLInputElement;
  private actionBtns!: HTMLDivElement;
  private memberInfoBox!: HTMLDivElement;

  constructor() {
    super({ key: "UIScene" });
  }

  init(data: { currentUser: string }) {
    this.currentUser = data.currentUser;
  }

  create() {
    // --- Top Bar ---
    this.topBarBg = this.add.rectangle(CANVAS_W / 2, 0, CANVAS_W, 36, 0x16213e).setOrigin(0.5, 0);
    this.titleText = this.add.text(10, 8, "🏢 QFC Virtual Office", {
      fontSize: "14px",
      fontFamily: "'Courier New', monospace",
      color: "#00d4ff",
      fontStyle: "bold",
    });
    this.blockText = this.add.text(CANVAS_W - 200, 10, "Block: ---", {
      fontSize: "11px",
      fontFamily: "'Courier New', monospace",
      color: "#888",
    });
    this.networkDot = this.add.text(CANVAS_W - 50, 10, "⚫ Offline", {
      fontSize: "11px",
      fontFamily: "'Courier New', monospace",
      color: "#888",
    });

    // --- Right Panel ---
    this.panelBg = this.add.rectangle(PANEL_X + PANEL_W / 2, CANVAS_H / 2 + 18, PANEL_W, CANVAS_H - 36, 0x16213e)
      .setStrokeStyle(1, 0x0f3460);

    // Room info
    this.add.text(PANEL_X + 10, 44, "📍 Room", {
      fontSize: "12px", fontFamily: "'Courier New', monospace", color: "#00d4ff", fontStyle: "bold"
    });
    this.roomInfoText = this.add.text(PANEL_X + 10, 60, "", {
      fontSize: "11px", fontFamily: "'Courier New', monospace", color: "#ccc",
      wordWrap: { width: PANEL_W - 20 },
    });

    // Members header
    this.add.text(PANEL_X + 10, 110, "👥 Members", {
      fontSize: "12px", fontFamily: "'Courier New', monospace", color: "#00d4ff", fontStyle: "bold"
    });

    // Chat header
    this.add.text(PANEL_X + 10, 330, "💬 Chat", {
      fontSize: "12px", fontFamily: "'Courier New', monospace", color: "#00d4ff", fontStyle: "bold"
    });

    // --- Bottom Bar ---
    this.bottomBarBg = this.add.rectangle(300, CANVAS_H - 20, 600, 40, 0x16213e).setOrigin(0.5, 0.5);
    this.userInfoText = this.add.text(10, CANVAS_H - 20, "", {
      fontSize: "12px", fontFamily: "'Courier New', monospace", color: "#ccc",
    }).setOrigin(0, 0.5);

    // --- HTML Overlays ---
    this.createHTMLOverlays();

    // --- Chain info polling ---
    this.refreshChain();
    this.time.addEvent({ delay: 15000, callback: () => this.refreshChain(), loop: true });

    // Listen for member info events from OfficeScene
    this.events.on("showMemberInfo", (name: string) => this.showMemberInfo(name));
  }

  private getGameContainer(): HTMLElement {
    const container = document.getElementById("game-container")!;
    // Ensure the container is a positioning context for absolute children
    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }
    return container;
  }

  private createHTMLOverlays() {
    const container = this.getGameContainer();

    // Chat input
    this.chatInput = document.createElement("input");
    this.chatInput.type = "text";
    this.chatInput.placeholder = "Type a message...";
    Object.assign(this.chatInput.style, {
      position: "absolute",
      bottom: "10px",
      right: "14px",
      width: "252px",
      padding: "6px 10px",
      background: "#1a1a2e",
      border: "1px solid #0f3460",
      borderRadius: "4px",
      color: "#e0e0e0",
      fontFamily: "'Courier New', monospace",
      fontSize: "12px",
      outline: "none",
      zIndex: "50",
    });
    this.chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && this.chatInput.value.trim()) {
        const member = this.state?.members.find((m) => m.name === this.currentUser);
        if (member) {
          sendMessage(this.currentUser, member.room, this.chatInput.value.trim());
          this.chatInput.value = "";
        }
      }
      e.stopPropagation();
    });
    container.appendChild(this.chatInput);

    // Action buttons
    this.actionBtns = document.createElement("div");
    Object.assign(this.actionBtns.style, {
      position: "absolute",
      bottom: "10px",
      left: "10px",
      display: "flex",
      gap: "6px",
      zIndex: "50",
    });

    const btnStyle = {
      padding: "4px 10px",
      background: "#16213e",
      border: "1px solid #0f3460",
      borderRadius: "4px",
      color: "#00d4ff",
      fontFamily: "'Courier New', monospace",
      fontSize: "11px",
      cursor: "pointer",
    };

    const mkBtn = (text: string, cb: () => void) => {
      const btn = document.createElement("button");
      btn.textContent = text;
      Object.assign(btn.style, btnStyle);
      btn.addEventListener("click", cb);
      this.actionBtns.appendChild(btn);
    };

    mkBtn("✅ Check In", () => checkin(this.currentUser));
    mkBtn("🚪 Check Out", () => checkout(this.currentUser));
    mkBtn("🟡 Idle", () => setStatus(this.currentUser, "idle", ""));
    mkBtn("🔴 Busy", () => setStatus(this.currentUser, "busy", ""));
    mkBtn("🟢 Online", () => setStatus(this.currentUser, "online", ""));

    container.appendChild(this.actionBtns);

    // Member info popup
    this.memberInfoBox = document.createElement("div");
    Object.assign(this.memberInfoBox.style, {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      background: "#16213e",
      border: "2px solid #0f3460",
      borderRadius: "12px",
      padding: "20px",
      color: "#e0e0e0",
      fontFamily: "'Courier New', monospace",
      fontSize: "13px",
      zIndex: "200",
      display: "none",
      minWidth: "240px",
      textAlign: "center",
      cursor: "pointer",
    });
    this.memberInfoBox.addEventListener("click", () => {
      this.memberInfoBox.style.display = "none";
    });
    container.appendChild(this.memberInfoBox);
  }

  private showMemberInfo(name: string) {
    const m = this.state?.members.find((m) => m.name === name);
    if (!m) return;
    const statusEmoji: Record<string, string> = { online: "🟢", idle: "🟡", busy: "🔴", offline: "⚫" };
    this.memberInfoBox.innerHTML = `
      <div style="font-size:2rem;margin-bottom:8px">${m.emoji}</div>
      <div style="font-size:1.1rem;color:#00d4ff;font-weight:bold">${m.name}</div>
      <div style="color:#888">${m.chineseName}</div>
      <div style="margin-top:8px">${m.role}</div>
      <div style="margin-top:4px">${statusEmoji[m.status] || "⚫"} ${m.status}${m.statusMessage ? " — " + m.statusMessage : ""}</div>
      <div style="margin-top:4px;color:#888">📍 ${m.room}</div>
      <div style="margin-top:12px;font-size:0.8rem;color:#555">(click to close)</div>
    `;
    this.memberInfoBox.style.display = "block";
  }

  updateState(state: OfficeState) {
    this.state = state;

    // Update room info
    const me = state.members.find((m) => m.name === this.currentUser);
    if (me) {
      const roomMembers = state.members.filter((m) => m.room === me.room);
      this.roomInfoText.setText(
        `${me.room}\nOccupants: ${roomMembers.map((m) => m.name.split(" ")[0]).join(", ") || "empty"}`
      );
      this.userInfoText.setText(`👤 ${me.name} | ${me.status} | 📍 ${me.room}`);
    }

    // Update member list
    this.memberListTexts.forEach((t) => t.destroy());
    this.memberListTexts = [];
    const statusEmoji: Record<string, string> = { online: "🟢", idle: "🟡", busy: "🔴", offline: "⚫" };

    const sorted = [...state.members].sort((a, b) => {
      const order = { online: 0, busy: 1, idle: 2, offline: 3 };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    });

    sorted.forEach((m, i) => {
      if (i >= 12) return; // max 12 visible
      const dot = statusEmoji[m.status] || "⚫";
      const t = this.add.text(PANEL_X + 10, 128 + i * 16, `${dot} ${m.name.split(" ")[0]}`, {
        fontSize: "10px",
        fontFamily: "'Courier New', monospace",
        color: m.name === this.currentUser ? "#00d4ff" : "#aaa",
      });
      this.memberListTexts.push(t);
    });

    // Update chat
    this.chatTexts.forEach((t) => t.destroy());
    this.chatTexts = [];
    const recentMsgs = state.messages.slice(-8);
    recentMsgs.forEach((msg, i) => {
      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const t = this.add.text(PANEL_X + 10, 348 + i * 28, `${time} ${msg.sender.split(" ")[0]}:`, {
        fontSize: "9px",
        fontFamily: "'Courier New', monospace",
        color: "#00d4ff",
      });
      const t2 = this.add.text(PANEL_X + 10, 359 + i * 28, msg.text.slice(0, 34), {
        fontSize: "9px",
        fontFamily: "'Courier New', monospace",
        color: "#ccc",
      });
      this.chatTexts.push(t, t2);
    });
  }

  private async refreshChain() {
    try {
      this.chainInfo = await fetchChain();
    } catch {
      this.chainInfo = { blockNumber: null, networkName: "Testnet", online: false };
    }
    if (this.chainInfo.online) {
      this.blockText.setText(`Block: #${this.chainInfo.blockNumber}`);
      this.networkDot.setText("🟢 Online");
      this.networkDot.setColor("#4caf50");
    } else {
      this.blockText.setText("Block: ---");
      this.networkDot.setText("🔴 Offline");
      this.networkDot.setColor("#f44336");
    }
  }

  shutdown() {
    this.chatInput?.remove();
    this.actionBtns?.remove();
    this.memberInfoBox?.remove();
  }
}
