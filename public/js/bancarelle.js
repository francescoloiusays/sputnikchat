// =====================================================================
//  IL BAZAR DEL RATTO e LA BARCA ROVESCIATA
//  Il Bazar resta una bancarella, ma una bancarella vera: tenda a
//  festoni, banco col drappo, bilancia, forma di formaggio, scaffali
//  di boccette, lanterne appese e l'insegna. Il Mercante sta dietro.
//  La Barca Rovesciata è la casa della Retaia, sulla spiaggia a ovest
//  del Molo: una barca girata a pancia in su, reti stese, boe, nasse,
//  un'ancora e la rastrelliera con le canne da pesca.
// =====================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WORLD } from './world.js';
import { BARCA, RODS } from './shared/mare.js';

function tex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
}
// un piccolo generatore con seme: la bancarella è uguale per tutti
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// helper comuni: un gruppo girato di ry in (x, y, z), con i suoi collider in coordinate locali
function kit(W, x, y, z, ry) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry;
    W.scene.add(g);
    const L = (lx, lz) => [x + lx * Math.cos(ry) + lz * Math.sin(ry), z - lx * Math.sin(ry) + lz * Math.cos(ry)];
    const put = (geo, mat, lx, ly, lz, rot = null, parent = g) => {
        const m = new THREE.Mesh(geo, mat); m.position.set(lx, ly, lz);
        if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
        m.castShadow = m.receiveShadow = true; parent.add(m); return m;
    };
    const box = (lx, lz, w, d, y0, y1) => { const [wx, wz] = L(lx, lz); W.addBox(wx, wz, w, d, y + y0, y + y1, -ry); };
    const circ = (lx, lz, r, y0, y1) => { const [wx, wz] = L(lx, lz); W.addCirc(wx, wz, r, y + y0, y + y1); };
    // una luce calda vera (la rotazione delle luci accende solo le più vicine) e il suo bagliore
    const lamp = (lx, ly, lz, color = '#ffb347', I = 14, dist = 10) => {
        const l = new THREE.PointLight(color, I, dist, 1.6);
        l.position.set(lx, ly, lz); g.add(l);
        W.lights.push({ l, base: I, sp: 2 + Math.random() * 2, out: true });
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
        s.position.set(lx, ly, lz); s.scale.set(1.3, 1.3, 1); g.add(s);
        W.flames.push({ glow: s, sp: 2 + Math.random() * 3 });
        return l;
    };
    return { g, L, put, box, circ, lamp };
}

// =====================================================================
//  IL BAZAR DEL RATTO
// =====================================================================
export function buildBazar(W) {
    const B = WORLD.SHOPS.bazar;
    const { g, put, box, circ, lamp } = kit(W, B.x, B.h, B.z, B.ry);
    const wood = W.matWood;
    const dark = new THREE.MeshStandardMaterial({ color: '#2b1d14', roughness: 0.9 });
    const brass = new THREE.MeshStandardMaterial({ color: '#c8963a', metalness: 0.85, roughness: 0.35 });
    const iron = new THREE.MeshStandardMaterial({ color: '#2a2628', metalness: 0.8, roughness: 0.5 });
    const R = rng(77);
    const HW = 2.75, FZ = 1.55, BZ = -1.75;        // mezza larghezza, pali davanti e dietro

    // --- il tavolato, e un tappeto davanti per chi compra ---
    put(new THREE.BoxGeometry(6.2, 0.12, 4.2), wood, 0, 0.06, -0.1);
    const rugT = tex(256, 128, (c, w, h) => {
        c.fillStyle = '#5a1a2e'; c.fillRect(0, 0, w, h);
        c.strokeStyle = '#d9b25a'; c.lineWidth = 6; c.strokeRect(8, 8, w - 16, h - 16);
        c.fillStyle = '#c99a2e';
        for (let i = 0; i < 6; i++) { const x = 34 + i * 38; c.beginPath(); c.moveTo(x, 34); c.lineTo(x + 14, 64); c.lineTo(x, 94); c.lineTo(x - 14, 64); c.fill(); }
        c.fillStyle = '#2b3a6b'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(34 + i * 38, 64, 5, 0, 7); c.fill(); }
        c.fillStyle = '#e8d6a8'; for (let x = 4; x < w; x += 8) { c.fillRect(x, 0, 3, 6); c.fillRect(x, h - 6, 3, 6); }
    });
    const rug = put(new THREE.PlaneGeometry(3.4, 1.7), new THREE.MeshStandardMaterial({ map: rugT, roughness: 1 }), 0, 0.02, 3.0, [-Math.PI / 2, 0, 0]);
    rug.castShadow = false;

    // --- i pali torniti, con il pomo d'ottone ---
    for (const [px, pz, ph] of [[-HW, FZ, 2.95], [HW, FZ, 2.95], [-HW, BZ, 3.4], [HW, BZ, 3.4]]) {
        put(new THREE.CylinderGeometry(0.08, 0.11, ph, 10), wood, px, ph / 2, pz);
        put(new THREE.SphereGeometry(0.11, 12, 8), brass, px, ph + 0.06, pz);
        put(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 10), dark, px, 0.12, pz);
        circ(px, pz, 0.14, -1, ph);
    }
    put(new THREE.BoxGeometry(5.7, 0.12, 0.12), wood, 0, 2.86, FZ);
    put(new THREE.BoxGeometry(5.7, 0.12, 0.12), wood, 0, 3.3, BZ);

    // --- la tenda a righe, che scende verso chi compra e si incurva tra i pali ---
    const stripes = tex(512, 64, (c, w, h) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#e8d6a8' : '#6b1a3a'; c.fillRect(i * 32, 0, 32, h); } });
    const awnG = new THREE.PlaneGeometry(6.5, 4.0, 18, 10).rotateX(-Math.PI / 2);
    const ap = awnG.attributes.position;
    for (let i = 0; i < ap.count; i++) {
        const x = ap.getX(i), z = ap.getZ(i), t = (z + 2.0) / 4.0;   // 0 dietro, 1 davanti
        ap.setY(i, 3.42 - t * 0.5 - 0.16 * Math.sin(Math.PI * t) * (1 - Math.pow(x / 3.25, 2)) + 0.05 * Math.pow(x / 3.25, 2));
    }
    awnG.computeVertexNormals();
    const cloth = new THREE.MeshStandardMaterial({ map: stripes, side: THREE.DoubleSide, roughness: 0.9 });
    put(awnG, cloth, 0, 0, -0.15);
    // i festoni: mezzi dischi a colori alterni, davanti e sui fianchi
    const wine = new THREE.MeshStandardMaterial({ color: '#6b1a3a', side: THREE.DoubleSide, roughness: 0.9 });
    const cream = new THREE.MeshStandardMaterial({ color: '#e8d6a8', side: THREE.DoubleSide, roughness: 0.9 });
    const scallop = new THREE.CircleGeometry(0.27, 10, Math.PI, Math.PI);
    for (let i = 0; i < 12; i++) {
        const s = put(scallop, i % 2 ? cream : wine, -3.0 + i * 0.545, 2.93, 1.86);
        s.castShadow = false;
    }
    for (const sx of [-1, 1]) for (let i = 0; i < 7; i++) {
        const t = (i + 0.5) / 7, s = put(scallop, i % 2 ? cream : wine, sx * 3.26, 3.42 - t * 0.5 - 0.08, -2.15 + t * 4.0, [0, Math.PI / 2, 0]);
        s.castShadow = false;
    }
    // una frangia d'oro sotto i festoni
    const fringe = new THREE.MeshStandardMaterial({ color: '#d9b25a', metalness: 0.4, roughness: 0.6 });
    put(new THREE.BoxGeometry(6.5, 0.04, 0.03), fringe, 0, 2.66, 1.86).castShadow = false;

    // --- l'insegna appesa alla trave ---
    const signT = tex(512, 112, (c, w, h) => {
        c.fillStyle = '#2b1d14'; c.fillRect(0, 0, w, h);
        c.strokeStyle = '#c8963a'; c.lineWidth = 6; c.strokeRect(6, 6, w - 12, h - 12);
        c.fillStyle = '#e8c26a'; c.font = 'bold 44px Cinzel, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('BAZAR DEL RATTO', w / 2, h / 2 + 3);
    });
    const sign = new THREE.Group(); sign.position.set(0, 3.5, FZ + 0.32); g.add(sign);
    put(new THREE.BoxGeometry(2.7, 0.56, 0.07), dark, 0, 0, 0, null, sign);
    put(new THREE.PlaneGeometry(2.6, 0.5), new THREE.MeshStandardMaterial({ map: signT, roughness: 0.7 }), 0, 0, 0.04, null, sign);
    for (const sx of [-1.1, 1.1]) put(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 4), iron, sx, -0.5, -0.02, null, sign);

    // --- il banco, col drappo davanti ---
    put(new THREE.BoxGeometry(5.0, 0.92, 0.66), dark, 0, 0.58, 1.15);
    put(new THREE.BoxGeometry(5.3, 0.08, 0.86), wood, 0, 1.08, 1.15);
    const drapeT = tex(512, 128, (c, w, h) => {
        c.fillStyle = '#3b1f5a'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#d9b25a'; c.fillRect(0, 10, w, 6); c.fillRect(0, h - 22, w, 4);
        for (let x = 6; x < w; x += 10) c.fillRect(x, h - 18, 4, 18);
        c.font = 'bold 44px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        for (const x of [w * 0.2, w * 0.5, w * 0.8]) { c.beginPath(); c.arc(x, 62, 24, 0, 7); c.fill(); c.fillStyle = '#3b1f5a'; c.fillText('¤', x, 64); c.fillStyle = '#d9b25a'; }
    });
    put(new THREE.PlaneGeometry(5.1, 0.92), new THREE.MeshStandardMaterial({ map: drapeT, roughness: 0.95, side: THREE.DoubleSide }), 0, 0.6, 1.5).castShadow = false;
    box(0, 1.15, 5.3, 0.86, -1, 1.15);

    // --- sopra il banco ---
    const TOP = 1.12;
    // la bilancia d'ottone
    put(new THREE.CylinderGeometry(0.12, 0.16, 0.06, 14), brass, -1.6, TOP + 0.03, 1.1);
    put(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8), brass, -1.6, TOP + 0.33, 1.1);
    const beam = put(new THREE.BoxGeometry(0.7, 0.03, 0.03), brass, -1.6, TOP + 0.62, 1.1); beam.rotation.z = 0.08;
    for (const s of [-1, 1]) {
        const py = TOP + 0.62 - s * 0.028;
        for (const a of [0, 2.1, 4.2]) { const ch = put(new THREE.CylinderGeometry(0.004, 0.004, 0.36, 3), iron, -1.6 + s * 0.33 + Math.cos(a) * 0.06, py - 0.18, 1.1 + Math.sin(a) * 0.06); ch.castShadow = false; }
        put(new THREE.CylinderGeometry(0.13, 0.09, 0.03, 14), brass, -1.6 + s * 0.33, py - 0.37, 1.1);
    }
    // una pila di monete e una perla sul piatto
    for (let i = 0; i < 7; i++) put(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 12), brass, -0.85 + (i % 3) * 0.02, TOP + 0.01 + i * 0.013, 1.25 - (i % 2) * 0.015);
    put(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: '#f2e6ff', roughness: 0.15, metalness: 0.2 }), -1.27, TOP + 0.3, 1.1);
    // la forma di formaggio, con una fetta tagliata (il Mercante è un ratto, dopotutto)
    const cheeseM = new THREE.MeshStandardMaterial({ color: '#e8b84a', roughness: 0.7 });
    put(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 24, 1, false, 0.4, Math.PI * 2 - 0.8), cheeseM, 1.95, TOP + 0.11, 1.05);
    const inner = new THREE.MeshStandardMaterial({ color: '#f5d77a', roughness: 0.8, side: THREE.DoubleSide });
    for (const a of [0.4, -0.4]) { const p = put(new THREE.PlaneGeometry(0.32, 0.22), inner, 1.95 + Math.sin(a) * 0.16, TOP + 0.11, 1.05 + Math.cos(a) * 0.16, [0, a + Math.PI / 2, 0]); p.castShadow = false; }
    put(new THREE.BoxGeometry(0.4, 0.03, 0.4), wood, 1.95, TOP + 0.005, 1.05);
    // barattoli di vetro, con dentro qualcosa che brilla
    const glass = new THREE.MeshStandardMaterial({ color: '#cfe4ff', transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.1, depthWrite: false });
    [['#7affd8', 0.15], ['#ff5a6a', 0.55], ['#b880ff', 0.95]].forEach(([col, x]) => {
        put(new THREE.CylinderGeometry(0.11, 0.11, 0.26, 14), glass, x, TOP + 0.13, 1.0).castShadow = false;
        put(new THREE.CylinderGeometry(0.09, 0.09, 0.15, 12), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.6, roughness: 0.4 }), x, TOP + 0.08, 1.0);
        put(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 14), dark, x, TOP + 0.28, 1.0);
    });
    // rotoli di pergamena
    const parch = new THREE.MeshStandardMaterial({ color: '#e8dcb8', roughness: 0.95 });
    for (let i = 0; i < 3; i++) put(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 10), parch, 1.25 + i * 0.05, TOP + 0.05 + (i === 2 ? 0.07 : 0), 1.3 - i * 0.08, [0, 0.3, Math.PI / 2]);

    // --- dietro: il drappo appeso e due scaffali pieni di boccette ---
    const backT = tex(256, 160, (c, w, h) => {
        c.fillStyle = '#1e2a4a'; c.fillRect(0, 0, w, h);
        c.strokeStyle = '#c8963a'; c.lineWidth = 4;
        for (let y = 20; y < h; y += 40) for (let x = 20; x < w; x += 40) { c.beginPath(); c.moveTo(x, y - 12); c.lineTo(x + 12, y); c.lineTo(x, y + 12); c.lineTo(x - 12, y); c.closePath(); c.stroke(); }
        c.fillStyle = '#6b1a3a'; c.fillRect(0, 0, w, 10); c.fillRect(0, h - 10, w, 10);
    });
    put(new THREE.PlaneGeometry(5.3, 2.5), new THREE.MeshStandardMaterial({ map: backT, roughness: 0.95, side: THREE.DoubleSide }), 0, 1.95, BZ - 0.06).castShadow = false;
    for (const sy of [1.25, 1.95]) {
        put(new THREE.BoxGeometry(4.9, 0.06, 0.42), wood, 0, sy, BZ + 0.25);
        for (const sx of [-2.4, 0, 2.4]) put(new THREE.BoxGeometry(0.06, 0.24, 0.06), dark, sx, sy - 0.15, BZ + 0.38);
        for (let i = 0; i < 9; i++) {
            const col = ['#7affd8', '#ff5a1f', '#b880ff', '#2bdc6a', '#ffd23a', '#cfe4ff', '#ff5a6a'][Math.floor(R() * 7)];
            const hgt = 0.16 + R() * 0.16, x = -2.2 + i * 0.55 + (R() - 0.5) * 0.12;
            const m = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 });
            put(new THREE.CylinderGeometry(0.06, 0.07, hgt, 10), m, x, sy + 0.03 + hgt / 2, BZ + 0.25);
            put(new THREE.CylinderGeometry(0.02, 0.03, 0.08, 8), m, x, sy + 0.07 + hgt, BZ + 0.25);
            put(new THREE.CylinderGeometry(0.025, 0.025, 0.03, 8), dark, x, sy + 0.12 + hgt, BZ + 0.25);
        }
    }
    box(0, BZ + 0.15, 5.6, 0.6, -1, 3.2);
    // i fianchi: il Mercante esce solo da dietro
    for (const sx of [-1, 1]) box(sx * 2.95, -0.25, 0.3, 3.2, -1, 1.4);

    // --- due lanterne appese alla trave davanti ---
    for (const sx of [-1.7, 1.7]) {
        put(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 4), iron, sx, 2.66, FZ).castShadow = false;
        put(new THREE.CylinderGeometry(0.1, 0.12, 0.26, 6, 1, true), new THREE.MeshStandardMaterial({ color: '#ffcf7a', emissive: '#ffb347', emissiveIntensity: 1.6, transparent: true, opacity: 0.9, side: THREE.DoubleSide }), sx, 2.38, FZ);
        put(new THREE.ConeGeometry(0.14, 0.12, 6), iron, sx, 2.57, FZ);
        put(new THREE.CylinderGeometry(0.12, 0.1, 0.03, 6), iron, sx, 2.24, FZ);
    }
    lamp(0, 2.3, FZ - 0.2, '#ffb347', 16, 11);

    // --- fuori dalla bancarella: sacchi, botti, casse, tappeti arrotolati ---
    const sack = new THREE.MeshStandardMaterial({ color: '#8a7350', roughness: 1 });
    [[3.3, 1.5, 0.42], [3.55, 0.85, 0.36], [3.15, 0.35, 0.3]].forEach(([x, z, r], i) => {
        const s = put(new THREE.SphereGeometry(r, 12, 9), sack, x, r * 0.75, z); s.scale.set(1, 1.25, 1); s.rotation.y = i;
        put(new THREE.TorusGeometry(r * 0.35, 0.03, 6, 12), new THREE.MeshStandardMaterial({ color: '#4a3a24', roughness: 1 }), x, r * 1.65, z, [Math.PI / 2, 0, 0]);
        // spezie in cima al sacco aperto
        if (i === 0) put(new THREE.CircleGeometry(r * 0.5, 12), new THREE.MeshStandardMaterial({ color: '#c8501e', roughness: 1 }), x, r * 1.72, z, [-Math.PI / 2, 0, 0]);
    });
    box(3.35, 0.9, 0.9, 1.9, -1, 0.9);
    for (const [x, z] of [[-3.35, 1.2], [-3.4, 0.35]]) {
        put(new THREE.CylinderGeometry(0.34, 0.3, 0.86, 16), wood, x, 0.43, z);
        for (const hy of [0.15, 0.71]) put(new THREE.TorusGeometry(0.335, 0.02, 4, 18), iron, x, hy, z, [Math.PI / 2, 0, 0]);
        put(new THREE.CircleGeometry(0.32, 16), dark, x, 0.865, z, [-Math.PI / 2, 0, 0]);
    }
    put(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshStandardMaterial({ color: '#d64a2a', roughness: 0.5 }), -3.33, 0.98, 1.15);   // una mela sulla botte
    box(-3.37, 0.78, 0.8, 1.6, -1, 0.86);
    // tappeti arrotolati appoggiati dietro, a destra
    [['#6b1a3a', 0], ['#2b3a6b', 0.22], ['#3a5a2a', 0.44]].forEach(([col, o]) => {
        put(new THREE.CylinderGeometry(0.11, 0.11, 1.9, 10), new THREE.MeshStandardMaterial({ color: col, roughness: 1 }), 3.25 + o * 0.3, 0.92, -1.3 - o, [0.22, 0, -0.18]);
    });
    // casse con la paglia, dietro a sinistra
    const straw = new THREE.MeshStandardMaterial({ color: '#c8b060', roughness: 1 });
    for (const [x, z, s] of [[-3.3, -1.0, 0.55], [-3.25, -1.6, 0.45]]) {
        put(new THREE.BoxGeometry(s, s * 0.75, s), wood, x, s * 0.375, z);
        put(new THREE.BoxGeometry(s * 0.9, 0.05, s * 0.9), straw, x, s * 0.76, z);
    }
    box(-3.3, -1.3, 0.7, 1.2, -1, 0.5);

    // la torcia a muro di sempre, e il punto dove si parla col Mercante
    W.addTorch(B.x + Math.sin(B.ry) * 1.69 + Math.cos(B.ry) * 2.6, B.h + 2.5, B.z + Math.cos(B.ry) * 1.69 - Math.sin(B.ry) * 2.6, true, 0.9, { wall: B.ry });
    W.interactables.push({ id: 'bazar', x: B.x + Math.sin(B.ry) * 3.6, z: B.z + Math.cos(B.ry) * 3.6, r: 3.8, label: 'Bazar: il banco dei viandanti' });
    return g;
}

// =====================================================================
//  LA BARCA ROVESCIATA (la Retaia)
// =====================================================================
export function buildBarca(W) {
    const y0 = W.terrainAt(BARCA.x, BARCA.z);
    const { g, L, put, box, circ, lamp } = kit(W, BARCA.x, y0, BARCA.z, BARCA.ry);
    const wood = W.matWood;
    const tar = new THREE.MeshStandardMaterial({ color: '#2a1d14', roughness: 0.95 });
    const plankT = tex(256, 128, (c, w, h) => {
        for (let i = 0; i < 8; i++) { c.fillStyle = ['#3a2a1e', '#33251a', '#40301f', '#2e2218'][i % 4]; c.fillRect(0, i * 16, w, 16); c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(0, i * 16, w, 2); }
        c.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 400; i++) c.fillRect(Math.random() * w, Math.random() * h, 6, 1);
        // la vernice vecchia, rossa e mezza scrostata, lungo la falchetta
        c.fillStyle = '#7a2a22'; c.fillRect(0, h - 18, w, 14);
    });
    plankT.wrapS = plankT.wrapT = THREE.RepeatWrapping; plankT.repeat.set(2, 1);
    const hullM = new THREE.MeshStandardMaterial({ map: plankT, roughness: 0.9, side: THREE.DoubleSide });
    const rope = new THREE.MeshStandardMaterial({ color: '#8a7350', roughness: 1 });
    const iron = new THREE.MeshStandardMaterial({ color: '#3a3430', metalness: 0.7, roughness: 0.6 });

    // --- lo scafo, a pancia in su: lungo x, la bocca aperta verso +z (il Molo) ---
    // costruito come un mezzo tubo che si stringe a prua e a poppa, alzato su due muretti
    const LEN = 6.4, RAD = 1.85, H0 = 1.15;
    const hullG = new THREE.CylinderGeometry(1, 1, LEN, 22, 12, true, Math.PI / 2, Math.PI).rotateZ(Math.PI / 2);
    const hp = hullG.attributes.position;
    for (let i = 0; i < hp.count; i++) {
        const x = hp.getX(i), t = x / (LEN / 2);
        const k = Math.sqrt(Math.max(0.06, 1 - Math.pow(Math.abs(t), 2.4)));   // si stringe alle punte
        hp.setY(i, hp.getY(i) * RAD * (0.55 + 0.45 * k) + Math.pow(Math.abs(t), 3) * 0.35);   // e si alza un poco (il cavallino)
        hp.setZ(i, hp.getZ(i) * RAD * k);
    }
    hullG.computeVertexNormals();
    put(hullG, hullM, 0, H0, 0);
    // la chiglia in cima, e le due ruote di prua e di poppa
    put(new THREE.BoxGeometry(LEN + 0.3, 0.16, 0.16), tar, 0, H0 + RAD + 0.02, 0);
    for (const s of [-1, 1]) {
        const st = put(new THREE.BoxGeometry(0.16, 1.5, 0.16), tar, s * (LEN / 2 + 0.05), H0 + 0.85, 0); st.rotation.z = -s * 0.35;
    }
    // il muretto di sassi dietro e due pali davanti: lo scafo appoggia lì
    const stoneM = new THREE.MeshStandardMaterial({ color: '#5a5462', roughness: 0.95, flatShading: true });
    put(new THREE.BoxGeometry(LEN - 0.6, H0 + 0.1, 0.45), stoneM, 0, (H0 + 0.1) / 2, -RAD * 0.78);
    for (const s of [-1, 1]) {
        put(new THREE.BoxGeometry(0.4, H0 + 0.1, 1.4), stoneM, s * (LEN / 2 - 0.5), (H0 + 0.1) / 2, -RAD * 0.35);
        put(new THREE.CylinderGeometry(0.1, 0.12, H0 + 0.2, 8), wood, s * (LEN / 2 - 0.6), (H0 + 0.2) / 2, RAD * 0.75);
    }
    box(0, -RAD * 0.78, LEN - 0.4, 0.6, -1, H0 + 1);
    for (const s of [-1, 1]) { box(s * (LEN / 2 - 0.5), -RAD * 0.35, 0.6, 1.6, -1, H0 + 1); circ(s * (LEN / 2 - 0.6), RAD * 0.75, 0.14, -1, H0 + 1); }

    // --- sotto lo scafo: il banco da lavoro e la rastrelliera delle canne ---
    put(new THREE.BoxGeometry(2.4, 0.08, 0.8), wood, -0.6, 0.86, -0.85);
    for (const [x, z] of [[-1.7, -1.15], [0.5, -1.15], [-1.7, -0.55], [0.5, -0.55]]) put(new THREE.BoxGeometry(0.07, 0.84, 0.07), wood, x, 0.42, z);
    // sul banco: una morsa, un rocchetto di lenza, ami, una lucerna
    put(new THREE.BoxGeometry(0.22, 0.14, 0.14), iron, -1.4, 0.97, -0.9);
    put(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 14), new THREE.MeshStandardMaterial({ color: '#e8e0d0', roughness: 0.6 }), -0.9, 0.94, -0.75, [Math.PI / 2, 0, 0]);
    put(new THREE.TorusGeometry(0.05, 0.008, 6, 12, Math.PI * 1.4), iron, -0.55, 0.91, -0.7, [Math.PI / 2, 0, 0]);
    box(-0.6, -0.85, 2.5, 0.9, -1, 0.95);
    // la rastrelliera: una canna per ogni grado della Retaia, dalla più umile alla Canna della Marea
    put(new THREE.BoxGeometry(1.3, 0.08, 0.2), wood, 1.55, 0.25, -0.95);
    put(new THREE.BoxGeometry(1.3, 0.08, 0.2), wood, 1.55, 1.25, -1.05);
    RODS.forEach((r, i) => {
        const m = new THREE.MeshStandardMaterial({ color: r.wood, roughness: 0.6, emissive: r.glow ? r.tip : '#000000', emissiveIntensity: r.glow ? 0.35 : 0 });
        const rod = put(new THREE.CylinderGeometry(0.012, 0.028, 2.3, 8), m, 1.05 + i * 0.25, 1.35, -1.0, [-0.12, 0, 0]);
        rod.castShadow = false;
        put(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 12), new THREE.MeshStandardMaterial({ color: r.reel, metalness: 0.8, roughness: 0.3 }), 1.05 + i * 0.25, 0.55, -0.98, [0, 0, Math.PI / 2]);
    });
    const [rx, rz] = L(1.55, -0.6);
    W.interactables.push({ id: 'canna', x: rx, z: rz, y: y0, r: 1.6, label: 'La rastrelliera delle canne' });
    // una lanterna appesa sotto lo scafo
    put(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 4), iron, 0.2, H0 + 1.25, 0).castShadow = false;
    put(new THREE.CylinderGeometry(0.1, 0.12, 0.24, 6, 1, true), new THREE.MeshStandardMaterial({ color: '#ffcf7a', emissive: '#ffb347', emissiveIntensity: 1.6, transparent: true, opacity: 0.9, side: THREE.DoubleSide }), 0.2, H0 + 0.92, 0);
    lamp(0.2, H0 + 0.9, 0.1, '#ffb347', 12, 9);

    // --- le reti stese ad asciugare, tra due pali, a fianco della barca ---
    const netT = tex(256, 128, (c, w, h) => {
        c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(210,200,170,0.95)'; c.lineWidth = 2;
        for (let i = -h; i < w; i += 14) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.stroke(); c.beginPath(); c.moveTo(i + h, 0); c.lineTo(i, h); c.stroke(); }
    });
    netT.wrapS = netT.wrapT = THREE.RepeatWrapping; netT.repeat.set(2, 1);
    const netG = new THREE.PlaneGeometry(3.4, 1.7, 14, 6);
    const np = netG.attributes.position;
    for (let i = 0; i < np.count; i++) { const x = np.getX(i), yy = np.getY(i); np.setZ(i, Math.sin((x / 3.4 + 0.5) * Math.PI) * 0.25 * (0.5 - yy / 1.7)); np.setY(i, yy - Math.sin((x / 3.4 + 0.5) * Math.PI) * 0.25 * (0.5 + yy / 1.7)); }
    netG.computeVertexNormals();
    const net = put(netG, new THREE.MeshStandardMaterial({ map: netT, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 1 }), -LEN / 2 - 2.2, 1.35, 1.0, [0, Math.PI / 2 + 0.25, 0]);
    net.castShadow = false;
    for (const s of [-1, 1]) {
        const [px, pz] = [-LEN / 2 - 2.2 + Math.sin(Math.PI / 2 + 0.25) * s * 1.75, 1.0 + Math.cos(Math.PI / 2 + 0.25) * s * 1.75];
        put(new THREE.CylinderGeometry(0.06, 0.08, 2.4, 8), wood, px, 1.2, pz);
        circ(px, pz, 0.1, -1, 2.4);
    }
    // i sugheri in cima alla rete
    const cork = new THREE.MeshStandardMaterial({ color: '#c8a060', roughness: 1 });
    for (let i = 0; i < 7; i++) { const t = (i + 0.5) / 7 - 0.5; put(new THREE.SphereGeometry(0.06, 8, 6), cork, -LEN / 2 - 2.2 + Math.sin(Math.PI / 2 + 0.25) * t * 3.4, 2.18, 1.0 + Math.cos(Math.PI / 2 + 0.25) * t * 3.4); }

    // --- boe a strisce, una nassa, l'ancora, cime arrotolate, remi incrociati ---
    const buoyT = tex(64, 64, (c, w, h) => { for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? '#f2efe6' : '#c8202a'; c.fillRect(0, i * 16, w, 16); } });
    const buoyM = new THREE.MeshStandardMaterial({ map: buoyT, roughness: 0.55 });
    [[2.6, 1.6, 0.3], [3.1, 2.1, 0.24], [2.4, 2.4, 0.2]].forEach(([x, z, r], i) => { const b = put(new THREE.SphereGeometry(r, 16, 12), buoyM, x, r * 0.9, z); b.rotation.z = 0.4 + i; });
    box(2.7, 2.0, 1.2, 1.2, -1, 0.5);
    // la nassa: una gabbia di vimini
    const cageT = tex(64, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#a08458'; c.lineWidth = 5; for (let x = 4; x < w; x += 12) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 4; y < h; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } });
    const pot = put(new THREE.CylinderGeometry(0.35, 0.35, 0.8, 14, 1, false), new THREE.MeshStandardMaterial({ map: cageT, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 }), -2.0, 0.36, 2.1, [0, 0.4, Math.PI / 2]);
    pot.castShadow = false;
    circ(-2.0, 2.1, 0.45, -1, 0.7);
    // l'ancora appoggiata al muretto
    const anchor = new THREE.Group(); anchor.position.set(-2.4, 0, -RAD * 0.78 + 0.45); anchor.rotation.set(-0.25, 0.2, 0); g.add(anchor);
    put(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8), iron, 0, 0.75, 0, null, anchor);
    put(new THREE.TorusGeometry(0.42, 0.05, 8, 16, Math.PI), iron, 0, 0.42, 0, [0, 0, Math.PI], anchor);
    put(new THREE.BoxGeometry(0.6, 0.06, 0.06), iron, 0, 1.25, 0, null, anchor);
    put(new THREE.TorusGeometry(0.09, 0.025, 6, 12), iron, 0, 1.46, 0, null, anchor);
    for (const s of [-1, 1]) put(new THREE.ConeGeometry(0.07, 0.18, 6), iron, s * 0.42, 0.42, 0, [0, 0, s * 0.6], anchor);
    // cime arrotolate
    for (const [x, z, r] of [[1.0, 1.7, 0.3], [1.3, 2.25, 0.22]]) for (let k = 0; k < 3; k++) put(new THREE.TorusGeometry(r - k * 0.05, 0.035, 6, 18), rope, x, 0.04 + k * 0.06, z, [Math.PI / 2, 0, 0]);
    // remi incrociati sul fianco della barca
    for (const s of [-1, 1]) {
        const oar = new THREE.Group(); oar.position.set(LEN / 2 + 0.55, 1.1, -0.2 + s * 0.1); oar.rotation.set(0, Math.PI / 2, s * 0.55); g.add(oar);
        put(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 8), wood, 0, 0, 0, null, oar);
        put(new THREE.BoxGeometry(0.03, 0.55, 0.16), wood, 0, -1.3, 0, null, oar);
    }
    // l'insegna sulla prua
    const signT = tex(512, 128, (c, w, h) => {
        c.fillStyle = '#e8dcc0'; c.fillRect(0, 0, w, h);
        c.strokeStyle = '#2a3a4a'; c.lineWidth = 8; c.strokeRect(6, 6, w - 12, h - 12);
        c.fillStyle = '#2a3a4a'; c.font = 'bold 46px Cinzel, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('CANNE  E  RETI', w / 2, h / 2 - 12);
        c.font = 'italic 28px Georgia, serif'; c.fillText('si aggiusta tutto, tranne il mare', w / 2, h / 2 + 30);
    });
    const sg = new THREE.Group(); sg.position.set(LEN / 2 - 0.4, H0 + 0.55, RAD * 0.83); sg.rotation.y = 0.1; g.add(sg);
    put(new THREE.BoxGeometry(1.9, 0.5, 0.05), wood, 0, 0, 0, null, sg);
    put(new THREE.PlaneGeometry(1.8, 0.44), new THREE.MeshStandardMaterial({ map: signT, roughness: 0.8 }), 0, 0, 0.03, null, sg);

    // un pesce appeso a seccare, per dare il benvenuto
    const fishM = new THREE.MeshStandardMaterial({ color: '#8a96a0', metalness: 0.5, roughness: 0.4 });
    for (let i = 0; i < 3; i++) {
        const f = put(new THREE.SphereGeometry(0.1, 10, 6), fishM, -1.6 + i * 0.35, H0 + 0.75, RAD * 0.7); f.scale.set(0.45, 1.8, 0.8);
        put(new THREE.ConeGeometry(0.07, 0.1, 4), fishM, -1.6 + i * 0.35, H0 + 0.48, RAD * 0.7, [Math.PI, 0, 0]);
    }
    put(new THREE.CylinderGeometry(0.01, 0.01, 1.4, 4), rope, -1.25, H0 + 0.98, RAD * 0.7, [0, 0, Math.PI / 2]).castShadow = false;
    return g;
}
