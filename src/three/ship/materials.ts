import * as THREE from 'three';
import type { ProceduralTextureSet } from '../textures';
import type { ShipMaterials, ShipStyle } from './style';

/**
 * Материалы борта. Отдельный слой, потому что палитра — это каналы: обшивка,
 * палуба, отделка, парус, стекло, ядро. Движок красит каналы, а не меши.
 */
export function makeMaterials(style: ShipStyle, textures: ProceduralTextureSet): ShipMaterials {
  const steel = style.hullTexture === 'steel';
  const hullMap = steel ? textures.empireSteelMap : textures.leagueLacquerMap;
  const surfaces = textures.surfaces;

  return {
    hull: new THREE.MeshStandardMaterial({
      color: style.hullColor,
      map: hullMap,
      normalMap: steel ? surfaces.steelNormal : surfaces.lacquerNormal,
      normalScale: new THREE.Vector2(steel ? 0.55 : 0.7, steel ? 0.55 : 0.7),
      roughnessMap: steel ? surfaces.steelRough : surfaces.lacquerRough,
      roughness: steel ? 0.8 : 0.85,
      metalness: steel ? 0.75 : 0.15,
      // Лофт — открытая оболочка (киль без палубы), односторонний материал
      // просвечивает изнутри: снаружи видно воду сквозь борт
      side: THREE.DoubleSide,
      // Гранёный имперский корпус без парусов иначе читается чёрной плитой
      emissive: new THREE.Color(style.school === 'wedge' ? 0x35506b : 0x000000),
      emissiveIntensity: style.school === 'wedge' ? 0.9 : 0,
    }),
    deck: new THREE.MeshStandardMaterial({
      color: style.deckColor,
      map: textures.leagueWoodMap,
      normalMap: surfaces.woodNormal,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughness: 0.9,
      metalness: 0.03,
    }),
    wood: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.leagueWoodMap,
      normalMap: surfaces.woodNormal,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 0.78,
      metalness: 0.05,
    }),
    trim: new THREE.MeshStandardMaterial({
      color: style.trimColor,
      map: textures.brassPatinaMap,
      normalMap: surfaces.brassNormal,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughnessMap: surfaces.brassRough,
      roughness: style.trimRoughness,
      metalness: style.trimMetalness,
    }),
    sail: new THREE.MeshPhysicalMaterial({
      color: style.sailColor,
      emissive: style.sailEmissive,
      emissiveIntensity: 0.28,
      roughness: 0.72,
      metalness: 0.02,
      sheen: 0.24,
      sheenColor: new THREE.Color(style.sailColor).offsetHSL(0.04, 0.05, 0.12),
      sheenRoughness: 0.7,
      side: THREE.DoubleSide,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: style.glassColor,
      emissive: style.glassEmissive,
      emissiveIntensity: 0.5,
      roughness: 0.35,
      metalness: 0.12,
    }),
    core: new THREE.MeshStandardMaterial({
      color: style.coreColor,
      emissive: style.coreEmissive,
      emissiveIntensity: 0.85,
      roughness: 0.45,
      metalness: 0.1,
    }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2b303c, roughness: 0.5, metalness: 0.65 }),
    lamp: new THREE.MeshStandardMaterial({
      color: 0xffc978,
      emissive: 0x9a5a12,
      emissiveIntensity: 0.4,
      roughness: 0.45,
    }),
  };
}
