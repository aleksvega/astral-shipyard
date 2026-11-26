import * as THREE from 'three';
import type { HullProfile } from './hull';
import type { ShipFrame } from './assemble';

/**
 * Сокеты — это точки сочленения. Часть не «ставится примерно туда», а
 * цепляется к сокету: у него есть позиция на поверхности, наружное
 * направление, верх и допустимый размер. Поэтому фигура на носу сидит на
 * форштевне, а не висит рядом с корпусом.
 */

export type SocketKind = 'bow' | 'stern' | 'engine' | 'deck';

export interface Socket {
  id: string;
  kind: SocketKind;
  pos: THREE.Vector3;
  /** Наружу от корпуса: часть разворачивается этим направлением. */
  dir: THREE.Vector3;
  up: THREE.Vector3;
  /** Максимальный типоразмер части, который сюда влезает. */
  size: 1 | 2 | 3;
  side: -1 | 0 | 1;
}

/** Пересечение луча с обшивкой: единственный надёжный способ попасть на борт. */
function hitHull(hull: THREE.Mesh, from: THREE.Vector3, dir: THREE.Vector3): THREE.Vector3 | null {
  hull.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(from, dir.clone().normalize());
  const hit = ray.intersectObject(hull, false)[0];
  return hit ? hit.point.clone() : null;
}

export interface SocketOptions {
  masts: number[];
  /** 1 — один ряд портов, 2 — два. */
  gunRows: 1 | 2;
  /** Типоразмер корпуса: задаёт, какие части влезают. */
  tier: 1 | 2 | 3;
}

export function buildSockets(frame: ShipFrame, profile: HullProfile, opts: SocketOptions): Socket[] {
  const { zBow, zStern } = profile;
  const sockets: Socket[] = [];
  const deckMid = frame.deckY((zBow + zStern) / 2);

  // Форштевень: луч по оси снаружи внутрь
  const bowHit = hitHull(
    frame.hull,
    new THREE.Vector3(0, deckMid + 0.2, zBow - 5),
    new THREE.Vector3(0, 0, 1),
  );
  sockets.push({
    id: 'bow',
    kind: 'bow',
    pos: bowHit ?? new THREE.Vector3(0, deckMid + 0.3, zBow),
    dir: new THREE.Vector3(0, 0, -1),
    up: new THREE.Vector3(0, 1, 0),
    size: opts.tier,
    side: 0,
  });

  // Ахтерштевень
  const sternHit = hitHull(
    frame.hull,
    new THREE.Vector3(0, deckMid, zStern + 5),
    new THREE.Vector3(0, 0, -1),
  );
  sockets.push({
    id: 'stern',
    kind: 'stern',
    pos: sternHit ?? new THREE.Vector3(0, deckMid, zStern),
    dir: new THREE.Vector3(0, 0, 1),
    up: new THREE.Vector3(0, 1, 0),
    size: opts.tier,
    side: 0,
  });

  // Двигатели: кормовые скулы, по одному на борт
  for (const side of [-1, 1] as const) {
    const z = zStern - 2.0;
    const x = frame.halfBeamAt(z) * 0.55;
    sockets.push({
      id: `engine:${side}`,
      kind: 'engine',
      pos: new THREE.Vector3(side * x, frame.deckY(z) + 0.1, z),
      dir: new THREE.Vector3(0, 0, 1),
      up: new THREE.Vector3(0, 1, 0),
      size: opts.tier,
      side,
    });
  }

  // Степсы мачт: строго по диаметрали, верх — нормаль палубы
  opts.masts.forEach((z, i) => {
    sockets.push({
      id: `mast:${i}`,
      kind: 'deck',
      pos: new THREE.Vector3(0, frame.deckY(z), z),
      dir: new THREE.Vector3(0, 1, 0),
      // Для вертикального направления верх задаётся осью Z
      up: new THREE.Vector3(0, 0, -1),
      size: 2,
      side: 0,
    });
  });

  // Палубные места под надстройки: три по длине, между мачтами
  const deckZs = [zBow + (zStern - zBow) * 0.32, (zBow + zStern) / 2, zBow + (zStern - zBow) * 0.7];
  deckZs.forEach((z, i) => {
    sockets.push({
      id: `deck:${i}`,
      kind: 'deck',
      pos: new THREE.Vector3(0, frame.deckY(z) + 0.01, z),
      dir: new THREE.Vector3(0, 1, 0),
      up: new THREE.Vector3(0, 0, -1),
      size: opts.tier,
      side: 0,
    });
  });

  return sockets;
}

/**
 * Разворот части по сокету. Части моделируются носом в −Z, верхом в +Y:
 * кватернион переводит −Z в наружное направление сокета.
 */
export function socketQuaternion(socket: Socket): THREE.Quaternion {
  const zAxis = socket.dir.clone().negate().normalize();
  const xAxis = new THREE.Vector3().crossVectors(socket.up, zAxis);
  if (xAxis.lengthSq() < 1e-6) xAxis.set(1, 0, 0);
  xAxis.normalize();
  const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
  const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  return new THREE.Quaternion().setFromRotationMatrix(basis);
}

/** Ставит часть в сокет: позиция, разворот, утопление в поверхность. */
export function seatPart(socket: Socket, part: THREE.Object3D, sink = 0.02, scale = 1): void {
  part.position.copy(socket.pos).addScaledVector(socket.dir, sink);
  part.quaternion.copy(socketQuaternion(socket));
  part.scale.setScalar(scale);
  part.userData.socket = socket.id;
}
