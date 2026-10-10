// =====================================================================
//  ARREDI DEL CASTELLO
//  - Fiamme procedurali (shader) per le torce a muro e i bracieri
//  - Quadri con i fotogrammi degli episodi di Sputnik Homies,
//    che cambiano immagine ogni tanto con una dissolvenza
// =====================================================================
import * as THREE from 'three';

// l'elenco delle puntate è condiviso col server (le monete dei quadri)
import { QUADRI } from './shared/lore.js';
export { QUADRI };

// --- FIAMMA PROCEDURALE ---
const FIRE_VERT = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        // billboard: il piano guarda sempre la telecamera
        vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vec2 sc = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
        mv.xy += position.xy * sc;
        gl_Position = projectionMatrix * mv;
    }`;
const FIRE_FRAG = `
    uniform float uTime, uSeed, uPower;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
    void main() {
        float y = vUv.y;
        float t = uTime + uSeed * 13.0;
        float x = (vUv.x - 0.5) * 2.0;
        // il rumore sale verso l'alto: la fiamma ondeggia e si sfrangia in lingue
        float n1 = fbm(vec2(x * 1.5 + uSeed, y * 2.2 - t * 2.6));
        float n2 = fbm(vec2(x * 3.0 - uSeed * 2.0, y * 4.0 - t * 3.8));
        float xd = x + (n1 - 0.5) * 0.9 * y;
        float w = mix(0.78, 0.1, smoothstep(0.0, 1.0, y));
        float shape = 1.0 - smoothstep(w * 0.5, w, abs(xd));
        float tongues = n2 * 1.15 - y * 0.85 + 0.25;
        float f = shape * smoothstep(0.05, 0.55, tongues) * smoothstep(0.0, 0.08, y);
        vec3 c0 = vec3(0.45, 0.04, 0.01), c1 = vec3(0.95, 0.26, 0.03), c2 = vec3(1.0, 0.58, 0.1), c3 = vec3(1.0, 0.86, 0.5);
        vec3 col = mix(c0, c1, smoothstep(0.0, 0.35, f));
        col = mix(col, c2, smoothstep(0.35, 0.72, f));
        col = mix(col, c3, smoothstep(0.78, 1.0, f) * (1.0 - y));
        gl_FragColor = vec4(col * f * uPower, f);
    }`;

export class FireSet {
    constructor() { this.mats = []; }
    // Fiamma alta 'h' metri con la base nell'origine del gruppo
    make(h = 0.8, power = 1.15) {
        const mat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, uSeed: { value: Math.random() * 10 }, uPower: { value: power } },
            vertexShader: FIRE_VERT, fragmentShader: FIRE_FRAG,
            transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
        });
        this.mats.push(mat);
        const g = new THREE.PlaneGeometry(0.78, 1, 1, 1);
        g.translate(0, 0.5, 0);
        const m = new THREE.Mesh(g, mat);
        m.scale.set(h, h, 1);
        m.frustumCulled = false;
        m.renderOrder = 5;
        return m;
    }
    update(t) { for (const m of this.mats) m.uniforms.uTime.value = t; }
}

let glowTex = null;
function glow() {
    if (glowTex) return glowTex;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,170,80,0.9)'); gr.addColorStop(0.3, 'rgba(255,110,30,0.35)'); gr.addColorStop(1, 'rgba(255,80,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace;
    return glowTex;
}
const iron = () => new THREE.MeshStandardMaterial({ color: '#2a2628', metalness: 0.85, roughness: 0.45 });
const wood = () => new THREE.MeshStandardMaterial({ color: '#3a2618', roughness: 0.9 });

// Torcia da muro: piastra e braccio di ferro, manico di legno, fiamma viva.
// Il gruppo va posizionato sul muro e ruotato in modo che +z punti fuori dal muro.
export function makeSconce(fires) {
    const g = new THREE.Group();
    const im = iron(), wm = wood();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 0.05), im); plate.position.z = 0.025; g.add(plate);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.34), im); arm.position.set(0, -0.08, 0.2); g.add(arm);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 6, 14), im); ring.rotation.x = Math.PI / 2; ring.position.set(0, -0.06, 0.36); g.add(ring);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.62, 8), wm);
    handle.position.set(0, 0.12, 0.4); handle.rotation.x = 0.28; g.add(handle);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.055, 0.14, 8), new THREE.MeshStandardMaterial({ color: '#1a120c', roughness: 1, emissive: '#5a1800', emissiveIntensity: 0.8 }));
    head.position.set(0, 0.43, 0.49); head.rotation.x = 0.28; g.add(head);
    const fire = fires.make(0.75);
    fire.position.set(0, 0.48, 0.51); g.add(fire);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 }));
    gl.scale.set(2.4, 2.4, 1); gl.position.set(0, 0.75, 0.55); g.add(gl);
    g.userData.fireTop = new THREE.Vector3(0, 0.8, 0.55);
    g.userData.glow = gl;
    g.traverse(o => { if (o.isMesh && o !== fire) o.castShadow = true; });
    return g;
}

// Braciere su treppiede (per l'arena)
export function makeBrazier(fires, h = 1.9) {
    const g = new THREE.Group();
    const im = iron();
    for (let i = 0; i < 3; i++) {
        const a = i / 3 * Math.PI * 2;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, h, 6), im);
        leg.position.set(Math.cos(a) * 0.18, h / 2, Math.sin(a) * 0.18);
        leg.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12);
        g.add(leg);
    }
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.22, 0.32, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#2a2628', metalness: 0.85, roughness: 0.45, side: THREE.DoubleSide }));
    bowl.position.y = h; g.add(bowl);
    const coals = new THREE.Mesh(new THREE.CircleGeometry(0.38, 16), new THREE.MeshStandardMaterial({ color: '#2a0a02', emissive: '#ff4a10', emissiveIntensity: 1.6, roughness: 1 }));
    coals.rotation.x = -Math.PI / 2; coals.position.y = h + 0.1; g.add(coals);
    for (const [dx, s] of [[0, 1.45], [-0.14, 0.95], [0.15, 1.05]]) {
        const f = fires.make(s);
        f.position.set(dx, h + 0.08, 0); g.add(f);
    }
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 }));
    gl.scale.set(4, 4, 1); gl.position.y = h + 0.7; g.add(gl);
    g.userData.fireTop = new THREE.Vector3(0, h + 0.9, 0);
    g.userData.glow = gl;
    return g;
}

// --- QUADRI ---
const PAINT_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const PAINT_FRAG = `
    uniform sampler2D uA, uB; uniform float uMix, uBright;
    varying vec2 vUv;
    void main() {
        vec3 a = texture2D(uA, vUv).rgb, b = texture2D(uB, vUv).rgb;
        vec3 c = mix(a, b, smoothstep(0.0, 1.0, uMix));
        // ritocco "a olio": un filo di calore e vignettatura
        c = mix(c, c * vec3(1.06, 0.98, 0.88), 0.6);
        float v = smoothstep(0.85, 0.35, distance(vUv, vec2(0.5)));
        c *= mix(0.62, 1.0, v) * uBright;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
    }`;

export class Gallery {
    constructor() {
        this.loader = new THREE.TextureLoader();
        this.tex = [];
        this.paintings = [];
        this.t = 0;
    }
    texture(i) {
        i = ((i % QUADRI.length) + QUADRI.length) % QUADRI.length;
        if (!this.tex[i]) {
            const t = this.loader.load('./img/quadri/' + QUADRI[i].file);
            t.colorSpace = THREE.SRGBColorSpace;
            t.anisotropy = 4;
            this.tex[i] = t;
        }
        return this.tex[i];
    }
    // Quadro 16:9 largo 'w' metri con cornice dorata e targhetta. Il retro guarda -z.
    make(w = 3.2, { plaque = true, interval = 14, offset = 0 } = {}) {
        const h = w * 9 / 16;
        const g = new THREE.Group();
        const gold = new THREE.MeshStandardMaterial({ color: '#b8872a', metalness: 0.9, roughness: 0.32, emissive: '#2a1800', emissiveIntensity: 0.4 });
        const dark = new THREE.MeshStandardMaterial({ color: '#4a2a10', metalness: 0.6, roughness: 0.5 });
        const fw = w * 0.07;
        const bar = (bw, bh, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.12), gold); m.position.set(x, y, 0.06); m.castShadow = true; g.add(m); };
        bar(w + fw * 2, fw, 0, h / 2 + fw / 2); bar(w + fw * 2, fw, 0, -h / 2 - fw / 2);
        bar(fw, h, -w / 2 - fw / 2, 0); bar(fw, h, w / 2 + fw / 2, 0);
        const inner = new THREE.Mesh(new THREE.BoxGeometry(w + fw * 0.5, h + fw * 0.5, 0.04), dark); inner.position.z = 0.02; g.add(inner);
        for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            const orn = new THREE.Mesh(new THREE.SphereGeometry(fw * 0.75, 10, 8), gold);
            orn.position.set(x * (w / 2 + fw / 2), y * (h / 2 + fw / 2), 0.13); orn.scale.z = 0.5;
            g.add(orn);
        }
        const crest = new THREE.Mesh(new THREE.OctahedronGeometry(fw * 0.9), gold); crest.position.set(0, h / 2 + fw * 1.4, 0.08); crest.scale.set(1.4, 1, 0.5); g.add(crest);
        const idx = Math.floor(Math.random() * QUADRI.length);
        const mat = new THREE.ShaderMaterial({
            uniforms: { uA: { value: this.texture(idx) }, uB: { value: this.texture(idx + 1) }, uMix: { value: 0 }, uBright: { value: 0.8 } },
            vertexShader: PAINT_VERT, fragmentShader: PAINT_FRAG,
        });
        const canvas = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        canvas.position.z = 0.05;
        g.add(canvas);
        const P = { g, mat, idx, next: idx + 1, fade: 0, timer: interval * 0.4 + offset, interval, plaque: null };
        if (plaque) {
            const c = document.createElement('canvas'); c.width = 512; c.height = 64;
            const pt = new THREE.CanvasTexture(c); pt.colorSpace = THREE.SRGBColorSpace;
            const pm = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.62, w * 0.62 / 8), new THREE.MeshStandardMaterial({ map: pt, metalness: 0.7, roughness: 0.35, emissive: '#ffffff', emissiveMap: pt, emissiveIntensity: 0.35 }));
            pm.position.set(0, -h / 2 - fw - w * 0.06, 0.04);
            g.add(pm);
            P.plaque = { c, pt };
            this.drawPlaque(P);
        }
        this.paintings.push(P);
        g.userData.painting = P;
        return g;
    }
    drawPlaque(P) {
        if (!P.plaque) return;
        const { c, pt } = P.plaque, g = c.getContext('2d');
        const gr = g.createLinearGradient(0, 0, 0, 64);
        gr.addColorStop(0, '#e8c25a'); gr.addColorStop(1, '#8a5a12');
        g.fillStyle = gr; g.fillRect(0, 0, 512, 64);
        g.strokeStyle = '#4a2a06'; g.lineWidth = 4; g.strokeRect(3, 3, 506, 58);
        g.fillStyle = '#2a1404'; g.textAlign = 'center'; g.textBaseline = 'middle';
        let fs = 28; const text = QUADRI[P.idx % QUADRI.length].title;
        g.font = `700 ${fs}px Almendra, Georgia, serif`;
        while (g.measureText(text).width > 480 && fs > 14) { fs -= 2; g.font = `700 ${fs}px Almendra, Georgia, serif`; }
        g.fillText(text, 256, 34);
        pt.needsUpdate = true;
    }
    current(P) { return QUADRI[P.idx % QUADRI.length]; }
    update(dt) {
        for (const P of this.paintings) {
            if (P.fade > 0) {
                P.fade = Math.min(1, P.fade + dt / 1.6);
                P.mat.uniforms.uMix.value = P.fade;
                if (P.fade >= 1) {
                    P.idx = P.next % QUADRI.length; P.fade = 0;
                    P.mat.uniforms.uA.value = this.texture(P.idx);
                    P.mat.uniforms.uMix.value = 0;
                    this.drawPlaque(P);
                }
                continue;
            }
            P.timer -= dt;
            if (P.timer <= 0) {
                P.timer = P.interval * (0.8 + Math.random() * 0.4);
                P.next = (P.idx + 1 + Math.floor(Math.random() * 3)) % QUADRI.length;
                P.mat.uniforms.uB.value = this.texture(P.next);
                P.fade = 0.0001;
            }
        }
    }
}

// Finestra ad arco illuminata dall'interno (origine = base, guarda verso +z)
export function makeWindow(w = 0.8, h = 1.5) {
    const g = new THREE.Group();
    const arch = (ww, hh) => {
        const s = new THREE.Shape();
        s.moveTo(-ww / 2, 0); s.lineTo(ww / 2, 0); s.lineTo(ww / 2, hh - ww / 2);
        s.absarc(0, hh - ww / 2, ww / 2, 0, Math.PI, false); s.lineTo(-ww / 2, 0);
        return new THREE.ShapeGeometry(s, 14);
    };
    const stone = new THREE.MeshStandardMaterial({ color: '#2a2430', roughness: 0.95 });
    const frame = new THREE.Mesh(arch(w + 0.24, h + 0.14), stone); frame.position.set(0, -0.07, 0.005); g.add(frame);
    const glass = new THREE.Mesh(arch(w, h), new THREE.MeshBasicMaterial({ color: '#e8973a' })); glass.position.z = 0.012; g.add(glass);
    const bar = new THREE.MeshStandardMaterial({ color: '#141016', roughness: 0.8 });
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, 0.03), bar); v.position.set(0, h / 2, 0.025); g.add(v);
    const hz = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.03), bar); hz.position.set(0, h * 0.48, 0.025); g.add(hz);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.34, 0.1, 0.22), stone); sill.position.set(0, -0.08, 0.08); g.add(sill);
    return g;
}
