import * as THREE from 'three';
import { createSurfaceMaps, type SurfaceMaps } from './textures-maps';
import type { TexturePack } from './texture-pack';

function createCanvas(size = 256): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export interface ProceduralTextureSet {
  leagueWoodMap: THREE.Texture;
  leagueWoodBump: THREE.Texture;
  empireSteelMap: THREE.Texture;
  empireSteelBump: THREE.Texture;
  astralSailMap: THREE.Texture;
  allodRockMap: THREE.Texture;
  brassPatinaMap: THREE.Texture;
  leagueLacquerMap: THREE.Texture;
  surfaces: SurfaceMaps;
  dispose: () => void;
}

export function createProceduralTextures(
  maxAnisotropy: number,
  pack: TexturePack | null = null,
): ProceduralTextureSet {
  // 1. League carved oak planks with subtle golden trim seams
  const [woodC, woodCtx] = createCanvas(256);
  woodCtx.fillStyle = '#6f4728';
  woodCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    woodCtx.fillStyle = y % 64 === 0 ? '#7b502e' : '#653f22';
    woodCtx.fillRect(0, y, 256, 30);
    woodCtx.fillStyle = '#3d2412';
    woodCtx.fillRect(0, y + 30, 256, 2);
    // Grain streaks
    woodCtx.strokeStyle = 'rgba(42, 22, 8, 0.28)';
    woodCtx.lineWidth = 1;
    for (let g = 0; g < 10; g++) {
      woodCtx.beginPath();
      const gy = y + 3 + (g * 2.7);
      woodCtx.moveTo(0, gy);
      woodCtx.bezierCurveTo(85, gy + Math.sin(g) * 2, 170, gy - Math.cos(g) * 2, 256, gy);
      woodCtx.stroke();
    }
  }
  const leagueWoodMap = new THREE.CanvasTexture(woodC);
  leagueWoodMap.colorSpace = THREE.SRGBColorSpace;
  leagueWoodMap.wrapS = leagueWoodMap.wrapT = THREE.RepeatWrapping;
  leagueWoodMap.repeat.set(2, 2);
  leagueWoodMap.anisotropy = maxAnisotropy;

  const [woodB, woodBCtx] = createCanvas(256);
  woodBCtx.fillStyle = '#808080';
  woodBCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    woodBCtx.fillStyle = '#303030';
    woodBCtx.fillRect(0, y + 30, 256, 2);
  }
  const leagueWoodBump = new THREE.CanvasTexture(woodB);
  leagueWoodBump.wrapS = leagueWoodBump.wrapT = THREE.RepeatWrapping;
  leagueWoodBump.repeat.set(2, 2);

  // 2. Empire riveted dark iron & brass hull plates
  const [steelC, steelCtx] = createCanvas(256);
  steelCtx.fillStyle = '#373e4d';
  steelCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 64) {
    for (let x = 0; x < 256; x += 64) {
      steelCtx.fillStyle = (x + y) % 128 === 0 ? '#3f4758' : '#313745';
      steelCtx.fillRect(x + 2, y + 2, 60, 60);
      steelCtx.strokeStyle = '#1b202b';
      steelCtx.lineWidth = 2;
      steelCtx.strokeRect(x + 1, y + 1, 62, 62);
      // Brass rivets
      steelCtx.fillStyle = '#a88446';
      const pts = [
        [x + 8, y + 8],
        [x + 56, y + 8],
        [x + 8, y + 56],
        [x + 56, y + 56],
      ];
      for (const [rx, ry] of pts) {
        steelCtx.beginPath();
        steelCtx.arc(rx, ry, 2.2, 0, Math.PI * 2);
        steelCtx.fill();
      }
    }
  }
  const empireSteelMap = new THREE.CanvasTexture(steelC);
  empireSteelMap.colorSpace = THREE.SRGBColorSpace;
  empireSteelMap.wrapS = empireSteelMap.wrapT = THREE.RepeatWrapping;
  empireSteelMap.repeat.set(2, 2);
  empireSteelMap.anisotropy = maxAnisotropy;

  const [steelB, steelBCtx] = createCanvas(256);
  steelBCtx.fillStyle = '#808080';
  steelBCtx.fillRect(0, 0, 256, 256);
  steelBCtx.strokeStyle = '#252525';
  steelBCtx.lineWidth = 3;
  for (let i = 0; i < 256; i += 64) {
    steelBCtx.strokeRect(i, 0, 64, 256);
    steelBCtx.strokeRect(0, i, 256, 64);
  }
  const empireSteelBump = new THREE.CanvasTexture(steelB);
  empireSteelBump.wrapS = empireSteelBump.wrapT = THREE.RepeatWrapping;
  empireSteelBump.repeat.set(2, 2);

  // 3. Ethereal League Runic Astral Sail
  const [sailC, sailCtx] = createCanvas(256);
  const grad = sailCtx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#eef7ff');
  grad.addColorStop(0.55, '#a8e6ff');
  grad.addColorStop(1, '#38bdf8');
  sailCtx.fillStyle = grad;
  sailCtx.fillRect(0, 0, 256, 256);
  // Gold embroidered border + Allods compass emblem
  sailCtx.strokeStyle = '#d9a441';
  sailCtx.lineWidth = 8;
  sailCtx.strokeRect(12, 12, 232, 232);
  sailCtx.strokeStyle = 'rgba(217, 164, 65, 0.85)';
  sailCtx.lineWidth = 4;
  sailCtx.beginPath();
  sailCtx.arc(128, 128, 54, 0, Math.PI * 2);
  sailCtx.stroke();
  for (let a = 0; a < 8; a++) {
    const ang = (a * Math.PI) / 4;
    sailCtx.beginPath();
    sailCtx.moveTo(128 + Math.cos(ang) * 18, 128 + Math.sin(ang) * 18);
    sailCtx.lineTo(128 + Math.cos(ang) * 72, 128 + Math.sin(ang) * 72);
    sailCtx.stroke();
  }
  const astralSailMap = new THREE.CanvasTexture(sailC);
  astralSailMap.colorSpace = THREE.SRGBColorSpace;
  astralSailMap.anisotropy = maxAnisotropy;

  // 4. Allod stone rock with glowing astral veins
  const [rockC, rockCtx] = createCanvas(256);
  rockCtx.fillStyle = '#3b3c54';
  rockCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 48; i++) {
    rockCtx.fillStyle = i % 2 === 0 ? 'rgba(84, 88, 118, 0.45)' : 'rgba(28, 28, 44, 0.5)';
    const x = (i * 53) % 256;
    const y = (i * 97) % 256;
    rockCtx.fillRect(x, y, 28 + (i % 24), 18 + (i % 16));
  }
  rockCtx.strokeStyle = 'rgba(79, 209, 255, 0.45)';
  rockCtx.lineWidth = 2;
  rockCtx.beginPath();
  rockCtx.moveTo(20, 40);
  rockCtx.lineTo(110, 120);
  rockCtx.lineTo(220, 95);
  rockCtx.stroke();
  const allodRockMap = new THREE.CanvasTexture(rockC);
  allodRockMap.colorSpace = THREE.SRGBColorSpace;
  allodRockMap.wrapS = allodRockMap.wrapT = THREE.RepeatWrapping;
  allodRockMap.anisotropy = maxAnisotropy;

  // 5. Патинированная латунь: матовое золото с зеленью в углублениях
  const [brassC, brassCtx] = createCanvas(256);
  brassCtx.fillStyle = '#c3a75e';
  brassCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    const x = (i * 97 + 31) % 256;
    const y = (i * 61 + 17) % 256;
    const r = 5 + ((i * 7) % 16);
    const green = i % 5 === 0;
    brassCtx.fillStyle = green
      ? `rgba(96, 106, 62, ${0.16 + (i % 4) * 0.05})`
      : `rgba(58, 42, 16, ${0.2 + (i % 4) * 0.07})`;
    brassCtx.beginPath();
    brassCtx.arc(x, y, r, 0, Math.PI * 2);
    brassCtx.fill();
  }
  brassCtx.strokeStyle = 'rgba(228, 206, 148, 0.35)';
  brassCtx.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    const y = (i * 37) % 256;
    brassCtx.beginPath();
    brassCtx.moveTo(0, y);
    brassCtx.bezierCurveTo(80, y + 6, 170, y - 5, 256, y + 2);
    brassCtx.stroke();
  }
  const brassPatinaMap = new THREE.CanvasTexture(brassC);
  brassPatinaMap.colorSpace = THREE.SRGBColorSpace;
  brassPatinaMap.wrapS = brassPatinaMap.wrapT = THREE.RepeatWrapping;
  brassPatinaMap.anisotropy = maxAnisotropy;

  // 6. Черлёный лак: тёмный оксблад с тонкой золотой филигранью
  const [lacquerC, lacquerCtx] = createCanvas(256);
  lacquerCtx.fillStyle = '#390c0f';
  lacquerCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    const x = (i * 53 + 11) % 256;
    const y = (i * 29 + 71) % 256;
    lacquerCtx.fillStyle = `rgba(12, 3, 4, ${0.16 + (i % 4) * 0.07})`;
    lacquerCtx.beginPath();
    lacquerCtx.ellipse(x, y, 10 + (i % 9), 4 + (i % 5), i, 0, Math.PI * 2);
    lacquerCtx.fill();
  }
  // Завитки филиграни: тонкие золотые спирали
  lacquerCtx.strokeStyle = 'rgba(214, 170, 82, 0.78)';
  lacquerCtx.lineWidth = 1.6;
  for (let i = 0; i < 22; i++) {
    const cx = (i * 41 + 24) % 256;
    const cy = (i * 67 + 38) % 256;
    lacquerCtx.beginPath();
    for (let a = 0; a < 18; a++) {
      const ang = a * 0.5;
      const rr = 2 + a * 0.8;
      const px = cx + Math.cos(ang) * rr;
      const py = cy + Math.sin(ang) * rr;
      if (a === 0) lacquerCtx.moveTo(px, py);
      else lacquerCtx.lineTo(px, py);
    }
    lacquerCtx.stroke();
  }
  // Обшивка: горизонтальные стыки досок и заклёпки по ним — борт читается наборным
  for (let y = 0; y < 256; y += 42) {
    lacquerCtx.fillStyle = 'rgba(8, 2, 3, 0.9)';
    lacquerCtx.fillRect(0, y, 256, 4);
    lacquerCtx.fillStyle = 'rgba(150, 96, 74, 0.32)';
    lacquerCtx.fillRect(0, y + 4, 256, 3);
    lacquerCtx.fillStyle = 'rgba(232, 194, 112, 0.7)';
    for (let x = 12; x < 256; x += 48) {
      lacquerCtx.beginPath();
      lacquerCtx.arc(x, y + 2, 2.4, 0, Math.PI * 2);
      lacquerCtx.fill();
    }
  }
  // Вертикальные стыки панелей со сдвигом по рядам
  for (let y = 0; y < 256; y += 42) {
    const shift = (y / 42) % 2 === 0 ? 0 : 24;
    for (let x = 0; x < 256; x += 96) {
      lacquerCtx.fillStyle = 'rgba(10, 3, 4, 0.75)';
      lacquerCtx.fillRect(x + shift, y, 3, 40);
    }
  }
  const leagueLacquerMap = new THREE.CanvasTexture(lacquerC);
  leagueLacquerMap.colorSpace = THREE.SRGBColorSpace;
  leagueLacquerMap.wrapS = leagueLacquerMap.wrapT = THREE.RepeatWrapping;
  leagueLacquerMap.anisotropy = maxAnisotropy;

  const surfaces = createSurfaceMaps(maxAnisotropy);

  // Настоящие сканы сильнее процедурки: подменяем карты, если набор пришёл.
  if (pack?.plates) {
    if (pack.plates.normal) surfaces.steelNormal = pack.plates.normal;
    if (pack.plates.rough) surfaces.steelRough = pack.plates.rough;
  }
  if (pack?.wood?.normal) surfaces.woodNormal = pack.wood.normal;
  if (pack?.metal) {
    if (pack.metal.normal) surfaces.brassNormal = pack.metal.normal;
    if (pack.metal.rough) surfaces.brassRough = pack.metal.rough;
  }
  for (const texture of [pack?.plates?.color, pack?.wood?.color, pack?.metal?.color]) {
    texture?.repeat.set(2, 2);
  }

  return {
    leagueWoodMap: pack?.wood?.color ?? leagueWoodMap,
    leagueWoodBump,
    empireSteelMap: pack?.plates?.color ?? empireSteelMap,
    empireSteelBump,
    astralSailMap,
    allodRockMap,
    brassPatinaMap: pack?.metal?.color ?? brassPatinaMap,
    leagueLacquerMap,
    surfaces,
    dispose: () => {
      leagueWoodMap.dispose();
      leagueWoodBump.dispose();
      empireSteelMap.dispose();
      empireSteelBump.dispose();
      astralSailMap.dispose();
      allodRockMap.dispose();
      brassPatinaMap.dispose();
      leagueLacquerMap.dispose();
      surfaces.dispose();
    },
  };
}

/**
 * Подмена уже собранных материалов на CC0-сканы: сцену не пересобираем, только
 * меняем карты у тех материалов, что пришли из процедурного набора.
 */
export function applyPackToMaterials(
  root: THREE.Object3D,
  textures: ProceduralTextureSet,
  pack: TexturePack,
): number {
  let patched = 0;
  const patch = (material: THREE.Material): void => {
    const standard = material as THREE.MeshStandardMaterial;
    if (!standard.isMeshStandardMaterial || !standard.map) return;
    if (standard.map === textures.empireSteelMap && pack.plates) {
      if (pack.plates.color) standard.map = pack.plates.color;
      if (pack.plates.normal) standard.normalMap = pack.plates.normal;
      if (pack.plates.rough) standard.roughnessMap = pack.plates.rough;
    } else if (standard.map === textures.leagueWoodMap && pack.wood) {
      if (pack.wood.color) standard.map = pack.wood.color;
      if (pack.wood.normal) standard.normalMap = pack.wood.normal;
    } else if (standard.map === textures.brassPatinaMap && pack.metal) {
      if (pack.metal.color) standard.map = pack.metal.color;
      if (pack.metal.normal) standard.normalMap = pack.metal.normal;
      if (pack.metal.rough) standard.roughnessMap = pack.metal.rough;
    } else {
      return;
    }
    standard.needsUpdate = true;
    patched++;
  };
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach(patch);
    else if (material) patch(material);
  });
  return patched;
}
