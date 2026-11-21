import * as THREE from 'three';

export interface ProceduralTextureSet {
  dieAlbedo: THREE.CanvasTexture;
  dieEmissive: THREE.CanvasTexture;
  dieBump: THREE.CanvasTexture;
  substrateAlbedo: THREE.CanvasTexture;
  substrateBump: THREE.CanvasTexture;
  ihsAlbedoG81: THREE.CanvasTexture;
  ihsAlbedoElite: THREE.CanvasTexture;
  ihsRoughness: THREE.CanvasTexture;
  stageGrid: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

function configureTexture(
  tex: THREE.CanvasTexture,
  isColor: boolean,
  anisotropy: number,
): THREE.CanvasTexture {
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = anisotropy;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(
  maxAnisotropy: number,
): ProceduralTextureSet {
  const aniso = Math.max(1, Math.min(maxAnisotropy, 16));

  // 1. Silicon Die Lithography (1024x1024)
  const dieSize = 1024;
  const dieCanvas = document.createElement('canvas');
  dieCanvas.width = dieSize;
  dieCanvas.height = dieSize;
  const dCtx = dieCanvas.getContext('2d')!;

  const dieEmissiveCanvas = document.createElement('canvas');
  dieEmissiveCanvas.width = dieSize;
  dieEmissiveCanvas.height = dieSize;
  const eCtx = dieEmissiveCanvas.getContext('2d')!;

  const dieBumpCanvas = document.createElement('canvas');
  dieBumpCanvas.width = dieSize;
  dieBumpCanvas.height = dieSize;
  const bCtx = dieBumpCanvas.getContext('2d')!;

  // Base monocrystalline silicon gradient
  const waferGrad = dCtx.createLinearGradient(0, 0, dieSize, dieSize);
  waferGrad.addColorStop(0, '#0d1829');
  waferGrad.addColorStop(0.5, '#13243b');
  waferGrad.addColorStop(1, '#0b1422');
  dCtx.fillStyle = waferGrad;
  dCtx.fillRect(0, 0, dieSize, dieSize);

  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, dieSize, dieSize);

  bCtx.fillStyle = '#505050';
  bCtx.fillRect(0, 0, dieSize, dieSize);

  // Microscopic lithography grid
  dCtx.strokeStyle = 'rgba(110, 175, 255, 0.10)';
  dCtx.lineWidth = 1;
  bCtx.strokeStyle = '#707070';
  bCtx.lineWidth = 1;
  for (let i = 32; i < dieSize; i += 32) {
    dCtx.beginPath();
    dCtx.moveTo(i, 24);
    dCtx.lineTo(i, dieSize - 24);
    dCtx.stroke();
    dCtx.beginPath();
    dCtx.moveTo(24, i);
    dCtx.lineTo(dieSize - 24, i);
    dCtx.stroke();

    bCtx.beginPath();
    bCtx.moveTo(i, 24);
    bCtx.lineTo(i, dieSize - 24);
    bCtx.stroke();
  }

  // Functional floorplan sub-cells (deterministic micro-blocks)
  const blocks = [
    { x: 70, y: 70, w: 390, h: 360, c: '#1a365d', e: '#38bdf8', rows: 14, cols: 12 },
    { x: 500, y: 70, w: 454, h: 360, c: '#1e293b', e: '#f59e0b', rows: 16, cols: 18 },
    { x: 70, y: 470, w: 420, h: 484, c: '#162c46', e: '#38bdf8', rows: 18, cols: 14 },
    { x: 530, y: 470, w: 424, h: 484, c: '#232030', e: '#fbbf24', rows: 20, cols: 16 },
  ];

  blocks.forEach((blk) => {
    dCtx.fillStyle = blk.c;
    dCtx.fillRect(blk.x, blk.y, blk.w, blk.h);
    dCtx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    dCtx.lineWidth = 2;
    dCtx.strokeRect(blk.x, blk.y, blk.w, blk.h);

    bCtx.fillStyle = '#9e9e9e';
    bCtx.fillRect(blk.x, blk.y, blk.w, blk.h);

    const cellW = (blk.w - 24) / blk.cols;
    const cellH = (blk.h - 24) / blk.rows;
    for (let r = 0; r < blk.rows; r++) {
      for (let c = 0; c < blk.cols; c++) {
        const cx = blk.x + 12 + c * cellW + 2;
        const cy = blk.y + 12 + r * cellH + 2;
        const cw = Math.max(2, cellW - 4);
        const ch = Math.max(2, cellH - 4);

        const hash = Math.sin(r * 19.3 + c * 7.7 + blk.x) * 0.5 + 0.5;
        dCtx.fillStyle =
          hash > 0.68
            ? 'rgba(245, 158, 11, 0.28)'
            : hash > 0.3
              ? 'rgba(56, 189, 248, 0.22)'
              : 'rgba(148, 163, 184, 0.14)';
        dCtx.fillRect(cx, cy, cw, ch);

        bCtx.fillStyle = hash > 0.5 ? '#d8d8d8' : '#7c7c7c';
        bCtx.fillRect(cx, cy, cw, ch);

        if (hash > 0.78) {
          eCtx.fillStyle = blk.e;
          eCtx.globalAlpha = 0.55;
          eCtx.fillRect(cx, cy, cw, ch);
          eCtx.globalAlpha = 1;
        }
      }
    }
  });

  // Central high-speed interconnect bus lines
  eCtx.strokeStyle = '#38bdf8';
  eCtx.lineWidth = 3;
  for (let offset = -18; offset <= 18; offset += 9) {
    eCtx.beginPath();
    eCtx.moveTo(480 + offset, 50);
    eCtx.lineTo(480 + offset, dieSize - 50);
    eCtx.stroke();

    eCtx.beginPath();
    eCtx.moveTo(50, 450 + offset);
    eCtx.lineTo(dieSize - 50, 450 + offset);
    eCtx.stroke();
  }

  // Outer perimeter seal ring
  dCtx.strokeStyle = '#d4a145';
  dCtx.lineWidth = 6;
  dCtx.strokeRect(18, 18, dieSize - 36, dieSize - 36);

  // 2. Multi-Layer Organic Substrate PCB (1024x1024)
  const subCanvas = document.createElement('canvas');
  subCanvas.width = 1024;
  subCanvas.height = 1024;
  const sCtx = subCanvas.getContext('2d')!;

  const subBumpCanvas = document.createElement('canvas');
  subBumpCanvas.width = 1024;
  subBumpCanvas.height = 1024;
  const sbCtx = subBumpCanvas.getContext('2d')!;

  sCtx.fillStyle = '#0c1d1b';
  sCtx.fillRect(0, 0, 1024, 1024);
  sbCtx.fillStyle = '#555555';
  sbCtx.fillRect(0, 0, 1024, 1024);

  // Radial differential copper traces from center die footprint to perimeter
  sCtx.strokeStyle = '#1b433c';
  sCtx.lineWidth = 3;
  sbCtx.strokeStyle = '#999999';
  sbCtx.lineWidth = 3;

  for (let i = 0; i < 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    const r1 = 230;
    const r2 = 460;
    const x1 = 512 + Math.cos(angle) * r1;
    const y1 = 512 + Math.sin(angle) * r1;
    const xm = 512 + Math.cos(angle) * 340;
    const ym = 512 + Math.sin(angle) * 340;
    const x2 = 512 + Math.cos(angle + 0.03) * r2;
    const y2 = 512 + Math.sin(angle + 0.03) * r2;

    sCtx.beginPath();
    sCtx.moveTo(x1, y1);
    sCtx.lineTo(xm, ym);
    sCtx.lineTo(x2, y2);
    sCtx.stroke();

    sbCtx.beginPath();
    sbCtx.moveTo(x1, y1);
    sbCtx.lineTo(xm, ym);
    sbCtx.lineTo(x2, y2);
    sbCtx.stroke();

    // Copper-gold micro via pad
    sCtx.fillStyle = '#c8953a';
    sCtx.beginPath();
    sCtx.arc(x2, y2, 4.5, 0, Math.PI * 2);
    sCtx.fill();
  }

  // Gold fiducial rings and bus pads around center
  sCtx.strokeStyle = 'rgba(212, 161, 69, 0.55)';
  sCtx.lineWidth = 4;
  sCtx.strokeRect(230, 230, 564, 564);
  sCtx.strokeRect(48, 48, 928, 928);

  // 3. Brushed Titanium IHS Cap Textures (1024x1024) for Helio G81 & 8 Elite
  const createIhsTexture = (
    accentHex: string,
    title: string,
    subtitle: string,
    footer: string,
  ): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const metalGrad = ctx.createLinearGradient(0, 0, 1024, 1024);
    metalGrad.addColorStop(0, '#8d96a5');
    metalGrad.addColorStop(0.5, '#b6becb');
    metalGrad.addColorStop(1, '#798393');
    ctx.fillStyle = metalGrad;
    ctx.fillRect(0, 0, 1024, 1024);

    for (let y = 0; y < 1024; y += 2) {
      const v = Math.floor(110 + (Math.sin(y * 0.73) * 0.5 + 0.5) * 45);
      ctx.fillStyle = `rgba(255, 255, 255, ${((v - 110) / 45) * 0.08})`;
      ctx.fillRect(0, y, 1024, 1);
    }

    ctx.strokeStyle = 'rgba(30, 41, 59, 0.55)';
    ctx.lineWidth = 4;
    ctx.strokeRect(86, 86, 852, 852);

    ctx.fillStyle = accentHex;
    ctx.fillRect(256, 360, 512, 8);

    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.font = '700 64px "IBM Plex Mono", monospace';
    ctx.fillText(title, 512, 465);
    ctx.font = '700 38px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#b45309';
    ctx.fillText(subtitle, 512, 530);
    ctx.font = '600 26px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#334155';
    ctx.fillText(footer, 512, 585);

    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(116, 116);
    ctx.lineTo(176, 116);
    ctx.lineTo(116, 176);
    ctx.closePath();
    ctx.fill();

    return configureTexture(new THREE.CanvasTexture(canvas), true, aniso);
  };

  const ihsAlbedoG81 = createIhsTexture(
    '#0284c7',
    'MEDIATEK HELIO G81',
    '12nm · A75/A55 2.0 GHz',
    'MALI-G52 MC2 · HYPERENGINE',
  );
  const ihsAlbedoElite = createIhsTexture(
    '#c83e37',
    'SNAPDRAGON 8 ELITE',
    '3nm · ORYON 4.32 GHz',
    'ADRENO 830 · HEXAGON NPU',
  );

  const ihsRoughCanvas = document.createElement('canvas');
  ihsRoughCanvas.width = 1024;
  ihsRoughCanvas.height = 1024;
  const irCtx = ihsRoughCanvas.getContext('2d')!;
  irCtx.fillStyle = '#484848';
  irCtx.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 2) {
    const v = Math.floor(110 + (Math.sin(y * 0.73) * 0.5 + 0.5) * 45);
    irCtx.fillStyle = `rgb(${v - 40}, ${v - 40}, ${v - 40})`;
    irCtx.fillRect(0, y, 1024, 1);
  }

  // 4. Precision Optical Stage Grid (1024x1024)
  const stageCanvas = document.createElement('canvas');
  stageCanvas.width = 1024;
  stageCanvas.height = 1024;
  const stCtx = stageCanvas.getContext('2d')!;
  stCtx.fillStyle = '#0c111a';
  stCtx.fillRect(0, 0, 1024, 1024);

  stCtx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
  stCtx.lineWidth = 2;
  [160, 260, 360, 450].forEach((radius) => {
    stCtx.beginPath();
    stCtx.arc(512, 512, radius, 0, Math.PI * 2);
    stCtx.stroke();
  });

  // Angular tick marks
  for (let a = 0; a < 72; a++) {
    const theta = (a / 72) * Math.PI * 2;
    const inner = a % 6 === 0 ? 430 : 442;
    const outer = 454;
    stCtx.strokeStyle =
      a % 6 === 0 ? 'rgba(245, 158, 11, 0.45)' : 'rgba(148, 163, 184, 0.22)';
    stCtx.lineWidth = a % 6 === 0 ? 3 : 1.5;
    stCtx.beginPath();
    stCtx.moveTo(512 + Math.cos(theta) * inner, 512 + Math.sin(theta) * inner);
    stCtx.lineTo(512 + Math.cos(theta) * outer, 512 + Math.sin(theta) * outer);
    stCtx.stroke();
  }

  // 5. Soft Radial Contact Shadow Texture (512x512)
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 512;
  shadowCanvas.height = 512;
  const shCtx = shadowCanvas.getContext('2d')!;
  const radGrad = shCtx.createRadialGradient(256, 256, 40, 256, 256, 250);
  radGrad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  radGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.34)');
  radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  shCtx.fillStyle = radGrad;
  shCtx.fillRect(0, 0, 512, 512);

  const dieAlbedo = configureTexture(new THREE.CanvasTexture(dieCanvas), true, aniso);
  const dieEmissive = configureTexture(
    new THREE.CanvasTexture(dieEmissiveCanvas),
    true,
    aniso,
  );
  const dieBump = configureTexture(new THREE.CanvasTexture(dieBumpCanvas), false, aniso);
  const substrateAlbedo = configureTexture(
    new THREE.CanvasTexture(subCanvas),
    true,
    aniso,
  );
  const substrateBump = configureTexture(
    new THREE.CanvasTexture(subBumpCanvas),
    false,
    aniso,
  );
  const ihsRoughness = configureTexture(
    new THREE.CanvasTexture(ihsRoughCanvas),
    false,
    aniso,
  );
  const stageGrid = configureTexture(
    new THREE.CanvasTexture(stageCanvas),
    true,
    aniso,
  );
  const contactShadow = configureTexture(
    new THREE.CanvasTexture(shadowCanvas),
    true,
    aniso,
  );

  return {
    dieAlbedo,
    dieEmissive,
    dieBump,
    substrateAlbedo,
    substrateBump,
    ihsAlbedoG81,
    ihsAlbedoElite,
    ihsRoughness,
    stageGrid,
    contactShadow,
    dispose: () => {
      dieAlbedo.dispose();
      dieEmissive.dispose();
      dieBump.dispose();
      substrateAlbedo.dispose();
      substrateBump.dispose();
      ihsAlbedoG81.dispose();
      ihsAlbedoElite.dispose();
      ihsRoughness.dispose();
      stageGrid.dispose();
      contactShadow.dispose();
    },
  };
}
