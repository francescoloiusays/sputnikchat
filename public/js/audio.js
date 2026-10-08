// =====================================================================
//  AUDIO: colonna sonora originale + effetti sintetizzati (WebAudio)
// =====================================================================
export class GameAudio {
    constructor() {
        this.ctx = null;
        this.musicOn = false;
        this.music = null;
        this.sfxVol = 0.5;
        this.musicVol = 0.3;
    }
    unlock() {
        if (!this.ctx) {
            try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
            this.master = this.ctx.createGain();
            this.master.gain.value = this.sfxVol;
            this.master.connect(this.ctx.destination);
            this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
            const d = this.noiseBuf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }
    setSfxVolume(v) { this.sfxVol = v; if (this.master) this.master.gain.value = v; }
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

    tone(f0, f1, dur, { type = 'sine', vol = 0.3, attack = 0.005, delay = 0 } = {}) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime + delay;
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(this.master);
        o.start(t); o.stop(t + dur + 0.05);
    }
    noise(dur, { vol = 0.3, freq = 1200, freq1, q = 1, type = 'bandpass', delay = 0 } = {}) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime + delay;
        const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
        const f = this.ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
        f.frequency.setValueAtTime(freq, t);
        if (freq1) f.frequency.exponentialRampToValueAtTime(freq1, t + dur);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(f); f.connect(g); g.connect(this.master);
        s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
    }

    play(name) {
        if (!this.ctx) return;
        switch (name) {
            case 'swing': this.noise(0.18, { vol: 0.25, freq: 600, freq1: 2400, q: 2 }); break;
            case 'hit': this.noise(0.12, { vol: 0.5, freq: 900, q: 0.8, type: 'lowpass' }); this.tone(160, 60, 0.15, { type: 'square', vol: 0.18 }); break;
            case 'heavy': this.noise(0.3, { vol: 0.7, freq: 500, q: 0.7, type: 'lowpass' }); this.tone(110, 40, 0.35, { type: 'sawtooth', vol: 0.25 }); break;
            case 'block': this.tone(900, 700, 0.12, { type: 'triangle', vol: 0.25 }); this.noise(0.08, { vol: 0.2, freq: 3000, q: 4 }); break;
            case 'jump': this.tone(220, 440, 0.15, { type: 'triangle', vol: 0.12 }); break;
            case 'dash': this.noise(0.22, { vol: 0.3, freq: 300, freq1: 3000, q: 1.5 }); break;
            case 'coin': this.tone(988, 988, 0.08, { type: 'square', vol: 0.12 }); this.tone(1319, 1319, 0.3, { type: 'square', vol: 0.12, delay: 0.08 }); break;
            case 'ui': this.tone(600, 800, 0.06, { type: 'triangle', vol: 0.12 }); break;
            case 'notify': this.tone(660, 660, 0.12, { vol: 0.18 }); this.tone(880, 880, 0.2, { vol: 0.18, delay: 0.12 }); break;
            case 'error': this.tone(220, 160, 0.25, { type: 'square', vol: 0.12 }); break;
            case 'ko': this.tone(80, 30, 1.4, { type: 'sawtooth', vol: 0.35 }); this.noise(1.2, { vol: 0.4, freq: 200, type: 'lowpass' }); break;
            case 'gong': for (const [f, d] of [[110, 2], [165, 1.6], [220, 1.2]]) this.tone(f, f * 0.98, d, { type: 'sine', vol: 0.22, attack: 0.01 }); break;
            case 'fight': this.tone(330, 660, 0.25, { type: 'sawtooth', vol: 0.2 }); this.tone(440, 880, 0.35, { type: 'square', vol: 0.12, delay: 0.1 }); break;
            case 'special': this.tone(200, 1200, 0.5, { type: 'sawtooth', vol: 0.18 }); this.noise(0.5, { vol: 0.25, freq: 800, freq1: 4000, q: 3 }); break;
            case 'fire': this.noise(0.6, { vol: 0.45, freq: 400, freq1: 1500, q: 0.8 }); break;
            case 'ice': this.tone(2400, 1800, 0.3, { type: 'triangle', vol: 0.15 }); this.tone(3200, 2600, 0.25, { type: 'sine', vol: 0.1, delay: 0.05 }); break;
            case 'thunder': this.noise(1.0, { vol: 0.8, freq: 120, type: 'lowpass' }); this.noise(0.2, { vol: 0.5, freq: 3000, q: 0.5 }); break;
            case 'splash': this.noise(0.25, { vol: 0.35, freq: 700, q: 0.6, type: 'lowpass' }); this.tone(300, 120, 0.18, { vol: 0.15 }); break;
            case 'throw': this.noise(0.15, { vol: 0.18, freq: 1000, freq1: 2200, q: 2 }); break;
            case 'step': this.noise(0.05, { vol: 0.06, freq: 300, type: 'lowpass' }); break;
        }
    }
}
