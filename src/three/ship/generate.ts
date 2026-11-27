import * as THREE from 'three';
import type { ProceduralTextureSet } from '../textures';
import { assembleShip, hullSurfaceHit, hullSurfaceX, type ShipFrame, type ShipSpec } from './assemble';
import { CLASSES, CLASS_IDS } from './classes';
import { addLanternString, addReactorCage, addRoseWindow } from './decor';
import { applyPalette } from './engine/paint';
import type { ShipBlueprint } from './engine/spec';
import type { HullProfile } from './hull';
import { addClassKit, addSchoolKit } from './kits';
import { jitterProfile, layoutMasts, pickPart, tierOf } from './layout';
import { makeMaterials } from './materials';
import { getPart, type PartStats } from './parts';
import { createRng } from './rng';
import { buildSockets, seatPart, type Socket } from './sockets';
import { STYLES } from './style';
import { SCHOOLS, addSchoolTrim, applySchool } from './school';

/**
 * Генератор борта: класс задаёт пропорции и оснастку, стиль — язык деталей и
 * палитру, seed — конкретные числа и выбор частей. Один и тот же seed всегда
 * даёт тот же корабль, поэтому каталог из 20 бортов воспроизводим.
 */

export interface ShipDNA {
  seed: number;
  faction: string;
  /** Школа постройки: гондола, клин, сварное корыто, шипастый, транспорт. */
  school: string;
  classId: string;
  classLabel: string;
  length: number;
  beam: number;
  masts: number;
  bow: string;
  stern: string;
  engine: string;
  deck: string[];
  ornaments: string;
  stats: PartStats;
  /** Подпись пропорций и деталей: две одинаковые означают дубль. */
  signature: string;
}

export interface GeneratedShip {
  root: THREE.Group;
  sails: THREE.Mesh[];
  turbines: THREE.Object3D[];
  reactor: THREE.Mesh;
  /** Каркас нужен инструментам: по нему проверяют посадку деталей. */
  frame: ShipFrame;
  dna: ShipDNA;
}



export interface GenerateOptions {
  seed: number;
  faction: string;
  classId?: string;
  textures: ProceduralTextureSet;
  /** Внешний материал пушек: у корабля игрока он уже создан. */
  cannonMat?: THREE.Material;
  /** Точечные выборы: из описания словами или из будущего редактора. */
  blueprint?: Partial<ShipBlueprint>;
}

export function generateShip(opts: GenerateOptions): GeneratedShip {
  const rng = createRng(opts.seed);
  const style = STYLES[opts.faction] ?? STYLES.league;
  const blueprint = opts.blueprint ?? {};
  const classId = opts.classId ?? blueprint.classId ?? rng.pick(CLASS_IDS);
  const cls = CLASSES[classId] ?? CLASSES.galleon;
  const tier = tierOf(cls);
  const mats = makeMaterials(style, opts.textures);
  // Палитра — слой поверх фракционных каналов: раскраска не требует пересборки
  if (blueprint.palette) applyPalette(mats, blueprint.palette);
  const school = SCHOOLS[style.school] ?? SCHOOLS.gondola;
  const profile = applySchool(jitterProfile(cls, style, rng), school);
  // У фракции без парусов мачты не ставятся вовсе: силуэт держат двигатели
  const noSails =
    blueprint.sails === 'none' ||
    (blueprint.sails === undefined && style.sailPlans.every(([plan]) => plan === 'none'));
  const masts = noSails ? [] : layoutMasts(cls, profile, rng, blueprint.masts);
  // Рангоут берём отдельным зерном: добавка не должна сдвигать подписи бортов
  const rigRng = createRng(opts.seed ^ 0x9e3779b9);
  const planWeights = style.sailPlans.filter(([plan]) => plan !== 'none');
  const sailPlan =
    blueprint.sails && blueprint.sails !== 'none'
      ? blueprint.sails
      : rigRng.pickWeighted(planWeights.length > 0 ? planWeights : [['petalFan', 1] as const]);
  const gunRows = (blueprint.gunRows ?? cls.gunRows) as 1 | 2;
  const partScale = profile.maxBeam / 1.95;

  const root = new THREE.Group();
  const sails: THREE.Mesh[] = [];
  const turbines: THREE.Object3D[] = [];
  const parts = {
    root,
    sails,
    turbines,
    textures: opts.textures,
    weapons: {},
    goldTrimMat: mats.trim,
    cannonMat: opts.cannonMat ?? mats.dark,
  };

  const spec: ShipSpec = {
    profile,
    hullMat: mats.hull,
    deckMat: mats.deck,
    mastMat: mats.wood,
    sailMat: mats.sail,
    goldMat: mats.trim,
    masts,
    sailPlan,
    belly:
      style.id === 'league' && classId !== 'crab'
        ? {
            mat: mats.hull,
            scale: [profile.maxBeam * 0.85, profile.keelDepth * 0.8, (profile.zStern - profile.zBow) * 0.46],
            y: -profile.keelDepth * 0.55,
            z: (profile.zBow + profile.zStern) / 2,
          }
        : undefined,
    rails: { from: profile.zBow + 0.8, to: profile.zStern - 0.9, steps: rng.int(10, 14) },
    gunY: cls.gunY,
    gunRows,
    gunFamily: 'astral',
    beamMountZ: profile.zBow + 0.9,
    bowTip: [0, profile.deckY + 1.1, profile.zBow - 2.4],
  };
  const frame = assembleShip(parts as never, spec);
  addSchoolTrim(root, profile, frame, mats, school, rng);
  const sockets = buildSockets(frame, profile, {
    masts: masts.map((m) => m.z),
    gunRows,
    tier,
  });

  const socketOf = (kind: Socket['kind'], side?: -1 | 1) =>
    sockets.filter((s) => s.kind === kind && (side === undefined || s.side === side));

  // Нос, корма, двигатели: по одной детали на место.
  // У тарана и краба нос — часть опознавания класса, поэтому он фиксирован.
  const bowOverride = classId === 'ram' ? 'ram' : classId === 'crab' ? 'idol' : classId === 'dreadnought' ? 'beak' : null;
  const bowId = blueprint.bow ?? bowOverride ?? pickPart(style.bow as unknown as [string, number][], 'bow', tier, rng);
  const sternId = blueprint.stern ?? pickPart(style.stern as unknown as [string, number][], 'stern', tier, rng);
  const engineId = blueprint.engine ?? pickPart(style.engines as unknown as [string, number][], 'engine', tier, rng);

  const seat = (id: string | null, target: Socket, factor = 1, sink = 0.08) => {
    if (!id) return;
    const def = getPart(id);
    if (!def) return;
    const part = def.build(mats, rng);
    seatPart(target, part, sink, partScale * factor);
    root.add(part);
    if (id === 'turbineWheels' || id === 'nozzles') {
      part.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) turbines.push(o);
      });
    }
  };

  seat(bowId, socketOf('bow')[0], 0.8, 0.22);
  seat(sternId, socketOf('stern')[0], 0.55, 0.42);
  for (const socket of socketOf('engine')) seat(engineId, socket, 0.85, 0.16);

  // Надстройки: до двух разных на палубных местах
  const deckIds: string[] = [];
  const deckSockets = socketOf('deck').filter((s) => !s.id.startsWith('mast:'));
  const tryDeck = style.superstructure as unknown as [string, number][];
  // Явный список надстроек из блюпринта сильнее весов стиля
  const wantedDeck = (blueprint.deck ?? []).filter((id) => getPart(id)?.slot === 'deck');
  for (const socket of deckSockets) {
    // У краба палуба занята панцирем и клешнями: лишние дуги ломают силуэт
    if (classId === 'crab') break;
    if (deckIds.length >= 2) break;
    const id = wantedDeck.length
      ? (wantedDeck[deckIds.length] ?? null)
      : pickPart(
          tryDeck.filter(([pid]) => !deckIds.includes(pid)),
          'deck',
          tier,
          rng,
        );
    if (!id) continue;
    seat(id, socket, 0.7, 0.2);
    deckIds.push(id);
  }

  // Классовый обвес: то, что читается издалека
  addClassKit(classId, { root, profile, frame, mats, scale: partScale, rng });
  addSchoolKit(style.school, { root, profile, frame, mats, scale: partScale, rng });

  // Реактор на палубе в миделе
  const midZ = (profile.zBow + profile.zStern) / 2 + rng.range(-0.6, 0.6);
  const { core, ring } = addReactorCage(root, {
    pos: new THREE.Vector3(0, frame.deckY(midZ) + 0.6, midZ),
    coreRadius: 0.46 * partScale,
    coreMat: mats.core,
    goldMat: mats.trim,
  });
  turbines.push(ring);

  // Украшения: розы в борту и гирлянды фонариков
  const ornament = rng.pickWeighted(style.ornaments as unknown as [string, number][]);
  const richness = cls.richness;
  if ((ornament === 'roses' || ornament === 'both') && rng.chance(0.4 + richness * 0.6)) {
    for (const side of [-1, 1] as const) {
      for (let i = 0; i < 2; i++) {
        const z = profile.zBow + (profile.zStern - profile.zBow) * (0.3 + i * 0.22);
        const y = frame.deckY(z) - 0.3;
        const x = hullSurfaceX(frame.hull, side, y, z);
        addRoseWindow(root, {
          pos: new THREE.Vector3(x + side * 0.015, y, z),
          radius: 0.3 * partScale,
          goldMat: mats.trim,
          glassMat: mats.glass,
        });
      }
    }
  }
  if (ornament === 'lanterns' || ornament === 'both') {
    const first = masts[0];
    if (first) {
      addLanternString(root, {
        from: new THREE.Vector3(0, frame.deckY(profile.zBow + 1) + 0.3, profile.zBow + 1),
        to: new THREE.Vector3(0, frame.deckY(first.z) + first.h * 0.9, first.z),
        count: rng.int(5, 7),
        mat: mats.lamp,
      });
    }
  }

  const stats: PartStats = { ram: 0, speed: 0, armor: 0, energy: 0 };
  for (const id of [bowId, sternId, engineId, ...deckIds]) {
    const def = id ? getPart(id) : undefined;
    if (!def?.stats) continue;
    for (const key of Object.keys(def.stats) as (keyof PartStats)[]) {
      stats[key] += def.stats[key] ?? 0;
    }
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  const signature = [
    opts.faction,
    style.school,
    classId,
    round(profile.zBow),
    round(profile.zStern),
    round(profile.maxBeam),
    round(profile.keelDepth),
    round(profile.bowSheer),
    masts.map((m) => `${round(m.z)}:${round(m.h)}:${m.count}`).join(','),
    bowId,
    sternId,
    engineId,
    deckIds.join('+'),
    ornament,
  ].join('|');

  return {
    root,
    sails,
    turbines,
    reactor: core,
    frame,
    dna: {
      seed: opts.seed,
      faction: opts.faction,
      school: style.school,
      classId,
      classLabel: cls.label,
      length: round(profile.zStern - profile.zBow),
      beam: round(profile.maxBeam * 2),
      masts: masts.length,
      bow: bowId ?? '—',
      stern: sternId ?? '—',
      engine: engineId ?? '—',
      deck: deckIds,
      ornaments: ornament,
      stats,
      signature,
    },
  };
}
