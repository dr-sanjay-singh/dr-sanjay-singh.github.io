// Procedural ball-and-stick molecules (original geometry, built in code)
export const ELEM = {
  C: { r: .34, c: 0x2b2f3d },
  N: { r: .33, c: 0x3d6bff },
  O: { r: .32, c: 0xff4d5e },
  H: { r: .2,  c: 0xe8ecf6 },
};

function builder() {
  const atoms = [], bonds = [];
  const atom = (el, p) => { atoms.push({ el, p: p.slice() }); return atoms.length - 1; };
  const bond = (a, b, o = 1) => bonds.push({ a, b, o });
  return { atoms, bonds, atom, bond };
}
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const len = a => Math.hypot(a[0], a[1], a[2]);
const norm = a => mul(a, 1 / len(a));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const rot = (v, axis, t) => { // Rodrigues
  const k = norm(axis), c = Math.cos(t), s = Math.sin(t), d = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
  return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, d * (1 - c)));
};

function methyl(B, anchor, dir) {
  const d = norm(dir), p = add(B.atoms[anchor].p, mul(d, 1.47));
  const c = B.atom('C', p); B.bond(anchor, c);
  const w = Math.abs(d[1]) < .9 ? [0, 1, 0] : [1, 0, 0];
  const u1 = norm(cross(d, w)), u2 = cross(d, u1);
  for (let i = 0; i < 3; i++) {
    const t = i * 2 * Math.PI / 3;
    const hd = norm(add(add(mul(d, .35), mul(u1, Math.cos(t) * .94)), mul(u2, Math.sin(t) * .94)));
    B.bond(c, B.atom('H', add(p, mul(hd, 1.05))));
  }
  return c;
}
function phenyl(B, anchor, dir, twist) {
  const a = B.atoms[anchor].p, d = norm(dir), c = add(a, mul(d, 2.9));
  const u = mul(d, -1); let w = [0, 0, 1]; if (Math.abs(u[2]) > .9) w = [0, 1, 0];
  const v = rot(norm(cross(u, w)), u, twist);
  const ids = [];
  for (let i = 0; i < 6; i++) { const t = i * Math.PI / 3; ids.push(B.atom('C', add(c, add(mul(u, Math.cos(t) * 1.4), mul(v, Math.sin(t) * 1.4))))); }
  B.bond(anchor, ids[0]);
  ids.forEach((id, i) => B.bond(id, ids[(i + 1) % 6], i % 2 ? 1 : 2));
  ids.slice(1).forEach(id => { const p = B.atoms[id].p; B.bond(id, B.atom('H', add(p, mul(norm(sub(p, c)), 1.05)))); });
}
function center(B) {
  const c = [0, 0, 0]; B.atoms.forEach(a => { c[0] += a.p[0]; c[1] += a.p[1]; c[2] += a.p[2]; });
  const m = mul(c, 1 / B.atoms.length); B.atoms.forEach(a => a.p = sub(a.p, m));
  return { atoms: B.atoms, bonds: B.bonds };
}

// Aminopentafulvene with aryl and ester substituents
export function fulvene() {
  const B = builder();
  const ring = [];
  for (let i = 0; i < 5; i++) { const t = Math.PI + i * 2 * Math.PI / 5; ring.push(B.atom('C', [Math.cos(t) * 1.2, Math.sin(t) * 1.2, 0])); }
  [[0, 1, 1], [1, 2, 2], [2, 3, 1], [3, 4, 2], [4, 0, 1]].forEach(([a, b, o]) => B.bond(ring[a], ring[b], o));
  const out = i => norm(B.atoms[ring[i]].p);
  const c6 = B.atom('C', [-2.56, 0, 0]); B.bond(ring[0], c6, 2);
  const n = B.atom('N', [-3.3, 1.2, .2]); B.bond(c6, n);
  methyl(B, n, [-.6, .9, .7]); methyl(B, n, [.2, .8, -.9]);
  phenyl(B, c6, [-.55, -1, .15], .9);
  phenyl(B, ring[2], out(2), .6);
  phenyl(B, ring[3], out(3), -.7);
  const ce = B.atom('C', add(B.atoms[ring[1]].p, mul(out(1), 1.48))); B.bond(ring[1], ce);
  const o1 = B.atom('O', add(B.atoms[ce].p, [-.9, .75, .3])); B.bond(ce, o1, 2);
  const o2 = B.atom('O', add(B.atoms[ce].p, [.9, .7, -.3])); B.bond(ce, o2);
  methyl(B, o2, [.8, .5, -.5]);
  B.bond(ring[4], B.atom('H', add(B.atoms[ring[4]].p, mul(out(4), 1.08))));
  return center(B);
}

// 3-cyano-4-methylcoumarin
export function coumarin() {
  const B = builder();
  const hex = (cx, t) => [cx + 1.4 * Math.cos(t * Math.PI / 180), 1.4 * Math.sin(t * Math.PI / 180), 0];
  const C4a = B.atom('C', hex(-1.212, 30)), C8a = B.atom('C', hex(-1.212, -30));
  const C5 = B.atom('C', hex(-1.212, 90)), C6 = B.atom('C', hex(-1.212, 150)), C7 = B.atom('C', hex(-1.212, 210)), C8 = B.atom('C', hex(-1.212, 270));
  const C4 = B.atom('C', hex(1.212, 90)), C3 = B.atom('C', hex(1.212, 30)), C2 = B.atom('C', hex(1.212, -30)), O1 = B.atom('O', hex(1.212, -90));
  [[C4a, C5, 2], [C5, C6, 1], [C6, C7, 2], [C7, C8, 1], [C8, C8a, 2], [C8a, C4a, 1], [C4a, C4, 1], [C4, C3, 2], [C3, C2, 1], [C2, O1, 1], [O1, C8a, 1]].forEach(([a, b, o]) => B.bond(a, b, o));
  const dirOf = (id, cx) => norm(sub(B.atoms[id].p, [cx, 0, 0]));
  [C5, C6, C7, C8].forEach(id => B.bond(id, B.atom('H', add(B.atoms[id].p, mul(dirOf(id, -1.212), 1.08)))));
  const Oc = B.atom('O', add(B.atoms[C2].p, mul(dirOf(C2, 1.212), 1.22))); B.bond(C2, Oc, 2);
  const Cn = B.atom('C', add(B.atoms[C3].p, mul(dirOf(C3, 1.212), 1.44))); B.bond(C3, Cn);
  const N = B.atom('N', add(B.atoms[Cn].p, mul(dirOf(C3, 1.212), 1.16))); B.bond(Cn, N, 3);
  methyl(B, C4, dirOf(C4, 1.212));
  return center(B);
}

// Build a THREE.Group from molecule data
export function toMesh(THREE, mol, opt = {}) {
  const { mirror = false, detail = 32, mono = false, emissive = 0x3a5cff } = opt;
  const g = new THREE.Group(), mats = {};
  for (const [el, d] of Object.entries(ELEM)) {
    mats[el] = new THREE.MeshPhysicalMaterial({
      color: mono ? (el === 'H' ? 0xf2f4fa : el === 'C' ? 0x5a6070 : 0xb9c2d6) : d.c,
      metalness: .1, roughness: .32, clearcoat: 1, clearcoatRoughness: .12,
      emissive: new THREE.Color(emissive), emissiveIntensity: 0,
    });
  }
  const bondMat = new THREE.MeshPhysicalMaterial({ color: 0x9aa3bd, metalness: .5, roughness: .25, clearcoat: 1, emissive: new THREE.Color(emissive), emissiveIntensity: 0 });
  const sphere = new THREE.SphereGeometry(1, detail, Math.round(detail * .7));
  const cyl = new THREE.CylinderGeometry(.075, .075, 1, 14);
  const meshes = [];
  mol.atoms.forEach(({ el, p }) => {
    const m = new THREE.Mesh(sphere, mats[el]);
    m.position.set(mirror ? -p[0] : p[0], p[1], p[2]);
    m.scale.setScalar(ELEM[el].r); m.userData.base = ELEM[el].r;
    g.add(m); meshes.push(m);
  });
  const up = new THREE.Vector3(0, 1, 0);
  mol.bonds.forEach(({ a, b, o }) => {
    const pa = meshes[a].position, pb = meshes[b].position;
    const dir = pb.clone().sub(pa), L = dir.length(); dir.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
    let off = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 0, 1));
    if (off.lengthSq() < .01) off.set(1, 0, 0); off.normalize();
    const offs = o === 3 ? [-.14, 0, .14] : o === 2 ? [-.11, .11] : [0];
    offs.forEach(k => {
      const m = new THREE.Mesh(cyl, bondMat);
      m.position.copy(pa).add(pb).multiplyScalar(.5).addScaledVector(off, k);
      m.quaternion.copy(q); const w = o > 1 ? .8 : 1; m.scale.set(w, L, w);
      g.add(m);
    });
  });
  g.userData = { mats, bondMat, meshes };
  return g;
}
