// Prepara o Wall Connector (gerado por models/tools/wallconnector.py) para o cartão: junta vértices repetidos e
// comprime (meshopt), como os carros. Sem prune: tiraria as marcas vazias (ledTop, cableIn, …) de que o cartão precisa.
// uso: node models/tools/wc-prep.mjs <wallconnector.glb> src/wallconnector.glb   (ou <supercharger.glb> src/supercharger.glb "Tesla Supercharger V4 post")
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const [inFile, outFile] = process.argv.slice(2);
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(inFile);
doc.getRoot().getAsset().extras = { title: process.argv[4] || 'Tesla Wall Connector (Gen 3) on pedestal', author: 'Garage for Tesla', license: 'MIT (made from scratch for this card)' };
await doc.transform(dedup(), weld(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(outFile, doc);
console.log('ok', outFile);
