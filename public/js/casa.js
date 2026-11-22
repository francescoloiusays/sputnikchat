// =====================================================================
//  LA CASA DEL CANTIERE (solo client)
//  - Casa: disegna la tua casa sul lotto del cantiere (muri, porte,
//    finestre, pavimenti, arredi, il tetto) e la rende un interno.
//    Ognuno vede la sua: il lotto è lo stesso, la casa è di chi guarda.
//  - CasaEditor: la modalità «costruisci», dall'alto, con la griglia.
//    Si sceglie lo strumento, si clicca sulla griglia; il conto delle
//    modifiche è sempre in vista. «Salva» paga (o rende metà).
// =====================================================================
import * as THREE from 'three';
import { GW, GD, LOTTO, WALL_H, MURI, APERTURE, PAVIMENTI, ARREDI, casaValue, itemCells, cleanCasa, edgeCost } from './shared/casa.js';
import { MATS } from './shared/catalog.js';
import { h, toast } from './util.js';
import { iconSVG } from './icons.js';

const T = 0.16;          // spessore dei muri
const mats = new Map();
const M = (color, o = {}) => { const k = color + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o })); return mats.get(k); };
const glassM = new THREE.MeshStandardMaterial({ color: '#cfe4ff', transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
const wx = (x) => LOTTO.x + x, wz = (z) => LOTTO.z + z;

// --- un arredo, fatto di scatole: centrato nel suo ingombro, guarda verso +z ---
function arredo(id, W) {
    const g = new THREE.Group(), add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
    const wood = W?.matWood || M('#7a5a3a'), dark = M('#3a2a1e'), cloth = M('#6a2a3a'), white = M('#e8e0d0');
    switch (id) {
        case 'letto': add(new THREE.BoxGeometry(0.9, 0.35, 1.9), wood, 0, 0.2, 0); add(new THREE.BoxGeometry(0.86, 0.14, 1.8), white, 0, 0.44, 0.02); add(new THREE.BoxGeometry(0.88, 0.1, 1.2), cloth, 0, 0.53, 0.32); add(new THREE.BoxGeometry(0.6, 0.12, 0.3), white, 0, 0.55, -0.72); add(new THREE.BoxGeometry(0.9, 0.8, 0.08), wood, 0, 0.45, -0.95); break;
        case 'tavolo': add(new THREE.BoxGeometry(1.8, 0.06, 0.8), wood, 0, 0.76, 0); for (const [x, z] of [[-0.8, -0.32], [0.8, -0.32], [-0.8, 0.32], [0.8, 0.32]]) add(new THREE.BoxGeometry(0.07, 0.74, 0.07), wood, x, 0.37, z); break;
        case 'sedia': add(new THREE.BoxGeometry(0.45, 0.05, 0.45), wood, 0, 0.45, 0); add(new THREE.BoxGeometry(0.45, 0.5, 0.05), wood, 0, 0.7, -0.2); for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) add(new THREE.BoxGeometry(0.05, 0.45, 0.05), wood, x, 0.22, z); break;
        case 'camino': { add(new THREE.BoxGeometry(1.8, 1.1, 0.6), M('#6a6470', { flatShading: true }), 0, 0.55, -0.2); add(new THREE.BoxGeometry(1.0, 0.6, 0.1), M('#140c08'), 0, 0.4, 0.11); add(new THREE.BoxGeometry(1.0, 1.6, 0.5), M('#6a6470', { flatShading: true }), 0, 1.9, -0.25); add(new THREE.BoxGeometry(2.0, 0.1, 0.7), wood, 0, 1.12, -0.15);
            const f = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 8), new THREE.MeshBasicMaterial({ color: '#ff8a2a', transparent: true, opacity: 0.9 })); f.position.set(0, 0.32, 0.05); g.add(f); g.userData.light = { y: 0.5, z: 0.4, color: '#ff8a3a', i: 6 }; break; }
        case 'libreria': add(new THREE.BoxGeometry(1.8, 2.0, 0.4), wood, 0, 1.0, -0.28); for (let i = 0; i < 4; i++) for (let j = 0; j < 9; j++) add(new THREE.BoxGeometry(0.12, 0.32, 0.26), M(['#7a1018', '#1d2a6b', '#2f4a24', '#8a6a3a', '#5a2a6e'][(i * 3 + j) % 5]), -0.75 + j * 0.19, 0.25 + i * 0.48, -0.22); break;
        case 'baule': add(new THREE.BoxGeometry(0.8, 0.5, 0.5), wood, 0, 0.25, 0); add(new THREE.CylinderGeometry(0.25, 0.25, 0.8, 10, 1, false, 0, Math.PI), wood, 0, 0.5, 0).rotation.z = Math.PI / 2; add(new THREE.BoxGeometry(0.82, 0.06, 0.06), M('#c8963a', { metalness: 0.8 }), 0, 0.3, 0.26); break;
        case 'tappeto': add(new THREE.BoxGeometry(1.8, 0.02, 1.8), M('#5a1a2e'), 0, 0.02, 0); add(new THREE.BoxGeometry(1.4, 0.025, 1.4), M('#c99a2e'), 0, 0.022, 0); add(new THREE.BoxGeometry(1.0, 0.03, 1.0), M('#2b3a6b'), 0, 0.025, 0); break;
        case 'lampada': add(new THREE.CylinderGeometry(0.12, 0.16, 0.06, 10), dark, 0, 0.03, 0); add(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6), dark, 0, 0.72, 0); add(new THREE.CylinderGeometry(0.18, 0.28, 0.3, 12, 1, true), M('#ffe0a0', { emissive: '#ffb347', emissiveIntensity: 1.2, side: THREE.DoubleSide }), 0, 1.45, 0); g.userData.light = { y: 1.4, z: 0, color: '#ffcf8a', i: 7 }; break;
        case 'pianta': add(new THREE.CylinderGeometry(0.18, 0.14, 0.35, 12), M('#a0523a'), 0, 0.17, 0); for (let i = 0; i < 6; i++) { const l = add(new THREE.SphereGeometry(0.18, 8, 6), M('#3a6a2a'), Math.cos(i) * 0.12, 0.5 + (i % 3) * 0.14, Math.sin(i) * 0.12); l.scale.set(0.7, 1.3, 0.5); l.rotation.z = i; } break;
        case 'acquario': add(new THREE.BoxGeometry(0.6, 0.7, 0.4), dark, 0, 0.35, 0); add(new THREE.BoxGeometry(0.62, 0.42, 0.42), M('#5aa8c8', { transparent: true, opacity: 0.5, emissive: '#2a6a8a', emissiveIntensity: 0.6 }), 0, 0.92, 0); for (let i = 0; i < 3; i++) add(new THREE.SphereGeometry(0.04, 6, 4), M('#ff8a2a', { emissive: '#ff6a1a', emissiveIntensity: 0.6 }), -0.15 + i * 0.15, 0.9 + (i % 2) * 0.1, 0); break;
        case 'trofeo': add(new THREE.BoxGeometry(0.8, 0.9, 0.06), wood, 0, 1.4, -0.45); add(new THREE.BoxGeometry(0.9, 0.06, 0.06), M('#c8c8d0', { metalness: 0.9, roughness: 0.3 }), 0, 1.5, -0.4).rotation.z = 0.7; add(new THREE.BoxGeometry(0.9, 0.06, 0.06), M('#c8c8d0', { metalness: 0.9, roughness: 0.3 }), 0, 1.5, -0.4).rotation.z = -0.7; add(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 16), M('#7a1018'), 0, 1.5, -0.38).rotation.x = Math.PI / 2; break;
        case 'tecnigrafo': { add(new THREE.BoxGeometry(0.08, 0.9, 0.08), dark, 0, 0.45, 0); add(new THREE.BoxGeometry(0.6, 0.05, 0.4), dark, 0, 0.03, 0); const b = add(new THREE.BoxGeometry(0.9, 0.04, 0.65), M('#e8e2d0'), 0, 0.98, 0.05); b.rotation.x = -0.5; const p = add(new THREE.BoxGeometry(0.8, 0.01, 0.55), M('#f3eedc', { emissive: '#3a3020', emissiveIntensity: 0.3 }), 0, 1.0, 0.06); p.rotation.x = -0.5; add(new THREE.BoxGeometry(0.6, 0.015, 0.03), M('#c8963a', { metalness: 0.8 }), 0, 1.03, 0.0).rotation.set(-0.5, 0, 0.5); break; }
    }
    return g;
}

// --- tutta la casa, in un gruppo (e i suoi collider) ---
export function buildCasa(L, W, { ghost = false } = {}) {
    const g = new THREE.Group(), cols = [], lights = [];
    g.position.set(LOTTO.x, LOTTO.y, LOTTO.z);
    const box = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
    const col = (x, z, w, d, y0, y1) => cols.push({ type: 'box', x: wx(x), z: wz(z), hw: w / 2, hd: d / 2, cos: 1, sin: 0, y0: LOTTO.y + y0, y1: LOTTO.y + y1, casa: true });
    // il pavimento: una base, e le caselle colorate
    box(new THREE.BoxGeometry(GW + 0.4, 0.2, GD + 0.4), M('#5a5050'), GW / 2, -0.1, GD / 2);
    for (const [k, f] of Object.entries(L.floor || {})) { const [x, z] = k.split(',').map(Number); box(new THREE.BoxGeometry(0.995, 0.04, 0.995), M(PAVIMENTI[f].color), x + 0.5, 0.02, z + 0.5).castShadow = false; }
    col(GW / 2, GD / 2, GW + 0.4, GD + 0.4, -2, 0.04);
    // i muri sui bordi
    for (const [k, t] of Object.entries(L.edges || {})) {
        const [o, xs, zs] = k.split(','), x = +xs, z = +zs, [ap, mat] = t.split(':'), m = M(MURI[mat].color, mat === 'pietra' ? { flatShading: true } : {});
        const hor = o === 'h', cx = hor ? x + 0.5 : x, cz = hor ? z : z + 0.5;
        const seg = (len, y0, y1) => box(hor ? new THREE.BoxGeometry(len, y1 - y0, T) : new THREE.BoxGeometry(T, y1 - y0, len), m, cx, (y0 + y1) / 2, cz);
        if (ap === 'muro') { seg(1.0 + T, 0, WALL_H); col(cx, cz, hor ? 1 : T, hor ? T : 1, 0, WALL_H); }
        else if (ap === 'finestra') {
            seg(1.0 + T, 0, 0.95); seg(1.0 + T, 2.0, WALL_H);
            for (const s of [-1, 1]) box(hor ? new THREE.BoxGeometry(0.1, 1.05, T) : new THREE.BoxGeometry(T, 1.05, 0.1), m, cx + (hor ? s * 0.45 : 0), 1.475, cz + (hor ? 0 : s * 0.45));
            const gl = box(hor ? new THREE.PlaneGeometry(0.8, 1.05) : new THREE.PlaneGeometry(0.8, 1.05), glassM, cx, 1.475, cz); gl.castShadow = false; if (!hor) gl.rotation.y = Math.PI / 2;
            col(cx, cz, hor ? 1 : T, hor ? T : 1, 0, WALL_H);
        } else {   // porta: stipiti e architrave, si passa
            seg(1.0 + T, 2.15, WALL_H);
            for (const s of [-1, 1]) box(hor ? new THREE.BoxGeometry(0.08, 2.15, T + 0.04) : new THREE.BoxGeometry(T + 0.04, 2.15, 0.08), M('#3a2a1e'), cx + (hor ? s * 0.46 : 0), 1.075, cz + (hor ? 0 : s * 0.46));
            const leaf = box(hor ? new THREE.BoxGeometry(0.06, 2.1, 0.8) : new THREE.BoxGeometry(0.8, 2.1, 0.06), M('#5a3a24'), cx + (hor ? -0.42 : 0.4), 1.05, cz + (hor ? 0.4 : -0.42));   // il battente, aperto
            leaf.castShadow = false;
        }
    }
    // il tetto: una piramide di coppi sopra tutto il lotto, e un soffitto di travi
    if (!ghost) {
        const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1.6, 4, 1), M('#8a4a32', { flatShading: true }));
        roof.rotation.y = Math.PI / 4; roof.scale.set((GW + 0.8) / Math.SQRT2, 1, (GD + 0.8) / Math.SQRT2);
        roof.position.set(GW / 2, WALL_H + 0.8, GD / 2); roof.castShadow = true; g.add(roof);
        const ceil = new THREE.Mesh(new THREE.PlaneGeometry(GW, GD), W?.matWood || M('#6a4a30')); ceil.rotation.x = Math.PI / 2; ceil.position.set(GW / 2, WALL_H - 0.02, GD / 2); g.add(ceil);
        g.userData.roof = [roof, ceil];
    }
    // gli arredi
    for (const it of L.items || []) {
        const A = ARREDI[it.id], cells = itemCells(it);
        const xs = cells.map(c => c[0]), zs = cells.map(c => c[1]);
        const x0 = Math.min(...xs), x1 = Math.max(...xs) + 1, z0 = Math.min(...zs), z1 = Math.max(...zs) + 1;
        const m = arredo(it.id, W); m.position.set((x0 + x1) / 2, 0.04, (z0 + z1) / 2); m.rotation.y = -it.r * Math.PI / 2;
        g.add(m);
        if (m.userData.light && lights.length < 3 && !ghost) {
            const L2 = m.userData.light, pl = new THREE.PointLight(L2.color, L2.i, 7, 1.6);
            pl.position.set(m.position.x, L2.y, m.position.z); g.add(pl); lights.push(pl);
        }
        if (!A.flat) col((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0 - 0.15, z1 - z0 - 0.15, 0, it.id === 'tappeto' ? 0.03 : 1.0);
        g.userData.items = (g.userData.items || []).concat([{ it, x: wx((x0 + x1) / 2), z: wz((z0 + z1) / 2) }]);
    }
    if (!ghost && !lights.length) { const pl = new THREE.PointLight('#ffd8a0', 8, 10, 1.6); pl.position.set(GW / 2, WALL_H - 0.4, GD / 2); g.add(pl); }
    return { g, cols };
}

// =====================================================================
//  LA CASA NEL MONDO
// =====================================================================
export class Casa {
    constructor(app) { this.app = app; this.key = null; this.built = null; this.interior = null; this.its = []; }
    clear() {
        const W = this.app.world;
        if (this.built) {
            this.app.scene.remove(this.built.g);
            for (const c of this.built.cols) { const i = W.colliders.indexOf(c); if (i >= 0) W.colliders.splice(i, 1); }
        }
        for (const it of this.its) { const i = W.interactables.indexOf(it); if (i >= 0) W.interactables.splice(i, 1); }
        this.its = [];
        if (this.interior) { this.app.interiors?.remove(this.interior); this.interior = null; }
        this.built = null;
    }
    refresh() {
        const app = this.app, W = app.world, L = app.me && !app.me.offline ? app.me.casa : null;
        const key = L ? JSON.stringify(L) : null;
        if (key === this.key) return;
        this.key = key;
        this.clear();
        // il cantiere di Rob resta com'è finché la casa non è tua
        if (W.cantiere) {
            W.cantiere.g.visible = !L;
            for (const c of W.cantiere.cols) { const i = W.colliders.indexOf(c); if (L && i >= 0) W.colliders.splice(i, 1); else if (!L && i < 0) W.colliders.push(c); }
        }
        if (!L || app.casaEditor?.on) return;
        this.built = buildCasa(L, W);
        app.scene.add(this.built.g);
        W.colliders.push(...this.built.cols);
        this.interior = app.interiors?.add({ name: 'La tua casa', outName: 'Le Terre Nuove', x: LOTTO.x + GW / 2, z: LOTTO.z + GD / 2, ry: 0, y: LOTTO.y, w: GW, d: GD, h: WALL_H - 0.1, groups: [this.built.g], camDist: 3 });
        // davanti alla casa, e al tecnigrafo dentro: «progetta la casa»
        const add = (x, z, y, label) => { const it = { id: 'casa', x, z, y, r: 2, label }; W.interactables.push(it); this.its.push(it); };
        add(LOTTO.x + GW / 2, LOTTO.z + GD + 1.6, W.groundAt(LOTTO.x + GW / 2, LOTTO.z + GD + 1.6), 'La tua casa: costruisci e arreda');
        for (const o of this.built.g.userData.items || []) if (o.it.id === 'tecnigrafo') add(o.x, o.z, LOTTO.y, 'Il tecnigrafo di Rob: progetta la casa');
    }
}

// =====================================================================
//  COSTRUISCI: la casa vista dall'alto, con la griglia
// =====================================================================
const TOOLS = [
    { cat: 'Muri', items: Object.keys(MURI).map(m => ({ id: `muro:${m}`, name: MURI[m].name, kind: 'edge', color: MURI[m].color })) },
    { cat: 'Porte e finestre', items: [...Object.keys(MURI).map(m => ({ id: `porta:${m}`, name: `Porta (${MURI[m].name.toLowerCase()})`, kind: 'edge', color: MURI[m].color })), ...Object.keys(MURI).map(m => ({ id: `finestra:${m}`, name: `Finestra (${MURI[m].name.toLowerCase()})`, kind: 'edge', color: MURI[m].color }))] },
    { cat: 'Pavimenti', items: Object.keys(PAVIMENTI).map(f => ({ id: f, name: PAVIMENTI[f].name, kind: 'floor', color: PAVIMENTI[f].color })) },
    { cat: 'Arredi', items: Object.keys(ARREDI).filter(a => !ARREDI[a].gift).map(a => ({ id: a, name: ARREDI[a].name, kind: 'item' })) },
];
const costText = (c) => Object.entries(c).filter(([, n]) => n).map(([k, n]) => `${n} ${k === 'coins' ? 'monete' : (MATS[k]?.name || k)}`).join(', ') || 'gratis';

export class CasaEditor {
    constructor(app) { this.app = app; this.on = false; }
    open() {
        const app = this.app;
        if (!app.me?.casa) return toast('La casa non è ancora tua', { kind: 'bad' });
        if (this.on) return;
        this.on = true;
        this.orig = JSON.parse(JSON.stringify(app.me.casa));
        this.L = JSON.parse(JSON.stringify(app.me.casa));
        this.tool = TOOLS[0].items[1]; this.cat = 0; this.rot = 0;
        this.prevMode = app.mode; app.mode = 'build';
        app.panels.close?.(); document.exitPointerLock?.();
        document.getElementById('click-to-play')?.classList.add('hidden');
        if (app.interior) app.interiors.leave(true);
        // nascondi la casa vera: si lavora sul progetto
        if (app.casa?.built) app.casa.built.g.visible = false;
        this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -LOTTO.y);
        this.grid = new THREE.GridHelper(Math.max(GW, GD), Math.max(GW, GD), '#ffd890', '#ffd890');
        this.grid.position.set(LOTTO.x + Math.max(GW, GD) / 2, LOTTO.y + 0.06, LOTTO.z + Math.max(GW, GD) / 2);
        this.grid.material.transparent = true; this.grid.material.opacity = 0.35; this.grid.material.depthWrite = false;
        app.scene.add(this.grid);
        this.hl = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 1), new THREE.MeshBasicMaterial({ color: '#7affd8', transparent: true, opacity: 0.45, depthWrite: false }));
        app.scene.add(this.hl);
        // la telecamera: dall'alto, un po' inclinata, verso la casa
        this.ang = 0.35; this.zoom = 1;
        app.camOverride = () => {
            const cx = LOTTO.x + GW / 2, cz = LOTTO.z + GD / 2, r = 11 * this.zoom;
            app.camera.position.set(cx + Math.sin(this.ang) * r * 0.75, LOTTO.y + 10 * this.zoom, cz + Math.cos(this.ang) * r * 0.75);
            app.camera.lookAt(cx, LOTTO.y, cz);
        };
        this.ui = h('div', { id: 'casa-ui' });
        document.body.append(this.ui);
        this.onMove = (e) => this.pointer(e, false);
        this.onDown = (e) => { if (e.target.closest?.('#casa-ui')) return; this.pointer(e, true, e.button === 2); };
        this.onKey = (e) => { if (!this.on) return; if (e.code === 'KeyR') { this.rot = (this.rot + 1) & 3; this.paint(); } if (e.code === 'Escape') this.close(false); if (e.code === 'KeyQ') this.ang -= 0.3; if (e.code === 'KeyE') this.ang += 0.3; };
        this.onWheel = (e) => { if (e.target.closest?.('#casa-ui')) return; this.zoom = Math.max(0.6, Math.min(1.6, this.zoom + Math.sign(e.deltaY) * 0.1)); };
        this.onCtx = (e) => { if (this.on) e.preventDefault(); };
        addEventListener('pointermove', this.onMove); addEventListener('pointerdown', this.onDown); addEventListener('keydown', this.onKey, true); addEventListener('wheel', this.onWheel); addEventListener('contextmenu', this.onCtx);
        this.redraw(); this.paint();
        toast('Clicca sulla griglia per costruire · tasto destro o la Gomma per togliere · R ruota gli arredi · Q/E girano la vista', { icon: 'hammer', duration: 9000 });
    }
    close(save) {
        const app = this.app;
        if (!this.on) return;
        const finish = () => {
            this.on = false;
            removeEventListener('pointermove', this.onMove); removeEventListener('pointerdown', this.onDown); removeEventListener('keydown', this.onKey, true); removeEventListener('wheel', this.onWheel); removeEventListener('contextmenu', this.onCtx);
            app.scene.remove(this.grid); app.scene.remove(this.hl); if (this.preview) app.scene.remove(this.preview.g);
            this.ui.remove(); app.camOverride = null; app.mode = 'world';
            if (app.casa?.built) app.casa.built.g.visible = true;
            app.casa.key = null; app.casa.refresh();
            if (!('ontouchstart' in window)) document.getElementById('click-to-play')?.classList.remove('hidden');
        };
        if (!save) return finish();
        app.net.request('casa:save', { casa: this.L }).then(r => {
            if (!r.ok) { toast(r.msg || 'Non si può', { kind: 'bad' }); return; }
            app.me.casa = cleanCasa(this.L);
            app.audio.play('anvil');
            const back = costText(r.back || {});
            toast(h('div', {}, h('b', {}, 'La casa è fatta'), h('div', {}, `${Object.keys(r.pay || {}).length ? 'Pagato: ' + costText(r.pay) + '. ' : ''}${Object.keys(r.back || {}).length ? 'Ti torna: ' + back + '.' : ''}`)), { kind: 'coin', icon: 'hammer', duration: 7000 });
            finish();
        });
    }
    // dal mouse alla griglia
    pointer(e, click, erase) {
        const app = this.app, rect = app.renderer.domElement.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1, ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this.ray.setFromCamera({ x: nx, y: ny }, app.camera);
        const p = new THREE.Vector3();
        if (!this.ray.ray.intersectPlane(this.plane, p)) return;
        const gx = p.x - LOTTO.x, gz = p.z - LOTTO.z;
        if (gx < -0.3 || gz < -0.3 || gx > GW + 0.3 || gz > GD + 0.3) { this.hl.visible = false; return; }
        const gomma = erase || this.tool.id === '_gomma';
        const fx = gx - Math.floor(gx), fz = gz - Math.floor(gz), dH = Math.min(fz, 1 - fz), dV = Math.min(fx, 1 - fx);
        // la gomma toglie un muro se sei vicino a un bordo, altrimenti l'arredo o il pavimento della casella
        const t = gomma ? { kind: Math.min(dH, dV) < 0.22 ? 'edge' : 'cell' } : this.tool;
        let target;
        if (t.kind === 'edge') {
            if (dH < dV) { const x = Math.min(GW - 1, Math.max(0, Math.floor(gx))), z = Math.min(GD, Math.max(0, Math.round(gz))); target = { key: `h,${x},${z}`, cx: x + 0.5, cz: z, w: 1, d: 0.25 }; }
            else { const x = Math.min(GW, Math.max(0, Math.round(gx))), z = Math.min(GD - 1, Math.max(0, Math.floor(gz))); target = { key: `v,${x},${z}`, cx: x, cz: z + 0.5, w: 0.25, d: 1 }; }
        } else {
            const x = Math.min(GW - 1, Math.max(0, Math.floor(gx))), z = Math.min(GD - 1, Math.max(0, Math.floor(gz)));
            target = { cell: [x, z], cx: x + 0.5, cz: z + 0.5, w: 1, d: 1 };
            if (t.kind === 'item' && !gomma) { const A = ARREDI[t.id], w = this.rot % 2 ? A.d : A.w, d = this.rot % 2 ? A.w : A.d; target.cx = x + w / 2; target.cz = z + d / 2; target.w = w; target.d = d; }
        }
        this.hl.visible = true; this.hl.scale.set(target.w, 1, target.d); this.hl.position.set(LOTTO.x + target.cx, LOTTO.y + 0.08, LOTTO.z + target.cz);
        this.hl.material.color.set(gomma ? '#ff6a6a' : '#7affd8');
        if (!click) return;
        const L = this.L;
        if (gomma) {
            if (target.key) delete L.edges[target.key];
            else {
                const [x, z] = target.cell, i = L.items.findIndex(it => itemCells(it).some(c => c[0] === x && c[1] === z));
                if (i >= 0) L.items.splice(i, 1); else delete L.floor[`${x},${z}`];
            }
        } else if (t.kind === 'edge') L.edges[target.key] = t.id;
        else if (t.kind === 'floor') L.floor[`${target.cell[0]},${target.cell[1]}`] = t.id;
        else if (t.kind === 'item') {
            const it = { id: t.id, x: target.cell[0], z: target.cell[1], r: this.rot };
            const test = cleanCasa({ ...L, items: [...L.items, it] });
            if (!test) { toast('Lì non ci sta: è occupato o esce dal lotto', { kind: 'bad', duration: 2500 }); return; }
            L.items.push(it);
        }
        app.audio.play('wood');
        this.redraw(); this.paint();
    }
    redraw() {
        const app = this.app;
        if (this.preview) { app.scene.remove(this.preview.g); }
        this.preview = buildCasa(this.L, app.world, { ghost: true });
        app.scene.add(this.preview.g);
    }
    // la barra degli strumenti, con il conto delle modifiche
    paint() {
        const app = this.app, before = casaValue(this.orig), after = casaValue(this.L), pay = {}, back = {};
        for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) { const d = (after[k] || 0) - (before[k] || 0); if (d > 0) pay[k] = d; else if (d < 0) back[k] = Math.floor(-d / 2); }
        const C = TOOLS[this.cat];
        this.ui.replaceChildren(
            h('div', { class: 'casa-cats' }, TOOLS.map((c, i) => h('button', { class: 'chip' + (i === this.cat ? ' sel' : ''), onclick: () => { this.cat = i; this.tool = c.items[0]; this.paint(); } }, c.cat)),
                h('button', { class: 'chip' + (this.tool.id === '_gomma' ? ' sel' : ''), onclick: () => { this.tool = { id: '_gomma', kind: 'item', name: 'Gomma' }; this.paint(); } }, 'Gomma')),
            h('div', { class: 'casa-tools' }, C.items.map(t => h('button', { class: 'casa-tool' + (this.tool.id === t.id ? ' sel' : ''), title: t.name, onclick: () => { this.tool = t; this.paint(); } },
                h('span', { class: 'sw', style: { background: t.color || '#c8b088' } }), h('b', {}, t.name), h('small', {}, costText(t.kind === 'edge' ? edgeCost(t.id) : t.kind === 'floor' ? PAVIMENTI[t.id].cost : ARREDI[t.id].cost))))),
            h('div', { class: 'casa-bar' },
                h('span', { class: 'grow' }, `Da pagare: ${costText(pay)}${Object.keys(back).length ? ' · ti torna: ' + costText(back) : ''}`),
                h('button', { class: 'btn btn-sm', onclick: () => { this.rot = (this.rot + 1) & 3; this.paint(); } }, `Ruota (${['↑', '→', '↓', '←'][this.rot]})`),
                h('button', { class: 'btn btn-sm', onclick: () => this.close(false) }, 'Annulla'),
                h('button', { class: 'btn btn-sm btn-primary', onclick: () => this.close(true) }, 'Salva la casa')));
    }
}
