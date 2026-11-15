import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
// vista do habitáculo: esconde 'hide', pinta cada material da lista 'show' com uma cor
window.cabin = async (url, rotY, hide, show, views, W = 700, H = 420) => {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); document.body.appendChild(r.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xeeeeee);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2.4)); const d = new THREE.DirectionalLight(0xffffff, 1.2); d.position.set(3, 5, 2); scene.add(d);
  const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder);
  const g = await l.loadAsync(url); const car = g.scene; car.rotation.y = rotY; car.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(car); const s = box.getSize(new THREE.Vector3()); car.scale.multiplyScalar(4.7 / Math.max(s.x, s.z)); car.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(car); const c = box.getCenter(new THREE.Vector3()); car.position.sub(c).add(new THREE.Vector3(0, (box.max.y - box.min.y) / 2, 0)); scene.add(car);
  const cols = [0xff0066, 0x00aaff, 0x22cc44, 0xffaa00, 0x9933ff, 0x00ddcc];
  car.traverse(o => { if (!o.isMesh) return; const n = o.material.name; if (hide.some(h => new RegExp(h).test(n))) o.visible = false; const i = show.indexOf(n); if (i >= 0) o.material = new THREE.MeshStandardMaterial({ color: cols[i], roughness: .6, side: THREE.DoubleSide }); });
  const cam = new THREE.PerspectiveCamera(35, W / H, .05, 100); const out = [];
  for (const v of views) { cam.position.set(...v.p); cam.lookAt(...v.t); r.render(scene, cam); out.push(r.domElement.toDataURL('image/png')); }
  return out;
};
