export { generateShip, type GeneratedShip } from './three/ship/generate';
export { assembleShip } from './three/ship/assemble';
export { CLASSES, CLASS_IDS, type ClassSpec } from './three/ship/classes';
export { STYLES, type ShipStyle, type ShipMaterials, type SailPlan } from './three/ship/style';
export { PARTS, getPart, type PartStats } from './three/ship/parts';
export { createProceduralTextures, applyPackToMaterials, type ProceduralTextureSet } from './three/textures';
export { loadTexturePack, buildPack, type TexturePack, type PackSource } from './three/texture-pack';

export {
  mergeBlueprint,
  describeBlueprint,
  picksOf,
  type ShipBlueprint,
  type Superstructure,
  type SailPlanId,
} from './three/ship/engine/spec';
export { parseShipText, type ParsedBuild } from './three/ship/engine/text';
export {
  evaluateBuild,
  rulesForScale,
  massUsage,
  SLOTS,
  type Budget,
  type PartInfo,
  type Pick,
  type Rules,
  type SlotName,
  type PartSize,
} from './three/ship/engine/budget';
export {
  applyPalette,
  blendPalette,
  paletteFromHints,
  readPalette,
  type ChannelName,
  type Palette,
} from './three/ship/engine/paint';
export { probeHullSurface, mountFlush, scatterOnHull, type HullSurface } from './three/ship/engine/mount';
