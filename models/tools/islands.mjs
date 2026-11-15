// ilhas ligadas de um material, em frações do carro já orientado (frente=+X → fx; esquerda=−Z → fz pequeno)
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const [file, matName, minN = '50'] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(file); const root = doc.getRoot(); const B = getBounds(root.listScenes()[0]);
const L = B.max[2] - B.min[2], Wd = B.max[0] - B.min[0], H = B.max[1] - B.min[1];
for (const node of root.listNodes()) { const m = node.getMesh(); if (!m) continue; const M = node.getWorldMatrix();
  for (const p of m.listPrimitives()) { if (p.getMaterial()?.getName() !== matName) continue;
    const pos = p.getAttribute('POSITION'), idx = p.getIndices(), n = pos.getCount();
    const par = new Int32Array(n).map((_, i) => i); const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; }; const join = (a, b) => { a = find(a); b = find(b); if (a !== b) par[a] = b; };
    const seen = new Map(), v = [0, 0, 0], F = [];
    for (let i = 0; i < n; i++) { pos.getElement(i, v); const k = v.map(x => x.toFixed(4)).join(); const j = seen.get(k); if (j === undefined) seen.set(k, i); else join(i, j);
      const w = [0, 1, 2].map(r => M[r] * v[0] + M[4 + r] * v[1] + M[8 + r] * v[2] + M[12 + r]); F.push([(w[2] - B.min[2]) / L, (w[1] - B.min[1]) / H, (B.max[0] - w[0]) / Wd]); }
    if (idx) for (let i = 0; i < idx.getCount(); i += 3) { join(idx.getScalar(i), idx.getScalar(i + 1)); join(idx.getScalar(i), idx.getScalar(i + 2)); }
    const comp = new Map(); for (let i = 0; i < n; i++) { const r = find(i); const c = comp.get(r) || comp.set(r, { n: 0, lo: [9, 9, 9], hi: [-9, -9, -9] }).get(r); c.n++; for (let j = 0; j < 3; j++) { c.lo[j] = Math.min(c.lo[j], F[i][j]); c.hi[j] = Math.max(c.hi[j], F[i][j]); } }
    const list = [...comp.values()].filter(c => c.n >= +minN).sort((a, b) => b.n - a.n);
    console.log(`node ${node.getName()} verts ${n} islands ${comp.size} (>=${minN}: ${list.length})`);
    for (const c of list.slice(0, 60)) console.log(String(c.n).padStart(6), 'x', c.lo[0].toFixed(2), c.hi[0].toFixed(2), ' y', c.lo[1].toFixed(2), c.hi[1].toFixed(2), ' z', c.lo[2].toFixed(2), c.hi[2].toFixed(2));
  } }
