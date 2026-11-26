import type { HullProfile } from './hull';

/**
 * Класс корабля — это пропорции и оснастка, а не декор. Один класс задаёт
 * диапазоны, из которых seed выбирает конкретные числа: два фрегата одного
 * класса похожи статью, но различаются длиной, полнотой и парусностью.
 */

export interface ClassSpec {
  id: string;
  label: string;
  /** Общий масштаб модели: от 0.75 у посыльного до 1.6 у дредноута. */
  scale: number;
  /** Базовый профиль; остальные числа — джиттер вокруг него. */
  profile: HullProfile;
  jitter: {
    length: number;
    beam: number;
    keel: number;
    sheer: number;
    deck: number;
  };
  masts: {
    count: [number, number];
    height: [number, number];
    width: [number, number];
    fanCount: [number, number];
    spread: number;
  };
  gunRows: 1 | 2;
  /** Высота орудий над палубой. */
  gunY: number;
  /** Насколько богато украшать: 0 — судно, 1 — парадный борт. */
  richness: number;
}

export const CLASSES: Record<string, ClassSpec> = {
  sloop: {
    id: 'sloop',
    label: 'Посыльный шлюп',
    scale: 0.72,
    profile: {
      zBow: -5.4,
      zStern: 4.6,
      maxBeam: 1.35,
      deckY: 0.62,
      bowSheer: 1.1,
      sternSheer: 0.95,
      keelDepth: 0.8,
      tumblehome: 0.12,
      widestAt: 0.54,
    },
    jitter: { length: 0.07, beam: 0.08, keel: 0.1, sheer: 0.12, deck: 0.05 },
    masts: { count: [1, 2], height: [5.2, 6.4], width: [1.0, 1.3], fanCount: [3, 4], spread: 2.1 },
    gunRows: 1,
    gunY: 0.46,
    richness: 0.25,
  },
  frigate: {
    id: 'frigate',
    label: 'Фрегат',
    scale: 0.88,
    profile: {
      zBow: -6.5,
      zStern: 5.6,
      maxBeam: 1.7,
      deckY: 0.68,
      bowSheer: 1.32,
      sternSheer: 1.15,
      keelDepth: 0.95,
      tumblehome: 0.13,
      widestAt: 0.55,
    },
    jitter: { length: 0.06, beam: 0.07, keel: 0.09, sheer: 0.1, deck: 0.04 },
    masts: { count: [2, 2], height: [6.2, 7.2], width: [1.3, 1.6], fanCount: [4, 5], spread: 2.4 },
    gunRows: 1,
    gunY: 0.54,
    richness: 0.5,
  },
  galleon: {
    id: 'galleon',
    label: 'Галеон',
    scale: 1.0,
    profile: {
      zBow: -7.0,
      zStern: 6.2,
      maxBeam: 1.95,
      deckY: 0.72,
      bowSheer: 1.55,
      sternSheer: 1.3,
      keelDepth: 1.05,
      tumblehome: 0.14,
      widestAt: 0.56,
    },
    jitter: { length: 0.05, beam: 0.06, keel: 0.08, sheer: 0.08, deck: 0.03 },
    masts: { count: [2, 3], height: [6.6, 7.6], width: [1.5, 1.9], fanCount: [4, 6], spread: 2.7 },
    gunRows: 2,
    gunY: 0.58,
    richness: 0.75,
  },
  dreadnought: {
    id: 'dreadnought',
    label: 'Дредноут',
    scale: 1.28,
    profile: {
      zBow: -8.4,
      zStern: 7.2,
      maxBeam: 2.35,
      deckY: 0.82,
      bowSheer: 1.35,
      sternSheer: 1.2,
      keelDepth: 1.25,
      tumblehome: 0.18,
      widestAt: 0.58,
    },
    jitter: { length: 0.04, beam: 0.05, keel: 0.07, sheer: 0.07, deck: 0.03 },
    masts: { count: [2, 3], height: [7.0, 8.2], width: [1.8, 2.2], fanCount: [5, 6], spread: 3.0 },
    gunRows: 2,
    gunY: 0.66,
    richness: 0.9,
  },
  ram: {
    id: 'ram',
    label: 'Таран',
    scale: 0.95,
    profile: {
      zBow: -6.2,
      zStern: 5.4,
      maxBeam: 2.1,
      deckY: 0.6,
      bowSheer: 0.85,
      sternSheer: 1.05,
      keelDepth: 1.15,
      tumblehome: 0.2,
      widestAt: 0.5,
    },
    jitter: { length: 0.05, beam: 0.07, keel: 0.08, sheer: 0.09, deck: 0.04 },
    masts: { count: [1, 2], height: [5.4, 6.6], width: [1.2, 1.6], fanCount: [3, 4], spread: 2.3 },
    gunRows: 1,
    gunY: 0.52,
    richness: 0.45,
  },
  crab: {
    id: 'crab',
    label: 'Астральный краб',
    scale: 1.1,
    profile: {
      zBow: -5.8,
      zStern: 5.8,
      maxBeam: 2.5,
      deckY: 0.9,
      bowSheer: 0.7,
      sternSheer: 0.7,
      keelDepth: 1.4,
      tumblehome: 0.26,
      widestAt: 0.5,
    },
    jitter: { length: 0.05, beam: 0.08, keel: 0.07, sheer: 0.08, deck: 0.04 },
    masts: { count: [0, 1], height: [5.0, 5.8], width: [1.1, 1.4], fanCount: [3, 4], spread: 2.0 },
    gunRows: 1,
    gunY: 0.6,
    richness: 0.35,
  },
};

export const CLASS_IDS = Object.keys(CLASSES);
