import * as THREE from 'three';

export interface HullProfile {
  /** Нос и корма по оси Z: [z носа (отрицательный), z кормы]. */
  zBow: number;
  zStern: number;
  /** Максимальная полуширина корпуса. */
  maxBeam: number;
  /** Высота палубы в миделе. */
  deckY: number;
  /** Подъём палубы к носу и к корме (седловатость). */
  bowSheer: number;
  sternSheer: number;
  /** Насколько днище уходит вниз в миделе. */
  keelDepth: number;
  /** Завал борта: насколько верхняя часть уже максимальной ширины. */
  tumblehome: number;
  /** Полнота обвода: 0.72 круглый борт, 0.34 почти гранёный ящик. */
  bilgeExp?: number;
  /** Продольная кривизна корпуса: 0 симметрично, 0.13 гуляет горбом. */
  asymmetry?: number;
  /** Продольных сечений и точек в полусечении. */
  stations?: number;
  ringPoints?: number;
  /** Смещение самой широкой точки к корме (0 — мидель, 1 — корма). */
  widestAt?: number;
}

/** Полуширина корпуса в долях от maxBeam: острый нос, полная корма. */
function beamCurve(s: number, widestAt: number): number {
  const peak = Math.min(0.98, Math.max(0.05, widestAt));
  if (s <= peak) {
    const t = s / peak;
    return Math.pow(t, 0.42) * (1 - 0.12 * t);
  }
  const t = (s - peak) / (1 - peak);
  return Math.pow(1 - t, 0.55) * (1 - 0.06 * t) + 0.04 * t;
}

/** Кривизна по длине: сварные корпуса горбятся, прессованные — нет. */
function asymFactor(profile: HullProfile, s: number): number {
  const a = profile.asymmetry ?? 0;
  if (!a) return 1;
  return 1 + a * Math.sin(s * Math.PI * 3.1 + 1.3);
}

/** Полуширина корпуса в конкретной точке по Z — для посадки пушек и декора. */
export function hullHalfBeam(profile: HullProfile, z: number): number {
  const { zBow, zStern, maxBeam, widestAt = 0.56 } = profile;
  const s = Math.min(1, Math.max(0, (z - zBow) / (zStern - zBow)));
  return maxBeam * beamCurve(s, widestAt) * asymFactor(profile, s);
}

/** Высота палубы в точке Z (седловатость). */
export function hullDeckY(profile: HullProfile, z: number): number {
  const { zBow, zStern, deckY, bowSheer, sternSheer } = profile;
  const s = Math.min(1, Math.max(0, (z - zBow) / (zStern - zBow)));
  const bowT = Math.max(0, 1 - s * 2.4);
  const sternT = Math.max(0, (s - 0.62) / 0.38);
  return deckY + bowSheer * bowT * bowT + sternSheer * sternT * sternT;
}

/**
 * Лофт-корпус: набор поперечных сечений с округлым днищем, седловатостью
 * палубы и завалом борта. Даёт silhouette галеона вместо extruded-ящика.
 */
export function buildLoftedHull(profile: HullProfile): THREE.BufferGeometry {
  const {
    zBow,
    zStern,
    maxBeam,
    deckY,
    bowSheer,
    sternSheer,
    keelDepth,
    tumblehome,
    stations = 26,
    ringPoints = 7,
    widestAt = 0.56,
    bilgeExp = 0.72,
  } = profile;

  const length = zStern - zBow;
  const ringSize = ringPoints * 2 + 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < stations; i++) {
    const s = i / (stations - 1);
    const z = zBow + length * s;

    // Седловатость: палуба поднимается к носу сильнее, к корме — с изломом
    const bowT = Math.max(0, 1 - s * 2.4);
    const sternT = Math.max(0, (s - 0.62) / 0.38);
    const top = deckY + bowSheer * bowT * bowT + sternSheer * sternT * sternT;

    // Киль: подъём к оконечностям, самая глубокая точка в миделе
    const mid = Math.sin(Math.PI * Math.min(1, Math.max(0, s)) * 0.92 + 0.08);
    const bottom = -keelDepth * Math.pow(mid, 0.8);

    const halfBeam = maxBeam * beamCurve(s, widestAt);

    for (let k = 0; k < ringSize; k++) {
      const t = k <= ringPoints ? (ringPoints - k) / ringPoints : (k - ringPoints) / ringPoints;
      const side = k <= ringPoints ? -1 : 1;

      // Округлое днище и завал в верхней трети борта
      let x = halfBeam * Math.pow(Math.sin((t * Math.PI) / 2), bilgeExp);
      if (t > 0.62) {
        const over = (t - 0.62) / 0.38;
        x *= 1 - tumblehome * over * over;
      }
      const y = bottom + (top - bottom) * Math.pow(t, 0.88);

      positions.push(side * x, y, z);
      uvs.push(k / (ringSize - 1), s);
    }
  }

  for (let i = 0; i < stations - 1; i++) {
    for (let k = 0; k < ringSize - 1; k++) {
      const a = i * ringSize + k;
      const b = a + 1;
      const c = (i + 1) * ringSize + k;
      const d = c + 1;
      // Намотка против часовой снаружи: иначе нормали смотрят внутрь и борта
      // отсекаются как обратные грани — корпус выглядит прозрачным
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Палуба по верху корпуса: полоса между левым и правым бортом. */
export function buildHullDeck(profile: HullProfile): THREE.BufferGeometry {
  const {
    zBow,
    zStern,
    maxBeam,
    deckY,
    bowSheer,
    sternSheer,
    stations = 26,
    widestAt = 0.56,
    tumblehome,
  } = profile;
  const length = zStern - zBow;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < stations; i++) {
    const s = i / (stations - 1);
    const z = zBow + length * s;
    const bowT = Math.max(0, 1 - s * 2.4);
    const sternT = Math.max(0, (s - 0.62) / 0.38);
    const top = deckY + bowSheer * bowT * bowT + sternSheer * sternT * sternT;
    // Пол не уже 0.22: сходящиеся в точку треугольники дают нулевые нормали
    const half = Math.max(0.22, maxBeam * beamCurve(s, widestAt) * asymFactor(profile, s) * (1 - tumblehome) * 1.01);
    const deckTop = top + 0.008;

    positions.push(-half, deckTop, z, half, deckTop, z);
    // Палуба почти плоская: нормаль вверх задаётся явно, без вырожденных граней
    normals.push(0, 1, 0, 0, 1, 0);
    uvs.push(0, s, 1, s);
  }

  for (let i = 0; i < stations - 1; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, b, b, c, d);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}
