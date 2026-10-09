// =====================================================================
//  LA PESCA NELLA NEBBIA (il Molo)
//  Si lancia, si aspetta che il galleggiante affondi, si ferra in tempo,
//  poi la barra alla Stardew Valley: tieni il pesce dentro la zona chiara
//  finché la lenza non è piena. Il server decide il pesce e i premi.
// =====================================================================
import * as THREE from 'three';
import { FISH, FISH_RARITY, FISH_SPOT, FISH_DAILY, DIARY, MATS, SEALS } from './shared/catalog.js';
import { h, $, toast, IS_MOBILE } from './util.js';
import { iconSVG, drawIcon } from './icons.js';

const BITE_WINDOW = IS_MOBILE ? 1.3 : 1.0;   // secondi per ferrare dopo l'abboccata

export class Fishing {
    constructor(app) {
        this.app = app;
        this.on = false;
        this.state = 'off';
        this.holding = false;
        this.buildHud();
        const down = (e) => { if (!this.on) return; if (e.target.closest?.('button')) return; this.holding = true; this.press(); };
        const up = () => { this.holding = false; };
        addEventListener('keydown', (e) => {
            if (!this.on) return;
            if (e.code === 'Space' || e.code === 'KeyE') { e.preventDefault(); if (!e.repeat) { this.holding = true; this.press(); } }
            else if (e.code === 'Escape') this.stop();
        });
        addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'KeyE') up(); });
        this.hud.addEventListener('mousedown', down);
        this.hud.addEventListener('touchstart', (e) => { if (e.target.closest('button')) return; e.preventDefault(); down(e); }, { passive: false });
        addEventListener('mouseup', up);
        addEventListener('touchend', up);
        // anche fuori dal riquadro: clic o tocco sul gioco
        addEventListener('mousedown', (e) => { if (this.on && e.target.id === 'game-canvas') down(e); });
        addEventListener('touchstart', (e) => { if (this.on && !this.hud.contains(e.target) && !e.target.closest?.('button, .toast')) { this.holding = true; this.press(); } }, { passive: true });
    }

    // --- INTERFACCIA ---
    buildHud() {
        this.canvas = h('canvas', { width: 150, height: 440, class: 'fish-bar' });
        this.title = h('div', { class: 'fish-title' });
        this.hint = h('div', { class: 'fish-hint' });
        this.result = h('div', { class: 'fish-result hidden' });
        this.btnCast = h('button', { class: 'btn btn-primary btn-sm', onclick: () => this.press(), html: iconSVG('rod') }, 'Lancia');
        this.btnExit = h('button', { class: 'btn btn-sm', onclick: () => this.stop(), html: iconSVG('close') }, 'Esci');
        this.hud = h('div', { id: 'fish-hud', class: 'hidden' },
            h('div', { class: 'fish-head', html: iconSVG('rod') }, 'Pesca nella Nebbia'),
            this.title, this.canvas, this.result, this.hint,
            h('div', { class: 'btn-row mid' }, this.btnCast, this.btnExit));
        document.body.append(this.hud);
        this.g = this.canvas.getContext('2d');
    }
    setHint(title, hint) { this.title.textContent = title; this.hint.textContent = hint; }

    // --- 3D: canna, lenza, galleggiante ---
    build3D() {
        const app = this.app, ch = app.myChar;
        const rod = new THREE.Group();
        const woodM = new THREE.MeshStandardMaterial({ color: '#5a3a1e', roughness: 0.8 });
        const g = new THREE.CylinderGeometry(0.012, 0.028, 2.1, 6); g.translate(0, 1.05, 0);
        rod.add(new THREE.Mesh(g, woodM));
        const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 10), new THREE.MeshStandardMaterial({ color: '#9ea4ab', metalness: 0.8, roughness: 0.3 }));
        reel.rotation.z = Math.PI / 2; reel.position.set(0.04, 0.25, 0); rod.add(reel);
        rod.rotation.x = Math.PI / 2 - 0.5;
        this.rodTip = new THREE.Object3D(); this.rodTip.position.y = 2.1; rod.add(this.rodTip);
        if (ch.weaponMesh) ch.weaponMesh.visible = false;
        ch.arms?.R?.hand?.add(rod);
        this.rod = rod;
        const bob = new THREE.Group();
        const top = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#e8202a', emissive: '#5a0808', roughness: 0.5 }));
        const bot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#f2efe6', roughness: 0.5 }));
        bob.add(top, bot);
        this.bobGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: app.world.glowTex, color: '#ffd76a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
        this.bobGlow.scale.set(1.2, 1.2, 1); bob.add(this.bobGlow);
        bob.visible = false;
        app.scene.add(bob);
        this.bob = bob;
        const pts = new Float32Array(16 * 3);
        const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
        this.line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: '#e8e0d0', transparent: true, opacity: 0.7 }));
        this.line.frustumCulled = false;
        app.scene.add(this.line);
        // cerchi nell'acqua quando abbocca
        this.ripples = [];
    }
    dispose3D() {
        const app = this.app;
        if (this.rod) { this.rod.parent?.remove(this.rod); this.rod = null; }
        if (app.myChar?.weaponMesh) app.myChar.weaponMesh.visible = true;
        if (this.bob) { app.scene.remove(this.bob); this.bob = null; }
        if (this.line) { app.scene.remove(this.line); this.line.geometry.dispose(); this.line = null; }
        for (const r of this.ripples) app.scene.remove(r.m);
        this.ripples = [];
    }
    ripple(x, z, big) {
        const m = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.12, 24), new THREE.MeshBasicMaterial({ color: '#e8dcff', transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
        m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z);
        this.app.scene.add(m);
        this.ripples.push({ m, t: 0, big });
    }

    // --- FLUSSO ---
    start() {
        const app = this.app;
        if (this.on) return;
        if (!app.net.connected || !app.helloDone) return toast('Il portale è chiuso: per pescare serve il server', { kind: 'bad' });
        this.on = true;
        app.mode = 'fish';
        document.exitPointerLock?.();
        app.keys = {};
        $('#click-to-play').classList.add('hidden');
        $('#prompt').classList.add('hidden');
        $('#mobile-controls')?.classList.add('hidden');
        const P = app.player;
        P.vel.set(0, 0, 0);
        P.pos.set(FISH_SPOT.x - 0.25, app.world.groundAt(FISH_SPOT.x, FISH_SPOT.z, P.pos.y + 0.5), FISH_SPOT.z + 0.4);
        P.yaw = 0;
        app.cam.yaw = Math.PI + 0.35; app.cam.pitch = 0.2; app.cam.wantDist = 5.2; app.cam.first = false;
        app.myChar.stop?.();
        this.build3D();
        this.hud.classList.remove('hidden');
        this.idle();
        app.sendPos?.(1, 0);
    }
    stop(silent) {
        if (!this.on) return;
        if (this.id && ['wait', 'bite', 'reel'].includes(this.state)) this.app.net.request('fish:reel', { id: this.id, ok: false });
        this.id = null;
        this.on = false; this.state = 'off';
        this.dispose3D();
        this.hud.classList.add('hidden');
        const app = this.app;
        if (app.mode === 'fish') app.mode = 'world';
        if (!silent && !IS_MOBILE) $('#click-to-play').classList.remove('hidden');
        if (IS_MOBILE) $('#mobile-controls')?.classList.remove('hidden');
    }
    idle() {
        this.state = 'idle';
        this.bob.visible = false;
        this.btnCast.classList.remove('hidden');
        const left = this.app.me?.fishLeft ?? FISH_DAILY;
        this.setHint('Il molo è silenzioso', `${IS_MOBILE ? 'Tocca Lancia, o Esci per tornare.' : 'Spazio o clic per lanciare · Esc per uscire.'} ${left > 0 ? `Oggi ancora ${left} pescate con i premi pieni.` : 'Per oggi i pesci danno poco: torna domani.'}`);
        this.draw();
    }
    press() {
        if (!this.on) return;
        switch (this.state) {
            case 'idle': case 'result': return this.cast();
            case 'wait': return this.lose('Troppo presto: il pesce si è spaventato', 'early');
            case 'bite': return this.strike();
        }
    }
    async cast() {
        const app = this.app;
        this.result.classList.add('hidden');
        this.btnCast.classList.add('hidden');
        this.state = 'cast';
        this.setHint('Lancio...', '');
        app.myChar.play?.('throw', 0.5);
        app.audio.play('throw');
        const P = app.player.pos;
        this.target = new THREE.Vector3(P.x + (Math.random() - 0.5) * 1.6, 0.02, P.z + 5 + Math.random() * 2);
        this.castT = 0;
        this.bob.visible = true;
        const r = await app.net.request('fish:cast', {});
        if (!this.on) return;
        if (!r.ok) { toast(r.msg, { kind: 'bad' }); this.idle(); return; }
        Object.assign(this, { id: r.id, bite: r.bite / 1000, diff: r.diff, move: r.move, night: r.night });
        this.waitT = 0;
        app.me.fishLeft = r.left;
    }
    strike() {
        this.state = 'reel';
        this.app.audio.play('swing');
        this.bobGlow.material.opacity = 0;
        const d = this.diff;
        Object.assign(this, { zs: 0.3 - d * 0.08, zy: 0.3, zv: 0, fy: 0.45, fv: 0, ty: 0.5, tT: 0, prog: 0.3, reelT: 0 });
        this.setHint('Ha abboccato!', IS_MOBILE ? 'Tieni premuto sulla barra per alzare la zona chiara' : 'Tieni premuto Spazio o il tasto del mouse per alzare la zona chiara');
    }
    lose(msg, kind) {
        const id = this.id;
        this.id = null;
        if (id) this.app.net.request('fish:reel', { id, ok: false });
        this.app.audio.play('error');
        toast(msg, { duration: 2600 });
        this.idle();
        if (kind === 'escape') this.ripple(this.bob.position.x, this.bob.position.z, true);
    }
    async win() {
        const app = this.app, id = this.id;
        this.id = null;
        this.state = 'wait-result';
        this.setHint('Lo tiri su...', '');
        const r = await app.net.request('fish:reel', { id, ok: true });
        if (!this.on) return;
        if (!r.ok || !r.caught) { toast(r.msg || 'Il pesce si è liberato all\'ultimo', { kind: 'bad' }); this.idle(); return; }
        this.showCatch(r);
    }
    showCatch(r) {
        const app = this.app, f = FISH[r.fish], R = FISH_RARITY[f.rar];
        app.audio.play(f.rar === 'epi' || r.page != null || r.seal ? 'special' : 'coin');
        const loot = [];
        if (r.xp) loot.push(`+${r.xp} esperienza`);
        if (r.coins) loot.push(`+${r.coins} monete`);
        for (const [k, n] of Object.entries(r.loot || {})) if (n) loot.push(`+${n} ${n > 1 && k === 'perla' ? 'Perle della Laguna' : MATS[k].name}`);
        const ic = f.rar === 'junk' ? 'boot' : f.rar === 'special' ? 'bottle' : r.fish === 'anguilla' ? 'eel' : f.rar === 'epi' ? 'angler' : 'fish';
        this.result.replaceChildren(...[
            h('div', { class: 'fr-ic', style: { color: R.color }, html: iconSVG(ic) }),
            h('div', { class: 'fr-name', style: { color: R.color } }, f.name),
            h('div', { class: 'fr-sub' }, `${R.name} · ${r.size} cm${r.first ? ' · nuova specie!' : r.record ? ' · nuovo record!' : ''}`),
            h('div', { class: 'fr-desc' }, f.desc),
            loot.length ? h('div', { class: 'fr-loot' }, loot.join(' · ')) : null,
            r.page != null ? h('div', { class: 'fr-page' }, h('b', {}, `Pagina ${r.page + 1} del Diario del Naufrago`), h('div', {}, `«${DIARY[r.page].t}»: la trovi nella bisaccia.`)) : null,
            r.seal ? h('div', { class: 'fr-seal', html: iconSVG(SEALS[r.seal].icon) }, h('b', {}, SEALS[r.seal].name), ` · ${SEALS[r.seal].desc}`) : null,
            r.full ? null : h('div', { class: 'muted small' }, 'Per oggi hai già pescato tanto: i premi sono ridotti.')].filter(Boolean));
        this.result.classList.remove('hidden');
        this.btnCast.classList.remove('hidden');
        this.state = 'result';
        this.bob.visible = false;
        this.setHint('Preso!', IS_MOBILE ? 'Tocca Lancia per riprovare' : 'Spazio per lanciare ancora · Esc per uscire');
        if (r.seal) toast(h('div', {}, h('b', {}, `Hai trovato il ${SEALS[r.seal].name}!`), h('div', {}, `${SEALS[r.seal].desc} Incastonalo sulla carta all'Altare.`)), { kind: 'coin', icon: SEALS[r.seal].icon, duration: 9000 });
    }

    // --- CICLO ---
    update(dt) {
        if (!this.on) return;
        const app = this.app, P = app.player, ch = app.myChar;
        ch.root.position.copy(P.pos); ch.root.rotation.y = P.yaw;
        ch.state = 'idle'; ch.speed = 0;
        app.updateFill?.(P);
        const t = (this.t = (this.t || 0) + dt);
        // galleggiante
        if (this.state === 'cast' && this.target) {
            this.castT += dt / 0.6;
            const k = Math.min(1, this.castT), tip = this.tipPos();
            this.bob.position.lerpVectors(tip, this.target, k);
            this.bob.position.y += Math.sin(k * Math.PI) * 1.6;
            if (k >= 1) { this.bob.position.copy(this.target); this.ripple(this.target.x, this.target.z); app.audio.play('splash'); if (this.id) this.state = 'wait'; else this.state = 'landed'; this.waitT = 0; }
        }
        if (this.state === 'landed' && this.id) this.state = 'wait';
        if (this.state === 'wait') {
            this.waitT += dt;
            this.bob.position.y = 0.02 + Math.sin(t * 2.4) * 0.025;
            if (Math.random() < dt * 1.2) { this.bob.position.y -= 0.04; this.ripple(this.bob.position.x, this.bob.position.z); } // assaggia l'esca
            this.setHint(this.night ? 'Notte sul molo: abboccano i pesci della nebbia' : 'Aspetta che il galleggiante affondi', 'Non ferrare troppo presto');
            if (this.waitT >= (this.bite || 3)) {
                this.state = 'bite'; this.biteT = 0;
                app.audio.play('splash');
                this.ripple(this.bob.position.x, this.bob.position.z, true);
                this.setHint('ORA! Ferra!', IS_MOBILE ? 'Tocca lo schermo' : 'Spazio o clic');
            }
        }
        if (this.state === 'bite') {
            this.biteT += dt;
            this.bob.position.y = -0.09 + Math.sin(t * 22) * 0.03;
            this.bobGlow.material.opacity = 0.9;
            if (this.biteT > BITE_WINDOW) { this.bobGlow.material.opacity = 0; this.lose('Ha mangiato l\'esca ed è scappato', 'escape'); }
        }
        if (this.state === 'reel') this.reel(dt, t);
        // lenza dalla punta della canna al galleggiante
        if (this.line) {
            const tip = this.tipPos(), b = this.bob.visible ? this.bob.position : tip;
            const pos = this.line.geometry.attributes.position, n = pos.count;
            const sag = this.state === 'reel' ? 0.05 : 0.6;
            for (let i = 0; i < n; i++) {
                const k = i / (n - 1);
                pos.setXYZ(i, tip.x + (b.x - tip.x) * k, tip.y + (b.y - tip.y) * k - Math.sin(k * Math.PI) * sag, tip.z + (b.z - tip.z) * k);
            }
            pos.needsUpdate = true;
            this.line.visible = this.bob.visible;
        }
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            r.t += dt;
            const s = 1 + r.t * (r.big ? 14 : 8);
            r.m.scale.set(s, s, 1); r.m.material.opacity = Math.max(0, 0.6 - r.t * 0.6);
            if (r.t > 1) { app.scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); this.ripples.splice(i, 1); }
        }
        this.draw();
    }
    tipPos() { return this.rodTip ? this.rodTip.getWorldPosition(new THREE.Vector3()) : this.app.player.pos.clone().add(new THREE.Vector3(0, 2, 1)); }

    // La barra: la zona chiara sale finché tieni premuto e ricade quando lasci
    reel(dt, t) {
        const d = this.diff;
        this.reelT += dt;
        this.zv += (this.holding ? 3.4 : -2.8) * dt;
        this.zv = Math.max(-1.6, Math.min(1.6, this.zv));
        this.zy += this.zv * dt;
        if (this.zy < 0) { this.zy = 0; this.zv = this.zv < -0.4 ? -this.zv * 0.3 : 0; }
        if (this.zy > 1 - this.zs) { this.zy = 1 - this.zs; this.zv = Math.min(0, this.zv); }
        // il pesce sceglie dove andare
        this.tT -= dt;
        if (this.tT <= 0) {
            const r = Math.random();
            if (this.move === 'dart') { this.ty = Math.random(); this.tT = 0.35 + Math.random() * (1.2 - d * 0.6); }
            else if (this.move === 'sink') { this.ty = r < 0.25 ? 0.5 + Math.random() * 0.5 : Math.pow(Math.random(), 1.8) * 0.6; this.tT = 0.7 + Math.random() * 1.1; }
            else if (this.move === 'float') { this.ty = r < 0.25 ? Math.random() * 0.5 : 1 - Math.pow(Math.random(), 1.8) * 0.6; this.tT = 0.7 + Math.random() * 1.1; }
            else { this.ty = 0.15 + Math.random() * 0.7; this.tT = 0.9 + Math.random() * 1.2; }
        }
        const spd = (this.move === 'dart' ? 0.9 : 0.45) + d * 1.1;
        const want = Math.max(-spd, Math.min(spd, (this.ty - this.fy) * 6));
        this.fv += (want - this.fv) * Math.min(1, dt * 7);
        this.fy = Math.max(0.03, Math.min(0.97, this.fy + this.fv * dt + Math.sin(t * 9) * 0.0015 * (1 + d * 3)));
        const inside = this.fy >= this.zy && this.fy <= this.zy + this.zs;
        this.inside = inside;
        this.prog += inside ? 0.22 * dt : -(0.12 + d * 0.15) * dt;
        // il galleggiante si agita
        this.bob.position.y = -0.06 + Math.sin(t * 14) * 0.04;
        this.bob.position.x += (Math.random() - 0.5) * dt * 0.6;
        if (this.prog >= 1) { this.prog = 1; this.win(); }
        else if (this.prog <= 0) { this.prog = 0; this.lose('Il pesce si è liberato', 'escape'); }
    }

    draw() {
        const g = this.g, W = this.canvas.width, H = this.canvas.height;
        g.clearRect(0, 0, W, H);
        const bx = 18, by = 14, bw = 82, bh = H - 28;
        // cornice di legno
        g.fillStyle = '#2b1a10'; g.fillRect(bx - 8, by - 8, bw + 16, bh + 16);
        g.strokeStyle = '#c99a2e'; g.lineWidth = 2; g.strokeRect(bx - 8, by - 8, bw + 16, bh + 16);
        const wg = g.createLinearGradient(0, by, 0, by + bh);
        wg.addColorStop(0, '#3a2a6a'); wg.addColorStop(0.5, '#1f1640'); wg.addColorStop(1, '#0c0818');
        g.fillStyle = wg; g.fillRect(bx, by, bw, bh);
        // bolle
        for (let i = 0; i < 9; i++) {
            const y = by + bh - ((this.t || 0) * (14 + i * 3) + i * 47) % bh, x = bx + 8 + (i * 29) % (bw - 16);
            g.fillStyle = 'rgba(200,190,255,0.18)'; g.beginPath(); g.arc(x, y, 2 + (i % 3), 0, Math.PI * 2); g.fill();
        }
        // progresso (a destra)
        const px = bx + bw + 16, pw = 16;
        g.fillStyle = '#140c08'; g.fillRect(px, by, pw, bh);
        g.strokeStyle = '#c99a2e'; g.lineWidth = 1.5; g.strokeRect(px, by, pw, bh);
        if (this.state === 'reel' || this.state === 'wait-result') {
            const p = Math.max(0, Math.min(1, this.prog));
            g.fillStyle = p > 0.66 ? '#6aff8a' : p > 0.33 ? '#ffd23a' : '#ff6a3a';
            g.fillRect(px + 2, by + bh - p * bh, pw - 4, p * bh);
            const zy = by + bh - (this.zy + this.zs) * bh, zh = this.zs * bh;
            g.fillStyle = this.inside ? 'rgba(140,255,170,0.5)' : 'rgba(190,230,255,0.32)';
            g.fillRect(bx + 3, zy, bw - 6, zh);
            g.strokeStyle = this.inside ? '#aaffc0' : '#cfe8ff'; g.lineWidth = 2; g.strokeRect(bx + 3, zy, bw - 6, zh);
            const fy = by + bh - this.fy * bh;
            drawIcon(g, 'fish', bx + bw / 2, fy, 38, this.inside ? '#ffffff' : '#ffd76a');
        } else {
            g.fillStyle = 'rgba(232,220,240,0.55)'; g.font = 'italic 15px Alegreya, serif'; g.textAlign = 'center';
            const msg = this.state === 'bite' ? '!' : this.state === 'wait' || this.state === 'cast' || this.state === 'landed' ? '...' : '';
            if (msg === '!') { g.font = '900 72px Cinzel, serif'; g.fillStyle = '#ffd23a'; g.fillText('!', bx + bw / 2, by + bh / 2 + 24); }
            else if (msg) g.fillText(msg, bx + bw / 2, by + bh / 2);
            drawIcon(g, 'hook', bx + bw / 2, by + bh - 40, 34, 'rgba(232,220,240,0.35)');
        }
    }
}
