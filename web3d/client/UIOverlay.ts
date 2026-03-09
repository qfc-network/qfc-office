import type { OfficeState, Member, Message, ChainInfo } from "./api";

const STATUS_EMOJI: Record<string, string> = {
  online: "🟢",
  idle: "🟡",
  busy: "🔴",
  offline: "⚫",
};

export class UIOverlay {
  container: HTMLDivElement;
  private topBar: HTMLDivElement;
  private rightPanel: HTMLDivElement;
  private bottomBar: HTMLDivElement;
  private memberInfoPopup: HTMLDivElement;

  private blockSpan!: HTMLSpanElement;
  private netStatusSpan!: HTMLSpanElement;
  private membersListDiv!: HTMLDivElement;
  private chatDiv!: HTMLDivElement;
  private chatInput!: HTMLInputElement;
  private userInfoSpan!: HTMLSpanElement;

  currentUser: string | null = null;
  private state: OfficeState | null = null;

  onCheckin?: (name: string) => void;
  onCheckout?: (name: string) => void;
  onStatusChange?: (status: string) => void;
  onSendMessage?: (text: string) => void;
  onMemberClick?: (name: string) => void;

  constructor(parent: HTMLElement) {
    this.container = document.createElement("div");
    this.container.style.cssText = `
      position: absolute; inset: 0; pointer-events: none;
      font-family: 'Courier New', monospace;
    `;
    parent.appendChild(this.container);

    // Top bar
    this.topBar = this.makeDiv(`
      position: absolute; top: 0; left: 0; right: 0; height: 36px;
      background: rgba(22,33,62,0.9); border-bottom: 1px solid #0f3460;
      display: flex; align-items: center; padding: 0 12px; gap: 16px;
      font-size: 13px; color: #e0e0e0; pointer-events: auto; z-index: 10;
    `);
    this.topBar.innerHTML = `
      <span style="color:#00d4ff;font-weight:bold;">🏢 QFC Virtual Office 3D</span>
      <span style="color:#888">|</span>
      <span id="ui3d-block" style="color:#aaa">Block #...</span>
      <span style="color:#888">|</span>
      <span id="ui3d-net" style="color:#4caf50">● Online</span>
    `;
    this.container.appendChild(this.topBar);
    this.blockSpan = this.topBar.querySelector("#ui3d-block")!;
    this.netStatusSpan = this.topBar.querySelector("#ui3d-net")!;

    // Right panel
    this.rightPanel = this.makeDiv(`
      position: absolute; top: 36px; right: 0; bottom: 40px; width: 280px;
      background: rgba(22,33,62,0.92); border-left: 1px solid #0f3460;
      display: flex; flex-direction: column; pointer-events: auto; z-index: 10;
      overflow: hidden;
    `);
    this.rightPanel.innerHTML = `
      <div style="padding:8px 10px;border-bottom:1px solid #0f3460;color:#00d4ff;font-weight:bold;font-size:12px;">
        Members
      </div>
      <div id="ui3d-members" style="flex:1;overflow-y:auto;padding:4px 0;font-size:11px;"></div>
      <div style="padding:8px 10px;border-top:1px solid #0f3460;border-bottom:1px solid #0f3460;color:#00d4ff;font-weight:bold;font-size:12px;">
        Chat
      </div>
      <div id="ui3d-chat" style="flex:1;overflow-y:auto;padding:6px;font-size:11px;color:#ccc;"></div>
      <div style="padding:6px;border-top:1px solid #0f3460;">
        <input id="ui3d-chat-input" type="text" placeholder="Type message..."
          style="width:100%;padding:6px 8px;background:#1a1a2e;border:1px solid #0f3460;
          border-radius:4px;color:#e0e0e0;font-family:'Courier New',monospace;font-size:12px;outline:none;" />
      </div>
    `;
    this.container.appendChild(this.rightPanel);
    this.membersListDiv = this.rightPanel.querySelector("#ui3d-members")!;
    this.chatDiv = this.rightPanel.querySelector("#ui3d-chat")!;
    this.chatInput = this.rightPanel.querySelector("#ui3d-chat-input")!;

    this.chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && this.chatInput.value.trim()) {
        this.onSendMessage?.(this.chatInput.value.trim());
        this.chatInput.value = "";
      }
    });

    // Bottom bar
    this.bottomBar = this.makeDiv(`
      position: absolute; bottom: 0; left: 0; right: 280px; height: 40px;
      background: rgba(22,33,62,0.9); border-top: 1px solid #0f3460;
      display: flex; align-items: center; padding: 0 12px; gap: 8px;
      font-size: 12px; color: #e0e0e0; pointer-events: auto; z-index: 10;
    `);
    this.bottomBar.innerHTML = `
      <button class="ui3d-btn" id="ui3d-checkin">Check In</button>
      <button class="ui3d-btn" id="ui3d-checkout">Check Out</button>
      <span style="color:#333">|</span>
      <button class="ui3d-btn ui3d-status-btn" data-status="online">🟢</button>
      <button class="ui3d-btn ui3d-status-btn" data-status="busy">🔴</button>
      <button class="ui3d-btn ui3d-status-btn" data-status="idle">🟡</button>
      <span style="flex:1"></span>
      <span id="ui3d-userinfo" style="color:#888;font-size:11px;"></span>
    `;
    this.container.appendChild(this.bottomBar);
    this.userInfoSpan = this.bottomBar.querySelector("#ui3d-userinfo")!;

    // Style for buttons
    const style = document.createElement("style");
    style.textContent = `
      .ui3d-btn {
        padding: 4px 10px; background: #0f3460; border: 1px solid #1a5276;
        color: #e0e0e0; border-radius: 4px; cursor: pointer;
        font-family: 'Courier New', monospace; font-size: 11px;
      }
      .ui3d-btn:hover { background: #1a5276; }
    `;
    document.head.appendChild(style);

    // Button events
    this.bottomBar.querySelector("#ui3d-checkin")!.addEventListener("click", () => {
      if (this.currentUser) this.onCheckin?.(this.currentUser);
    });
    this.bottomBar.querySelector("#ui3d-checkout")!.addEventListener("click", () => {
      if (this.currentUser) this.onCheckout?.(this.currentUser);
    });
    this.bottomBar.querySelectorAll(".ui3d-status-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const s = (btn as HTMLElement).dataset.status!;
        this.onStatusChange?.(s);
      });
    });

    // Member info popup
    this.memberInfoPopup = this.makeDiv(`
      position: absolute; display: none; background: rgba(22,33,62,0.95);
      border: 1px solid #0f3460; border-radius: 8px; padding: 12px;
      font-size: 12px; color: #e0e0e0; pointer-events: auto; z-index: 50;
      min-width: 180px;
    `);
    this.container.appendChild(this.memberInfoPopup);

    // Close popup on click outside
    this.container.addEventListener("click", (e) => {
      if (!this.memberInfoPopup.contains(e.target as Node)) {
        this.memberInfoPopup.style.display = "none";
      }
    });
  }

  private makeDiv(style: string): HTMLDivElement {
    const div = document.createElement("div");
    div.style.cssText = style;
    return div;
  }

  updateChain(info: ChainInfo) {
    this.blockSpan.textContent = info.blockNumber ? `Block #${info.blockNumber}` : "Block #...";
    if (info.online) {
      this.netStatusSpan.innerHTML = `<span style="color:#4caf50">● Online</span>`;
    } else {
      this.netStatusSpan.innerHTML = `<span style="color:#f44336">● Offline</span>`;
    }
  }

  updateState(state: OfficeState) {
    this.state = state;

    // User info
    if (this.currentUser) {
      const me = state.members.find((m) => m.name === this.currentUser);
      if (me) {
        this.userInfoSpan.textContent = `${me.emoji} ${me.name} — ${me.room} [${me.status}]`;
      }
    }

    // Members list
    const sorted = [...state.members].sort((a, b) => {
      const ord = { online: 0, busy: 1, idle: 2, offline: 3 };
      return (ord[a.status] ?? 3) - (ord[b.status] ?? 3);
    });
    this.membersListDiv.innerHTML = sorted
      .map(
        (m) => `
        <div style="padding:3px 10px;cursor:pointer;${m.name === this.currentUser ? "background:#0f3460;" : ""}"
             class="ui3d-member-item" data-name="${this.escHtml(m.name)}">
          ${STATUS_EMOJI[m.status] || "⚫"} ${this.escHtml(m.name)}
          <span style="color:#666;font-size:10px;">${this.escHtml(m.room)}</span>
        </div>
      `
      )
      .join("");

    this.membersListDiv.querySelectorAll(".ui3d-member-item").forEach((el) => {
      el.addEventListener("click", () => {
        const name = (el as HTMLElement).dataset.name!;
        this.showMemberInfo(name);
      });
    });

    // Chat messages
    const msgs = state.messages.slice(-30);
    this.chatDiv.innerHTML = msgs
      .map((m) => {
        const time = new Date(m.timestamp).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const color = m.sender === "System" ? "#666" : "#00d4ff";
        return `<div style="margin-bottom:3px"><span style="color:#555">[${time}]</span> <span style="color:${color}">${this.escHtml(m.sender)}</span>: ${this.escHtml(m.text)}</div>`;
      })
      .join("");
    this.chatDiv.scrollTop = this.chatDiv.scrollHeight;
  }

  showMemberInfo(name: string) {
    if (!this.state) return;
    const m = this.state.members.find((x) => x.name === name);
    if (!m) return;
    this.memberInfoPopup.style.display = "block";
    this.memberInfoPopup.style.left = "50%";
    this.memberInfoPopup.style.top = "50%";
    this.memberInfoPopup.style.transform = "translate(-50%, -50%)";
    this.memberInfoPopup.innerHTML = `
      <div style="font-size:18px;margin-bottom:6px;">${m.emoji}</div>
      <div style="color:#00d4ff;font-weight:bold;font-size:14px;">${this.escHtml(m.name)}</div>
      <div style="color:#888;">${this.escHtml(m.chineseName)}</div>
      <div style="margin-top:4px;">Role: ${this.escHtml(m.role)}</div>
      <div>Type: ${m.type}</div>
      <div>Status: ${STATUS_EMOJI[m.status] || "⚫"} ${m.status}</div>
      <div>Room: ${this.escHtml(m.room)}</div>
      ${m.statusMessage ? `<div style="margin-top:4px;color:#aaa;">💬 ${this.escHtml(m.statusMessage)}</div>` : ""}
    `;
    this.onMemberClick?.(name);
  }

  private escHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
}
