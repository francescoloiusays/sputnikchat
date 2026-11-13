// =====================================================================
//  UN PO' PIÙ VERO
//  Tre ritocchi alla resa, tutti solo in qualità alta:
//  - SkyProbe: il cielo dell'ora si riflette su ferro, oro, pietra bagnata
//  - ContactShade: ombra morbida dove due superfici si toccano
//  - Relief: rilievo del suolo e dei massi ricavato da una mappa di altezze
// =====================================================================
import * as THREE from 'three';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

// --- IL CIELO COME LUCE D'AMBIENTE ---
// Una cupola piccola con gli stessi quattro colori del cielo (e il colore del suolo sotto l'orizzonte),
// sfocata dalla scheda video. Si rifà solo quando i colori cambiano davvero: alba, tramonto, meteo.
export class SkyProbe {
    constructor(renderer) {
        this.pmrem = new THREE.PMREMGenerator(renderer);
        this.mat = new THREE.ShaderMaterial({
            side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
            uniforms: {
                top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, low: { value: new THREE.Color() }, hor: { value: new THREE.Color() },
                ground: { value: new THREE.Color() }, gain: { value: 1 },
            },
            vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `uniform vec3 top, mid, low, hor, ground; uniform float gain; varying vec3 vDir;
                void main(){ float y = normalize(vDir).y;
                  vec3 c = mix(hor, low, smoothstep(-0.02, 0.10, y));
                  c = mix(c, mid, smoothstep(0.08, 0.35, y));
                  c = mix(c, top, smoothstep(0.3, 0.85, y));
                  c = mix(c, ground, smoothstep(0.02, -0.12, y));
                  gl_FragColor = vec4(c * gain, 1.0); }`,
        });
        this.scene = new THREE.Scene();
        this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 24, 12), this.mat));
        this.target = null; this.sig = ''; this.wait = 0;
    }
    get texture() { return this.target ? this.target.texture : null; }
    // S = stato del cielo (sky.js); gain = quanta luce d'ambiente arriva (al chiuso meno)
    update(dt, S, gain = 1) {
        this.wait -= dt;
        if (this.wait > 0 || S.flash > 0.01) return this.texture;
        const u = this.mat.uniforms, q = (c) => ((c.r * 48) | 0) + ',' + ((c.g * 48) | 0) + ',' + ((c.b * 48) | 0);
        const sig = [q(S.sky[0]), q(S.sky[1]), q(S.sky[2]), q(S.sky[3]), q(S.hemiG), gain.toFixed(2)].join('|');
        if (sig === this.sig) return this.texture;
        this.sig = sig; this.wait = 2.5;
        u.top.value.copy(S.sky[0]); u.mid.value.copy(S.sky[1]); u.low.value.copy(S.sky[2]); u.hor.value.copy(S.sky[3]);
        u.ground.value.copy(S.hemiG).multiplyScalar(0.6);
        u.gain.value = gain;
        const old = this.target;
        this.target = this.pmrem.fromScene(this.scene, 0, 0.1, 50);
        old?.dispose();
        return this.texture;
    }
}

// --- OMBRA DI CONTATTO ---
// Occlusione ambientale a metà risoluzione. Fiamme, bagliori, nebbia e cartelli non contano:
// sono fatti di luce o guardano sempre la telecamera, e lascerebbero aloni scuri.
export class ContactShade extends GTAOPass {
    constructor(scene, camera, w, h) {
        super(scene, camera, Math.ceil(w / 2), Math.ceil(h / 2));
        this.updateGtaoMaterial({ radius: 1, distanceExponent: 1.2, thickness: 1.2, distanceFallOff: 1, scale: 1.5, samples: 8 });
        this.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 8 });
        this.blendIntensity = 1;
    }
    setSize(w, h) { super.setSize(Math.ceil(w / 2), Math.ceil(h / 2)); }
    overrideVisibility() {
        const cache = this._visibilityCache;
        this.scene.traverse((o) => {
            cache.set(o, o.visible);
            if (o.userData.aoKeep) return;
            if (o.userData.aoSkip) { o.visible = false; return; }
            if (o.isPoints || o.isLine || o.isSprite || o.isReflector) { o.visible = false; return; }
            const m = o.isMesh && o.material;
            if (m && !Array.isArray(m) && (m.transparent || m.depthWrite === false || m.alphaTest > 0)) o.visible = false;
        });
    }
}

// --- RILIEVO DALLE FOTO ---
// Dove la foto è scura la superficie rientra (le fughe tra le pietre), dove è chiara sporge.
export class Relief {
    constructor(strength = 2, size = 512) {
        this.strength = strength; this.size = size; this.copies = [];
        // la tela nasce già della misura finale (piatta): la scheda video non accetta che cresca dopo
        this.canvas = document.createElement('canvas'); this.canvas.width = this.canvas.height = size;
        const g = this.canvas.getContext('2d', { willReadFrequently: true }); g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, size, size);
    }
    // una copia che ripete come la texture di colore a cui si accompagna
    like(map) {
        const t = new THREE.CanvasTexture(this.canvas);
        t.wrapS = map.wrapS; t.wrapT = map.wrapT; t.repeat.copy(map.repeat); t.anisotropy = map.anisotropy;
        this.copies.push(t);
        return t;
    }
    // img = immagine o tela; oppure direttamente le altezze (Float32Array lato×lato)
    bake(img) {
        const n = this.size, g = this.canvas.getContext('2d', { willReadFrequently: true });
        let H = img;
        if (!(img instanceof Float32Array)) {
            g.drawImage(img, 0, 0, n, n);
            const d = g.getImageData(0, 0, n, n).data;
            H = new Float32Array(n * n);
            for (let i = 0; i < n * n; i++) H[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
        }
        const out = g.createImageData(n, n), o = out.data, k = this.strength;
        for (let y = 0; y < n; y++) {
            const yu = ((y - 1 + n) % n) * n, yd = ((y + 1) % n) * n, y0 = y * n;
            for (let x = 0; x < n; x++) {
                const xl = (x - 1 + n) % n, xr = (x + 1) % n;
                const dx = (H[y0 + xr] - H[y0 + xl]) * k, dy = (H[yd + x] - H[yu + x]) * k;
                const inv = 1 / Math.hypot(dx, dy, 1), i = (y0 + x) * 4;
                o[i] = (-dx * inv * 0.5 + 0.5) * 255; o[i + 1] = (dy * inv * 0.5 + 0.5) * 255; o[i + 2] = (inv * 0.5 + 0.5) * 255; o[i + 3] = 255;
            }
        }
        g.putImageData(out, 0, 0);
        for (const t of this.copies) t.needsUpdate = true;
    }
}

// Altezze di rumore che si ripetono senza cuciture (per il rilievo del terreno)
export function tileHeights(size = 256, seed = 1) {
    const H = new Float32Array(size * size);
    const rnd = (x, y, s) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
    let amp = 0.39;   // le ottave fini pesano quasi quanto le larghe: da vicino il suolo resta nitido
    for (const cells of [6, 13, 29, 61]) {
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            const fx = x / size * cells, fy = y / size * cells, xi = Math.floor(fx), yi = Math.floor(fy);
            const tx = fx - xi, ty = fy - yi, u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
            const x1 = (xi + 1) % cells, y1 = (yi + 1) % cells;
            const a = rnd(xi, yi, cells + seed), b = rnd(x1, yi, cells + seed), c = rnd(xi, y1, cells + seed), d = rnd(x1, y1, cells + seed);
            H[y * size + x] += amp * (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v);
        }
        amp *= 0.7;
    }
    return H;
}

// --- MASSI ---
// Una sfera fitta spinta dentro e fuori da un rumore a più scale: spigoli morbidi, facce irregolari,
// e un colore che scurisce negli incavi. Sostituisce il dodecaedro a facce piatte.
export function roughRock(detail = 3, seed = 1) {
    const base = new THREE.IcosahedronGeometry(1, detail);
    // l'icosaedro nasce a facce staccate: si fondono i vertici uguali, così la luce scorre liscia
    const p = base.attributes.position, key = new Map(), verts = [], index = [];
    for (let i = 0; i < p.count; i++) {
        const k = Math.round(p.getX(i) * 1e4) + ',' + Math.round(p.getY(i) * 1e4) + ',' + Math.round(p.getZ(i) * 1e4);
        let id = key.get(k);
        if (id === undefined) { id = verts.length / 3; key.set(k, id); verts.push(p.getX(i), p.getY(i), p.getZ(i)); }
        index.push(id);
    }
    const rnd = (x, y, z) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 2147483647) + seed * 977) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
    const noise = (x, y, z) => {
        const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), s = (t) => t * t * (3 - 2 * t);
        const u = s(x - xi), v = s(y - yi), w = s(z - zi), L = (a, b, t) => a + (b - a) * t;
        return L(L(L(rnd(xi, yi, zi), rnd(xi + 1, yi, zi), u), L(rnd(xi, yi + 1, zi), rnd(xi + 1, yi + 1, zi), u), v),
            L(L(rnd(xi, yi, zi + 1), rnd(xi + 1, yi, zi + 1), u), L(rnd(xi, yi + 1, zi + 1), rnd(xi + 1, yi + 1, zi + 1), u), v), w);
    };
    const n = verts.length / 3, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
        const x = verts[i * 3], y = verts[i * 3 + 1], z = verts[i * 3 + 2];
        // spaccature larghe (a gradini, come pietra sfaldata) più una grana fine
        const big = noise(x * 1.3 + 5, y * 1.3, z * 1.3), mid = noise(x * 3.1, y * 3.1 + 9, z * 3.1), fine = noise(x * 8, y * 8, z * 8 + 3);
        // le creste (1 - |n|) danno spigoli vivi dove due falde si incontrano
        const ridge = 1 - Math.abs(mid * 2 - 1);
        const r = 0.62 + Math.round(big * 3) / 3 * 0.3 + big * 0.12 + ridge * 0.2 + fine * 0.07;
        pos.set([x * r, y * r, z * r], i * 3);
        const c = 0.62 + (r - 0.62) * 0.7 + fine * 0.14;
        col.set([c, c, c * 1.03], i * 3);
        uv.set([Math.atan2(z, x) / Math.PI * 1.5, Math.acos(Math.max(-1, Math.min(1, y))) / Math.PI * 1.5], i * 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(index);
    g.computeVertexNormals();
    return g;
}
