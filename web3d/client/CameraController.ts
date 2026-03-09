import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class CameraController {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  private followTarget: THREE.Object3D | null = null;

  constructor(container: HTMLElement) {
    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );
    // Isometric-ish default view
    this.camera.position.set(0, 25, 25);

    this.controls = new OrbitControls(this.camera, container);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 60;
    this.controls.update();
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setFollowTarget(target: THREE.Object3D | null) {
    this.followTarget = target;
  }

  update() {
    if (this.followTarget) {
      const tp = this.followTarget.position;
      this.controls.target.lerp(new THREE.Vector3(tp.x, 0, tp.z), 0.05);
    }
    this.controls.update();
  }
}
