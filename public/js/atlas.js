// =====================================================================
//  LA CARTA DELL'ISOLA (mappa grande: tasto N o clic sulla minimappa)
//  Disegnata "a mano" su pergamena: costa a inchiostro con le linee del
//  mare, colline, sentieri, castello in pianta, alberi e tombe.
//  Si trascina, si ingrandisce (rotella, pizzico, + e −), i simboli si
//  cliccano e qualche scarabocchio del cartografo nasconde una sorpresa.
// =====================================================================
import { WORLD, fbm, rng, pathDist } from './world.js';
import { GARDENS } from './room.js';
import { NPCS, TABLETS } from './shared/lore.js';
import { STONES, FISH_SPOT, BOUNTY_BOARD, TOLL, FOUNTAIN, GRAVES } from './shared/catalog.js';
import { drawIcon, iconSVG } from './icons.js';
import { h, $ } from './util.js';
import { clockText } from './sky.js';

const BASE = 2048;                                   // lato della carta disegnata, in pixel
const { MIN_X, MAX_X, MIN_Z } = WORLD;
const PPM = BASE / (MAX_X - MIN_X);                  // pixel di carta per metro
const bx = (x) => (x - MIN_X) * PPM, bz = (z) => (z - MIN_Z) * PPM;
const INK = '#2b1a0e', PAPER = '#efe2bd', RED = '#8a2416';
const MAX_ZOOM = 5;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
// il tremolio della mano: uno spostamento che dipende solo dal punto, così i tratti vicini si raccordano
const wob = (x, y, a = 2.4, s = 0) => [x + fbm(x * 0.011 + s, y * 0.011, 2) * a, y + fbm(x * 0.011 + 40 + s, y * 0.011 - 17, 2) * a];

// --- PUNTI D'INTERESSE ---
const S = WORLD.SHOPS;
const PLACES = [
    { id: 'forgia', cat: 'botteghe', ic: 'anvil', p: 1, name: 'Forgia di Vulcano', x: S.forgia.x, z: S.forgia.z, desc: 'Mastro Brace forgia armi su misura: tipo, materiale, impugnatura e gemma. Apre anche i castoni per le rune.' },
    { id: 'sartoria', cat: 'botteghe', ic: 'needle', p: 1, name: 'Sartoria Spettrale', x: S.sartoria.x, z: S.sartoria.z, desc: 'Cappelli, maschere, mantelli e armature: si provano addosso prima di comprarli.' },
    { id: 'bazar', cat: 'botteghe', ic: 'scales', p: 1, name: 'Bazar del Ratto', x: S.bazar.x, z: S.bazar.z, desc: 'La compravendita tra viandanti. Quello che metti in vendita resta sul banco anche quando non ci sei.' },
    { id: 'piazza', cat: 'luoghi', ic: 'trophy', p: 1, name: 'Piazza della Gloria', x: WORLD.PLAZA.x, z: WORLD.PLAZA.z, desc: "Il cuore del villaggio: sull'Obelisco c'è l'Albo dei Campioni dell'isola." },
    { id: 'bacheca', cat: 'luoghi', ic: 'scroll', p: 2, name: 'Bacheca delle Taglie', x: BOUNTY_BOARD.x, z: BOUNTY_BOARD.z, desc: 'Tre taglie al giorno e una alla settimana: si leggono e si riscuotono qui (tasto J).' },
    { id: 'specchio', cat: 'luoghi', ic: 'mirror', p: 3, name: 'Lo Specchio', x: WORLD.MIRROR.x, z: WORLD.MIRROR.z, desc: 'Guardati dentro: cambi aspetto e nome quando vuoi.' },
    { id: 'arena', cat: 'luoghi', ic: 'swords', p: 1, name: 'Arena dei Duelli', x: WORLD.ARENA.x, z: WORLD.ARENA.z, desc: 'Nel cortile del castello: duelli tra viandanti, scommesse e allenamento con il Fantasma.' },
    { id: 'stanza', cat: 'luoghi', ic: 'armchair', p: 2, name: 'La Stanza Bianca', x: WORLD.KEEP.x, z: WORLD.KEEP.z, desc: 'In cima al mastio: i video di Sputnik Homies, la diretta di In Onda! e un telefono bianco che ogni tanto squilla.' },
    { id: 'fontana', cat: 'luoghi', ic: 'wave', p: 2, name: 'Fontana dei Desideri', x: FOUNTAIN.x, z: FOUNTAIN.z, desc: 'Nel giardino del castello. Una moneta al giorno, un desiderio: la fontana decide quale.' },
    { id: 'quadri', cat: 'luoghi', ic: 'portrait', p: 3, name: 'I Quadri delle Puntate', x: -14.5, z: -96, desc: 'I quadri del cortile mostrano le puntate di Sputnik Homies: aprile con E. La prima visione vale 10 monete.' },
    { id: 'cimitero', cat: 'luoghi', ic: 'skull', p: 1, name: 'Cimitero Sommerso', x: WORLD.CEMETERY.x, z: WORLD.CEMETERY.z, desc: 'Il Becchino presta la vanga dal livello 3: le tombe nascondono ossa e scheletri. Il sabato sera, la Veglia dei Morti.' },
    { id: 'altare', cat: 'luoghi', ic: 'altar', p: 1, name: "L'Altare dei Sette Semi", x: 30, z: 52, desc: 'Nella Cappella in Rovina la Custode senza Volto risveglia le carte, incanta gli oggetti e infonde le armi.' },
    { id: 'pietre', cat: 'luoghi', ic: 'runestone', p: 1, name: 'Cerchio di Pietre', x: STONES.x, z: STONES.z, desc: 'Frammenti di Runa da raccogliere e il Canto delle Pietre: ascolta la sequenza e ripetila.' },
    { id: 'molo', cat: 'luoghi', ic: 'rod', p: 1, name: 'Il Molo', x: FISH_SPOT.x, z: FISH_SPOT.z - 3, desc: 'Qui approdano i viandanti. In fondo alle assi si lancia la lenza: di notte abboccano i pesci della nebbia.' },
    { id: 'pedaggio', cat: 'luoghi', ic: 'ecto', p: 2, name: 'Pedaggio dello Spettro', x: TOLL.spot.x, z: TOLL.spot.z, desc: 'Sul Ponte dei Sospiri lo Spettro chiede il pedaggio: un duello a colpi di insulti e risposte.' },
];
const CATS = [['botteghe', 'Botteghe', 'anvil'], ['luoghi', 'Luoghi', 'castle'], ['abitanti', 'Abitanti', 'talk'], ['tavolette', 'Tavolette', 'runestone'], ['viandanti', 'Viandanti', 'friends']];
const DIRS = ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-ovest', 'ovest', 'nord-ovest'];

// --- SCARABOCCHI DEL CARTOGRAFO (si cliccano) ---
const DOODLES = [
    { id: 'serpe', x: 116, z: 104, r: 16, title: 'Hic sunt Sputnik', text: 'Qui sotto dorme il Re Annegato. Il sabato sera russa così forte che le onde arrivano fino al molo.', sfx: 'roar' },
    { id: 'nave', x: -128, z: 42, r: 13, title: 'La nave del Traghettatore', text: "Non ha mai lasciato l'ormeggio, ma sulla carta fa la sua figura.", sfx: 'splash' },
    { id: 'balena', x: -112, z: -126, r: 14, title: 'La balena di nebbia', text: "Ogni tanto la senti cantare, lontana. Nessuno l'ha mai vista: il cartografo giura di sì.", sfx: 'splash' },
    { id: 'tesoro', x: 0, z: 0, r: 4, title: 'X segna il punto', text: "Qui il cartografo ha sepolto la sua merenda. Inutile scavare: se l'è già mangiata.", sfx: 'dig' },
    { id: 'paperella', x: 8.5, z: 111, r: 3, zoom: 2.4, title: 'Una paperella di gomma', text: 'Nessuno sa come sia arrivata fin qui. Galleggia da tre stagioni e non ha mai perso un duello.', sfx: 'chat' },
    { id: 'sigillo', x: 84, z: -170, r: 9, title: 'Sigillo degli Sputnik Homies', text: 'Garantisce che questa carta è vera almeno al sessanta per cento.', sfx: 'coin' },
    { id: 'firma', x: 118, z: 146, r: 15, title: 'La firma del cartografo', text: "Il Ratto dei Cronisti ammette di aver disegnato il castello a memoria. Le proporzioni sono un'opinione.", sfx: 'open' },
];

export class Atlas {
    constructor(app) {
        this.app = app;
        this.cv = $('#atlas-canvas');
        this.g = this.cv.getContext('2d');
        this.tip = $('#atlas-tip');
        this.card = $('#atlas-card');
        this.filters = { botteghe: true, luoghi: true, abitanti: true, tavolette: true, viandanti: true, ...(app.local.settings.mapFilters || {}) };
        this.pointers = new Map();
        this.spin = 0; this.spinV = 0;
        this.view = null; this.target = null;
        this.hover = null; this.sel = null;
        this.treasure = this.findTreasure();
        this.bind();
    }

    // --- APERTURA ---
    open() {
        this.on = true;
        if (!this.base) this.base = this.buildBase();
        this.resize();
        // su un telefono la carta intera è minuscola: si parte da dove sei
        if (!this.view) { if (this.cw < 600) { const P = this.app.player.pos; this.centerOn(P.x, P.z, 1.9, false); } else this.fit(false); }
        this.renderFilters();
        this.hideCard();
        this.dirty = true;
        cancelAnimationFrame(this.raf);
        const loop = () => { if (!this.on) return; this.raf = requestAnimationFrame(loop); this.frame(); };
        loop();
    }
    close() { this.on = false; cancelAnimationFrame(this.raf); this.tip.classList.add('hidden'); this.pointers.clear(); }

    resize() {
        // misure di layout (non trasformate: durante l'apertura la carta si srotola)
        this.dpr = Math.min(2, devicePixelRatio || 1);
        const cw = Math.max(200, this.cv.clientWidth), ch = Math.max(200, this.cv.clientHeight), first = !this.cw;
        if (!first && cw === this.cw && ch === this.ch) return;
        // prima di cambiare misura: quanto eri vicino e dove guardavi
        const v = this.target || this.view, zr = v ? v.s / this.fitS : 1, mid = v ? this.toWorldOf(v, this.cw / 2, this.ch / 2) : null;
        this.cw = cw; this.ch = ch;
        this.cv.width = Math.round(this.cw * this.dpr); this.cv.height = Math.round(this.ch * this.dpr);
        this.fitS = Math.min(this.cw, this.ch) / BASE;
        if (v) { if (zr < 1.02) this.fit(false); else this.centerOn(mid[0], mid[1], zr, false); }
        this.dirty = true;
    }
    clamp(v) {
        const s = Math.min(this.fitS * MAX_ZOOM, Math.max(this.fitS * 0.9, v.s)), size = BASE * s;
        // il centro dello schermo resta sempre sopra la carta
        const ox = Math.min(this.cw / 2, Math.max(this.cw / 2 - size, v.ox));
        const oy = Math.min(this.ch / 2, Math.max(this.ch / 2 - size, v.oy));
        return { s, ox, oy };
    }
    go(v, animate = true) { v = this.clamp(v); if (animate) this.target = v; else { this.view = v; this.target = null; } this.dirty = true; }
    fit(animate = true) { const s = this.fitS; this.go({ s, ox: (this.cw - BASE * s) / 2, oy: (this.ch - BASE * s) / 2 }, animate); }
    centerOn(x, z, zoom, animate = true) { const s = this.fitS * zoom; this.go({ s, ox: this.cw / 2 - bx(x) * s, oy: this.ch / 2 - bz(z) * s }, animate); }
    zoomAt(px, py, f, animate = true) {
        const v = this.target || this.view;
        const s = Math.min(this.fitS * MAX_ZOOM, Math.max(this.fitS * 0.9, v.s * f)), k = s / v.s;
        this.go({ s, ox: px - (px - v.ox) * k, oy: py - (py - v.oy) * k }, animate);
    }
    toScreen(x, z) { const v = this.view; return [v.ox + bx(x) * v.s, v.oy + bz(z) * v.s]; }
    toWorld(px, py) { return this.toWorldOf(this.view, px, py); }
    toWorldOf(v, px, py) { return [(px - v.ox) / v.s / PPM + MIN_X, (py - v.oy) / v.s / PPM + MIN_Z]; }

    // --- COMANDI ---
    bind() {
        const cv = this.cv;
        const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
        cv.addEventListener('pointerdown', (e) => {
            cv.setPointerCapture(e.pointerId);
            const [x, y] = pos(e);
            this.pointers.set(e.pointerId, { x, y, x0: x, y0: y, t0: performance.now() });
            this.target = null;
            cv.classList.add('drag');
        });
        cv.addEventListener('pointermove', (e) => {
            const [x, y] = pos(e), P = this.pointers.get(e.pointerId);
            if (!P) { this.setHover(this.hit(x, y), x, y); return; }
            if (this.pointers.size === 1) {
                this.view = this.clamp({ s: this.view.s, ox: this.view.ox + x - P.x, oy: this.view.oy + y - P.y });
            } else if (this.pointers.size === 2) {
                const [A, B] = [...this.pointers.values()], other = A === P ? B : A;
                const d0 = Math.hypot(P.x - other.x, P.y - other.y), d1 = Math.hypot(x - other.x, y - other.y);
                const mx = (x + other.x) / 2, my = (y + other.y) / 2, pmx = (P.x + other.x) / 2, pmy = (P.y + other.y) / 2;
                if (d0 > 10) {
                    const v = this.view, s = Math.min(this.fitS * MAX_ZOOM, Math.max(this.fitS * 0.9, v.s * d1 / d0)), k = s / v.s;
                    this.view = this.clamp({ s, ox: mx - (pmx - v.ox) * k, oy: my - (pmy - v.oy) * k });
                }
            }
            P.x = x; P.y = y;
            this.dirty = true;
        });
        const up = (e) => {
            const P = this.pointers.get(e.pointerId);
            this.pointers.delete(e.pointerId);
            if (!this.pointers.size) cv.classList.remove('drag');
            if (P && Math.hypot(P.x - P.x0, P.y - P.y0) < 6 && performance.now() - P.t0 < 500 && !this.pointers.size) this.click(P.x, P.y);
        };
        cv.addEventListener('pointerup', up);
        cv.addEventListener('pointercancel', (e) => { this.pointers.delete(e.pointerId); cv.classList.remove('drag'); });
        cv.addEventListener('pointerleave', () => { if (!this.pointers.size) this.setHover(null); });
        cv.addEventListener('wheel', (e) => { e.preventDefault(); const [x, y] = pos(e); this.zoomAt(x, y, Math.exp(-e.deltaY * 0.0016)); }, { passive: false });
        cv.addEventListener('dblclick', (e) => { const [x, y] = pos(e); this.zoomAt(x, y, 2); });
        $('#atlas-in').onclick = () => this.zoomAt(this.cw / 2, this.ch / 2, 1.6);
        $('#atlas-out').onclick = () => this.zoomAt(this.cw / 2, this.ch / 2, 1 / 1.6);
        $('#atlas-me').onclick = () => this.centerMe();
        $('#atlas-fit').onclick = () => this.fit();
        $('#atlas-me').innerHTML = iconSVG('person');
        $('#atlas-fit').innerHTML = iconSVG('map');
        new ResizeObserver(() => { if (this.on) this.resize(); }).observe(cv);
    }
    centerMe() { const P = this.app.player.pos; this.centerOn(P.x, P.z, Math.max(2.4, (this.view?.s || 0) / this.fitS)); }
    key(e) {
        const step = 90;
        switch (e.code) {
            case 'Equal': case 'NumpadAdd': this.zoomAt(this.cw / 2, this.ch / 2, 1.6); break;
            case 'Minus': case 'NumpadSubtract': this.zoomAt(this.cw / 2, this.ch / 2, 1 / 1.6); break;
            case 'Digit0': case 'Numpad0': this.fit(); break;
            case 'KeyC': this.centerMe(); break;
            case 'ArrowLeft': case 'KeyA': this.pan(step, 0); break;
            case 'ArrowRight': case 'KeyD': this.pan(-step, 0); break;
            case 'ArrowUp': case 'KeyW': this.pan(0, step); break;
            case 'ArrowDown': case 'KeyS': this.pan(0, -step); break;
            default: return;
        }
        e.preventDefault();
    }
    pan(dx, dy) { const v = this.target || this.view; this.go({ s: v.s, ox: v.ox + dx, oy: v.oy + dy }); }

    renderFilters() {
        const box = $('#atlas-filters');
        box.replaceChildren(...CATS.map(([k, label, ic]) => h('button', {
            class: 'atlas-chip' + (this.filters[k] ? '' : ' off'), html: iconSVG(ic), title: this.filters[k] ? `Nascondi: ${label}` : `Mostra: ${label}`,
            onclick: () => {
                this.filters[k] = !this.filters[k];
                this.app.local.settings.mapFilters = this.filters; this.app.saveLocal();
                this.app.audio.play('ui');
                this.renderFilters(); this.dirty = true;
            },
        }, label)));
    }

    // --- COSA C'È DA DISEGNARE SOPRA LA CARTA ---
    marks() {
        const z = this.view.s / this.fitS, out = [], F = this.filters, me = this.app.me || {};
        const narrow = this.cw < 600;
        for (const p of PLACES) if (F[p.cat] && (p.p === 1 || (p.p === 2 && (!narrow || z >= 1.4)) || z >= (narrow ? 2.2 : 1.5))) out.push({ ...p, kind: 'poi' });
        if (F.abitanti && z >= 1.7) for (const [id, n] of Object.entries(NPCS)) {
            out.push({ kind: 'poi', id: 'npc:' + id, cat: 'abitanti', ic: 'talk', p: 3, small: true, name: n.name, x: n.x, z: n.z, where: n.where, desc: `«${n.lines[0]}»` });
        }
        if (F.tavolette) {
            const found = new Set(me.tablets || []);
            for (const [id, T] of Object.entries(TABLETS)) {
                if (found.has(id)) out.push({ kind: 'poi', id: 'tab:' + id, cat: 'tavolette', ic: 'runestone', p: 3, small: true, name: T.name, x: T.x, z: T.z, desc: `Già letta: «${T.text.slice(0, 110)}${T.text.length > 110 ? '…' : ''}»` });
                else if (z >= 3) out.push({ kind: 'poi', id: 'tab:' + id, cat: 'tavolette', unknown: true, p: 3, small: true, name: 'Un segno sulla pietra?', x: T.x, z: T.z, desc: "Il cartografo ha visto qualcosa di inciso, da queste parti. Ma non ricorda che cosa diceva." });
            }
        }
        return out;
    }
    hit(px, py) {
        if (Math.hypot(px - this.compassX, py - this.compassY) < 50) return { kind: 'compass' };
        const v = this.view, zr = v.s / this.fitS;
        if (this.filters.viandanti) for (const p of this.app.players.values()) {
            const q = p.ch.root.position, [x, y] = this.toScreen(q.x, q.z);
            if (Math.hypot(px - x, py - y) < 9) return { kind: 'player', p };
        }
        let best = null, bd = Infinity;
        for (const m of this.marks()) {
            const [x, y] = this.toScreen(m.x, m.z), d = Math.hypot(px - x, py - y), r = (m.small ? 12 : 15) + 4;
            if (d < r && d < bd) { bd = d; best = m; }
        }
        if (best) return best;
        const [wx, wz] = this.toWorld(px, py);
        for (const d of DOODLES) {
            if (d.zoom && zr < d.zoom) continue;
            const p = d.id === 'tesoro' ? this.treasure : d;
            if (Math.hypot(wx - p.x, wz - p.z) < d.r) return { kind: 'doodle', ...d };
        }
        return null;
    }
    setHover(m, x, y) {
        const key = (m) => m ? m.kind + (m.id || m.p?.info?.id || '') : '';
        if (key(m) !== key(this.hover)) { this.hover = m; this.dirty = true; }
        this.cv.classList.toggle('hot', !!m);
        if (!m) { this.tip.classList.add('hidden'); return; }
        const t = m.kind === 'player' ? `${m.p.info.name} · Lv ${m.p.info.level || 1}` : m.kind === 'doodle' ? 'Uno scarabocchio del cartografo…' : m.kind === 'compass' ? 'La rosa dei venti' : m.name;
        this.tip.textContent = t;
        this.tip.style.left = x + 'px'; this.tip.style.top = y + 'px';
        this.tip.classList.remove('hidden');
    }
    click(x, y) {
        const m = this.hit(x, y);
        if (!m) { this.hideCard(); return; }
        if (m.kind === 'compass') { this.spinV = 18 + Math.random() * 10; this.app.audio.play('swing'); return this.showCard({ ic: 'map', name: 'La rosa dei venti', desc: 'Il nord è dove guardi quando ti perdi. Il resto lo decide la nebbia.' }); }
        if (m.kind === 'doodle') { this.app.audio.play(m.sfx || 'ui', { vol: 0.6 }); return this.showCard({ ic: 'quill', name: m.title, desc: m.text, doodle: true }); }
        if (m.kind === 'player') {
            const q = m.p.ch.root.position;
            return this.showCard({ ic: this.app.isFriend(m.p.info.id) ? 'friends' : 'person', name: m.p.info.name, desc: `${m.p.info.title || 'Viandante'} · livello ${m.p.info.level || 1}${this.app.isFriend(m.p.info.id) ? ' · tuo amico' : ''}`, x: q.x, z: q.z });
        }
        this.app.audio.play('ui');
        this.sel = m.id;
        this.showCard(m);
        if (this.view.s / this.fitS < 1.8) this.centerOn(m.x, m.z, 2.2);
    }
    showCard(m) {
        const P = this.app.player?.pos;
        let dist = null;
        if (P && m.x != null) {
            const dx = m.x - P.x, dz = m.z - P.z, d = Math.hypot(dx, dz);
            dist = d < 6 ? 'Sei proprio qui.' : `A ${Math.round(d)} passi da te, verso ${DIRS[((Math.round(Math.atan2(dx, -dz) / (Math.PI / 4)) % 8) + 8) % 8]}.`;
        }
        this.card.replaceChildren(...[
            h('button', { class: 'x', title: 'Chiudi', onclick: () => this.hideCard() }, '×'),
            h('h4', { html: m.unknown ? '' : iconSVG(m.ic || 'map') }, m.name),
            m.where ? h('div', { class: 'where' }, m.where) : null,
            h('p', {}, m.desc),
            dist ? h('div', { class: 'where' }, dist) : null].filter(Boolean));
        this.card.classList.toggle('doodle', !!m.doodle);
        this.card.classList.remove('hidden');
    }
    hideCard() { this.card.classList.add('hidden'); if (this.sel) { this.sel = null; this.dirty = true; } }

    // --- DISEGNO ---
    frame() {
        if (this.target) {
            const v = this.view, t = this.target, k = 0.24;
            v.s += (t.s - v.s) * k; v.ox += (t.ox - v.ox) * k; v.oy += (t.oy - v.oy) * k;
            if (Math.abs(t.s - v.s) < t.s * 0.002 && Math.abs(t.ox - v.ox) < 0.5 && Math.abs(t.oy - v.oy) < 0.5) { this.view = { ...t }; this.target = null; }
            this.dirty = true;
        }
        if (this.spinV) { this.spin += this.spinV * 0.016; this.spinV *= 0.95; if (this.spinV < 0.05) { this.spinV = 0; this.spin %= Math.PI * 2; } this.dirty = true; }
        const now = performance.now();
        if (this.dirty || now - (this.last || 0) > 100) { this.last = now; this.dirty = false; this.draw(now); }
    }
    draw(now) {
        const g = this.g, { s, ox, oy } = this.view;
        g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        const bg = g.createLinearGradient(0, 0, 0, this.ch);
        bg.addColorStop(0, '#4a3420'); bg.addColorStop(1, '#2e1f12');
        g.fillStyle = bg; g.fillRect(0, 0, this.cw, this.ch);
        g.save();
        g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 24; g.shadowOffsetY = 8;
        g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
        g.drawImage(this.base, ox, oy, BASE * s, BASE * s);
        g.restore();
        this.drawMarks(g, now);
        this.drawCompass(g);
        this.drawScale(g);
        this.drawClock(g);
    }
    drawMarks(g, now) {
        const zr = this.view.s / this.fitS, placed = [];
        // un nome non copre i nomi già scritti né i simboli importanti almeno quanto lui
        const free = (b, p) => !placed.some(o => o[4] <= p && b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
        const marks = this.marks().sort((a, b) => a.p - b.p);
        // un duello in corso fa brillare l'Arena
        if (this.app.duels?.size && this.filters.luoghi) {
            const [x, y] = this.toScreen(WORLD.ARENA.x, WORLD.ARENA.z), k = 0.5 + 0.5 * Math.sin(now / 220);
            g.strokeStyle = `rgba(160,30,20,${0.35 + 0.4 * k})`; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 22 + k * 6, 0, Math.PI * 2); g.stroke();
        }
        const items = [];
        for (const m of marks) {
            const [x, y] = this.toScreen(m.x, m.z);
            if (x < -40 || y < -40 || x > this.cw + 40 || y > this.ch + 40) continue;
            const r = (m.small ? 12 : 15) * (this.cw < 600 ? 0.85 : 1);
            placed.push([x - r, y - r, x + r, y + r, m.p]);
            items.push({ m, x, y, r });
        }
        for (const { m, x, y, r } of items) {
            const hot = this.hover?.kind === 'poi' && this.hover.id === m.id, sel = this.sel === m.id, R = r + (hot || sel ? 3 : 0);
            g.save();
            g.shadowColor = 'rgba(40,20,5,0.35)'; g.shadowBlur = 5; g.shadowOffsetY = 2;
            g.fillStyle = m.unknown ? 'rgba(239,226,189,0.85)' : '#f3e7c6';
            g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
            g.restore();
            g.strokeStyle = sel ? RED : INK; g.lineWidth = sel ? 2.6 : 1.7;
            g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.stroke();
            g.lineWidth = 0.8; g.beginPath(); g.arc(x, y, R - 3, 0, Math.PI * 2); g.stroke();
            if (m.unknown) { g.font = '700 17px Almendra, serif'; g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', x, y + 1); }
            else drawIcon(g, m.ic, x, y, r * 1.25, m.cat === 'abitanti' ? '#6a2a14' : '#3a1a08');
        }
        // nomi: prima i luoghi importanti, senza sovrapporsi
        g.textAlign = 'center'; g.textBaseline = 'top';
        for (const { m, x, y, r } of items) {
            const hot = (this.hover?.kind === 'poi' && this.hover.id === m.id) || this.sel === m.id;
            const need = m.p === 1 ? 0 : m.p === 2 ? 1.25 : 2.4;
            if (!hot && zr < need) continue;
            g.font = `${m.p === 1 ? 700 : 400} ${m.p === 1 ? 16 : 14}px Almendra, serif`;
            const w = g.measureText(m.name).width;
            // sotto, sopra, a destra o a sinistra del simbolo: il primo posto libero
            const spots = [[x, y + r + 3], [x, y - r - 21], [x + r + 6 + w / 2, y - 9], [x - r - 6 - w / 2, y - 9]];
            let at = null;
            for (const [lx, ly] of spots) {
                const box = [lx - w / 2 - 3, ly - 1, lx + w / 2 + 3, ly + 17, 0];
                if (hot || free(box, m.p)) { at = [lx, ly]; placed.push(box); break; }
            }
            if (!at) continue;
            g.lineJoin = 'round'; g.strokeStyle = 'rgba(243,231,198,0.92)'; g.lineWidth = 4.5; g.strokeText(m.name, at[0], at[1]);
            g.fillStyle = hot ? RED : '#24140a'; g.fillText(m.name, at[0], at[1]);
        }
        // altri viandanti
        if (this.filters.viandanti) for (const p of this.app.players.values()) {
            const q = p.ch.root.position, [x, y] = this.toScreen(q.x, q.z), fr = this.app.isFriend(p.info.id);
            g.fillStyle = fr ? '#2a6a1a' : '#7a3a08'; g.strokeStyle = PAPER; g.lineWidth = 2;
            g.beginPath(); g.arc(x, y, 5.5, 0, Math.PI * 2); g.fill(); g.stroke();
            if (zr >= 2 || this.hover?.p === p) {
                g.font = 'italic 13px Alegreya, serif'; g.textBaseline = 'bottom';
                g.strokeStyle = 'rgba(243,231,198,0.9)'; g.lineWidth = 3.5; g.strokeText(p.info.name, x, y - 7);
                g.fillStyle = fr ? '#1a4a10' : '#4a2006'; g.fillText(p.info.name, x, y - 7); g.textBaseline = 'top';
            }
        }
        // tu
        const P = this.app.player?.pos;
        if (P) {
            const [x, y] = this.toScreen(P.x, P.z), k = (now / 900) % 1;
            g.strokeStyle = `rgba(138,36,22,${0.7 * (1 - k)})`; g.lineWidth = 2.2;
            g.beginPath(); g.arc(x, y, 8 + k * 22, 0, Math.PI * 2); g.stroke();
            g.save(); g.translate(x, y); g.rotate(Math.PI - this.app.player.yaw);
            g.fillStyle = RED; g.strokeStyle = PAPER; g.lineWidth = 2.5; g.lineJoin = 'round';
            g.beginPath(); g.moveTo(0, -13); g.lineTo(9, 10); g.lineTo(0, 5); g.lineTo(-9, 10); g.closePath(); g.stroke(); g.fill();
            g.restore();
            if (zr < 2.2) {
                g.font = 'italic 700 15px Almendra, serif'; g.textBaseline = 'middle'; g.textAlign = 'left';
                g.strokeStyle = 'rgba(243,231,198,0.92)'; g.lineWidth = 4; g.strokeText('sei qui', x + 15, y - 12);
                g.fillStyle = RED; g.fillText('sei qui', x + 15, y - 12); g.textAlign = 'center';
            }
        }
    }
    // rosa dei venti: si può far girare
    drawCompass(g) {
        const R = this.cw < 600 ? 34 : 46, x = this.compassX = this.cw - R - 18, y = this.compassY = R + 18;
        g.save(); g.translate(x, y); g.rotate(this.spin);
        g.fillStyle = 'rgba(243,231,198,0.88)'; g.strokeStyle = INK; g.lineWidth = 1.4;
        g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill(); g.stroke();
        g.beginPath(); g.arc(0, 0, R - 5, 0, Math.PI * 2); g.lineWidth = 0.7; g.stroke();
        for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2, l = i % 4 ? 3 : 6; g.beginPath(); g.moveTo(Math.sin(a) * (R - 5), -Math.cos(a) * (R - 5)); g.lineTo(Math.sin(a) * (R - 5 - l), -Math.cos(a) * (R - 5 - l)); g.stroke(); }
        const point = (a, len, w, fillHalf) => {
            g.save(); g.rotate(a);
            g.beginPath(); g.moveTo(0, -len); g.lineTo(w, 0); g.lineTo(0, 0); g.closePath(); g.fillStyle = fillHalf ? INK : PAPER; g.fill(); g.lineWidth = 1; g.stroke();
            g.beginPath(); g.moveTo(0, -len); g.lineTo(-w, 0); g.lineTo(0, 0); g.closePath(); g.fillStyle = fillHalf ? PAPER : INK; g.fill(); g.stroke();
            g.restore();
        };
        for (let i = 0; i < 4; i++) point(Math.PI / 4 + i * Math.PI / 2, R * 0.55, R * 0.1, true);
        for (let i = 0; i < 4; i++) point(i * Math.PI / 2, R * 0.86, R * 0.15, i % 2 === 0);
        g.fillStyle = RED; g.beginPath(); g.arc(0, 0, 3, 0, Math.PI * 2); g.fill();
        g.restore();
        g.save(); g.translate(x, y); g.rotate(this.spin);
        g.font = `900 ${R < 40 ? 13 : 16}px Cinzel, serif`; g.fillStyle = RED; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('N', 0, -R - 9);
        g.restore();
    }
    // barra della scala, in passi
    drawScale(g) {
        const mpp = 1 / (this.view.s * PPM);    // metri per pixel sullo schermo
        const nice = [5, 10, 20, 25, 50, 100, 200].find(n => n / mpp >= 70) || 200, len = nice / mpp;
        const x = this.cw - len - 24, y = this.ch - (this.cw < 600 ? 74 : 62);
        g.save();
        g.fillStyle = 'rgba(243,231,198,0.82)'; g.fillRect(x - 10, y - 20, len + 20, 34);
        g.strokeStyle = INK; g.lineWidth = 1.2; g.strokeRect(x, y, len, 6);
        for (let i = 0; i < 4; i++) if (i % 2 === 0) { g.fillStyle = INK; g.fillRect(x + len / 4 * i, y, len / 4, 6); }
        g.font = 'italic 13px Alegreya, serif'; g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'bottom';
        g.fillText('0', x, y - 2); g.fillText(`${nice} passi`, x + len, y - 2);
        g.restore();
    }
    drawClock(g) {
        const S = this.app.env?.state;
        if (!S) return;
        const R = this.cw < 600 ? 34 : 46;
        g.save();
        g.font = 'italic 14px Alegreya, serif'; g.textAlign = 'center'; g.textBaseline = 'top';
        const t = `${clockText(S.hour)} · ${S.weatherName}`, x = this.cw - R - 18, y = R * 2 + 26;
        g.strokeStyle = 'rgba(243,231,198,0.9)'; g.lineWidth = 4; g.lineJoin = 'round'; g.strokeText(t, x, y);
        g.fillStyle = INK; g.fillText(t, x, y);
        g.restore();
    }

    // un punto di sabbia sulla costa sud-est, per la X del tesoro
    findTreasure() {
        const W = this.app.world;
        for (let a = 0.55; a < 1.3; a += 0.05) for (let r = 54; r < 84; r += 1) {
            const x = WORLD.MAIN.x + Math.cos(a) * r, z = WORLD.MAIN.z + Math.sin(a) * r, t = W.terrainAt(x, z);
            if (t > 0.2 && t < 0.5 && pathDist(x, z) > 8) return { x, z };
        }
        return { x: 48, z: 70 };
    }

    // =================================================================
    //  LA CARTA DISEGNATA (una volta sola, in alta risoluzione)
    // =================================================================
    buildBase() {
        const c = document.createElement('canvas'); c.width = c.height = BASE;
        const g = c.getContext('2d'), W = this.app.world;
        const R = rng(9);
        g.lineCap = g.lineJoin = 'round';
        // pergamena
        g.fillStyle = '#ead9ae'; g.fillRect(0, 0, BASE, BASE);
        this.washes(g, W);
        // il mare: alone lungo la costa e linee d'acqua che ne seguono la forma
        const coast = contour(W, 0.02);
        strokeSegs(g, coast, { w: 22, a: 0.1, color: '#3f6f70', amp: 2.6 });
        strokeSegs(g, coast, { w: 9, a: 0.12, color: '#3f6f70', amp: 2.6 });
        [[-0.45, 0.42, 1.5], [-1.3, 0.34, 1.3], [-2.5, 0.27, 1.2], [-4.2, 0.2, 1.1, [7, 7]], [-6.5, 0.14, 1, [3, 9]]].forEach(([lv, a, w, dash], i) =>
            strokeSegs(g, contour(W, lv), { w, a, color: '#2f4f50', amp: 3.2, s: i * 7, dash }));
        this.waves(g, W, R);
        // la terra: curve di livello, colline e ciuffi d'erba
        [[2.2, 0.22], [3.6, 0.2], [5, 0.18]].forEach(([lv, a], i) => strokeSegs(g, contour(W, lv), { w: 1.1, a, amp: 2.8, s: 20 + i * 5 }));
        this.hills(g, W, R);
        this.tufts(g, W, R);
        this.paths(g);
        this.bridgeAndDock(g);
        this.village(g);
        this.cemetery(g);
        this.chapelAndStones(g);
        this.nature(g, W, R);
        this.castle(g);
        // la costa a inchiostro, due passate come una mano che ripassa
        strokeSegs(g, coast, { w: 3.4, a: 0.92, amp: 2.4 });
        strokeSegs(g, coast, { w: 1.2, a: 0.55, amp: 3.4, s: 13 });
        this.doodles(g);
        this.labels(g);
        this.paper(g, R);
        this.border(g);
        return c;
    }
    washes(g, W) {
        const N = 360, wc = document.createElement('canvas'); wc.width = wc.height = N;
        const wg = wc.getContext('2d'), img = wg.createImageData(N, N), C = WORLD.CASTLE;
        for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
            const x = MIN_X + px + 0.5, z = MIN_Z + py + 0.5, t = W.terrainAt(x, z);
            const n = fbm(x * 0.03, z * 0.03, 3) * 0.5 + 0.5;
            let col;
            if (t < 0) col = mix([186, 202, 184], [112, 146, 146], smooth(0, 6.5, -t));
            else {
                col = t < 0.6 ? [226, 208, 160] : mix([196, 196, 138], [172, 182, 120], n);
                col = mix(col, [184, 164, 118], smooth(3, 6.5, t));
                if (Math.abs(x - C.x) < 27 && Math.abs(z - C.z) < 27 && t > 2.4) col = [204, 196, 176];
                if (Math.hypot(x - WORLD.CEMETERY.x, z - WORLD.CEMETERY.z) < 13) col = mix(col, [170, 172, 152], 0.6);
            }
            const k = (py * N + px) * 4;
            img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = 255;
        }
        wg.putImageData(img, 0, 0);
        g.save(); g.globalAlpha = 0.72; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
        g.filter = 'blur(3px)';
        g.drawImage(wc, 0, 0, BASE, BASE);
        g.restore();
    }
    waves(g, W, R) {
        g.save(); g.strokeStyle = '#2f4f50'; g.lineWidth = 1.4; g.globalAlpha = 0.42;
        for (let z = MIN_Z + 8; z < MIN_Z + 352; z += 13) for (let x = MIN_X + 8; x < MAX_X - 8; x += 15) {
            const px = x + (R() - 0.5) * 9, pz = z + (R() - 0.5) * 7;
            if (W.terrainAt(px, pz) > -3.6 || R() < 0.35) continue;
            const X = bx(px), Y = bz(pz), w = 9 + R() * 6;
            g.beginPath(); g.moveTo(X - w, Y); g.quadraticCurveTo(X - w / 2, Y - 6, X, Y); g.quadraticCurveTo(X + w / 2, Y - 6, X + w, Y); g.stroke();
        }
        g.restore();
    }
    hills(g, W, R) {
        g.save(); g.strokeStyle = INK; g.lineWidth = 1.5;
        for (let z = -150; z < 112; z += 6.5) for (let x = -95; x < 95; x += 6.5) {
            const px = x + (R() - 0.5) * 4, pz = z + (R() - 0.5) * 4, t = W.terrainAt(px, pz);
            if (t < 3.3 || pathDist(px, pz) < 6) continue;
            if (Math.abs(px - WORLD.CASTLE.x) < 30 && Math.abs(pz - WORLD.CASTLE.z) < 30) continue;
            if (Math.hypot(px - WORLD.CEMETERY.x, pz - WORLD.CEMETERY.z) < 14 || Math.hypot(px - 30, pz - 52) < 11) continue;
            const X = bx(px), Y = bz(pz), w = 10 + Math.min(10, (t - 3.3) * 4);
            g.globalAlpha = 0.55;
            g.beginPath(); g.moveTo(X - w, Y); g.quadraticCurveTo(X - w * 0.2, Y - w * 1.15, X + w, Y); g.stroke();
            g.globalAlpha = 0.35; g.lineWidth = 1;
            for (let i = 0; i < 3; i++) { const sx = X + w * (0.15 + i * 0.25); g.beginPath(); g.moveTo(sx, Y - w * (0.55 - i * 0.16)); g.lineTo(sx + 3, Y - 1); g.stroke(); }
            g.lineWidth = 1.5;
        }
        g.restore();
    }
    tufts(g, W, R) {
        g.save(); g.strokeStyle = '#4a4a20'; g.lineWidth = 1; g.globalAlpha = 0.38;
        for (let i = 0; i < 900; i++) {
            const x = -90 + R() * 180, z = -60 + R() * 170, t = W.terrainAt(x, z);
            if (t < 0.8 || t > 3.3 || pathDist(x, z) < 3 || Math.hypot(x - WORLD.PLAZA.x, z - WORLD.PLAZA.z) < 14) continue;
            const X = bx(x), Y = bz(z);
            g.beginPath(); g.moveTo(X - 3, Y - 4); g.lineTo(X - 1, Y); g.lineTo(X, Y - 5); g.lineTo(X + 1, Y); g.lineTo(X + 3, Y - 4); g.stroke();
        }
        g.restore();
    }
    paths(g) {
        const lines = [];
        const P = WORLD.PATH;
        for (let i = 0; i < P.length - 1; i++) lines.push([P[i], P[i + 1]]);
        for (const s of WORLD.SIDE_PATHS) lines.push(s);
        g.save();
        for (const [a, b] of lines) inkPath(g, [[bx(a[0]), bz(a[1])], [bx(b[0]), bz(b[1])]], { w: 2.6 * PPM, color: '#d8c294', a: 0.85, amp: 2 });
        for (const [a, b] of lines) inkPath(g, [[bx(a[0]), bz(a[1])], [bx(b[0]), bz(b[1])]], { w: 1.8, a: 0.55, amp: 2, dash: [10, 8] });
        g.restore();
    }
    bridgeAndDock(g) {
        const B = WORLD.BRIDGE;
        const deck = (x, z0, z1, w, step) => {
            const X0 = bx(x - w / 2), X1 = bx(x + w / 2), Y0 = bz(z0), Y1 = bz(z1);
            g.save(); g.fillStyle = 'rgba(150,108,60,0.45)'; g.fillRect(X0, Math.min(Y0, Y1), X1 - X0, Math.abs(Y1 - Y0)); g.restore();
            inkPath(g, [[X0, Y0], [X0, Y1]], { w: 2.4, amp: 1.2 });
            inkPath(g, [[X1, Y0], [X1, Y1]], { w: 2.4, amp: 1.2 });
            g.save(); g.strokeStyle = INK; g.globalAlpha = 0.6; g.lineWidth = 1.2;
            for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z += step) { g.beginPath(); g.moveTo(X0, bz(z)); g.lineTo(X1, bz(z)); g.stroke(); }
            g.restore();
        };
        deck(B.x, B.z0, B.z1, B.w, 1.2);
        for (let z = B.z1 + 3; z < B.z0; z += 7) for (const s of [-1, 1]) { g.fillStyle = INK; g.fillRect(bx(B.x + s * (B.w / 2 + 0.5)) - 3, bz(z) - 3, 6, 6); }
        deck(0, 86, 100, 2.6, 0.9);
        // la barchetta del Traghettatore
        g.save(); g.translate(bx(2.6), bz(97)); g.rotate(0.1);
        g.fillStyle = 'rgba(120,80,40,0.55)'; g.strokeStyle = INK; g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(0, -11); g.quadraticCurveTo(6, -4, 4.5, 9); g.lineTo(-4.5, 9); g.quadraticCurveTo(-6, -4, 0, -11); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(-3, 2); g.lineTo(3, 2); g.stroke();
        g.restore();
    }
    village(g) {
        // piazza lastricata con l'Obelisco
        const P = WORLD.PLAZA, X = bx(P.x), Y = bz(P.z), r = P.r * PPM;
        g.save();
        g.fillStyle = 'rgba(214,204,182,0.8)'; g.beginPath(); g.arc(X, Y, r, 0, Math.PI * 2); g.fill();
        g.strokeStyle = INK; g.globalAlpha = 0.35; g.lineWidth = 1;
        g.beginPath(); g.arc(X, Y, r * 0.45, 0, Math.PI * 2); g.stroke();
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.moveTo(X + Math.cos(a) * r * 0.45, Y + Math.sin(a) * r * 0.45); g.lineTo(X + Math.cos(a) * r, Y + Math.sin(a) * r); g.stroke(); }
        g.restore();
        inkCircle(g, X, Y, r, { w: 2, amp: 1.6 });
        inkCircle(g, X, Y, r + 4, { w: 1, a: 0.6, amp: 1.6, dash: [14, 6] });
        g.fillStyle = INK; g.fillRect(X - 6, Y - 6, 12, 12);
        g.fillStyle = 'rgba(43,26,14,0.25)'; g.beginPath(); g.moveTo(X + 6, Y - 6); g.lineTo(X + 22, Y + 6); g.lineTo(X + 6, Y + 6); g.fill();
        // le tre botteghe: casette con il tetto a falde
        for (const s of Object.values(WORLD.SHOPS)) house(g, bx(s.x), bz(s.z), s.ry, 8.5 * PPM, 6.5 * PPM);
        // lo specchio
        g.save(); g.strokeStyle = INK; g.lineWidth = 1.8; g.fillStyle = 'rgba(190,210,220,0.8)';
        g.beginPath(); g.ellipse(bx(WORLD.MIRROR.x), bz(WORLD.MIRROR.z), 6, 9, 0.3, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
    }
    cemetery(g) {
        const C = WORLD.CEMETERY;
        inkCircle(g, bx(C.x), bz(C.z), 12 * PPM, { w: 1.6, a: 0.75, amp: 2, dash: [5, 6] });
        g.save(); g.strokeStyle = INK; g.fillStyle = 'rgba(160,156,140,0.9)'; g.lineWidth = 1.4;
        for (const t of GRAVES) {
            const X = bx(t.x), Y = bz(t.z);
            if (t.cross) { g.beginPath(); g.moveTo(X, Y - 6); g.lineTo(X, Y + 6); g.moveTo(X - 4, Y - 2); g.lineTo(X + 4, Y - 2); g.stroke(); }
            else { g.beginPath(); g.moveTo(X - 4, Y + 5); g.lineTo(X - 4, Y - 2); g.arc(X, Y - 2, 4, Math.PI, 0); g.lineTo(X + 4, Y + 5); g.closePath(); g.fill(); g.stroke(); }
        }
        g.restore();
    }
    chapelAndStones(g) {
        // la Cappella in Rovina: navata e abside, con i muri spezzati
        g.save(); g.translate(bx(30), bz(52)); g.rotate(0.2);
        const w = 6 * PPM, l = 10 * PPM;
        g.fillStyle = 'rgba(196,186,160,0.75)'; g.fillRect(-w / 2, -l / 2, w, l);
        g.strokeStyle = INK; g.lineWidth = 3;
        const seg = (a, b) => { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); };
        seg([-w / 2, -l / 2], [-w / 2, -l * 0.1]); seg([-w / 2, l * 0.12], [-w / 2, l / 2]);
        seg([w / 2, -l / 2], [w / 2, l * 0.3]);
        seg([-w / 2, l / 2], [-w * 0.15, l / 2]); seg([w * 0.15, l / 2], [w / 2, l / 2]);
        g.beginPath(); g.arc(0, -l / 2, w / 2, Math.PI, Math.PI * 1.75); g.stroke();
        g.lineWidth = 2; g.beginPath(); g.moveTo(0, -l * 0.25); g.lineTo(0, l * 0.05); g.moveTo(-6, -l * 0.15); g.lineTo(6, -l * 0.15); g.stroke();
        g.restore();
        // il Cerchio di Pietre
        const X = bx(STONES.x), Y = bz(STONES.z);
        g.save(); g.strokeStyle = INK; g.lineWidth = 1.5; g.fillStyle = 'rgba(150,146,150,0.9)';
        for (let i = 0; i < 9; i++) { const a = (i + 0.5) / 9 * Math.PI * 2; blob(g, X + Math.cos(a) * 4.6 * PPM, Y + Math.sin(a) * 4.6 * PPM, 6, i); }
        g.globalAlpha = 0.5; g.beginPath(); g.arc(X, Y, 4.6 * PPM, 0, Math.PI * 2); g.setLineDash([3, 5]); g.stroke();
        g.restore();
    }
    nature(g, W, R) {
        // rocce (solo le più grosse)
        g.save(); g.strokeStyle = INK; g.lineWidth = 1.2; g.fillStyle = 'rgba(140,134,140,0.75)';
        (W.mapRocks || []).forEach(([x, , z, s], i) => { if (s > 0.8) blob(g, bx(x), bz(z), 3 + s * 3.2, i); });
        g.restore();
        // alberi morti: tronco e rami a forchetta, con un'ombra
        for (const [x, z, s] of W.mapTrees || []) {
            const X = bx(x), Y = bz(z), k = 7 + s * 6;
            g.save();
            g.fillStyle = 'rgba(60,50,30,0.16)'; g.beginPath(); g.ellipse(X + k * 0.5, Y + 2, k * 0.8, k * 0.32, 0, 0, Math.PI * 2); g.fill();
            g.strokeStyle = INK; g.lineWidth = 2; g.globalAlpha = 0.85;
            g.beginPath(); g.moveTo(X, Y); g.lineTo(X + 0.6, Y - k);
            g.moveTo(X + 0.3, Y - k * 0.5); g.lineTo(X - k * 0.45, Y - k * 0.95);
            g.moveTo(X + 0.5, Y - k * 0.7); g.lineTo(X + k * 0.45, Y - k * 1.05);
            g.moveTo(X - k * 0.25, Y - k * 0.75); g.lineTo(X - k * 0.2, Y - k * 1.15);
            g.lineWidth = 1.2; g.stroke();
            g.restore();
        }
    }
    castle(g) {
        const C = WORLD.CASTLE, K = WORLD.KEEP, A = WORLD.ARENA;
        const x0 = bx(C.x - C.half), x1 = bx(C.x + C.half), y0 = bz(C.z - C.half), y1 = bz(C.z + C.half), t = 1.3 * PPM;
        // cortile lastricato
        g.save(); g.fillStyle = 'rgba(214,206,188,0.85)'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
        g.strokeStyle = INK; g.globalAlpha = 0.08; g.lineWidth = 1;
        for (let k = -BASE; k < BASE; k += 14) { g.beginPath(); g.moveTo(x0 + k, y0); g.lineTo(x0 + k + (y1 - y0), y1); g.stroke(); }
        g.restore();
        // giardini e fontana
        for (const r of GARDENS) {
            const a = bx(r.x0), b = bz(r.z0), w = bx(r.x1) - a, hh = bz(r.z1) - b;
            g.save(); g.fillStyle = 'rgba(150,170,110,0.75)'; g.fillRect(a, b, w, hh);
            g.strokeStyle = '#3a4a1a'; g.setLineDash([4, 4]); g.lineWidth = 1.4; g.strokeRect(a + 3, b + 3, w - 6, hh - 6);
            g.setLineDash([]); g.fillStyle = '#7a2a3a';
            const r2 = rng(Math.round(a));
            for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(a + 8 + r2() * (w - 16), b + 8 + r2() * (hh - 16), 1.8, 0, Math.PI * 2); g.fill(); }
            g.restore();
        }
        const F = FOUNTAIN;
        g.save(); g.fillStyle = 'rgba(130,170,176,0.9)'; g.beginPath(); g.arc(bx(F.x), bz(F.z), F.r * PPM * 0.75, 0, Math.PI * 2); g.fill(); g.restore();
        inkCircle(g, bx(F.x), bz(F.z), F.r * PPM * 0.75, { w: 1.8, amp: 0.8 });
        inkCircle(g, bx(F.x), bz(F.z), F.r * PPM * 0.4, { w: 0.9, a: 0.6, amp: 0.8 });
        // l'Arena: sabbia e gradinate
        const ax = bx(A.x), ay = bz(A.z), ar = A.r * PPM;
        g.save(); g.fillStyle = 'rgba(226,206,160,0.95)'; g.beginPath(); g.arc(ax, ay, ar, 0, Math.PI * 2); g.fill();
        g.strokeStyle = INK; g.globalAlpha = 0.55; g.lineWidth = 1;
        for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; g.beginPath(); g.moveTo(ax + Math.cos(a) * ar, ay + Math.sin(a) * ar); g.lineTo(ax + Math.cos(a) * (ar + 1.4 * PPM), ay + Math.sin(a) * (ar + 1.4 * PPM)); g.stroke(); }
        g.restore();
        inkCircle(g, ax, ay, ar, { w: 2.2, amp: 1 });
        inkCircle(g, ax, ay, ar + 1.4 * PPM, { w: 1.4, amp: 1 });
        // le mura: banda di pietra, merli e torri agli angoli
        g.save(); g.fillStyle = 'rgba(150,142,140,0.95)';
        g.fillRect(x0 - t, y0 - t, x1 - x0 + 2 * t, t); g.fillRect(x0 - t, y1, x1 - x0 + 2 * t, t);
        g.fillRect(x0 - t, y0, t, y1 - y0); g.fillRect(x1, y0, t, y1 - y0);
        g.restore();
        const gate = 2.4 * PPM, mx = (x0 + x1) / 2;
        inkPath(g, [[mx - gate, y1 + t], [x0 - t, y1 + t], [x0 - t, y0 - t], [x1 + t, y0 - t], [x1 + t, y1 + t], [mx + gate, y1 + t]], { w: 3, amp: 1.2 });
        inkPath(g, [[mx - gate, y1], [x0, y1], [x0, y0], [x1, y0], [x1, y1], [mx + gate, y1]], { w: 1.6, amp: 1.2 });
        g.save(); g.fillStyle = INK;
        const merlons = (ax0, ay0, ax1, ay1) => {
            const len = Math.hypot(ax1 - ax0, ay1 - ay0), n = Math.floor(len / 13);
            for (let i = 1; i < n; i += 2) { const k = i / n; g.fillRect(ax0 + (ax1 - ax0) * k - 3, ay0 + (ay1 - ay0) * k - 3, 6, 6); }
        };
        merlons(x0 - t, y0 - t, x1 + t, y0 - t); merlons(x0 - t, y0 - t, x0 - t, y1 + t); merlons(x1 + t, y0 - t, x1 + t, y1 + t);
        merlons(x0 - t, y1 + t, mx - gate, y1 + t); merlons(mx + gate, y1 + t, x1 + t, y1 + t);
        g.restore();
        for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
            g.save(); g.fillStyle = 'rgba(150,142,140,1)'; g.beginPath(); g.arc(x, y, 3.2 * PPM, 0, Math.PI * 2); g.fill(); g.restore();
            inkCircle(g, x, y, 3.2 * PPM, { w: 2.4, amp: 1 });
            inkCircle(g, x, y, 2.2 * PPM, { w: 1, a: 0.6, amp: 1, dash: [5, 5] });
        }
        // il portone e le sue torrette
        for (const s of [-1, 1]) { g.save(); g.fillStyle = 'rgba(150,142,140,1)'; g.strokeStyle = INK; g.lineWidth = 2; g.fillRect(mx + s * gate - (s > 0 ? 0 : 2 * PPM), y1 - 0.4 * PPM, 2 * PPM, t + 1.4 * PPM); g.strokeRect(mx + s * gate - (s > 0 ? 0 : 2 * PPM), y1 - 0.4 * PPM, 2 * PPM, t + 1.4 * PPM); g.restore(); }
        // il mastio con la Stanza Bianca e la scala
        const kx = bx(K.x - K.w / 2), ky = bz(K.z - K.d / 2), kw = K.w * PPM, kd = K.d * PPM;
        g.save(); g.fillStyle = 'rgba(120,112,118,0.95)'; g.fillRect(kx, ky, kw, kd);
        g.strokeStyle = INK; g.globalAlpha = 0.35; g.lineWidth = 1;
        g.beginPath(); g.rect(kx, ky, kw, kd); g.clip();
        for (let k = -kd; k < kw; k += 7) { g.beginPath(); g.moveTo(kx + k, ky + kd); g.lineTo(kx + k + kd, ky); g.stroke(); }
        g.restore();
        inkPath(g, [[kx, ky], [kx + kw, ky], [kx + kw, ky + kd], [kx, ky + kd]], { w: 2.6, amp: 1, close: true });
        g.save(); g.fillStyle = '#f6f2ea'; g.strokeStyle = INK; g.lineWidth = 1.2; g.fillRect(kx + kw * 0.2, ky + kd * 0.22, kw * 0.6, kd * 0.56); g.strokeRect(kx + kw * 0.2, ky + kd * 0.22, kw * 0.6, kd * 0.56); g.restore();
        const sx = bx(K.x - K.w / 2 - 2.2), sy = bz(K.z - 1.9), sw = 2.2 * PPM, sh = 9.1 * PPM;
        g.save(); g.strokeStyle = INK; g.lineWidth = 1.2; g.strokeRect(sx, sy, sw, sh);
        for (let k = 1; k < 12; k++) { g.beginPath(); g.moveTo(sx, sy + sh * k / 12); g.lineTo(sx + sw, sy + sh * k / 12); g.stroke(); }
        g.restore();
    }
    doodles(g) {
        // il serpente di mare (il Re Annegato, almeno così dice il cartografo)
        const sx = bx(DOODLES[0].x), sy = bz(DOODLES[0].z);
        g.save(); g.strokeStyle = INK; g.lineWidth = 2.4; g.fillStyle = 'rgba(96,120,96,0.6)';
        for (let i = 0; i < 4; i++) {
            const x = sx - 70 + i * 40, w = 15 - i * 1.5, hh = 20 - i * 2;
            g.beginPath(); g.moveTo(x - w, sy); g.bezierCurveTo(x - w, sy - hh * 1.4, x + w, sy - hh * 1.4, x + w, sy); g.fill(); g.stroke();
            g.lineWidth = 1; for (let k = -1; k <= 1; k++) { g.beginPath(); g.arc(x + k * 5, sy - hh * 0.6, 3, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); } g.lineWidth = 2.4;
            g.globalAlpha = 0.5; g.beginPath(); g.moveTo(x - w - 8, sy + 3); g.quadraticCurveTo(x, sy + 9, x + w + 8, sy + 3); g.stroke(); g.globalAlpha = 1;
        }
        const hx = sx + 92, hy = sy - 26;
        g.beginPath(); g.moveTo(sx + 66, sy); g.bezierCurveTo(sx + 70, sy - 30, hx - 16, hy - 6, hx, hy); g.stroke();
        g.beginPath(); g.ellipse(hx + 6, hy, 16, 10, -0.2, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = RED; g.beginPath(); g.arc(hx + 9, hy - 3, 2.6, 0, Math.PI * 2); g.fill();
        g.strokeStyle = RED; g.lineWidth = 1.6; g.beginPath(); g.moveTo(hx + 21, hy + 3); g.lineTo(hx + 32, hy + 6); g.moveTo(hx + 28, hy + 5); g.lineTo(hx + 32, hy + 1); g.stroke();
        g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.moveTo(hx + 2, hy - 9); g.lineTo(hx - 2, hy - 20); g.moveTo(hx + 8, hy - 10); g.lineTo(hx + 8, hy - 22); g.stroke();
        g.fillStyle = INK; g.beginPath(); g.moveTo(sx - 88, sy); g.lineTo(sx - 110, sy - 16); g.lineTo(sx - 100, sy + 2); g.fill();
        g.restore();
        // la nave
        const nx = bx(DOODLES[1].x), ny = bz(DOODLES[1].z);
        g.save(); g.strokeStyle = INK; g.lineWidth = 2;
        g.fillStyle = 'rgba(120,80,40,0.7)'; g.beginPath(); g.moveTo(nx - 34, ny); g.quadraticCurveTo(nx, ny + 22, nx + 38, ny - 2); g.lineTo(nx + 30, ny + 8); g.quadraticCurveTo(nx, ny + 18, nx - 28, ny + 8); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(nx - 34, ny); g.lineTo(nx + 38, ny - 2); g.stroke();
        for (const [mxs, ht] of [[-12, 52], [12, 60]]) {
            g.beginPath(); g.moveTo(nx + mxs, ny); g.lineTo(nx + mxs, ny - ht); g.stroke();
            g.fillStyle = PAPER; g.beginPath(); g.moveTo(nx + mxs - 16, ny - ht + 8); g.quadraticCurveTo(nx + mxs - 2, ny - ht * 0.6, nx + mxs - 15, ny - 12); g.lineTo(nx + mxs + 15, ny - 12); g.quadraticCurveTo(nx + mxs + 26, ny - ht * 0.6, nx + mxs + 16, ny - ht + 8); g.closePath(); g.fill(); g.stroke();
        }
        g.fillStyle = RED; g.beginPath(); g.moveTo(nx + 12, ny - 60); g.lineTo(nx + 28, ny - 56); g.lineTo(nx + 12, ny - 52); g.fill();
        g.globalAlpha = 0.5; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(nx - 40 - i * 14, ny + 6 + i * 3); g.quadraticCurveTo(nx - 46 - i * 14, ny + 10 + i * 3, nx - 56 - i * 14, ny + 8 + i * 3); g.stroke(); }
        g.restore();
        // la balena di nebbia
        const wx = bx(DOODLES[2].x), wy = bz(DOODLES[2].z);
        g.save(); g.strokeStyle = INK; g.lineWidth = 2.2; g.fillStyle = 'rgba(110,128,140,0.65)';
        g.beginPath(); g.moveTo(wx - 46, wy); g.bezierCurveTo(wx - 40, wy - 34, wx + 30, wy - 36, wx + 40, wy); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(wx + 40, wy); g.quadraticCurveTo(wx + 52, wy - 12, wx + 64, wy - 22); g.moveTo(wx + 40, wy); g.quadraticCurveTo(wx + 56, wy - 2, wx + 70, wy - 6); g.stroke();
        g.fillStyle = INK; g.beginPath(); g.arc(wx - 30, wy - 12, 2.4, 0, Math.PI * 2); g.fill();
        g.lineWidth = 1.5; for (const a of [-0.5, 0, 0.5]) { g.beginPath(); g.moveTo(wx - 16, wy - 30); g.quadraticCurveTo(wx - 16 + a * 18, wy - 52, wx - 16 + a * 34, wy - 50); g.stroke(); }
        g.globalAlpha = 0.5; g.beginPath(); g.moveTo(wx - 60, wy + 4); g.quadraticCurveTo(wx, wy + 12, wx + 60, wy + 4); g.stroke();
        g.restore();
        // la X del tesoro, con la sua pista a puntini
        const T = this.treasure, tx = bx(T.x), ty = bz(T.z);
        g.save(); g.strokeStyle = RED; g.lineWidth = 3.2;
        g.beginPath(); g.moveTo(tx - 9, ty - 9); g.lineTo(tx + 9, ty + 9); g.moveTo(tx + 9, ty - 9); g.lineTo(tx - 9, ty + 9); g.stroke();
        g.lineWidth = 1.6; g.setLineDash([2, 6]); g.globalAlpha = 0.8;
        g.beginPath(); g.moveTo(tx - 12, ty - 12); g.bezierCurveTo(tx - 60, ty - 40, tx - 30, ty - 90, tx - 80, ty - 110); g.stroke();
        g.restore();
        // la paperella (la vede solo chi si avvicina molto)
        const dx = bx(DOODLES[4].x), dy = bz(DOODLES[4].z);
        g.save(); g.strokeStyle = INK; g.lineWidth = 0.8; g.fillStyle = '#e8c23a';
        g.beginPath(); g.ellipse(dx, dy, 3.4, 2.2, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        g.beginPath(); g.arc(dx + 2.6, dy - 2.6, 1.6, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#d0601a'; g.beginPath(); g.moveTo(dx + 4, dy - 2.8); g.lineTo(dx + 5.8, dy - 2.2); g.lineTo(dx + 4, dy - 1.8); g.fill();
        g.restore();
        // la scritta del cartografo vicino al serpente
        label(g, 'Hic sunt Sputnik', sx - 10, sy - 66, { font: 'italic 700 30px Almendra, serif', a: 0.8, rot: -0.08 });
        // il sigillo di ceralacca
        const ex = bx(DOODLES[5].x), ey = bz(DOODLES[5].z);
        g.save(); g.fillStyle = '#9a2418'; g.strokeStyle = '#5a1008'; g.lineWidth = 2;
        g.beginPath();
        for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, rr = 34 + Math.sin(i * 2.7) * 4; g.lineTo(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr); }
        g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = 'rgba(255,200,180,0.5)'; g.beginPath(); g.arc(ex, ey, 24, 0, Math.PI * 2); g.stroke();
        g.fillStyle = 'rgba(255,214,190,0.85)'; g.font = '900 26px "Cinzel Decorative", Cinzel, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SH', ex, ey + 1);
        g.restore();
        // la firma
        label(g, 'disegnò il Ratto dei Cronisti', bx(DOODLES[6].x), bz(DOODLES[6].z), { font: 'italic 26px Alegreya, serif', a: 0.75, rot: -0.04 });
        label(g, '~ anno della Nebbia ~', bx(DOODLES[6].x), bz(DOODLES[6].z) + 30, { font: 'italic 20px Alegreya, serif', a: 0.6 });
    }
    labels(g) {
        // cartiglio del titolo, nel mare a nord
        const cx = bx(0), cy = bz(-176), w = 760, hh = 120;
        g.save();
        g.fillStyle = '#f1e4c0'; g.strokeStyle = INK; g.lineWidth = 2.4;
        g.beginPath(); g.moveTo(cx - w / 2, cy - hh / 2); g.quadraticCurveTo(cx, cy - hh / 2 - 18, cx + w / 2, cy - hh / 2);
        g.lineTo(cx + w / 2, cy + hh / 2); g.quadraticCurveTo(cx, cy + hh / 2 - 18, cx - w / 2, cy + hh / 2); g.closePath(); g.fill(); g.stroke();
        for (const s of [-1, 1]) {
            const ex = cx + s * w / 2;
            g.beginPath(); g.ellipse(ex + s * 12, cy, 16, hh / 2 + 4, 0, 0, Math.PI * 2); g.fill(); g.stroke();
            g.beginPath(); g.ellipse(ex + s * 12, cy, 7, hh / 2 - 12, 0, 0, Math.PI * 2); g.stroke();
        }
        g.lineWidth = 1; g.beginPath(); g.moveTo(cx - w / 2 + 20, cy - hh / 2 + 14); g.quadraticCurveTo(cx, cy - hh / 2 - 2, cx + w / 2 - 20, cy - hh / 2 + 14); g.stroke();
        g.restore();
        label(g, "L'Isola Fantasma", cx, cy - 12, { font: '700 64px Almendra, serif', color: '#3a1606' });
        label(g, 'e la Laguna dei Sospiri', cx, cy + 36, { font: 'italic 30px Alegreya, serif', a: 0.85 });
        // mari e luoghi grandi
        arcText(g, 'L A G U N A   D E I   S O S P I R I', bx(0), bz(20), 112 * PPM, Math.PI / 2, { font: '600 34px Cinzel, serif', a: 0.5, color: '#1f3a3a', bottom: true });
        label(g, 'M A R E   D E L L A   N E B B I A', bx(132), bz(-40), { font: '600 32px Cinzel, serif', a: 0.45, color: '#1f3a3a', rot: -1.45 });
        label(g, 'M A R E   D E L L A   N E B B I A', bx(-142), bz(-40), { font: '600 32px Cinzel, serif', a: 0.45, color: '#1f3a3a', rot: -1.45 });
        arcText(g, 'I S O L A   F A N T A S M A', bx(0), bz(20), 58 * PPM, Math.PI / 2, { font: '700 44px Cinzel, serif', a: 0.32, bottom: true });
        label(g, 'C A S T E L L O   S P E T T R A L E', bx(0), bz(-131), { font: '700 26px Cinzel, serif', a: 0.6 });
        label(g, 'Ponte dei Sospiri', bx(5.2), bz(-56), { font: 'italic 24px Almendra, serif', a: 0.75, rot: -Math.PI / 2, halo: 6 });
    }
    paper(g, R) {
        // grana della carta, macchie e fibre, sopra tutto (come se l'inchiostro fosse nella carta)
        const n = document.createElement('canvas'); n.width = n.height = 256;
        const ng = n.getContext('2d'), img = ng.createImageData(256, 256);
        for (let i = 0; i < img.data.length; i += 4) { const v = 200 + R() * 55; img.data[i] = v; img.data[i + 1] = v * 0.96; img.data[i + 2] = v * 0.88; img.data[i + 3] = 255; }
        ng.putImageData(img, 0, 0);
        g.save();
        g.globalCompositeOperation = 'multiply';
        g.globalAlpha = 0.28; g.fillStyle = g.createPattern(n, 'repeat'); g.fillRect(0, 0, BASE, BASE);
        g.globalAlpha = 1;
        for (let i = 0; i < 46; i++) {
            const x = R() * BASE, y = R() * BASE, r = 30 + R() * 160;
            const gr = g.createRadialGradient(x, y, 0, x, y, r);
            gr.addColorStop(0, `rgba(170,120,60,${0.04 + R() * 0.08})`); gr.addColorStop(1, 'rgba(170,120,60,0)');
            g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
        }
        g.strokeStyle = 'rgba(120,85,40,0.12)'; g.lineWidth = 1;
        for (let i = 0; i < 500; i++) { const x = R() * BASE, y = R() * BASE, a = R() * Math.PI; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8 + 3, x + Math.cos(a) * 16, y + Math.sin(a) * 16); g.stroke(); }
        const vg = g.createRadialGradient(BASE / 2, BASE / 2, BASE * 0.38, BASE / 2, BASE / 2, BASE * 0.74);
        vg.addColorStop(0, 'rgba(120,80,30,0)'); vg.addColorStop(1, 'rgba(110,66,22,0.6)');
        g.fillStyle = vg; g.fillRect(0, 0, BASE, BASE);
        g.restore();
    }
    border(g) {
        // cornice a doppio filo con la scala a scacchi, come le carte antiche
        const m = 26, d = 12;
        g.save(); g.strokeStyle = INK; g.lineWidth = 2.4; g.strokeRect(m, m, BASE - 2 * m, BASE - 2 * m);
        g.lineWidth = 1.2; g.strokeRect(m + d, m + d, BASE - 2 * (m + d), BASE - 2 * (m + d));
        g.fillStyle = INK;
        const step = 64;
        for (let k = 0, p = m; p < BASE - m - 1; p += step, k++) {
            if (k % 2) continue;
            const len = Math.min(step, BASE - m - p);
            g.fillRect(p, m, len, d); g.fillRect(p, BASE - m - d, len, d);
            g.fillRect(m, p, d, len); g.fillRect(BASE - m - d, p, d, len);
        }
        g.restore();
    }
}

// --- AIUTI DI DISEGNO ---
// marching squares sulle altezze del mondo: i segmenti della curva al livello dato
function contour(W, level) {
    const n = W.n, H = W.H, segs = [];
    const X = (ix) => bx(MIN_X + ix * W.cw), Z = (iz) => bz(MIN_Z + iz * W.cd);
    for (let iz = 0; iz < n - 1; iz++) for (let ix = 0; ix < n - 1; ix++) {
        const a = H[iz * n + ix] - level, b = H[iz * n + ix + 1] - level, c = H[(iz + 1) * n + ix + 1] - level, d = H[(iz + 1) * n + ix] - level;
        const k = (a > 0 ? 8 : 0) | (b > 0 ? 4 : 0) | (c > 0 ? 2 : 0) | (d > 0 ? 1 : 0);
        if (k === 0 || k === 15) continue;
        const x0 = X(ix), x1 = X(ix + 1), z0 = Z(iz), z1 = Z(iz + 1);
        const T = () => [x0 + (x1 - x0) * a / (a - b), z0], Rr = () => [x1, z0 + (z1 - z0) * b / (b - c)];
        const B = () => [x0 + (x1 - x0) * d / (d - c), z1], L = () => [x0, z0 + (z1 - z0) * a / (a - d)];
        const add = (p, q) => segs.push(p[0], p[1], q[0], q[1]);
        switch (k) {
            case 1: case 14: add(L(), B()); break;
            case 2: case 13: add(B(), Rr()); break;
            case 3: case 12: add(L(), Rr()); break;
            case 4: case 11: add(T(), Rr()); break;
            case 5: add(L(), T()); add(B(), Rr()); break;
            case 6: case 9: add(T(), B()); break;
            case 7: case 8: add(L(), T()); break;
            case 10: add(T(), Rr()); add(L(), B()); break;
        }
    }
    return segs;
}
function strokeSegs(g, segs, o) {
    g.save();
    g.strokeStyle = o.color || INK; g.globalAlpha = o.a ?? 1; g.lineWidth = o.w || 2; g.lineCap = g.lineJoin = 'round';
    if (o.dash) g.setLineDash(o.dash);
    g.beginPath();
    for (let i = 0; i < segs.length; i += 4) {
        const p = wob(segs[i], segs[i + 1], o.amp ?? 2.4, o.s || 0), q = wob(segs[i + 2], segs[i + 3], o.amp ?? 2.4, o.s || 0);
        g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]);
    }
    g.stroke(); g.restore();
}
// linea "a mano": spezzata in tratti brevi, ognuno un po' tremolante
function inkPath(g, pts, o = {}) {
    g.save();
    g.strokeStyle = o.color || INK; g.globalAlpha = o.a ?? 1; g.lineWidth = o.w || 2; g.lineCap = g.lineJoin = 'round';
    if (o.dash) g.setLineDash(o.dash);
    g.beginPath();
    const all = o.close ? [...pts, pts[0]] : pts;
    for (let i = 0; i < all.length - 1; i++) {
        const [ax, ay] = all[i], [bx2, by2] = all[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx2 - ax, by2 - ay) / 9));
        for (let k = i ? 1 : 0; k <= n; k++) {
            const [x, y] = wob(ax + (bx2 - ax) * k / n, ay + (by2 - ay) * k / n, o.amp ?? 2, o.s || 0);
            if (i === 0 && k === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
    }
    g.stroke(); g.restore();
}
function inkCircle(g, x, y, r, o = {}) {
    const n = Math.max(16, Math.round(r * 0.8)), pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
    inkPath(g, pts, { ...o, close: true });
}
function blob(g, x, y, r, seed) {
    g.beginPath();
    for (let i = 0; i <= 7; i++) { const a = i / 7 * Math.PI * 2, k = 0.75 + 0.35 * Math.abs(Math.sin(seed * 3.1 + i * 1.9)); g.lineTo(x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * 0.8); }
    g.closePath(); g.fill(); g.stroke();
}
function house(g, x, y, ry, w, d) {
    g.save(); g.translate(x, y); g.rotate(-ry);
    g.fillStyle = 'rgba(150,104,70,0.85)'; g.strokeStyle = INK; g.lineWidth = 2.2;
    g.fillRect(-w / 2, -d / 2, w, d); g.strokeRect(-w / 2, -d / 2, w, d);
    g.lineWidth = 1.4; g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(w / 2, 0); g.stroke();
    g.globalAlpha = 0.5; g.lineWidth = 1;
    for (let k = -w / 2 + 5; k < w / 2; k += 6) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k - 3, d / 2); g.stroke(); }
    g.globalAlpha = 1; g.fillStyle = INK; g.fillRect(-4, d / 2 - 1, 8, 4);
    g.restore();
}
function label(g, text, x, y, o) {
    g.save();
    g.font = o.font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = o.a ?? 1;
    g.translate(x, y); if (o.rot) g.rotate(o.rot);
    if (o.halo) { g.strokeStyle = PAPER; g.lineWidth = o.halo; g.lineJoin = 'round'; g.strokeText(text, 0, 0); }
    g.fillStyle = o.color || INK; g.fillText(text, 0, 0);
    g.restore();
}
// testo lungo un arco: bottom = in basso, da leggere dritto
function arcText(g, text, cx, cy, r, mid, o) {
    g.save();
    g.font = o.font; g.fillStyle = o.color || INK; g.globalAlpha = o.a ?? 1; g.textAlign = 'center'; g.textBaseline = 'middle';
    const ws = [...text].map(ch => g.measureText(ch).width), total = ws.reduce((s, w) => s + w, 0) / r;
    let a = o.bottom ? mid + total / 2 : mid - total / 2;
    [...text].forEach((ch, i) => {
        const step = ws[i] / r, at = o.bottom ? a - step / 2 : a + step / 2;
        g.save(); g.translate(cx + Math.cos(at) * r, cy + Math.sin(at) * r); g.rotate(o.bottom ? at - Math.PI / 2 : at + Math.PI / 2);
        g.fillText(ch, 0, 0); g.restore();
        a = o.bottom ? a - step : a + step;
    });
    g.restore();
}
