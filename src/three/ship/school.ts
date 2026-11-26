import * as THREE from 'three';
import { hullSurfaceHit, type ShipFrame } from './assemble';
import type { HullProfile } from './hull';
import type { Rng } from './rng';
import type { ShipMaterials } from './style';

/**
 * Школа корпуса — то, что делает фракции разными не палитрой, а постройкой.
 * Лига клепает округлые гондолы, Империя прессует гранёные клинья, орки
 * сваривают кривые корыта из кусков, гоблины насаживают шипы, нейтралы
 * строят скучные транспортники.
 */
export type HullSchool = 'gondola' | 'wedge' | 'scrap' | 'spike' | 'civil';

export interface School {
  id: HullSchool;
  label: string;
  /** Полнота обвода: 0.72 круглый борт, 0.32 почти ящик. */
  bilgeExp: number;
  /** Точек в полусечении: 7 круглый, 3 гранёный. */
  ringPoints: number;
  /** Множитель завала борта вверху. */
  tumblehome: number;
  /** Продольная кривизна корпуса: 0 симметрично, 0.14 гуляет. */
  asymmetry: number;
  /** Множитель глубины киля. */
  keel: number;
  /** Множитель седловатости палубы. */
  sheer: number;
  /** Вынос носа вперёд, 1 — как есть. */
  bowReach: number;
  /** Накладные заплаты на бортах. */
  patches: number;
  /** Шипы по килю и скуле. */
  spikes: number;
}

export const SCHOOLS: Record<HullSchool, School> = {
  gondola: {
    id: 'gondola',
    label: 'гондола',
    bilgeExp: 0.72,
    ringPoints: 7,
    tumblehome: 1,
    asymmetry: 0,
    keel: 1,
    sheer: 1,
    bowReach: 1,
    patches: 0,
    spikes: 0,
  },
  wedge: {
    id: 'wedge',
    label: 'клин',
    bilgeExp: 0.34,
    ringPoints: 5,
    tumblehome: 0.25,
    asymmetry: 0,
    keel: 1.3,
    sheer: 0.15,
    bowReach: 1.22,
    patches: 0,
    spikes: 0,
  },
  scrap: {
    id: 'scrap',
    label: 'сварное корыто',
    bilgeExp: 0.5,
    ringPoints: 4,
    tumblehome: 0.5,
    asymmetry: 0.13,
    keel: 1.15,
    sheer: 0.5,
    bowReach: 0.96,
    patches: 7,
    spikes: 0,
  },
  spike: {
    id: 'spike',
    label: 'шипастый',
    bilgeExp: 0.6,
    ringPoints: 5,
    tumblehome: 0.7,
    asymmetry: 0.05,
    keel: 1.55,
    sheer: 0.7,
    bowReach: 1.12,
    patches: 0,
    spikes: 9,
  },
  civil: {
    id: 'civil',
    label: 'транспорт',
    bilgeExp: 0.66,
    ringPoints: 6,
    tumblehome: 0.8,
    asymmetry: 0.02,
    keel: 0.8,
    sheer: 0.42,
    bowReach: 0.92,
    patches: 2,
    spikes: 0,
  },
};

/** Правка профиля под школу. Форму задаёт школа, размеры — класс. */
export function applySchool(profile: HullProfile, school: School): HullProfile {
  return {
    ...profile,
    zBow: profile.zBow * school.bowReach,
    keelDepth: profile.keelDepth * school.keel,
    bowSheer: profile.bowSheer * school.sheer,
    sternSheer: profile.sternSheer * school.sheer,
    tumblehome: profile.tumblehome * school.tumblehome,
    ringPoints: school.ringPoints,
    bilgeExp: school.bilgeExp,
    asymmetry: school.asymmetry,
  };
}

/**
 * Следы ремонта и шипы: прикручиваются к реальной поверхности борта, поэтому
 * не висят в воздухе даже на кривом оркском корпусе.
 */
export function addSchoolTrim(
  root: THREE.Group,
  profile: HullProfile,
  frame: ShipFrame,
  mats: ShipMaterials,
  school: School,
  rng: Rng,
): void {
  const rust = new THREE.MeshStandardMaterial({ color: 0x8a5a2a, roughness: 0.82, metalness: 0.45 });
  const bone = new THREE.MeshStandardMaterial({ color: 0xb9ad8a, roughness: 0.7, metalness: 0.1 });
  const zBow = profile.zBow;
  const zStern = profile.zStern;

  for (let i = 0; i < school.patches; i++) {
    const z = rng.range(zBow + 1.2, zStern - 1.2);
    for (const side of [1, -1] as const) {
      if (!rng.chance(0.75)) continue;
      const y = frame.deckY(z) - rng.range(0.5, 1.5);
      const x = hullSurfaceHit(frame.hull, side, y, z);
      if (x === null) continue;
      const w = rng.range(1.0, 2.4);
      const h = rng.range(0.6, 1.3);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, w), rust);
      plate.position.set(side * (Math.abs(x) + 0.05), y, z);
      plate.rotation.x = rng.range(-0.12, 0.12);
      plate.rotation.z = rng.range(-0.1, 0.1);
      root.add(plate);
    }
  }

  for (let i = 0; i < school.spikes; i++) {
    const s = (i + 0.5) / school.spikes;
    const z = zBow + (zStern - zBow) * (0.08 + s * 0.84);
    const side = i % 2 === 0 ? 1 : -1;
    const y = frame.deckY(z) - 0.35;
    const x = hullSurfaceHit(frame.hull, side, y, z) ?? frame.beamAt(z);
    const len = rng.range(0.5, 1.1) * (0.6 + Math.sin(s * Math.PI));
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, len, 5), bone);
    spike.position.set(side * (Math.abs(x) + len * 0.32), y, z);
    spike.rotation.z = side * -1.15;
    root.add(spike);
  }

  // Носовой шип под водой — гоблинский таран
  if (school.spikes > 0) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.22, 2.2, 6), bone);
    spike.rotation.x = -Math.PI / 2;
    spike.position.set(0, frame.deckY(zBow + 0.8) - 1.25, zBow - 0.5);
    root.add(spike);
  }

  if (school.patches > 0) {
    // Пара приваренных рёбер жёсткости поверх обшивки
    for (const side of [1, -1] as const) {
      const beam = plateRib(root, frame, side, mats, rust);
      if (beam) beam.position.z += 0;
    }
  }
}

function plateRib(
  root: THREE.Group,
  frame: ShipFrame,
  side: 1 | -1,
  _mats: ShipMaterials,
  mat: THREE.Material,
): THREE.Mesh | null {
  const z = 0;
  const y = frame.deckY(z) - 1.1;
  const x = hullSurfaceHit(frame.hull, side, y, z);
  if (x === null) return null;
  const rib = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 4.2), mat);
  rib.position.set(side * (Math.abs(x) + 0.06), y, z);
  root.add(rib);
  return rib;
}
