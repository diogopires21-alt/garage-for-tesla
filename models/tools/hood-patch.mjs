// Remendo do capô (Model Y 2020–2024): a chapa de fora tem falhas grandes que não são buracos fechados.
// Mede a altura do capô numa grelha (pelos triângulos da pintura virados para cima), preenche as células em falta
// pelas vizinhas e cria uma "chapa" nova na cor do carro 1,5 mm abaixo. Onde a chapa original existe, o remendo fica
// escondido; onde falta, é ele que se vê.
// Também serve para os lados (eixo 'left' = lado −Z, 'right' = lado +Z): aí a grelha é em comprimento × altura e mede a chapa mais de fora.
// uso: node models/tools/hood-patch.mjs <entrada.glb> <saída.glb> f0 f1 g0 g1 [células=90] [minN=0.55] [eixo=top|left|right]
//   top: f = comprimento (fx), g = largura (fz); left/right: f = comprimento (fx), g = altura (fy)
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
const [inF, outF, ...r] = process.argv.slice(2);
const [x0, x1, z0, z1] = r.slice(0, 4).map(Number), N = +(r[4] || 90), minNy = +(r[5] || .55), axis = r[6] || 'top';
const [U, Vv, Hh, out] = axis === 'top' ? [0, 2, 1, 1] : axis === 'left' ? [0, 1, 2, -1] : [0, 1, 2, 1];   // eixos da grelha (u, v), eixo medido (h) e sentido "para fora"
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(inF), root = doc.getRoot(), scene = root.listScenes()[0], B = getBounds(scene), S = [0, 1, 2].map(i => B.max[i] - B.min[i]);
const paint = root.listMaterials().find(m => m.getName() === 'Paint');
const X = i => B.min[U] + (x0 + (x1 - x0) * i / N) * S[U], Z = j => B.min[Vv] + (z0 + (z1 - z0) * j / N) * S[Vv];
const H = Array.from({ length: N + 1 }, () => new Float64Array(N + 1).fill(NaN));
// alturas: rasteriza cada triângulo da pintura virado para cima nos pontos da grelha (fica o mais alto)
for (const node of root.listNodes()) for (const p of node.getMesh()?.listPrimitives() || []) {
  if (p.getMaterial() !== paint) continue;
  const pos = p.getAttribute('POSITION'), idx = p.getIndices(), M = node.getWorldMatrix(), v = [0, 0, 0];
  const W = []; for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, v); W.push([0, 1, 2].map(k => M[k] * v[0] + M[4 + k] * v[1] + M[8 + k] * v[2] + M[12 + k])); }
  for (let t = 0; t < idx.getCount(); t += 3) {
    const [a, b, c] = [0, 1, 2].map(k => W[idx.getScalar(t + k)]);
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], L = Math.hypot(...n) || 1;
    if (Math.abs(n[Hh] / L) < minNy) continue;
    const lo = [Math.min(a[U], b[U], c[U]), Math.min(a[Vv], b[Vv], c[Vv])], hi = [Math.max(a[U], b[U], c[U]), Math.max(a[Vv], b[Vv], c[Vv])];
    const i0 = Math.max(0, Math.ceil((((lo[0] - B.min[U]) / S[U]) - x0) / (x1 - x0) * N)), i1 = Math.min(N, Math.floor((((hi[0] - B.min[U]) / S[U]) - x0) / (x1 - x0) * N));
    const j0 = Math.max(0, Math.ceil((((lo[1] - B.min[Vv]) / S[Vv]) - z0) / (z1 - z0) * N)), j1 = Math.min(N, Math.floor((((hi[1] - B.min[Vv]) / S[Vv]) - z0) / (z1 - z0) * N));
    const d = (b[U] - a[U]) * (c[Vv] - a[Vv]) - (c[U] - a[U]) * (b[Vv] - a[Vv]); if (Math.abs(d) < 1e-12) continue;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const px = X(i), pz = Z(j), u = ((px - a[U]) * (c[Vv] - a[Vv]) - (c[U] - a[U]) * (pz - a[Vv])) / d, w = ((b[U] - a[U]) * (pz - a[Vv]) - (px - a[U]) * (b[Vv] - a[Vv])) / d;
      if (u < -1e-6 || w < -1e-6 || u + w > 1 + 1e-6) continue;
      const y = a[Hh] + u * (b[Hh] - a[Hh]) + w * (c[Hh] - a[Hh]); if (Number.isNaN(H[i][j]) || y * out > H[i][j] * out) H[i][j] = y;   // fica a chapa mais de fora
    }
  }
}
// células em falta: só as que estão fechadas pelos quatro lados (linha e coluna) — buracos, não as bordas do capô
const known = H.map(row => row.map(y => !Number.isNaN(y)));
const enclosed = (i, j) => { const has = (di, dj) => { for (let k = 1; k <= N; k++) { const a = i + di * k, b = j + dj * k; if (a < 0 || b < 0 || a > N || b > N) return false; if (known[a][b]) return true; } return false; }; return has(1, 0) && has(-1, 0) && has(0, 1) && has(0, -1); };
const fill = H.map(row => Float64Array.from(row));
let holes = 0;
for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) if (!known[i][j] && enclosed(i, j)) { holes++;
  // média ponderada pela distância dos mais próximos conhecidos nas quatro direções
  let s = 0, wsum = 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = 1; k <= N; k++) { const a = i + di * k, b = j + dj * k; if (a < 0 || b < 0 || a > N || b > N) break; if (known[a][b]) { s += H[a][b] / k; wsum += 1 / k; break; } }
  fill[i][j] = s / wsum; }
const drop = .0015 * S[0] / 4.751;   // 1,5 mm abaixo da chapa
const P = [], I = [], id = new Map();
const vtx = (i, j) => { const k = i * (N + 1) + j; if (!id.has(k)) { id.set(k, P.length / 3); const q = [0, 0, 0]; q[U] = X(i); q[Vv] = Z(j); q[Hh] = fill[i][j] - drop * out; P.push(...q); } return id.get(k); };
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
  const q = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]; if (q.some(([a, b]) => Number.isNaN(fill[a][b]))) continue;
  const [A, Bq, C, D] = q.map(([a, b]) => vtx(a, b)); I.push(A, C, Bq, A, D, C);   // o sentido acerta-se a seguir
}
// sentido de cada triângulo: virado para fora
for (let t = 0; t < I.length; t += 3) { const [a, b, c] = [I[t], I[t + 1], I[t + 2]].map(k => [P[3 * k], P[3 * k + 1], P[3 * k + 2]]); const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]; if (n[Hh] * out < 0) { const k = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = k; } }
// normais pela grelha
const Nn = new Float32Array(P.length);
for (let t = 0; t < I.length; t += 3) { const [a, b, c] = [I[t], I[t + 1], I[t + 2]].map(k => [P[3 * k], P[3 * k + 1], P[3 * k + 2]]); const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]; for (const k of [I[t], I[t + 1], I[t + 2]]) for (let m = 0; m < 3; m++) Nn[3 * k + m] += n[m]; }
for (let k = 0; k < Nn.length; k += 3) { const L = Math.hypot(Nn[k], Nn[k + 1], Nn[k + 2]) || 1; if (Nn[k + Hh] * out < 0) { Nn[k] *= -1; Nn[k + 1] *= -1; Nn[k + 2] *= -1; } Nn[k] /= L; Nn[k + 1] /= L; Nn[k + 2] /= L; }
const buf = root.listBuffers()[0];
const prim = doc.createPrimitive().setMaterial(paint)
  .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(P)).setBuffer(buf))
  .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(Nn).setBuffer(buf))
  .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(I)).setBuffer(buf));
const nm = axis === 'top' ? 'HoodPatch' : 'SidePatch'; scene.addChild(doc.createNode(nm).setMesh(doc.createMesh(nm).addPrimitive(prim)));
console.log(`remendo: ${I.length / 3} triângulos, ${holes} pontos em falta preenchidos`);
await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(outF, doc);
