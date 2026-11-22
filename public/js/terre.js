// =====================================================================
//  LE TERRE NUOVE · le costruzioni (solo client)
//  - lo Studio del Geometra: il tavolo da disegno, le tavole appese, il
//    teodolite sul treppiede, le paline bianche e rosse
//  - la Tavola Lunga nel prato, con le lucine: qui si farà la grande cena
//  - il borgo (le case di chi va e viene), il cantiere con le case a metà
//  - il Punto Trigonometrico sul colle, la Grotta delle Voci, i capisaldi
//  - il pontile in fondo, verso il mare aperto
//  La forma della terra è in shared/terre.js.
// =====================================================================
import * as THREE from 'three';
import { TP, TERRE_PATHS } from './shared/terre.js';

function tex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
}
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const STUDIO_YAW = Math.atan2(96 - TP.studio[0], 25 - TP.studio[1]);   // la porta guarda il sentiero

// un gruppo girato di ry in (x, y, z), con i collider in coordinate locali
function kit(W, x, z, ry, y = W.terrainAt(x, z)) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; W.scene.add(g);
    const L = (lx, lz) => [x + lx * Math.cos(ry) + lz * Math.sin(ry), z - lx * Math.sin(ry) + lz * Math.cos(ry)];
    const put = (geo, mat, lx, ly, lz, rot = null, parent = g) => {
        const m = new THREE.Mesh(geo, mat); m.position.set(lx, ly, lz);
        if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
        m.castShadow = m.receiveShadow = true; parent.add(m); return m;
    };
    const box = (lx, lz, w, d, y0, y1) => { const [wx, wz] = L(lx, lz); W.addBox(wx, wz, w, d, y + y0, y + y1, -ry); };
    const circ = (lx, lz, r, y0, y1) => { const [wx, wz] = L(lx, lz); W.addCirc(wx, wz, r, y + y0, y + y1); };
    const lamp = (lx, ly, lz, color = '#ffb347', I = 12, dist = 9) => {
        const l = new THREE.PointLight(color, I, dist, 1.6); l.position.set(lx, ly, lz); g.add(l);
        W.lights.push({ l, base: I, sp: 2 + Math.random() * 2, out: true });
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
        s.position.set(lx, ly, lz); s.scale.set(1.2, 1.2, 1); g.add(s);
        W.flames.push({ glow: s, sp: 2 + Math.random() * 3 });
    };
    return { g, y, L, put, box, circ, lamp };
}

// una tavola disegnata, in piccolo (per le pareti e il tavolo): curve di livello, un cartiglio
export function plateThumb(seed, tint = '#f2ecd8') {
    return tex(256, 180, (c, w, h) => {
        const r = rng(seed);
        c.fillStyle = tint; c.fillRect(0, 0, w, h);
        c.strokeStyle = '#2a2a3a'; c.lineWidth = 2; c.strokeRect(6, 6, w - 12, h - 12);
        c.lineWidth = 1; c.strokeStyle = 'rgba(40,40,70,0.7)';
        const cx = w * 0.42 + r() * 20, cy = h * 0.45 + r() * 10;
        for (let k = 1; k < 7; k++) { c.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, rr = k * 11 * (1 + 0.15 * Math.sin(a * 3 + seed) + 0.08 * Math.sin(a * 5)); c.lineTo(cx + Math.cos(a) * rr * 1.3, cy + Math.sin(a) * rr * 0.8); } c.stroke(); }
        c.strokeStyle = '#c8302a'; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(20, h - 40); c.lineTo(cx, cy); c.lineTo(w - 70, 30); c.stroke(); c.setLineDash([]);
        c.strokeStyle = '#2a2a3a'; c.strokeRect(w - 92, h - 46, 82, 36);
        c.fillStyle = '#2a2a3a'; c.font = 'italic 13px Georgia, serif'; c.fillText('Roberto', w - 80, h - 20);
    });
}

export function buildTerre(W) {
    const wood = W.matWood;
    const R = rng(2024);
    const dark = new THREE.MeshStandardMaterial({ color: '#2e2218', roughness: 0.95 });
    const plaster = new THREE.MeshStandardMaterial({ color: '#cfc4b0', roughness: 0.95 });
    const tile = new THREE.MeshStandardMaterial({ color: '#8a4a32', roughness: 0.9, flatShading: true });
    const stone = new THREE.MeshStandardMaterial({ color: '#5d5866', roughness: 0.95, flatShading: true });
    const concrete = new THREE.MeshStandardMaterial({ color: '#a8a49a', roughness: 1 });
    const brass = new THREE.MeshStandardMaterial({ color: '#c8963a', metalness: 0.85, roughness: 0.35 });
    const iron = new THREE.MeshStandardMaterial({ color: '#2a2628', metalness: 0.7, roughness: 0.5 });
    const paleT = tex(16, 128, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f2f0ea' : '#c8302a'; c.fillRect(0, i * 16, w, 16); } });
    const paleM = new THREE.MeshStandardMaterial({ map: paleT, roughness: 0.6 });
    const palina = (g, put, lx, lz, lean = 0, h = 2) => put(new THREE.CylinderGeometry(0.025, 0.025, h, 8), paleM, lx, h / 2, lz, [lean, 0, lean * 0.5], g);

    // =================================================================
    //  LO STUDIO DEL GEOMETRA
    // =================================================================
    {
        const [sx, sz] = TP.studio;
        const { g, L, put, box, lamp } = kit(W, sx, sz, STUDIO_YAW, 2.4);
        const Wd = 7, D = 5, Ht = 2.9, T = 0.2;
        W.studioInt = { name: 'Rolo Studio', x: sx, z: sz, ry: STUDIO_YAW, y: 2.4, w: Wd, d: D, h: Ht, groups: [g] };   // si entra: diventa un interno (interiors.js)
        // pavimento di cotto, muri intonacati, la parete davanti con la porta e una vetrata larga
        put(new THREE.BoxGeometry(Wd + 0.4, 0.15, D + 0.4), new THREE.MeshStandardMaterial({ color: '#9a5a3a', roughness: 0.9 }), 0, 0.075, 0);
        box(0, 0, Wd + 0.4, D + 0.4, -1, 0.15); box(0, D / 2 + 1.1, Wd, 2.0, -1, 0.18);   // pavimento e portico si calpestano
        put(new THREE.BoxGeometry(Wd, Ht, T), plaster, 0, Ht / 2, -D / 2);
        for (const s of [-1, 1]) put(new THREE.BoxGeometry(T, Ht, D), plaster, s * Wd / 2, Ht / 2, 0);
        put(new THREE.BoxGeometry(1.4, Ht, T), plaster, -Wd / 2 + 0.7, Ht / 2, D / 2);          // a sinistra della porta
        put(new THREE.BoxGeometry(1.0, Ht, T), plaster, -Wd / 2 + 2.9, Ht / 2, D / 2);          // fra porta e vetrata
        put(new THREE.BoxGeometry(Wd - 3.4, 0.9, T), plaster, Wd / 2 - (Wd - 3.4) / 2, 0.45, D / 2);   // sotto la vetrata
        put(new THREE.BoxGeometry(Wd, 0.5, T), plaster, 0, Ht - 0.25, D / 2);                   // architrave
        // la vetrata, con i telai
        const glass = new THREE.MeshStandardMaterial({ color: '#cfe4ff', transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide });
        put(new THREE.PlaneGeometry(Wd - 3.4, 1.5), glass, Wd / 2 - (Wd - 3.4) / 2, 1.65, D / 2).castShadow = false;
        for (let i = 0; i <= 3; i++) put(new THREE.BoxGeometry(0.06, 1.5, 0.08), dark, 0.4 + i * ((Wd - 3.4) / 3) - 0.4 + -0.0, 1.65, D / 2);
        // il tetto a due falde di coppi
        for (const s of [-1, 1]) { const r = put(new THREE.BoxGeometry(Wd + 0.8, 0.14, D / 2 + 0.7), tile, 0, Ht + 0.55, s * (D / 4 + 0.15)); r.rotation.x = s * 0.42; }
        const tri = new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(0, 1.05)]);
        const gg = new THREE.ExtrudeGeometry(tri, { depth: T, bevelEnabled: false }).translate(0, 0, -T / 2).rotateY(Math.PI / 2);
        for (const s of [-1, 1]) put(gg, plaster, s * Wd / 2, Ht, 0);
        // il portico davanti, con la panchina
        put(new THREE.BoxGeometry(Wd, 0.12, 2.0), wood, 0, 0.12, D / 2 + 1.1);
        for (const s of [-1, 1]) put(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8), wood, s * (Wd / 2 - 0.2), 1.3, D / 2 + 2.0);
        put(new THREE.BoxGeometry(Wd + 0.4, 0.1, 2.3), tile, 0, 2.62, D / 2 + 1.05, [-0.12, 0, 0]);
        put(new THREE.BoxGeometry(1.6, 0.08, 0.45), wood, 1.6, 0.48, D / 2 + 1.6);
        // la targhetta d'ottone accanto alla porta, all'altezza degli occhi: «Rolo Studio»
        const plaqueT = tex(256, 128, (c, w, h) => {
            const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#e8c46a'); gr.addColorStop(0.5, '#c8963a'); gr.addColorStop(1, '#a87a2a');
            c.fillStyle = gr; c.fillRect(0, 0, w, h);
            c.strokeStyle = '#6a4a14'; c.lineWidth = 5; c.strokeRect(8, 8, w - 16, h - 16);
            for (const [x, y] of [[18, 18], [w - 18, 18], [18, h - 18], [w - 18, h - 18]]) { c.fillStyle = '#7a5a1a'; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); }
            c.fillStyle = '#3a2408'; c.textAlign = 'center'; c.textBaseline = 'middle';
            c.font = 'bold 40px Georgia, serif'; c.fillText('Rolo Studio', w / 2, h / 2 - 12);
            c.font = 'italic 22px Georgia, serif'; c.fillText('tecnico: Roberto', w / 2, h / 2 + 26);
        });
        put(new THREE.BoxGeometry(0.56, 0.3, 0.03), brass, -0.6, 1.55, D / 2 + 0.115);
        put(new THREE.PlaneGeometry(0.52, 0.26), new THREE.MeshStandardMaterial({ map: plaqueT, metalness: 0.6, roughness: 0.35 }), -0.6, 1.55, D / 2 + 0.132).castShadow = false;
        // dentro: il tecnigrafo con una tavola sopra, lo sgabello, la cassettiera delle piante, i rotoli
        const tg = new THREE.Group(); tg.position.set(1.4, 0, -0.9); tg.rotation.y = 0.3; g.add(tg);
        put(new THREE.BoxGeometry(0.1, 0.95, 0.1), iron, 0, 0.48, 0, null, tg);
        put(new THREE.BoxGeometry(1.0, 0.06, 0.6), iron, 0, 0.06, 0, null, tg);
        const board = put(new THREE.BoxGeometry(1.5, 0.05, 1.05), new THREE.MeshStandardMaterial({ color: '#e8e2d0', roughness: 0.8 }), 0, 1.05, 0.05, [-0.55, 0, 0], tg);
        const sheet = put(new THREE.PlaneGeometry(1.3, 0.9), new THREE.MeshStandardMaterial({ map: plateThumb(1), roughness: 0.9 }), 0, 1.08, 0.08, [-0.55 - Math.PI / 2, 0, 0], tg);
        sheet.castShadow = false;
        // il pantografo del tecnigrafo e le squadre
        put(new THREE.BoxGeometry(0.9, 0.02, 0.04), brass, 0.1, 1.12, 0.1, [-0.55, 0, 0.6], tg);
        put(new THREE.BoxGeometry(0.04, 0.02, 0.7), brass, -0.3, 1.12, 0.05, [-0.55, 0, 0], tg);
        put(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 14), wood, 1.4 - 0.2, 0.62, -0.1);
        put(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), iron, 1.4 - 0.2, 0.32, -0.1);
        put(new THREE.BoxGeometry(1.4, 0.9, 0.8), wood, -2.2, 0.45, -1.9);
        for (let i = 0; i < 4; i++) put(new THREE.BoxGeometry(1.3, 0.02, 0.02), brass, -2.2, 0.15 + i * 0.22, -1.49);
        for (let i = 0; i < 6; i++) put(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), new THREE.MeshStandardMaterial({ color: ['#efe6cf', '#cfe4ff', '#e8dcb8'][i % 3], roughness: 0.9 }), -1.2 + (i % 3) * 0.12, 0.45 + (i > 2 ? 0.05 : 0), -1.95 + (i > 2 ? 0.1 : 0), [0.15 * (i % 2), 0, 0.1]);
        // le tavole appese al muro di fondo
        for (let i = 0; i < 3; i++) put(new THREE.PlaneGeometry(1.0, 0.7), new THREE.MeshStandardMaterial({ map: plateThumb(10 + i, i === 1 ? '#dfe8f2' : '#f2ecd8'), roughness: 0.9 }), -1.6 + i * 1.3, 1.8, -D / 2 + 0.12).castShadow = false;
        // un metro da falegname giallo, aperto sulla cassettiera
        for (let i = 0; i < 5; i++) put(new THREE.BoxGeometry(0.2, 0.01, 0.03), new THREE.MeshStandardMaterial({ color: '#e8c23a', roughness: 0.6 }), -2.6 + i * 0.19, 0.91, -1.7 + (i % 2) * 0.02, [0, i * 0.2, 0]);
        lamp(1.0, 2.2, -0.5, '#ffd890', 10, 8);
        // collider: i muri (la porta e la vetrata restano libere per guardare dentro, ma non si passa dalla vetrata)
        box(0, -D / 2, Wd, T + 0.1, -1, Ht); box(-Wd / 2, 0, T + 0.1, D, -1, Ht); box(Wd / 2, 0, T + 0.1, D, -1, Ht);
        box(-Wd / 2 + 0.7, D / 2, 1.4, T + 0.1, -1, Ht); box(Wd / 2 - (Wd - 3.4) / 2 - 0.5, D / 2, Wd - 3.4 + 1.0, T + 0.1, -1, Ht);
        box(-2.2, -1.9, 1.4, 0.8, -1, 0.95);
        const [tx, tz] = L(1.4, -0.2);
        W.interactables.push({ id: 'tavole', x: tx, z: tz, r: 1.8, label: 'Le tavole di Rob' });
        // fuori: il teodolite sul treppiede, e tre paline appoggiate al muro
        const th = new THREE.Group(); th.position.set(-2.6, 0, D / 2 + 3.2); g.add(th);
        for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; put(new THREE.CylinderGeometry(0.02, 0.03, 1.5, 6), wood, Math.cos(a) * 0.3, 0.7, Math.sin(a) * 0.3, [-Math.sin(a) * 0.35, 0, Math.cos(a) * 0.35], th); }
        put(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 12), iron, 0, 1.42, 0, null, th);
        put(new THREE.BoxGeometry(0.16, 0.22, 0.14), new THREE.MeshStandardMaterial({ color: '#e8c23a', roughness: 0.5 }), 0, 1.58, 0, null, th);
        put(new THREE.CylinderGeometry(0.035, 0.035, 0.26, 10), iron, 0, 1.62, 0.08, [Math.PI / 2, 0, 0], th);
        for (let i = 0; i < 3; i++) palina(g, put, Wd / 2 + 0.3, -1 + i * 0.3, 0.12, 2.1);
    }

    // =================================================================
    //  LA TAVOLA LUNGA, nel prato, con le lucine
    // =================================================================
    {
        const [cx, cz] = TP.tavola;
        const { g, put, box, lamp } = kit(W, cx, cz, 0.2, 2.2);
        const LEN = 12;
        const cloth = new THREE.MeshStandardMaterial({ map: tex(256, 64, (c, w, h) => { c.fillStyle = '#f2ece0'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(160,60,50,0.35)'; for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 8, h); for (let y = 0; y < h; y += 16) c.fillRect(0, y, w, 8); }), roughness: 0.95 });
        put(new THREE.BoxGeometry(LEN, 0.08, 1.3), wood, 0, 0.8, 0);
        put(new THREE.BoxGeometry(LEN + 0.1, 0.02, 1.6), cloth, 0, 0.85, 0);
        for (let i = 0; i <= 4; i++) for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.08, 0.8, 0.08), wood, -LEN / 2 + 0.3 + i * (LEN - 0.6) / 4, 0.4, s * 0.5);
        for (const s of [-1, 1]) { put(new THREE.BoxGeometry(LEN, 0.07, 0.35), wood, 0, 0.46, s * 1.1); for (let i = 0; i <= 3; i++) put(new THREE.BoxGeometry(0.07, 0.44, 0.3), wood, -LEN / 2 + 0.4 + i * (LEN - 0.8) / 3, 0.22, s * 1.1); }
        box(0, 0, LEN + 0.2, 1.6, -1, 0.9);
        for (const s of [-1, 1]) box(0, s * 1.1, LEN, 0.4, -1, 0.5);
        // piatti, bicchieri, pane, brocche di vino, candele
        const plate = new THREE.MeshStandardMaterial({ color: '#f8f6f0', roughness: 0.3 }), glassM = new THREE.MeshStandardMaterial({ color: '#cfe4ff', transparent: true, opacity: 0.4, roughness: 0.05 });
        const bread = new THREE.MeshStandardMaterial({ color: '#c8904a', roughness: 0.9 }), wine = new THREE.MeshStandardMaterial({ color: '#5a1a2a', roughness: 0.3 });
        for (let i = 0; i < 10; i++) for (const s of [-1, 1]) {
            const x = -LEN / 2 + 0.7 + i * (LEN - 1.4) / 9;
            put(new THREE.CylinderGeometry(0.15, 0.13, 0.02, 16), plate, x, 0.87, s * 0.42).castShadow = false;
            put(new THREE.CylinderGeometry(0.03, 0.025, 0.1, 8), glassM, x + 0.2, 0.92, s * 0.32).castShadow = false;
        }
        for (let i = 0; i < 5; i++) {
            const x = -LEN / 2 + 1.2 + i * (LEN - 2.4) / 4;
            const b = put(new THREE.SphereGeometry(0.14, 10, 7), bread, x, 0.92, 0); b.scale.set(1.6, 0.6, 1);
            put(new THREE.CylinderGeometry(0.06, 0.09, 0.24, 10), wine, x + 0.5, 0.98, 0.08);
            put(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 8), new THREE.MeshStandardMaterial({ color: '#f2ead0' }), x - 0.5, 0.96, -0.05);
            const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: '#ffcf7a', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
            fl.position.set(x - 0.5, 1.1, -0.05); fl.scale.set(0.35, 0.5, 1); g.add(fl); W.flames.push({ glow: fl, sp: 3 + Math.random() * 3 });
        }
        // quattro pali e le lucine appese a festone
        const poles = [[-LEN / 2 - 1, -2.2], [LEN / 2 + 1, -2.2], [LEN / 2 + 1, 2.2], [-LEN / 2 - 1, 2.2]];
        for (const [x, z] of poles) put(new THREE.CylinderGeometry(0.07, 0.09, 3.4, 8), wood, x, 1.7, z);
        const bulbM = new THREE.SpriteMaterial({ map: W.glowTex, color: '#ffe0a0', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
        for (let k = 0; k < 4; k++) {
            const [ax, az] = poles[k], [bx, bz] = poles[(k + 1) % 4], n = 14;
            for (let i = 1; i < n; i++) {
                const t = i / n, s = new THREE.Sprite(bulbM);
                s.position.set(ax + (bx - ax) * t, 3.3 - Math.sin(t * Math.PI) * 0.6, az + (bz - az) * t); s.scale.set(0.28, 0.28, 1); g.add(s);
            }
        }
        lamp(0, 3.0, 0, '#ffd890', 18, 16);
        // l'albero in fiore accanto alla tavola: l'unico, su tutta l'isola
        const trunk = new THREE.MeshStandardMaterial({ color: '#4a3a30', roughness: 1 });
        const tr = new THREE.Group(); tr.position.set(LEN / 2 + 3.5, 0, -2.5); g.add(tr);
        put(new THREE.CylinderGeometry(0.18, 0.28, 2.6, 8), trunk, 0, 1.3, 0, null, tr);
        for (let i = 0; i < 4; i++) { const a = i * 1.7; put(new THREE.CylinderGeometry(0.06, 0.12, 1.6, 6), trunk, Math.cos(a) * 0.5, 2.8, Math.sin(a) * 0.5, [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6], tr); }
        const bloom = new THREE.SpriteMaterial({ map: W.glowTex, color: '#f8d8e8', transparent: true, opacity: 0.5, depthWrite: false });
        for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(bloom); const a = R() * 6.28, rr = R() * 1.6; s.position.set(Math.cos(a) * rr, 3.0 + R() * 1.4, Math.sin(a) * rr); s.scale.setScalar(0.7 + R() * 0.7); tr.add(s); }
        box(LEN / 2 + 3.5, -2.5, 0.6, 0.6, -1, 3);
        W.interactables.push({ id: 'cena_tavola', x: cx, z: cz + 2, r: 4, label: 'La Tavola Lunga' });
    }

    // =================================================================
    //  IL BORGO: quattro case, quelle di chi va e viene
    // =================================================================
    {
        const [bx, bz] = TP.borgo, colors = ['#cfc4b0', '#d8b89a', '#b8c4b0', '#c8b0b8'];
        for (let i = 0; i < 4; i++) {
            const a = i / 4 * Math.PI * 2 + 0.4, hx = bx + Math.cos(a) * 6.5, hz = bz + Math.sin(a) * 6.5;
            const { put, box, lamp } = kit(W, hx, hz, Math.atan2(bx - hx, bz - hz), 2.6);
            const m = new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.95 });
            put(new THREE.BoxGeometry(3.4, 2.3, 3.0), m, 0, 1.15, 0);
            const rf = put(new THREE.ConeGeometry(2.8, 1.4, 4), tile, 0, 3.0, 0, [0, Math.PI / 4, 0]); rf.scale.set(1, 1, 0.9);
            put(new THREE.BoxGeometry(0.8, 1.5, 0.05), dark, 0, 0.75, 1.52);
            put(new THREE.PlaneGeometry(0.6, 0.5), new THREE.MeshStandardMaterial({ color: '#ffd890', emissive: '#ffb347', emissiveIntensity: 1.2 }), 1.0, 1.4, 1.52).castShadow = false;
            put(new THREE.BoxGeometry(0.2, 0.8, 0.2), new THREE.MeshStandardMaterial({ color: '#8a5a3a' }), 1.0, 3.2, -0.6);   // il comignolo
            box(0, 0, 3.5, 3.1, -1, 2.4);
            if (i % 2 === 0) lamp(1.0, 1.5, 1.8, '#ffb347', 8, 7);
        }
        // il pozzo del borgo
        const { put, circ } = kit(W, bx, bz, 0, 2.6);
        put(new THREE.CylinderGeometry(0.8, 0.85, 0.8, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#5d5866', roughness: 0.95, side: THREE.DoubleSide }), 0, 0.4, 0);
        for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.1, 1.8, 0.1), wood, s * 0.85, 0.9, 0);
        put(new THREE.BoxGeometry(2.0, 0.1, 0.1), wood, 0, 1.8, 0);
        circ(0, 0, 0.9, -1, 0.9);
    }

    // =================================================================
    //  IL CANTIERE: due case a metà, i picchetti con le corde, i mattoni
    // =================================================================
    {
        const [cx, cz] = TP.cantiere;
        const c0 = W.colliders.length;
        const { g, put, box } = kit(W, cx, cz, 0.6, 2.5);
        for (const [ox, oz] of [[-2.5, 0], [2.8, 0.5]]) {
            for (const [px, pz] of [[-1.6, -1.4], [1.6, -1.4], [-1.6, 1.4], [1.6, 1.4]]) put(new THREE.BoxGeometry(0.14, 2.4, 0.14), wood, ox + px, 1.2, oz + pz);
            for (const s of [-1, 1]) { put(new THREE.BoxGeometry(3.3, 0.12, 0.12), wood, ox, 2.4, oz + s * 1.4); put(new THREE.BoxGeometry(0.12, 0.12, 2.9), wood, ox + s * 1.6, 2.4, oz); }
            put(new THREE.BoxGeometry(3.4, 0.5, 0.25), new THREE.MeshStandardMaterial({ color: '#a05a3a', roughness: 0.95 }), ox, 0.25, oz - 1.4);
            for (const [px, pz] of [[-1.6, -1.4], [1.6, -1.4], [-1.6, 1.4], [1.6, 1.4]]) W.addCirc(...(() => { const c = Math.cos(0.6), s = Math.sin(0.6), lx = ox + px, lz = oz + pz; return [cx + lx * c + lz * s, cz - lx * s + lz * c]; })(), 0.12, 1.5, 4.9);
        }
        // picchetti e corda per la terza casa, ancora da fare
        const pts = [[-1.5, 3.5], [1.5, 3.5], [1.5, 6], [-1.5, 6]];
        for (const [x, z] of pts) put(new THREE.BoxGeometry(0.05, 0.5, 0.05), wood, x, 0.25, z);
        const rope = new THREE.MeshBasicMaterial({ color: '#f2e6a0' });
        for (let i = 0; i < 4; i++) { const [ax, az] = pts[i], [bx2, bz2] = pts[(i + 1) % 4], len = Math.hypot(bx2 - ax, bz2 - az); put(new THREE.BoxGeometry(len, 0.01, 0.01), rope, (ax + bx2) / 2, 0.42, (az + bz2) / 2, [0, -Math.atan2(bz2 - az, bx2 - ax), 0]).castShadow = false; }
        // una pila di mattoni e la carriola
        for (let i = 0; i < 12; i++) put(new THREE.BoxGeometry(0.24, 0.08, 0.12), new THREE.MeshStandardMaterial({ color: '#a8503a', roughness: 1 }), 4.5 + (i % 3) * 0.26, 0.04 + Math.floor(i / 3) * 0.08, -2.5 + (Math.floor(i / 3) % 2) * 0.13);
        put(new THREE.BoxGeometry(0.6, 0.25, 0.9), iron, 4.6, 0.4, -1.2);
        palina(g, put, 0, 5, 0, 2);
        box(4.7, -2.4, 0.9, 0.5, -1, 0.4);
        W.cantiere = { g, cols: W.colliders.slice(c0) };   // quando Rob se ne va, al suo posto sorge la casa (casa.js)
    }

    // =================================================================
    //  IL PUNTO TRIGONOMETRICO, la GROTTA DELLE VOCI, i CAPISALDI, il PONTILE
    // =================================================================
    {
        const [x, z] = TP.trig, { put, circ } = kit(W, x, z, 0);
        put(new THREE.BoxGeometry(0.6, 1.1, 0.6), concrete, 0, 0.55, 0);
        put(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 12), brass, 0, 1.12, 0);
        circ(0, 0, 0.45, -1, 1.1);
    }
    {
        const [x, z] = TP.grotta, { g, put, circ } = kit(W, x, z, -Math.PI / 2);
        // la bocca della grotta: massi intorno a un buco nero che guarda a ovest
        const rg = new THREE.DodecahedronGeometry(1, 0);
        for (let i = 0; i < 9; i++) { const a = Math.PI * (i / 8), m = put(rg, stone, Math.cos(a) * 1.9, Math.sin(a) * 1.9 + 0.2, 0.2 + (i % 2) * 0.3); m.scale.setScalar(0.8 + R() * 0.6); }
        put(new THREE.CircleGeometry(1.5, 16, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#050308' }), 0, 0.05, 0.35).castShadow = false;
        const v = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: '#c8b0ff', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
        v.position.set(0, 0.9, 0.1); v.scale.set(2.4, 2.4, 1); g.add(v);
        W.animated.push((dt, t) => { v.material.opacity = 0.2 + 0.15 * Math.sin(t * 0.7); });
        circ(-1.9, 0.2, 1, -1, 2); circ(1.9, 0.2, 1, -1, 2);
    }
    for (const k of ['cs1', 'cs2', 'cs3']) {
        const [x, z] = TP[k], { g, put, circ } = kit(W, x, z, R() * 3);
        put(new THREE.BoxGeometry(0.4, 0.3, 0.4), concrete, 0, 0.1, 0);
        put(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), brass, 0, 0.27, 0);
        palina(g, put, 0.45, 0.2, 0.05, 2.0);
        circ(0, 0, 0.3, -1, 0.3);
    }
    {
        const [x, z] = TP.pontile, y0 = 1.1, { put, box } = kit(W, x, z, Math.PI / 2, 0);
        for (let i = 0; i < 18; i++) put(new THREE.BoxGeometry(2.2, 0.1, 0.48), wood, 0, y0, -2 + i * 0.55);
        for (const s of [-1, 1]) for (let i = 0; i < 4; i++) put(new THREE.CylinderGeometry(0.1, 0.12, 4, 8), wood, s * 1.1, y0 - 1.8, -2 + i * 3.2);
        box(0, 2.7, 2.2, 10, -10, y0);
    }

    // lanterne lungo i sentieri nuovi
    for (const [[ax, az], [bx, bz]] of TERRE_PATHS) {
        const len = Math.hypot(bx - ax, bz - az), n = Math.floor(len / 14);
        for (let k = 1; k <= n; k++) {
            const t = k / (n + 1), x = ax + (bx - ax) * t, z = az + (bz - az) * t, nx = -(bz - az) / len, nz = (bx - ax) / len, s = k % 2 ? 2.3 : -2.3;
            if (W.terrainAt(x + nx * s, z + nz * s) > 0.5) W.addLantern(x + nx * s, z + nz * s);
        }
    }
}
