import Phaser from "phaser";
import { RoomZone, ROOM_CONFIGS, type RoomConfig } from "../objects/RoomZone";
import { MemberSprite } from "../objects/MemberSprite";
import type { Member, OfficeState } from "../utils/api";
import { moveToRoom } from "../utils/api";

export class OfficeScene extends Phaser.Scene {
  private rooms: Map<string, RoomZone> = new Map();
  private memberSprites: Map<string, MemberSprite> = new Map();
  private currentUser: string = "";
  private state: OfficeState | null = null;

  constructor() {
    super({ key: "OfficeScene" });
  }

  init(data: { currentUser: string }) {
    this.currentUser = data.currentUser;
  }

  create() {
    // Draw subtle grid
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0xcccccc, 0.15);
    for (let x = 0; x <= 600; x += 32) {
      gfx.lineBetween(x, 0, x, 600);
    }
    for (let y = 0; y <= 600; y += 32) {
      gfx.lineBetween(0, y, 600, y);
    }

    // Create room zones
    for (const cfg of ROOM_CONFIGS) {
      const rz = new RoomZone(this, cfg);
      this.rooms.set(cfg.key, rz);

      // Click to move
      rz.zone.on("pointerdown", () => {
        if (this.currentUser) {
          moveToRoom(this.currentUser, cfg.key);
        }
      });

      rz.zone.on("pointerover", () => rz.highlight(true));
      rz.zone.on("pointerout", () => rz.highlight(false));
    }

    // Member click handler (delegated via body rectangles)
    this.input.on("gameobjectdown", (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      const memberName = obj.getData("memberName");
      if (memberName) {
        this.scene.get("UIScene").events.emit("showMemberInfo", memberName);
      }
    });
  }

  updateState(state: OfficeState) {
    this.state = state;

    // Update or create member sprites
    const seenNames = new Set<string>();

    for (const member of state.members) {
      seenNames.add(member.name);
      const pos = this.getMemberPosition(member, state.members);

      if (this.memberSprites.has(member.name)) {
        const sprite = this.memberSprites.get(member.name)!;
        sprite.update(member);
        // Animate if room changed
        if (sprite.container.x !== pos.x || sprite.container.y !== pos.y) {
          sprite.moveTo(pos.x, pos.y);
        }
      } else {
        const sprite = new MemberSprite(this, member, pos.x, pos.y);
        this.memberSprites.set(member.name, sprite);
      }
    }

    // Remove sprites for members no longer in state
    for (const [name, sprite] of this.memberSprites) {
      if (!seenNames.has(name)) {
        sprite.destroy();
        this.memberSprites.delete(name);
      }
    }
  }

  private getMemberPosition(member: Member, allMembers: Member[]): { x: number; y: number } {
    const room = this.rooms.get(member.room);
    if (!room) {
      // Default to lobby center
      return { x: 300, y: 425 };
    }

    const cfg = room.config;
    // Get all members in this room, sorted for stable positioning
    const roomMembers = allMembers
      .filter((m) => m.room === member.room)
      .sort((a, b) => a.name.localeCompare(b.name));

    const idx = roomMembers.indexOf(member);
    const cols = Math.max(1, Math.floor((cfg.width - 40) / 55));
    const row = Math.floor(idx / cols);
    const col = idx % cols;

    const startX = cfg.x + 35;
    const startY = cfg.y + 50;

    return {
      x: startX + col * 55,
      y: startY + row * 50,
    };
  }
}
