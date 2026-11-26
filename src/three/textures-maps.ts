import * as THREE from 'three';

/**
 * Карты поверхности: высота → нормали (Sobel) и шероховатость.
 *
 * Раньше рельеф был `bumpMap` — он не даёт направленных бликов и в GLB едет
 * как обычная картинка. Нормали считаются из карты высот детерминированно:
 * никакой случайности, только формулы, поэтому один сид даёт один результат.
 */

type Ctx = CanvasRenderingContext2D;

function canvasOf(size: number): [HTMLCanvasElement, Ctx] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return [canvas, canvas.getContext('2d')!];
}

/** Детерминированный «шум» без Math.random: значение 0..1 из координат. */
function hash(x: number, y: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function heightToNormal(
  source: HTMLCanvasElement,
  strength: number,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const size = source.width;
  const src = source.getContext('2d')!.getImageData(0, 0, size, size).data;
  const [canvas, ctx] = canvasOf(size);
  const out = ctx.createImageData(size, size);
  const height = (x: number, y: number): number => {
    const px = ((y + size) % size) * size + ((x + size) % size);
    return src[px * 4] / 255;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx =
        height(x - 1, y - 1) + 2 * height(x - 1, y) + height(x - 1, y + 1) -
        (height(x + 1, y - 1) + 2 * height(x + 1, y) + height(x + 1, y + 1));
      const dy =
        height(x - 1, y - 1) + 2 * height(x, y - 1) + height(x + 1, y - 1) -
        (height(x - 1, y + 1) + 2 * height(x, y + 1) + height(x + 1, y + 1));
      const nx = dx * strength;
      const ny = dy * strength;
      const length = Math.hypot(nx, ny, 1);
      const index = (y * size + x) * 4;
      out.data[index] = Math.round(((nx / length + 1) / 2) * 255);
      out.data[index + 1] = Math.round(((ny / length + 1) / 2) * 255);
      out.data[index + 2] = Math.round(((1 / length + 1) / 2) * 255);
      out.data[index + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = maxAnisotropy;
  return texture;
}

function grayTexture(canvas: HTMLCanvasElement, maxAnisotropy: number): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = maxAnisotropy;
  return texture;
}

/** Ряды досок с заклёпками: тот же рисунок, что на лаке Лиги. */
function drawLacquerHeight(ctx: Ctx, size: number): void {
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 42) {
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(0, y, size, 4);
    ctx.fillStyle = '#b4b4b4';
    ctx.fillRect(0, y + 4, size, 3);
    for (let x = 12; x < size; x += 48) {
      ctx.fillStyle = '#d8d8d8';
      ctx.beginPath();
      ctx.arc(x, y + 2, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let y = 0; y < size; y += 42) {
    const shift = (y / 42) % 2 === 0 ? 0 : 24;
    for (let x = 0; x < size; x += 96) {
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(x + shift, y, 3, 40);
    }
  }
}

/** Клёпаные плиты Империи. */
function drawSteelHeight(ctx: Ctx, size: number): void {
  ctx.fillStyle = '#7d7d7d';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 64) {
    for (let x = 0; x < size; x += 64) {
      ctx.fillStyle = `rgb(${118 + Math.round(hash(x, y) * 24)},${118 + Math.round(hash(x, y) * 24)},${118 + Math.round(hash(x, y) * 24)})`;
      ctx.fillRect(x + 3, y + 3, 58, 58);
      ctx.fillStyle = '#232323';
      ctx.fillRect(x, y, 64, 3);
      ctx.fillRect(x, y, 3, 64);
      for (const [rx, ry] of [
        [x + 9, y + 9],
        [x + 55, y + 9],
        [x + 9, y + 55],
        [x + 55, y + 55],
      ]) {
        ctx.fillStyle = '#e8e8e8';
        ctx.beginPath();
        ctx.arc(rx, ry, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/** Орки: куски брони внахлёст, шов — валик сварки, а не аккуратный стык. */
function drawScrapHeight(ctx: Ctx, size: number): void {
  ctx.fillStyle = '#6a6a6a';
  ctx.fillRect(0, 0, size, size);
  const step = Math.round(size / 3);
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const jitterX = Math.round((hash(x, y) - 0.5) * 10);
      const jitterY = Math.round((hash(y, x) - 0.5) * 10);
      const tone = 96 + Math.round(hash(x + 7, y + 3) * 46);
      ctx.fillStyle = `rgb(${tone},${tone},${tone})`;
      ctx.fillRect(x + jitterX, y + jitterY, step - 4, step - 4);
    }
  }
  // Валик шва: яркие бугры вдоль стыков
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 5;
  for (let y = step; y < size; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < size; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.4) * 2);
    ctx.stroke();
  }
  for (let x = step; x < size; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y < size; y += 8) ctx.lineTo(x + Math.cos(y * 0.4) * 2, y);
    ctx.stroke();
  }
  for (let i = 0; i < 90; i += 1) {
    ctx.fillStyle = '#dcdcdc';
    ctx.beginPath();
    ctx.arc(hash(i, 11) * size, hash(11, i) * size, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Гоблины: костяная обшивка — поры и трещины вместо листов. */
function drawBoneHeight(ctx: Ctx, size: number): void {
  ctx.fillStyle = '#c4c4c4';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 260; i += 1) {
    const radius = 1 + hash(i, 3) * 4;
    ctx.fillStyle = `rgb(${Math.round(40 + hash(i, 9) * 40)},${Math.round(40 + hash(i, 9) * 40)},${Math.round(40 + hash(i, 9) * 40)})`;
    ctx.beginPath();
    ctx.arc(hash(i, 5) * size, hash(5, i) * size, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i += 1) {
    const startX = hash(i, 21) * size;
    const startY = hash(21, i) * size;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    let x = startX;
    let y = startY;
    for (let stepIndex = 0; stepIndex < 6; stepIndex += 1) {
      x += (hash(i + stepIndex, 4) - 0.5) * 34;
      y += (hash(4, i + stepIndex) - 0.5) * 34;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

/** Доски палубы. */
function drawWoodHeight(ctx: Ctx, size: number): void {
  ctx.fillStyle = '#7a7a7a';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 32) {
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(0, y + 29, size, 3);
    for (let x = 0; x < size; x += 8) {
      const grain = 0.5 + 0.5 * Math.sin((x + y * 3.7) * 0.09);
      ctx.fillStyle = `rgba(20,20,20,${0.06 * grain})`;
      ctx.fillRect(x, y + 2, 6, 26);
    }
  }
}

/** Латунь: вмятины и потёртости, низкая амплитуда. */
function drawBrassHeight(ctx: Ctx, size: number): void {
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 180; i++) {
    const x = (i * 97 + 31) % size;
    const y = (i * 61 + 17) % size;
    const r = 4 + ((i * 7) % 14);
    ctx.fillStyle = i % 5 === 0 ? 'rgba(58,58,58,0.55)' : 'rgba(28,28,28,0.45)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(20,20,20,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    const y = (i * 37) % size;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(80, y + 6, 170, y - 5, size, y + 2);
    ctx.stroke();
  }
}

/** Шероховатость: чем светлее, тем матовее. */
function drawRoughness(ctx: Ctx, size: number, base: number, spec: Array<[number, number, number]>): void {
  ctx.fillStyle = `rgb(${base},${base},${base})`;
  ctx.fillRect(0, 0, size, size);
  for (const [kind, spacing, value] of spec) {
    for (let i = 0; i < size; i += spacing) {
      ctx.fillStyle = `rgba(${value},${value},${value},0.5)`;
      if (kind === 0) ctx.fillRect(0, i, size, 3);
      else ctx.fillRect(i, 0, 3, size);
    }
  }
}

export interface SurfaceMaps {
  lacquerNormal: THREE.Texture;
  lacquerRough: THREE.Texture;
  steelNormal: THREE.Texture;
  steelRough: THREE.Texture;
  scrapNormal: THREE.Texture;
  scrapRough: THREE.Texture;
  boneNormal: THREE.Texture;
  boneRough: THREE.Texture;
  woodNormal: THREE.Texture;
  brassNormal: THREE.Texture;
  brassRough: THREE.Texture;
  dispose: () => void;
}

export function createSurfaceMaps(maxAnisotropy: number): SurfaceMaps {
  const size = 256;
  const lacquer = canvasOf(size);
  drawLacquerHeight(lacquer[1], size);
  const steel = canvasOf(size);
  drawSteelHeight(steel[1], size);
  const wood = canvasOf(size);
  drawWoodHeight(wood[1], size);
  const brass = canvasOf(size);
  drawBrassHeight(brass[1], size);
  const scrap = canvasOf(size);
  drawScrapHeight(scrap[1], size);
  const bone = canvasOf(size);
  drawBoneHeight(bone[1], size);

  const lacquerRoughCanvas = canvasOf(size);
  lacquerRoughCanvas[1].fillStyle = '#5a5a5a';
  lacquerRoughCanvas[1].fillRect(0, 0, size, size);
  drawRoughness(lacquerRoughCanvas[1], size, 90, [
    [0, 42, 170],
    [1, 96, 150],
  ]);
  const steelRoughCanvas = canvasOf(size);
  steelRoughCanvas[1].fillStyle = '#8c8c8c';
  steelRoughCanvas[1].fillRect(0, 0, size, size);
  drawRoughness(steelRoughCanvas[1], size, 140, [
    [0, 64, 185],
    [1, 64, 185],
  ]);

  const scrapRoughCanvas = canvasOf(size);
  scrapRoughCanvas[1].fillStyle = '#a2a2a2';
  scrapRoughCanvas[1].fillRect(0, 0, size, size);
  drawRoughness(scrapRoughCanvas[1], size, 190, [
    [0, 70, 220],
    [1, 90, 200],
  ]);
  const boneRoughCanvas = canvasOf(size);
  boneRoughCanvas[1].fillStyle = '#b4b4b4';
  boneRoughCanvas[1].fillRect(0, 0, size, size);
  drawRoughness(boneRoughCanvas[1], size, 160, [
    [0, 100, 230],
    [1, 120, 200],
  ]);

  const maps: SurfaceMaps = {
    lacquerNormal: heightToNormal(lacquer[0], 2.2, maxAnisotropy),
    lacquerRough: grayTexture(lacquerRoughCanvas[0], maxAnisotropy),
    steelNormal: heightToNormal(steel[0], 2.6, maxAnisotropy),
    steelRough: grayTexture(steelRoughCanvas[0], maxAnisotropy),
    scrapNormal: heightToNormal(scrap[0], 3.2, maxAnisotropy),
    scrapRough: grayTexture(scrapRoughCanvas[0], maxAnisotropy),
    boneNormal: heightToNormal(bone[0], 2.4, maxAnisotropy),
    boneRough: grayTexture(boneRoughCanvas[0], maxAnisotropy),
    woodNormal: heightToNormal(wood[0], 1.4, maxAnisotropy),
    brassNormal: heightToNormal(brass[0], 1.1, maxAnisotropy),
    brassRough: grayTexture(brass[0], maxAnisotropy),
    dispose: () => {
      maps.lacquerNormal.dispose();
      maps.lacquerRough.dispose();
      maps.steelNormal.dispose();
      maps.steelRough.dispose();
      maps.scrapNormal.dispose();
      maps.scrapRough.dispose();
      maps.boneNormal.dispose();
      maps.boneRough.dispose();
      maps.woodNormal.dispose();
      maps.brassNormal.dispose();
      maps.brassRough.dispose();
    },
  };
  return maps;
}
