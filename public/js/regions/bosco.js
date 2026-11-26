// =====================================================================
//  IL BOSCO CHE PROFUMA (Libro IV · Il Lab dei Ricordi)
//  Dall'altra parte dell'isola, a ovest, oltre il collo di terra: un bosco
//  fitto di faggi e abeti, col muschio che attutisce i passi. Al centro la
//  locanda Il Tofu della Nebbia, dove Nonna Lux cucina e cinque viandanti
//  di una volta si raccontano le loro avventure per non dimenticarle.
//  Il suolo è quello dell'isola (shared/bosco.js entra in world.js); qui
//  ci sono gli alberi, il sottobosco, la locanda dentro e fuori.
//  Il modulo si scarica quando sei lontano.
// =====================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BOSCO, BP, INN, INN_ROOM, innPt, boscoMask, nearBoscoBuild } from '../shared/bosco.js';
import { BOSCO_NODES, INGR, dawn } from '../shared/cucina.js';

function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function buildBosco(app) {
    const W = app.world;
    const g = new THREE.Group();
    g.name = 'regione: Bosco che Profuma';
    const disposables = [], colliders = [], interactables = [], ticks = [], interiors = [];
    const mat = (o) => { const m = new THREE.MeshStandardMaterial(o); disposables.push(m); return m; };
    const geo = (x) => { disposables.push(x); return x; };
    const add = (mesh, x, y, z, parent = g) => { mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    const box = (x, z, w, d, y0, y1, ry, opts = {}) => { const c = { type: 'box', x, z, hw: w / 2, hd: d / 2, cos: Math.cos(ry), sin: Math.sin(ry), y0, y1, region: 'bosco', ...opts }; W.colliders.push(c); colliders.push(c); };
    const circ = (x, z, r, y0, y1, opts = {}) => { const c = { type: 'circ', x, z, r, y0, y1, region: 'bosco', ...opts }; W.colliders.push(c); colliders.push(c); };
    const ground = (x, z) => W.groundAt(x, z);
    const sprite = (color, s, opacity = 0.7) => {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
        disposables.push(sp.material); sp.scale.set(s, s, 1); return sp;
    };
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), V = (x, y, z) => new THREE.Vector3(x, y, z);

    // =================================================================
    //  GLI ALBERI: faggi tondi e abeti scuri, fitti, con il muschio sotto
    // =================================================================
    const bark = mat({ color: '#4a3a30', roughness: 1, flatShading: true });
    const beechLeaf = mat({ color: '#4f6a36', roughness: 0.95, flatShading: true });
    const beechLeaf2 = mat({ color: '#6a7a3a', roughness: 0.95, flatShading: true });
    const firLeaf = mat({ color: '#25402e', roughness: 1, flatShading: true });
    const moss = mat({ color: '#3f5a2c', roughness: 1, flatShading: true });
    const fern = mat({ color: '#4c6e34', roughness: 1, flatShading: true, side: THREE.DoubleSide });
    const free = (x, z) => boscoMask(x, z) > 0.12 && !nearBoscoBuild(x, z, 2.6) && Object.values(BP).every(([px, pz]) => Math.hypot(x - px, z - pz) > 5.5);
    {
        const r = rng(4401);
        const beechTrunk = geo(new THREE.CylinderGeometry(0.2, 0.32, 4.2, 6).translate(0, 2.1, 0));
        const beechCrown = (() => {
            const parts = [[0, 5.2, 0, 2.2], [1.1, 4.6, 0.4, 1.6], [-0.9, 4.7, -0.5, 1.7], [0.2, 6.3, -0.2, 1.4]].map(([x, y, z, s]) => new THREE.IcosahedronGeometry(s, 1).translate(x, y, z));
            const m = mergeGeometries(parts); for (const p of parts) p.dispose(); return geo(m);
        })();
        const firTrunk = geo(new THREE.CylinderGeometry(0.14, 0.24, 2.2, 5).translate(0, 1.1, 0));
        const firCrown = (() => {
            const parts = [[1.9, 2.6, 1.6], [1.5, 2.3, 3.2], [1.05, 2.0, 4.6], [0.6, 1.6, 5.8]].map(([rad, h, y]) => new THREE.ConeGeometry(rad, h, 7).translate(0, y + h / 2, 0));
            const m = mergeGeometries(parts); for (const p of parts) p.dispose(); return geo(m);
        })();
        const beeches = [], firs = [];
        let tries = 0;
        while (beeches.length + firs.length < 520 && tries++ < 9000) {
            const a = r() * Math.PI * 2, d = Math.sqrt(r()) * BOSCO.r * 1.02, x = BOSCO.x + Math.cos(a) * d, z = BOSCO.z + Math.sin(a) * d;
            if (!free(x, z)) continue;
            const h = ground(x, z);
            if (h < 0.7) continue;
            // gli abeti stanno più a ovest e in alto, i faggi verso il collo e la radura
            (r() < 0.35 + 0.4 * Math.max(0, Math.min(1, (BOSCO.x - x) / 60)) ? firs : beeches).push([x, h, z, 0.8 + r() * 0.55, r() * 6.28]);
        }
        const inst = (gm, mt, list, shadow = true, tint = null) => {
            const im = new THREE.InstancedMesh(gm, mt, list.length);
            list.forEach(([x, y, z, s, ry], i) => { im.setMatrixAt(i, m4.compose(V(x, y - 0.15, z), q.setFromEuler(new THREE.Euler(0, ry, 0)), V(s, s * (0.9 + (i % 7) * 0.04), s))); if (tint) im.setColorAt(i, tint(i)); });
            im.castShadow = shadow; im.receiveShadow = true; g.add(im); disposables.push({ dispose: () => im.dispose() }); return im;
        };
        const c1 = new THREE.Color('#ffffff'), c2 = new THREE.Color('#d8e0b0'), c3 = new THREE.Color('#b8c890');
        inst(beechTrunk, bark, beeches); inst(beechCrown, beechLeaf, beeches.filter((_, i) => i % 3), true, (i) => [c1, c2, c3][i % 3]);
        inst(beechCrown, beechLeaf2, beeches.filter((_, i) => !(i % 3)), true);
        inst(firTrunk, bark, firs); inst(firCrown, firLeaf, firs, true, (i) => [c1, c2][i % 2]);
        for (const [x, y, z, s] of [...beeches, ...firs]) circ(x, z, 0.3 * s, y - 1, y + 5, { noWalk: true });
        // il sottobosco: felci e cuscini di muschio (niente ombre: sono tanti)
        const fernG = geo((() => { const parts = []; for (let k = 0; k < 5; k++) parts.push(new THREE.PlaneGeometry(0.22, 0.75).translate(0, 0.36, 0.22).rotateX(-0.55).rotateY(k * 1.256)); const m = mergeGeometries(parts); for (const p of parts) p.dispose(); return m; })());
        const mossG = geo(new THREE.SphereGeometry(0.6, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2));
        const ferns = [], mosses = [];
        tries = 0;
        while (ferns.length < 900 && tries++ < 12000) {
            const a = r() * Math.PI * 2, d = Math.sqrt(r()) * BOSCO.r, x = BOSCO.x + Math.cos(a) * d, z = BOSCO.z + Math.sin(a) * d;
            if (boscoMask(x, z) < 0.08 || nearBoscoBuild(x, z, 0.6)) continue;
            const h = ground(x, z);
            if (h < 0.6) continue;
            (r() < 0.75 ? ferns : mosses).push([x, h, z, 0.7 + r() * 0.8, r() * 6.28]);
        }
        inst(fernG, fern, ferns, false);
        const mm = inst(mossG, moss, mosses, false);
        mosses.forEach(([x, y, z, s, ry], i) => mm.setMatrixAt(i, m4.compose(V(x, y - 0.12, z), q.setFromEuler(new THREE.Euler(0, ry, 0)), V(s * 1.4, s * 0.35, s))));
    }
    // la nebbia che profuma: velature chiare e lente fra gli alberi
    {
        const r = rng(77), veils = [];
        for (let i = 0; i < 26; i++) {
            const a = r() * 6.28, d = 8 + r() * 58, x = BOSCO.x + Math.cos(a) * d, z = BOSCO.z + Math.sin(a) * d;
            const s = sprite('#fff0d8', 14 + r() * 10, 0.07);
            s.position.set(x, ground(x, z) + 2.2, z); g.add(s);
            veils.push({ s, x, z, a: r() * 6.28 });
        }
        ticks.push((dt, t) => { for (const v of veils) v.s.position.x = v.x + Math.sin(t * 0.05 + v.a) * 3; });
    }
    // lanterne lungo il sentiero, dal collo di terra alla locanda
    {
        const post = geo(new THREE.CylinderGeometry(0.06, 0.08, 1.7, 5).translate(0, 0.85, 0));
        const lampG = geo(new THREE.BoxGeometry(0.22, 0.28, 0.22));
        const lampM = mat({ color: '#ffd890', emissive: '#ffb347', emissiveIntensity: 1.8, roughness: 0.6 });
        for (const t of [0.15, 0.35, 0.55, 0.75, 0.92]) {
            const [ax, az] = [-138, 10], [bx, bz] = BP.soglia;
            const x = ax + (bx - ax) * t, z = az + (bz - az) * t + 2.4, y = ground(x, z);
            add(new THREE.Mesh(post, bark), x, y, z);
            add(new THREE.Mesh(lampG, lampM), x, y + 1.8, z);
            const glow = sprite('#ffcf8a', 1.6, 0.55); glow.position.set(x, y + 1.8, z); g.add(glow);
        }
    }

    // =================================================================
    //  I PUNTI DI RACCOLTA: funghi sotto gli abeti, erbe nel prato, bacche
    //  nel roveto, e la fonte dove all'alba si raccoglie l'acqua della nebbia
    // =================================================================
    {
        const capM = [mat({ color: '#b8432e', roughness: 0.6 }), mat({ color: '#8a5a32', roughness: 0.7 }), mat({ color: '#d8c8a0', roughness: 0.7 })];
        const stemM = mat({ color: '#ece2cc', roughness: 0.8 });
        const herbM = mat({ color: '#6a9a44', roughness: 0.9, flatShading: true }), flowerM = mat({ color: '#e8e0f8', emissive: '#6a5a8a', emissiveIntensity: 0.3 });
        const berryM = mat({ color: '#8a1a3a', roughness: 0.4, emissive: '#3a0a18', emissiveIntensity: 0.4 });
        const waterM = mat({ color: '#9ab8c8', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.75 });
        const cap = geo(new THREE.SphereGeometry(0.16, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2)), stem = geo(new THREE.CylinderGeometry(0.04, 0.05, 0.16, 6));
        const blade = geo(new THREE.ConeGeometry(0.05, 0.45, 4)), bud = geo(new THREE.SphereGeometry(0.05, 6, 4));
        const bush = geo(new THREE.IcosahedronGeometry(0.5, 1)), berry = geo(new THREE.SphereGeometry(0.06, 6, 4));
        const poolG = geo(new THREE.CircleGeometry(0.9, 16));
        const springs = [];
        for (const n of BOSCO_NODES) {
            const y = ground(n.x, n.z), ng = new THREE.Group(); ng.position.set(n.x, y, n.z); g.add(ng);
            const r = rng(n.id.charCodeAt(1) * 31 + n.id.charCodeAt(2));
            if (n.kind === 'funghi') for (let k = 0; k < 4; k++) {
                const a = r() * 6.28, d = r() * 0.35, s = 0.7 + r() * 0.6;
                add(new THREE.Mesh(stem, stemM), Math.cos(a) * d, 0.08 * s, Math.sin(a) * d, ng).scale.setScalar(s);
                add(new THREE.Mesh(cap, capM[k % 3]), Math.cos(a) * d, 0.15 * s, Math.sin(a) * d, ng).scale.setScalar(s);
            } else if (n.kind === 'erbe') for (let k = 0; k < 9; k++) {
                const a = r() * 6.28, d = r() * 0.3, m = add(new THREE.Mesh(blade, herbM), Math.cos(a) * d, 0.2, Math.sin(a) * d, ng);
                m.rotation.z = (r() - 0.5) * 0.5;
                if (k % 3 === 0) add(new THREE.Mesh(bud, flowerM), Math.cos(a) * d, 0.44, Math.sin(a) * d, ng);
            } else if (n.kind === 'bacche') {
                add(new THREE.Mesh(bush, beechLeaf), 0, 0.35, 0, ng).scale.set(1, 0.75, 1);
                for (let k = 0; k < 12; k++) { const a = r() * 6.28, e = r() * 1.2; add(new THREE.Mesh(berry, berryM), Math.cos(a) * 0.48 * Math.cos(e - 0.6), 0.35 + Math.sin(e) * 0.34, Math.sin(a) * 0.48 * Math.cos(e - 0.6), ng); }
            } else {
                const pool = add(new THREE.Mesh(poolG, waterM), 0, 0.06, 0, ng); pool.rotation.x = -Math.PI / 2; pool.castShadow = false;
                const gl = sprite('#cfe8ff', 2.2, 0); gl.position.y = 0.6; ng.add(gl); springs.push(gl);
            }
            const nm = INGR[n.kind].name;
            interactables.push({ id: 'raccogli', node: n.id, kind: n.kind, ingr: true, x: n.x, z: n.z, y, r: 1.7,
                label: () => n.kind === 'acqua_nebbia' ? (dawn() ? "Raccogli l'acqua della nebbia" : "La fonte: l'acqua della nebbia si raccoglie all'alba") : 'Raccogli: ' + nm });
        }
        // la fonte brilla all'alba
        ticks.push(() => { const on = dawn(); for (const s of springs) s.material.opacity += ((on ? 0.6 : 0.08) - s.material.opacity) * 0.05; });
    }

    // =================================================================
    //  LA LOCANDA: Il Tofu della Nebbia
    // =================================================================
    const ig = new THREE.Group();
    ig.position.set(INN.x, INN.y, INN.z); ig.rotation.y = INN.ry; g.add(ig);
    const L = (mesh, lx, ly, lz) => add(mesh, lx, ly, lz, ig);
    const B = (w, h, d, lx, ly, lz, m) => L(new THREE.Mesh(geo(new THREE.BoxGeometry(w, h, d)), m), lx, ly, lz);
    const wbx = (lx, lz, w, d, h, y0 = 0) => { const [x, z] = innPt(lx, lz); box(x, z, w, d, INN.y + y0 - 0.5, INN.y + h, -INN.ry); };
    const plankTex = (() => {
        const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
        x.fillStyle = '#6a4a30'; x.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 8; i++) { x.fillStyle = ['#5e412a', '#734f33', '#684830'][i % 3]; x.fillRect(0, i * 32 + 1, 256, 30); x.fillStyle = '#3a281a'; x.fillRect(0, i * 32, 256, 1.5); x.fillRect((i * 97) % 256, i * 32, 1.5, 32); }
        const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.colorSpace = THREE.SRGBColorSpace; disposables.push(t); return t;
    })();
    const wallM = mat({ color: '#8a6a4a', roughness: 0.9, map: plankTex });
    const beam = mat({ color: '#3e2c1e', roughness: 0.9 });
    const roofM = mat({ color: '#5a4a3e', roughness: 1, flatShading: true });
    const floorM = mat({ color: '#b08a62', roughness: 0.85, map: plankTex });
    const counterM = mat({ color: '#7a5434', roughness: 0.7 });
    const brick = mat({ color: '#8a4a32', roughness: 0.9, flatShading: true });
    const winM = mat({ color: '#ffd890', emissive: '#ffb347', emissiveIntensity: 1.4, roughness: 0.6 });
    const leaf = mat({ color: '#4f7a3a', roughness: 0.9, flatShading: true });
    const pot = mat({ color: '#a8603a', roughness: 0.9 });
    const { w: IW, d: ID } = INN, WH = 3.6, T = 0.22, DOOR = 1.5, DH = 2.4;
    // il pavimento (copre il prato) e le pareti di assi
    { const fl = new THREE.Mesh(geo(new THREE.PlaneGeometry(IW, ID)), floorM); fl.rotation.x = -Math.PI / 2; L(fl, 0, 0.03, 0); fl.castShadow = false; }
    B(IW, WH, T, 0, WH / 2, -ID / 2, wallM);
    for (const s of [-1, 1]) B(T, WH, ID, s * IW / 2, WH / 2, 0, wallM);
    const side = (IW - DOOR) / 2;
    for (const s of [-1, 1]) B(side, WH, T, s * (DOOR / 2 + side / 2), WH / 2, ID / 2, wallM);
    B(DOOR, WH - DH, T, 0, DH + (WH - DH) / 2, ID / 2, wallM);
    // stipiti, travi d'angolo e le finestre accese
    for (const s of [-1, 1]) B(0.16, DH, 0.3, s * (DOOR / 2 + 0.08), DH / 2, ID / 2, beam);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(0.3, WH, 0.3, x * IW / 2, WH / 2, z * ID / 2, beam);
    for (const lx of [-4.2, 3.6]) for (const s of [1, -1]) B(1.3, 0.9, 0.04, lx, 1.7, s * (ID / 2 + T / 2 + 0.01) * (s > 0 ? 1 : 1), winM);
    for (const s of [-1, 1]) for (const lz of [-2.2, 2.2]) B(0.04, 0.9, 1.1, s * (IW / 2 + T / 2 + 0.01), 1.7, lz, winM);
    // il tetto a capanna, con lo sporto, e i triangoli dei timpani
    {
        const RH = 2.8, over = 0.6, half = ID / 2 + over, len = Math.hypot(half, RH + 0.3), ang = Math.atan2(RH + 0.3, half);
        for (const s of [-1, 1]) { const sl = B(IW + 1.0, 0.2, len, 0, WH + RH / 2 - 0.05, s * half / 2, roofM); sl.rotation.x = s * ang; }
        const tri = new THREE.Shape(); tri.moveTo(-ID / 2, 0); tri.lineTo(ID / 2, 0); tri.lineTo(0, RH); tri.closePath();
        const tg = geo(new THREE.ExtrudeGeometry(tri, { depth: T, bevelEnabled: false }));
        for (const s of [-1, 1]) { const m = L(new THREE.Mesh(tg, wallM), s * (IW / 2) - T / 2, WH, 0); m.rotation.y = Math.PI / 2; }
        for (const lz of [-2.6, 0, 2.6]) B(IW - 0.2, 0.22, 0.22, 0, WH - 0.12, lz, beam);   // le travi dentro
        // il comignolo sopra la stufa, e il fumo
        B(0.8, 2.6, 0.8, INN_ROOM.stove.lx, WH + 1.3, INN_ROOM.stove.lz + 0.4, brick);
        const smoke = [];
        for (let i = 0; i < 6; i++) { const s = sprite('#d8d0c8', 1.4, 0.18); s.material.blending = THREE.NormalBlending; ig.add(s); smoke.push({ s, k: i / 6 }); }
        ticks.push((dt, t) => { for (const p of smoke) { const k = (p.k + t * 0.08) % 1; p.s.position.set(INN_ROOM.stove.lx + Math.sin(t * 0.4 + p.k * 6) * 0.4 * k, WH + 2.7 + k * 4, INN_ROOM.stove.lz + 0.4); p.s.scale.setScalar(1 + k * 2.4); p.s.material.opacity = 0.2 * (1 - k); } });
    }
    // l'insegna: una tavola di legno incisa sopra la porta, sotto la gronda
    {
        const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const x = c.getContext('2d');
        x.fillStyle = '#3a2414'; x.fillRect(0, 0, 1024, 256); x.strokeStyle = '#d8a050'; x.lineWidth = 12; x.strokeRect(14, 14, 996, 228);
        x.fillStyle = '#f6e2b0'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.font = 'bold 96px Cinzel, Georgia, serif'; x.fillText('IL TOFU DELLA NEBBIA', 512, 112, 940);
        x.fillStyle = '#d8a050'; x.font = 'italic 46px Georgia, serif'; x.fillText('locanda · da Nonna Lux', 512, 196, 900);
        const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; disposables.push(tx);
        B(3.7, 0.86, 0.06, 0, 3.0, ID / 2 + T / 2 + 0.03, beam);
        const sg = L(new THREE.Mesh(geo(new THREE.PlaneGeometry(3.6, 0.8)), mat({ map: tx, roughness: 0.85 })), 0, 3.0, ID / 2 + T / 2 + 0.065); sg.castShadow = false;
    }
    // la luce davanti alla porta
    { const lt = new THREE.PointLight('#ffb870', 6, 9, 2); lt.position.set(1.2, 2.4, ID / 2 + 0.9); ig.add(lt); B(0.2, 0.3, 0.2, 1.2, 2.2, ID / 2 + 0.25, winM); }
    // fuori: la legnaia, la panca, l'orto delle erbe
    {
        for (let i = 0; i < 9; i++) { const lg = B(0.18, 0.18, 1.1, -IW / 2 - 0.5, 0.12 + Math.floor(i / 3) * 0.19, -2 + (i % 3) * 0.2, bark); lg.rotation.z = Math.PI / 2; lg.rotation.y = Math.PI / 2; }
        B(1.8, 0.1, 0.4, 3.6, 0.45, ID / 2 + 1.0, counterM); B(0.1, 0.45, 0.35, 2.85, 0.22, ID / 2 + 1.0, beam); B(0.1, 0.45, 0.35, 4.35, 0.22, ID / 2 + 1.0, beam);
        for (const lx of [-4.5, -2.6]) { B(1.6, 0.3, 0.8, lx, 0.15, ID / 2 + 1.4, beam); for (let k = 0; k < 4; k++) L(new THREE.Mesh(geo(new THREE.IcosahedronGeometry(0.2, 0)), leaf), lx - 0.6 + k * 0.4, 0.42, ID / 2 + 1.4); }
    }
    // DENTRO: il bancone aperto sulla cucina, la stufa, gli scaffali coi barattoli
    {
        const C = INN_ROOM.counter;
        B(C.w, 1.0, C.d, C.lx, 0.5, C.lz, counterM); B(C.w + 0.1, 0.06, C.d + 0.12, C.lx, 1.03, C.lz, beam);
        wbx(C.lx, C.lz, C.w, C.d, 1.05);
        const S = INN_ROOM.stove;
        B(1.4, 0.9, 1.0, S.lx, 0.45, S.lz, brick);
        const mouth = B(0.6, 0.35, 0.04, S.lx, 0.45, S.lz + 0.52, mat({ color: '#1a0f08', emissive: '#ff6a1a', emissiveIntensity: 1.6 }));
        mouth.castShadow = false;
        L(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.28, 0.24, 0.3, 10)), mat({ color: '#3a3a40', metalness: 0.6, roughness: 0.4 })), S.lx - 0.2, 1.05, S.lz);
        wbx(S.lx, S.lz, 1.4, 1.0, 1.0);
        const jarCols = ['#e8d8a0', '#c87a3a', '#8aa84a', '#d8a8c8', '#f0e8d8', '#a85a3a'].map(c => mat({ color: c, roughness: 0.35, transparent: true, opacity: 0.9 }));
        const jarG = geo(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 8));
        for (const y of [1.5, 2.05]) {
            B(4.2, 0.05, 0.32, -2.6, y, -ID / 2 + 0.3, beam);
            for (let k = 0; k < 11; k++) L(new THREE.Mesh(jarG, jarCols[(k + (y > 2 ? 3 : 0)) % jarCols.length]), -4.5 + k * 0.38, y + 0.14, -ID / 2 + 0.3);
        }
        // piante appese alle travi e nei vasi agli angoli
        for (const [lx, lz] of [[-1, -2.6], [1.8, 0], [4.2, -2.6], [-3.8, 2.6], [3.8, 2.6]]) {
            B(0.02, 0.6, 0.02, lx, WH - 0.5, lz, beam);
            for (let k = 0; k < 5; k++) L(new THREE.Mesh(geo(new THREE.IcosahedronGeometry(0.16 + (k % 2) * 0.06, 0)), leaf), lx + Math.cos(k * 1.3) * 0.2, WH - 0.85 - (k % 3) * 0.15, lz + Math.sin(k * 1.3) * 0.2);
        }
        for (const [lx, lz] of [[-IW / 2 + 0.5, ID / 2 - 0.5], [IW / 2 - 0.5, -ID / 2 + 0.5], [IW / 2 - 0.5, ID / 2 - 0.5]]) {
            L(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.28, 0.22, 0.5, 8)), pot), lx, 0.25, lz);
            for (let k = 0; k < 6; k++) L(new THREE.Mesh(geo(new THREE.IcosahedronGeometry(0.22, 0)), leaf), lx + Math.cos(k) * 0.18, 0.7 + (k % 3) * 0.22, lz + Math.sin(k) * 0.18);
        }
        // i due tavoli lunghi, le panche, le scodelle e le candele
        const bowl = geo(new THREE.SphereGeometry(0.11, 10, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2));
        const bowlM = mat({ color: '#e8e0d0', roughness: 0.5, side: THREE.DoubleSide });
        const candleM = mat({ color: '#fff2d0', emissive: '#ffb347', emissiveIntensity: 2 });
        for (const Tb of INN_ROOM.tables) {
            B(Tb.w, 0.08, Tb.d, Tb.lx, 0.78, Tb.lz, counterM);
            for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(0.08, 0.76, 0.08, Tb.lx + sx * (Tb.w / 2 - 0.2), 0.38, Tb.lz + sz * (Tb.d / 2 - 0.12), beam);
            for (const sz of [-1, 1]) { B(Tb.w - 0.2, 0.07, 0.32, Tb.lx, 0.45, Tb.lz + sz * INN_ROOM.bench, counterM); for (const sx of [-1, 1]) B(0.07, 0.44, 0.28, Tb.lx + sx * (Tb.w / 2 - 0.4), 0.22, Tb.lz + sz * INN_ROOM.bench, beam); }
            for (let k = 0; k < 5; k++) { const b = L(new THREE.Mesh(bowl, bowlM), Tb.lx - 1.6 + k * 0.8, 0.93, Tb.lz + (k % 2 ? 0.18 : -0.18)); b.position.y = 0.93; }
            const cd = B(0.06, 0.16, 0.06, Tb.lx, 0.9, Tb.lz, candleM); cd.castShadow = false;
            const fl = sprite('#ffcf8a', 0.5, 0.8); fl.position.set(Tb.lx, 1.03, Tb.lz); ig.add(fl);
            wbx(Tb.lx, Tb.lz, Tb.w, Tb.d, 0.85);
        }
        // due lumi caldi e bassi
        for (const [lx, lz] of [[-2.4, -1.6], [2.6, 0.4]]) {
            const lt = new THREE.PointLight('#ffb070', 5, 9, 1.8); lt.position.set(lx, WH - 0.7, lz); ig.add(lt);
            B(0.3, 0.3, 0.3, lx, WH - 0.55, lz, winM); B(0.02, 0.4, 0.02, lx, WH - 0.2, lz, beam);
        }
    }
    // i muri della locanda (con il varco della porta)
    wbx(0, -ID / 2, IW, T, WH); wbx(-IW / 2, 0, T, ID, WH); wbx(IW / 2, 0, T, ID, WH);
    wbx(-(DOOR / 2 + side / 2), ID / 2, side, T, WH); wbx(DOOR / 2 + side / 2, ID / 2, side, T, WH);
    // l'interno: quando entri si vede solo la sala (con Lux e i cinque)
    const people = ['lux', 'ettore', 'rina', 'nando', 'greta', 'pippo'].map(id => app.npcs?.list.find(n => n.id === id)?.ch.root).filter(Boolean);
    interiors.push(app.interiors?.add({ name: 'Il Tofu della Nebbia', outName: 'Il Bosco che Profuma', x: INN.x, z: INN.z, ry: INN.ry, y: INN.y, w: IW, d: ID, h: WH, groups: [ig, ...people], camDist: 2.8 }));

    const tick = (dt) => { const t = performance.now() / 1000; for (const f of ticks) f(dt, t); };
    W.animated.push(tick);
    W.interactables.push(...interactables);

    return {
        group: g,
        dispose() {
            const i = W.animated.indexOf(tick);
            if (i >= 0) W.animated.splice(i, 1);
            const drop = (arr, items) => { for (let k = arr.length - 1; k >= 0; k--) if (items.includes(arr[k])) arr.splice(k, 1); };
            drop(W.colliders, colliders);
            drop(W.interactables, interactables);
            for (const I of interiors) if (I) app.interiors?.remove(I);
            for (const d of disposables) d.dispose();
        },
    };
}
