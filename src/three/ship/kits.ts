import * as THREE from 'three';
import { hullSurfaceHit, type ShipFrame } from './assemble';
import type { HullProfile } from './hull';
import type { Rng } from './rng';
import type { ShipMaterials } from './style';

/**
 * Классовые обвесы: то, что делает силуэт класса узнаваемым издалека, когда
 * пропорций корпуса уже недостаточно. Всё садится на поверхность через тот же
 * рейкаст, что пушки и розы.
 */

export interface KitContext {
  root: THREE.Group;
  profile: HullProfile;
  frame: ShipFrame;
  mats: ShipMaterials;
  scale: number;
  rng: Rng;
}

function plate(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.castShadow = true;
  return mesh;
}

/** Таран: броневой форштевень и железный пояс по скуле. */
function addRamKit(ctx: KitContext): void {
  const { root, profile, frame, mats, scale } = ctx;
  const zs = [profile.zBow + 0.5, profile.zBow + 1.3, profile.zBow + 2.1];
  for (const side of [-1, 1] as const) {
    zs.forEach((z, i) => {
      const y = frame.deckY(z) - 0.15 - i * 0.12;
      const x = hullSurfaceHit(frame.hull, side, y, z);
      if (x === null) return;
      const armor = plate(0.14, 0.95 * scale, 1.05 * scale, mats.dark);
      armor.position.set(x + side * 0.05, y, z);
      armor.rotation.y = side * 0.22;
      root.add(armor);
    });
  }

  const belt = plate(0.16, 0.36 * scale, (profile.zStern - profile.zBow) * 0.5, mats.dark);
  belt.position.set(0, frame.deckY(0) - 0.55, 0);
  root.add(belt);

  const crown = plate(0.5 * scale, 0.42, 1.2 * scale, mats.trim);
  crown.position.set(0, frame.deckY(profile.zBow + 0.7) + 0.35, profile.zBow + 0.9);
  root.add(crown);

  // Носовой клин-таран: единственное, что читается в профиль
  const stem = new THREE.Mesh(new THREE.ConeGeometry(0.85 * scale, 1.8 * scale, 6), mats.trim);
  stem.rotation.x = -Math.PI / 2;
  stem.position.set(0, frame.deckY(profile.zBow + 0.6) - 0.35, profile.zBow - 0.4 * scale);
  root.add(stem);

  const blade = plate(0.16 * scale, 1.5 * scale, 1.0 * scale, mats.dark);
  blade.position.set(0, frame.deckY(profile.zBow + 0.6) + 0.15, profile.zBow - 0.1 * scale);
  root.add(blade);
}

/** Краб: четыре пары лап и две клешни на носу. */
function addCrabKit(ctx: KitContext): void {
  const { root, profile, frame, mats, scale, rng } = ctx;
  const span = profile.zStern - profile.zBow;
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 4; i++) {
      const z = profile.zBow + span * (0.3 + i * 0.13);
      const x = frame.halfBeamAt(z) * 0.9;
      const hipY = frame.deckY(z) - 0.45;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 3.2 * scale, 6), mats.dark);
      leg.position.set(side * (x + 1.0 * scale), hipY - 0.7 * scale, z);
      leg.rotation.z = side * (1.15 + rng.range(-0.1, 0.1));
      leg.rotation.x = side * 0.12;
      root.add(leg);

      const foot = new THREE.Mesh(new THREE.ConeGeometry(0.14 * scale, 0.5 * scale, 5), mats.trim);
      foot.position.set(side * (x + 2.3 * scale), hipY - 1.5 * scale, z);
      foot.rotation.z = side * 0.4;
      root.add(foot);

      const joint = new THREE.Mesh(new THREE.SphereGeometry(0.16 * scale, 8, 6), mats.trim);
      joint.position.set(side * (x + 0.1), hipY, z);
      root.add(joint);
    }

    // Клешня: плечо вперёд и две челюсти
    const armZ = profile.zBow + 0.8;
    const armX = frame.halfBeamAt(armZ) * 0.75;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.9 * scale, 7), mats.dark);
    arm.position.set(side * (armX + 0.5 * scale), frame.deckY(armZ) + 0.1, armZ - 0.2);
    arm.rotation.x = Math.PI / 2.4;
    arm.rotation.z = side * 0.5;
    root.add(arm);

    for (const jaw of [-1, 1] as const) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.3 * scale, 1.5 * scale, 6), mats.trim);
      claw.position.set(
        side * (armX + 0.95 * scale),
        frame.deckY(armZ) + 0.12 + jaw * 0.26 * scale,
        armZ - 1.7 * scale,
      );
      claw.rotation.x = -Math.PI / 2;
      claw.rotation.z = jaw * 0.3 + side * 0.4;
      root.add(claw);
    }
  }

  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.9 * scale, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.trim);
  shell.scale.set(1, 0.5, 1.4);
  shell.position.set(0, frame.deckY(profile.zBow + 2) + 0.4, profile.zBow + 2);
  root.add(shell);
}

/** Дредноут: сплошная верхняя батарея и казематы по бортам. */
function addDreadnoughtKit(ctx: KitContext): void {
  const { root, profile, frame, mats, scale } = ctx;
  const from = profile.zBow + (profile.zStern - profile.zBow) * 0.18;
  const to = profile.zStern - (profile.zStern - profile.zBow) * 0.18;
  const length = to - from;
  const midDeck = frame.deckY((from + to) / 2);

  const deck = plate(2.5 * scale, 0.55 * scale, length, mats.deck);
  deck.position.set(0, midDeck + 0.28 * scale, (from + to) / 2);
  root.add(deck);

  const spine = plate(0.7 * scale, 0.4 * scale, length * 0.8, mats.trim);
  spine.position.set(0, midDeck + 0.62 * scale, (from + to) / 2);
  root.add(spine);

  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 3; i++) {
      const z = from + length * (0.2 + i * 0.3);
      const casemate = plate(0.42 * scale, 0.42 * scale, 1.1 * scale, mats.dark);
      casemate.position.set(side * 1.15 * scale, midDeck + 0.5 * scale, z);
      root.add(casemate);

      // Ствол каземата: без него ряд чёрных коробок читается дырками
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.17 * scale, 1.7 * scale, 8), mats.trim);
      barrel.rotation.z = Math.PI / 2;
      barrel.position.set(side * 2.1 * scale, midDeck + 0.5 * scale, z);
      root.add(barrel);
    }
  }
}

export function addClassKit(classId: string, ctx: KitContext): void {
  switch (classId) {
    case 'ram':
      addRamKit(ctx);
      break;
    case 'crab':
      addCrabKit(ctx);
      break;
    case 'dreadnought':
      addDreadnoughtKit(ctx);
      break;
    default:
      break;
  }
}

/**
 * Фракционный обвес поверх класса: у Империи это прессованный хребет и
 * спонсоны, у гоблинов — ряд дорсальных лезвий. Без него гранёный корпус
 * читается пустой плитой.
 */
export function addSchoolKit(school: string, ctx: KitContext): void {
  const { root, profile, frame, mats, scale } = ctx;
  const from = profile.zBow + 1.5;
  const to = profile.zStern - 1.2;
  const mid = (from + to) / 2;
  const midDeck = frame.deckY(mid);

  if (school === 'wedge') {
    // Хребет: узкая высокая балка от носа к рубке
    const spine = plate(0.5 * scale, 1.15 * scale, (to - from) * 0.72, mats.dark);
    spine.position.set(0, midDeck + 0.62 * scale, mid - 0.4 * scale);
    root.add(spine);

    // Рубка со срезом: два блока, верхний уже нижнего
    const bridge = plate(1.5 * scale, 0.9 * scale, 1.5 * scale, mats.dark);
    bridge.position.set(0, midDeck + 1.5 * scale, mid + 0.9 * scale);
    root.add(bridge);
    const top = plate(0.9 * scale, 0.5 * scale, 0.9 * scale, mats.trim);
    top.position.set(0, midDeck + 2.15 * scale, mid + 0.9 * scale);
    root.add(top);

    // Спонсоны по бортам: гранёные короба с орудием
    for (const side of [-1, 1] as const) {
      for (let i = 0; i < 2; i++) {
        const z = from + (to - from) * (0.28 + i * 0.4);
        const y = frame.deckY(z) - 0.3;
        const x = hullSurfaceHit(frame.hull, side, y, z);
        if (x === null) continue;
        const box = plate(0.75 * scale, 0.62 * scale, 1.4 * scale, mats.dark);
        box.position.set(x + side * 0.3 * scale, y, z);
        root.add(box);

        const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * scale, 0.12 * scale, 1.3 * scale, 8), mats.trim);
        gun.rotation.z = Math.PI / 2;
        gun.position.set(x + side * 1.15 * scale, y, z);
        root.add(gun);
      }
    }
  }

  if (school === 'spike') {
    // Дорсальные лезвия вдоль хребта
    for (let i = 0; i < 5; i++) {
      const z = from + (to - from) * (0.12 + i * 0.18);
      const y = frame.deckY(z);
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.2 * scale, 1.5 * scale, 4), mats.trim);
      blade.position.set(0, y + 0.7 * scale, z);
      blade.rotation.y = Math.PI / 4;
      root.add(blade);
    }
  }

  if (school === 'scrap') {
    // Накладной бронепояс и труба: корыто должно выглядеть сварным
    for (const side of [-1, 1] as const) {
      const z = mid;
      const y = frame.deckY(z) - 0.75;
      const x = hullSurfaceHit(frame.hull, side, y, z);
      if (x === null) continue;
      const belt = plate(0.18 * scale, 0.45 * scale, (to - from) * 0.8, mats.dark);
      belt.position.set(x + side * 0.08 * scale, y, z);
      root.add(belt);
    }

    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.38 * scale, 0.46 * scale, 1.7 * scale, 8), mats.dark);
    stack.position.set(0.45 * scale, midDeck + 0.9 * scale, mid + 0.6 * scale);
    root.add(stack);
  }
}
