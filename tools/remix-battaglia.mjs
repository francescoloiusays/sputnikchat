// Remix "d'azione" della colonna sonora per i duelli (genera public/battaglia.mp3).
// Serve solo a chi vuole rigenerarlo: npm i --no-save mpg123-decoder lamejs
// Uso: node tools/remix-battaglia.mjs public/soundtrack.mp3 public/battaglia.mp3
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { MPEGDecoder } from 'mpg123-decoder';
const require = createRequire(import.meta.url);

const [, , IN, OUT] = process.argv;
const dec = new MPEGDecoder(); await dec.ready;
const { channelData, sampleRate: SR } = dec.decode(new Uint8Array(fs.readFileSync(IN))); dec.free();
const SL = channelData[0], SRc = channelData[1];

// --- griglia ritmica del brano originale ---
const BEAT = 60 / 128, T0 = 0.443, D = 1;          // 128 BPM, primo battito, battito che apre la battuta
const barT = (b) => T0 + (D + 4 * b) * BEAT;
const START_BAR = 62, BARS = 56;                    // battute 62..117
const RATE = 1.07;                                  // un po' più veloce e incalzante
const srcStart = barT(START_BAR), srcLen = BARS * 4 * BEAT;
const N = Math.round(srcLen / RATE * SR);           // campioni del loop
const TAIL = Math.round(0.6 * SR);                  // coda che rientra all'inizio (loop senza stacchi)
const beatOut = BEAT / RATE;                        // durata del battito nel remix
console.log(`loop: ${(N / SR).toFixed(3)}s, ${N} campioni, ${(128 * RATE).toFixed(1)} BPM`);

const outL = new Float32Array(N + TAIL), outR = new Float32Array(N + TAIL);

// --- filtri biquad (RBJ) ---
function biquad(type, f, q = 0.707, gainDb = 0) {
    const w = 2 * Math.PI * f / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q), A = Math.pow(10, gainDb / 40);
    let b0, b1, b2, a0, a1, a2;
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
    else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
    else if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
    else if (type === 'ls') { const sq = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) - (A - 1) * c + sq); b1 = 2 * A * ((A - 1) - (A + 1) * c); b2 = A * ((A + 1) - (A - 1) * c - sq); a0 = (A + 1) + (A - 1) * c + sq; a1 = -2 * ((A - 1) + (A + 1) * c); a2 = (A + 1) + (A - 1) * c - sq; }
    const k = [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    return (x) => { const y = k[0] * x + k[1] * x1 + k[2] * x2 - k[3] * y1 - k[4] * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}
let seed = 1234567;
const noise = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2147483648 - 1; };

// --- musica originale: ricampionata (cubica), ripulita sui bassi e un filo saturata ---
{
    const hpL = biquad('hp', 35), hpR = biquad('hp', 35), lsL = biquad('ls', 110, 0.7, -4), lsR = biquad('ls', 110, 0.7, -4);
    const cub = (a, i) => { const i1 = Math.floor(i), t = i - i1, p0 = a[i1 - 1] || 0, p1 = a[i1] || 0, p2 = a[i1 + 1] || 0, p3 = a[i1 + 2] || 0;
        return p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0))); };
    const sat = (x) => Math.tanh(x * 1.3) / Math.tanh(1.3);
    for (let i = 0; i < N + TAIL; i++) {
        const si = (srcStart * SR) + i * RATE;
        outL[i] = sat(lsL(hpL(cub(SL, si)))) * 1.0;
        outR[i] = sat(lsR(hpR(cub(SRc, si)))) * 1.0;
    }
    // "pompaggio": la sola musica si abbassa un attimo a ogni colpo di cassa
    const duck = new Float32Array(outL.length).fill(1);
    for (let bar = 0; bar < BARS; bar++) {
        if (bar >= 12 && bar < 24) continue;
        for (let b = 0; b < 4; b++) {
            const i0 = Math.round((bar * 4 + b) * BEAT / RATE * SR);
            for (let i = 0; i < SR * 0.3; i++) { const k = i0 + i; if (k >= duck.length) break; duck[k] = Math.min(duck[k], 1 - 0.3 * Math.exp(-i / SR / 0.1) * Math.min(1, i / 200)); }
        }
    }
    for (let i = 0; i < outL.length; i++) { outL[i] *= duck[i]; outR[i] *= duck[i]; }
}

// --- suoni di batteria (one-shot) ---
const shot = (dur, fn) => { const n = Math.round(dur * SR), b = new Float32Array(n); for (let i = 0; i < n; i++) b[i] = fn(i / SR, i); return b; };
const KICK = (() => { let ph = 0; const hp = biquad('hp', 2500); return shot(0.45, (t) => { const f = 46 + 120 * Math.exp(-t / 0.04); ph += 2 * Math.PI * f / SR; const body = Math.sin(ph) * Math.exp(-t / 0.26); const click = hp(noise()) * Math.exp(-t / 0.004) * 0.6; return Math.tanh((body + click) * 1.6) * 0.95; }); })();
const SNARE = (() => { const bp = biquad('bp', 2200, 0.8), hp = biquad('hp', 900); let ph = 0; return shot(0.32, (t) => { ph += 2 * Math.PI * 185 / SR; return hp(bp(noise())) * 2.2 * Math.exp(-t / 0.11) + Math.sin(ph) * 0.5 * Math.exp(-t / 0.06); }); })();
const HAT_C = (() => { const hp = biquad('hp', 7500), hp2 = biquad('hp', 7500); return shot(0.06, (t) => hp2(hp(noise())) * Math.exp(-t / 0.018)); })();
const HAT_O = (() => { const hp = biquad('hp', 6500), hp2 = biquad('hp', 6500); return shot(0.35, (t) => hp2(hp(noise())) * Math.exp(-t / 0.12)); })();
const TOM = (() => { let ph = 0; const lp = biquad('lp', 400); return shot(0.7, (t) => { const f = 68 + 60 * Math.exp(-t / 0.06); ph += 2 * Math.PI * f / SR; return Math.tanh((Math.sin(ph) * Math.exp(-t / 0.32) + lp(noise()) * 1.5 * Math.exp(-t / 0.05)) * 1.4); }); })();
const CRASH = (() => { const hp = biquad('hp', 4500), bp = biquad('bp', 9000, 0.5); return shot(2.4, (t) => (hp(noise()) * 0.7 + bp(noise()) * 0.6) * Math.exp(-t / 0.9) * (1 - Math.exp(-t / 0.002))); })();

const kicks = [];
function hit(buf, t, gain, pan = 0) {
    const i0 = Math.round(t * SR), gl = gain * Math.min(1, 1 - pan), gr = gain * Math.min(1, 1 + pan);
    for (let i = 0; i < buf.length; i++) { const k = i0 + i; if (k < 0 || k >= outL.length) continue; outL[k] += buf[i] * gl; outR[k] += buf[i] * gr; }
}
function drum(buf, t, gain, pan) {
    // le parti che sforano oltre la fine del loop rientrano all'inizio
    hit(buf, t, gain, pan);
    if (t * SR + buf.length > N) hit(buf, t - N / SR, gain, pan);
}

// --- arrangiamento ---
const BREAK0 = 12, BREAK1 = 24; // battute (relative) del calo prima della ripresa
for (let bar = 0; bar < BARS; bar++) {
    const t0 = bar * 4 * beatOut;
    const inBreak = bar >= BREAK0 && bar < BREAK1;
    const phraseEnd = (bar + 1) % 8 === 0;
    if (bar === 0 || bar === BREAK1 || (!inBreak && bar % 8 === 0)) drum(CRASH, t0, 0.32, bar % 16 ? 0.3 : -0.3);
    for (let b = 0; b < 4; b++) {
        const t = t0 + b * beatOut;
        if (inBreak) {
            // calo: tamburi tipo taiko e charleston leggero
            if (b === 0 || (b === 2 && bar % 2)) drum(TOM, t, 0.5, 0);
            if (b === 2) drum(TOM, t + beatOut / 2, 0.32, 0.2);
            drum(HAT_C, t + beatOut / 2, 0.2, 0.35);
            continue;
        }
        drum(KICK, t, 0.62, 0); kicks.push(t);
        if (b === 1 || b === 3) drum(SNARE, t, 0.55, -0.08);
        drum(HAT_C, t, 0.17, 0.35);
        drum(HAT_O, t + beatOut / 2, 0.21, -0.3);
        if (b === 0 && bar % 2 === 0) drum(TOM, t, 0.26, 0);
        if (b === 2) drum(TOM, t + beatOut * 0.75, 0.22, 0.15);
        // rullata a fine frase
        if (phraseEnd && b === 3) for (let s = 0; s < 4; s++) drum(SNARE, t + s * beatOut / 4, 0.32 + s * 0.08, (s % 2 ? 0.2 : -0.2));
    }
}
// rullata crescente e "riser" prima della ripresa
{
    const rStart = (BREAK1 - 2) * 4 * beatOut, rEnd = BREAK1 * 4 * beatOut;
    for (let t = rStart, k = 0; t < rEnd - 1e-6; k++) {
        const prog = (t - rStart) / (rEnd - rStart);
        drum(SNARE, t, 0.2 + prog * 0.55, 0);
        t += prog < 0.5 ? beatOut / 2 : prog < 0.8 ? beatOut / 4 : beatOut / 8;
    }
    const i0 = Math.round(rStart * SR), i1 = Math.round(rEnd * SR);
    // filtro a variabili di stato: la frequenza sale senza scatti
    let lo = 0, band = 0;
    for (let i = i0; i < i1; i++) {
        const p = (i - i0) / (i1 - i0);
        const f = 2 * Math.sin(Math.PI * (400 + p * p * 7000) / SR);
        lo += f * band; const hi = noise() - lo - 0.3 * band; band += f * hi;
        const v = band * p * p * 0.35;
        outL[i] += v; outR[i] += v;
    }
    for (const t of [rEnd - beatOut / 2, rEnd - beatOut / 4]) drum(TOM, t, 0.5, 0);
}
// coda: rientra all'inizio con dissolvenza (loop senza stacchi)
for (let i = 0; i < TAIL; i++) { const g = 1 - i / TAIL; outL[i] += outL[N + i] * g * 0.6; outR[i] += outR[N + i] * g * 0.6; }
for (let i = 0; i < 600; i++) { const g = i / 600; outL[N - 600 + i] *= 1 - g * 0.15; outR[N - 600 + i] *= 1 - g * 0.15; }

// --- master: compressore + limitatore morbido + normalizzazione ---
{
    let env = 0; const att = Math.exp(-1 / (0.004 * SR)), rel = Math.exp(-1 / (0.14 * SR)), th = 0.45, ratio = 3;
    for (let i = 0; i < N; i++) {
        const x = Math.max(Math.abs(outL[i]), Math.abs(outR[i]));
        env = x > env ? att * env + (1 - att) * x : rel * env + (1 - rel) * x;
        const g = env > th ? (th + (env - th) / ratio) / env : 1;
        outL[i] = Math.tanh(outL[i] * g * 1.1); outR[i] = Math.tanh(outR[i] * g * 1.1);
    }
    let peak = 0, ss = 0;
    for (let i = 0; i < N; i++) { peak = Math.max(peak, Math.abs(outL[i]), Math.abs(outR[i])); ss += outL[i] * outL[i]; }
    const k = 0.84 / peak;
    for (let i = 0; i < N; i++) { outL[i] *= k; outR[i] *= k; }
    console.log(`picco prima ${peak.toFixed(3)}, rms finale ${(Math.sqrt(ss / N) * k).toFixed(3)}`);
}

// --- codifica MP3 ---
let lame;
try { lame = require('lamejs'); new lame.Mp3Encoder(2, SR, 128); }
catch { const vm = await import('node:vm'); const ctx = {}; vm.runInNewContext(fs.readFileSync(require.resolve('lamejs/lame.all.js'), 'utf8') + ';this.lamejs = lamejs;', ctx); lame = ctx.lamejs; }
const enc = new lame.Mp3Encoder(2, SR, 128);
const chunks = [];
const toI16 = (a, i0, i1) => { const o = new Int16Array(i1 - i0); for (let i = i0; i < i1; i++) o[i - i0] = Math.max(-32767, Math.min(32767, Math.round(a[i] * 32767))); return o; };
for (let i = 0; i < N; i += 1152) {
    const e = Math.min(N, i + 1152);
    const buf = enc.encodeBuffer(toI16(outL, i, e), toI16(outR, i, e));
    if (buf.length) chunks.push(Buffer.from(buf));
}
const fin = enc.flush(); if (fin.length) chunks.push(Buffer.from(fin));
fs.writeFileSync(OUT, Buffer.concat(chunks));
console.log(`scritto ${OUT}: ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB, LOOP_SAMPLES=${N}`);
