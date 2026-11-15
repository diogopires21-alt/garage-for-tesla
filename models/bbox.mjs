import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]); const root = doc.getRoot();
const B = getBounds(root.listScenes()[0]);
const sz = [0,1,2].map(i=>B.max[i]-B.min[i]);
const acc = new Map();
for (const node of root.listNodes()) { const m = node.getMesh(); if (!m) continue; const W = node.getWorldMatrix();
  for (const p of m.listPrimitives()) { const k = p.getMaterial()?.getName(); const pos = p.getAttribute('POSITION'); const e = acc.get(k) || {min:[1e9,1e9,1e9],max:[-1e9,-1e9,-1e9]};
    const v=[0,0,0]; for (let i=0;i<pos.getCount();i+=3){ pos.getElement(i,v); const w=[0,1,2].map(r=>W[r]*v[0]+W[4+r]*v[1]+W[8+r]*v[2]+W[12+r]); for(let j=0;j<3;j++){e.min[j]=Math.min(e.min[j],w[j]);e.max[j]=Math.max(e.max[j],w[j]);} }
    acc.set(k,e);} }
const f = (e,i)=>`${((e.min[i]-B.min[i])/sz[i]).toFixed(2)}-${((e.max[i]-B.min[i])/sz[i]).toFixed(2)}`;
console.log('size', sz.map(x=>x.toFixed(2)).join(' '));
for (const [k,e] of acc) console.log(k.padEnd(22), 'x', f(e,0), ' y', f(e,1), ' z', f(e,2));
