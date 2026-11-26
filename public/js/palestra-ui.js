// =====================================================================
//  LA PALESTRA DI SANSONE nel mondo (solo client)
//  La sala al secondo piano del mastio, gli attrezzi, Sansone il Gigante;
//  i tre piccoli giochi degli attrezzi (il sacco, i pesi, la corda) e il
//  pannello con il tuo livello di palestra e la forma degli abitanti
//  (che si allenano da soli).
//  Le regole e i conti stanno in shared/palestra.js (li usa anche il server).
// =====================================================================
import * as THREE from 'three';
import { kit } from './terre.js';
import { Character } from './character.js';
import { characterLod } from './engine/stream.js';
import { PALESTRA, ATTREZZI, GYM_DAILY, GYM_MAX, gymToNext, gymMods, GYM_NPC_MAX, npcFighters, npcLevel, npcBoost, npcForma, npcNextForma } from './shared/palestra.js';
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
        const W = app.world, P = PALESTRA, { g, put, box, circ, lamp } = kit(W, P.x, P.z, 0, P.y);
        this.g = g;
        const wood = W.matWood, dark = new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 0.9 });
        const red = new THREE.MeshStandardMaterial({ color: '#8a2420', roughness: 0.55 }), iron = new THREE.MeshStandardMaterial({ color: '#2a2a30', metalness: 0.7, roughness: 0.35 });
        const HW = P.w / 2, HD = P.d / 2, H = P.h;
        // il pavimento di assi e le travi del soffitto
        const planks = canvasTex(512, 512, (c, w, hh) => {
            const tones = ['#8a6040', '#7e5838', '#946a46', '#835a3a'];
            for (let i = 0; i < 8; i++) {
                c.fillStyle = tones[i % 4]; c.fillRect(0, i * 64, w, 64);
                c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, i * 64, w, 3); c.fillRect((i * 173) % w, i * 64, 3, 64);
            }
        });
        planks.wrapS = planks.wrapT = THREE.RepeatWrapping; planks.repeat.set(2.5, 2);
        put(new THREE.PlaneGeometry(P.w, P.d), new THREE.MeshStandardMaterial({ map: planks, roughness: 0.8 }), 0, 0.006, 0, [-Math.PI / 2, 0, 0]).castShadow = false;
        for (const x of [-3.3, 0, 3.3]) put(new THREE.BoxGeometry(0.28, 0.3, P.d), dark, x, H - 0.15, 0);
        put(new THREE.BoxGeometry(P.w, 0.24, 0.24), dark, 0, H - 0.42, -HD + 0.12);
        // l'insegna, sul muro di fondo (dentro) e sopra la porta (fuori, verso il ballatoio)
        const sign = canvasTex(1024, 192, (c, w, hh) => {
            c.fillStyle = '#2a1a10'; c.fillRect(0, 0, w, hh); c.strokeStyle = '#c8963a'; c.lineWidth = 8; c.strokeRect(10, 10, w - 20, hh - 20);
            c.fillStyle = '#f2e2b8'; c.textAlign = 'center'; c.textBaseline = 'middle';
            c.font = 'bold 82px Cinzel, Georgia, serif'; c.fillText('PALESTRA DI SANSONE', w / 2, hh / 2 - 18, w - 70);
            c.fillStyle = '#c8963a'; c.font = 'italic 36px Georgia, serif'; c.fillText('— vivi, morti e mezzi —', w / 2, hh / 2 + 46, w - 70);
        });
        const signM = new THREE.MeshStandardMaterial({ map: sign, roughness: 0.8 });
        put(new THREE.BoxGeometry(4.8, 1.02, 0.05), dark, 0, 2.5, -HD + 0.03);
        put(new THREE.PlaneGeometry(4.6, 0.86), signM, 0, 2.5, -HD + 0.065).castShadow = false;
        const dz = P.door - P.z, ox = -(HW + 1);   // la faccia ovest del mastio è a 6 m dal centro
        put(new THREE.BoxGeometry(0.05, 0.62, 2.02), dark, ox - 0.03, 2.95, dz);
        put(new THREE.PlaneGeometry(1.9, 0.52), signM, ox - 0.06, 2.95, dz, [0, -Math.PI / 2, 0]).castShadow = false;
        // il sacco: appeso a un gancio della trave, si muove quando lo colpisci
        const [bx, bz] = ATTREZZI.sacco.at;
        put(new THREE.BoxGeometry(0.12, 0.4, 0.12), iron, bx, H - 0.5, bz);
        this.bag = new THREE.Group(); this.bag.position.set(bx, H - 0.7, bz); g.add(this.bag);
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 5), dark); rope.position.y = -0.35; this.bag.add(rope);
        const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 1.15, 14), red); bag.position.y = -1.27; bag.castShadow = true; this.bag.add(bag);
        for (const y of [-0.8, -1.75]) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.02, 6, 18), iron); b.rotation.x = Math.PI / 2; b.position.y = y; this.bag.add(b); }
        circ(bx, bz, 0.35, 0.5, 3);
        // i pesi: la panca, il supporto, il bilanciere con i dischi, i manubri per terra
        const [px, pz] = ATTREZZI.pesi.at;
        put(new THREE.BoxGeometry(0.45, 0.1, 1.5), dark, px, 0.5, pz + 0.3);
        for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.08, 0.5, 0.08), iron, px + s * 0.16, 0.25, pz + 0.3 + s * 0.55);
        for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.08, 1.1, 0.08), iron, px + s * 0.6, 0.55, pz - 0.35);
        this.bar = new THREE.Group(); this.bar.position.set(px, 1.05, pz - 0.35); g.add(this.bar);
        const barM = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.0, 8), iron); barM.rotation.z = Math.PI / 2; this.bar.add(barM);
        for (const s of [-1, 1]) for (const k of [0, 1]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.24 - k * 0.06, 0.24 - k * 0.06, 0.06, 18), k ? red : iron); d.rotation.z = Math.PI / 2; d.position.x = s * (0.78 + k * 0.07); d.castShadow = true; this.bar.add(d); }
        for (let i = 0; i < 4; i++) { const m = put(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 6), iron, px - 1.1 + i * 0.25, 0.08, pz + 1.3, [0, 0, Math.PI / 2]); for (const s of [-1, 1]) put(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10), iron, px - 1.1 + i * 0.25 + s * 0.14, 0.08, pz + 1.3, [0, 0, Math.PI / 2]); m.castShadow = true; }
        box(px, pz, 1.6, 1.8, 0, 1.2);
        // la corda: il tappeto, la corda arrotolata
        const [cx, cz] = ATTREZZI.corda.at;
        put(new THREE.BoxGeometry(1.6, 0.03, 1.6), new THREE.MeshStandardMaterial({ color: '#3a5a7a', roughness: 1 }), cx, 0.015, cz);
        this.rope = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.018, 6, 24), new THREE.MeshStandardMaterial({ color: '#d8c080', roughness: 0.8 }));
        this.rope.rotation.x = Math.PI / 2; this.rope.position.set(cx + 0.55, 0.04, cz + 0.55); g.add(this.rope);
        for (const s of [-1, 1]) put(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 8), wood, cx + 0.55 + s * 0.28, 0.05, cz + 0.55, [0, 0, Math.PI / 2]);
        // la spalliera sul muro est, una panca lungo il muro sud, il barile dell'acqua
        for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.08, 2.6, 0.1), wood, HW - 0.1, 1.3, 1.2 + s * 0.6);
        for (let i = 0; i < 9; i++) put(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 6), wood, HW - 0.1, 0.25 + i * 0.28, 1.2, [Math.PI / 2, 0, 0]);
        box(HW - 0.1, 1.2, 0.2, 1.4, 0, 2.6);
        put(new THREE.BoxGeometry(2.4, 0.08, 0.42), wood, 0.6, 0.44, HD - 0.3);
        for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.08, 0.42, 0.36), dark, 0.6 + s * 1.05, 0.21, HD - 0.3);
        box(0.6, HD - 0.3, 2.4, 0.45, 0, 0.5);
        put(new THREE.CylinderGeometry(0.32, 0.28, 0.8, 14), wood, -3.9, 0.4, HD - 0.5);
        for (const y of [0.15, 0.65]) put(new THREE.TorusGeometry(0.31, 0.02, 6, 18), iron, -3.9, y, HD - 0.5, [Math.PI / 2, 0, 0]);
        circ(-3.9, HD - 0.5, 0.34, 0, 0.8);
        // le lanterne appese alle travi: dentro la luce è sempre accesa
        for (const x of [-3.3, 3.3]) {
            put(new THREE.CylinderGeometry(0.12, 0.15, 0.3, 8), new THREE.MeshStandardMaterial({ color: '#ffd890', emissive: '#ffb347', emissiveIntensity: 1.2 }), x, H - 0.55, 0.6);
            lamp(x, H - 0.75, 0.6, '#ffc870', 10, 11); W.lights[W.lights.length - 1].out = false;
        }
        // Sansone, in mezzo alla sala, guarda la porta
        this.san = new Character(SANSONE.app, { torso: 'cotta' }, { name: SANSONE.name, sub: 'Il maestro della palestra', color: '#ffb070' });
        const sx = P.x + 1.4, sz = P.z + 1.4;
        this.san.root.position.set(sx, P.y, sz); this.san.root.rotation.y = -Math.PI / 2;
        app.scene.add(this.san.root);
        W.addCirc(sx, sz, 0.45, P.y - 0.2, P.y + 2.4);
        // gli attrezzi e Sansone si usano con E
        W.interactables.push({ id: 'palestra', x: sx, z: sz, y: P.y, r: 2.6, label: 'Parla con Sansone il Gigante' });
        for (const [k, A] of Object.entries(ATTREZZI)) W.interactables.push({ id: 'gym', k, x: P.x + A.at[0], z: P.z + A.at[1] + 1.1, y: P.y, r: 1.7, label: () => `${A.name}: allenati (${this.app.me?.gymLeft ?? GYM_DAILY} rimasti oggi)` });
    }
    update(dt, camPos) {
        this.t += dt;
        if (this.bag) { this.bagV = (this.bagV || 0) * Math.exp(-dt * 1.5) - (this.bag.rotation.x) * dt * 9; this.bag.rotation.x += this.bagV * dt; }
        if (this.bar) this.bar.position.y += ((this.barUp ? 1.6 : 1.05) - this.bar.position.y) * Math.min(1, dt * 8);
        if (this.rope && this.ropeSpin) this.rope.rotation.z += dt * 12;
        const d = camPos.distanceTo(this.san.root.position), near = d < 40 && !this.app.interior;
        this.g.visible = d < 90 && !this.app.interior;
        this.san.root.visible = near;
        characterLod(this.san, d);
        if (near) { this.san.state = 'idle'; this.san.update(dt); }
        if (this.san.tag) this.san.tag.visible = d < 14;
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
    const G = me.gym || { lv: 0, pts: 0 }, need = gymToNext(G.lv), M = gymMods(G.lv), F = me.npcForma || npcForma();
    const n = (panels.gymLine = ((panels.gymLine ?? -1) + 1)) % SANSONE.lines.length;
    const bar = (v, max) => h('div', { class: 'gym-bar' }, h('i', { style: { width: `${Math.round(Math.min(1, v / max) * 100)}%` } }));
    panels.set('fist', 'La Palestra di Sansone', h('div', { class: 'parchment' },
        h('p', { class: 'npc-say' }, `«${SANSONE.lines[n]}»`),
        h('h3', { class: 'sect', html: iconSVG('fist') }, 'Il tuo allenamento'),
        h('div', { class: 'gym-row' }, h('b', {}, `Livello di palestra ${G.lv} / ${GYM_MAX}`),
            G.lv < GYM_MAX ? h('span', { class: 'muted small' }, ` · forma ${G.pts} / ${need}`) : h('span', { class: 'muted small' }, ' · il massimo: Sansone ti saluta come un collega')),
        G.lv < GYM_MAX ? bar(G.pts, need) : null,
        h('p', { class: 'small' }, G.lv ? `In duello: +${(M.hp * 100).toFixed(1)}% di vita, +${Math.round(M.atk * 100)}% di forza.` : 'Ogni livello di palestra vale in duello un po\' di vita e un po\' di forza in più.'),
        h('p', { class: 'muted small' }, `Allenamenti rimasti oggi: ${me.gymLeft ?? GYM_DAILY} di ${GYM_DAILY}. Gli attrezzi sono nella sala: il sacco, i pesi, la corda (avvicinati e premi E).`),
        h('div', { class: 'btn-row' }, Object.entries(ATTREZZI).map(([k, A]) => h('button', { class: 'btn btn-sm', disabled: (me.gymLeft ?? GYM_DAILY) <= 0 ? true : null, onclick: () => { panels.close(); app.palestra?.train(k); } }, A.name))),
        h('h3', { class: 'sect', html: iconSVG('friends') }, 'Gli abitanti che si allenano'),
        h('p', { class: 'muted small' }, 'Tito, Marta e Lino vengono qui da soli, ogni giorno, ognuno col suo ritmo. La loro forma è la stessa per tutti i viandanti: più si allenano, più salgono di livello, più è dura batterli in duello e più rende.'),
        h('div', { class: 'list gym-list' }, npcFighters().map(id => {
            const E = ERRANTI[id], fo = F[id] || 0, lv = npcLevel(id, F), nx = npcNextForma(id), hrs = nx == null ? 0 : Math.max(1, Math.round(nx / 36e5));
            return h('div', { class: 'row' },
                h('div', { class: 'grow' }, h('div', { class: 'nm' }, `${E.name} · livello ${lv}`, npcBoost(fo) ? h('span', { class: 'muted small' }, ` (${E.fight.level} + ${npcBoost(fo)} di palestra)`) : null),
                    h('div', { class: 'sub' }, fo >= GYM_NPC_MAX ? 'In forma smagliante: più di così non migliora' : `Forma ${fo} / ${GYM_NPC_MAX} · il prossimo punto fra ${hrs < 24 ? `circa ${hrs} ${hrs === 1 ? 'ora' : 'ore'}` : `${Math.round(hrs / 24)} giorni`}`), bar(fo, GYM_NPC_MAX)));
        }))));
}
