// =====================================================================
//  L'APPRODO: la scena della barca
//  La prima volta che un viandante arriva, il Traghettatore lo porta
//  sull'isola attraverso la nebbia. Girata dentro il gioco: la laguna,
//  la luna e la nebbia sono quelle vere. Si può saltare, e rivedere dal libro.
// =====================================================================
import * as THREE from 'three';
import { Character } from './character.js';
import { NPCS } from './shared/lore.js';
import { h, $ } from './util.js';
import { glowTexture } from './world.js';

const SEEDS = ['#ff6a2f', '#7fd8ff', '#6fcf5a', '#c4bcb2', '#ffe14a', '#c49aff', '#5a4632'];
const DOCK = { x: 0, deck: 0.65, z: 97 };
const LANE_X = -2.75;                  // la barca accosta a ovest del molo
const START_Z = 190, END_Z = 97.4;     // da sud, in mezzo alla laguna, fino al molo
const NEAR_Z = 112, NEAR_T = 44;       // al largo fino a qui, poi rallenta e accosta
const ROW_T = 52;                      // secondi di remi prima di accostare

// la sceneggiatura: [inizio, fine, chi parla, battuta]
const SUBS = [
    [6.5, 11.5, null, 'Non ricordi la barca. Non ricordi la nebbia. Ricordi soltanto il rumore del remo.'],
    [14, 19, 'traghettatore', 'Non parlare. La nebbia si offende.'],
    [20.5, 25.5, 'traghettatore', 'Tutti mi chiedono dove li porto. Nessuno mi chiede da dove vengono.'],
    [26, 31, 'traghettatore', 'Tu lo sai, da dove vieni? No. All\'inizio nessuno lo sa.'],
    [33, 39.5, 'traghettatore', 'Quello era il castello del re. Voleva tutto. L\'ha avuto tutto insieme, e la laguna se l\'è bevuto.'],
    [47.5, 51.5, 'traghettatore', 'Scendi. Io non scendo mai.'],
    [52, 56.5, 'traghettatore', 'Quella carta l\'hai tenuta stretta per tutto il viaggio. Anche dormendo.'],
    [57, 59.5, 'traghettatore', 'Come ti chiami?'],
    [60.5, 65.5, 'traghettatore', 'Lo immaginavo. Specchiati nell\'acqua, allora, e dimmi almeno che faccia hai.'],
];
const AFTER = [
    [0.8, 5.6, 'traghettatore', 'Il nome lo ritroverai. Qui tutti ritrovano qualcosa.'],
    [5.8, 11, 'traghettatore', 'Sali verso la piazza: c\'è un ratto che porta libri a chi non ne ha.'],
];
const CREATOR_AT = 66;   // qui si apre la creazione del personaggio (solo la prima volta)
const AFTER_LEN = 13;

const ease = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.max(0, Math.min(1, t));

// --- LA BARCA DEL TRAGHETTATORE (fatta a mano, niente modelli da scaricare) ---
function plankTexture() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#4a3322'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 8; i++) {
        const y = i * 32;
        g.fillStyle = `hsl(25, 32%, ${18 + (i * 37 % 9)}%)`; g.fillRect(0, y + 1, 256, 30);
        g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, y, 256, 2);
        for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(255,220,180,${Math.random() * 0.05})`; g.fillRect(Math.random() * 256, y + 3 + Math.random() * 26, 20 + Math.random() * 60, 1); }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
}
function makeHull(L = 4.6, W = 0.78, D = 0.62) {
    const N = 28, M = 12, pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
        const t = i / N, s = Math.sin(Math.PI * t);
        const w = W * Math.pow(s, 0.55) + 0.02, d = D * (0.55 + 0.45 * s);
        const top = 0.42 + 0.22 * Math.pow(2 * t - 1, 4);     // il bordo sale a prua e a poppa
        const z = (t - 0.5) * L;
        for (let j = 0; j <= M; j++) {
            const a = Math.PI * j / M;
            pos.push(Math.cos(a) * w, top - Math.sin(a) * d, z);
            uv.push(t * 3, j / M * 2);
        }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
        const a = i * (M + 1) + j, b = a + M + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return { g, L, W, top: (t) => 0.42 + 0.22 * Math.pow(2 * t - 1, 4), width: (t) => W * Math.pow(Math.sin(Math.PI * t), 0.55) + 0.02 };
}
function buildBoat(glowTex) {
    const boat = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ map: plankTexture(), roughness: 0.85, side: THREE.DoubleSide });
    const dark = new THREE.MeshStandardMaterial({ color: '#2a1c12', roughness: 0.9 });
    const H = makeHull();
    const hull = new THREE.Mesh(H.g, wood);
    hull.castShadow = hull.receiveShadow = true;
    boat.add(hull);
    // il bordo: due listelli che seguono la sagoma
    for (const s of [1, -1]) {
        const pts = [];
        for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector3(s * H.width(t), H.top(t) + 0.02, (t - 0.5) * H.L)); }
        boat.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.035, 5), dark));
    }
    // panche
    for (const z of [-0.9, 0.55]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.06, 0.32), dark); b.position.set(0, 0.2, z); boat.add(b); }
    // il remo lungo del Traghettatore, a poppa (gira attorno allo scalmo)
    const oarPivot = new THREE.Group();
    oarPivot.position.set(0.46, 0.5, 1.55);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 3.4, 6), dark);
    shaft.rotation.x = Math.PI / 2; shaft.position.z = 0.9;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.6), dark);
    blade.position.z = 2.5;
    const arm = new THREE.Group(); arm.add(shaft, blade);
    arm.rotation.x = 0.45;
    oarPivot.add(arm);
    boat.add(oarPivot);
    // la lanterna a prua
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.3, 6), dark);
    pole.position.set(0, 0.95, -2.05); pole.rotation.x = -0.25; boat.add(pole);
    const lamp = new THREE.Group(); lamp.position.set(0, 1.55, -2.25);
    lamp.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.2), new THREE.MeshStandardMaterial({ color: '#ffb35a', emissive: '#ff9a3a', emissiveIntensity: 2.6, transparent: true, opacity: 0.9 })));
    for (const y of [0.15, -0.15]) { const cap = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.26), dark); cap.position.y = y; lamp.add(cap); }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffb05a', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(2.4, 2.4, 1); lamp.add(glow);
    const light = new THREE.PointLight('#ffae5c', 14, 14, 1.6); lamp.add(light);
    boat.add(lamp);
    return { boat, arm, oarPivot, light, glow };
}

export class Prologue {
    // replay: rivista dal libro (niente creazione del personaggio, niente cambi allo stato)
    constructor(app, { replay = false, onCreator, onEnd } = {}) {
        this.app = app; this.replay = replay; this.onCreator = onCreator; this.onEnd = onEnd;
        this.t = 0; this.phase = 'row'; this.after = 0; this.sub = -1; this.done = false;
        const S = app.scene, glowTex = glowTexture();
        const B = buildBoat(glowTex);
        this.B = B;
        B.boat.position.set(LANE_X, 0, START_Z);
        S.add(B.boat);
        // il Traghettatore in piedi a poppa, il passeggero seduto a prua
        const T = NPCS.traghettatore;
        this.ferry = new Character(T.app, T.look || {}, {});
        this.ferry.root.position.set(0.05, 0.2, 1.25);
        this.ferry.root.rotation.y = Math.PI;   // guarda verso prua, come chi rema in piedi
        B.boat.add(this.ferry.root);
        const loc = app.local?.appearance;
        const app0 = replay && loc ? loc : { sex: 'm', species: 'umano', build: 'medio', skin: '#c9a888', eyes: 'assonnati', mouth: 'neutro', hair: 'corti', hairColor: '#2a1c12', beard: 'nessuna', topStyle: 'veste', top: '#24202c', bottom: '#1a1720', shoes: '#141016' };
        this.guest = new Character(app0, { head: 'cappuccio', cape: 'mantello_nero' }, {});
        this.guest.root.position.set(0, 0.24, -0.9);
        this.guest.root.rotation.y = Math.PI;
        B.boat.add(this.guest.root);
        // sette stelle che cadono (la settima nel fango, senza luce)
        this.stars = SEEDS.map((col, i) => {
            const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, opacity: 0, blending: i === 6 ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false, fog: false }));
            s.scale.set(9, 9, 1);
            S.add(s);
            const a = -0.55 + i * 0.18;
            return { s, from: new THREE.Vector3(Math.sin(a) * 260, 190 + (i % 3) * 18, -40 - Math.cos(a) * 160), to: new THREE.Vector3(Math.sin(a) * 120, -2, 10 - Math.cos(a) * 40), at: 41 + i * 0.55 };
        });
        this.cam = new THREE.Vector3(); this.look = new THREE.Vector3();
        // durante la scena il Traghettatore è sulla nostra barca, non su quella ormeggiata
        this.npcFerry = app.npcs?.list.find(n => n.id === 'traghettatore')?.ch.root;
        if (this.npcFerry) this.npcFerry.visible = false;
        this.ui();
        app.audio.play?.('open');
    }

    ui() {
        const skip = h('button', { class: 'cs-skip', onclick: () => this.skip() }, 'Salta ▸▸');
        this.subEl = h('div', { class: 'cs-sub' }, h('b', {}), h('span', {}));
        this.black = h('div', { class: 'cs-black' }, h('p', {}));
        this.el = h('div', { id: 'cutscene' }, h('div', { class: 'cs-bar top' }), h('div', { class: 'cs-bar bottom' }), this.black, this.subEl, skip);
        document.body.append(this.el);
        this.keyH = (e) => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); this.skip(); } };
        addEventListener('keydown', this.keyH);
    }

    say(i, list) {
        const L = list[i], [, , who, text] = L;
        this.subEl.querySelector('b').textContent = who ? 'Il Traghettatore' : '';
        const span = this.subEl.querySelector('span');
        span.textContent = '';
        this.subEl.classList.add('on');
        this.typing = { span, text, k: 0 };
        if (who) this.app.audio.voice?.(who, text);
    }

    // --- LE INQUADRATURE ---
    shot(t, boat) {
        const bp = boat.position, C = this.cam, L = this.look;
        if (t < 13) {                       // 2: a pelo d'acqua, la barca esce dalla nebbia
            const k = clamp01((t - 5) / 8);
            C.set(bp.x + 7 - k * 2, 0.55, bp.z - 16 + k * 4); L.set(bp.x, 0.9, bp.z);
        } else if (t < 20) {                // 3: primo piano del Traghettatore
            const k = (t - 13) / 7;
            C.set(bp.x + 1.6, 2.15, bp.z - 0.4 - k * 0.3); L.set(bp.x + 0.05, 1.95, bp.z + 1.25);
        } else if (t < 32) {                // 4: dall'alto, sotto le stelle
            const k = (t - 20) / 12;
            C.set(bp.x - 6 + k * 3, 7 - k, bp.z + 9 - k * 2); L.set(bp.x, 0.6, bp.z - 3);
        } else if (t < 40.5) {              // 5: la nebbia si strappa, il castello oltre l'isola (la camera sale)
            const k = ease(clamp01((t - 32) / 6));
            C.set(bp.x + 2 - k * 2, 2.5 + k * 12, bp.z + 4 + k * 6); L.set(bp.x * (1 - k), 2 + k * 12, bp.z - 20 - k * (bp.z + 84));
        } else if (t < 47) {                // 6: sette stelle cadono nella laguna
            C.set(bp.x + 3, 1.6, bp.z + 6); L.set(bp.x + 6, 40, bp.z - 120);
        } else if (t < 52) {                // 7: il molo con i fuochi, la barca accosta
            const k = (t - 47) / 5;
            C.set(DOCK.x + 4.5, 2.6, END_Z - 7 + k); L.set(bp.x, 0.9, bp.z + 1);
        } else {                            // 8-9: il passeggero, la carta, il nome
            const k = clamp01((t - 52) / 14);
            C.set(bp.x + 1.9 - k * 0.3, 1.7, bp.z - 2.6 + k * 0.2); L.set(bp.x, 1.0, bp.z - 0.9);
        }
    }

    update(dt) {
        if (this.done) return;
        const app = this.app, B = this.B, boat = B.boat;
        if (this.phase === 'creator') { this.idle(dt); return this.render(); }
        this.t += this.phase === 'row' ? dt : 0;
        const t = this.t;
        // la barca: rema fino al molo, poi accosta
        const k = clamp01(t / ROW_T);
        const z = t < NEAR_T ? START_Z + (NEAR_Z - START_Z) * (t / NEAR_T) : NEAR_Z + (END_Z - NEAR_Z) * ease(clamp01((t - NEAR_T) / (ROW_T - NEAR_T)));
        boat.position.set(LANE_X, 0.05 + Math.sin(t * 1.3) * 0.05, z);
        boat.rotation.set(Math.sin(t * 0.9) * 0.03, 0, Math.sin(t * 1.1) * 0.04);
        // il remo e le braccia del Traghettatore vanno insieme
        const rowing = this.phase === 'row' && k < 0.98;
        const s = Math.sin(t * 1.5);
        B.oarPivot.rotation.y = rowing ? s * 0.45 : 0.1;
        B.arm.rotation.x = rowing ? 0.45 + Math.cos(t * 1.5) * 0.12 : 0.6;
        this.ferry.t = t;
        this.ferry.update(dt, { st: rowing ? 'row' : 'idle', speed: 0 });
        this.guest.update(dt, { st: 'sit', speed: 0 });
        B.light.intensity = 13 + Math.sin(t * 7) * 1.5 + Math.random();
        if (this.phase === 'after') return this.afterUpdate(dt);
        // nero iniziale, poi la scena
        this.black.classList.toggle('on', t < 5.6);
        this.black.querySelector('p').textContent = t > 1.2 ? 'Non ricordi la barca.'.slice(0, Math.floor((t - 1.2) * 14)) : '';
        // nebbia: fitta, si apre sul castello, poi torna
        app.cutFog = t < 32 ? 0.022 : t < 40 ? 0.022 - ease(clamp01((t - 32) / 4)) * 0.019 : t < 46 ? 0.004 : 0.004 + clamp01((t - 46) / 5) * 0.008;
        // le stelle
        for (const st of this.stars) {
            const p = clamp01((t - st.at) / 2.4);
            st.s.material.opacity = p > 0 && p < 1 ? (st === this.stars[6] ? 0.85 * (1 - p) : 1) : 0;
            st.s.position.lerpVectors(st.from, st.to, p * p);
        }
        // sottotitoli
        const i = SUBS.findIndex(([a, b]) => t >= a && t < b);
        if (i !== this.sub) { this.sub = i; if (i >= 0) this.say(i, SUBS); else this.subEl.classList.remove('on'); }
        this.type(dt);
        this.shot(t, boat);
        if (t >= CREATOR_AT) {
            if (this.replay || !this.onCreator) return this.startAfter();
            this.phase = 'creator';
            this.subEl.classList.remove('on');
            this.el.classList.add('paused');
            Promise.resolve(this.onCreator()).then(() => { this.el.classList.remove('paused'); this.startAfter(); });
        }
        this.render();
    }
    idle(dt) {
        this.ferry.update(dt, { st: 'idle', speed: 0 });
    }
    type(dt) {
        const T = this.typing;
        if (!T || T.k >= T.text.length) return;
        T.k = Math.min(T.text.length, T.k + dt * 34);
        T.span.textContent = T.text.slice(0, Math.floor(T.k));
    }
    // dopo lo specchio d'acqua: il viandante è sul molo, la barca riparte
    startAfter() {
        const app = this.app;
        this.phase = 'after'; this.after = 0; this.sub = -1;
        this.guest.root.visible = false;
        const ch = app.myChar;
        app.player.pos.set(DOCK.x - 0.55, DOCK.deck, DOCK.z);
        app.player.yaw = -Math.PI / 2;
        if (ch) { ch.root.visible = true; ch.root.position.copy(app.player.pos); ch.root.rotation.y = app.player.yaw; }
    }
    afterUpdate(dt) {
        const app = this.app, boat = this.B.boat;
        this.after += dt;
        const a = this.after;
        // la barca torna nella nebbia
        const back = clamp01((a - 6) / 7);
        boat.position.z = END_Z + back * back * 30;
        boat.position.x = LANE_X - back * 3;
        boat.rotation.y = Math.min(1, back * 2.5) * Math.PI;   // gira la prua verso il mare aperto
        this.ferry.update(dt, { st: back > 0 ? 'row' : 'idle', speed: 0 });
        const ch = app.myChar;
        if (ch) { ch.update(dt, { st: 'idle', speed: 0 }); }
        app.cutFog = 0.012;
        const i = AFTER.findIndex(([s, e]) => a >= s && a < e);
        if (i !== this.sub) { this.sub = i; if (i >= 0) this.say(i, AFTER); else this.subEl.classList.remove('on'); }
        this.type(dt);
        const P = app.player.pos;
        this.cam.set(P.x - 2.8 - a * 0.15, P.y + 1.9 + a * 0.08, P.z + 5.5 + a * 0.2);
        this.look.set(boat.position.x * 0.5 + P.x * 0.5, 1.1, (boat.position.z + P.z) / 2);
        this.render();
        if (a >= AFTER_LEN) this.finish();
    }
    render() {
        const cam = this.app.camera;
        cam.position.copy(this.cam);
        cam.lookAt(this.look);
    }
    // salta: se il personaggio non c'è ancora, si passa comunque dallo specchio d'acqua
    skip() {
        if (this.done || this.phase === 'creator') return;
        if (this.phase === 'row' && !this.replay && this.onCreator) {
            this.t = CREATOR_AT; this.B.boat.position.z = END_Z;
            for (const st of this.stars) st.s.material.opacity = 0;
            this.black.classList.remove('on');
            return;
        }
        this.finish();
    }
    finish() {
        if (this.done) return;
        this.done = true;
        const app = this.app;
        app.cutFog = null;
        if (this.npcFerry) this.npcFerry.visible = true;
        removeEventListener('keydown', this.keyH);
        this.el.remove();
        app.scene.remove(this.B.boat);
        for (const st of this.stars) app.scene.remove(st.s);
        this.onEnd?.();
    }
}
