// =====================================================================
//  IN ONDA! (Stanza Bianca)
//  Due giocatori in poltrona (o uno col Ratto) conducono la puntata:
//  tre domande, il pubblico nella stanza vota con 1 o 2. I conduttori
//  guadagnano di più quando il pubblico si divide.
// =====================================================================
import { ONDA, RUNEWORDS, TITLES } from './shared/catalog.js';
import { INSULTS } from './shared/lore.js';
import { h, $, toast } from './util.js';
import { iconSVG } from './icons.js';

export class Onda {
    constructor(app) {
        this.app = app;
        this.ep = null;
        this.box = h('div', { id: 'onda-hud', class: 'hidden' });
        this.startBtn = h('button', { id: 'onda-start', class: 'btn btn-primary hidden', html: iconSVG('mic'), onclick: () => this.start() }, 'Avvia In Onda!');
        document.body.append(this.box, this.startBtn);
        const N = app.net;
        N.on('onda:start', (e) => {
            this.ep = { ...e, mine: e.hosts.includes(app.me?.name) };
            if (!this.here()) toast(h('div', {}, h('b', {}, 'In Onda!'), h('div', {}, `${e.hosts.join(' e ')}${e.ratto ? ' e il Ratto' : ''} sono in diretta dalla Stanza Bianca: sali al mastio per votare.`)), { icon: 'mic', duration: 7000 });
            else this.show(h('div', { class: 'onda-title' }, 'IN ONDA!'), h('div', { class: 'onda-sub' }, `Conducono ${e.hosts.join(' e ')}${e.ratto ? ' con il Ratto' : ''}`));
            app.audio.play(this.here() ? 'tv' : 'notify');
        });
        N.on('onda:q', (q) => {
            if (!this.ep) this.ep = { hosts: q.hosts || [], mine: (q.hosts || []).includes(app.me?.name) };
            this.q = { ...q, voted: null, ends: performance.now() + q.ms };
            this.renderQ();
            if (this.here()) app.audio.voice('ratto', q.text);
        });
        N.on('onda:res', (r) => {
            if (!this.q || !this.here()) return;
            const tot = r.a + r.b, pa = tot ? Math.round(r.a / tot * 100) : 50;
            this.show(h('div', { class: 'onda-q' }, this.q.text),
                h('div', { class: 'onda-bars' },
                    h('div', { class: 'ob a', style: { width: `${pa}%` } }, `${this.q.a} · ${r.a}`),
                    h('div', { class: 'ob b', style: { width: `${100 - pa}%` } }, `${this.q.b} · ${r.b}`)),
                h('div', { class: 'onda-sub' }, tot ? `Pubblico diviso al ${r.split}%` : 'Nessuno ha votato: il Ratto applaude da solo'));
            this.q = null;
        });
        N.on('onda:end', (o) => {
            const lines = [];
            if (o.xp) lines.push(`+${o.xp} esperienza`);
            if (o.charisma) lines.push(`Carisma ${Math.round(o.charisma * 1000) / 10}%`);
            if (o.learned != null) lines.push(`Hai imparato una risposta per il Pedaggio: «${INSULTS[o.learned][1]}»`);
            if (o.recipe) lines.push(`I Cronisti si lasciano sfuggire una Parola di Runa: ${RUNEWORDS[o.recipe].name} (${RUNEWORDS[o.recipe].runes.length} rune)`);
            if (o.repeat) lines.push('Oggi hai già condotto una puntata: questa era per il gusto di farlo.');
            toast(h('div', {}, h('b', {}, o.host ? 'Fine della puntata!' : 'Grazie per aver votato!'), lines.map(l => h('div', {}, l))), { kind: 'coin', icon: 'mic', duration: 10000 });
        });
        N.on('onda:off', () => { this.ep = null; this.q = null; setTimeout(() => { if (!this.ep) this.box.classList.add('hidden'); }, 3500); });
        addEventListener('keydown', (e) => {
            if (!this.q || this.q.voted != null || this.app.mode !== 'world' || this.ep?.mine || !this.here()) return;
            if (e.code === 'Digit1' || e.code === 'Digit2') { e.stopImmediatePropagation(); this.vote(e.code === 'Digit2' ? 1 : 0); }
        }, true);
    }
    here() { const P = this.app.player?.pos; return !!P && this.app.world?.inRoom(P); }
    show(...c) { this.box.replaceChildren(...c.filter(Boolean)); this.box.classList.remove('hidden'); }
    renderQ() {
        const q = this.q;
        if (!q || !this.here()) return;
        const host = this.ep?.mine;
        const btn = (v, label) => h('button', { class: 'btn' + (q.voted === v ? ' btn-primary' : ''), disabled: q.voted != null || host, onclick: () => this.vote(v) }, h('i', { class: 'kbd' }, v + 1), ' ', label);
        this.show(h('div', { class: 'onda-n' }, `Domanda ${q.i + 1} di ${q.n}`),
            h('div', { class: 'onda-q' }, q.text),
            h('div', { class: 'btn-row mid' }, btn(0, q.a), btn(1, q.b)),
            h('div', { class: 'onda-sub' }, host ? 'Sei in poltrona: dividi il pubblico e guadagnerai di più' : q.voted != null ? 'Voto registrato' : 'Vota con 1 o 2'),
            h('div', { class: 'onda-timer' }, h('i', { style: { animationDuration: `${q.ms}ms` } })));
    }
    async vote(v) {
        if (!this.q || this.q.voted != null) return;
        this.q.voted = v;
        this.renderQ();
        const r = await this.app.net.request('onda:vote', { v });
        if (!r.ok) { toast(r.msg, { kind: 'bad' }); return; }
        this.app.audio.play('ui');
    }
    async start() {
        const r = await this.app.net.request('onda:start', {});
        if (!r.ok) return toast(r.msg, { kind: 'bad' });
        toast(`Si va in onda! Con te c'è ${r.cohost}.`, { kind: 'ok', icon: 'mic' });
    }
    // il pulsante compare quando sei seduto nella Stanza Bianca
    update() {
        const app = this.app, sit = app.player?.sit && this.here() && app.mode === 'world' && (app.me?.level || 1) >= ONDA.level && !this.ep;
        this.startBtn.classList.toggle('hidden', !sit);
        if (this.q && this.here()) {
            const left = Math.max(0, Math.ceil((this.q.ends - performance.now()) / 1000));
            const t = this.box.querySelector('.onda-n');
            if (t) t.textContent = `Domanda ${this.q.i + 1} di ${this.q.n} · ${left} s`;
        }
    }
}
