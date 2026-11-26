import * as THREE from 'three';

/**
 * Настоящие CC0-текстуры (ambientCG) как опция поверх процедурных.
 *
 * Если набора нет — работает процедурка, никаких ошибок и пустых материалов.
 * Источники — либо URL из манифеста (браузер), либо data-URL (CLI: страница
 * грузится с file://, где fetch запрещён, поэтому файлы отдаёт сам CLI).
 */

export interface PackSource {
  color?: string;
  normal?: string;
  rough?: string;
}

export interface PackSet {
  color?: THREE.Texture;
  normal?: THREE.Texture;
  rough?: THREE.Texture;
}

export interface TexturePack {
  plates?: PackSet;
  wood?: PackSet;
  metal?: PackSet;
}

export const PACK_SETS = ['plates', 'wood', 'metal'] as const;

function loadTexture(url: string, srgb: boolean, anisotropy: number): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    // Без таймаута битый или медленный файл держит всю сцену на процедурке молча
    const timer = setTimeout(() => reject(new Error(`таймаут текстуры ${url}`)), 8000);
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        clearTimeout(timer);
        texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = anisotropy;
        resolve(texture);
      },
      undefined,
      () => {
        clearTimeout(timer);
        reject(new Error(`не загрузилась текстура ${url}`));
      },
    );
  });
}

/** Собирает набор из готовых URL (http или data:). Отсутствующие файлы — пропуск. */
export async function buildPack(
  sources: Partial<Record<(typeof PACK_SETS)[number], PackSource>>,
  anisotropy: number,
): Promise<TexturePack | null> {
  const entries = await Promise.all(
    PACK_SETS.map(async (name) => {
      const source = sources[name];
      if (!source) return null;
      const [color, normal, rough] = await Promise.all([
        source.color ? loadTexture(source.color, true, anisotropy).catch(() => undefined) : undefined,
        source.normal ? loadTexture(source.normal, false, anisotropy).catch(() => undefined) : undefined,
        source.rough ? loadTexture(source.rough, false, anisotropy).catch(() => undefined) : undefined,
      ]);
      if (!color && !normal && !rough) return null;
      return [name, { color, normal, rough }] as const;
    }),
  );
  const pack: TexturePack = {};
  let any = false;
  for (const entry of entries) {
    if (!entry) continue;
    pack[entry[0]] = entry[1];
    any = true;
  }
  return any ? pack : null;
}

/** Браузерный путь: манифест `/textures/pack.json`. Нет файла — null. */
export async function loadTexturePack(
  manifestUrl = '/textures/pack.json',
  anisotropy = 4,
): Promise<TexturePack | null> {
  try {
    const response = await fetch(manifestUrl, { cache: 'force-cache' });
    if (!response.ok) return null;
    const manifest = (await response.json()) as { base?: string; sets?: Record<string, PackSource> };
    if (!manifest.sets) return null;
    const root = new URL(manifest.base ?? '', new URL(manifestUrl, window.location.href));
    const resolve = (path: string): string => new URL(path, root).href;
    const sources: Partial<Record<(typeof PACK_SETS)[number], PackSource>> = {};
    for (const name of PACK_SETS) {
      const set = manifest.sets[name];
      if (!set) continue;
      sources[name] = {
        color: set.color ? resolve(set.color) : undefined,
        normal: set.normal ? resolve(set.normal) : undefined,
        rough: set.rough ? resolve(set.rough) : undefined,
      };
    }
    return await buildPack(sources, anisotropy);
  } catch {
    return null;
  }
}

/** Пак уже загружен к моменту сборки? Тогда берём его, иначе процедурка. */
let cached: TexturePack | null = null;

export function setCachedPack(pack: TexturePack | null): void {
  cached = pack;
}

export function getCachedPack(): TexturePack | null {
  return cached;
}
