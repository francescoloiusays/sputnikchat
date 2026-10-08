// =====================================================================
//  L'ISOLA FANTASMA
//  Laguna notturna, isola con rovine basse, cimitero, villaggio con
//  botteghe, ponte di legno e castello con l'Arena dei duelli.
// =====================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ELEMENTS } from './shared/catalog.js';
import { FireSet, makeSconce, makeBrazier, Gallery, makeWindow } from './decor.js';

// --- LAYOUT (metri) ---
export const WORLD = {
    MIN_X: -180, MAX_X: 180, MIN_Z: -200, MAX_Z: 160, SEG: 200,
    MAIN: { x: 0, z: 20, r: 74 },
    ISLET: { x: 0, z: -104, r: 34 },
    CASTLE: { x: 0, z: -104, half: 19, base: 3.2, wallH: 6.5 },
    ARENA: { x: 0, z: -100, r: 7.5, top: 3.55 },
    BRIDGE: { x: 0, z0: -33, z1: -79, w: 3.4 },
    PLAZA: { x: 0, z: 14, r: 11, h: 1.5 },
    SPAWN: { x: 0, z: 32 },
    SHOPS: {
        forgia: { x: -21, z: 10, ry: Math.PI / 2, h: 1.6 },
        sartoria: { x: 21, z: 10, ry: -Math.PI / 2, h: 1.6 },
        bazar: { x: 17, z: 36, ry: -Math.PI / 2, h: 1.5 },
    },
    MIRROR: { x: 13, z: 2 },
    CEMETERY: { x: -33, z: 40 },
    PATH: [[0, 92], [0, 32], [0, 14], [0, -33]],
    SIDE_PATHS: [[[0, 14], [-17, 10]], [[0, 14], [17, 10]], [[0, 32], [13, 36]], [[0, 32], [-26, 40]]],
};

// --- RUMORE ---
function hash(x, y) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}
function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
export function fbm(x, y, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }
export function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

function distSeg(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
export function pathDist(x, z) {
    let d = Infinity;
    const P = WORLD.PATH;
    for (let i = 0; i < P.length - 1; i++) d = Math.min(d, distSeg(x, z, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]));
    for (const [a, b] of WORLD.SIDE_PATHS) d = Math.min(d, distSeg(x, z, a[0], a[1], b[0], b[1]) + 0.6);
    return d;
}

function islandMask(x, z) {
    const M = WORLD.MAIN, I = WORLD.ISLET;
    const ax = x - M.x, az = z - M.z, a = Math.atan2(az, ax);
    const rM = M.r * (1 + 0.12 * Math.sin(a * 3 + 1.3) + 0.08 * Math.sin(a * 5 + 0.4) + 0.05 * Math.sin(a * 9));
    const bx = x - I.x, bz = z - I.z;
    const rI = I.r * (1 + 0.07 * Math.sin(Math.atan2(bz, bx) * 4 + 0.7));
    return Math.max(1 - Math.hypot(ax, az) / rM, 1 - Math.hypot(bx, bz) / rI);
}

function computeHeight(x, z) {
    const m = islandMask(x, z);
    let base;
    if (m < -0.15) base = Math.max(-9, -1.6 + (m + 0.15) * 30);
    else base = -1.6 + smooth(-0.15, 0.32, m) * 2.5;
    const hills = (fbm(x * 0.022, z * 0.022) * 0.5 + 0.5) * 4.6 * smooth(0.18, 0.62, m) + fbm(x * 0.09 + 7, z * 0.09) * 0.35 * smooth(0.05, 0.3, m);
    let h = base + hills;
    // sentieri più dolci
    const pd = pathDist(x, z);
    h = lerp(h, base + 0.35 + hills * 0.25, (1 - smooth(2.5, 7, pd)) * smooth(0.0, 0.25, m));
    // piazza e botteghe
    const P = WORLD.PLAZA;
    h = lerp(h, P.h, 1 - smooth(P.r, P.r + 9, Math.hypot(x - P.x, z - P.z)));
    for (const s of Object.values(WORLD.SHOPS)) h = lerp(h, s.h, 1 - smooth(6, 11, Math.hypot(x - s.x, z - s.z)));
    h = lerp(h, 1.7, 1 - smooth(8, 14, Math.hypot(x - WORLD.CEMETERY.x, z - WORLD.CEMETERY.z)) * 0.6);
    // altopiano del castello
    const C = WORLD.CASTLE;
    const dq = Math.pow(Math.pow(Math.abs(x - C.x), 4) + Math.pow(Math.abs(z - C.z), 4), 0.25);
    h = lerp(h, C.base, 1 - smooth(25, 31, dq));
    return h;
}

// --- TEXTURE PROCEDURALI ---
function canvasTex(w, h, draw, srgb = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
}
export function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
    return canvasTex(128, 128, (g) => {
        const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, inner); gr.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.5)')); gr.addColorStop(1, outer);
        g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    });
}


// --- CIELO (stesso gradiente viola/arancio dell'originale) ---
export function makeSky() {
    const g = new THREE.Group();
    const mat = new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: {
            top: { value: new THREE.Color('#0b001a') }, mid: { value: new THREE.Color('#2d0a45') },
            low: { value: new THREE.Color('#751e5e') }, hor: { value: new THREE.Color('#ffaa00') },
        },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; }`,
        fragmentShader: `uniform vec3 top, mid, low, hor; varying vec3 vDir;
            void main(){ float y = vDir.y;
              vec3 c = mix(hor, low, smoothstep(-0.02, 0.10, y));
              c = mix(c, mid, smoothstep(0.08, 0.35, y));
              c = mix(c, top, smoothstep(0.3, 0.85, y));
              c = mix(c, mid * 0.6, smoothstep(0.0, -0.3, y));
              gl_FragColor = vec4(c, 1.0);
              #include <tonemapping_fragment>
              #include <colorspace_fragment>
            }`,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mat);
    dome.renderOrder = -10;
    g.add(dome);
    // stelle
    const n = 1400, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const r = rng(42);
    for (let i = 0; i < n; i++) {
        const th = r() * Math.PI * 2, y = 0.12 + r() * 0.88, rad = Math.sqrt(1 - y * y);
        pos.set([Math.cos(th) * rad * 850, y * 850, Math.sin(th) * rad * 850], i * 3);
        const w = 0.6 + r() * 0.4;
        col.set([w, w * (0.85 + r() * 0.15), w * (0.8 + r() * 0.2)], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, fog: false, transparent: true, opacity: 0.9, depthWrite: false })));
    // luna
    const moonTex = canvasTex(256, 256, (c) => {
        const gr = c.createRadialGradient(128, 128, 30, 128, 128, 128);
        gr.addColorStop(0, 'rgba(255,240,220,1)'); gr.addColorStop(0.36, 'rgba(255,230,210,1)');
        gr.addColorStop(0.4, 'rgba(255,200,230,0.35)'); gr.addColorStop(1, 'rgba(160,80,200,0)');
        c.fillStyle = gr; c.fillRect(0, 0, 256, 256);
        c.fillStyle = 'rgba(180,160,170,0.35)';
        for (const [x, y, rr] of [[110, 110, 12], [145, 135, 9], [120, 150, 7], [150, 105, 6]]) { c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.fill(); }
    });
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, fog: false, depthWrite: false, transparent: true }));
    moon.scale.set(170, 170, 1);
    moon.position.copy(MOON_DIR).multiplyScalar(800);
    g.add(moon);
    g.userData.moon = moon;
    return g;
}
export const MOON_DIR = new THREE.Vector3(-0.32, 0.42, -1).normalize();

// --- ACQUA DELLA LAGUNA ---
export function makeWaterMaterial(heightTex, bounds) {
    return new THREE.ShaderMaterial({
        transparent: true, fog: true,
        uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
            uTime: { value: 0 },
            uDeep: { value: new THREE.Color('#0d0618') }, uShallow: { value: new THREE.Color('#2a1d3c') },
            uSky: { value: new THREE.Color('#3a1458') }, uHor: { value: new THREE.Color('#c65a3a') },
            uMoon: { value: MOON_DIR.clone() },
            uHeight: { value: heightTex || null }, uHasH: { value: heightTex ? 1 : 0 },
            uBounds: { value: new THREE.Vector4(...(bounds || [0, 0, 1, 1])) },
        }]),
        vertexShader: `
            varying vec3 vW;
            #include <fog_pars_vertex>
            void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
            }`,
        fragmentShader: `
            uniform float uTime, uHasH; uniform vec3 uDeep, uShallow, uSky, uHor, uMoon; uniform sampler2D uHeight; uniform vec4 uBounds;
            varying vec3 vW;
            #include <fog_pars_fragment>
            float wv(vec2 p, vec2 d, float f, float s){ return sin(dot(p, d) * f + uTime * s); }
            void main(){
              vec2 p = vW.xz;
              float e = 0.0; vec2 grad = vec2(0.0);
              vec2 D[4]; D[0]=normalize(vec2(1.0,0.3)); D[1]=normalize(vec2(-0.6,1.0)); D[2]=normalize(vec2(0.2,-1.0)); D[3]=normalize(vec2(-1.0,-0.4));
              float F[4]; F[0]=0.35; F[1]=0.6; F[2]=1.3; F[3]=2.1;
              for(int i=0;i<4;i++){ float c = cos(dot(p, D[i]) * F[i] + uTime * (0.6 + float(i)*0.35)); grad += D[i] * F[i] * c * (0.06 / (1.0 + float(i))); }
              vec3 N = normalize(vec3(-grad.x, 1.0, -grad.y));
              vec3 V = normalize(cameraPosition - vW);
              float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
              vec3 R = reflect(-V, N);
              vec3 sky = mix(uHor, uSky, smoothstep(0.0, 0.35, R.y));
              float spec = pow(max(dot(R, uMoon), 0.0), 120.0) * 1.6;
              float h = -6.0;
              if (uHasH > 0.5) { vec2 uv = (p - uBounds.xy) / (uBounds.zw - uBounds.xy); h = texture2D(uHeight, uv).r * 16.0 - 8.0; if(uv.x<0.0||uv.y<0.0||uv.x>1.0||uv.y>1.0) h = -8.0; }
              float shallow = smoothstep(-2.5, 0.0, h);
              vec3 base = mix(uDeep, uShallow, shallow);
              vec3 col = mix(base, sky, 0.18 + 0.55 * fres) + vec3(1.0, 0.92, 0.85) * spec;
              float foam = smoothstep(-0.35, 0.0, h) * (0.55 + 0.45 * sin(uTime * 1.6 + h * 18.0 + p.x * 0.4));
              col += vec3(0.55, 0.45, 0.65) * foam * 0.35;
              gl_FragColor = vec4(col, mix(0.94, 0.55, shallow));
              #include <tonemapping_fragment>
              #include <colorspace_fragment>
              #include <fog_fragment>
            }`,
    });
}

// Box con UV proporzionali alle dimensioni (texture muro senza stiramenti)
function wallBox(w, h, d, tile = 2.6) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
        const k = f * 4 + i;
        uv.setXY(k, uv.getX(k) * dims[f][0] / tile, uv.getY(k) * dims[f][1] / tile);
    }
    return g;
}
function place(g, x, y, z, ry = 0, rx = 0, rz = 0) {
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz)).setPosition(x, y, z));
    return g;
}

// =====================================================================
export class World {
    constructor(scene, opts = {}) {
        this.scene = scene;
        this.quality = opts.quality || 'alta';
        this.colliders = [];
        this.cameraBlockers = [];
        this.interactables = [];
        this.animated = [];
        this.lights = [];
        this.flames = [];
        this.t = 0;
        const L = new THREE.TextureLoader();
        const load = (p, rep) => { const t = L.load(p); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep, rep); t.anisotropy = 4; return t; };
        this.texWall = load('./muro.jpg');
        this.texFloor = load('./pavimento.jpg');
        this.matWall = new THREE.MeshStandardMaterial({ map: this.texWall, roughness: 0.95, color: '#c9c0d6' });
        this.matStone = new THREE.MeshStandardMaterial({ color: '#5d5866', roughness: 0.92 });
        this.matWood = new THREE.MeshStandardMaterial({ color: '#3d2a1c', roughness: 0.9 });
        this.matDark = new THREE.MeshStandardMaterial({ color: '#0d0a10', roughness: 1 });
        this.matRoof = new THREE.MeshStandardMaterial({ color: '#2a2036', roughness: 0.85, flatShading: true });
        this.glowTex = glowTexture();
        this.fires = new FireSet();
        this.gallery = new Gallery();

        this.buildHeights();
        this.buildLights();
        this.buildTerrain();
        this.buildWater();
        this.buildPlaza();
        this.buildNature();
        this.buildRuins();
        this.buildCemetery();
        this.buildShops();
        this.buildBridge();
        this.buildCastle();
        this.buildDock();
        this.buildWisps();
        this.buildMapImage();
    }

    // --- ALTEZZE ---
    buildHeights() {
        const { MIN_X, MAX_X, MIN_Z, MAX_Z, SEG } = WORLD;
        const n = SEG + 1;
        this.n = n; this.cw = (MAX_X - MIN_X) / SEG; this.cd = (MAX_Z - MIN_Z) / SEG;
        this.H = new Float32Array(n * n);
        for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) this.H[iz * n + ix] = computeHeight(MIN_X + ix * this.cw, MIN_Z + iz * this.cd);
        const B = WORLD.BRIDGE;
        this.bridgeH0 = this.terrainAt(B.x, B.z0);
        this.bridgeH1 = this.terrainAt(B.x, B.z1);
    }
    terrainAt(x, z) {
        const { MIN_X, MIN_Z } = WORLD, n = this.n;
        const fx = (x - MIN_X) / this.cw, fz = (z - MIN_Z) / this.cd;
        if (fx < 0 || fz < 0 || fx >= n - 1 || fz >= n - 1) return -9;
        const ix = Math.floor(fx), iz = Math.floor(fz), u = fx - ix, v = fz - iz;
        const a = this.H[iz * n + ix], d = this.H[iz * n + ix + 1], b = this.H[(iz + 1) * n + ix], c = this.H[(iz + 1) * n + ix + 1];
        return u + v <= 1 ? a + (d - a) * u + (b - a) * v : c + (b - c) * (1 - u) + (d - c) * (1 - v);
    }
    bridgeDeck(z) {
        const B = WORLD.BRIDGE;
        const t = (z - B.z0) / (B.z1 - B.z0);
        return lerp(this.bridgeH0, this.bridgeH1, t) + Math.sin(Math.PI * t) * 1.4 + 0.12;
    }
    onBridge(x, z) {
        const B = WORLD.BRIDGE;
        return Math.abs(x - B.x) < B.w / 2 && z <= B.z0 + 0.5 && z >= B.z1 - 0.5;
    }
    // Altezza del suolo (terreno, ponte, piattaforme calpestabili)
    groundAt(x, z, feetY = 1e9, step = 0.55) {
        let h = this.terrainAt(x, z);
        if (this.onBridge(x, z)) { const d = this.bridgeDeck(z); if (d <= feetY + step + 0.3) h = Math.max(h, d); }
        for (const c of this.colliders) {
            if (c.y1 > feetY + step || c.noWalk) continue;
            if (this.inside(c, x, z, 0)) h = Math.max(h, c.y1);
        }
        return h;
    }
    inside(c, x, z, r) {
        const dx = x - c.x, dz = z - c.z;
        if (c.type === 'circ') return dx * dx + dz * dz < (c.r + r) * (c.r + r);
        const lx = dx * c.cos + dz * c.sin, lz = -dx * c.sin + dz * c.cos;
        return Math.abs(lx) < c.hw + r && Math.abs(lz) < c.hd + r;
    }
    // Spinge fuori dai collider (cerchio di raggio r ai piedi feetY)
    collide(pos, r, feetY, height = 1.8, step = 0.55) {
        for (const c of this.colliders) {
            if (c.y1 <= feetY + step && !c.noWalk) continue;
            if (feetY >= c.y1 - 0.02 || feetY + height <= c.y0) continue;
            const dx = pos.x - c.x, dz = pos.z - c.z;
            if (c.type === 'circ') {
                const d = Math.hypot(dx, dz), m = c.r + r;
                if (d < m && d > 1e-5) { pos.x = c.x + dx / d * m; pos.z = c.z + dz / d * m; }
                continue;
            }
            const lx = dx * c.cos + dz * c.sin, lz = -dx * c.sin + dz * c.cos;
            const cx = Math.max(-c.hw, Math.min(c.hw, lx)), cz = Math.max(-c.hd, Math.min(c.hd, lz));
            let ox = lx - cx, oz = lz - cz;
            const d = Math.hypot(ox, oz);
            let nlx, nlz;
            if (d > 1e-5) {
                if (d >= r) continue;
                nlx = cx + ox / d * r; nlz = cz + oz / d * r;
            } else {
                const px = c.hw - Math.abs(lx), pz = c.hd - Math.abs(lz);
                if (px < pz) { nlx = Math.sign(lx || 1) * (c.hw + r); nlz = lz; } else { nlx = lx; nlz = Math.sign(lz || 1) * (c.hd + r); }
            }
            pos.x = c.x + nlx * c.cos - nlz * c.sin;
            pos.z = c.z + nlx * c.sin + nlz * c.cos;
        }
        // acqua profonda = confine invisibile
        if (!this.onBridge(pos.x, pos.z) && this.terrainAt(pos.x, pos.z) < -1.1) return false;
        return true;
    }
    addBox(x, z, w, d, y0, y1, ry = 0, opts = {}) {
        this.colliders.push({ type: 'box', x, z, hw: w / 2, hd: d / 2, cos: Math.cos(ry), sin: Math.sin(ry), y0, y1, ...opts });
    }
    addCirc(x, z, r, y0, y1, opts = {}) { this.colliders.push({ type: 'circ', x, z, r, y0, y1, ...opts }); }

    // --- LUCI ---
    buildLights() {
        const s = this.scene;
        s.add(new THREE.HemisphereLight('#6a4a9a', '#1a1022', 0.85));
        s.add(new THREE.AmbientLight('#2a1838', 0.5));
        const moon = this.moonLight = new THREE.DirectionalLight('#b8b0ff', 0.9);
        moon.position.copy(MOON_DIR).multiplyScalar(60);
        if (this.quality === 'alta') {
            moon.castShadow = true;
            moon.shadow.mapSize.set(2048, 2048);
            const c = moon.shadow.camera; c.left = c.bottom = -32; c.right = c.top = 32; c.near = 1; c.far = 160;
            moon.shadow.bias = -0.0008; moon.shadow.normalBias = 0.03;
        }
        s.add(moon); s.add(moon.target);
    }
    // Fuoco procedurale (lo stesso del castello). (x, y, z) è il centro della fiamma.
    // opts.wall = rotazione del muro → torcia a muro con staffa; opts.cup = coppa di ferro sotto la fiamma.
    addTorch(x, y, z, light = false, scale = 1.1, opts = {}) {
        if (opts.wall != null) {
            const s = makeSconce(this.fires);
            s.scale.setScalar(scale);
            s.position.set(x, y - 0.65 * scale, z); s.rotation.y = opts.wall;
            this.scene.add(s);
            this.flames.push({ glow: s.userData.glow, sp: 2 + Math.random() * 3 });
        } else {
            const fire = this.fires.make(scale);
            fire.position.set(x, y - scale * 0.42, z);
            this.scene.add(fire);
            if (opts.cup) {
                const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * scale, 0.09 * scale, 0.14 * scale, 10), new THREE.MeshStandardMaterial({ color: '#2a2628', metalness: 0.85, roughness: 0.45 }));
                cup.position.set(x, y - scale * 0.46, z); cup.castShadow = true;
                this.scene.add(cup);
            }
            const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: '#ff7a1a', transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
            glow.position.set(x, y, z); glow.scale.set(scale * 2.6, scale * 2.6, 1);
            this.scene.add(glow);
            this.flames.push({ glow, sp: 2 + Math.random() * 3 });
        }
        // poche luci vere (costano), il resto è solo bagliore
        if (light && this.lights.length < (this.quality === 'alta' ? 12 : 5)) {
            const l = new THREE.PointLight('#ff7a2a', 26, 18, 1.5);
            const out = opts.wall != null ? 0.7 : 0;
            l.position.set(x + Math.sin(opts.wall || 0) * out, y + 0.3, z + Math.cos(opts.wall || 0) * out);
            this.scene.add(l);
            this.lights.push({ l, base: 26, sp: 3 + Math.random() * 3 });
        }
    }
    addTorchPost(x, z, light, h = 2.2) {
        const y = this.terrainAt(x, z);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, h, 6), this.matWood);
        post.position.set(x, y + h / 2, z); post.castShadow = true;
        this.scene.add(post);
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.12, 0.2, 8), new THREE.MeshStandardMaterial({ color: '#2a2a2a', metalness: 0.7, roughness: 0.4 }));
        bowl.position.set(x, y + h, z);
        this.scene.add(bowl);
        this.addTorch(x, y + h + 0.42, z, light, 1.1);
        this.addCirc(x, z, 0.2, y, y + h);
    }

    // --- TERRENO ---
    buildTerrain() {
        const { MIN_X, MIN_Z } = WORLD, n = this.n;
        const pos = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3), uv = new Float32Array(n * n * 2);
        const C = {
            deep: new THREE.Color('#140b1e'), sand: new THREE.Color('#4a4038'), mud: new THREE.Color('#362c25'),
            g1: new THREE.Color('#2f3a26'), g2: new THREE.Color('#3a3150'), rock: new THREE.Color('#58525f'), path: new THREE.Color('#5c4b3a'),
        };
        const c = new THREE.Color(), tmp = new THREE.Color();
        for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
            const i = iz * n + ix, x = MIN_X + ix * this.cw, z = MIN_Z + iz * this.cd, h = this.H[i];
            pos.set([x, h, z], i * 3);
            uv.set([x / 4, z / 4], i * 2);
            const hx = this.H[iz * n + Math.min(n - 1, ix + 1)] - h, hz = this.H[Math.min(n - 1, iz + 1) * n + ix] - h;
            const slope = Math.hypot(hx, hz) / this.cw;
            if (h < -0.4) c.copy(C.deep).lerp(C.sand, smooth(-3.5, -0.4, h));
            else if (h < 0.6) c.copy(C.sand).lerp(C.mud, smooth(-0.4, 0.6, h));
            else {
                c.copy(C.g1).lerp(C.g2, smooth(-0.3, 0.5, fbm(x * 0.05, z * 0.05)));
                c.lerp(C.mud, smooth(0.6, 1.2, -h + 1.2) * 0.5);
            }
            c.lerp(C.rock, smooth(0.45, 0.9, slope));
            c.lerp(C.path, (1 - smooth(1.6, 3.2, pathDist(x, z))) * smooth(0, 0.5, h) * 0.85);
            const j = 0.92 + hash(ix, iz) * 0.16;
            tmp.copy(c).multiplyScalar(j);
            col.set([tmp.r, tmp.g, tmp.b], i * 3);
        }
        const idx = [];
        for (let iz = 0; iz < n - 1; iz++) for (let ix = 0; ix < n - 1; ix++) {
            const a = iz * n + ix, d = a + 1, b = a + n, cc = b + 1;
            idx.push(a, b, d, b, cc, d);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        g.setIndex(idx);
        g.computeVertexNormals();
        const detail = canvasTex(256, 256, (cx, w, h) => {
            const img = cx.createImageData(w, h);
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                const v = 200 + (fbm(x * 0.06, y * 0.06, 3) * 40 + (hash(x, y) - 0.5) * 36);
                const k = (y * w + x) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255;
            }
            cx.putImageData(img, 0, 0);
        });
        detail.wrapS = detail.wrapT = THREE.RepeatWrapping;
        const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, map: detail }));
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.terrain = mesh;
        // heightmap per l'acqua (schiuma e bassi fondali)
        const data = new Uint8Array(n * n);
        for (let i = 0; i < n * n; i++) data[i] = Math.max(0, Math.min(255, (this.H[i] + 8) / 16 * 255));
        this.heightTex = new THREE.DataTexture(data, n, n, THREE.RedFormat, THREE.UnsignedByteType);
        this.heightTex.magFilter = this.heightTex.minFilter = THREE.LinearFilter;
        this.heightTex.needsUpdate = true;
    }

    buildWater() {
        const { MIN_X, MAX_X, MIN_Z, MAX_Z } = WORLD;
        this.waterMat = makeWaterMaterial(this.heightTex, [MIN_X, MIN_Z, MAX_X, MAX_Z]);
        const w = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), this.waterMat);
        w.rotation.x = -Math.PI / 2;
        w.position.y = 0;
        w.renderOrder = 1;
        this.scene.add(w);
        // nebbia bassa sulla laguna
        const mistTex = canvasTex(128, 128, (g) => {
            const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
            gr.addColorStop(0, 'rgba(200,170,230,0.5)'); gr.addColorStop(1, 'rgba(200,170,230,0)');
            g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
        });
        const r = rng(7);
        this.mist = [];
        for (let i = 0; i < 46; i++) {
            const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, opacity: 0.12 + r() * 0.1, depthWrite: false }));
            const a = r() * Math.PI * 2, d = 50 + r() * 110;
            s.position.set(Math.cos(a) * d, 0.8 + r() * 1.5, -20 + Math.sin(a) * d);
            s.scale.set(26 + r() * 30, 7 + r() * 5, 1);
            this.scene.add(s);
            this.mist.push({ s, a, d, sp: (r() - 0.5) * 0.01 });
        }
    }

    // --- PIAZZA, OBELISCO DELLA GLORIA, SPECCHIO ---
    buildPlaza() {
        const P = WORLD.PLAZA;
        const ft = this.texFloor.clone(); ft.needsUpdate = true; ft.repeat.set(6, 6);
        const plaza = new THREE.Mesh(new THREE.CircleGeometry(P.r, 48), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.9, color: '#a79db0' }));
        plaza.rotation.x = -Math.PI / 2; plaza.position.set(P.x, P.h + 0.03, P.z);
        plaza.receiveShadow = true;
        this.scene.add(plaza);
        // muretti bassi attorno alla piazza (con varchi)
        const geos = [];
        const segs = 14;
        for (let i = 0; i < segs; i++) {
            const a0 = i / segs * Math.PI * 2;
            if (i % 7 === 0 || i % 7 === 3 || (i % 7 === 5)) continue;
            const a = a0 + Math.PI / segs, R = P.r + 0.4;
            const x = P.x + Math.cos(a) * R, z = P.z + Math.sin(a) * R;
            const len = 2 * R * Math.sin(Math.PI / segs) * 0.92, h = 0.55 + hash(i, 3) * 0.35;
            geos.push(place(wallBox(len, h, 0.5), x, P.h + h / 2, z, -a + Math.PI / 2));
            this.addBox(x, z, len, 0.5, P.h - 1, P.h + h, -a + Math.PI / 2);
        }
        const walls = new THREE.Mesh(mergeGeometries(geos), this.matWall);
        walls.castShadow = walls.receiveShadow = true;
        this.scene.add(walls);
        // obelisco
        const ob = new THREE.Group();
        ob.position.set(P.x, P.h, P.z);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.95, 5.5, 4), this.matWall);
        shaft.rotation.y = Math.PI / 4; shaft.position.y = 3.05; shaft.castShadow = true;
        ob.add(shaft);
        const base = new THREE.Mesh(wallBox(2.6, 0.5, 2.6), this.matWall); base.position.y = 0.25; ob.add(base);
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), new THREE.MeshStandardMaterial({ color: '#ffcc33', emissive: '#ffaa00', emissiveIntensity: 2.2, roughness: 0.2 }));
        gem.position.y = 6.4; ob.add(gem);
        this.animated.push((dt, t) => { gem.rotation.y = t * 0.8; gem.position.y = 6.4 + Math.sin(t * 1.5) * 0.15; });
        // tabellone classifica (canvas)
        this.lbCanvas = document.createElement('canvas'); this.lbCanvas.width = 512; this.lbCanvas.height = 640;
        this.lbTex = new THREE.CanvasTexture(this.lbCanvas); this.lbTex.colorSpace = THREE.SRGBColorSpace;
        for (const s of [1, -1]) {
            const board = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.875), new THREE.MeshStandardMaterial({ map: this.lbTex, emissive: '#ffffff', emissiveMap: this.lbTex, emissiveIntensity: 0.55, roughness: 0.8 }));
            board.position.set(0, 2.6, s * 0.86); board.rotation.x = -s * 0.075; if (s < 0) board.rotation.y = Math.PI;
            ob.add(board);
        }
        this.setLeaderboard([]);
        this.scene.add(ob);
        this.addBox(P.x, P.z, 2.6, 2.6, P.h - 1, P.h + 6);
        this.interactables.push({ id: 'classifica', x: P.x, z: P.z + 2.6, r: 3.2, label: 'Leggi la Classifica Globale' });
        this.interactables.push({ id: 'classifica', x: P.x, z: P.z - 2.6, r: 3.2, label: 'Leggi la Classifica Globale' });
        // bracieri
        for (const [dx, dz] of [[6, 6], [-6, 6], [6, -6], [-6, -6]]) this.addTorchPost(P.x + dx, P.z + dz, dx === dz, 2.0);
        // specchio incantato (modifica aspetto)
        const Mi = WORLD.MIRROR, my = this.terrainAt(Mi.x, Mi.z);
        const mirror = new THREE.Group(); mirror.position.set(Mi.x, my, Mi.z); mirror.rotation.y = -2.2;
        const frame = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.09, 8, 32), new THREE.MeshStandardMaterial({ color: '#c99a2e', metalness: 0.9, roughness: 0.3 }));
        frame.scale.y = 1.45; frame.position.y = 1.55; mirror.add(frame);
        const glass = new THREE.Mesh(new THREE.CircleGeometry(0.74, 32), new THREE.MeshStandardMaterial({ color: '#9ab8ff', emissive: '#5a3aa8', emissiveIntensity: 0.9, metalness: 1, roughness: 0.05 }));
        glass.scale.y = 1.45; glass.position.set(0, 1.55, 0.01); mirror.add(glass);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.5, 6), frame.material); leg.position.y = 0.25; mirror.add(leg);
        this.animated.push((dt, t) => { glass.material.emissiveIntensity = 0.7 + Math.sin(t * 2) * 0.3; });
        this.scene.add(mirror);
        this.addCirc(Mi.x, Mi.z, 0.5, my, my + 2.6);
        this.interactables.push({ id: 'specchio', x: Mi.x - 1.2, z: Mi.z - 1.2, r: 2.8, label: "Specchiati: modifica l'aspetto" });
    }

    setLeaderboard(rows) {
        const g = this.lbCanvas.getContext('2d');
        const W = 512, H = 640;
        const gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, '#1a0f24'); gr.addColorStop(1, '#0b0610');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.strokeStyle = '#c99a2e'; g.lineWidth = 10; g.strokeRect(12, 12, W - 24, H - 24);
        g.textAlign = 'center'; g.fillStyle = '#f0d58a'; g.font = '700 54px Almendra, serif';
        g.fillText('Campioni', W / 2, 86);
        g.font = 'italic 28px Alegreya, serif'; g.fillStyle = '#c9b8e0'; g.fillText("dell'Arena", W / 2, 122);
        g.textAlign = 'left';
        const list = rows.slice(0, 7);
        if (!list.length) { g.textAlign = 'center'; g.fillStyle = '#887799'; g.font = 'italic 30px Alegreya, serif'; g.fillText('Nessun campione...', W / 2, 320); g.fillText('ancora.', W / 2, 360); }
        list.forEach((r, i) => {
            const y = 190 + i * 62;
            g.fillStyle = i === 0 ? '#ffd23a' : i === 1 ? '#d8d8e8' : i === 2 ? '#d08a4a' : '#a898c0';
            g.font = '700 34px Almendra, serif';
            g.fillText(`${i + 1}.`, 40, y);
            g.fillText(String(r.name).slice(0, 13), 100, y);
            g.textAlign = 'right'; g.font = '700 28px Cinzel, serif'; g.fillText(String(r.rating), W - 40, y); g.textAlign = 'left';
        });
        this.lbTex.needsUpdate = true;
    }

    // --- NATURA: alberi morti, rocce, canne ---
    buildNature() {
        const r = rng(1234);
        const okSpot = (x, z, minH = 0.6) => {
            const h = this.terrainAt(x, z);
            if (h < minH) return false;
            if (pathDist(x, z) < 4) return false;
            if (Math.hypot(x - WORLD.PLAZA.x, z - WORLD.PLAZA.z) < WORLD.PLAZA.r + 4) return false;
            for (const s of Object.values(WORLD.SHOPS)) if (Math.hypot(x - s.x, z - s.z) < 10) return false;
            if (Math.abs(x - WORLD.CASTLE.x) < 30 && Math.abs(z - WORLD.CASTLE.z) < 30) return false;
            if (Math.hypot(x - WORLD.CEMETERY.x, z - WORLD.CEMETERY.z) < 11) return false;
            if (Math.hypot(x - 30, z - 52) < 10) return false;
            if (Math.hypot(x - WORLD.MIRROR.x, z - WORLD.MIRROR.z) < 3) return false;
            return true;
        };
        // alberi morti (3 varianti)
        const makeTree = (seed) => {
            const rr = rng(seed), geos = [];
            const branch = (pos, dir, len, rad, depth) => {
                const g = new THREE.CylinderGeometry(rad * 0.62, rad, len, 5);
                g.translate(0, len / 2, 0);
                const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
                g.applyMatrix4(new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1)));
                geos.push(g);
                if (depth <= 0) return;
                const end = pos.clone().addScaledVector(dir, len);
                const k = depth >= 3 ? 3 : 2;
                for (let i = 0; i < k; i++) {
                    const nd = dir.clone().add(new THREE.Vector3((rr() - 0.5) * 1.6, rr() * 0.5 + 0.1, (rr() - 0.5) * 1.6)).normalize();
                    branch(end, nd, len * (0.55 + rr() * 0.2), rad * 0.6, depth - 1);
                }
            };
            branch(new THREE.Vector3(0, -0.3, 0), new THREE.Vector3((rr() - 0.5) * 0.25, 1, (rr() - 0.5) * 0.25).normalize(), 2.6 + rr(), 0.26, 4);
            return mergeGeometries(geos);
        };
        const treeMat = new THREE.MeshStandardMaterial({ color: '#2b2321', roughness: 1 });
        const variants = [makeTree(11), makeTree(23), makeTree(37)];
        const per = [[], [], []];
        let tries = 0;
        while (per[0].length + per[1].length + per[2].length < 95 && tries++ < 2000) {
            const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 62;
            const x = WORLD.MAIN.x + Math.cos(a) * d, z = WORLD.MAIN.z + Math.sin(a) * d;
            if (!okSpot(x, z, 0.8)) continue;
            per[Math.floor(r() * 3)].push([x, z, 0.75 + r() * 0.7, r() * Math.PI * 2]);
        }
        for (let i = 0; i < 6; i++) {
            const a = r() * Math.PI * 2, x = WORLD.ISLET.x + Math.cos(a) * 27, z = WORLD.ISLET.z + Math.sin(a) * 27;
            if (this.terrainAt(x, z) > 0.5 && (Math.abs(x) > 24 || Math.abs(z - WORLD.ISLET.z) > 24)) per[i % 3].push([x, z, 0.9, a]);
        }
        const m4 = new THREE.Matrix4();
        variants.forEach((g, vi) => {
            const list = per[vi];
            const im = new THREE.InstancedMesh(g, treeMat, list.length);
            list.forEach(([x, z, s, ry], i) => {
                const y = this.terrainAt(x, z);
                im.setMatrixAt(i, m4.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(s, s, s)));
                this.addCirc(x, z, 0.28 * s, y - 1, y + 6, { noWalk: true });
            });
            im.castShadow = true; im.receiveShadow = true;
            this.scene.add(im);
        });
        // rocce
        const rockG = new THREE.DodecahedronGeometry(1, 0);
        const rocks = [];
        tries = 0;
        while (rocks.length < 140 && tries++ < 3000) {
            const x = WORLD.MIN_X + r() * (WORLD.MAX_X - WORLD.MIN_X), z = WORLD.MIN_Z + r() * (WORLD.MAX_Z - WORLD.MIN_Z);
            const h = this.terrainAt(x, z);
            if (h < -1.2 || h > 5) continue;
            if (pathDist(x, z) < 3.5 || this.onBridge(x, z) || Math.abs(x) < 3 && z > 80) continue;
            if (Math.abs(x - WORLD.CASTLE.x) < 22 && Math.abs(z - WORLD.CASTLE.z) < 22) continue;
            if (h > 0.6 && !okSpot(x, z, 0.6)) continue;
            rocks.push([x, h, z, 0.3 + r() * (h < 0.4 ? 1.3 : 0.8)]);
        }
        const rim = new THREE.InstancedMesh(rockG, new THREE.MeshStandardMaterial({ color: '#4d4757', roughness: 0.95, flatShading: true }), rocks.length);
        rocks.forEach(([x, y, z, s], i) => {
            rim.setMatrixAt(i, m4.compose(new THREE.Vector3(x, y + s * 0.2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)), new THREE.Vector3(s * (1 + r() * 0.5), s * 0.65, s)));
            if (s > 0.75) this.addCirc(x, z, s * 0.9, y - 1, y + s * 0.75);
        });
        rim.castShadow = rim.receiveShadow = true;
        this.scene.add(rim);
        // canne della laguna
        const reeds = [];
        tries = 0;
        while (reeds.length < 700 && tries++ < 20000) {
            const x = WORLD.MIN_X + r() * (WORLD.MAX_X - WORLD.MIN_X), z = WORLD.MIN_Z + r() * (WORLD.MAX_Z - WORLD.MIN_Z);
            const h = this.terrainAt(x, z);
            if (h < -0.9 || h > 0.25 || this.onBridge(x, z) || Math.abs(x) < 4 && z > 84) continue;
            for (let k = 0; k < 4 && reeds.length < 700; k++) reeds.push([x + (r() - 0.5) * 1.2, h, z + (r() - 0.5) * 1.2, 0.7 + r() * 0.9]);
        }
        const reedG = new THREE.ConeGeometry(0.025, 1.4, 4); reedG.translate(0, 0.7, 0);
        const reedM = new THREE.InstancedMesh(reedG, new THREE.MeshStandardMaterial({ color: '#3a3a22', roughness: 1 }), reeds.length);
        reeds.forEach(([x, y, z, s], i) => reedM.setMatrixAt(i, m4.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4)), new THREE.Vector3(1, s, 1))));
        this.scene.add(reedM);
    }

    // --- ROVINE BASSE (cappella in rovina, cerchio di pietre) ---
    buildRuins() {
        const geos = [];
        const r = rng(99);
        const wall = (x, z, len, h, ry, th = 0.6) => {
            const y = this.terrainAt(x, z) - 0.3;
            geos.push(place(wallBox(len, h + 0.3, th), x, y + (h + 0.3) / 2, z, ry));
            this.addBox(x, z, len, th, y, y + h + 0.3, ry);
        };
        // cappella in rovina
        const cx = 30, cz = 52;
        const pieces = [
            [cx - 4.5, cz, 9, 1.6, Math.PI / 2], [cx + 4.5, cz - 2.5, 4, 2.2, Math.PI / 2], [cx + 4.5, cz + 4, 2.5, 0.9, Math.PI / 2],
            [cx - 2, cz - 6.5, 5, 1.2, 0], [cx + 3, cz - 6.5, 3, 0.7, 0], [cx, cz + 6.5, 9, 1.0, 0],
        ];
        for (const p of pieces) wall(...p);
        for (const [dx, dz] of [[-2.5, -2], [2.5, -2], [-2.5, 2], [2.5, 2]]) {
            const x = cx + dx, z = cz + dz, y = this.terrainAt(x, z), h = 1.2 + r() * 2.2;
            geos.push(place(new THREE.CylinderGeometry(0.35, 0.42, h, 8), x, y + h / 2, z));
            this.addCirc(x, z, 0.42, y, y + h);
        }
        const altarY = this.terrainAt(cx, cz + 4.5);
        geos.push(place(wallBox(2.2, 0.9, 1), cx, altarY + 0.45, cz + 4.5));
        this.addBox(cx, cz + 4.5, 2.2, 1, altarY - 0.5, altarY + 0.9);
        this.addTorch(cx, altarY + 1.3, cz + 4.5, true, 0.9, { cup: true });
        // muretti sparsi
        for (let i = 0; i < 26; i++) {
            const a = r() * Math.PI * 2, d = 22 + r() * 38;
            const x = WORLD.MAIN.x + Math.cos(a) * d, z = WORLD.MAIN.z + Math.sin(a) * d;
            if (this.terrainAt(x, z) < 0.8 || pathDist(x, z) < 4 || Math.hypot(x - WORLD.CEMETERY.x, z - WORLD.CEMETERY.z) < 12) continue;
            let skip = false;
            for (const s of Object.values(WORLD.SHOPS)) if (Math.hypot(x - s.x, z - s.z) < 9) skip = true;
            if (Math.hypot(x - cx, z - cz) < 10 || skip) continue;
            wall(x, z, 2 + r() * 4, 0.4 + r() * 0.9, r() * Math.PI);
        }
        // cerchio di pietre
        const sx = -40, sz = -6;
        for (let i = 0; i < 9; i++) {
            const a = i / 9 * Math.PI * 2, x = sx + Math.cos(a) * 6, z = sz + Math.sin(a) * 6;
            const y = this.terrainAt(x, z), h = 1.4 + r() * 1.6;
            geos.push(place(wallBox(1.0, h, 0.6), x, y + h / 2 - 0.2, z, -a + (r() - 0.5) * 0.3, (r() - 0.5) * 0.15));
            this.addBox(x, z, 1.0, 0.6, y - 0.5, y + h, -a);
        }
        const mesh = new THREE.Mesh(mergeGeometries(geos), this.matWall);
        mesh.castShadow = mesh.receiveShadow = true;
        this.scene.add(mesh);
        // runa al centro del cerchio
        const rune = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.5, 6), new THREE.MeshBasicMaterial({ color: '#7a4cff', transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
        rune.rotation.x = -Math.PI / 2; rune.position.set(sx, this.terrainAt(sx, sz) + 0.06, sz);
        this.scene.add(rune);
        this.animated.push((dt, t) => { rune.rotation.z = t * 0.3; rune.material.opacity = 0.45 + Math.sin(t * 1.7) * 0.25; });
    }

    // --- CIMITERO ---
    buildCemetery() {
        const C = WORLD.CEMETERY, r = rng(5);
        const stoneG = mergeGeometries([new THREE.BoxGeometry(0.7, 0.9, 0.18).translate(0, 0.45, 0), new THREE.CylinderGeometry(0.35, 0.35, 0.18, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(0, 0.9, 0)]);
        const crossG = mergeGeometries([new THREE.BoxGeometry(0.12, 1.2, 0.12).translate(0, 0.6, 0), new THREE.BoxGeometry(0.6, 0.12, 0.12).translate(0, 0.88, 0)]);
        const graves = [];
        for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
            if (r() < 0.15) continue;
            graves.push([C.x - 7.5 + i * 3 + (r() - 0.5) * 0.6, C.z - 4.5 + j * 3 + (r() - 0.5) * 0.6, r() < 0.35]);
        }
        const m4 = new THREE.Matrix4();
        const stones = graves.filter(g => !g[2]), crosses = graves.filter(g => g[2]);
        const mk = (geo_, mat, list) => {
            const im = new THREE.InstancedMesh(geo_, mat, list.length);
            list.forEach(([x, z], i) => {
                const y = this.terrainAt(x, z) - 0.05;
                im.setMatrixAt(i, m4.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.25, (r() - 0.5) * 0.4, (r() - 0.5) * 0.25)), new THREE.Vector3(1, 0.8 + r() * 0.4, 1)));
                this.addBox(x, z, 0.7, 0.3, y - 0.5, y + 1);
            });
            im.castShadow = true; im.receiveShadow = true;
            this.scene.add(im);
        };
        mk(stoneG, this.matStone, stones);
        mk(crossG, new THREE.MeshStandardMaterial({ color: '#3a3438', roughness: 0.9 }), crosses);
        // recinzione di ferro
        const posts = [];
        for (let i = 0; i <= 20; i++) {
            const t = i / 20;
            posts.push([C.x - 10 + t * 20, C.z - 7], [C.x - 10 + t * 20, C.z + 7]);
            if (i % 2 === 0 && i > 0 && i < 20) { posts.push([C.x - 10, C.z - 7 + t * 14], [C.x + 10, C.z - 7 + t * 14]); }
        }
        const pg = new THREE.ConeGeometry(0.04, 1.3, 4); pg.translate(0, 0.65, 0);
        const pim = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ color: '#1a1a1e', metalness: 0.7, roughness: 0.5 }), posts.length);
        posts.forEach(([x, z], i) => {
            if (Math.abs(x - C.x) < 1.6 && z > C.z) return pim.setMatrixAt(i, m4.makeScale(0, 0, 0));
            pim.setMatrixAt(i, m4.makeTranslation(x, this.terrainAt(x, z), z));
        });
        this.scene.add(pim);
        const fence = (x, z, w, d) => this.addBox(x, z, w, d, this.terrainAt(x, z) - 1, this.terrainAt(x, z) + 1.2, 0, { noWalk: true });
        fence(C.x, C.z - 7, 20, 0.15); fence(C.x - 10, C.z, 0.15, 14); fence(C.x + 10, C.z, 0.15, 14);
        fence(C.x - 5.8, C.z + 7, 8.4, 0.15); fence(C.x + 5.8, C.z + 7, 8.4, 0.15);
        this.addTorchPost(C.x - 2, C.z + 8, true, 1.8);
        this.addTorchPost(C.x + 2, C.z + 8, false, 1.8);
    }

    // --- BOTTEGHE ---
    buildShops() {
        const S = WORLD.SHOPS;
        const sign = (text, color) => canvasTex(512, 160, (g) => {
            g.fillStyle = '#2b1a10'; g.fillRect(0, 0, 512, 160);
            g.strokeStyle = '#c99a2e'; g.lineWidth = 8; g.strokeRect(6, 6, 500, 148);
            g.fillStyle = color; g.font = '700 70px Almendra, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.shadowColor = '#000'; g.shadowBlur = 8; g.fillText(text, 256, 84);
        });
        const building = (id, cfg, title, color) => {
            const grp = new THREE.Group();
            grp.position.set(cfg.x, cfg.h, cfg.z); grp.rotation.y = cfg.ry;
            const body = new THREE.Mesh(wallBox(7, 3.6, 6), this.matWall);
            body.position.y = 1.8; body.castShadow = body.receiveShadow = true; grp.add(body);
            const roof = new THREE.Mesh(new THREE.ConeGeometry(5.6, 2.8, 4), this.matRoof);
            roof.rotation.y = Math.PI / 4; roof.scale.set(1.12, 1, 0.95); roof.position.y = 5; roof.castShadow = true; grp.add(roof);
            const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.4, 0.1), this.matDark); door.position.set(0, 1.2, 3.01); grp.add(door);
            const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 0.2), this.matWood); frame.position.set(0, 2.5, 3.05); grp.add(frame);
            const board = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.875), new THREE.MeshStandardMaterial({ map: sign(title, color), emissive: '#fff', emissiveMap: null, emissiveIntensity: 0, roughness: 0.8 }));
            board.material.emissiveMap = board.material.map; board.material.emissiveIntensity = 0.35;
            board.position.set(0, 3.15, 3.12); grp.add(board);
            for (const s of [-1, 1]) {
                const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ color: '#ffb35a' }));
                win.position.set(s * 2.3, 1.9, 3.02); grp.add(win);
            }
            this.scene.add(grp);
            this.addBox(cfg.x, cfg.z, 7, 6, cfg.h - 1, cfg.h + 6, cfg.ry);
            this.cameraBlockers.push(body);
            const fx = cfg.x + Math.sin(cfg.ry) * 4.6, fz = cfg.z + Math.cos(cfg.ry) * 4.6;
            this.addTorch(cfg.x + Math.sin(cfg.ry) * 3.0 + Math.cos(cfg.ry) * 1.4, cfg.h + 2.4, cfg.z + Math.cos(cfg.ry) * 3.0 - Math.sin(cfg.ry) * 1.4, true, 1, { wall: cfg.ry });
            this.interactables.push({ id, x: fx, z: fz, r: 3.6, label: `Entra: ${title}` });
            return grp;
        };
        // Forgia
        const fg = building('forgia', S.forgia, 'Forgia', '#ff9a3a');
        const anvil = new THREE.Group();
        anvil.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.35), this.matStone).translateY(0.25));
        anvil.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.32), new THREE.MeshStandardMaterial({ color: '#2d2d33', metalness: 0.85, roughness: 0.35 })).translateY(0.6));
        anvil.position.set(2.2, 0, 4.2); fg.add(anvil);
        const coals = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.5, 10), this.matStone);
        coals.position.set(-2.3, 0.25, 4.2); fg.add(coals);
        const ember = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), new THREE.MeshBasicMaterial({ color: '#ff5a10' }));
        ember.rotation.x = -Math.PI / 2; ember.position.set(-2.3, 0.51, 4.2); fg.add(ember);
        this.animated.push((dt, t) => { ember.material.color.setHSL(0.04 + Math.sin(t * 3) * 0.01, 1, 0.45 + Math.sin(t * 7) * 0.08); });
        // Sartoria (manichino)
        const sg = building('sartoria', S.sartoria, 'Sartoria', '#d9a0ff');
        const man = new THREE.Group();
        man.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), this.matWood).translateY(0.55));
        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.4, 4, 10), new THREE.MeshStandardMaterial({ color: '#5a1a6e', roughness: 0.8 }));
        torso.position.y = 1.35; torso.scale.z = 0.6; man.add(torso);
        const capeM = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.1), new THREE.MeshStandardMaterial({ color: '#7a1018', side: THREE.DoubleSide }));
        capeM.position.set(0, 1.15, -0.16); man.add(capeM);
        man.position.set(2.3, 0, 4.0); sg.add(man);
        for (let i = 0; i < 3; i++) {
            const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.2, 12), new THREE.MeshStandardMaterial({ color: ['#3d1466', '#7a1018', '#1d2a6b'][i] }));
            roll.rotation.z = Math.PI / 2; roll.position.set(-2.2, 0.17 + i * 0.3, 4.1 - (i % 2) * 0.1); sg.add(roll);
        }
        // Bazar: bancarella aperta
        const B = S.bazar;
        const bz = new THREE.Group(); bz.position.set(B.x, B.h, B.z); bz.rotation.y = B.ry;
        for (const [px, pz] of [[-2.6, -1.6], [2.6, -1.6], [-2.6, 1.6], [2.6, 1.6]]) {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.8, 6), this.matWood);
            p.position.set(px, 1.4, pz); p.castShadow = true; bz.add(p);
        }
        const awn = canvasTex(256, 128, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#e8d6a8' : '#6b1a3a'; g.fillRect(i * 32, 0, 32, 128); } });
        const awning = new THREE.Mesh(new THREE.PlaneGeometry(6, 4, 1, 4), new THREE.MeshStandardMaterial({ map: awn, side: THREE.DoubleSide, roughness: 0.9 }));
        awning.rotation.x = -Math.PI / 2 + 0.25; awning.position.y = 2.9; awning.castShadow = true; bz.add(awning);
        const table = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.12, 1.2), this.matWood); table.position.set(0, 0.95, 1.1); bz.add(table);
        for (let i = 0; i < 5; i++) {
            const crate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: ['#c99a2e', '#7a4cff', '#2bdc6a', '#ff5a1f', '#cfe4ff'][i], roughness: 0.6, emissive: ['#3a2a00', '#20104a', '#003a10', '#3a1000', '#203040'][i] }));
            crate.position.set(-1.8 + i * 0.9, 1.21, 1.1); bz.add(crate);
        }
        for (let i = 0; i < 3; i++) {
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 12), this.matWood);
            barrel.position.set(-2 + i * 0.8, 0.45, -1.1); bz.add(barrel);
        }
        this.scene.add(bz);
        this.addBox(B.x, B.z, 5.6, 3.6, B.h - 1, B.h + 1.1, B.ry);
        this.addTorch(B.x + Math.sin(B.ry) * 1.69 + Math.cos(B.ry) * 2.6, B.h + 2.5, B.z + Math.cos(B.ry) * 1.69 - Math.sin(B.ry) * 2.6, true, 0.9, { wall: B.ry });
        this.interactables.push({ id: 'bazar', x: B.x + Math.sin(B.ry) * 3.6, z: B.z + Math.cos(B.ry) * 3.6, r: 3.8, label: 'Bazar: compra e vendi tra giocatori' });
        // lanterne lungo il sentiero
        const P = WORLD.PATH;
        for (let i = 0; i < P.length - 1; i++) {
            const [ax, az] = P[i], [bx, bzz] = P[i + 1];
            const len = Math.hypot(bx - ax, bzz - az), steps = Math.floor(len / 13);
            for (let k = 1; k < steps; k++) {
                const t = k / steps, x = ax + (bx - ax) * t, z = az + (bzz - az) * t;
                if (Math.hypot(x - WORLD.PLAZA.x, z - WORLD.PLAZA.z) < WORLD.PLAZA.r + 3) continue;
                this.addLantern(x + 2.4 * (k % 2 ? 1 : -1), z);
            }
        }
    }
    addLantern(x, z) {
        const y = this.terrainAt(x, z);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.2, 6), this.matWood);
        post.position.set(x, y + 1.1, z); post.castShadow = true; this.scene.add(post);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), new THREE.MeshStandardMaterial({ color: '#ffcf7a', emissive: '#ffa53a', emissiveIntensity: 2.5 }));
        lamp.position.set(x, y + 2.3, z); this.scene.add(lamp);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: '#ffb060', transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
        glow.position.copy(lamp.position); glow.scale.set(2.2, 2.2, 1); this.scene.add(glow);
        this.addCirc(x, z, 0.12, y, y + 2.4, { noWalk: true });
    }

    // --- PONTE ---
    buildBridge() {
        const B = WORLD.BRIDGE;
        const len = B.z0 - B.z1, n = Math.ceil(len / 0.6);
        const plankG = new THREE.BoxGeometry(B.w, 0.12, 0.52);
        const planks = new THREE.InstancedMesh(plankG, new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: 0.95 }), n);
        const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), r = rng(3);
        for (let i = 0; i < n; i++) {
            const z = B.z0 - (i + 0.5) * (len / n), y = this.bridgeDeck(z) - 0.06;
            const slope = (this.bridgeDeck(z - 0.3) - this.bridgeDeck(z + 0.3)) / 0.6;
            q.setFromEuler(new THREE.Euler(Math.atan(slope), (r() - 0.5) * 0.04, 0));
            planks.setMatrixAt(i, m4.compose(new THREE.Vector3(B.x, y, z), q, new THREE.Vector3(1, 1, 1)));
        }
        planks.castShadow = planks.receiveShadow = true;
        this.scene.add(planks);
        // pali, corrimano e pilastri
        const postG = new THREE.CylinderGeometry(0.08, 0.1, 1.1, 6);
        const pillarG = new THREE.CylinderGeometry(0.22, 0.28, 1, 8);
        const nPost = Math.ceil(len / 3) + 1;
        const posts = new THREE.InstancedMesh(postG, this.matWood, nPost * 2);
        const pillars = new THREE.InstancedMesh(pillarG, this.matWood, nPost * 2);
        const rails = [];
        let k = 0;
        for (let i = 0; i < nPost; i++) {
            const z = B.z0 - i * (len / (nPost - 1)), y = this.bridgeDeck(z);
            for (const s of [-1, 1]) {
                const x = B.x + s * (B.w / 2 - 0.05);
                posts.setMatrixAt(k, m4.makeTranslation(x, y + 0.5, z));
                const ground = Math.min(this.terrainAt(x, z), -0.5) - 1, ph = y - ground;
                pillars.setMatrixAt(k, m4.compose(new THREE.Vector3(x, ground + ph / 2, z), q.identity(), new THREE.Vector3(1, ph, 1)));
                k++;
            }
            if (i > 0) {
                const zp = B.z0 - (i - 1) * (len / (nPost - 1)), yp = this.bridgeDeck(zp);
                for (const s of [-1, 1]) {
                    const x = B.x + s * (B.w / 2 - 0.05);
                    const a = new THREE.Vector3(x, yp + 1.0, zp), b = new THREE.Vector3(x, y + 1.0, z);
                    const g = new THREE.BoxGeometry(0.1, 0.1, a.distanceTo(b));
                    g.lookAt(new THREE.Vector3().subVectors(b, a));
                    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
                    rails.push(g);
                    this.addBox(x, (zp + z) / 2, 0.25, Math.abs(z - zp), Math.min(y, yp) + 0.05, Math.max(y, yp) + 1.1, 0, { noWalk: true });
                }
            }
        }
        posts.castShadow = true;
        this.scene.add(posts, pillars);
        const railM = new THREE.Mesh(mergeGeometries(rails), this.matWood); railM.castShadow = true;
        this.scene.add(railM);
        for (const z of [B.z0, B.z1]) for (const s of [-1, 1]) this.addTorch(B.x + s * (B.w / 2 - 0.05), this.bridgeDeck(z) + 1.5, z, false, 0.8, { cup: true });
    }

    // --- CASTELLO E ARENA ---
    buildCastle() {
        const C = WORLD.CASTLE, A = WORLD.ARENA;
        const y0 = C.base, H = C.wallH, T = 1.6, hs = C.half;
        const geos = [];
        const wall = (x, z, w, d) => {
            geos.push(place(wallBox(w, H, d), x, y0 + H / 2, z));
            this.addBox(x, z, w, d, y0 - 2, y0 + H);
            // merli
            const along = w > d, n = Math.floor((along ? w : d) / 1.6);
            for (let i = 0; i < n; i++) {
                const t = (i + 0.5) / n - 0.5;
                const mx = along ? x + t * w : x, mz = along ? z : z + t * d;
                geos.push(place(wallBox(along ? 0.8 : T, 0.8, along ? T : 0.8), mx, y0 + H + 0.4, mz));
            }
        };
        const gate = 3.2;
        wall(C.x, C.z - hs, hs * 2, T);                       // nord
        wall(C.x - hs, C.z, T, hs * 2);                       // ovest
        wall(C.x + hs, C.z, T, hs * 2);                       // est
        const sw = hs - gate;
        wall(C.x - gate - sw / 2, C.z + hs, sw, T);           // sud (con portone)
        wall(C.x + gate + sw / 2, C.z + hs, sw, T);
        geos.push(place(wallBox(gate * 2, 1.8, T), C.x, y0 + H - 0.9, C.z + hs));
        // torri angolari
        const towerG = (r, h) => { const g = new THREE.CylinderGeometry(r, r * 1.08, h, 16); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * r * 6.28 / 2.6, uv.getY(i) * h / 2.6); return g; };
        const roofs = [];
        const tower = (x, z, r, h) => {
            geos.push(place(towerG(r, h), x, y0 + h / 2, z));
            roofs.push(place(new THREE.ConeGeometry(r * 1.25, r * 1.5, 16), x, y0 + h + r * 0.75, z));
            this.addCirc(x, z, r, y0 - 2, y0 + h);
            this.addTorch(x, y0 + h + r * 1.5 + 0.55, z, false, 1.6, { cup: true });
        };
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) tower(C.x + sx * hs, C.z + sz * hs, 3.2, 10.5);
        for (const sx of [-1, 1]) tower(C.x + sx * (gate + 1.4), C.z + hs + 0.6, 1.8, 8.6);
        // mastio
        geos.push(place(wallBox(12, 15, 10), C.x, y0 + 7.5, C.z - hs + 4.2));
        roofs.push(place(new THREE.ConeGeometry(8.6, 6, 4).rotateY(Math.PI / 4).scale(1, 1, 0.84), C.x, y0 + 18, C.z - hs + 4.2));
        this.addBox(C.x, C.z - hs + 4.2, 12, 10, y0 - 2, y0 + 15);
        const castleMesh = new THREE.Mesh(mergeGeometries(geos), this.matWall);
        castleMesh.castShadow = castleMesh.receiveShadow = true;
        this.scene.add(castleMesh);
        this.cameraBlockers.push(castleMesh);
        const roofMesh = new THREE.Mesh(mergeGeometries(roofs), this.matRoof);
        roofMesh.castShadow = true;
        this.scene.add(roofMesh);
        // finestre illuminate del mastio
        for (const [wx, wy] of [[-3, 6], [3, 6], [0, 10], [-3, 12], [3, 12]]) {
            const w = makeWindow(0.9, 1.6);
            w.position.set(C.x + wx, y0 + wy - 0.8, C.z - hs + 9.21); this.scene.add(w);
        }
        // cortile
        const ft = this.texFloor.clone(); ft.needsUpdate = true; ft.repeat.set(10, 10);
        const yard = new THREE.Mesh(new THREE.PlaneGeometry(hs * 2, hs * 2), new THREE.MeshStandardMaterial({ map: ft, color: '#9a90a8', roughness: 0.92 }));
        yard.rotation.x = -Math.PI / 2; yard.position.set(C.x, y0 + 0.02, C.z); yard.receiveShadow = true;
        this.scene.add(yard);
        // arena
        const at = this.texFloor.clone(); at.needsUpdate = true; at.repeat.set(4, 4);
        const arena = new THREE.Mesh(new THREE.CylinderGeometry(A.r, A.r + 0.2, A.top - y0, 48), [
            this.matWall, new THREE.MeshStandardMaterial({ map: at, color: '#b8aec8', roughness: 0.85 }), this.matWall]);
        arena.position.set(A.x, (A.top + y0) / 2, A.z); arena.receiveShadow = true;
        this.scene.add(arena);
        this.addCirc(A.x, A.z, A.r, y0 - 1, A.top);
        const runeTex = canvasTex(1024, 64, (g, w, h) => {
            g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h);
            g.fillStyle = '#ffffff'; g.font = '44px serif'; g.textBaseline = 'middle';
            const runes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ SPUTNIK ';
            let x = 6; let i = 0;
            while (x < w) { const ch = runes[i++ % runes.length]; g.fillText(ch, x, h / 2); x += g.measureText(ch).width + 6; }
        }, false);
        runeTex.wrapS = THREE.RepeatWrapping;
        const ring = new THREE.Mesh(new THREE.RingGeometry(A.r - 0.95, A.r - 0.3, 96, 1), new THREE.MeshBasicMaterial({ map: runeTex, color: '#b37aff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        const ruv = ring.geometry.attributes.uv, rp = ring.geometry.attributes.position;
        for (let i = 0; i < ruv.count; i++) {
            const x = rp.getX(i), y = rp.getY(i);
            ruv.setXY(i, (Math.atan2(y, x) / (Math.PI * 2) + 0.5) * 4, Math.hypot(x, y) > A.r - 0.6 ? 1 : 0);
        }
        ring.rotation.x = -Math.PI / 2; ring.position.set(A.x, A.top + 0.02, A.z);
        this.scene.add(ring);
        const inner = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.6, 6), new THREE.MeshBasicMaterial({ color: '#ffd23a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        inner.rotation.x = -Math.PI / 2; inner.position.set(A.x, A.top + 0.02, A.z);
        this.scene.add(inner);
        this.animated.push((dt, t) => {
            runeTex.offset.x = t * 0.02; ring.material.opacity = 0.65 + Math.sin(t * 2) * 0.25;
            inner.rotation.z = -t * 0.4; inner.material.opacity = 0.5 + Math.sin(t * 3) * 0.3;
        });
        // gradinate per gli spettatori
        const benchG = [];
        for (const s of [-1, 1]) for (let row = 0; row < 3; row++) {
            const x = A.x + s * (A.r + 3 + row * 1.2), h = 0.45 * (row + 1);
            benchG.push(place(wallBox(1.2, h, 12), x, y0 + h / 2, A.z));
            this.addBox(x, A.z, 1.2, 12, y0 - 1, y0 + h);
        }
        const benches = new THREE.Mesh(mergeGeometries(benchG), this.matWall);
        benches.castShadow = benches.receiveShadow = true;
        this.scene.add(benches);
        // stendardi
        const bannerTex = canvasTex(128, 320, (g) => {
            g.fillStyle = '#3d1466'; g.fillRect(0, 0, 128, 320);
            g.fillStyle = '#c99a2e'; g.fillRect(0, 0, 128, 14); g.fillRect(0, 296, 128, 24);
            g.beginPath(); g.moveTo(0, 300); g.lineTo(64, 320); g.lineTo(128, 300); g.fill();
            g.font = '900 76px "Cinzel Decorative", serif'; g.textAlign = 'center'; g.fillStyle = '#ffd23a'; g.fillText('S', 64, 120);
            g.strokeStyle = '#ffd23a'; g.lineWidth = 6;
            g.beginPath(); g.moveTo(30, 170); g.lineTo(98, 250); g.moveTo(98, 170); g.lineTo(30, 250); g.stroke();
        });
        const bannerM = new THREE.MeshStandardMaterial({ map: bannerTex, side: THREE.DoubleSide, roughness: 0.9 });
        const banner = (x, y, z, ry) => { const b = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.5), bannerM); b.position.set(x, y, z); b.rotation.y = ry; this.scene.add(b); this.animated.push((dt, t) => { b.rotation.x = Math.sin(t * 1.3 + x) * 0.04; }); };
        for (const s of [-1, 1]) banner(C.x + s * 6, y0 + H - 2, C.z + hs + T / 2 + 0.05, 0);
        for (const s of [-1, 1]) banner(C.x + s * (hs - T / 2 - 0.05), y0 + H - 2.2, A.z, s * -Math.PI / 2);
        // fuori dal portone restano le torce della laguna
        for (const s of [-1, 1]) this.addTorch(C.x + s * (gate + 0.6), y0 + 4.2, C.z + hs + T / 2, true, 1.3, { wall: 0 });
        // dentro il castello: bracieri di ferro attorno all'arena...
        for (const [dx, dz] of [[-A.r - 1, -A.r + 1], [A.r + 1, -A.r + 1], [-A.r - 1, A.r - 1], [A.r + 1, A.r - 1]]) {
            const x = A.x + dx, z = A.z + dz;
            const b = makeBrazier(this.fires, 1.9);
            b.position.set(x, y0, z);
            this.scene.add(b);
            if (dz < 0) this.addFireLight(x, y0 + 2.6, z, 30);
            this.addCirc(x, z, 0.35, y0, y0 + 2.2);
        }
        // ...e torce a muro
        const inX = hs - T / 2, inZn = C.z - hs + T / 2, inZs = C.z + hs - T / 2, keepZ = C.z - hs + 9.2;
        const sconce = (x, z, ry, light) => {
            const s = makeSconce(this.fires);
            s.position.set(x, y0 + 2.2, z); s.rotation.y = ry;
            this.scene.add(s);
            if (light) this.addFireLight(x + Math.sin(ry) * 0.7, y0 + 3, z + Math.cos(ry) * 0.7, 22);
        };
        for (const z of [C.z + 15, C.z - 7]) { sconce(C.x - inX, z, Math.PI / 2); sconce(C.x + inX, z, -Math.PI / 2); }
        for (const x of [9.6, 15.4]) for (const s of [-1, 1]) sconce(C.x + s * x, inZn, 0);
        for (const x of [5, 15]) for (const s of [-1, 1]) sconce(C.x + s * x, inZs, Math.PI);
        sconce(C.x - 3.6, keepZ, 0, true); sconce(C.x + 3.6, keepZ, 0);
        // quadri con i fotogrammi di Sputnik Homies
        const painting = (x, y, z, ry, w = 3.2) => {
            const p = this.gallery.make(w, { offset: this.gallery.paintings.length * 2.3 });
            p.position.set(x, y, z); p.rotation.y = ry;
            this.scene.add(p);
            const P = p.userData.painting;
            const fx = x + Math.sin(ry) * 2.2, fz = z + Math.cos(ry) * 2.2;
            this.interactables.push({ id: 'quadro', painting: P, x: fx, z: fz, r: 2.4, label: () => `Guarda su YouTube: ${this.gallery.current(P).title}` });
        };
        for (const z of [C.z + 9.5, C.z - 1.5]) { painting(C.x - inX + 0.02, y0 + 3.1, z, Math.PI / 2); painting(C.x + inX - 0.02, y0 + 3.1, z, -Math.PI / 2); }
        for (const s of [-1, 1]) painting(C.x + s * 12.5, y0 + 3.1, inZn + 0.02, 0);
        for (const s of [-1, 1]) painting(C.x + s * 10, y0 + 3.1, inZs - 0.02, Math.PI);
        painting(C.x, y0 + 3.3, keepZ + 0.02, 0, 5);
        this.interactables.push({ id: 'arena', x: A.x, z: A.z, r: A.r + 1.5, label: "Arena: sfida un giocatore o allenati col Fantasma" });
    }
    addFireLight(x, y, z, intensity) {
        if (this.lights.length >= (this.quality === 'alta' ? 12 : 5)) return;
        const l = new THREE.PointLight('#ff8a3a', intensity, 16, 1.5);
        l.position.set(x, y, z);
        this.scene.add(l);
        this.lights.push({ l, base: intensity, sp: 4 + Math.random() * 3 });
    }

    buildDock() {
        const x = 0, z0 = 86, z1 = 100, w = 2.6;
        const y = 0.65;
        const g = [];
        for (let z = z0; z < z1; z += 0.55) g.push(new THREE.BoxGeometry(w, 0.1, 0.48).translate(x, y, z));
        for (const s of [-1, 1]) for (let z = z0; z <= z1; z += 3.5) g.push(new THREE.CylinderGeometry(0.12, 0.14, 3, 6).translate(x + s * (w / 2), y - 1.2, z));
        const dock = new THREE.Mesh(mergeGeometries(g), this.matWood);
        dock.castShadow = dock.receiveShadow = true;
        this.scene.add(dock);
        this.addBox(x, (z0 + z1) / 2, w, z1 - z0 + 0.5, -3, y + 0.05);
        // barchetta
        const boat = new THREE.Group();
        const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.6, 3.6, 10, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ color: '#3a2618', side: THREE.DoubleSide, roughness: 0.9 }));
        hull.rotation.set(Math.PI / 2, 0, Math.PI); hull.scale.set(1, 1, 0.5);
        boat.add(hull);
        boat.position.set(x + 2.6, 0.15, z1 - 3); boat.rotation.y = 0.1;
        this.scene.add(boat);
        this.animated.push((dt, t) => { boat.position.y = 0.15 + Math.sin(t * 1.2) * 0.06; boat.rotation.z = Math.sin(t * 0.9) * 0.05; });
        this.addTorch(x - w / 2 - 0.1, y + 1.95, z1, true, 0.9, { cup: true });
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 6), this.matWood); pole.position.set(x - w / 2 - 0.1, y + 0.8, z1); this.scene.add(pole);
    }

    // --- FUOCHI FATUI ---
    buildWisps() {
        const r = rng(77);
        this.wisps = [];
        const colors = ['#7affd8', '#9a7aff', '#b8ff7a', '#7ac8ff'];
        for (let i = 0; i < 70; i++) {
            let x, z, h;
            const nearC = i < 18;
            for (let k = 0; k < 20; k++) {
                const a = r() * Math.PI * 2, d = nearC ? r() * 12 : 10 + r() * 120;
                x = (nearC ? WORLD.CEMETERY.x : 0) + Math.cos(a) * d; z = (nearC ? WORLD.CEMETERY.z : -10) + Math.sin(a) * d;
                h = this.terrainAt(x, z);
                if (h > -2) break;
            }
            const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: colors[i % 4], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 }));
            const sc = 0.35 + r() * 0.4; s.scale.set(sc, sc, 1);
            this.scene.add(s);
            this.wisps.push({ s, x, z, y: Math.max(h, 0) + 0.8 + r() * 2.2, a: r() * 6, sp: 0.3 + r() * 0.6, rad: 0.6 + r() * 2 });
        }
    }

    // --- MINIMAPPA (immagine di base) ---
    buildMapImage() {
        const S = 320;
        const c = document.createElement('canvas'); c.width = c.height = S;
        const g = c.getContext('2d');
        const img = g.createImageData(S, S);
        const { MIN_X, MAX_X, MIN_Z, MAX_Z } = WORLD;
        for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
            const x = MIN_X + (px + 0.5) / S * (MAX_X - MIN_X), z = MIN_Z + (py + 0.5) / S * (MAX_Z - MIN_Z);
            const h = this.terrainAt(x, z);
            let col;
            if (h < -2.5) col = [22, 10, 38];
            else if (h < 0) col = [42, 24, 64];
            else if (h < 0.5) col = [92, 78, 70];
            else { const k = Math.min(1, h / 6); col = [60 + k * 40, 70 + k * 20, 52 + k * 40]; }
            if (h > 0 && pathDist(x, z) < 1.8) col = [128, 104, 76];
            const k = (py * S + px) * 4;
            img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        const toPx = (x, z) => [(x - MIN_X) / (MAX_X - MIN_X) * S, (z - MIN_Z) / (MAX_Z - MIN_Z) * S];
        const C = WORLD.CASTLE;
        const [cx, cz] = toPx(C.x - C.half, C.z - C.half), cs = C.half * 2 / (MAX_X - MIN_X) * S;
        g.fillStyle = '#6a6278'; g.fillRect(cx, cz, cs, cs);
        g.fillStyle = '#3a3448'; g.fillRect(cx + 1.5, cz + 1.5, cs - 3, cs - 3);
        const [ax, az] = toPx(WORLD.ARENA.x, WORLD.ARENA.z);
        g.strokeStyle = '#b37aff'; g.lineWidth = 2; g.beginPath(); g.arc(ax, az, WORLD.ARENA.r / (MAX_X - MIN_X) * S, 0, Math.PI * 2); g.stroke();
        const B = WORLD.BRIDGE; const [b0x, b0z] = toPx(B.x, B.z0), [, b1z] = toPx(B.x, B.z1);
        g.fillStyle = '#7a5a3a'; g.fillRect(b0x - 1.5, b1z, 3, b0z - b1z);
        const [px_, pz_] = toPx(WORLD.PLAZA.x, WORLD.PLAZA.z);
        g.fillStyle = '#8a8090'; g.beginPath(); g.arc(px_, pz_, WORLD.PLAZA.r / (MAX_X - MIN_X) * S, 0, Math.PI * 2); g.fill();
        this.mapImage = c;
        this.mapToPx = (x, z, size) => [(x - MIN_X) / (MAX_X - MIN_X) * size, (z - MIN_Z) / (MAX_Z - MIN_Z) * size];
        this.mapMarkers = [
            { x: WORLD.SHOPS.forgia.x, z: WORLD.SHOPS.forgia.z, ic: 'anvil', label: 'Forgia' },
            { x: WORLD.SHOPS.sartoria.x, z: WORLD.SHOPS.sartoria.z, ic: 'needle', label: 'Sartoria' },
            { x: WORLD.SHOPS.bazar.x, z: WORLD.SHOPS.bazar.z, ic: 'scales', label: 'Bazar' },
            { x: WORLD.PLAZA.x, z: WORLD.PLAZA.z, ic: 'trophy', label: 'Albo dei Campioni' },
            { x: WORLD.ARENA.x, z: WORLD.ARENA.z, ic: 'swords', label: 'Arena' },
            { x: WORLD.CEMETERY.x, z: WORLD.CEMETERY.z, ic: 'skull', label: 'Cimitero' },
            { x: WORLD.MIRROR.x, z: WORLD.MIRROR.z, ic: 'mirror', label: 'Specchio' },
        ];
    }

    zoneName(x, z) {
        const C = WORLD.CASTLE;
        if (Math.abs(x - C.x) < C.half && Math.abs(z - C.z) < C.half) return Math.hypot(x - WORLD.ARENA.x, z - WORLD.ARENA.z) < WORLD.ARENA.r + 2 ? "Arena dei Duelli" : 'Cortile del Castello';
        if (this.onBridge(x, z)) return 'Ponte dei Sospiri';
        if (Math.hypot(x - C.x, z - C.z) < 36) return 'Castello Spettrale';
        if (Math.hypot(x - WORLD.PLAZA.x, z - WORLD.PLAZA.z) < WORLD.PLAZA.r + 3) return 'Piazza della Gloria';
        if (Math.hypot(x - WORLD.CEMETERY.x, z - WORLD.CEMETERY.z) < 13) return 'Cimitero Sommerso';
        if (Math.hypot(x - 30, z - 52) < 10) return 'Cappella in Rovina';
        if (Math.hypot(x + 40, z + 6) < 9) return 'Cerchio di Pietre';
        if (z > 82 && Math.abs(x) < 6) return 'Il Molo';
        if (this.terrainAt(x, z) < 0.3) return 'Laguna Fantasma';
        return 'Isola Fantasma';
    }

    nearestInteractable(x, z) {
        let best = null, bd = Infinity;
        for (const it of this.interactables) {
            const d = Math.hypot(x - it.x, z - it.z);
            if (d < it.r && d < bd) { bd = d; best = it; }
        }
        return best;
    }

    update(dt, focus) {
        this.t += dt;
        const t = this.t;
        this.waterMat.uniforms.uTime.value = t;
        for (const L of this.lights) L.l.intensity = L.base * (0.85 + Math.sin(t * L.sp) * 0.08 + Math.random() * 0.07);
        for (const f of this.flames) f.glow.material.opacity = 0.38 + Math.sin(t * f.sp) * 0.06 + Math.random() * 0.04;
        for (const w of this.wisps) {
            w.s.position.set(w.x + Math.cos(t * w.sp + w.a) * w.rad, w.y + Math.sin(t * w.sp * 1.7 + w.a) * 0.4, w.z + Math.sin(t * w.sp + w.a) * w.rad);
            w.s.material.opacity = 0.55 + Math.sin(t * 2 + w.a) * 0.35;
        }
        for (const m of this.mist) { m.a += m.sp * dt; m.s.position.x = Math.cos(m.a) * m.d; m.s.position.z = -20 + Math.sin(m.a) * m.d; }
        for (const fn of this.animated) fn(dt, t);
        this.fires.update(t);
        this.gallery.update(dt);
        if (focus && this.moonLight.castShadow) {
            this.moonLight.target.position.copy(focus);
            this.moonLight.position.copy(focus).addScaledVector(MOON_DIR, 60);
        }
    }
}
