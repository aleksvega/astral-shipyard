import * as THREE from 'three';

/**
 * Паруса. В оригинале это не ткань под ветром, а перепонки-накопители: светлое
 * полотно на тёмных рёбрах, как крыло. Поэтому Лига получает веер клинков с
 * ребром по кромке, Империя — прямые полотна с нижней реей.
 */

/** Один клинок: широкий у реи, сужается к скруглённому концу, с пузом. */
function bladeGeometry(width: number, height: number, bend: number): THREE.BufferGeometry {
  const nx = 12;
  const ny = 18;
  const pos: number[] = [];
  const uv: number[] = [];
  const indices: number[] = [];
  for (let j = 0; j <= ny; j++) {
    const v = j / ny;
    // Профиль крыла: у реи во всю ширину, к концу сходит до половины
    const halfW = (width / 2) * (1 - 0.5 * Math.pow(v, 1.7));
    for (let i = 0; i <= nx; i++) {
      const u = i / nx;
      const x = (u - 0.5) * 2 * halfW;
      // Углы подошвы подняты: без этого кончик клинка выходит срезанным пилой
      const corner = (u - 0.5) * (u - 0.5) * height * 0.18 * v * v;
      const y = -height * v + corner;
      const belly = Math.sin(Math.PI * u) * Math.sin(Math.PI * Math.min(1, v * 1.15));
      pos.push(x + bend * v * v, y, belly * width * 0.16);
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
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
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
  /** Тёмное ребро по кромке: без него перепонка читается простынёй. */
  ribMat?: THREE.Material;
};

/** Парус Лиги: веер клинков под общей реей, концы расходятся книзу. */
export function addPetalFan(root: THREE.Group, opts: PetalFanOptions): THREE.Group {
  const { z, y, count = 4, span = 1.5, length, width, tilt = -0.2, petalMat, ribMat } = opts;
  const fan = new THREE.Group();
  fan.position.set(0, y, z);
  fan.rotation.x = tilt;

  const blades = Math.max(3, count);
  // Шаг чуть меньше ширины клинка: соседние перепонки перекрываются на палец,
  // а не сливаются в сплошную белую стену
  const pitch = width * (0.62 + span * 0.07);
  const rib =
    ribMat ?? new THREE.MeshStandardMaterial({ color: 0x3b2a17, metalness: 0.35, roughness: 0.55 });

  for (let i = 0; i < blades; i++) {
    const off = i - (blades - 1) / 2;
    const lean = off / Math.max(1, (blades - 1) / 2);
    // Крайние клинки короче и сильнее завалены наружу — веер, а не частокол
    const h = length * (1 - 0.14 * Math.abs(lean));
    const w = width * 1.05;
    const blade = new THREE.Mesh(bladeGeometry(w, h, lean * 0.22), petalMat);
    blade.name = 'sail:petal';
    blade.position.set(off * pitch, 0, 0);
    blade.rotation.y = lean * 0.16;
    blade.rotation.z = lean * 0.1;
    fan.add(blade);

    // Ребро по наружной кромке клинка
    const edge = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.012, h * 0.98, 5), rib);
    edge.position.set(off * pitch - (w / 2) * 0.92, -h * 0.5, 0.02);
    edge.rotation.z = -lean * 0.1;
    edge.name = 'sail:rib';
    fan.add(edge);
  }

  root.add(fan);
  return fan;
}

/** Прямой парус Империи: полотно под реей, ярусами, с нижней реей. */
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
    const h = tierH * 0.96;
    const nx = panels * 8;
    const ny = 12;
    const pos: number[] = [];
    const uv: number[] = [];
    const indices: number[] = [];
    for (let j = 0; j <= ny; j++) {
      const v = j / ny;
      // Прямой верх у реи, низ шире — трапеция, иначе полотно висит простынёй
      const widthAt = width * (1 + 0.16 * v);
      for (let i = 0; i <= nx; i++) {
        const u = i / nx;
        const x = (u - 0.5) * widthAt;
        const belly = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
        const footArc = v > 0.9 ? (v - 0.9) / 0.1 : 0;
        const y = top - h * v + footArc * footArc * h * 0.12;
        pos.push(x, y, belly * width * 0.14);
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
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.028, h * 0.9, 0.04), ribMat);
      strap.position.set((u - 0.5) * width, top - h * 0.45, 0.02);
      strap.name = 'sail:strap';
      group.add(strap);
    }
  }

  root.add(group);
  return group;
}
