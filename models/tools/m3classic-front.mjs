// Model 3 2017–2023: acerta a entrada de ar da frente para ficar como no carro real (grelha preta, sem separadores à vista)
//  - tira os 5 separadores verticais e os 4 parafusos do suporte da matrícula
//  - pinta de preto as paredes de dentro da abertura (no carro real é plástico preto)
//  - acrescenta uma grelha nova de riscas horizontais pretas, a seguir a curva do para-choques (material "Grille")
// uso: node models/tools/m3classic-front.mjs <entrada.glb> <saída.glb>   (carro já orientado: frente = +X; usar no .glb sem matrícula)
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
const [inFile, outFile] = process.argv.slice(2);
const GR = { depth: .012, y0: .172, y1: .262, bars: 9, barH: .0032, barD: .008, zAt: y => .245 + .65 * (y - .17) };   // frações da caixa do carro
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(inFile), root = doc.getRoot(), scene = root.listScenes()[0], B = getBounds(scene), S = [0, 1, 2].map(i => B.max[i] - B.min[i]);
const black = root.listMaterials().find(m => m.getName() === 'BlackWash');
const faceX = z => .995 - .139 * (z - .5) ** 2;   // frente do para-choques à volta da abertura
const isSlat = b => b.hi[0] > .94 && b.lo[1] > .15 && b.hi[1] < .28 && b.lo[2] > .3 && b.hi[2] < .7 && b.hi[2] - b.lo[2] < .02;
const isScrew = b => b.lo[0] > .99 && b.hi[1] - b.lo[1] < .015 && b.hi[2] - b.lo[2] < .015 && Math.abs((b.lo[2] + b.hi[2]) / 2 - .5) < .06;
let slats = 0, screws = 0, walls = 0;
for (const node of root.listNodes()) { const mesh = node.getMesh(); if (!mesh) continue; const M = node.getWorldMatrix();
  for (const p of mesh.listPrimitives()) { const name = p.getMaterial()?.getName(); if (name !== 'Paint' && name !== 'BlackWash') continue;
    const pos = p.getAttribute('POSITION'), idx = p.getIndices(), cnt = pos.getCount(), v = [0, 0, 0], F = [];
    const par = new Int32Array(cnt).map((_, i) => i), find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; }, join = (a, b) => { a = find(a); b = find(b); if (a !== b) par[a] = b; };
    const seen = new Map();
    for (let i = 0; i < cnt; i++) { pos.getElement(i, v); const k = v.map(x => x.toFixed(4)).join(); const j = seen.get(k); if (j === undefined) seen.set(k, i); else join(i, j);
      const w = [0, 1, 2].map(r => M[r] * v[0] + M[4 + r] * v[1] + M[8 + r] * v[2] + M[12 + r]); F.push(w.map((x, j) => (x - B.min[j]) / S[j])); }
    for (let t = 0; t < idx.getCount(); t += 3) { join(idx.getScalar(t), idx.getScalar(t + 1)); join(idx.getScalar(t), idx.getScalar(t + 2)); }
    const box = new Map();
    for (let i = 0; i < cnt; i++) { const r = find(i), b = box.get(r) || box.set(r, { lo: [9, 9, 9], hi: [-9, -9, -9] }).get(r); for (let j = 0; j < 3; j++) { b.lo[j] = Math.min(b.lo[j], F[i][j]); b.hi[j] = Math.max(b.hi[j], F[i][j]); } }
    const gone = new Set([...box].filter(([, b]) => name === 'Paint' ? isSlat(b) : isScrew(b)).map(([r]) => r));
    if (name === 'Paint') slats += gone.size; else screws += gone.size;
    // parede da abertura: triângulo dentro do túnel e virado para os lados/cima/baixo (não para a frente)
    const wall = tri => { if (name !== 'Paint') return false;
      const [a, b, c] = tri.map(i => F[i].map((x, j) => x * S[j])), c0 = [0, 1, 2].map(j => (F[tri[0]][j] + F[tri[1]][j] + F[tri[2]][j]) / 3);
      if (c0[1] < .163 || c0[1] > .272 || c0[2] < .235 || c0[2] > .765 || c0[0] < .95) return false;
      if (tri.some(i => F[i][0] > faceX(F[i][2]) - .004)) return false;   // nenhum canto pode chegar à frente do para-choques
      if (tri.some(i => { const [, y, z] = F[i], zl = GR.zAt(y) - .006; return y < .166 || y > .268 || z < zl || z > 1 - zl; })) return false;   // só dentro da forma da abertura
      const u = [0, 1, 2].map(j => b[j] - a[j]), w = [0, 1, 2].map(j => c[j] - a[j]), n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], L = Math.hypot(...n) || 1;
      if (n[1] / L > .5 && tri.every(i => F[i][0] > faceX(F[i][2]) - GR.depth - .002)) return false;   // degrau de baixo à frente da grelha fica na cor do carro
      return Math.abs(n[0] / L) < .65; };
    const keep = [], toBlack = [];
    for (let t = 0; t < idx.getCount(); t += 3) { const tri = [idx.getScalar(t), idx.getScalar(t + 1), idx.getScalar(t + 2)];
      if (gone.has(find(tri[0]))) continue; if (wall(tri)) { toBlack.push(...tri); walls++; } else keep.push(...tri); }
    const mk = arr => doc.createAccessor().setType('SCALAR').setArray(cnt > 65535 ? new Uint32Array(arr) : new Uint16Array(arr)).setBuffer(idx.getBuffer());
    p.setIndices(mk(keep));
    if (toBlack.length) mesh.addPrimitive(p.clone().setIndices(mk(toBlack)).setMaterial(black));
  } }

// grelha nova: cada risca é uma barra fina que segue a curva do para-choques
const W = f => [B.min[0] + f[0] * S[0], B.min[1] + f[1] * S[1], B.min[2] + f[2] * S[2]];
const P = [], N = [];
const quad = (a, b, c, d) => { const u = [0, 1, 2].map(j => b[j] - a[j]), w = [0, 1, 2].map(j => d[j] - a[j]); let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]; const L = Math.hypot(...n) || 1; n = n.map(x => x / L);
  for (const q of [a, b, c, a, c, d]) { P.push(...q); N.push(...n); } };
const steps = 28;
for (let i = 0; i < GR.bars; i++) {
  const y = GR.y0 + (GR.y1 - GR.y0) * i / (GR.bars - 1), z0 = GR.zAt(y), z1 = 1 - z0;
  const sec = k => { const z = z0 + (z1 - z0) * k / steps, x = faceX(z) - GR.depth;
    return { ft: W([x, y + GR.barH / 2, z]), fb: W([x, y - GR.barH / 2, z]), bt: W([x - GR.barD, y + GR.barH / 2, z]), bb: W([x - GR.barD, y - GR.barH / 2, z]) }; };
  for (let k = 0; k < steps; k++) { const s = sec(k), e = sec(k + 1);
    quad(s.fb, e.fb, e.ft, s.ft);   // frente
    quad(s.ft, e.ft, e.bt, s.bt);   // cima
    quad(s.bb, e.bb, e.fb, s.fb);   // baixo
  }
}
const buf = root.listBuffers()[0];
const grille = doc.createMaterial('Grille').setBaseColorFactor([.03, .03, .032, 1]).setMetallicFactor(.3).setRoughnessFactor(.4).setDoubleSided(true);
const prim = doc.createPrimitive().setMaterial(grille)
  .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(P)).setBuffer(buf))
  .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(N)).setBuffer(buf));
scene.addChild(doc.createNode('Grille').setMesh(doc.createMesh('Grille').addPrimitive(prim)));
console.log(`separadores tirados: ${slats}, parafusos tirados: ${screws}, paredes a preto: ${walls} triângulos, grelha: ${GR.bars} riscas`);
await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(outFile, doc);
console.log('ok', outFile);
