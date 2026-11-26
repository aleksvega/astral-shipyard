import * as THREE from 'three';
import type { ProceduralTextureSet } from '../textures';

// Движок не зависит от игры: те же три союза объявлены здесь и в lib/game/types.
// Меняешь один — поменяй второй, иначе борта и оружие разойдутся.
export type BeamTypeId = 'rapid' | 'medium' | 'heavy';
export type CannonFamilyId = 'astral' | 'rapid' | 'siege' | 'acid' | 'plasma';
export type ShieldArc = 'bow' | 'stern' | 'port' | 'starboard';

/** Вооружение, выбранное игроком: семья пушек и тип лучей на каждом борту. */
export type ShipWeapons = {
  cannonFamily?: CannonFamilyId;
  beamLeft?: BeamTypeId;
  beamRight?: BeamTypeId;
};

/** Общие части корпуса, которые наполняет каждая фракционная ветка. */
export interface PlayerShipParts {
  root: THREE.Group;
  sails: THREE.Mesh[];
  turbines: THREE.Object3D[];
  textures: ProceduralTextureSet;
  weapons: ShipWeapons;
  goldTrimMat: THREE.Material;
  cannonMat: THREE.Material;
  /** Точка крепления носовых эмиттеров: у каждого корпуса своя высота палубы. */
  beamMount?: { y: number; z: number };
}

/** Пушка семьи: длина ствола, калибр и дуло — оружие видно на корпусе. */
export const FAMILY_GUN: Record<CannonFamilyId, { length: number; bore: number; muzzle: number }> = {
  astral: { length: 1.18, bore: 0.13, muzzle: 0.19 },
  rapid: { length: 1.45, bore: 0.085, muzzle: 0.12 },
  siege: { length: 1.0, bore: 0.2, muzzle: 0.29 },
  acid: { length: 1.22, bore: 0.12, muzzle: 0.17 },
  plasma: { length: 1.3, bore: 0.14, muzzle: 0.21 },
};

export const BEAM_TONE: Record<BeamTypeId, number> = {
  rapid: 0xa3e635,
  medium: 0x38bdf8,
  heavy: 0xfb923c,
};

const BROADSIDE_GUN_Z = [-3.3, -1.5, 0.3, 2.1];

/**
 * Четыре орудия на борт: порт в борту, лафет и ствол. Семья оружия меняет
 * калибр и длину, поэтому апгрейд видно прямо на корабле.
 */
export function addBroadsideGuns(
  root: THREE.Group,
  cannonMat: THREE.Material,
  family: CannonFamilyId,
  opts?: {
    beamAt?: (z: number) => number;
    gunY?: number;
    /** Высота порта как функция z: палуба имеет седловатость, фиксированная Y не годится. */
    gunYAt?: (z: number) => number;
    /** Куда ставить порты: у каждого корпуса своя длина, фиксированный список не годится. */
    gunZs?: number[];
    /** Точка на обшивке; null — порт некуда ставить, он пропускается. */
    surfaceAt?: (side: 1 | -1, y: number, z: number) => number | null;
    rows?: 1 | 2;
  }
) {
  const spec = FAMILY_GUN[family] ?? FAMILY_GUN.astral;
  // Стволы крупнее и светлее: на дистанции тёмный металл на тёмном борту исчезает
  const barrelGeo = new THREE.CylinderGeometry(spec.bore * 1.25, spec.muzzle * 1.3, spec.length * 1.45, 10);
  const ringGeo = new THREE.TorusGeometry(spec.muzzle * 1.6, spec.muzzle * 0.42, 6, 12);
  const portGeo = new THREE.BoxGeometry(0.6, 0.5, 0.66);
  const carriageGeo = new THREE.BoxGeometry(0.5, 0.24, 0.7);
  const portMat = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.7, metalness: 0.5 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xc8a45c, roughness: 0.34, metalness: 0.9 });
  const carriageMat = new THREE.MeshStandardMaterial({ color: 0x4a3a24, roughness: 0.8, metalness: 0.25 });

  const gunZs = opts?.gunZs ?? BROADSIDE_GUN_Z;
  const rows = opts?.rows ?? 1;
  for (const side of [-1, 1] as const) {
    for (const cz of gunZs) {
      for (let row = 0; row < rows; row++) {
        const baseY = opts?.gunYAt ? opts.gunYAt(cz) : (opts?.gunY ?? 0.72);
        const gunY = baseY - row * 0.62;
        const surface = opts?.surfaceAt?.(side, gunY, cz);
        if (surface === null) continue;
        const beam = surface ?? (opts?.beamAt ? opts.beamAt(cz) : 2.24);

        const port = new THREE.Mesh(portGeo, portMat);
        port.position.set(side * (beam - 0.02), gunY - 0.12, cz);
        root.add(port);

        // Рамка порта: латунный кант вокруг ствола, иначе порт читается дырой
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.62, 0.78), rimMat);
        frame.position.set(side * (beam + 0.03), gunY - 0.1, cz);
        root.add(frame);

        const carriage = new THREE.Mesh(carriageGeo, carriageMat);
        carriage.position.set(side * (beam + 0.06), gunY - 0.3, cz);
        root.add(carriage);

        const barrel = new THREE.Mesh(barrelGeo, cannonMat);
        barrel.name = 'cannon-barrel';
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(side * (beam + 0.02 + spec.length / 2), gunY, cz);
        root.add(barrel);

        const ring = new THREE.Mesh(ringGeo, cannonMat);
        ring.name = 'cannon-muzzle';
        ring.rotation.y = Math.PI / 2;
        ring.position.set(side * (beam + spec.length), gunY, cz);
        root.add(ring);
      }
    }
  }
}

/** Два носовых эмиттера: цвет кристалла показывает тип лучемёта. */
export function addBeamEmitters(
  root: THREE.Group,
  left: BeamTypeId,
  right: BeamTypeId,
  mount?: { y: number; z: number }
) {
  const housingMat = new THREE.MeshStandardMaterial({ color: 0x1b2233, roughness: 0.45, metalness: 0.82 });
  const housingGeo = new THREE.CylinderGeometry(0.24, 0.34, 1.15, 10);
  const mountY = mount?.y ?? 1.0;
  const mountZ = mount?.z ?? -6.3;

  const build = (x: number, type: BeamTypeId) => {
    const tone = BEAM_TONE[type] ?? BEAM_TONE.medium;
    const housing = new THREE.Mesh(housingGeo, housingMat);
    housing.rotation.x = Math.PI / 2;
    housing.position.set(x, mountY, mountZ);
    root.add(housing);

    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 0),
      new THREE.MeshStandardMaterial({
        color: tone,
        emissive: tone,
        emissiveIntensity: 0.7,
        roughness: 0.15,
        metalness: 0.3,
      })
    );
    crystal.name = 'beam-crystal';
    crystal.position.set(x, mountY, mountZ - 0.65);
    root.add(crystal);

    const halo = makeGlow(tone, 0.9, 0.42);
    halo.position.set(x, mountY, mountZ - 0.65);
    root.add(halo);
  };

  build(-0.88, left);
  build(0.88, right);
}


let glowTexture: THREE.Texture | null = null;

export function getGlowTexture(): THREE.Texture | null {
  if (glowTexture) return glowTexture;
  if (typeof document === 'undefined') return null;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.4)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

/** Мягкий аддитивный ореол вокруг корпуса — «астральное свечение». */
export function makeGlow(color: number, size: number, opacity = 0.3): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(size);
  return sprite;
}

export interface BuiltPlayerShip {
  root: THREE.Group;
  sails: THREE.Mesh[];
  turbines: THREE.Object3D[];
  reactorMesh: THREE.Mesh;
  beamOrigin: THREE.Vector3;
  shieldArcs: Record<ShieldArc, THREE.Mesh>;
  shieldFlashes: Record<ShieldArc, number>;
  updateVisuals: (time: number, dt: number, heatRatio: number, throttle: number, shieldRatios: Record<ShieldArc, number>) => void;
}

export interface BuiltEnemyMesh {
  root: THREE.Group;
  shieldShell: THREE.Mesh;
  visorRing: THREE.Mesh;
  telegraphOrb: THREE.Mesh;
  animParts: THREE.Object3D[];
}

export function createShieldDome(colorHex: number): Record<ShieldArc, THREE.Mesh> {
  const makeArc = (phiStart: number) => {
    const geo = new THREE.SphereGeometry(6.5, 18, 12, phiStart, Math.PI / 2, 0.28, Math.PI - 0.56);
    geo.scale(0.86, 0.72, 1.38);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(colorHex) },
        uOpacity: { value: 0.22 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec2 vUv;
        void main() {
          float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDir))), 2.2);
          float grid = smoothstep(0.92, 1.0, abs(sin(vUv.x * 24.0))) * 0.25 +
                       smoothstep(0.92, 1.0, abs(sin(vUv.y * 18.0))) * 0.25;
          float alpha = clamp((fresnel * 0.85 + grid * 0.35 + 0.04) * uOpacity, 0.0, 0.75);
          gl_FragColor = vec4(uColor * (1.0 + fresnel * 0.4), alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 8;
    return mesh;
  };

  // In Three.js SphereGeometry, phi=0 is +X (starboard), phi=PI/2 is -Z (bow), phi=PI is -X (port), phi=3PI/2 is +Z (stern)
  return {
    starboard: makeArc(-Math.PI / 4),
    bow: makeArc(Math.PI / 4),
    port: makeArc((3 * Math.PI) / 4),
    stern: makeArc((5 * Math.PI) / 4),
  };
}
