// =====================================================================
//  IL BOSCO CHE PROFUMA (client + server) · Libro IV, Il Lab dei Ricordi
//  Dall'altra parte dell'isola, a ovest: un bosco fitto di faggi e abeti,
//  legato all'isola grande da un collo di terra. Al centro c'è la locanda
//  Il Tofu della Nebbia, dove Nonna Lux cucina i ricordi.
//  Solo la forma e i luoghi (nessun THREE): li usano world.js, il server
//  e regions/bosco.js (gli alberi, la locanda, i personaggi).
// =====================================================================

export const BOSCO = { x: -200, z: 10, r: 70 };
// il collo di terra che lo lega all'isola grande (a = lato isola, b = lato bosco)
export const NECK_B = { a: [-46, 17], b: [-138, 10], w: 12 };

// la locanda: la porta (lato +z locale) guarda a est, verso il collo di terra
export const INN = { x: -206, z: 8, ry: Math.PI / 2, y: 2.4, w: 14, d: 10, h: 4.2 };

// dalla sala (lx lungo la larghezza, lz verso la porta) al mondo
export const innPt = (lx, lz) => [INN.x + lx * Math.cos(INN.ry) + lz * Math.sin(INN.ry), INN.z - lx * Math.sin(INN.ry) + lz * Math.cos(INN.ry)];
// dentro la sala della locanda?
export const inInn = (x, z) => { const dx = x - INN.x, dz = z - INN.z, lx = dx * Math.cos(INN.ry) - dz * Math.sin(INN.ry), lz = dx * Math.sin(INN.ry) + dz * Math.cos(INN.ry); return Math.abs(lx) < INN.w / 2 && Math.abs(lz) < INN.d / 2; };
// com'è messa la sala: il bancone e la cucina in fondo a sinistra, due tavoli lunghi a destra
export const INN_ROOM = {
    counter: { lx: -2.4, lz: -2.9, w: 5.4, d: 0.8 },             // il bancone aperto sulla cucina
    stove: { lx: -4.6, lz: -4.3 },                                // la stufa
    tables: [{ lx: 2.6, lz: -1.2, w: 4.4, d: 0.9 }, { lx: 2.6, lz: 2.0, w: 4.4, d: 0.9 }],
    bench: 0.75,                                                  // le panche, a questa distanza dal centro del tavolo
};
// dove stanno Lux e i cinque (lry: verso dove guardano, nella sala)
export const INN_SEATS = {
    lux: { lx: -2.4, lz: -4.0, lry: 0 },
    // tutti e cinque allo stesso tavolo: le due coppie una di fronte all'altra, Pippo a capotavola, in mezzo a loro
    ettore: { lx: 1.9, lz: -1.95, lry: 0, sit: true },
    rina: { lx: 3.1, lz: -1.95, lry: 0, sit: true },
    nando: { lx: 1.9, lz: -0.45, lry: Math.PI, sit: true },
    greta: { lx: 3.1, lz: -0.45, lry: Math.PI, sit: true },
    pippo: { lx: 5.35, lz: -1.2, lry: -Math.PI / 2, sit: true },
};

// i luoghi: [x, z]
export const BP = {
    locanda: [INN.x, INN.z],
    soglia: [INN.x + INN.d / 2 + 2.5, INN.z],   // davanti alla porta
    fonte: [-234, -20],      // la fonte dove, all'alba, si raccoglie l'acqua della nebbia
    radura: [-176, 40],      // la radura dei faggi
    fungaia: [-218, 42],     // i funghi, sotto gli abeti
    roveto: [-168, -24],     // i cespugli di bacche
    prato_erbe: [-196, -40], // il prato delle erbe
};

// i sentieri: dal collo di terra alla locanda, e dalla locanda ai luoghi
export const BOSCO_PATHS = [
    [NECK_B.a, NECK_B.b], [NECK_B.b, [-170, 9]], [[-170, 9], BP.soglia],
    [BP.soglia, [-186, 26]], [[-186, 26], BP.radura],
    [[-186, 26], [-206, 34]], [[-206, 34], BP.fungaia],
    [BP.soglia, [-200, -12]], [[-200, -12], [-218, -18]], [[-218, -18], BP.fonte],
    [[-200, -12], BP.prato_erbe], [[-170, 9], BP.roveto],
];
// lo spiazzo piano della locanda (centro, raggio, quota)
export const BOSCO_PADS = [{ at: BP.locanda, r: 13, h: INN.y }];

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function distSeg(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
// quanto è «terra» qui (stessa scala di islandMask in world.js: >0 = sopra l'acqua)
export function boscoMask(x, z) {
    const ox = x - BOSCO.x, oz = z - BOSCO.z, a = Math.atan2(oz, ox);
    const r = BOSCO.r * (1 + 0.08 * Math.sin(a * 3 + 2.2) + 0.05 * Math.sin(a * 5 + 0.3) + 0.03 * Math.sin(a * 11 + 1));
    const lobe = 1 - Math.hypot(ox, oz) / r;
    const neck = 0.42 - distSeg(x, z, NECK_B.a[0], NECK_B.a[1], NECK_B.b[0], NECK_B.b[1]) / (NECK_B.w * 1.6);
    return Math.max(lobe, neck);
}
// le colline dolci del bosco: il poggio della fonte, a ovest, e un dosso dietro la radura
export function boscoRelief(x, z) {
    const [fx, fz] = BP.fonte, [rx, rz] = BP.radura;
    const poggio = 5 * Math.pow(Math.max(0, 1 - Math.hypot(x - fx + 8, z - fz) / 30), 1.5);
    const dosso = 2.5 * Math.pow(Math.max(0, 1 - Math.hypot(x - rx + 4, z - rz - 12) / 18), 1.4);
    return poggio + dosso;
}
export const pathDistBosco = (x, z) => { let d = Infinity; for (const [a, b] of BOSCO_PATHS) d = Math.min(d, distSeg(x, z, a[0], a[1], b[0], b[1])); return d; };
export const inBosco = (x, z) => x < -74 && boscoMask(x, z) > -0.15;   // anche il collo di terra, dove finisce l'isola grande
// vicino alla locanda o a un sentiero del bosco: niente alberi, rocce, canne o erba alta
export function nearBoscoBuild(x, z, m = 0) {
    for (const P of BOSCO_PADS) if (Math.hypot(x - P.at[0], z - P.at[1]) < P.r + m) return true;
    return x < -60 && pathDistBosco(x, z) < 2.2 + m;
}
