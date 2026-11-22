// =====================================================================
//  IL PASSO DEI VIANDANTI (solo client)
//  Le strade di erranti e genti sono linee dritte fra i posti, uguali per
//  tutti (il server sa dove sono). Qui il personaggio cammina davvero:
//  guarda dove sarà fra una dozzina di secondi e si traccia un sentiero
//  (A* su una griglia fine) che gira attorno a case, recinti, alberi e
//  lampioni tenendosi a distanza; lo segue al passo giusto per restare
//  insieme al suo punto sulla strada. Resta sul terreno (niente tetti).
//  Se resta troppo indietro ricompare al suo punto.
// =====================================================================
const CELL = 4, RAD = 0.45;        // griglia dei collider (per tastare solo quelli vicini) e distanza dai muri
const NAV = 0.7, MAXC = 110;       // la griglia del sentiero: lato della casella, caselle per lato al massimo
const _p = { x: 0, z: 0 };

// --- una griglia dei collider, per tastare in fretta solo quelli vicini ---
const grid = { n: -1, map: new Map(), at: 0 };
function cellsOf(W) {
    const now = performance.now();
    if (grid.n === W.colliders.length && now - grid.at < 8000) return grid.map;
    grid.n = W.colliders.length; grid.at = now; grid.map = new Map();
    for (const c of W.colliders) {
        const r = (c.type === 'circ' ? c.r : Math.hypot(c.hw, c.hd)) + RAD;
        for (let i = Math.floor((c.x - r) / CELL); i <= Math.floor((c.x + r) / CELL); i++)
            for (let j = Math.floor((c.z - r) / CELL); j <= Math.floor((c.z + r) / CELL); j++) {
                const k = i * 100003 + j; let a = grid.map.get(k); if (!a) grid.map.set(k, a = []); a.push(c);
            }
    }
    return grid.map;
}
// lì c'è qualcosa che ferma chi cammina coi piedi a quell'altezza?
function blocked(W, map, x, z, feet) {
    const a = map.get(Math.floor(x / CELL) * 100003 + Math.floor(z / CELL));
    if (!a) return false;
    for (const c of a) {
        if (c.y1 <= feet + 0.55 && !c.noWalk) continue;   // gradini, pedane, pavimenti: ci si sale
        if (feet >= c.y1 - 0.02 || feet + 1.7 <= c.y0) continue;
        if (W.inside(c, x, z, RAD)) return true;
    }
    return false;
}
// i piedi, lì: il terreno, o le pedane all'altezza di dove sta adesso (moli, ponticelli); veloce, senza girare tutti i collider
const feetAt = (W, x, z, y) => Math.max(W.terrainAt(x, z), y - 0.4);
// da a a b si passa dritti?
function lineClear(W, map, ax, az, bx, bz, y) {
    const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 0.35);
    for (let i = 1; i <= n; i++) { const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n; if (blocked(W, map, x, z, feetAt(W, x, z, y))) return false; }
    return true;
}

// --- A* su una griglia attorno a partenza e arrivo; se l'arrivo è irraggiungibile, va il più vicino possibile ---
function plan(W, map, sx, sz, gx, gz, y, M = 8) {
    // la finestra: partenza e arrivo con M metri di margine (se è troppo grande, l'arrivo si avvicina)
    const span = MAXC * NAV - 2 * M, d = Math.hypot(gx - sx, gz - sz);
    if (d > span) { gx = sx + (gx - sx) * span / d; gz = sz + (gz - sz) * span / d; }
    const x0 = Math.min(sx, gx) - M, z0 = Math.min(sz, gz) - M;
    const nx = Math.min(MAXC, Math.ceil((Math.max(sx, gx) + M - x0) / NAV) + 1), nz = Math.min(MAXC, Math.ceil((Math.max(sz, gz) + M - z0) / NAV) + 1), N = nx * nz;
    const blk = new Int8Array(N).fill(-1);
    const cx = (i) => x0 + (i % nx) * NAV, cz = (i) => z0 + ((i / nx) | 0) * NAV;
    const isB = (i) => { if (blk[i] < 0) { const x = cx(i), z = cz(i); blk[i] = blocked(W, map, x, z, feetAt(W, x, z, y)) ? 1 : 0; } return blk[i] === 1; };
    const idx = (x, z) => Math.max(0, Math.min(nx - 1, Math.round((x - x0) / NAV))) + Math.max(0, Math.min(nz - 1, Math.round((z - z0) / NAV))) * nx;
    const s = idx(sx, sz), t = idx(gx, gz), tx = t % nx, tz = (t / nx) | 0;
    const G = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), done = new Uint8Array(N);
    const hh = (i) => { const dx = Math.abs(i % nx - tx), dz = Math.abs(((i / nx) | 0) - tz); return (dx + dz - 0.586 * Math.min(dx, dz)) * NAV; };
    // una coda con priorità (heap binario)
    const H = [], F = [];
    const push = (i, f) => { H.push(i); F.push(f); let k = H.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (F[p] <= F[k]) break; [H[p], H[k]] = [H[k], H[p]]; [F[p], F[k]] = [F[k], F[p]]; k = p; } };
    const pop = () => { const top = H[0], lh = H.pop(), lf = F.pop(); if (H.length) { H[0] = lh; F[0] = lf; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < H.length && F[l] < F[m]) m = l; if (r < H.length && F[r] < F[m]) m = r; if (m === k) break; [H[m], H[k]] = [H[k], H[m]]; [F[m], F[k]] = [F[k], F[m]]; k = m; } } return top; };
    G[s] = 0; push(s, hh(s));
    let best = s, bestH = hh(s), it = 0;
    while (H.length && it++ < 14000) {
        const i = pop();
        if (done[i]) continue; done[i] = 1;
        const h = hh(i); if (h < bestH) { bestH = h; best = i; }
        if (i === t) break;
        const ix = i % nx, iz = (i / nx) | 0;
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dz) continue;
            const jx = ix + dx, jz = iz + dz;
            if (jx < 0 || jz < 0 || jx >= nx || jz >= nz) continue;
            const j = jz * nx + jx;
            if (done[j] || isB(j)) continue;
            if (dx && dz && (isB(iz * nx + jx) || isB(jz * nx + ix))) continue;   // niente angoli tagliati
            const g = G[i] + (dx && dz ? 1.414 : 1) * NAV;
            if (g < G[j]) { G[j] = g; from[j] = i; push(j, g + hh(j)); }
        }
    }
    // il sentiero, a ritroso dall'arrivo (o dal punto più vicino raggiunto)
    const pts = [];
    for (let i = done[t] ? t : best; i >= 0 && i !== s; i = from[i]) pts.push([cx(i), cz(i)]);
    pts.reverse();
    if (done[t] && !isB(t)) pts.push([gx, gz]);
    // si tirano dritti i tratti che si possono fare in linea retta
    const out = []; let ax = sx, az = sz, k = 0;
    while (k < pts.length) {
        let j = pts.length - 1;
        while (j > k && !lineClear(W, map, ax, az, pts[j][0], pts[j][1], y)) j--;
        out.push(pts[j]); [ax, az] = pts[j]; k = j + 1;
    }
    out.reached = !!done[t] || isB(t);   // ci arriva, o l'arrivo è dentro qualcosa (allora va bene il più vicino possibile)
    return out;
}

// n: { ch, … } · at: dov'è adesso secondo la strada · goal: dove sarà fra un po' (sulla strada)
// ritorna quanto si è mosso
export function walkTo(W, n, at, dt, k = 0, goal = at) {
    const r = n.ch.root.position, map = cellsOf(W);
    const dAt = Math.hypot(at.x - r.x, at.z - r.z);
    if (!n.wk || dAt > 20) {
        // la prima volta (o troppo indietro): sul suo punto, e fuori da ciò che c'è lì
        _p.x = at.x; _p.z = at.z;
        const y = W.terrainAt(at.x, at.z);
        for (let i = 0; i < 3; i++) W.collide(_p, 0.35, y, 1.7);
        r.set(_p.x, W.groundAt(_p.x, _p.z, y + 0.3), _p.z);
        n.wk = true; n.path = null; n.replan = 0;
        return 0;
    }
    // il sentiero: si rifà ogni tanto, o se la meta si è spostata parecchio
    n.replan -= dt;
    if (!n.path || n.replan <= 0 || Math.hypot(goal.x - n.pgx, goal.z - n.pgz) > 4) {
        n.path = plan(W, map, r.x, r.z, goal.x, goal.z, r.y);
        if (!n.path.reached) n.path = plan(W, map, r.x, r.z, goal.x, goal.z, r.y, 22);   // chiuso da un recinto lungo: si cerca il cancello più lontano
        n.pgx = goal.x; n.pgz = goal.z; n.replan = 1.6 + (k % 5) * 0.15;
    }
    const P = n.path;
    while (P.length && Math.hypot(P[0][0] - r.x, P[0][1] - r.z) < 0.35) P.shift();
    if (!P.length) {
        if (dAt < 1.5) return 0;   // arrivato (o più vicino di così non si può): fermo, senza spingere
        P.push([at.x, at.z]); n.replan = 0.5;   // nessun sentiero (è stretto fra due cose): verso il suo punto, scivolando
    }
    // al passo del suo punto sulla strada: quanto manca a lui, quanto manca al punto
    let rem = Math.hypot(P[0][0] - r.x, P[0][1] - r.z);
    for (let i = 1; i < P.length; i++) rem += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    const remAt = Math.hypot(goal.x - at.x, goal.z - at.z);
    const speed = 1.4 * Math.max(0.45, Math.min(2.3, (rem + 0.5) / (remAt + 0.5)));
    const tx = P[0][0] - r.x, tz = P[0][1] - r.z, dn = Math.hypot(tx, tz);
    const step = Math.min(dn, dt * speed);
    _p.x = r.x + tx / dn * step; _p.z = r.z + tz / dn * step;
    W.collide(_p, 0.35, r.y, 1.7);   // per sicurezza: non attraversa mai niente
    const mx = _p.x - r.x, mz = _p.z - r.z;
    r.x = _p.x; r.z = _p.z;
    r.y = W.groundAt(r.x, r.z, r.y);   // il suolo vicino ai piedi: ponti e pedane sì, i tetti no
    n.moveYaw = Math.hypot(mx, mz) > 0.002 ? Math.atan2(mx, mz) : n.moveYaw;
    return Math.hypot(mx, mz);
}
