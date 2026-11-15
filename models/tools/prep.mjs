// Prepara um modelo .glb para o Garage for Tesla:
//  - roda para frente = +X, esquerda = −Z (como o Model 3 Highland)
//  - dá nomes fixos aos materiais que o cartão usa (Paint, Glass, Tyre, Rim, HeadLight, TailLight, RearLightBar, Seats)
//  - separa peças que estão misturadas no mesmo material (faróis da frente, bancos)
//  - comprime (meshopt) e tira o que não é usado
// uso: node models/tools/prep.mjs <m3_classic|my_juniper> <entrada.glb> <saída.glb>
// m3_classic: depois correr  node models/tools/drop.mjs <saída.glb> <saída.glb> --suporte BlackWash  (tira o suporte da matrícula)
//             e por fim  node models/tools/m3classic-front.mjs <saída.glb> <saída.glb>  (grelha preta da frente)
import { NodeIO, getBounds, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRMaterialsTransmission } from '@gltf-transform/extensions';
import { dedup, prune, meshopt, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const [key, inFile, outFile] = process.argv.slice(2);

// predicado dos bancos (por ilha de malha, em frações do carro orientado: fx 0 trás → 1 frente, fz 0 esquerda → 1 direita)
const seatIsland = (lo, hi) => lo[0] >= .22 && hi[0] <= .62 && lo[2] >= .12 && hi[2] <= .88 && lo[1] >= .12 && hi[1] <= .86
  && !(lo[0] >= .56 && lo[1] >= .5)                                   // volante
  && !(lo[0] > .42 && lo[2] < .5 && hi[2] > .5 && hi[2] - lo[2] < .3) // consola central
  && hi[2] - lo[2] >= .04 && !(lo[2] >= .8 || hi[2] <= .2);           // painéis das portas

const CFG = {
  m3_classic: {
    rename: { carpaint: 'Paint', glass: 'Glass', glassDark: 'GlassDark', TireRubber: 'Tyre', Tire_Rims: 'Rim', RedLight: 'TailLight' },
    split: [{ from: 'innerLights', to: 'HeadLight', tri: f => f[0] > .5 }],   // a mesma peça tem o interior dos faróis da frente e de trás
    seats: 'GlossyInterior',
    drop: ['White', 'LicensePlateText', 'LicensePlateRed', 'LicensePlateYellow'],   // matrícula (frente e trás)
    tweak: {
      Glass: { color: [.01, .02, .03, .35], m: .05, r: 0 }, GlassDark: { color: [.01, .015, .02, .55], m: .05, r: 0 },
      HeadLight: { color: [.9, .9, .92, 1], m: .2, r: .2 }, TailLight: { color: [.25, 0, 0, 1], m: .6, r: .15 },
      Rim: { color: [.55, .56, .58, 1], m: .9, r: .25 },
    },
  },
  my_juniper: {
    rename: { Material_2125765635: 'Paint', glass_base: 'Glass', glass_roof_panorama: 'GlassRoof', glass_headlight222: 'GlassLamp',
      Rubber_Rough: 'Tyre', Material_2125767099: 'Rim', front_white_light: 'HeadLight', back_red_Light: 'TailLight', material: 'RearLightBar' },
    merge: { Rubber_Rough222: 'Tyre' },
    seats: 'black_base',
    tweak: {
      Glass: { color: [.01, .02, .03, .35], m: .05, r: 0 }, GlassRoof: { color: [.01, .015, .02, .55], m: .05, r: 0 },
      GlassLamp: { color: [.03, .03, .035, .3], m: .1, r: 0 },
      HeadLight: { color: [.9, .9, .92, 1], m: .2, r: .2 }, TailLight: { color: [.3, 0, 0, 1], m: .5, r: .15 }, RearLightBar: { color: [.35, .02, .01, 1], m: .5, r: .15 },
      Rim: { color: [.5, .51, .53, 1], m: .9, r: .28 }, Tyre: { color: [.06, .06, .06, 1], m: 0, r: .85 },
      chrome: { m: 1, r: .15 }, mirror: { color: [.85, .85, .85, 1], m: 1, r: .05 },
      black_reflection: { color: [.02, .02, .02, 1], m: .2, r: .15 }, black_base: { r: .5 }, black: { r: .4 }, red_plastic: { color: [.35, .02, .02, 1], m: .3, r: .2 },
      Material_111: { m: .6, r: .4 }, black222: { m: .6, r: .35 }, 'black.002': { m: .5, r: .4 },
    },
  },
}[key];
if (!CFG) throw new Error('modelo desconhecido: ' + key);

await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(inFile);
const root = doc.getRoot();

// 1) orientação: os dois modelos vêm com a frente para +Z → roda 90° em Y (frente +X, esquerda −Z)
const scene = root.listScenes()[0];
const top = doc.createNode('GarageForTesla').setRotation([0, Math.SQRT1_2, 0, Math.SQRT1_2]);
for (const n of scene.listChildren()) { scene.removeChild(n); top.addChild(n); }
scene.addChild(top);

// 2) materiais: nomes, fusões, sem transmissão (obriga o three.js a um passo de render extra)
const byName = n => root.listMaterials().find(m => m.getName() === n);
for (const [a, b] of Object.entries(CFG.rename || {})) { const m = byName(a); if (!m) throw new Error('falta ' + a); m.setName(b); }
for (const [a, b] of Object.entries(CFG.merge || {})) { const src = byName(a), dst = byName(b); for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) if (p.getMaterial() === src) p.setMaterial(dst); }
for (const name of CFG.drop || []) { const m = byName(name); for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) if (p.getMaterial() === m) { mesh.removePrimitive(p); p.dispose(); } }
for (const m of root.listMaterials()) m.setExtension('KHR_materials_transmission', null);
root.listExtensionsUsed().filter(e => e.extensionName === 'KHR_materials_transmission').forEach(e => e.dispose());

// frações por vértice (no espaço do carro orientado)
const B = getBounds(scene), S = [0, 1, 2].map(i => B.max[i] - B.min[i]);
const frac = (M, v) => { const w = [0, 1, 2].map(r => M[r] * v[0] + M[4 + r] * v[1] + M[8 + r] * v[2] + M[12 + r]); return [(w[0] - B.min[0]) / S[0], (w[1] - B.min[1]) / S[1], (w[2] - B.min[2]) / S[2]]; };

// separa triângulos de um material para outro (novo primitivo, mesmos vértices)
const splitPrim = (node, prim, toMat, pick) => {
  const M = node.getWorldMatrix(), pos = prim.getAttribute('POSITION'), idx = prim.getIndices(), v = [0, 0, 0];
  const F = []; for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, v); F.push(frac(M, v)); }
  const keep = [], move = [];
  for (let t = 0; t < idx.getCount(); t += 3) { const tri = [idx.getScalar(t), idx.getScalar(t + 1), idx.getScalar(t + 2)]; (pick(tri, F) ? move : keep).push(...tri); }
  if (!move.length) return 0;
  const mk = arr => doc.createAccessor().setType('SCALAR').setArray(pos.getCount() > 65535 ? new Uint32Array(arr) : new Uint16Array(arr)).setBuffer(idx.getBuffer());
  prim.setIndices(mk(keep));
  const np = prim.clone().setIndices(mk(move)).setMaterial(toMat);
  node.getMesh().addPrimitive(np);
  return move.length / 3;
};
const centroid = (tri, F) => [0, 1, 2].map(j => (F[tri[0]][j] + F[tri[1]][j] + F[tri[2]][j]) / 3);

for (const s of CFG.split || []) {
  const src = byName(s.from), dst = src.clone().setName(s.to); let n = 0;
  for (const node of root.listNodes()) for (const p of node.getMesh()?.listPrimitives() || []) if (p.getMaterial() === src) n += splitPrim(node, p, dst, (tri, F) => s.tri(centroid(tri, F)));
  console.log(`${s.from} → ${s.to}: ${n} triângulos`);
}

// bancos: ilhas de malha dentro do habitáculo
if (CFG.seats) {
  const src = byName(CFG.seats), dst = src.clone().setName('Seats'); let n = 0;
  for (const node of root.listNodes()) for (const p of node.getMesh()?.listPrimitives() || []) {
    if (p.getMaterial() !== src) continue;
    const pos = p.getAttribute('POSITION'), idx = p.getIndices(), cnt = pos.getCount(), v = [0, 0, 0];
    const par = new Int32Array(cnt).map((_, i) => i), find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; }, join = (a, b) => { a = find(a); b = find(b); if (a !== b) par[a] = b; };
    const seen = new Map(); for (let i = 0; i < cnt; i++) { pos.getElement(i, v); const k = v.map(x => x.toFixed(4)).join(); const j = seen.get(k); if (j === undefined) seen.set(k, i); else join(i, j); }
    for (let t = 0; t < idx.getCount(); t += 3) { join(idx.getScalar(t), idx.getScalar(t + 1)); join(idx.getScalar(t), idx.getScalar(t + 2)); }
    const M = node.getWorldMatrix(), box = new Map();
    for (let i = 0; i < cnt; i++) { pos.getElement(i, v); const f = frac(M, v), r = find(i); const b = box.get(r) || box.set(r, { lo: [9, 9, 9], hi: [-9, -9, -9] }).get(r); for (let j = 0; j < 3; j++) { b.lo[j] = Math.min(b.lo[j], f[j]); b.hi[j] = Math.max(b.hi[j], f[j]); } }
    // fz no carro orientado: 0 = lado esquerdo (−Z)
    const seat = new Set([...box].filter(([, b]) => seatIsland(b.lo, b.hi)).map(([r]) => r));
    n += splitPrim(node, p, dst, tri => seat.has(find(tri[0])));
  }
  console.log(`bancos: ${n} triângulos`);
}

// 3) acabamentos
for (const [name, t] of Object.entries(CFG.tweak || {})) {
  const m = byName(name); if (!m) { console.warn('sem material', name); continue; }
  if (t.color) m.setBaseColorFactor(t.color); if (t.m !== undefined) m.setMetallicFactor(t.m); if (t.r !== undefined) m.setRoughnessFactor(t.r);
}

await doc.transform(dedup({ propertyTypes: ['Accessor', 'Mesh', 'Texture'] }), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(outFile, doc);
console.log('ok', outFile);
