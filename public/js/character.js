// =====================================================================
//  PERSONAGGI 3D PROCEDURALI
//  Specie, corporatura, volto, capelli, vestiario della Sartoria e armi
//  della Forgia, tutto costruito con primitive. Animazioni procedurali.
// =====================================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ITEMS, MATERIALS, HANDLES, GEMS, sanitizeAppearance } from './shared/catalog.js';

// --- CACHE (geometrie e materiali condivisi tra personaggi) ---
const geoCache = new Map();
const geo = (key, make) => { let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; };
const matCache = new Map();
export function stdMat(color, o = {}) {
    const op = o.o ?? 1;
    const key = [color, o.r ?? 0.78, o.m ?? 0, o.e || '', o.ei ?? 1, op, o.side || 0, o.map?.uuid || '', o.emap?.uuid || ''].join('|');
    let m = matCache.get(key);
    if (!m) {
        m = new THREE.MeshStandardMaterial({
            color, roughness: o.r ?? 0.78, metalness: o.m ?? 0,
            emissive: o.e ? new THREE.Color(o.e) : new THREE.Color(0), emissiveIntensity: o.ei ?? 1,
            transparent: op < 1, opacity: op, depthWrite: op >= 1, side: o.side ?? THREE.FrontSide,
            map: o.map || null, emissiveMap: o.emap || null,
        });
        matCache.set(key, m);
    }
    return m;
}
function M(g, m, x = 0, y = 0, z = 0) {
    const me = new THREE.Mesh(g, m);
    me.position.set(x, y, z);
    me.castShadow = true;
    return me;
}
const capsule = (r, len) => geo(`cap${r.toFixed(3)}_${len.toFixed(3)}`, () => new THREE.CapsuleGeometry(r, len, 4, 10));
const sphere = (r, ws = 16, hs = 12) => geo(`sph${r.toFixed(3)}_${ws}`, () => new THREE.SphereGeometry(r, ws, hs));
const rbox = (w, h, d, r = 0.04) => geo(`rb${w.toFixed(3)}_${h.toFixed(3)}_${d.toFixed(3)}_${r}`, () => new RoundedBoxGeometry(w, h, d, 3, r));
const box = (w, h, d) => geo(`bx${w.toFixed(3)}_${h.toFixed(3)}_${d.toFixed(3)}`, () => new THREE.BoxGeometry(w, h, d));
const cyl = (rt, rb, h, s = 12, open = false) => geo(`cy${rt.toFixed(3)}_${rb.toFixed(3)}_${h.toFixed(3)}_${s}_${open}`, () => new THREE.CylinderGeometry(rt, rb, h, s, 1, open));
const cone = (r, h, s = 12) => geo(`co${r.toFixed(3)}_${h.toFixed(3)}_${s}`, () => new THREE.ConeGeometry(r, h, s));
const torus = (R, t, arc = Math.PI * 2, rs = 8, ts = 24) => geo(`to${R}_${t}_${arc.toFixed(3)}`, () => new THREE.TorusGeometry(R, t, rs, ts, arc));

// --- STAMPE SPUTNIK HOMIES (logo ricolorato o scritta), usate da magliette, felpa e Stanza Bianca ---
let logoImg = null;
const printCache = new Map();
export function shPrintTexture(color, kind = 'logo') {
    const key = kind + color;
    if (printCache.has(key)) return printCache.get(key);
    const c = document.createElement('canvas');
    c.width = 512; c.height = kind === 'logo' ? 390 : 205;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    printCache.set(key, tex);
    const g = c.getContext('2d');
    if (kind === 'back') {
        g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '84px "Times New Roman", Times, Georgia, serif';
        g.fillText('Sputnik', 256, 56); g.fillText('Homies', 256, 150);
        tex.needsUpdate = true;
        return tex;
    }
    const draw = () => {
        const t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
        const tg = t.getContext('2d');
        tg.drawImage(logoImg, 0, 0, c.width, c.height);
        tg.globalCompositeOperation = 'source-in';
        tg.fillStyle = color; tg.fillRect(0, 0, c.width, c.height);
        g.clearRect(0, 0, c.width, c.height);
        g.drawImage(t, 0, 0);
        tex.needsUpdate = true;
    };
    if (!logoImg) { logoImg = new Image(); logoImg.src = './img/sh_logo.png'; }
    if (logoImg.complete && logoImg.naturalWidth) draw(); else logoImg.addEventListener('load', draw, { once: true });
    return tex;
}
const printMats = new Map();
function printMat(color, kind) {
    const key = kind + color;
    if (!printMats.has(key)) printMats.set(key, new THREE.MeshStandardMaterial({ map: shPrintTexture(color, kind), transparent: true, alphaTest: 0.2, depthWrite: false, roughness: 0.9 }));
    return printMats.get(key);
}

const BUILD = {
    snello: { w: 0.36, d: 0.22, limb: 0.055 },
    medio: { w: 0.44, d: 0.26, limb: 0.066 },
    robusto: { w: 0.54, d: 0.32, limb: 0.08 },
};
const HEAD_R = 0.21;

// --- TEXTURE DEL VOLTO (disegnata su canvas, mappata sulla sfera della testa) ---
const texCache = new Map();
function shade(hex, f) {
    const c = new THREE.Color(hex);
    c.multiplyScalar(f);
    return '#' + c.getHexString();
}
function faceTextures(a) {
    const key = ['face', a.species, a.skin, a.eyes, a.eyeColor, a.mouth, a.beard, a.hairColor].join('|');
    if (texCache.has(key)) return texCache.get(key);
    const make = (closed, emissive) => {
        const c = document.createElement('canvas');
        c.width = 512; c.height = 256;
        const g = c.getContext('2d');
        const sp = a.species;
        const skin = sp === 'scheletro' ? '#e9e2cf' : a.skin;
        g.fillStyle = emissive ? '#000' : skin;
        g.fillRect(0, 0, 512, 256);
        const cx = 128, ey = sp === 'ratto' ? 108 : 116;
        const glow = emissive;
        const eyeGap = sp === 'ratto' ? 34 : 27;
        if (!glow) {
            // guance e ombre
            g.fillStyle = 'rgba(0,0,0,0.08)';
            g.beginPath(); g.ellipse(cx, 150, 50, 22, 0, 0, Math.PI * 2); g.fill();
            if (sp === 'umano' || sp === 'elfo') {
                g.fillStyle = 'rgba(200,60,60,0.12)';
                for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 40, 140, 11, 7, 0, 0, Math.PI * 2); g.fill(); }
            }
        }
        const glowing = a.eyes === 'luminosi' || sp === 'scheletro' || sp === 'spettro';
        // tratti un po' più grandi: leggibili anche da lontano
        g.translate(cx, 130); g.scale(1.25, 1.25); g.translate(-cx, -130);
        for (const s of [-1, 1]) {
            const x = cx + s * eyeGap;
            if (sp === 'scheletro' || sp === 'spettro') {
                if (!glow) { g.fillStyle = '#0a0610'; g.beginPath(); g.ellipse(x, ey, 15, closed ? 3 : 18, 0, 0, Math.PI * 2); g.fill(); }
                if (!closed) { g.fillStyle = glow ? a.eyeColor : shade(a.eyeColor, 0.9); g.beginPath(); g.arc(x, ey + 2, 5, 0, Math.PI * 2); g.fill(); }
                continue;
            }
            if (glow && !glowing) continue;
            if (closed) {
                if (!glow) { g.strokeStyle = '#1a0f0a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 11, ey); g.quadraticCurveTo(x, ey + 5, x + 11, ey); g.stroke(); }
                continue;
            }
            if (a.eyes === 'luminosi') {
                g.fillStyle = glow ? a.eyeColor : '#fff';
                g.beginPath(); g.ellipse(x, ey, 11, 12, 0, 0, Math.PI * 2); g.fill();
                continue;
            }
            if (glow) continue;
            const ry = a.eyes === 'sottili' ? 6 : a.eyes === 'assonnati' ? 8 : 12;
            g.fillStyle = '#f8f4ec';
            g.beginPath(); g.ellipse(x, ey, sp === 'ratto' ? 14 : 11, ry, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = a.eyeColor;
            g.beginPath(); g.arc(x + s * -1, ey + 1, Math.min(7, ry), 0, Math.PI * 2); g.fill();
            g.fillStyle = '#050505';
            g.beginPath(); g.arc(x + s * -1, ey + 1, Math.min(3.5, ry * 0.5), 0, Math.PI * 2); g.fill();
            g.fillStyle = '#fff';
            g.beginPath(); g.arc(x + 2, ey - 3, 2, 0, Math.PI * 2); g.fill();
            g.strokeStyle = sp === 'ratto' ? shade(a.skin, 0.6) : shade(a.hairColor, 0.9);
            g.lineWidth = 4; g.lineCap = 'round';
            g.beginPath();
            if (a.eyes === 'fieri') { g.moveTo(x - s * -13, ey - 18); g.lineTo(x + s * 12, ey - 13); }
            else if (a.eyes === 'assonnati') {
                g.fillStyle = skin; g.beginPath(); g.ellipse(x, ey - 4, 13, 7, 0, Math.PI, 0); g.fill();
                g.beginPath(); g.moveTo(x - 12, ey - 2); g.lineTo(x + 12, ey - 2);
            } else { g.moveTo(x - 11, ey - 17); g.quadraticCurveTo(x, ey - 22, x + 11, ey - 17); }
            g.stroke();
        }
        if (glow) return c;
        // bocca
        const my = 160;
        g.lineCap = 'round';
        if (sp === 'scheletro') {
            g.fillStyle = '#1a1410';
            g.beginPath(); g.moveTo(cx, 128); g.lineTo(cx - 6, 142); g.lineTo(cx + 6, 142); g.fill();
            g.fillStyle = '#f5f0e0'; g.fillRect(cx - 26, my - 6, 52, 14);
            g.strokeStyle = '#2a2018'; g.lineWidth = 2;
            for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(cx + i * 7.5, my - 6); g.lineTo(cx + i * 7.5, my + 8); g.stroke(); }
            g.strokeRect(cx - 26, my - 6, 52, 14);
        } else if (sp === 'spettro') {
            g.fillStyle = '#0a0610';
            g.beginPath(); g.ellipse(cx, my, 10, a.mouth === 'sorpreso' ? 14 : 8, 0, 0, Math.PI * 2); g.fill();
        } else if (sp !== 'ratto') {
            g.strokeStyle = '#5a1a14'; g.fillStyle = '#5a1a14'; g.lineWidth = 4;
            g.beginPath();
            switch (a.mouth) {
                case 'sorriso': g.moveTo(cx - 16, my - 3); g.quadraticCurveTo(cx, my + 12, cx + 16, my - 3); g.stroke(); break;
                case 'neutro': g.moveTo(cx - 11, my); g.lineTo(cx + 11, my); g.stroke(); break;
                case 'ghigno': g.moveTo(cx - 14, my + 2); g.quadraticCurveTo(cx + 4, my + 4, cx + 16, my - 6); g.stroke(); break;
                case 'sorpreso': g.ellipse(cx, my + 2, 7, 9, 0, 0, Math.PI * 2); g.fill(); break;
                case 'zanne':
                    g.ellipse(cx, my + 1, 16, 8, 0, 0, Math.PI); g.fill();
                    g.fillStyle = '#fff';
                    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 10, my); g.lineTo(cx + s * 6, my); g.lineTo(cx + s * 8, my + 9); g.fill(); }
                    break;
            }
            // barba disegnata
            g.fillStyle = a.hairColor;
            if (a.beard === 'pizzetto') { g.beginPath(); g.ellipse(cx, my + 22, 11, 14, 0, 0, Math.PI * 2); g.fill(); g.fillRect(cx - 18, my - 13, 36, 5); }
            if (a.beard === 'baffi') { g.beginPath(); g.ellipse(cx - 11, my - 10, 13, 5, 0.2, 0, Math.PI * 2); g.ellipse(cx + 11, my - 10, 13, 5, -0.2, 0, Math.PI * 2); g.fill(); }
            if (a.beard === 'folta') { g.beginPath(); g.ellipse(cx, my + 14, 52, 34, 0, 0, Math.PI); g.fill(); g.fillRect(cx - 52, my - 14, 14, 30); g.fillRect(cx + 38, my - 14, 14, 30); g.fillRect(cx - 22, my - 13, 44, 6); }
        }
        return c;
    };
    const toTex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    const glowing = a.eyes === 'luminosi' || a.species === 'scheletro' || a.species === 'spettro';
    const res = { open: toTex(make(false)), closed: toTex(make(true)), emissive: glowing ? toTex(make(false, true)) : null };
    texCache.set(key, res);
    return res;
}

// =====================================================================
//  ARMI (Forgia)
// =====================================================================
export function buildWeapon(spec) {
    const g = new THREE.Group();
    if (!spec || !spec.type || spec.type === 'pugni') return g;
    const mat = MATERIALS[spec.material] || MATERIALS.ferro;
    const han = HANDLES[spec.handle] || HANDLES.legno;
    const gem = GEMS[spec.gem] || GEMS.nessuna;
    const mm = stdMat(mat.color, { m: mat.metal, r: mat.metal ? 0.32 : 0.7, e: mat.emissive, ei: mat.emissive ? 0.6 : 1 });
    const hm = stdMat(han.color, { r: 0.6, m: spec.handle === 'oro' ? 0.9 : 0 });
    const gm = gem.color ? stdMat(gem.color, { e: gem.color, ei: 1.6, r: 0.2, m: 0.3 }) : null;
    const add = (gg, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const me = M(gg, m, x, y, z); me.rotation.set(rx, ry, rz); g.add(me); return me; };
    const gemAt = (x, y, z, r = 0.035) => { if (gm) add(geo('gem' + r, () => new THREE.OctahedronGeometry(r)), gm, x, y, z); };
    switch (spec.type) {
        case 'spada':
            add(cyl(0.022, 0.022, 0.24, 8), hm, 0, 0, 0);
            add(sphere(0.035, 10, 8), hm, 0, -0.13, 0);
            add(box(0.24, 0.035, 0.05), mm, 0, 0.13, 0);
            add(box(0.065, 0.72, 0.018), mm, 0, 0.5, 0);
            add(geo('swtip', () => new THREE.ConeGeometry(0.046, 0.12, 4)), mm, 0, 0.92, 0, 0, Math.PI / 4, 0).scale.set(1, 1, 0.28);
            gemAt(0, 0.13, 0.03);
            break;
        case 'pugnale':
            add(cyl(0.02, 0.02, 0.15, 8), hm, 0, 0, 0);
            add(box(0.14, 0.03, 0.04), mm, 0, 0.09, 0);
            add(box(0.05, 0.3, 0.014), mm, 0, 0.25, 0);
            add(geo('dgtip', () => new THREE.ConeGeometry(0.035, 0.08, 4)), mm, 0, 0.44, 0, 0, Math.PI / 4, 0).scale.set(1, 1, 0.3);
            gemAt(0, -0.09, 0, 0.03);
            break;
        case 'ascia': {
            add(cyl(0.024, 0.026, 0.95, 8), hm, 0, 0.3, 0);
            const sh = new THREE.Shape();
            sh.moveTo(0, -0.08); sh.quadraticCurveTo(0.2, -0.2, 0.26, -0.02); sh.quadraticCurveTo(0.3, 0.12, 0.24, 0.24);
            sh.quadraticCurveTo(0.18, 0.12, 0, 0.12); sh.lineTo(0, -0.08);
            const hg = geo('axehead', () => new THREE.ExtrudeGeometry(sh, { depth: 0.025, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1 }));
            add(hg, mm, 0.02, 0.62, -0.0125);
            add(box(0.06, 0.12, 0.06), mm, 0, 0.66, 0);
            gemAt(0, 0.66, 0.04);
            break;
        }
        case 'martello':
            add(cyl(0.026, 0.028, 0.9, 8), hm, 0, 0.28, 0);
            add(rbox(0.36, 0.2, 0.2, 0.03), mm, 0, 0.75, 0);
            add(cyl(0.11, 0.11, 0.04, 12), mm, 0.19, 0.75, 0, 0, 0, Math.PI / 2);
            add(cyl(0.11, 0.11, 0.04, 12), mm, -0.19, 0.75, 0, 0, 0, Math.PI / 2);
            gemAt(0, 0.75, 0.11, 0.045);
            break;
        case 'lancia':
            add(cyl(0.02, 0.022, 1.7, 8), hm, 0, 0.5, 0);
            add(cone(0.06, 0.3, 4), mm, 0, 1.48, 0);
            add(torus(0.035, 0.012), mm, 0, 1.33, 0, Math.PI / 2);
            gemAt(0, 1.3, 0, 0.04);
            break;
        case 'falce': {
            add(cyl(0.022, 0.024, 1.5, 8), hm, 0, 0.45, 0);
            const bl = add(geo('scythe', () => new THREE.TorusGeometry(0.42, 0.03, 4, 20, Math.PI * 0.55)), mm, -0.42, 1.18, 0, 0, 0, -0.1);
            bl.scale.set(1, 1, 0.35);
            gemAt(0, 1.2, 0.03, 0.045);
            break;
        }
        case 'bastone':
            add(cyl(0.025, 0.03, 1.5, 8), hm, 0, 0.45, 0);
            for (let i = 0; i < 3; i++) {
                const a = i / 3 * Math.PI * 2;
                add(cone(0.018, 0.2, 5), mm, Math.cos(a) * 0.06, 1.25, Math.sin(a) * 0.06, Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
            }
            if (gm) add(sphere(0.075, 14, 10), gm, 0, 1.3, 0);
            else add(sphere(0.06, 12, 8), mm, 0, 1.28, 0);
            break;
    }
    g.userData.length = { spada: 1, pugnale: 0.5, ascia: 0.8, martello: 0.85, lancia: 1.6, falce: 1.5, bastone: 1.4 }[spec.type] || 1;
    return g;
}

// --- TARGHETTA NOME ---
export function makeNameTag(name, sub, color = '#ffff00') {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 140;
    const g = c.getContext('2d');
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = 'rgba(0,0,0,0.95)'; g.shadowBlur = 8;
    g.font = '700 56px Almendra, serif';
    g.fillStyle = color;
    g.fillText(String(name || '???').slice(0, 16), 256, sub ? 52 : 70);
    if (sub) { g.font = '600 28px Cinzel, serif'; g.fillStyle = '#d8cfe6'; g.fillText(sub, 256, 108); }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false }));
    s.scale.set(1.7, 0.465, 1);
    s.renderOrder = 999;
    return s;
}

// =====================================================================
//  PERSONAGGIO
// =====================================================================
const POSE_KEYS = ['bodyRx', 'bodyRy', 'bodyRz', 'bodyY', 'spineRx', 'spineRy', 'spineRz', 'headRx', 'headRy',
    'shLx', 'shLy', 'shLz', 'elL', 'shRx', 'shRy', 'shRz', 'elR', 'hipLx', 'hipLz', 'knL', 'hipRx', 'hipRz', 'knR', 'cape'];

export class Character {
    constructor(appearance, look = {}, opts = {}) {
        this.root = new THREE.Group();
        this.opts = opts;
        this.t = Math.random() * 10;
        this.state = 'idle';
        this.speed = 0;
        this.action = null;
        this.pose = Object.fromEntries(POSE_KEYS.map(k => [k, 0]));
        this.blinkT = 2 + Math.random() * 3;
        this.tint = null;
        this.build(appearance, look);
        if (opts.name) this.setNameTag(opts.name, opts.sub, opts.color);
    }

    build(appearance, look) {
        if (this.body) this.root.remove(this.body);
        if (this.faceMat) this.faceMat.dispose();
        this.halo = null;
        const a = this.app = sanitizeAppearance(appearance);
        this.look = look || {};
        const b = BUILD[a.build];
        const sp = a.species;
        const ghost = sp === 'spettro', skel = sp === 'scheletro', rat = sp === 'ratto';
        const op = ghost ? 0.62 : 1;
        const em = ghost ? '#3b4fa0' : '';
        const skinCol = skel ? '#e9e2cf' : a.skin;
        const skinM = stdMat(skinCol, { o: op, e: em, ei: 0.35, r: skel ? 0.6 : 0.8 });
        const torsoItem = ITEMS[this.look.torso];
        const shirt = torsoItem?.shirt;   // magliette e felpa dell'Armadio: sostituiscono la parte di sopra
        const robe = (a.topStyle === 'veste' && !shirt) || this.look.torso === 'tunica_mago';
        const topCol = this.look.torso === 'tunica_mago' || shirt ? torsoItem.color : a.top;
        const topM = stdMat(topCol, { o: op, e: em, ei: 0.3 });
        const botM = stdMat(a.bottom, { o: op, e: em, ei: 0.3 });
        const shoeM = stdMat(a.shoes, { o: op, r: 0.6 });
        const hairM = stdMat(a.hairColor, { o: op, r: 0.9 });
        const limb = skel ? b.limb * 0.6 : b.limb;
        const W = b.w, D = b.d;

        const body = this.body = new THREE.Group();
        body.scale.setScalar(a.height);
        this.root.add(body);
        const hipY = 0.87;
        this.hipY = hipY;
        const hips = this.hips = new THREE.Group();
        hips.position.y = hipY;
        body.add(hips);
        hips.add(M(rbox(W * 0.92, 0.2, D * 0.95, 0.05), botM, 0, -0.03, 0));

        // --- GAMBE ---
        this.legs = [];
        for (const s of [1, -1]) {
            const hip = new THREE.Group();
            hip.position.set(s * W * 0.25, -0.06, 0);
            hips.add(hip);
            if (!ghost) {
                hip.add(M(capsule(limb * 1.25, 0.28), botM, 0, -0.2, 0));
                const knee = new THREE.Group();
                knee.position.y = -0.4;
                hip.add(knee);
                knee.add(M(capsule(limb * 1.05, 0.28), skel ? skinM : botM, 0, -0.19, 0));
                knee.add(M(rbox(0.12 + (rat ? 0.04 : 0), 0.08, 0.24 + (rat ? 0.08 : 0), 0.03), shoeM, 0, -0.39, 0.04));
                this.legs.push({ hip, knee });
            } else this.legs.push({ hip, knee: new THREE.Group() });
        }
        if (ghost) {
            const tail = M(cone(W * 0.62, 0.95, 16), topM, 0, -0.5, 0);
            tail.rotation.x = Math.PI;
            hips.add(tail);
        }
        if (robe) {
            const skirtM = this.look.torso === 'tunica_mago' ? topM : topM;
            hips.add(M(cyl(W * 0.52, W * 0.78, 0.66, 14, true), skirtM, 0, -0.36, 0));
            if (this.look.torso === 'tunica_mago') hips.add(M(cyl(W * 0.79, W * 0.79, 0.05, 14, true), stdMat(torsoItem.color2, { e: torsoItem.color2, ei: 0.4 }), 0, -0.68, 0));
        }
        if (rat) {
            const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0, -0.05, -D * 0.5), new THREE.Vector3(0, -0.25, -0.35),
                new THREE.Vector3(0.05, -0.55, -0.55), new THREE.Vector3(-0.05, -0.72, -0.8)]);
            hips.add(M(geo('rattail', () => new THREE.TubeGeometry(curve, 16, 0.025, 6)), stdMat('#d99a9a'), 0, 0, 0));
        }

        // --- BUSTO ---
        const spine = this.spine = new THREE.Group();
        spine.position.y = 0.05;
        hips.add(spine);
        const torsoH = 0.52;
        spine.add(M(rbox(W, torsoH, D, 0.07), topM, 0, torsoH / 2, 0));
        if (a.topStyle === 'tunica' && !torsoItem) spine.add(M(box(W * 1.02, 0.06, D * 1.04), stdMat(shade(a.bottom, 0.6)), 0, 0.06, 0));
        if (a.topStyle === 'giacca' && !shirt) {
            spine.add(M(torus(0.1, 0.035), topM, 0, torsoH + 0.01, 0)).rotation.x = Math.PI / 2;
            const btn = stdMat('#c8a24a', { m: 0.8, r: 0.3 });
            for (let i = 0; i < 4; i++) spine.add(M(sphere(0.016, 8, 6), btn, 0, 0.12 + i * 0.1, D / 2 + 0.005));
        }
        this.addTorsoItem(spine, torsoItem, W, D, torsoH);

        // --- COLLO E TESTA ---
        const neck = this.neck = new THREE.Group();
        neck.position.y = torsoH;
        spine.add(neck);
        neck.add(M(cyl(0.058, 0.065, 0.12, 10), skinM, 0, 0.05, 0));
        const head = this.head = new THREE.Group();
        head.position.y = 0.11 + HEAD_R;
        neck.add(head);
        const ft = faceTextures(a);
        this.faceTex = ft;
        const faceM = new THREE.MeshStandardMaterial({
            map: ft.open, roughness: 0.75, transparent: ghost, opacity: op, depthWrite: !ghost,
            emissive: ft.emissive ? new THREE.Color('#ffffff') : new THREE.Color(ghost ? '#3b4fa0' : 0),
            emissiveMap: ft.emissive, emissiveIntensity: ft.emissive ? 1.4 : 0.35,
        });
        this.faceMat = faceM;
        const headMesh = M(sphere(HEAD_R, 28, 20), faceM, 0, 0, 0);
        headMesh.scale.set(rat ? 0.95 : 1, 1.08, rat ? 1.05 : 1);
        head.add(headMesh);
        if (sp === 'umano' || sp === 'elfo') head.add(M(sphere(0.034, 10, 8), skinM, 0, -0.02, HEAD_R * 0.98));
        if (sp === 'elfo') for (const s of [1, -1]) {
            const ear = M(cone(0.045, 0.2, 6), skinM, s * HEAD_R * 0.95, 0.03, -0.02);
            ear.rotation.set(0.2, 0, -s * 1.05);
            head.add(ear);
        }
        if (rat) {
            const snout = M(cone(0.1, 0.24, 12), skinM, 0, -0.06, HEAD_R * 0.95);
            snout.rotation.x = Math.PI / 2;
            head.add(snout);
            head.add(M(sphere(0.032, 10, 8), stdMat('#e07a8a'), 0, -0.06, HEAD_R + 0.15));
            if (a.mouth === 'zanne' || a.mouth === 'ghigno') for (const s of [1, -1]) head.add(M(box(0.022, 0.05, 0.012), stdMat('#fffbe6'), s * 0.014, -0.13, HEAD_R + 0.04));
            for (const s of [1, -1]) {
                const ear = M(sphere(0.1, 14, 10), skinM, s * 0.15, 0.17, -0.02);
                ear.scale.set(1, 1.15, 0.3); ear.rotation.z = -s * 0.4;
                head.add(ear);
                const inner = M(sphere(0.07, 12, 8), stdMat('#e8909a'), s * 0.152, 0.17, 0.0);
                inner.scale.set(1, 1.15, 0.25); inner.rotation.z = -s * 0.4;
                head.add(inner);
            }
            const wm = new THREE.LineBasicMaterial({ color: 0xe8e0d0, transparent: true, opacity: 0.8 });
            const pts = [];
            for (const s of [1, -1]) for (const dy of [-0.02, 0.01, 0.04]) pts.push(new THREE.Vector3(s * 0.04, -0.06, HEAD_R + 0.1), new THREE.Vector3(s * 0.24, -0.06 + dy * 2, HEAD_R + 0.04));
            head.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), wm));
        }
        if (a.beard === 'folta' && sp !== 'scheletro' && sp !== 'spettro' && !rat) {
            const bd = M(sphere(0.15, 14, 10), hairM, 0, -0.13, HEAD_R * 0.55);
            bd.scale.set(1.15, 0.9, 0.7);
            head.add(bd);
        }
        this.addHair(head, a, hairM, !!this.look.head);
        this.addHeadItem(head, ITEMS[this.look.head]);
        this.addFaceItem(head, ITEMS[this.look.face]);

        // --- BRACCIA (L = +x, R = -x: il personaggio guarda verso +z) ---
        this.arms = {};
        const sleeveFull = shirt ? shirt === 'hoodie' : a.topStyle !== 'tunica';
        for (const [key, s] of [['L', 1], ['R', -1]]) {
            const sh = new THREE.Group();
            sh.rotation.order = 'YXZ';
            sh.position.set(s * (W / 2 + limb * 0.9), torsoH - 0.07, 0);
            spine.add(sh);
            sh.add(M(sphere(limb * 1.45, 12, 10), topM, 0, 0, 0));
            sh.add(M(capsule(limb, 0.22), topM, 0, -0.15, 0));
            const el = new THREE.Group();
            el.position.y = -0.3;
            sh.add(el);
            el.add(M(capsule(limb * 0.9, 0.2), sleeveFull ? topM : skinM, 0, -0.13, 0));
            const hand = new THREE.Group();
            hand.position.y = -0.29;
            el.add(hand);
            hand.add(M(sphere(limb * 1.3, 10, 8), skinM, 0, 0, 0));
            this.arms[key] = { sh, el, hand };
        }
        this.weaponMesh = buildWeapon(this.look.weapon);
        this.weaponMesh.rotation.x = Math.PI / 2;
        this.arms.R.hand.add(this.weaponMesh);

        this.addCape(spine, ITEMS[this.look.cape], W, D, torsoH);

        this.root.traverse(o => { if (o.isMesh && !o.material.transparent) o.castShadow = true; });
        this.topY = (hipY + 0.05 + torsoH + 0.11 + HEAD_R * 2.2) * a.height + (this.look.head ? 0.15 : 0);
        if (this.tag) this.tag.position.y = this.topY + 0.35;
        if (this.tint) this.setTint(this.tint);
    }

    addHair(head, a, hairM, hatOn) {
        const R = HEAD_R;
        if (a.species === 'scheletro' || a.species === 'spettro' && a.hair === 'calvo') return;
        const cap = () => {
            const c = M(geo('haircap', () => new THREE.SphereGeometry(R * 1.07, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.42)), hairM);
            c.rotation.x = -0.42; c.scale.y = 1.08;
            head.add(c);
        };
        switch (a.hair) {
            case 'corti': cap(); break;
            case 'lunghi': cap(); head.add(M(rbox(R * 1.75, 0.46, 0.09, 0.04), hairM, 0, -0.16, -R * 0.78)); break;
            case 'codino': cap(); head.add(M(sphere(0.07, 10, 8), hairM, 0, 0.04, -R * 1.08)); head.add(M(capsule(0.04, 0.16), hairM, 0, -0.1, -R * 1.12)); break;
            case 'ciuffo': {
                cap();
                const f = M(sphere(0.11, 12, 8), hairM, 0.03, R * 0.85, R * 0.55);
                f.scale.set(1.3, 0.55, 1); f.rotation.z = 0.3;
                head.add(f);
                break;
            }
            case 'cresta':
                if (hatOn) break;
                for (let i = 0; i < 5; i++) {
                    const ang = -0.9 + i * 0.45;
                    const sp = M(cone(0.04, 0.17, 6), hairM, 0, Math.cos(ang) * R * 1.02, Math.sin(ang) * R * 1.02);
                    sp.rotation.x = ang;
                    head.add(sp);
                }
                break;
        }
    }

    addHeadItem(head, it) {
        if (!it) return;
        const R = HEAD_R;
        const m = stdMat(it.color, { r: 0.7 });
        const id = Object.keys(ITEMS).find(k => ITEMS[k] === it);
        switch (id) {
            case 'cappuccio': {
                const h = M(geo('hood', () => new THREE.SphereGeometry(R * 1.22, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62)), stdMat(it.color, { side: THREE.DoubleSide }));
                h.rotation.x = -0.55; head.add(h);
                const tip = M(cone(0.08, 0.22, 8), m, 0, 0.12, -R * 1.15); tip.rotation.x = -2.2; head.add(tip);
                break;
            }
            case 'piuma': {
                head.add(M(cyl(R * 1.35, R * 1.35, 0.025, 20), m, 0, R * 0.62, 0));
                const crown = M(cone(R * 0.95, 0.3, 16), m, 0, R * 0.62 + 0.14, -0.02); crown.rotation.x = -0.25; head.add(crown);
                const f = M(sphere(0.06, 10, 8), stdMat(it.color2, { r: 0.9 }), -R * 0.7, R * 0.95, -0.08);
                f.scale.set(0.35, 0.3, 3); f.rotation.set(0.5, 0.3, 0.4); head.add(f);
                break;
            }
            case 'strega': {
                head.add(M(cyl(R * 2.1, R * 2.1, 0.02, 24), m, 0, R * 0.55, 0));
                head.add(M(cyl(R * 0.62, R * 0.95, 0.32, 16), m, 0, R * 0.55 + 0.16, 0));
                const top = M(cone(R * 0.62, 0.36, 14), m, 0.06, R * 0.55 + 0.45, -0.05); top.rotation.z = -0.5; head.add(top);
                head.add(M(cyl(R * 0.97, R * 0.97, 0.05, 16, true), stdMat(it.color2, { e: it.color2, ei: 0.5 }), 0, R * 0.62, 0));
                break;
            }
            case 'tricorno':
                head.add(M(cyl(R * 1.55, R * 1.55, 0.12, 3), m, 0, R * 0.68, 0)).rotation.y = Math.PI;
                head.add(M(cyl(R * 1.6, R * 1.6, 0.03, 3), stdMat(it.color2, { m: 0.8, r: 0.3 }), 0, R * 0.62, 0)).rotation.y = Math.PI;
                head.add(M(cyl(R * 0.9, R * 1.0, 0.18, 16), m, 0, R * 0.82, 0));
                break;
            case 'elmo': {
                const mm = stdMat(it.color, { m: 0.85, r: 0.35 });
                const h = M(geo('helm', () => new THREE.SphereGeometry(R * 1.14, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.62)), mm);
                head.add(h);
                head.add(M(box(R * 1.6, 0.05, 0.03), stdMat('#111'), 0, 0.02, R * 1.1));
                head.add(M(box(0.03, R * 0.9, 0.04), mm, 0, -0.04, R * 1.12));
                head.add(M(box(0.05, 0.12, R * 2), stdMat('#8b1a1a'), 0, R * 1.15, -0.02));
                break;
            }
            case 'corna':
                for (const s of [1, -1]) {
                    const h = M(torus(0.11, 0.032, Math.PI * 0.6, 6, 12), m, s * R * 0.62, R * 0.72, 0);
                    h.rotation.set(0, Math.PI / 2, s > 0 ? 0.2 : Math.PI - 0.2);
                    head.add(h);
                }
                break;
            case 'aureola': {
                const h = M(torus(R * 0.85, 0.024), stdMat(it.color, { e: it.color, ei: 2.2 }), 0, R * 1.55, 0);
                h.rotation.x = Math.PI / 2; h.userData.halo = true;
                head.add(h);
                this.halo = h;
                break;
            }
            case 'corona': {
                const cm = stdMat(it.color, { e: it.color, ei: 1.5, o: 0.85, m: 0.5, r: 0.3 });
                head.add(M(cyl(R * 0.92, R * 0.92, 0.07, 18, true), stdMat(it.color, { e: it.color, ei: 1.5, side: THREE.DoubleSide }), 0, R * 0.72, 0));
                for (let i = 0; i < 8; i++) {
                    const a = i / 8 * Math.PI * 2;
                    head.add(M(cone(0.025, 0.11, 5), cm, Math.cos(a) * R * 0.9, R * 0.72 + 0.08, Math.sin(a) * R * 0.9));
                }
                break;
            }
        }
    }

    addFaceItem(head, it) {
        if (!it) return;
        const R = HEAD_R;
        const id = Object.keys(ITEMS).find(k => ITEMS[k] === it);
        if (id === 'peste') {
            const m = stdMat(it.color, { r: 0.6 });
            const beak = M(cone(0.075, 0.36, 10), m, 0, -0.05, R + 0.15);
            beak.rotation.x = Math.PI / 2 + 0.35;
            head.add(beak);
            head.add(M(rbox(R * 1.7, R * 0.9, 0.1, 0.04), m, 0, 0.02, R * 0.8));
            const glass = stdMat('#1a1010', { m: 0.6, r: 0.1, e: '#401010', ei: 0.4 });
            for (const s of [1, -1]) { const e = M(cyl(0.045, 0.045, 0.03, 14), glass, s * 0.075, 0.03, R * 0.86); e.rotation.x = Math.PI / 2; head.add(e); }
            head.add(M(torus(R * 1.02, 0.015), stdMat('#3a2a1a'), 0, 0.02, 0)).rotation.x = Math.PI / 2 - 0.1;
        } else if (id === 'benda') {
            const m = stdMat(it.color);
            const band = M(torus(R * 1.03, 0.012), m, 0, 0.06, 0); band.rotation.set(Math.PI / 2 - 0.25, 0, 0); head.add(band);
            const patch = M(cyl(0.045, 0.045, 0.02, 12), m, -0.058, 0.04, R * 0.95); patch.rotation.x = Math.PI / 2; head.add(patch);
        } else if (id === 'monocolo') {
            const ring = M(torus(0.04, 0.008), stdMat(it.color, { m: 0.9, r: 0.25 }), -0.058, 0.035, R * 0.97);
            head.add(ring);
            head.add(M(cyl(0.004, 0.004, 0.2, 4), stdMat(it.color, { m: 0.9 }), -0.1, -0.06, R * 0.85)).rotation.z = 0.4;
        }
    }

    addTorsoItem(spine, it, W, D, H) {
        if (!it) return;
        if (it.shirt) {
            // logo giallo davanti, scritta dietro, girocollo (e cappuccio, tasca e lacci per la felpa)
            const front = M(geo('shlogo', () => new THREE.PlaneGeometry(1, 0.76)), printMat(it.print, 'logo'), 0, H * 0.6, D / 2 + 0.004);
            front.scale.setScalar(W * 0.62); front.castShadow = false;
            spine.add(front);
            const back = M(geo('shback', () => new THREE.PlaneGeometry(1, 0.4)), printMat(it.print, 'back'), 0, H * 0.64, -D / 2 - 0.004);
            back.rotation.y = Math.PI; back.scale.setScalar(W * 0.78); back.castShadow = false;
            spine.add(back);
            const rib = stdMat(shade(it.color, 0.78));
            spine.add(M(torus(0.085, 0.02), rib, 0, H + 0.005, 0)).rotation.x = Math.PI / 2;
            if (it.shirt === 'hoodie') {
                const hood = M(geo('hood', () => new THREE.SphereGeometry(0.17, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)), stdMat(it.color, { side: THREE.DoubleSide }), 0, H - 0.02, -D * 0.42);
                hood.rotation.x = -2.1; hood.scale.set(1.1, 0.85, 0.75);
                spine.add(hood);
                spine.add(M(box(W * 0.56, 0.13, 0.02), rib, 0, 0.12, D / 2 + 0.008));
                for (const s of [1, -1]) spine.add(M(box(0.012, 0.13, 0.012), stdMat('#e8e4dc'), s * 0.045, H - 0.08, D / 2 + 0.012));
            }
            return;
        }
        const id = Object.keys(ITEMS).find(k => ITEMS[k] === it);
        switch (id) {
            case 'grembiule': {
                const m = stdMat(it.color, { r: 0.9 });
                spine.add(M(box(W * 0.8, 0.85, 0.02), m, 0, H * 0.3, D / 2 + 0.02));
                for (const s of [1, -1]) spine.add(M(box(0.04, 0.3, 0.02), m, s * W * 0.25, H * 0.82, D / 2 + 0.01));
                break;
            }
            case 'cotta': {
                const m = stdMat(it.color, { m: 0.8, r: 0.45 });
                spine.add(M(rbox(W * 1.06, H * 0.95, D * 1.08, 0.07), m, 0, H * 0.5, 0));
                spine.add(M(cyl(W * 0.56, W * 0.62, 0.2, 14, true), m, 0, -0.04, 0));
                for (const s of [1, -1]) spine.add(M(sphere(0.1, 12, 8), m, s * W * 0.5, H - 0.04, 0)).scale.set(1.1, 0.7, 1);
                break;
            }
            case 'tunica_mago': {
                spine.add(M(box(0.06, H, 0.02), stdMat(it.color2, { e: it.color2, ei: 0.5 }), 0, H / 2, D / 2 + 0.005));
                break;
            }
            case 'ossa': {
                const m = stdMat(it.color, { r: 0.6 });
                for (let i = 0; i < 4; i++) spine.add(M(rbox(W * 0.95, 0.04, D * 1.08, 0.02), m, 0, 0.14 + i * 0.09, 0.005));
                spine.add(M(box(0.05, H * 0.9, 0.04), m, 0, H * 0.48, D / 2 + 0.02));
                for (const s of [1, -1]) spine.add(M(sphere(0.1, 12, 8), m, s * W * 0.52, H - 0.02, 0));
                break;
            }
            case 'corazza': {
                const m = stdMat(it.color, { m: 0.9, r: 0.28 });
                spine.add(M(rbox(W * 1.08, H * 0.82, D * 1.12, 0.08), m, 0, H * 0.55, 0));
                spine.add(M(box(W * 1.1, 0.07, D * 1.14), stdMat('#3a2412'), 0, 0.1, 0));
                for (const s of [1, -1]) {
                    const p = M(geo('pauld', () => new THREE.SphereGeometry(0.13, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2)), m, s * W * 0.52, H - 0.04, 0);
                    p.rotation.z = -s * 0.35; spine.add(p);
                }
                break;
            }
        }
    }

    addCape(spine, it, W, D, H) {
        this.cape = null; this.wings = null;
        if (!it) return;
        const id = Object.keys(ITEMS).find(k => ITEMS[k] === it);
        if (id === 'ali') {
            const sh = new THREE.Shape();
            sh.moveTo(0, 0); sh.lineTo(0.75, 0.25); sh.lineTo(0.68, 0.05); sh.quadraticCurveTo(0.6, -0.12, 0.5, -0.05);
            sh.quadraticCurveTo(0.42, -0.25, 0.3, -0.12); sh.quadraticCurveTo(0.2, -0.3, 0.08, -0.2); sh.lineTo(0, 0);
            const g = geo('wing', () => new THREE.ShapeGeometry(sh));
            const m = stdMat(it.color, { side: THREE.DoubleSide, r: 0.9 });
            this.wings = [];
            for (const s of [1, -1]) {
                const piv = new THREE.Group();
                piv.position.set(s * 0.06, H - 0.12, -D / 2 - 0.02);
                const w = M(g, m); w.scale.x = s;
                piv.add(w); spine.add(piv);
                this.wings.push({ piv, s });
            }
            return;
        }
        const cape = new THREE.Group();
        cape.position.set(0, H - 0.02, -D / 2 - 0.035);
        const cg = geo('cape' + W.toFixed(2), () => {
            const g = new THREE.PlaneGeometry(W * 1.3, 1.1, 4, 10);
            g.translate(0, -0.55, 0);
            const p = g.attributes.position;
            for (let i = 0; i < p.count; i++) {
                const x = p.getX(i), y = p.getY(i);
                p.setZ(i, -Math.pow(x / (W * 0.65), 2) * 0.06 + y * 0.04);
                p.setX(i, x * (1 + -y * 0.35));
            }
            g.computeVertexNormals();
            return g;
        });
        const cm = stdMat(it.color, { side: THREE.DoubleSide, r: 0.85 });
        cape.add(M(cg, cm));
        if (id === 'mantello_regale') {
            const fur = M(torus(0.15, 0.06), stdMat(it.color2, { r: 1 }), 0, 0.02, D / 2 + 0.02);
            fur.rotation.x = Math.PI / 2; fur.scale.set(1.25, 1, 1);
            cape.add(fur);
        }
        spine.add(cape);
        this.cape = cape;
    }

    setNameTag(name, sub, color) {
        if (this.tag) { this.root.remove(this.tag); this.tag.material.map.dispose(); this.tag.material.dispose(); }
        this.tag = makeNameTag(name, sub, color);
        this.tag.position.y = (this.topY || 2) + 0.35;
        this.root.add(this.tag);
    }

    setLook(look) { this.build(this.app, look); }
    setAppearance(app, look) { this.build(app, look ?? this.look); }

    setTint(color) {
        this.tint = color;
        this.body.traverse(o => {
            if (!o.isMesh) return;
            if (color) {
                if (!o.userData.baseMat) o.userData.baseMat = o.material;
                o.material = o.userData.baseMat.clone();
                o.material.color.lerp(new THREE.Color(color), 0.65);
                o.userData.tinted = true;
            } else if (o.userData.baseMat) {
                if (o.userData.tinted) o.material.dispose();
                o.material = o.userData.baseMat;
                o.userData.tinted = false;
            }
        });
    }

    // Azioni one-shot (world) o con progresso esterno (duello)
    play(name, dur, loop = false) { this.action = { name, t: 0, dur, loop }; }
    stop() { this.action = null; }

    update(dt, ext) {
        this.t += dt;
        const t = this.t;
        const P = {};
        for (const k of POSE_KEYS) P[k] = 0;
        P.shLz = 0.1; P.shRz = -0.1; P.elR = -0.35; P.elL = -0.15;
        const st = ext?.st ?? this.state;
        const v = ext?.speed ?? this.speed;

        // --- LOCOMOZIONE ---
        if (st === 'walk' || st === 'run') {
            const ph = t * (3.2 + v * 1.25);
            const amp = Math.min(0.75, 0.3 + v * 0.07);
            P.hipLx = Math.sin(ph) * amp; P.hipRx = -Math.sin(ph) * amp;
            P.knL = 0.1 + Math.max(0, -Math.cos(ph)) * amp * 1.5;
            P.knR = 0.1 + Math.max(0, Math.cos(ph)) * amp * 1.5;
            P.shLx = -P.hipLx * 0.8; P.shRx = -P.hipRx * 0.6 - 0.1;
            P.bodyY = Math.abs(Math.sin(ph)) * 0.05 * Math.min(1, v / 3);
            P.spineRx = 0.04 + v * 0.015; P.spineRy = Math.sin(ph) * 0.08;
            P.cape = 0.25 + v * 0.06;
        } else if (st === 'air') {
            P.hipLx = -0.7; P.knL = 1.1; P.hipRx = 0.25; P.knR = 0.5;
            P.shLz = 0.6; P.shRz = -0.6; P.shLx = -0.5; P.shRx = -0.5; P.cape = 0.6;
        } else if (st === 'block') {
            P.shLx = -1.35; P.shLz = -0.5; P.elL = -1.3; P.shRx = -1.35; P.shRz = 0.5; P.elR = -1.3;
            P.knL = P.knR = 0.35; P.hipLx = P.hipRx = -0.18; P.bodyY = -0.05; P.spineRx = 0.12;
        } else if (st === 'stun') {
            P.spineRx = -0.35; P.headRx = -0.3; P.shLz = 0.8; P.shRz = -0.8; P.shLx = P.shRx = 0.35; P.knL = 0.3; P.cape = 0.4;
        } else if (st === 'ko') {
            P.bodyRx = -1.5; P.bodyY = 0.18; P.shLz = 1.3; P.shRz = -1.3; P.headRy = 0.4; P.knL = 0.3;
        } else if (st === 'win') {
            P.shRx = -2.9 + Math.sin(t * 8) * 0.15; P.shRz = -0.15; P.elR = -0.2; P.shLz = 0.35;
            P.bodyY = Math.abs(Math.sin(t * 4)) * 0.08; P.headRx = -0.2;
        } else if (st === 'dash') {
            P.spineRx = 0.5; P.shLx = P.shRx = 0.9; P.hipLx = -0.6; P.hipRx = 0.7; P.knR = 0.6; P.cape = 0.9;
        } else if (st === 'sit') {
            P.hipLx = P.hipRx = -1.5; P.knL = P.knR = 1.5; P.bodyY = -0.42;
        } else {
            P.spineRx = Math.sin(t * 1.6) * 0.025;
            P.shLz += Math.sin(t * 1.6) * 0.02; P.shRz -= Math.sin(t * 1.6) * 0.02;
            P.headRy = Math.sin(t * 0.33) * 0.25; P.headRx = Math.sin(t * 0.21) * 0.06;
            P.cape = 0.05 + Math.sin(t * 1.3) * 0.03;
        }

        // --- AZIONI ---
        const a = ext?.action ?? (this.action ? { name: this.action.name, p: this.action.t / this.action.dur } : null);
        if (a) applyAction(P, a.name, Math.min(1, Math.max(0, a.p)), t);

        // Spettro: fluttua
        if (this.app.species === 'spettro') P.bodyY += 0.22 + Math.sin(t * 2.2) * 0.06;

        // --- APPLICA (smorzato) ---
        const k = st === 'frozen' ? 0 : 1 - Math.exp(-dt * (ext ? 22 : 14));
        const C = this.pose;
        for (const key of POSE_KEYS) C[key] += (P[key] - C[key]) * k;
        this.body.rotation.set(C.bodyRx, C.bodyRy, C.bodyRz);
        this.body.position.y = C.bodyY;
        this.spine.rotation.set(C.spineRx, C.spineRy, C.spineRz);
        this.head.rotation.set(C.headRx, C.headRy, 0);
        this.arms.L.sh.rotation.set(C.shLx, C.shLy, C.shLz);
        this.arms.L.el.rotation.x = C.elL;
        this.arms.R.sh.rotation.set(C.shRx, C.shRy, C.shRz);
        this.arms.R.el.rotation.x = C.elR;
        this.legs[0].hip.rotation.set(C.hipLx, 0, C.hipLz);
        this.legs[0].knee.rotation.x = C.knL;
        this.legs[1].hip.rotation.set(C.hipRx, 0, C.hipRz);
        this.legs[1].knee.rotation.x = C.knR;
        if (this.cape) this.cape.rotation.x = Math.max(0, C.cape) + Math.sin(t * 3.1) * 0.03;
        if (this.wings) for (const w of this.wings) w.piv.rotation.y = -w.s * (0.5 + Math.sin(t * (st === 'air' ? 12 : 2)) * (st === 'air' ? 0.5 : 0.12));
        if (this.halo) this.halo.position.y = HEAD_R * 1.55 + Math.sin(t * 2) * 0.02;

        // ammiccamento
        this.blinkT -= dt;
        if (this.blinkT <= 0) {
            const closed = this.faceMat.map === this.faceTex.closed;
            this.faceMat.map = closed ? this.faceTex.open : this.faceTex.closed;
            this.blinkT = closed ? 2 + Math.random() * 4 : 0.12;
        }

        if (this.action) {
            this.action.t += dt;
            if (this.action.t >= this.action.dur) {
                if (this.action.loop) this.action.t %= this.action.dur;
                else this.action = null;
            }
        }
    }

    dispose() {
        if (this.tag) { this.tag.material.map.dispose(); this.tag.material.dispose(); }
        this.faceMat?.dispose();
        this.body.traverse(o => { if (o.isMesh && o.userData.tinted) o.material.dispose(); });
        this.root.removeFromParent();
    }
}

// Pose delle azioni (p = progresso 0..1)
const ease = x => x * x * (3 - 2 * x);
function seg(p, a, b) { return Math.min(1, Math.max(0, (p - a) / (b - a))); }
function applyAction(P, name, p, t) {
    switch (name) {
        case 'light': case 'air': {
            const w = ease(seg(p, 0, 0.3)), s = ease(seg(p, 0.3, 0.55)), r = ease(seg(p, 0.6, 1));
            const amt = 1 - r;
            P.shRx = -1.45 * amt + P.shRx * r;
            P.shRy = (-1.0 * w + 1.9 * s) * amt;
            P.shRz = -0.15 * amt + P.shRz * r;
            P.elR = -0.2 * amt + P.elR * r;
            P.spineRy = (-0.45 * w + 1.0 * s) * amt;
            if (name === 'air') { P.hipLx = -0.9; P.knL = 1.3; P.hipRx = -0.6; P.knR = 1.2; P.bodyRx = 0.2 * amt; }
            break;
        }
        case 'heavy': {
            const w = ease(seg(p, 0, 0.42)), s = ease(seg(p, 0.42, 0.62)), r = ease(seg(p, 0.66, 1));
            const amt = 1 - r;
            P.shRx = (-2.9 * w + 2.5 * s) * amt + P.shRx * r;
            P.elR = -0.5 * w * amt + P.elR * r;
            P.shLx = -1.0 * w * amt;
            P.spineRx = (-0.28 * w + 0.65 * s) * amt;
            P.knL = P.knR = 0.45 * s * amt;
            P.hipLx = -0.3 * s * amt;
            P.bodyY = -0.08 * s * amt;
            break;
        }
        case 'up': {
            const w = ease(seg(p, 0, 0.3)), s = ease(seg(p, 0.3, 0.55)), r = ease(seg(p, 0.65, 1));
            const amt = 1 - r;
            P.shRx = (-0.3 * w - 2.8 * s) * amt + P.shRx * r;
            P.shRz = -0.3 * amt;
            P.spineRx = (0.25 * w - 0.45 * s) * amt;
            P.knL = P.knR = 0.6 * w * (1 - s) * amt;
            P.bodyY = (-0.1 * w + 0.15 * s) * amt;
            break;
        }
        case 'special': {
            const w = ease(seg(p, 0, 0.45)), s = ease(seg(p, 0.45, 0.6)), r = ease(seg(p, 0.7, 1));
            const amt = 1 - r;
            P.shLx = (-2.6 * w + 1.1 * s) * amt; P.shRx = (-2.6 * w + 1.1 * s) * amt;
            P.shLz = -0.25 * amt + 0.1 * r; P.shRz = 0.25 * amt - 0.1 * r;
            P.elL = P.elR = -0.1;
            P.spineRx = (-0.25 * w + 0.4 * s) * amt;
            P.headRx = -0.2 * w * amt;
            P.cape = 0.6 * amt;
            break;
        }
        case 'throw': {
            const w = ease(seg(p, 0, 0.4)), s = ease(seg(p, 0.4, 0.6)), r = ease(seg(p, 0.65, 1));
            const amt = 1 - r;
            P.shRx = (-2.7 * w + 1.8 * s) * amt + P.shRx * r;
            P.spineRy = (-0.5 * w + 0.7 * s) * amt;
            P.shLx = -0.8 * amt;
            break;
        }
        case 'saluta': {
            const in_ = ease(seg(p, 0, 0.12)) * (1 - ease(seg(p, 0.85, 1)));
            P.shRz = -0.1 + (-2.5) * in_; P.shRx = -0.2 * in_;
            P.elR = (-0.5 + Math.sin(t * 12) * 0.5) * in_;
            P.headRy = 0.15 * in_;
            break;
        }
        case 'balla': {
            P.bodyY = Math.abs(Math.sin(t * 6)) * 0.1;
            P.bodyRz = Math.sin(t * 6) * 0.1;
            P.spineRy = Math.sin(t * 3) * 0.45;
            P.shLx = -2.5 + Math.sin(t * 6) * 0.5; P.shRx = -2.5 - Math.sin(t * 6) * 0.5;
            P.shLz = 0.4; P.shRz = -0.4;
            P.knL = 0.3 + Math.max(0, Math.sin(t * 6)) * 0.5; P.knR = 0.3 + Math.max(0, -Math.sin(t * 6)) * 0.5;
            P.headRx = Math.sin(t * 12) * 0.12;
            break;
        }
        case 'inchino': {
            const in_ = ease(seg(p, 0, 0.3)) * (1 - ease(seg(p, 0.75, 1)));
            P.spineRx = 0.95 * in_; P.headRx = 0.2 * in_;
            P.shRx = -0.7 * in_; P.elR = -1.5 * in_; P.shRz = 0.5 * in_;
            P.shLx = 0.4 * in_;
            break;
        }
        case 'ride': {
            P.spineRx = -0.25 + Math.sin(t * 22) * 0.05; P.headRx = -0.35;
            P.shLz = 0.3 + Math.sin(t * 22) * 0.05; P.shRz = -0.3 - Math.sin(t * 22) * 0.05;
            P.elL = P.elR = -1.2; P.shLx = P.shRx = -0.3;
            break;
        }
        case 'hit': {
            const k = 1 - ease(seg(p, 0.3, 1));
            P.spineRx = -0.4 * k; P.headRx = -0.35 * k; P.shLz += 0.5 * k; P.shRz -= 0.5 * k;
            break;
        }
    }
}
