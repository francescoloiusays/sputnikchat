// =====================================================================
//  AUDIO: colonna sonora originale + effetti e ambienti sintetizzati (WebAudio)
//  Nessun file: passi, mare, pioggia, versi, voci e i "suoni della nebbia"
//  (rumori lontani e casuali, come le grotte di Minecraft) nascono qui.
// =====================================================================
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const jit = () => rnd(0.92, 1.08);

// --- EFFETTI: ognuno riceve l'uscita (d), l'istante (t) e le opzioni ---
const SFX = {
    swing(d, t, o) {
        const k = o.heavy ? 0.6 : 1;
        this.nz(d, t, { buf: 'pink', f0: 380 * k, f1: 2600 * k, q: 1.4, dur: o.heavy ? 0.3 : 0.2, vol: o.heavy ? 0.5 : 0.38, a: 0.03 });
        if (o.blade) this.osc(d, t + 0.05, { f0: 2400 * jit(), f1: 1800, dur: 0.12, vol: 0.025 });
    },
    hit(d, t) {
        this.osc(d, t, { f0: 170 * jit(), f1: 55, dur: 0.16, vol: 0.45 });
        this.nz(d, t, { type: 'lowpass', f0: 2200, dur: 0.09, vol: 0.4 });
        this.nz(d, t, { type: 'highpass', f0: 3500, dur: 0.035, vol: 0.18 });
    },
    heavy(d, t) {
        this.osc(d, t, { f0: 120 * jit(), f1: 32, dur: 0.38, vol: 0.55 });
        this.nz(d, t, { buf: 'brown', type: 'lowpass', f0: 1100, f1: 200, dur: 0.32, vol: 0.7 });
        this.nz(d, t, { type: 'highpass', f0: 2500, dur: 0.05, vol: 0.25 });
    },
    block(d, t) {
        const f = 760 * jit();
        for (const [k, v, du] of [[1, 0.2, 0.5], [2.76, 0.11, 0.32], [5.4, 0.06, 0.2], [8.9, 0.035, 0.12]]) this.osc(d, t, { f0: f * k, dur: du, vol: v, a: 0.002 });
        this.nz(d, t, { type: 'highpass', f0: 4000, dur: 0.04, vol: 0.25 });
    },
    jump(d, t) { this.nz(d, t, { type: 'lowpass', f0: 700, dur: 0.07, vol: 0.12 }); this.osc(d, t, { type: 'triangle', f0: 210, f1: 330, dur: 0.12, vol: 0.06 }); },
    dash(d, t) { this.nz(d, t, { buf: 'pink', f0: 300, f1: 3200, q: 1.3, dur: 0.24, vol: 0.42, a: 0.02 }); },
    coin(d, t) { this.osc(d, t, { type: 'square', f0: 988, dur: 0.09, vol: 0.09, a: 0.002, hold: 0.05 }); this.osc(d, t + 0.08, { type: 'square', f0: 1319, dur: 0.34, vol: 0.09, a: 0.002, hold: 0.08 }); },
    ui(d, t) { this.osc(d, t, { type: 'triangle', f0: 620, f1: 820, dur: 0.06, vol: 0.1 }); },
    open(d, t) { this.nz(d, t, { f0: 2600, q: 0.6, dur: 0.09, vol: 0.13 }); this.nz(d, t + 0.07, { f0: 1800, q: 0.6, dur: 0.13, vol: 0.09 }); },
    close(d, t) { this.nz(d, t, { f0: 1500, q: 0.6, dur: 0.1, vol: 0.1 }); this.osc(d, t + 0.04, { type: 'triangle', f0: 420, f1: 300, dur: 0.08, vol: 0.06 }); },
    notify(d, t) { this.osc(d, t, { f0: 660, dur: 0.14, vol: 0.15, hold: 0.06 }); this.osc(d, t + 0.12, { f0: 880, dur: 0.24, vol: 0.15, hold: 0.06 }); },
    error(d, t) { this.osc(d, t, { type: 'square', f0: 220, f1: 160, dur: 0.25, vol: 0.1 }); },
    ko(d, t) { this.osc(d, t, { type: 'sawtooth', f0: 80, f1: 30, dur: 1.4, vol: 0.32, filter: 'lowpass', ff: 600 }); this.nz(d, t, { buf: 'brown', type: 'lowpass', f0: 300, dur: 1.2, vol: 0.5 }); },
    gong(d, t) {
        for (const [f, du, v] of [[110, 2.6, 0.22], [165, 2, 0.13], [220, 1.6, 0.11], [297, 1.1, 0.05]]) this.osc(d, t, { f0: f, f1: f * 0.985, dur: du, vol: v, a: 0.008 });
        this.nz(d, t, { buf: 'brown', type: 'lowpass', f0: 400, dur: 0.3, vol: 0.2 });
    },
    fight(d, t) { [330, 440, 660].forEach((f, i) => this.osc(d, t + i * 0.1, { type: 'sawtooth', f0: f, dur: 0.35, vol: 0.11, filter: 'lowpass', ff: 2200, hold: 0.1 })); },
    special(d, t) {
        this.osc(d, t, { type: 'sawtooth', f0: 200, f1: 1200, dur: 0.5, vol: 0.13, filter: 'lowpass', ff: 3000 });
        this.nz(d, t, { f0: 800, f1: 5000, q: 2.5, dur: 0.5, vol: 0.2 });
        for (let i = 0; i < 4; i++) this.osc(d, t + 0.25 + i * 0.06, { f0: 1500 + i * 420, dur: 0.25, vol: 0.045 });
    },
    fire(d, t) {
        this.nz(d, t, { buf: 'brown', type: 'lowpass', f0: 300, f1: 1600, dur: 0.75, vol: 0.6, a: 0.04 });
        for (let i = 0; i < 9; i++) this.nz(d, t + Math.random() * 0.6, { type: 'highpass', f0: 2500, dur: 0.02, vol: rnd(0.08, 0.2) });
    },
    ice(d, t) {
        this.osc(d, t, { type: 'triangle', f0: 2400, f1: 1800, dur: 0.3, vol: 0.13 });
        this.osc(d, t + 0.05, { f0: 3200, f1: 2600, dur: 0.25, vol: 0.08 });
        this.nz(d, t, { type: 'highpass', f0: 5000, dur: 0.35, vol: 0.12 });
        for (let i = 0; i < 5; i++) this.osc(d, t + 0.1 + i * 0.05, { f0: rnd(3000, 5200), dur: 0.12, vol: 0.035 });
    },
    rock(d, t) { SFX.heavy.call(this, d, t); for (let i = 0; i < 7; i++) this.nz(d, t + 0.08 + Math.random() * 0.5, { buf: 'brown', type: 'lowpass', f0: rnd(300, 700), dur: rnd(0.08, 0.2), vol: rnd(0.2, 0.4) }); },
    thunder(d, t) { this.nz(d, t, { buf: 'brown', type: 'lowpass', f0: 160, dur: 2.2, vol: 0.9, a: 0.02 }); this.nz(d, t, { type: 'highpass', f0: 2500, dur: 0.25, vol: 0.4 }); },
    splash(d, t) {
        this.nz(d, t, { f0: 600, f1: 1800, q: 0.8, dur: 0.28, vol: 0.4 });
        this.nz(d, t, { buf: 'brown', type: 'lowpass', f0: 500, dur: 0.2, vol: 0.3 });
        this.osc(d, t + 0.02, { f0: 500, f1: 1100, dur: 0.06, vol: 0.05 });
    },
    throw(d, t) { this.nz(d, t, { buf: 'pink', f0: 900, f1: 2400, q: 1.6, dur: 0.16, vol: 0.25, a: 0.02 }); },
    mudhit(d, t) {
        this.nz(d, t, { buf: 'brown', type: 'lowpass', f0: 900, f1: 300, dur: 0.18, vol: 0.7 });
        this.osc(d, t, { f0: 190, f1: 60, dur: 0.12, vol: 0.22 });
        for (let i = 0; i < 4; i++) this.nz(d, t + 0.05 + Math.random() * 0.15, { f0: rnd(800, 1600), q: 3, dur: 0.04, vol: 0.12 });
    },
    levelup(d, t) {
        [523, 659, 784, 1047].forEach((f, i) => { this.osc(d, t + i * 0.11, { type: 'triangle', f0: f, dur: 0.5, vol: 0.12, hold: 0.08 }); this.osc(d, t + i * 0.11, { f0: f * 2, dur: 0.35, vol: 0.035 }); });
        this.osc(d, t + 0.44, { type: 'triangle', f0: 1047, dur: 1.1, vol: 0.11, vib: 6, vibF: 5 });
    },
    quest(d, t) { [784, 988, 1175].forEach((f, i) => this.osc(d, t + i * 0.1, { type: 'triangle', f0: f, dur: 0.4, vol: 0.11, hold: 0.05 })); },
    dig(d, t) {
        this.nz(d, t, { type: 'highpass', f0: 2500, dur: 0.04, vol: 0.2 });
        this.nz(d, t + 0.02, { buf: 'brown', type: 'lowpass', f0: 800, dur: 0.22, vol: 0.6 });
        this.osc(d, t + 0.02, { f0: 110, f1: 60, dur: 0.14, vol: 0.22 });
        for (let i = 0; i < 6; i++) this.nz(d, t + 0.1 + Math.random() * 0.25, { f0: rnd(1500, 3000), q: 2, dur: 0.02, vol: 0.08 });
    },
    pick(d, t) { this.nz(d, t, { f0: 3000, q: 1, dur: 0.05, vol: 0.15 }); this.osc(d, t + 0.02, { f0: 880, f1: 1320, dur: 0.07, vol: 0.07 }); },
    tablet(d, t) {
        this.nz(d, t, { buf: 'brown', f0: 320, q: 3, dur: 0.9, vol: 0.5, a: 0.1, hold: 0.3 });
        this.osc(d, t, { type: 'sawtooth', f0: 55, dur: 0.9, vol: 0.07, filter: 'lowpass', ff: 200, a: 0.1 });
        this.osc(d, t + 0.8, { f0: 440, dur: 1.2, vol: 0.05 }); this.osc(d, t + 0.8, { f0: 660, dur: 1.2, vol: 0.03 });
    },
    cast(d, t) {
        this.nz(d, t, { buf: 'pink', f0: 600, f1: 2000, q: 1.6, dur: 0.35, vol: 0.25, a: 0.05 });
        for (let i = 0; i < 8; i++) this.nz(d, t + 0.05 + i * 0.035, { type: 'highpass', f0: 4000, dur: 0.012, vol: 0.08 });
    },
    bite(d, t) { this.osc(d, t, { f0: 320, f1: 720, dur: 0.08, vol: 0.16 }); this.osc(d, t + 0.12, { f0: 360, f1: 820, dur: 0.07, vol: 0.13 }); SFX.splash.call(this, d, t + 0.05); },
    reel(d, t) { for (let i = 0; i < 12; i++) this.nz(d, t + i * 0.028, { type: 'highpass', f0: 3200, dur: 0.012, vol: 0.09 }); },
    catch(d, t) { SFX.splash.call(this, d, t); [1047, 1319, 1568].forEach((f, i) => this.osc(d, t + 0.15 + i * 0.07, { f0: f, dur: 0.3, vol: 0.07 })); },
    wish(d, t) {
        this.osc(d, t, { f0: 2200, dur: 0.4, vol: 0.09 }); this.osc(d, t, { f0: 3300, dur: 0.3, vol: 0.045 }); this.osc(d, t + 0.12, { f0: 2400, dur: 0.3, vol: 0.05 });
        SFX.splash.call(this, d, t + 0.45);
    },
    phone(d, t) { for (let k = 0; k < 2; k++) for (const f of [440, 480]) this.osc(d, t + k * 0.42, { type: 'square', f0: f, dur: 0.36, vol: 0.05, hold: 0.3, filter: 'bandpass', ff: 1300, fq: 0.8, trem: 22 }); },
    bones(d, t) {
        for (let i = 0; i < 14; i++) {
            const tt = t + Math.random() * 0.45;
            this.nz(d, tt, { f0: rnd(1200, 2600), q: 7, dur: 0.025, vol: rnd(0.12, 0.25) });
            this.osc(d, tt, { type: 'triangle', f0: rnd(500, 900), dur: 0.03, vol: 0.05 });
        }
    },
    ghost(d, t) {
        this.osc(d, t, { f0: 480, f1: 720, glide: 0.5, dur: 1.6, vol: 0.11, a: 0.3, vib: 18, vibF: 5 });
        this.osc(d, t + 0.1, { f0: 470, f1: 360, dur: 1.5, vol: 0.05, a: 0.4, vib: 12, vibF: 4 });
        this.nz(d, t, { buf: 'pink', f0: 900, q: 2, dur: 1.4, vol: 0.06, a: 0.4 });
    },
    roar(d, t) {   // il Re Annegato
        this.osc(d, t, { type: 'sawtooth', f0: 70, f1: 48, dur: 1.6, vol: 0.3, a: 0.15, filter: 'lowpass', ff: 520, vib: 6, vibF: 7 });
        this.nz(d, t, { buf: 'brown', type: 'lowpass', f0: 380, dur: 1.5, vol: 0.5, a: 0.2 });
        for (let i = 0; i < 6; i++) this.osc(d, t + 0.3 + Math.random() * 1, { f0: rnd(250, 500), f1: rnd(700, 1200), dur: 0.06, vol: 0.05 });
    },
    chat(d, t) { this.osc(d, t, { f0: 900, f1: 1350, dur: 0.06, vol: 0.06 }); },
    equip(d, t) { this.nz(d, t, { f0: 1800, q: 0.7, dur: 0.12, vol: 0.12 }); this.osc(d, t + 0.06, { type: 'triangle', f0: 1400, dur: 0.12, vol: 0.05 }); },
    anvil(d, t) {
        const f = 620 * jit();
        for (const [k, v, du] of [[1, 0.18, 1.2], [2.41, 0.11, 0.8], [3.93, 0.07, 0.6], [5.26, 0.045, 0.4]]) this.osc(d, t, { f0: f * k, dur: du, vol: v, a: 0.001 });
        this.nz(d, t, { type: 'highpass', f0: 3000, dur: 0.05, vol: 0.3 });
    },
    awaken(d, t) {
        for (let i = 0; i < 10; i++) this.osc(d, t + i * 0.07, { f0: 600 * Math.pow(1.122, i), dur: 0.6, vol: 0.055, det: rnd(-8, 8) });
        this.nz(d, t, { type: 'highpass', f0: 6000, dur: 1.2, vol: 0.08, a: 0.3 });
    },
    tv(d, t) { [392, 523, 659, 784].forEach((f, i) => this.osc(d, t + i * 0.08, { type: 'square', f0: f, dur: 0.12, vol: 0.055, hold: 0.04 })); this.osc(d, t + 0.36, { f0: 1568, dur: 0.6, vol: 0.07 }); },
    portal(d, t) { this.osc(d, t, { type: 'sawtooth', f0: 120, f1: 900, dur: 0.6, vol: 0.08, filter: 'lowpass', ff: 1500 }); this.nz(d, t, { f0: 400, f1: 4000, q: 3, dur: 0.6, vol: 0.12 }); },
    // gesti
    saluta(d, t) { this.osc(d, t, { f0: 950, f1: 1450, dur: 0.18, vol: 0.08, vib: 20, vibF: 9 }); this.osc(d, t + 0.22, { f0: 1150, f1: 1650, dur: 0.24, vol: 0.07, vib: 25, vibF: 9 }); },
    balla(d, t) { [523, 659, 784, 659, 880, 784].forEach((f, i) => { this.osc(d, t + i * 0.16, { type: 'triangle', f0: f, dur: 0.14, vol: 0.07 }); if (i % 2 === 0) this.nz(d, t + i * 0.16, { type: 'lowpass', f0: 500, dur: 0.05, vol: 0.12 }); }); },
    inchino(d, t) { this.nz(d, t, { buf: 'pink', f0: 700, f1: 300, q: 1, dur: 0.35, vol: 0.12, a: 0.08 }); this.osc(d, t + 0.35, { f0: 1319, dur: 0.6, vol: 0.05 }); this.osc(d, t + 0.35, { f0: 1976, dur: 0.5, vol: 0.025 }); },
    ride(d, t, o) { const p = o.pitch || 1; for (let i = 0; i < 5; i++) this.syl(d, t + i * 0.13, { f: (260 - i * 16) * p, type: 'sawtooth', vowel: 0, dur: 0.1, vol: 0.13, form: 1.05 }); },
};
// un po' d'eco su alcuni effetti
const VERB = { gong: 0.5, ko: 0.4, anvil: 0.35, ghost: 0.7, roar: 0.5, tablet: 0.4, levelup: 0.25, awaken: 0.4, thunder: 0.6, bones: 0.2, phone: 0.15, special: 0.2, inchino: 0.3 };

// --- PASSI: il suono dipende da cosa c'è sotto i piedi ---
const STEPS = {
    grass(d, t, k) { this.nz(d, t, { f0: 2200 * k, q: 0.7, dur: 0.07, vol: 0.09 }); this.nz(d, t + 0.025, { f0: 1600 * k, q: 0.8, dur: 0.06, vol: 0.06 }); this.nz(d, t, { buf: 'brown', type: 'lowpass', f0: 300, dur: 0.06, vol: 0.14 }); },
    path(d, t, k) { this.nz(d, t, { buf: 'brown', type: 'lowpass', f0: 700 * k, dur: 0.07, vol: 0.24 }); for (let i = 0; i < 3; i++) this.nz(d, t + Math.random() * 0.05, { f0: rnd(2000, 3500), q: 3, dur: 0.015, vol: 0.05 }); },
    sand(d, t, k) { this.nz(d, t, { type: 'highpass', f0: 1800 * k, dur: 0.12, vol: 0.07, a: 0.02 }); this.nz(d, t, { buf: 'brown', type: 'lowpass', f0: 400, dur: 0.08, vol: 0.11 }); },
    stone(d, t, k) { this.nz(d, t, { f0: 2400 * k, q: 2.5, dur: 0.035, vol: 0.16 }); this.osc(d, t, { type: 'triangle', f0: 320 * k, f1: 200, dur: 0.04, vol: 0.06 }); this.nz(d, t, { buf: 'brown', type: 'lowpass', f0: 250, dur: 0.04, vol: 0.12 }); },
    wood(d, t, k) { this.osc(d, t, { type: 'triangle', f0: 190 * k, f1: 140, dur: 0.09, vol: 0.18 }); this.nz(d, t, { f0: 700 * k, q: 2, dur: 0.05, vol: 0.12 }); },
    water(d, t, k) {
        this.nz(d, t, { f0: 500 * k, f1: 1600, q: 0.9, dur: 0.2, vol: 0.2, a: 0.01 });
        this.nz(d, t + 0.03, { buf: 'brown', type: 'lowpass', f0: 600, dur: 0.15, vol: 0.12 });
        if (Math.random() < 0.5) this.osc(d, t + 0.05, { f0: rnd(500, 800), f1: rnd(900, 1400), dur: 0.05, vol: 0.03 });
    },
    snow(d, t, k) {
        for (let i = 0; i < 6; i++) this.nz(d, t + i * 0.018 + Math.random() * 0.01, { f0: rnd(2500, 5000) * k, q: 2, dur: 0.02, vol: rnd(0.04, 0.09) });
        this.nz(d, t, { buf: 'brown', type: 'lowpass', f0: 350, dur: 0.08, vol: 0.1 });
    },
};

// --- VOCI DEI PERSONAGGI: sillabe inventate, ognuno col suo timbro ---
const VOICES = {
    traghettatore: { f: 105, type: 'sawtooth', rate: 0.13, form: 0.85, verb: 0.3, breath: 1, gain: 1.3 },   // vecchio, lento, roco
    brace: { f: 82, type: 'square', rate: 0.1, form: 0.72, growl: 1, gain: 1.7 },                           // profondo, ruvido
    sarta: { f: 330, type: 'triangle', rate: 0.075, form: 1.25, vib: 9, verb: 0.35, gain: 0.85 },           // sottile, spettrale
    mercante: { f: 185, type: 'square', rate: 0.065, form: 1.05 },                               // svelto, mellifluo
    custode: { f: 235, type: 'sine', rate: 0.15, form: 1.1, verb: 0.65, choir: 1 },              // eterea, a due voci
    becchino: { f: 74, type: 'sawtooth', rate: 0.12, form: 0.75, growl: 1, verb: 0.2, gain: 1.6 },          // cupo
    spettro: { f: 410, type: 'sine', rate: 0.16, vib: 14, verb: 0.85, wail: 1, gain: 0.6 },                 // lamento
    ratto: { f: 520, type: 'square', rate: 0.055, form: 1.45, gain: 0.55 },                                  // squittii veloci
    re: { f: 60, type: 'sawtooth', rate: 0.17, form: 0.6, verb: 0.55, bubbles: 1, growl: 1, gain: 1.7 },    // gorgoglio dal fondo
    telefono: { f: 250, type: 'square', rate: 0.08, form: 1.2, lofi: 1 },
    default: { f: 200, type: 'triangle', rate: 0.08, form: 1 },
};
const VOWELS = [[730, 1090], [530, 1840], [270, 2290], [570, 840], [300, 870]];   // a e i o u
const VOWEL_OF = { a: 0, à: 0, e: 1, è: 1, é: 1, i: 2, ì: 2, o: 3, ò: 3, u: 4, ù: 4 };

export class GameAudio {
    constructor() {
        this.ctx = null;
        this.musicOn = false;
        this.music = null;
        this.sfxVol = 0.5;
        this.musicVol = 0.3;
        this.ambVol = 0.6;
        // volumi dei singoli ambienti (Opzioni): 0..1, moltiplicano il volume dell'ambiente
        this.mix = { sea: 1, wind: 1, rain: 1, animals: 1, fire: 1, mood: 1 };
        this.L = { x: 0, z: 0, yaw: 0 };   // chi ascolta (la camera)
        this.envS = null;
        this.next = {};
        this.loops = null;
    }
    unlock() {
        if (!this.ctx) {
            try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
            const c = this.ctx;
            // un limitatore evita che tanti suoni insieme gracchino
            this.out = c.createDynamicsCompressor();
            this.out.threshold.value = -8; this.out.knee.value = 8; this.out.ratio.value = 6; this.out.attack.value = 0.003; this.out.release.value = 0.25;
            this.out.connect(c.destination);
            this.master = c.createGain(); this.master.gain.value = this.sfxVol; this.master.connect(this.out);
            this.ambBus = c.createGain(); this.ambBus.gain.value = this.ambVol; this.ambBus.connect(this.out);
            const sr = c.sampleRate, len = sr * 3;
            const mk = (fill) => { const b = c.createBuffer(1, len, sr), d = b.getChannelData(0); fill(d); return b; };
            this.bufs = {
                white: mk(d => { for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }),
                pink: mk(d => { let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; } }),
                brown: mk(d => { let l = 0; for (let i = 0; i < len; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } }),
            };
            this.noiseBuf = this.bufs.white;
            // riverbero: un impulso di rumore che si spegne
            this.verb = c.createConvolver();
            const ir = c.createBuffer(2, sr * 3, sr);
            for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.2); }
            this.verb.buffer = ir;
            const vo = c.createGain(); vo.gain.value = 0.42; this.verb.connect(vo); vo.connect(this.out);
            this.sfxVerb = c.createGain(); this.sfxVerb.gain.value = this.sfxVol; this.sfxVerb.connect(this.verb);
            this.ambVerb = c.createGain(); this.ambVerb.gain.value = this.ambVol; this.ambVerb.connect(this.verb);
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }
    setSfxVolume(v) { this.sfxVol = v; if (this.master) { this.master.gain.value = v; this.sfxVerb.gain.value = v; } }
    setAmbVolume(v) { this.ambVol = v; if (this.ambBus) { this.ambBus.gain.value = v; this.ambVerb.gain.value = v; } }
    setMix(k, v) { if (k in this.mix) this.mix[k] = v; this.aT = 0; }
    setMusicVolume(v) {
        this.musicVol = v;
        for (const m of [this.music, this.battleMusic]) if (m && !m.fading) m.volume = v;
    }

    // Due brani: la colonna sonora dell'isola e il suo remix d'azione per i duelli
    track(battle) {
        if (battle) {
            if (!this.battleMusic) { this.battleMusic = new Audio('./battaglia.mp3'); this.battleMusic.loop = true; this.battleMusic.volume = this.musicVol; }
            return this.battleMusic;
        }
        if (!this.music) { this.music = new Audio('./soundtrack.mp3'); this.music.loop = true; this.music.volume = this.musicVol; }
        return this.music;
    }
    fade(el, to, ms, then) {
        clearInterval(el.fadeTimer);
        const from = el.volume, t0 = performance.now();
        el.fading = true;
        el.fadeTimer = setInterval(() => {
            const k = Math.min(1, (performance.now() - t0) / ms);
            el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
            if (k >= 1) { clearInterval(el.fadeTimer); el.fading = false; then?.(); }
        }, 30);
    }
    async toggleMusic(force) {
        const on = force ?? !this.musicOn;
        const cur = this.track(!!this.battle);
        if (on) {
            try { cur.volume = this.musicVol; await cur.play(); this.musicOn = true; } catch { this.musicOn = false; }
        } else {
            for (const m of [this.music, this.battleMusic]) m?.pause();
            this.musicOn = false;
        }
        return this.musicOn;
    }
    // Passa alla musica di battaglia (o torna a quella dell'isola) con una dissolvenza
    setBattle(on) {
        if (this.battle === on) return;
        this.battle = on;
        if (!this.musicOn) return;
        const out = this.track(!on), inn = this.track(on);
        this.fade(out, 0, 700, () => out.pause());
        if (on) inn.currentTime = 0;
        inn.volume = 0;
        inn.play().then(() => this.fade(inn, this.musicVol, 900)).catch(() => {});
    }

    // --- MATTONCINI ---
    // posizione nel mondo → volume e panoramica rispetto a chi ascolta
    spatial(x, z, range = 28) {
        const dx = x - this.L.x, dz = z - this.L.z, d = Math.hypot(dx, dz);
        if (d > range) return null;
        const rx = Math.cos(this.L.yaw), rz = -Math.sin(this.L.yaw);
        return { g: Math.pow(1 - d / range, 1.6), pan: d > 0.6 ? Math.max(-1, Math.min(1, (dx * rx + dz * rz) / d)) * 0.8 : 0 };
    }
    // uscita di un suono: effetti o ambiente, con posizione, panoramica ed eco facoltativi
    dest(o = {}) {
        if (!this.ctx) return null;
        const c = this.ctx;
        let vol = o.vol ?? 1, pan = o.pan || 0;
        if (o.x != null) { const s = this.spatial(o.x, o.z, o.range); if (!s) return null; vol *= s.g; pan = s.pan; }
        if (vol < 0.003) return null;
        const bus = o.amb ? this.ambBus : this.master;
        const g = c.createGain(); g.gain.value = vol;
        if (pan) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(bus); } else g.connect(bus);
        if (o.verb) { const s = c.createGain(); s.gain.value = o.verb; g.connect(s); s.connect(o.amb ? this.ambVerb : this.sfxVerb); }
        return g;
    }
    env(d, t, vol, a, dur, hold = 0) {
        const g = this.ctx.createGain();
        const v = Math.max(0.0002, vol);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(v, t + a);
        if (hold) g.gain.setValueAtTime(v, t + a + hold);
        g.gain.exponentialRampToValueAtTime(0.0001, Math.max(t + a + hold + 0.01, t + dur));
        g.connect(d);
        return g;
    }
    osc(d, t, o) {
        const c = this.ctx, dur = o.dur;
        const s = c.createOscillator(); s.type = o.type || 'sine';
        s.frequency.setValueAtTime(o.f0, t);
        if (o.f1 && o.f1 !== o.f0) s.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + (o.glide || dur));
        if (o.det) s.detune.value = o.det;
        let out = this.env(d, t, o.vol ?? 0.3, o.a ?? 0.005, dur, o.hold);
        if (o.trem) {
            const tg = c.createGain(), l = c.createOscillator(), lg = c.createGain();
            tg.gain.value = 0.5; l.frequency.value = o.trem; lg.gain.value = 0.5;
            l.connect(lg); lg.connect(tg.gain); tg.connect(out); out = tg;
            l.start(t); l.stop(t + dur + 0.05);
        }
        if (o.filter) { const f = c.createBiquadFilter(); f.type = o.filter; f.frequency.value = o.ff || 1000; f.Q.value = o.fq ?? 1; f.connect(out); out = f; }
        if (o.vib) {
            const l = c.createOscillator(), lg = c.createGain();
            l.frequency.value = o.vibF || 6; lg.gain.value = o.vib;
            l.connect(lg); lg.connect(s.frequency); l.start(t); l.stop(t + dur + 0.05);
        }
        s.connect(out); s.start(t); s.stop(t + dur + 0.05);
        return s;
    }
    nz(d, t, o) {
        const c = this.ctx, dur = o.dur;
        const s = c.createBufferSource(); s.buffer = this.bufs[o.buf || 'white']; s.loop = true;
        const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q ?? 1;
        f.frequency.setValueAtTime(o.f0 || 1000, t);
        if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
        const g = this.env(d, t, o.vol ?? 0.3, o.a ?? 0.002, dur, o.hold);
        s.connect(f); f.connect(g);
        s.start(t, Math.random() * 2.5); s.stop(t + dur + 0.05);
    }
    // una sillaba: oscillatore filtrato da due formanti (la vocale)
    syl(d, t, o) {
        const c = this.ctx;
        const s = c.createOscillator(); s.type = o.type || 'sawtooth';
        s.frequency.setValueAtTime(o.f, t);
        if (o.f1) s.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
        const [F1, F2] = VOWELS[o.vowel % 5];
        const g = this.env(d, t, o.vol, 0.012, o.dur, o.dur * 0.35);
        const b1 = c.createBiquadFilter(); b1.type = 'bandpass'; b1.frequency.value = F1 * (o.form || 1); b1.Q.value = 3;
        const b2 = c.createBiquadFilter(); b2.type = 'bandpass'; b2.frequency.value = F2 * (o.form || 1); b2.Q.value = 4;
        const g2 = c.createGain(); g2.gain.value = 0.6;
        const g1 = c.createGain(); g1.gain.value = 2.2;
        s.connect(b1); s.connect(b2); b1.connect(g1); g1.connect(g); b2.connect(g2); g2.connect(g);
        if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 6; lg.gain.value = o.vib; l.connect(lg); lg.connect(s.frequency); l.start(t); l.stop(t + o.dur + 0.05); }
        s.start(t); s.stop(t + o.dur + 0.05);
    }

    // --- API ---
    tone(f0, f1, dur, { type = 'sine', vol = 0.3, attack = 0.005, delay = 0, verb = 0 } = {}) {
        const d = this.dest({ verb });
        if (d) this.osc(d, this.ctx.currentTime + delay, { type, f0, f1, dur, vol, a: attack });
    }
    noise(dur, { vol = 0.3, freq = 1200, freq1, q = 1, type = 'bandpass', delay = 0 } = {}) {
        const d = this.dest();
        if (d) this.nz(d, this.ctx.currentTime + delay, { f0: freq, f1: freq1, q, type, dur, vol });
    }
    // play('hit') o play('saluta', { x, z }) per un suono che arriva da un punto dell'isola
    play(name, o = {}) {
        if (!this.ctx) return;
        if (name === 'step') return this.step('grass', o);
        const fn = SFX[name];
        if (!fn) return;
        const d = this.dest({ verb: VERB[name] || 0, ...o });
        if (d) fn.call(this, d, this.ctx.currentTime + (o.delay || 0), o);
    }
    step(surface, o = {}) {
        if (!this.ctx) return;
        const d = this.dest({ vol: 2.8 * (o.vol ?? 1) * (o.land ? 1.8 : 1) * (o.run ? 1.15 : 1), x: o.x, z: o.z, range: 18, verb: surface === 'stone' ? 0.22 : surface === 'wood' ? 0.1 : 0.03 });
        if (!d) return;
        (STEPS[surface] || STEPS.grass).call(this, d, this.ctx.currentTime, rnd(0.88, 1.12) * (o.land ? 0.8 : 1));
    }
    // il personaggio "parla": una sillaba ogni poche lettere, pause sulla punteggiatura
    voice(who, text = '', o = {}) {
        if (!this.ctx) return;
        const V = VOICES[who] || VOICES.default;
        const d = this.dest({ vol: (o.vol ?? 1) * (V.gain || 1), x: o.x, z: o.z, range: 30, verb: V.verb || 0.06 });
        if (!d) return;
        const now = this.ctx.currentTime;
        this.voiceT = Math.min(now + 1.5, Math.max(now + 0.04, this.voiceT || 0));
        let t = this.voiceT, n = 0;
        const words = String(text).replace(/[«»"()]/g, '').split(/\s+/).filter(Boolean);
        for (const w of words) {
            const letters = w.toLowerCase().replace(/[^a-zàèéìòù]/g, '');
            const syls = Math.max(1, Math.min(4, Math.round(letters.length / 2.6)));
            for (let i = 0; i < syls && n < 26; i++, n++) {
                const vow = [...letters.slice(i * 2)].find(ch => ch in VOWEL_OF);
                const f = V.f * pick([1, 1.122, 1.26, 0.891, 1.335]) * (V.wail ? rnd(0.9, 1.25) : 1);
                const dur = V.rate * 0.85;
                this.syl(d, t, { f, f1: V.wail ? f * rnd(0.8, 1.2) : null, type: V.type, vowel: VOWEL_OF[vow] ?? (n % 5), dur, vol: 0.2, form: V.form, vib: V.vib });
                if (V.growl) this.osc(d, t, { type: 'sawtooth', f0: f * 0.5, dur: dur * 0.9, vol: 0.025, filter: 'lowpass', ff: 420 });
                if (V.choir) this.syl(d, t, { f: f * 1.5, type: V.type, vowel: VOWEL_OF[vow] ?? 0, dur, vol: 0.08, form: V.form });
                if (V.breath) this.nz(d, t, { buf: 'pink', f0: 1800, q: 1, dur: dur * 0.8, vol: 0.03 });
                if (V.bubbles && Math.random() < 0.45) this.osc(d, t + dur * 0.3, { f0: rnd(300, 600), f1: rnd(700, 1200), dur: 0.05, vol: 0.05 });
                if (V.lofi) this.nz(d, t, { type: 'highpass', f0: 3000, dur: dur, vol: 0.015 });
                t += V.rate * rnd(0.85, 1.15);
            }
            t += V.rate * (/[.,;:!?…]$/.test(w) ? 2.2 : 0.45);
            if (n >= 26) break;
        }
        this.voiceT = t;
    }
    // tuono lontano: delay = secondi dopo il lampo (più è vicino, più schiocca)
    thunder(delay = 1) {
        if (!this.ctx) return;
        const near = Math.max(0, 1 - delay / 2.6);
        const d = this.dest({ amb: true, vol: (0.55 + near * 0.6) * this.mix.rain, pan: rnd(-0.6, 0.6), verb: 0.6 });
        if (!d) return;
        const t = this.ctx.currentTime + delay;
        if (near > 0.4) this.nz(d, t, { type: 'highpass', f0: 1800, dur: 0.3, vol: 0.5 * near });
        this.nz(d, t, { buf: 'brown', type: 'lowpass', f0: 180 + near * 220, f1: 60, dur: 3 + rnd(0, 2), vol: 0.9, a: 0.05 + (1 - near) * 0.4 });
        for (let i = 0; i < 4; i++) this.nz(d, t + rnd(0.2, 1.8), { buf: 'brown', type: 'lowpass', f0: 140, dur: rnd(0.6, 1.4), vol: rnd(0.3, 0.6), a: 0.1 });
    }

    // --- AMBIENTE ---
    setListener(x, z, yaw) { this.L.x = x; this.L.z = z; this.L.yaw = yaw; }
    setEnv(S) { this.envS = S; }
    loop(buf, type, f, q) {
        const c = this.ctx;
        const s = c.createBufferSource(); s.buffer = this.bufs[buf]; s.loop = true;
        const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
        const g = c.createGain(); g.gain.value = 0;
        s.connect(fl); fl.connect(g); g.connect(this.ambBus);
        s.start(0, Math.random() * 2);
        return { f: fl, g };
    }
    // a: { sea, height, indoor, fire, fountain, zone, duel, npcs:[{id,x,z,d}] }
    ambient(dt, a) {
        if (!this.ctx || this.ctx.state !== 'running') return;
        if (!this.loops) {
            this.loops = {
                sea: this.loop('brown', 'lowpass', 420, 0.7), surf: this.loop('pink', 'bandpass', 1400, 0.6),
                wind: this.loop('pink', 'bandpass', 420, 0.8), rain: this.loop('pink', 'lowpass', 2600, 0.5),
                fire: this.loop('brown', 'lowpass', 260, 0.7), brook: this.loop('white', 'bandpass', 2300, 0.9),
            };
        }
        const S = this.envS || { day: 0, rain: 0, snow: 0, wind: 0.2, storm: 0 };
        const L = this.loops, now = this.ctx.currentTime, M = this.mix;
        const ind = !!a.indoor, duel = !!a.duel, muff = ind ? 0.25 : duel ? 0.4 : 1;
        this.aT = (this.aT || 0) - dt;
        if (this.aT <= 0) {
            this.aT = 0.2;
            const swell = 0.62 + 0.38 * Math.sin(now * 0.42) * Math.sin(now * 0.13 + 1.7);
            const set = (n, v, tc) => L[n].g.gain.setTargetAtTime(Math.max(0, v), now, tc);
            set('sea', a.sea * 0.4 * swell * muff * M.sea, 0.8);
            set('surf', a.sea * a.sea * 0.13 * swell * swell * muff * M.sea, 0.8);
            // il vento arriva a raffiche e si sente davvero solo col brutto tempo o in alto
            const gust = Math.max(0, Math.sin(now * 0.13) * Math.sin(now * 0.051 + 1.3) + 0.2);
            set('wind', (0.003 + (S.wind * 0.06 + Math.min(1, a.height || 0) * 0.015 + S.snow * 0.015) * gust) * M.wind * (ind ? 0.1 : duel ? 0.6 : 1), 1.5);
            L.wind.f.frequency.setTargetAtTime(300 + 260 * (0.5 + 0.5 * Math.sin(now * 0.21)) + S.wind * 200, now, 1.5);
            // pioggia morbida: un fruscio basso, non un sibilo
            set('rain', S.rain * (ind ? 0.06 : 0.13) * M.rain, 1.5);
            L.rain.f.frequency.setTargetAtTime(ind ? 700 : 2600, now, 0.5);
            set('fire', (a.fire || 0) * 0.22 * M.fire, 0.4);
            set('brook', (a.fountain || 0) * 0.13 * rnd(0.8, 1.2) * M.fire, 0.15);
        }
        const out = !ind && !duel, night = 1 - S.day;
        if (out && S.day > 0.55 && S.rain < 0.2 && S.snow < 0.5 && a.sea < 0.85 && this.every('bird', 2.5, 7)) this.bird();
        if (out && S.day > 0.45 && a.sea > 0.25 && S.rain < 0.5 && this.every('gull', 9, 24)) this.gull(a.sea);
        if (out && night > 0.6 && S.rain < 0.2 && S.snow < 0.3 && a.sea < 0.75 && this.every('cricket', 0.5, 1.3)) this.cricket();
        if (out && night > 0.5 && (a.sea > 0.2 || /Cimitero/.test(a.zone || '')) && this.every('frog', 2, 6)) this.frog();
        if (out && night > 0.7 && this.every('owl', 25, 60)) this.owl();
        if (S.rain > 0.3 && !duel && this.every('drip', 0.15, 0.6)) this.drip(S.rain, ind);
        if (a.fire > 0.05 && this.every('crackle', 0.05 / a.fire, 0.35 / a.fire)) this.crackle(a.fire);
        if (ind && this.every('tick', 1, 1)) this.tick();
        if (!duel && this.every('mood', 70, 180)) this.mood(a, S);
        if (!duel) for (const n of a.npcs || []) this.npcIdle(n);
    }
    // vero ogni tanto (la prima volta solo programma)
    every(k, lo, hi) {
        const n = this.ctx.currentTime;
        if (this.next[k] == null) { this.next[k] = n + rnd(lo, hi) * Math.random(); return false; }
        if (n < this.next[k]) return false;
        this.next[k] = n + rnd(lo, hi);
        return true;
    }
    bird() {
        const d = this.dest({ amb: true, vol: rnd(0.4, 0.9) * this.mix.animals, pan: rnd(-0.9, 0.9), verb: 0.15 }); if (!d) return;
        const t = this.ctx.currentTime, base = rnd(2200, 4200), n = 2 + (Math.random() * 5 | 0), trill = Math.random() < 0.5;
        for (let i = 0; i < n; i++) {
            const tt = t + i * rnd(0.08, 0.16);
            if (trill) this.osc(d, tt, { f0: base * 1.3, f1: base * 0.8, dur: 0.09, vol: 0.05, vib: 300, vibF: 30 });
            else this.osc(d, tt, { f0: base * rnd(0.9, 1.2), f1: base * rnd(1.2, 1.6), dur: rnd(0.05, 0.1), vol: 0.06 });
        }
    }
    gull(sea) {
        const d = this.dest({ amb: true, vol: 0.6 * sea * this.mix.animals, pan: rnd(-0.9, 0.9), verb: 0.3 }); if (!d) return;
        const t = this.ctx.currentTime;
        for (let i = 0, n = 2 + (Math.random() * 3 | 0); i < n; i++) this.osc(d, t + i * 0.28, { type: 'sawtooth', f0: rnd(1250, 1450), f1: rnd(850, 1000), dur: 0.24, vol: 0.05, filter: 'bandpass', ff: 1800, fq: 3, vib: 40, vibF: 18 });
    }
    cricket() {
        const d = this.dest({ amb: true, vol: rnd(0.25, 0.6) * this.mix.animals, pan: rnd(-1, 1) }); if (!d) return;
        const t = this.ctx.currentTime, f = rnd(4200, 5200);
        for (let i = 0; i < 3; i++) this.osc(d, t + i * 0.055, { f0: f, dur: 0.03, vol: 0.045, a: 0.004, trem: 90 });
    }
    frog() {
        const d = this.dest({ amb: true, vol: rnd(0.4, 0.8) * this.mix.animals, pan: rnd(-1, 1), verb: 0.1 }); if (!d) return;
        const t = this.ctx.currentTime;
        for (let i = 0, n = 1 + (Math.random() * 2 | 0); i < n; i++) this.osc(d, t + i * 0.32, { type: 'sawtooth', f0: rnd(110, 150), f1: rnd(85, 110), dur: 0.22, vol: 0.07, filter: 'bandpass', ff: 520, fq: 4, trem: 32 });
    }
    owl() {
        const d = this.dest({ amb: true, vol: 0.7 * this.mix.animals, pan: rnd(-1, 1), verb: 0.5 }); if (!d) return;
        const t = this.ctx.currentTime;
        [[0, 0.4], [0.62, 0.22], [0.9, 0.5]].forEach(([dl, du]) => this.osc(d, t + dl, { f0: 395, f1: 355, dur: du, vol: 0.06, a: 0.05, vib: 4, vibF: 5 }));
    }
    drip(r, ind) {
        const d = this.dest({ amb: true, vol: rnd(0.12, 0.35) * r * (ind ? 0.4 : 1) * this.mix.rain, pan: rnd(-1, 1) }); if (!d) return;
        this.osc(d, this.ctx.currentTime, { f0: rnd(1800, 4200), f1: rnd(900, 1800), dur: 0.03, vol: 0.05 });
    }
    crackle(k) {
        const d = this.dest({ amb: true, vol: Math.min(1, k * 1.3) * this.mix.fire, pan: rnd(-0.4, 0.4) }); if (!d) return;
        const t = this.ctx.currentTime;
        for (let i = 0, n = 1 + (Math.random() * 3 | 0); i < n; i++) this.nz(d, t + i * rnd(0.01, 0.04), { type: 'highpass', f0: rnd(1500, 4000), dur: rnd(0.008, 0.03), vol: rnd(0.05, 0.2) });
    }
    tick() {
        const d = this.dest({ amb: true, vol: 0.6, verb: 0.15 }); if (!d) return;
        this.tickN = (this.tickN || 0) + 1;
        const t = this.ctx.currentTime;
        this.osc(d, t, { type: 'triangle', f0: this.tickN % 2 ? 2000 : 1700, dur: 0.02, vol: 0.04 });
        this.nz(d, t, { type: 'highpass', f0: 5000, dur: 0.01, vol: 0.05 });
    }
    // i rumori dei personaggi al lavoro, sentiti da vicino
    npcIdle(n) {
        const R = { brace: [1.4, 3.2], becchino: [5, 11], ratto: [7, 18], spettro: [9, 22], traghettatore: [6, 12], sarta: [4, 9], mercante: [10, 20], custode: [12, 24] }[n.id];
        if (!R || n.d > 26 || !this.every('npc:' + n.id, R[0], R[1])) return;
        const d = this.dest({ x: n.x, z: n.z, range: 26, vol: 0.55, verb: 0.15 }); if (!d) return;
        const t = this.ctx.currentTime;
        switch (n.id) {
            case 'brace': for (let i = 0, k = 1 + (Math.random() * 3 | 0); i < k; i++) SFX.anvil.call(this, d, t + i * 0.42); break;
            case 'becchino': SFX.dig.call(this, d, t); break;
            case 'ratto': for (let i = 0; i < 3; i++) this.osc(d, t + i * 0.09, { type: 'square', f0: rnd(2600, 3400), f1: rnd(3400, 4200), dur: 0.05, vol: 0.04, filter: 'bandpass', ff: 3500 }); break;
            case 'spettro': SFX.ghost.call(this, d, t); break;
            case 'traghettatore': this.osc(d, t, { type: 'sawtooth', f0: 70, f1: 95, dur: 1.1, vol: 0.05, filter: 'bandpass', ff: 900, fq: 4, vib: 25, vibF: 9 }); SFX.splash.call(this, d, t + 0.6); break;
            case 'sarta': for (const dl of [0, 0.16]) { this.nz(d, t + dl, { type: 'highpass', f0: 4500, dur: 0.03, vol: 0.12 }); this.osc(d, t + dl, { f0: 3100, dur: 0.05, vol: 0.03 }); } break;
            case 'mercante': for (let i = 0; i < 4; i++) this.osc(d, t + Math.random() * 0.4, { f0: rnd(2600, 3600), dur: 0.12, vol: 0.04 }); break;
            case 'custode': for (const f of [220, 277, 330]) this.osc(d, t, { f0: f, dur: 3, vol: 0.03, a: 0.8, vib: 3, vibF: 4.5 }); break;
        }
    }
    // --- I SUONI DELLA NEBBIA: lontani, rari, un po' inquietanti ---
    mood(a, S) {
        const z = a.zone || '', night = S.day < 0.4;
        const opts = /Cimitero/.test(z) ? ['whisper', 'chains', 'bell', 'drone']
            : /Castello|Arena|Cortile|Giardino|Stanza/.test(z) ? ['creak', 'drone', 'door', 'bell']
            : a.sea > 0.4 ? ['foghorn', 'whale', 'drone', 'bell']
            : night ? ['whisper', 'drone', 'howl', 'bell'] : ['drone', 'bell', 'howl'];
        const k = pick(opts);
        const d = this.dest({ amb: true, vol: 0.9 * this.mix.mood, pan: rnd(-0.8, 0.8), verb: 0.9 }); if (!d) return;
        const t = this.ctx.currentTime;
        switch (k) {
            case 'drone': for (const [f, v] of [[55, 0.06], [82.6, 0.04], [111, 0.035]]) this.osc(d, t, { type: 'sawtooth', f0: f, f1: f * rnd(0.97, 1.03), dur: 8, vol: v, a: 3, hold: 2, filter: 'lowpass', ff: 320, det: rnd(-10, 10) }); break;
            case 'bell': for (let r = 0; r < 3; r++) for (const [k2, v, du] of [[0.5, 0.03, 5], [1, 0.05, 4], [1.19, 0.025, 3], [1.5, 0.02, 2.5], [2, 0.02, 2]]) this.osc(d, t + r * 2.4, { f0: 196 * k2, dur: du, vol: v, a: 0.004 }); break;
            case 'whisper': for (let i = 0; i < 9; i++) { const v = pick(VOWELS); this.nz(d, t + i * rnd(0.12, 0.3), { buf: 'pink', f0: v[1] * rnd(0.9, 1.2), q: 6, dur: rnd(0.1, 0.25), vol: 0.07, a: 0.04 }); } break;
            case 'chains': for (let i = 0; i < 9; i++) { const tt = t + Math.random() * 1.2; for (const f of [2300, 3700, 5100]) this.osc(d, tt, { f0: f * rnd(0.95, 1.05), dur: 0.09, vol: 0.02 }); } break;
            case 'creak': this.osc(d, t, { type: 'sawtooth', f0: 70, f1: 105, dur: 1.4, vol: 0.06, filter: 'bandpass', ff: 900, fq: 4, vib: 25, vibF: 9 }); break;
            case 'door': this.osc(d, t, { type: 'sawtooth', f0: 90, f1: 60, dur: 1.2, vol: 0.05, filter: 'bandpass', ff: 700, fq: 4, vib: 30, vibF: 11 }); this.nz(d, t + 1.2, { buf: 'brown', type: 'lowpass', f0: 300, dur: 0.4, vol: 0.5 }); break;
            case 'foghorn': for (const f of [98, 147]) this.osc(d, t, { type: 'sawtooth', f0: f, dur: 3.2, vol: 0.06, a: 0.5, hold: 1.8, filter: 'lowpass', ff: 480 }); break;
            case 'whale': this.osc(d, t, { f0: 300, f1: 170, glide: 1.6, dur: 3.2, vol: 0.05, a: 0.6, vib: 8, vibF: 3 }); break;
            case 'howl': this.nz(d, t, { buf: 'pink', f0: 500, f1: 900, q: 12, dur: 3.5, vol: 0.12, a: 1.2 }); break;
        }
    }
}
