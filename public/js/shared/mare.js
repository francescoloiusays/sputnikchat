// =====================================================================
//  IL MARE E IL BARATTO (client + server)
//  - le canne da pesca della Retaia, alla Barca Rovesciata vicino al Molo
//  - il Baratto del Mercante senza Ombra, al Bazar
//  Qui solo dati e conti: i premi li decide il server.
// =====================================================================
import { ITEMS, itemLevel, xpToNext } from './catalog.js';

// --- LA BARCA ROVESCIATA: la casa della Retaia, sulla spiaggia a ovest del Molo ---
export const BARCA = { x: -13, z: 89, ry: 1.25 };   // la bocca della barca guarda il Molo

// --- LE CANNE ---
// zone  = la zona chiara è più alta (in proporzione)
// fill  = la lenza si riempie più in fretta, e si svuota più piano
// bite  = quanto aspetti l'abboccata (1 = come sempre)
// window = secondi in più per ferrare
// luck  = più pesci rari ed epici, meno rottami
// daily = pescate in più al giorno con i premi pieni
export const RODS = [
    { id: 'canna', name: 'Canna di Canna', lv: 1, cost: null, zone: 0, fill: 0, bite: 1, window: 0, luck: 0, daily: 0,
        wood: '#5a3a1e', tip: '#5a3a1e', reel: '#9ea4ab', bob: '#e8202a',
        desc: 'Quella che ti ha dato il Traghettatore il primo giorno. Si piega, ma non si spezza.' },
    { id: 'bambu', name: 'Canna di Bambù Nero', lv: 3, cost: { coins: 180, perla: 4 }, zone: 0.15, fill: 0.1, bite: 0.9, window: 0.15, luck: 0, daily: 0,
        wood: '#1f1a16', tip: '#3a3026', reel: '#9ea4ab', bob: '#e8202a',
        desc: 'Leggera e scattante: la zona chiara è più larga e il pesce ti scappa meno.' },
    { id: 'ottone', name: 'Canna col Mulinello d\'Ottone', lv: 6, cost: { coins: 450, perla: 8, corallo: 2 }, zone: 0.25, fill: 0.2, bite: 0.75, window: 0.25, luck: 0.25, daily: 2,
        wood: '#3b2a1a', tip: '#c8963a', reel: '#d4a03a', bob: '#ffb020',
        desc: 'Il mulinello tira per te: la lenza si riempie prima, i pesci abboccano prima, e ogni giorno puoi pescare di più.' },
    { id: 'osso', name: 'Canna d\'Osso di Balena', lv: 10, cost: { coins: 1000, perla: 14, corallo: 5 }, zone: 0.35, fill: 0.3, bite: 0.65, window: 0.35, luck: 0.6, daily: 4,
        wood: '#e6dcc3', tip: '#b8a888', reel: '#d4a03a', bob: '#4aa8ff',
        desc: 'Sa di mare aperto. I pesci rari la sentono arrivare e salgono a guardarla.' },
    { id: 'marea', name: 'Canna della Marea', lv: 15, cost: { coins: 2200, perla: 24, corallo: 10, ecto: 4 }, zone: 0.45, fill: 0.4, bite: 0.55, window: 0.5, luck: 1.1, daily: 6,
        wood: '#1d3a4a', tip: '#7affd8', reel: '#7affd8', bob: '#7affd8', glow: true,
        desc: 'Corallo che cresce sotto la luna, intrecciato con l\'ectoplasma. Il galleggiante brilla, e la laguna ti risponde.' },
];
export const rodOf = (p) => RODS[Math.max(0, Math.min(RODS.length - 1, p?.rod | 0))];

// il Corallo Nero sale con i pesci: più il pesce è raro, più spesso
export const CORAL_CHANCE = { com: 0, unc: 0.05, rar: 0.25, epi: 0.6 };

// --- IL BARATTO DEL MERCANTE ---
// ogni giorno cinque baratti (sempre un tonico), più un oggetto del giorno da prendere in cambio di materiali.
// get.xp: 'small' | 'med' | 'big' = una parte dell'esperienza che ti manca al livello dopo
export const XP_TONIC = { small: 0.15, med: 0.3, big: 0.6 };
export const TONIC_DAILY = 3;     // tonici al giorno, in tutto
export const ITEM_TRADES_DAILY = 4;  // oggetti dati al Mercante al giorno (con esperienza)
export const TRADES = {
    tonico_s: { name: 'Tonico Salmastro', icon: 'potion', give: { perla: 2, coins: 60 }, get: { xp: 'small' }, max: 2,
        say: 'Acqua di laguna, sale e un pizzico di quello che non ti dico. Ti fa sentire più grande.' },
    tonico_m: { name: 'Elisir della Nebbia', icon: 'flask', give: { frammento: 3, ecto: 2 }, get: { xp: 'med' }, max: 2,
        say: 'Distillato al chiaro di luna. Non chiedere chi l\'ha assaggiato per primo.' },
    tonico_l: { name: 'Distillato del Re', icon: 'vial', give: { corallo: 2, perla: 4, pergamena: 1 }, get: { xp: 'big' }, max: 1,
        say: 'Il Re Annegato lo beveva a colazione. Guarda com\'è finito. Però era fortissimo.' },
    corallo: { name: 'Corallo Nero', icon: 'crystal', give: { perla: 3, frammento: 2 }, get: { corallo: 1 }, max: 3,
        say: 'Lo strappo dai pali del molo quando nessuno guarda. La Retaia lo pagherebbe oro.' },
    perle: { name: 'Due Perle', icon: 'pearl', give: { frammento: 4 }, get: { perla: 2 }, max: 3,
        say: 'Schegge che cantano per perle che tacciono. Un affare per tutti e due.' },
    frammenti: { name: 'Due Frammenti', icon: 'shard', give: { perla: 3 }, get: { frammento: 2 }, max: 3,
        say: 'Le pietre del Cerchio non le raccolgo io: le raccoglie chi ha fretta, e me le vende.' },
    pergamena: { name: 'Pergamena Benedetta', icon: 'scroll', give: { ecto: 3, coins: 80 }, get: { pergamena: 1 }, max: 2,
        say: 'Benedetta da un prete che non esiste più. Funziona lo stesso.' },
    ecto: { name: 'Due Ectoplasmi', icon: 'ecto', give: { frammento: 3 }, get: { ecto: 2 }, max: 3,
        say: 'In barattolo, ben chiusi. Se sussurrano, non risponder loro.' },
};
export const TRADE_IDS = Object.keys(TRADES);

// numero (0..1) stabile per un giorno e un seme
function dayRnd(day, seed) {
    let h = 2166136261;
    for (const c of `${day}:${seed}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return ((h >>> 0) % 100000) / 100000;
}
// i baratti di oggi: un tonico sempre (a rotazione), poi quattro degli altri
export function tradesOfDay(day) {
    const tonics = ['tonico_s', 'tonico_m', 'tonico_l'], rest = TRADE_IDS.filter(id => !tonics.includes(id));
    const t = tonics[Math.floor(dayRnd(day, 'tonico') * tonics.length)];
    const pick = rest.map(id => [id, dayRnd(day, id)]).sort((a, b) => a[1] - b[1]).slice(0, 4).map(x => x[0]);
    // il tonico piccolo c'è sempre: chi è all'inizio deve poter crescere
    return [...new Set(['tonico_s', t, ...pick])].slice(0, 6);
}
// l'oggetto del giorno: qualcosa della Sartoria o della Forgia, pagato in materiali invece che in monete
export function itemOfDay(day) {
    const pool = Object.keys(ITEMS).filter(id => ITEMS[id].price >= 40 && ITEMS[id].price <= 400).sort();
    if (!pool.length) return null;
    const id = pool[Math.floor(dayRnd(day, 'oggetto') * pool.length)], pr = ITEMS[id].price;
    return { itemId: id, lv: itemLevel(id), give: { perla: Math.max(1, Math.ceil(pr / 45)), frammento: Math.max(1, Math.ceil(pr / 70)) } };
}
// quanta esperienza dà un tonico, al tuo livello
export const tonicXp = (kind, level) => Math.max(30, Math.round(xpToNext(level) * XP_TONIC[kind]));
// cosa dà il Mercante per un oggetto: un po' di monete e un po' di esperienza
export function itemTradeValue(value, level) {
    return { coins: Math.floor(value * 0.3), xp: Math.max(8, Math.min(Math.round(value * 0.4), Math.round(xpToNext(level) * 0.12))) };
}
