import type * as THREE from 'three';
import type { HullSchool } from './school';

/**
 * Стиль фракции — это не набор деталей, а язык силуэта и палитра. Детали
 * выбираются из общего каталога по весам, поэтому 20 кораблей одной фракции
 * выглядят родственно, но не одинаково.
 */

export type BowModule = 'griffon' | 'ram' | 'beak' | 'idol';
export type SternModule = 'domeTiers' | 'fanFrame' | 'castle' | 'nozzleBank';
export type SuperModule = 'cupola' | 'bridgeTower' | 'spineRibs';
export type EngineModule = 'turbineWheels' | 'nozzles' | 'none';
export type OrnamentModule = 'roses' | 'lanterns' | 'both' | 'none';
export type SailPlan = 'petalFan' | 'squareRig' | 'none';

export interface ShipStyle {
  id: string;
  /** Школа постройки: форма корпуса важнее палитры. */
  school: HullSchool;
  /** Основной тон корпуса: лак, сталь, смола. */
  hullColor: number;
  /** Какой набор текстур ложится на обшивку. */
  hullTexture: 'lacquer' | 'steel' | 'scrap' | 'bone';
  deckColor: number;
  /** Латунь/сталь отделки. */
  trimColor: number;
  trimMetalness: number;
  trimRoughness: number;
  /** Ткань парусов. */
  sailColor: number;
  sailEmissive: number;
  /** Витраж иллюминаторов и окон. */
  glassColor: number;
  glassEmissive: number;
  /** Свечение ядра. */
  coreColor: number;
  coreEmissive: number;
  /** Сдвиг седловатости: у одних нос задран, у других корма тяжелее. */
  sheerBias: number;
  bow: [BowModule, number][];
  stern: [SternModule, number][];
  superstructure: [SuperModule, number][];
  engines: [EngineModule, number][];
  ornaments: [OrnamentModule, number][];
  sailPlans: [SailPlan, number][];
}

export interface ShipMaterials {
  hull: THREE.MeshStandardMaterial;
  deck: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  sail: THREE.MeshPhysicalMaterial;
  glass: THREE.MeshStandardMaterial;
  core: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  lamp: THREE.MeshStandardMaterial;
}

export const LEAGUE_STYLE: ShipStyle = {
  id: 'league',
  school: 'gondola',
  hullColor: 0xffffff,
  hullTexture: 'lacquer',
  deckColor: 0xc09062,
  trimColor: 0xffffff,
  trimMetalness: 0.45,
  trimRoughness: 0.62,
  sailColor: 0x9b7fc9,
  sailEmissive: 0x4b3a7a,
  glassColor: 0x8e1b14,
  glassEmissive: 0x7a120c,
  coreColor: 0x1a6f8f,
  coreEmissive: 0x19b9e8,
  sheerBias: 0.6,
  bow: [
    ['griffon', 5],
    ['beak', 3],
    ['ram', 1],
  ],
  stern: [
    ['domeTiers', 5],
    ['castle', 2],
    ['fanFrame', 2],
    ['nozzleBank', 1],
  ],
  superstructure: [
    ['cupola', 3],
    ['bridgeTower', 2],
    ['spineRibs', 2],
  ],
  engines: [
    ['turbineWheels', 3],
    ['none', 2],
    ['nozzles', 1],
  ],
  ornaments: [
    ['both', 4],
    ['roses', 2],
    ['lanterns', 2],
    ['none', 1],
  ],
  sailPlans: [
    ['petalFan', 6],
    ['squareRig', 1],
    ['none', 1],
  ],
};

export const EMPIRE_STYLE: ShipStyle = {
  id: 'empire',
  school: 'wedge',
  hullColor: 0xdfe6ee,
  hullTexture: 'steel',
  deckColor: 0x4a505a,
  trimColor: 0xb88b4a,
  trimMetalness: 0.85,
  trimRoughness: 0.34,
  sailColor: 0x6b7f96,
  sailEmissive: 0x24384a,
  glassColor: 0xff5a3c,
  glassEmissive: 0x8f1b08,
  coreColor: 0x6a1a22,
  coreEmissive: 0xd94a2a,
  sheerBias: -0.5,
  bow: [
    ['ram', 5],
    ['beak', 3],
    ['idol', 1],
  ],
  stern: [
    ['nozzleBank', 4],
    ['castle', 2],
    ['fanFrame', 1],
  ],
  superstructure: [
    ['bridgeTower', 4],
    ['spineRibs', 2],
    ['cupola', 1],
  ],
  engines: [
    ['nozzles', 1],
  ],
  ornaments: [
    ['lanterns', 2],
    ['none', 2],
    ['roses', 1],
  ],
  // Империя ходит и на двигателях, и под парусами: прямые реи как у линейного
  // корабля, веера — парадные. Сопла остаются, но парусность есть.
  sailPlans: [
    ['squareRig', 5],
    ['petalFan', 2],
    ['none', 1],
  ],
};

/** Орки: ржавое сварное корыто, заплаты, дымные паруса, оранжевое горно. */
export const ORK_STYLE: ShipStyle = {
  id: 'ork',
  school: 'scrap',
  hullColor: 0xa06a4a,
  hullTexture: 'scrap',
  deckColor: 0x6b4a34,
  trimColor: 0x8d8272,
  trimMetalness: 0.6,
  trimRoughness: 0.78,
  sailColor: 0x9c8a6a,
  sailEmissive: 0x2a2418,
  glassColor: 0xc2451c,
  glassEmissive: 0x8f2408,
  coreColor: 0xff9a3c,
  coreEmissive: 0xff7a1e,
  sheerBias: 0.15,
  bow: [
    ['ram', 5],
    ['beak', 3],
  ],
  stern: [
    ['castle', 5],
    ['nozzleBank', 2],
  ],
  superstructure: [
    ['spineRibs', 4],
    ['bridgeTower', 2],
  ],
  engines: [
    ['nozzles', 3],
    ['turbineWheels', 2],
  ],
  ornaments: [
    ['lanterns', 3],
    ['none', 2],
  ],
  sailPlans: [
    ['squareRig', 5],
    ['none', 2],
  ],
};

/** Гоблины: узкий шипастый корпус, костяные клыки, кислотное свечение. */
export const GOBLIN_STYLE: ShipStyle = {
  id: 'goblin',
  school: 'spike',
  hullColor: 0x8f9c6a,
  hullTexture: 'bone',
  deckColor: 0x46523a,
  trimColor: 0xb9c07a,
  trimMetalness: 0.5,
  trimRoughness: 0.6,
  sailColor: 0xa8cf5e,
  sailEmissive: 0x3f6a1e,
  glassColor: 0xc6ff4a,
  glassEmissive: 0x7dff2a,
  coreColor: 0x9dff3c,
  coreEmissive: 0x5fe01a,
  sheerBias: 0.35,
  bow: [
    ['idol', 4],
    ['beak', 3],
    ['ram', 2],
  ],
  stern: [
    ['fanFrame', 4],
    ['castle', 2],
  ],
  superstructure: [
    ['cupola', 2],
    ['bridgeTower', 2],
    ['spineRibs', 2],
  ],
  engines: [
    ['turbineWheels', 4],
    ['nozzles', 2],
  ],
  ornaments: [
    ['roses', 3],
    ['lanterns', 2],
  ],
  sailPlans: [
    ['petalFan', 5],
    ['squareRig', 1],
  ],
};

/** Нейтралы: транспортники и вольные торговцы, без гербов и пафоса. */
export const NEUTRAL_STYLE: ShipStyle = {
  id: 'neutral',
  school: 'civil',
  hullColor: 0xa8b0b4,
  hullTexture: 'steel',
  deckColor: 0x8a7a62,
  trimColor: 0x8f9a9e,
  trimMetalness: 0.35,
  trimRoughness: 0.72,
  sailColor: 0xd8cfb4,
  sailEmissive: 0x2a2a24,
  glassColor: 0xffd08a,
  glassEmissive: 0xb07a20,
  coreColor: 0x6ad0e0,
  coreEmissive: 0x2f9fb8,
  sheerBias: 0.2,
  bow: [
    ['beak', 4],
    ['griffon', 2],
  ],
  stern: [
    ['castle', 4],
    ['nozzleBank', 2],
  ],
  superstructure: [
    ['bridgeTower', 3],
    ['cupola', 2],
  ],
  engines: [
    ['nozzles', 3],
    ['none', 2],
  ],
  ornaments: [
    ['lanterns', 3],
    ['none', 2],
  ],
  sailPlans: [
    ['squareRig', 4],
    ['petalFan', 2],
    ['none', 1],
  ],
};

export const STYLES: Record<string, ShipStyle> = {
  league: LEAGUE_STYLE,
  empire: EMPIRE_STYLE,
  ork: ORK_STYLE,
  goblin: GOBLIN_STYLE,
  neutral: NEUTRAL_STYLE,
};
