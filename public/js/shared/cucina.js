// =====================================================================
//  LA CUCINA DI NONNA LUX (client + server) · Libro IV, Il Lab dei Ricordi
//  La dispensa: gli ingredienti del bosco, i pesci del Molo, il pane di
//  Tobia. Un sapore è un ricordo che si può rifare.
// =====================================================================
import { FISH, FISH_IDS } from './catalog.js';
import { islandHour } from './clock.js';
import { BP } from './bosco.js';

// gli ingredienti: quelli del bosco, il pane della Riva, e ogni pesce vero del Molo
export const INGR = {
    funghi: { name: 'Funghi del sottobosco', icon: 'orb', where: 'Il Bosco che Profuma, sotto gli abeti' },
    erbe: { name: 'Erbe del prato', icon: 'vial', where: 'Il Bosco che Profuma, il prato delle erbe' },
    bacche: { name: 'Bacche di rovo', icon: 'pearl', where: 'Il Bosco che Profuma, i cespugli di bacche' },
    acqua_nebbia: { name: 'Acqua della nebbia', icon: 'wave', where: 'La fonte nel bosco: si raccoglie solo all\'alba' },
    pane_tobia: { name: 'Pane di Tobia', icon: 'cauldron', where: 'Il Forno di Tobia, sulla Riva di Là' },
};
for (const id of FISH_IDS) if (FISH[id].rar !== 'junk' && FISH[id].rar !== 'special') INGR[id] = { name: FISH[id].name, icon: 'fish', where: 'Il Molo: la Pesca nella Nebbia', fish: true };
export const INGR_IDS = Object.keys(INGR);
export const DISPENSA_MAX = 30;      // per ingrediente

// i punti di raccolta del bosco: sei per funghi, erbe e bacche, due alla fonte
const ring = (kind, [cx, cz], n, r, pre) => Array.from({ length: n }, (_, i) => { const a = (i + 0.5) / n * Math.PI * 2; return { id: pre + i, kind, x: +(cx + Math.cos(a) * r).toFixed(2), z: +(cz + Math.sin(a) * r).toFixed(2) }; });
export const BOSCO_NODES = [
    ...ring('funghi', BP.fungaia, 6, 3.4, 'bf'),
    ...ring('erbe', BP.prato_erbe, 6, 3.6, 'be'),
    ...ring('bacche', BP.roveto, 6, 3.4, 'bb'),
    ...ring('acqua_nebbia', BP.fonte, 2, 1.4, 'ba'),
];
export const BOSCO_GATHER = { cooldown: 15 * 60 * 1000, daily: 10 };

// l'alba sull'isola: dalle 5 alle 9 (l'acqua della nebbia si raccoglie solo allora)
export const dawn = (now = Date.now()) => { const h = islandHour(now); return h >= 5 && h < 9; };
export function minutesToDawn(now = Date.now()) {
    if (dawn(now)) return 0;
    for (let s = 15; s <= 25 * 60; s += 15) if (dawn(now + s * 1000)) return Math.max(1, Math.round(s / 60));
    return 0;
}

// la dispensa: { id: quanti }
export function addIngr(p, id, n = 1) {
    const D = (p.dispensa ||= {}), have = D[id] || 0, add = Math.max(0, Math.min(n, DISPENSA_MAX - have));
    D[id] = have + add;
    return add;
}
export function hasIngr(p, need) {
    for (const [id, n] of Object.entries(need)) if ((p.dispensa?.[id] || 0) < n) return INGR[id]?.name || id;
    return null;
}
export function takeIngr(p, need) {
    for (const [id, n] of Object.entries(need)) p.dispensa[id] = (p.dispensa[id] || 0) - n;
}

// --- LE RICETTE: un piatto per capitolo; dalla seconda volta le cucina Nonna Lux, per i duelli ---
// mods: come quelli del pet (shared/fight.js): hp, atk, meter (carica della super), regen (punti vita al secondo)
export const RICETTE = {
    tofu: { name: 'Tofu della Nebbia', need: { acqua_nebbia: 2, erbe: 1 }, mods: { hp: 0.04 },
        desc: 'Morbido, quasi senza sapore: sa di mattina presto. Un po\' più di vita nei duelli.' },
    zuppa: { name: 'Zuppa della Borsa Rubata', need: { luccio: 1, funghi: 3 }, mods: { atk: 0.03 },
        desc: 'Quella della prima cena di Ettore e Rina, pagata coi soldi della borsa. Colpi un po\' più forti.' },
    pane_ponte: { name: 'Pane del Ponte', need: { pane_tobia: 1, lanterna: 1, erbe: 2 }, mods: { regen: 0.25 },
        desc: 'Il pane di Tobia con la Carpa Lanterna: la cena che Greta portò a Nando sotto il ponte. Recuperi vita piano piano.' },
    cena: { name: 'La Cena Lunga', need: { acqua_nebbia: 1, funghi: 2, erbe: 2, bacche: 2, anguilla: 1, pane_tobia: 1 }, mods: { meter: 0.08, hp: 0.02 },
        desc: 'Un po\' di tutto il libro, cucinato in cinque. La super si carica prima, e un filo di vita in più.' },
};
export const RICETTE_IDS = Object.keys(RICETTE);
// il gioco ai fornelli: tre fasi; dalla seconda volta cucina Lux, al massimo tre piatti al giorno
export const COOK = { phases: ['taglia', 'mescola', 'fuoco'], minMs: 6000, daily: 3, durMs: 30 * 60 * 1000, star: [0.8, 0.9, 1] };
export const cookStars = (score) => (score >= 0.85 ? 3 : score >= 0.5 ? 2 : 1);
// gli effetti del piatto che hai mangiato (null se è finito)
export function foodMods(food, now = Date.now()) {
    if (!food || !RICETTE[food.dish] || now >= food.until) return null;
    const k = COOK.star[Math.max(1, Math.min(3, food.stars | 0)) - 1], out = {};
    for (const [m, v] of Object.entries(RICETTE[food.dish].mods)) out[m] = v * k;
    return out;
}
