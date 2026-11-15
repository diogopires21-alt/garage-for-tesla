import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer'; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(process.argv[2]);
for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) {
  if (p.getMaterial()?.getName() !== 'Paint') continue;
  console.log('attrs', p.listSemantics().join(','));
  const pos = p.getAttribute('POSITION'), nor = p.getAttribute('NORMAL'); if (!nor) { console.log('sem normais'); continue; }
  let c = [0, 0, 0]; const v = [0, 0, 0], n = [0, 0, 0]; for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, v); c[0] += v[0]; c[1] += v[1]; c[2] += v[2]; } c = c.map(x => x / pos.getCount());
  let out = 0, inn = 0, len = 0; for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, v); nor.getElement(i, n); const d = (v[0] - c[0]) * n[0] + (v[1] - c[1]) * n[1] + (v[2] - c[2]) * n[2]; d > 0 ? out++ : inn++; len += Math.hypot(...n); }
  console.log('fora', out, 'dentro', inn, 'norma média', (len / pos.getCount()).toFixed(3), 'cor', p.getAttribute('COLOR_0') ? 'sim' : 'não');
  console.log('material', JSON.stringify(p.getMaterial().getBaseColorFactor()), p.getMaterial().listExtensions().map(e => e.extensionName));
}
