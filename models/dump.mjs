import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const doc = await io.read(process.argv[2]); const root = doc.getRoot();
console.log('extensions', root.listExtensionsUsed().map(e=>e.extensionName).join(','));
// world bbox per material
const { getBounds } = await import('@gltf-transform/core');
const scene = root.listScenes()[0]; const b = getBounds(scene); console.log('bounds', b.min.map(v=>v.toFixed(2)), b.max.map(v=>v.toFixed(2)));
const byMat = new Map();
for (const node of root.listNodes()) { const m = node.getMesh(); if (!m) continue; for (const p of m.listPrimitives()) { const mat = p.getMaterial(); const k = mat ? mat.getName() : '(none)'; const e = byMat.get(k) || { tris: 0, nodes: new Set() }; e.tris += (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3; e.nodes.add(node.getName()); byMat.set(k, e); } }
for (const m of root.listMaterials()) { const e = byMat.get(m.getName()) || { tris: 0, nodes: new Set() }; const c = m.getBaseColorFactor().map(x=>x.toFixed(2)).join(','); console.log(`${m.getName()} | rgb ${c} | met ${m.getMetallicFactor()} rough ${m.getRoughnessFactor()} | ${m.getAlphaMode()} | tex ${m.getBaseColorTexture()?'y':'n'} | tris ${Math.round(e.tris)} | nodes ${[...e.nodes].slice(0,4).join(';')}`); }
