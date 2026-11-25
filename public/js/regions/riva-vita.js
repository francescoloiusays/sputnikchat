// =====================================================================
//  LA RIVA VIVA (solo client): la gente tornata alla Riva di Là
//  Sei abitanti che camminano per il villaggio (shared/riva-vita.js), il
//  banco del pesce di Ottavia, i panni stesi di Rosalba, le galline, le
//  lanterne lungo il sentiero; e i tre giochi: il forno di Tobia, i sassi
//  sull'acqua con i gemelli, la mappa a memoria con la Cartografa.
//  Si costruisce insieme alla Riva (regions/riva.js) e se ne va con lei.
// =====================================================================
import * as THREE from 'three';
import { RP, HUTS, rivaPt } from '../shared/riva.js';
import { RIVANI, RIVANO_IDS, RIVA_GAMES, rivanoAt } from '../shared/riva-vita.js';
import { Character } from '../character.js';
import { characterLod } from '../engine/stream.js';
import { walkTo } from '../npc-walk.js';
import { h, toast } from '../util.js';
import { iconSVG } from '../icons.js';

const lerpAngle = (a, b, t) => { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * t; };

export function buildRivaVita(app, C) {
    const W = app.world, { g, add, mat, geo, box, circ, ground, P, interactables, wood } = C;
    const people = [], cloths = [], hens = [], lamps = [];
    const [VU, VV] = RP.village;

    // --- gli abitanti ---
    for (const id of RIVANO_IDS) {
        const R = RIVANI[id];
        const ch = new Character({ sex: R.sex, ...R.app }, R.look || {}, { name: R.name, sub: R.where, color: '#f0d890' });
        app.scene.add(ch.root);
        const it = { id: 'rivano', k: id, x: 0, z: 0, r: 2.4, label: `Parla con ${R.name}` };
        interactables.push(it);
        people.push({ id, R, ch, it, ry: 0, stop: 0, wk: false });
    }

    // --- il banco del pesce di Ottavia, sul sentiero dall'approdo ---
    {
        const [sx, sz] = P(45, -11.5), y0 = ground(sx, sz), yaw = Math.atan2(...(() => { const [a, b] = P(40, -12); return [a - sx, b - sz]; })());
        const sg = new THREE.Group(); sg.position.set(sx, y0, sz); sg.rotation.y = yaw; g.add(sg);
        const m = (o) => mat(o);
        add(new THREE.Mesh(geo(new THREE.BoxGeometry(2.2, 0.08, 0.9)), wood), 0, 0.85, 0, sg);
        for (const [x, z] of [[-1, -0.38], [1, -0.38], [-1, 0.38], [1, 0.38]]) add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.08, 0.85, 0.08)), wood), x, 0.42, z, sg);
        for (const [x, z] of [[-1.05, -0.45], [1.05, -0.45]]) add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 6)), wood), x, 1.15, z, sg);
        const awT = new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = 128; c.height = 32; const x = c.getContext('2d'); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#f0e8d8' : '#2e6a8a'; x.fillRect(i * 16, 0, 16, 32); } return c; })());
        awT.colorSpace = THREE.SRGBColorSpace; C.disposables.push(awT);
        const aw = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(2.4, 1.2)), m({ map: awT, side: THREE.DoubleSide, roughness: 0.9 })), 0, 2.15, 0.1, sg); aw.rotation.x = -Math.PI / 2 + 0.35;
        const fish = m({ color: '#b8c4d0', metalness: 0.6, roughness: 0.3 });
        for (let i = 0; i < 7; i++) { const f = add(new THREE.Mesh(geo(new THREE.ConeGeometry(0.06, 0.38, 6)), fish), -0.8 + i * 0.26, 0.94, (i % 2) * 0.2 - 0.1, sg); f.rotation.z = Math.PI / 2; }
        for (const x of [-0.5, 0.6]) add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.5, 0.35, 0.4)), m({ color: '#6a4a2a', roughness: 0.9 })), x, 0.18, 0.75, sg);
        box(sx, sz, 2.4, 1.1, y0 - 0.5, y0 + 1.2, -yaw);
    }

    // --- i panni stesi di Rosalba: due pali e una corda fra due case, e i panni che sbattono ---
    {
        const a0 = HUTS[1][2], ang = (i) => i * Math.PI * 2 / 5 + 0.35;
        for (const k of [0, 2]) {
            const a = (ang(k) + ang(k + 1)) / 2, r = 9.5;
            const [u1, v1] = [VU + Math.cos(a - 0.22) * r, VV + Math.sin(a - 0.22) * r], [u2, v2] = [VU + Math.cos(a + 0.22) * r, VV + Math.sin(a + 0.22) * r];
            const [x1, z1] = P(u1, v1), [x2, z2] = P(u2, v2), y1 = ground(x1, z1), y2 = ground(x2, z2);
            for (const [x, z, y] of [[x1, z1, y1], [x2, z2, y2]]) { add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.05, 0.06, 2.1, 6)), wood), x, y + 1.05, z); circ(x, z, 0.12, y - 1, y + 2.1); }
            const len = Math.hypot(x2 - x1, z2 - z1), ropeM = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.008, 0.008, len, 4)), mat({ color: '#d8c8a0' })), (x1 + x2) / 2, (y1 + y2) / 2 + 2.0, (z1 + z2) / 2);
            ropeM.rotation.set(0, -Math.atan2(z2 - z1, x2 - x1), Math.PI / 2); ropeM.castShadow = false;
            const cols = ['#e8e0d0', '#8a3a4a', '#4a6a9a', '#e8c86a', '#6a8a5a'];
            for (let i = 0; i < 4; i++) {
                const t = (i + 0.7) / 4.4, cx = x1 + (x2 - x1) * t, cz = z1 + (z2 - z1) * t, cy = y1 + (y2 - y1) * t + 1.98;
                const pv = new THREE.Group(); pv.position.set(cx, cy, cz); pv.rotation.y = -Math.atan2(z2 - z1, x2 - x1); g.add(pv);
                const cl = new THREE.Mesh(geo(new THREE.PlaneGeometry(0.55, 0.7)), mat({ color: cols[(i + k) % 5], side: THREE.DoubleSide, roughness: 1 }));
                cl.position.y = -0.35; cl.castShadow = true; pv.add(cl); cloths.push({ pv, ph: i * 1.3 + k });
            }
        }
        void a0;
    }

    // --- le galline, che beccano intorno al cippo ---
    {
        const body = mat({ color: '#f0ebe0', roughness: 0.9 }), brown = mat({ color: '#a8643a', roughness: 0.9 }), red = mat({ color: '#d02a2a' }), beak = mat({ color: '#e8a030' });
        for (let i = 0; i < 5; i++) {
            const hg = new THREE.Group(); g.add(hg);
            const bm = i % 2 ? brown : body;
            const b = new THREE.Mesh(geo(new THREE.SphereGeometry(0.16, 10, 8)), bm); b.scale.set(0.9, 0.85, 1.2); b.position.y = 0.2; b.castShadow = true; hg.add(b);
            const tail = new THREE.Mesh(geo(new THREE.ConeGeometry(0.08, 0.18, 6)), bm); tail.position.set(0, 0.3, -0.17); tail.rotation.x = -0.9; hg.add(tail);
            const head = new THREE.Group(); head.position.set(0, 0.34, 0.14); hg.add(head);
            head.add(new THREE.Mesh(geo(new THREE.SphereGeometry(0.075, 8, 6)), bm));
            const bk = new THREE.Mesh(geo(new THREE.ConeGeometry(0.025, 0.07, 5)), beak); bk.rotation.x = Math.PI / 2; bk.position.z = 0.08; head.add(bk);
            const cm = new THREE.Mesh(geo(new THREE.BoxGeometry(0.02, 0.06, 0.08)), red); cm.position.set(0, 0.08, 0.01); head.add(cm);
            for (const s of [-1, 1]) { const l = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 4)), beak); l.position.set(s * 0.05, 0.05, 0); hg.add(l); }
            hens.push({ hg, head, a: i * 1.25, r: 3.2 + (i % 3) * 0.6, sp: 0.12 + i * 0.03, peck: Math.random() * 5 });
        }
    }

    // --- le lanterne lungo il sentiero: di notte si accendono ---
    for (const [u, v] of [[56, -7], [45, -15.5], [33, -18], [24, -24]]) {
        const [x, z] = P(u, v), y0 = ground(x, z);
        add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.05, 0.07, 2.2, 6)), wood), x, y0 + 1.1, z);
        const glass = add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.22, 0.28, 0.22)), mat({ color: '#ffe0a0', emissive: '#ffb347', emissiveIntensity: 0, transparent: true, opacity: 0.85 })), x, y0 + 2.3, z);
        glass.castShadow = false;
        const l = new THREE.PointLight('#ffb34a', 0, 9, 1.7); l.position.set(x, y0 + 2.3, z); g.add(l);
        circ(x, z, 0.12, y0 - 1, y0 + 2.5);
        lamps.push({ glass, l });
    }

    // --- dove si gioca ---
    {
        const [fx, fz] = P(VU + 2.6, VV + 4.6);
        interactables.push({ id: 'rivagame', k: 'forno', x: fx, z: fz, r: 2.2, label: () => `Il forno di Tobia: sforna il pane (${app.me?.rivaLeft?.forno ?? RIVA_GAMES.forno.daily} oggi)` });
        const [bx, bz] = P(RP.spiaggia[0] + 1, RP.spiaggia[1] + 3);
        interactables.push({ id: 'rivagame', k: 'sassi', x: bx, z: bz, r: 3, label: () => `I sassi sull'acqua (${app.me?.rivaLeft?.sassi ?? RIVA_GAMES.sassi.daily} tiri oggi)` });
        const [cx, cz] = P(RP.casa[0] - 2.4, RP.casa[1] - 2);
        interactables.push({ id: 'rivagame', k: 'mappa', x: cx, z: cz, r: 2.2, label: () => `La Cartografa: la mappa a memoria (${app.me?.rivaLeft?.mappa ?? RIVA_GAMES.mappa.daily} oggi)` });
    }

    const tick = (dt, time) => {
        const night = 1 - (app.env?.state?.day ?? 1), now = Date.now(), cam = app.camera.position, PP = app.player?.pos;
        for (const n of people) {
            const ch = n.ch, at = rivanoAt(n.id, now), goal = rivanoAt(n.id, now + 12000), r = ch.root.position;
            const near = PP && Math.hypot(PP.x - r.x, PP.z - r.z) < 3;
            if (near && app.panels.current === 'rivano' && app.panels.arg === n.id) n.stop = 1.5;
            n.stop = Math.max(0, n.stop - dt);
            const d = cam.distanceTo(r), far = d > 90;
            let mv = 0;
            if (n.stop) { /* ti guarda */ } else if (far || !n.wk) { r.set(at.x, W.terrainAt(at.x, at.z), at.z); n.wk = !far; } else mv = walkTo(W, n, at, dt, n.id.length, goal);
            const walking = !n.stop && (far ? at.walking : mv > dt * 0.35);
            const want = n.stop && PP ? Math.atan2(PP.x - r.x, PP.z - r.z) : walking ? (n.moveYaw ?? at.yaw ?? n.ry) : n.ry;
            n.ry = lerpAngle(n.ry, want, Math.min(1, dt * 6)); ch.root.rotation.y = n.ry;
            ch.state = walking ? (n.R.kid ? 'run' : 'walk') : 'idle'; ch.speed = walking ? (n.R.kid ? 3.2 : 1.3) : 0;
            n.it.x = r.x; n.it.z = r.z; n.it.y = r.y;
            ch.root.visible = d < 80 && !app.interior; characterLod(ch, d);
            if (ch.tag) ch.tag.visible = d < 24;
            if (d < 80) ch.update(dt);
        }
        for (const c of cloths) c.pv.rotation.x = Math.sin(time * 2.2 + c.ph) * 0.22 + Math.sin(time * 5.3 + c.ph) * 0.06;
        const [cx, cz] = P(VU, VV);
        for (const H of hens) {
            H.a += H.sp * dt;
            const x = cx + Math.cos(H.a) * H.r, z = cz + Math.sin(H.a) * H.r;
            H.hg.position.set(x, W.terrainAt(x, z), z); H.hg.rotation.y = -H.a;
            H.peck -= dt; H.head.rotation.x = H.peck < 0.25 && H.peck > 0 ? 0.9 : 0; if (H.peck < 0) H.peck = 1.5 + Math.random() * 3;
        }
        for (const L of lamps) { L.glass.material.emissiveIntensity = 1.8 * night; L.l.intensity = 6 * night; }
    };
    return {
        tick,
        dispose() {
            for (const n of people) { app.scene.remove(n.ch.root); n.ch.dispose(); }
        },
    };
}

// =====================================================================
//  I GIOCHI DELLA RIVA
// =====================================================================
export async function playRiva(app, k) {
    const G = RIVA_GAMES[k];
    if (!G || app.rivaGame) return;
    if ((app.me?.rivaLeft?.[k] ?? G.daily) <= 0) return toast('Per oggi basta: torna domani', { kind: 'bad' });
    const r = await app.net.request('riva:start', { g: k });
    if (!r.ok) return toast(r.msg, { kind: 'bad' });
    document.exitPointerLock?.();
    app.rivaGame = true;
    const score = await new RivaGame(app, k).play();
    app.rivaGame = false;
    if (score == null) return toast('Partita lasciata a metà: non conta', { icon: 'map' });
    const d = await app.net.request('riva:done', { g: k, score });
    if (!d.ok) return toast(d.msg, { kind: 'bad' });
    app.audio?.play?.('coin');
    const what = k === 'forno' ? `${Math.round(score * 100)}% di pane perfetto` : k === 'sassi' ? `${score} rimbalzi` : `${score} giri a memoria`;
    const mats = Object.entries(d.mats || {}).map(([m, n]) => `${n} × ${m}`).join(', ');
    toast(h('div', {}, h('b', {}, `${G.name}: ${what}${d.best ? ' · il tuo record!' : ''}`), h('div', {}, `+${d.coins} monete · +${d.xp} esperienza${mats ? ' · ' + mats : ''}`)), { kind: 'coin', icon: 'map', duration: 6500 });
}

class RivaGame {
    constructor(app, k) { this.app = app; this.k = k; this.G = RIVA_GAMES[k]; }
    play() {
        return new Promise(res => {
            this.res = res;
            const touch = 'ontouchstart' in window, k = this.k;
            this.cv = h('canvas', { width: 560, height: 230 });
            this.pads = h('div', { class: 'gym-pads' });
            if (k === 'mappa') {
                this.syms = ['lantern', 'castle', 'wave', 'crystal'];
                this.pads.append(...this.syms.map((s, i) => h('button', { class: 'btn riva-sym', 'data-i': i, html: iconSVG(s), onpointerdown: () => this.press(String(i + 1)) })));
            } else if (touch) this.pads.append(h('button', { class: 'btn btn-primary', onpointerdown: () => this.press(' ', true), onpointerup: () => this.release() }, k === 'forno' ? 'Sforna!' : 'Tira!'));
            this.el = h('div', { id: 'gym-game' }, h('div', { class: 'gym-box' },
                h('div', { class: 'gym-head' }, h('span', { html: iconSVG('map') }), this.G.name, h('button', { class: 'btn btn-sm', onclick: () => this.end(null) }, 'Lascia (Esc)')),
                k === 'mappa' ? null : this.cv, this.pads, h('div', { class: 'gym-info' }, this.G.desc)));
            document.body.append(this.el);
            this.g = this.cv.getContext('2d');
            this.onKey = (e) => {
                if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); return this.end(null); }
                const key = e.code === 'Space' ? ' ' : /^Digit[1-4]$/.test(e.code) ? e.code.slice(5) : null;
                if (key && !e.repeat) { e.preventDefault(); e.stopPropagation(); this.press(key, true); }
            };
            this.onUp = (e) => { if (e.code === 'Space') { e.preventDefault(); this.release(); } };
            addEventListener('keydown', this.onKey, true); addEventListener('keyup', this.onUp, true);
            this.setup(); this.last = performance.now();
            const loop = (now) => { if (!this.el) return; const dt = Math.min(0.25, (now - this.last) / 1000); this.last = now; this.step(dt); this.draw(); this.raf = requestAnimationFrame(loop); };
            this.raf = requestAnimationFrame(loop);
        });
    }
    end(score) {
        if (!this.el) return;
        cancelAnimationFrame(this.raf); removeEventListener('keydown', this.onKey, true); removeEventListener('keyup', this.onUp, true);
        this.el.remove(); this.el = null; this.res(score);
    }
    finish(score, msg) { if (this.over != null) return; this.over = 1.3; this.final = score; this.msg = msg; }
    setup() {
        const k = this.k;
        if (k === 'forno') Object.assign(this, { n: 0, N: 5, d: 0, sp: 0.42, tot: 0, wait: 0.8, msg: 'Il forno è caldo…', loaves: [] });
        if (k === 'sassi') Object.assign(this, { phase: 'power', hold: false, pw: 0, pt: 0, ang: 0, at: 0, wait: 0.6, msg: 'Tieni premuto Spazio…', stone: null });
        if (k === 'mappa') Object.assign(this, { seq: [], idx: 0, showing: 0, round: 0, wait: 0.8, msg: 'Guarda bene…', lit: -1 });
    }
    press(key, down) {
        if (this.over != null || this.wait > 0) return;
        const k = this.k, au = this.app.audio;
        if (k === 'forno' && key === ' ') {
            const s = this.d > 1.15 ? 0 : Math.max(0, 1 - Math.abs(this.d - 0.7) / 0.25);
            this.loaves.push(this.d); this.tot += s; this.n++;
            this.msg = this.d > 1.15 ? 'Carbone!' : s > 0.8 ? 'Dorato, perfetto!' : this.d < 0.55 ? 'Ancora crudo…' : s > 0.4 ? 'Buono' : 'Un po\' troppo';
            au?.play?.(s > 0.4 ? 'coin' : 'swing');
            this.d = 0; this.sp = 0.38 + Math.random() * 0.22; this.wait = 0.5;
            if (this.n >= this.N) this.finish(Math.round(this.tot / this.N * 100) / 100, `Pane sfornato: ${Math.round(this.tot / this.N * 100)}%`);
        }
        if (k === 'sassi' && key === ' ') {
            if (this.phase === 'power' && down) { this.hold = true; this.pt = 0; }
            else if (this.phase === 'angle') {
                this.ang = 30 * (0.5 - 0.5 * Math.cos(this.at * 2.6));   // da 0 a 30 gradi
                const pq = Math.max(0, 1 - Math.abs(this.pw - 0.78) / 0.32), aq = Math.max(0, 1 - Math.abs(this.ang - 11) / 16);
                const skips = Math.max(0, Math.min(12, Math.round(12 * pq * aq + (pq > 0.3 ? 1 : 0))));
                this.phase = 'fly'; this.stone = { t: 0, skips, x: 0 }; au?.play?.('swing');
            }
        }
        if (k === 'mappa' && /^[1-4]$/.test(key) && this.showing <= 0 && this.seq.length) {
            const i = +key - 1; this.flashBtn(i);
            if (i === this.seq[this.idx]) {
                this.idx++; au?.play?.('ui');
                if (this.idx >= this.seq.length) { this.round++; this.msg = `Giusto! ${this.round} ${this.round === 1 ? 'giro' : 'giri'}`; if (this.round >= 12) return this.finish(12, 'Hai la mappa in testa!'); this.next(); }
            } else { au?.play?.('error'); this.finish(this.round, `Sbagliato: ${this.round} ${this.round === 1 ? 'giro' : 'giri'} a memoria`); }
        }
    }
    release() {
        if (this.k !== 'sassi' || this.phase !== 'power' || !this.hold) return;
        this.hold = false; this.phase = 'angle'; this.at = 0; this.msg = 'Ora l\'angolo: premi quando è basso!';
    }
    next() { this.seq.push(Math.floor(Math.random() * 4)); if (this.seq.length < 2) this.seq.push(Math.floor(Math.random() * 4)); this.idx = 0; this.showing = this.seq.length * 0.7 + 0.4; this.showT = 0; }
    flashBtn(i) { const b = this.el?.querySelector(`.riva-sym[data-i="${i}"]`); if (!b) return; b.classList.add('lit'); setTimeout(() => b.classList.remove('lit'), 260); }
    step(dt) {
        if (this.over != null) { this.over -= dt; if (this.over <= 0) this.end(this.final); return; }
        if (this.wait > 0) { this.wait -= dt; if (this.wait <= 0 && this.k === 'mappa' && !this.seq.length) this.next(); return; }
        const k = this.k;
        if (k === 'forno') { this.d += this.sp * dt; if (this.d > 1.4) this.press(' '); }
        if (k === 'sassi') {
            if (this.phase === 'power' && this.hold) { this.pt += dt; this.pw = 0.5 - 0.5 * Math.cos(this.pt * 2.2); }
            if (this.phase === 'angle') { this.at += dt; if (this.at > 6) this.press(' '); }
            if (this.phase === 'fly') { const S = this.stone; S.t += dt; if (S.t > 1 + S.skips * 0.3) this.finish(S.skips, S.skips ? `${S.skips} rimbalzi!` : 'Plof. Affondato al primo colpo.'); }
        }
        if (k === 'mappa' && this.showing > 0) {
            this.showT += dt; this.showing -= dt;
            const i = Math.floor((this.showT - 0.3) / 0.7);
            if (i >= 0 && i < this.seq.length && i !== this.lastShown) { this.lastShown = i; this.flashBtn(this.seq[i]); this.app.audio?.play?.('ui'); }
            if (this.showing <= 0) { this.lastShown = -1; this.msg = 'Tocca a te'; }
        }
    }
    draw() {
        if (this.k === 'mappa') { const info = this.el?.querySelector('.gym-info'); if (info) info.textContent = this.msg || ''; return; }
        const g = this.g, W = this.cv.width, H = this.cv.height;
        g.fillStyle = '#1c130c'; g.fillRect(0, 0, W, H); g.textAlign = 'center'; g.textBaseline = 'middle';
        if (this.k === 'forno') {
            // la pagnotta cambia colore: pallida, dorata, bruciata
            const d = this.d, c = d < 0.7 ? mixC([236, 222, 190], [214, 150, 62], d / 0.7) : mixC([214, 150, 62], [40, 24, 16], Math.min(1, (d - 0.7) / 0.6));
            g.fillStyle = '#3a1a0a'; g.beginPath(); g.ellipse(W / 2, 95, 170, 70, 0, Math.PI, 0); g.fill();
            g.fillStyle = `rgb(${c.join(',')})`; g.beginPath(); g.ellipse(W / 2, 100, 90, 38, 0, 0, Math.PI * 2); g.fill();
            g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(W / 2 + i * 35 - 14, 84); g.lineTo(W / 2 + i * 35 + 14, 116); g.stroke(); }
            const x0 = 60, w = W - 120, y = 168;
            g.fillStyle = '#3a2a1e'; g.fillRect(x0, y - 9, w, 18);
            g.fillStyle = '#4a8a3a'; g.fillRect(x0 + (0.55 / 1.4) * w, y - 9, (0.3 / 1.4) * w, 18);
            g.fillStyle = '#ffe9b0'; g.fillRect(x0 + Math.min(1, d / 1.4) * w - 3, y - 15, 6, 30);
            g.font = '600 16px Cinzel, serif'; g.fillStyle = '#c8a878'; g.fillText(`Pagnotta ${Math.min(this.n + 1, this.N)} di ${this.N}`, W / 2, 20);
        }
        if (this.k === 'sassi') {
            g.fillStyle = '#2a4a5a'; g.fillRect(0, 140, W, H - 140);
            const S = this.stone;
            if (S) {
                // il sasso che rimbalza sull'acqua, sempre più corto
                let x = 40, hops = []; for (let i = 0; i <= S.skips; i++) { const len = 70 * Math.pow(0.82, i); hops.push([x, len]); x += len; }
                let t = S.t, px = 40, py = 140;
                for (const [hx, len] of hops) { const dur = 0.3; if (t < dur) { const k = t / dur; px = hx + len * k; py = 140 - Math.sin(k * Math.PI) * len * 0.35; break; } t -= dur; px = hx + len; py = 140; }
                for (const [hx] of hops.slice(1)) if (hx < px) { g.strokeStyle = 'rgba(220,240,255,0.5)'; g.lineWidth = 2; g.beginPath(); g.ellipse(hx, 142, 12, 3, 0, 0, Math.PI * 2); g.stroke(); }
                g.fillStyle = '#9a948a'; g.beginPath(); g.ellipse(px, py - 4, 7, 4, 0, 0, Math.PI * 2); g.fill();
            } else {
                const y = 60, x0 = 60, w = W - 120;
                g.fillStyle = '#3a2a1e'; g.fillRect(x0, y - 10, w, 20);
                g.fillStyle = '#c8963a'; g.fillRect(x0 + 0.68 * w, y - 10, 0.2 * w, 20);
                g.fillStyle = '#ffe9b0'; g.fillRect(x0 + this.pw * w - 3, y - 16, 6, 32);
                g.font = '600 15px Cinzel, serif'; g.fillStyle = '#c8a878'; g.fillText('forza', W / 2, y - 26);
                if (this.phase === 'angle') {
                    const a = 30 * (0.5 - 0.5 * Math.cos(this.at * 2.6)) * Math.PI / 180;
                    g.strokeStyle = '#ffe9b0'; g.lineWidth = 4; g.beginPath(); g.moveTo(80, 140); g.lineTo(80 + Math.cos(a) * 120, 140 - Math.sin(a) * 120); g.stroke();
                    g.strokeStyle = 'rgba(140,230,100,0.5)'; g.lineWidth = 2; for (const b of [5, 17]) { const r = b * Math.PI / 180; g.beginPath(); g.moveTo(80, 140); g.lineTo(80 + Math.cos(r) * 130, 140 - Math.sin(r) * 130); g.stroke(); }
                }
            }
        }
        g.font = 'italic 700 21px Almendra, serif'; g.fillStyle = '#ffe9b0'; g.fillText(this.msg || '', W / 2, H - 18);
    }
}
const mixC = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * Math.max(0, Math.min(1, t))));

// --- il pannello di un abitante della Riva ---
export function rivanoView(panels, id) {
    const app = panels.app, R = RIVANI[id];
    if (!R) return panels.close();
    const n = (panels.rivLine = ((panels.rivLine ?? -1) + 1)) % R.lines.length;
    const G = R.game && RIVA_GAMES[R.game], left = G ? app.me?.rivaLeft?.[R.game] ?? G.daily : 0, best = G ? app.me?.rivaBest?.[R.game] : null;
    panels.set('talk', R.name, h('div', { class: 'parchment' },
        h('p', { class: 'npc-say' }, `«${R.lines[n]}»`),
        h('p', { class: 'muted small' }, `${R.where} · alla Riva di Là, da quando il faro si è riacceso`),
        G ? h('div', { class: 'ledger-row trade-row' }, h('div', { class: 'grow' }, h('div', { class: 'nm' }, G.name), h('div', { class: 'sub' }, G.desc),
            h('div', { class: 'sub' }, `Oggi ancora ${left} · il tuo record: ${best != null ? (R.game === 'forno' ? Math.round(best * 100) + '%' : best) : 'nessuno'}`)),
            h('button', { class: 'btn btn-sm btn-primary', disabled: left <= 0 ? true : null, onclick: () => { panels.close(); playRiva(app, R.game); } }, 'Gioca')) : null,
        h('div', { class: 'btn-row', style: { marginTop: '10px' } },
            h('button', { class: 'btn', onclick: () => panels.render() }, 'Altro?'),
            h('button', { class: 'btn', onclick: () => panels.close() }, 'Arrivederci'))));
}
