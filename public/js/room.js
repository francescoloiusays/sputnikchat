// =====================================================================
//  LA STANZA BIANCA E IL GIARDINO DEL CASTELLO
//  Al piano di sopra del mastio c'è la stanza dei video di Sputnik Homies:
//  pareti bianche, letto matrimoniale, armadio con le magliette ufficiali,
//  poltrone con il tavolino del logo giallo e le finestre sul giardino.
//  Ci si sale con la scala di pietra addossata al lato ovest del mastio.
// =====================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { WORLD, wallBox, place, rng } from './world.js';
import { shPrintTexture } from './character.js';
import { ITEMS } from './shared/catalog.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const RB = (w, h, d, r = 0.03) => new RoundedBoxGeometry(w, h, d, 2, r);
const CYL = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);
const SPH = (r, ws = 12, hs = 8) => new THREE.SphereGeometry(r, ws, hs);

// Finestre (le due già presenti sulla facciata del mastio) e porta, misurate dal pavimento della stanza
export const WIN = { xs: [-3, 3], hw: 0.75, sill: 0.85, spring: 2.1 };
const DOOR = { hw: 0.65, h: 2.3 };
const STAIRS = { n: 16, tread: 0.36, w: 2.2, z0: -111.6, landing: 3.34 };

// --- Geometrie unite per materiale (pochi draw call per tanti mobili) ---
class Batch {
    constructor() { this.groups = new Map(); }
    put(mat, geo, m) {
        const g = geo.index ? geo.toNonIndexed() : geo.clone();
        for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
        if (!g.attributes.normal) g.computeVertexNormals();
        if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        g.clearGroups();
        g.applyMatrix4(m);
        if (!this.groups.has(mat)) this.groups.set(mat, []);
        this.groups.get(mat).push(g);
    }
    // Sistema di riferimento locale di un mobile: (x, y, z) a terra, ry = verso cui guarda (+z locale)
    at(x, y, z, ry = 0) {
        const F = new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z);
        return (mat, geo, px = 0, py = 0, pz = 0, rx = 0, ryy = 0, rz = 0) => {
            const L = new THREE.Matrix4().compose(V(px, py, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ryy, rz)), V(1, 1, 1));
            this.put(mat, geo, F.clone().multiply(L));
        };
    }
    build(scene, shadow = false) {
        for (const [mat, list] of this.groups) {
            const mesh = new THREE.Mesh(mergeGeometries(list), mat);
            mesh.castShadow = shadow; mesh.receiveShadow = true;
            scene.add(mesh);
        }
        this.groups.clear();
    }
}

// --- TEXTURE (disegnate su canvas) ---
function tex(w, h, draw, { srgb = true, rep = false } = {}) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
}
const plasterTex = () => tex(256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const r = rng(5);
    for (let i = 0; i < 2600; i++) { const v = 236 + r() * 19 | 0; g.fillStyle = `rgb(${v},${v},${v - 2})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
}, { rep: true });
// piastrelle chiare 45 cm (la texture copre 4×4 piastrelle)
const tileTex = () => tex(512, 512, (g, w) => {
    const n = 4, s = w / n, r = rng(9);
    g.fillStyle = '#c4c0b8'; g.fillRect(0, 0, w, w);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const v = 226 + r() * 14 | 0;
        g.fillStyle = `rgb(${v},${v - 1},${v - 4})`; g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
        for (let k = 0; k < 36; k++) { g.fillStyle = `rgba(140,130,120,${0.03 + r() * 0.05})`; g.beginPath(); g.arc(i * s + r() * s, j * s + r() * s, 1 + r() * 5, 0, 6.3); g.fill(); }
    }
}, { rep: true });
// pannelli OSB (i cubi dei video)
const osbTex = () => tex(512, 512, (g, w, h) => {
    g.fillStyle = '#cfa96f'; g.fillRect(0, 0, w, h);
    const r = rng(21), cols = ['#b88f52', '#e2c48c', '#c79d5f', '#a87c43', '#ead2a0', '#9a6f3a'];
    for (let i = 0; i < 1400; i++) {
        g.save(); g.translate(r() * w, r() * h); g.rotate(r() * Math.PI);
        g.fillStyle = cols[i % cols.length]; g.globalAlpha = 0.55 + r() * 0.45;
        const L = 14 + r() * 46, T = 5 + r() * 12; g.fillRect(-L / 2, -T / 2, L, T);
        g.restore();
    }
});
// il pannello nero con gli archi bianchi alle spalle della poltrona
const archPanelTex = () => tex(256, 620, (g, w, h) => {
    g.fillStyle = '#0d0d0f'; g.fillRect(0, 0, w, h);
    const t = document.createElement('canvas'); t.width = w; t.height = h;
    const tg = t.getContext('2d'), R = w / 3 * 0.44;
    for (let row = 0; row < 2; row++) for (let col = -1; col <= 3; col++) {
        const cx = (col + 0.5) * w / 3, cy = 66 + row * 92;
        tg.globalCompositeOperation = 'source-over'; tg.fillStyle = '#f2f0ea';
        tg.beginPath(); tg.arc(cx, cy, R, Math.PI, 0); tg.lineTo(cx + R, cy + R * 0.3); tg.lineTo(cx - R, cy + R * 0.3); tg.fill();
        tg.globalCompositeOperation = 'destination-out';
        tg.beginPath(); tg.arc(cx, cy + R * 0.52, R * 0.93, 0, 6.3); tg.fill();
    }
    g.drawImage(t, 0, 0);
});
// il poster appoggiato al muro (collezione di oggetti, paesaggio verde, fototessere)
const posterTex = () => tex(340, 460, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#bcd3ec'); gr.addColorStop(1, '#a3bedc');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5d93d6'; g.fillRect(140, 26, 80, 54);
    g.fillStyle = '#4c9a3a'; g.beginPath(); g.moveTo(140, 64); g.quadraticCurveTo(180, 42, 220, 60); g.lineTo(220, 80); g.lineTo(140, 80); g.fill();
    g.strokeStyle = '#222'; g.lineWidth = 3; g.strokeRect(140, 26, 80, 54);
    for (let i = 0; i < 4; i++) { g.fillStyle = '#e8e8e8'; g.fillRect(18, 30 + i * 64, 46, 58); g.fillStyle = '#3a3a3a'; g.beginPath(); g.ellipse(41, 58 + i * 64, 13, 18, 0, 0, 6.3); g.fill(); }
    const r = rng(33), cols = ['#c0392b', '#e8e2d6', '#3a3a3a', '#d35400', '#7f8c8d', '#a93226', '#f4d03f', '#5d6d7e'];
    for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) {
        const x = 90 + col * 47 + r() * 8, y = 104 + row * 48 + r() * 8;
        g.fillStyle = cols[(row * 5 + col * 3) % cols.length];
        const k = r();
        if (k < 0.33) { g.beginPath(); g.arc(x + 14, y + 14, 9 + r() * 6, 0, 6.3); g.fill(); }
        else if (k < 0.66) g.fillRect(x + 6, y, 14 + r() * 10, 26 + r() * 8);
        else { g.beginPath(); g.ellipse(x + 14, y + 16, 7, 15, r(), 0, 6.3); g.fill(); g.fillRect(x + 11, y - 4, 6, 8); }
    }
});
const mirrorTex = () => tex(64, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#f2f4f6'); gr.addColorStop(0.5, '#cdd3da'); gr.addColorStop(1, '#e4e8ec');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(20,20,24,0.5)'; g.fillRect(w * 0.1, h * 0.06, w * 0.32, h * 0.56);
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(w * 0.62, 0, w * 0.07, h);
});
// tende leggere a righe orizzontali, come nei video
const curtainTex = () => tex(128, 128, (g, w, h) => {
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(0, 0, w, h);
    for (let y = 6; y < h; y += 26) { g.fillStyle = 'rgba(255,255,255,0.88)'; g.fillRect(0, y, w, 7); }
    for (let x = 0; x < w; x += 16) { g.fillStyle = 'rgba(200,200,200,0.18)'; g.fillRect(x, 0, 6, h); }
});
const grassTex = () => tex(256, 256, (g, w, h) => {
    g.fillStyle = '#1e3526'; g.fillRect(0, 0, w, h);
    const r = rng(44);
    for (let i = 0; i < 3000; i++) {
        const v = r(); g.strokeStyle = v < 0.5 ? '#2a4a33' : v < 0.8 ? '#16291d' : '#36593c'; g.lineWidth = 1 + r();
        const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 3 - r() * 6); g.stroke();
    }
}, { rep: true });
// cartello bianco col logo giallo (davanti al tavolino)
function signTexture() {
    const t = tex(512, 512, (g, w, h) => { g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d6d2c8'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20); });
    const img = new Image();
    img.onload = () => { t.image.getContext('2d').drawImage(img, 26, 92, 460, 350); t.needsUpdate = true; };
    img.src = './img/sh_logo.png';
    return t;
}

function makeMats() {
    const S = (color, r = 0.8, m = 0) => new THREE.MeshStandardMaterial({ color, roughness: r, metalness: m });
    return {
        plaster: new THREE.MeshStandardMaterial({ color: '#e8e5df', roughness: 0.93, map: plasterTex() }),
        floor: new THREE.MeshStandardMaterial({ map: tileTex(), roughness: 0.55 }),
        lacquer: S('#f3f1ec', 0.5), frame: S('#f6f5f1', 0.45), skirting: S('#dcd9d2', 0.6),
        sheet: S('#f7f5f1', 0.95), duvet: S('#c8cad0', 0.95), yellow: S('#f2c81e', 0.9),
        wood: S('#d8b98a', 0.65), cushion: S('#3a3f4a', 0.95), black: S('#121214', 0.55), leather: S('#17171b', 0.38),
        chrome: S('#c4c8ce', 0.25, 0.4), phone: S('#e9e7e1', 0.4), bottle: S('#3b1c08', 0.15), label: S('#efe2c2', 0.7),
        mug: S('#7d8f86', 0.5), printer: S('#3b3c41', 0.5), printer2: S('#232428', 0.6), radiator: S('#f1f0ec', 0.35),
        osb: new THREE.MeshStandardMaterial({ map: osbTex(), roughness: 0.85 }),
        glow: new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffe2b0', emissiveIntensity: 1.4 }),
        glass: new THREE.MeshStandardMaterial({ color: '#cfe0ff', transparent: true, opacity: 0.13, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide }),
        curtain: new THREE.MeshStandardMaterial({ map: curtainTex(), transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 1 }),
        // giardino
        grass: new THREE.MeshStandardMaterial({ map: grassTex(), roughness: 1 }),
        soil: S('#2a1f1a', 1), hedge: new THREE.MeshStandardMaterial({ color: '#1d3a28', roughness: 0.95, flatShading: true }),
        bark: S('#2e2420', 1), cypress: new THREE.MeshStandardMaterial({ color: '#1b3427', roughness: 0.95, flatShading: true }),
        blossom: new THREE.MeshStandardMaterial({ color: '#f1d6e6', emissive: '#5a2f4a', emissiveIntensity: 0.55, roughness: 0.9, flatShading: true }),
        blossom2: new THREE.MeshStandardMaterial({ color: '#e6e0f6', emissive: '#3a2f5a', emissiveIntensity: 0.55, roughness: 0.9, flatShading: true }),
        benchWood: S('#4a3424', 0.9),
        water: new THREE.MeshStandardMaterial({ color: '#2a6f7a', emissive: '#1f8a9a', emissiveIntensity: 0.6, roughness: 0.12, metalness: 0.2 }),
    };
}
const printMats = new Map();
const printMat = (color) => {
    if (!printMats.has(color)) printMats.set(color, new THREE.MeshStandardMaterial({ map: shPrintTexture(color, 'logo'), transparent: true, alphaTest: 0.2, depthWrite: false, roughness: 0.9 }));
    return printMats.get(color);
};

// --- FORME (finestre ad arco e porta) ---
function archPath(p, cx, hw, v0, vs) {
    p.moveTo(cx - hw, v0); p.lineTo(cx + hw, v0); p.lineTo(cx + hw, vs);
    p.absarc(cx, vs, hw, 0, Math.PI, false); p.lineTo(cx - hw, v0);
    return p;
}
function southShape(w, h) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0);
    for (const x of WIN.xs) s.holes.push(archPath(new THREE.Path(), x, WIN.hw, WIN.sill, WIN.spring));
    return s;
}
function westShape(w, h) {
    const s = new THREE.Shape(), d = DOOR.hw;
    s.moveTo(-w / 2, 0); s.lineTo(-d, 0); s.lineTo(-d, DOOR.h); s.lineTo(d, DOOR.h); s.lineTo(d, 0);
    s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0);
    return s;
}
function extrude(shape, depth) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 16 });
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.6, uv.getY(i) / 2.6);
    return g;
}

// =====================================================================
//  MASTIO: pieno sotto e sopra, stanza in mezzo, scala esterna.
//  `geos` sono le geometrie in pietra unite nella mesh del castello.
// =====================================================================
export function buildKeep(world, geos) {
    const C = WORLD.CASTLE, K = WORLD.KEEP, R = WORLD.ROOM;
    const y0 = C.base, FY = R.floor, RH = R.h, CEIL = FY + RH, top = y0 + K.h, T = K.t;
    const xW = K.x - K.w / 2, xE = K.x + K.w / 2, zN = K.z - K.d / 2, zS = K.z + K.d / 2;
    world.roomMats ||= makeMats();
    const M = world.roomMats;
    // blocco sotto la stanza (il suo tetto è il pavimento) e blocco sopra il soffitto
    geos.push(place(wallBox(K.w, FY - y0, K.d), K.x, (y0 + FY) / 2, K.z));
    geos.push(place(wallBox(K.w, top - CEIL, K.d), K.x, (CEIL + top) / 2, K.z));
    world.addBox(K.x, K.z, K.w, K.d, y0 - 2, FY);
    // muri della stanza: nord ed est pieni, angoli del muro sud
    geos.push(place(wallBox(K.w, RH, T), K.x, FY + RH / 2, zN + T / 2));
    geos.push(place(wallBox(T, RH, K.d - 2 * T), xE - T / 2, FY + RH / 2, K.z));
    for (const s of [-1, 1]) geos.push(place(wallBox(T, RH, T - 0.6), K.x + s * (K.w - T) / 2, FY + RH / 2, zS - T + (T - 0.6) / 2));
    // davanzali di pietra sotto le finestre e architrave della porta
    for (const wx of WIN.xs) geos.push(place(wallBox(WIN.hw * 2 + 0.3, 0.12, 0.34), K.x + wx, FY + WIN.sill - 0.06, zS + 0.1));
    geos.push(place(wallBox(0.24, 0.34, DOOR.hw * 2 + 0.5), xW - 0.07, FY + DOOR.h + 0.17, K.z));
    // muro sud con le finestre ad arco e muro ovest con la porta: pietra fuori, intonaco bianco dentro
    const walls = [
        [extrude(southShape(K.w, RH), 0.6).translate(K.x, FY, zS - 0.6), world.matWall],
        [extrude(southShape(R.w, RH), T - 0.6).translate(K.x, FY, zS - T), M.plaster],
        [extrude(westShape(R.d, RH), 0.6).rotateY(Math.PI / 2).translate(xW, FY, K.z), world.matWall],
        [extrude(westShape(R.d, RH), T - 0.6).rotateY(Math.PI / 2).translate(xW + 0.6, FY, K.z), M.plaster],
    ];
    for (const [g, m] of walls) {
        const mesh = new THREE.Mesh(g, m);
        mesh.castShadow = mesh.receiveShadow = true;
        world.scene.add(mesh);
        world.cameraBlockers.push(mesh);
    }
    // muri della stanza come ostacoli (la porta resta libera)
    world.addBox(K.x, zN + T / 2, K.w, T, FY - 0.2, CEIL);
    world.addBox(K.x, zS - T / 2, K.w, T, FY - 0.2, CEIL);
    world.addBox(xE - T / 2, K.z, T, K.d, FY - 0.2, CEIL);
    const seg = (R.d / 2 - DOOR.hw);
    for (const s of [-1, 1]) world.addBox(xW + T / 2, K.z + s * (DOOR.hw + seg / 2), T, seg, FY - 0.2, CEIL);

    // --- SCALA DI PIETRA lungo il lato ovest del mastio ---
    const sx = xW - STAIRS.w / 2, rise = (FY - y0) / STAIRS.n, px = xW - STAIRS.w + 0.13;
    for (let i = 0; i < STAIRS.n; i++) {
        const top_ = y0 + rise * (i + 1), zc = STAIRS.z0 - (i + 0.5) * STAIRS.tread;
        geos.push(place(wallBox(STAIRS.w, top_ - y0 + 0.2, STAIRS.tread), sx, (top_ + y0 - 0.2) / 2, zc));
        geos.push(place(wallBox(0.26, 0.9, STAIRS.tread), px, top_ + 0.45, zc));
        world.addBox(sx, zc, STAIRS.w, STAIRS.tread, y0 - 1, top_);
        world.addBox(px, zc, 0.26, STAIRS.tread, top_ - 0.1, top_ + 0.9, 0, { noWalk: true });
    }
    const zl0 = STAIRS.z0 - STAIRS.n * STAIRS.tread, zlc = zl0 - STAIRS.landing / 2, zl1 = zl0 - STAIRS.landing;
    geos.push(place(wallBox(STAIRS.w, FY - y0 + 0.2, STAIRS.landing), sx, (FY + y0 - 0.2) / 2, zlc));
    world.addBox(sx, zlc, STAIRS.w, STAIRS.landing, y0 - 1, FY);
    geos.push(place(wallBox(0.26, 0.9, STAIRS.landing), px, FY + 0.45, zlc));
    world.addBox(px, zlc, 0.26, STAIRS.landing, FY - 0.1, FY + 0.9, 0, { noWalk: true });
    geos.push(place(wallBox(STAIRS.w - 0.26, 0.9, 0.26), sx + 0.13, FY + 0.45, zl1 + 0.13));
    world.addBox(sx + 0.13, zl1 + 0.13, STAIRS.w - 0.26, 0.26, FY - 0.1, FY + 0.9, 0, { noWalk: true });
    // torce a muro lungo la salita e accanto alla porta
    world.addTorch(xW, y0 + 4.6, -114.6, false, 1.0, { wall: -Math.PI / 2 });
    world.addTorch(xW, FY + 2.2, K.z - DOOR.hw - 0.75, false, 1.0, { wall: -Math.PI / 2 });   // senza luce vera: passerebbe il muro
}

// =====================================================================
//  LA STANZA BIANCA (interni e arredi, come nei video)
//  Entrando dalla porta a ovest: letto a destra, armadio a sinistra,
//  poltrone di fronte con il tavolino, finestra accanto alle poltrone.
// =====================================================================
export function buildWhiteRoom(world) {
    const K = WORLD.KEEP, R = WORLD.ROOM, FY = R.floor, RH = R.h, CEIL = FY + RH;
    const x1 = K.x + R.w / 2, z0 = K.z - R.d / 2, z1 = K.z + R.d / 2;
    const M = world.roomMats, S = world.scene, B = new Batch();
    const at = (u, w, ry = 0, y = FY) => B.at(K.x + u, y, K.z + w, ry);   // u = verso est, w = verso sud (centro stanza = 0,0)
    const solid = (u, w, sw, sd, h, opts = { noWalk: true }) => world.addBox(K.x + u, K.z + w, sw, sd, FY - 0.3, FY + h, 0, opts);

    // --- pareti, pavimento e soffitto ---
    const plane = (w, h, tile) => {
        const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * h / tile);
        return g;
    };
    const surf = (g, m, x, y, z, ry, rx) => {
        const me = new THREE.Mesh(g, m); me.position.set(x, y, z); me.rotation.set(rx, ry, 0); me.receiveShadow = true;
        S.add(me); world.cameraBlockers.push(me);
    };
    surf(plane(R.w, R.d, 1.8), M.floor, K.x, FY + 0.004, K.z, 0, -Math.PI / 2);
    surf(plane(R.w, R.d, 2), M.plaster, K.x, CEIL - 0.004, K.z, 0, Math.PI / 2);
    surf(plane(R.w, RH, 2), M.plaster, K.x, FY + RH / 2, z0 + 0.004, 0, 0);
    surf(plane(R.d, RH, 2), M.plaster, x1 - 0.004, FY + RH / 2, K.z, -Math.PI / 2, 0);
    // battiscopa
    const room = at(0, 0);
    room(M.skirting, BX(R.w, 0.08, 0.015), 0, 0.04, -R.d / 2 + 0.008);
    room(M.skirting, BX(R.w, 0.08, 0.015), 0, 0.04, R.d / 2 - 0.008);
    room(M.skirting, BX(0.015, 0.08, R.d), R.w / 2 - 0.008, 0.04, 0);
    const sl = R.d / 2 - DOOR.hw;
    for (const s of [-1, 1]) room(M.skirting, BX(0.015, 0.08, sl), -R.w / 2 + 0.008, 0.04, s * (DOOR.hw + sl / 2));
    // plafoniera e luce calda della stanza
    room(M.lacquer, CYL(0.3, 0.3, 0.05, 20), 0.6, RH - 0.025, 0.4);
    room(M.glow, CYL(0.26, 0.26, 0.02, 20), 0.6, RH - 0.055, 0.4);
    const light = new THREE.PointLight('#fff4ea', 11, 12, 1.3);
    light.position.set(K.x + 0.6, CEIL - 0.6, K.z + 0.4);
    S.add(light);

    // --- porta (aperta verso l'interno) ---
    const door = at(-R.w / 2, 0);
    for (const s of [-1, 1]) door(M.frame, BX(0.04, DOOR.h + 0.06, 0.08), 0.02, (DOOR.h + 0.06) / 2, s * (DOOR.hw + 0.04));
    door(M.frame, BX(0.04, 0.08, DOOR.hw * 2 + 0.16), 0.02, DOOR.h + 0.04, 0);
    door(M.lacquer, BX(1.2, 2.22, 0.04), 0.62, 1.12, -DOOR.hw - 0.03);
    for (const s of [-1, 1]) door(M.chrome, BX(0.12, 0.02, 0.02), 1.08, 1.02, -DOOR.hw - 0.03 + s * 0.035);
    solid(-R.w / 2 + 0.62, -DOOR.hw - 0.03, 1.22, 0.08, 2.3);

    // --- finestre: telaio bianco, vetri, tende a righe, davanzale; termosifone sotto quella delle poltrone ---
    const hR = WIN.spring - WIN.sill;
    for (const wx of WIN.xs) {
        const win = B.at(K.x + wx, FY + WIN.sill, z1 + 0.38);
        const outer = archPath(new THREE.Shape(), 0, WIN.hw, 0, hR);
        outer.holes.push(archPath(new THREE.Path(), 0, WIN.hw - 0.065, 0.065, hR));
        win(M.frame, new THREE.ExtrudeGeometry(outer, { depth: 0.07, bevelEnabled: false, curveSegments: 16 }), 0, 0, -0.035);
        win(M.frame, BX(0.08, hR - 0.065, 0.06), 0, (hR + 0.065) / 2, 0);
        win(M.frame, BX(WIN.hw * 2 - 0.1, 0.06, 0.06), 0, hR, 0);
        for (const s of [-1, 1]) win(M.chrome, BX(0.02, 0.11, 0.025), s * 0.07, hR * 0.55, -0.05);
        win(M.glass, new THREE.ShapeGeometry(archPath(new THREE.Shape(), 0, WIN.hw - 0.03, 0.03, hR), 16), 0, 0, 0.005);
        for (const s of [-1, 1]) win(M.curtain, new THREE.PlaneGeometry(WIN.hw - 0.1, 0.46), s * WIN.hw / 2, hR - 0.25, -0.06);
        room(M.lacquer, BX(WIN.hw * 2 + 0.14, 0.04, 0.44), wx, WIN.sill - 0.015, R.d / 2 + 0.16);
        // la telecamera non passa dai vetri
        const stop = new THREE.Mesh(new THREE.ShapeGeometry(archPath(new THREE.Shape(), 0, WIN.hw, 0, hR), 12), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
        stop.visible = false; stop.position.set(K.x + wx, FY + WIN.sill, z1 + 0.38);
        S.add(stop); world.cameraBlockers.push(stop);
    }
    const rad = at(3, R.d / 2 - 0.12, Math.PI);
    for (let i = 0; i < 12; i++) rad(M.radiator, BX(0.062, 0.6, 0.16), -0.5 + i * 0.0909, 0.42, 0);
    for (const y of [0.15, 0.69]) rad(M.radiator, CYL(0.024, 0.024, 1.1, 10), 0, y, 0, 0, 0, Math.PI / 2);
    for (const s of [-1, 1]) rad(M.radiator, BX(0.05, 0.12, 0.12), s * 0.42, 0.06, 0);
    rad(M.radiator, CYL(0.02, 0.02, 0.08, 8), 0.6, 0.2, 0, 0, 0, Math.PI / 2);
    rad(M.radiator, SPH(0.03), 0.65, 0.2, 0);
    solid(3, R.d / 2 - 0.12, 1.25, 0.22, 0.8);

    // --- letto matrimoniale (entrando, a destra), testiera contro il muro della porta ---
    const bedL = 2.15, bedW = 1.75, bw = R.d / 2 - 0.05 - bedW / 2;
    const bed = at(-R.w / 2, bw);
    bed(M.lacquer, BX(2.12, 0.26, 1.72), 1.08, 0.21, 0);
    for (const x of [0.12, 2.04]) for (const z of [-0.78, 0.78]) bed(M.lacquer, BX(0.07, 0.1, 0.07), x, 0.05, z);
    bed(M.sheet, RB(2.0, 0.22, 1.64, 0.06), 1.1, 0.45, 0);
    bed(M.lacquer, BX(0.07, 1.05, 1.76), 0.035, 0.6, 0);
    for (const z of [-0.4, 0.4]) bed(M.sheet, RB(0.42, 0.13, 0.66, 0.06), 0.33, 0.62, z, 0, z * 0.1, 0.12);
    bed(M.duvet, RB(1.45, 0.07, 1.72, 0.03), 1.4, 0.585, 0);
    for (const s of [-1, 1]) bed(M.duvet, BX(1.45, 0.28, 0.03), 1.4, 0.46, s * 0.865);
    bed(M.duvet, BX(0.03, 0.3, 1.72), 2.13, 0.45, 0);
    bed(M.yellow, RB(0.5, 0.08, 1.78, 0.03), 1.86, 0.605, 0);
    bed(M.yellow, BX(0.03, 0.34, 1.78), 2.14, 0.44, 0);
    world.addBox(K.x - R.w / 2 + bedL / 2, K.z + bw, bedL, bedW, FY - 0.3, FY + 0.6);
    // comodino di OSB con abat-jour
    const ns = at(-R.w / 2 + 0.28, bw - bedW / 2 - 0.3);
    ns(M.osb, BX(0.45, 0.45, 0.45), 0, 0.225, 0);
    ns(M.lacquer, CYL(0.06, 0.08, 0.04, 12), 0, 0.47, 0);
    ns(M.chrome, CYL(0.01, 0.01, 0.2, 6), 0, 0.59, 0);
    ns(M.glow, CYL(0.07, 0.11, 0.14, 14), 0, 0.72, 0);
    solid(-R.w / 2 + 0.28, bw - bedW / 2 - 0.3, 0.46, 0.46, 0.75);

    // --- armadio (entrando, a sinistra) aperto, con le magliette di Sputnik Homies ---
    const wu = -3.25, ww = -R.d / 2;
    const wd = at(wu, ww);
    for (const s of [-1, 1]) wd(M.lacquer, BX(0.03, 2.35, 0.64), s * 1.485, 1.175, 0.33);
    wd(M.lacquer, BX(3.0, 0.035, 0.64), 0, 2.33, 0.33);
    wd(M.lacquer, BX(3.0, 2.35, 0.02), 0, 1.175, 0.02);
    wd(M.lacquer, BX(2.96, 0.08, 0.6), 0, 0.04, 0.33);
    wd(M.lacquer, BX(2.96, 0.03, 0.6), 0, 0.45, 0.33);
    wd(M.chrome, CYL(0.013, 0.013, 2.94, 8), 0, 2.02, 0.33, 0, 0, Math.PI / 2);
    const open = 1.75;   // ante aperte di 100°
    for (const s of [-1, 1]) {
        const cx = s * (1.5 - Math.cos(open) * 0.74), cz = 0.65 + Math.sin(open) * 0.74;
        wd(M.lacquer, BX(1.48, 2.3, 0.025), cx, 1.17, cz, 0, s < 0 ? -open : -(Math.PI - open), 0);
        wd(M.chrome, BX(0.02, 0.3, 0.02), s * (1.5 - Math.cos(open) * 1.38), 1.1, 0.65 + Math.sin(open) * 1.38);
        solid(wu + cx, ww + cz, 0.3, 1.48, 2.35);
    }
    solid(wu, ww + 0.33, 3.02, 0.66, 2.4);
    const merch = Object.entries(ITEMS).filter(([, it]) => it.shop === 'armadio');
    const shirtMats = new Map();
    const matOf = (c) => { if (!shirtMats.has(c)) shirtMats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 })); return shirtMats.get(c); };
    const rr = rng(8);
    merch.forEach(([, it], i) => {
        const sx = -1.2 + i * 0.6, sh = B.at(K.x + wu + sx, FY + 1.92, K.z + ww + 0.33, (rr() - 0.5) * 0.16);
        const hood = it.shirt === 'hoodie';
        sh(matOf(it.color), new THREE.ExtrudeGeometry(shirtShape(hood), { depth: 0.03, bevelEnabled: false }), 0, 0, -0.015);
        sh(printMat(it.print), new THREE.PlaneGeometry(0.25, 0.19), 0, -0.25, 0.018);
        if (hood) {
            sh(matOf(it.color), SPH(0.15, 12, 8), 0, -0.03, -0.035);
            sh(matOf(shadeHex(it.color, 0.75)), BX(0.26, 0.11, 0.008), 0, -0.56, 0.02);
        }
        // gruccia
        for (const s of [-1, 1]) sh(M.chrome, BX(0.2, 0.008, 0.008), s * 0.09, 0.035, 0, 0, 0, s * 0.35);
        sh(M.chrome, BX(0.006, 0.05, 0.006), 0, 0.075, 0);
        sh(M.chrome, new THREE.TorusGeometry(0.022, 0.004, 5, 12, Math.PI * 1.2), 0, 0.115, 0, 0, Math.PI / 2, 0);
    });
    // pile di magliette piegate sul ripiano
    [-1.1, -0.37, 0.37, 1.1].forEach((x, k) => {
        for (let j = 0; j < 3; j++) wd(matOf(merch[(k + j) % merch.length][1].color), RB(0.34, 0.055, 0.27, 0.02), x, 0.495 + j * 0.058, 0.36);
    });
    world.interactables.push({ id: 'armadio', x: K.x + wu, z: K.z + ww + 1.5, y: FY, r: 1.9, label: "Armadio degli Sputnik Homies: magliette e felpa ufficiali" });

    // --- angolo delle poltrone (di fronte alla porta), come nei video ---
    // pannello nero con gli archi bianchi
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 2.3), new THREE.MeshStandardMaterial({ map: archPanelTex(), roughness: 0.6 }));
    panel.position.set(x1 - 0.01, FY + 1.3, K.z + 0.05); panel.rotation.y = -Math.PI / 2; panel.receiveShadow = true;
    S.add(panel);
    // poltrona di legno chiaro con cuscini scuri
    const seatA = { x: K.x + 3.95, z: K.z + 0.15, ry: -1.25, y: FY };
    const ac = B.at(seatA.x, FY, seatA.z, seatA.ry);
    for (const s of [-1, 1]) {
        ac(M.wood, BX(0.05, 0.62, 0.05), s * 0.33, 0.31, 0.26);
        ac(M.wood, BX(0.05, 0.62, 0.05), s * 0.33, 0.31, -0.28);
        ac(M.wood, BX(0.07, 0.04, 0.66), s * 0.33, 0.63, -0.01);
        ac(M.wood, BX(0.04, 0.05, 0.56), s * 0.33, 0.2, -0.01);
        ac(M.wood, BX(0.045, 0.8, 0.045), s * 0.3, 0.75, -0.33, -0.2, 0, 0);
    }
    ac(M.wood, BX(0.62, 0.04, 0.05), 0, 0.3, 0.26);
    ac(M.wood, BX(0.62, 0.05, 0.56), 0, 0.31, -0.01);
    ac(M.cushion, RB(0.6, 0.11, 0.56, 0.04), 0, 0.39, 0);
    ac(M.cushion, RB(0.58, 0.64, 0.1, 0.04), 0, 0.79, -0.28, -0.2, 0, 0);
    world.addCirc(seatA.x, seatA.z, 0.42, FY - 0.3, FY + 1.1, { noWalk: true });
    // sedia da ufficio nera
    const seatB = { x: K.x + 3.45, z: K.z + 2.35, ry: -2.05, y: FY + 0.1 };
    const oc = B.at(seatB.x, FY, seatB.z, seatB.ry);
    for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5;
        oc(M.black, BX(0.05, 0.04, 0.32), Math.sin(a) * 0.16, 0.07, Math.cos(a) * 0.16, 0, a, 0);
        oc(M.black, SPH(0.03, 8, 6), Math.sin(a) * 0.31, 0.03, Math.cos(a) * 0.31);
    }
    oc(M.chrome, CYL(0.025, 0.03, 0.34, 10), 0, 0.26, 0);
    oc(M.black, BX(0.3, 0.04, 0.3), 0, 0.42, 0);
    oc(M.leather, RB(0.56, 0.11, 0.54, 0.05), 0, 0.49, 0.02);
    oc(M.leather, RB(0.54, 0.84, 0.11, 0.05), 0, 0.99, -0.27, -0.12, 0, 0);
    oc(M.black, BX(0.06, 0.3, 0.05), 0, 0.6, -0.29);
    for (const s of [-1, 1]) { oc(M.black, BX(0.04, 0.22, 0.04), s * 0.3, 0.6, 0); oc(M.black, RB(0.07, 0.04, 0.3, 0.015), s * 0.3, 0.72, 0.03); }
    world.addCirc(seatB.x, seatB.z, 0.38, FY - 0.3, FY + 1.3, { noWalk: true });
    // tavolino: cubo di OSB col cartello del logo giallo, telefono bianco, birre e tazza
    const tu = 2.55, tw = 1.2;
    const tb = at(tu, tw);
    tb(M.osb, BX(0.5, 0.5, 0.5), 0, 0.25, 0);
    tb(M.phone, RB(0.22, 0.07, 0.19, 0.02), 0.12, 0.535, -0.02, 0, 0.3, 0);
    tb(M.phone, new THREE.CapsuleGeometry(0.026, 0.15, 4, 8), 0.12, 0.59, -0.05, 0, 0.3, Math.PI / 2);
    for (const [bx, bz] of [[-0.17, 0.17], [0.16, -0.18]]) {
        tb(M.bottle, CYL(0.032, 0.032, 0.15, 12), bx, 0.575, bz);
        tb(M.bottle, CYL(0.013, 0.032, 0.05, 12), bx, 0.675, bz);
        tb(M.bottle, CYL(0.013, 0.013, 0.06, 8), bx, 0.73, bz);
        tb(M.label, CYL(0.0335, 0.0335, 0.06, 12), bx, 0.57, bz);
    }
    tb(M.mug, CYL(0.045, 0.042, 0.09, 14), -0.15, 0.545, -0.15);
    tb(M.mug, new THREE.TorusGeometry(0.028, 0.008, 6, 12), -0.15, 0.55, -0.1, 0, Math.PI / 2, 0);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshStandardMaterial({ map: signTexture(), roughness: 0.7 }));
    sign.position.set(K.x + tu - 0.252, FY + 0.25, K.z + tw); sign.rotation.y = -Math.PI / 2;
    S.add(sign);
    const topLogo = new THREE.Group(), tl = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), printMat('#f5d400'));
    tl.rotation.x = -Math.PI / 2; topLogo.add(tl);
    topLogo.position.set(K.x + tu - 0.03, FY + 0.502, K.z + tw); topLogo.rotation.y = -Math.PI / 2;
    S.add(topLogo);
    solid(tu, tw, 0.5, 0.5, 0.5);
    // cubo accanto alla poltrona con la stampante
    const pc = at(4.5, -1.05);
    pc(M.osb, BX(0.5, 0.5, 0.5), 0, 0.25, 0);
    pc(M.printer, BX(0.42, 0.19, 0.36), 0, 0.595, 0);
    pc(M.printer2, BX(0.3, 0.02, 0.2), 0, 0.695, -0.04);
    pc(M.printer2, BX(0.36, 0.05, 0.01), 0, 0.56, 0.18);
    solid(4.5, -1.05, 0.52, 0.52, 0.72);
    // lampada da terra nera con il faretto
    const lp = at(4.72, 0.95, -Math.PI / 2);
    lp(M.black, CYL(0.14, 0.16, 0.03, 18), 0, 0.015, 0);
    lp(M.black, CYL(0.012, 0.012, 2.0, 6), 0, 1.02, 0);
    lp(M.black, BX(0.2, 0.15, 0.12), 0, 2.07, 0, -0.6, 0, 0);
    lp(M.glow, new THREE.PlaneGeometry(0.17, 0.12), 0, 2.07 + 0.035, 0.051, -0.6, 0, 0);
    world.addCirc(K.x + 4.72, K.z + 0.95, 0.16, FY - 0.3, FY + 2.1, { noWalk: true });
    // poster e specchio appoggiati al muro
    const lean = (wpos, fw, fh, m, tilt) => {
        const g = new THREE.Group();
        g.position.set(x1 - 0.06, FY, K.z + wpos); g.rotation.y = -Math.PI / 2;
        const f = new THREE.Mesh(BX(fw, fh, 0.03), M.black); f.position.set(0, fh / 2, 0.06); f.rotation.x = -tilt;
        const p = new THREE.Mesh(new THREE.PlaneGeometry(fw - 0.06, fh - 0.06), m); p.position.set(0, fh / 2, 0.081); p.rotation.x = -tilt;
        f.receiveShadow = p.receiveShadow = true;
        g.add(f, p); S.add(g);
    };
    lean(1.55, 0.85, 1.15, new THREE.MeshStandardMaterial({ map: posterTex(), roughness: 0.6 }), 0.1);
    lean(2.6, 0.62, 1.85, new THREE.MeshStandardMaterial({ map: mirrorTex(), roughness: 0.15, metalness: 0.1 }), 0.07);
    // sedersi: E vicino a una seduta
    const sit = (seat, label) => world.interactables.push({ id: 'siedi', seat: { ...seat, floor: FY }, x: seat.x + Math.sin(seat.ry) * 0.7, z: seat.z + Math.cos(seat.ry) * 0.7, y: FY, r: 1.0, label });
    sit(seatA, 'Siediti in poltrona');
    sit(seatB, 'Siediti sulla sedia da ufficio');
    world.interactables.push({ id: 'canale', x: K.x + tu - 0.65, z: K.z + tw, y: FY, r: 0.9, label: 'Guarda il canale Sputnik Homies su YouTube' });

    B.build(S);
}

// sagoma di una maglietta (o felpa) appesa: in alto il collo, y = 0
function shirtShape(hoodie) {
    const s = new THREE.Shape();
    const pts = hoodie
        ? [[0.21, -0.03], [0.33, -0.17], [0.35, -0.64], [0.27, -0.66], [0.245, -0.27], [0.235, -0.72], [-0.235, -0.72], [-0.245, -0.27], [-0.27, -0.66], [-0.35, -0.64], [-0.33, -0.17], [-0.21, -0.03]]
        : [[0.2, -0.025], [0.35, -0.13], [0.29, -0.25], [0.215, -0.19], [0.22, -0.66], [-0.22, -0.66], [-0.215, -0.19], [-0.29, -0.25], [-0.35, -0.13], [-0.2, -0.025]];
    s.moveTo(-0.09, 0); s.quadraticCurveTo(0, -0.08, 0.09, 0);
    for (const [x, y] of pts) s.lineTo(x, y);
    s.lineTo(-0.09, 0);
    return s;
}
function shadeHex(hex, f) { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); }

// =====================================================================
//  GIARDINO DEL CASTELLO (quello che si vede dalle finestre)
// =====================================================================
export const GARDENS = [
    { x0: 7.0, x1: 17.6, z0: -121.8, z1: -109.8 },
    { x0: -17.6, x1: -9.0, z0: -121.8, z1: -109.8 },
];
export function buildGarden(world) {
    const C = WORLD.CASTLE, y0 = C.base, M = world.roomMats, S = world.scene;
    const B = new Batch();
    const stone = world.matStone;
    const r = rng(4242);
    const avoid = [];
    // prati con il bordo di pietra
    for (const g of GARDENS) {
        const w = g.x1 - g.x0, d = g.z1 - g.z0, cx = (g.x0 + g.x1) / 2, cz = (g.z0 + g.z1) / 2;
        const pg = new THREE.PlaneGeometry(w, d), uv = pg.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 3, uv.getY(i) * d / 3);
        B.at(cx, y0 + 0.04, cz)(M.grass, pg, 0, 0, 0, -Math.PI / 2);
        const curb = B.at(cx, y0, cz);
        curb(stone, BX(w + 0.2, 0.14, 0.2), 0, 0.07, -d / 2);
        curb(stone, BX(w + 0.2, 0.14, 0.2), 0, 0.07, d / 2);
        curb(stone, BX(0.2, 0.14, d), -w / 2, 0.07, 0);
        curb(stone, BX(0.2, 0.14, d), w / 2, 0.07, 0);
    }
    // aiuole rialzate sotto le finestre della stanza
    const K = WORLD.KEEP, zS = K.z + K.d / 2, beds = [];
    for (const s of [-1, 1]) {
        const x0 = s > 0 ? 2.9 : -5.9, x1 = x0 + 3.0, z0 = zS + 0.05, z1 = zS + 1.45;
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, bed = B.at(cx, y0, cz);
        bed(stone, BX(3.0, 0.32, 1.4), 0, 0.16, 0);
        bed(M.soil, new THREE.PlaneGeometry(2.8, 1.2), 0, 0.325, 0, -Math.PI / 2);
        bed(M.hedge, RB(2.8, 0.45, 0.42, 0.12), 0, 0.54, -0.42);
        world.addBox(cx, cz, 3.0, 1.4, y0 - 1, y0 + 0.32);
        world.addBox(cx, cz - 0.42, 2.8, 0.42, y0 + 0.3, y0 + 0.8, 0, { noWalk: true });
        beds.push({ x0: x0 + 0.15, x1: x1 - 0.15, z0: cz - 0.15, z1: z1 - 0.12, y: y0 + 0.32 });
    }
    // alberi in fiore, cipressi, panchine e fontana
    const blossom = (x, z, seed) => {
        const rr = rng(seed), put = B.at(x, y0, z, rr() * 6.28);
        put(M.bark, CYL(0.13, 0.2, 2.2, 7), 0, 1.1, 0, 0, 0, 0.06);
        for (let i = 0; i < 3; i++) { const a = i * 2.1 + rr(); put(M.bark, CYL(0.05, 0.09, 1.3, 6), Math.cos(a) * 0.35, 2.35, Math.sin(a) * 0.35, Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); }
        for (let i = 0; i < 9; i++) { const a = rr() * 6.28, d = rr() * 1.1; put(i % 3 ? M.blossom : M.blossom2, new THREE.IcosahedronGeometry(0.55 + rr() * 0.4, 1), Math.cos(a) * d, 2.7 + rr() * 1.1, Math.sin(a) * d); }
        world.addCirc(x, z, 0.25, y0 - 1, y0 + 5, { noWalk: true });
        avoid.push([x, z, 0.9]);
    };
    const lathe = new THREE.LatheGeometry([[0, 0], [0.45, 0.4], [0.62, 1.4], [0.55, 2.6], [0.32, 3.6], [0, 4.4]].map(([a, b]) => new THREE.Vector2(a, b)), 9);
    const cypress = (x, z, k = 1) => {
        const put = B.at(x, y0, z);
        put(M.bark, CYL(0.08, 0.12, 0.5, 6), 0, 0.25, 0);
        const g = lathe.clone().scale(k, k, k).translate(0, 0.3, 0);
        put(M.cypress, g);
        world.addCirc(x, z, 0.5 * k, y0 - 1, y0 + 4.5 * k, { noWalk: true });
        avoid.push([x, z, 0.8]);
    };
    const benches = [];
    const bench = (x, z, ry) => {
        const put = B.at(x, y0, z, ry);
        for (const s of [-1, 1]) put(stone, BX(0.22, 0.42, 0.42), s * 0.65, 0.21, 0);
        put(M.benchWood, BX(1.7, 0.08, 0.48), 0, 0.46, 0);
        world.addBox(x, z, Math.abs(Math.cos(ry)) > 0.5 ? 1.7 : 0.5, Math.abs(Math.cos(ry)) > 0.5 ? 0.5 : 1.7, y0 - 1, y0 + 0.5, 0, { noWalk: true });
        benches.push({ x, z, ry });
        avoid.push([x, z, 1.1]);
    };
    blossom(9.4, -112.4, 3); blossom(15.6, -118.2, 7); blossom(-10.6, -112.0, 11); blossom(-15.6, -118.2, 13);
    cypress(16.9, -113.6); cypress(7.5, -120.6, 0.9); cypress(-16.9, -113.6); cypress(-10.3, -120.8, 0.9);
    bench(12.4, -112.4, Math.PI); bench(-13.0, -111.4, 0);
    // fontana con l'acqua che luccica
    const fx = 12.4, fz = -115.6, fput = B.at(fx, y0, fz);
    const fstone = new THREE.MeshStandardMaterial({ color: '#5d5866', roughness: 0.92, side: THREE.DoubleSide });
    fput(fstone, new THREE.LatheGeometry([[1.06, 0.42], [1.06, 0.5], [1.27, 0.52], [1.32, 0.02]].map(([a, b]) => new THREE.Vector2(a, b)), 28));
    fput(fstone, CYL(0.16, 0.22, 1.1, 10), 0, 0.85, 0);
    fput(fstone, CYL(0.5, 0.3, 0.16, 16), 0, 1.4, 0);
    fput(M.water, new THREE.CircleGeometry(1.07, 28), 0, 0.44, 0, -Math.PI / 2);
    fput(M.water, new THREE.CircleGeometry(0.45, 18), 0, 1.485, 0, -Math.PI / 2);
    world.addCirc(fx, fz, 1.32, y0 - 1, y0 + 0.55, { noWalk: true });
    avoid.push([fx, fz, 1.8]);
    const fglow = new THREE.Sprite(new THREE.SpriteMaterial({ map: world.glowTex, color: '#3affe0', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    fglow.position.set(fx, y0 + 0.9, fz); fglow.scale.set(3.4, 2, 1);
    S.add(fglow);
    world.animated.push((dt, t) => { M.water.emissiveIntensity = 0.5 + Math.sin(t * 1.7) * 0.15; fglow.material.opacity = 0.28 + Math.sin(t * 1.7) * 0.08; });
    B.build(S, true);

    // fiori fantasma (luminosi) sui prati e nelle aiuole
    const spots = [];
    const free = (x, z) => avoid.every(([ax, az, ar]) => Math.hypot(x - ax, z - az) > ar);
    for (const g of GARDENS) for (let i = 0, k = 0; i < 170 && k < 2000; k++) {
        const x = g.x0 + 0.4 + r() * (g.x1 - g.x0 - 0.8), z = g.z0 + 0.4 + r() * (g.z1 - g.z0 - 0.8);
        if (!free(x, z)) continue;
        // a mazzetti
        for (let j = 0; j < 3 && i < 170; j++, i++) spots.push([x + (r() - 0.5) * 0.5, y0 + 0.04, z + (r() - 0.5) * 0.5]);
    }
    for (const b of beds) for (let i = 0; i < 26; i++) spots.push([b.x0 + r() * (b.x1 - b.x0), b.y, b.z0 + r() * (b.z1 - b.z0)]);
    const stemG = CYL(0.008, 0.012, 0.32, 4).translate(0, 0.16, 0);
    const bloomG = new THREE.IcosahedronGeometry(0.055, 0).translate(0, 0.34, 0);
    const stems = new THREE.InstancedMesh(stemG, new THREE.MeshStandardMaterial({ color: '#24402c', roughness: 1 }), spots.length);
    const blooms = new THREE.InstancedMesh(bloomG, new THREE.MeshBasicMaterial({ color: '#ffffff' }), spots.length);
    const pal = ['#d8d0ec', '#bcaee6', '#e6dba4', '#e8bcd0', '#b4dce8', '#e4e4e4'].map(c => new THREE.Color(c));
    const m4 = new THREE.Matrix4();
    spots.forEach(([x, y, z], i) => {
        const s = 0.7 + r() * 0.6;
        m4.compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.3, r() * 6.28, (r() - 0.5) * 0.3)), V(s, s, s));
        stems.setMatrixAt(i, m4); blooms.setMatrixAt(i, m4);
        blooms.setColorAt(i, pal[i % pal.length]);
    });
    S.add(stems, blooms);
    // si può sedere anche sulle panchine
    for (const b of benches) world.interactables.push({ id: 'siedi', seat: { x: b.x, z: b.z, ry: b.ry, y: y0 + 0.05, floor: y0 }, x: b.x + Math.sin(b.ry) * 0.8, z: b.z + Math.cos(b.ry) * 0.8, y: y0, r: 1.1, label: 'Siediti in panchina' });
}
