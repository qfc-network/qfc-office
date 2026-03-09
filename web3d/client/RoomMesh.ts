import * as THREE from "three";

export interface RoomDef {
  name: string;
  chineseName: string;
  x: number;
  z: number;
  w: number;
  d: number;
  floorColor: number;
  lightColor: number;
}

export const ROOM_DEFS: RoomDef[] = [
  { name: "茶水间", chineseName: "茶水间", x: -10, z: -11.25, w: 19, d: 6.5, floorColor: 0xfff3e0, lightColor: 0xffcc80 },
  { name: "会议室A", chineseName: "会议室A", x: 10, z: -11.25, w: 19, d: 6.5, floorColor: 0xe8eaf6, lightColor: 0x9fa8da },
  { name: "工位区", chineseName: "工位区", x: -10, z: -3.75, w: 19, d: 6.5, floorColor: 0xe3f2fd, lightColor: 0x90caf9 },
  { name: "会议室B", chineseName: "会议室B", x: 10, z: -3.75, w: 19, d: 6.5, floorColor: 0xfce4ec, lightColor: 0xf48fb1 },
  { name: "大厅", chineseName: "大厅", x: 0, z: 3.75, w: 39, d: 6.5, floorColor: 0xf1f8e9, lightColor: 0xc5e1a5 },
  { name: "服务器室", chineseName: "服务器室", x: 0, z: 11.25, w: 39, d: 6.5, floorColor: 0xede7f6, lightColor: 0xb39ddb },
];

const ROOM_LABELS: Record<string, string> = {
  "茶水间": "Break Room",
  "会议室A": "Meeting A",
  "工位区": "Workstations",
  "会议室B": "Meeting B",
  "大厅": "Lobby",
  "服务器室": "Server Room",
};

export class RoomMesh {
  group = new THREE.Group();
  floor: THREE.Mesh;
  walls: THREE.Group;
  label: HTMLDivElement;
  light: THREE.PointLight;
  def: RoomDef;
  private hoverMat: THREE.MeshStandardMaterial;
  private normalColor: THREE.Color;

  constructor(def: RoomDef) {
    this.def = def;

    // Floor
    const floorGeo = new THREE.PlaneGeometry(def.w, def.d);
    this.hoverMat = new THREE.MeshStandardMaterial({
      color: def.floorColor,
      roughness: 0.8,
      metalness: 0.1,
    });
    this.normalColor = new THREE.Color(def.floorColor);
    this.floor = new THREE.Mesh(floorGeo, this.hoverMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.set(def.x, 0.01, def.z);
    this.floor.receiveShadow = true;
    this.floor.userData = { roomName: def.name };
    this.group.add(this.floor);

    // Walls (low transparent)
    this.walls = new THREE.Group();
    const wallH = 0.5;
    const wallMat = new THREE.MeshStandardMaterial({
      color: def.floorColor,
      transparent: true,
      opacity: 0.35,
      roughness: 0.5,
    });

    const makeWall = (wx: number, wz: number, ww: number, wd: number) => {
      const geo = new THREE.BoxGeometry(ww, wallH, wd);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(wx, wallH / 2, wz);
      mesh.castShadow = true;
      mesh.userData = { roomName: def.name };
      return mesh;
    };

    const thickness = 0.15;
    const hw = def.w / 2;
    const hd = def.d / 2;
    // North
    this.walls.add(makeWall(def.x, def.z - hd, def.w, thickness));
    // South
    this.walls.add(makeWall(def.x, def.z + hd, def.w, thickness));
    // West
    this.walls.add(makeWall(def.x - hw, def.z, thickness, def.d));
    // East
    this.walls.add(makeWall(def.x + hw, def.z, thickness, def.d));
    this.group.add(this.walls);

    // Furniture
    this.addFurniture(def);

    // Room point light
    this.light = new THREE.PointLight(def.lightColor, 0.4, 15);
    this.light.position.set(def.x, 3, def.z);
    this.group.add(this.light);

    // HTML label
    this.label = document.createElement("div");
    this.label.style.cssText = `
      position: absolute; pointer-events: none; text-align: center;
      font-family: 'Courier New', monospace; font-size: 12px;
      color: #fff; text-shadow: 0 0 4px rgba(0,0,0,0.8);
      white-space: nowrap; transform: translate(-50%, -50%);
    `;
    this.label.innerHTML = `<b>${def.name}</b><br><span style="font-size:10px;color:#aaa">${ROOM_LABELS[def.name] || ""}</span>`;
  }

  private addFurniture(def: RoomDef) {
    const furnitureMat = new THREE.MeshStandardMaterial({ color: 0x5c6370, roughness: 0.7 });
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.6 });

    if (def.name === "工位区") {
      // Desks in grid
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 4; c++) {
          const desk = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 1.2), deskMat);
          desk.position.set(def.x - 6 + c * 4, 0.5, def.z - 1.2 + r * 2.5);
          desk.castShadow = true;
          desk.receiveShadow = true;
          desk.userData = { roomName: def.name };
          this.group.add(desk);
          // Chair
          const chair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), furnitureMat);
          chair.position.set(def.x - 6 + c * 4, 0.2, def.z - 1.2 + r * 2.5 + 1);
          chair.userData = { roomName: def.name };
          this.group.add(chair);
        }
      }
    } else if (def.name === "会议室A" || def.name === "会议室B") {
      // Conference table
      const table = new THREE.Mesh(new THREE.BoxGeometry(6, 0.15, 2.5), deskMat);
      table.position.set(def.x, 0.5, def.z);
      table.castShadow = true;
      table.userData = { roomName: def.name };
      this.group.add(table);
      // Chairs around table
      for (let i = 0; i < 3; i++) {
        const ch1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), furnitureMat);
        ch1.position.set(def.x - 2 + i * 2, 0.2, def.z - 2);
        ch1.userData = { roomName: def.name };
        this.group.add(ch1);
        const ch2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), furnitureMat);
        ch2.position.set(def.x - 2 + i * 2, 0.2, def.z + 2);
        ch2.userData = { roomName: def.name };
        this.group.add(ch2);
      }
    } else if (def.name === "服务器室") {
      // Server racks
      const rackMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.3, metalness: 0.5 });
      for (let i = 0; i < 5; i++) {
        const rack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, 0.8), rackMat);
        rack.position.set(def.x - 8 + i * 4, 1, def.z);
        rack.castShadow = true;
        rack.userData = { roomName: def.name };
        this.group.add(rack);
        // LED blink lights (small emissive boxes)
        const led = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.1, 0.05),
          new THREE.MeshStandardMaterial({ color: 0x4caf50, emissive: 0x4caf50, emissiveIntensity: 2 })
        );
        led.position.set(def.x - 8 + i * 4, 1.5, def.z - 0.43);
        this.group.add(led);
      }
    } else if (def.name === "茶水间") {
      // Counter / table
      const counter = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 1.2), deskMat);
      counter.position.set(def.x - 3, 0.3, def.z - 1);
      counter.castShadow = true;
      counter.userData = { roomName: def.name };
      this.group.add(counter);
      // Small tables
      for (let i = 0; i < 2; i++) {
        const t = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 1.5), deskMat);
        t.position.set(def.x + 2 + i * 3, 0.2, def.z + 1);
        t.userData = { roomName: def.name };
        this.group.add(t);
      }
    } else if (def.name === "大厅") {
      // Benches
      const benchMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.7 });
      for (let i = 0; i < 3; i++) {
        const bench = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 0.8), benchMat);
        bench.position.set(def.x - 10 + i * 10, 0.15, def.z + 1);
        bench.userData = { roomName: def.name };
        this.group.add(bench);
      }
    }
  }

  setHover(hovered: boolean) {
    if (hovered) {
      this.hoverMat.color.set(
        new THREE.Color(this.def.floorColor).lerp(new THREE.Color(0xffffff), 0.3)
      );
      this.hoverMat.emissive.set(this.def.lightColor);
      this.hoverMat.emissiveIntensity = 0.15;
    } else {
      this.hoverMat.color.copy(this.normalColor);
      this.hoverMat.emissive.set(0x000000);
      this.hoverMat.emissiveIntensity = 0;
    }
  }

  updateLabel(camera: THREE.Camera, container: HTMLElement) {
    const pos = new THREE.Vector3(this.def.x, 1.5, this.def.z);
    pos.project(camera);
    const rect = container.getBoundingClientRect();
    const x = (pos.x * 0.5 + 0.5) * rect.width;
    const y = (-pos.y * 0.5 + 0.5) * rect.height;
    this.label.style.left = `${x}px`;
    this.label.style.top = `${y}px`;
    // Hide if behind camera
    this.label.style.display = pos.z > 1 ? "none" : "block";
  }
}
