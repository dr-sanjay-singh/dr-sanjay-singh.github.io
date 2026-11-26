import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { fulvene, toMesh } from './molecule.js';

const host = document.querySelector('.hero .main');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

try {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = ACES();
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  { // aurora-like navy/teal backdrop
    const c = document.createElement('canvas'); c.width = 512; c.height = 1024;
    const g = c.getContext('2d');
    g.fillStyle = '#0b0a1d'; g.fillRect(0, 0, 512, 1024);
    const r1 = g.createRadialGradient(150, 220, 0, 150, 220, 520); r1.addColorStop(0, 'rgba(52,72,150,.85)'); r1.addColorStop(1, 'rgba(52,72,150,0)');
    g.fillStyle = r1; g.fillRect(0, 0, 512, 1024);
    const r2 = g.createRadialGradient(400, 820, 0, 400, 820, 480); r2.addColorStop(0, 'rgba(18,120,135,.75)'); r2.addColorStop(1, 'rgba(18,120,135,0)');
    g.fillStyle = r2; g.fillRect(0, 0, 512, 1024);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    scene.background = tex;
  }
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  const cam = new THREE.PerspectiveCamera(34, 1, .1, 200);
  cam.position.set(0, 0, 21);

  const key = new THREE.DirectionalLight(0xcfe0ff, 1.8); key.position.set(-5, 7, 8); scene.add(key);
  const rim = new THREE.PointLight(0x2ef3f5, 60, 30); rim.position.set(6, -4, -3); scene.add(rim);
  scene.add(new THREE.AmbientLight(0x30406a, .7));

  const mol = toMesh(THREE, fulvene(), { detail: 40, mono: true, emissive: 0x2ef3f5 });
  mol.scale.setScalar(.95); scene.add(mol);
  const { mats, bondMat, meshes } = mol.userData;

  // photon source and photons
  const src = new THREE.Vector3(-5.5, 9, 2);
  const N = 60, pos = new Float32Array(N * 3), size = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const glow = c => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uC: { value: new THREE.Color(c) }, uPR: { value: renderer.getPixelRatio() } },
    vertexShader: 'attribute float aSize;uniform float uPR;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uPR*(60./-mv.z);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform vec3 uC;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);gl_FragColor=vec4(uC*a*1.8,a);}'
  });
  scene.add(new THREE.Points(geo, glow(0x7fe9ff)));
  const st = Array.from({ length: N }, () => ({ on: false, t: 0, sp: .3 + Math.random() * .35, w: Math.random() * 9, tg: 0 }));

  // sparks on absorption
  const SP = 120, spos = new Float32Array(SP * 3), ssz = new Float32Array(SP);
  const sgeo = new THREE.BufferGeometry();
  sgeo.setAttribute('position', new THREE.BufferAttribute(spos, 3));
  sgeo.setAttribute('aSize', new THREE.BufferAttribute(ssz, 1));
  scene.add(new THREE.Points(sgeo, glow(0x2ef3f5)));
  const ss = Array.from({ length: SP }, () => ({ l: 0, p: new THREE.Vector3(), v: new THREE.Vector3() }));
  let si = 0;

  const comp = new EffectComposer(renderer);
  comp.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .6, .5, .5);
  comp.addPass(bloom); comp.addPass(new OutputPass());

  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false); comp.setSize(w, h);
    cam.aspect = w / h; cam.position.z = w / h < .8 ? 26 : 21; cam.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(host); resize();

  let mx = 0, my = 0, tx = 0, ty = 0, visible = true, excite = 0;
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; });
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(host);

  const clock = new THREE.Clock(), tmp = new THREE.Vector3();
  const loop = () => {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    if (!visible) return;
    mx += (tx - mx) * dt * 2; my += (ty - my) * dt * 2;
    const spd = reduce ? .25 : 1;
    mol.rotation.set(Math.sin(t * .2) * .3 + my * .5, t * .15 * spd + mx * .8, Math.cos(t * .17) * .12);

    for (let i = 0; i < N; i++) {
      const s = st[i];
      if (!s.on) { size[i] = 0; if (Math.random() < dt * .14 * spd) { s.on = true; s.t = 0; s.tg = (Math.random() * meshes.length) | 0; } continue; }
      s.t += dt * s.sp * spd;
      meshes[s.tg].getWorldPosition(tmp);
      const p = src.clone().lerp(tmp, s.t), k = (1 - s.t) * .2;
      p.x += Math.sin(s.t * 28 + s.w) * k; p.z += Math.cos(s.t * 28 + s.w) * k;
      pos.set([p.x, p.y, p.z], i * 3); size[i] = 3;
      if (s.t >= 1) {
        s.on = false; size[i] = 0; excite = Math.min(1.3, excite + .14);
        meshes[s.tg].userData.flash = 1;
        for (let j = 0; j < 5; j++) { const q = ss[si++ % SP]; q.l = 1; q.p.copy(tmp); q.v.set(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(2 + Math.random() * 3); }
      }
    }
    geo.attributes.position.needsUpdate = geo.attributes.aSize.needsUpdate = true;
    for (let i = 0; i < SP; i++) { const q = ss[i]; if (q.l > 0) { q.l -= dt * 1.2; q.p.addScaledVector(q.v, dt); q.v.multiplyScalar(.96); } spos.set([q.p.x, q.p.y, q.p.z], i * 3); ssz[i] = Math.max(0, q.l) * 2.2; }
    sgeo.attributes.position.needsUpdate = sgeo.attributes.aSize.needsUpdate = true;

    excite *= Math.pow(.45, dt); const e = Math.min(1, excite);
    meshes.forEach(m => { const f = m.userData.flash || 0; m.scale.setScalar(m.userData.base * (1 + f * .35)); m.userData.flash = f * Math.pow(.02, dt); });
    Object.values(mats).forEach(m => m.emissiveIntensity = e * .7); bondMat.emissiveIntensity = e * 1.1;
    bloom.strength = .5 + e * .45;
    comp.render();
  };
  loop();
} catch (err) {
  host.classList.add('nogl');
}
function ACES() { return THREE.ACESFilmicToneMapping; }
