// Tapa buracos pequenos numa malha (o Model Y 2020–2024 vem com a pintura cheia de furinhos atrás das rodas da frente e no para-choques).
// Procura contornos abertos pequenos (arestas usadas por um só triângulo) e fecha-os com triângulos em leque.
// uso: node models/tools/fill-holes.mjs <entrada.glb> <saída.glb> Material [maxArestas=24] [maxTamanho=0.02 (fração do comprimento)]
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
const [inF, outF, matName, maxE = '24', maxS = '0.02'] = process.argv.slice(2);
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(inF), root = doc.getRoot();
const L = Math.max(...[0, 1, 2].map(i => getBounds(root.listScenes()[0]).max[i] - getBounds(root.listScenes()[0]).min[i]));
let holes = 0, tris = 0;
for (const node of root.listNodes()) for (const p of node.getMesh()?.listPrimitives() || []) {
  if (p.getMaterial()?.getName() !== matName) continue;
  const pos = p.getAttribute('POSITION'), idx = p.getIndices(), n = pos.getCount(), v = [0, 0, 0];
  const M = node.getWorldMatrix(), sc = Math.hypot(M[0], M[1], M[2]);
  // vértices com a mesma posição contam como um só (as costuras de normais/UV partem a malha)
  const key = new Map(), canon = new Int32Array(n), P = [];
  for (let i = 0; i < n; i++) { pos.getElement(i, v); P.push([...v]); const k = v.map(x => Math.round(x * 1e5)).join(); if (!key.has(k)) key.set(k, i); canon[i] = key.get(k); }
  const edges = new Map(); const T = [];
  for (let t = 0; t < idx.getCount(); t += 3) { const a = idx.getScalar(t), b = idx.getScalar(t + 1), c = idx.getScalar(t + 2); T.push(a, b, c);
    for (const [x, y] of [[a, b], [b, c], [c, a]]) { const cx = canon[x], cy = canon[y]; const k = cx < cy ? cx + ',' + cy : cy + ',' + cx; const e = edges.get(k); if (e) e.n++; else edges.set(k, { n: 1, from: x, to: y }); } }
  // arestas de contorno: from → to na direção do triângulo; ligação seguinte pelo vértice canónico
  const next = new Map();
  for (const e of edges.values()) if (e.n === 1) { const f = canon[e.from]; if (!next.has(f)) next.set(f, []); next.get(f).push(e); }
  const used = new Set(), add = [];
  for (const [start, list] of next) for (const e0 of list) {
    if (used.has(e0)) continue; const loop = [e0]; used.add(e0); let cur = e0, ok = false;
    for (let s = 0; s < +maxE; s++) { const nx = (next.get(canon[cur.to]) || []).find(e => !used.has(e)); if (!nx) break; if (canon[nx.from] === start && canon[cur.to] === start) {} 
      if (canon[cur.to] === start) { ok = true; break; } used.add(nx); loop.push(nx); cur = nx; if (canon[cur.to] === start) { ok = true; break; } }
    if (!ok || loop.length < 3) continue;
    const pts = loop.map(e => P[e.from]); const lo = [0, 1, 2].map(j => Math.min(...pts.map(q => q[j]))), hi = [0, 1, 2].map(j => Math.max(...pts.map(q => q[j])));
    if (Math.max(...[0, 1, 2].map(j => hi[j] - lo[j])) * sc > +maxS * L) continue;
    const vs = loop.map(e => e.from);
    for (let i = 1; i < vs.length - 1; i++) add.push(vs[0], vs[i + 1], vs[i]);   // ao contrário do contorno → mesma face para fora
    holes++;
  }
  if (!add.length) continue; tris += add.length / 3;
  const all = T.concat(add);
  p.setIndices(doc.createAccessor().setType('SCALAR').setArray(n > 65535 ? new Uint32Array(all) : new Uint16Array(all)).setBuffer(idx.getBuffer()));
}
console.log(`buracos tapados: ${holes} (${tris} triângulos)`);
await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(outF, doc);
