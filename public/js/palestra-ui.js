// =====================================================================
//  LA PALESTRA DI SANSONE nel mondo (solo client)
//  Il porticato di legno, gli attrezzi, Sansone il Gigante; i tre piccoli
//  giochi degli attrezzi (il sacco, i pesi, la corda) e il pannello con
//  il tuo livello di palestra e gli abitanti da allenare.
//  Le regole e i conti stanno in shared/palestra.js (li usa anche il server).
// =====================================================================
import * as THREE from 'three';
import { kit } from './terre.js';
import { Character } from './character.js';
import { characterLod } from './engine/stream.js';
import { PALESTRA, ATTREZZI, GYM_DAILY, GYM_MAX, gymToNext, gymMods, GYM_NPC_DAILY, GYM_NPC_MAX, npcGymCost, npcFighters, npcLevel, npcBoost } from './shared/palestra.js';
import { ERRANTI } from './shared/erranti.js';
import { h, toast } from './util.js';
import { iconSVG } from './icons.js';

const SANSONE = {
    name: 'Sansone il Gigante',
    app: { sex: 'm', species: 'umano', build: 'robusto', height: 1.22, skin: '#c8906a', eyes: 'fieri', eyeColor: '#3a2a1a', mouth: 'sorriso', hair: 'calvo', hairColor: '#2a1a10', beard: 'folta', topStyle: 'tunica', top: '#8a2a24', bottom: '#2e2a30', shoes: '#2a1a10' },
    lines: [
        'Benvenuto in palestra! Qui si allenano tutti: i vivi, i morti e quelli che non hanno ancora deciso.',
        'Il sacco non ti odia. Tu però picchialo come se ti dovesse dei soldi.',
        'I muscoli crescono dormendo: sei allenamenti al giorno, non uno di più.',
        'Marta solleva i mattoni da quando aveva sei anni. Con lei i pesi sono una formalità.',
        'Una volta ho fatto la corda per tre giorni di fila. Il terzo giorno la corda si è stancata prima di me.',
    ],
};

function canvasTex(w, hh, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = hh;
    draw(c.getContext('2d'), w, hh);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export class Palestra {
    constructor(app) {
        this.app = app; this.t = 0;
        const W = app.world, { g, put, box, circ, lamp, L } = kit(W, PALESTRA.x, PALESTRA.z, PALESTRA.ry, W.terrainAt(PALESTRA.x, PALESTRA.z));
        this.g = g;
        const wood = W.matWood, dark = new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 0.9 });
        const red = new THREE.MeshStandardMaterial({ color: '#8a2420', roughness: 0.55 }), iron = new THREE.MeshStandardMaterial({ color: '#2a2a30', metalness: 0.7, roughness: 0.35 });
        const tile = new THREE.MeshStandardMaterial({ color: '#8a4a32', roughness: 0.8, flatShading: true });
        const D = 0.3, HW = 6, HD = 4;
        // la pedana, i pali, il tetto a due falde
        put(new THREE.BoxGeometry(HW * 2, D, HD * 2), wood, 0, D / 2, 0);
        W.addBox(...L(0, 0), HW * 2, HD * 2, PALESTRA.y0 ?? g.position.y - 1, g.position.y + D, -PALESTRA.ry);
        for (const sx of [-HW + 0.3, 0, HW - 0.3]) for (const sz of [-HD + 0.3, HD - 0.3]) {
            put(new THREE.CylinderGeometry(0.13, 0.15, 3.0, 8), wood, sx, D + 1.5, sz);
            circ(sx, sz, 0.18, 0, 3.2);
        }
        for (const s of [-1, 1]) {
            const r = put(new THREE.BoxGeometry(HW * 2 + 0.8, 0.12, HD + 0.6), tile, 0, D + 3.35, s * HD / 2);
            r.rotation.x = s * 0.32;
        }
        put(new THREE.BoxGeometry(HW * 2 + 0.6, 0.25, 0.25), wood, 0, D + 3.0, -HD + 0.3);
        put(new THREE.BoxGeometry(HW * 2 + 0.6, 0.25, 0.25), wood, 0, D + 3.0, HD - 0.3);
        put(new THREE.BoxGeometry(0.25, 0.25, HD * 2), wood, 0, D + 3.9, 0);
        // la parete di fondo, bassa, con l'insegna
        put(new THREE.BoxGeometry(HW * 2 - 0.4, 1.3, 0.14), wood, 0, D + 0.65, -HD + 0.25);
        box(0, -HD + 0.25, HW * 2 - 0.4, 0.2, 0, 1.6);
        const sign = canvasTex(1024, 192, (c, w, hh) => {
            c.fillStyle = '#2a1a10'; c.fillRect(0, 0, w, hh); c.strokeStyle = '#c8963a'; c.lineWidth = 8; c.strokeRect(10, 10, w - 20, hh - 20);
            c.fillStyle = '#f2e2b8'; c.textAlign = 'center'; c.textBaseline = 'middle';
            c.font = 'bold 82px Cinzel, Georgia, serif'; c.fillText('PALESTRA DI SANSONE', w / 2, hh / 2 - 18);
            c.fillStyle = '#c8963a'; c.font = 'italic 36px Georgia, serif'; c.fillText('— vivi, morti e mezzi —', w / 2, hh / 2 + 46);
        });
        const sg = put(new THREE.PlaneGeometry(4.6, 0.86), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.8 }), 0, D + 2.55, HD - 0.15);
        sg.castShadow = false;
        put(new THREE.BoxGeometry(4.8, 1.0, 0.08), dark, 0, D + 2.55, HD - 0.22);
        // il sacco: appeso a una trave, si muove quando lo colpisci
        const [bx, bz] = ATTREZZI.sacco.at;
        put(new THREE.BoxGeometry(0.15, 0.15, 1.6), wood, bx, D + 2.95, bz + 0.2);
        this.bag = new THREE.Group(); this.bag.position.set(bx, D + 2.9, bz); g.add(this.bag);
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 5), dark); rope.position.y = -0.35; this.bag.add(rope);
        const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 1.15, 14), red); bag.position.y = -1.27; bag.castShadow = true; this.bag.add(bag);
        for (const y of [-0.8, -1.75]) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.02, 6, 18), iron); b.rotation.x = Math.PI / 2; b.position.y = y; this.bag.add(b); }
        circ(bx, bz, 0.35, 0.5, 3);
        // i pesi: la panca, il supporto, il bilanciere con i dischi, i manubri per terra
        const [px, pz] = ATTREZZI.pesi.at;
        put(new THREE.BoxGeometry(0.45, 0.1, 1.5), dark, px, D + 0.5, pz + 0.3);
        for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.08, 0.5, 0.08), iron, px + s * 0.16, D + 0.25, pz + 0.3 + s * 0.55);
        for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.08, 1.1, 0.08), iron, px + s * 0.6, D + 0.55, pz - 0.35);
        this.bar = new THREE.Group(); this.bar.position.set(px, D + 1.05, pz - 0.35); g.add(this.bar);
        const barM = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.0, 8), iron); barM.rotation.z = Math.PI / 2; this.bar.add(barM);
        for (const s of [-1, 1]) for (const k of [0, 1]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.24 - k * 0.06, 0.24 - k * 0.06, 0.06, 18), k ? red : iron); d.rotation.z = Math.PI / 2; d.position.x = s * (0.78 + k * 0.07); d.castShadow = true; this.bar.add(d); }
        for (let i = 0; i < 4; i++) { const m = put(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 6), iron, px - 1.1 + i * 0.25, D + 0.08, pz + 1.3, [0, 0, Math.PI / 2]); for (const s of [-1, 1]) put(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10), iron, px - 1.1 + i * 0.25 + s * 0.14, D + 0.08, pz + 1.3, [0, 0, Math.PI / 2]); m.castShadow = true; }
        box(px, pz, 1.6, 1.8, 0, 1.2);
        // la corda: il tappeto, la corda arrotolata, il cronometro di legno
        const [cx, cz] = ATTREZZI.corda.at;
        put(new THREE.BoxGeometry(1.6, 0.03, 1.6), new THREE.MeshStandardMaterial({ color: '#3a5a7a', roughness: 1 }), cx, D + 0.015, cz);
        this.rope = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.018, 6, 24), new THREE.MeshStandardMaterial({ color: '#d8c080', roughness: 0.8 }));
        this.rope.rotation.x = Math.PI / 2; this.rope.position.set(cx + 0.55, D + 0.04, cz + 0.55); g.add(this.rope);
        for (const s of [-1, 1]) put(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 8), wood, cx + 0.55 + s * 0.28, D + 0.05, cz + 0.55, [0, 0, Math.PI / 2]);
        // le lanterne, per allenarsi anche di sera
        lamp(-HW + 0.6, D + 2.6, HD - 0.6, '#ffb347', 9, 9); lamp(HW - 0.6, D + 2.6, HD - 0.6, '#ffb347', 9, 9);
        // Sansone, davanti alla pedana
        this.san = new Character(SANSONE.app, { torso: 'cotta' }, { name: SANSONE.name, sub: 'Il maestro della palestra', color: '#ffb070' });
        const [sx, sz] = L(0, HD + 0.9); this.san.root.position.set(sx, W.groundAt(sx, sz), sz); this.san.root.rotation.y = PALESTRA.ry;
        app.scene.add(this.san.root);
        W.addCirc(sx, sz, 0.45, this.san.root.position.y - 1, this.san.root.position.y + 2.4);
        // gli attrezzi e Sansone si usano con E
        W.interactables.push({ id: 'palestra', x: sx, z: sz, r: 2.6, label: 'Parla con Sansone il Gigante' });
        for (const [k, A] of Object.entries(ATTREZZI)) { const [x, z] = L(A.at[0], A.at[1] + 1.1); W.interactables.push({ id: 'gym', k, x, z, y: g.position.y + D, r: 1.7, label: () => `${A.name}: allenati (${this.app.me?.gymLeft ?? GYM_DAILY} rimasti oggi)` }); }
    }
    update(dt, camPos) {
        this.t += dt;
        if (this.bag) { this.bagV = (this.bagV || 0) * Math.exp(-dt * 1.5) - (this.bag.rotation.x) * dt * 9; this.bag.rotation.x += this.bagV * dt; }
        if (this.bar) this.bar.position.y += ((this.barUp ? 1.6 : 1.05) + 0.3 - this.bar.position.y) * Math.min(1, dt * 8);
        if (this.rope && this.ropeSpin) this.rope.rotation.z += dt * 12;
        const d = camPos.distanceTo(this.san.root.position);
        this.san.root.visible = d < 80 && !this.app.interior;
        characterLod(this.san, d);
        if (d < 80) { this.san.state = 'idle'; this.san.update(dt); }
        if (this.san.tag) this.san.tag.visible = d < 24;
    }
    hitBag(k = 1) { this.bagV = (this.bagV || 0) + 2.4 * k; }

    // --- un allenamento: chiede il permesso al server, gioca, porta il risultato ---
    async train(k) {
        const app = this.app, A = ATTREZZI[k];
        if (!A || this.game) return;
        if ((app.me?.gymLeft ?? GYM_DAILY) <= 0) return toast('Per oggi basta: Sansone dice che i muscoli crescono dormendo', { kind: 'bad' });
        const r = await app.net.request('gym:start', { a: k });
        if (!r.ok) return toast(r.msg, { kind: 'bad' });
        document.exitPointerLock?.();
        const score = await new GymGame(this, k).play();
        this.barUp = false; this.ropeSpin = false;
        if (score == null) { toast('Allenamento interrotto: non conta', { icon: 'fist' }); return; }
        const d = await app.net.request('gym:done', { a: k, score });
        if (!d.ok) return toast(d.msg, { kind: 'bad' });
        app.audio?.play?.(d.up ? 'levelup' : 'coin');
        toast(h('div', {}, h('b', {}, d.up ? `Livello di palestra ${d.lv}!` : `${A.name}: ${Math.round(score * 100)}%`),
            h('div', {}, `+${d.xp} esperienza · +${d.pts} forma${d.up ? ` · in duello ora hai +${(gymMods(d.lv).hp * 100).toFixed(1)}% di vita e +${Math.round(gymMods(d.lv).atk * 100)}% di forza` : ''}`)), { kind: 'coin', icon: 'fist', duration: 6000 });
    }
}

// =====================================================================
//  I TRE GIOCHI: una finestrella sopra il mondo, con un canvas
//  timing (il sacco): una lancetta va avanti e indietro; colpisci sul verde
//  mash   (i pesi):   A e D alternati, più veloce che puoi, per 8 secondi
//  rhythm (la corda): un cerchio si stringe; salta quando tocca l'anello d'oro
// =====================================================================
class GymGame {
    constructor(P, k) { this.P = P; this.k = k; this.A = ATTREZZI[k]; }
    play() {
        return new Promise(res => {
            this.res = res;
            const touch = 'ontouchstart' in window;
            this.cv = h('canvas', { width: 560, height: 220 });
            this.info = h('div', { class: 'gym-info' }, this.A.desc);
            this.btns = touch ? (this.A.game === 'mash' ? h('div', { class: 'gym-pads' }, h('button', { class: 'btn', onpointerdown: () => this.press('A') }, 'A'), h('button', { class: 'btn', onpointerdown: () => this.press('D') }, 'D'))
                : h('div', { class: 'gym-pads' }, h('button', { class: 'btn btn-primary', onpointerdown: () => this.press(' ') }, this.A.game === 'timing' ? 'Colpisci!' : 'Salta!'))) : null;
            this.el = h('div', { id: 'gym-game' }, h('div', { class: 'gym-box' },
                h('div', { class: 'gym-head' }, h('span', { html: iconSVG('fist') }), this.A.name, h('button', { class: 'btn btn-sm', onclick: () => this.end(null) }, 'Smetti (Esc)')),
                this.cv, this.info, this.btns));
            document.body.append(this.el);
            this.g = this.cv.getContext('2d');
            this.onKey = (e) => {
                if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); return this.end(null); }
                const key = e.code === 'Space' ? ' ' : e.code === 'KeyA' ? 'A' : e.code === 'KeyD' ? 'D' : null;
                if (key && !e.repeat) { e.preventDefault(); e.stopPropagation(); this.press(key); }
            };
            addEventListener('keydown', this.onKey, true);
            // il tempo dei giochi è quello vero, anche se il telefono va a scatti (fino a un quarto di secondo per fotogramma)
            this.setup(); this.last = performance.now();
            const loop = (now) => { if (!this.el) return; const dt = Math.min(0.25, (now - this.last) / 1000); this.last = now; this.step(dt); this.draw(); this.raf = requestAnimationFrame(loop); };
            this.raf = requestAnimationFrame(loop);
        });
    }
    end(score) {
        if (!this.el) return;
        cancelAnimationFrame(this.raf); removeEventListener('keydown', this.onKey, true);
        this.el.remove(); this.el = null;
        this.res(score);
    }
    setup() {
        const G = this.A.game;
        if (G === 'timing') Object.assign(this, { n: 0, N: 10, pos: 0, dir: 1, sp: 0.9, zc: 0.5, zw: 0.2, tot: 0, flash: 0, wait: 0.6 });
        if (G === 'mash') Object.assign(this, { time: 8, left: 8, lastKey: null, reps: 0, lift: 0, wait: 1.2 });
        if (G === 'rhythm') Object.assign(this, { n: 0, N: 12, r: 1, dur: 1.0, tot: 0, flash: 0, done: false, wait: 0.8, hit: null });
        this.msg = 'Pronti…';
    }
    press(key) {
        const G = this.A.game, P = this.P, au = P.app.audio;
        if (this.wait > 0 || this.over != null) return;   // prima del via e a gioco finito i tasti non contano
        if (G === 'timing' && key === ' ') {
            const d = Math.abs(this.pos - this.zc), s = Math.max(0, 1 - d / (this.zw * 0.75));
            this.tot += s; this.n++; this.flash = 0.25; this.msg = s > 0.8 ? 'Perfetto!' : s > 0.4 ? 'Buono' : s > 0 ? 'Di striscio' : 'Mancato!';
            this.good = s > 0.4; P.hitBag(0.4 + s); au?.play?.(s > 0.4 ? 'hit' : 'swing');
            this.sp *= 1.09; this.zw = Math.max(0.09, this.zw * 0.93); this.zc = 0.2 + Math.random() * 0.6;
            if (this.n >= this.N) this.finishSoon(this.tot / this.N);
        }
        if (G === 'mash' && (key === 'A' || key === 'D') && this.left > 0) {
            if (key !== this.lastKey) { this.reps++; this.lift = Math.min(1, this.lift + 0.06); P.barUp = this.reps % 2 === 0; }
            this.lastKey = key;
        }
        if (G === 'rhythm' && key === ' ' && !this.hit) {
            const d = Math.abs(this.r - 0.3), s = Math.max(0, 1 - d / 0.25);
            this.hit = s; this.tot += s; this.flash = 0.25; this.msg = s > 0.8 ? 'Leggero come una piuma!' : s > 0.4 ? 'Salto pulito' : s > 0 ? 'Quasi' : 'Inciampato!';
            this.good = s > 0.4; au?.play?.(s > 0.4 ? 'jump' : 'swing'); P.ropeSpin = true;
        }
    }
    finishSoon(score) { this.over = 1.1; this.final = Math.max(0, Math.min(1, score)); }
    step(dt) {
        const G = this.A.game;
        this.flash = Math.max(0, (this.flash || 0) - dt);
        if (this.over != null) { this.over -= dt; this.msg = `Fatto! ${Math.round(this.final * 100)}%`; if (this.over <= 0) this.end(this.final); return; }
        if (this.wait > 0) { this.wait -= dt; if (this.wait <= 0) this.msg = G === 'mash' ? 'Su! A, D, A, D…' : 'Via!'; return; }
        if (G === 'timing') { this.pos += this.dir * this.sp * dt; if (this.pos > 1) { this.pos = 1; this.dir = -1; } if (this.pos < 0) { this.pos = 0; this.dir = 1; } }
        if (G === 'mash') {
            this.left -= dt; this.lift = Math.max(0, this.lift - dt * 0.12);
            if (this.left <= 0) this.finishSoon(this.reps / 80);
        }
        if (G === 'rhythm') {
            this.r -= dt / this.dur;
            if (this.r <= 0) {
                if (!this.hit) { this.msg = 'Troppo tardi!'; this.good = false; }
                this.n++; this.hit = null; this.r = 1; this.dur = Math.max(0.62, this.dur * 0.96);
                if (this.n >= this.N) this.finishSoon(this.tot / this.N);
            }
        }
    }
    draw() {
        const g = this.g, W = this.cv.width, H = this.cv.height, G = this.A.game;
        g.clearRect(0, 0, W, H);
        g.fillStyle = '#1c130c'; g.fillRect(0, 0, W, H);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        if (G === 'timing') {
            const x0 = 40, x1 = W - 40, y = 110, w = x1 - x0;
            g.fillStyle = '#3a2a1e'; g.fillRect(x0, y - 18, w, 36);
            g.fillStyle = '#4a8a3a'; g.fillRect(x0 + (this.zc - this.zw / 2) * w, y - 18, this.zw * w, 36);
            g.fillStyle = '#8fe06a'; g.fillRect(x0 + (this.zc - this.zw / 6) * w, y - 18, this.zw / 3 * w, 36);
            g.fillStyle = '#ffe9b0'; g.fillRect(x0 + this.pos * w - 3, y - 30, 6, 60);
            g.font = '600 18px Cinzel, serif'; g.fillStyle = '#c8a878'; g.fillText(`Pugno ${Math.min(this.n + 1, this.N)} di ${this.N}`, W / 2, 34);
        }
        if (G === 'mash') {
            const x = W / 2, top = 40, bot = 180, hh = bot - top;
            g.fillStyle = '#3a2a1e'; g.fillRect(x - 30, top, 60, hh);
            const f = Math.min(1, this.reps / 80);
            const gr = g.createLinearGradient(0, bot, 0, top); gr.addColorStop(0, '#c8963a'); gr.addColorStop(1, '#ffdf6a');
            g.fillStyle = gr; g.fillRect(x - 30, bot - f * hh, 60, f * hh);
            g.strokeStyle = '#ffe9b0'; g.lineWidth = 2; g.strokeRect(x - 30, top, 60, hh);
            g.font = '700 30px Cinzel, serif'; g.fillStyle = '#ffe9b0'; g.fillText(this.reps, x + 110, 100);
            g.font = '600 16px Cinzel, serif'; g.fillStyle = '#c8a878'; g.fillText('ripetizioni', x + 110, 130);
            g.fillText(`${Math.max(0, this.left).toFixed(1)} s`, x - 110, 110);
            const nx = this.lastKey === 'A' ? 'D' : 'A';
            g.font = '700 40px Cinzel, serif'; g.fillStyle = '#ffffff'; g.fillText(this.wait > 0 ? '' : nx, x - 110, 60);
        }
        if (G === 'rhythm') {
            const cx = W / 2, cy = 115, R = 90;
            g.strokeStyle = '#e8c26a'; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, R * 0.3, 0, Math.PI * 2); g.stroke();
            g.strokeStyle = this.hit != null ? (this.hit > 0.4 ? '#8fe06a' : '#e06a5a') : '#ffe9b0'; g.lineWidth = 3;
            g.beginPath(); g.arc(cx, cy, Math.max(2, R * Math.max(0, this.r)), 0, Math.PI * 2); g.stroke();
            g.font = '600 18px Cinzel, serif'; g.fillStyle = '#c8a878'; g.fillText(`Salto ${Math.min(this.n + 1, this.N)} di ${this.N}`, W / 2, 20);
        }
        if (this.flash > 0) { g.fillStyle = this.good ? `rgba(140,230,100,${this.flash})` : `rgba(230,90,70,${this.flash})`; g.fillRect(0, 0, W, H); }
        g.font = 'italic 700 22px Almendra, serif'; g.fillStyle = '#ffe9b0'; g.fillText(this.msg || '', W / 2, H - 22);
    }
}

// --- il pannello di Sansone: il tuo livello, gli abitanti da allenare ---
export function palestraView(panels) {
    const app = panels.app, me = app.me || {};
    if (!app.net.connected) return panels.set('fist', 'La Palestra di Sansone', panels.needOnline());
    const G = me.gym || { lv: 0, pts: 0 }, need = gymToNext(G.lv), M = gymMods(G.lv), F = me.npcForma || {};
    const n = (panels.gymLine = ((panels.gymLine ?? -1) + 1)) % SANSONE.lines.length;
    const bar = (v, max) => h('div', { class: 'gym-bar' }, h('i', { style: { width: `${Math.round(Math.min(1, v / max) * 100)}%` } }));
    panels.set('fist', 'La Palestra di Sansone', h('div', { class: 'parchment' },
        h('p', { class: 'npc-say' }, `«${SANSONE.lines[n]}»`),
        h('h3', { class: 'sect', html: iconSVG('fist') }, 'Il tuo allenamento'),
        h('div', { class: 'gym-row' }, h('b', {}, `Livello di palestra ${G.lv} / ${GYM_MAX}`),
            G.lv < GYM_MAX ? h('span', { class: 'muted small' }, ` · forma ${G.pts} / ${need}`) : h('span', { class: 'muted small' }, ' · il massimo: Sansone ti saluta come un collega')),
        G.lv < GYM_MAX ? bar(G.pts, need) : null,
        h('p', { class: 'small' }, G.lv ? `In duello: +${(M.hp * 100).toFixed(1)}% di vita, +${Math.round(M.atk * 100)}% di forza.` : 'Ogni livello di palestra vale in duello un po\' di vita e un po\' di forza in più.'),
        h('p', { class: 'muted small' }, `Allenamenti rimasti oggi: ${me.gymLeft ?? GYM_DAILY} di ${GYM_DAILY}. Gli attrezzi sono sulla pedana: il sacco, i pesi, la corda (avvicinati e premi E).`),
        h('div', { class: 'btn-row' }, Object.entries(ATTREZZI).map(([k, A]) => h('button', { class: 'btn btn-sm', disabled: (me.gymLeft ?? GYM_DAILY) <= 0 ? true : null, onclick: () => { panels.close(); app.palestra?.train(k); } }, A.name))),
        h('h3', { class: 'sect', html: iconSVG('friends') }, 'Allena un abitante'),
        h('p', { class: 'muted small' }, `Paghi tu la lezione, e Sansone lo fa sudare. La forma degli abitanti è la stessa per tutti i viandanti: più si allenano, più salgono di livello, più è dura batterli in duello e più rende. Puoi pagare ${GYM_NPC_DAILY} lezioni al giorno (ne restano ${me.gymNpcLeft ?? GYM_NPC_DAILY}).`),
        h('div', { class: 'list gym-list' }, npcFighters().map(id => {
            const E = ERRANTI[id], fo = F[id] || 0, lv = npcLevel(id, F), cost = npcGymCost(lv), next = 3 - (fo % 3);
            return h('div', { class: 'row' },
                h('div', { class: 'grow' }, h('div', { class: 'nm' }, `${E.name} · livello ${lv}`, npcBoost(fo) ? h('span', { class: 'muted small' }, ` (${E.fight.level} + ${npcBoost(fo)} di palestra)`) : null),
                    h('div', { class: 'sub' }, fo >= GYM_NPC_MAX ? 'In forma smagliante' : `Forma ${fo} / ${GYM_NPC_MAX} · ${next === 3 ? 'sale di livello fra 3 lezioni' : `ancora ${next} ${next === 1 ? 'lezione' : 'lezioni'} e sale di livello`}`), bar(fo, GYM_NPC_MAX)),
                h('button', { class: 'btn btn-sm btn-primary', disabled: fo >= GYM_NPC_MAX || (me.gymNpcLeft ?? 1) <= 0 || (me.coins || 0) < cost ? true : null,
                    onclick: async () => { const r = await panels.act('gym:npc', { id }); if (r.ok) toast(`${E.name} suda per ${r.cost} monete: forma ${r.forma}${r.up ? `, ora è di livello ${r.level}!` : ''}`, { kind: 'coin', icon: 'fist' }); panels.render(); } },
                    `Lezione · ${cost} monete`));
        }))));
}
