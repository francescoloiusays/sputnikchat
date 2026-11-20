// =====================================================================
//  LA RIVA DI LÀ (Libro III)
//  La terra oltre il mare aperto, lungo il fascio del faro. Ci arrivava
//  chi il faro guidava fuori dalla nebbia; da trecento anni non arriva
//  più nessuno. Qui ci sono:
//   - il pontile, con la barca del Traghettatore
//   - la lanterna di latta che ha risposto al faro
//   - la casa della Cartografa, con la mappa sul tavolo
//   - il villaggio dei Senza Nome: cinque case vuote intorno a un cippo
//   - il Pozzo dei Nomi, che di notte respira nebbia
//   - il Monte Storto, con il terzo cippo in cima
//  La forma del suolo è in shared/riva.js (la usa anche world.js).
//  Il modulo si scarica quando sei lontano.
// =====================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Grass } from '../grass.js';
import { RIVA, RP, HUTS, rivaPt, rivaUV, rivaHeight, rfbm } from '../shared/riva.js';
import { l2At, L2AT } from '../shared/libro2.js';

const [TX, TZ] = RIVA.t;
const JETTY_YAW = Math.atan2(TX, TZ);   // un gruppo girato così ha il suo +z verso l'isola

export function rivaArrival() {
    const [x, z] = rivaPt(RP.jetty1[0] - 2.5, 0.4);
    return { x, z, yaw: Math.atan2(-TX, -TZ), camYaw: Math.atan2(TX, TZ), feet: RIVA.deckY + 0.5 };
}

// piccolo generatore pseudo-casuale con seme (stesso aspetto a ogni caricamento)
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function distSeg(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
// i sentieri (in coordinate di riva): dall'approdo al villaggio, al pozzo, alla cima
const PATHS = [[RP.landing, [40, -12]], [[40, -12], RP.village], [RP.village, RP.pozzo], [RP.pozzo, [-26, 0]], [[-26, 0], [-34, 6]], [RP.landing, [52, -40]], [[52, -40], RP.spiaggia]];
function pathDistUV(u, v) { let d = Infinity; for (const [a, b] of PATHS) d = Math.min(d, distSeg(u, v, a[0], a[1], b[0], b[1])); return d; }

export function buildRiva(app) {
    const W = app.world;
    const g = new THREE.Group();
    g.name = 'regione: Riva di Là';
    const disposables = [], colliders = [], interactables = [], fires = [], ticks = [];
    const mat = (o) => { const m = new THREE.MeshStandardMaterial(o); disposables.push(m); return m; };
    const geo = (x) => { disposables.push(x); return x; };
    const add = (mesh, x, y, z, parent = g) => { mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    const box = (x, z, w, d, y0, y1, ry, opts = {}) => { const c = { type: 'box', x, z, hw: w / 2, hd: d / 2, cos: Math.cos(ry), sin: Math.sin(ry), y0, y1, region: 'riva', ...opts }; W.colliders.push(c); colliders.push(c); };
    const circ = (x, z, r, y0, y1, opts = {}) => { const c = { type: 'circ', x, z, r, y0, y1, region: 'riva', ...opts }; W.colliders.push(c); colliders.push(c); };
    const ground = (x, z) => rivaHeight(x, z);
    const P = (u, v) => rivaPt(u, v);
    // da coordinate locali di un oggetto girato di «yaw» a coordinate del mondo
    const local = (ox, oz, yaw, lx, lz) => [ox + lx * Math.cos(yaw) + lz * Math.sin(yaw), oz - lx * Math.sin(yaw) + lz * Math.cos(yaw)];
    const sprite = (color, s, opacity = 0.7, fog = true) => {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog }));
        disposables.push(sp.material); sp.scale.set(s, s, 1); return sp;
    };
    const st = () => app.me?.libro2;

    const stone = mat({ color: '#5a5462', roughness: 0.95, flatShading: true });
    const darkStone = mat({ color: '#3d3846', roughness: 0.95, flatShading: true });
    const wood = W.matWood;
    const plank = mat({ color: '#4a3626', roughness: 0.92 });
    const thatch = mat({ color: '#4d4232', roughness: 1, flatShading: true });
    const tin = mat({ color: '#8d8a80', metalness: 0.7, roughness: 0.45 });
    const paper = mat({ color: '#dcd2b0', emissive: '#4a3f20', emissiveIntensity: 0.5, roughness: 1, side: THREE.DoubleSide });
    const windowLit = mat({ color: '#ffcf7a', emissive: '#ffb347', emissiveIntensity: 0.0, roughness: 0.6 });
    const windowTobia = mat({ color: '#ffcf7a', emissive: '#ffb347', emissiveIntensity: 0.0, roughness: 0.6 });
    const windowHome = mat({ color: '#ffd890', emissive: '#ffb347', emissiveIntensity: 1.6, roughness: 0.6 });

    // =================================================================
    //  IL SUOLO: una griglia sua, con gli stessi colori e la stessa grana dell'isola
    // =================================================================
    const HALF = 132, SEG = 150, n = SEG + 1, cw = (HALF * 2) / SEG;
    const minX = RIVA.x - HALF, minZ = RIVA.z - HALF;
    const H = new Float32Array(n * n);
    for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) H[iz * n + ix] = ground(minX + ix * cw, minZ + iz * cw);
    {
        const pos = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3), uv = new Float32Array(n * n * 2);
        const C = {
            deep: new THREE.Color('#140b1e'), sand: new THREE.Color('#4d443a'), mud: new THREE.Color('#362c25'),
            g1: new THREE.Color('#2c3826'), g2: new THREE.Color('#3b3350'), rock: new THREE.Color('#5a5361'), path: new THREE.Color('#5c4b3a'), snowy: new THREE.Color('#77707e'),
        };
        const c = new THREE.Color(), r = rng(31);
        for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
            const i = iz * n + ix, x = minX + ix * cw, z = minZ + iz * cw, h = H[i];
            pos.set([x, h, z], i * 3);
            uv.set([x / 4, z / 4], i * 2);
            const hx = H[iz * n + Math.min(n - 1, ix + 1)] - h, hz = H[Math.min(n - 1, iz + 1) * n + ix] - h;
            const slope = Math.hypot(hx, hz) / cw;
            if (h < -0.4) c.copy(C.deep).lerp(C.sand, smooth(-3.5, -0.4, h));
            else if (h < 0.6) c.copy(C.sand).lerp(C.mud, smooth(-0.4, 0.6, h));
            else {
                c.copy(C.g1).lerp(C.g2, smooth(-0.3, 0.5, rfbm(x * 0.05, z * 0.05)));
                c.lerp(C.mud, smooth(0.6, 1.2, -h + 1.2) * 0.5);
            }
            c.lerp(C.rock, smooth(0.45, 0.9, slope));
            c.lerp(C.snowy, smooth(18, 30, h) * 0.7);   // in alto, sul Monte Storto, la pietra è chiara di sale
            const [u, v] = rivaUV(x, z);
            c.lerp(C.path, (1 - smooth(1.4, 3.0, pathDistUV(u, v))) * smooth(0, 0.5, h) * 0.85);
            c.multiplyScalar(0.92 + r() * 0.16);
            col.set([c.r, c.g, c.b], i * 3);
        }
        const idx = [];
        for (let iz = 0; iz < n - 1; iz++) for (let ix = 0; ix < n - 1; ix++) {
            const a = iz * n + ix, d = a + 1, b = a + n, cc = b + 1;
            idx.push(a, b, d, b, cc, d);
        }
        const tg = geo(new THREE.BufferGeometry());
        tg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
        tg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        tg.setIndex(idx);
        tg.computeVertexNormals();
        const terrain = new THREE.Mesh(tg, W.terrain.material);   // lo stesso materiale dell'isola: cambia con il giorno e la neve
        terrain.receiveShadow = true;
        g.add(terrain);
    }
    // l'erba: lo stesso prato dell'isola, sulla sua griglia
    const grass = new Grass(W.scene, {
        H, n, minX, minZ, cw, cd: cw, mask: (ix, iz) => {
            const x = minX + ix * cw, z = minZ + iz * cw, h = H[iz * n + ix];
            if (h < 0.7 || h > 16) return 0;
            const hx = H[iz * n + Math.min(n - 1, ix + 1)] - h, hz = H[Math.min(n - 1, iz + 1) * n + ix] - h;
            if (Math.hypot(hx, hz) / cw > 0.55) return 0;
            const [u, v] = rivaUV(x, z);
            if (pathDistUV(u, v) < 2.2) return 0;
            if (Math.hypot(u - RP.village[0], v - RP.village[1]) < 7) return 0;
            if (Math.hypot(u - RP.pozzo[0], v - RP.pozzo[1]) < 6) return 0.15;
            return smooth(0.7, 1.3, h) * (0.55 + 0.45 * smooth(-0.3, 0.4, rfbm(x * 0.04 + 5, z * 0.04)));
        },
    });
    (W.grassX ||= []).push(grass);
    if (W.envS) grass.applyEnv(W.envS, W.indoor);

    // in fondo, dietro il Monte Storto: altre montagne, la terra che continua nella nebbia
    {
        const far = mat({ color: '#1b1526', roughness: 1, flatShading: true });
        const r = rng(77);
        for (let i = 0; i < 9; i++) {
            const k = (i - 4) / 4, dist = 150 + r() * 90;
            const [x, z] = P(-dist + Math.abs(k) * 30, k * 170 + (r() - 0.5) * 30);
            const hgt = 55 + r() * 70, rad = 45 + r() * 45;
            const m = new THREE.Mesh(geo(new THREE.ConeGeometry(rad, hgt, 6 + (i % 3), 1)), far);
            m.position.set(x, hgt / 2 - 12, z); m.rotation.set((r() - 0.5) * 0.12, r() * 3, (r() - 0.5) * 0.15);
            g.add(m);
        }
    }

    // =================================================================
    //  IL PONTILE, la barca e la torcia in fondo
    // =================================================================
    {
        const [u0] = RP.jetty0, [u1] = RP.jetty1, len = u1 - u0, w = 2.6, yd = RIVA.deckY - 0.05;
        const [ox, oz] = P(u0, 0);
        const toWorld = new THREE.Matrix4().makeRotationY(JETTY_YAW).setPosition(ox, 0, oz);
        const parts = [];
        for (let z = 0; z < len; z += 0.55) parts.push(new THREE.BoxGeometry(w, 0.1, 0.48).translate(0, yd, z + 0.24));
        for (const s of [-1, 1]) for (let z = 0; z <= len; z += 3.5) parts.push(new THREE.CylinderGeometry(0.12, 0.15, 4.4, 10).translate(s * (w / 2), yd - 1.9, z));
        parts.push(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 10).translate(-w / 2 - 0.1, yd + 0.8, len));
        // la bitta e una cima arrotolata
        parts.push(new THREE.CylinderGeometry(0.14, 0.16, 0.5, 10).translate(w / 2 - 0.3, yd + 0.3, len - 1.2));
        parts.push(new THREE.TorusGeometry(0.22, 0.06, 6, 14).rotateX(Math.PI / 2).translate(w / 2 - 0.85, yd + 0.08, len - 1.6));
        const dg = geo(mergeGeometries(parts.map(q => q.applyMatrix4(toWorld))));
        for (const q of parts) q.dispose();
        const dock = new THREE.Mesh(dg, wood);
        dock.castShadow = dock.receiveShadow = true;
        g.add(dock);
        const [mx, mz] = P(u0 + len / 2, 0);
        box(mx, mz, w, len + 0.5, -10, RIVA.deckY, -JETTY_YAW, { deck: true });
        // la torcia in fondo
        const [tx, tz] = local(ox, oz, JETTY_YAW, -w / 2 - 0.1, len);
        const fire = W.fires.make(0.55);
        fire.position.set(tx, yd + 1.85, tz);
        g.add(fire); fires.push(fire);
        const tl = new THREE.PointLight('#ff8a3a', 14, 14, 1.6);
        tl.position.set(tx, yd + 2.0, tz);
        g.add(tl);
        const tg = sprite('#ff8a3a', 1.8, 0.45);
        tg.position.set(tx, yd + 1.95, tz);
        g.add(tg);
        // la barca del Traghettatore: lui resta seduto, e aspetta
        const boat = new THREE.Group();
        const hullMat = mat({ color: '#3a2618', side: THREE.DoubleSide, roughness: 0.9 });
        const hull = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.9, 0.6, 3.6, 18, 1, true, 0, Math.PI)), hullMat);
        hull.rotation.set(Math.PI / 2, 0, Math.PI); hull.scale.set(1, 1, 0.5); hull.castShadow = true;
        boat.add(hull);
        const lamp = sprite('#ffd27a', 1.2, 0.8);
        lamp.position.set(0, 0.9, 1.2); boat.add(lamp);
        const [bx, bz] = local(ox, oz, JETTY_YAW, 2.7, len - 3);
        boat.position.set(bx, 0.15, bz); boat.rotation.y = JETTY_YAW + 0.12;
        g.add(boat);
        const [ix, iz] = local(ox, oz, JETTY_YAW, 1.0, len - 3);
        interactables.push({ id: 'barca', dest: 'molo', x: ix, z: iz, y: RIVA.deckY, r: 2.2, label: 'Torna all\'isola in barca' });
        let t = 0;
        ticks.push((dt) => { t += dt; boat.rotation.z = Math.sin(t * 0.9) * 0.025; boat.position.y = 0.15 + Math.sin(t * 0.7) * 0.04; });
    }

    // =================================================================
    //  LA LANTERNA DELLA RIVA: latta, un palo storto, una rosa dei venti
    //  Alla fine del libro brucia d'oro e tende un filo di luce fino al faro
    // =================================================================
    let lumeGlow, lumeLight, lumeCore, thread;
    {
        const [lx, lz] = P(...RP.lume), y0 = ground(lx, lz);
        const pole = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.09, 0.12, 3.2, 8)), wood), lx, y0 + 1.6, lz);
        pole.rotation.z = 0.06;
        const arm = add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.08, 0.08, 0.7)), wood), lx + 0.1, y0 + 3.1, lz);
        arm.rotation.y = JETTY_YAW;
        const [hx, hz] = local(lx + 0.1, lz, JETTY_YAW, 0, 0.35);
        const cage = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.16, 0.2, 0.42, 6, 1, true)), mat({ color: '#8d8a80', metalness: 0.7, roughness: 0.45, side: THREE.DoubleSide, wireframe: false, transparent: true, opacity: 0.85 })), hx, y0 + 2.8, hz);
        add(new THREE.Mesh(geo(new THREE.ConeGeometry(0.24, 0.22, 6)), tin), hx, y0 + 3.12, hz);
        cage.castShadow = false;
        lumeCore = sprite('#ffd27a', 0.6, 0.95, false);
        lumeCore.position.set(hx, y0 + 2.8, hz); g.add(lumeCore);
        lumeGlow = sprite('#ffd27a', 3.2, 0.5, false);
        lumeGlow.position.copy(lumeCore.position); g.add(lumeGlow);
        lumeLight = new THREE.PointLight('#ffcf7a', 10, 16, 1.6);
        lumeLight.position.set(hx, y0 + 2.7, hz); g.add(lumeLight);
        circ(lx, lz, 0.25, y0 - 1, y0 + 3.3);
        interactables.push({ id: 'l2spot', k: 'lume_riva', x: lx, z: lz, y: y0, r: 2.2, label: () => app.l2?.rivaLabel('lume_riva') || 'La lanterna della riva' });
        // il filo di luce fra le due rive: dalla lanterna fino in cima al faro
        const F = app.faroInfo?.gallery;
        const fx = 138, fz = -150, fy = F ? F.y + 1.4 : 19.5;
        const from = new THREE.Vector3(hx, y0 + 2.8, hz), to = new THREE.Vector3(fx, fy, fz);
        const L = from.distanceTo(to);
        const tm = new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
        disposables.push(tm);
        thread = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.05, 0.05, L, 6, 1, true)), tm);
        thread.position.copy(from).lerp(to, 0.5);
        thread.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
        thread.frustumCulled = false;
        thread.visible = false;
        g.add(thread);
    }

    // =================================================================
    //  LA CASA DELLA CARTOGRAFA: legno, una finestra sempre accesa,
    //  e fuori un tavolo con la mappa fermata da quattro sassi
    // =================================================================
    let mapSheet;
    {
        const [cx, cz] = P(...RP.casa), y0 = ground(cx, cz), yaw = JETTY_YAW;   // la porta guarda il pontile
        const hg = new THREE.Group();
        hg.position.set(cx, y0, cz); hg.rotation.y = yaw;
        g.add(hg);
        const Wd = 5, D = 4, Ht = 2.6, T = 0.18;
        const wall = (w, h, d, x, y, z, m = plank) => add(new THREE.Mesh(geo(new THREE.BoxGeometry(w, h, d)), m), x, y, z, hg);
        wall(Wd, Ht, T, 0, Ht / 2, -D / 2);                                      // dietro
        wall(T, Ht, D, -Wd / 2, Ht / 2, 0); wall(T, Ht, D, Wd / 2, Ht / 2, 0);   // fianchi
        wall((Wd - 1.1) / 2, Ht, T, -(Wd + 1.1) / 4, Ht / 2, D / 2);              // davanti, con la porta in mezzo
        wall((Wd - 1.1) / 2, Ht, T, (Wd + 1.1) / 4, Ht / 2, D / 2);
        wall(1.1, Ht - 2.0, T, 0, 2.0 + (Ht - 2.0) / 2, D / 2);
        wall(Wd + 0.2, 0.12, D + 0.2, 0, 0.05, 0, wood);                         // pavimento
        // il tetto a due falde
        for (const s of [-1, 1]) {
            const r = wall(Wd + 0.6, 0.12, D / 2 + 0.7, 0, Ht + 0.55, s * (D / 4 + 0.15), thatch);
            r.rotation.x = s * 0.5;
        }
        // due finestre accese (una sul davanti, una sul fianco che guarda il mare)
        for (const [x, z, ry] of [[-1.6, D / 2 + 0.1, 0], [Wd / 2 + 0.1, 0.4, Math.PI / 2]]) {
            const f = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(0.7, 0.6)), windowHome), x, 1.55, z, hg);
            f.rotation.y = ry; f.castShadow = false;
        }
        const wl = new THREE.PointLight('#ffb34a', 9, 9, 1.6);
        wl.position.set(0, 1.8, 0); hg.add(wl);
        // dentro: un letto stretto e una pila di carte
        wall(0.9, 0.4, 1.9, -1.8, 0.3, -0.9, wood);
        for (let i = 0; i < 4; i++) { const p = wall(0.6, 0.05, 0.45, 1.6, 0.15 + i * 0.06, -1.3, paper); p.rotation.y = i * 0.3; p.castShadow = false; }
        // i collider: tre muri e i due pezzi davanti, la porta resta libera
        const wbox = (lx, lz, w, d) => { const [x, z] = local(cx, cz, yaw, lx, lz); box(x, z, w, d, y0 - 0.5, y0 + Ht + 0.8, -yaw); };
        wbox(0, -D / 2, Wd, T + 0.1); wbox(-Wd / 2, 0, T + 0.1, D); wbox(Wd / 2, 0, T + 0.1, D);
        wbox(-(Wd + 1.1) / 4, D / 2, (Wd - 1.1) / 2, T + 0.1); wbox((Wd + 1.1) / 4, D / 2, (Wd - 1.1) / 2, T + 0.1);
        wbox(-1.8, -0.9, 0.9, 1.9);
        // fuori, il tavolo della mappa (di lato, verso il pontile)
        const [tx, tz] = local(cx, cz, yaw, -2.4, D / 2 + 1.6);
        const tb = new THREE.Group(); tb.position.set(tx, ground(tx, tz), tz); tb.rotation.y = yaw + 0.25; g.add(tb);
        add(new THREE.Mesh(geo(new THREE.BoxGeometry(1.4, 0.07, 0.9)), wood), 0, 0.82, 0, tb);
        for (const [a, b] of [[-0.6, -0.36], [0.6, -0.36], [-0.6, 0.36], [0.6, 0.36]]) add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.07, 0.8, 0.07)), wood), a, 0.4, b, tb);
        mapSheet = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(1.15, 0.72)), mat({ color: '#e8e0c4', roughness: 1, emissive: '#3a3018', emissiveIntensity: 0.4 })), 0, 0.865, 0, tb);
        mapSheet.rotation.x = -Math.PI / 2; mapSheet.castShadow = false;
        for (const [a, b] of [[-0.52, -0.3], [0.52, -0.3], [-0.52, 0.3], [0.52, 0.3]]) add(new THREE.Mesh(geo(new THREE.DodecahedronGeometry(0.05, 0)), darkStone), a, 0.89, b, tb);
        box(tx, tz, 1.4, 0.9, ground(tx, tz) - 0.5, ground(tx, tz) + 0.9, -(yaw + 0.25));
    }
    // la mappa: bianca finché non tiene, poi con l'isola disegnata sopra
    const mapTex = (() => {
        const c = document.createElement('canvas'); c.width = 256; c.height = 160;
        const x = c.getContext('2d');
        x.fillStyle = '#e8e0c4'; x.fillRect(0, 0, 256, 160);
        x.strokeStyle = '#4a3a24'; x.lineWidth = 2;
        x.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, r = 34 * (1 + 0.12 * Math.sin(a * 3 + 1.3) + 0.08 * Math.sin(a * 5)); x.lineTo(90 + Math.cos(a) * r, 96 + Math.sin(a) * r * 0.8); } x.stroke();
        x.beginPath(); x.arc(92, 44, 14, 0, Math.PI * 2); x.stroke();
        x.beginPath(); x.arc(140, 30, 6, 0, Math.PI * 2); x.stroke();
        x.fillStyle = '#c8962a'; x.beginPath(); x.arc(140, 30, 3, 0, Math.PI * 2); x.fill();
        x.strokeStyle = '#c8962a'; x.setLineDash([4, 3]); x.beginPath(); x.moveTo(144, 28); x.lineTo(236, 12); x.stroke(); x.setLineDash([]);
        x.strokeStyle = '#4a3a24'; x.beginPath(); x.arc(236, 14, 9, 0, Math.PI * 2); x.stroke();
        x.font = 'italic 11px serif'; x.fillStyle = '#4a3a24'; x.fillText('il Faro', 122, 46); x.fillText('la Riva', 206, 34);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; disposables.push(t); return t;
    })();

    // =================================================================
    //  I CIPPI: tre pietre piantate dalla Cartografa, punti fermi della mappa
    // =================================================================
    const cairn = (u, v, seed) => {
        const [x, z] = P(u, v), y0 = ground(x, z), r = rng(seed);
        const parts = [];
        parts.push(new THREE.CylinderGeometry(0.28, 0.36, 1.3, 6).translate(0, 0.6, 0));
        parts.push(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 4).rotateZ(Math.PI / 2).translate(0, 1.05, 0.3));
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + r(); parts.push(new THREE.DodecahedronGeometry(0.22 + r() * 0.12, 0).translate(Math.cos(a) * 0.55, 0.1, Math.sin(a) * 0.55)); }
        const flat = parts.map(q => (q.index ? q.toNonIndexed() : q));
        const m = add(new THREE.Mesh(geo(mergeGeometries(flat)), stone), x, y0 - 0.1, z);
        for (const q of flat) q.dispose();
        m.rotation.y = r() * 6;
        for (const q of parts) q.dispose();
        circ(x, z, 0.45, y0 - 1, y0 + 1.3);
    };
    cairn(...RP.spiaggia, 3); cairn(...RP.village, 5); cairn(...RP.monte, 7);

    // =================================================================
    //  IL VILLAGGIO DEI SENZA NOME: cinque case di pietra, porta verso il cippo
    // =================================================================
    const huts = [];
    {
        const Wd = 4.2, D = 4.2, Ht = 2.3, T = 0.3, DOOR = 1.2;
        for (const [i, [u, v, yaw]] of HUTS.entries()) {
            const [cx, cz] = P(u, v), y0 = ground(cx, cz);
            const hg = new THREE.Group(); hg.position.set(cx, y0, cz); hg.rotation.y = yaw; g.add(hg);
            const wall = (w, h, d, x, y, z, m = stone) => add(new THREE.Mesh(geo(new THREE.BoxGeometry(w, h, d)), m), x, y, z, hg);
            wall(Wd, Ht, T, 0, Ht / 2, -D / 2);
            wall(T, Ht, D, -Wd / 2, Ht / 2, 0); wall(T, Ht, D, Wd / 2, Ht / 2, 0);
            wall((Wd - DOOR) / 2, Ht, T, -(Wd + DOOR) / 4, Ht / 2, D / 2); wall((Wd - DOOR) / 2, Ht, T, (Wd + DOOR) / 4, Ht / 2, D / 2);
            wall(DOOR, 0.4, T, 0, Ht - 0.2, D / 2);
            const roof = add(new THREE.Mesh(geo(new THREE.ConeGeometry(3.6, 1.9, 4, 1)), thatch), 0, Ht + 0.9, 0, hg);
            roof.rotation.y = Math.PI / 4;
            if (i === 1) roof.rotation.z = 0.25;   // una ha il tetto che scivola via
            // dentro: un tavolo, uno sgabello
            wall(1.0, 0.08, 0.7, 0, 0.75, -1.2, wood);
            wall(0.08, 0.72, 0.6, -0.45, 0.36, -1.2, wood); wall(0.08, 0.72, 0.6, 0.45, 0.36, -1.2, wood);
            wall(0.4, 0.45, 0.4, 1.1, 0.22, -0.6, wood);
            // la finestra (sul fianco): resta buia finché qualcuno non riprende il suo nome
            const wm = i === 4 ? windowTobia : windowLit;
            const f = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(0.6, 0.5)), wm), Wd / 2 + T / 2 + 0.02, 1.5, 0, hg);
            f.rotation.y = Math.PI / 2; f.castShadow = false;
            const cl = new THREE.PointLight('#ffb34a', 0, 7, 1.7);
            cl.position.set(0, 1.4, -0.5); hg.add(cl);
            huts.push({ cl, i });
            const wbox = (lx, lz, w, d) => { const [x, z] = local(cx, cz, yaw, lx, lz); box(x, z, w, d, y0 - 0.5, y0 + Ht + 0.5, -yaw); };
            wbox(0, -D / 2, Wd, T); wbox(-Wd / 2, 0, T, D); wbox(Wd / 2, 0, T, D);
            wbox(-(Wd + DOOR) / 4, D / 2, (Wd - DOOR) / 2, T); wbox((Wd + DOOR) / 4, D / 2, (Wd - DOOR) / 2, T);
            wbox(0, -1.2, 1.0, 0.7);
        }
    }
    // il forno di Tobia: una cupola di pietra; dopo il suo nome si riaccende e fuma
    let oven, ovenLight, smoke = [];
    {
        const [ox, oz] = P(RP.village[0] + 4, RP.village[1] + 6.5), y0 = ground(ox, oz);
        oven = add(new THREE.Mesh(geo(new THREE.SphereGeometry(1.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)), darkStone), ox, y0, oz);
        const mouth = add(new THREE.Mesh(geo(new THREE.CircleGeometry(0.32, 10)), mat({ color: '#1a0f08', emissive: '#ff6a1a', emissiveIntensity: 0, roughness: 1 })), ox, y0 + 0.32, oz);
        const [ax, az] = rivaPt(RP.village[0], RP.village[1]);
        mouth.lookAt(ax, y0 + 0.32, az); mouth.translateZ(1.06);
        oven.userData.mouth = mouth;
        ovenLight = new THREE.PointLight('#ff7a2a', 0, 8, 1.6);
        ovenLight.position.set(ox, y0 + 0.5, oz); g.add(ovenLight);
        circ(ox, oz, 1.15, y0 - 1, y0 + 1.1);
        for (let i = 0; i < 6; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: '#8a8494', transparent: true, opacity: 0, depthWrite: false })); disposables.push(s.material); s.userData.p = i / 6; g.add(s); smoke.push(s); }
        smoke.base = new THREE.Vector3(ox, y0 + 1.1, oz);
    }

    // =================================================================
    //  IL POZZO DEI NOMI: un anello di pietre, un telaio, un secchio senza corda
    //  Di notte respira: dal fondo sale nebbia, e c'è una luce grigia che trema
    // =================================================================
    const breath = [];
    let pozzoLight;
    {
        const [px, pz] = P(...RP.pozzo), y0 = ground(px, pz);
        add(new THREE.Mesh(geo(new THREE.CylinderGeometry(1.25, 1.35, 0.95, 14, 1, true)), mat({ color: '#4d4757', roughness: 0.95, flatShading: true, side: THREE.DoubleSide })), px, y0 + 0.45, pz);
        add(new THREE.Mesh(geo(new THREE.TorusGeometry(1.28, 0.16, 6, 16)), stone), px, y0 + 0.95, pz).rotation.x = Math.PI / 2;
        const dark = add(new THREE.Mesh(geo(new THREE.CircleGeometry(1.15, 16)), mat({ color: '#050308', roughness: 1 })), px, y0 + 0.55, pz);
        dark.rotation.x = -Math.PI / 2; dark.castShadow = false;
        for (const s of [-1, 1]) add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.14, 2.2, 0.14)), wood), px + s * 1.35 * TX, y0 + 1.1, pz + s * 1.35 * TZ);
        const bar = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.07, 0.07, 2.9, 8)), wood), px, y0 + 2.1, pz);
        bar.rotation.set(0, 0, Math.PI / 2); bar.rotation.y = JETTY_YAW + Math.PI / 2;
        const bucket = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.22, 0.17, 0.34, 10, 1, true)), mat({ color: '#4a3626', roughness: 0.9, side: THREE.DoubleSide })), px + 1.0 * -TZ, y0 + 1.15, pz + 1.0 * TX);
        bucket.rotation.z = 0.3;
        circ(px, pz, 1.45, y0 - 2, y0 + 1.05);
        pozzoLight = new THREE.PointLight('#a8b8d8', 3, 10, 1.6);
        pozzoLight.position.set(px, y0 + 0.9, pz); g.add(pozzoLight);
        for (let i = 0; i < 10; i++) {
            const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: '#b8b0d0', transparent: true, opacity: 0, depthWrite: false }));
            disposables.push(s.material); s.userData.p = i / 10; s.userData.a = i * 2.4; g.add(s); breath.push(s);
        }
        breath.base = new THREE.Vector3(px, y0 + 0.7, pz);
        interactables.push({ id: 'l2spot', k: 'pozzo', x: px, z: pz, y: y0, r: 3.2, label: () => app.l2?.rivaLabel('pozzo') || 'Il Pozzo dei Nomi' });
    }

    // =================================================================
    //  ALBERI E SASSI: alberi spogli piegati dal vento del mare aperto
    // =================================================================
    {
        const r = rng(101);
        const makeTree = (seed) => {
            const rr = rng(seed), geos = [];
            const branch = (pos, dir, len, rad, depth) => {
                const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
                geos.push(new THREE.CylinderGeometry(rad * 0.62, rad, len, 5, 1).translate(0, len / 2, 0).applyMatrix4(new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1))));
                if (depth <= 0) return;
                const end = pos.clone().addScaledVector(dir, len);
                for (let i = 0; i < (depth >= 3 ? 3 : 2); i++) {
                    const nd = dir.clone().add(new THREE.Vector3((rr() - 0.5) * 1.6 + 0.35, rr() * 0.5 + 0.1, (rr() - 0.5) * 1.6)).normalize();   // tutti un po' piegati dalla stessa parte
                    branch(end, nd, len * (0.55 + rr() * 0.2), rad * 0.6, depth - 1);
                }
            };
            branch(new THREE.Vector3(0, -0.3, 0), new THREE.Vector3(0.18, 1, (rr() - 0.5) * 0.2).normalize(), 2.4 + rr(), 0.24, 4);
            const m = mergeGeometries(geos); for (const q of geos) q.dispose(); return geo(m);
        };
        const treeMat = mat({ color: '#2b2321', roughness: 1 });
        const variants = [makeTree(5), makeTree(9), makeTree(14)], per = [[], [], []];
        const free = (u, v, x, z, h) => h > 0.8 && h < 14 && pathDistUV(u, v) > 3 && Math.hypot(u - RP.village[0], v - RP.village[1]) > 19 && Math.hypot(u - RP.landing[0], v - RP.landing[1]) > 15
            && Math.hypot(u - RP.pozzo[0], v - RP.pozzo[1]) > 8 && Math.hypot(u - RP.spiaggia[0], v - RP.spiaggia[1]) > 5;
        let tries = 0;
        while (per[0].length + per[1].length + per[2].length < 70 && tries++ < 3000) {
            const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 78, u = Math.cos(a) * d, v = Math.sin(a) * d;
            const [x, z] = P(u, v), h = ground(x, z);
            if (!free(u, v, x, z, h)) continue;
            per[Math.floor(r() * 3)].push([x, z, h, 0.7 + r() * 0.7, r() * Math.PI * 2]);
        }
        const m4 = new THREE.Matrix4(), yawQ = new THREE.Quaternion(), wind = JETTY_YAW + Math.PI / 2;
        variants.forEach((vg, vi) => {
            const list = per[vi];
            const im = new THREE.InstancedMesh(vg, treeMat, list.length);
            list.forEach(([x, z, y, s], i) => {
                yawQ.setFromEuler(new THREE.Euler(0, wind + (i % 5 - 2) * 0.25, 0));
                im.setMatrixAt(i, m4.compose(new THREE.Vector3(x, y, z), yawQ, new THREE.Vector3(s, s, s)));
                circ(x, z, 0.26 * s, y - 1, y + 6, { noWalk: true });
            });
            im.castShadow = im.receiveShadow = true;
            g.add(im);
        });
        const rockG = geo(new THREE.DodecahedronGeometry(1, 0));
        const rocks = [];
        tries = 0;
        while (rocks.length < 90 && tries++ < 3000) {
            const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 92, u = Math.cos(a) * d, v = Math.sin(a) * d;
            const [x, z] = P(u, v), h = ground(x, z);
            if (h < -1.3 || pathDistUV(u, v) < 3 || Math.hypot(u - RP.village[0], v - RP.village[1]) < 18 || Math.hypot(u - RP.landing[0], v - RP.landing[1]) < 14 || Math.abs(v) < 3 && u > 60) continue;
            if (Math.hypot(u - RP.pozzo[0], v - RP.pozzo[1]) < 5) continue;
            rocks.push([x, h, z, 0.3 + r() * (h < 0.5 ? 1.2 : h > 12 ? 1.6 : 0.7), r()]);
        }
        const im = new THREE.InstancedMesh(rockG, darkStone, rocks.length);
        rocks.forEach(([x, y, z, s, q], i) => {
            im.setMatrixAt(i, m4.compose(new THREE.Vector3(x, y - s * 0.35, z), yawQ.setFromEuler(new THREE.Euler(q * 3, q * 7, q * 2)), new THREE.Vector3(s, s * 0.7, s)));
            if (s > 0.7) circ(x, z, s * 0.8, y - 1, y + s * 0.45);
        });
        im.castShadow = im.receiveShadow = true;
        g.add(im);
    }

    // i Senza Nome: presenze pallide che girano fra le case e non trovano la porta giusta
    const wisps = [];
    for (let i = 0; i < 7; i++) {
        const s = sprite('#cfd6ff', 0.9, 0.5);
        s.userData = { a: i * 0.9, rad: 4 + (i % 3) * 3, sp: 0.12 + (i % 4) * 0.04 };
        g.add(s); wisps.push(s);
    }

    // =================================================================
    //  LA STORIA SI VEDE: finestre, forno, pozzo, lanterna, filo di luce
    // =================================================================
    let lastAt = -1;
    const refresh = () => {
        const at = l2At(st());
        if (at === lastAt) return;
        lastAt = at;
        const tobia = at >= L2AT(8), names = at >= L2AT(9, 3), pozzoFree = at >= L2AT(8, 4);
        // la mappa tiene dal capitolo II (Libro III) in poi
        const held = at >= L2AT(7);
        mapSheet.material.map = held ? mapTex : null; mapSheet.material.color.set(held ? '#ffffff' : '#e8e0c4'); mapSheet.material.needsUpdate = true;
        windowLit.emissiveIntensity = names ? 1.5 : 0;
        for (const hh of huts) hh.cl.intensity = hh.i === 4 ? (tobia ? 6 : 0) : names ? 4 : 0;
        // la casa 4 è quella di Tobia
        windowTobia.emissiveIntensity = tobia ? 1.6 : 0;
        ovenLight.intensity = tobia ? 8 : 0;
        oven.userData.mouth.material.emissiveIntensity = tobia ? 1.4 : 0;
        smoke.on = tobia;
        breath.k = pozzoFree ? 0.25 : 1;
        pozzoLight.intensity = pozzoFree ? 1 : 3;
        lumeLight.intensity = names ? 22 : 10;
        lumeGlow.scale.setScalar(names ? 6 : 3.2);
        lumeCore.material.color.set(names ? '#ffe9a0' : '#ffd27a');
        thread.visible = names;
    };
    let time = 0, surfT = 2, refreshT = 0;
    const tick = (dt) => {
        time += dt;
        if ((refreshT -= dt) <= 0) { refreshT = 0.5; refresh(); }
        for (const f of ticks) f(dt);
        const night = 1 - (W.envS?.day ?? 0);
        lumeGlow.material.opacity = 0.42 + Math.sin(time * 2.1) * 0.06 + Math.random() * 0.04;
        if (thread.visible) thread.material.opacity = 0.35 + 0.2 * Math.sin(time * 1.3);
        // il pozzo respira: più forte di notte, quasi niente quando i nomi sono usciti
        for (const s of breath) {
            const p = (s.userData.p + time * 0.07) % 1, a = s.userData.a + time * 0.2;
            s.position.set(breath.base.x + Math.cos(a) * p * 1.6, breath.base.y + p * 6, breath.base.z + Math.sin(a) * p * 1.6);
            s.scale.setScalar(1.2 + p * 5);
            s.material.opacity = Math.sin(p * Math.PI) * 0.22 * (0.35 + 0.65 * night) * (breath.k ?? 1);
        }
        for (const s of smoke) {
            const p = (s.userData.p + time * 0.1) % 1;
            s.position.set(smoke.base.x + p * 0.8, smoke.base.y + p * 4, smoke.base.z);
            s.scale.setScalar(0.5 + p * 2.2);
            s.material.opacity = smoke.on ? Math.sin(p * Math.PI) * 0.25 : 0;
        }
        const [vx, vz] = P(...RP.village);
        for (const s of wisps) {
            const u = s.userData, a = u.a + time * u.sp;
            s.position.set(vx + Math.cos(a) * u.rad, 3.1 + Math.sin(time * 0.9 + u.a) * 0.3, vz + Math.sin(a * 1.3) * u.rad);
            s.material.opacity = (0.15 + 0.3 * night) * (lastAt >= L2AT(9, 3) ? 0.3 : 1);
        }
        surfT -= dt;
        const PP = app.player?.pos;
        if (surfT <= 0 && PP) {
            surfT = 3 + Math.random() * 3;
            const [u, v] = rivaUV(PP.x, PP.z), a = Math.atan2(v, u), [sx, sz] = P(Math.cos(a) * RIVA.r, Math.sin(a) * RIVA.r);
            if (Math.hypot(PP.x - sx, PP.z - sz) < 45) app.audio?.play('surf', { x: sx, z: sz, vol: 0.6 });
        }
    };
    refresh();
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
            const gi = W.grassX.indexOf(grass);
            if (gi >= 0) W.grassX.splice(gi, 1);
            for (const m of grass.meshes) { W.scene.remove(m); m.geometry.dispose(); }
            for (const m of grass.mats) { m.uniforms.uMap.value?.dispose(); m.dispose(); }
            for (const f of fires) { const k = W.fires.mats.indexOf(f.material); if (k >= 0) W.fires.mats.splice(k, 1); f.geometry.dispose(); f.material.dispose(); }
            for (const d of disposables) d.dispose();
        },
    };
}
