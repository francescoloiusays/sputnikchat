// =====================================================================
//  LIBRO II · IL FARO SPENTO (solo client)
//  - i dialoghi: chi ha il passo di adesso lo dice, con il suo bottone
//  - i luoghi da toccare: cocci, lumi, la lapide (brillano solo mentre servono)
//  - la lanterna in cima al faro, l'Ombra della Nebbia, la scala
//  - il filo sotto l'orologio, finché il libro è aperto
// =====================================================================
import * as THREE from 'three';
import { L2_CHAPTERS, L2_SPOTS, L2_END, l2Step, l2Next, l2At, L2AT, gx2 } from './shared/libro2.js';
import { MATS } from './shared/catalog.js';
import { h, toast } from './util.js';
import { iconSVG } from './icons.js';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const stOf = (app) => app.me && !app.me.offline ? app.me.libro2 || { ch: 0, i: 0, got: [], cnt: 0 } : null;
const sexOf = (app) => app.me?.appearance?.sex;
const head = (ch) => `Libro II · Capitolo ${ROMAN[ch]} · ${L2_CHAPTERS[ch].title}`;

// --- un passo fatto: aggiorna, festeggia, racconta ---
function applyL2(app, st) {
    if (!app.me || !st) return;
    app.me.libro2 = st;
    app.l2?.refresh();
    app.updateThreadNow?.();
    app.panels.refresh?.(['npc']);
}
function celebrate(app, done, r) {
    if (done?.after) toast(h('div', {}, h('b', {}, done.after[0]), h('div', {}, done.after[1])), { kind: 'coin', icon: 'lantern', duration: 11000 });
    if (r.chapter != null) {
        const C = L2_CHAPTERS[r.chapter];
        setTimeout(() => {
            app.audio.play('saved');
            toast(h('div', {}, h('b', {}, `Capitolo ${ROMAN[r.chapter]} chiuso: ${C.title}`),
                h('div', {}, `+${r.xp} esperienza, +${r.coins} monete${r.title ? ' · nuovo titolo' : ''}`),
                C.last ? h('div', {}, 'Fine del Libro II. Il faro è acceso, e la nebbia per la prima volta ha paura.') : null),
            { kind: 'ok', icon: 'openbook', duration: 10000 });
        }, done?.after ? 2600 : 200);
    } else if (r.xp && !done?.after) toast(`+${r.xp} esperienza`, { kind: 'ok', icon: 'star', duration: 3000 });
}
async function act(app, a, extra = {}) {
    const before = stOf(app), done = l2Step(before);
    const r = await app.net.request('l2:act', { a, ...extra });
    if (!r.ok) { toast(r.msg || 'Non ora', { kind: 'bad' }); return null; }
    applyL2(app, r.libro2);
    const advanced = l2At(r.libro2) !== l2At(before);
    if (advanced) app.audio.play(done?.sfx || 'quest');
    celebrate(app, advanced ? done : null, r);
    return r;
}

// --- il blocco del Libro II nei dialoghi ---
export function l2Box(app, who) {
    const st = stOf(app);
    if (!st) return null;
    const S = l2Step(st), C = L2_CHAPTERS[st.ch];
    let lines = null, buttons = [], ask = false, q = null;
    if (S && S.who === who && ['talk', 'give', 'answer'].includes(S.k)) {
        const lv = app.me.level || 1;
        if (st.i === 0 && lv < C.lv) lines = [`Torna quando la nebbia ti avrà messo un po\' di peso addosso. Al livello ${C.lv} ti racconto il resto.`];
        else {
            lines = S.say; ask = true;
            if (S.k === 'talk') buttons = [{ label: S.btn, ic: S.sfx === 'anvil' ? 'anvil' : 'quill', fn: () => act(app, 'talk') }];
            if (S.k === 'give') {
                const have = app.me.mats?.[S.mat] || 0;
                buttons = [{ label: `${S.btn} (${Math.min(have, S.n)}/${S.n})`, ic: MATS[S.mat]?.icon, disabled: have < S.n, fn: () => act(app, 'give') }];
                if (have < S.n) lines = [...lines, `Ne ${S.n - have === 1 ? 'manca' : 'mancano'} ancora ${S.n - have}. Dove si trovano: ${MATS[S.mat].where}.`];
            }
            if (S.k === 'answer') { q = S.q; buttons = S.a.map((txt, n) => ({ label: gx2(txt, sexOf(app)), answer: true, fn: () => act(app, 'answer', { n }) })); }
        }
    } else if (who === 'guardiana' && st.ch >= L2_END) {
        const a = st.ans?.[L2_END - 1];
        lines = ['Ilario dice che la luce è più calda di come la ricordava. Io dico che è uguale. Litighiamo così, adesso, ogni notte.',
            a === 1 ? 'Quando sarai pront{o} a partire, il fascio ti aspetterà. Non avere fretta.' : 'Resti. Allora siamo in tre a tenerla accesa.'].map(l => gx2(l, sexOf(app)));
    } else if (who === 'guardiana' && S) {
        lines = [`Il faro aspetta. Tu intanto: ${l2Next(st).charAt(0).toLowerCase() + l2Next(st).slice(1)}.`];
    }
    if (!lines) return null;
    return h('div', { class: 'st-box' + (ask ? ' ask' : '') },
        h('div', { class: 'st-head', html: iconSVG('lantern') }, st.ch < L2_END ? head(st.ch) : 'Libro II · Il Faro Spento'),
        lines.map(l => h('p', { class: 'st-line' }, `«${l}»`)),
        q ? h('p', { class: 'st-q' }, q) : null,
        buttons.length ? h('div', { class: 'btn-row' + (q ? ' st-answers' : '') }, buttons.map(b => h('button', {
            class: 'btn ' + (b.answer ? 'btn-answer' : 'btn-primary'), html: b.ic ? iconSVG(b.ic) : null, disabled: b.disabled || null,
            onclick: async (e) => { e.currentTarget.disabled = true; await b.fn(); },
        }, b.label))) : null);
}

// il filo sotto l'orologio: il Libro II ha la precedenza finché è aperto e il capitolo è alla tua portata
export function l2Thread(app) {
    const st = stOf(app), S = l2Step(st);
    if (!S) return null;
    const C = L2_CHAPTERS[st.ch];
    if (st.ch === 0 && st.i === 0) return null;          // si scopre andando al faro
    if (st.i === 0 && (app.me.level || 1) < C.lv) return null;
    return { text: `${C.title}: ${l2Next(st)}` };
}

// --- le pagine del Libro II, nel Libro dell'Approdo (tasto G) ---
const PAGES = [
    'La Guardiana aveva chiuso la porta del faro la notte in cui la corona si spezzò, e la chiave era finita nel fuoco di Mastro Brace. Tre cocci della vecchia lanterna, ripescati fra scogli, sabbia e acqua scura, sono bastati a rifarla.',
    'Centotredici gradini al buio, e in cima una fiammella verde che non era mai morta del tutto. Aveva fame di luce ricordata: una brace, un fuoco fatuo, un raggio di luna. Mangiando, ha ricordato chi l\'aveva spenta.',
    'Il registro del Traghettatore diceva «partito con la luce»; una mano storta aveva aggiunto «tornato». La lapide senza nome, in fondo al Prato dei Morti, ha detto il resto: Ilario era tornato cercando una luce che lei aveva spento per non perderlo.',
    'La lente era incrinata dalla notte del lutto. Brace l\'ha rifusa con le schegge che cantano, la Sarta l\'ha lucidata con polvere di perla, e la Fiammella ha detto di essere pronta.',
    'La nebbia ha preso un volto per difendersi, e ha perso. Il faro si è riacceso d\'oro, e per la prima volta in trecento anni dall\'isola si vede il mare aperto. La Guardiana resta. Ilario anche.',
];
export function l2Book(app) {
    const st = stOf(app);
    if (!st || (st.ch === 0 && st.i === 0)) return null;
    return h('div', { class: 'bk-l2' },
        h('div', { class: 'st-head', html: iconSVG('lantern') }, 'Libro II · Il Faro Spento'),
        L2_CHAPTERS.map((C, ch) => {
            const done = ch < st.ch, now = ch === st.ch;
            if (!done && !now) return h('p', { class: 'bk-empty' }, `${ROMAN[ch]}. Ancora da scrivere.`);
            return h('article', { class: 'bk-leaf' },
                h('div', { class: 'bk-lh' }, h('b', {}, `${ROMAN[ch]}. ${C.title}`), h('span', {}, done ? 'Scritto' : 'Si sta scrivendo')),
                done ? h('p', {}, PAGES[ch]) : h('ul', { class: 'st-steps bk-steps' }, C.steps.map((s, i) => h('li', { class: i < st.i ? 'ok' : '' },
                    h('span', { html: iconSVG(i < st.i ? 'seal' : 'scroll') }), i === st.i ? l2Next(st) : i < st.i ? s.t : '…'))));
        }));
}

// --- la porta del faro ---
export async function l2Door(app) {
    const st = stOf(app), S = l2Step(st);
    if (S?.k === 'find' && S.spots.includes('porta')) { await act(app, 'find', { k: 'porta' }); return; }
    if (l2At(st) >= L2AT(1)) return app.climbFaro(true);
    return false;   // chiusa: ci pensa il messaggio di sempre
}

// --- i luoghi del Libro II: brillano solo mentre li cerchi ---
export class L2World {
    constructor(app) {
        this.app = app;
        const W = app.world;
        this.items = [];
        const green = new THREE.MeshStandardMaterial({ color: '#9affe0', emissive: '#3affc0', emissiveIntensity: 1.6, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.9 });
        const warm = new THREE.MeshStandardMaterial({ color: '#ffe0a0', emissive: '#ffb347', emissiveIntensity: 2.2, roughness: 0.3 });
        const stoneM = new THREE.MeshStandardMaterial({ color: '#5d5866', roughness: 0.95, flatShading: true });
        const shardG = new THREE.OctahedronGeometry(0.22, 0);
        shardG.scale(0.6, 1.25, 0.25);
        const orbG = new THREE.IcosahedronGeometry(0.16, 1);
        for (const [k, P] of Object.entries(L2_SPOTS)) {
            if (!P.glow) continue;
            const g = new THREE.Group();
            const ground = P.swim ? 0.05 : W.groundAt(P.x, P.z) + (P.glow === 'lapide' ? 0 : 0.3);
            g.position.set(P.x, ground, P.z);
            let spinner = g, glowCol = '#7affd8';
            if (P.glow === 'coccio') {
                for (let i = 0; i < 3; i++) {
                    const m = new THREE.Mesh(shardG, green);
                    m.position.set((i - 1) * 0.16, i === 1 ? 0.08 : 0, (i % 2) * 0.1);
                    m.rotation.set(0.3 * (i - 1), i * 1.7, 0.4 * (i - 1));
                    m.scale.setScalar(i === 1 ? 1 : 0.7);
                    g.add(m);
                }
            } else if (P.glow === 'lume') {
                g.add(new THREE.Mesh(orbG, k === 'fatuo' ? green : warm));
                glowCol = k === 'fatuo' ? '#7affd8' : k === 'luna' ? '#dfe6ff' : '#ffb347';
            } else if (P.glow === 'lapide') {
                const s = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.18), stoneM);
                s.position.y = 0.45; s.rotation.set(-0.12, 0.6, 0.05); s.castShadow = true;
                g.add(s);
                spinner = null;
            }
            const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: glowCol, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
            glow.scale.set(2.2, 2.2, 1);
            if (P.glow === 'lapide') glow.position.y = 0.6;
            g.add(glow);
            g.visible = false;
            W.scene.add(g);
            const it = { id: 'l2spot', k, x: P.x, z: P.z, r: 2.2, label: P.label, when: () => this.want(k) };
            if (!P.swim) it.y = ground;
            W.interactables.push(it);
            this.items.push({ k, g, glow, y: ground, spinner, bob: P.glow !== 'lapide' });
        }
        this.tick = (dt, t) => {
            for (const c of this.items) {
                if (!c.g.visible) continue;
                if (c.bob) c.g.position.y = c.y + 0.12 + Math.sin(t * 1.6 + c.g.position.x) * 0.08;
                if (c.spinner) c.spinner.rotation.y += dt * 0.7;
                c.glow.material.opacity = 0.45 + Math.sin(t * 2.3 + c.g.position.z) * 0.15;
            }
        };
        W.animated.push(this.tick);
        // i passi «conta» (pesca, scava) li chiude il server: qui arriva la notizia
        app.net.on('l2:step', (r) => {
            const before = stOf(app), done = l2Step(before);
            applyL2(app, r.libro2);
            if (l2At(r.libro2) === l2At(before)) return;
            app.audio.play('quest');
            celebrate(app, done, r);
            if (r.chapter == null) toast(h('div', {}, h('b', {}, 'Libro II · un passo avanti'), h('div', {}, l2Next(r.libro2) || '')), { kind: 'ok', icon: 'openbook', duration: 6000 });
        });
        this.refresh();
    }
    want(k) {
        const S = l2Step(stOf(this.app));
        return S?.k === 'find' && S.spots.includes(k) && !stOf(this.app).got.includes(k);
    }
    refresh() { for (const c of this.items) c.g.visible = this.want(c.k); }
    // un luogo toccato (la lanterna ha il suo giro)
    async find(k) {
        if (k === 'lanterna') return this.lantern();
        const r = await act(this.app, 'find', { k });
        if (!r) return;
        // ancora qualcosa da trovare in questo passo: conta; altrimenti il passo è chiuso e ne parla celebrate()
        const P = L2_SPOTS[k], S = l2Step(r.libro2);
        const still = S?.k === 'find' && S.spots.includes(k);
        toast(h('div', {}, h('b', {}, still ? `${P.name} (${r.libro2.got.length}/${S.spots.length})` : P.name), h('div', {}, P.msg)), { kind: 'coin', icon: 'lantern', duration: 7000 });
    }
    // --- la lanterna, in cima al faro ---
    lanternLabel() {
        const S = l2Step(stOf(this.app));
        if (S?.k === 'boss' && S.spot === 'lanterna') return 'Affronta l\'Ombra della Nebbia';
        if (S?.k === 'find' && S.spots.includes('lanterna')) return { [L2AT(1, 3)]: 'Dai i tre lumi alla Fiammella', [L2AT(3, 4)]: 'Monta la lente nuova', [L2AT(4, 2)]: 'Riaccendi il faro' }[l2At(stOf(this.app))] || 'Parla con la Fiammella';
        return 'Guarda la lanterna';
    }
    async lantern() {
        const app = this.app, st = stOf(app), S = l2Step(st);
        if (S?.k === 'boss' && S.spot === 'lanterna') return this.startBoss();
        if (S?.k === 'find' && S.spots.includes('lanterna')) return act(app, 'find', { k: 'lanterna' });
        const at = l2At(st);
        const line = at >= L2AT(4, 3) ? 'La lente è un sole. Dentro, la Fiammella canta una nota sola, la stessa della lente.'
            : at >= L2AT(2) ? 'La Fiammella sonnecchia dentro la lente. Quando ti vede, si gonfia un poco, per farsi bella.'
                : at >= L2AT(1, 2) ? 'Una fiammella verde ti guarda da dentro il vetro. Ha fame.'
                    : 'Dietro i vetri impolverati qualcosa respira, piano. Di notte, forse, si sveglierebbe.';
        app.audio.play('ui');
        toast(h('div', {}, h('b', {}, 'La lanterna del faro'), h('div', {}, line)), { icon: 'lantern', duration: 7000 });
    }
    startBoss() {
        const app = this.app;
        app.audio.play('roar');
        setTimeout(() => app.audio.voice?.('re', 'Ti ricordi di me? No. Nessuno si ricorda di me. Per questo sono nebbia.'), 900);
        app.startFoe({ kind: 'faro', name: 'L\'Ombra della Nebbia', botLevel: 1.1, level: 16, element: 'spettro', boss: { hp: 900, atk: 1.15 }, height: 1.1,
            look: { cape: 'mantello_nero', head: 'cappuccio', weapon: { type: 'falce', material: 'argento', handle: 'osso', gem: 'smeraldo', name: 'Falce di Nebbia' } },
            texts: ['L\'Ombra si sfilaccia come fumo. Per un attimo ha il volto di un uomo che sorride, poi è solo nebbia che scappa giù per la scogliera.', 'L\'Ombra ti respinge contro la ringhiera. Riprendi fiato, e riprova.'] });
    }
    async bossDone(won) {
        const r = await act(this.app, 'boss', { won });
        if (r?.won) toast(h('div', {}, h('b', {}, 'L\'Ombra della Nebbia si ritira'), h('div', {}, 'Adesso niente ti separa dalla lanterna. Accendila.')), { kind: 'coin', icon: 'lantern', duration: 9000 });
    }
}
