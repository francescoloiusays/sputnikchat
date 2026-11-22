// =====================================================================
//  PERSONAGGI 3D PROCEDURALI
//  Specie, corporatura, volto, capelli, vestiario della Sartoria e armi
//  della Forgia, tutto costruito con primitive. Animazioni procedurali.
// =====================================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ITEMS, MATERIALS, HANDLES, GEMS, ELEMENTS, sanitizeAppearance } from './shared/catalog.js';
import { Relief, tileHeights } from './realism.js';

// bagliore morbido per scie, infusioni e aure (una sola texture per tutti)
let glowTex = null;
function fxGlow() {
    if (glowTex) return glowTex;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace;
    return glowTex;
}
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _ax = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _m4 = new THREE.Matrix4();

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
const capsule = (r, len) => geo(`cap${r.toFixed(3)}_${len.toFixed(3)}`, () => new THREE.CapsuleGeometry(r, len, 8, 20));
const sphere = (r, ws = 28, hs = 20) => geo(`sph${r.toFixed(3)}_${ws}`, () => new THREE.SphereGeometry(r, ws, hs));
const rbox = (w, h, d, r = 0.04) => geo(`rb${w.toFixed(3)}_${h.toFixed(3)}_${d.toFixed(3)}_${r}`, () => new RoundedBoxGeometry(w, h, d, 3, r));
const box = (w, h, d) => geo(`bx${w.toFixed(3)}_${h.toFixed(3)}_${d.toFixed(3)}`, () => new THREE.BoxGeometry(w, h, d));
const cyl = (rt, rb, h, s = 20, open = false) => geo(`cy${rt.toFixed(3)}_${rb.toFixed(3)}_${h.toFixed(3)}_${s}_${open}`, () => new THREE.CylinderGeometry(rt, rb, h, s, 1, open));
const cone = (r, h, s = 20) => geo(`co${r.toFixed(3)}_${h.toFixed(3)}_${s}`, () => new THREE.ConeGeometry(r, h, s));
const torus = (R, t, arc = Math.PI * 2, rs = 12, ts = 36) => geo(`to${R}_${t}_${arc.toFixed(3)}`, () => new THREE.TorusGeometry(R, t, rs, ts, arc));

// --- QUALITÀ: in "alta" stoffe fotografiche (Poly Haven, CC0) con riflesso morbido, pelle meno plastica ---
let HQ = false;
export function setCharacterQuality(q) { HQ = q === 'alta'; }
// nome, lato della trama in metri, rilievo, sheen (riflesso radente della stoffa)
const FAB = {
    lino: ['rough_linen', 0.7, 1.0, 0.5],
    denim: ['denim_fabric', 0.55, 0.9, 0.45],
    jersey: ['cotton_jersey', 0.4, 0.8, 0.6],
    cuoio: ['brown_leather', 0.35, 0.8, 0.12],
    velluto: ['cotton_jersey', 0.5, 0.5, 1.0],
};
const fabTex = new Map();
function fabMaps(kind) {
    if (fabTex.has(kind)) return fabTex.get(kind);
    const [name, tile] = FAB[kind];
    const ld = new THREE.TextureLoader();
    const t = (s, cs) => {
        const x = ld.load(`./tex/${name}_${s}.jpg`);
        x.wrapS = x.wrapT = THREE.RepeatWrapping; x.repeat.setScalar(1 / tile);
        x.colorSpace = cs; x.anisotropy = 4;
        return x;
    };
    // il dettaglio è grigio e lineare: moltiplica il colore scelto dal giocatore senza cambiarlo
    const r = { det: t('det', THREE.NoColorSpace), nor: t('nor', THREE.NoColorSpace), rough: t('rough', THREE.NoColorSpace) };
    fabTex.set(kind, r);
    return r;
}
const clothCache = new Map();
function clothMat(color, kind, o = {}) {
    if (!HQ || (o.o ?? 1) < 1) return stdMat(color, o);
    const key = kind + color + (o.side || 0);
    let m = clothCache.get(key);
    if (!m) {
        const [, , ns, sheen] = FAB[kind], f = fabMaps(kind);
        m = new THREE.MeshPhysicalMaterial({
            color, map: f.det, normalMap: f.nor, normalScale: new THREE.Vector2(ns, ns),
            roughnessMap: f.rough, roughness: kind === 'cuoio' ? 0.85 : 1, metalness: 0, side: o.side ?? THREE.FrontSide,
            sheen, sheenRoughness: kind === 'velluto' ? 0.3 : 0.55, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.4),
        });
        m.userData.metric = true;
        clothCache.set(key, m);
    }
    return m;
}
function skinMat(color, o = {}) {
    if (!HQ || (o.o ?? 1) < 1) return stdMat(color, o);
    const key = 'skin' + color;
    let m = clothCache.get(key);
    if (!m) {
        m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.6, sheen: 0.12, sheenRoughness: 0.5, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ff9f80'), 0.3) });
        clothCache.set(key, m);
    }
    return m;
}
// UV in metri per le primitive vestite di stoffa (così la trama ha la stessa grana su tutto il corpo)
const metricCache = new Map();
function metric(g) {
    let c = metricCache.get(g.uuid);
    if (c) return c;
    c = g.clone();
    if (!c.boundingSphere) c.computeBoundingSphere();
    const r = c.boundingSphere.radius, round = /Sphere|Capsule|Cylinder|Torus|Cone/.test(g.type);
    const su = round ? Math.PI * 2 * r : r * 2, sv = round ? Math.PI * r : r * 2;
    const uv = c.attributes.uv;
    if (uv) for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    c.userData.metric = true;
    metricCache.set(g.uuid, c);
    return c;
}

// --- LOFT: corpo sagomato da anelli (sezione a superellisse), estremità arrotondate, UV in metri ---
// rings: [t, rx, rz, oz?] lungo l'asse y; p = 2 ellisse, più alto = più squadrato
// wr: ampiezza delle pieghe della stoffa (frazione del raggio), 0 per la pelle
function loft(key, rings, { p = 2.4, seg = 24, capA = 0.8, capB = 0.8, open = false, sub = 3, wr = 0 } = {}) {
    return geo('loft' + key + '_' + wr, () => {
        const R0 = rings.map(r => ({ t: r[0], rx: r[1], rz: r[2], oz: r[3] || 0 }));
        // anelli intermedi (Catmull-Rom): profilo morbido e abbastanza vertici per le pieghe
        const R = [];
        const cr = (a, b, c, d, u) => 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
        for (let j = 0; j < R0.length - 1; j++) {
            const a = R0[Math.max(j - 1, 0)], b = R0[j], c = R0[j + 1], d = R0[Math.min(j + 2, R0.length - 1)];
            for (let k = 0; k < sub; k++) {
                const u = k / sub, o = {};
                for (const f of ['t', 'rx', 'rz', 'oz']) o[f] = cr(a[f], b[f], c[f], d[f], u);
                R.push(o);
            }
        }
        R.push(R0[R0.length - 1]);
        const all = [];
        const cap = (end, dir, k) => {
            const len = Math.min(end.rx, end.rz) * k, out = [];
            for (let i = 1; i <= 3; i++) {
                const a = i / 3 * Math.PI / 2, s = Math.max(Math.cos(a), 0.0005);
                out.push({ t: end.t + dir * len * Math.sin(a), rx: end.rx * s, rz: end.rz * s, oz: end.oz, wr: 0 });
            }
            return out;
        };
        const up = R[0].t > R[R.length - 1].t;           // anelli dall'alto in basso
        if (!open) all.push(...cap(R[0], up ? 1 : -1, capA).reverse());
        all.push(...R);
        if (!open) all.push(...cap(R[R.length - 1], up ? -1 : 1, capB));
        const e = 2 / p, n = all.length, pos = [], uv = [], idx = [];
        let v = 0;
        for (let j = 0; j < n; j++) {
            const r = all[j];
            if (j) v += Math.hypot(r.t - all[j - 1].t, Math.max(r.rx, r.rz) - Math.max(all[j - 1].rx, all[j - 1].rz));
            const per = Math.PI * (r.rx + r.rz);
            for (let i = 0; i <= seg; i++) {
                const th = -Math.PI / 2 + i / seg * Math.PI * 2;   // cucitura sul retro
                const c = Math.cos(th), s = Math.sin(th);
                const w = wr && r.wr !== 0 ? 1 + wr * (0.6 * Math.sin(r.t * 58 + 1.6 * Math.sin(th * 2 + r.t * 11)) + 0.4 * Math.sin(r.t * 31 - th * 3 + 0.7)) : 1;
                pos.push(r.rx * w * Math.sign(c) * Math.abs(c) ** e, r.t, r.oz + r.rz * w * Math.sign(s) * Math.abs(s) ** e);
                uv.push(i / seg * per, v);
            }
        }
        for (let j = 0; j < n - 1; j++) for (let i = 0; i < seg; i++) {
            const a = j * (seg + 1) + i, b = a + seg + 1;
            if (up) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        g.setIndex(idx);
        g.computeVertexNormals();
        const nr = g.attributes.normal;               // niente spigolo sulla cucitura
        for (let j = 0; j < n; j++) {
            const a = j * (seg + 1), b = a + seg;
            _v1.fromBufferAttribute(nr, a).add(_v2.fromBufferAttribute(nr, b)).normalize();
            nr.setXYZ(a, _v1.x, _v1.y, _v1.z); nr.setXYZ(b, _v1.x, _v1.y, _v1.z);
        }
        g.userData.metric = true;
        return g;
    });
}
const kf = (...a) => a.map(x => x.toFixed(3)).join('_');
// arti: L = spessore base della corporatura
const thighGeo = (L, f, wr) => loft('th' + kf(L, f), [[0.02, 1.4 * L * f, 1.32 * L * f], [-0.08, 1.38 * L * f, 1.3 * L * f, 0.004], [-0.22, 1.16 * L, 1.1 * L], [-0.36, 0.98 * L, 0.95 * L], [-0.42, 0.96 * L, 0.95 * L]], { capA: 0.7, capB: 0.9, wr });
const calfGeo = (L, wr) => loft('ca' + kf(L), [[0.0, 0.95 * L, 0.95 * L], [-0.1, 1.04 * L, 1.1 * L, -0.012], [-0.22, 0.86 * L, 0.86 * L, -0.005], [-0.33, 0.66 * L, 0.7 * L], [-0.37, 0.66 * L, 0.68 * L]], { capA: 0.9, capB: 0.6, wr });
const upperArmGeo = (L, wr) => loft('ua' + kf(L), [[0.0, 1.22 * L, 1.18 * L], [-0.08, 1.16 * L, 1.06 * L], [-0.18, 1.02 * L, 0.98 * L], [-0.3, 0.88 * L, 0.88 * L]], { capA: 1, capB: 0.9, wr });
const foreArmGeo = (L, wr) => loft('fa' + kf(L), [[0.0, 0.9 * L, 0.9 * L], [-0.06, 1.0 * L, 0.94 * L], [-0.19, 0.72 * L, 0.64 * L], [-0.24, 0.62 * L, 0.55 * L]], { capA: 0.9, capB: 0.6, wr });
const handGeo = L => loft('ha' + kf(L), [[0.02, 0.48 * L, 0.8 * L], [-0.01, 0.58 * L, 1.0 * L], [-0.05, 0.52 * L, 0.98 * L, 0.004], [-0.08, 0.42 * L, 0.8 * L, 0.008]], { p: 2.6, capA: 0.9, capB: 1 });
// scarpa costruita lungo y e poi girata in avanti: suola piatta, punta più bassa del tallone
const shoeGeo = () => geo('shoe', () => {
    const rs = [[-0.07, 0.05, 0.04], [0.0, 0.055, 0.043], [0.06, 0.06, 0.035], [0.115, 0.056, 0.025], [0.15, 0.046, 0.019]].map(([t, rx, rz]) => [t, rx, rz, -rz]);
    const g = loft('shoe_raw', rs, { p: 2.8, capA: 0.6, capB: 0.7 }).clone();
    g.rotateX(Math.PI / 2);
    g.userData.metric = true;
    return g;
});
// busto: vita, petto, spalle che scendono verso il collo
function torsoGeo(W, D, H, fem) {
    const r = fem
        ? [[-0.07, 0.5, 0.49], [0, 0.48, 0.47], [0.14, 0.41, 0.44], [0.3, 0.46, 0.48, 0.005], [0.4, 0.47, 0.49, 0.005], [0.46, 0.46, 0.46], [0.5, 0.38, 0.38], [0.53, 0.2, 0.28]]
        : [[-0.07, 0.49, 0.49], [0, 0.47, 0.47], [0.12, 0.45, 0.47], [0.26, 0.48, 0.48, 0.005], [0.38, 0.5, 0.5, 0.005], [0.46, 0.5, 0.48], [0.5, 0.42, 0.4], [0.53, 0.22, 0.3]];
    return loft('to' + kf(W, D, H) + fem, r.map(([t, x, z, o]) => [t / 0.52 * H, x * W, z * D, (o || 0) * D * 4]), { p: 2.8, capA: 0.3, capB: 0.3, wr: HQ ? 0.012 : 0 });
}
// --- TESTA SCOLPITA: la sfera del volto deformata (nuca, mascella, mento, orbite, zigomi).
// Le UV restano quelle della sfera, quindi occhi e bocca dipinti cadono negli stessi punti.
const sstep = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
function headGeo(fem) {
    return geo('head' + fem, () => {
        const g = new THREE.SphereGeometry(HEAD_R, 56, 40);
        const p = g.attributes.position, v = new THREE.Vector3();
        const bump = (cx, cy, cz, w, a) => a * Math.exp(-((v.x - cx) ** 2 + (v.y - cy) ** 2 + (v.z - cz) ** 2) / (w * w));
        for (let i = 0; i < p.count; i++) {
            v.fromBufferAttribute(p, i).normalize();
            const ax = Math.abs(v.x);
            let k = 1;
            k += 0.045 * sstep(0, 0.8, -v.z) * sstep(-0.3, 0.4, v.y);                // nuca piena
            for (const s of [-1, 1]) {
                k += bump(s * 0.397, 0.19, 0.897, 0.15, -0.03);                     // orbite
                k += bump(s * 0.36, 0.38, 0.85, 0.2, fem ? 0.012 : 0.028);           // arcata sopracciliare
                k += bump(s * 0.56, -0.06, 0.8, 0.2, fem ? 0.03 : 0.022);            // zigomi
                k += bump(s * 0.78, 0.36, 0.48, 0.24, -0.025);                       // tempie
            }
            k += bump(0, -0.42, 0.9, 0.24, 0.018);                                   // bocca appena in fuori
            const low = sstep(0.1, -0.9, v.y), front = sstep(-0.2, 0.9, v.z);
            let x = v.x * k * (0.95 - (fem ? 0.2 : 0.13) * low * (0.4 + 0.6 * front));  // mascella che si stringe verso il mento
            let y = v.y * k, z = v.z * k;
            z += (fem ? 0.05 : 0.08) * low * sstep(0.5, 0.95, v.z) * (1 - ax);       // mento
            y -= (fem ? 0.0 : 0.03) * low * front;                                   // mascella maschile più lunga
            p.setXYZ(i, x * HEAD_R, y * HEAD_R, z * HEAD_R);
        }
        g.computeVertexNormals();
        return g;
    });
}
const noseGeo = fem => loft('nose' + fem, (fem
    ? [[0.03, 0.009, 0.007], [0.004, 0.011, 0.011, 0.006], [-0.022, 0.016, 0.017, 0.012], [-0.032, 0.014, 0.012, 0.009]]
    : [[0.034, 0.011, 0.008], [0.004, 0.014, 0.014, 0.008], [-0.026, 0.02, 0.022, 0.016], [-0.038, 0.018, 0.015, 0.012]]), { p: 2, seg: 16, capA: 0.6, capB: 0.9, sub: 3 });
const earGeo = () => loft('ear', [[0.036, 0.008, 0.02], [0.012, 0.011, 0.03], [-0.016, 0.011, 0.025], [-0.034, 0.009, 0.013]], { p: 2.2, seg: 14, capA: 0.9, capB: 0.9 });
const elfEarGeo = () => loft('elfear', [[-0.1, 0.014, 0.012], [-0.04, 0.042, 0.011], [0.03, 0.03, 0.009], [0.1, 0.004, 0.004]], { p: 2.2, seg: 14, capA: 0.6, capB: 0.3 });

// --- CAPELLI A CIOCCHE: ciocche affusolate che seguono la testa, fuse in un'unica geometria per taglio ---
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hairGeo(style, hatOn) {
    return geo('hair' + style + hatOn, () => {
        const R = HEAD_R, pos = [], uv = [], idx = [];
        const rnd = rng(style.length * 97 + (hatOn ? 7 : 1));
        const T = new THREE.Vector3(), N0 = new THREE.Vector3(), B = new THREE.Vector3(), Nn = new THREE.Vector3(), P = new THREE.Vector3();
        // punto sulla calotta: direzione → raggio (la testa è allungata in y come la mesh del volto)
        const sc = (d, r) => new THREE.Vector3(d.x * R * r, d.y * R * r * 1.08, d.z * R * r);
        const lock = (pts, w, th, { n = 9, seg = 5, tip = 0.15, side = null } = {}) => {
            const curve = new THREE.CatmullRomCurve3(pts);
            const base = pos.length / 3;
            for (let i = 0; i <= n; i++) {
                const s = i / n;
                curve.getPointAt(s, P); curve.getTangentAt(s, T);
                N0.copy(P).normalize();
                if (side) B.copy(side); else B.crossVectors(T, N0);
                if (B.lengthSq() < 1e-6) B.set(1, 0, 0);
                B.normalize(); Nn.crossVectors(B, T).normalize();
                const tp = 1 - (1 - tip) * s ** 1.6, ww = w * tp * (i === 0 ? 0.8 : 1), tt = th * tp;
                for (let j = 0; j <= seg; j++) {
                    const a = j / seg * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
                    pos.push(P.x + B.x * c * ww + Nn.x * sn * tt, P.y + B.y * c * ww + Nn.y * sn * tt, P.z + B.z * c * ww + Nn.z * sn * tt);
                    uv.push(j / seg, s);
                }
            }
            for (let i = 0; i < n; i++) for (let j = 0; j < seg; j++) {
                const a = base + i * (seg + 1) + j, b = a + seg + 1;
                idx.push(a, b, a + 1, a + 1, b, b + 1);
            }
        };
        // asse della calotta (inclinata all'indietro come la mesh "haircap") e radici distribuite su di essa
        const axis = new THREE.Vector3(0, Math.cos(0.42), -Math.sin(0.42));
        const roots = (count, maxAng, minY = -1, maxY = 1) => {
            const out = [];
            for (let i = 0; out.length < count && i < count * 6; i++) {
                const y = 1 - (i + 0.5) / (count * 3), r = Math.sqrt(1 - y * y), ph = i * 2.39996;
                const d = new THREE.Vector3(Math.cos(ph) * r, y, Math.sin(ph) * r);
                if (d.angleTo(axis) < maxAng && d.y >= minY && d.y <= maxY) out.push(d);
            }
            return out;
        };
        const slerpDir = (a, b, t) => new THREE.Vector3().copy(a).lerp(b, t).normalize();
        const crown = new THREE.Vector3(0, 0.75, -0.66).normalize();
        // ciocche corte e adagiate: partono dalla radice e scorrono lontano dalla corona
        const flat = (count, len, w, th, lift = 1.085) => {
            for (const d of roots(count, 1.25)) {
                const away = d.clone().sub(crown.clone().multiplyScalar(d.dot(crown))).normalize();
                if (!isFinite(away.x)) away.set(0, 0, 1);
                const e = d.clone().addScaledVector(away, len * (0.8 + rnd() * 0.4)).normalize();
                if (e.angleTo(axis) > 1.33) e.copy(d);
                const m = slerpDir(d, e, 0.5);
                lock([sc(d, lift - 0.015), sc(m, lift + 0.004 + rnd() * 0.004), sc(e, lift - 0.006)], w * (0.8 + rnd() * 0.4), th, { n: 6, tip: 0.3 });
            }
        };
        switch (style) {
            case 'corti':
                if (!hatOn) flat(120, 0.5, 0.036, 0.006);
                break;
            case 'ciuffo':
                if (hatOn) break;
                flat(110, 0.45, 0.036, 0.006);
                for (let i = 0; i < 7; i++) {
                    const x = (i - 3) * 0.06 + 0.04, d = new THREE.Vector3(x, 0.9, 0.42).normalize();
                    const r = sc(d, 1.06);
                    lock([r, r.clone().add(new THREE.Vector3(0.02 + x * 0.2, 0.05, 0.05)), r.clone().add(new THREE.Vector3(0.05 + x * 0.3, 0.06, 0.11)), r.clone().add(new THREE.Vector3(0.08 + x * 0.3, 0.03, 0.15))],
                        0.03 + rnd() * 0.01, 0.014, { tip: 0.1 });
                }
                break;
            case 'cresta':
                if (hatOn) break;
                for (let i = 0; i < 9; i++) {
                    const ang = -0.95 + i * 0.27, d = new THREE.Vector3(0, Math.cos(ang), Math.sin(ang));
                    const r = sc(d, 1.0), out = d.clone().multiplyScalar(0.14 + 0.03 * Math.sin(i * 1.3)).add(new THREE.Vector3(0, 0.03, -0.05));
                    lock([r, r.clone().addScaledVector(out, 0.5), r.clone().add(out)], 0.035, 0.012, { side: new THREE.Vector3(0, -Math.sin(ang), Math.cos(ang)), tip: 0.05 });
                }
                break;
            case 'lunghi': {
                // dalla calotta scendono lungo la testa, poi cadono verso le spalle (mai davanti al viso)
                for (const d of roots(hatOn ? 80 : 130, 1.25, -1, hatOn ? 0.45 : 1)) {
                    let hx = d.x, hz = d.z;
                    if (hz > -0.1) { hx = (Math.abs(d.x) < 0.08 ? (rnd() < 0.5 ? -1 : 1) : Math.sign(d.x)); hz = Math.min(d.z, 0.35) * 0.6; }
                    const h = new THREE.Vector3(hx, 0, hz).normalize();
                    const ear = new THREE.Vector3(h.x, -0.05, h.z).normalize();
                    const mid = slerpDir(d, ear, 0.5);
                    const hang = sc(ear, 1.14), drop = -0.2 - rnd() * 0.08 - (h.z < -0.5 ? 0.06 : 0);
                    lock([sc(d, 1.075), sc(mid, 1.1), hang, hang.clone().add(new THREE.Vector3(h.x * 0.02, drop * 0.5, h.z * 0.02)), hang.clone().add(new THREE.Vector3(h.x * 0.035, drop, h.z * 0.03))],
                        0.042 + rnd() * 0.012, 0.0065, { n: 12, tip: 0.3 });
                }
                break;
            }
            case 'codino': {
                const tie = new THREE.Vector3(0, -0.02, -1).normalize(), tp = sc(tie, 1.1);
                if (!hatOn) for (const d of roots(70, 1.25)) {
                    if (d.angleTo(tie) < 0.25) continue;
                    const m = slerpDir(d, tie, 0.55);
                    lock([sc(d, 1.075), sc(m, 1.085), tp], 0.036, 0.006, { n: 7, tip: 0.5 });
                }
                for (let i = 0; i < 9; i++) {
                    const a = i / 9 * Math.PI * 2, o = new THREE.Vector3(Math.cos(a) * 0.012, Math.sin(a) * 0.012, 0);
                    lock([tp.clone().add(o), tp.clone().add(new THREE.Vector3(o.x * 2, -0.04, -0.05)), tp.clone().add(new THREE.Vector3(o.x * 2.5, -0.13, -0.07)), tp.clone().add(new THREE.Vector3(o.x * 1.5, -0.24, -0.05))],
                        0.022, 0.011, { n: 10, tip: 0.2 });
                }
                break;
            }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        g.setIndex(idx);
        g.computeVertexNormals();
        return g;
    });
}
function hairMat(color, o = {}) {
    if (!HQ || (o.o ?? 1) < 1) return stdMat(color, o);
    const key = 'hair' + color;
    let m = clothCache.get(key);
    if (!m) {
        m = new THREE.MeshPhysicalMaterial({
            color, roughness: 0.5, sheen: 0.8, sheenRoughness: 0.3, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#fff4e0'), 0.45),
        });
        clothCache.set(key, m);
    }
    return m;
}

// --- ACCESSORI: materiali (metallo graffiato, maglia di ferro, gemme, corno) ---
let scratchTex = null;
function scratches() {
    if (scratchTex) return scratchTex;
    const n = 256, c = document.createElement('canvas'); c.width = c.height = n;
    const g = c.getContext('2d'), r = rng(31);
    g.fillStyle = 'rgb(96,96,96)'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 900; i++) { const v = 70 + r() * 60 | 0; g.fillStyle = `rgba(${v},${v},${v},0.5)`; g.fillRect(r() * n, r() * n, 2 + r() * 4, 2 + r() * 4); }
    g.lineCap = 'round';
    for (let i = 0; i < 160; i++) {
        const v = 115 + r() * 50 | 0, x = r() * n, y = r() * n, a = r() * Math.PI, l = 4 + r() * 22;
        g.strokeStyle = `rgba(${v},${v},${v},${0.25 + r() * 0.35})`; g.lineWidth = 0.5 + r() * 0.6;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    scratchTex = new THREE.CanvasTexture(c);
    scratchTex.wrapS = scratchTex.wrapT = THREE.RepeatWrapping; scratchTex.repeat.setScalar(4); scratchTex.colorSpace = THREE.NoColorSpace;
    return scratchTex;
}
let chainTex = null;
function chainmail() {
    if (chainTex) return chainTex;
    // anelli intrecciati: righe sfalsate di toroidi visti dall'alto, trasformati in rilievo
    const n = 256, H = new Float32Array(n * n), sp = 16, rr = 7.2, tw = 2.3;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        let h = 0;
        for (let row = -1; row <= 1; row++) for (let col = -1; col <= 1; col++) {
            const cy = (Math.floor(y / sp) + row) * sp + sp / 2, off = (Math.floor(y / sp) + row) & 1 ? sp / 2 : 0;
            const cx = (Math.floor((x - off) / sp) + col) * sp + sp / 2 + off;
            const d = Math.abs(Math.hypot(x - cx, (y - cy) * 1.15) - rr);
            if (d < tw) h = Math.max(h, Math.sqrt(1 - (d / tw) ** 2) * (((row + col) & 1) ? 0.85 : 1));
        }
        H[y * n + x] = h;
    }
    const rel = new Relief(2.2, n);
    chainTex = rel.like({ wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, repeat: new THREE.Vector2(1 / 0.13, 1 / 0.13), anisotropy: 4 });
    rel.bake(H);
    return chainTex;
}
const accCache = new Map();
function accMat(key, make) { let m = accCache.get(key); if (!m) { m = make(); accCache.set(key, m); } return m; }
// metallo: o.r ruvidità media, o.e/ei bagliore, o.chain = maglia di ferro, o.cc = vernice lucida
function metalMat(color, o = {}) {
    if (!HQ) return stdMat(color, { m: 0.85, r: o.r ?? 0.35, e: o.e, ei: o.ei, side: o.side });
    return accMat(['met', color, o.r, o.e, o.ei, o.chain, o.cc, o.side].join('|'), () => {
        const m = new THREE.MeshPhysicalMaterial({
            color, metalness: 1, roughness: Math.min(1, (o.r ?? 0.32) / 0.38), roughnessMap: scratches(),
            emissive: new THREE.Color(o.e || 0), emissiveIntensity: o.ei ?? 1, clearcoat: o.cc || 0, clearcoatRoughness: 0.25,
            side: o.side ?? THREE.FrontSide,
        });
        if (o.chain) { m.normalMap = chainmail(); m.normalScale.set(1.2, 1.2); m.userData.metric = true; }
        return m;
    });
}
function gemMat(color, glow = 0.35) {
    if (!HQ) return stdMat(color, { r: 0.2, e: color, ei: glow });
    return accMat('gem' + color + glow, () => new THREE.MeshPhysicalMaterial({
        color, roughness: 0.08, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05,
        emissive: new THREE.Color(color), emissiveIntensity: glow, iridescence: 0.5, iridescenceIOR: 1.6,
    }));
}
function hornMat(color) {
    if (!HQ) return stdMat(color, { r: 0.5 });
    return accMat('horn' + color, () => new THREE.MeshPhysicalMaterial({ color, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.35, sheen: 0.3, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.3) }));
}
// tubo lungo una curva con raggio variabile (corna, becco, piume dell'elmo, bordi dorati)
function sweep(key, pts, rFn, { n = 24, seg = 12, flat = 1, closed = false } = {}) {
    return geo('sw' + key, () => {
        const curve = new THREE.CatmullRomCurve3(pts, closed);
        const tg = new THREE.TubeGeometry(curve, n, 1, seg, closed);
        // TubeGeometry ha raggio 1: lo riscaliamo anello per anello
        const p = tg.attributes.position, fr = curve.computeFrenetFrames(n, closed), P = new THREE.Vector3();
        for (let i = 0; i <= n; i++) {
            const s = i / n; curve.getPointAt(s, P);
            const r = rFn(s);
            for (let j = 0; j <= seg; j++) {
                const k = i * (seg + 1) + j;
                _v1.fromBufferAttribute(p, k).sub(P);
                const a = _v1.dot(fr.normals[i]), b = _v1.dot(fr.binormals[i]);
                _v1.copy(P).addScaledVector(fr.normals[i], a * r).addScaledVector(fr.binormals[i], b * r * flat);
                p.setXYZ(k, _v1.x, _v1.y, _v1.z);
            }
        }
        tg.computeVertexNormals();
        return tg;
    });
}
// nastro piatto lungo una curva (vessillo della piuma): uv u attraverso, v lungo
function ribbon(key, pts, wFn, up, n = 24) {
    return geo('rb' + key, () => {
        const curve = new THREE.CatmullRomCurve3(pts), pos = [], uv = [], idx = [], P = new THREE.Vector3(), T = new THREE.Vector3(), S = new THREE.Vector3();
        for (let i = 0; i <= n; i++) {
            const s = i / n; curve.getPointAt(s, P); curve.getTangentAt(s, T);
            S.crossVectors(T, up).normalize().multiplyScalar(wFn(s));
            pos.push(P.x - S.x, P.y - S.y, P.z - S.z, P.x + S.x, P.y + S.y, P.z + S.z);
            uv.push(0, s, 1, s);
            if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        g.setIndex(idx); g.computeVertexNormals();
        return g;
    });
}
let featherTex = null;
function featherMap() {
    if (featherTex) return featherTex;
    const w = 64, h = 256, c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), r = rng(5);
    g.lineCap = 'round';
    for (let y = 4; y < h; y += 1.6) {
        const edge = w / 2 * (0.75 + r() * 0.25) * Math.sin(Math.PI * Math.min(1, y / h * 1.05) ** 0.7);
        const gap = r() < 0.05;                       // qualche barba separata, come le piume vere
        if (gap) continue;
        const v = 200 + r() * 55 | 0;
        g.strokeStyle = `rgba(${v},${v},${v},1)`; g.lineWidth = 1.3;
        for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w / 2 + s * edge, y - edge * 0.55); g.stroke(); }
    }
    g.fillStyle = '#fff'; g.fillRect(w / 2 - 1.5, 0, 3, h);
    featherTex = new THREE.CanvasTexture(c); featherTex.colorSpace = THREE.SRGBColorSpace; featherTex.anisotropy = 4;
    return featherTex;
}
const lathe = (key, pts, seg = 48) => geo('la' + key, () => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg));

const pelvisGeo = (Wp, D) => loft('pe' + kf(Wp, D), [[-0.1, 0.47 * Wp, 0.42 * D], [-0.02, 0.5 * Wp, 0.45 * D], [0.05, 0.47 * Wp, 0.44 * D]], { p: 2.6, capA: 0.25, capB: 0.4 });

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
    const key = ['face', a.sex, a.species, a.skin, a.eyes, a.eyeColor, a.mouth, a.beard, a.hairColor].join('|');
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
            // ciglia: una linea scura sopra l'occhio e due ciglia verso l'esterno
            if (a.sex === 'f') {
                const w = sp === 'ratto' ? 14 : 11;
                g.strokeStyle = '#1a0f0a'; g.lineWidth = 2.4; g.lineCap = 'round';
                g.beginPath(); g.moveTo(x - w, ey - ry * 0.35); g.quadraticCurveTo(x, ey - ry - 3, x + w, ey - ry * 0.35); g.stroke();
                for (const k of [0.5, 0.85]) { const lx = x + s * w * k; g.beginPath(); g.moveTo(lx, ey - ry * 0.75); g.lineTo(lx + s * 4, ey - ry - 5); g.stroke(); }
            }
            g.strokeStyle = sp === 'ratto' ? shade(a.skin, 0.6) : shade(a.hairColor, 0.9);
            g.lineWidth = a.sex === 'f' ? 3 : 5; g.lineCap = 'round';
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
            const lip = a.sex === 'f' ? '#a8344c' : '#5a1a14';
            g.strokeStyle = lip; g.fillStyle = lip; g.lineWidth = a.sex === 'f' ? 5.5 : 4;
            // labbro superiore appena accennato
            if (a.sex === 'f' && a.mouth !== 'sorpreso' && a.mouth !== 'zanne') { g.save(); g.globalAlpha = 0.55; g.beginPath(); g.ellipse(cx, my - 3, 11, 3.2, 0, Math.PI, 0); g.fill(); g.restore(); }
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

// --- MATERIALI DELLE ARMI ---
// trame disegnate una volta sola: acciaio spazzolato lungo la lama, venatura del legno, scaglie dell'ossidiana, pori dell'osso, rune
const wTex = new Map();
function wTexture(name, make) { let t = wTex.get(name); if (!t) { t = make(); wTex.set(name, t); } return t; }
const canvasTex = (c, rx, ry, cs = THREE.NoColorSpace) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = cs; t.anisotropy = 4;
    return t;
};
// ruvidità dell'acciaio: righe fini nel senso della lama, qualche graffio di traverso, piccoli pori
function brushedTex() {
    return wTexture('brushed', () => {
        const n = 256, c = document.createElement('canvas'); c.width = c.height = n;
        const g = c.getContext('2d'), r = rng(11);
        g.fillStyle = 'rgb(150,150,150)'; g.fillRect(0, 0, n, n);
        for (let x = 0; x < n; x++) { const v = 150 + (r() - 0.5) * 50 | 0; g.fillStyle = `rgba(${v},${v},${v},0.55)`; g.fillRect(x, 0, 1, n); }
        g.lineCap = 'round';
        for (let i = 0; i < 260; i++) {
            const x = r() * n, y = r() * n, a = Math.PI / 2 + (r() - 0.5) * (r() < 0.8 ? 0.25 : 2.4), l = 6 + r() * 40, v = r() < 0.5 ? 95 + r() * 30 : 185 + r() * 40;
            g.strokeStyle = `rgba(${v | 0},${v | 0},${v | 0},${0.25 + r() * 0.4})`; g.lineWidth = 0.4 + r() * 0.7;
            g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
        }
        for (let i = 0; i < 120; i++) { const v = 200 + r() * 40 | 0; g.fillStyle = `rgba(${v},${v},${v},0.6)`; g.beginPath(); g.arc(r() * n, r() * n, 0.6 + r() * 1.2, 0, 7); g.fill(); }
        return canvasTex(c, 1 / 0.06, 1 / 0.25);
    });
}
// venatura del legno: fibre lunghe nel senso dell'asta, con qualche nodo appena accennato
function grainTex() {
    return wTexture('grain', () => {
        const n = 256, c = document.createElement('canvas'); c.width = c.height = n;
        const g = c.getContext('2d'), r = rng(23), img = g.createImageData(n, n), d = img.data;
        const ph = Array.from({ length: 8 }, () => r() * 6.28);
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
            const w = x + 6 * Math.sin(y / n * 6.283 * 2 + ph[0]) + 3 * Math.sin(y / n * 6.283 * 5 + ph[1]);
            const ring = 0.5 + 0.5 * Math.sin(w / n * 6.283 * 9 + 2 * Math.sin(w / n * 6.283 * 2 + ph[2]));
            const fib = 0.5 + 0.5 * Math.sin(x * 2.1 + ph[3] + Math.sin(y * 0.05) * 2);
            const v = 0.8 + 0.14 * ring ** 3 - 0.05 * fib + (r() - 0.5) * 0.04;
            const i = (y * n + x) * 4; d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, v * 255)); d[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        return canvasTex(c, 1 / 0.05, 1 / 0.4);
    });
}
// ossidiana scheggiata: ogni cella è una piccola conca, come i distacchi della pietra lavorata
function flakesTex() {
    return wTexture('flakes', () => {
        const n = 256, r = rng(41), P = Array.from({ length: 34 }, () => [r() * n, r() * n, 0.6 + r() * 0.8]), H = new Float32Array(n * n);
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
            let best = 1e9, k = 1;
            for (const [px, py, s] of P) {          // distanza sul toro: la trama si ripete senza cuciture
                let dx = Math.abs(x - px), dy = Math.abs(y - py); dx = Math.min(dx, n - dx); dy = Math.min(dy, n - dy);
                const dd = Math.hypot(dx, dy) * s; if (dd < best) { best = dd; k = s; }
            }
            H[y * n + x] = (best / 34) ** 2 * 0.7 + 0.04 * Math.cos(best * 0.9 * k);
        }
        const rel = new Relief(2.6, n);
        const t = rel.like({ wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, repeat: new THREE.Vector2(1 / 0.07, 1 / 0.07), anisotropy: 4 });
        rel.bake(H);
        return t;
    });
}
// osso: grana porosa e qualche crepa sottile
function boneTex() {
    return wTexture('bone', () => {
        const n = 256, r = rng(57), H = tileHeights(n, 9);
        for (let i = 0; i < 400; i++) { const x = r() * n | 0, y = r() * n | 0; for (let a = -1; a <= 1; a++) for (let b = -2; b <= 2; b++) H[((y + b + n) % n) * n + (x + a + n) % n] -= 0.12; }
        for (let k = 0; k < 7; k++) {
            let x = r() * n, y = r() * n, a = Math.PI / 2 + (r() - 0.5) * 0.6;
            for (let s = 0; s < 70; s++) { a += (r() - 0.5) * 0.5; x += Math.cos(a); y += Math.sin(a); H[((y | 0) % n + n) % n * n + (((x | 0) % n) + n) % n] -= 0.35; }
        }
        const rel = new Relief(1.6, n);
        const t = rel.like({ wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, repeat: new THREE.Vector2(1 / 0.08, 1 / 0.08), anisotropy: 4 });
        rel.bake(H);
        // colore: ingiallito a chiazze, più scuro nei pori e nelle crepe
        const c = document.createElement('canvas'); c.width = c.height = n;
        const g = c.getContext('2d'), img = g.createImageData(n, n), d = img.data;
        let lo = 1e9, hi = -1e9; for (const v of H) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
        for (let i = 0; i < n * n; i++) { const v = (H[i] - lo) / (hi - lo), k = 0.62 + 0.38 * v ** 0.6; d[i * 4] = 255 * k; d[i * 4 + 1] = 248 * k; d[i * 4 + 2] = 228 * k; d[i * 4 + 3] = 255; }
        g.putImageData(img, 0, 0);
        t.userData.col = canvasTex(c, 1 / 0.08, 1 / 0.08);
        return t;
    });
}
// rune dell'argento spettrale: una fila di segni al centro della lama, nero tutto attorno
function runeTex() {
    return wTexture('rune', () => {
        const w = 64, h = 512, c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d'), r = rng(73);
        g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#fff'; g.lineWidth = 2.6; g.lineCap = 'round'; g.shadowColor = '#fff'; g.shadowBlur = 5;
        for (let y = 20; y < h - 20; y += 46) {
            const cx = w / 2, top = y, bot = y + 32;
            g.beginPath(); g.moveTo(cx, top); g.lineTo(cx, bot);
            for (let k = 0; k < 2; k++) { const yy = top + r() * 28, s = r() < 0.5 ? -1 : 1; g.moveTo(cx, yy); g.lineTo(cx + s * (6 + r() * 6), yy + (r() - 0.5) * 16); }
            g.stroke();
        }
        const t = canvasTex(c, 1 / 0.016, 1 / 0.26);
        t.wrapS = THREE.ClampToEdgeWrapping; t.offset.x = 0.5;
        return t;
    });
}
function woodMat(color) {
    if (!HQ) return stdMat(color, { r: 0.62 });
    return accMat('wood' + color, () => {
        const t = grainTex();
        return new THREE.MeshPhysicalMaterial({ color, map: t, bumpMap: t, bumpScale: 1.2, roughness: 0.58, clearcoat: 0.18, clearcoatRoughness: 0.5 });
    });
}
function boneMat(color) {
    if (!HQ) return stdMat(color, { r: 0.55 });
    return accMat('bone' + color, () => new THREE.MeshPhysicalMaterial({
        color, roughness: 0.5, normalMap: boneTex(), map: boneTex().userData.col, normalScale: new THREE.Vector2(0.9, 0.9), clearcoat: 0.2, clearcoatRoughness: 0.45,
        sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.4),
    }));
}
// ogni materiale della Forgia dà quattro finiture: piatto della lama, filo affilato, parti forgiate (occhio, gorbia), decori
const WFIN = {
    legno: { flat: ['#8a5f38', 0, 0.58], edge: ['#9a6c42', 0, 0.5], forged: ['#7a5230', 0, 0.62] },
    ferro: { flat: ['#c0c6cd', 1, 0.44], edge: ['#d9dde2', 1, 0.15], forged: ['#4d5055', 0.85, 0.58] },
    osso: { flat: ['#e8dcbc', 0, 0.5], edge: ['#f4ecd6', 0, 0.42], forged: ['#d6c8a4', 0, 0.55] },
    ossidiana: { flat: ['#0e0913', 0, 0.06], edge: ['#2b1342', 0, 0.05], forged: ['#140d1b', 0, 0.12] },
    argento: { flat: ['#dce5f1', 1, 0.2], edge: ['#f3f7ff', 1, 0.1], forged: ['#c9d3e2', 1, 0.28] },
    oro: { flat: ['#ffcf72', 1, 0.3], edge: ['#ffe4a6', 1, 0.14], forged: ['#ecb752', 1, 0.34] },
};
function weaponMat(kind, part, blade = false) {
    const runes = blade && part === 'flat' && kind === 'argento';
    const F = WFIN[kind] || WFIN.ferro, [color, metal, rough] = F[part] || F.flat, src = MATERIALS[kind] || MATERIALS.ferro;
    const glow = kind === 'ossidiana' ? (part === 'edge' ? ['#7a2fd0', 0.7] : ['#2a0d45', 0.25]) : kind === 'argento' && part !== 'edge' ? ['#3d6bff', runes ? 3 : 0.1] : null;
    if (!HQ) return stdMat(color, { m: metal, r: rough + 0.08, e: glow?.[0], ei: glow ? Math.min(glow[1], 0.8) : 1 });
    return accMat(['arma', kind, part, blade].join('|'), () => {
        if (kind === 'legno') return woodMat(color);
        if (kind === 'osso') return boneMat(color);
        const m = new THREE.MeshPhysicalMaterial({ color, metalness: metal, roughness: rough });
        // il metallo prende più luce dal cielo: senza, il piatto riflette solo il terreno e sembra nero
        if (metal) { m.roughnessMap = brushedTex(); m.roughness = Math.min(1, rough / 0.59); m.envMapIntensity = kind === 'oro' ? 1.7 : 1.5; }
        // sulla lama il riflesso si allunga nel senso della spazzolatura, come sull'acciaio vero
        if (metal && blade) { m.anisotropy = part === 'edge' ? 0.4 : 0.65; m.anisotropyRotation = Math.PI / 2; }
        if (kind === 'ossidiana') {
            Object.assign(m, { clearcoat: 1, clearcoatRoughness: 0.03, ior: 1.5, specularIntensity: 1, normalMap: flakesTex() });
            m.normalScale.set(0.7, 0.7);
        }
        if (glow) { m.emissive.set(glow[0]); m.emissiveIntensity = glow[1]; if (runes) m.emissiveMap = runeTex(); }
        return m;
    });
}
// il manico scelto alla Forgia
function handleMat(kind, color) {
    if (kind === 'cuoio') return clothMat(color, 'cuoio');
    if (kind === 'seta') return clothMat(color, 'velluto');
    if (kind === 'osso') return boneMat(color);
    if (kind === 'oro') return HQ ? accMat('filigrana', () => new THREE.MeshPhysicalMaterial({ color: '#e8b04a', metalness: 1, roughness: 0.3 })) : stdMat(color, { m: 0.9, r: 0.35 });
    return woodMat(color);
}

// lama forgiata: f(s) dà per ogni stazione il centro (x,y), le mezze larghezze verso il filo (we) e verso il dorso (wb),
// il mezzo spessore al centro (t), quello del dorso se a un filo solo (tb), quanto resta prima dello smusso (k) e lo sguscio (fd).
// Le facce sono pezzi separati: lo smusso del filo e la costola centrale restano spigoli netti che prendono la luce.
function bladeGeo(key, n, f, { m = 4, flip = false, eb = 0.75, ful = 0 } = {}) {
    return geo('bl' + key, () => {
        const st = [];
        for (let i = 0; i <= n; i++) st.push({ k: 0.42, fd: 0, tb: 0, ...f(i / n) });
        let L = 0;
        st.forEach((d, i) => {
            const a = st[Math.max(i - 1, 0)], b = st[Math.min(i + 1, n)];
            let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
            d.ax = flip ? -ty : ty; d.ay = flip ? tx : -tx;
            if (i) L += Math.hypot(d.x - st[i - 1].x, d.y - st[i - 1].y);
            d.v = L;
        });
        const prof = (d, u) => {
            const a = Math.abs(u);
            let z;
            if (u < 0 && d.tb > 0) z = d.t + (d.tb - d.t) * a * a;
            else { const tk = d.t * d.k; z = a < eb ? d.t - (d.t - tk) * a / eb : tk * (1 - (a - eb) / (1 - eb)); }
            if (ful && a < ful && !(u < 0 && d.tb > 0)) z -= d.fd * 0.5 * (1 + Math.cos(Math.PI * a / ful));
            return Math.max(z, 0.0004);
        };
        const pos = [], uv = [], idxF = [], idxE = [];
        const patch = (pt, rows, cols, flipW, idx = idxF) => {
            const base = pos.length / 3;
            for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) { const [p, q] = pt(i, j); pos.push(...p); uv.push(...q); }
            for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
                const a = base + i * (cols + 1) + j, b = a + cols + 1;
                if (flipW) idx.push(a, b, a + 1, a + 1, b, b + 1); else idx.push(a, a + 1, b, a + 1, b + 1, b);
            }
        };
        const brk = [0, ...(ful ? [ful] : []), eb, 1];
        const single = st.some(d => d.tb > 0);
        for (const h of [1, -1]) {
            const ivs = h < 0 && single ? [[0, 1]] : brk.slice(0, -1).map((u, i) => [u, brk[i + 1]]);
            for (const [u0, u1] of ivs) for (const sg of [1, -1]) {
                const cols = h < 0 && single ? m * 2 : m;
                patch((i, j) => {
                    const d = st[i], uu = u0 + (u1 - u0) * j / cols, ac = h * uu * (h > 0 ? d.we : d.wb);
                    return [[d.x + d.ax * ac, d.y + d.ay * ac, sg * prof(d, h * uu)], [ac, d.v]];
                }, n, cols, sg * h * (flip ? -1 : 1) < 0, u0 >= eb ? idxE : idxF);
            }
        }
        if (single) {   // dorso arrotondato della lama a un filo solo
            const K = 6;
            patch((i, k) => {
                const d = st[i], ph = Math.PI / 2 - k / K * Math.PI, ac = -d.wb - Math.cos(ph) * d.tb * 0.7;
                return [[d.x + d.ax * ac, d.y + d.ay * ac, Math.sin(ph) * d.tb], [ac + k * 0.002, d.v]];
            }, n, K, !!flip);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        g.setIndex([...idxF, ...idxE]); g.computeVertexNormals();
        g.addGroup(0, idxF.length, 0); g.addGroup(idxF.length, idxE.length, 1);   // piatto e filo hanno finiture diverse
        g.userData.metric = true;
        return g;
    });
}
// impugnatura o asta tornita: il tipo di manico decide il rilievo (cuoio a spirale, seta a rombi, filo d'oro, anelli d'osso)
function gripGeo(key, y0, y1, r0, r1, kind, { ox = 1, bx = null, bz = null, seg = 18, swell = 0.06 } = {}) {
    return geo('gr' + key + kind, () => {
        const L = y1 - y0, dense = kind === 'oro' ? 900 : kind === 'legno' ? 50 : kind === 'nodoso' ? 160 : 420;
        const rows = Math.max(6, Math.round(L * dense)), pos = [], uv = [], idx = [], TAU = Math.PI * 2;
        const fr = x => ((x % 1) + 1) % 1;
        for (let i = 0; i <= rows; i++) {
            const s = i / rows, y = y0 + L * s, rb = (r0 + (r1 - r0) * s) * (1 + swell * Math.sin(Math.PI * s));
            for (let j = 0; j <= seg; j++) {
                const th = j / seg * TAU;
                let d = 0;
                if (kind === 'cuoio') d = 0.1 * Math.sqrt(Math.sin(Math.PI * fr(y / 0.017 + th / TAU))) - 0.05;
                else if (kind === 'seta') d = 0.09 * Math.sqrt(Math.min(Math.sin(Math.PI * fr(y / 0.024 + th / Math.PI)), Math.sin(Math.PI * fr(y / 0.024 - th / Math.PI)))) - 0.04;
                else if (kind === 'oro') d = 0.06 * Math.sin(Math.PI * fr(y / 0.0045 + th / TAU * 2)) - 0.02 + 0.05 * Math.sin(Math.PI * fr(y / 0.03));
                else if (kind === 'osso') d = 0.12 * Math.min(1, Math.sin(Math.PI * fr(y / 0.028)) * 2.2) - 0.07;
                else if (kind === 'nodoso') {
                    d = 0.06 * Math.sin(7 * th + y * 22) + 0.03 * Math.sin(3 * th - y * 9);
                    for (const [yk, tk] of [[0.12, 1], [0.55, 4], [0.86, 2.2], [1.02, 5.3]]) d += 0.3 * Math.exp(-(((y - yk) / 0.025) ** 2) - ((Math.atan2(Math.sin(th - tk), Math.cos(th - tk)) / 0.5) ** 2));
                }
                const r = rb * (1 + d);
                pos.push(Math.sin(th) * r * ox + (bx ? bx(y) : 0), y, Math.cos(th) * r + (bz ? bz(y) : 0));
                uv.push(th * rb, y);
            }
        }
        for (let i = 0; i < rows; i++) for (let j = 0; j < seg; j++) {
            const a = i * (seg + 1) + j, b = a + seg + 1;
            idx.push(a, b, a + 1, a + 1, b, b + 1);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        g.setIndex(idx); g.computeVertexNormals();
        const nr = g.attributes.normal;               // niente spigolo sulla cucitura
        for (let i = 0; i <= rows; i++) {
            const a = i * (seg + 1), b = a + seg;
            _v1.fromBufferAttribute(nr, a).add(_v2.fromBufferAttribute(nr, b)).normalize();
            nr.setXYZ(a, _v1.x, _v1.y, _v1.z); nr.setXYZ(b, _v1.x, _v1.y, _v1.z);
        }
        g.userData.metric = true;
        return g;
    });
}
// divide una geometria in due gruppi (0 e 1) secondo dove cade il centro di ogni triangolo: serve per dare il filo lucido
function splitGroups(g, test) {
    const ix = g.index.array, P = g.attributes.position, a = [], b = [], c = new THREE.Vector3();
    for (let i = 0; i < ix.length; i += 3) {
        c.set(0, 0, 0); for (let k = 0; k < 3; k++) c.x += P.getX(ix[i + k]) / 3, c.y += P.getY(ix[i + k]) / 3, c.z += P.getZ(ix[i + k]) / 3;
        (test(c) ? b : a).push(ix[i], ix[i + 1], ix[i + 2]);
    }
    g.setIndex([...a, ...b]); g.clearGroups(); g.addGroup(0, a.length, 0); g.addGroup(a.length, b.length, 1);
    return g;
}
// pietra tagliata a brillante, la tavola guarda verso +z
const gemGeo = r => geo('gemcut' + r, () => {
    let l = new THREE.LatheGeometry([[0.0001, -0.85], [0.6, -0.2], [1, -0.02], [1, 0.06], [0.62, 0.34], [0.0001, 0.34]].map(([a, b]) => new THREE.Vector2(a * r, b * r)), 8);
    l = l.toNonIndexed(); l.computeVertexNormals(); l.rotateX(Math.PI / 2);
    return l;
});
const v2 = pts => pts.map(([r, y]) => new THREE.Vector2(r, y));

// =====================================================================
//  ARMI (Forgia)
// =====================================================================
export function buildWeapon(spec) {
    const g = new THREE.Group();
    if (!spec || !spec.type || spec.type === 'pugni') return g;
    const mat = MATERIALS[spec.material] || MATERIALS.ferro;
    const han = HANDLES[spec.handle] || HANDLES.legno;
    const gem = GEMS[spec.gem] || GEMS.nessuna;
    const hk = HANDLES[spec.handle] ? spec.handle : 'legno';
    const wood = spec.material === 'legno';
    const mk = WFIN[spec.material] ? spec.material : 'ferro';
    const mm = weaponMat(mk, 'flat'), fm = weaponMat(mk, 'forged');
    const bladeM = [weaponMat(mk, 'flat', true), weaponMat(mk, 'edge', true)];   // piatto (con le rune) e filo affilato
    const hm = handleMat(hk, han.color);
    const shaftM = woodMat('#7a5634');                           // aste di frassino
    const gm = gem.color ? gemMat(gem.color, 0.6) : null;
    const add = (gg, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const me = M(gg, m, x, y, z); me.rotation.set(rx, ry, rz); g.add(me); return me; };
    // gemma incastonata con quattro griffe
    const gemAt = (x, y, z, r = 0.02, ry = 0) => {
        if (!gm) return;
        const s = add(gemGeo(r), gm, x, y, z, 0, ry, 0);
        for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; s.add(M(sphere(r * 0.2, 8, 6), fm, Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.1)); }
    };
    // la parte dell'asta dove si impugna, rivestita col manico scelto
    const wrap = (key, y0, y1, r, o = {}) => { if (hk !== 'legno') add(gripGeo(key, y0, y1, r * 1.12, r * 1.1, hk, { swell: 0, ...o }), hm, 0, 0, 0); };
    const knob = (key, y, r) => add(lathe('knob' + key, [[0.0001, -0.022], [r * 0.9, -0.02], [r * 1.25, -0.008], [r * 1.15, 0.008], [r * 0.95, 0.03]], 18), mm, 0, y, 0);
    switch (spec.type) {
        case 'spada': {
            // spada da lato: pomo a ruota, manico fasciato, guardia appena curva, lama a rombo con sguscio
            add(geo('pomoRuota', () => new THREE.LatheGeometry(v2([[0.0001, -0.013], [0.024, -0.013], [0.033, -0.007], [0.034, 0], [0.033, 0.007], [0.024, 0.013], [0.0001, 0.013]]), 28).rotateX(Math.PI / 2)), mm, 0, -0.152, 0);
            add(sphere(0.0065, 10, 8), mm, 0, -0.187, 0);
            add(gripGeo('spada', -0.125, 0.098, 0.0155, 0.0135, hk, { ox: 1.18 }), hm, 0, 0, 0);
            add(cyl(0.017, 0.016, 0.012, 16), mm, 0, 0.1, 0);
            add(sweep('guardiaSp', [new THREE.Vector3(-0.115, 0.136, 0), new THREE.Vector3(-0.055, 0.119, 0), new THREE.Vector3(0, 0.115, 0), new THREE.Vector3(0.055, 0.119, 0), new THREE.Vector3(0.115, 0.136, 0)], s => 0.0062 + 0.0042 * Math.sin(Math.PI * s), { n: 28, seg: 10, flat: 0.8 }), mm, 0, 0, 0);
            for (const s of [-1, 1]) add(sphere(0.0095, 12, 10), mm, s * 0.117, 0.137, 0);
            add(rbox(0.036, 0.03, 0.026, 0.005), mm, 0, 0.117, 0);
            add(bladeGeo('spada' + (wood ? 'L' : ''), 44, s => {
                let w = 0.0275 - 0.0065 * s, t = (wood ? 0.0095 : 0.0055) * (1 - 0.45 * s);
                if (s > 0.8) w *= Math.sqrt(Math.max(0, 1 - ((s - 0.8) / 0.2) ** 2));
                if (s > 0.86) t *= Math.max(0.12, 1 - (s - 0.86) / 0.14 * 0.88);
                return { x: 0, y: 0.13 + 0.85 * s, we: w, wb: w, t, k: wood ? 0.8 : 0.42, fd: wood ? 0 : 0.0019 * Math.max(0, 1 - s / 0.66) };
            }, { eb: wood ? 0.6 : 0.8, ful: wood ? 0 : 0.3 }), bladeM, 0, 0, 0);
            gemAt(0, -0.152, 0.0135, 0.021);
            break;
        }
        case 'pugnale': {
            // daga a "H": due barrette curve chiudono il manico, lama triangolare con la costola al centro
            add(gripGeo('pugnale', -0.07, 0.072, 0.0135, 0.0135, hk, { ox: 1.2 }), hm, 0, 0, 0);
            add(sweep('dagaPomo', [new THREE.Vector3(-0.045, -0.066, 0), new THREE.Vector3(-0.022, -0.078, 0), new THREE.Vector3(0, -0.081, 0), new THREE.Vector3(0.022, -0.078, 0), new THREE.Vector3(0.045, -0.066, 0)], s => 0.0068 + 0.002 * Math.sin(Math.PI * s), { n: 20, seg: 10, flat: 0.8 }), mm, 0, 0, 0);
            add(sweep('dagaGuard', [new THREE.Vector3(-0.05, 0.09, 0), new THREE.Vector3(-0.024, 0.079, 0), new THREE.Vector3(0, 0.076, 0), new THREE.Vector3(0.024, 0.079, 0), new THREE.Vector3(0.05, 0.09, 0)], s => 0.0068 + 0.002 * Math.sin(Math.PI * s), { n: 20, seg: 10, flat: 0.8 }), mm, 0, 0, 0);
            for (const y of [-0.067, 0.091]) for (const s of [-1, 1]) add(sphere(0.008, 10, 8), mm, s * 0.047, y, 0);
            add(bladeGeo('pugnale', 30, s => ({ x: 0, y: 0.08 + 0.4 * s, we: 0.0215 * (1 - s) ** 0.85 + 0.0003, wb: 0.0215 * (1 - s) ** 0.85 + 0.0003, t: 0.0068 * (1 - 0.8 * s) + 0.0004, k: 0.32 }), { eb: 0.86 }), bladeM, 0, 0, 0);
            gemAt(0, -0.081, 0.01, 0.017);
            break;
        }
        case 'ascia': {
            // ascia barbuta: occhio forgiato attorno al manico, lama che si assottiglia fino al filo
            const bend = y => 0.014 * Math.sin(Math.PI * (y + 0.17) / 0.85);
            add(gripGeo('asciaManico', -0.17, 0.78, 0.0175, 0.0155, 'legno', { ox: 1.28, bx: bend, swell: 0.04 }), shaftM, 0, 0, 0);
            wrap('ascia', -0.13, 0.13, 0.017, { ox: 1.28, bx: bend });
            add(lathe('asciaPomo', [[0.0001, -0.02], [0.02, -0.018], [0.024, -0.005], [0.019, 0.02]], 18), shaftM, 0, -0.17, 0);
            add(geo('asciaTesta', () => splitGroups(loft('axeblade', [
                [-0.034, 0.013, 0.026, 0], [-0.016, 0.017, 0.034, 0], [0.02, 0.016, 0.045, 0], [0.055, 0.0095, 0.029, -0.001], [0.09, 0.0072, 0.038, -0.012],
                [0.13, 0.0055, 0.065, -0.035], [0.17, 0.0042, 0.099, -0.061], [0.21, 0.003, 0.125, -0.075], [0.24, 0.002, 0.1385, -0.0765], [0.255, 0.0013, 0.139, -0.073],
            ], { p: 3.6, seg: 28, capA: 0.5, capB: 0.4 }).clone().applyMatrix4(new THREE.Matrix4().set(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1)), c => c.x > 0.224)), [mm, weaponMat(mk, 'edge')], 0, 0.68, 0);
            add(loft('axeeye', [[0.07, 0.025, 0.021], [0.055, 0.028, 0.023], [-0.045, 0.028, 0.023], [-0.065, 0.025, 0.021]], { p: 2.6, seg: 24, capA: 0.4, capB: 0.4 }), fm, 0, 0.68, 0);
            add(box(0.012, 0.012, 0.03), shaftM, 0, 0.752, 0);
            gemAt(0, 0.68, 0.024, 0.022);
            break;
        }
        case 'martello': {
            // martello da guerra: faccia ottagonale da una parte, becco dall'altra, punta in cima, bande di ferro sul manico
            add(gripGeo('martManico', -0.17, 0.74, 0.0185, 0.0165, 'legno', { ox: 1.15, swell: 0.03 }), shaftM, 0, 0, 0);
            wrap('martello', -0.13, 0.13, 0.0185, { ox: 1.15 });
            knob('mart', -0.165, 0.0185);
            for (const s of [-1, 1]) add(box(0.005, 0.22, 0.013), fm, s * 0.021, 0.6, 0);
            for (const y of [0.495, 0.71]) for (const s of [-1, 1]) add(sphere(0.004, 8, 6), fm, s * 0.0245, y, 0);
            add(rbox(0.07, 0.11, 0.072, 0.012), fm, 0, 0.76, 0);
            add(geo('martFaccia', () => splitGroups(new THREE.LatheGeometry(v2([[0.0001, 0], [0.04, 0], [0.044, 0.05], [0.055, 0.1], [0.06, 0.118], [0.06, 0.124], [0.053, 0.134], [0.0001, 0.134]]), 8).rotateY(Math.PI / 8).rotateZ(-Math.PI / 2), c => c.x > 0.117)), [mm, weaponMat(mk, 'edge')], 0.03, 0.76, 0);
            add(sweep('martBecco', [new THREE.Vector3(-0.03, 0.765, 0), new THREE.Vector3(-0.1, 0.768, 0), new THREE.Vector3(-0.17, 0.752, 0), new THREE.Vector3(-0.235, 0.712, 0)], s => 0.028 * (1 - s) ** 0.85 + 0.0015, { n: 20, seg: 4, flat: 0.55 }), mm, 0, 0, 0);
            add(cone(0.02, 0.12, 4), mm, 0, 0.87, 0, 0, Math.PI / 4, 0);
            gemAt(0, 0.76, 0.037, 0.027);
            break;
        }
        case 'lancia': {
            // lancia: asta di frassino, gorbia conica inchiodata, punta a foglia con costola, puntale in fondo
            add(gripGeo('lanciaAsta', -0.35, 1.32, 0.0185, 0.016, 'legno', { swell: 0.02 }), shaftM, 0, 0, 0);
            wrap('lancia', -0.13, 0.13, 0.0182);
            add(lathe('lanciaPuntale', [[0.0001, -0.43], [0.008, -0.41], [0.019, -0.36], [0.02, -0.34]], 16), fm, 0, 0, 0);
            add(lathe('lanciaGorbia', [[0.0185, 1.29], [0.023, 1.3], [0.023, 1.314], [0.0195, 1.322], [0.0155, 1.39], [0.009, 1.425], [0.0001, 1.44]], 20), fm, 0, 0, 0);
            add(cyl(0.0035, 0.0035, 0.046, 8), fm, 0, 1.345, 0, Math.PI / 2);
            add(bladeGeo('lancia', 34, s => {
                const w = 0.005 + 0.042 * Math.sin(Math.PI * Math.min(1, s ** 0.72)) * (1 - 0.1 * s);
                return { x: 0, y: 1.415 + 0.27 * s, we: w, wb: w, t: 0.0095 * (1 - 0.8 * s) + 0.0005, k: 0.28 };
            }, { eb: 0.84 }), bladeM, 0, 0, 0);
            gemAt(0, 1.307, 0.024, 0.019);
            break;
        }
        case 'falce': {
            // falce da guerra: manico curvo con la manopola, lama a un filo con il dorso rinforzato
            const bend = y => 0.03 * Math.sin(Math.PI * (y + 0.3) / 1.52);
            add(gripGeo('falceManico', -0.3, 1.22, 0.0175, 0.0155, 'legno', { bx: bend, swell: 0.02 }), shaftM, 0, 0, 0);
            wrap('falce', -0.13, 0.13, 0.017, { bx: bend });
            add(cyl(0.011, 0.013, 0.1, 10), shaftM, bend(0.55) + 0.055, 0.55, 0, 0, 0, Math.PI / 2);
            add(torus(0.021, 0.0055), fm, bend(1.15), 1.15, 0, Math.PI / 2);
            add(rbox(0.05, 0.05, 0.016, 0.005), fm, -0.012, 1.185, 0);
            add(bladeGeo('falce', 44, s => {
                const w = 0.058 * (1 - s) ** 0.7 + 0.0006;
                return { x: -0.03 - 0.72 * s, y: 1.19 + 0.06 * Math.sin(Math.PI * s * 0.9) - 0.17 * s ** 3, we: w, wb: 0.004 * (1 - s) + 0.0008, t: 0.0032 * (1 - 0.5 * s) + 0.0004, tb: 0.0055 * (1 - 0.6 * s) + 0.0006, k: 0.5 };
            }, { flip: true, eb: 0.72 }), bladeM, 0, 0, 0);
            gemAt(bend(1.15), 1.15, 0.027, 0.02);
            break;
        }
        case 'bastone': {
            // bastone: legno nodoso e ritorto, artigli di metallo che stringono la gemma, ghiere
            const bx = y => 0.012 * Math.sin(y * 5.3) + 0.006 * Math.sin(y * 13), bz = y => 0.01 * Math.cos(y * 4.1);
            add(gripGeo('bastone', -0.3, 1.19, 0.026, 0.021, 'nodoso', { bx, bz, swell: 0.05 }), woodMat(hk === 'legno' ? han.color : '#5a3a1e'), 0, 0, 0);
            wrap('bastone', -0.13, 0.13, 0.026, { bx, bz });
            const hx = bx(1.15), hz = bz(1.15);
            for (const y of [1.0, 1.15]) add(torus(0.024, 0.0055), mm, bx(y), y, bz(y), Math.PI / 2);
            add(cyl(0.024, 0.02, 0.05, 14), mm, bx(-0.28), -0.28, bz(-0.28));
            const claw = sweep('artiglio', [new THREE.Vector3(0.022, 1.13, 0), new THREE.Vector3(0.05, 1.2, 0.006), new THREE.Vector3(0.07, 1.25, 0.012), new THREE.Vector3(0.058, 1.3, 0.01), new THREE.Vector3(0.044, 1.33, 0.004)], s => 0.0085 * (1 - s) + 0.0025, { n: 24, seg: 8, flat: 0.75 });
            for (let i = 0; i < 4; i++) add(claw, mm, hx, 0, hz, 0, i * Math.PI / 2 + 0.3, 0);
            if (gm) add(geo('sferaGemma', () => new THREE.IcosahedronGeometry(0.058, 1)), gm, hx, 1.28, hz);
            else add(sphere(0.045, 24, 18), mm, hx, 1.28, hz);
            break;
        }
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
    // i nomi lunghi («La Guardiana del Faro») si rimpiccioliscono invece di essere tagliati
    const text = String(name || '???').slice(0, 28);
    let fs = 56;
    g.font = `700 ${fs}px Almendra, serif`;
    while (fs > 30 && g.measureText(text).width > 490) { fs -= 2; g.font = `700 ${fs}px Almendra, serif`; }
    g.fillStyle = color;
    g.fillText(text, 256, sub ? 52 : 70);
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

// tutti i personaggi in giro (per il cappuccio quando piove)
export const CHARACTERS = new Set();
// chi ha già qualcosa in testa che para la pioggia non mette il cappuccio
const HOOD_SKIP = new Set(['cappuccio', 'piuma', 'strega', 'tricorno', 'elmo', 'corona']);

export class Character {
    constructor(appearance, look = {}, opts = {}) {
        this.root = new THREE.Group();
        CHARACTERS.add(this);
        this.opts = opts;
        this.t = Math.random() * 10;
        this.state = 'idle';
        this.speed = 0;
        this.action = null;
        this.pose = Object.fromEntries(POSE_KEYS.map(k => [k, 0]));
        this.blinkT = 2 + Math.random() * 3;
        this.tint = null;
        this.react = null;      // reazione al colpo in corso
        this.spin = 0;          // capriola quando si viene sbalzati
        this.koT = -1;          // tempo dal K.O.
        this.loose = null;      // arma caduta a terra
        this.build(appearance, look);
        if (opts.name) this.setNameTag(opts.name, opts.sub, opts.color);
    }

    build(appearance, look) {
        if (this.body) this.root.remove(this.body);
        if (this.faceMat) this.faceMat.dispose();
        this.halo = null;
        this.rainHood = null; this.hooded = false; this.hoodHide = [];   // il cappuccio da pioggia si rifà alla prima goccia
        const a = this.app = sanitizeAppearance(appearance);
        this.look = look || {};
        const b = BUILD[a.build];
        const sp = a.species, fem = a.sex === 'f';
        const ghost = sp === 'spettro', skel = sp === 'scheletro', rat = sp === 'ratto';
        const op = ghost ? 0.62 : 1;
        const em = ghost ? '#3b4fa0' : '';
        const skinCol = skel ? '#e9e2cf' : a.skin;
        const skinM = skel ? stdMat(skinCol, { o: op, e: em, ei: 0.35, r: 0.6 }) : skinMat(skinCol, { o: op, e: em, ei: 0.35, r: 0.8 });
        const torsoItem = ITEMS[this.look.torso];
        const shirt = torsoItem?.shirt;   // magliette e felpa dell'Armadio: sostituiscono la parte di sopra
        const robe = (a.topStyle === 'veste' && !shirt) || this.look.torso === 'tunica_mago';
        const topCol = this.look.torso === 'tunica_mago' || shirt ? torsoItem.color : a.top;
        const topM = clothMat(topCol, shirt ? 'jersey' : a.topStyle === 'giacca' ? 'denim' : 'lino', { o: op, e: em, ei: 0.3 });
        const botM = clothMat(a.bottom, 'denim', { o: op, e: em, ei: 0.3 });
        const shoeM = clothMat(a.shoes, 'cuoio', { o: op, r: 0.6 });
        const hairM = hairMat(a.hairColor, { o: op, r: 0.9 });
        const limb = (skel ? b.limb * 0.6 : b.limb) * (fem ? 0.9 : 1);
        const W = b.w, D = b.d;

        const body = this.body = new THREE.Group();
        body.scale.setScalar(a.height);
        this.root.add(body);
        const hipY = 0.87;
        this.hipY = hipY;
        const hips = this.hips = new THREE.Group();
        hips.position.y = hipY;
        body.add(hips);
        // fianchi più larghi per lei, spalle più larghe per lui (più sotto, sulle braccia)
        hips.add(M(pelvisGeo(W * (fem ? 1.08 : 0.92), D * 0.95), botM, 0, -0.03, 0));

        // --- GAMBE ---
        this.legs = [];
        for (const s of [1, -1]) {
            const hip = new THREE.Group();
            hip.position.set(s * W * (fem ? 0.28 : 0.25), -0.06, 0);
            hips.add(hip);
            if (!ghost) {
                hip.add(M(thighGeo(limb, fem ? 1.06 : 1, HQ && !robe ? 0.035 : 0), botM, 0, 0, 0));
                const knee = new THREE.Group();
                knee.position.y = -0.4;
                hip.add(knee);
                knee.add(M(calfGeo(limb, HQ && !skel && !robe ? 0.04 : 0), skel ? skinM : botM, 0, 0, 0));
                const shoe = knee.add(M(shoeGeo(), shoeM, 0, -0.43, 0)).children.at(-1);
                if (rat) shoe.scale.set(1.33, 1, 1.33);
                this.legs.push({ hip, knee });
            } else this.legs.push({ hip, knee: new THREE.Group() });
        }
        if (ghost) {
            const tail = M(cone(W * 0.62, 0.95, 16), topM, 0, -0.5, 0);
            tail.rotation.x = Math.PI;
            hips.add(tail);
        }
        this.skirt?.parts.forEach(pt => pt.g.dispose());
        this.skirt = null;
        if (robe) {
            // gonna della veste: si allarga dove passano le gambe invece di farsi attraversare (vedi updateSkirt)
            const skirtM = clothMat(topCol, 'lino', { o: op, e: em, ei: 0.3, side: THREE.DoubleSide });
            const trimM = this.look.torso === 'tunica_mago' ? stdMat(torsoItem.color2, { e: torsoItem.color2, ei: 0.4, side: THREE.DoubleSide }) : null;
            this.addSkirt(hips, W, D, limb, fem, skirtM, trimM);
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
        spine.add(M(torsoGeo(W, D, torsoH, fem && !skel), topM, 0, 0, 0));
        if (fem && !skel) for (const s of [1, -1]) {
            // sotto la cotta o la corazza il seno è dell'armatura, un po' più grande, così non la buca
            const lt = this.look.torso, armor = lt === 'cotta' ? metalMat(ITEMS.cotta.color, { r: 0.45, chain: true }) : lt === 'corazza' ? metalMat(ITEMS.corazza.color, { r: 0.24, cc: 0.4 }) : null;
            const bust = M(sphere(W * 0.2, 24, 16), armor || topM, s * W * 0.2, torsoH * 0.64, D / 2 - W * 0.05 + (armor ? D * (lt === 'corazza' ? 0.09 : 0.06) : 0));
            bust.scale.set(1, 0.92, 0.62).multiplyScalar(armor ? 1.08 : 1);
            spine.add(bust);
        }
        if (a.topStyle === 'tunica' && !torsoItem) {
            const bw = fem ? 0.47 : 0.495;    // cintura che segue la vita, con la fibbia
            spine.add(M(loft('belt' + kf(W, D, bw), [[0.03, bw * W, 0.5 * D], [0.09, bw * W, 0.5 * D]], { p: 2.8, sub: 1, capA: 0.15, capB: 0.15 }), clothMat(shade(a.bottom, 0.6), 'cuoio', { o: op })));
            spine.add(M(box(0.045, 0.05, 0.012), metalMat('#b08a3a', { r: 0.3 }), 0, 0.06, D * 0.5 + 0.004));
        }
        if (a.topStyle === 'giacca' && !shirt) {
            const collar = M(torus(0.1, 0.035), topM, 0, torsoH + 0.01, 0); collar.rotation.x = Math.PI / 2; spine.add(collar);
            const btn = stdMat('#c8a24a', { m: 0.8, r: 0.3 });
            for (let i = 0; i < 4; i++) spine.add(M(sphere(0.016, 8, 6), btn, 0, 0.12 + i * 0.1, D * (i > 1 ? 0.53 : 0.49) + 0.006));
        }
        this.addTorsoItem(spine, torsoItem, W, D, torsoH);

        // --- COLLO E TESTA ---
        const neck = this.neck = new THREE.Group();
        neck.position.y = torsoH;
        spine.add(neck);
        neck.add(M(cyl(fem ? 0.05 : 0.06, fem ? 0.058 : 0.068, 0.12, 10), skinM, 0, 0.05, 0));
        if (!fem && (sp === 'umano' || sp === 'elfo')) neck.add(M(sphere(0.02, 8, 6), skinM, 0, 0.065, 0.052));
        const head = this.head = new THREE.Group();
        head.position.y = 0.11 + HEAD_R;
        neck.add(head);
        const ft = faceTextures(a);
        this.faceTex = ft;
        const faceM = new (HQ ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial)({
            ...(HQ && !ghost && !skel ? { sheen: 0.12, sheenRoughness: 0.5, sheenColor: new THREE.Color(a.skin).lerp(new THREE.Color('#ff9f80'), 0.3) } : {}),
            map: ft.open, roughness: HQ && !skel ? 0.6 : 0.75, transparent: ghost, opacity: op, depthWrite: !ghost,
            emissive: ft.emissive ? new THREE.Color('#ffffff') : new THREE.Color(ghost ? '#3b4fa0' : 0),
            emissiveMap: ft.emissive, emissiveIntensity: ft.emissive ? 1.4 : 0.35,
        });
        this.faceMat = faceM;
        const human = sp === 'umano' || sp === 'elfo';
        const headMesh = M(human ? headGeo(fem) : sphere(HEAD_R, 28, 20), faceM, 0, 0, 0);
        headMesh.scale.set(rat ? 0.95 : 1, 1.08, rat ? 1.05 : 1);
        head.add(headMesh);
        if (human) {
            head.add(M(noseGeo(fem), skinM, 0, 0.005, HEAD_R * 0.955));
            for (const s of [1, -1]) {
                if (sp === 'elfo') {
                    const ear = M(elfEarGeo(), skinM, s * HEAD_R * 0.93, 0.03, -0.02);
                    ear.rotation.set(0.2, -s * 0.35, -s * 1.05);
                    head.add(ear); this.hoodHide.push(ear);
                } else {
                    const ear = M(earGeo(), skinM, s * HEAD_R * 0.935, -0.005, -0.015);
                    ear.rotation.set(-0.1, s * 0.3, s * 0.06);
                    head.add(ear);
                }
            }
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
                head.add(ear); this.hoodHide.push(ear);
                const inner = M(sphere(0.07, 12, 8), stdMat('#e8909a'), s * 0.152, 0.17, 0.0);
                inner.scale.set(1, 1.15, 0.25); inner.rotation.z = -s * 0.4;
                head.add(inner); this.hoodHide.push(inner);
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
        const nh = head.children.length;
        this.addHair(head, a, hairM, !!this.look.head);
        this.hoodHide.push(...head.children.slice(nh));   // i capelli, sotto il cappuccio, non si vedono (e non lo bucano)
        this.addHeadItem(head, ITEMS[this.look.head]);
        this.addFaceItem(head, ITEMS[this.look.face]);

        // --- BRACCIA (L = +x, R = -x: il personaggio guarda verso +z) ---
        this.arms = {};
        const sleeveFull = shirt ? shirt === 'hoodie' : a.topStyle !== 'tunica';
        for (const [key, s] of [['L', 1], ['R', -1]]) {
            const sh = new THREE.Group();
            sh.rotation.order = 'YXZ';
            sh.position.set(s * (W / 2 * (fem ? 0.9 : 1.05) + limb * 0.9), torsoH - 0.07, 0);
            spine.add(sh);
            sh.add(M(upperArmGeo(limb, HQ && !skel ? 0.03 : 0), topM, 0, 0, 0));
            const el = new THREE.Group();
            el.position.y = -0.3;
            sh.add(el);
            el.add(M(foreArmGeo(limb, HQ && sleeveFull && !skel ? 0.04 : 0), sleeveFull ? topM : skinM, 0, 0, 0));
            const hand = new THREE.Group();
            hand.position.y = -0.29;
            el.add(hand);
            hand.add(M(handGeo(limb), skinM, 0, 0, 0));
            const thumb = M(capsule(limb * 0.36, limb * 0.5), skinM, 0, -0.01, limb * 0.85);
            thumb.rotation.x = 0.7; hand.add(thumb);
            this.arms[key] = { sh, el, hand };
        }
        this.weaponMesh = buildWeapon(this.look.weapon);
        this.weaponMesh.rotation.x = Math.PI / 2;
        this.arms.R.hand.add(this.weaponMesh);
        this.setupFx();

        this.addCape(spine, ITEMS[this.look.cape], W, D, torsoH);

        if (HQ) body.traverse(o => { if (o.isMesh && o.material.userData?.metric && !o.geometry.userData.metric) o.geometry = metric(o.geometry); });
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
        if (!['corti', 'lunghi', 'codino', 'ciuffo', 'cresta'].includes(a.hair)) return;
        if (a.hair !== 'cresta') cap();
        head.add(M(hairGeo(a.hair, !!hatOn), hairM));
        if (a.hair === 'codino') {
            const band = M(torus(0.022, 0.009), stdMat(shade(a.hairColor, 0.45), { r: 0.6 }), 0, -0.005, -R * 1.1);
            head.add(band);
        }
    }

    addHeadItem(head, it) {
        if (!it) return;
        const R = HEAD_R;
        const id = Object.keys(ITEMS).find(k => ITEMS[k] === it);
        const felt = (c, side) => clothMat(c, 'lino', { r: 0.9, side });
        switch (id) {
            case 'cappuccio': {
                const h = M(geo('hood_monk', () => {
                    const g = new THREE.SphereGeometry(R * 1.22, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.62);
                    const p = g.attributes.position;          // pieghe morbide della stoffa
                    for (let i = 0; i < p.count; i++) {
                        _v1.fromBufferAttribute(p, i);
                        const a = Math.atan2(_v1.x, _v1.z), k = 1 + 0.025 * Math.sin(a * 7 + _v1.y * 20) * Math.max(0, 0.15 - _v1.y / R * 0.5);
                        p.setXYZ(i, _v1.x * k, _v1.y, _v1.z * k);
                    }
                    g.computeVertexNormals();
                    return g;
                }), felt(it.color, THREE.DoubleSide));
                h.rotation.x = -0.55; head.add(h);
                // bordo arrotolato attorno al viso e punta che ricade sulla nuca
                // il bordo sta sull'apertura della calotta, perpendicolare al suo asse inclinato
                const ax = new THREE.Vector3(0, Math.cos(0.55), -Math.sin(0.55)), c0 = Math.cos(Math.PI * 0.62) * R * 1.22;
                const rim = M(torus(Math.sin(Math.PI * 0.62) * R * 1.22, 0.02, Math.PI * 2, 10, 48), felt(it.color), ax.x * c0, ax.y * c0, ax.z * c0);
                rim.rotation.x = Math.atan2(-ax.y, ax.z); head.add(rim);
                head.add(M(sweep('hoodtip', [new THREE.Vector3(0, 0.14, -0.2), new THREE.Vector3(0, 0.09, -0.29), new THREE.Vector3(0, -0.02, -0.33), new THREE.Vector3(0, -0.12, -0.3)],
                    s => 0.07 * (1 - s) ** 1.2 + 0.006, { flat: 0.6 }), felt(it.color)));
                break;
            }
            case 'piuma': {
                const hat = new THREE.Group(); hat.position.set(0, R * 0.6, 0); hat.rotation.set(-0.12, 0, 0.1);
                const g = M(lathe('bard', [[0.001, 0.3], [0.07, 0.29], [0.14, 0.24], [0.19, 0.15], [0.205, 0.06], [0.207, 0.02], [0.25, 0.017], [0.29, 0.03], [0.305, 0.045], [0.31, 0.036], [0.29, 0.016], [0.23, 0.0], [0.19, -0.004], [0.18, 0.0]]), felt(it.color));
                g.scale.set(1, 1, 1.15); hat.add(g);
                const band = M(cyl(0.206, 0.207, 0.035, 40, true), stdMat(shade(it.color, 0.45), { r: 0.6 }), 0, 0.04, 0); band.scale.z = 1.15; hat.add(band);
                // piuma: rachide e vessillo con le barbe
                const pts = [new THREE.Vector3(-0.17, 0.05, -0.12), new THREE.Vector3(-0.23, 0.17, -0.22), new THREE.Vector3(-0.22, 0.3, -0.36), new THREE.Vector3(-0.16, 0.38, -0.5)];
                const fm = HQ ? accMat('feather' + it.color2, () => new THREE.MeshPhysicalMaterial({ color: it.color2, map: featherMap(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8, sheen: 0.8, sheenColor: new THREE.Color('#ffffff') }))
                    : stdMat(it.color2, { r: 0.9, side: THREE.DoubleSide, map: featherMap() });
                if (!HQ) { fm.alphaTest = 0.5; fm.needsUpdate = true; }
                hat.add(M(ribbon('feather', pts, s => 0.045 * Math.sin(Math.PI * Math.min(1, s * 1.05) ** 0.6) + 0.004, new THREE.Vector3(1, 0.2, 0).normalize()), fm));
                hat.add(M(sweep('quill', pts, s => 0.004 * (1 - s * 0.7)), stdMat('#f4ecd8', { r: 0.5 })));
                head.add(hat);
                break;
            }
            case 'strega': {
                const hat = new THREE.Group(); hat.position.set(0, R * 0.55, 0); hat.rotation.set(-0.08, 0, 0.04);
                hat.add(M(geo('witchbrim', () => {
                    const g = new THREE.LatheGeometry([[0.19, 0.01], [0.3, 0.012], [0.42, 0.004], [0.445, -0.004], [0.44, -0.012], [0.3, -0.004], [0.19, 0.0]].map(([r, y]) => new THREE.Vector2(r, y)), 64);
                    const p = g.attributes.position;          // tesa un po' ondulata e cadente
                    for (let i = 0; i < p.count; i++) {
                        _v1.fromBufferAttribute(p, i);
                        const r = Math.hypot(_v1.x, _v1.z), a = Math.atan2(_v1.x, _v1.z), k = Math.max(0, (r - 0.2) / 0.24);
                        p.setY(i, _v1.y + k * k * (0.02 * Math.sin(a * 3 + 1) - 0.03));
                    }
                    g.computeVertexNormals();
                    return g;
                }), felt(it.color, THREE.DoubleSide)));
                hat.add(M(geo('witchcone', () => {
                    const g = loft('witchcone_raw', [[0, 0.205, 0.205], [0.1, 0.17, 0.17], [0.24, 0.12, 0.12], [0.4, 0.075, 0.075], [0.55, 0.035, 0.035], [0.66, 0.01, 0.01]], { p: 2, seg: 32, capA: 0.2, capB: 0.8, wr: 0.05 }).clone();
                    const p = g.attributes.position;          // punta piegata all'indietro
                    for (let i = 0; i < p.count; i++) {
                        _v1.fromBufferAttribute(p, i);
                        const h = Math.max(0, _v1.y / 0.66);
                        p.setXYZ(i, _v1.x + 0.06 * h ** 3, _v1.y - 0.08 * h ** 3, _v1.z - 0.24 * h ** 2.5);
                    }
                    g.computeVertexNormals();
                    return g;
                }), felt(it.color)));
                hat.add(M(cyl(0.2, 0.205, 0.05, 40, true), clothMat(it.color2, 'velluto', { e: it.color2, ei: 0.5 }), 0, 0.035, 0));
                hat.add(M(box(0.045, 0.045, 0.01), metalMat('#d4af37', { r: 0.3 }), 0, 0.035, 0.205));
                head.add(hat);
                break;
            }
            case 'tricorno': {
                const hat = new THREE.Group(); hat.position.set(0, R * 0.62, 0);
                const corner = a => Math.max(0, Math.cos(3 * a)) ** 3;   // tre punte: davanti e due dietro
                const edge = a => 0.23 + 0.11 * corner(a);
                hat.add(M(geo('tricorn', () => {
                    const g = new THREE.BufferGeometry(), pos = [], uv = [], idx = [], na = 72, nr = 8;
                    for (let i = 0; i <= nr; i++) for (let j = 0; j <= na; j++) {
                        const ri = i / nr, a = j / na * Math.PI * 2, r = 0.19 + (edge(a) - 0.19) * ri;
                        const up = 0.13 * ri ** 1.4 * (1 - 0.75 * corner(a));
                        pos.push(Math.sin(a) * r, up, Math.cos(a) * r); uv.push(j / na * 4, ri);
                        if (i < nr && j < na) { const k = i * (na + 1) + j; idx.push(k, k + 1, k + na + 1, k + 1, k + na + 2, k + na + 1); }
                    }
                    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
                    g.setIndex(idx); g.computeVertexNormals();
                    return g;
                }), felt(it.color, THREE.DoubleSide)));
                hat.add(M(lathe('tricrown', [[0.001, 0.17], [0.1, 0.16], [0.17, 0.11], [0.2, 0.03], [0.2, 0.0]]), felt(it.color)));
                const trim = [];
                for (let j = 0; j < 72; j++) { const a = j / 72 * Math.PI * 2, r = edge(a); trim.push(new THREE.Vector3(Math.sin(a) * r, 0.13 * (1 - 0.75 * corner(a)) + 0.004, Math.cos(a) * r)); }
                hat.add(M(sweep('tritrim', trim, () => 0.007, { n: 144, seg: 6, closed: true }), metalMat(it.color2, { r: 0.28 })));
                head.add(hat);
                break;
            }
            case 'elmo': {
                const mm = metalMat(it.color, { r: 0.3 });
                const prof = [[0.001, 0.27], [0.08, 0.262], [0.16, 0.225], [0.21, 0.16], [0.235, 0.08], [0.242, 0.0], [0.238, -0.1], [0.225, -0.2], [0.215, -0.235], [0.205, -0.24], [0.21, -0.2], [0.224, -0.1], [0.226, 0.0], [0.214, 0.09], [0.15, 0.2], [0.001, 0.255]];
                const helm = M(lathe('helm3', prof.map(([r, y]) => [r * 1.1, y * 1.1]), 56), mm);
                head.add(helm);
                // feritoia degli occhi e fori per respirare, curvi come l'elmo
                const dark = stdMat('#07060a', { r: 0.9 });
                head.add(M(geo('slit', () => new THREE.CylinderGeometry(0.268, 0.268, 0.032, 32, 1, true, -0.85, 1.7)), dark, 0, 0.035, 0));
                for (let i = 0; i < 6; i++) for (const s of [1, -1]) {
                    const a = s * (0.12 + i * 0.09), hole = M(sphere(0.006, 8, 6), dark, Math.sin(a) * 0.259, -0.09, Math.cos(a) * 0.259);
                    head.add(hole);
                }
                // cresta centrale, rivetti lungo il bordo, pennacchio rosso
                head.add(M(sweep('helmcrest', [new THREE.Vector3(0, 0.18, 0.21), new THREE.Vector3(0, 0.285, 0.05), new THREE.Vector3(0, 0.27, -0.14), new THREE.Vector3(0, 0.17, -0.24)], () => 0.011, { flat: 0.5 }), mm));
                const rv = metalMat('#c9ccd0', { r: 0.22 });
                for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; head.add(M(sphere(0.009, 8, 6), rv, Math.sin(a) * 0.243, -0.235, Math.cos(a) * 0.243)); }
                const plume = HQ ? clothMat('#8b1a1a', 'velluto') : stdMat('#8b1a1a');
                for (let i = 0; i < 7; i++) {
                    const x = (i - 3) * 0.01;
                    head.add(M(sweep('plume' + i, [new THREE.Vector3(x, 0.29, 0.02), new THREE.Vector3(x * 2, 0.37, -0.08 - i * 0.004), new THREE.Vector3(x * 3, 0.34, -0.24), new THREE.Vector3(x * 4, 0.2 - i * 0.012, -0.33)],
                        s => 0.022 * Math.sin(Math.PI * (0.15 + s * 0.85)) + 0.003, { flat: 0.35, seg: 8 }), plume));
                }
                break;
            }
            case 'corna':
                for (const s of [1, -1]) {
                    head.add(M(sweep('horn' + s, [new THREE.Vector3(s * 0.12, 0.17, 0.03), new THREE.Vector3(s * 0.19, 0.25, 0.06), new THREE.Vector3(s * 0.23, 0.34, 0.01), new THREE.Vector3(s * 0.21, 0.42, -0.07)],
                        t => (0.034 * (1 - t) ** 0.9 + 0.003) * (1 + 0.07 * Math.sin(t * 46) * (1 - t)), { n: 40, seg: 14 }), hornMat(it.color)));
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
                // cerchio con gemme e punte di cristallo spettrale
                const band = stdMat(it.color, { e: it.color, ei: 1.2, m: 0.6, r: 0.25, side: THREE.DoubleSide });
                head.add(M(cyl(R * 0.92, R * 0.95, 0.07, 40, true), HQ ? metalMat(it.color, { r: 0.25, e: it.color, ei: 0.6, side: THREE.DoubleSide }) : band, 0, R * 0.72, 0));
                const crystal = HQ ? accMat('crys' + it.color, () => new THREE.MeshPhysicalMaterial({ color: it.color, emissive: new THREE.Color(it.color), emissiveIntensity: 1.1, roughness: 0.05, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.8, transparent: true, opacity: 0.85, flatShading: true }))
                    : stdMat(it.color, { e: it.color, ei: 1.5, o: 0.85, m: 0.5, r: 0.3 });
                const cg = geo('crystal', () => { const g = new THREE.OctahedronGeometry(0.03, 0); g.scale(0.8, 3, 0.8); g.translate(0, 0.07, 0); return g; });
                for (let i = 0; i < 8; i++) {
                    const a = i / 8 * Math.PI * 2, c = M(cg, crystal, Math.sin(a) * R * 0.93, R * 0.72 + 0.01, Math.cos(a) * R * 0.93);
                    c.scale.setScalar(i % 2 ? 0.7 : 1); c.rotation.set(Math.cos(a) * 0.15, 0, -Math.sin(a) * 0.15);
                    head.add(c);
                    const b = a + Math.PI / 8;
                    head.add(M(geo('gemc', () => new THREE.OctahedronGeometry(0.012, 1)), gemMat(i % 2 ? '#c33bff' : '#3bd6ff', 0.6), Math.sin(b) * R * 0.955, R * 0.72, Math.cos(b) * R * 0.955));
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
            const m = clothMat(it.color, 'cuoio', { r: 0.6 });
            // becco ricurvo, maschera che segue il viso, occhiali con montatura d'ottone
            head.add(M(sweep('beak2', [new THREE.Vector3(0, -0.02, R * 0.92), new THREE.Vector3(0, -0.04, R + 0.1), new THREE.Vector3(0, -0.09, R + 0.21), new THREE.Vector3(0, -0.16, R + 0.3)],
                s => 0.075 * (1 - s) ** 1.1 + 0.005, { n: 30, seg: 16, flat: 0.85 }), m));
            head.add(M(geo('plaguemask', () => new THREE.SphereGeometry(R * 1.05, 36, 18, Math.PI * 0.18, Math.PI * 0.64, Math.PI * 0.28, Math.PI * 0.42)), clothMat(it.color, 'cuoio', { side: THREE.DoubleSide })));
            const glass = HQ ? accMat('plagueglass', () => new THREE.MeshPhysicalMaterial({ color: '#1a0c0c', roughness: 0.05, clearcoat: 1, emissive: new THREE.Color('#401010'), emissiveIntensity: 0.4 }))
                : stdMat('#1a1010', { m: 0.6, r: 0.1, e: '#401010', ei: 0.4 });
            const brass = metalMat('#b08a3a', { r: 0.3 });
            for (const s of [1, -1]) {
                const x = s * 0.075, z = R * 1.0;
                const e = M(cyl(0.042, 0.042, 0.03, 24), glass, x, 0.035, z); e.rotation.x = Math.PI / 2; head.add(e);
                head.add(M(torus(0.045, 0.008, Math.PI * 2, 10, 32), brass, x, 0.035, z + 0.015));
            }
            const strap = M(torus(R * 1.04, 0.012, Math.PI * 2, 8, 48), clothMat('#3a2a1a', 'cuoio'), 0, 0.03, 0); strap.rotation.x = Math.PI / 2 - 0.1; head.add(strap);
        } else if (id === 'benda') {
            const m = clothMat(it.color, 'cuoio', { r: 0.7 });
            const band = M(torus(R * 1.03, 0.011, Math.PI * 2, 8, 48), m, 0, 0.06, 0); band.rotation.set(Math.PI / 2 - 0.25, 0, 0); head.add(band);
            const patch = M(sphere(0.05, 20, 12), m, -0.078, 0.042, R * 0.9); patch.scale.set(1, 0.85, 0.35); head.add(patch);
        } else if (id === 'monocolo') {
            const gold = metalMat(it.color, { r: 0.22 });
            const ring = M(torus(0.04, 0.007, Math.PI * 2, 10, 32), gold, -0.078, 0.042, R * 0.98);
            head.add(ring);
            const lens = HQ ? accMat('lens', () => new THREE.MeshPhysicalMaterial({ color: '#dfeaf0', roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.22, depthWrite: false }))
                : stdMat('#dfeaf0', { o: 0.25, r: 0.05 });
            const l = M(cyl(0.039, 0.039, 0.003, 24), lens, -0.078, 0.042, R * 0.98); l.rotation.x = Math.PI / 2; l.castShadow = false; head.add(l);
            head.add(M(sweep('monochain', [new THREE.Vector3(-0.115, 0.03, R * 0.95), new THREE.Vector3(-0.15, -0.06, R * 0.85), new THREE.Vector3(-0.17, -0.16, R * 0.7), new THREE.Vector3(-0.15, -0.24, R * 0.6)], () => 0.0028, { seg: 5 }), gold));
        }
    }

    addTorsoItem(spine, it, W, D, H) {
        if (!it) return;
        const fem = this.app.sex === 'f' && this.app.species !== 'scheletro';
        if (it.shirt) {
            // logo giallo davanti, scritta dietro, girocollo (e cappuccio, tasca e lacci per la felpa)
            const front = M(geo('shlogo', () => new THREE.PlaneGeometry(1, 0.76)), printMat(it.print, 'logo'), 0, H * 0.6, D * 0.53 + 0.004);
            front.scale.setScalar(W * 0.62); front.castShadow = false;
            spine.add(front);
            const back = M(geo('shback', () => new THREE.PlaneGeometry(1, 0.4)), printMat(it.print, 'back'), 0, H * 0.64, -D / 2 - 0.004);
            back.rotation.y = Math.PI; back.scale.setScalar(W * 0.78); back.castShadow = false;
            spine.add(back);
            const rib = clothMat(shade(it.color, 0.78), 'jersey');
            const neckRib = M(torus(0.085, 0.02), rib, 0, H + 0.005, 0); neckRib.rotation.x = Math.PI / 2; spine.add(neckRib);
            if (it.shirt === 'hoodie') {
                const hood = M(geo('hoodie_hood', () => new THREE.SphereGeometry(0.17, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2)), clothMat(it.color, 'jersey', { side: THREE.DoubleSide }), 0, H - 0.02, -D * 0.42);
                hood.rotation.x = -2.1; hood.scale.set(1.1, 0.85, 0.75);
                spine.add(hood);
                spine.add(M(rbox(W * 0.56, 0.13, 0.02, 0.008), rib, 0, 0.12, D * 0.47 + 0.008));
                for (const s of [1, -1]) spine.add(M(cyl(0.005, 0.005, 0.14, 6), stdMat('#e8e4dc'), s * 0.045, H - 0.09, D * 0.53 + 0.008));
            }
            return;
        }
        const id = Object.keys(ITEMS).find(k => ITEMS[k] === it);
        switch (id) {
            case 'grembiule': {
                // grembiule di cuoio che segue il petto e ricade sulle gambe
                const m = clothMat(it.color, 'cuoio', { r: 0.9, side: THREE.DoubleSide });
                spine.add(M(geo('apron' + kf(W, D, H) + fem, () => {
                    const g = new THREE.PlaneGeometry(1, 1, 10, 16), p = g.attributes.position;
                    for (let i = 0; i < p.count; i++) {
                        const u = p.getX(i), v = p.getY(i) + 0.5;            // u -0.5..0.5, v 0 (orlo) .. 1 (petto)
                        const y = -0.3 + v * (H * 0.82 + 0.3), top = sstep(0.55, 0.75, v);
                        const x = u * W * (0.84 - 0.3 * top);
                        const ax = Math.min(1, Math.abs(x) / (W * 0.5));
                        let zf = y > 0 ? D * 0.53 * (1 - ax ** 2.8) ** (1 / 2.8) : D * 0.5 + (-y) * 0.12;
                        if (fem) zf += 0.045 * sstep(H * 0.38, H * 0.55, y) * (1 - ax * 0.5);   // passa sopra il seno
                        p.setXYZ(i, x, y, zf + 0.012);
                    }
                    g.computeVertexNormals();
                    return g;
                }), m));
                const strap = clothMat(shade(it.color, 0.6), 'cuoio');
                const belt = M(torus(W * 0.5, 0.01, Math.PI * 2, 6, 40), strap, 0, 0.08, 0); belt.rotation.x = Math.PI / 2; belt.scale.y = D / W * 1.1; spine.add(belt);
                for (const s of [1, -1]) { const st = M(box(0.03, 0.2, 0.012), strap, s * W * 0.15, H * 0.88, D * 0.3); st.rotation.x = -0.6; spine.add(st); }
                break;
            }
            case 'cotta': {
                const m = metalMat(it.color, { r: 0.45, chain: true });
                spine.add(M(torsoGeo(W * 1.07, D * 1.1, H * 1.01, fem), m));
                spine.add(M(cyl(W * 0.55, W * 0.64, 0.22, 40, true), metalMat(it.color, { r: 0.45, chain: true, side: THREE.DoubleSide }), 0, -0.05, 0));
                for (const s of [1, -1]) { const sh = M(geo('mailsh', () => new THREE.SphereGeometry(0.1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.6)), m, s * W * 0.5, H - 0.03, 0); sh.scale.set(1.1, 0.8, 1); spine.add(sh); }
                break;
            }
            case 'tunica_mago': {
                spine.add(M(box(0.06, H, 0.02), stdMat(it.color2, { e: it.color2, ei: 0.5 }), 0, H / 2, D * 0.5 + 0.005));
                break;
            }
            case 'ossa': {
                const m = hornMat(it.color);
                for (let i = 0; i < 4; i++) spine.add(M(rbox(W * 0.95, 0.04, D * 1.1, 0.02), m, 0, 0.14 + i * 0.09, 0.005));
                spine.add(M(box(0.05, H * 0.9, 0.04), m, 0, H * 0.48, D * 0.53 + 0.01));
                for (const s of [1, -1]) spine.add(M(sphere(0.1, 20, 14), m, s * W * 0.52, H - 0.02, 0));
                break;
            }
            case 'corazza': {
                // pettorale sagomato con la costola centrale, cinghia di cuoio, spallacci a lame sovrapposte
                const m = metalMat(it.color, { r: 0.24, cc: 0.4 });
                const plate = M(torsoGeo(W * 1.12, D * 1.16, H * 0.98, fem), m, 0, 0.02, 0);
                spine.add(plate);
                spine.add(M(sweep('ridge' + kf(D), [new THREE.Vector3(0, 0.08, D * 0.57), new THREE.Vector3(0, H * 0.45, D * 0.6), new THREE.Vector3(0, H * 0.85, D * 0.56)], () => 0.008, { flat: 0.6 }), m));
                const belt = M(cyl(W * 0.53, W * 0.53, 0.06, 40, true), clothMat('#3a2412', 'cuoio', { side: THREE.DoubleSide }), 0, 0.06, 0); belt.scale.z = D / W * 1.1; spine.add(belt);
                spine.add(M(box(0.05, 0.045, 0.01), metalMat('#c9ccd0', { r: 0.25 }), 0, 0.06, D * 0.6));
                for (const s of [1, -1]) for (let k = 0; k < 3; k++) {
                    const p = M(geo('pauld' + k, () => new THREE.SphereGeometry(0.13 - k * 0.012, 28, 12, 0, Math.PI * 2, 0, Math.PI * (0.42 - k * 0.04))), metalMat(it.color, { r: 0.24, cc: 0.4, side: THREE.DoubleSide }), s * (W * 0.52 + k * 0.012), H - 0.03 - k * 0.04, 0);
                    p.rotation.z = -s * (0.35 + k * 0.15); spine.add(p);
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
            const g = geo('wing2', () => {
                const w = new THREE.ShapeGeometry(sh, 16), p = w.attributes.position;   // membrana che si incava tra le dita
                for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -0.035 * Math.sin(Math.min(1, x / 0.7) * Math.PI) * (0.3 + 0.7 * Math.max(0, -y + 0.1) * 3)); }
                w.computeVertexNormals();
                return w;
            });
            const m = HQ ? accMat('wing' + it.color, () => new THREE.MeshPhysicalMaterial({ color: it.color, side: THREE.DoubleSide, roughness: 0.6, sheen: 0.7, sheenColor: new THREE.Color('#6a4a70'), sheenRoughness: 0.4 }))
                : stdMat(it.color, { side: THREE.DoubleSide, r: 0.9 });
            const bm = hornMat(shade(it.color, 1.6));
            const V = (x, y) => new THREE.Vector3(x, y, 0.004);
            const bones = [[V(0, 0), V(0.2, 0.1), V(0.42, 0.17)], [V(0.42, 0.17), V(0.6, 0.22), V(0.75, 0.25)], [V(0.42, 0.17), V(0.56, 0.1), V(0.68, 0.05)],
                [V(0.42, 0.17), V(0.47, 0.05), V(0.5, -0.05)], [V(0.42, 0.17), V(0.36, 0.0), V(0.3, -0.12)]];
            this.wings = [];
            for (const s of [1, -1]) {
                const piv = new THREE.Group();
                piv.position.set(s * 0.06, H - 0.12, -D / 2 - 0.02);
                const w = M(g, m); w.scale.x = s;
                bones.forEach((b, i) => w.add(M(sweep('wbone' + i, b, t => (i ? 0.007 : 0.012) * (1 - t * 0.6), { n: 10, seg: 6 }), bm)));
                piv.add(w); spine.add(piv);
                this.wings.push({ piv, s });
            }
            return;
        }
        // mantello: geometria propria che si piega e ondeggia (vedi updateCape)
        const cape = new THREE.Group();
        cape.position.set(0, H - 0.02, -D / 2 - 0.035);
        this.capeGeo?.dispose();
        const cg = new THREE.PlaneGeometry(W * 1.3, 1.1, 10, 18);
        cg.translate(0, -0.55, 0);
        const cuv = cg.attributes.uv;                 // UV in metri: la trama ha la grana del resto dei vestiti
        for (let i = 0; i < cuv.count; i++) cuv.setXY(i, cuv.getX(i) * W * 1.3, cuv.getY(i) * 1.1);
        cg.userData.metric = true;
        const cm = clothMat(it.color, 'velluto', { side: THREE.DoubleSide, r: 0.85 });
        const mesh = M(cg, cm);
        mesh.frustumCulled = false;
        cape.add(mesh);
        this.capeGeo = cg; this.capeBase = Float32Array.from(cg.attributes.position.array); this.capeW = W;
        if (id === 'mantello_regale') {
            // collo d'ermellino: pelliccia chiara con le codine nere
            const fur = M(torus(0.15, 0.06, Math.PI * 2, 14, 40), HQ ? clothMat(it.color2, 'velluto') : stdMat(it.color2, { r: 1 }), 0, 0.02, D / 2 + 0.02);
            fur.rotation.x = Math.PI / 2; fur.scale.set(1.25, 1, 1);
            cape.add(fur);
            for (let i = 0; i < 9; i++) {
                const a = Math.PI * (0.15 + i / 8 * 0.7) + Math.PI, x = Math.cos(a) * 0.19, z = D / 2 + 0.02 + Math.sin(a) * 0.15;
                const tail = M(sphere(0.012, 8, 6), stdMat('#111'), x * 1.25, 0.05, z); tail.scale.set(0.6, 1.4, 0.6); cape.add(tail);
            }
        }
        spine.add(cape);
        this.cape = cape;
        this.updateCape(0.05, 0);
    }

    addSkirt(hips, W, D, limb, fem, mat, trimM) {
        const NS = 40, sk = this.skirt = { W, D, NS, parts: [], top: fem ? 0.53 : 0.505, legX: W * (fem ? 0.28 : 0.25), rThigh: limb * 1.45 + 0.014, rCalf: limb * 1.12 + 0.012 };
        const part = (f0, f1, nr, grow, m) => {
            const g = new THREE.BufferGeometry(), n = (nr + 1) * (NS + 1), idx = [], uv = [];
            for (let j = 0; j <= nr; j++) for (let i = 0; i <= NS; i++) {
                uv.push(i / NS * W * 2.2, (f0 + (f1 - f0) * j / nr) * 0.66);   // UV in metri
                if (j < nr && i < NS) { const a = j * (NS + 1) + i, b = a + NS + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
            }
            g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
            g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
            g.setIndex(idx);
            g.userData.metric = true;
            const mesh = M(g, m); mesh.frustumCulled = false;
            hips.add(mesh);
            sk.parts.push({ g, f0, f1, nr, grow });
        };
        part(0, 1, 12, 0, mat);
        if (trimM) part(0.93, 1, 1, 0.005, trimM);
        this.updateSkirt(0);
    }

    updateSkirt(t) {
        const sk = this.skirt, C = this.pose, NS = sk.NS, W = sk.W, D = sk.D;
        const legs = [[sk.legX, C.hipLx, C.knL], [-sk.legX, C.hipRx, C.knR]];
        const ring = [];
        for (const pt of sk.parts) {
            const p = pt.g.attributes.position;
            for (let j = 0; j <= pt.nr; j++) {
                const f = pt.f0 + (pt.f1 - pt.f0) * j / pt.nr, y = 0.0 - f * 0.69;
                const rx = W * (sk.top + (0.82 - sk.top) * f ** 0.7), rz = D * 0.53 + (W * 0.82 - D * 0.53) * f ** 0.6;
                // dove sta ogni gamba a questa altezza (coscia fino al ginocchio, poi polpaccio)
                ring.length = 0;
                for (const [lx, a, k] of legs) {
                    const ky = -0.06 - 0.4 * Math.cos(a), kz = -0.4 * Math.sin(a);
                    if (y > ky) { const tt = (-0.06 - y) / Math.max(0.2, Math.cos(a)); ring.push(lx, -tt * Math.sin(a), sk.rThigh); }
                    else { const b = a + k, tt = (ky - y) / Math.max(0.2, Math.cos(b)); ring.push(lx, kz - tt * Math.sin(b), sk.rCalf); }
                }
                for (let i = 0; i <= NS; i++) {
                    const th = i / NS * Math.PI * 2, ux = Math.sin(th), uz = Math.cos(th);
                    let r = 1 / Math.hypot(ux / rx, uz / rz);
                    r *= 1 + f * (0.045 * Math.sin(th * 9 + 0.6) + 0.02 * Math.sin(th * 4 - 1.1)) + 0.012 * f * Math.sin(t * 2.6 + th * 3);   // pieghe e un filo di movimento
                    for (let q = 0; q < ring.length; q += 3) {
                        const cx = ring[q], cz = ring[q + 1], rl = ring[q + 2], d = cx * ux + cz * uz;
                        const disc = rl * rl - (cx * cx + cz * cz - d * d);
                        if (disc > 0 && d > 0) {
                            const need = d + Math.sqrt(disc);
                            r = 0.5 * (r + need + Math.hypot(r - need, 0.035));        // massimo morbido: niente spigoli
                        }
                    }
                    r += pt.grow;
                    p.setXYZ(j * (NS + 1) + i, ux * r, y, uz * r);
                }
            }
            p.needsUpdate = true;
            pt.g.computeVertexNormals();
        }
    }

    // il mantello pende dalle spalle e si solleva per gradi: in alto resta attaccato, l'orlo vola
    updateCape(c, t) {
        const p = this.capeGeo.attributes.position, b = this.capeBase, W = this.capeW, L = 1.1;
        const th0 = 0.05 + c * 0.35, kap = c * 1.1 / L, amp = 0.03 + c * 0.1;
        for (let i = 0; i < p.count; i++) {
            const x0 = b[i * 3], s = -b[i * 3 + 1], f = s / L;
            const wave = amp * Math.sin(t * 5.2 - s * 5 + x0 * 7) * f;
            const th = th0 + wave;
            let y, z;
            if (Math.abs(kap) < 1e-3) { y = -s * Math.cos(th); z = -s * Math.sin(th); }
            else { y = -(Math.sin(th + kap * s) - Math.sin(th)) / kap; z = (Math.cos(th + kap * s) - Math.cos(th)) / kap; }
            const x = x0 * (1 + f * 0.35);
            z += -Math.pow(x0 / (W * 0.65), 2) * 0.06 * (1 - f * 0.5) + 0.014 * Math.sin(x0 * 26 + 0.5) * f;
            p.setXYZ(i, x, y, z);
        }
        p.needsUpdate = true;
        this.capeGeo.computeVertexNormals();
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

    // --- ALTARE: scia dell'arma incantata (da +5), bagliore dell'infusione, aura dei vestiti a +10 ---
    setupFx() {
        if (this.fx) { this.fx.group.removeFromParent(); this.fx.dispose(); this.fx = null; }
        const w = this.look.weapon, plus = w?.plus | 0, inf = ELEMENTS[w?.inf] ? w.inf : null;
        const seed = ELEMENTS[this.look.el] ? this.look.el : null;
        const armed = !!w?.type && w.type !== 'pugni';
        const trailCol = plus >= 5 && armed ? ELEMENTS[inf || seed]?.glow || '#ffffff' : null;
        const auraCol = this.look.aura ? ELEMENTS[seed]?.color || '#ffd76a' : null;
        if (!trailCol && !(inf && armed) && !auraCol) return;
        const fx = this.fx = { group: new THREE.Group(), mats: [], geos: [] };
        this.root.add(fx.group);
        const sprite = (col, sc, op = 1) => {
            const m = new THREE.SpriteMaterial({ map: fxGlow(), color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
            fx.mats.push(m);
            const s = new THREE.Sprite(m); s.scale.set(sc, sc, 1);
            return s;
        };
        if (inf && armed) {
            fx.inf = sprite(ELEMENTS[inf].glow, 0.42, 0.8);
            fx.inf.position.y = (this.weaponMesh.userData.length || 1) * 0.85;
            this.weaponMesh.add(fx.inf);
        }
        if (trailCol) {
            const n = 12, pos = new Float32Array(n * 2 * 3), col = new Float32Array(n * 2 * 3), idx = [];
            for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            g.setAttribute('color', new THREE.BufferAttribute(col, 3));
            g.setIndex(idx);
            const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
            fx.geos.push(g); fx.mats.push(m);
            const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false;
            fx.group.add(mesh);
            fx.trail = { mesh, n, tips: [], bases: [], col: new THREE.Color(trailCol), k: 0 };
        }
        if (auraCol) {
            fx.aura = sprite(auraCol, 2.4, 0.22); fx.aura.scale.set(1.9, 2.8, 1); fx.aura.position.y = 1.05;
            fx.group.add(fx.aura);
            fx.motes = Array.from({ length: 9 }, (_, i) => { const s = sprite(auraCol, 0.16, 0.9); fx.group.add(s); return { s, a: i / 9 * Math.PI * 2, y: Math.random() * 1.8, sp: 0.5 + Math.random() * 0.6 }; });
        }
        fx.dispose = () => { for (const m of fx.mats) m.dispose(); for (const g of fx.geos) g.dispose(); fx.inf?.removeFromParent(); };
    }
    updateFx(dt, t) {
        const fx = this.fx;
        if (!fx) return;
        if (fx.inf) fx.inf.material.opacity = 0.55 + Math.sin(t * 5) * 0.3;
        if (fx.aura) {
            fx.aura.material.opacity = 0.16 + Math.sin(t * 1.8) * 0.06;
            for (const m of fx.motes) {
                m.a += dt * m.sp; m.y = (m.y + dt * 0.45) % 1.9;
                m.s.position.set(Math.cos(m.a) * 0.55, 0.1 + m.y, Math.sin(m.a) * 0.55);
                m.s.material.opacity = Math.sin(m.y / 1.9 * Math.PI) * 0.9;
            }
        }
        const T = fx.trail;
        if (!T || !this.weaponMesh || !this.root.parent) return;
        const len = this.weaponMesh.userData.length || 1;
        const tip = this.root.worldToLocal(this.weaponMesh.localToWorld(_v1.set(0, len, 0))).clone();
        const base = this.root.worldToLocal(this.weaponMesh.localToWorld(_v2.set(0, len * 0.4, 0))).clone();
        T.tips.unshift(tip); T.bases.unshift(base);
        if (T.tips.length > T.n) { T.tips.length = T.n; T.bases.length = T.n; }
        const speed = T.tips.length > 1 ? T.tips[0].distanceTo(T.tips[1]) / Math.max(dt, 1e-3) : 0;
        T.k += ((speed > 3 ? 1 : 0) - T.k) * Math.min(1, dt * (speed > 3 ? 14 : 5));
        const pos = T.mesh.geometry.attributes.position, col = T.mesh.geometry.attributes.color;
        for (let i = 0; i < T.n; i++) {
            const a = T.tips[Math.min(i, T.tips.length - 1)], b = T.bases[Math.min(i, T.bases.length - 1)];
            pos.setXYZ(i * 2, a.x, a.y, a.z); pos.setXYZ(i * 2 + 1, b.x, b.y, b.z);
            const f = (1 - i / (T.n - 1)) * T.k;
            col.setXYZ(i * 2, T.col.r * f, T.col.g * f, T.col.b * f);
            col.setXYZ(i * 2 + 1, T.col.r * f * 0.25, T.col.g * f * 0.25, T.col.b * f * 0.25);
        }
        pos.needsUpdate = true; col.needsUpdate = true;
    }

    // Colpo subito: dir = 1 se arriva davanti, -1 se da dietro; power 0..1 (pesante = 1)
    hurt(dir = 1, power = 0.5) {
        this.react = { t: 0, dir, p: Math.min(1.2, power), tw: Math.random() < 0.5 ? -1 : 1 };
        if (this.faceMat && this.faceTex) { this.faceMat.map = this.faceTex.closed; this.blinkT = 0.18 + power * 0.2; }   // strizza gli occhi
    }
    // al K.O. l'arma scivola di mano, vola girando e rimbalza a terra
    dropWeapon() {
        const w = this.weaponMesh, world = this.root.parent;
        if (!w || !world || this.loose || !w.children.length) return;
        world.attach(w);
        this.loose = { w, vx: (Math.random() - 0.5) * 3.5, vy: 4.5 + Math.random() * 2, wz: (Math.random() < 0.5 ? -1 : 1) * (9 + Math.random() * 6), floor: this.root.position.y, rest: 0, bounces: 0 };
    }
    restoreWeapon() {
        const L = this.loose;
        if (!L) return;
        this.loose = null;
        L.w.visible = true;
        this.arms.R.hand.add(L.w);
        L.w.position.set(0, 0, 0); L.w.rotation.set(Math.PI / 2, 0, 0); L.w.scale.set(1, 1, 1);
    }
    updateLoose(dt) {
        const L = this.loose;
        if (!L) return;
        const w = L.w;
        if (L.rest > 0) {
            // si adagia piatta sul pavimento
            L.rest = Math.min(1, L.rest + dt * 6);
            w.quaternion.slerp(L.q, L.rest);
            w.position.y += (L.floor + 0.03 - w.position.y) * L.rest;
            return;
        }
        L.vy -= 26 * dt;
        w.position.x += L.vx * dt; w.position.y += L.vy * dt;
        w.rotateOnWorldAxis(_ax.set(0, 0, 1), L.wz * dt);
        const onStage = Math.abs(w.position.x) < 9.3;
        if (onStage && w.position.y < L.floor + 0.05 && L.vy < 0) {
            w.position.y = L.floor + 0.05;
            L.vy = -L.vy * 0.35; L.vx *= 0.55; L.wz *= 0.45; L.bounces++;
            if (L.vy < 1.4 || L.bounces > 2) {
                // stesa: lunga lungo la x, il piatto verso l'alto
                const sx = Math.sign(_ax.set(0, 1, 0).applyQuaternion(w.quaternion).x) || 1;
                _m4.makeBasis(_v1.set(0, 0, sx), _v2.set(sx, 0, 0), _ax.set(0, 1, 0));
                L.q = new THREE.Quaternion().setFromRotationMatrix(_m4); L.rest = 0.01;
            }
        }
        if (w.position.y < -14) w.visible = false;
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
        // K.O.: il tempo parte quando si va a terra; al round dopo l'arma torna in mano
        if (st === 'ko' && this.prevSt !== 'ko') { this.koT = 0; this.koLand = -1; }
        if (st !== 'ko' && this.koT >= 0) { this.koT = -1; this.restoreWeapon(); }
        this.prevSt = st;
        const air = ext ? ext.grounded === false : false;
        const fling = ext ? Math.hypot(ext.vx || 0, ext.vy || 0) : 0;

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
            if (air) {
                // sbalzato: braccia e gambe aperte, testa all'indietro
                P.spineRx = -0.25; P.headRx = -0.35; P.shLz = 1.2; P.shRz = -1.2; P.shLx = -0.4; P.shRx = -0.2; P.elL = P.elR = -0.3;
                P.hipLx = -0.6; P.knL = 1.0; P.hipRx = 0.35; P.knR = 0.4; P.cape = 0.9;
            } else {
                // barcolla: piegato in avanti, passi incerti
                const w = Math.sin(t * 13);
                P.spineRx = 0.28; P.headRx = 0.18; P.spineRz = w * 0.08; P.shLz = 0.45; P.shRz = -0.45; P.shLx = P.shRx = 0.25; P.elL = P.elR = -0.5;
                P.hipLx = w * 0.3; P.hipRx = -w * 0.3; P.knL = 0.45 + Math.max(0, w) * 0.3; P.knR = 0.45 + Math.max(0, -w) * 0.3; P.bodyY = -0.06; P.cape = 0.4;
            }
        } else if (st === 'ko') {
            this.koT += dt;
            if (this.koLand < 0 && (!air || this.koT > 2.5)) { this.koLand = this.koT; this.koFrom = Math.min(1, this.koT * 3) * 0.45; this.dropWeapon(); }
            if (this.koLand < 0) {
                // in volo: si inarca all'indietro, le braccia si aprono
                const f = Math.min(1, this.koT * 3);
                P.bodyRx = -0.45 * f; P.spineRx = -0.4 * f; P.headRx = -0.5 * f;
                P.shLx = -2.0 * f; P.shRx = -2.2 * f; P.shLz = 0.9 * f; P.shRz = -0.9 * f; P.elL = P.elR = -0.2;
                P.hipLx = -0.5 * f; P.knL = 0.9 * f; P.hipRx = 0.2; P.knR = 0.3; P.cape = 1;
            } else {
                // cade all'indietro sempre più in fretta, sbatte, rimbalza e si affloscia
                const u = this.koT - this.koLand, T = 0.42;
                const fall = Math.min(1, (u / T) ** 2);
                const b = u > T ? Math.exp(-(u - T) * 8) * Math.abs(Math.sin((u - T) * 18)) : 0;
                const settle = ease(seg(u, T, T + 0.6));
                P.bodyRx = -(this.koFrom + (1.52 - this.koFrom) * fall) + 0.16 * b; P.bodyY = 0.18 * fall;
                P.spineRx = -0.25 * (1 - settle) + 0.05; P.headRx = -0.4 * fall * (1 - settle) - 0.05 * settle; P.headRy = 0.55 * settle;
                P.shLx = -2.3 * fall * (1 - settle) - 0.3 * settle; P.shRx = -2.1 * fall * (1 - settle) + 0.2 * settle;
                P.shLz = 0.6 + 0.7 * settle + 0.25 * b; P.shRz = -0.6 - 0.8 * settle - 0.25 * b; P.elL = -0.3 * settle; P.elR = -0.6 * settle;
                P.hipLx = -0.4 * (1 - settle); P.knL = 0.3 + 0.4 * (1 - settle); P.hipRx = 0.1; P.knR = 0.15 + 0.3 * b; P.cape = 0.2;
            }
        } else if (st === 'win') {
            P.shRx = -2.9 + Math.sin(t * 8) * 0.15; P.shRz = -0.15; P.elR = -0.2; P.shLz = 0.35;
            P.bodyY = Math.abs(Math.sin(t * 4)) * 0.08; P.headRx = -0.2;
        } else if (st === 'dash') {
            P.spineRx = 0.5; P.shLx = P.shRx = 0.9; P.hipLx = -0.6; P.hipRx = 0.7; P.knR = 0.6; P.cape = 0.9;
        } else if (st === 'sit') {
            P.hipLx = P.hipRx = -1.5; P.knL = P.knR = 1.5; P.bodyY = -0.42;
        } else if (st === 'row') {
            // in piedi a poppa, con il remo lungo: spinge e richiama
            const s = Math.sin(t * 1.5);
            P.shLx = P.shRx = -1.05 + s * 0.42; P.shLz = 0.28; P.shRz = -0.28; P.elL = P.elR = -0.75 - s * 0.3;
            P.spineRx = 0.14 + s * 0.12; P.knL = P.knR = 0.18 + s * 0.06; P.headRx = -0.04; P.cape = 0.2;
        } else {
            P.spineRx = Math.sin(t * 1.6) * 0.025;
            P.shLz += Math.sin(t * 1.6) * 0.02; P.shRz -= Math.sin(t * 1.6) * 0.02;
            P.headRy = Math.sin(t * 0.33) * 0.25; P.headRx = Math.sin(t * 0.21) * 0.06;
            P.cape = 0.05 + Math.sin(t * 1.3) * 0.03;
        }

        // --- AZIONI ---
        const a = ext?.action ?? (this.action ? { name: this.action.name, p: this.action.t / this.action.dur } : null);
        if (a) applyAction(P, a.name, Math.min(1, Math.max(0, a.p)), t, a.v | 0);

        // capriola quando un colpo forte lo sbalza in aria; atterrato, si raddrizza dal verso più corto
        const tumbling = (st === 'stun' || (st === 'ko' && this.koLand < 0)) && air && fling > 9;
        if (tumbling) this.spin -= dt * Math.min(14, fling * 0.75) * (ext.back ? 1 : -1);
        else { const tg = Math.round(this.spin / (Math.PI * 2)) * Math.PI * 2; this.spin += (tg - this.spin) * Math.min(1, dt * 10); if (Math.abs(tg - this.spin) < 0.01) this.spin = 0; }

        // Spettro: fluttua
        if (this.app.species === 'spettro') P.bodyY += 0.22 + Math.sin(t * 2.2) * 0.06;

        // --- APPLICA (smorzato) ---
        const k = st === 'frozen' ? 0 : 1 - Math.exp(-dt * (st === 'ko' ? 40 : ext ? 22 : 14));
        const C = this.pose;
        for (const key of POSE_KEYS) C[key] += (P[key] - C[key]) * k;
        // reazione al colpo: scatto immediato (fuori dallo smorzamento) e ritorno con un piccolo rimbalzo
        let rx = 0, rh = 0, ry = 0, rs = 0, rk = 0, sq = 0;
        if (this.react) {
            const R = this.react; R.t += dt;
            const e = R.p * Math.exp(-R.t * 6.5) * (Math.cos(R.t * 12) * 0.4 + 0.6);
            const e2 = R.p * Math.exp(-Math.max(0, R.t - 0.05) * 5.5) * Math.min(1, R.t / 0.05);   // la testa segue con un attimo di ritardo
            rx = -0.55 * e * R.dir; rh = -0.6 * e2 * R.dir; ry = 0.4 * e * R.tw; rs = 0.7 * e; rk = 0.45 * e;
            sq = 0.1 * R.p * Math.exp(-R.t * 14);
            if (R.t > 1.2) this.react = null;
        }
        const hs = this.app.height || 1, sp = this.spin, cy = this.hipY * hs;
        this.body.scale.set(hs * (1 + sq * 0.8), hs * (1 - sq), hs * (1 + sq * 0.8));
        // la capriola gira attorno ai fianchi, non ai piedi
        this.body.rotation.set(C.bodyRx + sp, C.bodyRy, C.bodyRz);
        this.body.position.set(0, C.bodyY + cy * (1 - Math.cos(sp)), -cy * Math.sin(sp));
        this.spine.rotation.set(C.spineRx + rx, C.spineRy + ry, C.spineRz);
        this.head.rotation.set(C.headRx + rh, C.headRy, 0);
        this.arms.L.sh.rotation.set(C.shLx, C.shLy, C.shLz + rs);
        this.arms.L.el.rotation.x = C.elL;
        this.arms.R.sh.rotation.set(C.shRx, C.shRy, C.shRz - rs);
        this.arms.R.el.rotation.x = C.elR;
        this.legs[0].hip.rotation.set(C.hipLx, 0, C.hipLz);
        this.legs[0].knee.rotation.x = C.knL + rk;
        this.legs[1].hip.rotation.set(C.hipRx, 0, C.hipRz);
        this.legs[1].knee.rotation.x = C.knR + rk;
        this.updateLoose(dt);
        if (this.skirt) this.updateSkirt(t);
        if (this.cape) this.updateCape(Math.max(0, C.cape), t);
        if (this.wings) for (const w of this.wings) w.piv.rotation.y = -w.s * (0.5 + Math.sin(t * (st === 'air' ? 12 : 2)) * (st === 'air' ? 0.5 : 0.12));
        if (this.halo) this.halo.position.y = HEAD_R * 1.55 + Math.sin(t * 2) * 0.02;
        this.updateFx(dt, t);

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

    // --- IL CAPPUCCIO DA PIOGGIA: su quando piove, giù al riparo ---
    // largo abbastanza da stare fuori da testa e orecchie; i capelli e le orecchie lunghe ci finiscono sotto;
    // le corna escono da due asole orlate, una per corno
    setRainHood(on) {
        on = !!on && !HOOD_SKIP.has(this.look.head) && !!this.head;
        if (on === this.hooded) return;
        this.hooded = on;
        if (on && !this.rainHood) this.rainHood = this.makeRainHood();
        if (this.rainHood) this.rainHood.visible = on;
        for (const o of this.hoodHide) o.visible = !on;
    }
    makeRainHood() {
        // una calotta un po' più larga della testa, con due aperture che si toccano: il viso davanti e il collo sotto
        const R = HEAD_R, HR = R * 1.3, TILT = 0.3, THMAX = Math.PI * 0.68, HOLE = 0.98;
        const X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1);
        const face = new THREE.Vector3(0, -0.12, 1).normalize().applyAxisAngle(X, TILT);   // dove guarda il viso, nel riferimento della calotta
        const capeIt = ITEMS[this.look.cape];
        // della stessa stoffa del mantello, se c'è; altrimenti una tela cerata, ognuno la sua
        const TELE = ['#2e4a52', '#5a4632', '#4a3a5a', '#3e4d3a', '#7a3a2a', '#8a6a2a'];
        let hsh = 0; for (const ch of JSON.stringify(this.app)) hsh = (hsh * 31 + ch.charCodeAt(0)) | 0;
        const col = capeIt?.color ? shade(capeIt.color, 0.85) : TELE[Math.abs(hsh) % TELE.length];
        const mat = clothMat(col, 'lino', { r: 0.5, side: THREE.DoubleSide });
        const g = new THREE.Group();
        const shell = M(geo('rainhood3', () => {
            const s = new THREE.SphereGeometry(HR, 64, 36, 0, Math.PI * 2, 0, THMAX);
            // via i triangoli davanti al viso
            const ix = s.index.array, keep = [], P0 = s.attributes.position, cosH = Math.cos(HOLE);
            for (let i = 0; i < ix.length; i += 3) {
                _v1.set(0, 0, 0);
                for (let j = 0; j < 3; j++) _v1.add(_v2.fromBufferAttribute(P0, ix[i + j]));
                if (_v1.normalize().dot(face) < cosH) keep.push(ix[i], ix[i + 1], ix[i + 2]);
            }
            s.setIndex(keep);
            const p = s.attributes.position;   // in cima (che è dietro, in alto) la stoffa fa una punta morbida; verso il bordo, le pieghe
            for (let i = 0; i < p.count; i++) {
                _v1.fromBufferAttribute(p, i);
                const ny = _v1.y / HR, a = Math.atan2(_v1.x, _v1.z), down = Math.max(0, 0.2 - ny * 0.6);
                const k = 1 + 0.03 * Math.sin(a * 9 + _v1.y * 18) * down + 0.42 * Math.max(0, ny) ** 7;
                const lat = 1 - 0.06 * Math.max(0, ny) ** 2;   // un filo più stretto ai lati della punta
                p.setXYZ(i, _v1.x * k * lat, _v1.y * k, _v1.z * k * lat);
            }
            s.computeVertexNormals();
            return s;
        }), mat);
        // guscio e bordo stanno in un gruppo inclinato all'indietro, un filo più alto e profondo della testa
        const sg = new THREE.Group(); sg.rotation.x = -TILT; sg.scale.set(1, 1.04, 1.06); g.add(sg);
        sg.add(shell);
        // l'orlo arrotolato sulle due aperture, solo dove c'è stoffa (le aperture sono cerchi sulla sfera: si orlano con un toro)
        const rimM = clothMat(shade(col, 0.8), 'lino', { r: 0.6 });
        const hem = (dir, half, onCloth) => {
            const q = new THREE.Quaternion().setFromUnitVectors(Z, dir), c = dir.clone().multiplyScalar(HR * Math.cos(half)), r = HR * Math.sin(half);
            const N = 96, ok = [];
            for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; ok.push(onCloth(_v1.set(Math.cos(a) * r, Math.sin(a) * r, 0).applyQuaternion(q).add(c).normalize())); }
            if (!ok.some(Boolean)) return;
            let s0 = 0, L = N;
            if (!ok.every(Boolean)) { s0 = ok.findIndex((v, i) => v && !ok[(i + N - 1) % N]); L = 0; while (L < N && ok[(s0 + L) % N]) L++; }
            const arc = L / N * Math.PI * 2;
            const m = M(geo(`rainhem_${r.toFixed(3)}_${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, 0.02, 8, Math.max(8, L), arc)), rimM);
            m.position.copy(c); m.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(Z, s0 / N * Math.PI * 2));
            sg.add(m);
        };
        const cosT = Math.cos(THMAX) + 0.02, cosH = Math.cos(HOLE) - 0.02;
        hem(face, HOLE, (d) => d.y > cosT);                              // attorno al viso
        hem(new THREE.Vector3(0, -1, 0), Math.PI - THMAX, (d) => d.dot(face) < cosH);   // sotto, attorno al collo
        // la punta che ricade sulla nuca
        g.add(M(sweep('rainhoodtip3', [new THREE.Vector3(0, 0.36, -0.12), new THREE.Vector3(0, 0.33, -0.25), new THREE.Vector3(0, 0.21, -0.34), new THREE.Vector3(0, 0.06, -0.35), new THREE.Vector3(0, -0.05, -0.32)],
            s => 0.055 * (1 - s) ** 1.1 + 0.008, { flat: 0.6, n: 28 }), mat));
        // le corna: dove escono dalla stoffa, un'asola orlata
        if (this.look.head === 'corna') for (const s of [1, -1]) {
            const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(s * 0.12, 0.17, 0.03), new THREE.Vector3(s * 0.19, 0.25, 0.06), new THREE.Vector3(s * 0.23, 0.34, 0.01), new THREE.Vector3(s * 0.21, 0.42, -0.07)]);
            // il punto del corno che sta sulla superficie del cappuccio (in coordinate del guscio: ruotato e scalato)
            sg.updateMatrix(); const inv = sg.matrix.clone().invert();
            let t = 0;
            for (let i = 0; i <= 60; i++) { const q = curve.getPoint(i / 60).applyMatrix4(inv); if (q.length() >= HR) { t = i / 60; break; } }
            const p = curve.getPoint(t), tan = curve.getTangent(t), hr = 0.034 * (1 - t) ** 0.9 + 0.003;
            const ring = M(torus(hr + 0.012, 0.011, Math.PI * 2, 8, 20), clothMat(shade(col, 0.7), 'lino', { r: 0.6 }), p.x, p.y, p.z);
            ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
            g.add(ring);
        }
        g.traverse(o => { if (o.isMesh) o.castShadow = true; });
        this.head.add(g);
        return g;
    }

    dispose() {
        CHARACTERS.delete(this);
        if (this.fx) { this.fx.dispose(); this.fx = null; }
        if (this.tag) { this.tag.material.map.dispose(); this.tag.material.dispose(); }
        this.faceMat?.dispose();
        this.body.traverse(o => { if (o.isMesh && o.userData.tinted) o.material.dispose(); });
        this.root.removeFromParent();
    }
}

// Pose delle azioni (p = progresso 0..1)
const ease = x => x * x * (3 - 2 * x);
const easeOut = x => 1 - (1 - x) ** 3;      // parte veloce, rallenta: caricare
const easeIn = x => x * x * x;              // parte piano, esplode: colpire
function seg(p, a, b) { return Math.min(1, Math.max(0, (p - a) / (b - a))); }
// v = variante (colpi leggeri alternati: dritto e rovescio)
function applyAction(P, name, p, t, v = 0) {
    switch (name) {
        case 'light': case 'air': {
            const m = v ? -1 : 1;
            const w = easeOut(seg(p, 0, 0.24)), s = easeIn(seg(p, 0.2, 0.42)), r = ease(seg(p, 0.55, 1));
            const amt = 1 - r;
            P.shRx = (-1.3 - 0.25 * w + 0.15 * s) * amt + P.shRx * r;
            P.shRy = (-1.1 * w + 2.3 * s) * m * amt;
            P.shRz = -0.15 * amt + P.shRz * r;
            P.elR = (-0.2 - 0.8 * w * (1 - s)) * amt + P.elR * r;       // il braccio si distende nel colpo
            P.spineRy = (-0.5 * w + 1.1 * s) * m * amt;
            P.shLx = -0.4 * w * amt; P.shLz = 0.25 * s * amt + P.shLz;
            if (name === 'air') { P.hipLx = -0.9; P.knL = 1.3; P.hipRx = -0.6; P.knR = 1.2; P.bodyRx = 0.2 * amt; }
            else { P.hipLx = -0.35 * s * amt; P.knL = 0.25 * s * amt; P.knR = 0.15 * w * amt; P.bodyY = -0.03 * s * amt; }
            break;
        }
        case 'heavy': {
            // carica alta dietro la testa (con il tremito dello sforzo), passo avanti e fendente che va oltre
            const w = easeOut(seg(p, 0, 0.3)), s = easeIn(seg(p, 0.29, 0.44)), f = ease(seg(p, 0.44, 0.62)), r = ease(seg(p, 0.62, 1));
            const amt = 1 - r, trem = Math.sin(t * 55) * 0.05 * w * (1 - s);
            P.shRx = (-3.0 * w + 2.7 * s + 0.45 * f + trem) * amt + P.shRx * r;
            P.shRz = (-0.35 * w + 0.25 * s) * amt + P.shRz * r;
            P.elR = (-1.0 * w * (1 - s) - 0.1) * amt + P.elR * r;
            P.shLx = (-1.2 * w + 1.0 * s) * amt; P.shLz = 0.35 * w * amt + P.shLz * r;
            P.spineRx = (-0.35 * w + 0.75 * s - 0.1 * f + trem) * amt;
            P.spineRy = (-0.45 * w + 0.55 * s) * amt;
            P.headRx = (-0.15 * w + 0.2 * s) * amt;
            P.knL = P.knR = (0.25 * w + 0.35 * s) * amt;
            P.hipLx = (0.2 * w - 0.75 * s) * amt; P.hipRx = 0.35 * s * amt;
            P.bodyY = (-0.05 * w - 0.12 * s) * amt;
            P.cape = 0.3 + 0.6 * s * amt;
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
            // si solleva caricando a braccia alte, trema, poi si schianta a terra
            const w = easeOut(seg(p, 0, 0.3)), s = easeIn(seg(p, 0.29, 0.42)), r = ease(seg(p, 0.6, 1));
            const amt = 1 - r, trem = Math.sin(t * 60) * 0.06 * w * (1 - s);
            P.shLx = P.shRx = (-2.8 * w + 1.6 * s + trem) * amt;
            P.shLz = (0.5 * w - 0.25 * s) * amt + 0.1 * r; P.shRz = (-0.5 * w + 0.25 * s) * amt - 0.1 * r;
            P.elL = P.elR = -0.15;
            P.spineRx = (-0.35 * w + 0.65 * s) * amt;
            P.headRx = (-0.3 * w + 0.3 * s) * amt;
            P.bodyY = (0.16 * w - 0.2 * s) * amt;
            P.knL = P.knR = 0.6 * s * amt; P.hipLx = P.hipRx = -0.35 * s * amt;
            P.cape = 0.9 * amt;
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
