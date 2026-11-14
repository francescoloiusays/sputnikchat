// --- ARENA DEI DUELLI: IL COLOSSEO IN ROVINA ---
// Resta in piedi solo la metà lontana dell'anfiteatro: il podio con i quadri, le gradinate a gradoni
// e il muro esterno ad arcate su tre ordini, alto a sinistra e sfondato dietro a destra, dove si vede il mare.
// Il palco dei duelli è un lastricato su un ponte ad archi che scende fino all'acqua.
// Tutta la pietra è un unico materiale: travertino disegnato qui (blocchi, pori, fughe) con il suo rilievo;
// ogni blocco ha la sua tinta e il suo pezzo di trama, così non si vede nessun motivo ripetuto.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Relief } from './realism.js';
import { rng, fbm } from './world.js';
import { makeBrazier } from './decor.js';
import { FIGHT } from './shared/fight.js';

const TILE = 4;              // metri coperti da una trama
const CZ = -6;               // centro dell'ellisse
const R0 = [21, 13], R1 = [38, 30];
const TA = Math.PI - 0.3, TB = Math.PI * 2 + 0.3;
const PODY = 2.0;            // cima del podio
const WATER = -10.5;

// --- TRAME ---
function stoneTextures(n, seed, kind) {
    const r = rng(seed), px = n / TILE, pave = kind === 'pave';
    const mk = () => { const c = document.createElement('canvas'); c.width = c.height = n; return c; };
    const col = mk(), hgt = mk(), g = col.getContext('2d'), h = hgt.getContext('2d');
    g.fillStyle = pave ? '#8c7c5e' : '#857a69'; g.fillRect(0, 0, n, n);
    h.fillStyle = '#000'; h.fillRect(0, 0, n, n);
    const joint = (pave ? 0.03 : 0.018) * px;
    // file di blocchi che chiudono esatte sul bordo della tela
    const rows = []; let tot = 0;
    while (tot < n) { const hh = (pave ? 0.9 + r() * 0.8 : 0.45 + r() * 0.3) * px; rows.push(hh); tot += hh; }
    let y0 = 0;
    for (const rh0 of rows) {
        const rh = rh0 * n / tot, lens = []; let w = 0;
        while (w < n) { const L = (pave ? 1.0 + r() * 1.0 : 0.8 + r() * 1.3) * px; lens.push(L); w += L; }
        let x0 = r() * n;
        for (const L0 of lens) { const L = L0 * n / w; block(x0, y0, L, rh); x0 += L; }
        y0 += rh;
    }
    function path(c, x, y, w, hh) {
        const j = joint, ch = () => r() * Math.min(w, hh) * 0.12;
        const a = ch(), b = ch(), cc = ch(), d = ch();
        c.beginPath();
        c.moveTo(x + j + a, y + j); c.lineTo(x + w - j - b, y + j); c.lineTo(x + w - j, y + j + b * 0.7);
        c.lineTo(x + w - j, y + hh - j - cc); c.lineTo(x + w - j - cc * 0.8, y + hh - j);
        c.lineTo(x + j + d, y + hh - j); c.lineTo(x + j, y + hh - j - d * 0.6); c.lineTo(x + j, y + j + a * 0.7); c.closePath();
    }
    function block(x, y, w, hh) {
        const v = 0.8 + r() * 0.32, warm = (r() - 0.5) * 0.08;
        const base = pave ? [176, 158, 124] : [206, 192, 166];
        const rgb = base.map((c, i) => Math.min(255, c * v * (1 + (i === 0 ? warm : i === 2 ? -warm : 0))) | 0);
        const H = 0.62 + r() * 0.25;
        const seeds = Array.from({ length: Math.ceil(w * hh / 250) }, () => [r(), r(), r(), r()]);
        const blobs = Array.from({ length: 5 }, () => [r(), r(), 0.2 + r() * 0.5, r() < 0.5]);
        for (const ox of [0, -n]) {
            if (x + ox > n || x + w + ox < 0) continue;
            const X = x + ox;
            g.save(); path(g, X, y, w, hh); g.clip();
            g.fillStyle = `rgb(${rgb})`; g.fillRect(X, y, w, hh);
            for (const [bx, by, bs, dark] of blobs) {
                const gr = g.createRadialGradient(X + bx * w, y + by * hh, 0, X + bx * w, y + by * hh, bs * Math.max(w, hh));
                gr.addColorStop(0, dark ? 'rgba(70,58,44,0.22)' : 'rgba(255,248,230,0.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
                g.fillStyle = gr; g.fillRect(X, y, w, hh);
            }
            // pori del travertino: trattini scuri orizzontali
            for (const [a, b, c, d] of seeds) {
                g.fillStyle = `rgba(60,48,36,${0.25 + c * 0.35})`;
                g.beginPath(); g.ellipse(X + a * w, y + b * hh, 1 + c * 5, 0.6 + d * 1.4, 0, 0, 7); g.fill();
            }
            if (!pave) { // colature di pioggia
                for (let k = 0; k < 3; k++) {
                    const sx = X + r() * w, gr = g.createLinearGradient(0, y, 0, y + hh);
                    gr.addColorStop(0, 'rgba(50,45,40,0.16)'); gr.addColorStop(1, 'rgba(50,45,40,0)');
                    g.fillStyle = gr; g.fillRect(sx, y, 2 + r() * 8, hh);
                }
            }
            g.restore();
            path(g, X, y, w, hh); g.strokeStyle = 'rgba(40,32,24,0.35)'; g.lineWidth = joint * 1.2; g.stroke();
            // altezze: blocco in rilievo, spigoli smussati, pori incavati
            path(h, X, y, w, hh); h.fillStyle = `rgb(${H * 255 | 0},${H * 255 | 0},${H * 255 | 0})`; h.fill();
            for (const [lw, a] of [[joint * 5, 0.25], [joint * 2.5, 0.35]]) { path(h, X, y, w, hh); h.strokeStyle = `rgba(0,0,0,${a})`; h.lineWidth = lw; h.stroke(); }
            h.save(); path(h, X, y, w, hh); h.clip();
            for (const [a, b, c, d] of seeds) { h.fillStyle = 'rgba(0,0,0,0.5)'; h.beginPath(); h.ellipse(X + a * w, y + b * hh, 1 + c * 5, 0.6 + d * 1.4, 0, 0, 7); h.fill(); }
            h.restore();
        }
    }
    const map = new THREE.CanvasTexture(col);
    map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(1 / TILE, 1 / TILE); map.anisotropy = 8;
    const rel = new Relief(3, n), normalMap = rel.like(map);
    rel.bake(hgt);
    return { map, normalMap };
}

// --- MURATORE: tanti pezzi uniti in una sola geometria ---
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);
class Mason {
    constructor(r) { this.r = r; this.parts = []; }
    tint(base = 1, spread = 0.1) {
        const v = base * (1 - spread + this.r() * spread * 2), w = (this.r() - 0.5) * 0.05;
        return [v * (1 + w), v, v * (1 - w)];
    }
    push(geo, m, tint) {
        const g = geo.index ? geo.toNonIndexed() : geo;
        if (geo !== g) geo.dispose();
        g.applyMatrix4(m);
        for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
        g.clearGroups();
        const p = g.attributes.position, c = new Float32Array(p.count * 3);
        for (let i = 0; i < p.count; i++) {
            // più in basso, più scuro: umidità e ombra delle volte
            const a = 0.16 + 0.84 * THREE.MathUtils.smoothstep(p.getY(i), WATER + 1, 7);
            c[i * 3] = tint[0] * a; c[i * 3 + 1] = tint[1] * a; c[i * 3 + 2] = tint[2] * a;
        }
        g.setAttribute('color', new THREE.BufferAttribute(c, 3));
        this.parts.push(g);
    }
    mat(x, y, z, ry = 0, rx = 0, rz = 0) { _e.set(rx, ry, rz); _q.setFromEuler(_e); return _m.compose(_p.set(x, y, z), _q, _one); }
    // scatola con le coordinate della trama in metri e un pezzo di trama a caso
    box(sx, sy, sz, x, y, z, ry = 0, tint = null, rx = 0, rz = 0) {
        const g = new THREE.BoxGeometry(sx, sy, sz), uv = g.attributes.uv, ox = this.r() * TILE, oy = this.r() * TILE;
        const dims = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
        for (let f = 0; f < 6; f++) for (let j = 0; j < 4; j++) { const i = f * 4 + j; uv.setXY(i, uv.getX(i) * dims[f][0] + ox, uv.getY(i) * dims[f][1] + oy); }
        this.push(g, this.mat(x, y, z, ry, rx, rz), tint || this.tint());
    }
    // forma piena (con fori ad arco) estrusa in profondità e centrata
    shape(shape, depth, x, y, z, ry, tint = null, seg = 10) {
        const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: seg });
        g.translate(0, 0, -depth / 2);
        const uv = g.attributes.uv, ox = this.r() * TILE, oy = this.r() * TILE;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + ox, uv.getY(i) + oy);
        this.push(g, this.mat(x, y, z, ry), tint || this.tint());
    }
    cyl(rt, rb, hh, x, y, z, tint = null, rx = 0, rz = 0) {
        const g = new THREE.CylinderGeometry(rt, rb, hh, 18, 1), uv = g.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * rb + this.r() * TILE, uv.getY(i) * hh);
        this.push(g, this.mat(x, y, z, 0, rx, rz), tint || this.tint());
    }
    build(material) {
        const g = mergeGeometries(this.parts, false);
        for (const p of this.parts) p.dispose();
        this.parts = [];
        g.computeBoundingSphere();
        return new THREE.Mesh(g, material);
    }
}

// rettangolo con un'arcata (fori a tutto sesto), base in y=0, centrato in x
function archShape(w, hh, arches) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, hh); s.lineTo(-w / 2, hh); s.closePath();
    for (const [cx, half, spring, bottom = 0.25] of arches) {
        const p = new THREE.Path();
        p.moveTo(cx - half, bottom); p.lineTo(cx + half, bottom); p.lineTo(cx + half, spring);
        p.absarc(cx, spring, half, 0, Math.PI, false); p.lineTo(cx - half, bottom);
        s.holes.push(p);
    }
    return s;
}

// punto sull'ellisse: s=0 podio, s=1 muro esterno
function E(t, s) {
    const rx = R0[0] + (R1[0] - R0[0]) * s, rz = R0[1] + (R1[1] - R0[1]) * s;
    return { x: rx * Math.cos(t), z: CZ + rz * Math.sin(t), yaw: Math.atan2(-rz * Math.cos(t), -rx * Math.sin(t)) };
}
// quanto è rimasto in piedi lungo l'arco (0 crollato, 1 intatto)
const KEYS = [[0, 0.3], [0.06, 0.85], [0.22, 1], [0.38, 0.85], [0.5, 0.7], [0.6, 0.38], [0.68, 0.12], [0.76, 0.28], [0.86, 0.6], [0.95, 0.45], [1, 0.15]];
function standing(u) {
    let i = 0; while (i < KEYS.length - 2 && u > KEYS[i + 1][0]) i++;
    const [a, va] = KEYS[i], [b, vb] = KEYS[i + 1], k = THREE.MathUtils.smoothstep(u, a, b);
    return THREE.MathUtils.clamp(va + (vb - va) * k + (fbm(u * 18, 3.7, 3) - 0.5) * 0.3, 0, 1);
}

export function buildColosseum(scene, { alta = true, fires } = {}) {
    const r = rng(1789);
    const n = alta ? 1024 : 512;
    const wallT = stoneTextures(n, 7, 'wall'), paveT = stoneTextures(n, 19, 'pave');
    const stoneM = new THREE.MeshStandardMaterial({ map: wallT.map, normalMap: wallT.normalMap, vertexColors: true, roughness: 0.92, color: '#e4dccd' });
    const paveM = new THREE.MeshStandardMaterial({ map: paveT.map, normalMap: paveT.normalMap, vertexColors: true, roughness: 0.88, color: '#e8dfcc' });
    const out = { meshes: [], lights: [], frames: [], dispose() { for (const t of [wallT, paveT]) { t.map.dispose(); t.normalMap.dispose(); } } };
    const M = new Mason(r);

    // --- ANFITEATRO ---
    const N = 46, K = 12, dT = (TB - TA) / N;
    for (let i = 0; i < N; i++) {
        const t0 = TA + i * dT, t1 = t0 + dT, tm = (t0 + t1) / 2, u = (i + 0.5) / N, h = standing(u);
        const chord = (s) => { const a = E(t0, s), b = E(t1, s); return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, L: Math.hypot(b.x - a.x, b.z - a.z), yaw: Math.atan2(-(b.z - a.z), b.x - a.x) }; };
        // podio: muro dal mare fino alla cornice, coi quadri sopra il palco
        const pd = chord(0), ptop = h < 0.25 ? PODY - 1 - r() * 2.5 : PODY;
        M.box(pd.L * 1.03, ptop - WATER, 1.4, pd.x, (ptop + WATER) / 2, pd.z, pd.yaw, M.tint(0.95));
        if (h >= 0.25) M.box(pd.L * 1.05, 0.38, 2.0, pd.x, PODY + 0.1, pd.z, pd.yaw, M.tint(1.05));
        // massa sotto le gradinate
        const baseTop = h < 0.15 ? PODY - 4 - r() * 3 : h < 0.3 ? PODY - 1.5 : PODY;
        const bm = chord(0.36);
        M.box(bm.L * 1.15, baseTop - WATER, E(tm, 0.68).z - E(tm, 0.04).z === 0 ? 1 : Math.hypot(E(tm, 0.68).x - E(tm, 0.04).x, E(tm, 0.68).z - E(tm, 0.04).z), bm.x, (baseTop + WATER) / 2, bm.z, bm.yaw, M.tint(0.8));
        // gradoni: tanti quanti ne restano, l'ultimo spezzato
        if (h >= 0.15) {
            const rows = Math.min(K, Math.floor(K * Math.min(1, h * 1.2) + (r() - 0.5) * 2));
            for (let k = 0; k < rows; k++) {
                const s = 0.06 + (k + 0.5) * 0.6 / K, c = chord(s), top = PODY + 0.6 + k * 0.75;
                const dep = Math.hypot(E(tm, s + 0.05).x - E(tm, s).x, E(tm, s + 0.05).z - E(tm, s).z) * 1.04;
                if (k === rows - 1 && rows < K && r() < 0.7) {
                    const part = 0.3 + r() * 0.4;  // ne resta solo un pezzo
                    M.box(c.L * part, 1.9, dep, c.x + Math.cos(c.yaw) * c.L * (part - 1) / 2, top - 0.95, c.z - Math.sin(c.yaw) * c.L * (part - 1) / 2, c.yaw);
                } else {
                    const tt = M.tint(0.82, 0.14);
                    M.box(c.L * 1.04, 1.9, dep, c.x, top - 0.95, c.z, c.yaw, tt);
                    // la seduta: lastra chiara che sporge verso l'arena, con l'ombra sotto
                    const lip = E(tm, s - 0.025 + 0.004), ll = tt.map(v => v * 1.35);
                    M.box(c.L * 1.04, 0.2, 0.55, lip.x, top - 0.1, lip.z, c.yaw, ll);
                }
            }
            // macerie sui gradoni crollati
            if (rows < K) for (let q = 0; q < 3 + r() * 4; q++) {
                const k = Math.max(0, rows - 1 - Math.floor(r() * 2)), s = 0.06 + (k + 0.2 + r() * 0.6) * 0.6 / K, p = E(t0 + r() * dT, s), sz = 0.4 + r() * 0.8;
                M.box(sz * (1 + r()), sz * 0.7, sz, p.x, (rows ? PODY + 0.6 + k * 0.75 : PODY) + sz * 0.2, p.z, r() * 6, M.tint(0.9), (r() - 0.5) * 0.4, (r() - 0.5) * 0.4);
            }
        }
        // muro esterno: basamento pieno e poi arcate su tre ordini + attico
        if (h >= 0.12) {
            const w = chord(0.72), H = 6, D = 1.9;
            M.box(w.L * 1.02, PODY - WATER, D, w.x, (PODY + WATER) / 2, w.z, w.yaw, M.tint(0.85));
            const levels = h * 4.3;   // 4 = tre ordini e l'attico interi
            const half = (w.L - 1.25) / 2;
            for (let j = 0; j < 4; j++) {
                const yb = PODY + j * H, attic = j === 3, hh = attic ? 4.2 : H;
                if (levels >= j + 1) {
                    const sh = attic ? archShape(w.L * 1.01, hh, [[0, 0.45, 2.2, 1.4]]) : archShape(w.L * 1.01, hh, [[0, half, hh - 1.0 - half]]);
                    M.shape(sh, D, w.x, yb, w.z, w.yaw);
                    M.box(w.L * 1.04, 0.32, D + 0.35, w.x, yb + hh, w.z, w.yaw, M.tint(1.05)); // cornicione
                } else if (levels > j + 0.25) {
                    // ordine crollato: restano i pilastri, mozzati ad altezze diverse
                    for (const side of [-1, 1]) {
                        if (r() < 0.25) continue;
                        const ph = hh * (0.3 + r() * 0.7), off = side * (w.L / 2 - 0.62);
                        M.box(1.25, ph, D, w.x + Math.cos(w.yaw) * off, yb + ph / 2, w.z - Math.sin(w.yaw) * off, w.yaw);
                    }
                    break;
                } else break;
            }
        }
    }
    // colonne spezzate sul podio, tra un quadro e l'altro
    for (const [u, frac] of [[0.08, 1], [0.2, 0.45], [0.43, 0.8], [0.57, 1], [0.8, 0.3], [0.92, 0.7]]) {
        const p = E(TA + u * (TB - TA), 0), full = 7.5, hh = full * frac;
        M.box(1.3, 0.5, 1.3, p.x, PODY + 0.5, p.z, p.yaw, M.tint(1.05));
        M.cyl(0.44, 0.5, hh, p.x, PODY + 0.75 + hh / 2, p.z);
        if (frac === 1) M.box(1.35, 0.5, 1.35, p.x, PODY + 0.75 + hh + 0.25, p.z, p.yaw, M.tint(1.05));
        else { // il pezzo caduto giace sul podio o sui gradoni
            const q = E(TA + u * (TB - TA) + 0.03, 0.08);
            M.cyl(0.45, 0.45, full * (1 - frac) * 0.6, q.x, PODY + 1.05, q.z, null, Math.PI / 2, r() * 3);
        }
    }

    // --- PALCO: lastricato su un ponte ad archi che scende al mare ---
    const main = FIGHT.PLATFORMS[0], SW = main.x2 - main.x1;
    M.box(SW + 0.7, 0.4, 5.5, 0, -0.32, 0, 0, M.tint(1.05));       // cornice sotto il bordo
    M.box(SW, 0.8, 4.8, 0, -0.9, 0, 0, M.tint(0.95));
    M.shape(archShape(11, 9.6, [[0, 2.6, 6.2]]), 4.2, 0, WATER - 0.4, 0, 0, M.tint(0.85));
    for (const sx of [-1, 1]) for (const [x, hh] of [[6.3, 1.1], [7.5, 0.85], [8.6, 0.6]]) // mensole sotto il bordo
        M.box(0.5, hh, 3.8, sx * x, -1.3 - hh / 2, 0, 0, M.tint(0.92));
    for (const sx of [-1, 1]) { // capi spezzati del ponte
        M.box(0.9, 1.0, 3.6, sx * (SW / 2 + 0.3), -1.0, -0.3, 0, null, 0, sx * 0.12);
        M.box(0.6, 0.7, 2.2, sx * (SW / 2 + 0.75), -1.6, 0.4, 0.2, null, 0.1, sx * 0.3);
    }
    const stoneMesh = M.build(stoneM);
    stoneMesh.receiveShadow = true;
    scene.add(stoneMesh); out.meshes.push(stoneMesh);

    // lastre del palco: una mesh a parte col materiale da pavimento, che prende e fa ombra
    const P = new Mason(rng(77));
    P.box(SW + 0.2, 0.3, 5.0, 0, -0.15, 0, 0, P.tint(1, 0.04));
    // piattaforme sospese: pezzi di trabeazione staccati, con le rune sotto
    for (const p of FIGHT.PLATFORMS.slice(1)) {
        const w = p.x2 - p.x1, cx = (p.x1 + p.x2) / 2;
        P.box(w, 0.55, 2.6, cx, p.y - 0.275, 0, 0, P.tint(1.25, 0.05));
        P.box(w * 0.7, 0.25, 1.8, cx, p.y - 0.65, 0, 0, P.tint(1.1));
    }
    const paveMesh = P.build(paveM);
    paveMesh.castShadow = paveMesh.receiveShadow = true;
    scene.add(paveMesh); out.meshes.push(paveMesh);

    const runeM = new THREE.MeshBasicMaterial({ color: '#b37aff', transparent: true, opacity: 0.85 });
    for (const p of FIGHT.PLATFORMS.slice(1)) {
        const w = p.x2 - p.x1;
        const glow = new THREE.Mesh(new THREE.BoxGeometry(w * 0.66, 0.04, 1.6), runeM);
        glow.position.set((p.x1 + p.x2) / 2, p.y - 0.79, 0); scene.add(glow); out.meshes.push(glow);
        const line = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.05, 0.02), runeM);   // rune incise sul fronte
        line.position.set((p.x1 + p.x2) / 2, p.y - 0.36, 1.305); scene.add(line); out.meshes.push(line);
    }

    // --- FUOCO ---
    for (const x of [-(SW / 2 - 0.7), SW / 2 - 0.7]) {
        const b = makeBrazier(fires, 1.6); b.position.set(x, 0, -1.9); scene.add(b);
        const l = new THREE.PointLight('#ff8a3a', 40, 24, 1.4); l.position.set(x, 2.6, -1.4); scene.add(l); out.lights.push(l);
    }
    for (const x of [-8, 8]) {  // bracieri sul podio, danno profondità
        const t = 2 * Math.PI - Math.acos(x / R0[0]), p = E(t, 0);
        const b = makeBrazier(fires, 1.3); b.position.set(p.x, PODY + 0.3, p.z + 0.2); scene.add(b);
    }
    const back = new THREE.PointLight('#ffa060', 40, 16, 1.6); back.position.set(0, 5.5, CZ - R0[1] + 5); scene.add(back); out.lights.push(back);

    const fill = new THREE.DirectionalLight('#9fb0ff', 0.55); fill.position.set(4, 10, 30); scene.add(fill); out.meshes.push(fill);

    // quadri sul podio, ognuno sulla sua stele
    const M2 = new Mason(rng(31));
    for (const [x, w] of [[-15, 4.6], [0, 4.6], [15, 4.6]]) {
        const t = 2 * Math.PI - Math.acos(x / R0[0]), p = E(t, 0), nx = Math.cos(t) / R0[0], nz = Math.sin(t) / R0[1], k = Math.hypot(nx, nz);
        // stele di pietra sul podio che regge il quadro
        const fh = w * 9 / 16, ix = -nx / k, iz = -nz / k, ry = Math.atan2(-nx, -nz), sh = fh + 1.2;
        M2.box(w + 1.0, sh, 0.55, p.x + ix * 0.2, PODY + sh / 2, p.z + iz * 0.2, ry, M2.tint(1.05));
        M2.box(w + 1.4, 0.35, 0.85, p.x + ix * 0.2, PODY + sh + 0.17, p.z + iz * 0.2, ry, M2.tint(1.15));
        M2.box(w + 1.3, 0.4, 0.9, p.x + ix * 0.2, PODY + 0.2, p.z + iz * 0.2, ry, M2.tint(0.95));
        out.frames.push({ w, x: p.x + ix * 0.5, y: PODY + 0.65 + fh / 2, z: p.z + iz * 0.5, ry });
    }
    const steles = M2.build(stoneM); scene.add(steles); out.meshes.push(steles);
    return out;
}
