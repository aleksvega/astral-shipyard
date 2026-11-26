import * as THREE from 'three';
import { addCupola, addGriffonHead } from './decor';
import type { Rng } from './rng';
import type { ShipMaterials } from './style';
import type { SocketKind } from './sockets';

/**
 * Каталог частей. Часть моделируется в локальной системе: нос/выступ в −Z,
 * верх в +Y, начало координат — на стыке. Тогда посадка в сокет — это позиция
 * плюс один кватернион, и любая часть стыкуется к любому подходящему месту.
 */

export interface PartStats {
  ram: number;
  speed: number;
  armor: number;
  energy: number;
}

export interface PartDef {
  id: string;
  label: string;
  slot: SocketKind;
  /** Минимальный типоразмер корабля, которому подходит часть. */
  size: 1 | 2 | 3;
  weight: number;
  build: (mats: ShipMaterials, rng: Rng) => THREE.Object3D;
  stats?: Partial<PartStats>;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function group(): THREE.Group {
  return new THREE.Group();
}

/* ── Нос ─────────────────────────────────────────────────────────────── */

function buildGriffon(mats: ShipMaterials): THREE.Object3D {
  const g = group();
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xff2d1f,
    emissive: 0xb0140b,
    emissiveIntensity: 1.2,
    roughness: 0.4,
  });
  addGriffonHead(g, { pos: V(0, 0.1, -0.9), scale: 1.5, bodyMat: mats.trim, goldMat: mats.trim, eyeMat });

  const sprit = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 3.6, 8), mats.wood);
  sprit.rotation.x = Math.PI / 2 + 0.08;
  sprit.position.set(0, 0.12, -1.9);
  g.add(sprit);
  return g;
}

function buildRamPart(mats: ShipMaterials): THREE.Object3D {
  const g = group();
  const ram = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.6, 12), mats.dark);
  ram.rotation.x = -Math.PI / 2;
  ram.position.set(0, 0, -1.3);
  g.add(ram);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5 - i * 0.1, 0.06, 5, 14), mats.trim);
    ring.position.set(0, 0, -0.3 - i * 0.5);
    g.add(ring);
  }
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 1.0), mats.trim);
  crest.position.set(0, 0.42, -0.8);
  g.add(crest);
  return g;
}

function buildBeak(mats: ShipMaterials): THREE.Object3D {
  const g = group();
  const upper = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.9, 8), mats.trim);
  upper.rotation.x = -Math.PI / 2 + 0.12;
  upper.position.set(0, 0.26, -1.1);
  g.add(upper);
  const lower = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.3, 8), mats.dark);
  lower.rotation.x = -Math.PI / 2 - 0.08;
  lower.position.set(0, -0.14, -0.85);
  g.add(lower);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mats.glass);
    eye.position.set(side * 0.2, 0.18, -0.62);
    g.add(eye);
  }
  return g;
}

function buildIdol(mats: ShipMaterials): THREE.Object3D {
  const g = group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 0.3, 6), mats.trim);
  base.position.set(0, -0.1, 0);
  g.add(base);
  for (let i = 0; i < 3; i++) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(0.9 - i * 0.22, 0.22, 0.46), mats.dark);
    slab.position.set(0, 0.15 + i * 0.26, -0.12 - i * 0.14);
    g.add(slab);
  }
  const eye = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), mats.core);
  eye.position.set(0, 0.78, -0.55);
  g.add(eye);
  return g;
}

/* ── Корма ───────────────────────────────────────────────────────────── */

function buildDomeTiers(mats: ShipMaterials, rng: Rng): THREE.Object3D {
  const g = group();
  const tiers = rng.int(2, 3);
  for (let i = 0; i < tiers; i++) {
    const shrink = 1 - i * 0.22;
    const tier = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3 * shrink, 1.55 * shrink, 0.85, 4),
      mats.wood,
    );
    tier.rotation.y = Math.PI / 4;
    tier.position.set(0, 0.45 + i * 0.9, 0.1 + i * 0.2);
    g.add(tier);
  }
  const lastTop = 0.45 + (tiers - 1) * 0.9 + 0.42;
  const crownZ = 0.1 + (tiers - 1) * 0.2;
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.24, 10), mats.trim);
  plinth.position.set(0, lastTop + 0.12, crownZ);
  g.add(plinth);
  addCupola(g, { pos: V(0, lastTop + 0.1, crownZ), radius: 0.75, domeMat: mats.trim, goldMat: mats.trim });

  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.34, 0.12), mats.glass);
  glass.position.set(0, 0.55, -0.72);
  g.add(glass);
  return g;
}

function buildCastle(mats: ShipMaterials, rng: Rng): THREE.Object3D {
  const g = group();
  const height = rng.range(1.5, 2.4);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(1.9, height, 1.5), mats.hull);
  tower.position.set(0, height / 2, 0.2);
  g.add(tower);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.7, 4), mats.trim);
  roof.rotation.y = Math.PI / 4;
  roof.position.set(0, height + 0.35, 0.2);
  g.add(roof);

  const band = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.1), mats.glass);
  band.position.set(0, height * 0.62, -0.56);
  g.add(band);
  return g;
}

function buildFanFrame(mats: ShipMaterials): THREE.Object3D {
  const g = group();
  for (let i = 0; i < 5; i++) {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.05, 5, 18, Math.PI * 0.55), mats.trim);
    arc.position.set(0, 0.15, -0.25);
    arc.rotation.z = Math.PI * (0.2 + i * 0.13);
    g.add(arc);
  }
  const panel = new THREE.Mesh(new THREE.CircleGeometry(1.25, 18), mats.glass);
  panel.position.set(0, 0.85, -0.34);
  g.add(panel);
  return g;
}

function buildNozzleBank(mats: ShipMaterials): THREE.Object3D {
  const g = group();
  for (let i = -1; i <= 1; i++) {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 1.4, 12), mats.trim);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(i * 0.85, 0.2, -0.7);
    g.add(nozzle);

    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.3, 14), mats.core);
    glow.position.set(i * 0.85, 0.2, -1.42);
    g.add(glow);
  }
  const spine = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 1.1), mats.trim);
  spine.position.set(0, 0.55, -0.5);
  g.add(spine);
  return g;
}

/* ── Двигатели ───────────────────────────────────────────────────────── */

function buildPaddleWheel(mats: ShipMaterials): THREE.Object3D {
  const g = group();
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.18, 16), mats.wood);
  drum.rotation.x = Math.PI / 2;
  g.add(drum);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.07, 6, 20), mats.trim);
  g.add(ring);
  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.7, 0.1), mats.trim);
    spoke.rotation.z = (i * Math.PI) / 8;
    g.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mats.trim);
  g.add(hub);
  return g;
}

function buildNozzles(mats: ShipMaterials): THREE.Object3D {
  const g = group();
  for (const side of [-1, 1]) {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 1.2, 10), mats.dark);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(side * 0.4, 0, -0.6);
    g.add(nozzle);

    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), mats.core);
    glow.position.set(side * 0.4, 0, -1.22);
    g.add(glow);
  }
  return g;
}

/* ── Палуба ──────────────────────────────────────────────────────────── */

function buildBridgeTower(mats: ShipMaterials, rng: Rng): THREE.Object3D {
  const g = group();
  const h = rng.range(1.1, 1.8);
  const w = rng.range(1.0, 1.4);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.9), mats.hull);
  tower.position.set(0, h / 2, 0);
  g.add(tower);

  const bridge = new THREE.Mesh(new THREE.BoxGeometry(w * 1.25, 0.22, w * 0.7), mats.trim);
  bridge.position.set(0, h + 0.11, 0);
  g.add(bridge);

  const slit = new THREE.Mesh(new THREE.BoxGeometry(w * 1.05, 0.12, w * 0.35), mats.glass);
  slit.position.set(0, h * 0.72, -w * 0.45);
  g.add(slit);
  return g;
}

function buildCupolaPart(mats: ShipMaterials): THREE.Object3D {
  const g = group();
  addCupola(g, { pos: V(0, 0, 0), radius: 0.62, domeMat: mats.trim, goldMat: mats.trim });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.3, 10), mats.wood);
  drum.position.y = -0.1;
  g.add(drum);
  return g;
}

function buildSpineRibs(mats: ShipMaterials, rng: Rng): THREE.Object3D {
  const g = group();
  const count = rng.int(2, 3);
  for (let i = 0; i < count; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 5, 16, Math.PI), mats.trim);
    rib.rotation.y = Math.PI / 2;
    rib.position.set(0, 0.05, -0.5 + i * 0.6);
    g.add(rib);
  }
  return g;
}

export const PARTS: PartDef[] = [
  { id: 'griffon', label: 'Голова грифона', slot: 'bow', size: 1, weight: 5, build: buildGriffon, stats: { energy: 0.05 } },
  { id: 'ram', label: 'Таран', slot: 'bow', size: 1, weight: 3, build: buildRamPart, stats: { ram: 0.2 } },
  { id: 'beak', label: 'Клюв', slot: 'bow', size: 1, weight: 3, build: buildBeak, stats: { speed: 0.05 } },
  { id: 'idol', label: 'Идол', slot: 'bow', size: 2, weight: 2, build: buildIdol, stats: { armor: 0.06 } },

  { id: 'domeTiers', label: 'Купола кормы', slot: 'stern', size: 1, weight: 5, build: buildDomeTiers, stats: { energy: 0.08 } },
  { id: 'fanFrame', label: 'Веер кормы', slot: 'stern', size: 1, weight: 3, build: buildFanFrame, stats: { speed: 0.05 } },
  { id: 'castle', label: 'Кормовая башня', slot: 'stern', size: 1, weight: 3, build: buildCastle, stats: { armor: 0.1 } },
  { id: 'nozzleBank', label: 'Сопла кормы', slot: 'stern', size: 2, weight: 2, build: buildNozzleBank, stats: { speed: 0.12 } },

  { id: 'turbineWheels', label: 'Гребные колёса', slot: 'engine', size: 1, weight: 4, build: buildPaddleWheel, stats: { speed: 0.1 } },
  { id: 'nozzles', label: 'Сопла двигателя', slot: 'engine', size: 1, weight: 3, build: buildNozzles, stats: { speed: 0.14 } },

  { id: 'bridgeTower', label: 'Ходовой мостик', slot: 'deck', size: 1, weight: 4, build: buildBridgeTower, stats: { armor: 0.05 } },
  { id: 'cupola', label: 'Купол', slot: 'deck', size: 1, weight: 3, build: buildCupolaPart, stats: { energy: 0.06 } },
  { id: 'spineRibs', label: 'Рёбра', slot: 'deck', size: 1, weight: 3, build: buildSpineRibs, stats: { armor: 0.03 } },
];

const BY_ID = new Map(PARTS.map((p) => [p.id, p]));

export function getPart(id: string): PartDef | undefined {
  return BY_ID.get(id);
}
