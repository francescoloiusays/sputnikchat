// =====================================================================
//  LA CUCINA DI NONNA LUX (solo client) · Libro IV, Il Lab dei Ricordi
//  Il pannello delle ricette e il gioco ai fornelli: tre fasi brevi
//  (taglia a tempo, mescola tenendo la zona, togli dal fuoco al momento
//  giusto). La prima volta cucini tu, con Lux che ti guida; dalla seconda
//  ci pensa lei. Il server controlla ingredienti, tempi e stelle.
// =====================================================================
import { RICETTE, RICETTE_IDS, COOK, INGR } from './shared/cucina.js';
import { l2Step } from './shared/libro2.js';
import { h, toast } from './util.js';
import { iconSVG } from './icons.js';

const SAY = {
    taglia: ['Più fine, più fine.', 'Il coltello va da solo, se lo lasci fare.', 'Adesso! Brava mano.'],
    mescola: ['Piano. Il cucchiaio deve stare nel mezzo.', 'Non farla attaccare.', 'Così. Senti come profuma?'],
    fuoco: ['Guarda il colore, non il tempo.', 'Adesso… quasi…', 'Via dal fuoco!'],
};
const PHASE_NAME = { taglia: 'Taglia a tempo', mescola: 'Mescola', fuoco: 'Togli dal fuoco' };
const PHASE_HINT = { taglia: 'Premi Spazio (o tocca) quando il coltello è nella zona verde', mescola: 'Tieni premuto per alzare il cucchiaio: restaci dentro la zona chiara', fuoco: "Premi quando l'ago è nell'oro" };

export class Cucina {
    constructor(app) {
        this.app = app;
        this.on = false;
        this.canvas = h('canvas', { width: 320, height: 70, class: 'cook-bar' });
        this.g = this.canvas.getContext('2d');
        this.title = h('div', { class: 'cook-title' });
        this.say = h('div', { class: 'cook-say' });
        this.hint = h('div', { class: 'cook-hint' });
        this.hud = h('div', { id: 'cook-hud', class: 'hidden' },
            h('div', { class: 'cook-head', html: iconSVG('flask') }, 'Ai fornelli con Nonna Lux'),
            this.title, this.canvas, this.say, this.hint,
            h('div', { class: 'btn-row mid' }, h('button', { class: 'btn btn-sm', onclick: () => this.stop(), html: iconSVG('close') }, 'Lascia stare')));
        document.body.append(this.hud);
        const down = () => { if (!this.on) return; this.holding = true; this.press(); };
        addEventListener('keydown', (e) => { if (!this.on) return; if (e.code === 'Space' || e.code === 'KeyE') { e.preventDefault(); if (!e.repeat) down(); } else if (e.code === 'Escape') this.stop(); });
        addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'KeyE') this.holding = false; });
        this.canvas.addEventListener('mousedown', down);
        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); down(); }, { passive: false });
        addEventListener('mouseup', () => { this.holding = false; });
        addEventListener('touchend', () => { this.holding = false; });
    }

    // --- IL PANNELLO: le ricette che conosci, quella che chiede il libro, il piatto che hai in corpo ---
    open() { this.app.panels.open('cucina'); }
    render(P) {
        const app = this.app, me = app.me;
        if (!me || me.offline) return P.set('flask', 'La cucina di Nonna Lux', P.needOnline());
        const D = me.dispensa || {}, known = me.ricette || [], S = l2Step(me.libro2), story = S?.k === 'cook' ? S.dish : null;
        const food = me.food && me.food.until > Date.now() ? me.food : null;
        const card = (id) => {
            const R = RICETTE[id], learnt = known.includes(id), now = story === id;
            if (!learnt && !now) return h('div', { class: 'row cook-row locked' }, h('span', { class: 'mat-ic', html: iconSVG('lock') }),
                h('div', { class: 'grow' }, h('div', { class: 'nm' }, '???'), h('div', { class: 'sub' }, 'Una ricetta del quaderno di Lux: si impara andando avanti nel libro')));
            const need = Object.entries(R.need).map(([k, n]) => h('span', { class: (D[k] || 0) >= n ? 'ok' : 'miss' }, `${INGR[k].name} ${Math.min(D[k] || 0, n)}/${n}`));
            const stars = me.ricetteStelle?.[id] || 0;
            return h('div', { class: 'row cook-row' }, h('span', { class: 'mat-ic', style: { color: '#ffd76a' }, html: iconSVG('flask') }),
                h('div', { class: 'grow' },
                    h('div', { class: 'nm' }, R.name, stars ? h('span', { class: 'cook-stars' }, ' ' + '★'.repeat(stars) + '☆'.repeat(3 - stars)) : null),
                    h('div', { class: 'mat-desc' }, R.desc),
                    h('div', { class: 'cook-need' }, need),
                    h('div', { class: 'btn-row' },
                        now ? h('button', { class: 'btn btn-primary btn-sm', onclick: () => this.start(id) }, 'Cucina con Lux') : null,
                        learnt ? h('button', { class: 'btn btn-sm', onclick: () => this.luxCooks(id) }, `Lo cucina Lux (${me.cookLeft ?? COOK.daily}/${COOK.daily} oggi)`) : null,
                        learnt && !now ? h('button', { class: 'btn btn-sm', onclick: () => this.start(id) }, 'Rifallo tu') : null)));
        };
        P.set('flask', 'La cucina di Nonna Lux', h('div', { class: 'parchment' },
            h('p', { class: 'lore' }, story ? '«Oggi si fa una cosa nuova. Lava le mani e vieni qui.»' : '«Un sapore è un ricordo che si può rifare. Cosa ti preparo?»'),
            food ? h('p', { class: 'cook-food' }, h('b', {}, 'Hai mangiato: '), `${RICETTE[food.dish].name} ${'★'.repeat(food.stars)} · ti tiene in forze per i duelli ancora ${Math.ceil((food.until - Date.now()) / 60000)} minuti`) : null),
            h('div', { class: 'list' }, RICETTE_IDS.map(card)),
            h('p', { class: 'muted small' }, `Un piatto ti tiene in forze per ${COOK.durMs / 60000} minuti; quello nuovo prende il posto del vecchio. Lux cucina al massimo ${COOK.daily} piatti al giorno.`));
    }
    async luxCooks(id) {
        const r = await this.app.net.request('cook:lux', { dish: id });
        if (!r.ok) return toast(r.msg, { kind: 'bad' });
        this.app.audio.play('coin');
        toast(`Lux ti mette davanti ${RICETTE[id].name}. Mangia, che si raffredda.`, { kind: 'ok', icon: 'flask', duration: 3500 });
        setTimeout(() => this.app.panels.refresh(['cucina']), 400);
    }

    // --- IL GIOCO AI FORNELLI ---
    async start(id) {
        const r = await this.app.net.request('cook:start', { dish: id });
        if (!r.ok) return toast(r.msg, { kind: 'bad', duration: 3500 });
        this.app.panels.close();
        document.exitPointerLock?.();
        Object.assign(this, { on: true, id: r.id, dish: id, phases: r.phases, pi: -1, scores: [], holding: false });
        this.hud.classList.remove('hidden');
        this.next();
        let last = performance.now();
        const loop = (t) => { if (!this.on) return; const dt = Math.min(0.05, (t - last) / 1000); last = t; this.step(dt); this.draw(); requestAnimationFrame(loop); };
        requestAnimationFrame(loop);
    }
    next() {
        this.pi++;
        if (this.pi >= this.phases.length) return this.finish();
        const k = this.ph = this.phases[this.pi];
        this.t = 0; this.st = k === 'taglia' ? { sweep: 0, x: 0, zone: 0.3 + Math.random() * 0.5, hits: 0, pressed: false } : k === 'mescola' ? { v: 0.3, inside: 0, total: 0 } : { pos: 0, done: false };
        this.title.textContent = `${this.pi + 1}/${this.phases.length} · ${PHASE_NAME[k]}`;
        this.hint.textContent = PHASE_HINT[k];
        this.say.textContent = '«' + SAY[k][0] + '»';
    }
    press() {
        const s = this.st;
        if (this.ph === 'taglia' && !s.pressed) {
            s.pressed = true;
            if (Math.abs(s.x - s.zone) < 0.09) { s.hits++; this.say.textContent = '«' + SAY.taglia[2] + '»'; this.app.audio.play('pick'); }
            else this.say.textContent = '«' + SAY.taglia[1] + '»';
        } else if (this.ph === 'fuoco' && !s.done) {
            s.done = true;
            const sc = Math.max(0, 1 - Math.abs(s.pos - 0.78) / 0.3);
            this.say.textContent = '«' + (sc > 0.7 ? SAY.fuoco[2] : SAY.fuoco[1]) + '»';
            this.scores.push(sc);
            setTimeout(() => this.on && this.next(), 700);
        }
    }
    step(dt) {
        const s = this.st;
        this.t += dt;
        if (this.ph === 'taglia') {
            s.x += dt * 0.9;
            if (s.x >= 1) {   // un colpo per passata, cinque passate
                s.sweep++; s.x = 0; s.pressed = false; s.zone = 0.2 + Math.random() * 0.65;
                if (s.sweep >= 5) { this.scores.push(s.hits / 5); this.next(); }
            }
        } else if (this.ph === 'mescola') {
            s.v = Math.max(0, Math.min(1, s.v + (this.holding ? 1.1 : -0.85) * dt));
            const c = 0.5 + 0.3 * Math.sin(this.t * 1.3);
            s.total += dt; if (Math.abs(s.v - c) < 0.12) s.inside += dt;
            if (this.t > 2.5 && this.say.textContent.includes('Piano')) this.say.textContent = '«' + SAY.mescola[s.inside / s.total > 0.6 ? 2 : 1] + '»';
            if (s.total >= 5) { this.scores.push(s.inside / s.total); this.next(); }
        } else if (this.ph === 'fuoco' && !s.done) {
            s.pos = 0.5 - 0.5 * Math.cos(this.t * 3.2);
            if (this.t > 4) { s.done = true; this.scores.push(0); this.say.textContent = '«Si è bruciato un po\'. Pazienza: si mangia lo stesso.»'; setTimeout(() => this.on && this.next(), 700); }
        }
    }
    draw() {
        const g = this.g, W = 320, H = 70, s = this.st;
        g.clearRect(0, 0, W, H);
        g.fillStyle = '#2a1e16'; g.fillRect(0, 18, W, 34);
        if (this.ph === 'taglia') {
            g.fillStyle = '#5fd38a'; g.fillRect((s.zone - 0.09) * W, 18, 0.18 * W, 34);
            g.fillStyle = '#f0e8d8'; g.fillRect(s.x * W - 2, 10, 4, 50);
            g.fillStyle = '#c9b8ff'; g.font = '12px sans-serif'; g.fillText(`${s.sweep + 1}/5 · tagli giusti ${s.hits}`, 6, 66);
        } else if (this.ph === 'mescola') {
            const c = 0.5 + 0.3 * Math.sin(this.t * 1.3);
            g.fillStyle = 'rgba(240,224,180,0.45)'; g.fillRect((c - 0.12) * W, 18, 0.24 * W, 34);
            g.fillStyle = '#ffb347'; g.beginPath(); g.arc(s.v * W, 35, 9, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#c9b8ff'; g.font = '12px sans-serif'; g.fillText(`${Math.round(100 * s.inside / Math.max(0.01, s.total))}% nel mezzo`, 6, 66);
        } else if (this.ph === 'fuoco') {
            const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, '#3a2a1a'); gr.addColorStop(0.78, '#e8b84a'); gr.addColorStop(1, '#3a0a0a');
            g.fillStyle = gr; g.fillRect(0, 18, W, 34);
            g.strokeStyle = '#ffe9a8'; g.lineWidth = 2; g.strokeRect((0.78 - 0.06) * W, 18, 0.12 * W, 34);
            g.fillStyle = '#f0e8d8'; g.fillRect(s.pos * W - 2, 10, 4, 50);
        }
    }
    async finish() {
        this.on = false;
        const score = this.scores.reduce((a, b) => a + b, 0) / Math.max(1, this.scores.length);
        const r = await this.app.net.request('cook:done', { id: this.id, score });
        this.hud.classList.add('hidden');
        if (!r.ok) return toast(r.msg, { kind: 'bad', duration: 3500 });
        this.app.audio.play(r.stars === 3 ? 'special' : 'coin');
        const R = RICETTE[r.dish];
        toast(h('div', {}, h('b', {}, `${R.name} ${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}`),
            h('div', {}, r.learned ? 'Lux lo scrive nel quaderno: adesso lo sai fare. ' : '', `Ti tiene in forze per i duelli ${COOK.durMs / 60000} minuti.`)), { kind: 'coin', icon: 'flask', duration: 5000 });
    }
    stop() {
        if (!this.on) return;
        this.on = false;
        this.hud.classList.add('hidden');
        toast('Lux spegne il fuoco. «Gli ingredienti restano: riproviamo quando vuoi.»', { duration: 3000 });
    }
}
