// =====================================================================
//  IL CANTO DELLE PIETRE (Cerchio di Pietre)
//  La runa al centro canta una sequenza: ogni pietra ha una nota e il
//  colore di un seme. Si ripete nello stesso ordine e a ogni giro se ne
//  aggiunge una. La sequenza nasce dal seme del server.
// =====================================================================
import { CANTO, CANTO_SEEDS, ELEMENTS, RUNE_NAMES, MATS, SEALS, cantoSeq } from './shared/catalog.js';
import { h, $, toast, IS_MOBILE } from './util.js';
import { iconSVG } from './icons.js';

export class Canto {
    constructor(app) {
        this.app = app;
        this.on = false;
        this.stones = CANTO_SEEDS.map((el, i) => {
            const a = -Math.PI / 2 + i / 7 * Math.PI * 2;
            const b = h('button', { class: 'canto-stone', style: { left: `${50 + Math.cos(a) * 38}%`, top: `${50 + Math.sin(a) * 38}%`, '--c': ELEMENTS[el].color }, html: iconSVG(el), onclick: () => this.hit(i) },
                h('small', {}, `${i + 1} · ${RUNE_NAMES[el]}`));
            return b;
        });
        this.center = h('div', { class: 'canto-center' });
        this.hud = h('div', { id: 'canto-hud', class: 'hidden' },
            h('div', { class: 'fish-head', html: iconSVG('runestone') }, 'Il Canto delle Pietre'),
            h('div', { class: 'canto-ring' }, this.stones, this.center),
            h('div', { class: 'btn-row mid' }, h('button', { class: 'btn btn-sm', onclick: () => this.finish(true), html: iconSVG('close') }, 'Smetti di cantare')));
        document.body.append(this.hud);
        addEventListener('keydown', (e) => {
            if (!this.on) return;
            const n = +e.key;
            if (n >= 1 && n <= 7) { e.preventDefault(); this.hit(n - 1); }
            else if (e.code === 'Escape') this.finish(true);
        });
    }
    note(i, dur = 0.38) {
        const A = this.app.audio, f = CANTO.notes[i];
        A.tone(f, f, dur, { type: 'triangle', vol: 0.32, verb: 0.35 });
        A.tone(f * 2, f * 2, dur * 0.6, { type: 'sine', vol: 0.08, verb: 0.35 });
        this.app.world.cantoGlow(i, dur + 0.15);
        const b = this.stones[i];
        b.classList.remove('lit'); void b.offsetWidth; b.classList.add('lit');
        clearTimeout(b.litT); b.litT = setTimeout(() => b.classList.remove('lit'), dur * 1000 + 120);
    }
    say(text, sub = '') { this.center.replaceChildren(h('b', {}, text), sub ? h('span', {}, sub) : null); }

    async start() {
        const app = this.app;
        if (this.on) return;
        if (!app.net.connected || !app.helloDone) return toast('Il portale è chiuso: le pietre cantano solo col server', { kind: 'bad' });
        const r = await app.net.request('canto:start', {});
        if (!r.ok) return toast(r.msg, { kind: 'bad' });
        this.on = true;
        app.mode = 'canto';
        document.exitPointerLock?.();
        app.keys = {};
        $('#click-to-play').classList.add('hidden');
        $('#mobile-controls')?.classList.add('hidden');
        Object.assign(this, { id: r.id, seq: cantoSeq(r.seed, 40), round: 0, done: 0, pos: 0, input: false, left: r.left });
        app.cam.wantDist = 7.5; app.cam.pitch = 0.55;
        this.hud.classList.remove('hidden');
        this.say('Ascolta...', r.left > 0 ? `Premi pieni ancora ${r.left} ${r.left === 1 ? 'volta' : 'volte'} oggi` : 'Per oggi le pietre danno poco');
        setTimeout(() => this.nextRound(), 1200);
    }
    // la runa canta la sequenza, poi tocca a te
    nextRound() {
        if (!this.on) return;
        this.round++; this.pos = 0; this.input = false;
        this.say(`Giro ${this.round}`, 'Ascolta le pietre');
        const gap = Math.max(0.34, 0.62 - this.round * 0.02);
        for (let k = 0; k < this.round; k++) setTimeout(() => this.on && this.note(this.seq[k], gap * 0.8), 500 + k * gap * 1000);
        setTimeout(() => { if (!this.on) return; this.input = true; this.say(`Giro ${this.round}`, IS_MOBILE ? 'Tocca le pietre nello stesso ordine' : 'Ripeti: tasti da 1 a 7 o clic'); }, 500 + this.round * gap * 1000 + 150);
    }
    hit(i) {
        if (!this.on) return;
        this.note(i, 0.3);
        if (!this.input) return;
        if (this.seq[this.pos] !== i) {
            this.app.audio.play('error');
            this.app.audio.tone(140, 70, 0.6, { type: 'sawtooth', vol: 0.2 });
            this.say('Stonato!', `Hai cantato ${this.round - 1} note`);
            this.input = false;
            setTimeout(() => this.finish(false), 900);
            return;
        }
        this.pos++;
        if (this.pos >= this.round) {
            this.done = this.round;
            this.input = false;
            this.app.audio.play('coin');
            if (this.round >= 40) return this.finish(false);
            setTimeout(() => this.nextRound(), 700);
        }
    }
    async finish(quit) {
        if (!this.on) return;
        const app = this.app, notes = this.done;
        this.on = false;
        this.hud.classList.add('hidden');
        if (app.mode === 'canto') app.mode = 'world';
        if (!IS_MOBILE) $('#click-to-play').classList.remove('hidden'); else $('#mobile-controls')?.classList.remove('hidden');
        app.cam.wantDist = innerWidth < innerHeight ? 6.2 : 4.6; app.cam.pitch = 0.28;
        const r = await app.net.request('canto:end', { id: this.id, notes });
        if (!r.ok) return toast(r.msg, { kind: 'bad' });
        const loot = [];
        if (r.xp) loot.push(`+${r.xp} esperienza`);
        if (r.frammenti) loot.push(`+${r.frammenti} Frammenti di Runa`);
        for (const k of r.rune || []) loot.push(`+1 ${MATS[k].name}`);
        toast(h('div', {}, h('b', {}, notes ? `Hai cantato ${notes} ${notes === 1 ? 'nota' : 'note'}${r.best && notes > 1 ? ': il tuo record!' : ''}` : 'Le pietre tacciono'), loot.length ? h('div', {}, loot.join(' · ')) : null),
            { kind: notes ? 'ok' : 'info', icon: 'runestone', duration: 6000 });
        if (r.seal) toast(h('div', {}, h('b', {}, `Hai trovato il ${SEALS[r.seal].name}!`), h('div', {}, SEALS[r.seal].desc)), { kind: 'coin', icon: SEALS[r.seal].icon, duration: 9000 });
    }
}
