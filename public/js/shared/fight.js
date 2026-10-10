// =====================================================================
//  MOTORE DI COMBATTIMENTO 2.5D (condiviso client + server)
//  Barre vita stile Mortal Kombat, piattaforme e contraccolpo stile Smash.
//  Il server lo esegue in modo autoritativo per i duelli online;
//  il client lo usa in locale per l'allenamento contro il Fantasma.
// =====================================================================
import { computeStats, matchup, dissonance, WHEEL } from './catalog.js';

export const FIGHT = {
    DT: 1 / 60,
    ROUND_TIME: 60,
    WIN_ROUNDS: 2,
    MAX_ROUNDS: 5,
    GRAVITY: 42,
    BLAST_Y: -9,
    BLAST_X: 17,
    INTRO: 2.2,
    ROUND_END: 2.8,
    HALF_W: 0.45,
    HEIGHT: 1.85,
    PLATFORMS: [
        { x1: -9, x2: 9, y: 0, solid: true },
        { x1: -6.6, x2: -3.2, y: 3.3 },
        { x1: 3.2, x2: 6.6, y: 3.3 },
        { x1: -1.7, x2: 1.7, y: 6.2 },
    ],
};

// Bit degli input: "tenuti" (LEFT..BLOCK) e "premuti" (JUMP..DASH)
export const IN = { LEFT: 1, RIGHT: 2, UP: 4, DOWN: 8, BLOCK: 16, JUMP: 32, LIGHT: 64, HEAVY: 128, SPECIAL: 256, DASH: 512 };
export const HELD_MASK = 31;

const MOVES = {
    light: { start: 0.07, active: 0.09, rec: 0.15, dmg: 5,  kb: 3.2, grow: 5,  stun: 0.24, x: 0.25, y: 1.15, w: 0.85, h: 0.7, meter: 6 },
    heavy: { start: 0.22, active: 0.12, rec: 0.30, dmg: 11, kb: 7,   grow: 10, stun: 0.40, x: 0.25, y: 1.05, w: 1.05, h: 1.0, meter: 10, lift: 0.7, lunge: 3 },
    air:   { start: 0.08, active: 0.14, rec: 0.16, dmg: 7,  kb: 4.5, grow: 6,  stun: 0.30, x: 0.1,  y: 0.75, w: 1.0,  h: 1.2, meter: 7 },
    up:    { start: 0.09, active: 0.12, rec: 0.20, dmg: 7,  kb: 5,   grow: 7,  stun: 0.32, meter: 7, lift: 2.2, upward: true },
};

const SPECIALS = {
    fiammata: { start: 0.22, rec: 0.30 },
    gelo:     { start: 0.18, rec: 0.28 },
    passo:    { start: 0.16, active: 0.14, rec: 0.30 },
    miasma:   { start: 0.25, rec: 0.30 },
    saetta:   { start: 0.20, rec: 0.30 },
    frana:    { start: 0.32, rec: 0.35, armor: true },
    fango:    { start: 0.20, rec: 0.30 },
};

export function moveDuration(f, mv) {
    if (mv === 'sp') { const s = SPECIALS[f.special]; return s.start + (s.active || 0) + s.rec; }
    const m = MOVES[mv]; return (m.start + m.active + m.rec) / f.aspd;
}

// setup: { id, name, element, weapon, level, talents, gear } (gear = id dei capi indossati)
function makeFighter(setup, side) {
    const st = computeStats(setup);
    if (setup.boss) { st.hpMax = Math.round(st.hpMax * (setup.boss.hp || 1)); st.atk *= setup.boss.atk || 1; }
    return {
        id: setup.id, name: setup.name, side, element: st.element, special: st.special,
        atk: st.atk, def: st.def, spd: st.spd, weight: st.weight,
        reach: st.reach, aspd: st.aspd, kbm: st.kbm, meterGain: st.meterGain, effMul: st.effMul,
        maxJumps: st.maxJumps, dashMul: st.dashMul, regen: st.regen,
        tr: st.traits, leech: st.leech, airAtk: st.airAtk, cleanse: st.cleanse, glide: st.glide,
        heavyHeal: st.heavyHeal, startMeter: st.startMeter, stats: st, inf: st.inf,
        echo: st.echo, lava: st.lava, mudThrow: st.mudThrow, kbRes: st.kbRes, lightSlow: st.lightSlow, dashHit: st.dashHit, dashBuff: 0,
        vs: { dmg: 1, meter: 1, rel: 'n' }, diss: { hit: 0, sp: 0 }, lastUsed: false,
        maxHp: st.hpMax, hp: st.hpMax, meter: st.startMeter, rw: 0,
        x: 0, y: 0, vx: 0, vy: 0, facing: side === 'a' ? 1 : -1,
        st: 'idle', t: 0, mv: null, mt: 0, hit: false, spFired: false,
        grounded: true, jumps: 2, inv: 0, burn: 0, slow: 0, poison: 0, dirty: 0,
        dashCd: 0, drop: 0, combo: 0, comboT: 0, armor: false,
    };
}

function resetFighter(f, x) {
    Object.assign(f, {
        x, y: 0, vx: 0, vy: 0, facing: x < 0 ? 1 : -1, hp: f.maxHp, st: 'idle', t: 0, mv: null, mt: 0,
        hit: false, spFired: false, grounded: true, jumps: f.maxJumps, inv: 0, burn: 0, slow: 0, poison: 0, dirty: 0,
        dashCd: 0, drop: 0, combo: 0, comboT: 0, armor: false,
    });
}

// Dado della Dissonanza: generatore con seme salvato nello stato, così il duello è riproducibile
function rand(S) {
    S.rs = (S.rs + 0x6D2B79F5) | 0;
    let t = Math.imul(S.rs ^ (S.rs >>> 15), 1 | S.rs);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function createDuel(setupA, setupB, seed = (Math.random() * 2 ** 31) | 0) {
    const S = {
        phase: 'intro', pt: 0, round: 1, timer: FIGHT.ROUND_TIME, time: 0, rs: seed | 0,
        f: { a: makeFighter(setupA, 'a'), b: makeFighter(setupB, 'b') },
        proj: [], zones: [], bolts: [], echoes: [], winner: null, roundWinner: null,
    };
    // Ruota dei Semi: vantaggi e Dissonanza dipendono da chi si ha davanti
    for (const [me, foe] of [[S.f.a, S.f.b], [S.f.b, S.f.a]]) {
        me.vs = matchup(me.element, foe.element);
        me.diss = dissonance(me.stats, foe.element);
    }
    resetFighter(S.f.a, -4); resetFighter(S.f.b, 4);
    return S;
}

// Danno a un duellante (Ultimo Respiro: una volta per duello resta a 1 punto vita)
function hurt(S, f, dmg, ev) {
    f.hp -= dmg;
    if (f.hp <= 0 && f.tr.ultimo && !f.lastUsed && S.phase === 'fight') {
        f.hp = 1; f.lastUsed = true; f.inv = Math.max(f.inv, 0.6);
        ev.push({ t: 'last', s: f.side, x: f.x, y: f.y + 1.6 });
    }
}

const other = s => (s === 'a' ? 'b' : 'a');
const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
const overlap = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
const hurtbox = f => ({ x1: f.x - FIGHT.HALF_W, x2: f.x + FIGHT.HALF_W, y1: f.y, y2: f.y + FIGHT.HEIGHT });

// --- PASSO DI SIMULAZIONE ---
export function stepDuel(S, inputs, dt = FIGHT.DT) {
    const ev = [];
    const A = S.f.a, B = S.f.b;
    S.time += dt; S.pt += dt;

    if (S.phase === 'intro') {
        physics(S, A, dt, ev); physics(S, B, dt, ev);
        if (S.pt >= FIGHT.INTRO) { S.phase = 'fight'; S.pt = 0; ev.push({ t: 'go' }); }
        return ev;
    }
    if (S.phase === 'fight') {
        S.timer -= dt;
        control(S, A, B, inputs.a || {}, dt, ev);
        control(S, B, A, inputs.b || {}, dt, ev);
        physics(S, A, dt, ev); physics(S, B, dt, ev);
        updateAttack(S, A, B, dt, ev); updateAttack(S, B, A, dt, ev);
        updateProjectiles(S, dt, ev);
        status(S, A, dt, ev); status(S, B, dt, ev);
        checkRoundEnd(S, ev);
        return ev;
    }
    if (S.phase === 'roundEnd') {
        physics(S, A, dt, ev); physics(S, B, dt, ev);
        if (S.pt >= FIGHT.ROUND_END) {
            if (A.rw >= FIGHT.WIN_ROUNDS || B.rw >= FIGHT.WIN_ROUNDS || S.round >= FIGHT.MAX_ROUNDS) {
                S.phase = 'over'; S.pt = 0;
                S.winner = A.rw > B.rw ? 'a' : B.rw > A.rw ? 'b' : null;
                if (S.winner) S.f[S.winner].st = 'win';
                ev.push({ t: 'over', w: S.winner });
            } else {
                S.round++; S.phase = 'intro'; S.pt = 0; S.timer = FIGHT.ROUND_TIME;
                S.proj.length = 0; S.zones.length = 0; S.bolts.length = 0; S.echoes.length = 0; S.roundWinner = null;
                const ma = A.meter, mb = B.meter;
                resetFighter(A, -4); resetFighter(B, 4);
                A.meter = Math.max(ma, A.startMeter); B.meter = Math.max(mb, B.startMeter);
                ev.push({ t: 'round', n: S.round });
            }
        }
        return ev;
    }
    physics(S, A, dt, ev); physics(S, B, dt, ev);
    return ev;
}

function checkRoundEnd(S, ev) {
    const A = S.f.a, B = S.f.b;
    const koA = A.hp <= 0, koB = B.hp <= 0;
    if (!koA && !koB && S.timer > 0) return;
    let w = null;
    if (koA && !koB) w = 'b';
    else if (koB && !koA) w = 'a';
    else if (!koA && !koB) {
        const ra = A.hp / A.maxHp, rb = B.hp / B.maxHp;
        w = Math.abs(ra - rb) < 0.001 ? null : ra > rb ? 'a' : 'b';
    }
    if (koA) { A.hp = 0; A.st = 'ko'; A.mv = null; }
    if (koB) { B.hp = 0; B.st = 'ko'; B.mv = null; }
    S.roundWinner = w;
    if (w) {
        S.f[w].rw++;
        if (S.f[w].st !== 'ko') { S.f[w].st = 'win'; S.f[w].mv = null; }
    }
    S.phase = 'roundEnd'; S.pt = 0;
    S.proj.length = 0; S.zones.length = 0; S.bolts.length = 0;
    const perfect = w && S.f[w].hp >= S.f[w].maxHp;
    ev.push({ t: koA || koB ? 'ko' : 'time', w, p: perfect ? 1 : 0 });
}

function control(S, f, o, inp, dt, ev) {
    const held = inp.h | 0, pr = inp.p | 0;
    f.drop = Math.max(0, f.drop - dt);
    f.dashCd = Math.max(0, f.dashCd - dt);
    if (f.st === 'ko' || f.st === 'win') return;
    if (f.st === 'stun' || f.st === 'frozen') {
        f.t -= dt;
        if (f.t <= 0) f.st = f.grounded ? 'idle' : 'air';
        return;
    }
    if (f.st === 'dash') {
        f.t -= dt;
        if (f.t <= 0) { f.st = f.grounded ? 'idle' : 'air'; f.vx *= 0.35; }
        return;
    }
    if (f.st === 'atk') {
        // Combo: un attacco leggero andato a segno si può cancellare nel successivo
        if (f.mv === 'light' && f.hit && (pr & (IN.LIGHT | IN.HEAVY)) && f.mt > (MOVES.light.start + MOVES.light.active * 0.5) / f.aspd) {
            startAttack(f, (pr & IN.HEAVY) ? 'heavy' : 'light');
        }
        return;
    }
    const dir = ((held & IN.RIGHT) ? 1 : 0) - ((held & IN.LEFT) ? 1 : 0);
    if (Math.abs(o.x - f.x) > 0.05) f.facing = o.x > f.x ? 1 : -1;

    if ((held & IN.BLOCK) && f.grounded) {
        f.st = 'block';
        return;
    }
    if (f.st === 'block') f.st = 'idle';

    // la SUPER non parte se si è sporchi di fango
    if ((pr & IN.SPECIAL) && f.meter >= 50 && f.dirty <= 0) {
        // Dissonanza: la SUPER può dissolversi (restituisce metà della barra)
        if (f.diss.sp > 0 && rand(S) < f.diss.sp) {
            f.meter -= 25; f.st = 'stun'; f.t = 0.35; f.mv = null;
            ev.push({ t: 'fizz', s: f.side, x: f.x, y: f.y + 1.9, sp: 1 });
            return;
        }
        f.meter -= 50; startAttack(f, 'sp');
        ev.push({ t: 'sp', s: f.side, k: f.special, pure: f.tr.puro ? 1 : 0 });
        return;
    }
    if (pr & IN.HEAVY) { startAttack(f, f.grounded ? 'heavy' : 'air'); return; }
    if (pr & IN.LIGHT) { startAttack(f, (held & IN.UP) ? 'up' : f.grounded ? 'light' : 'air'); return; }
    if ((pr & IN.DASH) && f.dashCd <= 0) {
        f.st = 'dash'; f.t = 0.18;
        f.vx = (dir || f.facing) * 16 * f.dashMul;
        if (!f.grounded) f.vy = Math.max(f.vy, 1);
        f.inv = Math.max(f.inv, 0.12); f.dashCd = 0.55;
        if (f.dashHit) f.dashBuff = 1.2;   // Tuono di Ritorno
        ev.push({ t: 'dash', s: f.side });
        return;
    }
    if (pr & IN.JUMP) {
        const onSolid = f.grounded && f.y <= 0.01 && Math.abs(f.x) <= 9.2;
        if (f.grounded && (held & IN.DOWN) && !onSolid) { f.drop = 0.3; f.grounded = false; f.y -= 0.05; }
        else if (f.jumps > 0) {
            f.vy = f.grounded ? 15.5 : 13.5; f.jumps--; f.grounded = false;
            ev.push({ t: 'jump', s: f.side, d: f.jumps < f.maxJumps - 1 ? 1 : 0 });
        }
    } else if (f.grounded && (held & IN.DOWN) && (held & IN.UP) === 0 && f.y > 0.01) {
        // giù su piattaforma sottile = scendi
        f.drop = 0.3; f.grounded = false; f.y -= 0.05;
    }
    // Ali di Pipistrello: tenendo premuto su mentre si cade si plana
    if (f.glide && !f.grounded && (held & IN.UP) && f.vy < -4) f.vy = -4;
    const slow = f.slow > 0 ? 0.6 : 1;
    const maxV = 7.2 * f.spd * slow;
    f.vx = approach(f.vx, dir * maxV, (f.grounded ? 60 : 32) * dt);
    f.st = f.grounded ? (dir ? 'run' : 'idle') : 'air';
}

function startAttack(f, mv) {
    f.st = 'atk'; f.mv = mv; f.mt = 0; f.hit = false; f.spFired = false;
    f.armor = mv === 'sp' && !!SPECIALS[f.special].armor;
    if (mv === 'sp' && f.special === 'passo') f.inv = Math.max(f.inv, SPECIALS.passo.start + 0.05);
}

function physics(S, f, dt, ev) {
    if (f.st === 'frozen') { f.vx = 0; if (f.vy > 0) f.vy = 0; }
    const friction = f.grounded && f.st !== 'run' && f.st !== 'dash';
    if (friction) f.vx = approach(f.vx, 0, (f.st === 'stun' ? 18 : 40) * dt);
    if (f.st !== 'dash') f.vy = Math.max(-26, f.vy - FIGHT.GRAVITY * dt);
    const py = f.y;
    f.x += f.vx * dt; f.y += f.vy * dt;
    f.grounded = false;
    if (f.vy <= 0) {
        for (const p of FIGHT.PLATFORMS) {
            if (f.x >= p.x1 - 0.2 && f.x <= p.x2 + 0.2 && py >= p.y - 0.001 && f.y <= p.y && (p.solid || f.drop <= 0)) {
                if (f.st === 'stun' && f.vy < -14) { f.vy = -f.vy * 0.35; f.y = p.y; break; } // rimbalzo
                f.y = p.y; f.vy = 0; f.grounded = true; f.jumps = f.maxJumps;
                if (f.st === 'air') f.st = 'idle';
                break;
            }
        }
    }
    // Caduta fuori dall'arena (stile Smash)
    if (f.y < FIGHT.BLAST_Y || Math.abs(f.x) > FIGHT.BLAST_X) {
        if (S.phase !== 'fight') { f.x = 0; f.y = 8; f.vx = f.vy = 0; return; }
        const dmg = Math.round(f.maxHp * 0.12 * (f.tr.pelledura ? 0.8 : 1));
        hurt(S, f, dmg, ev);
        ev.push({ t: 'fall', s: f.side, d: dmg });
        f.x = 0; f.y = 8.5; f.vx = 0; f.vy = 0; f.inv = 1.2; f.burn = 0; f.slow = 0;
        if (f.st !== 'ko') { f.st = 'air'; f.mv = null; }
    }
}

function attackBox(f, m) {
    if (m.upward) {
        const r = 0.6 + f.reach * 0.3;
        return { x1: f.x - r, x2: f.x + r, y1: f.y + 1.3, y2: f.y + 2.5 + f.reach * 0.4 };
    }
    const near = f.x + f.facing * m.x;
    const far = f.x + f.facing * (m.x + m.w + f.reach);
    return { x1: Math.min(near, far), x2: Math.max(near, far), y1: f.y + m.y - m.h / 2, y2: f.y + m.y + m.h / 2 };
}

function updateAttack(S, f, o, dt, ev) {
    if (f.st !== 'atk') return;
    f.mt += dt;
    if (f.mv === 'sp') { updateSpecial(S, f, o, ev); return; }
    const m = MOVES[f.mv];
    const s = m.start / f.aspd, a = m.active / f.aspd, r = m.rec / f.aspd;
    if (m.lunge && f.mt >= s && f.mt - dt < s) f.vx += f.facing * m.lunge;
    if (!f.hit && f.mt >= s && f.mt < s + a) {
        if (o.st !== 'ko' && o.inv <= 0 && overlap(attackBox(f, m), hurtbox(o))) {
            f.hit = true;
            applyHit(S, f, o, {
                dmg: m.dmg, kb: m.kb, grow: m.grow, stun: m.stun, meter: m.meter,
                dir: m.upward ? (o.x >= f.x ? 1 : -1) * 0.3 : f.facing, lift: m.lift, heavy: f.mv === 'heavy', src: f.mv,
            }, ev);
        }
    }
    if (f.mt >= s + a + r) endAttack(f);
}

function endAttack(f) { f.st = f.grounded ? 'idle' : 'air'; f.mv = null; f.armor = false; }

function updateSpecial(S, f, o, ev) {
    const sp = SPECIALS[f.special];
    if (!f.spFired && f.mt >= sp.start) {
        f.spFired = true; f.armor = false;
        const fx = f.facing;
        switch (f.special) {
            case 'fiammata':
                S.proj.push({ k: 'fire', o: f.side, x: f.x + fx * 0.7, y: f.y + 1.2, vx: fx * 13, vy: 0, g: 0, life: 1.6, r: 0.45, dmg: 12, kb: 6, grow: 6, eff: 'burn' });
                break;
            case 'gelo':
                S.proj.push({ k: 'ice', o: f.side, x: f.x + fx * 0.7, y: f.y + 1.2, vx: fx * 16, vy: 0, g: 0, life: 1.3, r: 0.35, dmg: 7, kb: 1.5, grow: 2, eff: 'freeze' });
                break;
            case 'passo': {
                const bx = o.x - (o.facing || 1) * 1.1;
                f.x = Math.max(-12, Math.min(12, bx)); f.y = o.y; f.vy = 0; f.vx = 0;
                f.facing = o.x >= f.x ? 1 : -1;
                ev.push({ t: 'tp', s: f.side, x: f.x, y: f.y });
                break;
            }
            case 'miasma':
                S.zones.push({ k: 'poison', o: f.side, x: f.x + fx * 2.2, y: f.y, w: 3.2, h: 2.4, life: 3.2, dps: 5 });
                f.hp = Math.min(f.maxHp, f.hp + 10);
                ev.push({ t: 'heal', s: f.side, d: 10 });
                break;
            case 'saetta':
                S.bolts.push({ o: f.side, x: o.x, delay: 0.5 });
                break;
            case 'frana':
                for (const d of [-1, 1]) S.proj.push({ k: 'rock', o: f.side, x: f.x + d * 0.6, y: f.y + 0.5, vx: d * 11, vy: 0, g: 0, life: 0.75, r: 0.6, dmg: 12, kb: 8, grow: 7, lift: 1.1 });
                ev.push({ t: 'quake', s: f.side });
                break;
            case 'fango':
                for (const vy of [2, 5, 8]) S.proj.push({ k: 'mud', o: f.side, x: f.x + fx * 0.6, y: f.y + 1.3, vx: fx * 12, vy, g: 20, life: 1.4, r: 0.35, dmg: 6, kb: 2.5, grow: 3, eff: 'slow' });
                break;
        }
    }
    // Finestra di colpo del Passo Fantasma
    if (f.special === 'passo' && f.spFired && !f.hit && f.mt < sp.start + sp.active) {
        const box = attackBox(f, MOVES.heavy);
        if (o.st !== 'ko' && o.inv <= 0 && overlap(box, hurtbox(o))) {
            f.hit = true;
            applyHit(S, f, o, { dmg: 12, kb: 6.5, grow: 8, stun: 0.45, meter: 0, dir: f.facing, lift: 0.8, heavy: true, src: 'passo' }, ev);
        }
    }
    if (f.mt >= sp.start + (sp.active || 0) + sp.rec) endAttack(f);
}

function updateProjectiles(S, dt, ev) {
    for (let i = S.proj.length - 1; i >= 0; i--) {
        const p = S.proj[i];
        p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        const owner = S.f[p.o], tgt = S.f[other(p.o)];
        const box = { x1: p.x - p.r, x2: p.x + p.r, y1: p.y - p.r, y2: p.y + p.r };
        if (tgt.st !== 'ko' && tgt.inv <= 0 && overlap(box, hurtbox(tgt))) {
            applyHit(S, owner, tgt, { dmg: p.dmg, kb: p.kb, grow: p.grow, stun: 0.35, meter: 6, dir: Math.sign(p.vx) || 1, lift: p.lift, eff: p.eff, heavy: p.k === 'rock', src: p.k }, ev);
            ev.push({ t: 'pop', k: p.k, x: p.x, y: p.y });
            S.proj.splice(i, 1); continue;
        }
        const hitGround = p.k === 'mud' && p.y <= 0.1 && Math.abs(p.x) <= 9;
        if (p.life <= 0 || hitGround) {
            if (hitGround) ev.push({ t: 'pop', k: p.k, x: p.x, y: 0.1 });
            S.proj.splice(i, 1);
        }
    }
    for (let i = S.zones.length - 1; i >= 0; i--) {
        const z = S.zones[i];
        z.life -= dt;
        const tgt = S.f[other(z.o)];
        const box = { x1: z.x - z.w / 2, x2: z.x + z.w / 2, y1: z.y - 0.3, y2: z.y + z.h };
        if (tgt.st !== 'ko' && overlap(box, hurtbox(tgt))) {
            if (z.k === 'lava') tgt.burn = Math.max(tgt.burn, 0.3);
            else if (!tgt.cleanse) tgt.poison = 0.25;
        }
        if (z.life <= 0) S.zones.splice(i, 1);
    }
    for (let i = S.echoes.length - 1; i >= 0; i--) {
        const e = S.echoes[i];
        e.t -= dt;
        if (e.t > 0) continue;
        S.echoes.splice(i, 1);
        const owner = S.f[e.o], tgt = S.f[other(e.o)];
        if (tgt.st !== 'ko' && tgt.inv <= 0) { applyHit(S, owner, tgt, { dmg: e.dmg, kb: 1.5, grow: 1, stun: 0.2, meter: 0, dir: tgt.x >= owner.x ? 1 : -1, src: 'echo', echoed: true }, ev); ev.push({ t: 'pop', k: 'echo', x: tgt.x, y: tgt.y + 1.2 }); }
    }
    for (let i = S.bolts.length - 1; i >= 0; i--) {
        const b = S.bolts[i];
        b.delay -= dt;
        if (b.delay <= 0) {
            const owner = S.f[b.o], tgt = S.f[other(b.o)];
            ev.push({ t: 'bolt', x: b.x });
            if (tgt.st !== 'ko' && tgt.inv <= 0 && Math.abs(tgt.x - b.x) < 0.95) {
                applyHit(S, owner, tgt, { dmg: 15, kb: 3, grow: 4, stun: 0.7, meter: 6, dir: tgt.x >= owner.x ? 1 : -1, lift: 1.2, heavy: true, unblockable: true, src: 'bolt' }, ev);
            }
            S.bolts.splice(i, 1);
        }
    }
}

const BASIC = { light: 1, heavy: 1, air: 1, up: 1 };
const SPECIAL_SRC = { fire: 1, ice: 1, rock: 1, mud: 1, bolt: 1, passo: 1 };
function applyHit(S, att, def, o, ev) {
    if (def.inv > 0 || def.st === 'ko') return;
    const blocking = def.st === 'block' && def.facing === -Math.sign(o.dir) && !o.unblockable;
    // Ruota dei Semi: vantaggio o svantaggio contro il seme dell'avversario
    let dmg = o.dmg * att.atk * att.vs.dmg * (1 - def.def);
    const combo = att.comboT > 0 ? att.combo + 1 : 1;
    if (att.tr.slancio && o.src === 'light' && combo >= 3) dmg *= 1.2;
    if (att.tr.furia && att.hp < att.maxHp * 0.3) dmg *= 1.15;
    if (att.airAtk && (o.src === 'air' || !att.grounded)) dmg *= 1 + att.airAtk;
    if (att.dashBuff > 0 && BASIC[o.src]) { dmg *= 1 + att.dashHit; att.dashBuff = 0; }
    // Dissonanza: un colpo normale a volte sfrigola (metà danno, niente carica)
    const fizz = !!BASIC[o.src] && att.diss.hit > 0 && rand(S) < att.diss.hit;
    if (fizz) { dmg *= 0.5; ev.push({ t: 'fizz', s: att.side, x: def.x, y: def.y + 1.9 }); }
    if (blocking) {
        dmg *= att.tr.spaccascudi && o.heavy ? 0.5 : 0.2;
        hurt(S, def, dmg, ev); def.vx = Math.sign(o.dir) * 3;
        def.meter = Math.min(100, def.meter + 4); if (!fizz) att.meter = Math.min(100, att.meter + 2);
        ev.push({ t: 'block', s: def.side, x: def.x, y: def.y + 1.1 });
        return;
    }
    hurt(S, def, dmg, ev);
    if (!fizz) att.meter = Math.min(100, att.meter + (o.meter || 0) * att.meterGain * att.vs.meter);
    def.meter = Math.min(100, def.meter + dmg * 0.6);
    att.combo = combo; att.comboT = 1.1;
    if (att.leech) att.hp = Math.min(att.maxHp, att.hp + dmg * att.leech);
    if (att.heavyHeal && o.heavy) { att.hp = Math.min(att.maxHp, att.hp + att.heavyHeal); ev.push({ t: 'heal', s: att.side, d: att.heavyHeal }); }
    ev.push({ t: 'hit', s: def.side, x: def.x, y: def.y + 1.1, d: Math.round(dmg), h: o.heavy ? 1 : 0, c: att.combo, k: o.src, a: att.vs.dmg > 1 ? 1 : 0 });
    // Parole di Runa
    if (att.echo && SPECIAL_SRC[o.src] && !o.echoed) S.echoes.push({ o: att.side, t: 0.35, dmg: o.dmg * att.echo });
    if (att.lava && o.src === 'heavy') S.zones.push({ k: 'lava', o: att.side, x: def.x, y: Math.max(0, def.y - 0.2), w: 2.2, h: 0.7, life: 2, dps: 0 });
    if (att.lightSlow && o.src === 'light' && !def.cleanse) def.slow = Math.max(def.slow, att.lightSlow * att.effMul);
    if (att.mudThrow && o.src === 'light' && rand(S) < att.mudThrow) S.proj.push({ k: 'mud', o: att.side, x: att.x + att.facing * 0.6, y: att.y + 1.3, vx: att.facing * 12, vy: 3, g: 20, life: 1.2, r: 0.35, dmg: 3, kb: 2, grow: 2, eff: 'slow' });
    const em = att.effMul;
    // Infusione dell'Altare: il colpo pesante porta l'effetto del seme infuso (doppio se è l'opposto del tuo)
    let kbInf = 1;
    if (att.inf && o.src === 'heavy' && !fizz) {
        const k = att.inf.k, T = 1.2 * k * em;   // durata del fango
        switch (att.inf.el) {
            case 'fuoco': def.burn = Math.max(def.burn, 0.7 * k * em); break;
            case 'ghiaccio': if (!def.cleanse) def.slow = Math.max(def.slow, 1.2 * k * em); break;
            case 'palude': if (!def.cleanse) def.poison = Math.max(def.poison, 0.4 * k * em); break;
            case 'pietra': kbInf = 1 + 0.2 * k; break;
            case 'tempesta': hurt(S, def, 2 * k, ev); break;
            case 'spettro': att.hp = Math.min(att.maxHp, att.hp + dmg * 0.2 * k); break;
            case 'fango': if (def.dirty <= 0) ev.push({ t: 'dirty', s: def.side, x: def.x, y: def.y + 1.9 }); def.dirty = Math.max(def.dirty, T); break;
        }
        ev.push({ t: 'inf', e: att.inf.el, x: def.x, y: def.y + 1.2, k });
    }
    if (o.eff === 'burn') def.burn = 3 * em;
    if (o.eff === 'slow' && !def.cleanse) def.slow = 2.2 * em;
    // Il fango sporca il seme: per qualche secondo niente SUPER e niente rigenerazione
    if (o.src === 'mud') { if (def.dirty <= 0) ev.push({ t: 'dirty', s: def.side, x: def.x, y: def.y + 1.9 }); def.dirty = WHEEL.MUD_TIME * em; }
    if (def.armor) return; // super armatura (Frana)
    const ratio = 1 - Math.max(0, def.hp) / def.maxHp;
    const kb = (o.kb + o.grow * ratio) * att.kbm * kbInf / def.weight * (def.tr.radici ? 0.75 : 1) * (1 - (def.kbRes || 0));
    def.vx = o.dir * kb; // dir = ±1, oppure ±0.3 per l'attacco verso l'alto
    def.vy = kb * (o.lift ?? 0.45) + 2;
    def.grounded = false; def.mv = null; def.armor = false;
    if (o.eff === 'freeze') { def.st = 'frozen'; def.t = 1.3 * em; def.vx = 0; def.vy = Math.min(def.vy, 0); }
    else { def.st = 'stun'; def.t = o.stun * (0.8 + ratio * 0.6); }
}

function status(S, f, dt, ev) {
    f.inv = Math.max(0, f.inv - dt);
    f.slow = Math.max(0, f.slow - dt);
    f.dirty = Math.max(0, f.dirty - dt);
    f.dashBuff = Math.max(0, f.dashBuff - dt);
    f.comboT = Math.max(0, f.comboT - dt);
    if (f.comboT <= 0) f.combo = 0;
    if (f.st === 'ko') return;
    if (f.burn > 0) { f.burn -= dt; hurt(S, f, 3 * dt, ev); }
    if (f.poison > 0) { f.poison -= dt; hurt(S, f, 5 * dt, ev); }
    if (f.regen && f.hp > 0 && f.dirty <= 0) f.hp = Math.min(f.maxHp, f.hp + f.regen * dt);
}

// --- SNAPSHOT DI RETE ---
const r2 = v => Math.round(v * 100) / 100;
export function snapshotDuel(S, ev) {
    const fs = ['a', 'b'].map(s => {
        const f = S.f[s];
        const flags = (f.burn > 0 ? 1 : 0) | (f.st === 'frozen' ? 2 : 0) | (f.slow > 0 ? 4 : 0) | (f.poison > 0 ? 8 : 0) | (f.inv > 0 ? 16 : 0) | (f.armor ? 32 : 0) | (f.dirty > 0 ? 64 : 0);
        return [r2(f.x), r2(f.y), f.facing, Math.round(Math.max(0, f.hp) * 10) / 10, f.maxHp, Math.round(f.meter), f.st, f.mv || '', r2(f.mt), f.rw, flags, f.combo, f.grounded ? 1 : 0];
    });
    return {
        ph: S.phase, pt: r2(S.pt), r: S.round, tm: Math.max(0, Math.ceil(S.timer)), w: S.winner, rw: S.roundWinner,
        f: fs,
        p: S.proj.map(p => [p.k, r2(p.x), r2(p.y)]),
        z: S.zones.map(z => [z.k, r2(z.x), r2(z.y), z.w, r2(z.life)]),
        b: S.bolts.map(b => [r2(b.x), r2(b.delay)]),
        ev: ev || [],
    };
}
export function readFighter(a) {
    return { x: a[0], y: a[1], facing: a[2], hp: a[3], maxHp: a[4], meter: a[5], st: a[6], mv: a[7], mt: a[8], rw: a[9], flags: a[10], combo: a[11], grounded: !!a[12] };
}

// --- IL FANTASMA (bot di allenamento) ---
export function createBot(level = 1) { return { level, think: 0, h: 0 }; }

export function botInput(S, side, bot, dt) {
    if (S.phase !== 'fight') return { h: 0, p: 0 };
    const f = S.f[side], o = S.f[other(side)];
    bot.think -= dt;
    let p = 0;
    if (bot.think > 0) return { h: bot.h, p: 0 };
    const L = bot.level;
    bot.think = 0.09 + 0.22 / L + Math.random() * 0.1;
    const dx = o.x - f.x, adx = Math.abs(dx), dy = o.y - f.y;
    const toward = dx > 0 ? IN.RIGHT : IN.LEFT;
    let h = 0;
    if (f.y < -0.3 || Math.abs(f.x) > 9.3) {
        // Recupero: torna sul palco
        h |= f.x > 0 ? IN.LEFT : IN.RIGHT;
        if (f.vy < 3 && f.jumps > 0) p |= IN.JUMP;
        else if (f.dashCd <= 0 && Math.random() < 0.3) p |= IN.DASH;
    } else {
        const range = 1.25 + f.reach;
        const ranged = ['fiammata', 'gelo', 'fango', 'saetta'].includes(f.special);
        if (o.st === 'atk' && adx < 2.8 && Math.random() < 0.28 * L) h |= IN.BLOCK;
        else if (f.meter >= 50 && ranged && adx > 3 && adx < 10 && Math.random() < 0.25 * L) p |= IN.SPECIAL;
        else if (adx > range) {
            h |= toward;
            if (dy > 1.5 && f.grounded && Math.random() < 0.6) p |= IN.JUMP;
            if (adx > 6 && Math.random() < 0.08 * L) p |= IN.DASH;
        } else {
            const r = Math.random();
            if (f.meter >= 50 && !ranged && r < 0.3) p |= IN.SPECIAL;
            else if (dy > 1.2) { h |= IN.UP; p |= IN.LIGHT; }
            else if (r < 0.45) p |= IN.LIGHT;
            else if (r < 0.65) p |= IN.HEAVY;
            else if (r < 0.75) p |= IN.JUMP;
            else if (r < 0.85) h |= toward ^ (IN.LEFT | IN.RIGHT); // arretra
        }
        // non buttarti di sotto
        if ((h & IN.LEFT) && f.x < -8.4 && f.grounded) h &= ~IN.LEFT;
        if ((h & IN.RIGHT) && f.x > 8.4 && f.grounded) h &= ~IN.RIGHT;
    }
    bot.h = h & HELD_MASK;
    return { h: bot.h, p };
}
