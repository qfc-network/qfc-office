import * as THREE from "three";
import { RoomMesh, ROOM_DEFS } from "./RoomMesh";
import { MemberAvatar } from "./MemberAvatar";
import { CameraController } from "./CameraController";
import { UIOverlay } from "./UIOverlay";
import {
  fetchState,
  fetchChain,
  checkin,
  checkout,
  setStatus,
  moveToRoom,
  sendMessage,
  OfficeSocket,
  type OfficeState,
  type Member,
} from "./api";

export class Office3D {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private cam: CameraController;
  private ui: UIOverlay;
  private socket: OfficeSocket;

  private rooms: Map<string, RoomMesh> = new Map();
  private avatars: Map<string, MemberAvatar> = new Map();
  private labelContainer: HTMLDivElement;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private hoveredRoom: string | null = null;
  private clock = new THREE.Clock();

  private currentUser: string | null = null;
  private state: OfficeState | null = null;
  private followingUser = false;

  constructor(private container: HTMLElement) {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x1a1a2e);
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.012);

    // Camera
    this.cam = new CameraController(container);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -25;
    sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 50;
    this.scene.add(sun);

    // Floor
    this.createFloor();

    // Rooms
    for (const def of ROOM_DEFS) {
      const room = new RoomMesh(def);
      this.rooms.set(def.name, room);
      this.scene.add(room.group);
    }

    // Label container
    this.labelContainer = document.createElement("div");
    this.labelContainer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;";
    container.appendChild(this.labelContainer);

    // Add room labels
    for (const room of this.rooms.values()) {
      this.labelContainer.appendChild(room.label);
    }

    // UI overlay
    this.ui = new UIOverlay(container);

    // WebSocket
    this.socket = new OfficeSocket();
    this.socket.onState((s) => this.onStateUpdate(s));
    this.socket.connect();

    // Events
    this.setupEvents();

    // UI callbacks
    this.ui.onCheckin = async (name) => {
      await checkin(name);
      const avatar = this.avatars.get(name);
      if (avatar) avatar.triggerCheckinParticles();
    };
    this.ui.onCheckout = (name) => checkout(name);
    this.ui.onStatusChange = (s) => {
      if (this.currentUser) setStatus(this.currentUser, s);
    };
    this.ui.onSendMessage = (text) => {
      if (!this.currentUser || !this.state) return;
      const me = this.state.members.find((m) => m.name === this.currentUser);
      if (me) sendMessage(this.currentUser, me.room, text);
    };
    this.ui.onMemberClick = (name) => {
      // Focus camera on member
      const avatar = this.avatars.get(name);
      if (avatar) {
        this.cam.controls.target.set(
          avatar.group.position.x,
          0,
          avatar.group.position.z
        );
      }
    };

    // Initial data
    fetchState().then((s) => this.onStateUpdate(s));
    this.pollChain();

    // Resize
    window.addEventListener("resize", () => this.onResize());

    // Start render loop
    this.animate();
  }

  private createFloor() {
    // Grid floor
    const floorGeo = new THREE.PlaneGeometry(42, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a3e,
      roughness: 0.9,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Grid lines
    const gridHelper = new THREE.GridHelper(44, 44, 0x3a3a5e, 0x2e2e48);
    gridHelper.position.y = 0;
    this.scene.add(gridHelper);
  }

  private setupEvents() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    canvas.addEventListener("click", (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.cam.camera);
      const allMeshes: THREE.Object3D[] = [];
      this.scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) allMeshes.push(obj);
      });
      const hits = this.raycaster.intersectObjects(allMeshes);

      for (const hit of hits) {
        // Check if clicked a member
        const memberName = hit.object.userData.memberName;
        if (memberName) {
          this.ui.showMemberInfo(memberName);
          return;
        }

        // Check if clicked a room floor
        const roomName = hit.object.userData.roomName;
        if (roomName && this.currentUser) {
          moveToRoom(this.currentUser, roomName);
          // Move avatar to that room position
          const roomDef = ROOM_DEFS.find((r) => r.name === roomName);
          if (roomDef) {
            const avatar = this.avatars.get(this.currentUser);
            if (avatar) {
              avatar.setTargetPosition(
                roomDef.x + (Math.random() - 0.5) * (roomDef.w * 0.5),
                roomDef.z + (Math.random() - 0.5) * (roomDef.d * 0.3)
              );
            }
          }
          return;
        }
      }
    });

    canvas.addEventListener("dblclick", () => {
      if (!this.currentUser) return;
      const avatar = this.avatars.get(this.currentUser);
      if (avatar) {
        this.followingUser = !this.followingUser;
        this.cam.setFollowTarget(this.followingUser ? avatar.group : null);
      }
    });
  }

  private onStateUpdate(state: OfficeState) {
    this.state = state;
    this.ui.updateState(state);

    const existingNames = new Set(this.avatars.keys());
    const newNames = new Set(state.members.map((m) => m.name));

    // Remove departed members
    for (const name of existingNames) {
      if (!newNames.has(name)) {
        const avatar = this.avatars.get(name)!;
        this.scene.remove(avatar.group);
        avatar.getHTMLElements().forEach((el) => el.remove());
        avatar.dispose();
        this.avatars.delete(name);
      }
    }

    // Update or create
    for (const m of state.members) {
      let avatar = this.avatars.get(m.name);
      if (!avatar) {
        avatar = new MemberAvatar(m);
        this.avatars.set(m.name, avatar);
        this.scene.add(avatar.group);
        avatar.getHTMLElements().forEach((el) => this.labelContainer.appendChild(el));
        // Position in room
        this.positionAvatarInRoom(avatar, m);
      } else {
        // If room changed, move avatar
        if (avatar.member.room !== m.room) {
          const roomDef = ROOM_DEFS.find((r) => r.name === m.room);
          if (roomDef) {
            avatar.setTargetPosition(
              roomDef.x + (Math.random() - 0.5) * (roomDef.w * 0.4),
              roomDef.z + (Math.random() - 0.5) * (roomDef.d * 0.3)
            );
          }
        }
        avatar.updateMember(m);
      }
    }
  }

  private positionAvatarInRoom(avatar: MemberAvatar, m: Member) {
    const roomDef = ROOM_DEFS.find((r) => r.name === m.room);
    if (roomDef) {
      avatar.group.position.set(
        roomDef.x + (Math.random() - 0.5) * (roomDef.w * 0.4),
        0,
        roomDef.z + (Math.random() - 0.5) * (roomDef.d * 0.3)
      );
    } else {
      // Default to lobby
      avatar.group.position.set(
        (Math.random() - 0.5) * 10,
        0,
        3.75 + (Math.random() - 0.5) * 2
      );
    }
  }

  private pollChain() {
    const poll = async () => {
      try {
        const info = await fetchChain();
        this.ui.updateChain(info);
      } catch { /* ignore */ }
    };
    poll();
    setInterval(poll, 15000);
  }

  private onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.cam.resize(w, h);
  }

  setUser(name: string) {
    this.currentUser = name;
    this.ui.currentUser = name;
    this.ui.userInfoSpan.textContent = name;
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    const dt = this.clock.getDelta();

    // Update camera
    this.cam.update();

    // Room hover
    this.raycaster.setFromCamera(this.mouse, this.cam.camera);
    const floors: THREE.Object3D[] = [];
    for (const room of this.rooms.values()) floors.push(room.floor);
    const hits = this.raycaster.intersectObjects(floors);

    const newHover = hits.length > 0 ? hits[0].object.userData.roomName : null;
    if (newHover !== this.hoveredRoom) {
      if (this.hoveredRoom) this.rooms.get(this.hoveredRoom)?.setHover(false);
      if (newHover) this.rooms.get(newHover)?.setHover(true);
      this.hoveredRoom = newHover;
      this.renderer.domElement.style.cursor = newHover ? "pointer" : "default";
    }

    // Update avatars
    for (const avatar of this.avatars.values()) {
      avatar.update(dt);
      avatar.updateLabels(this.cam.camera, this.container);
    }

    // Update room labels
    for (const room of this.rooms.values()) {
      room.updateLabel(this.cam.camera, this.container);
    }

    this.renderer.render(this.scene, this.cam.camera);
  }
}
