import Phaser from "phaser";

export interface RoomConfig {
  key: string;        // Chinese room name (matches state)
  label: string;      // Display label
  icon: string;       // Emoji
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;      // Background fill
  borderColor: number;
}

// Room layout matching the spec map (800x600 canvas, but we use the left 600x600 area)
// The right 200px is for the UI panel
export const ROOM_CONFIGS: RoomConfig[] = [
  {
    key: "茶水间", label: "Break Room 茶水间", icon: "☕",
    x: 0, y: 0, width: 295, height: 175,
    color: 0xfff3e0, borderColor: 0xffe0b2,
  },
  {
    key: "会议室A", label: "Meeting A 会议室A", icon: "📋",
    x: 305, y: 0, width: 295, height: 175,
    color: 0xe8eaf6, borderColor: 0xc5cae9,
  },
  {
    key: "工位区", label: "Workstations 工位区", icon: "💻",
    x: 0, y: 185, width: 295, height: 175,
    color: 0xe3f2fd, borderColor: 0xbbdefb,
  },
  {
    key: "会议室B", label: "Meeting B 会议室B", icon: "💻",
    x: 305, y: 185, width: 295, height: 175,
    color: 0xfce4ec, borderColor: 0xf8bbd0,
  },
  {
    key: "大厅", label: "Lobby 大厅", icon: "🏢",
    x: 0, y: 370, width: 600, height: 110,
    color: 0xf1f8e9, borderColor: 0xdcedc8,
  },
  {
    key: "服务器室", label: "Server Room 服务器室", icon: "🖥️",
    x: 0, y: 490, width: 600, height: 110,
    color: 0xede7f6, borderColor: 0xd1c4e9,
  },
];

export class RoomZone {
  public zone: Phaser.GameObjects.Zone;
  public bg: Phaser.GameObjects.Rectangle;
  public labelText: Phaser.GameObjects.Text;
  public config: RoomConfig;

  constructor(scene: Phaser.Scene, config: RoomConfig) {
    this.config = config;
    const cx = config.x + config.width / 2;
    const cy = config.y + config.height / 2;

    // Background
    this.bg = scene.add.rectangle(cx, cy, config.width - 4, config.height - 4, config.color, 0.6);
    this.bg.setStrokeStyle(2, config.borderColor);

    // Border/zone for interaction
    this.zone = scene.add.zone(cx, cy, config.width, config.height);
    this.zone.setInteractive({ useHandCursor: true });
    this.zone.setData("roomKey", config.key);

    // Room label
    this.labelText = scene.add.text(config.x + 8, config.y + 6, `${config.icon} ${config.label}`, {
      fontSize: "13px",
      fontFamily: "'Courier New', monospace",
      color: "#555",
      fontStyle: "bold",
    });

    // Add subtle furniture for workstations and meeting rooms
    this.addFurniture(scene, config);
  }

  private addFurniture(scene: Phaser.Scene, config: RoomConfig) {
    const baseX = config.x + 20;
    const baseY = config.y + 40;

    if (config.key === "工位区") {
      // Desks in a grid
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 4; col++) {
          scene.add.rectangle(
            baseX + col * 60 + 25, baseY + row * 50 + 20,
            40, 20, 0xbcaaa4, 0.3
          );
        }
      }
    } else if (config.key === "会议室A" || config.key === "会议室B") {
      // Conference table
      scene.add.rectangle(
        config.x + config.width / 2, config.y + config.height / 2 + 10,
        100, 40, 0xbcaaa4, 0.3
      );
    } else if (config.key === "茶水间") {
      // Counter
      scene.add.rectangle(
        config.x + config.width - 50, config.y + config.height / 2,
        20, 80, 0xbcaaa4, 0.3
      );
    } else if (config.key === "服务器室") {
      // Server racks
      for (let i = 0; i < 5; i++) {
        scene.add.rectangle(
          baseX + i * 80 + 40, baseY + 20,
          30, 50, 0x78909c, 0.25
        );
      }
    }
  }

  highlight(on: boolean) {
    this.bg.setFillStyle(this.config.color, on ? 0.9 : 0.6);
  }
}
