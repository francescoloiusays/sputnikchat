// =====================================================================
//  LA RIVA DI LÀ (Libro III) · la forma della terra (client + server)
//  La terra che si vede all'orizzonte quando il faro si riaccende:
//  sta fuori dalla griglia dell'isola, lungo il fascio del faro.
//  Qui c'è solo la geometria pura (nessun THREE): l'altezza del suolo
//  e i punti importanti, in coordinate «di riva»:
//    u = metri verso l'isola (il pontile guarda da quella parte)
//    v = metri di lato
// =====================================================================

// il centro: 560 m dall'isola, nella direzione del faro (dove la luce piccola ha risposto)
export const RIVA = { x: 353, z: -435, r: 80, t: [-0.6304, 0.7763], deckY: 1.05 };
const [TX, TZ] = RIVA.t, NX = -TZ, NZ = TX;

export function rivaPt(u, v) { return [RIVA.x + TX * u + NX * v, RIVA.z + TZ * u + NZ * v]; }
export function rivaUV(x, z) { const ox = x - RIVA.x, oz = z - RIVA.z; return [ox * TX + oz * TZ, ox * NX + oz * NZ]; }
// la direzione (yaw del personaggio) che guarda verso +u, cioè verso l'isola
export const RIVA_YAW = Math.atan2(TX, TZ);

// i luoghi della riva (u, v)
export const RP = {
    jetty0: [RIVA.r - 9, 0], jetty1: [RIVA.r + 13, 0],
    landing: [RIVA.r - 13, 3],
    casa: [RIVA.r - 18, 8],
    lume: [RIVA.r - 8.6, -2.4],
    village: [10, -32],
    pozzo: [-14, -14],
    monte: [-40, 10],
    spiaggia: [42, -58],
};

// le cinque case vuote del villaggio, in cerchio intorno al cippo, con la porta verso il centro: [u, v, yaw]
export const HUTS = [0, 1, 2, 3, 4].map(i => {
    const a = i * Math.PI * 2 / 5 + 0.35, [cu, cv] = RP.village;
    const u = cu + Math.cos(a) * 11, v = cv + Math.sin(a) * 11;
    const [x, z] = rivaPt(u, v), [ox, oz] = rivaPt(cu, cv);
    return [u, v, Math.atan2(ox - x, oz - z)];
});
// dove sta un ricordo: appena dentro la porta della casa i
export function hutInside(i, k = 0.9) {
    const [u, v] = HUTS[i], [cu, cv] = RP.village;
    return [u + (cu - u) / 11 * k, v + (cv - v) / 11 * k];
}

// --- rumore (lo stesso tipo dell'isola, ma un seme suo) ---
function hash(x, y) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + 977) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}
function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
export function rfbm(x, y, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// il raggio della costa in ogni direzione (a = 0 è il pontile: lì vale esattamente r)
export function rivaCoast(a) { return RIVA.r * (1 + 0.12 * Math.sin(a * 3) + 0.06 * Math.sin(a * 5) + 0.035 * Math.sin(a * 11)); }

// quanto è lontano (in m) dal suolo pieno del Monte Storto
function mountain(u, v) {
    const [mu, mv] = RP.monte;
    const d = Math.hypot(u - mu, v - mv);
    let h = 31 * Math.pow(Math.max(0, 1 - d / 40), 1.5);
    // la cima storta: una spalla che pende verso il mare aperto
    const d2 = Math.hypot(u - mu + 7, v - mv - 9);
    h += 7 * Math.pow(Math.max(0, 1 - d2 / 12), 2);
    h += rfbm(u * 0.08 + 3, v * 0.08) * 2.4 * smooth(0, 20, h);   // costoni e sassi
    return h;
}

export function rivaHeight(x, z) {
    const [u, v] = rivaUV(x, z), d = Math.hypot(u, v), a = Math.atan2(v, u);
    const m = 1 - d / rivaCoast(a);
    let base = m < -0.15 ? Math.max(-9, -1.6 + (m + 0.15) * 30) : -1.6 + smooth(-0.15, 0.3, m) * 2.6;
    const hills = (rfbm(x * 0.028 + 40, z * 0.028) * 0.5 + 0.5) * 4 * smooth(0.18, 0.6, m) + rfbm(x * 0.1 + 9, z * 0.1) * 0.3 * smooth(0.05, 0.3, m);
    let h = base + hills + mountain(u, v) * smooth(-0.1, 0.15, m);
    // in cima un pianoro piccolo: il cippo e chi lo tocca stanno sullo stesso piano
    const [mu, mv] = RP.monte;
    h = Math.min(h, 30.5 + smooth(2.8, 9, Math.hypot(u - mu, v - mv)) * 30);
    // il villaggio dei Senza Nome: uno spiazzo piano
    const [vu, vv] = RP.village;
    h = lerp(h, 2.2, 1 - smooth(15, 23, Math.hypot(u - vu, v - vv)));
    // l'approdo e la casa della Cartografa: un terrapieno piano, all'altezza del pontile
    const [lu, lv] = RP.landing;
    h = lerp(h, RIVA.deckY - 0.05, 1 - smooth(9, 15, Math.hypot(u - lu, v - lv)));
    // il Pozzo dei Nomi: una conca
    const [pu, pv] = RP.pozzo;
    h = lerp(h, 0.9, 1 - smooth(5, 11, Math.hypot(u - pu, v - pv)));
    return h;
}
// distanza dalla terra (per il nuoto): oltre la costa si nuota poco, poi la corrente respinge
export function rivaShore(x, z) {
    const [u, v] = rivaUV(x, z);
    return Math.max(0, Math.hypot(u, v) - rivaCoast(Math.atan2(v, u)) * 0.95);
}
// dentro il riquadro della riva (per chi chiede l'altezza del suolo)
export const nearRiva = (x, z, m = 0) => Math.hypot(x - RIVA.x, z - RIVA.z) < RIVA.r * 1.45 + m;
