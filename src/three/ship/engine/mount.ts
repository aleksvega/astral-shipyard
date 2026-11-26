import * as THREE from 'three';
import type { Rng } from '../rng';

/**
 * Посадка на поверхность. Любая накладка — заплата, бронеплита, шип, порт —
 * ставится по лучу в обшивку: точка, нормаль, касательная. Поэтому деталь
 * прилегает к гранёному борту под своим углом, а не висит параллельно оси.
 */

export interface HullSurface {
  /** Точка на обшивке. */
  point: THREE.Vector3;
  /** Нормаль наружу. */
  normal: THREE.Vector3;
  /** Касательная вдоль борта: по ней выравнивают длинную сторону накладки. */
  along: THREE.Vector3;
  side: 1 | -1;
}

const _ray = new THREE.Raycaster();
const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3(-1, 0, 0);

/** Луч снаружи внутрь: возвращает первую точку обшивки или null. */
export function probeHullSurface(hull: THREE.Object3D, side: 1 | -1, y: number, z: number): HullSurface | null {
  hull.updateMatrixWorld(true);
  _origin.set(side * 9, y, z);
  _dir.set(-side, 0, 0);
  _ray.set(_origin, _dir.normalize());
  const hits = _ray.intersectObject(hull, false);
  const hit = hits[0];
  if (!hit || !hit.face) return null;

  const normal = hit.face.normal.clone().transformDirection(hull.matrixWorld);
  if (normal.x * side < 0) normal.negate();
  const along = new THREE.Vector3(0, 0, 1).cross(normal).normalize().cross(normal).multiplyScalar(-1);
  return { point: hit.point.clone(), normal, along, side };
}

export interface MountOptions {
  /** Насколько вынести деталь наружу от обшивки. */
  offset?: number;
  /** Повернуть вокруг нормали, радианы. */
  spin?: number;
  /** Прижать верх детали к нормали (по умолчанию да). */
  align?: boolean;
}

/**
 * Ставит объект на поверхность: начало координат детали садится в точку
 * обшивки, ось Y совмещается с нормалью, ось Z — с касательной борта.
 */
export function mountFlush(object: THREE.Object3D, surface: HullSurface, opts: MountOptions = {}): void {
  const { offset = 0, spin = 0, align = true } = opts;
  object.position.copy(surface.point).addScaledVector(surface.normal, offset);
  if (!align) return;

  const up = surface.normal.clone();
  const forward = surface.along.clone().applyAxisAngle(up, spin);
  const right = new THREE.Vector3().crossVectors(up, forward).normalize();
  const back = new THREE.Vector3().crossVectors(right, up).normalize();
  const basis = new THREE.Matrix4().makeBasis(right, up, back.negate());
  object.quaternion.setFromRotationMatrix(basis);
}

/** Раскладывает N накладок по борту со случайным шагом — заплаты, шипы, порты. */
export function scatterOnHull(
  hull: THREE.Object3D,
  count: number,
  rng: Rng,
  range: { yFrom: number; yTo: number; zFrom: number; zTo: number },
  side?: 1 | -1,
): HullSurface[] {
  const out: HullSurface[] = [];
  for (let i = 0; i < count; i++) {
    const useSide: 1 | -1 = side ?? (rng.chance(0.5) ? 1 : -1);
    const y = rng.range(range.yFrom, range.yTo);
    const z = rng.range(range.zFrom, range.zTo);
    const surface = probeHullSurface(hull, useSide, y, z);
    if (surface) out.push(surface);
  }
  return out;
}
