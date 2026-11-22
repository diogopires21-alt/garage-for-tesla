// Acrescenta o ecrã central (15") a um modelo já preparado que não o tem (Model Y 2020–2024).
// Caixa fina preta (moldura) + face do ecrã + suporte que o liga ao tablier, ao meio, inclinado para trás como no carro real.
// uso: node models/tools/add-screen.mjs <entrada.glb> <saída.glb> [fx=0.60] [fy=0.665] [comprimentoReal=4.751]
//   fx/fy: posição da aresta de baixo do ecrã, em frações do carro (fx 0 = traseira, fy 0 = chão)
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
const [inF, outF, fxA = '0.60', fyA = '0.665', lenA = '4.751'] = process.argv.slice(2);
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(inF), root = doc.getRoot(), scene = root.listScenes()[0], buf = root.listBuffers()[0];
const B = getBounds(scene), S = [0, 1, 2].map(i => B.max[i] - B.min[i]), u = S[0] / +lenA;   // unidades do modelo por metro
const W = .325 * u, H = .205 * u, D = .014 * u, tilt = 20 * Math.PI / 180;                  // 15" (32,5 × 20,5 cm), 1,4 cm de espessura, 20° para trás
// caixa com o centro da aresta de baixo na origem; a face do ecrã olha para trás (−X)
const box = (x0, x1, y0, y1, z0, z1) => {
  const P = [], N = [], I = [];
  const quad = (a, b, c, d, n) => { const k = P.length / 3; P.push(...a, ...b, ...c, ...d); for (let i = 0; i < 4; i++) N.push(...n); I.push(k, k + 1, k + 2, k, k + 2, k + 3); };
  quad([x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0], [-1, 0, 0]); quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0]);
  quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0]); quad([x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [0, -1, 0]);
  quad([x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [0, 0, -1]); quad([x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1], [0, 0, 1]);
  return { P, N, I };
};
const prim = (g, mat) => doc.createPrimitive().setMaterial(mat)
  .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(g.P)).setBuffer(buf))
  .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(g.N)).setBuffer(buf))
  .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(g.I)).setBuffer(buf));
const bezel = doc.createMaterial('ScreenBezel').setBaseColorFactor([.015, .015, .017, 1]).setMetallicFactor(.3).setRoughnessFactor(.35);
const face = doc.createMaterial('Screen').setBaseColorFactor([.02, .022, .026, 1]).setMetallicFactor(0).setRoughnessFactor(.08).setEmissiveFactor([.05, .06, .075]);
const b = .006 * u;   // moldura de 6 mm à volta da imagem
const mesh = doc.createMesh('CenterScreen')
  .addPrimitive(prim(box(0, D, 0, H, -W / 2, W / 2), bezel))
  .addPrimitive(prim(box(-.0006 * u, 0, b, H - b, -W / 2 + b, W / 2 - b), face))
  .addPrimitive(prim(box(D * .5, D + .055 * u, -.05 * u, .07 * u, -.05 * u, .05 * u), bezel));   // suporte: bloco atrás do ecrã, a meio, que desce até dentro do tablier
const node = doc.createNode('CenterScreen').setMesh(mesh)
  .setTranslation([B.min[0] + +fxA * S[0], B.min[1] + +fyA * S[1], (B.min[2] + B.max[2]) / 2])
  .setRotation([0, 0, -Math.sin(tilt / 2), Math.cos(tilt / 2)]);   // topo inclinado para a frente (+X)
scene.addChild(node);
console.log('ecrã acrescentado', { largura: W.toFixed(4), altura: H.toFixed(4) });
await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(outF, doc);
