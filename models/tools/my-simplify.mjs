// Model Y 2020–2024: o original tem ~2,4 M triângulos (pneus e jantes com detalhe a mais). Reduz por material para ~0,5 M.
// uso: node models/tools/my-simplify.mjs <entrada.glb> <saída.glb>   (correr depois do prep.mjs)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplifyPrimitive, dedup, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const [inF, outF] = process.argv.slice(2);
const doc = await io.read(inF);
const R = { Tyre: .1, Rim: .25, calipers: .1, calipers2: .3, brakedsk: .15, TailLight: .25, GlassLamp: .25, interior: .25, Seats: .5, black: .3, black2: .3,
  HeadLight: .3, chrome: .35, chrome_rear_2: .4, fenders: .35, Paint: .7, alum: .5, metal: .6, Glass: .8, GlassRoof: .8, chrome_dark: .6 };
const E = { Tyre: .004, Rim: .002, TailLight: .002, GlassLamp: .002 };   // margem de erro maior onde não se nota
await doc.transform(weld());
let before = 0, after = 0;
const count = p => p.getIndices() ? p.getIndices().getCount() / 3 : 0;
for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) {
  const r = R[p.getMaterial()?.getName()] ?? .5; before += count(p);
  simplifyPrimitive(p, { simplifier: MeshoptSimplifier, ratio: r, error: E[p.getMaterial()?.getName()] ?? .0008, lockBorder: !['Tyre', 'Rim', 'calipers', 'brakedsk'].includes(p.getMaterial()?.getName()) }); after += count(p);
}
console.log('triângulos', Math.round(before), '→', Math.round(after));
await doc.transform(dedup({ propertyTypes: ['Accessor', 'Mesh'] }), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(outF, doc);
