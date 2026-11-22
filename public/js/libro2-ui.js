// =====================================================================
//  LIBRO II · IL FARO SPENTO (solo client)
//  - i dialoghi: chi ha il passo di adesso lo dice, con il suo bottone
//  - i luoghi da toccare: cocci, lumi, la lapide (brillano solo mentre servono)
//  - la lanterna in cima al faro, l'Ombra della Nebbia, la scala
//  - il filo sotto l'orologio, finché il libro è aperto
//  Il Libro III (La Riva di Là) continua lo stesso stato, dal capitolo 5:
//  stessi passi, stessi bagliori; la sua terra è in regions/riva.js.
// =====================================================================
import * as THREE from 'three';
import { L2_CHAPTERS, L2_SPOTS, L2_END, L3_END, bookOf, chapterNo, l2Step, l2Next, l2At, L2AT, gx2 } from './shared/libro2.js';
import { nearRiva } from './shared/riva.js';
import { MATS } from './shared/catalog.js';
import { h, toast } from './util.js';
import { islandNight, minutesToIslandNight } from './shared/clock.js';
import { iconSVG } from './icons.js';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const BOOK = { 2: ['II', 'Il Faro Spento'], 3: ['III', 'La Riva di Là'] };
const stOf = (app) => app.me && !app.me.offline ? app.me.libro2 || { ch: 0, i: 0, got: [], cnt: 0 } : null;
const sexOf = (app) => app.me?.appearance?.sex;
const head = (ch) => `Libro ${BOOK[bookOf(ch)][0]} · Capitolo ${ROMAN[chapterNo(ch)]} · ${L2_CHAPTERS[ch].title}`;

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
            toast(h('div', {}, h('b', {}, `Libro ${BOOK[bookOf(r.chapter)][0]}, capitolo ${ROMAN[chapterNo(r.chapter)]} chiuso: ${C.title}`),
                h('div', {}, `+${r.xp} esperienza, +${r.coins} monete${r.title ? ' · nuovo titolo' : ''}`),
                C.end ? h('div', {}, C.end) : null),
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
    } else if (who === 'cartografa' && st.ch >= L3_END) {
        const a = st.ans?.[L3_END - 1];
        lines = [['Ho dato i nomi a tutti. Qualcuno ha pianto tutta la notte. Al mattino, però, ha fatto colazione: non succedeva da trecento anni.',
            'Il secchio è sulla porta. Chi vuole il suo nome viene a prenderselo. Ne vengono pochi alla volta, ma vengono.',
            'I nomi li ha presi la lanterna. Di notte, se guardi bene, il filo d\'oro fra le due rive è fatto di lettere.'][a ?? 0] || '',
            'Mia sorella mi ha mandato un messaggio, con il Traghettatore. Una riga sola: «Lo stoppino tienilo asciutto». Come se non lo sapessi.'];
    } else if (who === 'fornaio' && l2At(st) >= L2AT(7, 5)) {
        lines = ['Tobia. Mi chiamo Tobia. Lo dico ogni mattina appena sveglio, per sicurezza.', 'Ho rifatto il forno. Il pane della Riva sa di sale e di nebbia, ma si mangia. Prendine un pezzo, per il viaggio: come facevo con il barcaiolo.'];
    } else if (who === 'guardiana' && st.ch >= L2_END) {
        const a = st.ans?.[L2_END - 1];
        lines = ['Ilario dice che la luce è più calda di come la ricordava. Io dico che è uguale. Litighiamo così, adesso, ogni notte.',
            a === 1 ? 'Quando sarai pront{o} a partire, il fascio ti aspetterà. Non avere fretta.' : 'Resti. Allora siamo in tre a tenerla accesa.'].map(l => gx2(l, sexOf(app)));
    } else if (who === 'guardiana' && S) {
        lines = [`Il faro aspetta. Tu intanto: ${l2Next(st).charAt(0).toLowerCase() + l2Next(st).slice(1)}.`];
    }
    if (!lines) return null;
    return h('div', { class: 'st-box' + (ask ? ' ask' : '') },
        h('div', { class: 'st-head', html: iconSVG('lantern') }, S && ask ? head(st.ch) : who === 'guardiana' ? 'Libro II · Il Faro Spento' : 'Libro III · La Riva di Là'),
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
    // un posto che si apre solo di notte: dillo, e quanto manca al buio
    const nightSpot = S.k === 'find' && (S.spots || []).some(k => L2_SPOTS[k]?.night && !(st.got || []).includes(k));
    const m = nightSpot && !islandNight() ? minutesToIslandNight() : 0;
    return { text: `${C.title}: ${l2Next(st)}${nightSpot ? (m ? ` · il buio cala fra ${m} min` : ' · è notte: vai ora') : ''}` };
}

// --- le pagine del Libro II, nel Libro dell'Approdo (tasto G) ---
const PAGES = [
    'La Guardiana aveva chiuso la porta del faro la notte in cui la corona si spezzò, e la chiave era finita nel fuoco di Mastro Brace. Tre cocci della vecchia lanterna, ripescati fra scogli, sabbia e acqua scura, sono bastati a rifarla.',
    'Centotredici gradini al buio, e in cima una fiammella verde che non era mai morta del tutto. Aveva fame di luce ricordata: una brace, un fuoco fatuo, un raggio di luna. Mangiando, ha ricordato chi l\'aveva spenta.',
    'Il registro del Traghettatore, ritrovato fra le costole della sua vecchia barca arenata sulla Secca, diceva «partito con la luce»; una mano storta aveva aggiunto «tornato». La lapide senza nome, in fondo al Prato dei Morti, ha detto il resto: Ilario era tornato cercando una luce che lei aveva spento per non perderlo.',
    'La lente era incrinata dalla notte del lutto. Brace l\'ha rifusa con le schegge che cantano, la Sarta l\'ha lucidata con polvere di perla, e la Fiammella ha detto di essere pronta.',
    'La nebbia ha preso un volto per difendersi, e ha perso. Il faro si è riacceso d\'oro, e per la prima volta in trecento anni dall\'isola si vede il mare aperto. E oltre il mare una terra, con una luce piccola che ha risposto. La Guardiana resta. Ilario anche. Il Libro III comincia da quella luce.',
    // Libro III · La Riva di Là
    'Il Traghettatore ha remato dentro il fascio d\'oro, e la nebbia del mare aperto si è scostata come una tenda. Dall\'altra parte c\'era una riva, una lanterna di latta su un palo storto, e una donna che disegnava mappe e aspettava da trecento anni.',
    'La Cartografa disegnava ogni giorno l\'isola a memoria, e ogni mattina la nebbia le cancellava la carta. Tre cippi ancora in piedi e tre fogli di Pergamena Benedetta sono bastati: per la prima volta la mappa ha tenuto.',
    'Nel villaggio della Riva vivevano i Senza Nome. Uno impastava senza farina. Un nodo, una scarpa piccola e un odore di pane, più una riga del registro del Traghettatore, gli hanno restituito il suo nome: Tobia.',
    'Ai piedi del Monte Storto c\'era il Pozzo dei Nomi: chi arrivava ci buttava il proprio nome, per non portarsi dietro il dolore. Ma i nomi buttati diventano nebbia. La Madre della Nebbia lo difendeva, e ha perso. Il secchio è tornato su pieno.',
    'La Cartografa aveva una sorella che non era partita. La Guardiana del faro aveva una sorella che non era tornata. Si chiamava Nives. Fra le due rive, adesso, c\'è un filo di luce, e sulla mappa di Nives, in un angolo, è comparsa un\'isola che nessuno ha mai visto.',
];
function bookSection(st, b) {
    const [from, to] = b === 2 ? [0, L2_END] : [L2_END, L3_END];
    if (st.ch < from) return null;
    return [h('div', { class: 'st-head', html: iconSVG(b === 2 ? 'lantern' : 'wave') }, `Libro ${BOOK[b][0]} · ${BOOK[b][1]}`),
        L2_CHAPTERS.slice(from, to).map((C, n) => {
            const ch = from + n, done = ch < st.ch, now = ch === st.ch;
            if (!done && !now) return h('p', { class: 'bk-empty' }, `${ROMAN[n]}. Ancora da scrivere.`);
            return h('article', { class: 'bk-leaf' },
                h('div', { class: 'bk-lh' }, h('b', {}, `${ROMAN[n]}. ${C.title}`), h('span', {}, done ? 'Scritto' : 'Si sta scrivendo')),
                done ? h('p', {}, PAGES[ch]) : h('ul', { class: 'st-steps bk-steps' }, C.steps.map((s, i) => h('li', { class: i < st.i ? 'ok' : '' },
                    h('span', { html: iconSVG(i < st.i ? 'seal' : 'scroll') }), i === st.i ? l2Next(st) : i < st.i ? s.t : '…'))));
        })];
}
export function l2Book(app) {
    const st = stOf(app);
    if (!st || (st.ch === 0 && st.i === 0)) return null;
    return h('div', { class: 'bk-l2' }, bookSection(st, 2), bookSection(st, 3));
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
        const dirt = new THREE.MeshStandardMaterial({ color: '#2e241c', roughness: 1, flatShading: true });
        const paper = new THREE.MeshStandardMaterial({ color: '#d9cfae', emissive: '#4a3f20', emissiveIntensity: 0.6, roughness: 1, side: THREE.DoubleSide });
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
            } else if (P.glow === 'terra') {
                const m = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), dirt);
                m.scale.y = 0.45; m.receiveShadow = true;
                g.add(m);
                spinner = null;
                glowCol = '#7affd8';
            } else if (P.glow === 'pagina') {
                // un foglio gonfio d'acqua, un po' accartocciato
                const pg = new THREE.PlaneGeometry(0.34, 0.46, 3, 3);
                const pp = pg.attributes.position;
                for (let i = 0; i < pp.count; i++) pp.setZ(i, Math.sin(pp.getX(i) * 9) * 0.03 + pp.getY(i) * pp.getY(i) * 0.3);
                pg.computeVertexNormals();
                g.add(new THREE.Mesh(pg, paper));
                glowCol = '#ffe9a8';
            } else if (P.glow === 'cippo') {
                // il cippo di pietra lo costruisce la regione: qui solo il bagliore che lo segnala
                spinner = null;
            } else if (P.glow === 'ricordo') {
                // un ricordo: una piccola luce calda che non si sa da dove viene
                g.add(new THREE.Mesh(orbG, warm));
                glowCol = '#ffcf8a';
            }
            const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: glowCol, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
            glow.scale.set(2.2, 2.2, 1);
            if (P.glow === 'lapide') glow.position.y = 0.6;
            if (P.glow === 'cippo') { glow.position.y = 1.0; glow.scale.set(3.2, 3.2, 1); }
            g.add(glow);
            g.visible = false;
            W.scene.add(g);
            const it = { id: 'l2spot', k, x: P.x, z: P.z, r: 2.2, label: P.label, when: () => this.want(k) };
            if (!P.swim) it.y = ground;
            W.interactables.push(it);
            this.items.push({ k, g, glow, y: ground, spinner, bob: !['lapide', 'terra', 'cippo'].includes(P.glow) });
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
        this.buildHorizon();
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
    refresh() {
        for (const c of this.items) c.g.visible = this.want(c.k);
        this.horizonOn = l2At(stOf(this.app)) >= L2AT(4, 3);
    }
    // --- L'Orizzonte: quando il faro si riaccende, oltre la nebbia compare una terra (il Libro III) ---
    buildHorizon() {
        const W = this.app.world, g = new THREE.Group();
        g.name = 'orizzonte: la terra oltre la nebbia';
        // dietro il faro, lontanissima: la luce del faro la indica
        const dir = new THREE.Vector2(138, -170).normalize(), D = 720;
        g.position.set(dir.x * D, -2, dir.y * D);
        g.rotation.y = Math.atan2(dir.x, dir.y);
        // sagome piene (le trasparenti, sovrapposte, facevano bordi chiari): il colore lo dà la nebbia del momento
        const land = new THREE.MeshBasicMaterial({ color: '#1b0d29', fog: false });
        const far = new THREE.MeshBasicMaterial({ color: '#25123a', fog: false });
        const DARK = new THREE.Color('#12081c');
        const r = (s) => { const x = Math.sin(s * 12.9898) * 43758.5453; return x - Math.floor(x); };
        // due file di colline, e una montagna con la cima storta
        for (let i = 0; i < 14; i++) {
            const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), i < 7 ? land : far);
            m.scale.set(40 + r(i) * 60, 14 + r(i + 9) * 26, 30);
            m.position.set((i % 7 - 3) * 55 + r(i + 3) * 30, 0, i < 7 ? 0 : -60);
            m.renderOrder = -2;
            g.add(m);
        }
        const peak = new THREE.Mesh(new THREE.ConeGeometry(38, 95, 7), land);
        peak.position.set(-40, 40, -20); peak.rotation.z = 0.12; peak.renderOrder = -2;
        g.add(peak);
        // una luce piccola che risponde al faro: qualcuno, laggiù, è sveglio
        const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: '#ffd27a', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
        spark.position.set(60, 18, 2); spark.scale.set(16, 16, 1);
        g.add(spark);
        this.spark = spark;
        g.traverse(o => { o.frustumCulled = false; });
        g.visible = false;
        W.scene.add(g);
        this.horizon = g;
        // da vicino la sagoma lontana sparisce: sulla Riva di Là ci sono le sue colline vere (regions/riva.js)
        W.animated.push((dt, t) => {
            const P = this.app.player?.pos;
            g.visible = !!this.horizonOn && !(P && nearRiva(P.x, P.z, 160));
            if (!g.visible) return;
            spark.material.opacity = 0.5 + 0.45 * Math.max(0, Math.sin(t * 0.8)) ** 6;
            const fog = W.scene.fog?.color;
            if (fog) { land.color.copy(fog).lerp(DARK, 0.55); far.color.copy(fog).lerp(DARK, 0.3); }
        });
    }
    // un luogo toccato (la lanterna ha il suo giro)
    async find(k) {
        if (k === 'lanterna') return this.lantern();
        if (k === 'lume_riva' || k === 'pozzo') return this.rivaSpot(k);
        if (k === 'terra') this.app.audio.play('dig');
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
    // --- la lanterna della riva e il Pozzo dei Nomi (Libro III) ---
    rivaLabel(k) {
        const st = stOf(this.app), S = l2Step(st), at = l2At(st);
        if (S?.k === 'boss' && S.spot === k) return 'Affronta la Madre della Nebbia';
        if (S?.k === 'find' && S.spots.includes(k)) return k === 'pozzo' ? (at >= L2AT(8, 4) ? 'Cala il secchio nel pozzo' : 'Guarda dentro il pozzo') : at >= L2AT(9) ? 'Versa i nomi nella lanterna' : 'Guarda la lanterna';
        return k === 'pozzo' ? 'Il Pozzo dei Nomi' : 'La lanterna della riva';
    }
    async rivaSpot(k) {
        const app = this.app, st = stOf(app), S = l2Step(st), at = l2At(st);
        if (S?.k === 'boss' && S.spot === k) return this.startBoss(k);
        if (S?.k === 'find' && S.spots.includes(k)) return act(app, 'find', { k });
        const line = k === 'pozzo'
            ? (at >= L2AT(8, 5) ? 'Il pozzo respira piano, adesso. Ne esce ancora un filo di nebbia, sottile come il fumo di una candela spenta.' : 'Dal fondo sale un sussurro di mille voci. Di giorno sembra solo un pozzo vecchio. Di notte, respira.')
            : (at >= L2AT(9, 3) ? 'La lanterna di latta brucia d\'oro, come il faro. Fra le due fiamme, sopra il mare, corre un filo di luce.' : 'Una lanterna di latta, con una rosa dei venti incisa. Qualcuno la tiene accesa con molta cura.');
        app.audio.play('ui');
        toast(h('div', {}, h('b', {}, this.rivaLabel(k)), h('div', {}, line)), { icon: k === 'pozzo' ? 'ecto' : 'lantern', duration: 7000 });
    }
    startBoss(spot = 'lanterna') {
        const app = this.app;
        if (spot === 'pozzo') {
            app.audio.play('roar');
            setTimeout(() => app.audio.voice?.('re', 'Sono la madre di tutti i nomi che avete buttato. Volete riprenderveli? Allora prendete anche il dolore.'), 900);
            return app.startFoe({ kind: 'faro', name: 'La Madre della Nebbia', botLevel: 1.2, level: 20, element: 'spettro', boss: { hp: 1.6, atk: 1.2 }, height: 1.25,
                look: { cape: 'ali', head: 'cappuccio', weapon: { type: 'falce', material: 'argento', handle: 'osso', gem: 'zaffiro', name: 'Falce dei Nomi' } },
                texts: ['La Madre della Nebbia si scioglie in mille voci, che per un attimo dicono tutte il tuo nome. Poi tacciono. Il pozzo è libero.', 'La Madre della Nebbia ti avvolge e ti dimentichi per un attimo chi sei. Riprendi fiato, e riprova.'] });
        }
        app.audio.play('roar');
        setTimeout(() => app.audio.voice?.('re', 'Ti ricordi di me? No. Nessuno si ricorda di me. Per questo sono nebbia.'), 900);
        app.startFoe({ kind: 'faro', name: 'L\'Ombra della Nebbia', botLevel: 1.1, level: 16, element: 'spettro', boss: { hp: 1.3, atk: 1.15 }, height: 1.1,
            look: { cape: 'mantello_nero', head: 'cappuccio', weapon: { type: 'falce', material: 'argento', handle: 'osso', gem: 'smeraldo', name: 'Falce di Nebbia' } },
            texts: ['L\'Ombra si sfilaccia come fumo. Per un attimo ha il volto di un uomo che sorride, poi è solo nebbia che scappa giù per la scogliera.', 'L\'Ombra ti respinge contro la ringhiera. Riprendi fiato, e riprova.'] });
    }
    async bossDone(won) {
        const spot = l2Step(stOf(this.app))?.spot;
        const r = await act(this.app, 'boss', { won });
        if (r?.won && spot === 'pozzo') return toast(h('div', {}, h('b', {}, 'La Madre della Nebbia si ritira'), h('div', {}, 'Il pozzo tace. Adesso puoi calare il secchio.')), { kind: 'coin', icon: 'ecto', duration: 9000 });
        if (r?.won) toast(h('div', {}, h('b', {}, 'L\'Ombra della Nebbia si ritira'), h('div', {}, 'Adesso niente ti separa dalla lanterna. Accendila.')), { kind: 'coin', icon: 'lantern', duration: 9000 });
    }
}
