// =====================================================================
//  DUELLO 2.5D — l'Arena del Castello vista di lato
//  Online: il server simula, qui si interpola e si disegna.
//  Allenamento: la simulazione gira in locale contro il Fantasma.
// =====================================================================
import * as THREE from 'three';
import { Character, buildWeapon } from './character.js';
import { makeSky, makeWaterMaterial, glowTexture } from './world.js';
import { FireSet, Gallery } from './decor.js';
import { buildColosseum } from './arena.js';
import { applySky, Precipitation } from './sky.js';
import { FIGHT, IN, HELD_MASK, createDuel, stepDuel, snapshotDuel, readFighter, createBot, botInput, moveDuration, moveStart, clashOf } from './shared/fight.js';
import { ELEMENTS, ECONOMY, weaponStats, seedRelation, MATS, RESERVE_WEAPON, RENTALS, weaponLevel, weaponDurability, weaponWearLeft } from './shared/catalog.js';

// Come si guardano i due semi sulla Ruota (riga sotto le barre e nella schermata delle scommesse)
const VERB = { fuoco: 'scioglie', ghiaccio: 'gela', palude: 'spacca', pietra: 'spegne', tempesta: 'disperde', spettro: 'soffoca' };
export function matchText(A, B) {
    const r = seedRelation(A.element, B.element), n = e => ELEMENTS[e]?.name || e;
    if (r === 'up') return `${n(A.element)} ${VERB[A.element]} ${n(B.element)}: vantaggio a ${A.name}`;
    if (r === 'down') return `${n(B.element)} ${VERB[B.element]} ${n(A.element)}: vantaggio a ${B.name}`;
    if (r === 'opp') return `${n(A.element)} e ${n(B.element)} sono opposti: Dissonanza, le mosse possono fallire`;
    if (r === 'same') return 'Stesso seme: Risonanza, la SUPER si carica più in fretta';
    return A.element === 'fango' || B.element === 'fango' ? 'Il Fango non ha vantaggi né debolezze' : 'Nessun vantaggio fra questi due semi';
}
import { h, $, coin, fmt, toast, IS_MOBILE } from './util.js';
import { elIcon, iconSVG } from './icons.js';
import { buildPet, animatePet } from './pets.js';
import { PETS } from './shared/pet.js';

const ACTION_OF = { light: 'light', heavy: 'heavy', air: 'air', up: 'up', sp: 'special' };
const SPECIAL_SFX = { fiammata: 'fire', gelo: 'ice', saetta: 'thunder', frana: 'rock', fango: 'mudhit', miasma: 'ghost', passo: 'dash' };
const HEAVY_WEAPONS = ['martello', 'ascia', 'falce', 'bastone'];
const _tip = new THREE.Vector3();

function textSprite(text, color = '#fff', size = 64) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 96;
    const g = c.getContext('2d');
    g.font = `900 ${size}px Cinzel, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 8; g.strokeStyle = '#000'; g.strokeText(text, 128, 50);
    g.fillStyle = color; g.fillText(text, 128, 50);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
    s.scale.set(1.6, 0.6, 1); s.renderOrder = 1000;
    return s;
}

export class DuelView {
    constructor(app, info, opts) {
        this.app = app;
        this.info = info;
        this.role = opts.role;          // 'fighter' | 'spectator' | 'local'
        this.side = opts.side || null;  // 'a' | 'b'
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 2000);
        this.camPos = new THREE.Vector3(0, 3, 18);
        this.camLook = new THREE.Vector3(0, 2, 0);
        this.shake = 0;
        this.hitstop = 0;                       // fermo immagine sull'impatto
        this.timeScale = 1; this.slowT = 0;     // rallentatore (K.O. e SUPER)
        this.kick = new THREE.Vector3();        // spinta della camera nel verso del colpo
        this.fovPunch = 0;
        this.koFocus = null;
        this.snaps = [];
        this.evQueue = [];
        this.fx = [];
        this.last = null;
        this.held = 0; this.pressed = 0; this.sentHeld = -1;
        this.ended = false;
        this.t = 0;
        this.glowTex = glowTexture();
        this.buildStage();
        this.fighters = {};
        for (const s of ['a', 'b']) {
            const f = info[s];
            const ch = new Character(f.appearance, f.look, {}); // i nomi sono già nelle barre vita
            ch.root.position.set(s === 'a' ? -4 : 4, 0, 0);
            if (f.boss) ch.root.scale.setScalar(1.3);   // il Re Annegato
            this.scene.add(ch.root);
            const sp = f.petSp || null;
            if (sp && PETS[sp]) {
                const pm = buildPet(sp, sp === 'fatuo' ? ELEMENTS[f.element]?.glow : null);
                pm.scale.setScalar(1.4);
                pm.position.set(s === 'a' ? -5.2 : 5.2, 0, -0.8);
                this.scene.add(pm);
                (this.pets ||= {})[s] = { m: pm, dash: 0, tx: 0, ty: 0, t: Math.random() * 5 };
            }
            const ws = weaponStats(f.look?.weapon);
            this.fighters[s] = {
                ch, info: f, aspd: ws.speed, special: ELEMENTS[f.element]?.special.id || 'fango',
                ice: this.makeIce(), status: this.makeStatus(), hpShown: 1, lastHp: null,
                // lampo di luce sul corpo colpito e bagliore della carica: creati subito, così non si ricompilano gli shader a metà duello
                hitL: new THREE.PointLight('#ffe8c8', 0, 4.5, 2),
                glow: new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: '#ffe2a8', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })),
                px: null, py: null, vx: 0, vy: 0, alt: 0, jit: 0, charging: false, facing: 1,
            };
            this.scene.add(this.fighters[s].ice, this.fighters[s].status, this.fighters[s].hitL, this.fighters[s].glow);
        }
        this.projMeshes = [];
        this.zoneMeshes = [];
        this.boltMeshes = [];
        this.buildHud();
        this.bindInput();
        if (this.role === 'local') {
            const setup = (x) => ({ id: x.id, name: x.name, element: x.element, weapon: x.look?.weapon, dur: x.dur, reserve: x.reserve, pet: x.pet, level: x.level || 1, talents: x.talents, gear: x.gear, gearPlus: x.gearPlus, seals: x.seals, boss: x.boss });
            this.sim = createDuel(setup(info.a), setup(info.b));
            this.bot = createBot(opts.botLevel || 1);
            this.acc = 0;
            this.pushSnap(snapshotDuel(this.sim, [{ t: 'round', n: 1 }]));
        } else if (info.snapshot) {
            this.pushSnap(info.snapshot);
        }
        if (this.role !== 'local' && info.phase === 'betting') this.showVS();
        else if (this.role !== 'local') this.hideVS();
    }

    // --- PALCO ---
    buildStage() {
        const s = this.scene;
        s.fog = new THREE.FogExp2('#2d0a45', 0.012);
        s.add(this.sky = makeSky());
        s.add(this.hemi = new THREE.HemisphereLight('#7a5aaa', '#1a1022', 1.0));
        const moon = this.moonL = new THREE.DirectionalLight('#c8c0ff', 1.3);
        moon.position.set(-6, 14, 10); moon.castShadow = !IS_MOBILE;
        moon.shadow.mapSize.set(1024, 1024); moon.shadow.bias = -0.0006; moon.shadow.normalBias = 0.03;
        const sc = moon.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -6;
        s.add(moon);
        // il Colosseo in rovina (arena.js): palco, piattaforme, gradinate, bracieri
        this.fires = new FireSet();
        this.arena = buildColosseum(s, { alta: this.app.quality === 'alta', fires: this.fires });
        this.lights = this.arena.lights;
        // quadri di Sputnik Homies appesi al podio, dietro al palco
        this.gallery = new Gallery();
        this.arena.frames.forEach((f, i) => {
            const p = this.gallery.make(f.w, { plaque: true, interval: 10, offset: i * 3 });
            p.position.set(f.x, f.y, f.z); p.rotation.y = f.ry; s.add(p);
        });
        const water = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), makeWaterMaterial(null));
        water.rotation.x = -Math.PI / 2; water.position.y = -10;
        this.water = water; s.add(water);
        this.precip = new Precipitation(s, { count: 700 });
        // braci che salgono
        const n = 160, pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) pos.set([(Math.random() - 0.5) * 40, Math.random() * 16 - 4, (Math.random() - 0.5) * 10 - 3], i * 3);
        const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.embers = new THREE.Points(eg, new THREE.PointsMaterial({ color: '#ff9a4a', size: 0.09, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
        s.add(this.embers);
    }
    makeIce() {
        const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 1.2), new THREE.MeshStandardMaterial({ color: '#9fe8ff', transparent: true, opacity: 0.45, emissive: '#3a9aff', emissiveIntensity: 0.6, roughness: 0.1 }));
        m.visible = false;
        return m;
    }
    makeStatus() {
        const g = new THREE.Group();
        const mk = (color) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.visible = false; g.add(s); return s; };
        g.userData = { burn: mk('#ff6a1a'), poison: mk('#5aff5a'), slow: mk('#a0703c'), armor: mk('#ffb35a'), dirty: mk('#6a3a12') };
        const flame = this.fires.make(1.5);
        flame.visible = false; g.add(flame); g.userData.flame = flame;
        return g;
    }

    // --- HUD ---
    buildHud() {
        this.hud = $('#duel-hud');
        this.hud.classList.remove('hidden');
        $('#dh-result').classList.add('hidden');
        $('#dh-timer').textContent = FIGHT.ROUND_TIME;
        $('#dh-announce').className = 'dh-announce';
        for (const s of ['a', 'b']) {
            const f = this.info[s];
            // azzera l'HUD del duello precedente
            $(`#dh-fill-${s}`).style.width = '100%'; $(`#dh-trail-${s}`).style.width = '100%';
            $(`#dh-fill-${s}`).classList.remove('low');
            $(`#dh-meter-${s}`).style.width = '0%'; $(`#dh-meter-${s}`).classList.remove('full');
            $(`#dh-combo-${s}`).classList.remove('show');
            const rounds = $(`#dh-rounds-${s}`); rounds.dataset.rw = '0';
            rounds.replaceChildren(...Array.from({ length: FIGHT.WIN_ROUNDS }, () => h('div', { class: 'dh-round' })));
            $(`#dh-name-${s}`).replaceChildren(...(s === 'a' ? [elIcon(f.element), f.name] : [f.name, elIcon(f.element)]));
            const img = $(`#dh-portrait-${s}`);
            if (f.cardImage) { img.src = f.cardImage; img.classList.remove('hidden'); } else img.classList.add('hidden');
        }
        const help = $('#dh-help');
        const k = (t) => `<i class="kbd">${t}</i>`;
        const match = `<span class="dh-match">${matchText(this.info.a, this.info.b).replace(/[<>&]/g, '')}</span>`;
        if (this.role === 'spectator') help.innerHTML = match + '<span>Stai assistendo al duello dagli spalti</span>';
        else help.innerHTML = match + `<span>${k('A')}${k('D')} muovi</span><span>${k('W')} salta</span><span>${k('J')} colpo</span><span>${k('K')} fendente</span><span>${k('L')} Super</span><span>${k('E')} para</span><span>${k('Shift')} scatto</span><span>${k('Esc')} resa</span>`;
        const exit = $('#dh-exit');
        exit.classList.toggle('hidden', this.role !== 'spectator');
        exit.textContent = 'Esci';
        exit.onclick = () => this.app.exitDuel();
        $('#dh-spect').classList.toggle('hidden', this.role !== 'spectator');
        this.updatePool(this.info.pool, this.info.spectators);
        const mc = $('#mobile-controls');
        if (IS_MOBILE) { mc.classList.remove('hidden'); $('#mc-world').classList.add('hidden'); $('#mc-duel').classList.toggle('hidden', this.role === 'spectator'); }
    }
    announce(text, cls = '') {
        const el = $('#dh-announce');
        el.className = 'dh-announce ' + cls;
        el.textContent = text;
        void el.offsetWidth;
        el.classList.add('show');
    }
    updatePool(pool, spectators) {
        if (!pool) return;
        this.info.pool = pool;
        if (spectators != null) this.info.spectators = spectators;
        const sp = $('#dh-spect');
        sp.replaceChildren(
            h('span', { html: iconSVG('eye') }, `${this.info.spectators || 0} sugli spalti`),
            h('span', { html: iconSVG('coins') }, 'Montepremi ', coin(pool.a + pool.b)),
            h('span', { class: 'muted small' }, `${pool.n || 0} scommesse`));
        if (!$('#dh-vs').classList.contains('hidden')) this.renderVS();
    }
    showVS() {
        this.vsEnd = performance.now() + (this.info.endsIn ?? ECONOMY.BET_WINDOW_MS);
        $('#dh-vs').classList.remove('hidden');
        this.renderVS(true);
    }
    hideVS() { $('#dh-vs').classList.add('hidden'); }
    renderVS(full) {
        const vs = $('#dh-vs');
        const A = this.info.a, B = this.info.b, pool = this.info.pool || { a: 0, b: 0, n: 0 };
        const tot = pool.a + pool.b;
        const odds = (s) => tot && pool[s] ? (tot / pool[s]).toFixed(2) + '×' : '—';
        if (full || !this.vsCount) {
            const card = (f, s) => h('div', { class: 'vs-card ' + s },
                f.cardImage ? h('img', { src: f.cardImage, alt: f.name }) : null,
                h('div', { class: 'vs-name' }, f.name),
                h('div', { class: 'vs-sub' }, elIcon(f.element), `${ELEMENTS[f.element]?.name} · Livello ${f.level || 1} · Gloria ${f.rating || 1000}`));
            this.vsCount = h('div', { class: 'vs-count' });
            this.vsPool = h('div', { class: 'vs-pool' });
            const bet = h('div', { class: 'vs-bet' });
            if (this.role === 'spectator') {
                const amt = h('input', { type: 'number', min: 1, max: ECONOMY.MAX_BET, value: 25 });
                const place = async (side) => {
                    const r = await this.app.net.request('duel:bet', { id: this.info.id, side, amount: +amt.value });
                    toast(r.msg || (r.ok ? 'Scommessa piazzata' : 'Errore'), { kind: r.ok ? 'coin' : 'bad' });
                    if (r.ok) this.app.audio.play('coin');
                };
                bet.append(h('span', {}, 'Punta '), amt, h('span', {}, ' monete su '),
                    h('button', { class: 'btn btn-sm', onclick: () => place('a') }, A.name),
                    h('button', { class: 'btn btn-sm', onclick: () => place('b') }, B.name),
                    h('button', { class: 'btn btn-sm', onclick: () => this.app.exitDuel() }, 'Esci'));
            } else {
                bet.append(h('span', { class: 'muted' }, this.info.stake ? `In palio ${this.info.stake} Sputnik Coin a testa: chi vince prende tutto` : 'Il pubblico sta piazzando le sue scommesse...'),
                    h('button', { class: 'btn btn-sm btn-danger', onclick: () => this.forfeit() }, 'Ritirati'));
                if (this.role === 'fighter') bet.append(this.lockerBox());
            }
            vs.replaceChildren(h('div', { class: 'vs-row' }, card(A, 'a'), h('div', { class: 'vs-x' }, 'VS'), card(B, 'b')), h('div', { class: 'vs-match' }, matchText(A, B)), this.vsCount, this.vsPool, bet);
        }
        this.vsPool.replaceChildren(
            h('span', {}, coin(pool.a), ` (${odds('a')})`),
            h('div', { class: 'bar' }, h('div', { class: 'pa', style: { width: tot ? `${pool.a / tot * 100}%` : '50%' } }), h('div', { class: 'pb', style: { width: tot ? `${pool.b / tot * 100}%` : '50%' } })),
            h('span', {}, `(${odds('b')}) `, coin(pool.b)));
    }

    // --- INPUT ---
    bindInput() {
        if (this.role === 'spectator') return;
        const KEYS = {
            KeyA: IN.LEFT, ArrowLeft: IN.LEFT, KeyD: IN.RIGHT, ArrowRight: IN.RIGHT,
            KeyW: IN.UP, ArrowUp: IN.UP, Space: IN.UP, KeyS: IN.DOWN, ArrowDown: IN.DOWN, KeyI: IN.BLOCK, KeyE: IN.BLOCK,
        };
        const PRESS = { KeyW: IN.JUMP, ArrowUp: IN.JUMP, Space: IN.JUMP, KeyJ: IN.LIGHT, KeyK: IN.HEAVY, KeyL: IN.SPECIAL, KeyQ: IN.SPECIAL, ShiftLeft: IN.DASH, ShiftRight: IN.DASH };
        this.onKey = (e) => {
            if (document.activeElement?.tagName === 'INPUT') return;
            if (e.code === 'Escape' && e.type === 'keydown') { this.forfeit(); return; }
            const hb = KEYS[e.code], pb = PRESS[e.code];
            if (hb == null && pb == null) return;
            e.preventDefault();
            if (e.type === 'keydown') { if (hb) this.held |= hb; if (pb && !e.repeat) this.pressed |= pb; }
            else if (hb) this.held &= ~hb;
        };
        this.onMouse = (e) => {
            if (e.target.closest?.('.btn, .dh-vs, .dh-result, input')) return;
            if (e.button === 0) this.pressed |= IN.LIGHT;
            if (e.button === 2) this.pressed |= IN.HEAVY;
        };
        this.onCtx = (e) => e.preventDefault();
        addEventListener('keydown', this.onKey);
        addEventListener('keyup', this.onKey);
        addEventListener('mousedown', this.onMouse);
        addEventListener('contextmenu', this.onCtx);
        if (IS_MOBILE) this.bindMobile();
    }
    bindMobile() {
        const btn = (id, bit, hold) => {
            const el = $(id);
            const down = (e) => { e.preventDefault(); el.classList.add('pressed'); if (hold) this.held |= bit; else this.pressed |= bit; };
            const up = (e) => { e.preventDefault(); el.classList.remove('pressed'); if (hold) this.held &= ~bit; };
            el.addEventListener('touchstart', down, { passive: false });
            el.addEventListener('touchend', up, { passive: false });
            this.mobileCleanup.push(() => { el.removeEventListener('touchstart', down); el.removeEventListener('touchend', up); });
        };
        this.mobileCleanup = [];
        btn('#mb-light', IN.LIGHT); btn('#mb-heavy', IN.HEAVY); btn('#mb-special', IN.SPECIAL);
        btn('#mb-dash', IN.DASH); btn('#mb-djump', IN.JUMP); btn('#mb-block', IN.BLOCK, true);
        this.useJoy = true; // il joystick è quello del mondo (app.joy), letto a ogni frame
        this.wasUp = false;
    }
    readJoy() {
        const j = this.app.joy;
        if (!this.useJoy || !j) return;
        this.held &= ~(IN.LEFT | IN.RIGHT | IN.UP | IN.DOWN);
        if (j.x > 0.35) this.held |= IN.RIGHT;
        if (j.x < -0.35) this.held |= IN.LEFT;
        if (j.y > 0.55) { this.held |= IN.UP; if (!this.wasUp) this.pressed |= IN.JUMP; this.wasUp = true; } else this.wasUp = false;
        if (j.y < -0.55) this.held |= IN.DOWN;
    }
    flushInput() {
        if (this.role !== 'fighter') return;
        if (this.held !== this.sentHeld || this.pressed) {
            this.app.net.send('duel:input', { h: this.held & HELD_MASK, p: this.pressed });
            this.sentHeld = this.held; this.pressed = 0;
        }
    }
    forfeit() {
        if (this.ended) { this.app.exitDuel(); return; }
        if (this.role === 'local') { this.app.exitDuel(); return; }
        if (this.role === 'spectator') { this.app.exitDuel(); return; }
        if (confirm('Vuoi davvero ritirarti? Perderai il duello.')) this.app.net.send('duel:forfeit');
    }

    // --- RETE ---
    onBegin(gear) {
        this.hideVS(); this.announce('ROUND 1'); this.app.audio.play('gong');
        for (const s of ['a', 'b']) {
            if (!gear?.[s]) continue;
            this.info[s].reserve = gear[s].reserve;
            this.setWeapon(s, gear[s].weapon);
        }
    }
    setWeapon(s, spec) {
        const ch = this.fighters[s]?.ch;
        if (!ch?.weaponMesh) return;
        const hand = ch.weaponMesh.parent;
        hand?.remove(ch.weaponMesh);
        ch.weaponMesh = buildWeapon(spec || null);
        ch.weaponMesh.rotation.x = Math.PI / 2;
        hand?.add(ch.weaponMesh);
    }
    // --- LO SPOGLIATOIO: prima del duello, con che arma scendere in campo ---
    lockerBox() {
        const app = this.app, me = app.me, lv = me.level || 1;
        const box = h('div', { class: 'locker' });
        const draw = () => {
            const inv = (me.inventory || []).filter(i => i.kind === 'weapon');
            const main = me.equipment?.weapon || '', res = me.reserve || '', rent = this.myRent || '';
            const label = (i) => {
                const left = weaponWearLeft(i), max = weaponDurability(i.spec);
                return `${i.spec.name || 'Arma'}${i.spec.plus ? ' +' + i.spec.plus : ''} · ${i.broken ? 'ROTTA' : `${Math.round(left / max * 100)}%`}`;
            };
            const ok = (i) => !i.broken && (i.legacy || weaponLevel(i.spec) <= lv);
            const sel = (val, opts, onchange) => { const el = h('select', { onchange: (e) => onchange(e.target.value) }, opts.map(([v, t, dis]) => h('option', { value: v, selected: v === val || null, disabled: dis || null }, t))); return el; };
            const send = async (data) => {
                const r = await app.net.request('duel:loadout', data);
                if (!r.ok) { toast(r.msg, { kind: 'bad' }); app.audio.play('error'); }
                else { this.myRent = r.rent; app.audio.play(data.rent ? 'coin' : 'ui'); }
                setTimeout(draw, 120);
            };
            const mainW = inv.find(i => i.uid === main);
            box.replaceChildren(
                h('div', { class: 'locker-head', html: iconSVG('hanger') }, 'Spogliatoio'),
                h('label', {}, h('span', {}, 'In mano'), sel(rent ? '' : main, [['', rent ? '— arma a noleggio —' : 'A mani nude'], ...inv.map(i => [i.uid, label(i), !ok(i)])], (v) => send({ main: v || null, rent: rent ? null : undefined }))),
                h('label', {}, h('span', {}, 'Di riserva'), sel(res, [['', `${RESERVE_WEAPON.name} (sempre con te)`], ...inv.filter(i => i.uid !== main).map(i => [i.uid, label(i), !ok(i)])], (v) => send({ reserve: v || null }))),
                h('label', {}, h('span', {}, 'A noleggio'), sel(rent, [['', 'Niente noleggio'], ...Object.entries(RENTALS).map(([k, R]) => [k, `${R.name} · ${R.price} monete · dal livello ${weaponLevel(R.spec)}`, weaponLevel(R.spec) > lv])], (v) => send({ rent: v || null }))),
                h('div', { class: 'locker-note' }, mainW?.broken ? 'La tua arma è rotta: combatterai con la riserva.' : rent ? 'Se vinci ti ridanno il noleggio, e prendi anche quello dell\'avversario.' : 'Le armi si consumano a ogni colpo a segno: se si spezzano, si passa alla riserva.'));
        };
        draw();
        return box;
    }
    pushSnap(s) {
        const now = performance.now();
        this.snaps.push({ t: now, s });
        if (this.snaps.length > 40) this.snaps.shift();
        for (const e of s.ev || []) this.evQueue.push({ t: now, e });
        this.last = s;
    }

    // --- CICLO ---
    // stessa ora e stesso tempo dell'isola, un po' più luminosi: l'Arena deve leggersi bene
    applyEnv(S, boost = 0) {
        applySky(this.sky, S, this.t);
        this.hemi.color.copy(S.hemiS); this.hemi.groundColor.copy(S.hemiG); this.hemi.intensity = (S.hemiI * 1.15 + boost) * (this.envOn ? 0.84 : 1);
        this.moonL.color.copy(S.dir); this.moonL.intensity = S.dirI * 1.3;
        this.scene.fog.color.copy(S.fog); this.scene.fog.density = S.fogD * 1.4;
        const u = this.water.material.uniforms;
        u.uDeep.value.copy(S.water[0]); u.uShallow.value.copy(S.water[1]); u.uSky.value.copy(S.water[2]); u.uHor.value.copy(S.water[3]);
        this.embers.visible = S.rain < 0.5;
        this.precip.update(this.envDt || 0, this.camera.position, S, false);
    }
    update(dt) {
        this.t += dt;
        this.envDt = dt;
        // fermo immagine e rallentatore: in allenamento rallenta anche la simulazione, online solo le animazioni
        this.hitstop = Math.max(0, this.hitstop - dt);
        this.slowT = Math.max(0, this.slowT - dt);
        this.timeScale += ((this.slowT > 0 ? 0.3 : 1) - this.timeScale) * Math.min(1, dt * (this.slowT > 0 ? 14 : 4));
        const animDt = this.hitstop > 0 ? dt * 0.06 : dt * this.timeScale;
        if (this.role !== 'spectator') this.readJoy();
        if (this.role === 'local' && !this.ended) {
            this.acc += Math.min(dt, 0.1) * (this.hitstop > 0 ? 0 : this.timeScale);
            const ev = [];
            while (this.acc >= FIGHT.DT) {
                this.acc -= FIGHT.DT;
                const mine = { h: this.held & HELD_MASK, p: this.pressed }; this.pressed = 0;
                ev.push(...stepDuel(this.sim, { a: mine, b: botInput(this.sim, 'b', this.bot, FIGHT.DT) }));
            }
            this.snaps = [];
            this.pushSnap(snapshotDuel(this.sim, ev));
            if (this.sim.phase === 'over' && !this.ended && this.sim.pt > 1.6) this.showResult({ winner: this.sim.winner, local: true });
        } else this.flushInput();

        // istante di rendering (interpolazione ~80ms nel passato)
        const rt = performance.now() - (this.role === 'local' ? 0 : 80);
        while (this.evQueue.length && this.evQueue[0].t <= rt) this.handleEvent(this.evQueue.shift().e);
        let s0 = null, s1 = null;
        for (let i = this.snaps.length - 1; i >= 0; i--) { if (this.snaps[i].t <= rt) { s0 = this.snaps[i]; s1 = this.snaps[i + 1] || null; break; } }
        if (!s0) s0 = this.snaps[0];
        if (s0) this.render(s0, s1, rt, animDt);
        if (this.koFocus && (this.koFocus.t -= dt) <= 0) this.koFocus = null;

        // camera: segue, poi la spinta del colpo (torna da sola) e un piccolo zoom sull'impatto
        this.camera.position.lerp(this.camPos, 1 - Math.exp(-dt * (this.koFocus ? 3 : 5)));
        this.kick.multiplyScalar(Math.exp(-dt * 9));
        this.camera.position.add(this.kick);
        this.fovPunch *= Math.exp(-dt * 7);
        const fov = 32 + this.fovPunch;
        if (Math.abs(this.camera.fov - fov) > 0.01) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
        if (this.shake > 0) {
            this.shake = Math.max(0, this.shake - dt * 2.5);
            this.camera.position.x += (Math.random() - 0.5) * this.shake;
            this.camera.position.y += (Math.random() - 0.5) * this.shake;
        }
        this.camera.lookAt(this.camLook);
        for (const l of this.lights) l.intensity = 40 * (0.88 + Math.sin(this.t * 7 + l.position.x) * 0.06 + Math.random() * 0.06);
        this.water.material.uniforms.uTime.value = this.t;
        this.fires.update(this.t);
        this.gallery.update(dt);
        const ep = this.embers.geometry.attributes.position;
        for (let i = 0; i < ep.count; i++) { let y = ep.getY(i) + dt * 0.8; if (y > 14) y = -4; ep.setY(i, y); ep.setX(i, ep.getX(i) + Math.sin(this.t + i) * dt * 0.2); }
        ep.needsUpdate = true;
        this.updateFx(this.hitstop > 0 ? 0 : dt * this.timeScale);
        for (const F of Object.values(this.fighters)) F.hitL.intensity *= Math.exp(-dt * 16);
        if (!$('#dh-vs').classList.contains('hidden') && this.vsCount) {
            const left = Math.max(0, Math.ceil((this.vsEnd - performance.now()) / 1000));
            this.vsCount.textContent = left > 0 ? `Il duello inizia tra ${left}s` : 'Che il duello abbia inizio!';
        }
        this.app.renderer.render(this.scene, this.camera);
    }

    render(a, b, rt, dt) {
        const s = a.s;
        const alpha = b ? Math.min(1, (rt - a.t) / Math.max(1, b.t - a.t)) : 0;
        const S = b ? b.s : s;
        const pos = { a: null, b: null };
        for (const [i, side] of [[0, 'a'], [1, 'b']]) {
            const F = this.fighters[side];
            const f0 = readFighter(s.f[i]), f1 = b ? readFighter(b.s.f[i]) : f0;
            const f = alpha > 0 && b ? f1 : f0;
            const x = f0.x + (f1.x - f0.x) * alpha, y = f0.y + (f1.y - f0.y) * alpha;
            const teleport = Math.abs(f1.x - f0.x) > 3;
            pos[side] = { x: teleport ? f.x : x, y: teleport ? f.y : y };
            const ch = F.ch;
            // velocità sullo schermo (serve alla capriola e alla caduta)
            if (F.px !== null && dt > 1e-4 && !teleport) {
                F.vx += ((pos[side].x - F.px) / dt - F.vx) * 0.5; F.vy += ((pos[side].y - F.py) / dt - F.vy) * 0.5;
            }
            F.px = pos[side].x; F.py = pos[side].y; F.facing = f.facing;
            ch.root.position.set(pos[side].x, pos[side].y, 0);
            const PT = this.pets?.[side];
            if (PT) {
                PT.t += dt;
                const fly = PT.m.userData.fly, back = f.facing > 0 ? -1.1 : 1.1;
                let tx = pos[side].x + back, ty = (fly ? pos[side].y + 1.3 : Math.max(0, pos[side].y)), tz = -0.8;
                if (PT.dash > 0) { PT.dash -= dt; const k = Math.sin(Math.min(1, PT.dash / 0.6) * Math.PI); tx += (PT.tx - tx) * k; ty += (PT.ty - ty) * k; tz *= 1 - k; }
                PT.m.position.x += (tx - PT.m.position.x) * Math.min(1, dt * (PT.dash > 0 ? 14 : 5));
                PT.m.position.y += (ty - PT.m.position.y) * Math.min(1, dt * 6);
                PT.m.position.z += (tz - PT.m.position.z) * Math.min(1, dt * 6);
                PT.m.rotation.y = (PT.dash > 0 ? (PT.tx > PT.m.position.x ? 1 : -1) : f.facing) > 0 ? Math.PI / 2 : -Math.PI / 2;
                animatePet(PT.m, PT.t, PT.dash > 0 ? 1 : Math.min(1, Math.abs(tx - PT.m.position.x)), false);
            }
            if (this.hitstop > 0 && F.jit > 0) ch.root.position.x += (Math.random() - 0.5) * F.jit;   // trema sull'impatto
            const targetRy = f.facing > 0 ? Math.PI / 2 - 0.35 : -Math.PI / 2 + 0.35;
            ch.root.rotation.y += (targetRy - ch.root.rotation.y) * Math.min(1, dt * 18);
            let st = f.st, action = null;
            // fendente: un colpo d'aria quando parte un attacco (più cupo per le armi pesanti)
            if (f.st === 'atk' && (F.pst !== 'atk' || F.pmv !== f.mv || f.mt < F.pmt - 0.05)) {
                const wt = F.info.look?.weapon?.type;
                this.app.audio.play('swing', { heavy: f.mv === 'heavy' || HEAVY_WEAPONS.includes(wt), blade: !HEAVY_WEAPONS.includes(wt), vol: 0.85 });
            }
            const newAtk = f.st === 'atk' && (F.pst !== 'atk' || F.pmv !== f.mv || f.mt < F.pmt - 0.05);
            if (newAtk && (f.mv === 'light' || f.mv === 'air')) F.alt ^= 1;   // dritto, rovescio, dritto...
            F.pst = f.st; F.pmv = f.mv; F.pmt = f.mt;
            if (st === 'atk') {
                const dur = moveDuration({ aspd: F.aspd, special: F.special }, f.mv);
                action = { name: ACTION_OF[f.mv] || 'light', p: f.mt / dur, v: F.alt };
                st = f.grounded ? 'idle' : 'air';
            }
            if (st === 'run') st = 'run';
            ch.update(dt, { st, speed: st === 'run' ? 7 : 0, action, grounded: f.grounded, vx: F.vx, vy: F.vy, back: F.vx * f.facing < -1 });
            this.chargeFx(F, f, side);
            F.hitL.position.set(pos[side].x, pos[side].y + 1.2, 1.4);
            ch.root.visible = !(f.flags & 16) || Math.floor(this.t * 12) % 2 === 0;
            F.ice.visible = !!(f.flags & 2);
            F.ice.position.set(pos[side].x, pos[side].y + 1.05, 0);
            const U = F.status.userData;
            F.status.position.set(pos[side].x, pos[side].y, 0);
            U.burn.visible = U.flame.visible = !!(f.flags & 1);
            U.burn.position.y = 1; U.burn.scale.setScalar(2 + Math.sin(this.t * 20) * 0.3);
            U.flame.position.y = 0.25;
            U.poison.visible = !!(f.flags & 8); U.poison.position.y = 1; U.poison.scale.setScalar(2.4);
            U.slow.visible = !!(f.flags & 4); U.slow.position.y = 0.3; U.slow.scale.setScalar(1.8);
            U.armor.visible = !!(f.flags & 32); U.armor.position.y = 1; U.armor.scale.setScalar(3);
            U.dirty.visible = !!(f.flags & 64); U.dirty.position.y = 1.6; U.dirty.scale.setScalar(1.6);
            // HUD
            const pct = Math.max(0, f.hp / f.maxHp) * 100;
            const fill = $(`#dh-fill-${side}`), trail = $(`#dh-trail-${side}`);
            fill.style.width = pct + '%'; trail.style.width = pct + '%';
            fill.classList.toggle('low', pct < 25);
            const m = $(`#dh-meter-${side}`);
            m.style.width = f.meter + '%'; m.classList.toggle('full', f.meter >= 50);
            const rounds = $(`#dh-rounds-${side}`);
            if (rounds.dataset.rw !== String(f.rw)) {
                rounds.dataset.rw = f.rw;
                rounds.replaceChildren(...Array.from({ length: FIGHT.WIN_ROUNDS }, (_, k) => h('div', { class: 'dh-round' + (k < f.rw ? ' won' : '') })));
            }
            const combo = $(`#dh-combo-${side}`);
            if (f.combo >= 2) { combo.textContent = `${f.combo} COLPI!`; combo.classList.add('show'); } else combo.classList.remove('show');
        }
        $('#dh-timer').textContent = S.tm;
        // proiettili
        this.syncPool(this.projMeshes, S.p, (k) => this.makeProj(k), (m, p, i) => {
            let x = p[1], y = p[2];
            const q = b && s.p[i] && s.p[i][0] === p[0] ? s.p[i] : null;
            if (q && b) { x = q[1] + (p[1] - q[1]) * alpha; y = q[2] + (p[2] - q[2]) * alpha; }
            m.position.set(x, y, 0);
            m.rotation.z += dt * 8; m.rotation.x += dt * 5;
        });
        this.syncPool(this.zoneMeshes, S.z, () => this.makeZone(), (m, z) => {
            m.position.set(z[1], z[2], 0);
            m.scale.set(z[3] / 3.2, z[0] === 'lava' ? 0.45 : 1, 1);
            const zc = z[0] === 'lava' ? '#ff6a1a' : '#5aff5a';
            if (m.userData.k !== z[0]) { m.userData.k = z[0]; m.children.forEach(c => c.material.color.set(zc)); }
            m.children.forEach((c, i) => { c.material.opacity = Math.min(0.5, z[4]) * (0.6 + Math.sin(this.t * 3 + i) * 0.3); c.position.y = 0.6 + Math.sin(this.t * 2 + i * 1.7) * 0.3; });
        });
        this.syncPool(this.boltMeshes, S.b, () => this.makeBoltMark(), (m, bo) => {
            m.position.set(bo[0], 0.05, 0);
            m.material.opacity = 0.3 + (1 - bo[1] / 0.5) * 0.6 + Math.sin(this.t * 40) * 0.1;
        });
        // inquadratura stile Smash
        const A = pos.a, B = pos.b;
        const cx = Math.max(-7, Math.min(7, (A.x + B.x) / 2));
        const cy = Math.max(1.6, Math.min(6, Math.max(A.y, B.y) * 0.55 + 1.7));
        const sep = Math.abs(A.x - B.x) + 7, sepY = Math.abs(A.y - B.y) + 5;
        const vf = THREE.MathUtils.degToRad(this.camera.fov / 2);
        const hf = Math.atan(Math.tan(vf) * this.camera.aspect);
        const dist = Math.max(14, sep / 2 / Math.tan(hf) * 1.1, sepY / 2 / Math.tan(vf) * 1.15);
        this.camPos.set(cx, cy + 1.2 + dist * 0.06, Math.min(34, dist));
        this.camLook.set(cx, cy, 0);
        if (this.koFocus && !this.zoomed) { const L = pos[this.koFocus.side]; this.camPos.set(L.x + 1.2, L.y + 2.4, 9.5); this.camLook.set(L.x, L.y + 0.7, 0); }
        if (S.ph === 'over' && S.w && !this.zoomed) { this.zoomed = true; }
        if (this.zoomed && S.w) { const W = pos[S.w]; this.camPos.set(W.x + 1.5, W.y + 2.2, 8); this.camLook.set(W.x, W.y + 1.3, 0); }
    }

    syncPool(pool, list, make, apply) {
        list = list || [];
        while (pool.length < list.length) { const m = make(list[pool.length]?.[0]); this.scene.add(m); pool.push(m); }
        for (let i = 0; i < pool.length; i++) {
            const m = pool[i];
            if (i < list.length) {
                if (m.userData.kind && list[i][0] !== m.userData.kind && typeof list[i][0] === 'string') {
                    this.scene.remove(m); const nm = make(list[i][0]); this.scene.add(nm); pool[i] = nm;
                }
                pool[i].visible = true; apply(pool[i], list[i], i);
            } else m.visible = false;
        }
    }
    makeProj(kind) {
        const g = new THREE.Group();
        g.userData.kind = kind;
        const col = { fire: '#ff6a1a', ice: '#7fd8ff', rock: '#8a8478', mud: '#7a5028' }[kind] || '#fff';
        let core;
        if (kind === 'ice') core = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), new THREE.MeshStandardMaterial({ color: col, emissive: '#3a9aff', emissiveIntensity: 1.5, roughness: 0.1, transparent: true, opacity: 0.9 }));
        else if (kind === 'rock') { core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), new THREE.MeshStandardMaterial({ color: col, flatShading: true })); core.scale.y = 1.4; }
        else if (kind === 'mud') core = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.app.mudTex, transparent: true }));
        else core = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ff5a10', emissiveIntensity: 3 }));
        if (kind === 'mud') core.scale.set(0.7, 0.7, 1);
        g.add(core);
        if (kind !== 'rock' && kind !== 'mud') {
            const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
            glow.scale.set(2.2, 2.2, 1); g.add(glow);
        }
        return g;
    }
    makeZone() {
        const g = new THREE.Group();
        for (let i = 0; i < 6; i++) {
            const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: '#5aff5a', transparent: true, opacity: 0.4, depthWrite: false }));
            s.position.set(-1.3 + i * 0.52, 0.6, (i % 2) * 0.3); s.scale.set(1.6, 1.6, 1);
            g.add(s);
        }
        return g;
    }
    makeBoltMark() {
        const m = new THREE.Mesh(new THREE.CircleGeometry(0.95, 24), new THREE.MeshBasicMaterial({ color: '#ffe14a', transparent: true, opacity: 0.5, depthWrite: false }));
        m.rotation.x = -Math.PI / 2;
        return m;
    }

    // --- EFFETTI ---
    burst(x, y, color, n = 12, speed = 6, size = 0.35, dir = 0) {
        for (let i = 0; i < n; i++) {
            const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
            s.position.set(x, y, 0.3); s.scale.setScalar(size * (0.6 + Math.random()));
            // con una direzione, le scintille schizzano via dal colpo a ventaglio
            const a = dir ? (dir > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 1.7 : Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random());
            this.scene.add(s);
            this.fx.push({ o: s, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35 + Math.random() * 0.25, g: 12 });
        }
    }
    floatText(text, x, y, color, big = 1) {
        const s = textSprite(text, color);
        s.position.set(x, y + 0.6, 0.5);
        this.scene.add(s);
        this.fx.push({ o: s, vx: (Math.random() - 0.5) * 1.5, vy: 3.2, life: 0.9, g: 4, text: true, pop: big });
    }
    // onda d'urto a terra (SUPER, atterraggio del fendente)
    ring(x, y, color, size = 3.2) {
        const m = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        m.rotation.x = -Math.PI / 2; m.position.set(x, y, 0); m.scale.setScalar(0.3);
        this.scene.add(m);
        this.fx.push({ o: m, vx: 0, vy: 0, life: 0.45, g: 0, grow: size / 0.45, fade: true });
    }
    // carica del fendente e della SUPER: un bagliore che cresce sull'arma e scintille che ci corrono dentro; al rilascio scoppia
    chargeFx(F, f, side) {
        const charged = f.st === 'atk' && (f.mv === 'heavy' || f.mv === 'sp');
        const k = charged ? f.mt / Math.max(0.05, moveStart({ aspd: F.aspd, special: F.special }, f.mv)) : -1;
        const g = F.glow, ch = F.ch, w = ch.weaponMesh, len = w?.userData.length || 0.6;
        const tip = (w && w.parent ? w : ch.arms.R.hand).localToWorld(_tip.set(0, w && w.children.length ? len * 0.85 : 0, 0));
        const col = f.mv === 'sp' ? (ELEMENTS[this.info[side].element]?.color || '#ffe2a8') : '#ffe2a8';
        if (k >= 0 && k < 1) {
            g.material.color.set(col);
            g.position.copy(tip); g.position.z += 0.2;
            g.scale.setScalar(0.3 + k * (f.mv === 'sp' ? 1.8 : 1.1));
            g.material.opacity = 0.35 + k * 0.6 + Math.sin(this.t * 40) * 0.1;
            if (Math.random() < 0.5) {      // scintille risucchiate verso la punta
                const a = Math.random() * Math.PI * 2, r = 0.9 + Math.random() * 0.5;
                const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
                s.position.set(tip.x + Math.cos(a) * r, tip.y + Math.sin(a) * r, 0.3); s.scale.setScalar(0.12 + Math.random() * 0.1);
                this.scene.add(s);
                this.fx.push({ o: s, vx: -Math.cos(a) * r / 0.22, vy: -Math.sin(a) * r / 0.22, life: 0.22, g: 0 });
            }
            F.charging = true;
        } else {
            g.material.opacity *= 0.6;
            if (F.charging && k >= 1) {
                // rilascio: scoppio sull'arma, polvere ai piedi, spinta della camera
                this.burst(tip.x, tip.y, col, f.mv === 'sp' ? 20 : 12, 7, 0.4);
                const p = ch.root.position;
                this.burst(p.x + f.facing * 0.4, p.y + 0.1, '#cbbfae', 8, 3, 0.45, f.facing);
                if (f.mv === 'heavy') { this.ring(p.x + f.facing * 0.5, p.y + 0.05, '#e8dcc8', 1.8); this.kick.x += f.facing * 0.12; }
            }
            F.charging = false;
        }
    }
    lightning(x) {
        const c = document.createElement('canvas'); c.width = 64; c.height = 512;
        const g = c.getContext('2d');
        g.strokeStyle = '#fffbe0'; g.lineWidth = 6; g.shadowColor = '#ffe14a'; g.shadowBlur = 20;
        g.beginPath(); let px = 32; g.moveTo(px, 0);
        for (let y = 0; y < 512; y += 32) { px = 32 + (Math.random() - 0.5) * 40; g.lineTo(px, y); }
        g.stroke();
        const t = new THREE.CanvasTexture(c);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 16), new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        m.position.set(x, 8, 0.2);
        this.scene.add(m);
        this.fx.push({ o: m, vx: 0, vy: 0, life: 0.35, g: 0, fade: true });
        this.flash('#fff6c0');
    }
    flash(color) {
        const f = document.createElement('div');
        Object.assign(f.style, { position: 'fixed', inset: 0, background: color, opacity: 0.35, pointerEvents: 'none', zIndex: 39, transition: 'opacity 0.35s' });
        document.body.append(f);
        requestAnimationFrame(() => { f.style.opacity = 0; });
        setTimeout(() => f.remove(), 400);
    }
    updateFx(dt) {
        for (let i = this.fx.length - 1; i >= 0; i--) {
            const p = this.fx[i];
            p.life -= dt;
            p.vy -= p.g * dt;
            p.o.position.x += p.vx * dt; p.o.position.y += p.vy * dt;
            if (p.o.material) p.o.material.opacity = Math.min(1, p.life * (p.text ? 2 : 3));
            if (p.pop) { const k = Math.max(0, (p.life - 0.72) / 0.18); p.o.scale.set(1.6, 0.6, 1).multiplyScalar(p.pop * (1 + 0.8 * k * k)); if (p.vy < 0.4) { p.vy = 0.4; } }
            if (p.grow) p.o.scale.addScalar(p.grow * dt);
            if (p.life <= 0) {
                this.scene.remove(p.o);
                p.o.material?.map && p.text && p.o.material.map.dispose();
                p.o.material?.dispose();
                if (p.o.isMesh) p.o.geometry.dispose();   // gli sprite condividono la geometria: quella non si tocca
                this.fx.splice(i, 1);
            }
        }
    }

    handleEvent(e) {
        const A = this.app.audio;
        const fpos = (side) => this.fighters[side].ch.root.position;
        switch (e.t) {
            case 'round': this.announce(`ROUND ${e.n}`); A.play('gong'); this.zoomed = false; break;
            case 'go': this.announce('COMBATTI!', 'blood'); A.play('fight'); break;
            case 'hit': {
                const V = this.fighters[e.s], At = this.fighters[e.s === 'a' ? 'b' : 'a'];
                const vx = V.ch.root.position.x, ax = At.ch.root.position.x, dir = Math.sign(vx - ax) || 1;
                const power = e.h ? 1 : Math.min(0.75, 0.35 + e.d / 20);
                // scintille nel verso del colpo, numero che "salta", lampo sul corpo
                this.burst(e.x, e.y, e.h ? '#ffb347' : '#fff3a0', e.h ? 22 : 12, e.h ? 10 : 7, 0.35, dir);
                this.floatText(`-${e.d}`, e.x, e.y + 0.6, e.h ? '#ff5a3a' : '#ffffff', 1 + Math.min(0.7, e.d / 25));
                A.play(e.h ? 'heavy' : 'hit');
                V.ch.hurt(Math.sign(ax - vx) * (V.facing || 1) >= 0 ? 1 : -1, power);
                V.hitL.color.set(e.h ? '#ffb070' : '#fff0d8'); V.hitL.intensity = e.h ? 70 : 35;
                // fermo immagine: chi colpisce "sente" l'impatto
                this.hitstop = Math.max(this.hitstop, e.h ? 0.12 : 0.055);
                V.jit = e.h ? 0.16 : 0.08;
                this.kick.set(dir * (e.h ? 0.45 : 0.16), e.h ? -0.12 : -0.04, e.h ? -0.7 : -0.25);
                this.fovPunch = Math.min(this.fovPunch, e.h ? -2.2 : -0.7);
                this.shake = Math.max(this.shake, e.h ? 0.22 : 0.06);
                break;
            }
            case 'block': this.burst(e.x, e.y, '#7ac8ff', 8, 4, 0.25); A.play('block'); break;
            // Ruota dei Semi e tratti della Maestria
            case 'fizz': this.burst(e.x, e.y - 0.6, '#b880ff', e.sp ? 22 : 10, e.sp ? 6 : 3, 0.4); this.floatText(e.sp ? 'SUPER DISSOLTA' : 'Dissonanza!', e.x, e.y, '#c9a0ff'); A.play('block'); break;
            case 'dirty': this.burst(e.x, e.y - 0.6, '#8a5a2a', 14, 3, 0.4); this.floatText('Infangato! Niente SUPER', e.x, e.y, '#d8a060'); break;
            case 'last': this.announce('ULTIMO RESPIRO!', ''); this.floatText('1 PV', e.x, e.y, '#ffd23a'); A.play('special'); this.flash('#ffd23a'); break;
            case 'sp': {
                const el = ELEMENTS[this.info[e.s].element];
                this.announce(el.special.name.toUpperCase(), '');
                $('#dh-announce').style.fontSize = 'clamp(30px, 6vw, 64px)';
                setTimeout(() => { $('#dh-announce').style.fontSize = ''; }, 1300);
                A.play('special'); setTimeout(() => A.play(SPECIAL_SFX[e.k] || 'special'), 200);
                this.flash(e.pure ? '#ffd23a' : el.color);
                this.slowT = Math.max(this.slowT, 0.35); this.fovPunch = -3;
                const P = this.fighters[e.s].ch.root.position;
                this.ring(P.x, P.y + 0.05, el.color);
                break;
            }
            case 'tp': this.burst(e.x, e.y + 1, '#b06cff', 20, 5, 0.6); break;
            // infusione dell'arma (Altare)
            case 'inf': this.burst(e.x, e.y, ELEMENTS[e.e]?.glow || '#fff', e.k > 1 ? 18 : 10, 4, 0.32); break;
            case 'heal': { const p = fpos(e.s); this.burst(p.x, p.y + 1, '#5aff5a', 14, 3, 0.4); this.floatText(`+${e.d}`, p.x, p.y + 1.5, '#7aff7a'); break; }
            case 'quake': this.shake = 0.8; break;
            // lo SputnikPet attacca da solo
            case 'pet': {
                const PT = this.pets?.[e.s];
                if (PT) { PT.dash = 0.6; PT.tx = e.x; PT.ty = e.y - 0.4; }
                this.floatText(`${PETS[e.sp]?.assist?.name || 'Il pet'}!`, e.x, e.y + 0.5, PETS[e.sp]?.color || '#fff', 1.1);
                this.burst(e.x, e.y - 0.2, PETS[e.sp]?.color || '#fff', 14, 5, 0.35);
                A.play(e.sp === 'cane' ? 'heavy' : 'hit');
                break;
            }
            // due SUPER che si scontrano: il nome dello scontro, i due colori che si mescolano, e la spiegazione
            case 'clash': {
                const C = clashOf(e.ea, e.eb), ca = ELEMENTS[e.ea]?.color || '#fff', cb = ELEMENTS[e.eb]?.color || '#fff';
                this.announce((C?.name || 'Scontro di SUPER').toUpperCase(), '');
                this.flash(ca); setTimeout(() => this.flash(cb), 160);
                this.burst(e.x, e.y, ca, 34, 9, 0.7, -1); this.burst(e.x, e.y, cb, 34, 9, 0.7, 1);
                this.ring(e.x, 0.05, ca); setTimeout(() => this.ring(e.x, 0.05, cb), 140);
                this.floatText('SCONTRO DI SUPER!', e.x, e.y + 1.2, '#ffe9a8', 1.4);
                if (e.win) this.floatText(`vince ${this.info[e.win].name}`, e.x, e.y + 0.4, '#ffd23a', 1.1);
                A.play('thunder'); setTimeout(() => A.play('special'), 180);
                this.shake = Math.max(this.shake, 0.7); this.slowT = Math.max(this.slowT, 0.6); this.hitstop = Math.max(this.hitstop, 0.15); this.fovPunch = -4;
                if (C) toast(h('div', {}, h('b', {}, C.name), h('div', {}, C.desc)), { icon: 'sparkles', duration: 5000 });
                break;
            }
            // l'arma si spezza: schegge, e in mano resta la riserva
            case 'break': {
                this.burst(e.x, e.y, '#c8c0b0', 26, 7, 0.5); this.floatText('ARMA SPEZZATA!', e.x, e.y + 0.4, '#ff8a5a', 1.3);
                A.play('block'); this.shake = Math.max(this.shake, 0.3);
                const ch = this.fighters[e.s]?.ch;
                if (ch?.weaponMesh) {
                    const hand = ch.weaponMesh.parent;
                    hand?.remove(ch.weaponMesh);
                    ch.weaponMesh = buildWeapon(this.info[e.s].reserve || RESERVE_WEAPON);
                    ch.weaponMesh.rotation.x = Math.PI / 2;
                    hand?.add(ch.weaponMesh);
                }
                break;
            }
            case 'bolt': this.lightning(e.x); A.play('thunder'); this.shake = 0.6; break;
            case 'pop': this.burst(e.x, e.y, { fire: '#ff6a1a', ice: '#bff0ff', rock: '#a09a90', mud: '#8a5a2a' }[e.k] || '#fff', 12, 5); if (e.k === 'mud') A.play('splash'); break;
            case 'fall': { this.announce('CADUTA!', ''); A.play('splash'); this.floatText(`-${e.d}`, 0, 8, '#ff5a3a'); break; }
            case 'jump': if (e.d) { const p = fpos(e.s); this.burst(p.x, p.y, '#d8cfe6', 6, 2, 0.3); } A.play('jump'); break;
            case 'dash': A.play('dash'); break;
            case 'ko': {
                this.announce(e.p ? 'PERFETTO!' : 'K.O.!', 'blood'); A.play('ko');
                // il colpo finale: fermo lungo, rallentatore e camera su chi cade
                this.hitstop = 0.2; this.slowT = 1.1; this.shake = 0.5; this.fovPunch = -4;
                const loser = e.w ? (e.w === 'a' ? 'b' : 'a') : null;
                if (loser) this.koFocus = { side: loser, t: 1.7 };
                this.flash('#ffffff');
                break;
            }
            case 'time': this.announce('TEMPO!'); A.play('gong'); break;
            case 'over': {
                const w = e.w ? this.info[e.w].name : null;
                setTimeout(() => this.announce(w ? 'SPUTNIK!' : 'PAREGGIO', 'blood'), 300);
                break;
            }
        }
    }

    // --- FINE ---
    showResult(r) {
        if (this.ended) return;
        this.ended = true;
        const box = $('#dh-result');
        const me = this.side;
        const won = r.winner && r.winner === me;
        const title = this.role === 'spectator' || this.role === 'local' && !r.winner
            ? (r.winner ? `${this.info[r.winner].name} vince!` : 'Pareggio')
            : r.winner ? (won ? 'VITTORIA!' : 'SCONFITTA') : 'PAREGGIO';
        const lines = [];
        const tx = this.info.texts || ['Lo spirito si dissolve nella nebbia. Ora sfida un vero avversario!', 'Il Fantasma ride di te... la rivincita ti aspetta.'];
        if (this.role === 'local') lines.push(h('p', { class: 'muted' }, won ? tx[0] : tx[1]));
        if (this.role === 'fighter' && r.rating) {
            const d = r.rating[me], c = r.coins[me], x = r.xp?.[me] || 0;
            lines.push(h('div', { class: 'res-line' }, `Gloria ${d >= 0 ? '+' : ''}${d}`, h('span', { class: 'muted' }, '·'), coin(Math.abs(c)), c >= 0 ? ' guadagnate' : ' perse',
                x ? h('span', { class: 'muted' }, '·') : null, x ? h('span', { class: 'res-xp' }, `+${x} esperienza`) : null));
            if (r.xp && !x && r.reason !== 'forfeit') lines.push(h('p', { class: 'muted small' }, 'Duello troppo breve: niente esperienza.'));
            const loot = Object.entries(r.loot?.[me] || {}).filter(([k, n]) => n && MATS[k]);
            if (loot.length) lines.push(h('div', { class: 'res-line res-loot' }, "Per l'Altare: ", loot.map(([k, n]) => `${n} ${MATS[k].name}`).join(' · ')));
        }
        if (this.role === 'local') this.app.practiceDone(won);
        if (r.reason === 'forfeit') lines.push(h('p', { class: 'muted' }, this.role === 'fighter' && !won ? 'Ti sei ritirato dal duello.' : 'Vittoria per abbandono.'));
        const again = this.role === 'local' && !this.info.noRematch ? h('button', { class: 'btn', onclick: () => this.app.restartPractice() }, 'Rivincita') : null;
        box.replaceChildren(
            h('h1', { class: this.role === 'fighter' && !won && r.winner ? 'lose' : '' }, title),
            ...lines,
            h('div', { class: 'btn-row' }, again, h('button', { class: 'btn btn-primary', onclick: () => this.app.exitDuel() }, "Torna all'isola")));
        setTimeout(() => box.classList.remove('hidden'), this.role === 'local' ? 0 : 1800);
        this.app.audio.play(won || this.role === 'spectator' ? 'coin' : 'gong');
        if (this.role !== 'local') this.autoExit = setTimeout(() => this.app.exitDuel(), 15000);
    }

    resize() { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); }

    dispose() {
        clearTimeout(this.autoExit);
        if (this.onKey) { removeEventListener('keydown', this.onKey); removeEventListener('keyup', this.onKey); removeEventListener('mousedown', this.onMouse); removeEventListener('contextmenu', this.onCtx); }
        this.mobileCleanup?.forEach(f => f());
        for (const F of Object.values(this.fighters)) F.ch.dispose();
        for (const t of this.gallery.tex) t?.dispose();
        this.arena?.dispose();
        this.scene.traverse(o => { if (o.isMesh) o.geometry?.dispose(); }); // i personaggi sono già stati rimossi
        this.hud.classList.add('hidden');
        $('#dh-vs').classList.add('hidden');
        $('#dh-result').classList.add('hidden');
        $('#mc-duel').classList.add('hidden');
        $('#mc-world').classList.remove('hidden');
    }
}
