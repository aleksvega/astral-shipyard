import * as THREE from 'three';

/**
 * Такелаж: ванты от клотика к борту, выбленки между ними и штаги по диаметрали.
 * Тонкие цилиндры дешевле линии и держат свет — на дистанции боя читаются как
 * снасть, а не как debug-сплайн.
 */

export interface RiggingMast {
  /** Положение мачты по корме-носу. */
  z: number;
  /** Высота мачты над палубой. */
  h: number;
}

export interface RiggingOptions {
  masts: RiggingMast[];
  beamAt: (z: number) => number;
  deckY: (z: number) => number;
  ropeMat: THREE.Material;
  /** Точка на бушприте, куда идёт форштаг. */
  bowTip?: THREE.Vector3;
}

function strut(a: THREE.Vector3, b: THREE.Vector3, radius: number, mat: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 4), mat);
  mesh.position.copy(a).lerp(b, 0.5);
  mesh.lookAt(b);
  mesh.rotateX(Math.PI / 2);
  return mesh;
}

export function addRigging(root: THREE.Group, opts: RiggingOptions): void {
  const { masts, beamAt, deckY, ropeMat, bowTip } = opts;
  // Выбленки светлее вант: тёмный трос на синем небе не читается
  const rungMat = new THREE.MeshStandardMaterial({ color: 0xd9cfb6, roughness: 0.9, metalness: 0.05 });
  const tops = masts.map((m) => new THREE.Vector3(0, deckY(m.z) + m.h * 0.9, m.z));

  masts.forEach((m, index) => {
    const top = tops[index];
    for (const side of [-1, 1] as const) {
      const anchors: THREE.Vector3[] = [];
      for (let k = 0; k < 3; k++) {
        const z = m.z + 0.9 - k * 0.62;
        const anchor = new THREE.Vector3(side * (beamAt(z) * 0.96), deckY(z) + 0.28, z);
        anchors.push(anchor);
        root.add(strut(top, anchor, 0.014, ropeMat));
      }
      // Выбленки у борта, где ванты уже разошлись: у клотика они сходятся в точку
      for (let r = 0; r < 5; r++) {
        const t = 0.8 + r * 0.042;
        for (let k = 0; k < anchors.length - 1; k++) {
          const a = top.clone().lerp(anchors[k], t);
          const b = top.clone().lerp(anchors[k + 1], t);
          root.add(strut(a, b, 0.016, rungMat));
        }
      }
    }
  });

  // Штаги: между клотиками мачт и на бушприт
  for (let i = 0; i < tops.length - 1; i++) {
    root.add(strut(tops[i + 1], tops[i], 0.016, ropeMat));
  }
  if (bowTip && tops.length > 0) {
    root.add(strut(tops[0], bowTip, 0.018, ropeMat));
  }
}
