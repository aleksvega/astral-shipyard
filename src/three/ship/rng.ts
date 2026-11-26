/**
 * Детерминированный генератор: один и тот же seed всегда даёт один и тот же
 * корабль. Нужен, чтобы каталог из 20 бортов был воспроизводим (сохраняется в
 * сейв по числу), а не «как повезло в этот раз».
 */

export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  next: () => number;
  range: (min: number, max: number) => number;
  int: (min: number, max: number) => number;
  chance: (p: number) => boolean;
  pick: <T>(items: readonly T[]) => T;
  /** Взвешенный выбор: вес — третье поле пары. */
  pickWeighted: <T>(items: readonly (readonly [T, number])[]) => T;
}

export function createRng(seed: number): Rng {
  const next = makeRng(seed);
  const range = (min: number, max: number) => min + next() * (max - min);
  return {
    next,
    range,
    int: (min, max) => Math.floor(range(min, max + 1)),
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length) % items.length],
    pickWeighted: (items) => {
      const total = items.reduce((sum, [, w]) => sum + w, 0);
      let roll = next() * total;
      for (const [value, weight] of items) {
        roll -= weight;
        if (roll <= 0) return value;
      }
      return items[items.length - 1][0];
    },
  };
}
