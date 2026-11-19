// --- LA CAPPELLA IN ROVINA E IL CIMITERO SOMMERSO ---
// La cappella: facciata col portale a sesto acuto e il rosone spezzato, abside con la grande finestra,
// fianchi con contrafforti e bifore crollate a metà, pilastri a fascio e un arco trasverso ancora in piedi,
// pavimento a lastre sconnesse. Sull'altare galleggiano i Sette Semi, ognuno col colore del suo elemento.
// Il cimitero: lapidi di forme diverse e storte, cumuli di terra, recinto di ferro battuto col cancello,
// lanterne di fuoco verde, una cripta che bagliora da dentro, nebbia bassa e un fantasma che vaga di notte.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, wallBox, place, OVER } from './world.js';
import { ELEMENTS, CANTO_SEEDS, GRAVES } from './shared/catalog.js';

const TILE = 2.6;   // la trama del muro ripete ogni 2,6 m (come wallBox)
const ni = (g) => g.index ? g.toNonIndexed() : g;
function extrude(shape, depth, seg = 12) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: seg });
    g.translate(0, 0, -depth / 2);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / TILE, uv.getY(i) / TILE);
    return g;
}
// arco a sesto acuto (equilatero) come foro: luce 2·half, imposta a 'spring', davanzale a 'bottom'
function lancetHole(cx, half, spring, bottom) {
    const p = new THREE.Path();
    p.moveTo(cx - half, bottom); p.lineTo(cx + half, bottom); p.lineTo(cx + half, spring);
    p.absarc(cx - half, spring, half * 2, 0, Math.PI / 3, false);
    p.absarc(cx + half, spring, half * 2, Math.PI * 2 / 3, Math.PI, false);
    p.lineTo(cx - half, bottom);
    return p;
}
// muro: contorno dato dai punti della cima (da sinistra a destra), base in y=0, con fori
function wallShape(w, top, holes = []) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0);
    for (let i = top.length - 1; i >= 0; i--) s.lineTo(top[i][0], top[i][1]);
    s.closePath();
    s.holes.push(...holes);
    return s;
}
// fascia d'arco a sesto acuto: estradosso A, intradosso a, imposta in y=0
function archBand(A, a) {
    const s = new THREE.Shape();
    s.moveTo(-A, 0);
    s.absarc(A, 0, 2 * A, Math.PI, Math.PI * 2 / 3, true);
    s.absarc(-A, 0, 2 * A, Math.PI / 3, 0, true);
    s.lineTo(a, 0);
    s.absarc(-a, 0, 2 * a, 0, Math.PI / 3, false);
    s.absarc(a, 0, 2 * a, Math.PI * 2 / 3, Math.PI, false);
    s.lineTo(-A, 0);
    return s;
}
// bagliore morbido disegnato una volta
let _soft;
function softTex() {
    if (_soft) return _soft;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return (_soft = new THREE.CanvasTexture(c));
}
const glowSprite = (color, size, opacity) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.set(size, size, 1);
    return s;
};
// luce vera: la rotazione in engine/stream.js accende solo le più vicine
function budgetLight(W, color, base, dist, x, y, z) {
    const l = new THREE.PointLight(color, base, dist, 1.5); l.position.set(x, y, z); W.scene.add(l);
    W.lights.push({ l, base, sp: 3 + Math.random() * 3, out: true });
    return l;
}

// =====================================================================
export function buildChapel(W, cx, cz) {
    const r = rng(404), geos = [], ground = (x, z) => W.terrainAt(x, z);
    // ogni pezzo poggia sul punto più basso del terreno sotto di lui (il terreno qui scende di quasi un metro e mezzo)
    const baseUnder = (pts) => Math.min(...pts.map(([x, z]) => ground(x, z))) - 0.35;
    const add = (g, x, y, z, ry = 0, rx = 0, rz = 0) => geos.push(place(ni(g), x, y, z, ry, rx, rz));
    const HW = 4.5, HL = 6.5;

    // facciata col portale e il rosone
    {
        const z = cz - HL, y = baseUnder([[cx - HW, z], [cx + HW, z], [cx, z]]), k = 0.35;
        const s = new THREE.Shape();
        s.moveTo(-HW, 0); s.lineTo(-1.0, 0); s.lineTo(-1.0, 2.5 + k);
        s.absarc(1.0, 2.5 + k, 2.0, Math.PI, Math.PI * 2 / 3, true);
        s.absarc(-1.0, 2.5 + k, 2.0, Math.PI / 3, 0, true);
        s.lineTo(1.0, 0); s.lineTo(HW, 0);
        for (const [x, h] of [[HW, 5.6], [3.2, 6.4], [2.2, 7.9], [1.2, 7.5], [0.3, 8.4], [-0.8, 6.8], [-1.8, 5.5], [-2.7, 5.9], [-3.5, 4.3], [-HW, 3.8]]) s.lineTo(x, h + k);
        s.closePath();
        const rose = new THREE.Path(); rose.absarc(0, 5.75 + k, 1.0, 0, Math.PI * 2, true); s.holes.push(rose);
        add(extrude(s, 0.8), cx, y, z);
        // cornice del portale e del rosone
        add(extrude(archBand(1.25, 1.0), 0.95, 16), cx, y + 2.5 + k, z);
        const ring = new THREE.TorusGeometry(1.02, 0.11, 8, 28); add(ring, cx, y + 5.75 + k, z);
        for (let i = 0; i < 6; i++) { // raggi del rosone, due spezzati
            if (i === 2 || i === 5) continue;
            const a = i / 6 * Math.PI, b = wallBox(0.09, 2.0, 0.18); add(b, cx, y + 5.75 + k, z, 0, 0, a);
        }
        W.addBox(cx - 2.75, z, 3.5, 0.8, y, y + 6);
        W.addBox(cx + 2.75, z, 3.5, 0.8, y, y + 6);
    }
    // abside: il muro di fondo con la grande finestra a sesto acuto
    {
        const z = cz + HL + 0.6, y = baseUnder([[cx - HW, z], [cx + HW, z], [cx, z]]), k = 0.35;
        const top = [[-HW, 4.4], [-3.5, 5.8], [-2.6, 8.0], [-1.8, 7.6], [-0.9, 8.8], [0.2, 9.6], [1.2, 9.1], [2.4, 7.8], [3.6, 6.5], [HW, 5.0]].map(([x, h]) => [x, h + k]);
        add(extrude(wallShape(HW * 2, top, [lancetHole(0, 1.15, 5.3 + k, 2.3 + k)]), 0.8), cx, y, z);
        add(extrude(archBand(1.35, 1.15), 0.95, 16), cx, y + 5.3 + k, z);
        add(wallBox(0.14, 3.6, 0.3), cx, y + k + 2.3 + 1.8, z);          // montante
        add(wallBox(2.5, 0.22, 1.0), cx, y + k + 2.2, z);                  // davanzale
        W.addBox(cx, z, HW * 2, 0.8, y, y + 7);
        for (const s of [-1, 1]) { add(wallBox(0.8, 3.2, 1.2), cx + s * (HW - 0.4), y + 1.6, cz + HL + 0.2); W.addBox(cx + s * (HW - 0.4), cz + HL + 0.2, 0.8, 1.2, y, y + 3.2); }
    }
    // fianchi: quattro campate per lato, alcune crollate, con contrafforti
    const bays = { [-1]: [4.6, 2.2, 4.4, 3.2], [1]: [3.9, 0, 1.5, 4.6] };   // a destra la campata crollata è l'ingresso laterale
    const BW = HL * 2 / 4;
    for (const side of [-1, 1]) {
        const x = cx + side * HW;
        bays[side].forEach((h, i) => {
            const zc = cz - HL + BW * (i + 0.5), y = baseUnder([[x, zc - BW / 2], [x, zc + BW / 2]]), k = 0.35;
            if (h <= 0) { // solo macerie dove c'era il muro
                for (let q = 0; q < 6; q++) { const sz = 0.3 + r() * 0.5; add(wallBox(sz * 1.6, sz, sz), x + side * (r() - 0.2) * 1.4, ground(x, zc) + sz * 0.3, zc + (r() - 0.5) * BW, r() * 3, (r() - 0.5) * 0.5, (r() - 0.5) * 0.5); }
                return;
            }
            const win = h > 3.4, apex = h - 0.7;
            const top = [];
            for (let j = 0; j <= 4; j++) {
                const t = -BW / 2 + j * BW / 4;
                let hh = h + (r() - 0.5) * (win ? 0.5 : 1.1);
                if (win && Math.abs(t) < 0.75) hh = Math.max(hh, apex + 0.45);
                top.push([t, hh + k]);
            }
            const holes = win ? [lancetHole(0, 0.5, h - 1.6 + k, 1.4 + k)] : [];
            add(extrude(wallShape(BW + 0.02, top, holes), 0.7), x, y, zc, Math.PI / 2);
            W.addBox(x, zc, BW, 0.7, y, y + h + k, Math.PI / 2);
        });
        // contrafforti tra una campata e l'altra
        for (let i = 0; i <= 4; i++) {
            const zb = cz - HL + BW * i, hn = Math.max(bays[side][i - 1] || 0, bays[side][i] || 0);
            if (hn < 2) continue;
            const bx = x + side * 0.75, y = ground(bx, zb) - 0.35, h1 = hn * 0.62, h2 = hn * 0.32;
            add(wallBox(1.0, h1, 0.75), bx, y + h1 / 2, zb);
            add(wallBox(0.7, h2, 0.6), bx - side * 0.15, y + h1 + h2 / 2, zb);
            add(wallBox(0.9, 0.18, 0.7), bx - side * 0.1, y + h1 + h2 + 0.02, zb, 0, 0, side * 0.5);
            W.addBox(bx, zb, 1.0, 0.75, y, y + h1 + h2);
        }
    }
    // pilastri a fascio: anima e quattro colonnine, base e capitello dove sono interi
    const piers = [[-1, -3.25, 5.4], [-1, 0, 4.8], [-1, 3.25, 2.0], [1, -3.25, 4.9], [1, 0, 1.4], [1, 3.25, 5.2]];
    const pierTop = {};
    for (const [side, dz, h] of piers) {
        const x = cx + side * 2.6, z = cz + dz, y = ground(x, z) - 0.1;
        add(wallBox(0.95, 0.4, 0.95), x, y + 0.2, z);
        add(new THREE.CylinderGeometry(0.27, 0.29, h, 14), x, y + h / 2, z);
        for (const [ox, oz] of [[0.27, 0], [-0.27, 0], [0, 0.27], [0, -0.27]]) {
            const hh = h * (0.85 + r() * 0.15);
            add(new THREE.CylinderGeometry(0.12, 0.13, hh, 10), x + ox, y + hh / 2, z + oz);
        }
        if (h > 4.5) { add(wallBox(0.95, 0.28, 0.95), x, y + h + 0.06, z); add(wallBox(1.1, 0.16, 1.1), x, y + h + 0.28, z); }
        pierTop[side + ',' + dz] = y + h + 0.36;
        W.addCirc(x, z, 0.55, y, y + h);
    }
    // l'arco lungo la navata a sinistra e il grande arco trasverso verso l'ingresso
    {
        const y = Math.min(pierTop['-1,-3.25'], pierTop['-1,0']);
        add(extrude(archBand(1.95, 1.3), 0.55, 16), cx - 2.6, y, cz - 1.625, Math.PI / 2);
        const yt = Math.min(pierTop['-1,-3.25'], pierTop['1,-3.25']);
        add(extrude(archBand(3.0, 2.3), 0.6, 20), cx, yt, cz - 3.25);
    }
    // un rocchio di colonna caduto e macerie lungo i muri
    add(new THREE.CylinderGeometry(0.29, 0.29, 1.6, 14), cx + 1.4, ground(cx + 1.4, cz + 0.2) + 0.2, cz + 0.2, 0.4, 0, Math.PI / 2);
    for (let q = 0; q < 22; q++) {
        const side = r() < 0.5 ? -1 : 1, x = cx + side * (HW - 0.7 - r() * 0.6), z = cz + (r() - 0.5) * HL * 1.8, sz = 0.2 + r() * 0.35;
        add(wallBox(sz * 1.5, sz, sz * 1.1), x, ground(x, z) + sz * 0.3, z, r() * 3, (r() - 0.5) * 0.4, (r() - 0.5) * 0.4);
    }
    // altare su due gradini
    const ay = ground(cx, cz + 4.5) - 0.05;
    add(wallBox(4.4, 0.2, 3.0), cx, ay + 0.1, cz + 4.7);
    add(wallBox(3.4, 0.2, 2.2), cx, ay + 0.3, cz + 4.75);
    add(wallBox(2.3, 0.18, 1.25), cx, ay + 0.49, cz + 4.5);
    add(wallBox(2.0, 0.78, 1.0), cx, ay + 0.97, cz + 4.5);
    add(wallBox(2.65, 0.16, 1.4), cx, ay + 1.44, cz + 4.5);
    for (const dx of [-0.6, 0, 0.6]) add(lancetPanel(), cx + dx, ay + 0.62, cz + 3.99);
    W.addBox(cx, cz + 4.5, 2.65, 1.4, ay - 0.5, ay + 1.52);
    const altarTop = ay + 1.52;

    const mesh = new THREE.Mesh(mergeGeometries(geos), W.matWall);
    mesh.castShadow = mesh.receiveShadow = true;
    W.scene.add(mesh);

    // pavimento a lastre: qualcuna manca, le altre sono sconnesse e di toni diversi
    {
        const tiles = [];
        for (let x = -HW + 0.9; x <= HW - 0.85; x += 0.95) for (let z = -HL + 0.9; z <= HL - 0.85; z += 0.95) {
            if (r() < 0.22 || (Math.abs(x) < 2.3 && z > 3.1)) continue;
            tiles.push([cx + x + (r() - 0.5) * 0.06, cz + z + (r() - 0.5) * 0.06]);
        }
        const im = new THREE.InstancedMesh(wallBox(0.88, 0.12, 0.88, 1.3), W.matWall, tiles.length);
        const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color(), one = new THREE.Vector3(1, 1, 1);
        tiles.forEach(([x, z], i) => {
            e.set((r() - 0.5) * 0.08, (r() - 0.5) * 0.12, (r() - 0.5) * 0.08);
            im.setMatrixAt(i, m4.compose(new THREE.Vector3(x, ground(x, z) + 0.02, z), q.setFromEuler(e), one));
            const v = 0.62 + r() * 0.35; im.setColorAt(i, c.setRGB(v, v * 0.97, v * 1.02));
        });
        im.receiveShadow = true; W.scene.add(im);
    }

    // candele sull'altare
    for (const [dx, dz, h] of [[-1.0, -0.35, 0.3], [-0.82, -0.45, 0.18], [0.95, -0.38, 0.26], [1.08, -0.2, 0.14], [0.8, -0.5, 0.2]]) {
        const cdl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, h, 10), new THREE.MeshStandardMaterial({ color: '#e9dfc4', roughness: 0.7, emissive: '#3a2a10', emissiveIntensity: 0.3 }));
        cdl.position.set(cx + dx, altarTop + h / 2, cz + 4.5 + dz); W.scene.add(cdl);
        const f = W.fires.make(0.28); f.position.set(cx + dx, altarTop + h + 0.02, cz + 4.5 + dz); W.scene.add(f);
        const gl = glowSprite('#ffb060', 0.7, 0.5); gl.position.set(cx + dx, altarTop + h + 0.1, cz + 4.5 + dz); W.scene.add(gl);
        W.flames.push({ glow: gl, sp: 3 + Math.random() * 3 });
    }
    budgetLight(W, '#ffb27a', 14, 12, cx, altarTop + 1.1, cz + 3.9);

    // i Sette Semi che girano sopra l'altare, e un alone al centro
    const center = new THREE.Vector3(cx, altarTop + 1.2, cz + 4.5);
    const halo = glowSprite('#c9a6ff', 1.8, 0.28); halo.position.copy(center); W.scene.add(halo);
    const seeds = CANTO_SEEDS.map((el, i) => {
        const E = ELEMENTS[el] || { color: '#ffffff', glow: '#ffffff' };
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 1), new THREE.MeshStandardMaterial({ color: E.color, emissive: E.color, emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.2 }));
        const g = glowSprite(E.color, 0.9, 0.45);
        W.scene.add(m, g);
        return { m, g, a: i / CANTO_SEEDS.length * Math.PI * 2 };
    });
    // cerchio di rune sul pavimento davanti all'altare
    const rc = document.createElement('canvas'); rc.width = rc.height = 512;
    {
        const g = rc.getContext('2d'); g.translate(256, 256); g.strokeStyle = '#fff'; g.lineCap = 'round';
        g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 236, 0, 7); g.stroke();
        g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, 214, 0, 7); g.stroke();
        g.lineWidth = 3; g.beginPath();
        for (let i = 0; i <= 7; i++) { const a = (i * 3 % 7) / 7 * Math.PI * 2 - Math.PI / 2; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 205, Math.sin(a) * 205); }
        g.stroke();
        const rr = rng(7);
        for (let i = 0; i < 7; i++) {
            const a = i / 7 * Math.PI * 2 - Math.PI / 2, x = Math.cos(a) * 225, y = Math.sin(a) * 225;
            g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2); g.lineWidth = 3; g.beginPath(); g.moveTo(0, -10); g.lineTo(0, 10);
            for (let k = 0; k < 2; k++) { const yy = -8 + rr() * 16, s = rr() < 0.5 ? -1 : 1; g.moveTo(0, yy); g.lineTo(s * 7, yy - 6); }
            g.stroke(); g.restore();
        }
    }
    const runeT = new THREE.CanvasTexture(rc);
    const rune = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.0), new THREE.MeshBasicMaterial({ map: runeT, color: '#b48cff', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, ...OVER }));
    rune.rotation.x = -Math.PI / 2; rune.position.set(cx, ground(cx, cz + 2.4) + 0.1, cz + 2.4); W.scene.add(rune);

    W.animated.push((dt, t) => {
        seeds.forEach((s, i) => {
            const a = s.a + t * 0.35, y = center.y + Math.sin(t * 1.3 + i) * 0.08;
            s.m.position.set(center.x + Math.cos(a) * 0.75, y, center.z + Math.sin(a) * 0.75);
            s.m.rotation.set(t * 0.9 + i, t * 0.6, 0);
            s.g.position.copy(s.m.position);
            s.g.material.opacity = 0.38 + Math.sin(t * 2.2 + i * 1.7) * 0.12;
        });
        halo.material.opacity = 0.22 + Math.sin(t * 0.9) * 0.08;
        rune.rotation.z = t * 0.12;
        rune.material.opacity = 0.42 + Math.sin(t * 1.5) * 0.18;
    });
}
// pannello a sesto acuto scolpito sul fronte dell'altare
function lancetPanel() {
    const s = new THREE.Shape();
    s.moveTo(-0.2, 0); s.lineTo(0.2, 0); s.lineTo(0.2, 0.32);
    s.absarc(-0.2, 0.32, 0.4, 0, Math.PI / 3, false);
    s.absarc(0.2, 0.32, 0.4, Math.PI * 2 / 3, Math.PI, false);
    s.closePath();
    return extrude(s, 0.06, 8);
}

// =====================================================================
export function buildCemetery(W, C) {
    const r = rng(5), ground = (x, z) => W.terrainAt(x, z), alta = W.quality === 'alta';
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();

    // --- LAPIDI: cinque forme, ognuna storta a modo suo ---
    const plinth = () => new THREE.BoxGeometry(0.86, 0.16, 0.34).translate(0, 0.08, 0);
    const slab = (shape, d = 0.16) => { const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0.14, -d / 2); return g; };
    const rounded = new THREE.Shape(); rounded.moveTo(-0.33, 0); rounded.lineTo(0.33, 0); rounded.lineTo(0.33, 0.72); rounded.absarc(0, 0.72, 0.33, 0, Math.PI, false); rounded.closePath();
    const gothic = new THREE.Shape(); gothic.moveTo(-0.3, 0); gothic.lineTo(0.3, 0); gothic.lineTo(0.3, 0.68);
    gothic.absarc(-0.3, 0.68, 0.6, 0, Math.PI / 3, false); gothic.absarc(0.3, 0.68, 0.6, Math.PI * 2 / 3, Math.PI, false); gothic.closePath();
    const broken = new THREE.Shape(); broken.moveTo(-0.33, 0); broken.lineTo(0.33, 0); broken.lineTo(0.33, 0.58); broken.lineTo(0.12, 0.66); broken.lineTo(0.02, 0.48); broken.lineTo(-0.14, 0.62); broken.lineTo(-0.33, 0.4); broken.closePath();
    const shapes = [
        mergeGeometries([ni(plinth()), slab(rounded)]),
        mergeGeometries([ni(plinth()), slab(gothic)]),
        mergeGeometries([ni(plinth()), slab(broken, 0.18)]),
        mergeGeometries([ni(new THREE.BoxGeometry(0.62, 0.22, 0.5).translate(0, 0.11, 0)), ni(new THREE.BoxGeometry(0.36, 1.25, 0.3).translate(0, 0.84, 0)), ni(new THREE.ConeGeometry(0.27, 0.32, 4).rotateY(Math.PI / 4).translate(0, 1.62, 0))]),
    ];
    const crossG = mergeGeometries([
        ni(new THREE.BoxGeometry(0.5, 0.24, 0.36).translate(0, 0.12, 0)),
        ni(new THREE.BoxGeometry(0.14, 1.25, 0.13).translate(0, 0.84, 0)),
        ni(new THREE.BoxGeometry(0.64, 0.13, 0.13).translate(0, 1.12, 0)),
        ni(new THREE.TorusGeometry(0.19, 0.03, 6, 20).translate(0, 1.12, 0)),
    ]);
    const stoneM = new THREE.MeshStandardMaterial({ color: '#a5a2ab', roughness: 0.95 });
    if (alta && W.matWall.normalMap) { stoneM.normalMap = W.matWall.normalMap; stoneM.normalScale.set(0.6, 0.6); W.wetMats.push([stoneM, 0.95, 0.55]); }
    const buckets = [[], [], [], [], []];
    for (const g of GRAVES) buckets[g.cross ? 4 : (g.k * 7 + 3) % 4].push(g);
    const moundG = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const mounds = new THREE.InstancedMesh(moundG, new THREE.MeshStandardMaterial({ color: '#2b241f', roughness: 1 }), GRAVES.length);
    let mi = 0;
    buckets.forEach((list, b) => {
        if (!list.length) return;
        const im = new THREE.InstancedMesh(b === 4 ? crossG : shapes[b], stoneM, list.length);
        list.forEach((g, i) => {
            const y = ground(g.x, g.z) - 0.08 - r() * 0.12;
            e.set((r() - 0.5) * 0.36, (r() - 0.5) * 0.5, (r() - 0.5) * 0.3);
            im.setMatrixAt(i, m4.compose(new THREE.Vector3(g.x, y, g.z), q.setFromEuler(e), new THREE.Vector3(1, 0.85 + r() * 0.35, 1)));
            const v = 0.42 + r() * 0.3, moss = r() < 0.4 ? 0.12 : 0;   // un po' di muschio su certe lapidi
            im.setColorAt(i, c.setRGB(v * (1 - moss), v * (1 + moss * 0.6), v * (1 - moss * 0.5)));
            W.addBox(g.x, g.z, 0.7, 0.3, y - 0.5, y + 1);
            const my = ground(g.x, g.z + 0.85) - 0.06;
            mounds.setMatrixAt(mi++, m4.compose(new THREE.Vector3(g.x, my, g.z + 0.85), q.setFromEuler(e.set(0, (r() - 0.5) * 0.3, 0)), new THREE.Vector3(0.42, 0.13, 0.8)));
        });
        im.castShadow = im.receiveShadow = true;
        W.scene.add(im);
    });
    mounds.count = mi; mounds.receiveShadow = true; W.scene.add(mounds);

    // --- RECINTO DI FERRO BATTUTO, con le lance e due correnti ---
    const iron = new THREE.MeshStandardMaterial({ color: '#17161b', metalness: 0.75, roughness: 0.45 });
    const ig = [];
    const bar = (x, z) => {
        const y = ground(x, z) - 0.1;
        ig.push(ni(new THREE.BoxGeometry(0.035, 1.35, 0.035).translate(x, y + 0.67, z)));
        ig.push(ni(new THREE.ConeGeometry(0.05, 0.18, 4).translate(x, y + 1.43, z)));
    };
    const rail = (x1, z1, x2, z2) => {
        const len = Math.hypot(x2 - x1, z2 - z1), ry = Math.atan2(-(z2 - z1), x2 - x1), mx = (x1 + x2) / 2, mz = (z1 + z2) / 2, y = Math.min(ground(x1, z1), ground(x2, z2)) - 0.1;
        for (const h of [0.28, 1.12]) ig.push(place(ni(new THREE.BoxGeometry(len, 0.045, 0.03)), mx, y + h, mz, ry));
    };
    const X0 = C.x - 10, X1 = C.x + 10, Z0 = C.z - 7, Z1 = C.z + 7, GATE = 1.6;
    for (let x = X0; x <= X1 + 1e-6; x += 0.3) { bar(x, Z0); if (Math.abs(x - C.x) > GATE + 0.3) bar(x, Z1); }
    for (let z = Z0 + 0.3; z < Z1 - 0.1; z += 0.3) { bar(X0, z); bar(X1, z); }
    rail(X0, Z0, X1, Z0); rail(X0, Z0, X0, Z1); rail(X1, Z0, X1, Z1);
    rail(X0, Z1, C.x - GATE - 0.25, Z1); rail(C.x + GATE + 0.25, Z1, X1, Z1);
    // ante del cancello, socchiuse verso l'interno
    for (const s of [-1, 1]) {
        const hx = C.x + s * (GATE - 0.05), hz = Z1, y = ground(hx, hz) - 0.05, open = -s * 1.15, leaf = [];
        for (let i = 0; i < 6; i++) { const lx = -s * (0.12 + i * 0.27); leaf.push(ni(new THREE.BoxGeometry(0.03, 1.55, 0.03).translate(lx, 0.8, 0)), ni(new THREE.ConeGeometry(0.045, 0.16, 4).translate(lx, 1.62, 0))); }
        for (const h of [0.25, 0.85, 1.4]) leaf.push(ni(new THREE.BoxGeometry(1.5, 0.04, 0.03).translate(-s * 0.75, h, 0)));
        ig.push(place(mergeGeometries(leaf), hx, y, hz, open));
    }
    const fenceMesh = new THREE.Mesh(mergeGeometries(ig), iron); fenceMesh.castShadow = true; W.scene.add(fenceMesh);
    const fence = (x, z, w, d) => W.addBox(x, z, w, d, ground(x, z) - 1, ground(x, z) + 1.4, 0, { noWalk: true });
    fence(C.x, Z0, 20, 0.15); fence(X0, C.z, 0.15, 14); fence(X1, C.z, 0.15, 14);
    fence(C.x - 5.8, Z1, 8.4, 0.15); fence(C.x + 5.8, Z1, 8.4, 0.15);

    // --- PILASTRI DEL CANCELLO, ARCO DI FERRO E LANTERNE DI FUOCO VERDE ---
    const sg = [];
    const pillar = (x, z, h) => {
        const y = ground(x, z) - 0.2;
        sg.push(place(ni(wallBox(0.55, h, 0.55)), x, y + h / 2, z), place(ni(wallBox(0.72, 0.16, 0.72)), x, y + h + 0.08, z), place(ni(wallBox(0.66, 0.2, 0.66)), x, y + 0.1, z));
        W.addCirc(x, z, 0.4, y, y + h);
        return y + h + 0.16;
    };
    const ghosts = [];
    const lantern = (x, y, z) => {
        const cage = [];
        for (const [ox, oz] of [[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]]) cage.push(ni(new THREE.BoxGeometry(0.02, 0.34, 0.02).translate(ox, 0.17, oz)));
        cage.push(ni(new THREE.ConeGeometry(0.19, 0.16, 4).rotateY(Math.PI / 4).translate(0, 0.42, 0)), ni(new THREE.BoxGeometry(0.26, 0.03, 0.26)));
        const lm = new THREE.Mesh(mergeGeometries(cage), iron); lm.position.set(x, y, z); W.scene.add(lm);
        const core = glowSprite('#d9fff0', 0.32, 0.95), outer = glowSprite('#4dffa8', 1.7, 0.5);
        core.position.set(x, y + 0.17, z); outer.position.set(x, y + 0.2, z); W.scene.add(core, outer);
        ghosts.push({ core, outer, sp: 5 + Math.random() * 4, ph: Math.random() * 6 });
    };
    const gx = C.x, gz = Z1;
    const pl = pillar(gx - GATE - 0.25, gz, 2.0), pr = pillar(gx + GATE + 0.25, gz, 2.0);
    lantern(gx - GATE - 0.25, pl, gz); lantern(gx + GATE + 0.25, pr, gz);
    for (const [x, z] of [[X0, Z0], [X1, Z0], [X0, Z1], [X1, Z1]]) pillar(x, z, 1.6);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(GATE + 0.25, 0.055, 8, 36, Math.PI), iron);
    arc.position.set(gx, Math.min(pl, pr) - 0.05, gz); W.scene.add(arc);
    budgetLight(W, '#5affb4', 12, 16, gx, Math.min(pl, pr) + 0.4, gz + 0.3);

    // --- CRIPTA dietro il recinto: porta a sesto acuto che bagliora di verde ---
    const kx = C.x, kz = Z0 - 3.2, ky = Math.min(ground(kx - 1.8, kz - 2), ground(kx + 1.8, kz + 2), ground(kx, kz)) - 0.3;
    {
        const W2 = 3.6, D = 4.0, H = 2.9, front = kz + D / 2;
        const fs = wallShape(W2, [[-W2 / 2, H], [W2 / 2, H]], [lancetHole(0, 0.6, 1.9, 0.5)]);
        sg.push(place(ni(extrude(fs, 0.4)), kx, ky, front - 0.2));
        sg.push(place(ni(wallBox(W2, H, 0.4)), kx, ky + H / 2, kz - D / 2 + 0.2));
        for (const s of [-1, 1]) sg.push(place(ni(wallBox(0.4, H, D)), kx + s * (W2 / 2 - 0.2), ky + H / 2, kz));
        // frontone triangolare e tetto a capanna
        const ped = new THREE.Shape(); ped.moveTo(-W2 / 2 - 0.15, 0); ped.lineTo(W2 / 2 + 0.15, 0); ped.lineTo(0, 1.25); ped.closePath();
        sg.push(place(ni(extrude(ped, 0.45)), kx, ky + H, front - 0.15));
        sg.push(place(ni(extrude(ped, 0.4)), kx, ky + H, kz - D / 2 + 0.2));
        sg.push(place(ni(wallBox(0.18, 0.75, 0.12)), kx, ky + H + 1.55, front - 0.15), place(ni(wallBox(0.5, 0.14, 0.12)), kx, ky + H + 1.7, front - 0.15));
        // colonnine ai lati della porta e gradini
        for (const s of [-1, 1]) sg.push(place(ni(new THREE.CylinderGeometry(0.12, 0.14, H - 0.3, 12)), kx + s * 1.05, ky + (H - 0.3) / 2 + 0.3, front + 0.15));
        sg.push(place(ni(wallBox(2.6, 0.3, 0.8)), kx, ky + 0.15, front + 0.45), place(ni(wallBox(2.0, 0.3, 0.5)), kx, ky + 0.3, front + 0.2));
        const roofG = mergeGeometries([-1, 1].map(s => place(ni(wallBox(2.3, 0.14, D + 0.6)), kx + s * 0.95, ky + H + 0.6, kz, 0, 0, -s * 0.56)));
        const roof = new THREE.Mesh(roofG, W.matRoof); roof.castShadow = true; W.scene.add(roof);
        W.addBox(kx, kz, W2, D, ky, ky + H + 1.2);
        // il buio dentro la porta, con un respiro verde
        const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), new THREE.MeshBasicMaterial({ color: '#0a2a1c' }));
        door.position.set(kx, ky + 0.5 + 1.1, front - 0.25); W.scene.add(door);
        const breath = glowSprite('#3dff9a', 2.6, 0.35); breath.position.set(kx, ky + 1.5, front + 0.2); W.scene.add(breath);
        ghosts.push({ core: null, outer: breath, sp: 0.7, ph: 0, slow: true });
    }
    const stoneMesh = new THREE.Mesh(mergeGeometries(sg), W.matWall); stoneMesh.castShadow = stoneMesh.receiveShadow = true; W.scene.add(stoneMesh);

    // --- NEBBIA BASSA che scorre tra le tombe ---
    const fogC = document.createElement('canvas'); fogC.width = fogC.height = 256;
    {
        const g = fogC.getContext('2d'), fr = rng(66);
        for (let i = 0; i < 26; i++) {
            const x = 50 + fr() * 156, y = 50 + fr() * 156, rad = 30 + fr() * 70, gr = g.createRadialGradient(x, y, 0, x, y, rad);
            gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
        }
    }
    const fogT = new THREE.CanvasTexture(fogC);
    const fogs = [];
    for (let i = 0; i < (alta ? 16 : 8); i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(7 + r() * 4, 7 + r() * 4), new THREE.MeshBasicMaterial({ map: fogT, color: '#8fa3bd', transparent: true, opacity: 0.3, depthWrite: false }));
        m.rotation.x = -Math.PI / 2; m.rotation.z = r() * 6;
        const f = { m, x: C.x - 12 + r() * 24, z: C.z - 10 + r() * 20, h: 0.18 + r() * 0.5, sp: 0.15 + r() * 0.25, rot: (r() - 0.5) * 0.05 };
        W.scene.add(m); fogs.push(f);
    }

    // --- IL FANTASMA: una figura velata che vaga tra le tombe, solo col buio ---
    const gc = document.createElement('canvas'); gc.width = 128; gc.height = 256;
    {
        const g = gc.getContext('2d');
        const body = g.createLinearGradient(0, 20, 0, 256); body.addColorStop(0, 'rgba(255,255,255,0.95)'); body.addColorStop(0.6, 'rgba(255,255,255,0.55)'); body.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = body; g.beginPath();
        g.moveTo(64, 14); g.bezierCurveTo(104, 14, 110, 60, 108, 110); g.bezierCurveTo(118, 170, 112, 230, 100, 256);
        g.lineTo(28, 256); g.bezierCurveTo(16, 230, 10, 170, 20, 110); g.bezierCurveTo(18, 60, 24, 14, 64, 14); g.fill();
        g.globalCompositeOperation = 'destination-out';
        g.fillStyle = 'rgba(0,0,0,0.85)';
        g.beginPath(); g.ellipse(50, 66, 8, 12, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(78, 66, 8, 12, 0, 0, 7); g.fill();
        g.beginPath(); g.ellipse(64, 100, 7, 11, 0, 0, 7); g.fill();
    }
    const ghost = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), color: '#d4e8ff', transparent: true, opacity: 0, depthWrite: false }));
    ghost.scale.set(1.0, 2.0, 1); W.scene.add(ghost);
    const ghostGlow = glowSprite('#9fd0ff', 2.6, 0); W.scene.add(ghostGlow);

    W.animated.push((dt, t) => {
        const night = THREE.MathUtils.clamp(((W.wispDim ?? 1) - 0.3) / 0.7, 0, 1);
        for (const L of ghosts) {
            if (L.slow) { L.outer.material.opacity = (0.22 + Math.sin(t * 0.7) * 0.12) * (0.4 + 0.6 * night); continue; }
            const k = 0.8 + Math.sin(t * L.sp + L.ph) * 0.12 + Math.random() * 0.08;
            L.core.material.opacity = 0.95 * k; L.outer.material.opacity = 0.5 * k;
        }
        for (const f of fogs) {
            f.x += f.sp * dt; if (f.x > C.x + 13) f.x = C.x - 13;
            const edge = Math.min(1, (C.x + 13 - f.x) / 3, (f.x - C.x + 13) / 3);
            f.m.position.set(f.x, ground(f.x, f.z) + f.h, f.z); f.m.rotation.z += f.rot * dt;
            f.m.material.opacity = 0.26 * edge * (0.35 + 0.65 * night);
        }
        // il fantasma passa piano, sparisce e ricompare altrove
        const gx2 = C.x + Math.sin(t * 0.11) * 8, gz2 = C.z + Math.sin(t * 0.17 + 1.3) * 5;
        const fade = Math.max(0, Math.sin(t * 0.26)) ** 1.5 * night;
        ghost.position.set(gx2, ground(gx2, gz2) + 1.15 + Math.sin(t * 1.3) * 0.12, gz2);
        ghost.material.opacity = 0.42 * fade;
        ghostGlow.position.copy(ghost.position); ghostGlow.material.opacity = 0.18 * fade;
    });
}
