import * as THREE from "three";
import type { Member } from "./api";

const STATUS_COLORS: Record<string, number> = {
  online: 0x4caf50,
  idle: 0xffeb3b,
  busy: 0xf44336,
  offline: 0x9e9e9e,
};

export function roleColor(role: string, type: string): number {
  if (type === "human") return 0x42a5f5;
  const r = role.toLowerCase();
  if (r.includes("qa")) return 0x66bb6a;
  if (r.includes("devops")) return 0xab47bc;
  if (r.includes("frontend")) return 0xef5350;
  if (r.includes("product")) return 0xffa726;
  if (r.includes("protocol")) return 0x26c6da;
  if (r.includes("crypto")) return 0xec407a;
  if (r.includes("smart contract")) return 0x7e57c2;
  if (r.includes("ai/ml")) return 0xffee58;
  if (r.includes("core") || r.includes("lead")) return 0xff7043;
  return 0x78909c;
}

export class MemberAvatar {
  group = new THREE.Group();
  member: Member;
  nameLabel: HTMLDivElement;
  private body: THREE.Mesh;
  private head: THREE.Mesh;
  private statusRing: THREE.Mesh;
  private emojiLabel: HTMLDivElement;
  private targetPos: THREE.Vector3 | null = null;
  private bobPhase = Math.random() * Math.PI * 2;

  // For particle burst
  private particles: THREE.Points | null = null;
  private particleLife = 0;

  constructor(member: Member) {
    this.member = member;
    const color = roleColor(member.role, member.type);

    // Body (capsule-like: cylinder + spheres)
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
    this.body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.7, 8), bodyMat);
    this.body.position.y = 0.55;
    this.body.castShadow = true;
    this.body.userData = { memberName: member.name };
    this.group.add(this.body);

    // Head
    this.head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffcc88, roughness: 0.6 })
    );
    this.head.position.y = 1.1;
    this.head.castShadow = true;
    this.head.userData = { memberName: member.name };
    this.group.add(this.head);

    // Status ring
    const ringGeo = new THREE.RingGeometry(0.35, 0.45, 16);
    this.statusRing = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: STATUS_COLORS[member.status] || 0x9e9e9e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      })
    );
    this.statusRing.rotation.x = -Math.PI / 2;
    this.statusRing.position.y = 0.02;
    this.group.add(this.statusRing);

    // Name label (HTML)
    this.nameLabel = document.createElement("div");
    this.nameLabel.style.cssText = `
      position: absolute; pointer-events: none; text-align: center;
      font-family: 'Courier New', monospace; font-size: 11px;
      color: #fff; text-shadow: 0 0 3px rgba(0,0,0,0.9);
      white-space: nowrap; transform: translate(-50%, -100%);
      background: rgba(0,0,0,0.5); padding: 1px 6px; border-radius: 3px;
    `;
    this.nameLabel.textContent = member.name;

    // Emoji label
    this.emojiLabel = document.createElement("div");
    this.emojiLabel.style.cssText = `
      position: absolute; pointer-events: none; text-align: center;
      font-size: 16px; transform: translate(-50%, -100%);
      white-space: nowrap;
    `;
    this.emojiLabel.textContent = member.emoji || "";
  }

  updateMember(m: Member) {
    this.member = m;
    // Update status ring color
    const ringMat = this.statusRing.material as THREE.MeshBasicMaterial;
    ringMat.color.set(STATUS_COLORS[m.status] || 0x9e9e9e);
    // Update body color
    const bodyMat = this.body.material as THREE.MeshStandardMaterial;
    bodyMat.color.set(roleColor(m.role, m.type));
    // Update name/emoji
    this.nameLabel.textContent = m.name;
    this.emojiLabel.textContent = m.emoji || "";
  }

  setTargetPosition(x: number, z: number) {
    this.targetPos = new THREE.Vector3(x, 0, z);
  }

  triggerCheckinParticles() {
    const count = 30;
    const positions = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = this.group.position.x;
      positions[i * 3 + 1] = 0.5;
      positions[i * 3 + 2] = this.group.position.z;
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        Math.random() * 0.1 + 0.05,
        (Math.random() - 0.5) * 0.1
      ));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0x00d4ff, size: 0.1, transparent: true, opacity: 1 });
    this.particles = new THREE.Points(geo, mat);
    (this.particles as any)._velocities = velocities;
    this.particleLife = 1.0;
    this.group.parent?.add(this.particles);
  }

  update(dt: number) {
    // Bobbing
    this.bobPhase += dt * 2;
    const bob = Math.sin(this.bobPhase) * 0.03;
    this.body.position.y = 0.55 + bob;
    this.head.position.y = 1.1 + bob;

    // Walk to target
    if (this.targetPos) {
      const curr = this.group.position;
      const dx = this.targetPos.x - curr.x;
      const dz = this.targetPos.z - curr.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 0.05) {
        const speed = 4 * dt;
        const step = Math.min(speed, dist);
        curr.x += (dx / dist) * step;
        curr.z += (dz / dist) * step;
      } else {
        curr.x = this.targetPos.x;
        curr.z = this.targetPos.z;
        this.targetPos = null;
      }
    }

    // Particles
    if (this.particles && this.particleLife > 0) {
      this.particleLife -= dt;
      const positions = this.particles.geometry.attributes.position as THREE.BufferAttribute;
      const velocities = (this.particles as any)._velocities as THREE.Vector3[];
      for (let i = 0; i < positions.count; i++) {
        positions.setX(i, positions.getX(i) + velocities[i].x);
        positions.setY(i, positions.getY(i) + velocities[i].y);
        positions.setZ(i, positions.getZ(i) + velocities[i].z);
        velocities[i].y -= 0.003; // gravity
      }
      positions.needsUpdate = true;
      (this.particles.material as THREE.PointsMaterial).opacity = Math.max(0, this.particleLife);
      if (this.particleLife <= 0) {
        this.particles.parent?.remove(this.particles);
        this.particles.geometry.dispose();
        (this.particles.material as THREE.PointsMaterial).dispose();
        this.particles = null;
      }
    }
  }

  updateLabels(camera: THREE.Camera, container: HTMLElement) {
    const rect = container.getBoundingClientRect();
    // Name label
    const namePos = new THREE.Vector3(
      this.group.position.x,
      1.55,
      this.group.position.z
    );
    namePos.project(camera);
    if (namePos.z > 1) {
      this.nameLabel.style.display = "none";
      this.emojiLabel.style.display = "none";
      return;
    }
    this.nameLabel.style.display = "block";
    const nx = (namePos.x * 0.5 + 0.5) * rect.width;
    const ny = (-namePos.y * 0.5 + 0.5) * rect.height;
    this.nameLabel.style.left = `${nx}px`;
    this.nameLabel.style.top = `${ny}px`;

    // Emoji above name
    if (this.member.emoji) {
      this.emojiLabel.style.display = "block";
      const emojiPos = new THREE.Vector3(
        this.group.position.x,
        1.85,
        this.group.position.z
      );
      emojiPos.project(camera);
      const ex = (emojiPos.x * 0.5 + 0.5) * rect.width;
      const ey = (-emojiPos.y * 0.5 + 0.5) * rect.height;
      this.emojiLabel.style.left = `${ex}px`;
      this.emojiLabel.style.top = `${ey}px`;
    } else {
      this.emojiLabel.style.display = "none";
    }
  }

  getHTMLElements(): HTMLDivElement[] {
    return [this.nameLabel, this.emojiLabel];
  }

  dispose() {
    this.nameLabel.remove();
    this.emojiLabel.remove();
    if (this.particles) {
      this.particles.parent?.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.PointsMaterial).dispose();
    }
    this.group.traverse((obj) => {
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    });
  }
}
