import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
window.inspect = async (url, rotY, W = 360, H = 220) => {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); document.body.appendChild(r.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xdddddd);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2.2)); const d = new THREE.DirectionalLight(0xffffff, 1.5); d.position.set(3, 5, 2); scene.add(d);
  const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder);
  const g = await l.loadAsync(url); const car = g.scene; car.rotation.y = rotY; car.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(car); const s = box.getSize(new THREE.Vector3()); car.scale.multiplyScalar(4.7 / Math.max(s.x, s.z)); car.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(car); const c = box.getCenter(new THREE.Vector3()); car.position.sub(c).add(new THREE.Vector3(0, (box.max.y - box.min.y) / 2, 0)); scene.add(car);
  const mats = new Map(); car.traverse(o => { if (o.isMesh) { const n = o.material.name; (mats.get(n) || mats.set(n, []).get(n)).push(o); o.userData.orig = o.material; } });
  const grey = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: .7, transparent: true, opacity: .25, depthWrite: false });
  const hl = new THREE.MeshStandardMaterial({ color: 0xff00cc, roughness: .5, side: THREE.DoubleSide });
  const cam = new THREE.PerspectiveCamera(30, W / H, .1, 100);
  const views = [[0, 1.2, -11], [8, 2.5, -6], [-8, 2.5, -6], [0, 12, .01]];   // lado esq (−Z), frente 3/4, trás 3/4, cima
  const out = {};
  const shoot = () => views.map(v => { cam.position.set(...v); cam.lookAt(0, .7, 0); r.render(scene, cam); return r.domElement.toDataURL('image/png'); });
  car.traverse(o => { if (o.isMesh) o.material = o.userData.orig; }); out['(original)'] = shoot();
  for (const [n, list] of mats) { car.traverse(o => { if (o.isMesh) o.material = grey; }); list.forEach(o => o.material = hl); out[n] = shoot(); }
  return out;
};
