import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {
  CAMERA_PRESETS,
  CameraPresetId,
  ChipId,
  SubsystemId,
  WorkloadId,
} from '../data/socSpecs';
import { createProceduralTextures } from './proceduralTextures';
import { buildSocModel } from './socModel';

export interface SceneStateSnapshot {
  explode: number;
  chip: ChipId;
  workload: WorkloadId;
  selectedSubsystem: SubsystemId | null;
  autoRotate: boolean;
}

export interface SceneControllerCallbacks {
  onSelectSubsystem: (id: SubsystemId | null) => void;
  onHoverSubsystem: (id: SubsystemId | null) => void;
  onContextLostChange: (lost: boolean) => void;
}

export interface SceneControllerHandle {
  syncState: (next: SceneStateSnapshot) => void;
  goToPreset: (presetId: CameraPresetId) => void;
  dispose: () => void;
}

const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _rayMouse = new THREE.Vector2();

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function initSocScene(
  container: HTMLDivElement,
  initialState: SceneStateSnapshot,
  callbacks: SceneControllerCallbacks,
): SceneControllerHandle {
  const isSoftwareGl = detectSoftwareWebGL();
  let state: SceneStateSnapshot = { ...initialState };
  let hoveredSubsystem: SubsystemId | null = null;
  let disposed = false;

  // 1. Renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setPixelRatio(
    isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
  );
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  // 2. Scene & Horizon-Matched Fog
  const scene = new THREE.Scene();
  const bgColor = new THREE.Color(0x090c12);
  scene.background = bgColor;
  scene.fog = new THREE.FogExp2(0x090c12, 0.042);

  // 3. Studio Environment Reflection (RoomEnvironment on every device)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envRenderTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRenderTarget.texture;
  pmremGenerator.dispose();

  // 4. Camera & Controls
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;
  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  const defaultPreset = CAMERA_PRESETS[0];
  camera.position.set(...defaultPreset.position);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...defaultPreset.target);
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = 0.06;
  controls.minDistance = 1.85;
  controls.maxDistance = 10.5;
  controls.minPolarAngle = 0.18;
  controls.maxPolarAngle = Math.PI / 2 - 0.06;
  controls.enablePan = true;
  controls.autoRotate = !isSoftwareGl && state.autoRotate;
  controls.autoRotateSpeed = 0.55;
  controls.update();

  // 5. Three-Point Studio Lighting Rig + Softboxes
  const hemiLight = new THREE.HemisphereLight(0x88b4e8, 0x1e1810, 0.72);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.35);
  keyLight.position.set(4.5, 7.2, 4.2);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 20;
  keyLight.shadow.camera.left = -4;
  keyLight.shadow.camera.right = 4;
  keyLight.shadow.camera.top = 4;
  keyLight.shadow.camera.bottom = -4;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x52b6ff, 1.35);
  rimLight.position.set(-5.0, 3.8, -4.5);
  scene.add(rimLight);

  if (!isSoftwareGl) {
    RectAreaLightUniformsLib.init();
    const softboxTop = new THREE.RectAreaLight(0xffffff, 2.4, 4.5, 2.5);
    softboxTop.position.set(0, 5.4, 2.6);
    softboxTop.lookAt(0, 0.6, 0);
    scene.add(softboxTop);

    const softboxSide = new THREE.RectAreaLight(0xffdca8, 1.6, 3.5, 2.0);
    softboxSide.position.set(4.8, 2.4, -1.5);
    softboxSide.lookAt(0, 0.8, 0);
    scene.add(softboxSide);
  }

  // 6. Procedural Textures & Composite 3nm SoC Model
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const textures = createProceduralTextures(maxAniso);
  const socModel = buildSocModel(textures, isSoftwareGl);
  scene.add(socModel.root);

  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  // 7. Smooth Scripted Camera Transition (cancelled immediately on manual orbit)
  let cameraTransitionActive = false;
  controls.addEventListener('start', () => {
    cameraTransitionActive = false;
  });

  function goToPreset(presetId: CameraPresetId) {
    const preset = CAMERA_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    _camTargetPos.set(...preset.position);
    _camTargetLook.set(...preset.target);
    cameraTransitionActive = true;
  }

  // 8. Layer-1 Raycasting (Click & Throttled Hover)
  const raycaster = new THREE.Raycaster();
  raycaster.layers.set(1);

  let pointerDownPos = { x: 0, y: 0 };
  let lastHoverCheck = 0;

  function updateMouseFromEvent(e: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function findSubsystemHit(): SubsystemId | null {
    raycaster.setFromCamera(_rayMouse, camera);
    const hits = raycaster.intersectObjects(socModel.interactables, true);
    if (hits.length === 0) return null;
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj) {
      if (obj.userData && obj.userData.subsystemId) {
        return obj.userData.subsystemId as SubsystemId;
      }
      obj = obj.parent;
    }
    return null;
  }

  const onPointerDown = (e: PointerEvent) => {
    pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: PointerEvent) => {
    const dx = e.clientX - pointerDownPos.x;
    const dy = e.clientY - pointerDownPos.y;
    if (dx * dx + dy * dy > 36) return; // Dragging orbit, not clicking
    updateMouseFromEvent(e);
    const hit = findSubsystemHit();
    callbacks.onSelectSubsystem(hit);
  };

  const onPointerMove = (e: PointerEvent) => {
    const now = performance.now();
    if (now - lastHoverCheck < 55) return;
    lastHoverCheck = now;
    updateMouseFromEvent(e);
    const hit = findSubsystemHit();
    if (hit !== hoveredSubsystem) {
      hoveredSubsystem = hit;
      renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
      callbacks.onHoverSubsystem(hit);
    }
  };

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointermove', onPointerMove);

  // 9. WebGL Context Loss & Resize Handling
  const onContextLost = (e: Event) => {
    e.preventDefault();
    callbacks.onContextLostChange(true);
  };
  const onContextRestored = () => {
    callbacks.onContextLostChange(false);
  };
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

  const onResize = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
  };
  window.addEventListener('resize', onResize);

  // 10. Animation Loop with Paced Software-WebGL Guard (afterDraw)
  const clock = new THREE.Clock();
  let frameId = 0;

  function afterDraw(cb: () => void) {
    if (disposed) return;
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const syncState = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (syncState === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 80);
      }
    };
    frameId = window.setTimeout(poll, 5);
  }

  function tick() {
    if (disposed) return;
    const dt = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    if (cameraTransitionActive) {
      const alpha = 1 - Math.exp(-6.5 * Math.min(dt, 0.05));
      camera.position.lerp(_camTargetPos, alpha);
      controls.target.lerp(_camTargetLook, alpha);
      if (
        camera.position.distanceTo(_camTargetPos) < 0.015 &&
        controls.target.distanceTo(_camTargetLook) < 0.015
      ) {
        camera.position.copy(_camTargetPos);
        controls.target.copy(_camTargetLook);
        cameraTransitionActive = false;
      }
    }

    controls.autoRotate = !isSoftwareGl && state.autoRotate && !cameraTransitionActive;
    controls.update();

    socModel.update(
      dt,
      elapsed,
      state.explode,
      state.chip,
      state.workload,
      state.selectedSubsystem,
      hoveredSubsystem,
    );

    renderer.render(scene, camera);

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }
  }

  if (isSoftwareGl) {
    renderer.render(scene, camera);
    afterDraw(tick);
  } else {
    frameId = requestAnimationFrame(tick);
  }

  return {
    syncState: (next: SceneStateSnapshot) => {
      state = { ...next };
    },
    goToPreset,
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      controls.dispose();
      socModel.dispose();
      textures.dispose();
      envRenderTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
