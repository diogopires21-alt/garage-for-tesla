// Junta todas as peças da pintura numa só malha (o Blender, no bl-orient.py, parte a carroçaria em várias e o
// cartão classifica o capô/portas peça a peça — com o capô dividido entre peças, o laranja do frunk ficava aos bocados).
// uso: node models/tools/join-paint.mjs <entrada.glb> <saída.glb>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { flatten, join, prune, dedup } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const [inF, outF] = process.argv.slice(2);
const doc = await io.read(inF);
const before = doc.getRoot().listMeshes().length;
await doc.transform(flatten(), join({ keepMeshes: false, keepNamed: false }), dedup({ propertyTypes: ['Accessor', 'Mesh'] }), prune());
console.log('malhas', before, '→', doc.getRoot().listMeshes().length);
await io.write(outF, doc);
