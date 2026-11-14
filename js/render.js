import * as THREE from "three";
import { GLSL3 } from "three";
import { RenderPixelatedPass } from "../vendor/three/examples/jsm/postprocessing/RenderPixelatedPass.js";
import { CAMERA, JUICE, PIXEL, SWORD } from "./config.js";
import decor from "./decor.js";

const _bladeBase = new THREE.Vector3();
const _bladeTip = new THREE.Vector3();
const _look = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _rel = new THREE.Vector3();
const _shift = new THREE.Vector3();
const _proj = new THREE.Vector3();
const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _aim = new THREE.Vector3();
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.8);

const FONT = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
};
const GLYPH_W = 5;
const GLYPH_H = 7;

function bandGradient(steps) {
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) data[i] = Math.round((i / (steps - 1)) * 255);
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function toonMat(gradientMap, color, emissive, intensity) {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap,
    emissive: emissive || "#000000",
    emissiveIntensity: intensity || 0,
  });
}

const numberCache = new Map();
function numberTexture(text) {
  const hit = numberCache.get(text);
  if (hit) return hit;
  const cols = text.length * (GLYPH_W + 1);
  const canvas = document.createElement("canvas");
  canvas.width = cols + 1;
  canvas.height = GLYPH_H + 1;
  const g = canvas.getContext("2d");
  function plot(dx, dy, color) {
    g.fillStyle = color;
    for (let i = 0; i < text.length; i++) {
      const rows = FONT[text[i]];
      if (!rows) continue;
      const ox = i * (GLYPH_W + 1) + dx;
      for (let y = 0; y < GLYPH_H; y++) {
        for (let x = 0; x < GLYPH_W; x++) {
          if (rows[y][x] === "1") g.fillRect(ox + x, dy + y, 1, 1);
        }
      }
    }
  }
  plot(1, 1, "#1a1816");
  plot(0, 0, "#fff6ea");
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  const baked = { tex, cols: canvas.width, rows: canvas.height };
  numberCache.set(text, baked);
  return baked;
}

function makeBar(w, h, color) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color, depthTest: true }),
  );
  mesh.scale.set(w, h, 1);
  mesh.renderOrder = 2;
  return mesh;
}

function gradePixelShader(material) {
  material.uniforms.uChroma = { value: 0 };
  material.uniforms.uFlash = { value: 0 };
  material.fragmentShader = material.fragmentShader
    .replace(
      "uniform float depthEdgeStrength;",
      "uniform float depthEdgeStrength;\n\t\t\t\tuniform float uChroma;\n\t\t\t\tuniform float uFlash;",
    )
    .replace(
      "gl_FragColor = texel * Strength;",
      `
					vec2 cOff = vec2(uChroma * 2.0, 0.0) * resolution.zw;
					float rr = texture2D(tDiffuse, vUv + cOff).r;
					float bb = texture2D(tDiffuse, vUv - cOff).b;
					vec3 pix = vec3(rr, texel.g, bb) * Strength;
					pix = mix(pix, vec3(1.0), clamp(uFlash, 0.0, 1.0));
					gl_FragColor = vec4(pix, 1.0);
      `,
    );
  material.toneMapped = false;
  material.needsUpdate = true;
}

export function createView(canvas, world) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#d5d0c7");
  const fxGroup = new THREE.Group();
  scene.add(fxGroup);

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, window.innerWidth / window.innerHeight, 0.1, 280);
  const aimCam = new THREE.PerspectiveCamera(CAMERA.fov, window.innerWidth / window.innerHeight, 0.1, 280);
  camera.position.set(world.playerSpawn.x, CAMERA.height, world.playerSpawn.z - CAMERA.back);
  camera.lookAt(world.playerSpawn.x, 0.4, world.playerSpawn.z);
  camera.updateMatrixWorld(true);
  const overview = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 400);
  overview.up.set(0, 0, 1);

  const pixelPass = new RenderPixelatedPass(PIXEL.size, scene, camera, {
    normalEdgeStrength: PIXEL.normalEdge,
    depthEdgeStrength: PIXEL.depthEdge,
  });
  pixelPass.renderToScreen = true;
  pixelPass.beautyRenderTarget.texture.colorSpace = THREE.NoColorSpace;
  pixelPass.normalRenderTarget.texture.colorSpace = THREE.NoColorSpace;
  gradePixelShader(pixelPass.pixelatedMaterial);
  pixelPass.subpixelX = 0;
  pixelPass.subpixelY = 0;
  pixelPass.render = function (gl, writeBuffer) {
    const uniforms = this.fsQuad.material.uniforms;
    uniforms.normalEdgeStrength.value = this.normalEdgeStrength;
    uniforms.depthEdgeStrength.value = this.depthEdgeStrength;
    const rw = this.renderResolution.x || 1;
    const rh = this.renderResolution.y || 1;
    this.fsQuad._mesh.position.x = (this.subpixelX / rw) * 2;
    this.fsQuad._mesh.position.y = (this.subpixelY / rh) * 2;

    gl.setRenderTarget(this.beautyRenderTarget);
    gl.render(this.scene, this.camera);

    const previous = this.scene.overrideMaterial;
    gl.setRenderTarget(this.normalRenderTarget);
    this.scene.overrideMaterial = this.normalMaterial;
    fxGroup.visible = false;
    gl.render(this.scene, this.camera);
    fxGroup.visible = true;
    this.scene.overrideMaterial = previous;

    uniforms.tDiffuse.value = this.beautyRenderTarget.texture;
    uniforms.tDepth.value = this.beautyRenderTarget.depthTexture;
    uniforms.tNormal.value = this.normalRenderTarget.texture;

    if (this.renderToScreen) gl.setRenderTarget(null);
    else {
      gl.setRenderTarget(writeBuffer);
      if (this.clear) gl.clear();
    }
    this.fsQuad.render(gl);
  };

  const gradientMap = bandGradient(PIXEL.shadeSteps);

  const hemi = new THREE.HemisphereLight("#f4f0e8", "#b7b0a4", 0.72);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight("#fff4e8", 1.25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.045;
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 140;
  const extent = 30;
  sun.shadow.camera.left = -extent;
  sun.shadow.camera.right = extent;
  sun.shadow.camera.top = extent;
  sun.shadow.camera.bottom = -extent;
  scene.add(sun);
  scene.add(sun.target);

  const killLight = new THREE.PointLight("#fff1dc", 0, 9, 2);
  killLight.position.y = 1.4;
  scene.add(killLight);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 420),
    toonMat(gradientMap, "#cfc9bf"),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const mats = new Map();
  function wallMat(color) {
    const key = color || "#7A7D82";
    let m = mats.get(key);
    if (!m) {
      m = toonMat(gradientMap, key);
      mats.set(key, m);
    }
    return m;
  }

  const worldGroup = new THREE.Group();
  scene.add(worldGroup);
  for (const b of world.boxes) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), wallMat(b.color));
    mesh.position.set(b.x, b.h / 2, b.z);
    mesh.rotation.y = b.rotY || 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    worldGroup.add(mesh);
  }

  const decorBuckets = new Map();
  for (let i = 0; i < decor.length; i++) {
    const p = decor[i];
    const key = (p.kind || "box") + "|" + (p.color || "#7A7D82") + "|" + (p.glow ? 1 : 0);
    let list = decorBuckets.get(key);
    if (!list) decorBuckets.set(key, (list = []));
    list.push(p);
  }
  const decorQuat = new THREE.Quaternion();
  const decorPos = new THREE.Vector3();
  const decorScale = new THREE.Vector3();
  const decorMat = new THREE.Matrix4();
  const decorUp = new THREE.Vector3(0, 1, 0);
  for (const [key, list] of decorBuckets) {
    const kind = key.slice(0, key.indexOf("|"));
    const glow = key.endsWith("|1");
    const color = key.slice(key.indexOf("|") + 1, key.lastIndexOf("|"));
    let geo;
    if (kind === "cone") geo = new THREE.ConeGeometry(1, 1, 6);
    else if (kind === "cylinder") geo = new THREE.CylinderGeometry(1, 1, 1, 7);
    else if (kind === "sphere") geo = new THREE.SphereGeometry(1, 6, 5);
    else geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = glow
      ? new THREE.MeshBasicMaterial({ color })
      : toonMat(gradientMap, color);
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      decorPos.set(p.x, (p.y || 0) + p.h * 0.5, p.z);
      decorQuat.setFromAxisAngle(decorUp, p.rotY || 0);
      if (kind === "box") decorScale.set(p.w, p.h, p.d);
      else if (kind === "sphere") decorScale.set(p.w * 0.5, p.h * 0.5, p.d * 0.5);
      else decorScale.set(p.w * 0.5, p.h, p.d * 0.5);
      decorMat.compose(decorPos, decorQuat, decorScale);
      mesh.setMatrixAt(i, decorMat);
    }
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
  }

  const playerGeo = new THREE.CapsuleGeometry(0.5, 0.95, 20, 40);
  const playerMat = toonMat(gradientMap, "#2f6bff", "#1438c8", 0.35);
  const playerRestEmissive = playerMat.emissive.clone();
  const player = new THREE.Group();
  const bodyGroup = new THREE.Group();
  const playerBody = new THREE.Mesh(playerGeo, playerMat);
  playerBody.castShadow = true;
  playerBody.position.y = 0.975;
  bodyGroup.add(playerBody);
  player.add(bodyGroup);

  const swordPivot = new THREE.Group();
  swordPivot.position.set(0, 0.98, 0);
  const bladeBaseZ = 0.55;
  const bladeTipZ = SWORD.reach;
  const bladeLen = bladeTipZ - bladeBaseZ;
  const grip = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.09, 0.32),
    toonMat(gradientMap, "#2c2824"),
  );
  grip.position.set(0, 0, bladeBaseZ - 0.22);
  grip.castShadow = true;
  const guard = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.07, 0.1),
    toonMat(gradientMap, "#8e949c"),
  );
  guard.position.set(0, 0, bladeBaseZ);
  guard.castShadow = true;
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.022, bladeLen),
    toonMat(gradientMap, "#e8e4da", "#f3efe6", 0.22),
  );
  blade.position.set(0, 0, (bladeBaseZ + bladeTipZ) / 2);
  blade.castShadow = true;
  swordPivot.add(grip, guard, blade);
  player.add(swordPivot);
  scene.add(player);

  const enemyGeos = {
    grunt: new THREE.CapsuleGeometry(0.48, 0.46, 20, 40),
    skitter: new THREE.CapsuleGeometry(0.3, 0.3, 16, 32),
    brute: new THREE.CapsuleGeometry(0.72, 0.52, 20, 40),
    charger: new THREE.CapsuleGeometry(0.5, 0.42, 20, 40),
    splitter: new THREE.CapsuleGeometry(0.44, 0.36, 16, 28),
    swarm: new THREE.CapsuleGeometry(0.22, 0.16, 12, 16),
    shield: new THREE.CapsuleGeometry(0.52, 0.48, 16, 28),
    lobber: new THREE.CapsuleGeometry(0.4, 0.72, 16, 24),
    elite: new THREE.CapsuleGeometry(0.62, 0.55, 16, 28),
    boss: new THREE.CapsuleGeometry(1.05, 0.7, 16, 28),
  };
  const flashMat = new THREE.MeshBasicMaterial({ color: "#fff6ea" });
  const barBg = new THREE.MeshBasicMaterial({ color: "#1a1816" });
  const barFg = new THREE.MeshBasicMaterial({ color: "#e23a3a" });
  const enemies = new Map();

  function enemyHeight(type) {
    if (type === "skitter" || type === "swarm") return type === "swarm" ? 0.62 : 0.9;
    if (type === "brute") return 1.96;
    if (type === "boss") return 2.55;
    if (type === "lobber") return 1.72;
    if (type === "elite") return 1.82;
    if (type === "shield") return 1.52;
    return 1.42;
  }

  function makeEnemy(e) {
    const h = enemyHeight(e.type);
    const root = new THREE.Group();
    const spin = new THREE.Group();
    const body = new THREE.Mesh(
      enemyGeos[e.type] || enemyGeos.grunt,
      toonMat(gradientMap, "#e03636", "#6a1010", 0.4),
    );
    body.castShadow = true;
    body.position.y = h / 2;
    const flash = new THREE.Mesh(enemyGeos[e.type] || enemyGeos.grunt, flashMat);
    flash.position.y = h / 2;
    flash.scale.setScalar(1.08);
    flash.visible = false;
    spin.add(body, flash);
    if (e.type === "shield") {
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.72, 0.08),
        new THREE.MeshBasicMaterial({ color: "#f0c7b4" }),
      );
      plate.position.set(0, h * 0.42, e.r + 0.06);
      spin.add(plate);
    }
    if (e.type === "splitter") {
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.08, 0.5),
        new THREE.MeshBasicMaterial({ color: "#ffb15a" }),
      );
      band.position.y = h * 0.48;
      spin.add(band);
    }
    if (e.type === "elite" || e.type === "boss") {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(e.type === "boss" ? 1.7 : 1.2, 0.045, 4, 20),
        new THREE.MeshBasicMaterial({ color: e.type === "boss" ? "#ffd7a1" : "#ffb15a" }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.06;
      root.add(ring);
    }
    const barW = Math.max(0.7, e.r * 1.7);
    const bg = makeBar(barW, 0.07, 0x1a1816);
    const fg = makeBar(barW, 0.05, 0xe23a3a);
    bg.material = barBg;
    fg.material = barFg;
    const bar = new THREE.Group();
    bar.position.y = h + 0.34;
    bar.add(bg, fg);
    root.add(spin, bar);
    scene.add(root);
    return { root, spin, body, flash, bar, bg, fg, barW, flashT: 0, squash: 0, squashV: 0, hitAngle: 0, popping: 0 };
  }

  const sparkGeo = new THREE.PlaneGeometry(1, 1);
  const sparks = [];
  for (let i = 0; i < 360; i++) {
    const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({
      color: "#fff6ea",
      transparent: true,
      depthWrite: false,
    }));
    m.visible = false;
    m.frustumCulled = false;
    m.renderOrder = 4;
    scene.add(m);
    sparks.push({ mesh: m, life: 0, max: 1, vx: 0, vy: 0, vz: 0, x: 0, y: 0, z: 0, size: 0.14, kind: "spark" });
  }

  const RING_BITS = 16;
  const ringGeo = new THREE.BoxGeometry(0.16, 0.08, 0.16);
  const rings = [];
  for (let r = 0; r < 10; r++) {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: "#fff6ea", transparent: true });
    const bits = [];
    for (let i = 0; i < RING_BITS; i++) {
      const m = new THREE.Mesh(ringGeo, mat);
      g.add(m);
      bits.push(m);
    }
    g.visible = false;
    scene.add(g);
    rings.push({ g, bits, mat, life: 0, max: 0.24, power: 1 });
  }

  const nums = [];
  const numGeo = new THREE.PlaneGeometry(1, 1);
  for (let i = 0; i < 28; i++) {
    const mat = new THREE.MeshBasicMaterial({ transparent: true, depthTest: false });
    const mesh = new THREE.Mesh(numGeo, mat);
    mesh.visible = false;
    mesh.renderOrder = 6;
    mesh.frustumCulled = false;
    fxGroup.add(mesh);
    nums.push({ mesh, life: 0, max: 0.5, x: 0, y: 0, z: 0, vy: 0 });
  }

  const TRAIL_LIFE = 0.13;
  const TRAIL_MAX = 720;
  const ARC_STEP = 3.5 * Math.PI / 180;
  const trailSamples = [];
  const ribbonDraw = [];
  let trailTime = 0;
  let trailSwing = false;
  let trailPrev = null;
  let lastArc = null;
  const trailPos = new Float32Array(TRAIL_MAX * 2 * 3);
  const trailAlpha = new Float32Array(TRAIL_MAX * 2);
  const trailIndex = new Uint16Array((TRAIL_MAX - 1) * 6);
  for (let i = 0; i < TRAIL_MAX - 1; i++) {
    const a = i * 2;
    const o = i * 6;
    trailIndex[o] = a;
    trailIndex[o + 1] = a + 2;
    trailIndex[o + 2] = a + 1;
    trailIndex[o + 3] = a + 1;
    trailIndex[o + 4] = a + 2;
    trailIndex[o + 5] = a + 3;
  }
  const ribbonGeo = new THREE.BufferGeometry();
  ribbonGeo.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
  ribbonGeo.setAttribute("alpha", new THREE.BufferAttribute(trailAlpha, 1));
  ribbonGeo.setIndex(new THREE.BufferAttribute(trailIndex, 1));
  ribbonGeo.setDrawRange(0, 0);
  const ribbon = new THREE.Mesh(ribbonGeo, new THREE.ShaderMaterial({
    glslVersion: GLSL3,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color("#fff4e6") } },
    vertexShader: `
      in float alpha;
      out float vAlpha;
      void main() {
        vAlpha = alpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      in float vAlpha;
      uniform vec3 uColor;
      out vec4 fragColor;
      void main() {
        fragColor = vec4(uColor, vAlpha);
      }
    `,
  }));
  ribbon.frustumCulled = false;
  ribbon.renderOrder = 3;
  ribbon.visible = false;
  scene.add(ribbon);

  const orbitGroup = new THREE.Group();
  const orbitBlades = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.03, 0.72),
      toonMat(gradientMap, "#e8e4da", "#fff6ea", 0.35),
    );
    m.visible = false;
    orbitGroup.add(m);
    orbitBlades.push(m);
  }
  scene.add(orbitGroup);
  const dualBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.02, bladeLen),
    toonMat(gradientMap, "#d5d0c6", "#fff6ea", 0.2),
  );
  dualBlade.visible = false;
  scene.add(dualBlade);
  const spinMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.025, bladeLen * 0.85),
    toonMat(gradientMap, "#fff6ea", "#ffe08a", 0.4),
  );
  spinMesh.visible = false;
  scene.add(spinMesh);
  const postMeshes = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.85, 0.28),
      toonMat(gradientMap, "#8e949c"),
    );
    m.visible = false;
    scene.add(m);
    postMeshes.push(m);
  }
  const boomMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.02, 0.7),
    toonMat(gradientMap, "#ffe08a", "#fff6ea", 0.45),
  );
  boomMesh.visible = false;
  scene.add(boomMesh);
  const orbGeo = new THREE.OctahedronGeometry(0.18, 0);
  const orbMat = new THREE.MeshBasicMaterial({ color: "#ffe08a" });
  const orbMeshes = [];
  for (let i = 0; i < 36; i++) {
    const m = new THREE.Mesh(orbGeo, orbMat);
    m.visible = false;
    scene.add(m);
    orbMeshes.push(m);
  }
  const shotGeo = new THREE.SphereGeometry(0.28, 8, 6);
  const shotMat = new THREE.MeshBasicMaterial({ color: "#e7a090" });
  const shotMeshes = [];
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(shotGeo, shotMat);
    m.visible = false;
    scene.add(m);
    shotMeshes.push(m);
  }

  const playerBarW = 0.95;
  const playerBarFgMat = new THREE.MeshBasicMaterial({ color: "#2f6bff" });
  const playerBarBg = makeBar(playerBarW, 0.07, 0x1a1816);
  const playerBarFg = makeBar(playerBarW, 0.05, 0x2f6bff);
  playerBarBg.material = barBg;
  playerBarFg.material = playerBarFgMat;
  const playerBar = new THREE.Group();
  playerBar.add(playerBarBg, playerBarFg);
  playerBar.position.y = 2.28;
  scene.add(playerBar);

  const reticle = new THREE.Group();
  const bracketMat = new THREE.MeshBasicMaterial({ color: "#fff6ea" });
  const arm = 0.26;
  const thick = 0.045;
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const a = new THREE.Mesh(new THREE.BoxGeometry(arm, thick, thick), bracketMat);
    const b = new THREE.Mesh(new THREE.BoxGeometry(thick, thick, arm), bracketMat);
    a.position.set(sx * (0.5 - arm / 2), 0.16, sz * 0.5);
    b.position.set(sx * 0.5, 0.16, sz * (0.5 - arm / 2));
    reticle.add(a, b);
  }
  reticle.visible = false;
  scene.add(reticle);

  const pickups = new Map();
  const pickupGeo = new THREE.OctahedronGeometry(0.32, 0);
  const pickupMat = toonMat(gradientMap, "#d5efe2", "#7dba9a", 0.55);

  let followX = world.playerSpawn.x;
  let followZ = world.playerSpawn.z;
  let trauma = 0;
  let kickX = 0;
  let kickZ = 0;
  let kickVX = 0;
  let kickVZ = 0;
  let killLife = 0;
  let overviewOn = false;
  let hold = false;
  let playerSquash = 0;
  let playerSquashV = 0;
  let playerStretch = 0;
  let playerFlashT = 0;
  let chroma = 0;
  let grade = 0;
  const aim = { x: world.playerSpawn.x, z: world.playerSpawn.z + 4 };

  function emit(x, z, dirX, dirZ, n, speed, life, y, kind) {
    if (kind === "debris") {
      if (!JUICE.killBurst) return;
    } else if (!JUICE.sparks) return;
    const d = Math.hypot(dirX, dirZ) || 1;
    const nx = dirX / d;
    const nz = dirZ / d;
    const dust = kind === "dust";
    const debris = kind === "debris";
    let spawned = 0;
    for (let i = 0; i < sparks.length && spawned < n; i++) {
      const s = sparks[i];
      if (s.life > 0) continue;
      const ang = Math.random() * Math.PI * 2;
      const sp = speed * (0.55 + Math.random() * 0.7);
      const along = dust ? 0.25 : 0.8;
      const side = dust ? 1 : 0.42;
      s.life = life * (0.7 + Math.random() * 0.45);
      s.max = s.life;
      s.kind = kind;
      s.x = x + (Math.random() - 0.5) * 0.16;
      s.y = y;
      s.z = z + (Math.random() - 0.5) * 0.16;
      s.vx = nx * sp * along + Math.cos(ang) * sp * side;
      s.vy = (dust ? 1.1 : 2.2) + Math.random() * (debris ? 3.4 : 1.6);
      s.vz = nz * sp * along + Math.sin(ang) * sp * side;
      s.size = debris ? 0.16 + Math.random() * 0.14 : dust ? 0.1 + Math.random() * 0.05 : 0.13 + Math.random() * 0.07;
      const palette = dust
        ? ["#d9d2c6", "#b7b0a4"]
        : debris
          ? ["#e03636", "#fff6ea", "#ffb15a"]
          : ["#fff6ea", "#ffb15a", "#ffe08a"];
      s.mesh.material.color.set(palette[spawned % palette.length]);
      s.mesh.material.opacity = 1;
      s.mesh.visible = true;
      spawned++;
    }
  }

  function shock(x, z, power) {
    for (let i = 0; i < rings.length; i++) {
      const slot = rings[i];
      if (slot.life > 0) continue;
      slot.life = power > 1.2 ? 0.32 : 0.22;
      slot.max = slot.life;
      slot.power = power;
      slot.g.position.set(x, 0.1, z);
      slot.g.visible = true;
      slot.mat.color.set(power > 1.2 ? "#fff1d2" : "#fff6ea");
      slot.mat.opacity = 1;
      return;
    }
  }

  function spawnNumber(text, x, z) {
    if (!JUICE.damageNumbers) return;
    let slot = null;
    for (let i = 0; i < nums.length; i++) if (nums[i].life <= 0) { slot = nums[i]; break; }
    if (!slot) slot = nums[0];
    const baked = numberTexture(String(text));
    slot.mesh.material.map = baked.tex;
    slot.mesh.material.needsUpdate = true;
    const px = 0.072;
    slot.mesh.scale.set(baked.cols * px, baked.rows * px, 1);
    slot.life = 0.52;
    slot.max = 0.52;
    slot.x = x;
    slot.y = 1.7;
    slot.z = z;
    slot.vy = 1.35;
    slot.mesh.visible = true;
  }

  function applyEvents(events) {
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (ev.type === "swing") {
        if (JUICE.cameraKick) {
          kickVX += (ev.dirX || 0) * JUICE.kickStrength * 5;
          kickVZ += (ev.dirZ || 0) * JUICE.kickStrength * 5;
        }
        if (JUICE.squashStretch) playerStretch = Math.max(playerStretch, 1);
      } else if (ev.type === "hit" || ev.type === "kill") {
        const kill = ev.type === "kill";
        const rec = enemies.get(ev.id);
        if (rec && !kill) {
          if (JUICE.hitFlash) rec.flashT = JUICE.hitFlashMs / 1000;
          if (JUICE.squashStretch) {
            rec.squash = 1;
            rec.squashV = 0;
          }
          rec.hitAngle = Math.atan2(ev.dirX, ev.dirZ);
        }
        if (kill && rec) {
          rec.popping = 0.12;
          rec.flashT = JUICE.hitFlash ? 0.12 : 0;
          rec.root.position.set(ev.x, 0, ev.z);
          rec.hitAngle = Math.atan2(ev.dirX, ev.dirZ);
        }
        if (JUICE.cameraKick) {
          kickVX += ev.dirX * JUICE.kickStrength * 10;
          kickVZ += ev.dirZ * JUICE.kickStrength * 10;
        }
        if (JUICE.screenShake) trauma = Math.min(1, trauma + (kill ? JUICE.shakeKill : JUICE.shakeHit));
        emit(ev.x, ev.z, ev.dirX, ev.dirZ, kill ? 22 : 16, kill ? 8 : 7, kill ? 0.34 : 0.26, 0.85, "spark");
        if (kill) emit(ev.x, ev.z, ev.dirX, ev.dirZ, 28, 9, 0.4, 0.7, "debris");
        if (ev.crit) {
          emit(ev.x, ev.z, ev.dirX, ev.dirZ, 14, 10, 0.3, 1.1, "spark");
          chroma = 1;
          grade = Math.max(grade, 0.42);
        }
        shock(ev.x, ev.z, kill ? 1.75 : ev.crit ? 1.35 : 1);
        spawnNumber(Math.round(ev.damage), ev.x, ev.z);
        if (kill && JUICE.killBurst) {
          killLight.position.set(ev.x, 1.5, ev.z);
          killLife = 0.16;
          killLight.intensity = 18;
          chroma = 1;
          grade = 0.78;
        }
      } else if (ev.type === "hurt") {
        if (JUICE.screenShake) trauma = Math.min(1, trauma + JUICE.shakeHurt);
        playerFlashT = 0.12;
        chroma = 1;
        grade = 0.62;
        shock(ev.x, ev.z, 1.35);
        emit(ev.x, ev.z, ev.dirX || 0, ev.dirZ || 1, 12, 5, 0.22, 0.4, "dust");
      } else if (ev.type === "dash") {
        if (JUICE.squashStretch) playerStretch = 1;
        emit(ev.x, ev.z, -(ev.dirX || 0), -(ev.dirZ || 1), 8, 4, 0.18, 0.25, "dust");
      } else if (ev.type === "level" || ev.type === "skill") {
        shock(ev.x, ev.z, 1.8);
        emit(ev.x, ev.z, 0, 1, 20, 6, 0.4, 1.2, "spark");
        chroma = 0.7;
        grade = Math.max(grade, 0.35);
      } else if (ev.type === "orb" || ev.type === "xp") {
        emit(ev.x, ev.z, 0, 1, 6, 3, 0.22, 0.6, "spark");
      } else if (ev.type === "shock" || ev.type === "blast") {
        shock(ev.x, ev.z, ev.type === "blast" ? 1.6 : 1.2);
        emit(ev.x, ev.z, 0, 1, 10, 5, 0.24, 0.5, "spark");
      } else if (ev.type === "chain") {
        emit(ev.x, ev.z, ev.x - ev.fromX, ev.z - ev.fromZ, 6, 8, 0.18, 0.9, "spark");
      } else if (ev.type === "boss") {
        shock(ev.x, ev.z, 2);
      } else if (ev.type === "wall" && JUICE.sparks) {
        emit(ev.x, ev.z, -ev.dirX, -ev.dirZ, 12, 5, 0.26, 0.3, "dust");
        shock(ev.x, ev.z, 0.85);
      }
    }
  }

  function syncActors(game) {
    const p = game.player;
    player.visible = !overviewOn && p.alive;
    player.position.set(p.x, 0, p.z);
    player.rotation.y = p.facing;

    const living = new Set();
    for (let i = 0; i < game.enemies.length; i++) living.add(game.enemies[i].id);
    if (!overviewOn) {
      for (let i = 0; i < game.enemies.length; i++) {
        const e = game.enemies[i];
        living.add(e.id);
        let rec = enemies.get(e.id);
        if (!rec) {
          rec = makeEnemy(e);
          enemies.set(e.id, rec);
        }
        if (!rec.popping) rec.root.position.set(e.x, 0, e.z);
        const frac = Math.max(0, e.hp / e.maxHp);
        rec.fg.scale.x = rec.barW * frac;
        rec.fg.position.x = -rec.barW * 0.5 * (1 - frac);
        rec.fg.position.z = 0.01;
        const wind = e.state === "windup";
        if (wind) {
          rec.body.material.emissive.set("#ffe6cf");
          rec.body.material.emissiveIntensity = 0.9;
        } else if (rec.flashT <= 0) {
          rec.body.material.emissive.set("#6a1010");
          rec.body.material.emissiveIntensity = 0.4;
        }
        rec._wind = wind;
        rec._charge = e.state === "charge";
        rec._spd = Math.hypot(e.vx, e.vz);
        rec._move = rec._spd > 0.4 ? Math.atan2(e.vx, e.vz) : rec.hitAngle;
        rec.id = e.id;
        rec.root.visible = true;
      }
    }
    for (const [id, rec] of enemies) {
      if (overviewOn) {
        rec.root.visible = false;
        continue;
      }
      rec.root.visible = true;
      if (!living.has(id) && rec.popping <= 0) {
        scene.remove(rec.root);
        rec.body.material.dispose();
        enemies.delete(id);
      }
    }

    for (let i = 0; i < game.pickups.length; i++) {
      const pk = game.pickups[i];
      let mesh = pickups.get(pk.id);
      if (!mesh) {
        mesh = new THREE.Mesh(pickupGeo, pickupMat);
        mesh.castShadow = true;
        scene.add(mesh);
        pickups.set(pk.id, mesh);
      }
      mesh.visible = pk.active && !overviewOn;
      mesh.position.set(pk.x, 0.55 + Math.sin(game.time * 2.4 + pk.id) * 0.08, pk.z);
      mesh.rotation.y = game.time * 1.4;
    }

    swordPivot.rotation.y = swordOffset(p);
    const reachMul = (p.reach || SWORD.reach) / SWORD.reach;
    fitBlade(blade, reachMul);
    const frac = p.maxHp > 0 ? Math.max(0, p.hp / p.maxHp) : 0;
    playerBarFg.scale.x = playerBarW * frac;
    playerBarFg.position.x = -playerBarW * 0.5 * (1 - frac);
    playerBarFg.position.z = 0.01;
    playerBar.position.set(p.x, 2.28, p.z);
    playerBar.visible = p.alive && !overviewOn;
  }

  function swordOffset(p) {
    let d = (p.blade || 0) - p.facing;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function fitBlade(mesh, mul) {
    const half = mesh.geometry.parameters.depth * 0.5;
    const desired = bladeBaseZ + (SWORD.reach - bladeBaseZ) * mul;
    mesh.scale.z = mul;
    mesh.position.z = desired - half * mul;
  }

  function sampleBlade(px, pz, facing, off) {
    const sx = player.position.x;
    const sz = player.position.z;
    const sy = player.rotation.y;
    const so = swordPivot.rotation.y;
    player.position.x = px;
    player.position.z = pz;
    player.rotation.y = facing;
    swordPivot.rotation.y = off;
    player.updateMatrixWorld(true);
    const half = blade.geometry.parameters.depth * 0.5;
    _bladeBase.set(0, 0, -half);
    _bladeTip.set(0, 0, half);
    blade.localToWorld(_bladeBase);
    blade.localToWorld(_bladeTip);
    const out = {
      bx: _bladeBase.x, by: _bladeBase.y, bz: _bladeBase.z,
      tx: _bladeTip.x, ty: _bladeTip.y, tz: _bladeTip.z,
    };
    player.position.x = sx;
    player.position.z = sz;
    player.rotation.y = sy;
    swordPivot.rotation.y = so;
    player.updateMatrixWorld(true);
    return out;
  }

  function wrapAng(d) {
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function cr1(a, b, c, d, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  }

  function pushArcPoint(px, pz, ang, baseR, tipR, baseY, tipY, t) {
    trailSamples.push({
      px, pz, ang, baseR, tipR, baseY, tipY, t,
      bx: px + Math.sin(ang) * baseR,
      by: baseY,
      bz: pz + Math.cos(ang) * baseR,
      tx: px + Math.sin(ang) * tipR,
      ty: tipY,
      tz: pz + Math.cos(ang) * tipR,
    });
    if (trailSamples.length > TRAIL_MAX) trailSamples.shift();
  }

  function updateRibbon(stepDt) {
    const p = gamePlayer;
    trailTime += stepDt;
    if (p && p.alive && p.swinging && !overviewOn) {
      if (!trailSwing) {
        trailSamples.length = 0;
        trailSwing = true;
        trailPrev = null;
      }
      const ends = sampleBlade(p.x, p.z, p.facing, swordOffset(p));
      const cur = {
        x: p.x,
        z: p.z,
        ang: p.blade || p.facing,
        baseR: Math.hypot(ends.bx - p.x, ends.bz - p.z),
        tipR: Math.hypot(ends.tx - p.x, ends.tz - p.z),
        baseY: ends.by,
        tipY: ends.ty,
        t: trailTime,
      };
      if (!trailPrev) {
        pushArcPoint(cur.x, cur.z, cur.ang, cur.baseR, cur.tipR, cur.baseY, cur.tipY, cur.t);
      } else {
        const dAng = wrapAng(cur.ang - trailPrev.ang);
        const steps = Math.max(1, Math.ceil(Math.abs(dAng) / ARC_STEP));
        if (steps > 1) lastArc = { steps, dAng, segGap: Math.abs(dAng) / steps };
        for (let i = 1; i <= steps; i++) {
          const k = i / steps;
          pushArcPoint(
            trailPrev.x + (cur.x - trailPrev.x) * k,
            trailPrev.z + (cur.z - trailPrev.z) * k,
            trailPrev.ang + dAng * k,
            trailPrev.baseR + (cur.baseR - trailPrev.baseR) * k,
            trailPrev.tipR + (cur.tipR - trailPrev.tipR) * k,
            trailPrev.baseY + (cur.baseY - trailPrev.baseY) * k,
            trailPrev.tipY + (cur.tipY - trailPrev.tipY) * k,
            trailPrev.t + (cur.t - trailPrev.t) * k,
          );
        }
      }
      trailPrev = cur;
    } else if (!p || !p.swinging) {
      trailSwing = false;
      trailPrev = null;
    }
    while (trailSamples.length && trailTime - trailSamples[0].t > TRAIL_LIFE) trailSamples.shift();
    const src = trailSamples;
    const nSrc = src.length;
    ribbonDraw.length = 0;
    if (nSrc < 2 || overviewOn) {
      ribbon.visible = false;
      return;
    }
    const unAng = [src[0].ang];
    for (let i = 1; i < nSrc; i++) unAng.push(unAng[i - 1] + wrapAng(src[i].ang - src[i - 1].ang));
    const subs = 3;
    for (let i = 0; i < nSrc - 1; i++) {
      const i0 = Math.max(0, i - 1);
      const i1 = i;
      const i2 = i + 1;
      const i3 = Math.min(nSrc - 1, i + 2);
      const count = i === nSrc - 2 ? subs : subs - 1;
      for (let s = 0; s <= count; s++) {
        const t = s / subs;
        const ang = cr1(unAng[i0], unAng[i1], unAng[i2], unAng[i3], t);
        const px = cr1(src[i0].px, src[i1].px, src[i2].px, src[i3].px, t);
        const pz = cr1(src[i0].pz, src[i1].pz, src[i2].pz, src[i3].pz, t);
        const baseR = cr1(src[i0].baseR, src[i1].baseR, src[i2].baseR, src[i3].baseR, t);
        const tipR = cr1(src[i0].tipR, src[i1].tipR, src[i2].tipR, src[i3].tipR, t);
        const baseY = cr1(src[i0].baseY, src[i1].baseY, src[i2].baseY, src[i3].baseY, t);
        const tipY = cr1(src[i0].tipY, src[i1].tipY, src[i2].tipY, src[i3].tipY, t);
        const stamp = src[i1].t + (src[i2].t - src[i1].t) * t;
        ribbonDraw.push({
          ang, px, pz, tipR, baseR, t: stamp,
          bx: px + Math.sin(ang) * baseR,
          by: baseY,
          bz: pz + Math.cos(ang) * baseR,
          tx: px + Math.sin(ang) * tipR,
          ty: tipY,
          tz: pz + Math.cos(ang) * tipR,
        });
        if (ribbonDraw.length >= TRAIL_MAX) break;
      }
      if (ribbonDraw.length >= TRAIL_MAX) break;
    }
    const n = ribbonDraw.length;
    if (n < 2) {
      ribbon.visible = false;
      return;
    }
    ribbon.visible = true;
    const glow = Math.min(1.65, 0.45 + Math.abs((p && p.omega) || 0) / 9);
    for (let i = 0; i < n; i++) {
      const s = ribbonDraw[i];
      const age = (trailTime - s.t) / TRAIL_LIFE;
      const fade = Math.max(0, 1 - age);
      const along = fade * fade;
      const o = i * 6;
      trailPos[o] = s.bx;
      trailPos[o + 1] = s.by;
      trailPos[o + 2] = s.bz;
      trailPos[o + 3] = s.tx;
      trailPos[o + 4] = s.ty;
      trailPos[o + 5] = s.tz;
      trailAlpha[i * 2] = along * 0.55 * glow;
      trailAlpha[i * 2 + 1] = along * 0.95 * glow;
    }
    ribbonGeo.attributes.position.needsUpdate = true;
    ribbonGeo.attributes.alpha.needsUpdate = true;
    ribbonGeo.setDrawRange(0, (n - 1) * 6);
    ribbonGeo.computeBoundingSphere();
  }

  let gameEnemies = [];
  let gamePlayer = null;
  let gameRef = null;

  function syncExtras() {
    const p = gamePlayer;
    const g = gameRef;
    if (!p || !g) return;
    const skills = p.skills || {};
    const nOrbit = skills.orbit || 0;
    for (let i = 0; i < orbitBlades.length; i++) {
      const m = orbitBlades[i];
      m.visible = i < nOrbit && p.alive && !overviewOn;
      if (!m.visible) continue;
      const a = p.orbitAng + (i / nOrbit) * Math.PI * 2;
      m.position.set(p.x + Math.sin(a) * 1.28, 0.95, p.z + Math.cos(a) * 1.28);
      m.rotation.y = a;
    }
    const dual = skills.dual || 0;
    dualBlade.visible = dual > 0 && p.drawn && p.alive && !overviewOn;
    if (dualBlade.visible) {
      const mul = (p.reach || SWORD.reach) / SWORD.reach;
      dualBlade.scale.z = mul;
      const ang = p.blade + Math.PI;
      const mid = bladeBaseZ + (SWORD.reach - bladeBaseZ) * mul * 0.5;
      dualBlade.position.set(p.x + Math.sin(ang) * mid, 0.98, p.z + Math.cos(ang) * mid);
      dualBlade.rotation.y = ang;
    }
    const spinLv = skills.spin || 0;
    spinMesh.visible = spinLv > 0 && p.alive && !overviewOn;
    if (spinMesh.visible) {
      const ang = p.spinAng || 0;
      const reach = (p.reach || SWORD.reach) * 0.72;
      spinMesh.position.set(p.x + Math.sin(ang) * reach * 0.5, 0.9, p.z + Math.cos(ang) * reach * 0.5);
      spinMesh.rotation.y = ang;
      spinMesh.scale.z = 0.7 + spinLv * 0.12;
    }
    const posts = skills.barrier || 0;
    for (let i = 0; i < postMeshes.length; i++) {
      const m = postMeshes[i];
      m.visible = i < posts && p.alive && !overviewOn;
      if (!m.visible) continue;
      const a = -p.orbitAng * 0.65 + (i / posts) * Math.PI * 2;
      m.position.set(p.x + Math.sin(a) * 2.15, 0.42, p.z + Math.cos(a) * 2.15);
    }
    const b = p.boom;
    boomMesh.visible = !!(b && p.alive && !overviewOn);
    if (b && boomMesh.visible) {
      boomMesh.position.set(b.x, 0.85, b.z);
      boomMesh.rotation.y = b.ang;
    }
    const orbs = g.orbs || [];
    for (let i = 0; i < orbMeshes.length; i++) {
      const m = orbMeshes[i];
      const o = orbs[i];
      m.visible = !!(o && !overviewOn);
      if (o) {
        m.position.set(o.x, 0.45 + Math.sin(gameRef.time * 4 + o.id) * 0.06, o.z);
        m.rotation.y = gameRef.time * 2;
      }
    }
    const shots = g.shots || [];
    for (let i = 0; i < shotMeshes.length; i++) {
      const m = shotMeshes[i];
      const s = shots[i];
      m.visible = !!(s && !overviewOn);
      if (s) {
        m.position.set(s.x, 0.7, s.z);
        m.scale.setScalar(s.r / 0.28);
      }
    }
  }

  function animate(realDt, paused) {
    const dt = hold || paused ? 0 : realDt;
    const flashDt = hold ? 0 : realDt;
    syncExtras();
    updateRibbon(dt);

    const ps = playerSquash;
    playerSquashV += (-ps * 140 - playerSquashV * 14) * (dt || flashDt);
    playerSquash += playerSquashV * (dt || flashDt);
    if (playerSquash < 0) playerSquash = 0;
    playerStretch = Math.max(0, playerStretch - (dt || flashDt) * 4.5);
    const sq = JUICE.squashStretch ? playerSquash : 0;
    const st = JUICE.squashStretch ? playerStretch : 0;
    bodyGroup.scale.set(1 + sq * 0.14 - st * 0.16, 1 - sq * 0.08 + st * 0.04, 1 - sq * 0.22 + st * 0.38);

    playerFlashT = Math.max(0, playerFlashT - flashDt);
    if (playerFlashT > 0) {
      playerMat.emissive.set("#fff6ea");
      playerMat.emissiveIntensity = 1;
    } else {
      playerMat.emissive.copy(playerRestEmissive);
      playerMat.emissiveIntensity = 0.35;
    }

    for (const rec of enemies.values()) {
      rec.flashT = Math.max(0, rec.flashT - flashDt);
      rec.flash.visible = rec.flashT > 0;
      if (!paused && !hold) {
        rec.squashV += (-rec.squash * 150 - rec.squashV * 13) * realDt;
        rec.squash += rec.squashV * realDt;
        const spd = rec._spd || 0;
        const prev = rec._prevSpd || 0;
        if (prev > 4.4 && spd < prev * 0.62 && rec.root.visible) {
          emit(rec.root.position.x, rec.root.position.z, 0, 1, 8, 3.2, 0.22, 0.22, "dust");
        }
        rec._prevSpd = spd;
      }
      if (rec.squash < 0) rec.squash = 0;
      let s = JUICE.squashStretch ? rec.squash : 0;
      if (rec._wind) s = Math.max(s, 0.45);
      const stretch = rec._charge ? 0.35 : 0;
      const face = s > 0.08 || rec._charge ? rec.hitAngle : rec._move || 0;
      if (rec._charge) rec.hitAngle = rec._move || rec.hitAngle;
      rec.spin.rotation.y = face;
      rec.spin.scale.set(1 + s * 0.28 - stretch * 0.2, 1 + s * 0.22 - stretch * 0.08, 1 - s * 0.42 + stretch);
      if (rec.popping > 0) {
        rec.popping -= dt || flashDt;
        const u = Math.max(0, rec.popping / 0.12);
        rec.root.scale.setScalar(u);
        rec.flash.visible = true;
        if (rec.popping <= 0) rec._drop = true;
      }
    }
    for (const [id, rec] of enemies) {
      if (!rec._drop) continue;
      scene.remove(rec.root);
      rec.body.material.dispose();
      enemies.delete(id);
    }

    for (let i = 0; i < sparks.length; i++) {
      const s = sparks[i];
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.life <= 0) {
        s.mesh.visible = false;
        continue;
      }
      s.vy -= dt * (s.kind === "dust" ? 8 : 16);
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      if (s.y < 0.08 && s.vy < 0) {
        s.y = 0.08;
        s.vy *= -0.2;
        s.vx *= 0.55;
        s.vz *= 0.55;
      }
      s.vx *= 1 - Math.min(1, dt * 1.6);
      s.vz *= 1 - Math.min(1, dt * 1.6);
      s.mesh.position.set(s.x, s.y, s.z);
      s.mesh.quaternion.copy(camera.quaternion);
      const u = Math.max(0, s.life / s.max);
      s.mesh.scale.setScalar(s.size * (0.7 + 0.3 * u));
      s.mesh.material.opacity = u;
    }

    for (let i = 0; i < rings.length; i++) {
      const slot = rings[i];
      if (slot.life <= 0) continue;
      slot.life -= dt;
      if (slot.life <= 0) {
        slot.g.visible = false;
        continue;
      }
      const u = 1 - slot.life / slot.max;
      const radius = 0.28 + u * (0.85 + slot.power * 0.95);
      for (let b = 0; b < slot.bits.length; b++) {
        const a = (b / slot.bits.length) * Math.PI * 2;
        slot.bits[b].position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
      }
      slot.mat.opacity = Math.max(0, 1 - u);
    }

    for (let i = 0; i < nums.length; i++) {
      const n = nums[i];
      if (n.life <= 0) continue;
      n.life -= flashDt;
      if (n.life <= 0) {
        n.mesh.visible = false;
        continue;
      }
      n.y += n.vy * flashDt;
      n.vy *= 1 - Math.min(1, flashDt * 2);
      n.mesh.position.set(n.x, n.y, n.z);
      n.mesh.quaternion.copy(camera.quaternion);
      n.mesh.material.opacity = Math.max(0, n.life / n.max);
    }

    if (killLife > 0) {
      killLife -= flashDt;
      killLight.intensity = Math.max(0, (killLife / 0.16) * 18);
    } else killLight.intensity = 0;

    chroma = Math.max(0, chroma - flashDt * 9);
    grade = Math.max(0, grade - flashDt * 8);
    pixelPass.pixelatedMaterial.uniforms.uChroma.value = chroma;
    pixelPass.pixelatedMaterial.uniforms.uFlash.value = grade;

    trauma = Math.max(0, trauma - realDt * (paused ? 0.6 : 1.7));
    const shake = JUICE.screenShake ? trauma * trauma : 0;
    const sx = (Math.random() * 2 - 1) * shake * 0.55;
    const sz = (Math.random() * 2 - 1) * shake * 0.55;
    const roll = (Math.random() * 2 - 1) * shake * 0.02;

    const springDt = realDt;
    if (!Number.isFinite(kickX) || !Number.isFinite(kickZ)) kickX = kickZ = kickVX = kickVZ = 0;
    kickVX += (-kickX * 70 - kickVX * 11) * springDt;
    kickVZ += (-kickZ * 70 - kickVZ * 11) * springDt;
    kickX += kickVX * springDt;
    kickZ += kickVZ * springDt;
    const km = Math.hypot(kickX, kickZ);
    if (km > 0.4) {
      kickX *= 0.4 / km;
      kickZ *= 0.4 / km;
    }

    const px = player.position.x;
    const pz = player.position.z;
    const lerp = 1 - Math.exp(-CAMERA.follow * realDt);
    followX += (px - followX) * lerp;
    followZ += (pz - followZ) * lerp;

    if (overviewOn) {
      const aspect = window.innerWidth / window.innerHeight;
      const half = 84;
      overview.top = half;
      overview.bottom = -half;
      overview.left = -half * aspect;
      overview.right = half * aspect;
      overview.position.set(0, 220, 0);
      overview.lookAt(0, 0, 0);
      overview.updateProjectionMatrix();
      sun.position.set(40, 90, 24);
      sun.target.position.set(0, 0, 0);
      sun.shadow.camera.left = -90;
      sun.shadow.camera.right = 90;
      sun.shadow.camera.top = 90;
      sun.shadow.camera.bottom = -90;
      sun.shadow.camera.updateProjectionMatrix();
      pixelPass.subpixelX = 0;
      pixelPass.subpixelY = 0;
      pixelPass.camera = overview;
      pixelPass.render(renderer);
      pixelPass.camera = camera;
      return;
    }

    const camX = followX + sx + (JUICE.cameraKick ? kickX : 0);
    const camZ = followZ - CAMERA.back + sz + (JUICE.cameraKick ? kickZ : 0);
    camera.up.set(0, 1, 0);
    camera.position.set(camX, CAMERA.height, camZ);
    _look.set(followX + sx * 0.35, 0.4, followZ + sz * 0.35);
    camera.lookAt(_look);
    camera.updateMatrixWorld(true);

    const dist = Math.max(0.01, camera.position.distanceTo(_look));
    const rw = Math.max(1, pixelPass.renderResolution.x);
    const rh = Math.max(1, pixelPass.renderResolution.y);
    const worldH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5) * dist;
    const py = worldH / rh;
    const pxw = worldH * camera.aspect / rw;
    const el = camera.matrixWorld.elements;
    _right.set(el[0], el[1], el[2]);
    _up.set(el[4], el[5], el[6]);
    _rel.copy(_look).sub(camera.position);
    const lx = _rel.dot(_right);
    const ly = _rel.dot(_up);
    const ex = Math.round(lx / pxw) * pxw - lx;
    const ey = Math.round(ly / py) * py - ly;
    _shift.copy(_right).multiplyScalar(ex).addScaledVector(_up, ey);
    camera.position.add(_shift);
    _look.add(_shift);
    camera.up.set(0, 1, 0);
    camera.lookAt(_look);
    camera.rotateZ(roll);
    pixelPass.subpixelX = ex / pxw;
    pixelPass.subpixelY = ey / py;

    sun.position.set(followX + 28, 52, followZ + 18);
    sun.target.position.set(followX, 0, followZ);
    sun.shadow.camera.left = -extent;
    sun.shadow.camera.right = extent;
    sun.shadow.camera.top = extent;
    sun.shadow.camera.bottom = -extent;
    sun.shadow.camera.updateProjectionMatrix();

    for (const rec of enemies.values()) {
      rec.bar.quaternion.copy(camera.quaternion);
    }
    playerBar.quaternion.copy(camera.quaternion);

    if (JUICE.targetReticle) {
      let best = null;
      let bestD = 4.2;
      const list = gameEnemies;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        const d = Math.hypot(e.x - aim.x, e.z - aim.z);
        const reach = 3.1 + e.r;
        if (d < bestD && d < reach) {
          bestD = d;
          best = e;
        }
      }
      if (best) {
        reticle.visible = true;
        reticle.position.set(best.x, 0, best.z);
        const sc = (best.r * 2 + 0.55) / 1;
        reticle.scale.set(sc, 1, sc);
      } else reticle.visible = false;
    } else reticle.visible = false;

    pixelPass.camera = camera;
    pixelPass.render(renderer);
  }

  const mapCanvas = document.getElementById("minimap");
  const mapCtx = mapCanvas ? mapCanvas.getContext("2d") : null;
  const MAP_SIZE = 312;
  if (mapCanvas) {
    mapCanvas.width = MAP_SIZE;
    mapCanvas.height = MAP_SIZE;
  }
  const ENEMY_DOT = {
    grunt: ["#e03636", 3],
    skitter: ["#ff7a55", 2],
    swarm: ["#ffb15a", 2],
    splitter: ["#c43b3b", 3],
    shield: ["#f0c7b4", 3],
    brute: ["#7a1414", 5],
    charger: ["#ff9a3c", 3],
    lobber: ["#d46a5a", 3],
    elite: ["#ffe08a", 5],
    boss: ["#fff6ea", 7],
  };

  function worldToMap(x, z) {
    const b = world.bounds;
    const u = (x - b.minX) / (b.maxX - b.minX);
    const v = (b.maxZ - z) / (b.maxZ - b.minZ);
    return { x: 2 + u * (MAP_SIZE - 4), y: 2 + v * (MAP_SIZE - 4) };
  }

  function mapToWorld(px, py) {
    const b = world.bounds;
    const u = (px - 2) / (MAP_SIZE - 4);
    const v = (py - 2) / (MAP_SIZE - 4);
    return {
      x: b.minX + u * (b.maxX - b.minX),
      z: b.maxZ - v * (b.maxZ - b.minZ),
    };
  }

  function drawMinimap() {
    if (!mapCtx) return;
    mapCanvas.style.display = overviewOn ? "none" : "block";
    if (overviewOn || !gameRef) return;
    const ctx = mapCtx;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#3a342e";
    ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
    const boxes = world.boxes;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      const col = (b.color || "#5c5f63").toLowerCase();
      ctx.fillStyle = col === "#a66b4f" ? "#a66b4f" : (b.h > 4.5 ? "#4a4d51" : "#6e7276");
      const rot = b.rotY || 0;
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      const hx = b.w / 2;
      const hz = b.d / 2;
      const corners = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]];
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const wx = b.x + corners[k][0] * c - corners[k][1] * s;
        const wz = b.z + corners[k][0] * s + corners[k][1] * c;
        const pt = worldToMap(wx, wz);
        if (k === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();
      ctx.fill();
    }
    const orbs = gameRef.orbs || [];
    ctx.fillStyle = "#ffe08a";
    for (let i = 0; i < orbs.length; i++) {
      const pt = worldToMap(orbs[i].x, orbs[i].z);
      ctx.fillRect(pt.x - 1, pt.y - 1, 2, 2);
    }
    const list = gameRef.enemies;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.alive) continue;
      const spec = ENEMY_DOT[e.type] || ENEMY_DOT.grunt;
      const pt = worldToMap(e.x, e.z);
      const sz = spec[1];
      const left = Math.round(pt.x - sz / 2);
      const top = Math.round(pt.y - sz / 2);
      ctx.fillStyle = spec[0];
      ctx.fillRect(left, top, sz, sz);
      if (e.type === "elite" || e.type === "boss") {
        ctx.strokeStyle = "#1a1816";
        ctx.lineWidth = 1;
        ctx.strokeRect(left - 1, top - 1, sz + 2, sz + 2);
      }
    }
    if (gamePlayer && gamePlayer.alive) {
      const pt = worldToMap(gamePlayer.x, gamePlayer.z);
      ctx.fillStyle = "#2f6bff";
      ctx.fillRect(Math.round(pt.x - 2), Math.round(pt.y - 2), 4, 4);
    }
  }

  function ribbonStats() {
    let maxGap = 0;
    let maxDev = 0;
    for (let i = 1; i < ribbonDraw.length; i++) {
      maxGap = Math.max(maxGap, Math.abs(wrapAng(ribbonDraw[i].ang - ribbonDraw[i - 1].ang)));
    }
    for (let i = 0; i < ribbonDraw.length; i++) {
      const s = ribbonDraw[i];
      const r = Math.hypot(s.tx - s.px, s.tz - s.pz);
      maxDev = Math.max(maxDev, Math.abs(r - s.tipR));
    }
    return { samples: ribbonDraw.length, maxGap, maxDev, step: ARC_STEP, lastArc };
  }

  function present(game, realDt, paused) {
    gameRef = game;
    gameEnemies = game.enemies;
    gamePlayer = game.player;
    syncActors(game);
    animate(realDt, paused);
    drawMinimap();
  }

  function basis() {
    const cam = overviewOn ? overview : camera;
    cam.updateMatrixWorld(true);
    const e = cam.matrixWorld.elements;
    let rx = e[0];
    let rz = e[2];
    let fx = e[4];
    let fz = e[6];
    let fl = Math.hypot(fx, fz);
    if (fl < 1e-3) {
      cam.getWorldDirection(_fwd);
      fx = _fwd.x;
      fz = _fwd.z;
      fl = Math.hypot(fx, fz) || 1;
    }
    let rl = Math.hypot(rx, rz);
    if (rl < 1e-3) {
      rx = fz;
      rz = -fx;
      rl = Math.hypot(rx, rz) || 1;
    }
    return { fx: fx / fl, fz: fz / fl, rx: rx / rl, rz: rz / rl };
  }

  function groundPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    if (overviewOn) {
      _ray.setFromCamera(_ndc, overview);
    } else {
      // Aim from a camera locked to the player, so follow smoothing and
      // shake never steer the sword. A still cursor keeps a still blade.
      aimCam.aspect = camera.aspect;
      aimCam.fov = camera.fov;
      aimCam.position.set(player.position.x, CAMERA.height, player.position.z - CAMERA.back);
      aimCam.up.set(0, 1, 0);
      aimCam.lookAt(player.position.x, 0.4, player.position.z);
      aimCam.updateProjectionMatrix();
      aimCam.updateMatrixWorld(true);
      _ray.setFromCamera(_ndc, aimCam);
    }
    const hit = _ray.ray.intersectPlane(_plane, _aim);
    if (!hit) return { x: aim.x, z: aim.z };
    aim.x = _aim.x;
    aim.z = _aim.z;
    return aim;
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    aimCam.aspect = camera.aspect;
    aimCam.updateProjectionMatrix();
    pixelPass.setSize(renderer.domElement.width, renderer.domElement.height);
  }

  function pixelInfo() {
    const rt = pixelPass.beautyRenderTarget;
    const buf = renderer.domElement;
    return {
      pixelSize: pixelPass.pixelSize,
      shadeSteps: PIXEL.shadeSteps,
      normalEdgeStrength: pixelPass.normalEdgeStrength,
      depthEdgeStrength: pixelPass.depthEdgeStrength,
      renderWidth: rt.width,
      renderHeight: rt.height,
      bufferWidth: buf.width,
      bufferHeight: buf.height,
      upscaleX: buf.width / rt.width,
      upscaleY: buf.height / rt.height,
      magFilter: rt.texture.magFilter,
      minFilter: rt.texture.minFilter,
      nearest: rt.texture.magFilter === THREE.NearestFilter && rt.texture.minFilter === THREE.NearestFilter,
    };
  }

  function projectPixel(x, y, z) {
    _proj.set(x, y, z);
    _proj.project(camera);
    const rw = pixelPass.renderResolution.x;
    const rh = pixelPass.renderResolution.y;
    return {
      x: (_proj.x * 0.5 + 0.5) * rw,
      y: (-_proj.y * 0.5 + 0.5) * rh,
    };
  }

  function setOverview(on) {
    overviewOn = on;
    player.visible = !on;
    reticle.visible = !on;
  }

  function flashing() {
    let n = 0;
    for (const rec of enemies.values()) if (rec.flash.visible) n++;
    return n;
  }

  function swordProbe() {
    player.updateMatrixWorld(true);
    const half = blade.geometry.parameters.depth * 0.5;
    _bladeBase.set(0, 0, -half);
    _bladeTip.set(0, 0, half);
    blade.localToWorld(_bladeBase);
    blade.localToWorld(_bladeTip);
    const tip = { x: _bladeTip.x, y: _bladeTip.y, z: _bladeTip.z };
    const base = { x: _bladeBase.x, y: _bladeBase.y, z: _bladeBase.z };
    let ribbonTip = tip;
    const drawnTip = ribbonDraw.length ? ribbonDraw[ribbonDraw.length - 1] : (trailSamples.length ? trailSamples[trailSamples.length - 1] : null);
    if (drawnTip) ribbonTip = { x: drawnTip.tx, y: drawnTip.ty, z: drawnTip.tz };
    const dx = tip.x - player.position.x;
    const dz = tip.z - player.position.z;
    return { base, tip, ribbonTip, tipDist: Math.hypot(dx, dz) };
  }

  function reset() {
    for (const rec of enemies.values()) {
      scene.remove(rec.root);
      rec.body.material.dispose();
    }
    enemies.clear();
    for (const s of sparks) {
      s.life = 0;
      s.mesh.visible = false;
    }
    for (const slot of rings) {
      slot.life = 0;
      slot.g.visible = false;
    }
    for (const n of nums) {
      n.life = 0;
      n.mesh.visible = false;
    }
    trauma = 0;
    kickX = kickZ = kickVX = kickVZ = 0;
    killLife = 0;
    chroma = 0;
    grade = 0;
    playerFlashT = 0;
    trailSamples.length = 0;
    ribbonDraw.length = 0;
    trailSwing = false;
    trailPrev = null;
    ribbon.visible = false;
    playerSquash = 0;
    playerStretch = 0;
  }

  resize();
  return {
    applyEvents,
    present,
    basis,
    groundPoint,
    resize,
    setOverview,
    flashing,
    swordProbe,
    ribbonStats,
    worldToMap,
    mapToWorld,
    reset,
    camera,
    pixelInfo,
    projectPixel,
    setHold(v) { hold = v; },
    get aim() { return aim; },
  };
}
