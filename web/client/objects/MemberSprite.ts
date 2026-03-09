import Phaser from "phaser";
import type { Member } from "../utils/api";

// Color based on role keywords
function roleColor(role: string, type: string): number {
  if (type === "human") return 0x42a5f5; // blue
  const r = role.toLowerCase();
  if (r.includes("qa")) return 0x66bb6a;         // green
  if (r.includes("devops")) return 0xab47bc;      // purple
  if (r.includes("frontend")) return 0xef5350;    // red
  if (r.includes("product")) return 0xffa726;     // orange
  if (r.includes("protocol")) return 0x26c6da;    // cyan
  if (r.includes("crypto")) return 0xec407a;      // pink
  if (r.includes("smart contract")) return 0x7e57c2; // deep purple
  if (r.includes("ai/ml")) return 0xffee58;       // yellow
  if (r.includes("core") || r.includes("lead")) return 0xff7043; // deep orange
  return 0x78909c; // default grey
}

const STATUS_COLORS: Record<string, string> = {
  online: "#4caf50",
  idle: "#ffeb3b",
  busy: "#f44336",
  offline: "#9e9e9e",
};

export class MemberSprite {
  public container: Phaser.GameObjects.Container;
  public member: Member;
  private body: Phaser.GameObjects.Rectangle;
  private head: Phaser.GameObjects.Rectangle;
  private nameLabel: Phaser.GameObjects.Text;
  private emojiLabel: Phaser.GameObjects.Text;
  private statusDot: Phaser.GameObjects.Text;
  private bubble: Phaser.GameObjects.Text | null = null;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, member: Member, x: number, y: number) {
    this.scene = scene;
    this.member = member;

    const color = roleColor(member.role, member.type);

    // Body (24x24)
    this.body = scene.add.rectangle(0, 0, 24, 24, color);
    this.body.setStrokeStyle(1, 0x333333);

    // Head (8x8)
    this.head = scene.add.rectangle(0, -16, 12, 12, color);
    this.head.setStrokeStyle(1, 0x333333);
    // Lighter head
    this.head.setFillStyle(Phaser.Display.Color.IntegerToColor(color).brighten(30).color);

    // Emoji above
    this.emojiLabel = scene.add.text(0, -32, member.emoji, {
      fontSize: "12px",
    }).setOrigin(0.5);

    // Status dot
    this.statusDot = scene.add.text(14, -8, "●", {
      fontSize: "10px",
      color: STATUS_COLORS[member.status] || "#9e9e9e",
    }).setOrigin(0.5);

    // Name below
    this.nameLabel = scene.add.text(0, 18, member.name.split(" ")[0], {
      fontSize: "9px",
      fontFamily: "'Courier New', monospace",
      color: "#444",
    }).setOrigin(0.5);

    this.container = scene.add.container(x, y, [
      this.body, this.head, this.emojiLabel, this.statusDot, this.nameLabel,
    ]);

    // Make interactive
    this.body.setInteractive({ useHandCursor: true });
    this.body.setData("memberName", member.name);

    // Bubble
    this.updateBubble(member.statusMessage);
  }

  updateBubble(message: string) {
    if (this.bubble) {
      this.bubble.destroy();
      this.bubble = null;
    }
    if (message) {
      const text = message.length > 20 ? message.slice(0, 18) + "…" : message;
      this.bubble = this.scene.add.text(0, -46, `💬 ${text}`, {
        fontSize: "8px",
        fontFamily: "'Courier New', monospace",
        color: "#333",
        backgroundColor: "#ffffffcc",
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5);
      this.container.add(this.bubble);
    }
  }

  update(member: Member) {
    this.member = member;
    this.statusDot.setColor(STATUS_COLORS[member.status] || "#9e9e9e");
    this.emojiLabel.setText(member.emoji);
    this.nameLabel.setText(member.name.split(" ")[0]);
    this.updateBubble(member.statusMessage);
  }

  moveTo(x: number, y: number, duration = 500) {
    this.scene.tweens.add({
      targets: this.container,
      x, y,
      duration,
      ease: "Power2",
    });
  }

  destroy() {
    this.container.destroy();
  }
}
