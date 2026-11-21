// =====================================================================
//  LE TERRE NUOVE (client + server)
//  La parte dell'isola ancora in costruzione, attaccata al fianco est
//  dell'isola grande da un collo di terra. Qui Rob il Righello, il
//  geometra, ha fatto i rilievi con il suo maestro: picchetti, paline,
//  case a metà, il suo studio con il tavolo da disegno e le tavole.
//  Solo la forma e i luoghi (nessun THREE): li usano world.js, il
//  server (per i luoghi della storia) e terre.js (le costruzioni).
// =====================================================================

export const TERRE = { x: 128, z: 24, r: 44 };
// il collo di terra che la lega all'isola grande
export const NECK = { a: [62, 20], b: [96, 25], w: 11 };

// i luoghi: [x, z]
export const TP = {
    studio: [110, 31],        // lo studio di Rob (la porta guarda a sud-ovest, verso il sentiero)
    tavola: [123, 11],        // la Tavola Lunga, nel prato: qui si farà la grande cena
    borgo: [140, 42],         // il borgo: le case di chi va e viene dall'isola
    cantiere: [125, 41],      // le case a metà, con i picchetti e le corde
    trig: [147, 3],           // il Punto Trigonometrico, in cima al colle
    grotta: [156, 30],        // la Grotta delle Voci, dentro lo sperone di roccia
    pontile: [166, 22],       // il pontile in fondo, da dove si guarda il mare aperto
    cs1: [94, 22],            // i tre capisaldi di Rob: al collo di terra,
    cs2: [133, 55],           // in fondo al borgo,
    cs3: [152, 13],           // sotto il colle
};
// i sentieri delle Terre Nuove, e quelli nuovi dell'isola grande (si aggiungono a WORLD.SIDE_PATHS)
export const TERRE_PATHS = [
    [[17, 10], [44, 15]], [[44, 15], [70, 21]], [[70, 21], [96, 25]], [[96, 25], [110, 31]],
    [[96, 25], [114, 16]], [[114, 16], [123, 11]], [[110, 31], [125, 38]], [[125, 38], [140, 42]],
    [[123, 11], [140, 8]], [[140, 8], [147, 3]], [[140, 42], [150, 33]], [[140, 8], [152, 18]], [[152, 18], [164, 22]],
    [[0, 32], [29, 28]],      // alla Stalla delle Nebbie
    [[0, 88], [-10, 89]],     // alla Barca Rovesciata
];
// gli spiazzi piani (centro, raggio, quota): le costruzioni ci poggiano sopra
export const PADS = [
    { at: TP.studio, r: 6, h: 2.4 },
    { at: TP.tavola, r: 9, h: 2.2 },
    { at: TP.borgo, r: 9, h: 2.6 },
    { at: TP.cantiere, r: 6, h: 2.5 },
];

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function distSeg(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
// quanto è «terra» qui (stessa scala di islandMask in world.js: >0 = sopra l'acqua)
export function terreMask(x, z) {
    const ox = x - TERRE.x, oz = z - TERRE.z, a = Math.atan2(oz, ox);
    const r = TERRE.r * (1 + 0.1 * Math.sin(a * 3 + 0.7) + 0.06 * Math.sin(a * 5 + 2) + 0.03 * Math.sin(a * 11));
    const lobe = 1 - Math.hypot(ox / 1.12, oz * 0.92) / r;
    const neck = 0.42 - distSeg(x, z, NECK.a[0], NECK.a[1], NECK.b[0], NECK.b[1]) / (NECK.w * 1.6);
    return Math.max(lobe, neck);
}
// le colline delle Terre Nuove: il colle del Punto Trigonometrico e lo sperone della grotta
export function terreRelief(x, z) {
    const [tx, tz] = TP.trig, [gx, gz] = TP.grotta;
    const hill = 9 * Math.pow(Math.max(0, 1 - Math.hypot(x - tx, z - tz) / 22), 1.6);
    const spur = 6.5 * Math.pow(Math.max(0, 1 - Math.hypot((x - gx - 4) * 0.8, z - gz) / 11), 1.2);
    return hill + spur;
}
export const pathDistTerre = (x, z) => { let d = Infinity; for (const [a, b] of TERRE_PATHS) d = Math.min(d, distSeg(x, z, a[0], a[1], b[0], b[1])); return d; };
// vicino a una costruzione delle Terre Nuove: niente alberi, rocce, canne o erba alta
export function nearTerreBuild(x, z, m = 0) {
    for (const P of PADS) if (Math.hypot(x - P.at[0], z - P.at[1]) < P.r + 2 + m) return true;
    for (const k of ['trig', 'cs1', 'cs2', 'cs3', 'pontile']) if (Math.hypot(x - TP[k][0], z - TP[k][1]) < 3 + m) return true;
    const [gx, gz] = TP.grotta;
    return Math.hypot(x - gx, z - gz) < 5 + m;
}
export const inTerre = (x, z) => x > 88 && Math.hypot(x - TERRE.x, z - TERRE.z) < TERRE.r * 1.3;
