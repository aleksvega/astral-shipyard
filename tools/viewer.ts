import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { createProceduralTextures } from '../lib/three/textures';
import { loadTexturePack } from '../lib/three/texture-pack';
import { generateShip } from '../lib/three/ship/generate';
import { paletteFromHints } from '../lib/three/ship/engine/paint';
import type { ShipBlueprint } from '../lib/three/ship/engine/spec';
import { parseShipText } from '../lib/three/ship/engine/text';

/**
 * Голова без человека: страница получает задание в window.__SHIP_JOB__, собирает
 * борт, отдаёт кадр и кладёт отчёт в window.__SHIP_RESULT__. Её дёргает CLI,
 * поэтому здесь нет ни UI, ни сервера — только геометрия и один кадр.
 */

interface ShipJob {
  text?: string;
  faction?: string;
  classId?: string;
  seed?: number;
  width?: number;
  height?: number;
  view?: 'three-quarter' | 'side' | 'front' | 'top';
  background?: string | null;
  glb?: boolean;
  packManifest?: string;
}

const VIEWS: Record<string, THREE.Vector3> = {
  'three-quarter': new THREE.Vector3(0.55, 0.4, 1),
  side: new THREE.Vector3(1, 0.12, 0.04),
  front: new THREE.Vector3(0.02, 0.16, 1),
  top: new THREE.Vector3(0.02, 1, 0.08),
};

async function boot(): Promise<void> {
  const job: ShipJob = (window as unknown as { __SHIP_JOB__?: ShipJob }).__SHIP_JOB__ ?? {};
  const parsed = job.text ? parseShipText(job.text) : null;
  const faction = job.faction ?? parsed?.build.faction ?? 'league';
  const classId = job.classId ?? parsed?.build.classId ?? 'galleon';
  const seed = job.seed ?? parsed?.build.seed ?? 1000;
  const width = job.width ?? 1280;
  const height = job.height ?? 800;
  const background = job.background === undefined ? '#0b1224' : job.background;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: background === null });
  renderer.setPixelRatio(1.5);
  renderer.setSize(width, height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (background === null) renderer.setClearAlpha(0);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  if (background !== null) {
    scene.background = new THREE.Color(background);
    scene.fog = new THREE.Fog(background, 160, 320);
  }

  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const pack = job.packManifest ? await loadTexturePack(job.packManifest, anisotropy) : null;
  const textures = createProceduralTextures(anisotropy, pack);
  const blueprint: Partial<ShipBlueprint> = {
    sails: parsed?.build.sails,
    gunRows: parsed?.build.gunRows,
    masts: parsed?.build.masts,
    palette: parsed?.build.paletteHints.length
      ? paletteFromHints(parsed.build.paletteHints, {})
      : undefined,
  };
  const ship = generateShip({ seed, faction, classId, textures, blueprint });

  scene.add(new THREE.HemisphereLight(0xbfe0ff, 0x3b2a5a, 1.7));
  const key = new THREE.DirectionalLight(0xffe6bd, 2.4);
  key.position.set(14, 22, 16);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x6fa8ff, 1.3);
  rim.position.set(-16, 9, -18);
  scene.add(rim);
  scene.add(ship.root);

  const camera = new THREE.PerspectiveCamera(26, width / height, 0.5, 900);
  const box = new THREE.Box3().setFromObject(ship.root);
  const center = box.getCenter(new THREE.Vector3());
  const dir = (VIEWS[job.view ?? 'three-quarter'] ?? VIEWS['three-quarter']).clone().normalize();
  let dist = box.getSize(new THREE.Vector3()).length() * 1.25;
  const corner = new THREE.Vector3();
  for (let pass = 0; pass < 5; pass++) {
    camera.position.copy(center).addScaledVector(dir, dist);
    camera.lookAt(center);
    camera.updateMatrixWorld();
    let worst = 0;
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          corner.set(x, y, z).project(camera);
          worst = Math.max(worst, Math.abs(corner.x), Math.abs(corner.y));
        }
      }
    }
    dist *= worst / 0.9;
  }
  camera.position.copy(center).addScaledVector(dir, dist);
  camera.lookAt(center);

  renderer.render(scene, camera);

  let meshes = 0;
  let barrels = 0;
  let hullColor: string | null = null;
  let normalStats: { meanB: number; spreadRG: number } | null = null;
  ship.root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    meshes++;
    if (mesh.name === 'cannon-barrel') barrels++;
    if (mesh.name === 'hull-body') {
      const material = mesh.material as THREE.MeshStandardMaterial;
      hullColor = `#${material.color.getHexString()}`;
      const image = material.normalMap?.image as HTMLCanvasElement | undefined;
      if (image instanceof HTMLCanvasElement) {
        const data = image.getContext('2d')!.getImageData(0, 0, image.width, image.height).data;
        let sumB = 0;
        let sumR = 0;
        let sumR2 = 0;
        let sumG = 0;
        let sumG2 = 0;
        const count = image.width * image.height;
        for (let i = 0; i < count; i++) {
          const r = data[i * 4] / 255;
          const g = data[i * 4 + 1] / 255;
          sumB += data[i * 4 + 2] / 255;
          sumR += r;
          sumR2 += r * r;
          sumG += g;
          sumG2 += g * g;
        }
        const meanR = sumR / count;
        const meanG = sumG / count;
        normalStats = {
          meanB: sumB / count,
          spreadRG: Math.sqrt(sumR2 / count - meanR * meanR) + Math.sqrt(sumG2 / count - meanG * meanG),
        };
      }
    }
  });

  const report: Record<string, unknown> = {
    dna: ship.dna,
    meshes,
    barrels,
    hullColor,
    normalStats,
    parsed: parsed ? { build: parsed.build, notes: parsed.notes } : null,
    view: job.view ?? 'three-quarter',
    packUsed: Boolean(pack),
    glb: null,
  };

  const done = (): void => {
    (window as unknown as { __SHIP_RESULT__?: unknown }).__SHIP_RESULT__ = report;
  };

  if (!job.glb) {
    done();
    return;
  }

  const exporter = new GLTFExporter();
  exporter.parse(
    ship.root,
    (result) => {
      if (result instanceof ArrayBuffer) {
        const bytes = new Uint8Array(result);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) {
          binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        }
        report.glb = btoa(binary);
        report.glbBytes = bytes.length;
      }
      done();
    },
    (error) => {
      report.glbError = String(error);
      done();
    },
    { binary: true },
  );
}

void boot();
