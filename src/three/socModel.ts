import * as THREE from 'three';
import { ChipId, SubsystemId, WORKLOAD_PROFILES, WorkloadId } from '../data/socSpecs';
import { ProceduralTextureSet } from './proceduralTextures';

// Pre-allocated scratch math objects (zero GC in render loop)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _color = new THREE.Color();

export interface SocLayerHandle {
  group: THREE.Group;
  baseY: number;
  explodeOffset: number;
}

export interface SocModelController {
  root: THREE.Group;
  interactables: THREE.Object3D[];
  update: (
    dt: number,
    elapsed: number,
    explodeTarget: number,
    chip: ChipId,
    workload: WorkloadId,
    selectedSubsystem: SubsystemId | null,
    hoveredSubsystem: SubsystemId | null,
  ) => { settled: boolean };
  dispose: () => void;
}

function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hh = height / 2;
  const r = Math.min(radius, hw, hh);
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return shape;
}

function createBeveledPlateGeometry(
  width: number,
  depth: number,
  thickness: number,
  cornerRadius: number,
  bevelSize = 0.02,
): THREE.BufferGeometry {
  const shape = createRoundedRectShape(width, depth, cornerRadius);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize,
    bevelThickness: bevelSize,
  });
  geo.rotateX(-Math.PI / 2);
  // Normalize UVs cleanly across top/bottom XZ footprint for procedural CanvasTextures
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const fullW = width + bevelSize * 2;
  const fullD = depth + bevelSize * 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    uv.setXY(i, (x + fullW / 2) / fullW, 1 - (z + fullD / 2) / fullD);
  }
  uv.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function tagInteractable(
  obj: THREE.Object3D,
  subsystemId: SubsystemId,
  list: THREE.Object3D[],
) {
  obj.traverse((child) => {
    child.userData.subsystemId = subsystemId;
    child.layers.enable(1);
  });
  list.push(obj);
}

export function buildSocModel(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean,
): SocModelController {
  const root = new THREE.Group();
  const interactables: THREE.Object3D[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // =========================================================================
  // Shared Materials (Calibrated PBR roughness/metalness contrast)
  // =========================================================================
  const matPedestalMetal = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e2532,
      metalness: 0.85,
      roughness: 0.34,
    }),
  );
  const matBrassAccent = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xd9a03b,
      metalness: 0.96,
      roughness: 0.16,
      clearcoat: 0.3,
    }),
  );
  const matStagePlaten = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.stageGrid,
      roughness: 0.62,
      metalness: 0.15,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  const matContactShadow = trackMat(
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    }),
  );

  // Substrate & BGA Materials
  const matSubstrate = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.substrateAlbedo,
      bumpMap: textures.substrateBump,
      bumpScale: 0.015,
      roughness: 0.56,
      metalness: 0.18,
    }),
  );
  const matInterposer = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x16202a,
      roughness: 0.42,
      metalness: 0.48,
    }),
  );
  const matCeramicCap = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x9c7b56,
      roughness: 0.65,
      metalness: 0.08,
    }),
  );

  // Silicon Die & Subsystems Materials (high-contrast dielectric vs metal)
  const matSiliconBase = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: textures.dieAlbedo,
      emissiveMap: textures.dieEmissive,
      emissive: new THREE.Color(0x38bdf8),
      emissiveIntensity: 0.55,
      bumpMap: textures.dieBump,
      bumpScale: 0.012,
      roughness: 0.14,
      metalness: 0.68,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      iridescence: 0.85,
      iridescenceIOR: 1.45,
    }),
  );

  const matCpuCluster = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xd99b26,
      emissive: new THREE.Color(0xf59e0b),
      emissiveIntensity: 0.25,
      metalness: 0.92,
      roughness: 0.22,
      clearcoat: 0.4,
    }),
  );

  const matGpuCluster = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x1f6feb,
      emissive: new THREE.Color(0x38bdf8),
      emissiveIntensity: 0.35,
      metalness: 0.78,
      roughness: 0.2,
      clearcoat: 0.7,
    }),
  );

  const matNpuCluster = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x0d9488,
      emissive: new THREE.Color(0x2dd4bf),
      emissiveIntensity: 0.32,
      metalness: 0.72,
      roughness: 0.26,
      clearcoat: 0.5,
    }),
  );

  const matCacheCluster = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x64748b,
      emissive: new THREE.Color(0x38bdf8),
      emissiveIntensity: 0.18,
      metalness: 0.86,
      roughness: 0.32,
    }),
  );

  // 3nm GAA Nanosheet Transistor Materials
  const matSiliconChannel = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: new THREE.Color(0x0284c7),
      emissiveIntensity: 0.45,
      metalness: 0.35,
      roughness: 0.18,
      clearcoat: 0.9,
    }),
  );
  const matHighKGate = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24,
      metalness: 0.15,
      roughness: 0.08,
      transmission: isSoftwareGl ? 0 : 0.82,
      transparent: true,
      opacity: isSoftwareGl ? 0.42 : 0.92,
      ior: 1.65,
      thickness: 0.35,
      depthWrite: false,
    }),
  );
  const matCopperInterconnect = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd97742,
      metalness: 0.95,
      roughness: 0.18,
    }),
  );

  // Heatspreader & Optical Dome Materials
  const matTitaniumIHS = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: textures.ihsAlbedoG81,
      roughnessMap: textures.ihsRoughness,
      metalness: 0.94,
      roughness: 0.26,
      anisotropy: 0.85,
      anisotropyRotation: 0,
      clearcoat: 0.25,
      clearcoatRoughness: 0.2,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0,
    }),
  );

  const matOpticalRing = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      metalness: 0.05,
      roughness: 0.05,
      transmission: isSoftwareGl ? 0 : 0.92,
      transparent: true,
      opacity: isSoftwareGl ? 0.3 : 1.0,
      ior: 1.55,
      thickness: 0.4,
      depthWrite: false,
    }),
  );

  // =========================================================================
  // Layer 0: Grounded Optical Inspection Pedestal (LatheGeometry + Contact Shadow)
  // =========================================================================
  const pedestalGroup = new THREE.Group();
  pedestalGroup.position.set(0, 0, 0);

  // Stepped machined Lathe pedestal sitting flush at y=0
  const lathePoints = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(2.85, 0),
    new THREE.Vector2(2.85, 0.06),
    new THREE.Vector2(2.68, 0.12),
    new THREE.Vector2(2.45, 0.12),
    new THREE.Vector2(2.4, 0.2),
    new THREE.Vector2(0, 0.2),
  ];
  const pedestalGeo = trackGeo(new THREE.LatheGeometry(lathePoints, 64));
  const pedestalMesh = new THREE.Mesh(pedestalGeo, matPedestalMetal);
  pedestalMesh.castShadow = true;
  pedestalMesh.receiveShadow = true;
  pedestalGroup.add(pedestalMesh);

  // Calibration stage plate on top of pedestal (y = 0.205 to avoid z-fighting)
  const platenGeo = trackGeo(new THREE.CylinderGeometry(2.34, 2.34, 0.016, 64));
  const platenMesh = new THREE.Mesh(platenGeo, matStagePlaten);
  platenMesh.position.y = 0.208;
  platenMesh.receiveShadow = true;
  pedestalGroup.add(platenMesh);

  // Gold chamfered calibration ring around stage
  const calRingGeo = trackGeo(new THREE.TorusGeometry(2.42, 0.022, 16, 96));
  calRingGeo.rotateX(Math.PI / 2);
  const calRingMesh = new THREE.Mesh(calRingGeo, matBrassAccent);
  calRingMesh.position.y = 0.21;
  pedestalGroup.add(calRingMesh);

  // 4 Machined corner alignment clamps around pedestal
  const clampShape = createRoundedRectShape(0.28, 0.14, 0.04);
  const clampGeo = trackGeo(
    new THREE.ExtrudeGeometry(clampShape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelSize: 0.015,
      bevelThickness: 0.015,
      bevelSegments: 2,
    }),
  );
  clampGeo.rotateX(-Math.PI / 2);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const clamp = new THREE.Mesh(clampGeo, matPedestalMetal);
    clamp.position.set(Math.cos(angle) * 2.52, 0.14, Math.sin(angle) * 2.52);
    clamp.rotation.y = -angle;
    clamp.castShadow = true;
    pedestalGroup.add(clamp);
  }

  // Soft radial contact shadow beneath the pedestal & chip
  const groundShadowGeo = trackGeo(new THREE.PlaneGeometry(7.2, 7.2));
  groundShadowGeo.rotateX(-Math.PI / 2);
  const groundShadow = new THREE.Mesh(groundShadowGeo, matContactShadow);
  groundShadow.position.y = 0.004;
  pedestalGroup.add(groundShadow);

  // Subtle stage floor reflection disc
  const floorGeo = trackGeo(new THREE.CircleGeometry(14, 64));
  floorGeo.rotateX(-Math.PI / 2);
  const floorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x090c12,
      roughness: 0.85,
      metalness: 0.1,
    }),
  );
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.y = 0;
  floorMesh.receiveShadow = true;
  pedestalGroup.add(floorMesh);

  root.add(pedestalGroup);

  // =========================================================================
  // Layer 1: BGA Gold Contact Array & Interposer Frame
  // =========================================================================
  const bgaLayer = new THREE.Group();
  const bgaBaseY = 0.26;
  bgaLayer.position.y = bgaBaseY;

  // Interposer carrier frame
  const interposerGeo = trackGeo(createBeveledPlateGeometry(2.86, 2.86, 0.05, 0.18, 0.015));
  const interposerMesh = new THREE.Mesh(interposerGeo, matInterposer);
  interposerMesh.castShadow = true;
  interposerMesh.receiveShadow = true;
  bgaLayer.add(interposerMesh);

  // InstancedMesh of 196 BGA gold solder balls
  const ballGeo = trackGeo(new THREE.SphereGeometry(0.036, 12, 10));
  const gridDim = 14;
  const ballCount = gridDim * gridDim;
  const bgaBalls = new THREE.InstancedMesh(ballGeo, matBrassAccent, ballCount);
  let idx = 0;
  for (let gx = 0; gx < gridDim; gx++) {
    for (let gz = 0; gz < gridDim; gz++) {
      // Leave central hollow decoupling pattern authentic to mobile SoC BGA
      const px = (gx - (gridDim - 1) / 2) * 0.185;
      const pz = (gz - (gridDim - 1) / 2) * 0.185;
      _vec3A.set(px, -0.025, pz);
      _quat.identity();
      _scale.setScalar(1);
      _mat4.compose(_vec3A, _quat, _scale);
      bgaBalls.setMatrixAt(idx++, _mat4);
    }
  }
  bgaBalls.instanceMatrix.needsUpdate = true;
  bgaBalls.computeBoundingSphere();
  bgaBalls.castShadow = true;
  bgaLayer.add(bgaBalls);
  tagInteractable(bgaLayer, 'substrate', interactables);
  root.add(bgaLayer);

  // =========================================================================
  // Layer 2: Multi-Layer Organic Substrate & SMD Capacitors
  // =========================================================================
  const substrateLayer = new THREE.Group();
  const substrateBaseY = 0.36;
  substrateLayer.position.y = substrateBaseY;

  const subPlateGeo = trackGeo(createBeveledPlateGeometry(2.96, 2.96, 0.075, 0.16, 0.018));
  const subPlateMesh = new THREE.Mesh(subPlateGeo, matSubstrate);
  subPlateMesh.castShadow = true;
  subPlateMesh.receiveShadow = true;
  substrateLayer.add(subPlateMesh);

  // Gold perimeter wirebond / frame bezel
  const goldRimShape = createRoundedRectShape(2.1, 2.1, 0.08);
  const innerHole = createRoundedRectShape(1.94, 1.94, 0.05);
  goldRimShape.holes.push(innerHole);
  const goldRimGeo = trackGeo(
    new THREE.ExtrudeGeometry(goldRimShape, {
      depth: 0.022,
      bevelEnabled: true,
      bevelSize: 0.008,
      bevelThickness: 0.008,
      bevelSegments: 2,
    }),
  );
  goldRimGeo.rotateX(-Math.PI / 2);
  const goldRimMesh = new THREE.Mesh(goldRimGeo, matBrassAccent);
  goldRimMesh.position.y = 0.085;
  substrateLayer.add(goldRimMesh);

  // InstancedMesh of 36 SMD MLCC decoupling capacitors around substrate edge
  const smdGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.045, 0.055));
  const smdCount = 36;
  const smdCaps = new THREE.InstancedMesh(smdGeo, matCeramicCap, smdCount);
  let capIdx = 0;
  for (let side = 0; side < 4; side++) {
    for (let k = 0; k < 9; k++) {
      const offset = (k - 4) * 0.24;
      const dist = 1.24;
      if (side === 0) {
        _vec3A.set(offset, 0.105, dist);
        _quat.setFromEuler(new THREE.Euler(0, 0, 0));
      } else if (side === 1) {
        _vec3A.set(offset, 0.105, -dist);
        _quat.setFromEuler(new THREE.Euler(0, 0, 0));
      } else if (side === 2) {
        _vec3A.set(dist, 0.105, offset);
        _quat.setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
      } else {
        _vec3A.set(-dist, 0.105, offset);
        _quat.setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
      }
      _scale.set(1, 1, 1);
      _mat4.compose(_vec3A, _quat, _scale);
      smdCaps.setMatrixAt(capIdx++, _mat4);
    }
  }
  smdCaps.instanceMatrix.needsUpdate = true;
  smdCaps.computeBoundingSphere();
  smdCaps.castShadow = true;
  substrateLayer.add(smdCaps);

  tagInteractable(substrateLayer, 'substrate', interactables);
  root.add(substrateLayer);

  // =========================================================================
  // Layer 3: 3nm Silicon Die & Selectable Core Subsystems + Signal Packets
  // =========================================================================
  const dieLayer = new THREE.Group();
  const dieBaseY = 0.48;
  dieLayer.position.y = dieBaseY;

  // Monocrystalline 3nm Silicon Wafer Base
  const dieWaferGeo = trackGeo(createBeveledPlateGeometry(1.88, 1.88, 0.055, 0.06, 0.012));
  const dieWaferMesh = new THREE.Mesh(dieWaferGeo, matSiliconBase);
  dieWaferMesh.castShadow = true;
  dieWaferMesh.receiveShadow = true;
  dieLayer.add(dieWaferMesh);

  // 1. Qualcomm Oryon CPU Cluster (2 Prime @ 4.32 GHz + 6 Performance @ 3.53 GHz)
  const cpuGroup = new THREE.Group();
  cpuGroup.position.set(-0.42, 0.075, -0.38);
  const cpuBaseGeo = trackGeo(createBeveledPlateGeometry(0.76, 0.68, 0.04, 0.04, 0.01));
  cpuGroup.add(new THREE.Mesh(cpuBaseGeo, matCpuCluster));

  // 2 Larger Prime Cores (Top row)
  const primeCoreGeo = trackGeo(createBeveledPlateGeometry(0.3, 0.22, 0.06, 0.03, 0.008));
  [-0.17, 0.17].forEach((px) => {
    const primeCore = new THREE.Mesh(primeCoreGeo, matBrassAccent);
    primeCore.position.set(px, 0.04, -0.17);
    cpuGroup.add(primeCore);
  });

  // 6 Performance Cores (3x2 grid below Prime cores)
  const perfCoreGeo = trackGeo(createBeveledPlateGeometry(0.19, 0.14, 0.045, 0.02, 0.005));
  for (let col = -1; col <= 1; col++) {
    for (let row = 0; row < 2; row++) {
      const cMesh = new THREE.Mesh(perfCoreGeo, matCpuCluster);
      cMesh.position.set(col * 0.22, 0.04, 0.07 + row * 0.17);
      cpuGroup.add(cMesh);
    }
  }
  tagInteractable(cpuGroup, 'cpu', interactables);
  dieLayer.add(cpuGroup);

  // 2. GPU Architecture (Mali-G52 MC2 Dual Core for Helio G81 vs 3-Slice Adreno 830 for 8 Elite)
  const gpuGroup = new THREE.Group();
  gpuGroup.position.set(0.44, 0.075, -0.36);
  const gpuBaseGeo = trackGeo(createBeveledPlateGeometry(0.74, 0.7, 0.04, 0.04, 0.01));
  gpuGroup.add(new THREE.Mesh(gpuBaseGeo, matGpuCluster));
  const gpuSliceGeo = trackGeo(createBeveledPlateGeometry(0.19, 0.56, 0.048, 0.025, 0.007));
  const gpuSliceMeshes = [-0.22, 0, 0.22].map((sx) => {
    const slice = new THREE.Mesh(gpuSliceGeo, matGpuCluster);
    slice.position.set(sx, 0.04, 0);
    gpuGroup.add(slice);
    return slice;
  });
  tagInteractable(gpuGroup, 'gpu', interactables);
  dieLayer.add(gpuGroup);

  // 3. Neural Engine / NPU Systolic Array (Bottom-Left Quadrant)
  const npuGroup = new THREE.Group();
  npuGroup.position.set(-0.42, 0.075, 0.42);
  const npuBaseGeo = trackGeo(createBeveledPlateGeometry(0.72, 0.62, 0.04, 0.04, 0.01));
  npuGroup.add(new THREE.Mesh(npuBaseGeo, matNpuCluster));
  const npuNodeGeo = trackGeo(new THREE.CylinderGeometry(0.052, 0.058, 0.05, 6));
  for (let nx = -1; nx <= 1; nx++) {
    for (let nz = -1; nz <= 1; nz++) {
      const hex = new THREE.Mesh(npuNodeGeo, matNpuCluster);
      hex.position.set(nx * 0.19, 0.065, nz * 0.16);
      npuGroup.add(hex);
    }
  }
  tagInteractable(npuGroup, 'npu', interactables);
  dieLayer.add(npuGroup);

  // 4. Unified Cache & LPDDR5X High-Speed Memory Bridge (Bottom-Right & Center Spine)
  const cacheGroup = new THREE.Group();
  cacheGroup.position.set(0.44, 0.075, 0.42);
  const cacheBaseGeo = trackGeo(createBeveledPlateGeometry(0.74, 0.62, 0.04, 0.04, 0.01));
  cacheGroup.add(new THREE.Mesh(cacheBaseGeo, matCacheCluster));
  const slcBarGeo = trackGeo(createBeveledPlateGeometry(0.62, 0.11, 0.048, 0.02, 0.005));
  for (let b = -1; b <= 1; b++) {
    const bar = new THREE.Mesh(slcBarGeo, matCacheCluster);
    bar.position.set(0, 0.04, b * 0.17);
    cacheGroup.add(bar);
  }
  tagInteractable(cacheGroup, 'cache', interactables);
  dieLayer.add(cacheGroup);

  // Curved High-Speed Copper/Optical Bus Conduits connecting the 4 quadrants
  const busCurves = [
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.42, 0.115, -0.38),
      new THREE.Vector3(0, 0.145, -0.36),
      new THREE.Vector3(0.44, 0.115, -0.36),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.42, 0.115, -0.38),
      new THREE.Vector3(-0.4, 0.145, 0.02),
      new THREE.Vector3(-0.42, 0.115, 0.42),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.44, 0.115, -0.36),
      new THREE.Vector3(0.44, 0.145, 0.02),
      new THREE.Vector3(0.44, 0.115, 0.42),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.42, 0.115, 0.42),
      new THREE.Vector3(0, 0.145, 0.42),
      new THREE.Vector3(0.44, 0.115, 0.42),
    ]),
  ];
  busCurves.forEach((curve) => {
    const tubeGeo = trackGeo(new THREE.TubeGeometry(curve, 24, 0.014, 8, false));
    dieLayer.add(new THREE.Mesh(tubeGeo, matCopperInterconnect));
  });

  // Animated Signal Bus Data Packets (InstancedMesh, 48 packets)
  const packetGeo = trackGeo(new THREE.SphereGeometry(0.026, 10, 8));
  const matPacket = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
    }),
  );
  const packetCount = 48;
  const signalPackets = new THREE.InstancedMesh(packetGeo, matPacket, packetCount);
  signalPackets.frustumCulled = false;
  for (let i = 0; i < packetCount; i++) {
    _color.setHex(i % 2 === 0 ? 0x38bdf8 : 0xfbbf24);
    signalPackets.setColorAt(i, _color);
  }
  if (signalPackets.instanceColor) signalPackets.instanceColor.needsUpdate = true;
  dieLayer.add(signalPackets);

  root.add(dieLayer);

  // =========================================================================
  // Layer 4: 3nm GAA (Gate-All-Around) Nanosheet Transistor Architecture
  // =========================================================================
  const gaaLayer = new THREE.Group();
  const gaaBaseY = 0.64;
  gaaLayer.position.y = gaaBaseY;

  // Source & Drain Epitaxial Silicon Pillars (LatheGeometry)
  const pillarPts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.16, 0),
    new THREE.Vector2(0.16, 0.06),
    new THREE.Vector2(0.12, 0.09),
    new THREE.Vector2(0.12, 0.38),
    new THREE.Vector2(0.15, 0.41),
    new THREE.Vector2(0.15, 0.44),
    new THREE.Vector2(0, 0.44),
  ];
  const pillarGeo = trackGeo(new THREE.LatheGeometry(pillarPts, 24));
  const sourcePillar = new THREE.Mesh(pillarGeo, matPedestalMetal);
  sourcePillar.position.set(-0.56, 0, 0);
  sourcePillar.castShadow = true;
  gaaLayer.add(sourcePillar);

  const drainPillar = new THREE.Mesh(pillarGeo, matPedestalMetal);
  drainPillar.position.set(0.56, 0, 0);
  drainPillar.castShadow = true;
  gaaLayer.add(drainPillar);

  // 3 Vertically Stacked Horizontal Silicon Nanosheet Ribbons
  const nanosheetGeo = trackGeo(createBeveledPlateGeometry(1.06, 0.34, 0.042, 0.05, 0.008));
  const sheetHeights = [0.11, 0.22, 0.33];
  sheetHeights.forEach((sy) => {
    const sheet = new THREE.Mesh(nanosheetGeo, matSiliconChannel);
    sheet.position.set(0, sy, 0);
    sheet.castShadow = true;
    gaaLayer.add(sheet);
  });

  // Gate-All-Around (GAA) Surrounding Metal Gate Block (wraps all 4 sides!)
  const gateGeo = trackGeo(createBeveledPlateGeometry(0.46, 0.46, 0.38, 0.06, 0.015));
  const gateMesh = new THREE.Mesh(gateGeo, matHighKGate);
  gateMesh.position.set(0, 0.05, 0);
  gateMesh.renderOrder = 6;
  gaaLayer.add(gateMesh);

  // Copper Gate Contact Bus Bar & Vertical Via
  const gateCapGeo = trackGeo(createBeveledPlateGeometry(0.52, 0.16, 0.04, 0.03, 0.008));
  const gateCap = new THREE.Mesh(gateCapGeo, matCopperInterconnect);
  gateCap.position.set(0, 0.45, 0);
  gaaLayer.add(gateCap);

  // InstancedMesh of 36 Electron Flow Particles streaming across the 3 nanosheets
  const electronGeo = trackGeo(new THREE.SphereGeometry(0.018, 8, 8));
  const matElectron = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
    }),
  );
  const electronCount = 36;
  const electronFlow = new THREE.InstancedMesh(electronGeo, matElectron, electronCount);
  electronFlow.frustumCulled = false;
  gaaLayer.add(electronFlow);

  tagInteractable(gaaLayer, 'transistor', interactables);
  root.add(gaaLayer);

  // =========================================================================
  // Layer 5: Vapor Chamber, Brushed Titanium IHS Cap & Optical Inspection Ring
  // =========================================================================
  const ihsLayer = new THREE.Group();
  const ihsBaseY = 0.72;
  ihsLayer.position.y = ihsBaseY;

  // Copper Vapor Chamber Micro-Fin Core
  const vaporBaseGeo = trackGeo(createBeveledPlateGeometry(2.15, 2.15, 0.04, 0.12, 0.01));
  const vaporBase = new THREE.Mesh(vaporBaseGeo, matCopperInterconnect);
  vaporBase.position.y = 0;
  ihsLayer.add(vaporBase);

  // Curved dual vapor chamber copper heatpipes
  const pipeLeftCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.75, 0.04, -0.75),
    new THREE.Vector3(-0.55, 0.075, 0),
    new THREE.Vector3(-0.75, 0.04, 0.75),
  ]);
  const pipeRightCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.75, 0.04, -0.75),
    new THREE.Vector3(0.55, 0.075, 0),
    new THREE.Vector3(0.75, 0.04, 0.75),
  ]);
  [pipeLeftCurve, pipeRightCurve].forEach((c) => {
    const pGeo = trackGeo(new THREE.TubeGeometry(c, 20, 0.025, 10, false));
    ihsLayer.add(new THREE.Mesh(pGeo, matCopperInterconnect));
  });

  // Stepped Brushed Titanium IHS Lid (with laser-etched 3nm GAA marking)
  const ihsBodyGeo = trackGeo(createBeveledPlateGeometry(2.38, 2.38, 0.075, 0.16, 0.02));
  const ihsBody = new THREE.Mesh(ihsBodyGeo, matTitaniumIHS);
  ihsBody.position.y = 0.075;
  ihsBody.castShadow = true;
  ihsBody.receiveShadow = true;
  ihsLayer.add(ihsBody);

  // Protective Optical Sapphire Inspection Ring sitting atop IHS
  const ringShape = createRoundedRectShape(2.56, 2.56, 0.22);
  ringShape.holes.push(createRoundedRectShape(2.14, 2.14, 0.14));
  const optRingGeo = trackGeo(
    new THREE.ExtrudeGeometry(ringShape, {
      depth: 0.055,
      bevelEnabled: true,
      bevelSize: 0.015,
      bevelThickness: 0.015,
      bevelSegments: 3,
    }),
  );
  optRingGeo.rotateX(-Math.PI / 2);
  const optRingMesh = new THREE.Mesh(optRingGeo, matOpticalRing);
  optRingMesh.position.y = 0.06;
  optRingMesh.renderOrder = 10;
  ihsLayer.add(optRingMesh);

  tagInteractable(ihsLayer, 'ihs', interactables);
  root.add(ihsLayer);

  // =========================================================================
  // Exploded View Layer Definitions & Dynamic State
  // =========================================================================
  const layers: SocLayerHandle[] = [
    { group: bgaLayer, baseY: bgaBaseY, explodeOffset: 0.18 },
    { group: substrateLayer, baseY: substrateBaseY, explodeOffset: 0.56 },
    { group: dieLayer, baseY: dieBaseY, explodeOffset: 1.08 },
    { group: gaaLayer, baseY: gaaBaseY, explodeOffset: 1.72 },
    { group: ihsLayer, baseY: ihsBaseY, explodeOffset: 2.36 },
  ];

  let currentExplode = 0.35;
  let currentHeatFactor = 0.15;
  let lastChip: ChipId = 'helio-g81';

  // Map subsystem IDs to materials for clean hover/selection highlights
  const highlightMap: Partial<Record<SubsystemId, THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial>> = {
    cpu: matCpuCluster,
    gpu: matGpuCluster,
    npu: matNpuCluster,
    cache: matCacheCluster,
    transistor: matSiliconChannel,
    ihs: matTitaniumIHS,
    substrate: matSubstrate,
  };

  const baseEmissives: Partial<Record<SubsystemId, number>> = {
    cpu: 0.25,
    gpu: 0.35,
    npu: 0.32,
    cache: 0.18,
    transistor: 0.45,
    ihs: 0.0,
    substrate: 0.0,
  };

  function update(
    dt: number,
    elapsed: number,
    explodeTarget: number,
    chip: ChipId,
    workload: WorkloadId,
    selectedSubsystem: SubsystemId | null,
    hoveredSubsystem: SubsystemId | null,
  ): { settled: boolean } {
    const safeDt = Math.min(dt, 0.05);
    const prevExplode = currentExplode;
    currentExplode = THREE.MathUtils.damp(currentExplode, explodeTarget, 7.5, safeDt);

    if (chip !== lastChip) {
      lastChip = chip;
      matTitaniumIHS.map =
        chip === 'helio-g81' ? textures.ihsAlbedoG81 : textures.ihsAlbedoElite;
      matTitaniumIHS.needsUpdate = true;
    }

    // Reflect GPU core layout: 2 cores (Mali-G52 MC2) vs 3 slices (Adreno 830)
    if (chip === 'helio-g81') {
      gpuSliceMeshes[0].position.x = -0.14;
      gpuSliceMeshes[1].position.x = 0.14;
      gpuSliceMeshes[2].visible = false;
    } else {
      gpuSliceMeshes[0].position.x = -0.22;
      gpuSliceMeshes[1].position.x = 0;
      gpuSliceMeshes[2].visible = true;
    }

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      layer.group.position.y =
        layer.baseY + currentExplode * layer.explodeOffset;
    }

    // Transistor showcase layer visibly scales softly into focus as layers separate
    const gaaVisibilityScale = THREE.MathUtils.clamp(
      0.58 + currentExplode * 0.42,
      0.58,
      1.0,
    );
    gaaLayer.scale.setScalar(gaaVisibilityScale);

    // Workload & Chip Physics/Visual Response
    const profile = WORKLOAD_PROFILES[workload];
    const is3nm = chip === 'sd-8-elite';
    const nodeSpeedMult = is3nm ? 1.45 : 0.85;
    const targetHeat = is3nm
      ? profile.pulseIntensity * 0.18
      : profile.pulseIntensity * 0.55;
    currentHeatFactor = THREE.MathUtils.damp(
      currentHeatFactor,
      targetHeat,
      5.0,
      safeDt,
    );

    // Update Die Emissive Glow
    _color.setHex(is3nm ? 0x38bdf8 : 0xf59e0b);
    matSiliconBase.emissive.copy(_color);
    matSiliconBase.emissiveIntensity =
      0.3 + profile.pulseIntensity * (is3nm ? 0.58 : 0.45);

    // Subtle thermal tint on IHS under heavy load
    _color.setHex(0xef4444).multiplyScalar(currentHeatFactor * 0.38);
    matTitaniumIHS.emissive.copy(_color);
    matTitaniumIHS.emissiveIntensity = 1.0;

    // Highlight selected or hovered subsystem
    (Object.keys(highlightMap) as SubsystemId[]).forEach((key) => {
      const mat = highlightMap[key];
      if (!mat) return;
      const baseE = baseEmissives[key] ?? 0;
      if (selectedSubsystem === key) {
        mat.emissiveIntensity = baseE + 0.65;
        if (key === 'ihs' || key === 'substrate') {
          mat.emissive.setHex(0xf59e0b);
        }
      } else if (hoveredSubsystem === key) {
        mat.emissiveIntensity = baseE + 0.35;
        if (key === 'ihs' || key === 'substrate') {
          mat.emissive.setHex(0x38bdf8);
        }
      } else {
        if (key === 'substrate') {
          mat.emissive.setHex(0x000000);
        }
        mat.emissiveIntensity = baseE;
      }
    });

    // Animate 48 Data Packets smoothly along the 4 silicon bus curves
    const packetRate = profile.packetSpeed * nodeSpeedMult * 0.36;
    for (let i = 0; i < packetCount; i++) {
      const curve = busCurves[i % busCurves.length];
      const phase = ((i / packetCount) + elapsed * packetRate) % 1;
      curve.getPointAt(phase, _vec3A);
      _quat.identity();
      const s = 0.72 + profile.pulseIntensity * 0.42;
      _scale.setScalar(s);
      _mat4.compose(_vec3A, _quat, _scale);
      signalPackets.setMatrixAt(i, _mat4);
    }
    signalPackets.instanceMatrix.needsUpdate = true;

    // Animate 36 Electrons streaming through the transistor channels
    const electronRate = profile.packetSpeed * nodeSpeedMult * 0.52;
    for (let i = 0; i < electronCount; i++) {
      const sheetIdx = i % 3;
      const lane = Math.floor(i / 3) % 3;
      const t = ((i / electronCount) * 3 + elapsed * electronRate) % 1;
      const x = -0.46 + t * 0.92;
      const y = sheetHeights[sheetIdx] + 0.024;
      const z = (lane - 1) * 0.095;
      _vec3B.set(x, y, z);
      _quat.identity();
      _scale.setScalar(is3nm ? 1.0 : 0.78);
      _mat4.compose(_vec3B, _quat, _scale);
      electronFlow.setMatrixAt(i, _mat4);
    }
    electronFlow.instanceMatrix.needsUpdate = true;

    const settled = Math.abs(currentExplode - prevExplode) < 0.0002;
    return { settled };
  }

  function dispose() {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
  }

  return {
    root,
    interactables,
    update,
    dispose,
  };
}
