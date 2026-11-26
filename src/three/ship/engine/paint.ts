import type * as THREE from 'three';
import type { ShipMaterials } from '../style';

/**
 * Раскраска как отдельный слой. Части не знают своих цветов: они берут канал
 * (обшивка, отделка, парус, свечение), а палитра решает, чем этот канал
 * залит. Поэтому один и тот же корпус перекрашивается в лигу, империю или
 * пиратскую чёрно-красную схему без пересборки геометрии.
 */

export type ChannelName = 'hull' | 'deck' | 'trim' | 'sail' | 'glass' | 'core' | 'dark' | 'lamp' | 'wood';

export const CHANNELS: ChannelName[] = ['hull', 'deck', 'trim', 'sail', 'glass', 'core', 'dark', 'lamp', 'wood'];

export type Palette = Partial<Record<ChannelName, number>>;

export function readPalette(mats: ShipMaterials): Palette {
  return {
    hull: mats.hull.color.getHex(),
    deck: mats.deck.color.getHex(),
    trim: mats.trim.color.getHex(),
    sail: mats.sail.color.getHex(),
    glass: mats.glass.color.getHex(),
    core: mats.core.color.getHex(),
    dark: mats.dark.color.getHex(),
    lamp: mats.lamp.color.getHex(),
    wood: mats.wood.color.getHex(),
  };
}

/** Красит только те каналы, что есть в палитре; остальные не трогает. */
export function applyPalette(mats: ShipMaterials, palette: Palette): Palette {
  const applied: Palette = {};
  for (const channel of CHANNELS) {
    const color = palette[channel];
    if (typeof color !== 'number') continue;
    const material = mats[channel] as THREE.MeshStandardMaterial;
    if (!material || !material.color) continue;
    material.color.setHex(color);
    applied[channel] = color;
  }
  return applied;
}

export function blendPalette(base: Palette, over: Palette): Palette {
  return { ...base, ...over };
}

/**
 * Слова-краски из описания: «алый», «ледяной», «золотой». Возвращает
 * наложение поверх базовой палитры фракции, а не готовую схему.
 */
export function paletteFromHints(hints: string[], base: Palette): Palette {
  const over: Palette = {};
  for (const hint of hints) {
    if (hint === 'red') Object.assign(over, { hull: 0x6d1b24, trim: 0xd8a04a, sail: 0xb3414a });
    if (hint === 'ice') Object.assign(over, { hull: 0xa8c6d8, trim: 0xdff1f8, sail: 0xc6e4f2, core: 0x7fd4ff });
    if (hint === 'gold') Object.assign(over, { hull: 0x8a6a2f, trim: 0xffd479, sail: 0xd8c08a });
    if (hint === 'acid') Object.assign(over, { hull: 0x5c6b34, trim: 0xb9c07a, sail: 0xbfe86a, core: 0x9dff3c });
    if (hint === 'bone') Object.assign(over, { hull: 0xd8cfb4, trim: 0x8d8272, sail: 0xf1e8cf });
    if (hint === 'void') Object.assign(over, { hull: 0x1c1f27, trim: 0x8a8f9a, sail: 0x2b2f3a, core: 0xe11d48 });
  }
  return blendPalette(base, over);
}
