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
} from './public/js/shared/catalog.js';
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

for (const p of store.all()) pidIndex.set(p.id, p.token);

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
        inventory: [weapon], equipment: { weapon: weapon.uid },
        friends: [], requests: [], collection: [],
        lastDaily: Date.now(), createdAt: Date.now(), lastSeen: Date.now(),
    };
    pidIndex.set(p.id, p.token);
    return p;
}

function look(p) {
    const o = {};
    for (const [slot, u] of Object.entries(p.equipment || {})) {
        const it = p.inventory.find(i => i.uid === u);
        if (!it) continue;
        o[slot] = it.kind === 'weapon' ? it.spec : it.itemId;
    }
    return o;
}
function publicPlayer(S) {
    const p = S.p;
    return {
        id: p.id, name: p.name, appearance: p.appearance, look: look(p), element: p.card.element,
        rating: p.rating, wins: p.wins, losses: p.losses, level: levelFromWins(p.wins),
        pos: S.pos, duel: !!S.duelId,
    };
}
function privateView(p) {
    return {
        id: p.id, name: p.name, appearance: p.appearance, card: p.card, coins: p.coins,
        rating: p.rating, wins: p.wins, losses: p.losses, draws: p.draws, level: levelFromWins(p.wins),
        inventory: p.inventory, equipment: p.equipment,
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
    const all = store.all();
    const row = p => ({ id: p.id, name: p.name, rating: p.rating, wins: p.wins, losses: p.losses, coins: p.coins, level: levelFromWins(p.wins), element: p.card?.element, online: sidByPid.has(p.id) });
    lbCache = {
        rating: [...all].sort((a, b) => b.rating - a.rating || b.wins - a.wins).slice(0, 50).map(row),
        coins: [...all].sort((a, b) => b.coins - a.coins).slice(0, 50).map(row),
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
    return { id: p.id, name: p.name, appearance: p.appearance, look: look(p), element: p.card.element, rating: p.rating, level: levelFromWins(p.wins), cardImage: p.cardImage };
}
function fighterSetup(p) {
    const w = p.inventory.find(i => i.uid === p.equipment?.weapon);
    return { id: p.id, name: p.name, element: p.card.element, weapon: w?.spec || null };
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
    const result = { id: d.id, winner, reason, names: { a: P.a.name, b: P.b.name }, stake: d.stake, rating: { a: 0, b: 0 }, coins: { a: 0, b: 0 } };
    if (winner) {
        const loser = winner === 'a' ? 'b' : 'a';
        const W = P[winner], L = P[loser];
        const exp = 1 / (1 + Math.pow(10, (L.rating - W.rating) / 400));
        const delta = Math.max(4, Math.round(32 * (1 - exp)));
        W.rating += delta; L.rating = Math.max(100, L.rating - delta);
        result.rating[winner] = delta; result.rating[loser] = -delta;
        W.coins += d.stake * 2 + ECONOMY.WIN_BONUS; L.coins += ECONOMY.LOSS_BONUS;
        result.coins[winner] = d.stake + ECONOMY.WIN_BONUS; result.coins[loser] = -d.stake + ECONOMY.LOSS_BONUS;
        W.wins++; L.losses++;
        // Scommesse: montepremi diviso tra chi ha indovinato (parimutuel)
        const pl = pool(d), tot = pl.a + pl.b, winPool = pl[winner];
        if (winPool === 0) refundBets(d);
        else for (const b of d.bets) {
            const p = byPid(b.pid); if (!p) continue;
            const S = sessionOf(b.pid);
            if (b.side === winner) {
                const payout = Math.floor(b.amount / winPool * tot);
                p.coins += payout; save(p);
                if (S) { sendMe(S); S.socket.emit('bet:result', { won: true, amount: b.amount, payout, name: W.name }); }
            } else if (S) S.socket.emit('bet:result', { won: false, amount: b.amount, payout: 0, name: W.name });
        }
        sysChat(d.room, `🏆 ${W.name} ha sconfitto ${L.name} nell'Arena${reason === 'forfeit' ? ' (abbandono)' : ''}! (+${delta} rating)`);
    } else {
        P.a.coins += d.stake; P.b.coins += d.stake; P.a.draws++; P.b.draws++;
        refundBets(d);
        sysChat(d.room, `⚔ ${P.a.name} e ${P.b.name} pareggiano. Scommesse rimborsate.`);
    }
    save(P.a); save(P.b);
    sendMe(sessionOf(P.a.id)); sendMe(sessionOf(P.b.id));
    for (const p of [P.a, P.b]) io.to(d.room).emit('player:stats', { id: p.id, rating: p.rating, level: levelFromWins(p.wins), wins: p.wins, losses: p.losses });
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
        if (!p) p = newProfile(d);
        else {
            if (cleanText(d.name, 16).length >= 2) p.name = cleanText(d.name, 16);
            if (d.appearance) p.appearance = sanitizeAppearance(d.appearance);
            if (d.card) p.card = sanitizeCard(d.card);
            if (isCardImage(d.cardImage)) p.cardImage = d.cardImage;
        }
        let daily = 0;
        if (!created && Date.now() - (p.lastDaily || 0) > 20 * 3600 * 1000) {
            p.coins += ECONOMY.DAILY_BONUS; p.lastDaily = Date.now(); daily = ECONOMY.DAILY_BONUS;
        }
        const prev = sessionOf(p.id);
        if (prev) { prev.socket.emit('kicked'); prev.socket.disconnect(true); }
        p.lastSeen = Date.now();
        save(p);
        me = { sid: socket.id, socket, p, room: null, pos: [0, 2, 34, Math.PI, 0], duelId: null, watching: null, lastChat: 0, lastCard: 0 };
        online.set(socket.id, me);
        sidByPid.set(p.id, socket.id);
        reply({ ok: true, token: p.token, profile: privateView(p), daily, created });
        joinRoom(me, 'pub');
        for (const fid of p.friends) { const F = sessionOf(fid); if (F) F.socket.emit('friend:status', { id: p.id, name: p.name, online: true }); }
        console.log(`+ ${p.name} (${p.id}) — online: ${online.size}`);
    });

    on('profile:update', (d, reply) => {
        const p = me.p;
        if (cleanText(d.name, 16).length >= 2) p.name = cleanText(d.name, 16);
        if (d.appearance) p.appearance = sanitizeAppearance(d.appearance);
        if (d.card) p.card = sanitizeCard(d.card);
        if (isCardImage(d.cardImage)) p.cardImage = d.cardImage;
        save(p); lbCache = null;
        socket.to(me.room).emit('player:look', { id: p.id, name: p.name, appearance: p.appearance, look: look(p), element: p.card.element });
        reply({ ok: true, profile: privateView(p) });
    });

    // --- MONDO ---
    socket.on('mv', (s) => {
        if (!me || !Array.isArray(s) || s.length < 5 || !s.slice(0, 5).every(Number.isFinite)) return;
        me.pos = s.slice(0, 5);
        socket.volatile.to(me.room).emit('mv', { i: me.p.id, s: me.pos });
    });
    on('emote', (d) => {
        if (!['saluta', 'balla', 'inchino', 'ride'].includes(d.e)) return;
        socket.to(me.room).emit('emote', { i: me.p.id, e: d.e });
    });
    on('mud', (d) => {
        if (!Array.isArray(d.o) || !Array.isArray(d.v) || ![...d.o, ...d.v].every(Number.isFinite)) return;
        socket.to(me.room).emit('mud', { i: me.p.id, o: d.o.slice(0, 3), v: d.v.slice(0, 3) });
    });
    on('mud:hit', (d) => { io.to(me.room).emit('mud:splat', { i: me.p.id, by: String(d.by || '') }); });
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
        if (me.p.inventory.length >= 80) return fail(reply, 'Inventario pieno');
        const cost = weaponCost(spec);
        if (me.p.coins < cost) return fail(reply, 'Sputnik Coin insufficienti');
        me.p.coins -= cost;
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
        me.p.inventory.push({ ...l.entry, uid: uid() });
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
                id: S.p.id, name: S.p.name, rating: S.p.rating, level: levelFromWins(S.p.wins), element: S.p.card.element,
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
                rating: p.rating, wins: p.wins, losses: p.losses, level: levelFromWins(p.wins), cardImage: p.cardImage,
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
        const entry = { from: me.p.id, name: me.p.name, title: me.p.card.title, element: me.p.card.element, image: me.p.cardImage, at: Date.now() };
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
        T.socket.emit('duel:invite', { cid, from: { id: me.p.id, name: me.p.name, rating: me.p.rating, element: me.p.card.element }, stake });
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
