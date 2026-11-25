// =====================================================================
//  LE GENTI DI PASSAGGIO: il motore che fa nascere gli NPC (client + server)
//  Ogni giorno l'isola si riempie di viandanti nuovi, creati con le stesse
//  regole del creatore di personaggi: specie, corporatura, occhi, capelli,
//  colori, vestiti, arma, seme e livello. Un «mestiere» dà loro un nome,
//  delle battute, un baratto e un modo di combattere.
//  Tutto nasce da un seme (il giorno + il numero), quindi ogni giocatore
//  vede le stesse persone nello stesso posto, e il server può fidarsi.
//  In duello: più sono forti rispetto a te, più esperienza e bottino.
// =====================================================================
import { APPEARANCE, ITEMS, itemLevel, ELEMENTS } from './catalog.js';
import { TP } from './terre.js';

export const GENTI_PER_DAY = 14;
export const GENTI_FIGHT_DAILY = 10;   // duelli premiati al giorno, in tutto

const PAL = {
    skin: ['#f3d2b3', '#e8c9a8', '#d9a77c', '#b47a52', '#8a5a3a', '#5a3a24', '#3a2416', '#8a8f96', '#c9d6c0', '#9ab0d6', '#7a5a9a', '#5a8a5a'],
    hair: ['#0e0b09', '#3a2414', '#6b3a1e', '#a0522d', '#d9a441', '#e8e0c8', '#9a9aa0', '#5a1a6e', '#1a3a6e', '#8b1a1a', '#2a6a3a'],
    eye: ['#3b6ea5', '#5a3b1e', '#2a7a3a', '#7a7a8a', '#b8401e', '#9a4aff', '#ffcc33', '#2ae0ff', '#1a1a1a'],
    cloth: ['#5a2a6e', '#3d1466', '#1d2a6b', '#2f4a24', '#7a1018', '#1a1a1f', '#4a3424', '#8a6a3a', '#2b2633', '#6b6f75', '#c9c0b0', '#0e3a3a', '#a05a2a', '#3a5a7a'],
};
// i mestieri: chi sono, cosa dicono, cosa barattano, quanto sono forti (lv = intervallo) e con cosa combattono
export const MESTIERI = {
    pellegrino: { nome: ['Pellegrino', 'Pellegrina'], lv: [1, 8], armi: ['bastone', 'pugnale'], specie: ['umano', 'elfo'], head: ['cappuccio'], fight: 0.7,
        lines: ['Cammino da tre giorni e l\'isola mi sembra sempre più grande.', 'Cerco la Fontana dei Desideri. Dicono che risponda solo a chi non chiede niente.', 'La nebbia mi ha preso il cappello e mi ha lasciato i ricordi. Uno scambio onesto, tutto sommato.'],
        trade: [{ give: { coins: 40 }, get: { perla: 1 } }, { give: { frammento: 2 }, get: { ecto: 1 } }] },
    ambulante: { nome: ['Ambulante', 'Ambulante'], lv: [2, 12], armi: ['pugnale', 'spada'], specie: ['umano', 'ratto'], head: ['tricorno'], fight: 0.6,
        lines: ['Roba buona, prezzi onesti, e se non è onesta è almeno divertente.', 'Ho fatto il giro dell\'isola tre volte stamattina. Le gambe me lo ricordano.', 'Al Bazar fanno pagare il banco. Io il banco me lo porto in spalla.'],
        trade: [{ give: { coins: 70 }, get: { pergamena: 1 } }, { give: { perla: 2 }, get: { corallo: 1 } }, { give: { coins: 50 }, get: { frammento: 2 } }] },
    guardia: { nome: ['Custode del Ponte', 'Custode del Ponte'], lv: [6, 18], armi: ['lancia', 'spada', 'ascia'], specie: ['umano', 'scheletro'], head: ['elmo'], fight: 1.1,
        lines: ['Il ponte non si attraversa di corsa. Lo dice il regolamento. L\'ho scritto io.', 'Ho fatto la guardia al castello per vent\'anni. Il castello non se n\'è mai andato.', 'Vuoi misurarti? Ti avverto: ho le braccia lunghe e la pazienza corta.'],
        trade: [{ give: { coins: 90 }, get: { ess_pietra: 1 } }] },
    strega: { nome: ['Erborista', 'Strega delle Erbe'], lv: [5, 16], armi: ['bastone', 'falce'], specie: ['elfo', 'umano', 'spettro'], head: ['strega', 'cappuccio'], fight: 0.9,
        lines: ['Questa radice cura il mal di testa. Quest\'altra lo fa venire. Non confonderle.', 'Il Cimitero ha l\'erba migliore. Sarà la compagnia.', 'Ti leggo la mano? No? Peccato, c\'era scritta una cosa bella.'],
        trade: [{ give: { perla: 2 }, get: { ecto: 2 } }, { give: { ecto: 2 }, get: { pergamena: 1 } }] },
    marinaio: { nome: ['Marinaio', 'Marinaia'], lv: [3, 14], armi: ['spada', 'pugnale', 'lancia'], specie: ['umano', 'ratto'], head: ['tricorno'], face: ['benda'], fight: 0.9,
        lines: ['Il mare aperto? L\'ho visto. È come la laguna, ma non sa quando fermarsi.', 'La Retaia ripara le reti meglio di chiunque. Non dirglielo, però: si monta la testa.', 'Ho un nodo per ogni porto. Qui ne ho fatto uno nuovo: si chiama «nebbia».'],
        trade: [{ give: { frammento: 3 }, get: { perla: 2 } }, { give: { coins: 60 }, get: { corallo: 1 } }] },
    bandito: { nome: ['Tagliaborse', 'Tagliaborse'], lv: [4, 22], armi: ['pugnale', 'falce', 'ascia'], specie: ['umano', 'ratto', 'scheletro'], head: ['cappuccio'], face: ['benda'], fight: 1.25,
        lines: ['Non ho rubato niente a nessuno. Oggi.', 'Che bella borsa. Pesante? No, chiedevo così.', 'Un duello? Se vinco tengo le monete, se perdi... tengo le monete lo stesso.'],
        trade: [{ give: { coins: 120 }, get: { corallo: 2 } }] },
    cavaliere: { nome: ['Cavaliere Errante', 'Dama Errante'], lv: [12, 28], armi: ['spada', 'martello', 'lancia'], specie: ['umano', 'elfo', 'spettro'], head: ['elmo', 'corona'], cape: ['mantello_regale', 'mantello_viola'], fight: 1.4,
        lines: ['Cerco un avversario degno. Tu sei... un avversario.', 'Ho giurato di non tornare a casa finché non avrò perso un duello. Sono via da molto.', 'Il Re Annegato? L\'ho sfidato una volta. Mi ha risposto con un\'onda.'],
        trade: [{ give: { coins: 200 }, get: { ess_fuoco: 1 } }] },
    musico: { nome: ['Cantastorie', 'Cantastorie'], lv: [1, 10], armi: ['bastone'], specie: ['elfo', 'umano', 'ratto'], head: ['piuma'], fight: 0.5,
        lines: ['Ti canto la storia del Faro Spento? È triste, ma ha un bel ritornello.', 'Ho scritto una canzone su Rob il Righello. Fa ridere e poi fa piangere, come lui.', 'Le storie dell\'isola non finiscono: cambiano solo chi le racconta.'],
        trade: [{ give: { coins: 30 }, get: { frammento: 1 } }, { give: { perla: 1 }, get: { coins: 45 } }] },
};
export const MESTIERE_IDS = Object.keys(MESTIERI);
const NOMI = {
    m: ['Aldo', 'Bruno', 'Ciro', 'Dario', 'Elio', 'Fausto', 'Gino', 'Ivo', 'Lauro', 'Mirko', 'Nello', 'Oreste', 'Piero', 'Remo', 'Sandro', 'Tullio', 'Ugo', 'Vasco', 'Zeno', 'Osvaldo'],
    f: ['Ada', 'Bice', 'Clelia', 'Dora', 'Elsa', 'Flora', 'Greta', 'Ines', 'Lea', 'Mara', 'Nora', 'Olga', 'Pia', 'Rina', 'Silvia', 'Tea', 'Vera', 'Zita', 'Ornella', 'Livia'],
};
// i posti dove la gente va e viene (sui sentieri): dalla piazza a tutta l'isola
const POSTI = {
    piazza: [2, 20], molo: [0.5, 84], forgia: [-14, 11], sartoria: [14, 11], bazar: [9, 34], cimitero: [-25, 40], stalla: [27, 29],
    cappella: [24, 46], ponte: [0, -28], terre: [70, 21], borgo: [TP.borgo[0] - 2.5, TP.borgo[1] - 2.5], tavola: [TP.tavola[0] - 4, TP.tavola[1] + 3], studio: [104, 28],
};
const HUB = [[0, 14], [0, 32]];
// le bestie preferite da ogni mestiere, e i nomi che danno ai loro pet
const PET_PREF = {
    pellegrino: ['cane', 'fantasmino', 'gatto'], ambulante: ['gatto', 'corvo', 'cane'], guardia: ['cane', 'corvo'], strega: ['corvo', 'fatuo', 'gatto'],
    marinaio: ['granchio', 'anguilla', 'gatto'], bandito: ['corvo', 'gatto'], cavaliere: ['cane', 'fatuo'], musico: ['fantasmino', 'anguilla', 'corvo'],
};
const PET_NOMI = ['Briciola', 'Ombra', 'Pepe', 'Fumo', 'Lumino', 'Chela', 'Nebbiolo', 'Ruggine', 'Mirtillo', 'Zolfo', 'Biscotto', 'Spillo', 'Tizzone', 'Bruma', 'Cecco', 'Velluto'];
const SPEED = 1.4;

// numeri ripetibili da un seme
function rng(seed) { let s = 0; for (const c of String(seed)) s = Math.imul(s ^ c.charCodeAt(0), 2654435761); return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];

// --- un viandante, dal giorno e dal suo numero ---
const CACHE = new Map();
export function gente(day, k) {
    const key = day + ':' + k;
    if (CACHE.has(key)) return CACHE.get(key);
    const r = rng('genti:' + key), mid = pick(r, MESTIERE_IDS), M = MESTIERI[mid];
    const sex = r() < 0.5 ? 'm' : 'f', species = pick(r, M.specie);
    const app = {
        sex, species, build: pick(r, APPEARANCE.build), height: 0.86 + r() * 0.26, eyes: pick(r, APPEARANCE.eyes), mouth: pick(r, APPEARANCE.mouth),
        hair: sex === 'f' && r() < 0.6 ? pick(r, ['lunghi', 'codino']) : pick(r, APPEARANCE.hair), beard: sex === 'f' ? 'nessuna' : pick(r, APPEARANCE.beard),
        topStyle: pick(r, APPEARANCE.topStyle), skin: species === 'scheletro' ? '#e9e2cf' : pick(r, PAL.skin), eyeColor: pick(r, PAL.eye), hairColor: pick(r, PAL.hair),
        top: pick(r, PAL.cloth), bottom: pick(r, PAL.cloth), shoes: pick(r, PAL.cloth),
    };
    const look = {};
    if (M.head && r() < 0.75) look.head = pick(r, M.head);
    if (M.face && r() < 0.5) look.face = pick(r, M.face);
    if (M.cape && r() < 0.8) look.cape = pick(r, M.cape);
    for (const s of ['head', 'face', 'cape']) if (look[s] && !ITEMS[look[s]]) delete look[s];
    const level = Math.round(M.lv[0] + Math.pow(r(), 1.4) * (M.lv[1] - M.lv[0]));
    const element = pick(r, Object.keys(ELEMENTS));
    const mats = level >= 18 ? ['ossidiana', 'argento', 'oro'] : level >= 9 ? ['ferro', 'osso', 'argento'] : ['legno', 'ferro', 'osso'];
    const weapon = { type: pick(r, M.armi), material: pick(r, mats), handle: pick(r, ['legno', 'cuoio', 'osso', 'seta']), gem: level >= 10 ? pick(r, ['rubino', 'zaffiro', 'ametista', 'smeraldo', 'onice']) : 'nessuna', name: 'Arma di ' + M.nome[0] };
    const nome = pick(r, NOMI[sex]), title = M.nome[sex === 'f' ? 1 : 0];
    // dove va oggi: da un posto a un altro passando per la piazza, e ritorno
    const posti = Object.keys(POSTI), a = pick(r, posti); let b = pick(r, posti); if (b === a) b = posti[(posti.indexOf(a) + 3) % posti.length];
    const route = [[...POSTI[a], 30 + r() * 60], ...(r() < 0.5 ? [HUB[0]] : [HUB[1]]).map(p => [...p, 0]), [...POSTI[b], 40 + r() * 80]];
    const G = {
        k, day, id: `g${k}`, mestiere: mid, name: `${nome} ${/^[AEIOU]/i.test(title) ? "l'" : sex === 'f' ? 'la ' : 'il '}${title}`,
        app, look: { ...look, weapon }, level, element, lines: M.lines, trade: pick(r, M.trade), fight: M.fight, route, offset: r() * 1000,
    };
    // quattro viandanti su dieci si portano dietro un pet, scelto secondo il mestiere
    const rp = rng('genti-pet:' + key);
    if (rp() < 0.4) {
        const sp = pick(rp, PET_PREF[mid] || ['corvo', 'cane', 'gatto', 'fantasmino', 'fatuo', 'granchio', 'anguilla']);
        G.pet = { sp, name: pick(rp, PET_NOMI), lv: Math.max(1, Math.min(20, Math.round(level / 2 + rp() * 4))), ench: level >= 16 && rp() < 0.4 ? 1 + Math.floor(rp() * 2) : 0, health: 1 };
    }
    CACHE.set(key, G);
    if (CACHE.size > 200) CACHE.delete(CACHE.keys().next().value);
    return G;
}
export function gentiOf(day) { return Array.from({ length: GENTI_PER_DAY }, (_, k) => gente(day, k)); }

// dove si trova adesso (andata, sosta, ritorno, sosta) e se cammina
const PLANS = new Map();
function plan(G) {
    if (PLANS.has(G.day + G.id)) return PLANS.get(G.day + G.id);
    const there = G.route.map(([x, z, w]) => ({ x, z, w })), back = [...there].reverse().map((p, i) => ({ ...p, w: i === 0 ? 0 : p.w }));
    const pts = [...there, ...back.slice(1)], legs = [];
    let t = 0;
    for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (p.w) { legs.push({ t0: t, t1: t + p.w, a: p, b: p, wait: true }); t += p.w; }
        const q = pts[i + 1]; if (!q) break;
        const d = Math.hypot(q.x - p.x, q.z - p.z) / SPEED;
        legs.push({ t0: t, t1: t + d, a: p, b: q }); t += d;
    }
    const P = { legs, total: t };
    PLANS.set(G.day + G.id, P);
    if (PLANS.size > 200) PLANS.delete(PLANS.keys().next().value);
    return P;
}
export function genteAt(G, now = Date.now()) {
    const P = plan(G), t = ((now / 1000 + G.offset) % P.total + P.total) % P.total;
    const L = P.legs.find(l => t >= l.t0 && t < l.t1) || P.legs[0];
    const k = L.t1 > L.t0 ? (t - L.t0) / (L.t1 - L.t0) : 0;
    return { x: L.a.x + (L.b.x - L.a.x) * k, z: L.a.z + (L.b.z - L.a.z) * k, yaw: L.wait ? null : Math.atan2(L.b.x - L.a.x, L.b.z - L.a.z), walking: !L.wait };
}

// --- quanto vale un duello con lui, per un viandante di livello «me» ---
export function forza(G, me) {
    const d = G.level - me;
    return d <= -6 ? { id: 'debole', name: 'Debole', color: '#9a9a9a' } : d <= -2 ? { id: 'facile', name: 'Alla tua portata', color: '#5fd38a' }
        : d <= 2 ? { id: 'pari', name: 'Alla pari', color: '#e8c23a' } : d <= 6 ? { id: 'forte', name: 'Forte', color: '#ff8a3a' } : { id: 'tremendo', name: 'Tremendo', color: '#ff3a3a' };
}
// esperienza e bottino: crescono con la sua forza rispetto alla tua (meno se è più debole, molto di più se è più forte)
export function premio(G, me, won) {
    const ratio = Math.max(0.25, Math.min(2.5, G.level / Math.max(1, me))), base = (35 + G.level * 7) * G.fight;
    const xp = Math.round(base * ratio * (won ? 1 : 0.2));
    const loot = {};
    if (won) {
        loot.frammento = Math.max(1, Math.min(4, Math.round(ratio * (0.8 + G.level / 15))));
        if (ratio >= 0.9) loot.perla = Math.min(3, Math.round(ratio));
        if (ratio >= 1.5) loot.ecto = 1;
        if (G.level >= 15 && ratio >= 1.2) loot.corallo = 1;
    }
    return { xp, loot, itemChance: won ? Math.min(0.6, 0.05 + Math.max(0, ratio - 0.8) * 0.3) : 0, coins: won ? Math.round(G.level * 4 * ratio) : 0 };
}
// un oggetto della sua «taglia»: vestiario di un livello vicino al suo
export function bottinoOggetto(G, rnd = Math.random) {
    const pool = Object.keys(ITEMS).filter(id => Math.abs(itemLevel(id) - G.level) <= 6);
    return pool.length ? pool[Math.floor(rnd() * pool.length)] : null;
}
