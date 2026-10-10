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
    SOCKETS, SOCKET_CLEAR, RUNEWORDS, runeWordOf, VEGLIA, vegliaOpen, KING, REBIRTH,
} from './public/js/shared/catalog.js';
import { INSULTS, TOLL_START, TOLL_LINES, NPCS, ONDA_Q, ONDA_PLOT, TABLETS, MISSIONS, PHONE_LINES } from './public/js/shared/lore.js';
import { createDuel, stepDuel, snapshotDuel, FIGHT, HELD_MASK } from './public/js/shared/fight.js';

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
        res.end(JSON.stringify({ ok: true, online: online.size, duels: duels.size }));
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
const statsOf = p => ({ id: p.id, rating: p.rating, level: levelOf(p), wins: p.wins, losses: p.losses, title: titleName(p), league: leagueOf(p.rating) });
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
// Contatori del giorno (pescate e raccolte con premi pieni, Essenze dai duelli)
function dayc(p) {
    const d = today();
    if (!p.dayc || p.dayc.day !== d) p.dayc = { day: d, fish: 0, frammento: 0, ecto: 0, pess: 0, ess: {} };
    return p.dayc;
}
const addMat = (p, k, n = 1) => { n = Math.max(0, Math.floor(n)); if (!MATS[k] || !n) return 0; p.mats[k] = Math.min(9999, (p.mats[k] || 0) + n); return n; };
const hasMats = (p, need) => Object.entries(need).every(([k, n]) => (p.mats[k] || 0) >= n);
const takeMats = (p, need) => { for (const [k, n] of Object.entries(need)) p.mats[k] = (p.mats[k] || 0) - n; };
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
const save = p => store.put(p);
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
        pos: S.pos, duel: !!S.duelId,
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
        fishLeft: Math.max(0, FISH_DAILY - dayc(p).fish),
        gatherLeft: { frammento: Math.max(0, GATHER.daily.frammento - dayc(p).frammento), ecto: Math.max(0, GATHER.daily.ecto - dayc(p).ecto) },
        titles: p.titles, titleOn: p.titleOn, comebacks: p.comebacks, tablets: p.tablets, recipes: p.recipes, npcs: p.npcs,
        episodes: p.episodes || 0, charisma: p.charisma || 0, rebirths: p.rebirths || 0, frames: p.frames, peakLeague: p.peakLeague || 0,
        league: leagueOf(p.rating), season: p.season, bounty: ensureBounties(p), graves: gravesView(p),
        cantoLeft: Math.max(0, CANTO.daily - (dayc(p).canto || 0)), cantoBest: p.cantoBest || 0, wishedToday: p.wishDay === d,
        fountainUntil: p.fountain?.until || 0, tollToday: p.tollDay === d, ondaToday: p.ondaDay === d,
        veglia: p.veglia || null, kingWeek: p.kingWeek || null,
        friends: p.friends.map(id => ({ id, name: byPid(id)?.name || '???', online: sidByPid.has(id) })),
        requests: p.requests.map(id => ({ id, name: byPid(id)?.name || '???' })),
        collectionCount: p.collection.length,
    };
}
function sendMe(S) { if (S) S.socket.emit('me', privateView(S.p)); }
const sessionOf = pid => { const sid = sidByPid.get(pid); return sid ? online.get(sid) : null; };
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
    return { id: p.id, name: p.name, appearance: p.appearance, look: look(p), element: p.card.element, rating: p.rating, level: levelOf(p), grade: p.grade || 0, cardImage: p.cardImage };
}
function fighterSetup(p) {
    const w = p.inventory.find(i => i.uid === p.equipment?.weapon);
    return { id: p.id, name: p.name, element: p.card.element, weapon: w?.spec || null, level: levelOf(p), talents: p.talents, gear: gearOf(p), gearPlus: gearPlusOf(p), seals: p.sealsOn };
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
        sim: null, tick: 0, evBuf: [], startedAt: 0,
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
    d.sim = createDuel(fighterSetup(A), fighterSetup(B));
    io.to('duel:' + d.id).emit('duel:begin', { id: d.id });
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
        p.coins += d.stake; save(p); sendMe(sessionOf(p.id));
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
    // niente esperienza per i duelli lampo (meno di 20 secondi di combattimento)
    const fought = d.startedAt && Date.now() - d.startedAt > 20000;
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
    }
}, TICK_MS);

// =====================================================================
//  CONNESSIONI
// =====================================================================
// =====================================================================
//  IN ONDA! (Stanza Bianca) e LA VEGLIA DEI MORTI: stato condiviso
// =====================================================================
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

// profili di prima: si aggiornano all'avvio (qui sotto tutti gli aiuti sono già pronti)
for (const p of store.all()) { pidIndex.set(p.id, p.token); if (migrate(p)) store.put(p); }

io.on('connection', (socket) => {
    let me = null;
    const on = (ev, fn) => socket.on(ev, (d, ack) => {
        const reply = typeof ack === 'function' ? ack : () => {};
        if (!me && ev !== 'hello') return reply({ ok: false, msg: 'Non autenticato' });
        try { fn(d || {}, reply); } catch (e) { console.error(`[${ev}]`, e); reply({ ok: false, msg: 'Errore del server' }); }
    });
    const fail = (reply, msg) => reply({ ok: false, msg });

    on('hello', (d, reply) => {
        if (me) return reply({ ok: false, msg: 'Già connesso' });
        let p = d.token ? store.get(String(d.token)) : null;
        const created = !p;
        let dropped = false;
        if (!p) p = newProfile(d);
        else {
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
        reply({ ok: true, token: p.token, profile: privateView(p), daily, dailyXp: daily ? XP.DAILY : 0, created, dropped, seasonMsg });
        joinRoom(me, 'pub');
        for (const fid of p.friends) { const F = sessionOf(fid); if (F) F.socket.emit('friend:status', { id: p.id, name: p.name, online: true }); }
        console.log(`+ ${p.name} (${p.id}) — online: ${online.size}`);
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
            me.phoneT = setTimeout(() => {
                me.phoneT = null;
                if (!me || !online.has(me.sid) || me.p.phoneDay === today() || !inWhiteRoom(me.pos[0], me.pos[1], me.pos[2])) return;
                me.phoneRing = true;
                me.socket.emit('phone:ring');
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
        if (need > levelOf(me.p)) return fail(reply, `Mastro Brace lavora quei materiali solo dal livello ${need}`);
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
        const night = isNight(), fish = rollFish(night);
        me.fishing = { id: uid(), fish, at: now, bite: Math.round(1800 + Math.random() * 4200) };
        reply({ ok: true, id: me.fishing.id, bite: me.fishing.bite, diff: FISH[fish].diff, move: FISH[fish].move, night, left: Math.max(0, FISH_DAILY - dayc(me.p).fish) });
    });
    on('fish:reel', (d, reply) => {
        const F = me.fishing;
        if (!F || F.id !== d.id) return fail(reply, 'La lenza si è spezzata');
        me.fishing = null;
        if (!d.ok) return reply({ ok: true, caught: false });
        const f = FISH[F.fish], R = FISH_RARITY[f.rar];
        if (Date.now() - F.at < F.bite + 1200 + f.diff * 1500) return reply({ ok: true, caught: false, msg: 'Troppa fretta: il pesce si è liberato' });
        const p = me.p, c = dayc(p), full = c.fish < FISH_DAILY;
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
        }
        progress(p, 'fish', 1, { id: F.fish, rar: f.rar });
        if (FISH_IDS.filter(id => FISH[id].rar !== 'special').every(id => p.fishLog[id]?.n)) award(p, 'pescatore');
        save(p); sendMe(me);
        if (f.rar === 'epi') sysChat(me.room, `🎣 ${p.name} ha pescato un ${f.name} di ${size} cm!`);
        reply(out);
    });

    // =================================================================
    //  I LUOGHI DELL'ISOLA (fase 3) e LA CRONACA (fase 4)
    // =================================================================
    const near = (x, z, r) => Math.hypot(me.pos[0] - x, me.pos[2] - z) <= r;
    const needLv = (reply, lv, what) => { if (levelOf(me.p) < lv) { fail(reply, `${what} dal livello ${lv}`); return false; } return true; };

    // --- LA BACHECA DELLE TAGLIE (si riscuote in piazza) ---
    on('bounty:claim', (d, reply) => {
        if (!near(BOUNTY_BOARD.x, BOUNTY_BOARD.z, BOUNTY_BOARD.r + 2)) return fail(reply, 'Le taglie si riscuotono alla Bacheca in piazza');
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

    // --- IL PEDAGGIO DELLO SPETTRO (Ponte dei Sospiri) ---
    const tollNext = (T) => {
        const pool = INSULTS.map((_, i) => i).filter(i => !T.asked.includes(i));
        T.q = pool[crypto.randomInt(pool.length)];
        T.asked.push(T.q);
        return T.q;
    };
    on('toll:start', (d, reply) => {
        if (!needLv(reply, TOLL.level, 'Lo Spettro del Pedaggio sfida chi è')) return;
        if (!near(TOLL.spot.x, TOLL.spot.z, TOLL.spot.r + 1.5)) return fail(reply, "Lo Spettro aspetta all'inizio del Ponte dei Sospiri");
        me.toll = { w: 0, l: 0, asked: [], q: null };
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
        const ids = Object.keys(MISSIONS), mid = ids[crypto.randomInt(ids.length)], M = MISSIONS[mid];
        B.mission = { mid, k: M.kind, kind: M.kind, n: M.n, have: 0, done: false, text: M.text, id: M.id };
        save(p); sendMe(me);
        reply({ ok: true, line: PHONE_LINES[crypto.randomInt(PHONE_LINES.length)], text: M.text });
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
        for (const [cid, c] of challenges) if (c.from === me.sid || c.to === me.sid) challenges.delete(cid);
        socket.to(me.room).emit('player:leave', { id: p.id });
        online.delete(socket.id);
        if (sidByPid.get(p.id) === socket.id) {
            sidByPid.delete(p.id);
            for (const fid of p.friends) { const F = sessionOf(fid); if (F) F.socket.emit('friend:status', { id: p.id, name: p.name, online: false }); }
        }
        cleanupSession(me.room, me);
        p.lastSeen = Date.now();
        save(p);
        console.log(`- ${p.name} — online: ${online.size}`);
        me = null;
    });
});

for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, async () => { await store.flush(); process.exit(0); });

server.listen(PORT, () => console.log(`SputnikChat 3D attivo su http://localhost:${PORT} (${store.kind})`));
