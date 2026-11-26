// =====================================================================
//  SPUTNIKCHAT 3D — Server di gioco
//  Profili, Sputnik Coin, botteghe, Bazar, amici, sessioni private,
//  duelli autoritativi con scommesse, classifica globale, voice chat.
// =====================================================================
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { createStore } from './server/store.js';
import {
    ECONOMY, ITEMS, ELEMENTS, STARTER_WEAPON, sanitizeAppearance, sanitizeCard, sanitizeWeaponSpec,
    weaponCost, cleanText, levelFromWins, isCardImage,
    XP, levelFromXp, xpForLevel, titleFor, sanitizeTalents, talentPoints, TALENTS, TALENT_IDS, TALENT_CAP,
    itemLevel, weaponLevel, computeStats, RESPEC_COST, ALTAR,
    MATS, ESS_DAILY, PRACTICE_ESS_DAILY, SEALS, SEAL_CHANCE, CARD_GRADES, sealSlots, resolveMats,
    ENCHANT, enchantCap, enchantMats, ALTAR_LEVEL, INFUSE_LEVEL, INFUSE_COST, FUSE, BLESSING,
    GATHER, FISH, FISH_SPOT, FISH_DAILY, FISH_RARITY, DIARY, isNight, rollFish, plusOf,
    FISH_IDS, STONES, boneCost, romeTime, weekOf, seasonOf, seasonEnds, LEAGUES, leagueOf, RANKED_LEVEL, isFriday, TITLES,
    CANTO, CANTO_SEEDS, cantoMinMs, cantoSeq, GRAVES, GRAVES_LEVEL, GRAVES_CURSED, graveNeighbors,
    BOUNTY_BOARD, BOUNTIES, WEEKLY, BOUNTY_REWARD, rollBounties, FOUNTAIN, WISHES, TOLL, ONDA, inWhiteRoom, PHONE_SPOT,
    SOCKETS, SOCKET_CLEAR, RUNEWORDS, runeWordOf, VEGLIA, vegliaOpen, KING, REBIRTH, QUADRI_COINS,
} from './public/js/shared/catalog.js';
import { INSULTS, TOLL_START, TOLL_LINES, NPCS, ONDA_Q, ONDA_PLOT, TABLETS, MISSIONS, PHONE_LINES, QUADRI } from './public/js/shared/lore.js';
import { createDuel, stepDuel, snapshotDuel, FIGHT, HELD_MASK } from './public/js/shared/fight.js';
import { STORY, STORY_END, STORY_SPOTS, WAYS, newStory, chapterReady, nomeVero } from './public/js/shared/story.js';
import { L2_CHAPTERS, L2_SPOTS, newL2, fixL2, l2Step } from './public/js/shared/libro2.js';
import { PETS, PET_LEVEL, PET_MAX_LV, PET_ADOPT, PET_MAX_ENCH, PET_ENCH, PET_ENCH_LV, TRAIN, petXpToNext, petMaxHealth, petWear, petDuel, petFish, petTired, healCost, newPet } from './public/js/shared/pet.js';
import { ERRANTI, erranteAt } from './public/js/shared/erranti.js';
import { gente, genteAt, premio, bottinoOggetto, GENTI_PER_DAY, GENTI_FIGHT_DAILY } from './public/js/shared/genti.js';
import { islandNight } from './public/js/shared/clock.js';
// è notte quando è notte sull'isola: conta solo il ciclo del gioco (24 minuti), mai l'ora vera
const nightNow = () => islandNight() || process.env.SPUTNIK_NOTTE === '1';
import { RIVA_GAMES, rivaPrize } from './public/js/shared/riva-vita.js';
import { nearRiva } from './public/js/shared/riva.js';
import { PALESTRA, ATTREZZI, GYM_DAILY, GYM_MAX, GYM_MIN_MS, gymToNext, gymReward, npcForma, npcFighters, npcLevel, inPalestra } from './public/js/shared/palestra.js';
import { casaDiRob, cleanCasa, casaValue, casaCount, bauleUsed, inCasa, BAULE_SLOTS } from './public/js/shared/casa.js';
import { ROB_CHAPTERS, ROB_SPOTS, ROB_LEVEL, newRob, robStep } from './public/js/shared/rob.js';
import { RESERVE_WEAPON, RENTALS, weaponDurability, weaponWearLeft, repairCost } from './public/js/shared/catalog.js';
import { RODS, rodOf, CORAL_CHANCE, TRADES, tradesOfDay, itemOfDay, tonicXp, itemTradeValue, TONIC_DAILY, ITEM_TRADES_DAILY } from './public/js/shared/mare.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;
const store = await createStore(__dirname);

// --- FILE STATICI (sostituisce express) ---
const MIME = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
    '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};
const server = http.createServer((req, res) => {
    let p;
    try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
    if (p === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true, online: online.size, duels: duels.size, store: store.kind, save: SAVE_KEYS[0][0], accounts: accIndex.size }));
        return;
    }
    if (p === '/' || p.endsWith('/')) p += 'index.html';
    const file = path.normalize(path.join(PUBLIC, p));
    if (!file.startsWith(PUBLIC)) { res.writeHead(403).end(); return; }
    fs.stat(file, (err, st) => {
        if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Non trovato'); return; }
        const head = { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' };
        // richieste parziali: servono all'audio per conoscere la durata e riavvolgere il loop
        const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
        if (m) {
            const start = m[1] ? +m[1] : Math.max(0, st.size - +m[2]);
            const end = m[1] && m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
            if (start > end || start >= st.size) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }).end(); return; }
            res.writeHead(206, { ...head, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
            fs.createReadStream(file, { start, end }).pipe(res);
            return;
        }
        res.writeHead(200, { ...head, 'Content-Length': st.size });
        fs.createReadStream(file).pipe(res);
    });
});

const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] }, maxHttpBufferSize: 2e6 });

// --- STATO IN MEMORIA ---
const online = new Map();     // socket.id → sessione giocatore
const sidByPid = new Map();   // id pubblico → socket.id
const pidIndex = new Map();   // id pubblico → token
const sessions = new Map();   // stanza privata → { id, owner, ownerName, invited:Set }
const challenges = new Map(); // id sfida → { from, to, stake }
const duels = new Map();

// --- PROGRESSIONE ---
const levelOf = p => levelFromXp(p.xp || 0);
const today = () => new Date().toISOString().slice(0, 10);
const spentPoints = t => TALENT_IDS.reduce((s, k) => s + (t?.[k] || 0), 0);
// I profili di prima dell'esperienza: 120 a vittoria, 40 a sconfitta, mai sotto il livello che avevano.
// I capi già comprati restano indossabili anche sotto il livello richiesto.
// i rimborsi una tantum (vedi migrate): id, monete, solo per i profili nati prima di «before», e l'avviso
const REFUNDS = [
    { id: 'duelli-2026-11', coins: 200, before: Date.UTC(2026, 10, 21, 23, 59), text: 'Rimborso: +200 Sputnik Coin. Per qualche ora i duelli fra giocatori si bloccavano a fine incontro e alcuni hanno speso monete per niente. Adesso è tutto a posto: scusateci!' },
];
function migrate(p) {
    let changed = false;
    if (p.xp == null) {
        p.xp = Math.max((p.wins || 0) * XP.WIN + (p.losses || 0) * XP.LOSS + (p.draws || 0) * XP.DRAW, xpForLevel(levelFromWins(p.wins)));
        for (const it of p.inventory || []) it.legacy = true;
        changed = true;
    }
    if (!p.talents) { p.talents = { forza: 0, tempra: 0, maestria: 0 }; changed = true; }
    p.talents = sanitizeTalents(p.talents, levelOf(p));
    if (p.respecs == null) { p.respecs = 0; changed = true; }
    if (!p.rest) { p.rest = { n: 0 }; changed = true; }
    if (!p.practice) { p.practice = { day: '', n: 0 }; changed = true; }
    // fase 2: materiali, grado della carta, sigilli, diario di pesca, raccolta
    if (!p.mats) { Object.assign(p, { mats: {}, grade: 0, cardWins: 0, seals: [], sealsOn: [], fishLog: {}, diary: [], gather: {} }); changed = true; }
    p.sealsOn = (p.sealsOn || []).filter(s => p.seals.includes(s)).slice(0, sealSlots(p.grade));
    // fasi 3 e 4: titoli, Pedaggio, tavolette, Parole di Runa, In Onda!, leghe, Rinascita
    if (!p.titles) {
        Object.assign(p, { titles: [], titleOn: null, comebacks: [...TOLL_START], tablets: [], recipes: [], npcs: [], episodes: 0, charisma: 0, rebirths: 0, frames: [], peakLeague: leagueOf(p.rating) });
        changed = true;
    }
    // un'arma che ora chiede un livello più alto (la lancia dal 5) torna nella borsa
    const wu = p.equipment?.weapon, w = wu && (p.inventory || []).find(i => i.uid === wu);
    if (w && w.kind === 'weapon' && !w.legacy && weaponLevel(w.spec) > levelOf(p)) {
        delete p.equipment.weapon;
        const alt = p.inventory.find(i => i.kind === 'weapon' && (i.legacy || weaponLevel(i.spec) <= levelOf(p)));
        if (alt) p.equipment.weapon = alt.uid;
        changed = true;
    }
    if (!p.story) { p.story = newStory(true); changed = true; }
    if (!p.libro2 || p.libro2.ch == null) { p.libro2 = fixL2(p.libro2); changed = true; }
    if (p.rod == null) { p.rod = 0; changed = true; }
    // rimborsi una tantum: ognuno arriva una volta sola, a chi c'era già quando è successo il guaio
    for (const R of REFUNDS) {
        if ((p.refunds ||= []).includes(R.id)) continue;
        p.refunds.push(R.id); changed = true;
        if ((p.createdAt || 0) > R.before) continue;
        p.coins = (p.coins || 0) + R.coins;
        p.refundNote = R.text;
    }
    if (!p.rob) { p.rob = newRob(); changed = true; }
    // chi ha già cenato con Rob trova la casa del cantiere finita
    if (!p.casa && (p.rob?.ch || 0) >= ROB_CHAPTERS.length) { p.casa = casaDiRob(); changed = true; }
    updateSeason(p);
    return changed;
}
// Titoli: si guadagnano una volta sola, il primo si indossa da sé
function award(p, id) {
    if (!TITLES[id] || p.titles.includes(id)) return false;
    p.titles.push(id);
    if (!p.titleOn) p.titleOn = id;
    const S = sessionOf(p.id);
    if (S) { S.socket.emit('title', { id, name: TITLES[id].name }); io.to(S.room).emit('player:stats', statsOf(p)); }
    return true;
}
const titleName = p => (p.titleOn && TITLES[p.titleOn]?.name) || null;
// il pet come lo vedono gli altri: specie, nome, livello, incanti, se è sfinito
const petPub = p => p.pet ? { sp: p.pet.sp, name: p.pet.name, lv: p.pet.lv || 1, ench: p.pet.ench || 0, health: (p.pet.health ?? 1) > 0 ? 1 : 0 } : null;
const statsOf = p => ({ id: p.id, rating: p.rating, level: levelOf(p), wins: p.wins, losses: p.losses, title: titleName(p), league: leagueOf(p.rating), pet: petPub(p) });
// quando il pet cambia (adottato, rinominato, incantato, lasciato a casa…) lo sanno tutti quelli che sono lì
const petNews = S => { if (S?.room) io.to(S.room).emit('player:stats', statsOf(S.p)); };
// Stagioni di sei settimane: a fine stagione la lega più alta raggiunta diventa una cornice per la carta
function updateSeason(p) {
    const sid = seasonOf();
    if (!p.season || p.season.id !== sid) {
        if (p.season && p.season.id < sid) {
            const lg = LEAGUES[p.season.peak || 0];
            if (!p.frames.includes(lg.id)) p.frames.push(lg.id);
            if (lg.id === 'spettro') award(p, 'spettrale');
            p.seasonMsg = { season: p.season.id, league: lg.name };
            p.rating = Math.round(1000 + (p.rating - 1000) * 0.5);
        }
        p.season = { id: sid, peak: leagueOf(p.rating) };
    }
    const L = leagueOf(p.rating);
    if (L > p.season.peak) p.season.peak = L;
    if (L > (p.peakLeague || 0)) p.peakLeague = L;
}
// --- LA BACHECA DELLE TAGLIE ---
function ensureBounties(p) {
    const d = today(), w = weekOf();
    if (!p.bounty || p.bounty.day !== d) {
        const roll = rollBounties(p.id + d, levelOf(p), p.card?.element);
        p.bounty = { ...(p.bounty || {}), day: d, daily: roll.daily, mission: null };
    }
    if (p.bounty.week !== w) { p.bounty.week = w; p.bounty.weekly = rollBounties(p.id + 'w' + w, levelOf(p), p.card?.element).weekly; }
    return p.bounty;
}
const DAILY_EV = { winSeed: 'duelWin', duel: 'duel', practice: 'practice', fish: 'fish', fishRar: 'fish', frammento: 'gather', ecto: 'gather', canto: 'canto', toll: 'toll', dig: 'dig', bet: 'bet', enchant: 'enchant', onda: 'onda' };
const WEEKLY_EV = { duelWin: 'duelWin', fish: 'fish', dig: 'dig', canto: 'canto', veglia: 'veglia', gather: 'gather' };
const MISSION_EV = { mud: 'mud', fishId: 'fish', dig: 'dig', bet: 'bet', canto: 'canto', toll: 'toll' };
function bountyMatch(b, kind, ev, data) {
    if (kind !== ev) return false;
    if (b.k === 'winSeed') return data.el === b.el;
    if (b.k === 'fishRar') return data.rar === 'rar' || data.rar === 'epi';
    if (b.k === 'frammento' || b.k === 'ecto') return data.mat === b.k;
    if (b.k === 'fishId') return data.id === b.id;
    return true;
}
// Avanza le taglie del giorno, della settimana e la missione del telefono
function progress(p, ev, amt = 1, data = {}) {
    // gli stessi eventi fanno andare avanti anche la storia
    const SE = { fish: 'fish', dig: 'dig', canto: 'canto', toll: 'toll' }[ev];
    if (SE) storyStep(p, SE, amt);
    l2Count(p, ev, amt);
    const B = ensureBounties(p), S = sessionOf(p.id);
    const step = (b, kind, max) => {
        if (!b || b.done || !bountyMatch(b, kind, ev, data)) return false;
        b.have = max ? Math.max(b.have, amt) : b.have + amt;
        if (b.have >= b.n) { b.have = b.n; b.done = true; return true; }
        return false;
    };
    for (const b of B.daily) if (step(b, DAILY_EV[b.k], BOUNTIES[b.k]?.max) && S) S.socket.emit('bounty:done', { text: BOUNTIES[b.k].text(b) });
    if (step(B.weekly, WEEKLY_EV[B.weekly?.k], WEEKLY[B.weekly?.k]?.max) && S) S.socket.emit('bounty:done', { text: WEEKLY[B.weekly.k].text(B.weekly), weekly: true });
    const M = B.mission;
    if (M && step(M, MISSION_EV[M.kind], M.kind === 'canto')) {
        M.claimed = true;
        const xp = grantXp(p, BOUNTY_REWARD.mission.xp); addMat(p, 'pergamena', BOUNTY_REWARD.mission.pergamena);
        if (S) S.socket.emit('mission:done', { text: M.text, xp });
    }
}
// --- IL ROMANZO DELLA NEBBIA ---
// Libro II: si passa al passo dopo; finito l'ultimo passo, il capitolo si chiude e paga
const l2Of = p => (p.libro2 = fixL2(p.libro2));
function l2Advance(p, out) {
    const st = l2Of(p), C = L2_CHAPTERS[st.ch];
    st.i++; st.got = []; st.cnt = 0;
    if (st.i < C.steps.length) return;
    out.chapter = st.ch;
    out.xp = (out.xp || 0) + grantXp(p, C.xp);
    p.coins += C.coins; out.coins = C.coins;
    if (C.title_id && award(p, C.title_id)) out.title = C.title_id;
    st.done = { ...(st.done || {}), [st.ch]: Date.now() };
    st.ch++; st.i = 0;
}
// i passi «conta» (pesca, scava…) vanno avanti da soli
function l2Count(p, ev, amt) {
    const st = l2Of(p), S = l2Step(st);
    if (!S || S.k !== 'count' || S.ev !== ev) return;
    st.cnt += amt;
    const out = {};
    if (st.cnt >= S.n) l2Advance(p, out);
    const sess = sessionOf(p.id);
    if (sess) sess.socket.emit('l2:step', { libro2: st, ...out });
}
const storyOf = p => (p.story ||= newStory(true));
// un passo del capitolo aperto: si conta solo da quando il capitolo è cominciato
function storyStep(p, k, amt = 1) {
    const st = storyOf(p), C = STORY[st.ch];
    if (!C || !st.on) return;
    const s = C.steps.find(x => x.k === k && !x.state);
    if (!s) return;
    const had = st.prog[k] || 0;
    st.prog[k] = Math.min(s.n, s.max ? Math.max(had, amt) : had + amt);
    const S = sessionOf(p.id);
    if (S && st.prog[k] >= s.n && had < s.n) S.socket.emit('story:step', { ch: st.ch, k, t: s.t, ready: chapterReady(st, p) });
}
// i Nomi Veri già dati: due viandanti non portano mai lo stesso
const usedNames = new Set();
function proposeName(p) {
    for (let salt = 0; salt < 60; salt++) {
        const n = nomeVero(p.story, p.id, p.appearance?.sex, salt);
        if (!usedNames.has(n.toLowerCase())) return n;
    }
    return nomeVero(p.story, p.id + Date.now(), p.appearance?.sex);
}

// Contatori del giorno (pescate e raccolte con premi pieni, Essenze dai duelli)
function dayc(p) {
    const d = today();
    if (!p.dayc || p.dayc.day !== d) p.dayc = { day: d, fish: 0, frammento: 0, ecto: 0, pess: 0, ess: {} };
    return p.dayc;
}
const addMat = (p, k, n = 1) => { n = Math.max(0, Math.floor(n)); if (!MATS[k] || !n) return 0; p.mats[k] = Math.min(9999, (p.mats[k] || 0) + n); return n; };
const hasMats = (p, need) => Object.entries(need).every(([k, n]) => (p.mats[k] || 0) >= n);
const takeMats = (p, need) => { for (const [k, n] of Object.entries(need)) p.mats[k] = (p.mats[k] || 0) - n; };
const gentiToday = (p) => { const c = dayc(p); return { t: c.gt || {}, f: c.gf || {}, left: Math.max(0, GENTI_FIGHT_DAILY - Object.keys(c.gf || {}).length) }; };
// un prezzo fatto di monete e materiali insieme ({ coins, perla, ... })
const costMissing = (p, cost) => Object.entries(cost).filter(([k, n]) => (k === 'coins' ? p.coins : p.mats[k] || 0) < n).map(([k, n]) => [k, n - (k === 'coins' ? p.coins : p.mats[k] || 0)]);
const payCost = (p, cost) => { for (const [k, n] of Object.entries(cost)) { if (k === 'coins') p.coins -= n; else p.mats[k] = (p.mats[k] || 0) - n; } };
const fishDaily = p => FISH_DAILY + rodOf(p).daily;
const giveSeal = (p, id) => { if (!SEALS[id] || p.seals.includes(id)) return null; p.seals.push(id); return id; };
const blessed = p => (p.blessing?.until || 0) > Date.now();
// Cambiare seme fa scendere la carta di un grado: la nebbia ricorda
function setCard(p, card) {
    const c = sanitizeCard(card);
    let dropped = false;
    if (p.card && c.element !== p.card.element) {
        if (p.grade > 0) { p.grade--; dropped = true; p.sealsOn = (p.sealsOn || []).slice(0, sealSlots(p.grade)); }
        p.cardWins = 0;
    }
    p.card = c;
    return dropped;
}


const uid = () => crypto.randomBytes(6).toString('hex');
function shortId() {
    let id;
    do { id = crypto.randomBytes(5).toString('base64url').replace(/[-_]/g, 'x').slice(0, 7); } while (pidIndex.has(id));
    return id;
}
const byPid = pid => { const t = pidIndex.get(pid); return t ? store.get(t) : null; };
const save = p => { p.savedAt = Date.now(); store.put(p); queueSave(p); };
const int = (v, lo, hi) => { v = Math.floor(Number(v)); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo; };

function newProfile(d) {
    const weapon = { uid: uid(), kind: 'weapon', spec: { ...STARTER_WEAPON } };
    const p = {
        token: crypto.randomUUID(), id: shortId(),
        name: cleanText(d?.name, 16) || 'Viandante',
        appearance: sanitizeAppearance(d?.appearance),
        card: sanitizeCard(d?.card),
        cardImage: isCardImage(d?.cardImage) ? d.cardImage : null,
        coins: ECONOMY.START_COINS, rating: 1000, wins: 0, losses: 0, draws: 0,
        xp: 0, talents: { forza: 0, tempra: 0, maestria: 0 }, respecs: 0, rest: { n: 0 }, practice: { day: '', n: 0 },
        mats: {}, grade: 0, cardWins: 0, seals: [], sealsOn: [], fishLog: {}, diary: [], gather: {},
        inventory: [weapon], equipment: { weapon: weapon.uid },
        friends: [], requests: [], collection: [],
        lastDaily: Date.now(), createdAt: Date.now(), lastSeen: Date.now(),
        story: newStory(false),
    };
    pidIndex.set(p.id, p.token);
    return p;
}

// Aspetto: capi indossati, arma (con incantamento e infusione), seme per i colori della scia, aura dei vestiti a +10
function look(p) {
    const o = {};
    for (const [slot, u] of Object.entries(p.equipment || {})) {
        const it = p.inventory.find(i => i.uid === u);
        if (!it) continue;
        o[slot] = it.kind === 'weapon' ? it.spec : it.itemId;
        if (it.kind !== 'weapon' && plusOf(it) >= 10) o.aura = 1;
    }
    o.el = p.card?.element;
    return o;
}
const gearOf = p => { const l = look(p); return ['head', 'face', 'cape', 'torso'].map(s => l[s]).filter(Boolean); };
const gearPlusOf = p => ['head', 'face', 'cape', 'torso'].reduce((s, k) => s + plusOf(p.inventory.find(i => i.uid === p.equipment?.[k])), 0);
function publicPlayer(S) {
    const p = S.p;
    return {
        id: p.id, name: p.name, appearance: p.appearance, look: look(p), element: p.card.element,
        rating: p.rating, wins: p.wins, losses: p.losses, level: levelOf(p), title: titleName(p), league: leagueOf(p.rating),
        pos: S.pos, duel: !!S.duelId, pet: petPub(p),
    };
}
// lo stato del Prato dei Morti che il giocatore può vedere (mai dove stanno le tombe maledette)
function gravesView(p) {
    const G = p.graves;
    if (!G || G.day !== today()) return { dug: {}, over: false, won: false, pending: null };
    return { dug: G.dug, over: G.over, won: G.won, pending: G.pending };
}
function privateView(p) {
    const d = today();
    return {
        id: p.id, name: p.name, appearance: p.appearance, card: p.card, coins: p.coins,
        rating: p.rating, wins: p.wins, losses: p.losses, draws: p.draws, level: levelOf(p),
        xp: p.xp || 0, talents: p.talents, respecs: p.respecs || 0, rest: p.rest?.n || 0,
        firstWin: p.firstWinDay === d, practiceLeft: Math.max(0, XP.PRACTICE_DAILY - (p.practice?.day === d ? p.practice.n : 0)),
        inventory: p.inventory, equipment: p.equipment,
        mats: p.mats, grade: p.grade || 0, cardWins: p.cardWins || 0, seals: p.seals, sealsOn: p.sealsOn,
        fishLog: p.fishLog, diary: p.diary, gather: p.gather, blessUntil: p.blessing?.until || 0, blessedToday: p.blessing?.day === d,
        fishLeft: Math.max(0, fishDaily(p) - dayc(p).fish), rod: p.rod || 0, reserve: p.reserve || null, rob: p.rob || newRob(), gym: p.gym || { lv: 0, pts: 0 }, gymLeft: Math.max(0, GYM_DAILY - (dayc(p).gym || 0)), rivaLeft: Object.fromEntries(Object.entries(RIVA_GAMES).map(([k, G]) => [k, Math.max(0, G.daily - (dayc(p).riva?.[k] || 0))])), rivaBest: p.rivaBest || {}, npcForma: npcForma(), casa: p.casa || null, baule: p.baule || { inv: [], mats: {} }, cuccia: p.cuccia || [], errToday: dayc(p).err || {}, gentiToday: gentiToday(p), pet: p.pet || null, petTrain: Math.max(0, TRAIN.daily - (dayc(p).petTrain || 0)),
        gatherLeft: { frammento: Math.max(0, GATHER.daily.frammento - dayc(p).frammento), ecto: Math.max(0, GATHER.daily.ecto - dayc(p).ecto) },
        titles: p.titles, titleOn: p.titleOn, comebacks: p.comebacks, tablets: p.tablets, recipes: p.recipes, npcs: p.npcs,
        episodes: p.episodes || 0, charisma: p.charisma || 0, rebirths: p.rebirths || 0, frames: p.frames, peakLeague: p.peakLeague || 0,
        league: leagueOf(p.rating), season: p.season, bounty: ensureBounties(p), graves: gravesView(p),
        cantoLeft: Math.max(0, CANTO.daily - (dayc(p).canto || 0)), cantoBest: p.cantoBest || 0, wishedToday: p.wishDay === d,
        fountainUntil: p.fountain?.until || 0, tollToday: p.tollDay === d, ondaToday: p.ondaDay === d,
        veglia: p.veglia || null, kingWeek: p.kingWeek || null, watched: Object.keys(p.watched || {}), account: p.account?.user || null,
        story: storyOf(p), libro2: p.libro2 || newL2(),
        friends: p.friends.map(id => { const F = byPid(id); return { id, name: F?.name || '???', online: sidByPid.has(id), casa: !!F?.casa }; }),
        requests: p.requests.map(id => ({ id, name: byPid(id)?.name || '???' })),
        collectionCount: p.collection.length,
    };
}
// quanti viandanti ci sono adesso sull'isola (e nella stanza di ognuno): lo dice la chat. Al massimo una volta al secondo
let onlineT = null;
function onlineNews() {
    if (onlineT) return;
    onlineT = setTimeout(() => {
        onlineT = null;
        const byRoom = new Map();
        for (const S of online.values()) if (S.p) byRoom.set(S.room, (byRoom.get(S.room) || 0) + 1);
        const all = [...online.values()].filter(S => S.p).length;
        for (const S of online.values()) if (S.p) S.socket.emit('online', { all, room: byRoom.get(S.room) || 1 });
    }, 1000);
}
function sendMe(S) { if (S) S.socket.emit('me', privateView(S.p)); }
const sessionOf = pid => { const sid = sidByPid.get(pid); return sid ? online.get(sid) : null; };

// --- SALVATAGGIO NEL BROWSER ---
// Sul piano gratuito di Render il disco si azzera a ogni riavvio: senza MONGODB_URI livello, monete e
// inventario andrebbero persi. Ogni giocatore tiene nel browser una copia firmata del proprio profilo
// (aggiornata a ogni salvataggio): se il server l'ha dimenticato, al rientro la ritrova lì.
// La firma HMAC impedisce di ritoccarla; vale solo la copia più recente di quella del server.
const SAVE_KEYS = (() => {
    const keys = [];
    if (process.env.SAVE_SECRET) keys.push(['env', process.env.SAVE_SECRET]);
    if (process.env.RENDER_SERVICE_ID) keys.push(['render', 'sputnik-save:' + process.env.RENDER_SERVICE_ID]);
    if (!keys.length) {   // in locale il disco resta: la chiave vive accanto a db.json
        const f = path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'save-key');
        let k = '';
        try { k = fs.readFileSync(f, 'utf8').trim(); } catch { /* prima volta */ }
        if (!k) { k = crypto.randomBytes(32).toString('hex'); try { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, k); } catch { /* ok */ } }
        keys.push(['file', k]);
    }
    return keys;
})();
const signSave = (body, key) => crypto.createHmac('sha256', key).update(body).digest('base64url');
const accKey = k => crypto.createHash('sha256').update('sputnik-acc:' + k).digest();
function sealAcc(a) {
    const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', accKey(SAVE_KEYS[0][1]), iv);
    const enc = Buffer.concat([c.update(JSON.stringify(a), 'utf8'), c.final()]);
    return [iv, c.getAuthTag(), enc].map(b => b.toString('base64url')).join('~');
}
function openAcc(s, k) {
    try {
        const [iv, tag, enc] = String(s).split('~').map(x => Buffer.from(x, 'base64url'));
        const d = crypto.createDecipheriv('aes-256-gcm', accKey(k), iv);
        d.setAuthTag(tag);
        return JSON.parse(Buffer.concat([d.update(enc), d.final()]).toString('utf8'));
    } catch { return null; }
}
function saveTicket(p) {
    const { cardImage, account, fresh, ...data } = p;
    const l = store.listings().filter(x => x.seller === p.id).map(x => ({ lid: x.lid, entry: x.entry }));
    const body = Buffer.from(JSON.stringify({ t: p.savedAt || Date.now(), p: data, l, a: account ? sealAcc(account) : undefined })).toString('base64url');
    return 'v1.' + body + '.' + signSave(body, SAVE_KEYS[0][1]);
}
function readSave(ticket, token) {
    if (typeof ticket !== 'string' || ticket.length > 400000) return null;
    const [v, body, sig] = ticket.split('.');
    if (v !== 'v1' || !body || !sig) return null;
    const got = Buffer.from(sig);
    const key = SAVE_KEYS.find(([, k]) => { const want = Buffer.from(signSave(body, k)); return want.length === got.length && crypto.timingSafeEqual(want, got); });
    if (!key) return null;
    try {
        const s = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
        if (!s?.p?.token || !s.p.id || (token && s.p.token !== token)) return null;
        if (s.a) { const a = openAcc(s.a, key[1]); if (a?.user) s.p.account = a; }
        return s;
    } catch { return null; }
}
// la copia parte poco dopo l'ultimo salvataggio, solo per chi è collegato
function queueSave(p) {
    const S = sessionOf(p.id);
    if (!S || S.p !== p || S.saveT) return;
    S.saveT = setTimeout(() => { S.saveT = null; if (online.has(S.sid)) S.socket.emit('save', saveTicket(S.p)); }, 1200);
}

// --- ACCOUNT: NOME UTENTE E PASSWORD ---
// Il profilo resta legato al suo token: l'account è la serratura per ritrovarlo da qualsiasi dispositivo.
// La password non si salva mai, solo il suo hash scrypt con un sale casuale.
const accIndex = new Map();   // nome utente (minuscolo) → token del profilo
const normUser = u => String(u || '').trim().toLowerCase();
const userProblem = u => /^[a-z0-9._-]{3,16}$/.test(u) ? null : 'Il nome utente va da 3 a 16 caratteri: lettere, numeri, punto, trattino o trattino basso';
function passProblem(pw) {
    pw = String(pw ?? '');
    if (pw.length < 6) return 'La password deve avere almeno 6 caratteri';
    if (pw.length > 72) return 'La password è troppo lunga';
    return null;
}
const scryptP = (pw, salt) => new Promise((res, rej) => crypto.scrypt(String(pw ?? ''), salt, 32, { N: 16384, r: 8, p: 1 }, (e, k) => e ? rej(e) : res(k)));
async function hashPass(pw) { const salt = crypto.randomBytes(16).toString('base64url'); return { salt, hash: (await scryptP(pw, salt)).toString('base64url') }; }
async function checkPass(acc, pw) {
    if (!acc?.salt || !acc.hash) return false;
    const got = await scryptP(pw, acc.salt), want = Buffer.from(acc.hash, 'base64url');
    return got.length === want.length && crypto.timingSafeEqual(got, want);
}
const userTaken = (u, token) => { const t = accIndex.get(u); return !!t && t !== token && !!store.get(t); };
// un nome già preso da un altro profilo non si ruba: l'account arrivato dopo resta senza
function linkAccount(p) {
    const u = p.account?.user;
    if (!u) return;
    if (userTaken(u, p.token)) { delete p.account; return; }
    accIndex.set(u, p.token);
}
// sei tentativi sbagliati su un nome e si aspettano due minuti
const authFails = new Map();
function authLocked(u) { const f = authFails.get(u); return f && f.until > Date.now() ? Math.ceil((f.until - Date.now()) / 1000) : 0; }
function authFail(u) {
    const f = authFails.get(u) || { n: 0, until: 0 };
    if (++f.n >= 6) { f.n = 0; f.until = Date.now() + 120000; }
    authFails.set(u, f);
}

function notify(S, text, kind = 'info') { if (S) S.socket.emit('notify', { text, kind }); }
function sysChat(room, text) { io.to(room).emit('chat', { id: null, name: '⚜', text, sys: true }); }

function roomName(room) {
    if (room === 'pub') return 'Isola Fantasma';
    const s = sessions.get(room);
    return s ? `Sessione privata di ${s.ownerName}` : 'Sessione privata';
}

function joinRoom(S, room) {
    if (S.room) {
        S.socket.leave(S.room);
        S.socket.to(S.room).emit('player:leave', { id: S.p.id });
        cleanupSession(S.room, S);
    }
    S.room = room;
    S.socket.join(room);
    const players = [...online.values()].filter(o => o.room === room && o !== S).map(publicPlayer);
    S.socket.emit('room:state', { room, name: roomName(room), private: room !== 'pub', players, duels: listDuels(room) });
    S.socket.to(room).emit('player:join', publicPlayer(S));
    onlineNews();
}
function cleanupSession(room, leaving) {
    if (room === 'pub' || !sessions.has(room)) return;
    const left = [...online.values()].some(o => o.room === room && o !== leaving);
    if (!left) sessions.delete(room);
}

// --- CLASSIFICA (con piccola cache) ---
let lbCache = null, lbAt = 0;
function leaderboard() {
    if (lbCache && Date.now() - lbAt < 5000) return lbCache;
    const all = store.all(), wk = weekOf();
    const row = p => ({ id: p.id, name: p.name, rating: p.rating, wins: p.wins, losses: p.losses, coins: p.coins, level: levelOf(p), element: p.card?.element, online: sidByPid.has(p.id), league: leagueOf(p.rating), title: titleName(p), fri: p.fri?.week === wk ? p.fri.w : 0, friC: p.friC?.week === wk ? p.friC.w : 0 });
    lbCache = {
        rating: [...all].sort((a, b) => b.rating - a.rating || b.wins - a.wins).slice(0, 50).map(row),
        coins: [...all].sort((a, b) => b.coins - a.coins).slice(0, 50).map(row),
        friday: all.filter(p => p.fri?.week === wk && p.fri.w > 0).sort((a, b) => b.fri.w - a.fri.w).slice(0, 30).map(row),
        champions: all.filter(p => p.friC?.week === wk && p.friC.w > 0).sort((a, b) => b.friC.w - a.friC.w).slice(0, 30).map(row),
        season: seasonOf(), seasonEnds: seasonEnds().getTime(), isFriday: isFriday(),
        total: all.length,
    };
    lbAt = Date.now();
    return lbCache;
}

// =====================================================================
//  DUELLI
// =====================================================================
function listDuels(room) {
    return [...duels.values()].filter(d => d.room === room && d.phase !== 'done').map(d => duelPublic(d, false));
}
function pool(d) {
    const out = { a: 0, b: 0, n: d.bets.length };
    for (const b of d.bets) out[b.side] += b.amount;
    return out;
}
function duelPublic(d, withImages) {
    const strip = f => withImages ? f : { ...f, cardImage: undefined };
    return {
        id: d.id, a: strip(d.info.a), b: strip(d.info.b), stake: d.stake, phase: d.phase,
        endsIn: Math.max(0, d.endsAt - Date.now()), pool: pool(d), spectators: d.spectators.size,
    };
}
function fighterInfo(S) {
    const p = S.p;
    return { id: p.id, name: p.name, appearance: p.appearance, look: look(p), element: p.card.element, rating: p.rating, level: levelOf(p), grade: p.grade || 0, cardImage: p.cardImage, petSp: p.pet && !petTired(p.pet) ? p.pet.sp : null };
}
// l'arma di riserva: quella scelta nello spogliatoio (se non è rotta), altrimenti il pugnale
const reserveOf = p => { const r = p.inventory.find(i => i.uid === p.reserve && i.kind === 'weapon' && !i.broken && i.uid !== p.equipment?.weapon); return r?.spec || RESERVE_WEAPON; };
// con cosa scende in campo: l'arma a noleggio, o la sua (se è rotta, direttamente la riserva)
function duelWeapon(p, rent) {
    const w = p.inventory.find(i => i.uid === p.equipment?.weapon && i.kind === 'weapon');
    if (rent) return { spec: rent.spec, dur: null, item: null };
    if (!w) return { spec: null, dur: null, item: null };
    if (w.broken) return { spec: reserveOf(p), dur: null, item: null };
    return { spec: w.spec, dur: weaponWearLeft(w), item: w };
}
function fighterSetup(p, rent) {
    const W = duelWeapon(p, rent);
    return { id: p.id, name: p.name, element: p.card.element, weapon: W.spec, dur: W.dur, reserve: reserveOf(p), pet: petDuel(p.pet), level: levelOf(p), talents: p.talents, gear: gearOf(p), gearPlus: gearPlusOf(p), seals: p.sealsOn, gym: p.gym?.lv || 0 };
}
// lo SputnikPet cresce giocando e si stanca: forze in meno, esperienza in più
function petGain(p, xp, what) {
    const P = p.pet;
    if (!P || petTired(P)) return null;
    P.health = Math.max(0, (P.health ?? petMaxHealth(P)) - petWear(P, what));
    let up = 0;
    if (P.lv < PET_MAX_LV) {
        P.xp = (P.xp || 0) + xp;
        while (P.lv < PET_MAX_LV && P.xp >= petXpToNext(P.lv)) { P.xp -= petXpToNext(P.lv); P.lv++; up++; P.health = Math.min(petMaxHealth(P), P.health + 6); }
    }
    return { xp, up, lv: P.lv, health: P.health, tired: petTired(P) };
}
// dopo un duello: l'arma si consuma dei colpi messi a segno, e se è arrivata a zero si rompe
function wearWeapon(p, item, used, broken) {
    if (!item || item.broken || !(used > 0)) return null;
    item.wear = Math.min(weaponDurability(item.spec), (item.wear || 0) + used);
    if (broken || item.wear >= weaponDurability(item.spec)) { item.broken = true; item.wear = weaponDurability(item.spec); }
    return { used, broken: !!item.broken, left: weaponWearLeft(item) };
}

// Esperienza: aggiorna livello e punti Maestria, avvisa il giocatore se sale di livello.
// La benedizione della Custode e il Sigillo del Corvo ne aggiungono un po'.
function grantXp(p, amount) {
    // benedizione della Custode, Fontana dei Desideri, Sigillo del Corvo, Rinascite
    const fount = (p.fountain?.until || 0) > Date.now() ? 1 : 0;
    amount = Math.max(0, Math.round(amount * (1 + (blessed(p) ? BLESSING.xp : 0) + fount + (p.sealsOn?.includes('corvo') ? 0.05 : 0) + (p.rebirths || 0) * REBIRTH.xp)));
    const before = levelOf(p);
    p.xp = (p.xp || 0) + amount;
    const after = levelOf(p);
    if (after > before) {
        const S = sessionOf(p.id);
        if (S) {
            S.socket.emit('levelup', { level: after, title: titleFor(after), points: talentPoints(after) - spentPoints(p.talents) });
            io.to(S.room).emit('player:stats', statsOf(p));
        }
        lbCache = null;
    }
    return amount;
}
// Contro lo stesso avversario, nello stesso giorno, l'esperienza cala dopo il terzo duello (niente allevamenti tra amici)
function vsFactor(p, foeId) {
    const d = today();
    if (!p.vs || p.vs.day !== d) p.vs = { day: d, n: {} };
    const n = p.vs.n[foeId] = (p.vs.n[foeId] || 0) + 1;
    return n <= 3 ? 1 : n <= 6 ? 0.5 : 0.1;
}
// Moltiplicatori: riposo (un duello doppio dopo ogni 8 ore lontano) e prima vittoria del giorno, al massimo ×3
function duelXp(p, base, won) {
    let mult = 1;
    if (p.rest?.n > 0) { mult *= 2; p.rest.n--; }
    if (won && p.firstWinDay !== today()) { mult *= XP.FIRST_WIN; p.firstWinDay = today(); }
    return grantXp(p, base * Math.min(3, mult));
}

function startDuel(A, B, stake) {
    const id = uid();
    A.p.coins -= stake; B.p.coins -= stake;
    save(A.p); save(B.p); sendMe(A); sendMe(B);
    const d = {
        id, room: A.room, stake, phase: 'betting', endsAt: Date.now() + ECONOMY.BET_WINDOW_MS,
        sids: { a: A.sid, b: B.sid }, pids: { a: A.p.id, b: B.p.id },
        info: { a: fighterInfo(A), b: fighterInfo(B) },
        bets: [], spectators: new Set(), inputs: { a: { h: 0, p: 0 }, b: { h: 0, p: 0 } },
        sim: null, tick: 0, evBuf: [], startedAt: 0, rent: { a: null, b: null },
    };
    duels.set(id, d);
    A.duelId = B.duelId = id;
    A.socket.join('duel:' + id); B.socket.join('duel:' + id);
    io.to(d.room).emit('duel:announce', duelPublic(d, false));
    A.socket.emit('duel:start', { ...duelPublic(d, true), side: 'a' });
    B.socket.emit('duel:start', { ...duelPublic(d, true), side: 'b' });
    sysChat(d.room, `⚔ ${A.p.name} sfida ${B.p.name} nell'Arena del Castello! Scommesse aperte per ${ECONOMY.BET_WINDOW_MS / 1000}s${stake ? ` — posta: ${stake} SC` : ''}.`);
    d.betTimer = setTimeout(() => beginFight(d), ECONOMY.BET_WINDOW_MS);
}

function beginFight(d) {
    if (d.phase !== 'betting') return;
    const A = byPid(d.pids.a), B = byPid(d.pids.b);
    d.phase = 'fight';
    d.startedAt = Date.now();
    d.sim = createDuel(fighterSetup(A, d.rent.a), fighterSetup(B, d.rent.b));
    // le armi con cui si scende davvero in campo (scelte nello spogliatoio), e le riserve
    d.weaponItem = { a: duelWeapon(A, d.rent.a).item?.uid || null, b: duelWeapon(B, d.rent.b).item?.uid || null };
    const gear = { a: { weapon: duelWeapon(A, d.rent.a).spec, reserve: reserveOf(A) }, b: { weapon: duelWeapon(B, d.rent.b).spec, reserve: reserveOf(B) } };
    io.to('duel:' + d.id).emit('duel:begin', { id: d.id, gear });
    io.to(d.room).emit('duel:update', { id: d.id, phase: 'fight', pool: pool(d) });
}

function refundBets(d) {
    for (const b of d.bets) {
        const p = byPid(b.pid); if (!p) continue;
        p.coins += b.amount; save(p);
        const S = sessionOf(b.pid); if (S) { sendMe(S); notify(S, `Scommessa rimborsata: ${b.amount} SC`, 'coin'); }
    }
}

function finishDuel(d) {
    d.phase = 'done';
    clearTimeout(d.betTimer);
    io.to(d.room).emit('duel:update', { id: d.id, phase: 'done' });
    setTimeout(() => {
        for (const sid of [d.sids.a, d.sids.b, ...d.spectators]) {
            const S = online.get(sid);
            if (!S) continue;
            S.socket.leave('duel:' + d.id);
            if (S.duelId === d.id) S.duelId = null;
            if (S.watching === d.id) S.watching = null;
        }
        duels.delete(d.id);
    }, 1500);
    for (const s of ['a', 'b']) { const S = online.get(d.sids[s]); if (S && S.duelId === d.id) S.duelId = null; }
}

function cancelDuel(d, reason) {
    if (d.phase === 'done') return;
    for (const s of ['a', 'b']) {
        const p = byPid(d.pids[s]); if (!p) continue;
        p.coins += d.stake + (d.rent?.[s]?.price || 0); save(p); sendMe(sessionOf(p.id));
    }
    refundBets(d);
    io.to('duel:' + d.id).emit('duel:cancel', { id: d.id, reason });
    sysChat(d.room, `⚔ Duello annullato: ${reason}`);
    finishDuel(d);
}

function endDuel(d, winner, reason) {
    if (d.phase === 'done') return;
    const P = { a: byPid(d.pids.a), b: byPid(d.pids.b) };
    const result = { id: d.id, winner, reason, names: { a: P.a.name, b: P.b.name }, stake: d.stake, rating: { a: 0, b: 0 }, coins: { a: 0, b: 0 }, xp: { a: 0, b: 0 } };
    // usura: ognuno consuma la sua arma (quelle a noleggio no)
    result.wear = { a: null, b: null };
    if (d.sim) for (const s of ['a', 'b']) {
        const item = P[s].inventory.find(i => i.uid === d.weaponItem?.[s]);
        result.wear[s] = wearWeapon(P[s], item, d.sim.f[s].used, d.sim.f[s].broken);
    }
    // lo SputnikPet ha combattuto anche lui
    // noleggi dello spogliatoio: chi vince si riprende il suo e incassa quello dell'altro; pareggio = rimborso a tutti e due
    result.rent = { a: 0, b: 0 };
    if (d.rent.a || d.rent.b) {
        if (winner) {
            const loser = winner === 'a' ? 'b' : 'a', back = (d.rent[winner]?.price || 0) + (d.rent[loser]?.price || 0);
            P[winner].coins += back; result.rent[winner] = back; result.rent[loser] = -(d.rent[loser]?.price || 0);
        } else for (const s of ['a', 'b']) { P[s].coins += d.rent[s]?.price || 0; result.rent[s] = 0; }
    }
    // niente esperienza per i duelli lampo (meno di 20 secondi di combattimento)
    const fought = d.startedAt && Date.now() - d.startedAt > 20000;
    // lo SputnikPet ha combattuto anche lui
    result.pet = { a: null, b: null };
    if (fought) for (const s of ['a', 'b']) result.pet[s] = petGain(P[s], winner === s ? 30 : 15, 'duel');
    if (fought) {
        if (winner) {
            const loser = winner === 'a' ? 'b' : 'a';
            const diff = Math.max(0, Math.min(XP.WIN_LEVEL_MAX, (levelOf(P[loser]) - levelOf(P[winner])) * XP.WIN_PER_LEVEL));
            result.xp[winner] = duelXp(P[winner], (XP.WIN + diff) * vsFactor(P[winner], P[loser].id), true);
            result.xp[loser] = duelXp(P[loser], XP.LOSS * vsFactor(P[loser], P[winner].id), false);
        } else for (const s of ['a', 'b']) result.xp[s] = duelXp(P[s], XP.DRAW * vsFactor(P[s], P[s === 'a' ? 'b' : 'a'].id), false);
        // Bottino per l'Altare: un Frammento a testa, e a chi vince l'Essenza del seme sconfitto (massimo 3 al giorno per seme)
        result.loot = { a: {}, b: {} };
        for (const s of ['a', 'b']) if (addMat(P[s], 'frammento', 1)) result.loot[s].frammento = 1;
        if (winner) {
            const W = P[winner], el = P[winner === 'a' ? 'b' : 'a'].card.element, c = dayc(W);
            if ((c.ess[el] || 0) < ESS_DAILY) { c.ess[el] = (c.ess[el] || 0) + 1; addMat(W, 'ess_' + el, 1); result.loot[winner]['ess_' + el] = 1; }
            W.cardWins = (W.cardWins || 0) + 1;
            progress(W, 'duelWin', 1, { el });
        }
        for (const s of ['a', 'b']) progress(P[s], 'duel');
    }
    // Arena classificata: la gloria si muove solo se entrambi sono almeno al livello 5
    const ranked = levelOf(P.a) >= RANKED_LEVEL && levelOf(P.b) >= RANKED_LEVEL;
    result.ranked = ranked;
    if (winner && fought && ranked) storyStep(P[winner], 'rankedWin');
    if (winner) {
        const loser = winner === 'a' ? 'b' : 'a';
        const W = P[winner], L = P[loser];
        const exp = 1 / (1 + Math.pow(10, (L.rating - W.rating) / 400));
        const delta = ranked ? Math.max(4, Math.round(32 * (1 - exp))) : 0;
        W.rating += delta; L.rating = Math.max(100, L.rating - delta);
        result.rating[winner] = delta; result.rating[loser] = -delta;
        updateSeason(W); updateSeason(L);
        // il venerdì è giorno di torneo: contano le vittorie classificate (dal 25 anche nel Torneo dei Campioni)
        if (ranked && fought && isFriday()) {
            const wk = weekOf();
            if (W.fri?.week !== wk) W.fri = { week: wk, w: 0 };
            W.fri.w++;
            if (levelOf(W) >= 25) { if (W.friC?.week !== wk) W.friC = { week: wk, w: 0 }; W.friC.w++; }
            result.friday = true;
        }
        // Sigillo del Naufrago: +10% sulle monete vinte
        const extra = W.sealsOn?.includes('naufrago') ? Math.round((d.stake + ECONOMY.WIN_BONUS) * 0.1) : 0;
        W.coins += d.stake * 2 + ECONOMY.WIN_BONUS + extra; L.coins += ECONOMY.LOSS_BONUS;
        result.coins[winner] = d.stake + ECONOMY.WIN_BONUS + extra; result.coins[loser] = -d.stake + ECONOMY.LOSS_BONUS;
        W.wins++; L.losses++;
        // Scommesse: montepremi diviso tra chi ha indovinato (parimutuel)
        const pl = pool(d), tot = pl.a + pl.b, winPool = pl[winner];
        if (winPool === 0) refundBets(d);
        else for (const b of d.bets) {
            const p = byPid(b.pid); if (!p) continue;
            const S = sessionOf(b.pid);
            if (b.side === winner) {
                // Carisma (merch di Sputnik Homies): qualche moneta in più dal banco
                const charisma = computeStats({ element: p.card?.element, gear: gearOf(p) }).charisma + (p.charisma || 0);
                const payout = Math.floor(b.amount / winPool * tot * (1 + charisma));
                p.coins += payout; grantXp(p, XP.BET_WIN); progress(p, 'bet'); save(p);
                if (S) { sendMe(S); S.socket.emit('bet:result', { won: true, amount: b.amount, payout, name: W.name, xp: XP.BET_WIN }); }
            } else if (S) S.socket.emit('bet:result', { won: false, amount: b.amount, payout: 0, name: W.name });
        }
        sysChat(d.room, `🏆 ${W.name} ha sconfitto ${L.name} nell'Arena${reason === 'forfeit' ? ' (abbandono)' : ''}! ${ranked ? `(+${delta} gloria)` : '(amichevole)'}`);
    } else {
        P.a.coins += d.stake; P.b.coins += d.stake; P.a.draws++; P.b.draws++;
        refundBets(d);
        sysChat(d.room, `⚔ ${P.a.name} e ${P.b.name} pareggiano. Scommesse rimborsate.`);
    }
    save(P.a); save(P.b);
    sendMe(sessionOf(P.a.id)); sendMe(sessionOf(P.b.id));
    for (const p of [P.a, P.b]) io.to(d.room).emit('player:stats', statsOf(p));
    result.level = { a: levelOf(P.a), b: levelOf(P.b) };
    result.league = { a: leagueOf(P.a.rating), b: leagueOf(P.b.rating) };
    lbCache = null;
    io.to('duel:' + d.id).emit('duel:end', result);
    finishDuel(d);
}

// Ciclo di simulazione a 60Hz, snapshot a 30Hz
const TICK_MS = 1000 / 60;
let lastTick = performance.now(), acc = 0;
setInterval(() => {
    const now = performance.now();
    acc += Math.min(250, now - lastTick); lastTick = now;
    while (acc >= TICK_MS) {
        acc -= TICK_MS;
        for (const d of duels.values()) {
            if (d.phase !== 'fight') continue;
            try { stepOne(d); } catch (err) {
                console.error('[duello] errore, lo annullo:', d.id, err);
                try { cancelDuel(d, 'si è inceppato qualcosa nell\'Arena: poste restituite'); } catch (e2) { console.error('[duello] anche l\'annullo è fallito:', e2); d.phase = 'done'; duels.delete(d.id); }
            }
        }
    }
}, TICK_MS);
// un passo di un duello: simula, manda lo stato, e lo chiude se è finito
function stepOne(d) {
    const ev = stepDuel(d.sim, d.inputs, FIGHT.DT);
    d.inputs.a.p = 0; d.inputs.b.p = 0;
    if (ev.length) d.evBuf.push(...ev);
    d.tick++;
    const over = d.sim.phase === 'over';
    if (d.tick % 2 === 0 || over) { io.to('duel:' + d.id).emit('duel:state', snapshotDuel(d.sim, d.evBuf)); d.evBuf = []; }
    if (over) endDuel(d, d.sim.winner, 'ko');
    else if (Date.now() - d.startedAt > 8 * 60 * 1000) {
        const A = d.sim.f.a, B = d.sim.f.b;
        endDuel(d, A.rw !== B.rw ? (A.rw > B.rw ? 'a' : 'b') : null, 'tempo');
    }
}

// =====================================================================
//  CONNESSIONI
// =====================================================================
// =====================================================================
//  IN ONDA! (Stanza Bianca) e LA VEGLIA DEI MORTI: stato condiviso
// =====================================================================
const trades = new Map();   // scambi aperti fra giocatori (id → tavolo)
const ondas = new Map();   // stanza → puntata in corso
const ondaPeople = (room) => [...online.values()].filter(S => S.room === room && inWhiteRoom(S.pos[0], S.pos[1], S.pos[2]));
function startOnda(room, hosts) {
    const pref = [...ONDA_Q].sort(() => Math.random() - 0.5).slice(0, ONDA.questions - 1).map(q => ({ text: q[0], a: q[1], b: q[2] }));
    const plot = ONDA_PLOT[crypto.randomInt(ONDA_PLOT.length)];
    const qs = [...pref, { text: `Il complotto della settimana: «${plot}»`, a: 'Ci credo', b: 'Non ci credo' }];
    const ep = { room, hosts: hosts.map(S => S.p.id), names: hosts.map(S => S.p.name), ratto: hosts.length < 2, qs, i: -1, open: false, votes: new Map(), voters: new Set(), hostXp: 0, results: [] };
    ondas.set(room, ep);
    io.to(room).emit('onda:start', { hosts: ep.names, ratto: ep.ratto, n: qs.length });
    sysChat(room, `🎙 In Onda! ${ep.names.join(' e ')}${ep.ratto ? ' e il Ratto' : ''} sono in diretta dalla Stanza Bianca.`);
    setTimeout(() => ondaNext(ep), 4000);
}
function ondaNext(ep) {
    if (ondas.get(ep.room) !== ep) return;
    ep.i++;
    if (ep.i >= ep.qs.length) return ondaEnd(ep);
    ep.votes = new Map(); ep.open = true;
    const q = ep.qs[ep.i];
    io.to(ep.room).emit('onda:q', { i: ep.i, n: ep.qs.length, text: q.text, a: q.a, b: q.b, ms: ONDA.voteMs, hosts: ep.names });
    setTimeout(() => {
        ep.open = false;
        let a = 0, b = 0;
        for (const v of ep.votes.values()) v ? b++ : a++;
        const tot = a + b, split = tot ? 1 - Math.abs(a - b) / tot : 0;
        // i conduttori guadagnano di più quando il pubblico si divide
        ep.hostXp += ONDA.hostXp + Math.round(ONDA.splitXp * split * Math.min(1, tot / 2));
        ep.results.push({ a, b });
        io.to(ep.room).emit('onda:res', { i: ep.i, a, b, split: Math.round(split * 100) });
        setTimeout(() => ondaNext(ep), 4500);
    }, ONDA.voteMs);
}
function ondaEnd(ep) {
    ondas.delete(ep.room);
    const d = today();
    for (const pid of new Set([...ep.hosts, ...ep.voters])) {
        const p = byPid(pid); if (!p) continue;
        const S = sessionOf(pid), host = ep.hosts.includes(pid), out = { host, xp: 0 };
        if (host) {
            if (p.ondaDay !== d) {
                p.ondaDay = d; out.xp = grantXp(p, ep.hostXp); p.episodes = (p.episodes || 0) + 1;
                p.charisma = Math.min(ONDA.charismaMax, (p.charisma || 0) + ONDA.charisma); out.charisma = p.charisma;
                if (p.episodes >= 5) out.title = award(p, 'conduttore');
                // a volte i Cronisti si lasciano sfuggire una Parola di Runa
                const words = Object.keys(RUNEWORDS).filter(w => !p.recipes.includes(w));
                if (words.length && Math.random() < 0.35) { const w = words[crypto.randomInt(words.length)]; p.recipes.push(w); out.recipe = w; }
            } else out.repeat = true;
        }
        // ogni puntata insegna una risposta per il Pedaggio dello Spettro
        const unk = INSULTS.map((_, i) => i).filter(i => !p.comebacks.includes(i));
        if (unk.length) { const c = unk[crypto.randomInt(unk.length)]; p.comebacks.push(c); out.learned = c; }
        progress(p, 'onda');
        save(p);
        if (S) { sendMe(S); S.socket.emit('onda:end', out); }
    }
    io.to(ep.room).emit('onda:off', { results: ep.results });
}

let veglia = null;
function vegliaState() {
    const key = romeTime().day;
    if (!veglia || veglia.key !== key) veglia = { key, kills: 0, participants: new Set(), kingUp: false, kings: new Set() };
    const goal = Math.min(VEGLIA.goalMax, VEGLIA.goalBase + VEGLIA.goalPer * veglia.participants.size);
    return { open: vegliaOpen() || !!process.env.VEGLIA_ALWAYS, key, kills: veglia.kills, goal, kingUp: veglia.kingUp, participants: veglia.participants.size };
}

// Il campione del venerdì (e dei Campioni, dal livello 25) riceve il titolo a torneo finito
let fridayAwarded = null;
function awardFriday() {
    const t = romeTime(), w = weekOf(), target = t.wd === 6 || t.wd === 0 ? w : w - 1;
    if (fridayAwarded === target) return;
    fridayAwarded = target;
    for (const [field, title] of [['fri', 'venerdi'], ['friC', 'campioni']]) {
        const cands = store.all().filter(p => p[field]?.week === target && p[field].w > 0).sort((a, b) => b[field].w - a[field].w);
        if (!cands.length || cands.some(p => p.titleWeek?.[title] === target)) continue;
        const top = cands[0];
        award(top, title);
        top.titleWeek = { ...(top.titleWeek || {}), [title]: target };
        save(top);
        sysChat('pub', `🏆 ${top.name} è ${TITLES[title].name}: ${top[field].w} vittorie classificate di venerdì!`);
    }
}
setInterval(awardFriday, 10 * 60 * 1000);
// gli abitanti si allenano da soli: quando uno sale di livello, lo sa tutta l'isola
function gymNews() {
    const W = store.world(), L = W.npcLv ||= {};
    let changed = false;
    for (const id of npcFighters()) {
        const lv = npcLevel(id);
        if (L[id] == null) { L[id] = lv; changed = true; continue; }
        if (lv > L[id]) { L[id] = lv; changed = true; io.emit('notify', { text: `${ERRANTI[id].name} si è allenat${id === 'marta' ? 'a' : 'o'} da Lorenzone: ora è di livello ${lv}`, kind: 'info' }); }
    }
    if (changed) store.saveWorld();
}
setTimeout(gymNews, 20 * 1000);
setInterval(gymNews, 15 * 60 * 1000);

// profili di prima: si aggiornano all'avvio (qui sotto tutti gli aiuti sono già pronti)
// i profili di prova creati durante i collaudi: tolti una volta per tutte (codice e nome devono coincidere)
const PURGED = [
    ['7Mdgnmw', 'ProvaA'], ['xP9SCA8', 'ProvaB'],                                  // collaudo dei duelli online, 21/11
    ['DfJvsy0', 'Collaudo'], ['Lp6QmfM', 'Collaudo'], ['YQqdRjA', 'Collaudo'], ['PMi2yWk', 'Sfidante'],   // solo in locale
];
const purgedIds = new Set(PURGED.map(([id]) => id));
for (const p of store.all()) if (PURGED.some(([id, name]) => p.id === id && p.name === name)) { store.del(p.token); console.log(`[pulizia] tolto il profilo di prova ${p.name} (${p.id})`); }
for (const p of store.all()) { pidIndex.set(p.id, p.token); linkAccount(p); if (migrate(p)) store.put(p); if (p.story?.name) usedNames.add(p.story.name.toLowerCase()); }

io.on('connection', (socket) => {
    let me = null;
    // prima di entrare si può solo salutare, accedere o registrarsi
    const PRE = new Set(['hello', 'auth:login', 'auth:register']);
    const on = (ev, fn) => socket.on(ev, (d, ack) => {
        const reply = typeof ack === 'function' ? ack : () => {};
        if (!me && !PRE.has(ev)) return reply({ ok: false, msg: 'Non autenticato' });
        const oops = e => { console.error(`[${ev}]`, e); reply({ ok: false, msg: 'Errore del server' }); };
        try { const r = fn(d || {}, reply); if (r?.catch) r.catch(oops); } catch (e) { oops(e); }
    });
    const fail = (reply, msg) => reply({ ok: false, msg });

    on('hello', (d, reply) => {
        if (me) return reply({ ok: false, msg: 'Già connesso' });
        let kept = d.save ? readSave(d.save, d.token ? String(d.token) : null) : null;
        if (kept && purgedIds.has(kept.p?.id)) kept = null;   // i profili di prova tolti non si ricostruiscono dal salvataggio del browser
        const token = d.token ? String(d.token) : kept?.p.token;
        let p = token ? store.get(token) : null;
        // il server si è dimenticato di te (riavvio) o ha una copia più vecchia: vale quella del browser
        let restored = false;
        if (kept && (!p || (p.savedAt || 0) < kept.t)) {
            const old = p;
            p = kept.p;
            if (!p.cardImage && old?.cardImage) p.cardImage = old.cardImage;
            // gli annunci del Bazar persi nel riavvio tornano nella borsa
            const live = new Set(store.listings().map(l => l.lid));
            for (const l of kept.l || []) if (l?.entry && !live.has(l.lid)) p.inventory.push(l.entry);
            if (pidIndex.has(p.id) && pidIndex.get(p.id) !== p.token) p.id = shortId();
            pidIndex.set(p.id, p.token);
            linkAccount(p);
            store.put(p);
            restored = !old;
            console.log(`[save] ${p.name} (${p.id}) recuperato dal browser`);
        }
        // appena registrato: il profilo c'è già, ma il viandante entra per la prima volta
        const created = !p || !!p.fresh;
        let dropped = false;
        if (!p) p = newProfile(d);
        else {
            delete p.fresh;
            migrate(p);
            if (cleanText(d.name, 16).length >= 2) p.name = cleanText(d.name, 16);
            if (d.appearance) p.appearance = sanitizeAppearance(d.appearance);
            // la carta salvata nel browser vale solo se non cambia seme a una carta risvegliata:
            // il grado scende solo quando lo decidi tu, salvando la carta (profile:update)
            const keep = d.card && sanitizeCard(d.card).element !== p.card?.element && p.grade > 0;
            if (d.card && !keep) dropped = setCard(p, d.card);
            if (isCardImage(d.cardImage) && !keep) p.cardImage = d.cardImage;
        }
        migrate(p);
        let daily = 0;
        if (!created && Date.now() - (p.lastDaily || 0) > 20 * 3600 * 1000) {
            p.coins += ECONOMY.DAILY_BONUS; p.lastDaily = Date.now(); daily = ECONOMY.DAILY_BONUS;
            grantXp(p, XP.DAILY);
        }
        // Riposo: ogni 8 ore lontano dall'isola, il prossimo duello vale doppio
        if (!created) {
            const away = Math.floor((Date.now() - (p.lastSeen || Date.now())) / (XP.REST_HOURS * 3600 * 1000));
            if (away > 0) p.rest.n = Math.min(XP.REST_MAX, (p.rest.n || 0) + away);
        }
        const prev = sessionOf(p.id);
        if (prev) { prev.socket.emit('kicked'); prev.socket.disconnect(true); }
        p.lastSeen = Date.now();
        save(p);
        me = { sid: socket.id, socket, p, room: null, pos: [0, 2, 34, Math.PI, 0], duelId: null, watching: null, lastChat: 0, lastCard: 0 };
        online.set(socket.id, me);
        sidByPid.set(p.id, socket.id);
        const seasonMsg = p.seasonMsg || null;
        if (seasonMsg) { delete p.seasonMsg; save(p); }
        const refundNote = p.refundNote || null;
        if (refundNote) { delete p.refundNote; save(p); setTimeout(() => notify(me, refundNote, 'coin'), 4000); }
        reply({ ok: true, token: p.token, profile: privateView(p), daily, dailyXp: daily ? XP.DAILY : 0, created, dropped, seasonMsg,
            restored, saveBad: !!d.save && !kept, save: saveTicket(p), now: Date.now() });
        joinRoom(me, 'pub');
        for (const fid of p.friends) { const F = sessionOf(fid); if (F) F.socket.emit('friend:status', { id: p.id, name: p.name, online: true }); }
        console.log(`+ ${p.name} (${p.id}) — online: ${online.size}`);
        onlineNews();
    });

    // --- ACCOUNT ---
    let authTries = 0;
    const tooMany = (reply) => (++authTries > 30 ? (fail(reply, 'Troppi tentativi: ricarica la pagina e riprova'), true) : false);
    on('auth:register', async (d, reply) => {
        if (me) return fail(reply, 'Sei già sull\'isola: crea l\'account dalle Opzioni');
        if (tooMany(reply)) return;
        const user = normUser(d.user);
        const bad = userProblem(user) || passProblem(d.pass);
        if (bad) return fail(reply, bad);
        if (userTaken(user)) return fail(reply, 'Questo nome utente è già preso');
        const acc = await hashPass(d.pass);
        if (userTaken(user)) return fail(reply, 'Questo nome utente è già preso');
        const p = newProfile({ name: user });
        p.account = { user, ...acc, at: Date.now() };
        p.fresh = true;
        accIndex.set(user, p.token);
        save(p);
        console.log(`[account] nuovo: ${user} (${p.id})`);
        reply({ ok: true, token: p.token, user, save: saveTicket(p) });
    });
    on('auth:login', async (d, reply) => {
        if (me) return fail(reply, 'Sei già sull\'isola');
        if (tooMany(reply)) return;
        const user = normUser(d.user);
        const wait = authLocked(user);
        if (wait) return fail(reply, `Troppi tentativi sbagliati: riprova tra ${wait} secondi`);
        const p = accIndex.has(user) ? store.get(accIndex.get(user)) : null;
        if (!p?.account) {
            return fail(reply, store.kind === 'file'
                ? 'Non trovo questo account. Se il server si è appena svegliato, entra prima dal dispositivo dove giochi di solito: il suo browser gli ricorderà chi sei.'
                : 'Non esiste un account con questo nome');
        }
        if (!(await checkPass(p.account, d.pass))) { authFail(user); return fail(reply, 'Password sbagliata'); }
        authFails.delete(user);
        console.log(`[account] accesso: ${user} (${p.id})`);
        reply({ ok: true, token: p.token, user, save: saveTicket(p), profile: { name: p.name, appearance: p.appearance, card: p.card, level: levelOf(p) } });
    });
    // un viandante senza account se ne crea uno: tutto ciò che ha resta suo
    on('auth:link', async (d, reply) => {
        const S = me, p = S.p;
        if (p.account) return fail(reply, 'Questo viandante ha già un account');
        if (tooMany(reply)) return;
        const user = normUser(d.user);
        const bad = userProblem(user) || passProblem(d.pass);
        if (bad) return fail(reply, bad);
        if (userTaken(user, p.token)) return fail(reply, 'Questo nome utente è già preso');
        const acc = await hashPass(d.pass);
        if (userTaken(user, p.token) || p.account) return fail(reply, 'Questo nome utente è già preso');
        p.account = { user, ...acc, at: Date.now() };
        accIndex.set(user, p.token);
        save(p);
        if (me === S) sendMe(S);
        console.log(`[account] ${p.name} (${p.id}) ora è ${user}`);
        reply({ ok: true, user });
    });
    on('auth:password', async (d, reply) => {
        const p = me.p, A = p.account;
        if (!A) return fail(reply, 'Prima crea un account');
        const bad = passProblem(d.pass);
        if (bad) return fail(reply, bad);
        const wait = authLocked(A.user);
        if (wait) return fail(reply, `Troppi tentativi sbagliati: riprova tra ${wait} secondi`);
        if (!(await checkPass(A, d.old))) { authFail(A.user); return fail(reply, 'La password attuale è sbagliata'); }
        Object.assign(A, await hashPass(d.pass));
        save(p);
        reply({ ok: true });
    });
    // il tasto Salva e il salvataggio automatico: scrive subito e rinnova la copia nel browser
    on('save:now', async (d, reply) => {
        const S = me, p = S.p;
        if (Date.now() - (S.lastSaveNow || 0) > 2500) {
            S.lastSaveNow = Date.now();
            p.lastSeen = p.savedAt = Date.now();
            store.put(p);
            await store.flush();
        }
        reply({ ok: true, save: saveTicket(p), at: p.savedAt, lasting: store.kind !== 'file' });
    });

    on('profile:update', (d, reply) => {
        const p = me.p;
        let dropped = false;
        if (cleanText(d.name, 16).length >= 2) p.name = cleanText(d.name, 16);
        if (d.appearance) p.appearance = sanitizeAppearance(d.appearance);
        if (d.card) dropped = setCard(p, d.card);
        if (isCardImage(d.cardImage)) p.cardImage = d.cardImage;
        save(p); lbCache = null;
        socket.to(me.room).emit('player:look', { id: p.id, name: p.name, appearance: p.appearance, look: look(p), element: p.card.element });
        reply({ ok: true, profile: privateView(p), dropped, grade: p.grade });
    });

    // --- MONDO ---
    socket.on('mv', (s) => {
        if (!me || !Array.isArray(s) || s.length < 5 || !s.slice(0, 5).every(Number.isFinite)) return;
        me.pos = s.slice(0, 5);
        socket.volatile.to(me.room).emit('mv', { i: me.p.id, s: me.pos });
        // il telefono bianco squilla una volta al giorno, poco dopo che sei entrato nella Stanza Bianca
        if (!me.phoneT && !me.phoneRing && me.p.phoneDay !== today() && levelOf(me.p) >= 2 && inWhiteRoom(me.pos[0], me.pos[1], me.pos[2])) {
            const S = me;
            S.phoneT = setTimeout(() => {
                S.phoneT = null;
                if (me !== S || !online.has(S.sid) || S.p.phoneDay === today() || !inWhiteRoom(S.pos[0], S.pos[1], S.pos[2])) return;
                S.phoneRing = true;
                S.socket.emit('phone:ring');
            }, 15000 + Math.random() * 30000);
        }
    });
    on('emote', (d) => {
        if (!['saluta', 'balla', 'inchino', 'ride'].includes(d.e)) return;
        socket.to(me.room).emit('emote', { i: me.p.id, e: d.e });
    });
    on('mud', (d) => {
        if (!Array.isArray(d.o) || !Array.isArray(d.v) || ![...d.o, ...d.v].every(Number.isFinite)) return;
        socket.to(me.room).emit('mud', { i: me.p.id, o: d.o.slice(0, 3), v: d.v.slice(0, 3) });
    });
    on('mud:hit', (d) => {
        io.to(me.room).emit('mud:splat', { i: me.p.id, by: String(d.by || '') });
        const T = sessionOf(String(d.by || ''));
        if (T && T !== me && T.room === me.room && Date.now() - (me.lastSplat || 0) > 1500) { me.lastSplat = Date.now(); progress(T.p, 'mud'); }
    });
    on('chat', (d) => {
        const now = Date.now();
        if (now - me.lastChat < 350) return;
        me.lastChat = now;
        const text = cleanText(d.text, 200);
        if (text) io.to(me.room).emit('chat', { id: me.p.id, name: me.p.name, text });
    });

    // --- VOICE CHAT (segnalazione WebRTC tra giocatori della stessa stanza) ---
    for (const kind of ['voice:offer', 'voice:answer']) {
        socket.on(kind, (d) => {
            if (!me || !d) return;
            const T = sessionOf(d.to);
            if (T && T.room === me.room) T.socket.emit(kind, { from: me.p.id, signal: d.signal });
        });
    }

    // --- BOTTEGHE ---
    on('shop:buy', (d, reply) => {
        const it = ITEMS[d.itemId];
        if (!it) return fail(reply, 'Oggetto sconosciuto');
        const need = itemLevel(d.itemId);
        if (need > levelOf(me.p)) return fail(reply, `Torna quando sarai al livello ${need}`);
        if (me.p.inventory.length >= 80) return fail(reply, 'Inventario pieno');
        if (me.p.coins < it.price) return fail(reply, 'Sputnik Coin insufficienti');
        me.p.coins -= it.price;
        const entry = { uid: uid(), kind: 'item', itemId: d.itemId };
        me.p.inventory.push(entry);
        save(me.p); sendMe(me);
        reply({ ok: true, uid: entry.uid });
    });
    on('forge:craft', (d, reply) => {
        const spec = sanitizeWeaponSpec(d.spec);
        if (!spec) return fail(reply, 'Progetto non valido');
        const need = weaponLevel(spec);
        if (need > levelOf(me.p)) return fail(reply, `Mastro Brace forgia quest'arma solo dal livello ${need}`);
        if (me.p.inventory.length >= 80) return fail(reply, 'Inventario pieno');
        const cost = weaponCost(spec), bones = boneCost(spec);
        if (me.p.coins < cost) return fail(reply, 'Sputnik Coin insufficienti');
        if ((me.p.mats.ossa || 0) < bones) return fail(reply, `L'osso costa anche ${bones} Ossa Antiche: le trovi nel Prato dei Morti`);
        me.p.coins -= cost;
        if (bones) me.p.mats.ossa -= bones;
        const entry = { uid: uid(), kind: 'weapon', spec };
        me.p.inventory.push(entry);
        save(me.p); sendMe(me);
        reply({ ok: true, uid: entry.uid, cost });
    });
    on('equip', (d, reply) => {
        const slot = String(d.slot);
        if (!['head', 'face', 'cape', 'torso', 'weapon'].includes(slot)) return fail(reply, 'Slot non valido');
        if (me.duelId) return fail(reply, 'Non durante un duello');
        if (d.uid == null) delete me.p.equipment[slot];
        else {
            const it = me.p.inventory.find(i => i.uid === d.uid);
            if (!it) return fail(reply, 'Oggetto non trovato');
            const itSlot = it.kind === 'weapon' ? 'weapon' : ITEMS[it.itemId]?.slot;
            if (itSlot !== slot) return fail(reply, 'Slot sbagliato');
            const need = it.kind === 'weapon' ? weaponLevel(it.spec) : itemLevel(it.itemId);
            if (!it.legacy && need > levelOf(me.p)) return fail(reply, `Serve il livello ${need} per usarlo`);
            me.p.equipment[slot] = it.uid;
        }
        save(me.p); sendMe(me);
        io.to(me.room).emit('player:look', { id: me.p.id, name: me.p.name, appearance: me.p.appearance, look: look(me.p), element: me.p.card.element });
        reply({ ok: true });
    });
    on('item:scrap', (d, reply) => {
        const i = me.p.inventory.findIndex(x => x.uid === d.uid);
        if (i < 0) return fail(reply, 'Oggetto non trovato');
        if (Object.values(me.p.equipment).includes(d.uid)) return fail(reply, 'Prima toglilo di dosso');
        const it = me.p.inventory[i];
        const value = it.kind === 'weapon' ? weaponCost(it.spec) : ITEMS[it.itemId]?.price || 0;
        const gain = Math.floor(value * ECONOMY.SCRAP_RATE);
        me.p.inventory.splice(i, 1);
        me.p.coins += gain;
        save(me.p); sendMe(me);
        reply({ ok: true, gain });
    });

    // --- MAESTRIA (un punto a ogni livello dal 2, massimo 15 per ramo) ---
    on('talent:add', (d, reply) => {
        const k = String(d.path);
        if (!TALENT_IDS.includes(k)) return fail(reply, 'Ramo sconosciuto');
        if (me.duelId) return fail(reply, 'Non durante un duello');
        const t = me.p.talents;
        if (spentPoints(t) >= talentPoints(levelOf(me.p))) return fail(reply, 'Nessun punto da spendere: sali di livello');
        if (t[k] >= TALENT_CAP) return fail(reply, `${TALENTS[k].name} è già al massimo`);
        t[k]++;
        save(me.p); sendMe(me);
        reply({ ok: true });
    });
    // Rito dell'Oblio: all'Altare della Cappella in Rovina si ridistribuiscono i punti (la prima volta è gratis)
    on('talent:reset', (d, reply) => {
        if (me.duelId) return fail(reply, 'Non durante un duello');
        if (Math.hypot(me.pos[0] - ALTAR.x, me.pos[2] - ALTAR.z) > ALTAR.r) return fail(reply, "Il Rito dell'Oblio si celebra all'Altare della Cappella in Rovina");
        if (!spentPoints(me.p.talents)) return fail(reply, 'Non hai ancora speso punti');
        const cost = me.p.respecs > 0 ? RESPEC_COST : 0;
        if (me.p.coins < cost) return fail(reply, `Il rito costa ${cost} Sputnik Coin`);
        me.p.coins -= cost; me.p.respecs++;
        me.p.talents = { forza: 0, tempra: 0, maestria: 0 };
        save(me.p); sendMe(me);
        reply({ ok: true, cost });
    });
    // Allenamento col Fantasma: si gioca sul dispositivo, quindi poca esperienza e un limite al giorno
    on('practice:done', (d, reply) => {
        const now = Date.now();
        if (now - (me.lastPractice || 0) < 20000) return reply({ ok: true, xp: 0 });
        me.lastPractice = now;
        if (d.won) { storyStep(me.p, 'practiceWin'); save(me.p); }
        const P = me.p.practice, day = today();
        if (P.day !== day) { P.day = day; P.n = 0; }
        if (P.n >= XP.PRACTICE_DAILY) return reply({ ok: true, xp: 0, msg: 'Il Fantasma ti ha già insegnato abbastanza per oggi' });
        P.n++;
        const tier = [1, 2, 3].includes(+d.tier) ? +d.tier : 1;
        const xp = grantXp(me.p, d.won ? XP.PRACTICE[tier] : XP.PRACTICE_LOSS);
        // dal Guerriero in su il Fantasma conta come vittoria della carta e lascia l'Essenza del suo seme (due al giorno)
        let ess = null;
        if (d.won && tier >= 2) {
            me.p.cardWins = (me.p.cardWins || 0) + 1;
            progress(me.p, 'practice');
            const c = dayc(me.p), el = String(d.el);
            if (ELEMENTS[el] && c.pess < PRACTICE_ESS_DAILY) { c.pess++; addMat(me.p, 'ess_' + el, 1); ess = 'ess_' + el; }
        }
        save(me.p); sendMe(me);
        reply({ ok: true, xp, ess });
    });

    // =================================================================
    //  L'ALTARE DEI SETTE SEMI (Cappella in Rovina)
    // =================================================================
    const altarOk = (reply) => {
        if (me.duelId) { fail(reply, 'Non durante un duello'); return false; }
        if (Math.hypot(me.pos[0] - ALTAR.x, me.pos[2] - ALTAR.z) > ALTAR.r) { fail(reply, "Serve l'Altare della Cappella in Rovina"); return false; }
        if (levelOf(me.p) < ALTAR_LEVEL) { fail(reply, `La Custode ti riceve dal livello ${ALTAR_LEVEL}`); return false; }
        return true;
    };
    const lookChanged = (uid) => {
        if (Object.values(me.p.equipment || {}).includes(uid)) io.to(me.room).emit('player:look', { id: me.p.id, name: me.p.name, appearance: me.p.appearance, look: look(me.p), element: me.p.card.element });
    };
    const trialDone = (p, g) => !g.trial || (g.trial.kind === 'wins' ? (p.cardWins || 0) >= g.trial.n : g.trial.kind === 'fish' ? !!p.fishLog?.[g.trial.fish]?.n : g.trial.kind === 'league' ? (p.peakLeague || 0) >= g.trial.n : false);
    // Risveglio della carta: Filigrana, Aurora, Incisa
    on('altar:awaken', (d, reply) => {
        if (!altarOk(reply)) return;
        const p = me.p, next = CARD_GRADES[(p.grade || 0) + 1];
        if (!next) return fail(reply, 'La tua carta è già al grado più alto');
        if (next.locked) return fail(reply, next.locked);
        if (levelOf(p) < next.lv) return fail(reply, `Il grado ${next.name} si raggiunge dal livello ${next.lv}`);
        if (!trialDone(p, next)) return fail(reply, `Prova non ancora superata: ${next.trial.text}`);
        const need = resolveMats(next.mats, p.card.element);
        if (!hasMats(p, need)) return fail(reply, 'Ti mancano dei materiali');
        if (p.coins < next.coins) return fail(reply, `Servono ${next.coins} Sputnik Coin`);
        p.coins -= next.coins; takeMats(p, need);
        p.grade = (p.grade || 0) + 1; p.cardWins = 0;
        save(p); sendMe(me);
        sysChat(me.room, `✦ La carta di ${p.name} si è risvegliata: ora è ${next.name}!`);
        reply({ ok: true, grade: p.grade, name: next.name });
    });
    // Incantamento: fino a +5 riesce quasi sempre, poi si rischia di scendere di uno (la Pergamena Benedetta protegge)
    on('altar:enchant', (d, reply) => {
        if (!altarOk(reply)) return;
        const p = me.p, it = p.inventory.find(i => i.uid === d.uid);
        if (!it) return fail(reply, 'Oggetto non trovato');
        if (it.kind !== 'weapon' && !ITEMS[it.itemId]) return fail(reply, 'Questo non si può incantare');
        const obj = it.kind === 'weapon' ? it.spec : it, cur = plusOf(obj), cap = enchantCap(levelOf(p));
        if (cur >= 10) return fail(reply, 'Il pezzo è già a +10');
        if (cur >= cap) return fail(reply, `Al tuo livello la Custode incanta fino a +${cap}`);
        const step = ENCHANT[cur + 1], need = enchantMats(step, p.mats, p.card.element);
        if (!hasMats(p, need)) return fail(reply, 'Ti mancano dei materiali');
        if (p.coins < step.coins) return fail(reply, `Servono ${step.coins} Sputnik Coin`);
        const scroll = !!d.scroll && step.drop;
        if (scroll && !(p.mats.pergamena > 0)) return fail(reply, 'Non hai Pergamene Benedette');
        p.coins -= step.coins; takeMats(p, need);
        if (scroll) p.mats.pergamena--;
        const success = Math.random() < step.ok;
        const plus = success ? cur + 1 : step.drop && !scroll ? cur - 1 : cur;
        if (plus > 0) obj.plus = plus; else delete obj.plus;
        progress(p, 'enchant');
        save(p); sendMe(me); lookChanged(it.uid);
        if (success && plus >= 8) sysChat(me.room, `✦ ${p.name} ha incantato un pezzo a +${plus}!`);
        reply({ ok: true, success, plus, from: cur, saved: !success && scroll });
    });
    // Infusione: l'arma prende l'effetto di un seme sul colpo pesante
    on('altar:infuse', (d, reply) => {
        if (!altarOk(reply)) return;
        const p = me.p, it = p.inventory.find(i => i.uid === d.uid), el = String(d.el);
        if (!it || it.kind !== 'weapon') return fail(reply, "Si infondono solo le armi");
        if (levelOf(p) < INFUSE_LEVEL) return fail(reply, `Le infusioni si imparano dal livello ${INFUSE_LEVEL}`);
        if (!ELEMENTS[el]) return fail(reply, 'Seme sconosciuto');
        if (it.spec.inf === el) return fail(reply, "L'arma porta già questa infusione");
        if (!(p.mats['ess_' + el] > 0)) return fail(reply, `Serve un'Essenza di ${ELEMENTS[el].name}`);
        if (p.coins < INFUSE_COST) return fail(reply, `Servono ${INFUSE_COST} Sputnik Coin`);
        p.coins -= INFUSE_COST; p.mats['ess_' + el]--;
        it.spec.inf = el;
        save(p); sendMe(me); lookChanged(it.uid);
        reply({ ok: true, el });
    });
    // Fusione: 8 Frammenti e un'Essenza fanno una Runa; tre Essenze di altri semi ne fanno una del tuo
    on('altar:fuse', (d, reply) => {
        if (!altarOk(reply)) return;
        const p = me.p, el = String(d.el), mine = p.card.element;
        if (!ELEMENTS[el]) return fail(reply, 'Seme sconosciuto');
        let need, out;
        if (d.recipe === 'runa') { need = { frammento: FUSE.runa.frammento, ['ess_' + el]: FUSE.runa.ess }; out = 'runa_' + el; }
        else if (d.recipe === 'trasmuta') {
            if (el === mine) return fail(reply, 'Scegli un seme diverso dal tuo');
            need = { ['ess_' + el]: FUSE.trasmuta.ess }; out = 'ess_' + mine;
        } else return fail(reply, 'Ricetta sconosciuta');
        const coins = FUSE[d.recipe].coins;
        if (!hasMats(p, need)) return fail(reply, 'Ti mancano dei materiali');
        if (p.coins < coins) return fail(reply, `Servono ${coins} Sputnik Coin`);
        p.coins -= coins; takeMats(p, need); addMat(p, out, 1);
        save(p); sendMe(me);
        reply({ ok: true, out });
    });
    // Sigilli sulla carta (gli slot dipendono dal grado)
    on('altar:seal', (d, reply) => {
        if (!altarOk(reply)) return;
        const p = me.p, id = String(d.id);
        if (!p.seals.includes(id)) return fail(reply, 'Non possiedi questo sigillo');
        if (d.on) {
            if (p.sealsOn.includes(id)) return reply({ ok: true });
            if (p.sealsOn.length >= sealSlots(p.grade)) return fail(reply, p.grade ? 'Non ci sono altri posti sulla carta: togli prima un sigillo' : 'Risveglia la carta per avere il primo posto per un sigillo');
            p.sealsOn.push(id);
        } else p.sealsOn = p.sealsOn.filter(s => s !== id);
        save(p); sendMe(me);
        reply({ ok: true });
    });
    // Offerta alla Custode: un'ora di esperienza in più, una volta al giorno
    on('altar:offer', (d, reply) => {
        if (!altarOk(reply)) return;
        const p = me.p;
        if (p.blessing?.day === today()) return fail(reply, "La Custode ha già accettato un'offerta oggi");
        if (p.coins < BLESSING.coins) return fail(reply, `L'offerta è di ${BLESSING.coins} Sputnik Coin`);
        p.coins -= BLESSING.coins;
        p.blessing = { day: today(), until: Date.now() + BLESSING.ms };
        save(p); sendMe(me);
        reply({ ok: true, until: p.blessing.until });
    });

    // --- RACCOLTA: frammenti nel Cerchio di Pietre, fuochi fatui nel cimitero ---
    on('gather:pick', (d, reply) => {
        const n = GATHER.nodes.find(x => x.id === d.id);
        if (!n) return fail(reply, 'Non c\'è niente qui');
        if (me.duelId) return fail(reply, 'Non durante un duello');
        if (Math.hypot(me.pos[0] - n.x, me.pos[2] - n.z) > (n.kind === 'ecto' ? 6 : 3.2)) return fail(reply, 'Troppo lontano');
        const p = me.p, now = Date.now();
        for (const [k, t] of Object.entries(p.gather)) if (t <= now) delete p.gather[k];
        if (p.gather[n.id] > now) return fail(reply, n.kind === 'ecto' ? 'Il fuoco fatuo è già svanito' : 'Il frammento non è ancora ricresciuto');
        p.gather[n.id] = now + GATHER.cooldown[n.kind];
        const c = dayc(p), full = c[n.kind] < GATHER.daily[n.kind];
        c[n.kind]++;
        const got = addMat(p, n.kind, full ? (n.kind === 'frammento' && Math.random() < 0.15 ? 2 : 1) : Math.random() < 0.25 ? 1 : 0);
        const xp = full ? grantXp(p, GATHER.xp) : 0;
        const seal = Math.random() < SEAL_CHANCE ? giveSeal(p, GATHER.seal[n.kind]) : null;
        if (got) progress(p, 'gather', got, { mat: n.kind });
        save(p); sendMe(me);
        reply({ ok: true, kind: n.kind, got, xp, seal, full });
    });

    // --- LA PESCA NELLA NEBBIA (il Molo) ---
    on('fish:cast', (d, reply) => {
        if (me.duelId) return fail(reply, 'Non durante un duello');
        if (Math.hypot(me.pos[0] - FISH_SPOT.x, me.pos[2] - FISH_SPOT.z) > FISH_SPOT.r + 1.5) return fail(reply, 'Si pesca in fondo al molo');
        const now = Date.now();
        if (me.fishing && now - me.fishing.at < 1200) return fail(reply, 'Piano, la lenza è ancora in acqua');
        const rod = rodOf(me.p), pf = petFish(me.p.pet), night = nightNow(), fish = rollFish(night, Math.random, rod.luck + (pf.luck || 0));
        me.fishing = { id: uid(), fish, at: now, bite: Math.round((1800 + Math.random() * 4200) * rod.bite) };
        reply({ ok: true, id: me.fishing.id, bite: me.fishing.bite, diff: FISH[fish].diff, move: FISH[fish].move, night, left: Math.max(0, fishDaily(me.p) - dayc(me.p).fish) });
    });
    on('fish:reel', (d, reply) => {
        const F = me.fishing;
        if (!F || F.id !== d.id) return fail(reply, 'La lenza si è spezzata');
        me.fishing = null;
        if (!d.ok) return reply({ ok: true, caught: false });
        const f = FISH[F.fish], R = FISH_RARITY[f.rar];
        if (Date.now() - F.at < F.bite + (1200 + f.diff * 1500) / (1 + rodOf(me.p).fill)) return reply({ ok: true, caught: false, msg: 'Troppa fretta: il pesce si è liberato' });
        const p = me.p, c = dayc(p), full = c.fish < fishDaily(p);
        c.fish++;
        const size = Math.round(f.size[0] + Math.pow(Math.random(), 1.6) * (f.size[1] - f.size[0]));
        const log = p.fishLog[F.fish] ||= { n: 0, best: 0 };
        const first = !log.n, record = !first && size > log.best;
        log.n++; log.best = Math.max(log.best, size);
        const out = { ok: true, caught: true, fish: F.fish, size, first, record, xp: 0, coins: 0, loot: {}, page: null, seal: null, full };
        if (f.rar === 'special') {
            // le bottiglie portano le pagine del Diario del Naufrago, in ordine; quando è finito, Pergamene Benedette
            const next = DIARY.findIndex((_, i) => !p.diary.includes(i));
            if (next >= 0) {
                p.diary.push(next); out.page = next;
                if (next === 7 && !p.recipes.includes('lancio')) { p.recipes.push('lancio'); out.recipe = 'lancio'; }
                if (p.diary.length === DIARY.length) out.seal = giveSeal(p, 'naufrago');
                if (Math.random() < 0.2) out.loot.pergamena = addMat(p, 'pergamena', 1);
            } else out.loot.pergamena = addMat(p, 'pergamena', 1);
            if (!out.seal && Math.random() < SEAL_CHANCE) out.seal = giveSeal(p, 'marea');
            out.xp = full ? grantXp(p, 10) : 0;
        } else if (f.rar === 'junk') out.xp = full ? grantXp(p, 2) : 0;
        else {
            const k = full ? 1 : 0.25;
            out.xp = grantXp(p, R.xp * k);
            out.coins = Math.round(R.coins * k); p.coins += out.coins;
            let perle = R.perla >= 1 ? R.perla : Math.random() < R.perla ? 1 : 0;
            if (!full) perle = Math.random() < 0.25 ? Math.min(1, perle) : 0;
            if (perle) out.loot.perla = addMat(p, 'perla', perle);
            if ((f.rar === 'rar' || f.rar === 'epi') && Math.random() < SEAL_CHANCE * 3) out.seal = giveSeal(p, 'marea');
            // il Corallo Nero sale attaccato ai pesci rari (a premi pieni)
            if (full && Math.random() < (CORAL_CHANCE[f.rar] || 0)) out.loot.corallo = addMat(p, 'corallo', 1);
        }
        // il gatto con gli stivali sa dove abboccano quelli che pagano bene
        const pf = petFish(p.pet);
        if (pf.coins && out.coins) { const extra = Math.round(out.coins * pf.coins); p.coins += extra; out.coins += extra; }
        out.pet = petGain(p, 4, 'fish');
        progress(p, 'fish', 1, { id: F.fish, rar: f.rar });
        if (FISH_IDS.filter(id => FISH[id].rar !== 'special').every(id => p.fishLog[id]?.n)) award(p, 'pescatore');
        save(p); sendMe(me);
        if (f.rar === 'epi') sysChat(me.room, `🎣 ${p.name} ha pescato un ${f.name} di ${size} cm!`);
        reply(out);
    });

    // --- LA CASA DEL CANTIERE: si cambia tutta, pagando la differenza (quel che togli rende metà) ---
    on('casa:save', (d, reply) => {
        const p = me.p;
        if (!p.casa) return fail(reply, 'La casa del cantiere non è ancora tua');
        const L = cleanCasa(d.casa);
        if (!L) return fail(reply, 'Qualcosa non torna nel progetto');
        // quel che c'è dentro bauli e cucce non può restare senza casa
        if (bauleUsed(p.baule) > casaCount(L, 'baule') * BAULE_SLOTS) return fail(reply, casaCount(L, 'baule') ? "Nei bauli che restano non ci sta tutto quello che c'è dentro: prima svuotane un po'" : 'Prima svuota il baule: dentro ci sono le tue cose');
        if ((p.cuccia?.length || 0) > casaCount(L, 'cuccia')) return fail(reply, 'Nella cuccia dorme ancora qualcuno: prima riprendilo');
        const before = casaValue(p.casa), after = casaValue(L), pay = {}, back = {};
        for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
            const diff = (after[k] || 0) - (before[k] || 0);
            if (diff > 0) pay[k] = diff; else if (diff < 0) back[k] = Math.floor(-diff / 2);
        }
        const miss = costMissing(p, pay);
        if (miss.length) return fail(reply, 'Ti manca ancora: ' + miss.map(([k, n]) => `${n} ${k === 'coins' ? 'monete' : MATS[k].name}`).join(', '));
        payCost(p, pay);
        for (const [k, n] of Object.entries(back)) { if (k === 'coins') p.coins += n; else addMat(p, k, n); }
        p.casa = L;
        save(p); sendMe(me);
        reply({ ok: true, pay, back });
    });

    // --- A CASA DI UN AMICO: si vede la sua casa (e il suo giardino) sul lotto del cantiere ---
    on('casa:visit', (d, reply) => {
        const p = me.p, id = String(d.id || '');
        if (!p.friends.includes(id)) return fail(reply, 'Si va a trovare solo gli amici');
        const F = byPid(id);
        if (!F) return fail(reply, 'Non lo trovo più');
        if (!F.casa) return fail(reply, `${F.name} non ha ancora una casa: Rob gliela lascerà dopo la grande cena`);
        const S = sessionOf(id);
        if (S) notify(S, `${p.name} è venuto a trovarti a casa`, 'ok');
        reply({ ok: true, id, name: F.name, casa: F.casa, cuccia: (F.cuccia || []).map(P => ({ sp: P.sp, name: P.name })) });
    });

    // --- LA RIVA VIVA: i giochi del villaggio (il forno, i sassi, la mappa) ---
    on('riva:start', (d, reply) => {
        const p = me.p, c = dayc(p), G = RIVA_GAMES[d.g];
        if (!G) return fail(reply, 'Questo gioco non c\'è');
        if (!me.pos || !nearRiva(me.pos[0], me.pos[2])) return fail(reply, 'Si gioca alla Riva di Là');
        if ((c.riva?.[d.g] || 0) >= G.daily) return fail(reply, 'Per oggi basta: torna domani');
        me.rivaRun = { g: d.g, t: Date.now() };
        reply({ ok: true });
    });
    on('riva:done', (d, reply) => {
        const p = me.p, c = dayc(p), R = me.rivaRun, G = RIVA_GAMES[d.g];
        if (!G || !R || R.g !== d.g) return fail(reply, 'Prima comincia a giocare');
        me.rivaRun = null;
        if (Date.now() - R.t < G.minMs) return fail(reply, 'Troppo in fretta');
        c.riva ||= {};
        if ((c.riva[d.g] || 0) >= G.daily) return fail(reply, 'Per oggi basta');
        c.riva[d.g] = (c.riva[d.g] || 0) + 1;
        const P = rivaPrize(d.g, d.score);
        p.coins += P.coins;
        for (const [k, n] of Object.entries(P.mats)) addMat(p, k, n);
        const xp = grantXp(p, P.xp);
        const B = p.rivaBest ||= {}, sc = +d.score || 0, best = sc > (B[d.g] || 0);
        if (best) B[d.g] = Math.round(sc * 100) / 100;
        save(p); sendMe(me);
        reply({ ok: true, coins: P.coins, xp, mats: P.mats, best });
    });

    // --- LA PALESTRA DI LORENZONE ---
    const atGym = () => me.pos && inPalestra(me.pos[0], me.pos[1], me.pos[2]);
    on('gym:start', (d, reply) => {
        const p = me.p, c = dayc(p);
        if (!atGym()) return fail(reply, 'La palestra è al secondo piano del mastio, sopra la Stanza Bianca');
        if (!ATTREZZI[d.a]) return fail(reply, 'Questo attrezzo non c\'è');
        if ((c.gym || 0) >= GYM_DAILY) return fail(reply, 'Per oggi basta: Lorenzone dice che i muscoli crescono dormendo');
        me.gymRun = { a: d.a, t: Date.now() };
        reply({ ok: true });
    });
    on('gym:done', (d, reply) => {
        const p = me.p, c = dayc(p), R = me.gymRun;
        if (!R || R.a !== d.a) return fail(reply, 'Prima comincia l\'allenamento');
        me.gymRun = null;
        if (Date.now() - R.t < GYM_MIN_MS) return fail(reply, 'Troppo in fretta: Lorenzone non ci crede');
        if ((c.gym || 0) >= GYM_DAILY) return fail(reply, 'Per oggi basta');
        c.gym = (c.gym || 0) + 1;
        const { xp, pts } = gymReward(d.score);
        const G = p.gym ||= { lv: 0, pts: 0 }, before = G.lv;
        if (G.lv < GYM_MAX) { G.pts += pts; while (G.lv < GYM_MAX && G.pts >= gymToNext(G.lv)) { G.pts -= gymToNext(G.lv); G.lv++; } if (G.lv >= GYM_MAX) G.pts = 0; }
        const gained = grantXp(p, xp);
        save(p); sendMe(me);
        reply({ ok: true, xp: gained, pts, up: G.lv - before, lv: G.lv });
    });
    // --- IL BAULE DI CASA: metti via e riprendi oggetti e materiali ---
    const atHome = () => me.p.casa && me.pos && inCasa(me.pos[0], me.pos[2]);
    on('baule:move', (d, reply) => {
        const p = me.p, put = d.dir === 'put';
        if (!atHome()) return fail(reply, 'Il baule è a casa tua, nelle Terre Nuove');
        const nb = casaCount(p.casa, 'baule');
        if (!nb) return fail(reply, 'Non hai un baule in casa: mettilo dal tecnigrafo');
        const B = p.baule ||= { inv: [], mats: {} };
        const uids = Array.isArray(d.uids) ? d.uids.slice(0, 80).map(Number) : [];
        const mats = Object.entries(d.mats || {}).filter(([k, n]) => MATS[k] && Number.isInteger(n) && n > 0);
        if (put) {
            const eq = Object.values(p.equipment || {});
            const items = uids.map(u => p.inventory.find(i => i.uid === u));
            if (items.some(i => !i)) return fail(reply, "Non hai più quell'oggetto");
            if (uids.some(u => eq.includes(u))) return fail(reply, 'Prima toglitelo di dosso');
            for (const [k, n] of mats) if ((p.mats[k] || 0) < n) return fail(reply, `Non hai ${n} × ${MATS[k].name}`);
            const newKinds = mats.filter(([k]) => !(B.mats[k] > 0)).length;
            if (bauleUsed(B) + items.length + newKinds > nb * BAULE_SLOTS) return fail(reply, `Il baule è pieno (${nb * BAULE_SLOTS} posti${nb < 3 ? ': un altro baule ne aggiunge ' + BAULE_SLOTS : ''})`);
            for (const it of items) { p.inventory.splice(p.inventory.indexOf(it), 1); if (p.reserve === it.uid) p.reserve = null; B.inv.push(it); }
            for (const [k, n] of mats) { p.mats[k] -= n; B.mats[k] = (B.mats[k] || 0) + n; }
        } else {
            const items = uids.map(u => B.inv.find(i => i.uid === u));
            if (items.some(i => !i)) return fail(reply, "Nel baule non c'è");
            if (p.inventory.length + items.length > 80) return fail(reply, 'La bisaccia è piena (80 oggetti)');
            for (const [k, n] of mats) if ((B.mats[k] || 0) < n) return fail(reply, 'Nel baule non ce ne sono così tanti');
            for (const it of items) { B.inv.splice(B.inv.indexOf(it), 1); p.inventory.push(it); }
            for (const [k, n] of mats) { B.mats[k] -= n; if (!B.mats[k]) delete B.mats[k]; addMat(p, k, n); }
        }
        save(p); sendMe(me); reply({ ok: true });
    });
    // --- LA CUCCIA: un pet resta a casa a riposare, e intanto ne porti un altro ---
    const REST_MS = 10 * 60e3;   // dieci minuti nella cuccia e torna in forze
    on('pet:home', (d, reply) => {
        const p = me.p;
        if (!atHome()) return fail(reply, 'La cuccia è a casa tua');
        const C = p.cuccia ||= [], nc = casaCount(p.casa, 'cuccia');
        if (!nc) return fail(reply, 'Non hai una cuccia in casa: mettila dal tecnigrafo');
        const i = d.i == null ? -1 : d.i | 0;
        if (i >= 0) {   // riprendi quello della cuccia i (e se ne hai uno con te, si danno il cambio)
            const P = C[i]; if (!P) return fail(reply, 'Quella cuccia è vuota');
            if (Date.now() - (P.homeAt || 0) >= REST_MS) P.health = petMaxHealth(P);
            delete P.homeAt;
            if (p.pet) C[i] = { ...p.pet, homeAt: Date.now() }; else C.splice(i, 1);
            p.pet = P;
        } else {        // lascia a casa quello che hai con te
            if (!p.pet) return fail(reply, 'Non hai un pet con te');
            if (C.length >= nc) return fail(reply, 'Le cucce sono tutte occupate');
            C.push({ ...p.pet, homeAt: Date.now() }); p.pet = null;
        }
        save(p); sendMe(me); petNews(me); reply({ ok: true, name: p.pet?.name || null });
    });

    // --- LE GENTI DI PASSAGGIO: baratto e duello con i viandanti del giorno ---
    const genteNear = (k, r = 25) => { if (!(k >= 0 && k < GENTI_PER_DAY)) return null; const G = gente(today(), k), at = genteAt(G); return Math.hypot(me.pos[0] - at.x, me.pos[2] - at.z) <= r ? G : null; };
    on('gente:trade', (d, reply) => {
        const p = me.p, k = int(d.k, 0, GENTI_PER_DAY - 1), G = genteNear(k), c = dayc(p);
        if (!G) return fail(reply, 'Se n\'è già andato per la sua strada');
        c.gt ||= {};
        if (c.gt[k]) return fail(reply, 'Per oggi basta: torna domani');
        if (costMissing(p, G.trade.give).length) return fail(reply, 'Non hai abbastanza da dargli in cambio');
        payCost(p, G.trade.give);
        for (const [m, n] of Object.entries(G.trade.get)) { if (m === 'coins') p.coins += n; else addMat(p, m, n); }
        c.gt[k] = 1;
        save(p); sendMe(me); reply({ ok: true, today: gentiToday(p) });
    });
    on('gente:sfida', (d, reply) => {
        const k = int(d.k, 0, GENTI_PER_DAY - 1), G = genteNear(k);
        if (!G) return fail(reply, 'Se n\'è già andato per la sua strada');
        if (me.duelId) return fail(reply, 'Sei già in duello');
        me.genteFight = { k, at: Date.now(), day: today() };
        reply({ ok: true });
    });
    on('gente:esito', (d, reply) => {
        const p = me.p, F = me.genteFight, c = dayc(p);
        me.genteFight = null;
        if (!F || F.k !== int(d.k, 0, GENTI_PER_DAY - 1) || F.day !== today()) return fail(reply, 'Quel duello non risulta');
        const secs = (Date.now() - F.at) / 1000;
        if (secs < 15 || secs > 900) return reply({ ok: true, xp: 0, today: gentiToday(p) });   // duelli lampo o dimenticati: niente premi
        c.gf ||= {};
        const won = !!d.won, out = { ok: true, xp: 0, coins: 0, loot: {} };
        if (!c.gf[F.k] && Object.keys(c.gf).length < GENTI_FIGHT_DAILY) {
            c.gf[F.k] = 1;
            const G = gente(F.day, F.k), Pz = premio(G, levelOf(p), won);
            out.xp = grantXp(p, Pz.xp);
            p.coins += Pz.coins; out.coins = Pz.coins;
            for (const [m, n] of Object.entries(Pz.loot)) if (n) out.loot[m] = addMat(p, m, n);
            if (Pz.itemChance && Math.random() < Pz.itemChance && p.inventory.length < 80) {
                const id = bottinoOggetto(G); if (id) { p.inventory.push({ uid: uid(), kind: 'item', itemId: id }); out.item = id; out.itemName = ITEMS[id].name; }
            }
            if (won) progress(p, 'duel');
        }
        out.today = gentiToday(p);
        save(p); sendMe(me); reply(out);
    });

    // --- GLI ERRANTI: un baratto al giorno con ciascuno, se gli sei vicino ---
    on('errante:trade', (d, reply) => {
        const p = me.p, id = String(d.id), E = ERRANTI[id], c = dayc(p);
        if (!E?.trade) return fail(reply, 'Non baratta');
        const at = erranteAt(id);
        if (Math.hypot(me.pos[0] - at.x, me.pos[2] - at.z) > 8) return fail(reply, `${E.name} è già andato avanti`);
        c.err ||= {};
        if (c.err[id]) return fail(reply, 'Per oggi basta: torna domani');
        if (costMissing(p, E.trade.give).length) return fail(reply, 'Non hai abbastanza da dargli in cambio');
        payCost(p, E.trade.give);
        for (const [k, n] of Object.entries(E.trade.get)) addMat(p, k, n);
        c.err[id] = 1;
        save(p); sendMe(me); reply({ ok: true });
    });

    // --- IL RIGHELLO DI ROB: un ramo della storia che si vive solo con lui ---
    on('rob:act', (d, reply) => {
        const p = me.p, st = (p.rob ||= newRob()), C = ROB_CHAPTERS[st.ch], S = robStep(st), a = String(d.a), out = {};
        if (!S) return fail(reply, 'Il racconto di Rob è finito. Le tavole sono nello studio.');
        if (a !== S.k) return fail(reply, 'Non adesso');
        const need = st.ch === 0 ? ROB_LEVEL : C.lv || 1;
        if (st.i === 0 && levelOf(p) < need) return fail(reply, `Rob ti aspetta dal livello ${need}`);
        const nearRob = () => !!NPCS.rob && Math.hypot(me.pos[0] - NPCS.rob.x, me.pos[2] - NPCS.rob.z) <= 7;
        const spotErr = (k) => {
            const P = ROB_SPOTS[k];
            if (!P) return "Non c'è niente qui";
            if (Math.hypot(me.pos[0] - P.x, me.pos[2] - P.z) > (P.r || 3) + 1.5) return 'Troppo lontano';
            // vale la notte vera e anche la sera dell'isola (il suo giorno dura 24 minuti)
            if (P.night && !nightNow()) return "Rob ha detto stanotte: aspetta che sull'isola si faccia sera";
            return null;
        };
        const advance = () => {
            st.i++; st.got = [];
            if (st.i < C.steps.length) return;
            out.chapter = st.ch;
            out.xp = (out.xp || 0) + grantXp(p, C.xp);
            p.coins += C.coins; out.coins = C.coins;
            if (C.title_id && award(p, C.title_id)) out.title = C.title_id;
            st.done = { ...(st.done || {}), [st.ch]: Date.now() };
            st.ch++; st.i = 0;
        };
        if (a === 'talk' || a === 'answer') {
            if (!nearRob()) return fail(reply, 'Rob è allo Studio del Geometra, nelle Terre Nuove');
            if (a === 'answer') {
                if (d.n == null) return fail(reply, 'Scegli una risposta');
                (st.ans ||= [])[st.ch] = int(d.n, 0, S.a.length - 1);
            }
            advance();
        } else if (a === 'find') {
            const k = String(d.k);
            if (!S.spots.includes(k)) return fail(reply, "Non c'è niente qui");
            const err = spotErr(k);
            if (err) return fail(reply, err);
            if (st.got.includes(k)) return fail(reply, "Questo l'hai già trovato");
            st.got.push(k); out.got = k;
            if (S.spots.length > 1) out.xp = grantXp(p, 30);
            if (S.spots.every(s => st.got.includes(s))) advance();
        } else if (a === 'cena') {
            const err = spotErr(S.spot);
            if (err) return fail(reply, err);
            out.cena = true;
            advance();
            if (!p.casa) p.casa = casaDiRob();   // il cantiere è finito: la casa è tua
            sysChat(me.room, `🕯 Alla Tavola Lunga, nelle Terre Nuove, ${p.name} ha cenato con Rob il Righello.`);
        } else return fail(reply, "Non c'è niente qui");
        save(p); sendMe(me);
        reply({ ok: true, rob: st, ...out });
    });

    // --- LO SCAMBIO FRA GIOCATORI: vendere, comprare, permutare, senza passare dal Bazar ---
    // Si apre un tavolo a due: ognuno mette oggetti e monete, tutti e due confermano, e solo allora si scambia.
    // Ogni cambio di offerta toglie le conferme (niente furbizie all'ultimo secondo).
    const tradeView = (T) => ({ id: T.id, names: T.names, ids: T.pids, offer: T.offer, ok: T.ok });
    const tradeSend = (T) => { for (const s of ['a', 'b']) { const S = sessionOf(T.pids[s]); if (S) S.socket.emit('trade:state', { ...tradeView(T), side: s }); } };
    const tradeClose = (T, why) => {
        trades.delete(T.id);
        for (const s of ['a', 'b']) { const S = sessionOf(T.pids[s]); if (S) { if (S.tradeId === T.id) S.tradeId = null; S.socket.emit('trade:closed', { id: T.id, why }); } }
    };
    on('trade:open', (d, reply) => {
        const B = sessionOf(String(d.to)), p = me.p;
        if (!B || B === me) return fail(reply, 'Giocatore non disponibile');
        if (me.tradeId || B.tradeId) return fail(reply, 'Uno dei due sta già scambiando');
        if (me.duelId || B.duelId) return fail(reply, 'Non durante un duello');
        const id = uid();
        const T = { id, pids: { a: p.id, b: B.p.id }, names: { a: p.name, b: B.p.name }, offer: { a: { items: [], coins: 0 }, b: { items: [], coins: 0 } }, ok: { a: false, b: false }, open: false, at: Date.now() };
        trades.set(id, T); me.tradeId = id;
        B.socket.emit('trade:invite', { id, from: { id: p.id, name: p.name } });
        setTimeout(() => { if (trades.get(id) === T && !T.open) tradeClose(T, `${B.p.name} non ha risposto`); }, 30000);
        reply({ ok: true, id });
    });
    on('trade:answer', (d, reply) => {
        const T = trades.get(String(d.id));
        if (!T || T.pids.b !== me.p.id || T.open) return fail(reply, 'Proposta scaduta');
        if (!d.yes) { tradeClose(T, `${me.p.name} ha detto di no`); return reply({ ok: true }); }
        if (me.tradeId) return fail(reply, 'Stai già scambiando con qualcun altro');
        T.open = true; me.tradeId = T.id;
        tradeSend(T); reply({ ok: true });
    });
    on('trade:set', (d, reply) => {
        const T = trades.get(me.tradeId), p = me.p;
        if (!T || !T.open) return fail(reply, 'Nessuno scambio aperto');
        const side = T.pids.a === p.id ? 'a' : 'b', eq = Object.values(p.equipment || {});
        const items = [...new Set((Array.isArray(d.items) ? d.items : []).map(String))].slice(0, 12);
        for (const u of items) { const it = p.inventory.find(i => i.uid === u); if (!it) return fail(reply, 'Oggetto non trovato'); if (eq.includes(u)) return fail(reply, 'Prima toglilo di dosso'); }
        const coins = int(d.coins, 0, 999999);
        if (coins > p.coins) return fail(reply, 'Non hai tutte quelle monete');
        T.offer[side] = { items, coins, show: items.map(u => p.inventory.find(i => i.uid === u)) };
        T.ok = { a: false, b: false };
        tradeSend(T); reply({ ok: true });
    });
    on('trade:ok', (d, reply) => {
        const T = trades.get(me.tradeId), p = me.p;
        if (!T || !T.open) return fail(reply, 'Nessuno scambio aperto');
        const side = T.pids.a === p.id ? 'a' : 'b';
        T.ok[side] = !!d.yes;
        if (!(T.ok.a && T.ok.b)) { tradeSend(T); return reply({ ok: true }); }
        // tutti e due d'accordo: si controlla tutto di nuovo e si scambia in un colpo solo
        const P = { a: byPid(T.pids.a), b: byPid(T.pids.b) };
        for (const s of ['a', 'b']) {
            const o = T.offer[s], q = P[s], other = P[s === 'a' ? 'b' : 'a'];
            if (!q || !sessionOf(q.id)) { tradeClose(T, 'Uno dei due se n\'è andato'); return reply({ ok: false, msg: 'Scambio annullato' }); }
            if (q.coins < o.coins || o.items.some(u => !q.inventory.some(i => i.uid === u) || Object.values(q.equipment || {}).includes(u))) { T.ok = { a: false, b: false }; tradeSend(T); return fail(reply, `${q.name} non ha più quello che aveva offerto`); }
            if (other.inventory.length - T.offer[s === 'a' ? 'b' : 'a'].items.length + o.items.length > 80) { T.ok = { a: false, b: false }; tradeSend(T); return fail(reply, `La bisaccia di ${other.name} è troppo piena`); }
        }
        const move = (from, to, o) => {
            from.coins -= o.coins; to.coins += o.coins;
            for (const u of o.items) { const i = from.inventory.findIndex(x => x.uid === u); const [it] = from.inventory.splice(i, 1); if (from.reserve === u) from.reserve = null; to.inventory.push({ ...it, uid: uid() }); }
        };
        move(P.a, P.b, T.offer.a); move(P.b, P.a, T.offer.b);
        for (const s of ['a', 'b']) { save(P[s]); const S = sessionOf(P[s].id); if (S) sendMe(S); }
        console.log(`[scambio] ${P.a.name} ⇄ ${P.b.name}: ${T.offer.a.items.length}+${T.offer.a.coins} / ${T.offer.b.items.length}+${T.offer.b.coins}`);
        tradeClose(T, 'done');
        reply({ ok: true, done: true });
    });
    on('trade:cancel', (d, reply) => {
        const T = trades.get(me.tradeId || String(d?.id || ''));
        if (T && (T.pids.a === me.p.id || T.pids.b === me.p.id)) tradeClose(T, `${me.p.name} ha chiuso lo scambio`);
        me.tradeId = null; reply({ ok: true });
    });

    // --- LO SPOGLIATOIO: prima del duello si sceglie con cosa combattere ---
    on('duel:loadout', (d, reply) => {
        const D = duels.get(me.duelId), p = me.p;
        if (!D || D.phase !== 'betting') return fail(reply, 'Lo spogliatoio è chiuso: si combatte');
        const side = D.pids.a === p.id ? 'a' : D.pids.b === p.id ? 'b' : null;
        if (!side) return fail(reply, 'Non è il tuo duello');
        if (d.main !== undefined) {
            if (d.main === null) delete p.equipment.weapon;
            else {
                const w = p.inventory.find(i => i.uid === d.main && i.kind === 'weapon');
                if (!w) return fail(reply, 'Arma non trovata');
                if (w.broken) return fail(reply, 'È rotta: portala da Mastro Brace');
                if (!w.legacy && weaponLevel(w.spec) > levelOf(p)) return fail(reply, 'Non sei ancora al suo livello');
                p.equipment.weapon = w.uid;
                if (p.reserve === w.uid) p.reserve = null;
            }
        }
        if (d.reserve !== undefined) {
            const r = d.reserve && p.inventory.find(i => i.uid === d.reserve && i.kind === 'weapon');
            if (d.reserve && (!r || r.broken)) return fail(reply, 'Questa non può fare da riserva');
            if (r && !r.legacy && weaponLevel(r.spec) > levelOf(p)) return fail(reply, 'Non sei ancora al suo livello');
            p.reserve = r && r.uid !== p.equipment.weapon ? r.uid : null;
        }
        if (d.rent !== undefined) {
            const prev = D.rent[side];
            if (prev) { p.coins += prev.price; D.rent[side] = null; }
            if (d.rent) {
                const R = RENTALS[d.rent];
                if (!R) return fail(reply, 'Quest\'arma non si noleggia');
                if (weaponLevel(R.spec) > levelOf(p)) { if (prev) { p.coins -= prev.price; D.rent[side] = prev; } return fail(reply, 'Non sei ancora al suo livello'); }
                if (p.coins < R.price) { if (prev) { p.coins -= prev.price; D.rent[side] = prev; } return fail(reply, 'Monete insufficienti per il noleggio'); }
                p.coins -= R.price; D.rent[side] = { id: d.rent, price: R.price, spec: R.spec };
            }
        }
        save(p); sendMe(me);
        reply({ ok: true, rent: D.rent[side]?.id || null, main: p.equipment.weapon || null, reserve: p.reserve || null });
    });
    // la riserva si sceglie anche fuori dall'Arena (dalla bisaccia)
    on('weapon:reserve', (d, reply) => {
        const p = me.p, r = d.uid && p.inventory.find(i => i.uid === d.uid && i.kind === 'weapon');
        if (d.uid && !r) return fail(reply, 'Arma non trovata');
        if (r?.broken) return fail(reply, 'È rotta: prima falla aggiustare');
        p.reserve = r && r.uid !== p.equipment?.weapon ? r.uid : null;
        save(p); sendMe(me); reply({ ok: true });
    });
    // i duelli giocati qui (Fantasma, scheletri, boss): il client dice quanti colpi ha messo a segno, il server li tiene bassi
    on('weapon:wear', (d, reply) => {
        const p = me.p, now = Date.now();
        if (now - (me.lastWear || 0) < 15000) return fail(reply, 'Piano');
        me.lastWear = now;
        const item = p.inventory.find(i => i.uid === p.equipment?.weapon && i.kind === 'weapon');
        const out = wearWeapon(p, item, int(d.used, 0, 60), !!d.broken);
        const pet = d.fought ? petGain(p, d.won ? 12 : 6, 'duel') : null;
        save(p); sendMe(me);
        reply({ ok: true, wear: out, pet });
    });
    // Mastro Brace aggiusta le armi: monete in proporzione all'usura, e qualche frammento per quelle di livello alto
    on('forge:repair', (d, reply) => {
        const p = me.p, it = p.inventory.find(i => i.uid === d.uid && i.kind === 'weapon');
        if (!it) return fail(reply, 'Arma non trovata');
        const cost = repairCost(it.spec, it.wear);
        if (!cost) return fail(reply, 'È già come nuova');
        const miss = costMissing(p, cost);
        if (miss.length) return fail(reply, 'Ti manca ancora: ' + miss.map(([k, n]) => `${n} ${k === 'coins' ? 'monete' : MATS[k].name}`).join(', '));
        payCost(p, cost);
        it.wear = 0; delete it.broken;
        save(p); sendMe(me);
        reply({ ok: true, cost });
    });

    // --- LA STALLA DELLE NEBBIE: Sàlvia, il Medico delle Bestie ---
    const atVet = () => nearNpcId('salvia', 7);
    on('pet:adopt', (d, reply) => {
        const p = me.p, sp = String(d.sp);
        if (!atVet()) return fail(reply, 'Sàlvia è alla Stalla delle Nebbie');
        if (levelOf(p) < PET_LEVEL) return fail(reply, `Un pet si prende dal livello ${PET_LEVEL}`);
        if (p.pet) return fail(reply, 'Hai già un compagno: uno solo per viandante');
        if (!PETS[sp]) return fail(reply, 'Non conosco questa bestia');
        if (p.coins < PET_ADOPT) return fail(reply, `Servono ${PET_ADOPT} monete per il suo mantenimento`);
        p.coins -= PET_ADOPT;
        p.pet = newPet(sp, cleanText(String(d.name || ''), 24) || PETS[sp].name);
        save(p); sendMe(me); petNews(me); reply({ ok: true, pet: p.pet });
    });
    on('pet:rename', (d, reply) => {
        const p = me.p, n = cleanText(String(d.name || ''), 24);
        if (!p.pet) return fail(reply, 'Non hai un pet');
        if (!n) return fail(reply, 'Un nome, almeno');
        p.pet.name = n; save(p); sendMe(me); petNews(me); reply({ ok: true });
    });
    on('pet:train', (d, reply) => {
        const p = me.p, P = p.pet, c = dayc(p);
        if (!atVet()) return fail(reply, 'Si addestra alla Stalla delle Nebbie');
        if (!P) return fail(reply, 'Non hai un pet');
        if (P.lv >= PET_MAX_LV) return fail(reply, 'Più di così non impara');
        if ((c.petTrain || 0) >= TRAIN.daily) return fail(reply, 'Per oggi è stanco di imparare: torna domani');
        if (petTired(P)) return fail(reply, 'È sfinito: prima fallo riposare');
        const cost = TRAIN.coins(P.lv);
        if (p.coins < cost) return fail(reply, `Servono ${cost} monete`);
        p.coins -= cost; c.petTrain = (c.petTrain || 0) + 1;
        const before = P.lv, xp = TRAIN.xp(P.lv);
        P.xp = (P.xp || 0) + xp;
        while (P.lv < PET_MAX_LV && P.xp >= petXpToNext(P.lv)) { P.xp -= petXpToNext(P.lv); P.lv++; }
        P.health = Math.max(0, (P.health ?? petMaxHealth(P)) - 4);
        save(p); sendMe(me); reply({ ok: true, xp, up: P.lv - before, lv: P.lv });
    });
    on('pet:enchant', (d, reply) => {
        const p = me.p, P = p.pet;
        if (!atVet()) return fail(reply, 'Si incanta alla Stalla delle Nebbie');
        if (!P) return fail(reply, 'Non hai un pet');
        const e = P.ench || 0;
        if (e >= PET_MAX_ENCH) return fail(reply, 'Più incantato di così brillerebbe al buio');
        if (P.lv < PET_ENCH_LV[e]) return fail(reply, `Il prossimo incanto regge dal livello ${PET_ENCH_LV[e]} del pet`);
        const cost = PET_ENCH[e];
        if (costMissing(p, cost).length) return fail(reply, 'Ti manca ancora qualcosa per l\'incanto');
        payCost(p, cost);
        P.ench = e + 1; P.health = petMaxHealth(P);
        save(p); sendMe(me); petNews(me); reply({ ok: true, ench: P.ench });
    });
    on('pet:heal', (d, reply) => {
        const p = me.p, P = p.pet;
        if (!atVet()) return fail(reply, 'Si cura alla Stalla delle Nebbie');
        if (!P) return fail(reply, 'Non hai un pet');
        const cost = healCost(P);
        if (!cost) return fail(reply, 'Sta benissimo');
        if (costMissing(p, cost).length) return fail(reply, `Servono ${cost.coins} monete`);
        payCost(p, cost);
        P.health = petMaxHealth(P);
        save(p); sendMe(me); petNews(me); reply({ ok: true, cost });
    });
    on('pet:release', (d, reply) => {
        const p = me.p;
        if (!atVet()) return fail(reply, 'Lo si saluta alla Stalla delle Nebbie');
        if (!p.pet) return fail(reply, 'Non hai un pet');
        const name = p.pet.name;
        p.pet = null; save(p); sendMe(me); petNews(me); reply({ ok: true, name });
    });

    // --- LA RETAIA: la canna nuova, alla Barca Rovesciata ---
    const nearNpcId = (id, r = 6) => !!NPCS[id] && Math.hypot(me.pos[0] - NPCS[id].x, me.pos[2] - NPCS[id].z) <= r;
    on('rod:upgrade', (d, reply) => {
        const p = me.p, next = RODS[(p.rod || 0) + 1];
        if (!next) return fail(reply, 'Hai già la canna migliore della laguna');
        if (!nearNpcId('retaia')) return fail(reply, 'Troppo lontano dalla Retaia');
        if (levelOf(p) < next.lv) return fail(reply, `La ${next.name} si regge dal livello ${next.lv}`);
        const miss = costMissing(p, next.cost);
        if (miss.length) return fail(reply, 'Ti manca ancora qualcosa: ' + miss.map(([k, n]) => `${n} ${k === 'coins' ? 'monete' : MATS[k].name}`).join(', '));
        payCost(p, next.cost);
        p.rod = (p.rod || 0) + 1;
        const xp = grantXp(p, 40 * p.rod);
        save(p); sendMe(me);
        reply({ ok: true, rod: p.rod, xp });
    });
    // --- IL BARATTO DEL MERCANTE SENZA OMBRA ---
    const tradeDay = (p) => { const c = dayc(p); c.tr ||= {}; c.tonic ||= 0; c.items ||= 0; return c; };
    on('trade:get', (d, reply) => {
        const c = tradeDay(me.p), day = today();
        reply({ ok: true, trades: tradesOfDay(day).map(id => ({ id, used: c.tr[id] || 0 })), item: itemOfDay(day), itemTaken: !!c.tr._item,
            tonicLeft: Math.max(0, TONIC_DAILY - c.tonic), itemsLeft: Math.max(0, ITEM_TRADES_DAILY - c.items) });
    });
    on('trade:do', (d, reply) => {
        const p = me.p, c = tradeDay(p), day = today(), id = String(d.id);
        if (!nearNpcId('mercante')) return fail(reply, 'Il Mercante è al Bazar');
        if (id === '_item') {
            const O = itemOfDay(day);
            if (!O) return fail(reply, 'Oggi il Mercante non ha niente da darti');
            if (c.tr._item) return fail(reply, "L'oggetto del giorno l'hai già preso");
            if (levelOf(p) < O.lv) return fail(reply, `Torna al livello ${O.lv}`);
            if (p.inventory.length >= 80) return fail(reply, 'Inventario pieno');
            if (costMissing(p, O.give).length) return fail(reply, 'Non hai abbastanza da dargli in cambio');
            payCost(p, O.give);
            c.tr._item = 1;
            p.inventory.push({ uid: uid(), kind: 'item', itemId: O.itemId });
            save(p); sendMe(me);
            return reply({ ok: true, itemId: O.itemId });
        }
        const T = TRADES[id];
        if (!T || !tradesOfDay(day).includes(id)) return fail(reply, "Oggi questo baratto non c'è");
        if ((c.tr[id] || 0) >= T.max) return fail(reply, 'Per oggi basta così: torna domani');
        if (T.get.xp && c.tonic >= TONIC_DAILY) return fail(reply, `Al massimo ${TONIC_DAILY} tonici al giorno, o ti si annebbia la vista`);
        if (costMissing(p, T.give).length) return fail(reply, 'Non hai abbastanza da dargli in cambio');
        payCost(p, T.give);
        c.tr[id] = (c.tr[id] || 0) + 1;
        const out = { ok: true, id, xp: 0, got: {} };
        for (const [k, n] of Object.entries(T.get)) {
            if (k === 'xp') { c.tonic++; out.xp = grantXp(p, tonicXp(n, levelOf(p))); }
            else out.got[k] = addMat(p, k, n);
        }
        save(p); sendMe(me);
        reply(out);
    });
    // dai un oggetto al Mercante: monete, e le prime volte del giorno anche esperienza
    on('trade:item', (d, reply) => {
        const p = me.p, c = tradeDay(p);
        if (!nearNpcId('mercante')) return fail(reply, 'Il Mercante è al Bazar');
        const i = p.inventory.findIndex(x => x.uid === d.uid);
        if (i < 0) return fail(reply, 'Oggetto non trovato');
        if (Object.values(p.equipment).includes(d.uid)) return fail(reply, 'Prima toglilo di dosso');
        const it = p.inventory[i];
        const value = it.kind === 'weapon' ? weaponCost(it.spec) : ITEMS[it.itemId]?.price || 0;
        const v = itemTradeValue(value, levelOf(p)), withXp = c.items < ITEM_TRADES_DAILY;
        p.inventory.splice(i, 1);
        p.coins += v.coins;
        const xp = withXp ? grantXp(p, v.xp) : 0;
        if (withXp) c.items++;
        save(p); sendMe(me);
        reply({ ok: true, coins: v.coins, xp });
    });

    // =================================================================
    //  I LUOGHI DELL'ISOLA (fase 3) e LA CRONACA (fase 4)
    // =================================================================
    const near = (x, z, r) => Math.hypot(me.pos[0] - x, me.pos[2] - z) <= r;
    const needLv = (reply, lv, what) => { if (levelOf(me.p) < lv) { fail(reply, `${what} dal livello ${lv}`); return false; } return true; };

    // --- LA BACHECA DELLE TAGLIE (si riscuote in piazza) ---
    // si riscuote ovunque (tasto J): il Mercante paga anche a distanza
    on('bounty:claim', (d, reply) => {
        const p = me.p, B = ensureBounties(p);
        const b = d.weekly ? B.weekly : B.daily[int(d.i, 0, 2)];
        if (!b || !b.done) return fail(reply, 'Taglia non ancora compiuta');
        if (b.claimed) return fail(reply, 'Taglia già riscossa');
        b.claimed = true;
        const R = d.weekly ? BOUNTY_REWARD.weekly : BOUNTY_REWARD.daily;
        const xp = grantXp(p, R.xp);
        p.coins += R.coins;
        if (R.pergamena) addMat(p, 'pergamena', R.pergamena);
        save(p); sendMe(me);
        reply({ ok: true, xp, coins: R.coins, pergamena: R.pergamena || 0 });
    });

    // --- IL CANTO DELLE PIETRE (Cerchio di Pietre) ---
    on('canto:start', (d, reply) => {
        if (!needLv(reply, CANTO.level, 'Il Canto delle Pietre si impara')) return;
        if (me.duelId) return fail(reply, 'Non durante un duello');
        if (!near(STONES.x, STONES.z, 4.5)) return fail(reply, 'Mettiti al centro del Cerchio di Pietre');
        me.canto = { id: uid(), seed: crypto.randomInt(1, 2 ** 31 - 1), at: Date.now() };
        reply({ ok: true, id: me.canto.id, seed: me.canto.seed, left: Math.max(0, CANTO.daily - (dayc(me.p).canto || 0)) });
    });
    on('canto:end', (d, reply) => {
        const C = me.canto;
        if (!C || C.id !== d.id) return fail(reply, 'Il canto si è interrotto');
        me.canto = null;
        const notes = int(d.notes, 0, 40);
        if (Date.now() - C.at < cantoMinMs(notes)) return fail(reply, 'Le pietre non hanno sentito bene: troppo in fretta');
        const p = me.p, c = dayc(p), full = (c.canto || 0) < CANTO.daily;
        c.canto = (c.canto || 0) + 1;
        const out = { ok: true, notes, full, xp: 0, frammenti: 0, rune: [], seal: null, best: notes > (p.cantoBest || 0) };
        p.cantoBest = Math.max(p.cantoBest || 0, notes);
        if (notes > 0) {
            out.xp = grantXp(p, full ? notes * 3 : notes);
            if (full) {
                out.frammenti = addMat(p, 'frammento', Math.min(6, Math.floor(notes / 3)));
                // una Runa ogni 10 note: del seme della decima nota
                const seq = cantoSeq(C.seed, notes);
                for (let k = 1; k <= Math.floor(notes / CANTO.runeEvery); k++) { const r = 'runa_' + CANTO_SEEDS[seq[k * CANTO.runeEvery - 1]]; addMat(p, r, 1); out.rune.push(r); }
                if (notes >= 8 && Math.random() < SEAL_CHANCE * 2) out.seal = giveSeal(p, 'cerchio');
            }
            if (notes >= CANTO.titleAt) out.title = award(p, 'cantore');
            progress(p, 'canto', notes);
        }
        save(p); sendMe(me);
        reply(out);
    });

    // --- IL PRATO DEI MORTI (le tombe del Becchino) ---
    const gravesToday = (p) => {
        if (!p.graves || p.graves.day !== today()) p.graves = { day: today(), cursed: null, dug: {}, over: false, won: false, pending: null, lost: false };
        return p.graves;
    };
    const gravesCheckWin = (p, G, out) => {
        if (!GRAVES.filter(g => !G.cursed.includes(g.k)).every(g => G.dug[g.k] != null)) return;
        G.over = true; G.won = true;
        p.coins += 50;
        out.cleared = { xp: grantXp(p, 80), coins: 50, ossa: addMat(p, 'ossa', 3), pergamena: addMat(p, 'pergamena', 1) };
        if (!G.lost) out.title = award(p, 'becchino');
        sysChat(me.room, `⚰ ${p.name} ha ripulito il Prato dei Morti!`);
    };
    on('graves:dig', (d, reply) => {
        if (!needLv(reply, GRAVES_LEVEL, 'Il Becchino presta la vanga')) return;
        if (me.duelId) return fail(reply, 'Non durante un duello');
        const g = GRAVES[int(d.k, 0, GRAVES.length - 1)];
        if (!g || !near(g.x, g.z, 3)) return fail(reply, 'Avvicinati alla tomba');
        const p = me.p, G = gravesToday(p);
        if (G.over) return fail(reply, G.won ? 'Il Prato dei Morti è già ripulito: torna domani' : 'Il Becchino ha già ricoperto le tombe: torna domani');
        if (G.pending != null) return fail(reply, 'Prima rimetti a dormire lo scheletro che hai svegliato');
        if (G.dug[g.k] != null) return fail(reply, "Questa tomba l'hai già scavata");
        // la prima tomba non è mai maledetta, e nemmeno quelle intorno
        if (!G.cursed) {
            const pool = GRAVES.map(x => x.k).filter(k => k !== g.k && !graveNeighbors(g.k).includes(k));
            G.cursed = [];
            while (G.cursed.length < GRAVES_CURSED && pool.length) G.cursed.push(pool.splice(crypto.randomInt(pool.length), 1)[0]);
        }
        progress(p, 'dig');
        if (G.cursed.includes(g.k)) {
            G.pending = g.k; G.pendingAt = Date.now();
            save(p); sendMe(me);
            return reply({ ok: true, cursed: true, k: g.k });
        }
        const n = graveNeighbors(g.k).filter(k => G.cursed.includes(k)).length;
        G.dug[g.k] = n;
        const out = { ok: true, k: g.k, n, loot: {}, coins: 0 };
        const r = Math.random();
        if (r < 0.45) out.loot.ossa = addMat(p, 'ossa', 1);
        else if (r < 0.65) { out.coins = 8 + crypto.randomInt(13); p.coins += out.coins; }
        else if (r < 0.8) out.loot.ecto = addMat(p, 'ecto', 1);
        else if (r < 0.9) out.loot.frammento = addMat(p, 'frammento', 1);
        out.xp = grantXp(p, 6);
        gravesCheckWin(p, G, out);
        save(p); sendMe(me);
        reply(out);
    });
    on('graves:skeleton', (d, reply) => {
        const p = me.p, G = p.graves;
        if (!G || G.day !== today() || G.pending == null) return fail(reply, 'Nessuno scheletro sveglio');
        if (d.won && Date.now() - (G.pendingAt || 0) < 12000) return fail(reply, 'Lo scheletro non è ancora tornato nella tomba');
        const k = G.pending;
        G.pending = null;
        const out = { ok: true, won: !!d.won, loot: {}, xp: 0 };
        if (d.won) {
            G.dug[k] = 'x';
            out.loot.ossa = addMat(p, 'ossa', 2); out.loot.ecto = addMat(p, 'ecto', 1);
            out.xp = grantXp(p, 30);
            gravesCheckWin(p, G, out);
        } else { G.over = true; G.lost = true; }
        save(p); sendMe(me);
        reply(out);
    });

    // --- LA FONTANA DEI DESIDERI (giardino del castello) ---
    on('fountain:wish', (d, reply) => {
        if (!near(FOUNTAIN.x, FOUNTAIN.z, FOUNTAIN.r + 1) || me.pos[1] < 2) return fail(reply, 'La Fontana dei Desideri è nel giardino del castello');
        const p = me.p;
        if (p.wishDay === today()) return fail(reply, 'Un desiderio al giorno: la fontana ha già la tua moneta');
        if (p.coins < FOUNTAIN.coins) return fail(reply, `Serve una moneta da ${FOUNTAIN.coins} Sputnik Coin`);
        p.coins -= FOUNTAIN.coins; p.wishDay = today();
        let r = Math.random() * WISHES.reduce((s, w) => s + w.w, 0), W = WISHES[0];
        for (const w of WISHES) { r -= w.w; if (r <= 0) { W = w; break; } }
        if (W.id === 'xp') p.fountain = { until: Date.now() + FOUNTAIN.ms };
        else if (W.id === 'perla') addMat(p, 'perla', 1);
        else if (W.id === 'frammenti') addMat(p, 'frammento', 2);
        else if (W.id === 'monete') p.coins += 30;
        else if (W.id === 'pergamena') addMat(p, 'pergamena', 1);
        save(p); sendMe(me);
        reply({ ok: true, wish: W.id, text: W.text });
    });

    // --- I QUADRI DELLE PUNTATE (cortile del castello) ---
    const EPISODES = new Set(QUADRI.map(q => q.video));
    on('quadro:view', (d, reply) => {
        const video = String(d.video || ''), C = QUADRI_COINS.castle;
        if (!EPISODES.has(video)) return fail(reply, 'Questo quadro non mostra una puntata');
        if (Math.abs(me.pos[0] - C.x) > C.half || Math.abs(me.pos[2] - C.z) > C.half) return fail(reply, 'I quadri sono nel cortile del castello');
        const p = me.p, now = Date.now(), c = dayc(p);
        p.watched ||= {};
        const last = p.watched[video];
        let coins = 0;
        if (!last) coins = QUADRI_COINS.first;
        else if (now - last >= QUADRI_COINS.cooldown) coins = Math.min(1 + crypto.randomInt(2), QUADRI_COINS.daily - (c.quadri || 0));
        if (last && coins > 0) c.quadri = (c.quadri || 0) + coins;
        if (coins > 0) { p.watched[video] = now; p.coins += coins; save(p); sendMe(me); }
        reply({ ok: true, coins, first: !last, capped: !!last && (c.quadri || 0) >= QUADRI_COINS.daily, seen: Object.keys(p.watched).length, total: EPISODES.size });
    });

    // --- IL PEDAGGIO DELLO SPETTRO (Ponte dei Sospiri) ---
    const tollNext = (T) => {
        const pool = INSULTS.map((_, i) => i).filter(i => !T.asked.includes(i));
        // metà delle volte lo Spettro sceglie un insulto di cui conosci la risposta: chi impara, vince
        const known = pool.filter(i => T.known.includes(i));
        const from = known.length && crypto.randomInt(2) === 0 ? known : pool;
        T.q = from[crypto.randomInt(from.length)];
        T.asked.push(T.q);
        return T.q;
    };
    on('toll:start', (d, reply) => {
        if (!needLv(reply, TOLL.level, 'Lo Spettro del Pedaggio sfida chi è')) return;
        if (!near(TOLL.spot.x, TOLL.spot.z, TOLL.spot.r + 1.5)) return fail(reply, "Lo Spettro aspetta all'inizio del Ponte dei Sospiri");
        me.toll = { w: 0, l: 0, asked: [], q: null, known: [...(me.p.comebacks || [])] };
        reply({ ok: true, q: tollNext(me.toll), known: me.p.comebacks });
    });
    on('toll:answer', (d, reply) => {
        const T = me.toll;
        if (!T) return fail(reply, "Lo Spettro se n'è andato");
        const p = me.p, c = int(d.c, -1, INSULTS.length - 1), q = T.q;
        if (c >= 0 && !p.comebacks.includes(c)) return fail(reply, 'Non conosci questa risposta');
        const correct = c === q;
        let learned = null;
        if (correct) T.w++;
        else { T.l++; if (!p.comebacks.includes(q)) { p.comebacks.push(q); learned = q; } }
        const out = { ok: true, correct, right: q, learned, w: T.w, l: T.l, end: null, next: null };
        if (T.w >= TOLL.wins) {
            out.end = 'win'; me.toll = null;
            if (p.tollDay !== today()) { p.tollDay = today(); p.coins += TOLL.coins; out.coins = TOLL.coins; out.xp = grantXp(p, TOLL.xp); }
            out.title = award(p, 'lingua');
            progress(p, 'toll');
        } else if (T.l >= TOLL.losses) { out.end = 'lose'; me.toll = null; }
        else out.next = tollNext(T);
        save(p); sendMe(me);
        reply(out);
    });

    // --- GLI ABITANTI: la prima chiacchierata insegna una risposta per il Pedaggio ---
    on('npc:talk', (d, reply) => {
        const id = String(d.id), N = NPCS[id];
        if (!N) return fail(reply, 'Non c\'è nessuno qui');
        if (!near(N.x, N.z, 5)) return fail(reply, 'Troppo lontano');
        const p = me.p, first = !p.npcs.includes(id);
        let learned = null, xp = 0;
        if (first) {
            p.npcs.push(id); xp = grantXp(p, 10);
            if (N.teach != null && !p.comebacks.includes(N.teach)) { p.comebacks.push(N.teach); learned = N.teach; }
            save(p); sendMe(me);
        }
        reply({ ok: true, first, learned, xp });
    });

    // --- LE TAVOLETTE DELLA CRONACA ---
    on('tablet:read', (d, reply) => {
        const id = String(d.id), T = TABLETS[id];
        if (!T || !near(T.x, T.z, 3.5)) return fail(reply, 'Troppo lontano');
        const p = me.p;
        if (p.tablets.includes(id)) return reply({ ok: true, first: false, n: p.tablets.length });
        p.tablets.push(id);
        const out = { ok: true, first: true, xp: grantXp(p, 25), n: p.tablets.length };
        if (p.tablets.length >= Object.keys(TABLETS).length) {
            out.all = true; out.title = award(p, 'cronista');
            if (!p.recipes.includes('vulcano')) p.recipes.push('vulcano');
        }
        save(p); sendMe(me);
        reply(out);
    });

    // --- IN ONDA! (Stanza Bianca) ---
    on('onda:start', (d, reply) => {
        if (!needLv(reply, ONDA.level, 'In Onda! si conduce')) return;
        if (!inWhiteRoom(me.pos[0], me.pos[1], me.pos[2]) || me.pos[4] !== 4) return fail(reply, 'Siediti in poltrona nella Stanza Bianca');
        if (ondas.has(me.room)) return fail(reply, "C'è già una puntata in onda");
        const other = ondaPeople(me.room).find(S => S !== me && S.pos[4] === 4 && !S.duelId);
        startOnda(me.room, other ? [me, other] : [me]);
        reply({ ok: true, cohost: other ? other.p.name : 'il Ratto' });
    });
    on('onda:vote', (d, reply) => {
        const ep = ondas.get(me.room);
        if (!ep || !ep.open) return fail(reply, 'Nessuna domanda aperta');
        if (ep.hosts.includes(me.p.id)) return fail(reply, 'I conduttori non votano');
        if (!inWhiteRoom(me.pos[0], me.pos[1], me.pos[2])) return fail(reply, 'Si vota dalla Stanza Bianca');
        const first = !ep.votes.has(me.p.id);
        ep.votes.set(me.p.id, d.v ? 1 : 0);
        let xp = 0;
        if (first) { ep.voters.add(me.p.id); xp = grantXp(me.p, ONDA.voterXp); save(me.p); }
        reply({ ok: true, xp });
    });
    // il telefono bianco: una missione segreta al giorno
    on('phone:answer', (d, reply) => {
        if (!me.phoneRing) return fail(reply, 'Il telefono tace');
        if (!inWhiteRoom(me.pos[0], me.pos[1], me.pos[2]) || !near(PHONE_SPOT.x, PHONE_SPOT.z, 2.5)) return fail(reply, 'Il telefono è sul tavolino della Stanza Bianca');
        me.phoneRing = false;
        const p = me.p, B = ensureBounties(p);
        p.phoneDay = today();
        storyStep(p, 'phone');
        const ids = Object.keys(MISSIONS), mid = ids[crypto.randomInt(ids.length)], M = MISSIONS[mid];
        B.mission = { mid, k: M.kind, kind: M.kind, n: M.n, have: 0, done: false, text: M.text, id: M.id };
        save(p); sendMe(me);
        reply({ ok: true, line: PHONE_LINES[crypto.randomInt(PHONE_LINES.length)], text: M.text });
    });

    // =================================================================
    //  IL ROMANZO DELLA NEBBIA
    // =================================================================
    // dove si trova chi apre o chiude un capitolo: un abitante o un luogo della storia
    const spotOf = (who) => NPCS[who] || STORY_SPOTS[who];
    const nearWho = (who) => { const s = spotOf(who); return !!s && near(s.x, s.z, (s.r || 4) + 1.5); };
    const storyReply = (reply, extra = {}) => { save(me.p); sendMe(me); reply({ ok: true, story: me.p.story, ...extra }); };
    // la scena della barca vista (o saltata)
    on('story:seen', (d, reply) => {
        const st = storyOf(me.p);
        if (!st.seen) { st.seen = true; return storyReply(reply); }
        reply({ ok: true, story: st });
    });
    // si apre il capitolo parlando con chi lo custodisce
    on('story:start', (d, reply) => {
        const p = me.p, st = storyOf(p), C = STORY[st.ch];
        if (!C || st.on) return fail(reply, 'Niente da cominciare');
        if (!C.steps.length) return fail(reply, 'Questo capitolo si chiude e basta');
        if (levelOf(p) < C.lv) return fail(reply, `Questo capitolo si apre dal livello ${C.lv}`);
        if (!nearWho(C.who)) return fail(reply, 'Troppo lontano');
        if (C.way) {
            if (!WAYS[d.way]) return fail(reply, 'Scegli come affrontarlo');
            st.way = d.way;
        }
        st.on = true; st.prog = {};
        storyReply(reply);
    });
    // la risposta alla domanda chiude il capitolo e scrive la pagina
    on('story:answer', (d, reply) => {
        const p = me.p, st = storyOf(p), C = STORY[st.ch];
        if (!C) return fail(reply, 'Il libro è finito: la nebbia no');
        if (!nearWho(C.end || C.who)) return fail(reply, 'Troppo lontano');
        if (C.steps.length) {
            if (!chapterReady(st, p)) return fail(reply, 'Il capitolo non è ancora finito');
        } else if (st.ch === 0 && !st.seen) st.seen = true;
        if (levelOf(p) < C.lv) return fail(reply, `Questo capitolo si chiude dal livello ${C.lv}`);
        let a = null;
        if (C.q) {
            a = int(d.a, 0, C.a.length - 1);
            if (d.a == null) return fail(reply, 'Scegli una risposta');
            st.ans[st.ch] = a;
        }
        const out = { ch: st.ch, a, xp: C.xp ? grantXp(p, C.xp) : 0, title: C.reward && award(p, C.reward) ? C.reward : null };
        st.done = { ...(st.done || {}), [st.ch]: Date.now() };
        st.ch++; st.on = false; st.prog = {};
        // dopo la Melma il libro propone il Nome Vero
        if (C.id === 'melma') out.name = proposeName(p);
        storyReply(reply, out);
    });
    // il Nome Vero: quello proposto, oppure uno scritto dal giocatore
    on('story:name', (d, reply) => {
        const p = me.p, st = storyOf(p);
        const melma = STORY.findIndex(c => c.id === 'melma');
        if (st.ch <= melma) return fail(reply, 'Il Nome Vero arriva alla fine del Libro I');
        let name = d.mine ? cleanText(d.name, 60) : proposeName(p);
        if (name.length < 3) return fail(reply, 'Scrivi almeno tre lettere');
        if (usedNames.has(name.toLowerCase()) && name !== st.name) {
            if (d.mine) return fail(reply, 'Questo nome lo porta già un altro viandante');
            name = proposeName(p);
        }
        if (st.name) usedNames.delete(st.name.toLowerCase());
        st.name = name; st.mine = !!d.mine;
        usedNames.add(name.toLowerCase());
        storyReply(reply, { name });
    });
    // il Re Annegato affrontato da solo nella cripta
    on('story:boss', (d, reply) => {
        const p = me.p, st = storyOf(p), C = STORY[st.ch];
        if (C?.id !== 'melma' || !st.on || st.way !== 'cripta') return fail(reply, 'La cripta è chiusa');
        if (Date.now() - (me.lastBoss || 0) < 20000) return fail(reply, 'Riprendi fiato');
        me.lastBoss = Date.now();
        if (d.won) storyStep(p, 're');
        storyReply(reply, { won: !!d.won });
    });
    // le cose che si trovano: il cassetto della Stanza Bianca, il seme sotto il molo
    on('story:find', (d, reply) => {
        const p = me.p, st = storyOf(p), C = STORY[st.ch], k = String(d.k);
        if (!st.on) return fail(reply, 'Non c\'è niente qui');
        if (k === 'drawer' && C?.id === 'eco') {
            if (!inWhiteRoom(me.pos[0], me.pos[1], me.pos[2])) return fail(reply, 'Il cassetto è nella Stanza Bianca');
            storyStep(p, 'drawer');
        } else if (k === 'fango' && C?.id === 'melma') {
            if (!(st.prog.re >= 1)) return fail(reply, 'Prima il Re Annegato');
            if (!nearWho('molo')) return fail(reply, 'Troppo lontano');
            storyStep(p, 'fango');
        } else return fail(reply, 'Non c\'è niente qui');
        storyReply(reply, { k });
    });
    // --- LIBRO II · IL FARO SPENTO: un passo alla volta, controllato qui ---
    on('l2:act', (d, reply) => {
        const p = me.p, st = l2Of(p), C = L2_CHAPTERS[st.ch], S = l2Step(st), a = String(d.a), out = {};
        if (!S) return fail(reply, 'Il libro è finito, per ora: le pagine dopo sono ancora bianche');
        if (a !== S.k) return fail(reply, 'Non adesso');
        if (st.i === 0 && levelOf(p) < C.lv) return fail(reply, `Questo capitolo si apre dal livello ${C.lv}`);
        const nearNpc = (id) => !!NPCS[id] && near(NPCS[id].x, NPCS[id].z, 6);
        const spotErr = (k) => {
            const P = L2_SPOTS[k];
            if (!P) return "Non c'è niente qui";
            if (!near(P.x, P.z, (P.r || 3) + 1.5)) return 'Troppo lontano';
            if (P.y != null && (me.pos[1] || 0) < P.y - 2) return 'Devi salire in cima al faro';
            if (P.night && !nightNow()) return "Torna quando sull'isola è notte: di giorno qui non succede niente";   // SPUTNIK_NOTTE=1: solo per le prove in locale
            return null;
        };
        if (a === 'talk' || a === 'answer') {
            if (!nearNpc(S.who)) return fail(reply, 'Troppo lontano');
            if (a === 'answer') {
                if (d.n == null) return fail(reply, 'Scegli una risposta');
                (st.ans ||= [])[st.ch] = int(d.n, 0, S.a.length - 1);
            }
            l2Advance(p, out);
        } else if (a === 'give') {
            if (!nearNpc(S.who)) return fail(reply, 'Troppo lontano');
            if ((p.mats[S.mat] || 0) < S.n) return fail(reply, `Ti servono ${S.n} × ${MATS[S.mat].name}`);
            p.mats[S.mat] -= S.n;
            l2Advance(p, out);
        } else if (a === 'find') {
            const k = String(d.k);
            if (!S.spots.includes(k)) return fail(reply, "Non c'è niente qui");
            const err = spotErr(k);
            if (err) return fail(reply, err);
            if (st.got.includes(k)) return fail(reply, "Questo l'hai già preso");
            st.got.push(k); out.got = k;
            if (S.spots.length > 1) out.xp = grantXp(p, 25);
            if (S.spots.every(s => st.got.includes(s))) l2Advance(p, out);
        } else if (a === 'boss') {
            if (Date.now() - (me.lastBoss || 0) < 20000) return fail(reply, 'Riprendi fiato');
            me.lastBoss = Date.now();
            out.won = !!d.won;
            if (d.won) l2Advance(p, out);
        } else return fail(reply, "Non c'è niente qui");
        save(p); sendMe(me);
        reply({ ok: true, libro2: st, ...out });
    });

    // --- CASTONI E PAROLE DI RUNA (Mastro Brace) ---
    const weaponOf = (u) => me.p.inventory.find(i => i.uid === u && i.kind === 'weapon');
    on('forge:socket', (d, reply) => {
        const it = weaponOf(d.uid);
        if (!it) return fail(reply, 'Arma non trovata');
        const n = (it.spec.sockets || []).length;
        if (n >= SOCKETS.length) return fail(reply, 'Tre castoni sono il massimo');
        const S = SOCKETS[n], p = me.p;
        if (levelOf(p) < S.lv) return fail(reply, `Mastro Brace apre il castone numero ${n + 1} dal livello ${S.lv}`);
        if ((p.mats.ossa || 0) < S.ossa) return fail(reply, `Servono ${S.ossa} Ossa Antiche`);
        if (p.coins < S.coins) return fail(reply, `Servono ${S.coins} Sputnik Coin`);
        p.coins -= S.coins; p.mats.ossa -= S.ossa;
        it.spec.sockets = [...(it.spec.sockets || []), null];
        save(p); sendMe(me);
        reply({ ok: true, n: n + 1 });
    });
    on('forge:rune', (d, reply) => {
        const it = weaponOf(d.uid);
        if (!it) return fail(reply, 'Arma non trovata');
        const p = me.p, rune = String(d.rune);
        if (!rune.startsWith('runa_') || !(p.mats[rune] > 0)) return fail(reply, 'Non hai questa runa');
        const i = (it.spec.sockets || []).indexOf(null);
        if (i < 0) return fail(reply, 'Nessun castone libero');
        p.mats[rune]--;
        it.spec.sockets[i] = rune;
        const word = runeWordOf(it.spec);
        let discovered = false;
        if (word && !p.recipes.includes(word)) { p.recipes.push(word); discovered = true; sysChat(me.room, `✦ ${p.name} ha scoperto una Parola di Runa: ${RUNEWORDS[word].name}!`); }
        save(p); sendMe(me); lookChanged(it.uid);
        reply({ ok: true, word, discovered });
    });
    on('forge:clear', (d, reply) => {
        const it = weaponOf(d.uid);
        if (!it || !(it.spec.sockets || []).some(Boolean)) return fail(reply, 'Non ci sono rune da togliere');
        if (me.p.coins < SOCKET_CLEAR) return fail(reply, `Servono ${SOCKET_CLEAR} Sputnik Coin`);
        me.p.coins -= SOCKET_CLEAR;
        it.spec.sockets = it.spec.sockets.map(() => null);
        save(me.p); sendMe(me); lookChanged(it.uid);
        reply({ ok: true });
    });

    // --- LA VEGLIA DEI MORTI (sabato sera nel cimitero) ---
    on('veglia:status', (d, reply) => {
        const V = vegliaState(), p = me.p;
        const mine = p.veglia?.key === V.key ? p.veglia : {};
        reply({ ok: true, ...V, waves: mine.waves || 0, kingTries: KING.tries - (mine.kingTries || 0), kingBeaten: veglia.kings.has(p.id) });
    });
    on('veglia:start', (d, reply) => {
        const V = vegliaState(), p = me.p;
        if (!V.open) return fail(reply, 'La Veglia dei Morti è il sabato sera, dalle 20 a mezzanotte');
        if (!needLv(reply, VEGLIA.level, 'La Veglia accoglie chi è')) return;
        if (me.duelId) return fail(reply, 'Non durante un duello');
        if (!near(-33, 40, 18)) return fail(reply, 'La Veglia si tiene nel Cimitero Sommerso');
        if (!p.veglia || p.veglia.key !== V.key) p.veglia = { key: V.key, waves: 0 };
        if (d.king) {
            if (!V.kingUp) return fail(reply, 'Il Re Annegato dorme ancora: servono altre ondate');
            if (!p.veglia.waves) return fail(reply, 'Il Re risponde solo a chi ha combattuto nella Veglia');
            if (veglia.kings.has(p.id)) return fail(reply, 'Hai già sconfitto il Re stanotte');
            if ((p.veglia.kingTries || 0) >= KING.tries) return fail(reply, `Il Re si concede solo ${KING.tries} volte a notte`);
            p.veglia.kingTries = (p.veglia.kingTries || 0) + 1;
            me.vfight = { king: true, at: Date.now() };
            return reply({ ok: true, king: true, tries: KING.tries - p.veglia.kingTries });
        }
        if (p.veglia.waves >= VEGLIA.waveMax) return fail(reply, 'Per stanotte hai combattuto abbastanza');
        me.vfight = { king: false, at: Date.now(), wave: p.veglia.waves + 1 };
        reply({ ok: true, wave: me.vfight.wave });
    });
    on('veglia:end', (d, reply) => {
        const F = me.vfight;
        me.vfight = null;
        if (!F) return fail(reply, 'Nessuno scontro in corso');
        const p = me.p, out = { ok: true, won: !!d.won, king: F.king, loot: {}, xp: 0 };
        if (!d.won) return reply(out);
        if (Date.now() - F.at < VEGLIA.minMs) return fail(reply, 'Troppo in fretta: i morti non ci credono');
        vegliaState();
        if (F.king) {
            if (p.story?.way === 'veglia') storyStep(p, 're');
            veglia.kings.add(p.id);
            out.xp = grantXp(p, 200);
            if (p.kingWeek !== weekOf()) { p.kingWeek = weekOf(); out.loot.cuore = addMat(p, 'cuore', 1); }
            out.loot.ossa = addMat(p, 'ossa', 3);
            out.title = award(p, 'spezzacorona');
            sysChat('pub', `👑 ${p.name} ha sconfitto il Re Annegato!`);
        } else {
            p.veglia.waves++; veglia.kills++; veglia.participants.add(p.id);
            out.loot.ossa = addMat(p, 'ossa', 1);
            if (Math.random() < 0.5) out.loot.ecto = addMat(p, 'ecto', 1);
            out.xp = grantXp(p, 25);
            progress(p, 'veglia');
            const V = vegliaState();
            if (!veglia.kingUp && V.kills >= V.goal) { veglia.kingUp = true; sysChat('pub', '🌊 La laguna ribolle: il Re Annegato si è alzato nel Cimitero Sommerso! Chi ha combattuto nella Veglia può sfidarlo.'); }
            io.emit('veglia:state', vegliaState());
        }
        save(p); sendMe(me);
        reply(out);
    });

    // --- RINASCITA (livello 30) E TITOLI ---
    on('altar:rebirth', (d, reply) => {
        if (!altarOk(reply)) return;
        const p = me.p;
        if (levelOf(p) < REBIRTH.level) return fail(reply, `La Rinascita si compie al livello ${REBIRTH.level}`);
        if ((p.rebirths || 0) >= REBIRTH.max) return fail(reply, 'Sei già rinato tre volte: la nebbia non può cambiarti di più');
        p.rebirths = (p.rebirths || 0) + 1; p.xp = 0; p.talents = { forza: 0, tempra: 0, maestria: 0 };
        for (const it of p.inventory) it.legacy = true;
        award(p, 'rinato');
        save(p); sendMe(me);
        io.to(me.room).emit('player:stats', statsOf(p));
        sysChat(me.room, `★ ${p.name} è rinato: torna al livello 1, con una stella in più sulla carta.`);
        reply({ ok: true, rebirths: p.rebirths });
    });
    on('title:set', (d, reply) => {
        const id = d.id == null ? null : String(d.id);
        if (id && !me.p.titles.includes(id)) return fail(reply, 'Non hai questo titolo');
        me.p.titleOn = id;
        save(me.p); sendMe(me);
        io.to(me.room).emit('player:stats', statsOf(me.p));
        reply({ ok: true });
    });

    // --- BAZAR (compravendita tra giocatori) ---
    const listingView = l => ({ lid: l.lid, seller: l.seller, sellerName: l.sellerName, entry: l.entry, price: l.price, at: l.at });
    on('market:get', (d, reply) => reply({ ok: true, listings: store.listings().map(listingView) }));
    on('market:list', (d, reply) => {
        const listings = store.listings();
        if (listings.filter(l => l.seller === me.p.id).length >= 10) return fail(reply, 'Massimo 10 annunci');
        const i = me.p.inventory.findIndex(x => x.uid === d.uid);
        if (i < 0) return fail(reply, 'Oggetto non trovato');
        if (Object.values(me.p.equipment).includes(d.uid)) return fail(reply, 'Prima toglilo di dosso');
        const price = int(d.price, 1, ECONOMY.MAX_LIST_PRICE);
        const [entry] = me.p.inventory.splice(i, 1);
        listings.push({ lid: uid(), seller: me.p.id, sellerName: me.p.name, entry, price, at: Date.now() });
        store.saveListings(); save(me.p); sendMe(me);
        reply({ ok: true });
    });
    on('market:buy', (d, reply) => {
        const listings = store.listings();
        const i = listings.findIndex(l => l.lid === d.lid);
        if (i < 0) return fail(reply, 'Annuncio non più disponibile');
        const l = listings[i];
        if (l.seller === me.p.id) return fail(reply, 'È il tuo annuncio');
        if (me.p.coins < l.price) return fail(reply, 'Sputnik Coin insufficienti');
        if (me.p.inventory.length >= 80) return fail(reply, 'Inventario pieno');
        listings.splice(i, 1);
        me.p.coins -= l.price;
        const { legacy, ...entry } = l.entry;   // chi compra al Bazar rispetta il livello richiesto
        me.p.inventory.push({ ...entry, uid: uid() });
        const seller = byPid(l.seller);
        if (seller) {
            seller.coins += l.price; save(seller);
            const S = sessionOf(seller.id);
            if (S) { sendMe(S); notify(S, `${me.p.name} ha comprato il tuo oggetto al Bazar: +${l.price} SC`, 'coin'); }
        }
        store.saveListings(); save(me.p); sendMe(me);
        reply({ ok: true });
    });
    on('market:cancel', (d, reply) => {
        const listings = store.listings();
        const i = listings.findIndex(l => l.lid === d.lid && l.seller === me.p.id);
        if (i < 0) return fail(reply, 'Annuncio non trovato');
        const [l] = listings.splice(i, 1);
        me.p.inventory.push(l.entry);
        store.saveListings(); save(me.p); sendMe(me);
        reply({ ok: true });
    });

    // --- CLASSIFICA, GIOCATORI, PROFILI ---
    on('lb:get', (d, reply) => {
        const lb = leaderboard();
        const myRank = [...store.all()].filter(p => p.rating > me.p.rating).length + 1;
        reply({ ok: true, ...lb, myRank });
    });
    on('players:get', (d, reply) => {
        reply({
            ok: true,
            players: [...online.values()].filter(S => S !== me).map(S => ({
                id: S.p.id, name: S.p.name, rating: S.p.rating, level: levelOf(S.p), element: S.p.card.element,
                sameRoom: S.room === me.room, private: S.room !== 'pub', duel: !!S.duelId,
                friend: me.p.friends.includes(S.p.id),
            })),
        });
    });
    on('profile:get', (d, reply) => {
        const p = byPid(String(d.id));
        if (!p) return fail(reply, 'Giocatore non trovato');
        reply({
            ok: true, profile: {
                id: p.id, name: p.name, appearance: p.appearance, look: look(p), element: p.card.element, card: { title: p.card.title, type: p.card.type },
                rating: p.rating, wins: p.wins, losses: p.losses, level: levelOf(p), talents: p.talents, cardImage: p.cardImage, grade: p.grade || 0,
                title: titleName(p), league: leagueOf(p.rating), peakLeague: p.peakLeague || 0, frames: p.frames || [], rebirths: p.rebirths || 0, titles: (p.titles || []).length,
                online: sidByPid.has(p.id), friend: me.p.friends.includes(p.id), requested: p.requests.includes(me.p.id),
            },
        });
    });

    // --- AMICIZIE ---
    on('friend:request', (d, reply) => {
        const t = byPid(String(d.id));
        if (!t || t.id === me.p.id) return fail(reply, 'Giocatore non valido');
        if (me.p.friends.includes(t.id)) return fail(reply, 'Siete già amici');
        if (me.p.requests.includes(t.id)) return acceptFriend(t, reply); // richiesta incrociata
        if (!t.requests.includes(me.p.id)) t.requests.push(me.p.id);
        if (t.requests.length > 50) t.requests.shift();
        save(t);
        const T = sessionOf(t.id);
        if (T) { T.socket.emit('friend:request', { id: me.p.id, name: me.p.name }); sendMe(T); }
        reply({ ok: true, msg: `Richiesta inviata a ${t.name}` });
    });
    function acceptFriend(t, reply) {
        me.p.requests = me.p.requests.filter(x => x !== t.id);
        if (!me.p.friends.includes(t.id)) me.p.friends.push(t.id);
        if (!t.friends.includes(me.p.id)) t.friends.push(me.p.id);
        t.requests = t.requests.filter(x => x !== me.p.id);
        save(me.p); save(t); sendMe(me);
        const T = sessionOf(t.id);
        if (T) { sendMe(T); notify(T, `${me.p.name} ha accettato la tua amicizia!`, 'friend'); }
        reply({ ok: true, msg: `Tu e ${t.name} ora siete amici` });
    }
    on('friend:respond', (d, reply) => {
        const t = byPid(String(d.id));
        if (!t || !me.p.requests.includes(t.id)) return fail(reply, 'Richiesta non trovata');
        if (d.accept) return acceptFriend(t, reply);
        me.p.requests = me.p.requests.filter(x => x !== t.id);
        save(me.p); sendMe(me);
        reply({ ok: true });
    });
    on('friend:remove', (d, reply) => {
        const t = byPid(String(d.id));
        me.p.friends = me.p.friends.filter(x => x !== d.id);
        if (t) { t.friends = t.friends.filter(x => x !== me.p.id); save(t); sendMe(sessionOf(t.id)); }
        save(me.p); sendMe(me);
        reply({ ok: true });
    });

    // --- CARD: invio e collezione ---
    on('card:send', (d, reply) => {
        const t = byPid(String(d.to));
        if (!t || t.id === me.p.id) return fail(reply, 'Destinatario non valido');
        if (!me.p.cardImage) return fail(reply, 'Crea prima la tua card');
        if (Date.now() - me.lastCard < 4000) return fail(reply, 'Aspetta qualche secondo');
        me.lastCard = Date.now();
        const entry = { from: me.p.id, name: me.p.name, title: me.p.card.title, element: me.p.card.element, image: me.p.cardImage, grade: me.p.grade || 0, at: Date.now() };
        t.collection = t.collection.filter(c => c.from !== me.p.id); // tiene solo l'ultima card di ogni mittente
        t.collection.unshift(entry);
        if (t.collection.length > 40) t.collection.length = 40;
        save(t);
        const T = sessionOf(t.id);
        if (T) { T.socket.emit('card:received', { from: me.p.id, name: me.p.name, title: entry.title }); sendMe(T); }
        reply({ ok: true, msg: `Card inviata a ${t.name}` });
    });
    on('collection:get', (d, reply) => reply({ ok: true, collection: me.p.collection }));
    on('collection:remove', (d, reply) => {
        me.p.collection = me.p.collection.filter(c => c.from !== d.from);
        save(me.p); sendMe(me);
        reply({ ok: true });
    });

    // --- SESSIONI PRIVATE ---
    on('session:create', (d, reply) => {
        if (me.duelId) return fail(reply, 'Non durante un duello');
        const room = 'priv-' + uid();
        sessions.set(room, { id: room, owner: me.p.id, ownerName: me.p.name, invited: new Set([me.p.id]) });
        joinRoom(me, room);
        reply({ ok: true, room });
    });
    on('session:invite', (d, reply) => {
        const s = sessions.get(me.room);
        if (!s) return fail(reply, 'Crea prima una sessione privata');
        if (!me.p.friends.includes(d.id)) return fail(reply, 'Puoi invitare solo gli amici');
        const T = sessionOf(d.id);
        if (!T) return fail(reply, 'Il tuo amico non è online');
        s.invited.add(d.id);
        T.socket.emit('session:invite', { room: s.id, from: me.p.name });
        reply({ ok: true, msg: `Invito inviato a ${T.p.name}` });
    });
    on('session:join', (d, reply) => {
        const s = sessions.get(String(d.room));
        if (!s) return fail(reply, 'La sessione non esiste più');
        if (!s.invited.has(me.p.id)) return fail(reply, 'Non sei stato invitato');
        if (me.duelId) return fail(reply, 'Non durante un duello');
        joinRoom(me, s.id);
        reply({ ok: true });
    });
    on('session:leave', (d, reply) => {
        if (me.duelId) return fail(reply, 'Non durante un duello');
        if (me.room !== 'pub') joinRoom(me, 'pub');
        reply({ ok: true });
    });

    // --- DUELLI ---
    on('duel:challenge', (d, reply) => {
        const T = sessionOf(String(d.id));
        if (!T || T === me) return fail(reply, 'Giocatore non disponibile');
        if (T.room !== me.room) return fail(reply, 'Il giocatore è in un\'altra sessione');
        if (me.duelId || T.duelId) return fail(reply, 'Uno dei due è già in duello');
        const stake = int(d.stake, 0, ECONOMY.MAX_STAKE);
        if (me.p.coins < stake) return fail(reply, 'Non hai abbastanza Sputnik Coin per questa posta');
        const cid = uid();
        challenges.set(cid, { from: me.sid, to: T.sid, stake });
        setTimeout(() => {
            if (challenges.delete(cid)) { notify(online.get(me?.sid), `${T.p.name} non ha risposto alla sfida.`); }
        }, 20000);
        T.socket.emit('duel:invite', { cid, from: { id: me.p.id, name: me.p.name, rating: me.p.rating, level: levelOf(me.p), element: me.p.card.element }, stake });
        reply({ ok: true, msg: `Sfida inviata a ${T.p.name}` });
    });
    on('duel:respond', (d, reply) => {
        const c = challenges.get(d.cid);
        if (!c || c.to !== me.sid) return fail(reply, 'Sfida scaduta');
        challenges.delete(d.cid);
        const A = online.get(c.from);
        if (!A) return fail(reply, 'Lo sfidante se n\'è andato');
        if (!d.accept) { notify(A, `${me.p.name} ha rifiutato la sfida.`); return reply({ ok: true }); }
        if (A.duelId || me.duelId) return fail(reply, 'Uno dei due è già in duello');
        if (A.room !== me.room) return fail(reply, 'Non siete nella stessa sessione');
        if (A.p.coins < c.stake || me.p.coins < c.stake) return fail(reply, 'Sputnik Coin insufficienti per la posta');
        startDuel(A, me, c.stake);
        reply({ ok: true });
    });
    on('duel:list', (d, reply) => reply({ ok: true, duels: listDuels(me.room) }));
    socket.on('duel:input', (d) => {
        if (!me?.duelId || !d) return;
        const D = duels.get(me.duelId);
        if (!D || D.phase !== 'fight') return;
        const side = D.sids.a === me.sid ? 'a' : D.sids.b === me.sid ? 'b' : null;
        if (!side) return;
        D.inputs[side].h = (d.h | 0) & HELD_MASK;
        D.inputs[side].p |= (d.p | 0) & ~HELD_MASK;
    });
    on('duel:watch', (d, reply) => {
        const D = duels.get(String(d.id));
        if (!D || D.phase === 'done') return fail(reply, 'Il duello è terminato');
        if (D.room !== me.room) return fail(reply, 'Duello in un\'altra sessione');
        if (D.sids.a === me.sid || D.sids.b === me.sid) return fail(reply, 'Sei tu a combattere!');
        if (me.watching && me.watching !== D.id) { socket.leave('duel:' + me.watching); duels.get(me.watching)?.spectators.delete(me.sid); }
        me.watching = D.id;
        D.spectators.add(me.sid);
        socket.join('duel:' + D.id);
        io.to(D.room).emit('duel:pool', { id: D.id, pool: pool(D), spectators: D.spectators.size });
        reply({ ok: true, duel: duelPublic(D, true), snapshot: D.sim ? snapshotDuel(D.sim, []) : null });
    });
    on('duel:unwatch', (d, reply) => {
        if (me.watching) {
            const D = duels.get(me.watching);
            socket.leave('duel:' + me.watching);
            if (D) { D.spectators.delete(me.sid); io.to(D.room).emit('duel:pool', { id: D.id, pool: pool(D), spectators: D.spectators.size }); }
            me.watching = null;
        }
        reply({ ok: true });
    });
    on('duel:bet', (d, reply) => {
        const D = duels.get(String(d.id));
        if (!D || D.phase !== 'betting') return fail(reply, 'Le scommesse sono chiuse');
        if (D.room !== me.room) return fail(reply, 'Duello in un\'altra sessione');
        if (D.pids.a === me.p.id || D.pids.b === me.p.id) return fail(reply, 'Non puoi scommettere sul tuo duello');
        const side = d.side === 'a' ? 'a' : d.side === 'b' ? 'b' : null;
        if (!side) return fail(reply, 'Scelta non valida');
        const amount = int(d.amount, 1, ECONOMY.MAX_BET);
        if (me.p.coins < amount) return fail(reply, 'Sputnik Coin insufficienti');
        const mine = D.bets.find(b => b.pid === me.p.id);
        if (mine && mine.side !== side) return fail(reply, 'Hai già puntato sull\'altro sfidante');
        if (mine && mine.amount + amount > ECONOMY.MAX_BET) return fail(reply, `Puntata massima: ${ECONOMY.MAX_BET} SC`);
        me.p.coins -= amount;
        if (mine) mine.amount += amount; else D.bets.push({ pid: me.p.id, side, amount });
        save(me.p); sendMe(me);
        const msg = { id: D.id, pool: pool(D), spectators: D.spectators.size };
        io.to(D.room).emit('duel:pool', msg);
        reply({ ok: true, msg: `Hai puntato ${amount} SC su ${D.info[side].name}` });
    });
    on('duel:forfeit', (d, reply) => {
        const D = me.duelId && duels.get(me.duelId);
        if (!D) return reply({ ok: true });
        const side = D.sids.a === me.sid ? 'a' : 'b';
        if (D.phase === 'betting') cancelDuel(D, `${me.p.name} si è ritirato`);
        else if (D.phase === 'fight') endDuel(D, side === 'a' ? 'b' : 'a', 'forfeit');
        reply({ ok: true });
    });

    socket.on('disconnect', () => {
        if (!me) return;
        const p = me.p;
        if (me.duelId) {
            const D = duels.get(me.duelId);
            if (D) {
                const side = D.sids.a === me.sid ? 'a' : 'b';
                if (D.phase === 'betting') cancelDuel(D, `${p.name} si è disconnesso`);
                else if (D.phase === 'fight') endDuel(D, side === 'a' ? 'b' : 'a', 'forfeit');
            }
        }
        if (me.watching) duels.get(me.watching)?.spectators.delete(me.sid);
        for (const T of [...trades.values()]) if (T.pids.a === p.id || T.pids.b === p.id) { trades.delete(T.id); for (const s of ['a', 'b']) { const S = sessionOf(T.pids[s]); if (S && S !== me) { S.tradeId = null; S.socket.emit('trade:closed', { id: T.id, why: `${p.name} se n'è andato` }); } } }
        for (const [cid, c] of challenges) if (c.from === me.sid || c.to === me.sid) challenges.delete(cid);
        socket.to(me.room).emit('player:leave', { id: p.id });
        online.delete(socket.id);
        if (sidByPid.get(p.id) === socket.id) {
            sidByPid.delete(p.id);
            for (const fid of p.friends) { const F = sessionOf(fid); if (F) F.socket.emit('friend:status', { id: p.id, name: p.name, online: false }); }
        }
        cleanupSession(me.room, me);
        clearTimeout(me.saveT);
        clearTimeout(me.phoneT);
        p.lastSeen = Date.now();
        save(p);
        console.log(`- ${p.name} — online: ${online.size}`);
        onlineNews();
        me = null;
    });
});

// un errore imprevisto finisce nei log invece di spegnere l'isola per tutti
process.on('uncaughtException', (e) => console.error('[errore non gestito]', e));
process.on('unhandledRejection', (e) => console.error('[promessa rifiutata]', e));

// prima di spegnersi (riavvio o nuova versione) il server consegna a tutti una copia fresca
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, async () => {
    for (const S of online.values()) { try { S.socket.emit('save', saveTicket(S.p)); } catch { /* ok */ } }
    await store.flush();
    setTimeout(() => process.exit(0), 400);
});

server.listen(PORT, () => console.log(`SputnikChat 3D attivo su http://localhost:${PORT} (${store.kind})`));
