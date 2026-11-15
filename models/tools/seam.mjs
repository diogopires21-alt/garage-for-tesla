import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer'; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const doc = await io.read(process.argv[2]); const root = doc.getRoot(); const B = getBounds(root.listScenes()[0]); const S=[0,1,2].map(i=>B.max[i]-B.min[i]);
const h = new Array(120).fill(0);
for (const node of root.listNodes()) { const m = node.getMesh(); if (!m) continue; const M = node.getWorldMatrix();
 for (const p of m.listPrimitives()) { if (p.getMaterial().getName()!=='Paint') continue; const pos=p.getAttribute('POSITION'), v=[0,0,0];
  for (let i=0;i<pos.getCount();i++){ pos.getElement(i,v); const w=[0,1,2].map(r=>M[r]*v[0]+M[4+r]*v[1]+M[8+r]*v[2]+M[12+r]); const f=w.map((x,j)=>(x-B.min[j])/S[j]); if (f[2]<.16 && f[1]>.3&&f[1]<.6 && f[0]>.2&&f[0]<.8) h[Math.floor(f[0]*200)-40]++; } } }
console.log(h.map((c,i)=>((i+40)/200).toFixed(3)+':'+c).filter(s=>+s.split(':')[1]>0).join('  '));
