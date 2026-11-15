// Tira de um .glb já preparado:
//  - todas as peças com certos materiais (ex.: a matrícula)
//  - com "--suporte Material": as ilhas desse material com forma de suporte de matrícula (frente ou trás, ao centro)
// uso: node models/tools/drop.mjs <entrada.glb> <saída.glb> Material1 Material2 ... [--suporte Material]
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
const args = process.argv.slice(2), [inFile, outFile] = args;
const si = args.indexOf('--suporte'), holder = si > 0 ? args[si + 1] : null;
const names = args.slice(2, si > 0 ? si : undefined);
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(inFile), root = doc.getRoot(); let n = 0;
for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) if (names.includes(p.getMaterial()?.getName())) { mesh.removePrimitive(p); p.dispose(); n++; }
console.log(`tiradas ${n} peças`, names.join(', '));
if (holder) console.log(`suportes de ${holder}: ${removePlateHolders(doc, holder)} triângulos`);
await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(outFile, doc);
console.log('ok', outFile);

// carro já orientado: frente = +X; fx/fy/fz em frações da caixa do carro
export function removePlateHolders(doc, matName) {
  const root = doc.getRoot(), B = getBounds(root.listScenes()[0]), S = [0, 1, 2].map(i => B.max[i] - B.min[i]); let removed = 0;
  for (const node of root.listNodes()) { const mesh = node.getMesh(); if (!mesh) continue; const M = node.getWorldMatrix();
    for (const p of mesh.listPrimitives()) { if (p.getMaterial()?.getName() !== matName) continue;
      const pos = p.getAttribute('POSITION'), idx = p.getIndices(), cnt = pos.getCount(), v = [0, 0, 0], F = [];
      const par = new Int32Array(cnt).map((_, i) => i), find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; }, join = (a, b) => { a = find(a); b = find(b); if (a !== b) par[a] = b; };
      const seen = new Map();
      for (let i = 0; i < cnt; i++) { pos.getElement(i, v); const k = v.map(x => x.toFixed(4)).join(); const j = seen.get(k); if (j === undefined) seen.set(k, i); else join(i, j);
        const w = [0, 1, 2].map(r => M[r] * v[0] + M[4 + r] * v[1] + M[8 + r] * v[2] + M[12 + r]); F.push(w.map((x, j) => (x - B.min[j]) / S[j])); }
      for (let t = 0; t < idx.getCount(); t += 3) { join(idx.getScalar(t), idx.getScalar(t + 1)); join(idx.getScalar(t), idx.getScalar(t + 2)); }
      const box = new Map();
      for (let i = 0; i < cnt; i++) { const r = find(i), b = box.get(r) || box.set(r, { lo: [9, 9, 9], hi: [-9, -9, -9] }).get(r); for (let j = 0; j < 3; j++) { b.lo[j] = Math.min(b.lo[j], F[i][j]); b.hi[j] = Math.max(b.hi[j], F[i][j]); } }
      const drop = new Set([...box].filter(([, b]) => (b.lo[0] > .98 || b.hi[0] < .02) && Math.abs((b.lo[2] + b.hi[2]) / 2 - .5) < .03 && b.hi[2] - b.lo[2] < .2 && b.hi[1] - b.lo[1] < .15).map(([r]) => r));
      const keep = []; for (let t = 0; t < idx.getCount(); t += 3) { const tri = [idx.getScalar(t), idx.getScalar(t + 1), idx.getScalar(t + 2)]; if (drop.has(find(tri[0]))) removed++; else keep.push(...tri); }
      p.setIndices(doc.createAccessor().setType('SCALAR').setArray(cnt > 65535 ? new Uint32Array(keep) : new Uint16Array(keep)).setBuffer(idx.getBuffer()));
    } }
  return removed;
}
