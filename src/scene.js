// Cena 3D: carro, chão de vidro com reflexo, sombras, luzes (adaptado do K.I.T.T. Dashboard)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

const REFL_SHADER = {
  uniforms: {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
    uStrength: { value: .5 }, uBlur: { value: .45 }, uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) }, uSize: { value: new THREE.Vector2(5.8, 3.4) },
  },
  vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec2 vLocal; varying vec3 vWorld;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main(){ vUv = textureMatrix * vec4(position, 1.0); vLocal = position.xy; vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }`,
  fragmentShader: `uniform vec3 color; uniform sampler2D tDiffuse; uniform float uStrength; uniform float uBlur; uniform vec2 uTexel; uniform vec2 uSize;
    varying vec4 vUv; varying vec2 vLocal; varying vec3 vWorld;
    #include <logdepthbuf_pars_fragment>
    void main(){
      #include <logdepthbuf_fragment>
      vec2 uv = vUv.xy / vUv.w;
      float d = length(vLocal / uSize);
      float fade = 1.0 - smoothstep(0.45, 1.0, d);
      float c = abs(dot(normalize(cameraPosition - vWorld), vec3(0.0, 1.0, 0.0)));
      float fres = mix(0.55, 1.0, pow(1.0 - c, 2.0));
      float blur = uBlur * (1.0 + 0.8 * d);
      vec4 sum = vec4(0.0); float ws = 0.0;
      for (int i = -1; i <= 1; i++){ for (int j = -1; j <= 1; j++){
        vec2 o = vec2(float(i), float(j)); float w = exp(-dot(o, o) / 1.5);
        sum += texture2D(tDiffuse, uv + o * uTexel * blur) * w; ws += w; } }
      vec4 r = sum / ws;
      gl_FragColor = vec4(r.rgb * color * 0.86, r.a * uStrength * fade * fres);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

function radialTex(stops, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'); const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col)); x.fillStyle = g; x.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Estúdio escuro com faixas de luz laterais e uma caixa de luz suave em cima
// (o RoomEnvironment tinha um teto muito claro que deixava o capô branco)
function studioEnv(light) {
  const env = new THREE.Scene();
  const basic = (c, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.BackSide });
  const room = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), basic(light ? 0x9a9da2 : 0x45474c)); env.add(room);   // tema claro: estúdio claro (os pretos refletem-no e ganham forma)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: light ? 0x8a8c90 : 0x1c1c1f })); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.2; env.add(floor);
  const panel = (w, h, k, x, y, z, rx, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); env.add(m); };
  panel(14, 2.2, 1.0, 0, 9, 0, Math.PI / 2, 0);             // caixa de luz em cima (suave)
  panel(18, .9, 3.2, 0, 2.6, -9, 0, 0);                      // faixa lateral esquerda
  panel(18, .9, 3.2, 0, 2.6, 9, 0, Math.PI);                 // faixa lateral direita
  panel(.9, 6, 2.2, 11, 3, 0, 0, -Math.PI / 2);              // faixa à frente
  panel(.9, 6, 1.6, -11, 3, 0, 0, Math.PI / 2);              // faixa atrás
  return env;
}

// Contorno da tampa da bagageira (do desenho do Diogo), calculado em cada pixel para a linha sair lisa.
// vF = posição em fração da caixa do carro: x 0 = traseira → 1 = frente; y 0 = chão → 1 = tejadilho; z 0 = esquerda → 1 = direita
const TRUNK_GLSL = `
float gftTrunk(vec3 f) {
  float zl = f.y >= .66 ? .12 : (f.y >= .6 ? .11 : mix(.25, .15, clamp((f.y - .44) / .16, 0., 1.)));
  return min(min(min(f.z - zl, 1. - zl - f.z), min(f.y - .44, .95 - f.y)), .19 - f.x);
}`;

export class CarScene {
  constructor(canvas, modelUrl, opts = {}) {
    this.canvas = canvas; this.modelUrl = modelUrl; this.opts = opts;
    this.G = { ready: false, fx: {}, glows: {}, anchors: {}, t0: performance.now() };
    this.state = { charging: false, plugged: false, climate: false, dark: true, paint: { hex: '#eef0f2', m: .05, r: .32 } };
    this.bottomInset = 0; this.leftInset = 0;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
    } catch (e) { this.failed = true; return; }
    const r = this.renderer;
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.shadowMap.autoUpdate = false;

    const scene = this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, 1, 0.5, 60);
    this.HOME = { dir: new THREE.Vector3(0.72, 0.27, -0.64).normalize(), target: new THREE.Vector3(0, 0.62, 0), dist: 9 };
    const pm = new THREE.PMREMGenerator(r);
    this._envDark = pm.fromScene(studioEnv(false), 0.04).texture;
    scene.environment = this._envDark;
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6); scene.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(1.5, 8, -2.5); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 6; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
    Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
    scene.add(sun);

    const G = this.G;
    const mobile = matchMedia('(pointer: coarse)').matches;
    G.reflBase = mobile ? .7 : 1.4; G.reflQ = G.reflBase; G.lastMove = 0; G.reflNeed = 3;
    const refl = new Reflector(new THREE.PlaneGeometry(12, 7), { shader: REFL_SHADER, textureWidth: 1024, textureHeight: 1024, clipBias: 0.003, color: 0xffffff, multisample: mobile ? 0 : 4 });
    refl.rotation.x = -Math.PI / 2; refl.material.transparent = true; refl.material.depthWrite = false; refl.renderOrder = 0;
    scene.add(refl); G.refl = refl;
    const reflRender = refl.onBeforeRender;
    refl.onBeforeRender = (...a) => { if (G.reflNeed > 0 || G.moving || G.animating) { reflRender.apply(refl, a); if (G.reflNeed > 0) G.reflNeed--; } };

    const ground = G.ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .28 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = 0.001; ground.receiveShadow = true; ground.renderOrder = 1; scene.add(ground);
    const blob = G.blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: radialTex([[0, 'rgba(0,0,0,.55)'], [.55, 'rgba(0,0,0,.22)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.002; blob.renderOrder = 2; scene.add(blob);

    const c = this.controls = new OrbitControls(this.camera, canvas);
    c.enableDamping = true; c.dampingFactor = 0.07; c.enablePan = false; c.rotateSpeed = 0.6;
    c.minPolarAngle = 0.55; c.maxPolarAngle = 1.48; c.target.copy(this.HOME.target);
    c.addEventListener('start', () => { G.userAt = performance.now(); G.dragging = true; G.homing = false; });
    c.addEventListener('end', () => { G.userAt = performance.now(); G.dragging = false; });

    this._tmp = new THREE.Vector3(); this._camDir = new THREE.Vector3(); this._lastCam = new THREE.Matrix4();
    this.load();
  }

  load() {
    const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
    if (this.opts.buffer) { loader.parse(this.opts.buffer, '', gltf => this._onModel(gltf), err => { this.failed = true; console.error('Garage for Tesla: model', err); }); return; }
    loader.load(this.modelUrl, gltf => this._onModel(gltf), undefined, err => { this.failed = true; console.error('Garage for Tesla: model', err); this.opts.onError && this.opts.onError(err); });
  }

  _onModel(gltf) {
    const G = this.G, scene = this.scene;
    const car = gltf.scene;
    let box = new THREE.Box3().setFromObject(car);
    const size = box.getSize(new THREE.Vector3());
    car.scale.setScalar((this.opts.length || 4.72) / Math.max(size.x, size.z)); car.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(car);
    const ctr = box.getCenter(new THREE.Vector3());
    car.position.set(-ctr.x, -box.min.y, -ctr.z); car.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(car);
    G.box = box; G.car = car;
    const mats = {};
    car.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      const n = o.material.name;
      if (n === (this.opts.paintName || 'Paint')) {
        o.material = this.paintMat = this.paintMat || new THREE.MeshPhysicalMaterial({ name: 'Paint', clearcoat: 1, clearcoatRoughness: .06 });
      }
      if (/glass|sub31Mtl/i.test(n)) o.castShadow = false;
      (mats[o.material.name] ||= []).push(o);
    });
    G.mats = mats;
    const lightMat = (name, col) => (mats[name] || []).forEach(o => {
      o.material = o.material.clone(); o.material.emissive = new THREE.Color(col); o.material.emissiveIntensity = 0;
      (G.lightMats ||= {})[name] = (G.lightMats[name] || []).concat(o.material);
    });
    lightMat('HeadLight', 0xfff4dc); lightMat('TailLight', 0xff2020); lightMat('RearLightBar', 0xff2a1a);
    this._handles(box, mats);
    this._applyInterior();
    this._seatRims(mats);
    this._regions(box, mats);
    scene.add(car);
    const L = box.max.x - box.min.x, W = box.max.z - box.min.z, H = box.max.y - box.min.y;
    G.blob.scale.set(L * 1.25, W * 1.6, 1);
    const P = (fx, fy, fz) => new THREE.Vector3(box.min.x + fx * L, box.min.y + fy * H, box.min.z + fz * W);
    // frente = +X, lado esquerdo = -Z
    G.anchors = {
      lock: { p: P(.47, 1.0, .5), n: new THREE.Vector3(0, 1, 0) },
      frunk: { p: P(.9, .62, .5), n: new THREE.Vector3(.4, 1, 0) },
      trunk: { p: P(.07, .82, .5), n: new THREE.Vector3(-.4, 1, 0) },
      port: { p: P(.062, .655, .03), n: new THREE.Vector3(-.4, 0, -1) },   // porta de carga: na ponta lateral do farolim esquerdo
    };
    for (const [k, f] of Object.entries(this.opts.anchors || {})) if (G.anchors[k]) G.anchors[k].p = P(...f);
    const boxOf = name => { const list = mats[name]; if (!list || !list.length) return null; const b = new THREE.Box3(); list.forEach(o => b.expandByObject(o)); return b; };
    const hb = boxOf('HeadLight'), tb = boxOf('TailLight');
    const hy = hb ? (hb.min.y + hb.max.y) / 2 : box.min.y + .55 * H, hx = hb ? hb.max.x : box.max.x - .05;
    const ty = tb ? (tb.min.y + tb.max.y) / 2 : box.min.y + .7 * H, tx = tb ? tb.min.x : box.min.x + .05;
    const hz = [box.min.z + .17 * W, box.max.z - .17 * W], tz = [box.min.z + .14 * W, box.max.z - .14 * W];
    const spr = (color, scale) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex([[0, 'rgba(255,255,255,1)'], [.25, 'rgba(255,255,255,.55)'], [1, 'rgba(255,255,255,0)']]), color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(scale); scene.add(s); return s; };
    G.glows.head = hz.map(z => { const s = spr(0xfff2d6, .9); s.position.set(hx, hy, z); return s; });
    G.glows.headHalo = hz.map(z => { const s = spr(0xfff0d0, 1.5); s.position.set(hx + .05, hy, z); return s; });
    G.glows.tail = tz.map(z => { const s = spr(0xff2a2a, .7); s.position.set(tx, ty, z); return s; });
    G.glows.headN = hz.map(z => new THREE.Vector3(1, 0, Math.sign(z) * 1.2).normalize());
    G.glows.tailN = tz.map(z => new THREE.Vector3(-1, 0, Math.sign(z) * 1.2).normalize());
    // rodas: sombra de contacto + aviso de pressão
    const tyreTex = radialTex([[0, 'rgba(0,0,0,.9)'], [.45, 'rgba(0,0,0,.45)'], [1, 'rgba(0,0,0,0)']]);
    const quad = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], v = new THREE.Vector3();
    (mats['Tyre'] || []).forEach(o => {
      const pos = o.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 2) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        if (v.y > .12) continue; const q = (v.x > 0 ? 1 : 0) + (v.z > 0 ? 2 : 0); quad[q][0] += v.x; quad[q][1] += v.z; quad[q][2]++;
      }
    });
    // q: 0 = trás-esq (rl), 1 = frente-esq (fl), 2 = trás-dir (rr), 3 = frente-dir (fr)
    const names = ['rl', 'fl', 'rr', 'fr'];
    G.wheels = {};
    G.contacts = quad.map((q, i) => {
      if (q[2] <= 10) return null;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tyreTex, transparent: true, depthWrite: false, opacity: .6 }));
      m.rotation.x = -Math.PI / 2; m.scale.set(.62, .36, 1); m.position.set(q[0] / q[2], .003, q[1] / q[2]); m.renderOrder = 3; scene.add(m);
      G.wheels[names[i]] = { pos: m.position.clone() };
      return m;
    }).filter(Boolean);
    // luz verde no chão, debaixo do carro, enquanto carrega
    // halo com a forma do carro (retângulo arredondado desfocado)
    const gc = document.createElement('canvas'); gc.width = 512; gc.height = 256; const gx = gc.getContext('2d');
    const rr = (x, y, w, h, r) => { gx.beginPath(); gx.moveTo(x + r, y); gx.arcTo(x + w, y, x + w, y + h, r); gx.arcTo(x + w, y + h, x, y + h, r); gx.arcTo(x, y + h, x, y, r); gx.arcTo(x, y, x + w, y, r); gx.closePath(); gx.fill(); };
    // contorno do carro no chão: um brilho largo e fraco + um brilho apertado e forte junto às saias
    const cw = 512 / 1.5, ch = 256 / 2.1, cx0 = (512 - cw) / 2, cy0 = (256 - ch) / 2;
    gx.fillStyle = '#fff';
    gx.globalAlpha = .35; gx.filter = 'blur(26px)'; rr(cx0, cy0, cw, ch, 40);
    gx.globalAlpha = 1; gx.filter = 'blur(9px)'; rr(cx0 + 6, cy0 + 4, cw - 12, ch - 8, 34);
    const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace;
    const ug = G.under = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: gt, color: 0x2bd673, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, premultipliedAlpha: true,
      // soma luz (cor e opacidade) ao que está por baixo: parece luz no chão, não tinta verde
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor }));
    ug.rotation.x = -Math.PI / 2; ug.position.set((box.min.x + box.max.x) / 2, .005, (box.min.z + box.max.z) / 2); ug.scale.set(L * 1.5, W * 2.1, 1); ug.renderOrder = 4; scene.add(ug);
    G.cabin = new THREE.PointLight(0x2f8ff0, 0, 2.2, 2); G.cabin.position.set((box.min.x + box.max.x) / 2 - .1, box.min.y + .75 * H, 0); scene.add(G.cabin);
    G.beam = new THREE.SpotLight(0xfff4dc, 0, 9, .5, .6, 1.2); G.beam.position.set(hx - .2, hy, 0); G.beam.target.position.set(hx + 4, 0, 0); scene.add(G.beam, G.beam.target);
    G.ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 64), new THREE.MeshBasicMaterial({ color: 0x5a86ff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    G.ring.rotation.x = -Math.PI / 2; G.ring.position.set(box.max.x - .35, .01, 0); scene.add(G.ring);   // centro por baixo da frente (para-choques)
    this._sentryFloor(box);
    // porta de carga aberta: pequeno ponto laranja a piscar por cima dela (no modelo a porta não é uma peça à parte)
    const pd = G.portDot = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex([[0, 'rgba(255,255,255,1)'], [.35, 'rgba(255,255,255,.9)'], [.6, 'rgba(255,255,255,.3)'], [1, 'rgba(255,255,255,0)']]), color: 0xff8a00, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false }));
    // posição a partir do próprio modelo: a ponta de fora do farolim traseiro esquerdo (o ponto mais à esquerda dele)
    let tip = null; (mats['TailLight'] || []).forEach(o => { const p = o.geometry.attributes.position, w = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { w.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); if (!tip || w.z < tip.z) tip = w.clone(); } });
    if (tip) G.anchors.port.p.copy(tip).add(new THREE.Vector3(-.015, 0, .012));
    pd.scale.setScalar(.08); pd.position.copy(G.anchors.port.p); pd.renderOrder = 7; scene.add(pd);
    // bagageira aberta: o mesmo ponto laranja, no sítio da etiqueta
    const td = G.trunkDot = pd.clone(); td.material = pd.material.clone(); td.position.copy(G.anchors.trunk.p); scene.add(td);   // desenhado por cima do farolim (sem teste de profundidade)
    this._applyPaint(); this._applyTheme();
    this.renderer.shadowMap.needsUpdate = true;
    G.ready = true; G.intro = performance.now();
    this.opts.onReady && this.opts.onReady();
  }

  // Puxadores: no modelo estão na mesma peça que os frisos das janelas e são finíssimos.
  // Copiamos só os triângulos dos puxadores, aumentamo-los um pouco e damos-lhes um acabamento
  // que contrasta com qualquer cor (cinzento-grafite acetinado).
  _handles(box, mats) {
    const src = mats[this.opts.trimName === undefined ? 'Geodoorl2sub11Mtl' : this.opts.trimName]; if (!src || !src.length) return;
    const L = box.max.x - box.min.x, W = box.max.z - box.min.z, H = box.max.y - box.min.y;
    const groups = {}, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (const o of src) {
      const g = o.geometry, pos = g.attributes.position, idx = g.index; if (!idx) continue;
      for (let i = 0; i < idx.count; i += 3) {
        a.fromBufferAttribute(pos, idx.getX(i)).applyMatrix4(o.matrixWorld);
        b.fromBufferAttribute(pos, idx.getX(i + 1)).applyMatrix4(o.matrixWorld);
        c.fromBufferAttribute(pos, idx.getX(i + 2)).applyMatrix4(o.matrixWorld);
        const fx = ((a.x + b.x + c.x) / 3 - box.min.x) / L, fy = ((a.y + b.y + c.y) / 3 - box.min.y) / H, fz = ((a.z + b.z + c.z) / 3 - box.min.z) / W;
        // só a zona dos puxadores (medida no modelo): porta da frente x≈.46–.53, de trás x≈.25–.31
        if (fy < .56 || fy > .632 || (fz > .14 && fz < .86)) continue;
        const front = fx > .455 && fx < .535, rear = fx > .245 && fx < .315 && fy < .617; if (!front && !rear) continue;  // acima de .617 na porta de trás é friso, não puxador
        const key = (fz < .5 ? 'L' : 'R') + (rear ? 'r' : 'f');
        (groups[key] ||= []).push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      }
    }
    const mat = this.handleMat = new THREE.MeshPhysicalMaterial({ color: 0x4a4e55, metalness: .85, roughness: .32, clearcoat: .6, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });
    for (const [key, raw] of Object.entries(groups)) {
      if (raw.length < 27) continue;
      // fica só o puxador: tira triângulos soltos longe do centro do grupo (ex.: um bocado do friso junto ao vidro de trás)
      const cxs = [], cys = [];
      for (let i = 0; i < raw.length; i += 9) { cxs.push((raw[i] + raw[i + 3] + raw[i + 6]) / 3); cys.push((raw[i + 1] + raw[i + 4] + raw[i + 7]) / 3); }
      const med = a => { const b = [...a].sort((p, q) => p - q); return b[b.length >> 1]; }, mx = med(cxs), my = med(cys);
      const arr = [];
      for (let t = 0; t < cxs.length; t++) if (Math.abs(cxs[t] - mx) < .15 && Math.abs(cys[t] - my) < .03) arr.push(...raw.slice(t * 9, t * 9 + 9));
      if (arr.length < 27) continue;
      let cx = 0, cy = 0, cz = 0; const n = arr.length / 3;
      for (let i = 0; i < arr.length; i += 3) { cx += arr[i]; cy += arr[i + 1]; cz += arr[i + 2]; }
      cx /= n; cy /= n; cz /= n; const side = key[0] === 'L' ? -1 : 1;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] = cx + (arr[i] - cx) * 1.18; arr[i + 1] = cy + (arr[i + 1] - cy) * 1.35; arr[i + 2] = cz + (arr[i + 2] - cz) * 1.18 + side * .004;
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat); m.castShadow = false; this.scene.add(m);
    }
  }

  // Debaixo do capô há peças escuras (friso/borracha) quase encostadas à chapa que espreitam por ela
  // e fazem os riscos em "XX". De fora nunca se veem: retiram-se os triângulos dessa zona.
  _hideUnderHood(box, mats) {
    const L = box.max.x - box.min.x, H = box.max.y - box.min.y, W = box.max.z - box.min.z, v = new THREE.Vector3();
    (mats[this.opts.trimName || 'Geodoorl2sub11Mtl'] || []).forEach(o => {
      const g = o.geometry, p = g.attributes.position, idx = g.index; if (!idx) return;
      const inHood = i => { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); const fx = (v.x - box.min.x) / L, fy = (v.y - box.min.y) / H, fz = (v.z - box.min.z) / W; return fx > .68 && fy > .5 && fy < .75 && fz > .2 && fz < .8; };
      const keep = []; for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2); if (inHood(a) && inHood(b) && inHood(c)) continue; keep.push(a, b, c); }
      if (keep.length !== idx.count) { o.geometry = g.clone(); o.geometry.setIndex(keep); }
    });
  }

  // No modelo a face de fora das jantes sai ~3 cm para lá do pneu (parece um tampão solto).
  // Empurra as jantes de cada roda para dentro até ficarem ao nível da parede do pneu.
  _seatRims(mats) {
    const rims = Object.keys(mats).filter(n => /rim/i.test(n)).flatMap(n => mats[n]), tyres = mats['Tyre'] || [];
    if (!rims.length || !tyres.length) return;
    const v = new THREE.Vector3(), q = (x, z) => (x > 0 ? 'f' : 'r') + (z > 0 ? 'R' : 'L');
    const outer = (list) => { const o = {}; list.forEach(m => { const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); if (!near(v.x, v.y, v.z)) continue; const k = q(v.x, v.z); o[k] = Math.max(o[k] || 0, Math.abs(v.z)); } }); return o; };
    // centro de cada roda (a partir dos pneus) para só mexer no que está mesmo à volta da roda
    const ctr = {}; tyres.forEach(m => { const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); const k = q(v.x, v.z), c = ctr[k] ||= { x: 0, y: 0, n: 0 }; c.x += v.x; c.y += v.y; c.n++; } });
    for (const c of Object.values(ctr)) { c.x /= c.n; c.y /= c.n; }
    const near = (x, y, z) => { const c = ctr[q(x, z)]; return c && Math.hypot(x - c.x, y - c.y) < .42; };
    const tyreOut = outer(tyres), rimOut = outer(rims);
    rims.forEach(m => {
      // a mesma geometria (e o mesmo buffer comprimido) pode servir várias rodas: cada roda fica com a sua cópia das posições
      const g = m.geometry = m.geometry.clone(), src = g.attributes.position, arr = new Float32Array(src.count * 3);
      for (let i = 0; i < src.count; i++) { arr[i * 3] = src.getX(i); arr[i * 3 + 1] = src.getY(i); arr[i * 3 + 2] = src.getZ(i); }
      g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const p = g.attributes.position, inv = new THREE.Matrix4().copy(m.matrixWorld).invert();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
        if (!near(v.x, v.y, v.z)) continue;   // o espelho e outras peças escuras usam o mesmo material
        const k = q(v.x, v.z), d = (rimOut[k] || 0) - (tyreOut[k] || 0) + .004;
        if (d <= 0) continue;
        v.z -= Math.sign(v.z) * d; v.applyMatrix4(inv); p.setXYZ(i, v.x, v.y, v.z);
      }
      p.needsUpdate = true; g.computeBoundingSphere(); g.computeBoundingBox();
    });
  }

  // Zonas da carroçaria (a carroçaria é uma peça só no modelo): marca cada vértice com a zona a que pertence
  // 1 frunk · 2 bagageira · 3 porta frente-esq · 4 porta trás-esq · 5 porta frente-dir · 6 porta trás-dir · 7–10 rodas fl/fr/rl/rr
  // (frente = +X, esquerda = −Z; limites medidos no modelo do Model 3)
  _regions(box, mats) {
    this._regionOn = { value: new Array(11).fill(0) }; this._regionPulse = { value: 0 };
    const L = box.max.x - box.min.x, W = box.max.z - box.min.z, H = box.max.y - box.min.y, v = new THREE.Vector3();
    const R = Object.assign({ door: [.23, .452, .70], frunkX: .72, trunkX: .17, doorMin: 500, hoodY: .4 }, this.opts.regions ? {} : { front: .81, rear: .2 }, this.opts.regions);
    if (R.front === undefined) {   // eixos a partir dos próprios pneus (média das rodas da frente e de trás)
      const ax = [[0, 0], [0, 0]];
      (mats['Tyre'] || []).forEach(o => { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i += 3) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); const fx = (v.x - box.min.x) / L, k = fx > .5 ? 0 : 1; ax[k][0] += fx; ax[k][1]++; } });
      R.front = ax[0][1] ? ax[0][0] / ax[0][1] : .81; R.rear = ax[1][1] ? ax[1][0] / ax[1][1] : .2;
    }
    const wheelRegion = (fx, fy, fz) => fy > .5 ? 0 : Math.abs(fx - R.front) < .09 ? (fz < .5 ? 7 : 8) : Math.abs(fx - R.rear) < .09 ? (fz < .5 ? 9 : 10) : 0;
    const tag = (list, fn) => (list || []).forEach(o => {
      const pos = o.geometry.attributes.position, a = new Float32Array(pos.count);
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); a[i] = fn((v.x - box.min.x) / L, (v.y - box.min.y) / H, (v.z - box.min.z) / W); }
      o.geometry.setAttribute('aRegion', new THREE.BufferAttribute(a, 1));
      this._patchRegion(o.material);
    });
    // carroçaria: as portas e o capô são "ilhas" de malha separadas; junta os vértices ligados
    // e classifica cada ilha inteira (fica com contornos limpos, sem dentes)
    (mats[this.opts.paintName || 'Paint'] || []).forEach(o => {
      const g = o.geometry, pos = g.attributes.position, idx = g.index, n = pos.count;
      const par = new Int32Array(n); for (let i = 0; i < n; i++) par[i] = i;
      const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
      const join = (x, y) => { x = find(x); y = find(y); if (x !== y) par[x] = y; };
      const seen = new Map();
      for (let i = 0; i < n; i++) { const k = pos.getX(i).toFixed(4) + ',' + pos.getY(i).toFixed(4) + ',' + pos.getZ(i).toFixed(4); const j = seen.get(k); if (j === undefined) seen.set(k, i); else join(i, j); }
      if (idx) for (let i = 0; i < idx.count; i += 3) { join(idx.getX(i), idx.getX(i + 1)); join(idx.getX(i), idx.getX(i + 2)); }
      const F = new Float32Array(n * 3), comp = new Map();
      for (let i = 0; i < n; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        const fx = (v.x - box.min.x) / L, fy = (v.y - box.min.y) / H, fz = (v.z - box.min.z) / W; F[i * 3] = fx; F[i * 3 + 1] = fy; F[i * 3 + 2] = fz;
        const r = find(i); let c = comp.get(r); if (!c) comp.set(r, c = { n: 0, x: 0, y: 0, z: 0, x0: 9, x1: -9 }); c.n++; c.x += fx; c.y += fy; c.z += fz; c.x0 = Math.min(c.x0, fx); c.x1 = Math.max(c.x1, fx);
      }
      const kind = new Map();
      // o capô é a maior ilha na zona da frente; as outras ilhas pequenas lá dentro são reforços por baixo dele
      let hood = null, hoodN = 0;
      for (const [r, c] of comp) { const cx = c.x / c.n, cy = c.y / c.n, cz = c.z / c.n; if (c.n < n * .4 && cx > R.frunkX && cy > R.hoodY && cz > .2 && cz < .8 && c.n > hoodN) { hood = r; hoodN = c.n; } }
      for (const [r, c] of comp) {
        const cx = c.x / c.n, cy = c.y / c.n, cz = c.z / c.n;
        if (c.n > n * .4) kind.set(r, 'body');
        // dobradiças e fechos das portas (peças pequenas nos pilares): no modelo espreitam pelas frestas e parecem riscos pretos
        else if (c.n < 300 && cy < .62 && (Math.abs(cx - R.door[1]) < .025 || Math.abs(cx - R.door[2]) < .025)) kind.set(r, 'latch');
        // reforços por baixo do capô: espreitam pela chapa e parecem riscos/"XX"
        else if (r !== hood && c.n < 2000 && cx > R.frunkX && cy > .5 && cz > .2 && cz < .8) kind.set(r, 'latch');
        else if (r === hood || (c.n > 200 && cx > R.frunkX && cy > R.hoodY && cz > .2 && cz < .8)) kind.set(r, 'frunk');
        else if (c.n > R.doorMin && (cz < .2 || cz > .8) && cy > .3 && cy < .6 && cx > R.door[0] && cx < R.door[2]) {
          const side = cz < .5 ? 'L' : 'R';
          // uma porta inteira (fica com a cor toda) ou as duas portas coladas na mesma ilha (divide pelo pilar)
          kind.set(r, c.x0 < R.door[1] - .03 && c.x1 > R.door[1] + .03 ? 'door' + side : (cx > R.door[1] ? 'front' : 'rear') + side);
        }
        else kind.set(r, '');
      }
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const fx = F[i * 3], fy = F[i * 3 + 1], fz = F[i * 3 + 2], k = kind.get(find(i));
        out[i] = k === 'frunk' ? 1 : k === 'frontL' ? 3 : k === 'rearL' ? 4 : k === 'frontR' ? 5 : k === 'rearR' ? 6 : k === 'doorL' ? (fx > R.door[1] ? 3 : 4) : k === 'doorR' ? (fx > R.door[1] ? 5 : 6) : 0;
      }
      g.setAttribute('aRegion', new THREE.BufferAttribute(out, 1));
      const tr = new Float32Array(n); for (let i = 0; i < n; i++) { const kk = kind.get(find(i)); tr[i] = kk === 'body' || kk === '' ? 1 : 0; }
      g.setAttribute('aTrunk', new THREE.BufferAttribute(tr, 1));
      if (idx) { const keep = []; for (let i = 0; i < idx.count; i += 3) { if (kind.get(find(idx.getX(i))) !== 'latch') keep.push(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)); } g.setIndex(keep); }
      this._patchRegion(o.material);
    });
    tag(mats['Tyre'], wheelRegion);
    Object.keys(mats).filter(n => /rim/i.test(n)).forEach(n => tag(mats[n], wheelRegion));
  }
  _patchRegion(m) {
    if (!m || m.userData.regionPatched) return; m.userData.regionPatched = true;
    const on = this._regionOn, pulse = this._regionPulse, box = this.G.box;
    const bmin = { value: box.min.clone() }, bsize = { value: box.getSize(new THREE.Vector3()) };
    m.onBeforeCompile = sh => {
      sh.uniforms.uRegionOn = on; sh.uniforms.uRegionPulse = pulse; sh.uniforms.uBoxMin = bmin; sh.uniforms.uBoxSize = bsize;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aRegion;\nattribute float aTrunk;\nuniform vec3 uBoxMin;\nuniform vec3 uBoxSize;\nflat varying float vRegion;\nvarying float vTrunk;\nvarying vec3 vF;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRegion = aRegion; vTrunk = aTrunk; vF = ((modelMatrix * vec4(transformed, 1.0)).xyz - uBoxMin) / uBoxSize;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uRegionOn[11];\nuniform float uRegionPulse;\nflat varying float vRegion;\nvarying float vTrunk;\nvarying vec3 vF;\n' + TRUNK_GLSL)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ int rg = int(vRegion + .5); if ((rg > 0 && rg < 11 && uRegionOn[rg] > .5) || (uRegionOn[2] > .5 && vTrunk > .5 && gftTrunk(vF) > 0.0)) { gftHL = 1.0; totalEmissiveRadiance += vec3(1.0, .36, .0) * uRegionPulse * .5; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, .42, .02), uRegionPulse * .6); } }')
        // no fim, por cima dos reflexos: senão o brilho da pintura apaga o laranja e o contorno fica confuso
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, .5, .08), gftHL * uRegionPulse * .55);')
        .replace('void main() {', 'void main() {\nfloat gftHL = 0.0;');
    };
    m.customProgramCacheKey = () => 'gft-region';
    m.needsUpdate = true;
  }

  // Interior: no modelo os bancos (Ln7Mtl) e os painéis das portas por dentro são peças à parte
  setInterior(name) { if (this.state.interior === name) return; this.state.interior = name; this._applyInterior(); }
  _applyInterior() {
    const G = this.G; if (!G.mats || !G.box) return;
    if (G.mats['Seats']) {   // modelos preparados com os bancos à parte: basta mudar a cor
      const white = this.state.interior !== 'black';
      G.mats['Seats'].forEach(o => { if (!o.userData.seatMat) o.material = o.userData.seatMat = o.material.clone(); o.material.color.set(white ? 0xd8d5ce : 0x1b1b1d); o.material.roughness = white ? .55 : .5; });
      return;
    }
    const black = this.state.interior === 'black', box = G.box;
    const L = box.max.x - box.min.x, H = box.max.y - box.min.y, v = new THREE.Vector3();
    const set = (name, dark) => (G.mats[name] || []).forEach(o => {
      const g = o.geometry, pos = g.attributes.position;
      if (!o.userData.cabin) {            // marca, uma vez, que vértices ficam dentro do habitáculo
        const c = new Float32Array(pos.count);
        for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); const fx = (v.x - box.min.x) / L, fy = (v.y - box.min.y) / H; c[i] = fx > .14 && fx < .84 && fy > .2 ? 1 : 0; }
        o.userData.cabin = c; o.material = o.material.clone();
      }
      const base = o.material.color, d = new THREE.Color(dark), col = new Float32Array(pos.count * 3), cab = o.userData.cabin;
      const k = [Math.min(1, d.r / Math.max(base.r, .001)), Math.min(1, d.g / Math.max(base.g, .001)), Math.min(1, d.b / Math.max(base.b, .001))];
      for (let i = 0; i < pos.count; i++) { const on = black && cab[i]; col[i * 3] = on ? k[0] : 1; col[i * 3 + 1] = on ? k[1] : 1; col[i * 3 + 2] = on ? k[2] : 1; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); o.material.vertexColors = true; o.material.needsUpdate = true;
    });
    set('Ln7Mtl', 0x1c1c1e);                 // bancos (a mesma peça tem partes dos faróis: essas não mudam)
    set('Geodoorl2intsub651Mtl', 0x26272a);  // painéis interiores das portas
    G.reflNeed = 3;
  }

  setPaint(p) { if (this.state.paint === p) return; this.state.paint = p; this._applyPaint(); }
  _applyPaint() {
    if (!this.paintMat) return; const p = this.state.paint;
    this.paintMat.color.set(p.hex); this.paintMat.metalness = p.m; this.paintMat.roughness = p.r;
    // pintura brilhante: verniz espesso e reflexos nítidos das faixas de luz do estúdio
    this.paintMat.envMapIntensity = p.light ? 1 : 1.25; this.paintMat.clearcoat = 1; this.paintMat.clearcoatRoughness = .04; this.paintMat.needsUpdate = true;
    this.G.reflNeed = 3;
  }
  setTheme(dark) { if (this.state.dark === dark && this._themed) return; this._themed = !!this.G.ground && !!this.G.box; this.state.dark = dark; this._applyTheme(); }
  _applyTheme() {
    const G = this.G, d = this.state.dark; if (!G.ground) return;
    this._applyPaint();
    G.ground.material.opacity = d ? .5 : .22; G.blob.material.opacity = d ? 1 : .7;
    this.hemi.intensity = d ? .35 : .7; this.sun.intensity = d ? 1.2 : 1.7;
    this.renderer.toneMappingExposure = d ? .9 : 1.0;
    G.refl.material.uniforms.uStrength.value = d ? .6 : .38;
    (G.contacts || []).forEach(c => c.material.opacity = d ? .85 : .55);
    this.renderer.shadowMap.needsUpdate = true; G.reflNeed = 3;
  }
  // Sentinela (à K.I.T.T.): luz vermelha por baixo do carro, no eixo da frente, a varrer entre as rodas da frente
  _sentryFloor(box) {
    const G = this.G, fl = G.wheels && G.wheels.fl, fr = G.wheels && G.wheels.fr; if (!fl || !fr) return;
    const ax = (fl.pos.x + fr.pos.x) / 2, inner = Math.abs(fl.pos.z - fr.pos.z) - .34;   // entre as faces de dentro dos pneus
    const cx = Math.min(ax + .55, box.max.x - .5), cz = (fl.pos.z + fr.pos.z) / 2;
    const geo = new THREE.PlaneGeometry(2.0, inner);
    // A luz é um ponto por baixo do carro (a ~30 cm do chão); o chão recebe-a como uma lâmpada real:
    // muito forte por baixo e a cair suavemente para fora (lei do inverso do quadrado + ângulo).
    const mat = new THREE.ShaderMaterial({
      uniforms: { uLight: { value: new THREE.Vector2(cx, cz) }, uDir: { value: 1 }, uOn: { value: 0 }, uDark: { value: 1 }, uH: { value: .3 } },
      transparent: true, depthWrite: false, toneMapped: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      // (com logarithmicDepthBuffer, os shaders à medida precisam destes includes, senão ficam escondidos)
      vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec2 vUv; varying vec2 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w;\n#include <logdepthbuf_vertex>\n}',
      fragmentShader: `#include <logdepthbuf_pars_fragment>
        uniform vec2 uLight; uniform float uDir; uniform float uOn; uniform float uDark; uniform float uH; varying vec2 vUv; varying vec2 vW;
        float lit(vec2 c) {
          vec2 d = (vW - c) * vec2(1.6, 1.0);          // oval: mais larga na direção das rodas
          float h2 = uH * uH; return pow(h2 / (dot(d, d) + h2), 1.5);
        }
        void main(){
          #include <logdepthbuf_fragment>
          float a = lit(uLight);
          for (int i = 1; i <= 6; i++) a = max(a, lit(uLight - vec2(0., uDir * float(i) * .07)) * pow(.62, float(i)));   // rasto
          float edge = smoothstep(0., .12, vUv.y) * smoothstep(1., .88, vUv.y) * smoothstep(0., .15, vUv.x) * smoothstep(1., .85, vUv.x);
          a = clamp(a * 1.6, 0., 1.) * edge * uOn;
          vec3 c = vec3(1., .07, .02);
          gl_FragColor = uDark > .5 ? vec4(c * a * 1.2, 0.) : vec4(c * a * .75, a * .7);
        }`,
    });
    const m = G.sentry = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.set(cx, .006, cz); m.renderOrder = 5; this.scene.add(m);
    G.sentryZ = [cz - inner / 2 + .28, cz + inner / 2 - .28];
    G.sentryAxleX = ax;
    // o verde do carregamento apaga-se à volta do eixo da frente quando o sentinela está ligado
    const um = G.under.material, mask = this._underMask = { value: 0 }, mx = { value: cx };
    um.onBeforeCompile = sh => {
      sh.uniforms.uMask = mask; sh.uniforms.uMaskX = mx;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWX;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWX = (modelMatrix * vec4(transformed, 1.0)).x;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uMask; uniform float uMaskX; varying float vWX;')
        .replace('#include <premultiplied_alpha_fragment>', '#include <premultiplied_alpha_fragment>\ngl_FragColor *= mix(1.0, smoothstep(.75, 1.15, abs(vWX - uMaskX)), uMask);');
    };
    um.customProgramCacheKey = () => 'gft-under-mask'; um.needsUpdate = true;
  }

  setCarState(s) { Object.assign(this.state, s); }
  fx(name) { this.G.fx[name] = performance.now(); }

  setInsets(bottom, top, narrow, right) { this.bottomInset = bottom || 0; this.topInset = top || 0; this.narrow = !!narrow; this.rightInset = right || 0; this.resize(); }
  resize() {
    if (!this.renderer) return;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    const cam = this.camera; cam.aspect = w / h;
    // desvia o centro da imagem para a zona livre (sem cabeçalho/rodapé)
    cam.setViewOffset(w, h, Math.round((this.rightInset || 0) * 0.5), Math.round((this.bottomInset - this.topInset) * 0.48), w, h);   // centra o carro na zona livre (fora do menu)
    cam.updateProjectionMatrix();
    const freeW = w - (this.rightInset || 0), freeH = h - this.bottomInset - this.topInset;
    const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const byW = 4.6 / (2 * (this.narrow ? .9 : .7) * tanH * cam.aspect * (freeW / w));
    const byH = 2.0 / (2 * (this.narrow ? .62 : .56) * tanH * (freeH / h));
    this.HOME.dist = THREE.MathUtils.clamp(Math.max(byW, byH), 5, 22);
    this.controls.minDistance = this.HOME.dist * .7; this.controls.maxDistance = this.HOME.dist * 1.5;
    this._sizeRefl();
    if (!this.G.homing && !this.G.userAt) this.goHome(true);
  }
  _sizeRefl() {
    const G = this.G; if (!G.refl) return;
    const pr = this.renderer.getPixelRatio(), q = G.reflQ;
    const rw = Math.max(256, Math.round(this.canvas.clientWidth * pr * q)), rh = Math.max(256, Math.round(this.canvas.clientHeight * pr * q));
    G.refl.getRenderTarget().setSize(rw, rh); G.refl.material.uniforms.uTexel.value.set(1 / rw, 1 / rh); G.reflNeed = 3;
  }
  goHome(instant) {
    const H = this.HOME;
    if (instant) { this.camera.position.copy(H.target).addScaledVector(H.dir, H.dist); this.controls.target.copy(H.target); this.controls.update(); }
    else this.G.homing = true;
  }
  start() { if (this.renderer && !this.running) { this.running = true; this.renderer.setAnimationLoop(now => this._frame(now)); } }
  stop() { if (this.renderer && this.running) { this.running = false; this.renderer.setAnimationLoop(null); } }

  // posição no ecrã de uma âncora (para as etiquetas HTML)
  project(name) {
    const G = this.G, a = name.startsWith('wheel_') ? (G.wheels && G.wheels[name.slice(6)] && { p: G.wheels[name.slice(6)].pos }) : G.anchors[name];
    if (!a) return null;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    const v = this._tmp.copy(a.p).project(this.camera);
    let facing = true;
    if (a.n) { this.camera.getWorldDirection(this._camDir); facing = a.n.clone().normalize().dot(this._camDir) < 0.15; }
    return { x: (v.x * .5 + .5) * w, y: (-v.y * .5 + .5) * h, visible: facing && v.z < 1 };
  }

  _frame(now) {
    const G = this.G, cam = this.camera, c = this.controls, H = this.HOME;
    if (G.intro) {
      const p = Math.min(1, (now - G.intro) / 1600), e = 1 - Math.pow(1 - p, 3);
      if (p < 1 && !G.userAt && !this.reduced) {
        const dir = H.dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (1 - e) * 0.55);
        cam.position.copy(H.target).addScaledVector(dir, H.dist * (1 + (1 - e) * 0.35));
      } else if (p >= 1) G.intro = 0;
    }
    if (G.userAt && !G.dragging && now - G.userAt > 8000) G.homing = true;
    if (G.homing) {
      const want = H.target.clone().addScaledVector(H.dir, H.dist);
      cam.position.lerp(want, 0.06); c.target.lerp(H.target, 0.08);
      if (cam.position.distanceTo(want) < 0.01) { G.homing = false; G.userAt = 0; }
    }
    c.update();
    if (G.ready) { this._fx(now, (now - G.t0) / 1000); this._reflQuality(now); }
    this.renderer.render(this.scene, cam);
    this.opts.onFrame && this.opts.onFrame();
  }
  _reflQuality(now) {
    const G = this.G; this.camera.updateMatrixWorld();
    if (!this._lastCam.equals(this.camera.matrixWorld)) { G.lastMove = now; this._lastCam.copy(this.camera.matrixWorld); }
    G.moving = now - G.lastMove < 250;
    const q = G.moving ? G.reflBase * .5 : G.reflBase;
    if (q !== G.reflQ) { G.reflQ = q; this._sizeRefl(); }
  }
  _setLights(name, v) { ((this.G.lightMats && this.G.lightMats[name]) || []).forEach(m => m.emissiveIntensity = v); }
  _fx(now, t) {
    const G = this.G, fx = G.fx, S = this.state; let head = 0, tail = 0;
    if (fx.flash) { const e = (now - fx.flash) / 1000; if (e > 2.7) fx.flash = 0; else head = tail = Math.max(0, Math.sin(e * Math.PI / .9)) ** .6; }
    if (fx.lock) { const e = (now - fx.lock) / 1000; if (e > .9) fx.lock = 0; else { const v = Math.max(0, Math.sin(e / .45 * Math.PI)); head = Math.max(head, v); tail = Math.max(tail, v); } }
    this._setLights('HeadLight', head * 4); this._setLights('TailLight', tail * 5); this._setLights('RearLightBar', tail * 5);
    this.camera.getWorldDirection(this._camDir);
    const vis = n => THREE.MathUtils.clamp(-n.dot(this._camDir) * 2.2 + .2, 0, 1);
    G.glows.head.forEach((s, i) => s.material.opacity = head * .9 * vis(G.glows.headN[i]));
    G.glows.headHalo.forEach((s, i) => s.material.opacity = head * .2 * vis(G.glows.headN[i]));
    G.glows.tail.forEach((s, i) => s.material.opacity = tail * .75 * vis(G.glows.tailN[i]));
    G.beam.intensity = head * 3;
    // a carregar: verde a pulsar (sobe e desce a cada 1,6 s); cabo ligado sem carregar: azul fixo e fraco
    const pulse = .5 - .5 * Math.cos(t * Math.PI * 2 / 1.6);
    const port = S.charging ? .5 + .5 * pulse : S.plugged ? .45 : 0;
    const col = S.charging ? 0x2bd673 : 0x3b82f6;
    G.under.material.color.set(col);
    G.under.material.opacity = port * (S.dark ? .9 : .6);
    if (G.under.userData.dark !== S.dark) { G.under.userData.dark = S.dark; G.under.material.blending = S.dark ? THREE.CustomBlending : THREE.NormalBlending; G.under.material.premultipliedAlpha = S.dark; G.under.material.needsUpdate = true; }
    const want = S.climate ? 1.4 + .35 * Math.sin(t * 1.6) : 0;
    const d = (want - G.cabin.intensity) * .05; G.cabin.intensity += d;
    // peças abertas e rodas com pressão baixa: a piscar a laranja
    const on = this._regionOn, op = S.open || {}, tw = S.tpmsWarn || {};
    const flags = [0, op.frunk, 0 /* bagageira: só o ponto */, op.df, op.dr, op.pf, op.pr, tw.fl, tw.fr, tw.rl, tw.rr];
    let warnOn = false; for (let i = 0; i < flags.length; i++) { on.value[i] = flags[i] ? 1 : 0; warnOn ||= !!flags[i]; }
    this._regionPulse.value = warnOn ? (.5 - .5 * Math.cos(t * Math.PI * 2 / 1.2)) * (S.dark ? .8 : .9) : 0;
    G.animating = head > 0 || tail > 0 || port > 0 || Math.abs(d) > .002 || want > 0 || !!fx.honk || warnOn || !!S.sentry;
    if (G.portDot) {
      const po = !!(S.open && S.open.port);
      G.portDot.material.opacity = po ? .35 + .65 * (.5 - .5 * Math.cos(t * Math.PI * 2 / 1.2)) : 0;
      // desenhado por cima do farolim, mas só quando esse lado do carro está virado para a câmara
      this.camera.getWorldDirection(this._camDir); G.portDot.visible = G.anchors.port.n.clone().normalize().dot(this._camDir) < .15;
      const to = !!(S.open && S.open.trunk);
      G.trunkDot.material.opacity = to ? G.portDot.material.opacity || (.35 + .65 * (.5 - .5 * Math.cos(t * Math.PI * 2 / 1.2))) : 0;
      G.trunkDot.visible = G.anchors.trunk.n.clone().normalize().dot(this._camDir) < .15;
      if (to) G.animating = true;
      if (po) G.animating = true;
    }
    if (G.sentry) {
      const on = S.sentry ? 1 : 0, u = G.sentry.material.uniforms;
      u.uOn.value += (on - u.uOn.value) * .08; u.uDark.value = S.dark ? 1 : 0;
      // vai e vem a velocidade constante (onda triangular), 1,4 s em cada sentido
      const ph = (t / 1.4) % 2, pos = ph < 1 ? ph : 2 - ph, z = G.sentryZ[0] + (G.sentryZ[1] - G.sentryZ[0]) * pos;
      u.uLight.value.y = z; u.uDir.value = ph < 1 ? 1 : -1;
      this._underMask.value = u.uOn.value;
    }
    if (fx.honk) {
      const e = (now - fx.honk) / 1000;
      if (e > 1.8) { fx.honk = 0; G.ring.material.opacity = 0; }
      else { const p = (e % .9) / .9; G.ring.scale.setScalar(.4 + p * 2.4); G.ring.material.opacity = (1 - p) * .8; }
    }
  }
  dispose() { this.stop(); try { this.controls.dispose(); this.renderer.dispose(); } catch (e) { } }
}
