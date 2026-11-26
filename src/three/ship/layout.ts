import type { ClassSpec } from './classes';
import type { HullProfile } from './hull';
import type { MastSpec } from './assemble';
import { getPart } from './parts';
import type { Rng } from './rng';
import type { Socket } from './sockets';
import type { ShipStyle } from './style';

/**
 * Раскладка: сколько мачт, какой высоты, где палуба под орудия. Числа берутся
 * из класса и джиттера seed, поэтому класс читается, а борта не дублируются.
 */

export function jitterProfile(cls: ClassSpec, style: ShipStyle, rng: Rng): HullProfile {
  const p = cls.profile;
  const j = cls.jitter;
  return {
    ...p,
    zBow: p.zBow * (1 + rng.range(-j.length, j.length)),
    zStern: p.zStern * (1 + rng.range(-j.length, j.length)),
    maxBeam: p.maxBeam * (1 + rng.range(-j.beam, j.beam)),
    keelDepth: p.keelDepth * (1 + rng.range(-j.keel, j.keel)),
    deckY: p.deckY * (1 + rng.range(-j.deck, j.deck)),
    bowSheer: p.bowSheer * (1 + rng.range(-j.sheer, j.sheer) + style.sheerBias * 0.1),
    sternSheer: p.sternSheer * (1 + rng.range(-j.sheer, j.sheer) - style.sheerBias * 0.1),
  };
}

export function layoutMasts(cls: ClassSpec, profile: HullProfile, rng: Rng, forceCount?: number): MastSpec[] {
  const count = forceCount ?? rng.int(cls.masts.count[0], cls.masts.count[1]);
  if (count <= 0) return [];
  const masts: MastSpec[] = [];
  const from = profile.zBow + (profile.zStern - profile.zBow) * 0.26;
  const to = profile.zBow + (profile.zStern - profile.zBow) * 0.74;

  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const h = rng.range(cls.masts.height[0], cls.masts.height[1]);
    masts.push({
      z: from + (to - from) * t,
      h,
      fanY: h * 0.78,
      length: h * 0.46,
      width: rng.range(cls.masts.width[0], cls.masts.width[1]),
      count: rng.int(cls.masts.fanCount[0], cls.masts.fanCount[1]),
    });
  }
  return masts;
}

export function tierOf(cls: ClassSpec): 1 | 2 | 3 {
  if (cls.scale < 0.8) return 1;
  if (cls.scale < 1.1) return 2;
  return 3;
}

/** Выбор части из весов стиля с учётом слота и типоразмера. */
export function pickPart(
  weights: readonly (readonly [string, number])[],
  slot: Socket['kind'],
  tier: 1 | 2 | 3,
  rng: Rng,
): string | null {
  const options: [string, number][] = [];
  for (const [id, weight] of weights) {
    const part = getPart(id);
    if (!part || part.slot !== slot) continue;
    if (part.size > tier) continue;
    options.push([id, weight]);
  }
  return options.length ? rng.pickWeighted(options) : null;
}
