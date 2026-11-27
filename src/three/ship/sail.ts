import * as THREE from 'three';

/**
 * Парус Лиги: одно сплошное полотно на всю ширину реи, с общим пузом от ветра,
 * мягкой волной, подгибом нижней кромки и канавками швов, в которые уложена
 * латунная лента. Отдельный модуль, чтобы декор корабля оставался обозримым.
 */

function sailGeometry(
  totalW: number,
  length: number,
  panels: number,
  billow: number,
): { sail: THREE.BufferGeometry; seams: THREE.BufferGeometry[] } {
  const nx = panels * 14;
  const ny = 16;
  const pos: number[] = [];
  const uv: number[] = [];
  const indices: number[] = [];
  const seamU: number[] = [];
  for (let k = 1; k < panels; k++) seamU.push(k / panels);

  const dip = (u: number) => {
    let d = 0;
    for (const c of seamU) {
      const t = Math.abs(u - c) / 0.013;
      if (t < 3) d -= 0.032 * Math.exp(-t * t);
    }
    return d;
  };

  const rows: THREE.Vector3[][] = [];

  for (let j = 0; j <= ny; j++) {
    const v = j / ny;
    const widthAt = totalW * (0.8 + 0.2 * v);
    const hemFold = v > 0.93 ? (v - 0.93) / 0.07 : 0;
    const row: THREE.Vector3[] = [];
    for (let i = 0; i <= nx; i++) {
      const u = i / nx;
      const x = (u - 0.5) * widthAt;
      const lobe = Math.cos(2 * Math.PI * u * panels);
      const scallop = v > 0.88 ? lobe * length * 0.035 * ((v - 0.88) / 0.12) : 0;
      const y = -length * v + scallop;
      const z =
        billow * Math.sin(Math.PI * u) * Math.sin(Math.PI * Math.min(1, v * 1.04)) +
        dip(u) -
        hemFold * billow * 0.8 +
        0.03 * Math.sin(7 * Math.PI * u) * v +
        0.012 * Math.sin(13 * Math.PI * u) * v * v;
      pos.push(x, y, z);
      uv.push(u, 1 - v);
      if (i % (nx / panels) === 0) row.push(new THREE.Vector3(x, y, z));
    }
    rows.push(row);
  }

  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      const b = a + 1;
      const c = a + nx + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const sail = new THREE.BufferGeometry();
  sail.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sail.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  sail.setIndex(indices);
  sail.computeVertexNormals();

  // Латунные ленты в канавках швов: узкая полоска по центру каждого стыка
  const seams: THREE.BufferGeometry[] = [];
  for (let k = 1; k < panels; k++) {
    const sp: number[] = [];
    const si: number[] = [];
    for (let j = 0; j <= ny; j++) {
      const c = rows[j][k];
      sp.push(c.x - 0.085, c.y, c.z + 0.02);
      sp.push(c.x + 0.085, c.y, c.z + 0.02);
      if (j < ny) {
        const a = j * 2;
        si.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    g.setIndex(si);
    g.computeVertexNormals();
    seams.push(g);
  }

  return { sail, seams };
}

export type PetalFanOptions = {
  z: number;
  y: number;
  count?: number;
  span?: number;
  length: number;
  width: number;
  tilt?: number;
  petalMat: THREE.Material;
};

/** Парус Лиги: свисает с реи сплошным полотном, чуть заваливаясь назад. */
export function addPetalFan(root: THREE.Group, opts: PetalFanOptions): THREE.Group {
  const { z, y, count = 4, span = 1.5, length, width, tilt = -0.2, petalMat } = opts;
  const fan = new THREE.Group();
  fan.position.set(0, y, z);
  fan.rotation.x = tilt;

  const totalW = width * (0.9 + span * 0.8);
  const panels = Math.max(3, count);
  const { sail, seams } = sailGeometry(totalW, length, panels, totalW * 0.2);

  const cloth = new THREE.Mesh(sail, petalMat);
  cloth.name = 'sail:petal';
  fan.add(cloth);
  // Швы отдельным металлом, но в тон полотну: латунь не должна выбиваться в полосы
  const seamMat = new THREE.MeshStandardMaterial({ color: 0x4a3418, metalness: 0.3, roughness: 0.62 });
  for (const g of seams) fan.add(new THREE.Mesh(g, seamMat));

  // Рею держит сборка корпуса: одна широкая на мачту, парус висит ровно с неё.
  // Своя короткая рея внутри полотна давала второй, торчащий из паруса, прут.

  root.add(fan);
  return fan;
}

/** Прямой парус Империи: прямоугольное полотно под реей, ярусами. */
export function addSquareRig(root: THREE.Group, opts: {
  z: number;
  y: number;
  length: number;
  width: number;
  tiers?: number;
  panels?: number;
  petalMat: THREE.Material;
  ribMat: THREE.Material;
}): THREE.Group {
  const { z, y, length, width, tiers = 1, panels = 4, petalMat, ribMat } = opts;
  const group = new THREE.Group();
  group.position.set(0, y, z);
  const tierH = length / tiers;

  for (let tier = 0; tier < tiers; tier++) {
    const top = -tier * tierH;
    const h = tierH * 0.92;
    const nx = panels * 8;
    const ny = 10;
    const pos: number[] = [];
    const uv: number[] = [];
    const indices: number[] = [];
    for (let j = 0; j <= ny; j++) {
      const v = j / ny;
      // Прямой верх у реи, низ чуть шире — полотно не режется в трапецию
      const widthAt = width * (1 + 0.07 * v);
      for (let i = 0; i <= nx; i++) {
        const u = i / nx;
        const x = (u - 0.5) * widthAt;
        const belly = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
        const scallop = v > 0.86 ? Math.cos(2 * Math.PI * u * panels) * h * 0.03 * ((v - 0.86) / 0.14) : 0;
        pos.push(x, top - h * v + scallop, belly * 0.16);
        uv.push(u, 1 - v);
      }
    }
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i;
        const b = a + 1;
        const c = a + nx + 1;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const cloth = new THREE.BufferGeometry();
    cloth.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    cloth.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    cloth.setIndex(indices);
    cloth.computeVertexNormals();
    const mesh = new THREE.Mesh(cloth, petalMat);
    mesh.name = 'sail:square';
    group.add(mesh);

    // Нижняя рея: держит подошву полотна, иначе прямой парус читается флагом
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, width * 1.02, 6), ribMat);
    foot.rotation.z = Math.PI / 2;
    foot.position.y = top - h;
    foot.name = 'square-sail-foot';
    group.add(foot);

    // Вертикальные стропы по стыкам полотнищ
    for (let k = 1; k < panels; k++) {
      const u = k / panels;
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.03, h * 0.92, 0.05), ribMat);
      strap.position.set((u - 0.5) * width, top - h * 0.46, 0.16 * Math.sin(Math.PI * u) * 0.6);
      group.add(strap);
    }
  }

  root.add(group);
  return group;
}
