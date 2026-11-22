// =====================================================================
//  LA CASA DEL CANTIERE (client + server)
//  Dopo la grande cena, il cantiere che Rob aveva aperto nelle Terre
//  Nuove è finito: è la casa che ha lasciato a te. Una casa semplice,
//  costruita su una griglia di 8 × 6 metri: muri, porte e finestre sui
//  bordi delle caselle, pavimenti e arredi sulle caselle. Si cambia
//  tutto, pagando in monete e materiali; quel che togli ti rende metà.
//  Qui ci sono solo le regole e i conti: li usano il gioco e il server.
// =====================================================================
import { TP } from './terre.js';

export const GW = 8, GD = 6;   // caselle: larghezza (x) e profondità (z), un metro ciascuna
// l'angolo nord-ovest del lotto (le caselle vanno verso +x e +z; la facciata con la porta guarda +z)
export const LOTTO = { x: TP.cantiere[0] - GW / 2, z: TP.cantiere[1] - GD / 2, y: 2.5 };
export const WALL_H = 2.7;

// i materiali dei muri (anche per porte e finestre)
export const MURI = {
    legno: { name: 'Assi di legno', color: '#7a5a3a', cost: { coins: 12 } },
    intonaco: { name: 'Intonaco bianco', color: '#e6dcc8', cost: { coins: 18 } },
    mattoni: { name: 'Mattoni', color: '#a0523a', cost: { coins: 22, frammento: 1 } },
    pietra: { name: 'Pietra dell\'isola', color: '#6a6470', cost: { coins: 28, frammento: 1 } },
    corallo: { name: 'Pietra di corallo', color: '#c86a6a', cost: { coins: 40, corallo: 1 } },
};
export const APERTURE = {
    muro: { name: 'Muro', extra: {} },
    finestra: { name: 'Finestra', extra: { coins: 10 } },
    porta: { name: 'Porta', extra: { coins: 15 } },
};
export const PAVIMENTI = {
    terra: { name: 'Terra battuta', color: '#6a5a44', cost: {} },
    assi: { name: 'Assi di legno', color: '#8a6040', cost: { coins: 4 } },
    cotto: { name: 'Cotto', color: '#a85a3a', cost: { coins: 6 } },
    pietra: { name: 'Lastre di pietra', color: '#6e6a74', cost: { coins: 8 } },
    marmo: { name: 'Marmo della nebbia', color: '#d8d4e0', cost: { coins: 14, perla: 1 } },
};
// gli arredi: w × d caselle (prima di girarli)
export const ARREDI = {
    letto: { name: 'Letto', w: 1, d: 2, cost: { coins: 60 } },
    tavolo: { name: 'Tavolo', w: 2, d: 1, cost: { coins: 40 } },
    sedia: { name: 'Sedia', w: 1, d: 1, cost: { coins: 12 } },
    camino: { name: 'Camino', w: 2, d: 1, cost: { coins: 90, frammento: 2 } },
    libreria: { name: 'Libreria', w: 2, d: 1, cost: { coins: 55 } },
    baule: { name: 'Baule', w: 1, d: 1, cost: { coins: 30 }, max: 3 },
    cuccia: { name: 'Cuccia', w: 1, d: 1, cost: { coins: 45 }, max: 3 },
    tappeto: { name: 'Tappeto', w: 2, d: 2, cost: { coins: 35 }, flat: true },
    lampada: { name: 'Lampada', w: 1, d: 1, cost: { coins: 25 } },
    pianta: { name: 'Pianta in vaso', w: 1, d: 1, cost: { coins: 15 } },
    acquario: { name: 'Acquario della laguna', w: 1, d: 1, cost: { coins: 80, perla: 3 } },
    trofeo: { name: 'Trofeo d\'armi', w: 1, d: 1, cost: { coins: 70, frammento: 2 } },
    tecnigrafo: { name: 'Il tecnigrafo di Rob', w: 1, d: 1, cost: {}, gift: true, max: 1 },
};
// il baule: quanti posti per ogni baule in casa (un oggetto = un posto; un materiale = un posto, quanti che siano)
export const BAULE_SLOTS = 40;
export const casaCount = (L, id) => (L?.items || []).filter(it => it.id === id).length;
export const bauleUsed = (B) => (B?.inv?.length || 0) + Object.values(B?.mats || {}).filter(n => n > 0).length;
// sei dentro il lotto della casa? (per il baule e la cuccia)
export const inCasa = (x, z) => x > LOTTO.x - 1 && x < LOTTO.x + GW + 1 && z > LOTTO.z - 1 && z < LOTTO.z + GD + 1;

// la casa che lascia Rob: assi di legno, intonaco, una porta sulla facciata, due finestre, il suo tecnigrafo
export function casaDiRob() {
    const e = {};
    for (let x = 0; x < GW; x++) { e[`h,${x},0`] = 'muro:intonaco'; e[`h,${x},${GD}`] = 'muro:intonaco'; }
    for (let z = 0; z < GD; z++) { e[`v,0,${z}`] = 'muro:intonaco'; e[`v,${GW},${z}`] = 'muro:intonaco'; }
    e[`h,3,${GD}`] = 'porta:legno'; e[`h,5,${GD}`] = 'finestra:intonaco'; e[`h,1,${GD}`] = 'finestra:intonaco'; e[`v,${GW},2`] = 'finestra:intonaco';
    const floor = {};
    for (let x = 0; x < GW; x++) for (let z = 0; z < GD; z++) floor[`${x},${z}`] = 'assi';
    return { v: 1, edges: e, floor, items: [{ id: 'tecnigrafo', x: 6, z: 1, r: 0 }, { id: 'letto', x: 0, z: 0, r: 0 }, { id: 'tavolo', x: 3, z: 2, r: 0 }, { id: 'sedia', x: 3, z: 3, r: 2 }] };
}

// il prezzo di un pezzo
export function edgeCost(t) {
    const [ap, mat] = String(t).split(':'), M = MURI[mat], A = APERTURE[ap];
    if (!M || !A) return null;
    const c = { ...M.cost };
    for (const [k, n] of Object.entries(A.extra)) c[k] = (c[k] || 0) + n;
    return c;
}
// quanto vale tutta la casa (per fare i conti dei cambi)
export function casaValue(L) {
    const tot = {};
    const add = (c) => { for (const [k, n] of Object.entries(c || {})) tot[k] = (tot[k] || 0) + n; };
    for (const t of Object.values(L.edges || {})) add(edgeCost(t));
    for (const f of Object.values(L.floor || {})) add(PAVIMENTI[f]?.cost);
    for (const it of L.items || []) add(ARREDI[it.id]?.cost);
    return tot;
}
// le caselle occupate da un arredo girato (r = 0..3)
export function itemCells(it) {
    const A = ARREDI[it.id]; if (!A) return [];
    const w = it.r % 2 ? A.d : A.w, d = it.r % 2 ? A.w : A.d, out = [];
    for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) out.push([it.x + i, it.z + j]);
    return out;
}
// è una casa valida? (forma, coordinate, sovrapposizioni, numeri massimi) → la versione pulita, o null
export function cleanCasa(L) {
    if (!L || typeof L !== 'object') return null;
    const edges = {}, floor = {}, items = [];
    for (const [k, t] of Object.entries(L.edges || {})) {
        const [o, xs, zs] = k.split(','), x = +xs, z = +zs;
        if (!edgeCost(t) || !Number.isInteger(x) || !Number.isInteger(z)) return null;
        if (o === 'h' && x >= 0 && x < GW && z >= 0 && z <= GD) edges[k] = t;
        else if (o === 'v' && x >= 0 && x <= GW && z >= 0 && z < GD) edges[k] = t;
        else return null;
    }
    for (const [k, f] of Object.entries(L.floor || {})) {
        const [x, z] = k.split(',').map(Number);
        if (!PAVIMENTI[f] || !(x >= 0 && x < GW && z >= 0 && z < GD)) return null;
        floor[k] = f;
    }
    const used = new Set();
    for (const [id, A] of Object.entries(ARREDI)) if (A.max && (L.items || []).filter(it => it?.id === id).length > A.max) return null;   // un tecnigrafo solo, tre bauli, tre cucce
    for (const it of (L.items || []).slice(0, 40)) {
        const c = { id: String(it.id), x: it.x | 0, z: it.z | 0, r: (it.r | 0) & 3 };
        if (!ARREDI[c.id]) return null;
        for (const [x, z] of itemCells(c)) {
            if (!(x >= 0 && x < GW && z >= 0 && z < GD)) return null;
            if (!ARREDI[c.id].flat) { const k = x + ',' + z; if (used.has(k)) return null; used.add(k); }
        }
        items.push(c);
    }
    return { v: 1, edges, floor, items };
}
