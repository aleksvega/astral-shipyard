import * as THREE from 'three';
import { buildHullDeck, buildLoftedHull, hullDeckY, hullHalfBeam, type HullProfile } from './hull';
import { addBroadsideGuns, type PlayerShipParts } from './shared';
import { addHullRails } from './decor';
import { addRigging } from './rigging';
import { addPetalFan, addSquareRig } from './sail';
import type { SailPlan } from './style';

/**
 * Спека корабля: числа и материалы, из которых собирается общий каркас.
 * Новый корабль фракции = профиль корпуса + материалы + список мачт + свой
 * декор, а не триста строк геометрии с нуля.
 */

export interface MastSpec {
  z: number;
  h: number;
  fanY: number;
  length: number;
  width: number;
  count: number;
  span?: number;
}

export interface ShipSpec {
  profile: HullProfile;
  hullMat: THREE.Material;
  deckMat: THREE.Material;
  mastMat: THREE.Material;
  sailMat: THREE.Material;
  goldMat: THREE.Material;
  masts: MastSpec[];
  /** Гондольное брюхо под обшивкой: у Лиги — алая лакированная полусфера. */
  belly?: { mat: THREE.Material; scale: [number, number, number]; y: number; z: number };
  /** Золотые пояса по обводу. */
  rails?: { from: number; to: number; steps?: number; inset?: number };
  /** Высота орудийных портов над палубой. */
  gunY?: number;
  /** Сколько ярусов портов: 1 или 2. */
  gunRows?: 1 | 2;
  gunFamily?: Parameters<typeof addBroadsideGuns>[2];
  /** Куда садятся эмиттеры лучей. */
  beamMountZ?: number;
  /** Точка на бушприте для форштага. */
  bowTip?: [number, number, number];
  /** Парус: насколько широко раскрыт веер. */
  fanSpan?: number;
  /** Рангоут школы: веер Лиги или прямые паруса Империи. */
  sailPlan?: SailPlan;
}

export interface ShipFrame {
  deckY: (z: number) => number;
  beamAt: (z: number) => number;
  halfBeamAt: (z: number) => number;
  /** Меш корпуса: по нему ищут точку на обшивке для иллюминаторов и накладок. */
  hull: THREE.Mesh;
}

/**
 * Точка на обшивке с указанного борта: луч снаружи внутрь по X.
 * Нужна, чтобы накладки садились заподлицо, а не висели в воздухе.
 */
export function hullSurfaceHit(hull: THREE.Mesh, side: 1 | -1, y: number, z: number): number | null {
  hull.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(side * 6, y, z), new THREE.Vector3(-side, 0, 0));
  const hit = ray.intersectObject(hull, false)[0];
  return hit ? hit.point.x : null;
}

export function hullSurfaceX(hull: THREE.Mesh, side: 1 | -1, y: number, z: number): number {
  return hullSurfaceHit(hull, side, y, z) ?? 0;
}

export function assembleShip(parts: PlayerShipParts, spec: ShipSpec): ShipFrame {
  const { root } = parts;
  const { profile } = spec;
  const deckY = (z: number) => hullDeckY(profile, z);
  const halfBeamAt = (z: number) => hullHalfBeam(profile, z);
  const beamAt = (z: number) => hullHalfBeam(profile, z);

  const hull = new THREE.Mesh(buildLoftedHull(profile), spec.hullMat);
  hull.name = 'hull-body';
  hull.castShadow = true;
  hull.receiveShadow = true;
  root.add(hull);

  const deck = new THREE.Mesh(buildHullDeck(profile), spec.deckMat);
  deck.name = 'hull-deck';
  deck.receiveShadow = true;
  root.add(deck);

  if (spec.belly) {
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), spec.belly.mat);
    belly.scale.set(...spec.belly.scale);
    belly.position.set(0, spec.belly.y, spec.belly.z);
    root.add(belly);
  }

  for (const m of spec.masts) {
    const baseY = deckY(m.z) - 0.12;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, m.h, 10), spec.mastMat);
    mast.position.set(0, baseY + m.h / 2, m.z);
    root.add(mast);

    const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, m.width * 3.0, 8), spec.goldMat);
    yard.rotation.z = Math.PI / 2;
    // Верх полотна начинается в origin веера, поэтому рея садится ровно туда
    yard.position.set(0, baseY + m.fanY, m.z);
    root.add(yard);

    const square = spec.sailPlan === 'squareRig';
    const fan = square
      ? addSquareRig(root, {
          // Полотно за мачтой: иначе мачта идёт поверх паруса, как палка в окне
          z: m.z - Math.max(0.22, m.width * 0.5),
          y: baseY + m.fanY,
          length: m.length * 0.86,
          width: m.width * 2.2,
          tiers: m.length > 1.7 ? 2 : 1,
          petalMat: spec.sailMat,
          ribMat: spec.goldMat,
        })
      : addPetalFan(root, {
          z: m.z,
          y: baseY + m.fanY,
          count: m.count,
          span: m.span ?? spec.fanSpan ?? 1.5,
          length: m.length * 0.62,
          width: m.width,
          petalMat: spec.sailMat,
          ribMat: spec.mastMat,
        });
    // Паруса анимируются построчно: updateVisuals качает каждое полотно
    fan.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) parts.sails.push(child as THREE.Mesh);
    });
  }

  if (spec.rails) {
    addHullRails(root, {
      // Пояс идёт по палубе, поэтому ширину берём с поверхности на этой высоте
      beamAt: (z) => hullSurfaceHit(hull, 1, deckY(z) + 0.26, z) ?? beamAt(z),
      deckY,
      mat: spec.goldMat,
      from: spec.rails.from,
      to: spec.rails.to,
      steps: spec.rails.steps ?? 12,
    });
  }

  const span = profile.zStern - profile.zBow;
  const gunZs: number[] = [];
  for (let i = 0; i < 5; i++) gunZs.push(profile.zBow + span * (0.26 + i * 0.12));

  addBroadsideGuns(root, parts.cannonMat, spec.gunFamily ?? 'astral', {
    // Порт сидит ниже палубы: на кромке борта его закрывает планшир
    gunYAt: (z) => deckY(z) - 0.62,
    gunZs,
    rows: spec.gunRows ?? 1,
    surfaceAt: (side, y, z) => hullSurfaceHit(hull, side, y, z),
  });

  if (spec.bowTip) {
    addRigging(root, {
      masts: spec.masts.map((m) => ({ z: m.z, h: m.h })),
      beamAt,
      deckY,
      ropeMat: spec.mastMat,
      bowTip: new THREE.Vector3(...spec.bowTip),
    });
  }

  if (spec.beamMountZ !== undefined) {
    parts.beamMount = { y: deckY(spec.beamMountZ) + 0.22, z: spec.beamMountZ };
  }

  return { deckY, beamAt, halfBeamAt, hull };
}
