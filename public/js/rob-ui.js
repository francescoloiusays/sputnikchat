// =====================================================================
//  IL RIGHELLO DI ROB (solo client)
//  - i dialoghi con Rob, il filo sotto l'orologio, le pagine nel libro
//  - i posti che Rob ti fa trovare (capisaldi, il pedagno, la maschera,
//    il Punto Trigonometrico, la Grotta delle Voci), che brillano piano
//  - le tavole dello studio: disegnate a mano, con il tuo nome nel
//    cartiglio e la firma di Roberto
//  - la grande cena alla Tavola Lunga, e l'addio
// =====================================================================
import * as THREE from 'three';
import { ROB_CHAPTERS, ROB_SPOTS, ROB_END, ROB_LEVEL, robStep, robNext, robAt, ROBAT, robPlates, ROB_LAST, ROB_EPILOGUE, ROB_DEDICA } from './shared/rob.js';
import { TP, TERRE } from './shared/terre.js';
import { gx2 } from './shared/libro2.js';
import { NPCS } from './shared/lore.js';
import { WORLD } from './world.js';
import { Character } from './character.js';
import { h, toast } from './util.js';
import { iconSVG } from './icons.js';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const stOf = (app) => (app.me && !app.me.offline ? app.me.rob || { ch: 0, i: 0, got: [], ans: [] } : null);
const sexOf = (app) => app.me?.appearance?.sex;
const say = (app, t) => gx2(t, sexOf(app));
export const robGone = (app) => (stOf(app)?.ch ?? 0) >= ROB_END;

// --- un passo fatto ---
function applyRob(app, st) {
    if (!app.me || !st) return;
    app.me.rob = st;
    app.robW?.refresh();
    app.updateThreadNow?.();
    app.panels.refresh?.(['npc', 'tavole']);
}
async function act(app, a, extra = {}) {
    const before = stOf(app), done = robStep(before);
    const r = await app.net.request('rob:act', { a, ...extra });
    if (!r.ok) { toast(r.msg || 'Non ora', { kind: 'bad' }); return null; }
    applyRob(app, r.rob);
    if (robAt(r.rob) !== robAt(before)) {
        app.audio.play('quest');
        if (done?.after) toast(h('div', {}, h('b', {}, done.after[0]), h('div', {}, done.after[1])), { kind: 'coin', icon: 'map', duration: 12000 });
        if (r.chapter != null && !r.cena) {
            const C = ROB_CHAPTERS[r.chapter];
            setTimeout(() => {
                app.audio.play('saved');
                toast(h('div', {}, h('b', {}, `Il Righello di Rob, capitolo ${ROMAN[r.chapter]} chiuso: ${C.title}`), h('div', {}, `+${r.xp} esperienza, +${r.coins} monete`)), { kind: 'ok', icon: 'openbook', duration: 9000 });
            }, done?.after ? 2600 : 200);
        }
    }
    return r;
}

// --- il blocco di Rob nel dialogo ---
export function robBox(app, who) {
    if (who !== 'rob') return null;
    const st = stOf(app);
    if (!st) return null;
    const S = robStep(st), C = ROB_CHAPTERS[st.ch], lv = app.me.level || 1;
    let lines = null, buttons = [], ask = false, q = null;
    if (S && ['talk', 'answer'].includes(S.k)) {
        const need = st.ch === 0 ? ROB_LEVEL : C.lv || 1;
        if (st.i === 0 && lv < need) lines = [`Non avere fretta. Torna quando avrai camminato un po' di più sull'isola: al livello ${need} ti porto io.`];
        else {
            lines = S.say; ask = true;
            if (S.k === 'talk') buttons = [{ label: S.btn, fn: () => act(app, 'talk') }];
            if (S.k === 'answer') { q = S.q; buttons = S.a.map((t, n) => ({ label: say(app, t), answer: true, fn: () => act(app, 'answer', { n }) })); }
        }
    } else if (S) lines = [`Io ti aspetto qui. Tu intanto: ${robNext(st).charAt(0).toLowerCase() + robNext(st).slice(1)}.`];
    if (!lines) return null;
    return h('div', { class: 'st-box rob-box' + (ask ? ' ask' : '') },
        h('div', { class: 'st-head', html: iconSVG('map') }, S ? `Il Righello di Rob · ${ROMAN[st.ch]} · ${C.title}` : 'Il Righello di Rob'),
        lines.map(l => h('p', { class: 'st-line' }, `«${say(app, l)}»`)),
        q ? h('p', { class: 'st-q' }, q) : null,
        buttons.length ? h('div', { class: 'btn-row' + (q ? ' st-answers' : '') }, buttons.map(b => h('button', {
            class: 'btn ' + (b.answer ? 'btn-answer' : 'btn-primary'), onclick: async (e) => { e.currentTarget.disabled = true; await b.fn(); },
        }, b.label))) : null);
}
// il filo sotto l'orologio: Rob si fa sentire solo quando il suo racconto è cominciato
export function robThread(app) {
    const st = stOf(app), S = robStep(st);
    if (!S || (st.ch === 0 && st.i === 0)) return null;
    const C = ROB_CHAPTERS[st.ch];
    if (st.i === 0 && (app.me.level || 1) < (C.lv || 1)) return null;
    return { text: `Rob · ${C.title}: ${robNext(st)}` };
}
// --- le pagine nel Libro dell'Approdo ---
const PAGES = [
    'Nelle Terre Nuove un uomo calvo con la barba rossa misurava il prato con un metro da falegname. Rob il Righello, geometra. Abbiamo ritrovato insieme i suoi tre capisaldi: punti che non si muovono, per ritrovarsi.',
    'La Secca del Relitto l\'aveva trovata lui, nuotando per divertimento. In fondo alla cima del suo pedagno c\'era una croce di sassi: non per un morto, per chi si tuffa. Perché sappia che si può tornare su.',
    'Ci sono tempeste che non vedi arrivare. Rob mi ha preso per mano e mi ha portato sul Punto Trigonometrico, di notte: da sotto la nebbia non si vede niente, da sopra si vede tutto. È un fatto di quote, non di coraggio.',
    'Nella Grotta delle Voci Rob ha sentito ridere sua moglie, litigare i suoi due figli, fare chiasso i nipoti. Li avrebbe voluti riabbracciare una volta sola, tutti a tavola. Così abbiamo apparecchiato.',
    'Alla Tavola Lunga c\'era tutta l\'isola. Rob ha riempito i bicchieri, tagliato il pane, raccontato della Secca. Poi è venuto da me, e se n\'è andato piano, come si spegne una lampada. Le sue tavole sono ancora nello studio. Le misure sono giuste.',
];
export function robBook(app) {
    const st = stOf(app);
    if (!st || (st.ch === 0 && st.i === 0)) return null;
    return h('div', { class: 'bk-l2' },
        h('div', { class: 'st-head', html: iconSVG('map') }, 'Il Righello di Rob'),
        ROB_CHAPTERS.map((C, ch) => {
            const done = ch < st.ch, now = ch === st.ch;
            if (!done && !now) return h('p', { class: 'bk-empty' }, `${ROMAN[ch]}. Ancora da scrivere.`);
            return h('article', { class: 'bk-leaf' },
                h('div', { class: 'bk-lh' }, h('b', {}, `${ROMAN[ch]}. ${C.title}`), h('span', {}, done ? 'Scritto' : 'Si sta scrivendo')),
                done ? h('p', {}, PAGES[ch]) : h('ul', { class: 'st-steps bk-steps' }, C.steps.map((s, i) => h('li', { class: i < st.i ? 'ok' : '' },
                    h('span', { html: iconSVG(i < st.i ? 'seal' : 'scroll') }), i === st.i ? robNext(st) : i < st.i ? s.t : '…'))));
        }));
}

// =====================================================================
//  LE TAVOLE DI ROB: disegnate sulla carta, con il cartiglio e la firma
// =====================================================================
export const PLATES = [
    { n: 1, title: 'Pianta delle Terre Nuove', scale: '1:500', kind: 'pianta', tint: '#f3eedc' },
    { n: 2, title: 'Rilievo batimetrico della Secca del Relitto', scale: '1:200', kind: 'secca', tint: '#e4ecf2' },
    { n: 3, title: 'Sezione del Colle e del Punto Trigonometrico', scale: '1:250', kind: 'colle', tint: '#f3eedc' },
    { n: 4, title: 'Sezione della Grotta delle Voci', scale: '1:50', kind: 'grotta', tint: '#efe8d8' },
    { n: 5, title: 'Rilievo di un\'anima', scale: '1:1', kind: 'anima', tint: '#f6f0de' },
];
const SIGN_FONT = '"Segoe Script", "Brush Script MT", "Lucida Handwriting", "Apple Chancery", cursive';
export function drawPlate(app, P) {
    const W = app.world, c = document.createElement('canvas'); c.width = 1400; c.height = 990;
    const g = c.getContext('2d'), Wc = c.width, Hc = c.height;
    // la carta, un poco ingiallita, con le pieghe
    g.fillStyle = P.tint; g.fillRect(0, 0, Wc, Hc);
    for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(120,100,60,${Math.random() * 0.04})`; g.fillRect(Math.random() * Wc, Math.random() * Hc, 2, 2); }
    g.strokeStyle = 'rgba(120,100,60,0.12)'; g.lineWidth = 2; g.beginPath(); g.moveTo(Wc / 2, 0); g.lineTo(Wc / 2, Hc); g.moveTo(0, Hc / 2); g.lineTo(Wc, Hc / 2); g.stroke();
    const ink = '#232a3a', red = '#b8302a', blue = '#1e4a8a';
    g.strokeStyle = ink; g.lineWidth = 4; g.strokeRect(30, 30, Wc - 60, Hc - 60); g.lineWidth = 1.5; g.strokeRect(42, 42, Wc - 84, Hc - 84);
    // l'area del disegno
    const A = { x: 70, y: 70, w: Wc - 560, h: Hc - 140 };
    const contour = (x0, z0, x1, z1, step, levels, sea) => {
        const sx = A.w / (x1 - x0), sz = A.h / (z1 - z0), s = Math.min(sx, sz);
        const ox = A.x + (A.w - (x1 - x0) * s) / 2, oz = A.y + (A.h - (z1 - z0) * s) / 2;
        const P2 = (x, z) => [ox + (x - x0) * s, oz + (z - z0) * s];
        g.lineWidth = 1;
        for (let x = x0; x < x1; x += step) for (let z = z0; z < z1; z += step) {
            const hh = W.terrainAt(x, z), hx = W.terrainAt(x + step, z), hz = W.terrainAt(x, z + step);
            for (const L of levels) {
                if ((hh - L) * (hx - L) < 0 || (hh - L) * (hz - L) < 0) {
                    const [px, py] = P2(x, z);
                    g.fillStyle = L === 0 ? ink : L < 0 ? (sea || blue) : `rgba(70,60,40,${0.35 + Math.min(0.5, L / 30)})`;
                    g.fillRect(px, py, L === 0 ? 2.2 : 1.4, L === 0 ? 2.2 : 1.4);
                }
            }
        }
        return P2;
    };
    const label = (txt, x, y, size = 16, col = ink, it = false) => { g.fillStyle = col; g.font = `${it ? 'italic ' : ''}${size}px Georgia, serif`; g.fillText(txt, x, y); };
    const hand = (txt, x, y, size = 22, col = blue) => { g.fillStyle = col; g.font = `${size}px ${SIGN_FONT}`; g.fillText(txt, x, y); };
    const tri = (x, y, s, col = red) => { g.fillStyle = col; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.9, y + s * 0.6); g.lineTo(x - s * 0.9, y + s * 0.6); g.closePath(); g.fill(); };
    const north = (x, y) => { g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + 40); g.lineTo(x, y - 30); g.stroke(); tri(x, y - 38, 12, ink); label('N', x - 6, y + 62, 18); };
    if (P.kind === 'pianta') {
        const P2 = contour(84, -24, 176, 68, 1.1, [0, 1, 2, 3, 4, 6, 8, 10]);
        g.strokeStyle = red; g.setLineDash([10, 6]); g.lineWidth = 2;
        for (const [[ax, az], [bx, bz]] of WORLD.SIDE_PATHS.filter(([a, b]) => a[0] > 60 || b[0] > 60)) { const [x1, y1] = P2(ax, az), [x2, y2] = P2(bx, bz); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
        g.setLineDash([]);
        [['cs1', 'CS 1'], ['cs2', 'CS 2'], ['cs3', 'CS 3']].forEach(([k, t]) => { const [x, y] = P2(...TP[k]); tri(x, y, 11); label(t, x + 14, y + 5, 16, red); });
        const sq = (k, t) => { const [x, y] = P2(...TP[k]); g.strokeStyle = ink; g.lineWidth = 2; g.strokeRect(x - 12, y - 9, 24, 18); label(t, x + 16, y + 5, 15, ink, true); };
        sq('studio', 'studio'); sq('tavola', 'Tavola Lunga'); sq('borgo', 'borgo'); sq('cantiere', 'cantiere (in costr.)');
        const [tx, ty] = P2(...TP.trig); g.strokeStyle = ink; g.beginPath(); g.arc(tx, ty, 8, 0, 7); g.stroke(); label('P.T. q. 11,2', tx + 12, ty - 8, 15);
        north(A.x + A.w - 40, A.y + 60);
        hand('i capisaldi tengono ferma la terra', A.x + 30, A.y + A.h - 30, 24);
    } else if (P.kind === 'secca') {
        const R = WORLD.RELITTO;
        const P2 = contour(R.x - 30, R.z - 26, R.x + 30, R.z + 26, 0.6, [0, -1, -2, -3, -4, -5, -6, -7], blue);
        g.fillStyle = blue; g.font = '13px Georgia, serif';
        for (let x = R.x - 28; x < R.x + 28; x += 4.5) for (let z = R.z - 24; z < R.z + 24; z += 4.5) {
            const hh = W.terrainAt(x, z); if (hh >= 0) continue;
            const [px, py] = P2(x, z); g.fillRect(px - 1, py - 1, 2, 2); g.fillText((-hh * 2.4).toFixed(1).replace('.', ','), px + 3, py + 4);
        }
        const [wx, wy] = P2(R.x - 3, R.z + 1); g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.ellipse(wx, wy, 34, 12, 0.6, 0, 7); g.stroke(); label('relitto', wx + 38, wy, 16, ink, true);
        const [bx, by] = P2(-163, 125); g.strokeStyle = red; g.beginPath(); g.arc(bx, by, 9, 0, 7); g.stroke(); label('pedagno', bx + 12, by - 6, 15, red);
        hand('qui c\'è il polpo, salutalo', bx - 180, by + 60, 22);
        north(A.x + A.w - 40, A.y + 60);
    } else if (P.kind === 'colle') {
        // il profilo del terreno lungo una linea che passa per il pilastrino
        const [tx, tz] = TP.trig, N = 260, xs = [];
        for (let i = 0; i <= N; i++) { const t = i / N, x = tx - 34 + t * 68, z = tz + 8 - t * 16; xs.push(W.terrainAt(x, z)); }
        const base = A.y + A.h * 0.78, k = A.w / N, vs = 22;
        g.strokeStyle = ink; g.lineWidth = 2.5; g.beginPath();
        xs.forEach((hh, i) => { const x = A.x + i * k, y = base - Math.max(-2, hh) * vs; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
        g.strokeStyle = 'rgba(35,42,58,0.4)'; g.lineWidth = 1; for (let y = 0; y <= 12; y += 2) { const yy = base - y * vs; g.beginPath(); g.moveTo(A.x, yy); g.lineTo(A.x + A.w, yy); g.stroke(); label(`q. ${y}`, A.x - 2, yy - 4, 12); }
        const top = xs.indexOf(Math.max(...xs)), px = A.x + top * k, py = base - xs[top] * vs;
        // due omini in cima: uno piccolo, e uno più grande che gli tiene la mano
        const man = (x, y, s) => { g.strokeStyle = blue; g.lineWidth = 2; g.beginPath(); g.arc(x, y - s * 2.6, s * 0.45, 0, 7); g.moveTo(x, y - s * 2.1); g.lineTo(x, y - s); g.lineTo(x - s * 0.5, y); g.moveTo(x, y - s); g.lineTo(x + s * 0.5, y); g.stroke(); };
        man(px - 10, py - 14, 12); man(px + 14, py - 14, 17);
        g.strokeStyle = blue; g.beginPath(); g.moveTo(px - 10, py - 30); g.quadraticCurveTo(px + 2, py - 24, px + 14, py - 34); g.stroke();
        hand('da sotto non si vede niente, da sopra si vede tutto', A.x + 40, A.y + 70, 24);
        label('nebbia', A.x + 30, base - 3.2 * vs, 16, '#7a7a8a', true);
        g.fillStyle = 'rgba(200,200,215,0.35)'; g.fillRect(A.x, base - 3 * vs, A.w, 3 * vs);
    } else if (P.kind === 'grotta') {
        const cx = A.x + A.w * 0.5, cy = A.y + A.h * 0.6;
        g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(A.x + 40, cy + 120);
        for (let i = 0; i <= 60; i++) { const t = i / 60, a = Math.PI + t * Math.PI; g.lineTo(cx + Math.cos(a) * 300 * (1 + 0.08 * Math.sin(t * 17)), cy + Math.sin(a) * 210 * (1 + 0.06 * Math.sin(t * 11))); }
        g.lineTo(A.x + A.w - 40, cy + 120); g.stroke();
        g.strokeStyle = 'rgba(35,42,58,0.35)'; for (let i = 0; i < 40; i++) { const x = A.x + 40 + Math.random() * (A.w - 80), y = cy + 130 + Math.random() * 60; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 14, y + 8); g.stroke(); }
        // le voci: onde piccole che salgono dal fondo
        g.strokeStyle = blue; g.lineWidth = 1.5; for (let r = 30; r < 180; r += 30) { g.beginPath(); g.arc(cx, cy + 40, r, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
        label('sasso dove si siede Rob', cx + 70, cy + 105, 16, ink, true);
        hand('Rilievo non richiesto dal committente. Fatto lo stesso.', A.x + 30, A.y + 60, 24);
    } else if (P.kind === 'anima') {
        const P2 = contour(-176, -158, 182, 140, 2.0, [0, 2, 5]);   // tutta l'isola, dalla Secca alle Terre Nuove
        // il percorso fatto con Rob, a puntini: capisaldi, Secca, colle, grotta, tavola
        const stops = [TP.cs1, TP.cs2, TP.cs3, [-150, 118], TP.trig, TP.grotta, TP.tavola];
        g.strokeStyle = red; g.setLineDash([4, 6]); g.lineWidth = 2.5; g.beginPath();
        stops.forEach(([x, z], i) => { const [px, py] = P2(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke(); g.setLineDash([]);
        stops.forEach(([x, z]) => { const [px, py] = P2(x, z); tri(px, py, 8); });
        const [hx, hy] = P2(...TP.tavola);
        g.fillStyle = red; g.beginPath(); g.moveTo(hx, hy + 16); g.bezierCurveTo(hx - 30, hy - 8, hx - 12, hy - 30, hx, hy - 12); g.bezierCurveTo(hx + 12, hy - 30, hx + 30, hy - 8, hx, hy + 16); g.fill();
        hand('Le misure sono giuste.', A.x + 40, A.y + A.h - 90, 30);
        hand('Il resto, adesso, lo disegni tu.', A.x + 40, A.y + A.h - 45, 30);
    }
    // --- il cartiglio, in basso a destra ---
    const cx = Wc - 470, cy = Hc - 400, cw = 420, ch = 350;
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(cx, cy, cw, ch);
    g.strokeStyle = ink; g.lineWidth = 2; g.strokeRect(cx, cy, cw, ch);
    const row = (y) => { g.beginPath(); g.moveTo(cx, y); g.lineTo(cx + cw, y); g.stroke(); };
    [cy + 60, cy + 120, cy + 175, cy + 255].forEach(row);
    label('ROLO STUDIO', cx + 14, cy + 26, 18); label('tecnico: Roberto', cx + 14, cy + 50, 20, ink, true);
    label(`Tav. ${P.n}`, cx + 14, cy + 86, 16); label(P.title, cx + 14, cy + 108, P.title.length > 34 ? 14 : 17);
    label(`Scala ${P.scale}`, cx + cw - 120, cy + 86, 16);
    const me = app.me || {}, nome = me.story?.name;
    label('Committente:', cx + 14, cy + 142, 14);
    if (nome) label(nome.length > 44 ? nome.slice(0, 43) + '…' : nome, cx + 14, cy + 164, nome.length > 30 ? 15 : 18, blue, true);
    else hand('(il Nome Vero lo scriverai tu)', cx + 14, cy + 166, 17);
    label('detto anche', cx + 14, cy + 198, 13, ink, true); label(me.name || 'Viandante', cx + 120, cy + 198, 19, blue);
    label('Data: nella nebbia', cx + 14, cy + 232, 14);
    label('Il tecnico', cx + 14, cy + 280, 14);
    hand('Roberto', cx + 110, cy + 322, 46, blue);
    g.strokeStyle = blue; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx + 104, cy + 332); g.quadraticCurveTo(cx + 230, cy + 342, cx + 330, cy + 322); g.stroke();
    return c;
}

// =====================================================================
//  I POSTI DI ROB: brillano piano, d'arancio, solo mentre servono
// =====================================================================
export class RobWorld {
    constructor(app) {
        this.app = app;
        const W = app.world;
        this.items = [];
        const orange = new THREE.MeshStandardMaterial({ color: '#ff8a2a', emissive: '#ff6a1a', emissiveIntensity: 0.8, roughness: 0.5 });
        for (const [k, P] of Object.entries(ROB_SPOTS)) {
            if (!P.glow) continue;
            const g = new THREE.Group();
            const ground = P.swim ? 0.05 : W.groundAt(P.x, P.z) + 0.1;
            g.position.set(P.x, ground, P.z);
            if (P.glow === 'boa') { const b = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), orange); b.scale.y = 0.8; b.position.y = 0.1; g.add(b); }
            if (P.glow === 'maschera') {
                const m = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 8, 16), new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.5 })); m.rotation.x = -Math.PI / 2; m.scale.set(1.4, 1, 1); m.position.y = 0.05; g.add(m);
                for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.5), new THREE.MeshStandardMaterial({ color: '#111' })); f.position.set(s * 0.25 + 0.5, 0.02, 0.1); f.rotation.y = s * 0.2; g.add(f); }
            }
            const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: '#ffb46a', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
            glow.scale.set(P.glow === 'voci' ? 3 : 2.2, P.glow === 'voci' ? 3 : 2.2, 1); glow.position.y = P.glow === 'trig' ? 1.4 : 0.6;
            g.add(glow); g.visible = false; W.scene.add(g);
            const it = { id: 'robspot', k, x: P.x, z: P.z, r: P.r || 2.4, label: P.label, when: () => this.want(k) };
            if (!P.swim) it.y = ground;
            W.interactables.push(it);
            this.items.push({ k, g, glow });
        }
        W.animated.push((dt, t) => { for (const c of this.items) if (c.g.visible) c.glow.material.opacity = 0.4 + Math.sin(t * 2 + c.g.position.x) * 0.15; });
        this.refresh();
    }
    want(k) { const st = stOf(this.app), S = robStep(st); return S?.k === 'find' && S.spots.includes(k) && !st.got.includes(k); }
    refresh() { for (const c of this.items) c.g.visible = this.want(c.k); }
    async find(k) {
        const r = await act(this.app, 'find', { k });
        if (!r) return;
        const P = ROB_SPOTS[k], S = robStep(r.rob), still = S?.k === 'find' && S.spots.includes(k);
        if (P.msg) toast(h('div', {}, h('b', {}, still ? `${P.name} (${r.rob.got.length}/${S.spots.length})` : P.name), h('div', {}, P.msg)), { kind: 'coin', icon: 'map', duration: 9000 });
    }
    // la Tavola Lunga: se è l'ora della cena, si cena
    async tavola() {
        const app = this.app, st = stOf(app), S = robStep(st);
        if (S?.k === 'cena') {
            const r = await act(app, 'cena');
            if (r?.cena) playCena(app, r);
            return;
        }
        app.audio.play('ui');
        toast(h('div', {}, h('b', {}, 'La Tavola Lunga'), h('div', {}, robGone(app)
            ? 'La tovaglia è ancora lì, e le lucine. Al posto di capotavola qualcuno ha lasciato un metro da falegname, piegato con cura.'
            : 'Una tavola lunga, apparecchiata per tanti. Le lucine sono accese anche se non c\'è nessuno: aspettano.')), { icon: 'map', duration: 7000 });
    }
}

// =====================================================================
//  LA GRANDE CENA
// =====================================================================
export async function playCena(app, r) {
    if (app.cena) return;
    const W = app.world, scene = app.scene, me = app.me;
    const prevMode = app.mode;
    app.mode = 'cena'; app.cena = true;
    document.exitPointerLock?.(); app.keys = {};
    app.panels.close?.();
    // niente interfaccia durante la cena: solo la tavola, le voci e i sottotitoli
    document.getElementById('hud')?.classList.add('hidden');
    document.getElementById('mobile-controls')?.classList.add('hidden');
    document.getElementById('click-to-play')?.classList.add('hidden');
    document.body.classList.add('cena-on');
    // la scena: chi c'è a tavola. Tutti gli abitanti dell'isola, seduti sulle panche
    const [tx, tz] = TP.tavola, ry = 0.2, y0 = 2.22, LEN = 12;
    const L = (lx, lz) => new THREE.Vector3(tx + lx * Math.cos(ry) + lz * Math.sin(ry), y0, tz - lx * Math.sin(ry) + lz * Math.cos(ry));
    const guests = Object.entries(NPCS).filter(([id]) => id !== 'rob');
    const actors = [];
    guests.slice(0, 18).forEach(([id, N], i) => {
        const side = i % 2 ? 1 : -1, slot = Math.floor(i / 2), lx = -LEN / 2 + 0.9 + slot * ((LEN - 1.8) / 9);
        const ch = new Character(N.app, N.look || {}, {});
        const p = L(lx, side * 1.1); ch.root.position.copy(p); ch.root.rotation.y = ry + (side > 0 ? Math.PI : 0);
        scene.add(ch.root); actors.push({ ch, sit: true });
    });
    // il viandante, a metà tavola, e Rob in piedi a capotavola
    const meCh = new Character(me.appearance, app.look?.() || {}, {});
    const meP = L(0.4, -1.1); meCh.root.position.copy(meP); meCh.root.rotation.y = ry; scene.add(meCh.root); actors.push({ ch: meCh, sit: true });
    const rob = new Character(NPCS.rob.app, NPCS.rob.look || {}, {});
    const robStart = L(-LEN / 2 - 1.2, 0), robEnd = L(0.4, -2.0);
    rob.root.position.copy(robStart); rob.root.rotation.y = ry + Math.PI / 2; scene.add(rob.root);
    const hiddenNpcs = [];
    for (const n of app.npcs?.list || []) if (n.ch.root.visible) { hiddenNpcs.push(n); }
    if (app.myChar) app.myChar.root.visible = false;
    if (app.petF?.g) app.petF.g.visible = false;
    // la luce: è sera, e le lucine scaldano
    const warm = new THREE.PointLight('#ffcf8a', 11, 18, 1.6); warm.position.copy(L(0, 0)).add(new THREE.Vector3(0, 3.5, 0)); scene.add(warm);
    // l'interfaccia della scena: bande nere, sottotitoli, nero, salta
    const subEl = h('div', { class: 'cs-sub' }, h('b', {}), h('span', {}));
    const black = h('div', { class: 'cs-black' }, h('p', {}));
    const skip = h('button', { class: 'cs-skip', onclick: () => { skipped = true; } }, 'Salta ▸▸');
    const el = h('div', { id: 'cena-cut', style: { position: 'fixed', inset: '0', zIndex: '300', pointerEvents: 'none' } }, h('div', { class: 'cs-bar top' }), h('div', { class: 'cs-bar bottom' }), black, subEl, skip);
    document.body.append(el);
    let skipped = false;
    const wait = (s) => new Promise(res => { const t0 = performance.now(); const tick = () => (skipped || performance.now() - t0 > s * 1000 ? res() : setTimeout(tick, 50)); tick(); });
    const sub = (who, txt) => { subEl.firstChild.textContent = who || ''; subEl.lastChild.textContent = say(app, txt); subEl.classList.add('on'); };
    const unsub = () => subEl.classList.remove('on');
    // la telecamera, guidata a mano
    const cam = app.camera, look = new THREE.Vector3(), camTo = new THREE.Vector3(), lookTo = new THREE.Vector3();
    cam.position.copy(L(-LEN / 2 - 9, 7)).add(new THREE.Vector3(0, 6, 0)); look.copy(L(0, 0)).add(new THREE.Vector3(0, 1, 0));
    camTo.copy(cam.position); lookTo.copy(look);
    let robWalk = 0, dissolve = 0, sparks = null, time = 0;
    app.camOverride = (dt) => {
        time += dt;
        cam.position.lerp(camTo, Math.min(1, dt * 0.6)); look.lerp(lookTo, Math.min(1, dt * 0.8)); cam.lookAt(look);
        for (const a of actors) { a.ch.state = 'sit'; a.ch.update(dt); }
        // Rob: gira intorno alla tavola, poi viene da te
        if (robWalk > 0 && robWalk < 1) {
            robWalk = Math.min(1, robWalk + dt / 6);
            const p = new THREE.Vector3().lerpVectors(robStart, robEnd, robWalk); rob.root.position.copy(p);
            rob.root.rotation.y = Math.atan2(robEnd.x - robStart.x, robEnd.z - robStart.z); rob.state = 'walk'; rob.speed = 1.2;
        } else { rob.state = 'idle'; rob.speed = 0; if (robWalk >= 1) rob.root.rotation.y += ((ry + Math.PI) - rob.root.rotation.y) * Math.min(1, dt * 3); }
        rob.update(dt);
        // e poi se ne va, piano, come si spegne una lampada
        if (dissolve > 0) {
            dissolve = Math.min(1, dissolve + dt / 5);
            rob.root.traverse(o => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { m.transparent = true; m.opacity = 1 - dissolve; m.depthWrite = dissolve < 0.5; } } });
            rob.root.position.y = robEnd.y + dissolve * 0.4;
            if (sparks) for (const s of sparks) { s.position.y += dt * (0.4 + s.userData.v); s.position.x += Math.sin(time * 2 + s.userData.v * 9) * dt * 0.2; s.material.opacity = Math.max(0, Math.sin(Math.min(1, dissolve * 1.3) * Math.PI) * 0.9); }
        }
    };
    const shot = (camLocal, camH, lookLocal, lookH) => { camTo.copy(L(...camLocal)).add(new THREE.Vector3(0, camH, 0)); lookTo.copy(L(...lookLocal)).add(new THREE.Vector3(0, lookH, 0)); };
    app.audio.play('saved');
    // --- la scena ---
    shot([-LEN / 2 - 7, 6], 4.5, [0, 0], 0.8);
    await wait(1.5); sub('', 'Quella sera, alla Tavola Lunga, c\'era tutta l\'isola.'); await wait(5);
    shot([LEN / 2 + 2, 5], 2.6, [-2, 0], 1.0);
    sub('', 'La Guardiana del Faro rideva, per una volta. Il Traghettatore aveva tirato la barca in secca. Lo Spettro del Pedaggio non mangiava, ma ascoltava tutto.'); await wait(6);
    shot([2, -5], 2.2, [-1, 0], 1.0);
    sub('', 'Mastro Brace raccontava di ferro e di fuoco. Il Mercante senza Ombra aveva portato il formaggio. Sàlvia dava gli avanzi ai cani, di nascosto.'); await wait(6);
    shot([-3, 4.5], 2.4, [-LEN / 2, 0], 1.3);
    sub('', 'Rob non si è seduto quasi mai. Riempiva i bicchieri, tagliava il pane, raccontava della Secca e del polpo, e rideva prima di arrivare alla fine delle storie.'); await wait(7);
    unsub();
    // Rob viene da te
    robWalk = 0.001;
    shot([2.5, -4.6], 2.0, [0.4, -1.6], 1.2);
    await wait(6.5);
    shot([1.6, -3.4], 1.75, [0.4, -2.0], 1.45);
    await wait(1.5);
    sub('Rob il Righello', 'Mi hai aiutato ad apparecchiare. Lo sai che era tanto che non stavo a una tavola così piena?'); await wait(6);
    sub('Rob il Righello', 'Avrei voluto riabbracciarli tutti, una volta sola. Stasera, in un certo modo, l\'ho fatto. Erano qui, in mezzo a tutto questo chiasso.'); await wait(7);
    sub('Rob il Righello', ROB_LAST); await wait(8);
    unsub();
    // si dissolve
    sparks = [];
    for (let i = 0; i < 40; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: i % 3 ? '#ffd890' : '#ffb46a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
        s.position.copy(robEnd).add(new THREE.Vector3((Math.random() - 0.5) * 0.7, Math.random() * 1.9, (Math.random() - 0.5) * 0.7)); s.scale.setScalar(0.12 + Math.random() * 0.2); s.userData.v = Math.random();
        scene.add(s); sparks.push(s);
    }
    // i materiali dei personaggi sono condivisi: Rob ne prende una copia sua, così svanisce solo lui
    rob.root.traverse(o => { if (o.material) o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone(); });
    dissolve = 0.001; app.audio.play('special');
    await wait(6);
    // il suo metro da falegname, piegato, accanto al tuo piatto
    const ruler = new THREE.Group(), yellow = new THREE.MeshStandardMaterial({ color: '#e8c23a', roughness: 0.55 });
    for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012 + i * 0.002, 0.035), yellow); s.position.y = i * 0.012; s.rotation.y = (i % 2) * 0.04; ruler.add(s); }
    ruler.position.copy(L(0.75, -0.42)).add(new THREE.Vector3(0, 0.88, 0)); ruler.rotation.y = ry + 0.5; scene.add(ruler);
    sub('', 'La sua sedia era vuota. Sul tavolo, accanto al tuo piatto, un metro da falegname giallo, piegato con cura.'); await wait(6);
    unsub();
    // il nero, e quello che resta
    black.classList.add('on'); await wait(2);
    for (const line of ROB_EPILOGUE) { black.firstChild.textContent = line; black.firstChild.style.opacity = '1'; await wait(5.5); }
    black.firstChild.textContent = ROB_DEDICA; await wait(7);
    black.firstChild.textContent = '— Il Righello di Rob —'; await wait(3);
    // si torna all'isola
    app.camOverride = null;
    for (const a of actors) scene.remove(a.ch.root);
    scene.remove(rob.root); scene.remove(warm); scene.remove(ruler);
    for (const s of sparks || []) { scene.remove(s); s.material.dispose(); }
    if (app.myChar) app.myChar.root.visible = true;
    app.mode = prevMode === 'cena' ? 'world' : prevMode; app.cena = false;
    black.classList.remove('on');
    await new Promise(res => setTimeout(res, 1300));
    el.remove();
    document.body.classList.remove('cena-on');
    app.showHud?.();
    app.robW?.refresh();
    toast(h('div', {}, h('b', {}, 'Il Righello di Rob · fine'), h('div', {}, `+${r.xp || 0} esperienza, +${r.coins || 0} monete${r.title ? ' · nuovo titolo: Seduto alla Tavola Lunga' : ''}. Nello studio, sul tavolo da disegno, c\'è un\'ultima tavola.`)), { kind: 'coin', icon: 'map', duration: 14000 });
}
