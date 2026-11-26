import * as THREE from 'three';

/**
 * Декор канийского галеона: детали, которые читаются с дистанции и делают
 * силуэт Лиги узнаваемым — гнутый парус, литая голова грифона на бушприте,
 * алая «роза» в борту, луковичный купол на корме, гирлянды фонариков по
 * вантам и золотые рельсы по борту.
 */

/**
 * Золотые рельсы по борту: два пояса из коротких планок, идущих по обводу.
 * Текстура на дистанции боя не читается, а геометрия пояса — читается.
 */
export function addHullRails(
  root: THREE.Group,
  opts: {
    beamAt: (z: number) => number;
    deckY: (z: number) => number;
    mat: THREE.Material;
    from: number;
    to: number;
    steps?: number;
  },
): void {
  const { beamAt, deckY, mat, from, to, steps = 11 } = opts;
  const step = (to - from) / steps;
  const belts = [
    { drop: 0.1, h: 0.075, w: 0.05 },
    { drop: 0.62, h: 0.1, w: 0.06 },
  ];

  for (const belt of belts) {
    for (let i = 0; i < steps; i++) {
      const z = from + step * (i + 0.5);
      const beam = beamAt(z);
      const y = deckY(z) - belt.drop;
      for (const sx of [-1, 1]) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(belt.w, belt.h, Math.abs(step) * 1.04), mat);
        plank.position.set(sx * (beam - belt.w * 0.35), y, z);
        plank.rotation.x = -Math.atan2(deckY(z - step * 0.5) - deckY(z + step * 0.5), Math.abs(step)) * 0.6;
        root.add(plank);
      }
    }
  }
}

/** Голова грифона на конце бушприта: череп, клюв, два рога, гребень, глаз. */
export function addGriffonHead(
  root: THREE.Group,
  opts: { pos: THREE.Vector3; scale: number; bodyMat: THREE.Material; goldMat: THREE.Material; eyeMat: THREE.Material },
): THREE.Group {
  const { pos, scale, bodyMat, goldMat, eyeMat } = opts;
  const head = new THREE.Group();
  head.position.copy(pos);
  head.scale.setScalar(scale);

  // Шея внахлёст с бушпритом: голова не «насажена на палку»
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.1, 8), bodyMat);
  neck.position.set(0, -0.2, 0.7);
  neck.rotation.x = 1.15;
  head.add(neck);

  // Вытянутый вперёд череп — основа узнаваемого профиля
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), bodyMat);
  skull.scale.set(1.0, 0.86, 1.7);
  head.add(skull);

  // Один крупный клюв вперёд, с крючком на конце
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.19, 1.15, 8), goldMat);
  beak.rotation.x = -Math.PI / 2;
  beak.position.set(0, 0.02, -1.0);
  head.add(beak);

  const hook = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 6), goldMat);
  hook.rotation.x = -2.5;
  hook.position.set(0, -0.11, -1.48);
  head.add(hook);

  // Надбровье одной планкой и глаза по бокам черепа
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.2), goldMat);
  brow.position.set(0, 0.16, -0.34);
  head.add(brow);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), eyeMat);
    eye.position.set(side * 0.19, 0.05, -0.42);
    head.add(eye);
  }

  root.add(head);
  return head;
}

/** Круглый иллюминатор-«роза» в борту: золотое кольцо и алый витраж. */
export function addRoseWindow(
  root: THREE.Group,
  opts: { pos: THREE.Vector3; radius: number; goldMat: THREE.Material; glassMat: THREE.Material; axis?: 'x' | 'y' },
): void {
  const { pos, radius, goldMat, glassMat, axis = 'x' } = opts;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.16, 8, 20), goldMat);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.92, 20), glassMat);
  // Тёмная обойма позади стекла: даёт нишу и тень по кромке
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.8, metalness: 0.3 });
  const frame = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.16, radius * 0.14, 6, 18), frameMat);
  for (const mesh of [frame, ring, glass]) {
    mesh.position.copy(pos);
    if (axis === 'x') mesh.rotation.y = Math.PI / 2;
    root.add(mesh);
  }
  if (axis === 'x') frame.position.x -= 0.01;
  else frame.position.z -= 0.01;
  // Спицы тонкие и тёмные: светлое золото на блуме читалось белой снежинкой
  const spokeMat = new THREE.MeshStandardMaterial({ color: 0x4a3a1c, roughness: 0.6, metalness: 0.5 });
  for (let i = 0; i < 6; i++) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 1.1, radius * 0.05, radius * 0.05),
      spokeMat,
    );
    spoke.position.copy(pos);
    spoke.rotation.set(0, axis === 'x' ? Math.PI / 2 : 0, (i * Math.PI) / 6);
    root.add(spoke);
  }
}

/** Каннелированное тело вращения: луковица с вертикальными жёлобами. */
function flutedDomeGeometry(
  profile: [number, number][],
  radius: number,
  flutes: number,
  depth: number,
  segments = 48,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const rows = profile.length;

  for (let i = 0; i < rows; i++) {
    const [r, y] = profile[i];
    for (let j = 0; j <= segments; j++) {
      const phi = (j / segments) * Math.PI * 2;
      const flute = 1 + depth * Math.cos(flutes * phi);
      const rr = r * radius * flute;
      positions.push(Math.cos(phi) * rr, y * radius, Math.sin(phi) * rr);
      uvs.push(j / segments, i / (rows - 1));
    }
  }

  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j;
      const b = a + 1;
      const c = a + segments + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Луковичный купол: тело вращения с выпуклостью и вогнутым сужением к шпилю. */
export function addCupola(
  root: THREE.Group,
  opts: { pos: THREE.Vector3; radius: number; domeMat: THREE.Material; goldMat: THREE.Material },
): void {
  const { pos, radius, domeMat, goldMat } = opts;

  const profile: [number, number][] = [
    [0.58, 0],
    [0.92, 0.16],
    [1.0, 0.42],
    [0.9, 0.72],
    [0.62, 0.98],
    [0.3, 1.16],
    [0.12, 1.28],
  ];
  const dome = new THREE.Mesh(flutedDomeGeometry(profile, radius, 16, 0.085), domeMat);
  dome.position.copy(pos);
  root.add(dome);

  // Золотые пояса: у основания и по самой широкой части
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.6, radius * 0.07, 6, 18), goldMat);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.set(pos.x, pos.y + radius * 0.02, pos.z);
  root.add(baseRing);

  const beltRing = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.98, radius * 0.05, 6, 20), goldMat);
  beltRing.rotation.x = Math.PI / 2;
  beltRing.position.set(pos.x, pos.y + radius * 0.4, pos.z);
  root.add(beltRing);

  // Шпиль с шариком
  const spire = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.22, radius * 0.95, 8), goldMat);
  spire.position.set(pos.x, pos.y + radius * 1.72, pos.z);
  root.add(spire);

  const finial = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.11, 8, 8), goldMat);
  finial.position.set(pos.x, pos.y + radius * 2.2, pos.z);
  root.add(finial);
}

/** Гирлянда фонариков по провисающей нити от носа к мачтам. */
/**
 * Реактор: светящееся ядро в латунной клетке. Клетка из вертикальных стоек
 * читается на дистанции боя, в отличие от тонких обручей.
 */
export function addReactorCage(
  root: THREE.Group,
  opts: { pos: THREE.Vector3; coreRadius: number; coreMat: THREE.Material; goldMat: THREE.Material },
): { core: THREE.Mesh; ring: THREE.Mesh } {
  const { pos, coreRadius, coreMat, goldMat } = opts;
  const cage = new THREE.Group();
  cage.position.copy(pos);
  root.add(cage);

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(coreRadius, 1), coreMat);
  cage.add(core);

  const cageR = coreRadius * 1.45;
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i + Math.PI / 4;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, coreRadius * 2.5, 0.06), goldMat);
    post.position.set(Math.cos(angle) * cageR, 0, Math.sin(angle) * cageR);
    cage.add(post);
  }
  for (const y of [-coreRadius * 0.85, coreRadius * 0.85]) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(cageR, 0.035, 5, 20), goldMat);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = y;
    cage.add(hoop);
  }

  const base = new THREE.Mesh(new THREE.CylinderGeometry(coreRadius * 0.9, coreRadius * 1.2, 0.3, 10), goldMat);
  base.position.y = -coreRadius * 1.45;
  cage.add(base);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(cageR * 1.15, 0.05, 6, 22), goldMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -coreRadius * 1.45;
  cage.add(ring);

  return { core, ring };
}

export function addLanternString(
  root: THREE.Group,
  opts: { from: THREE.Vector3; to: THREE.Vector3; count?: number; sag?: number; mat: THREE.Material },
): void {
  const { from, to, count = 7, sag = 0.55 } = opts;
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x241c14, roughness: 0.95, metalness: 0.2 });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffd8a4,
    emissive: 0xffb257,
    emissiveIntensity: 0.55,
    roughness: 0.45,
  });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x8a7440, roughness: 0.5, metalness: 0.7 });
  const pointAt = (t: number) => from.clone().lerp(to, t).add(new THREE.Vector3(0, -Math.sin(Math.PI * t) * sag, 0));

  // Трос провисает по цепной линии: 8 коротких цилиндров вместо одной прямой
  const segments = 8;
  for (let i = 0; i < segments; i++) {
    const a = pointAt(i / segments);
    const b = pointAt((i + 1) / segments);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, a.distanceTo(b), 4), wireMat);
    seg.position.copy(a).lerp(b, 0.5);
    seg.lookAt(b);
    seg.rotateX(Math.PI / 2);
    root.add(seg);
  }

  for (let i = 1; i <= count; i++) {
    const p = pointAt(i / (count + 1));
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), lampMat);
    lamp.position.copy(p);
    root.add(lamp);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.028, 6), capMat);
    cap.position.copy(p).add(new THREE.Vector3(0, 0.055, 0));
    root.add(cap);
  }
}
