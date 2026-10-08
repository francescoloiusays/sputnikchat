// =====================================================================
//  CATALOGO CONDIVISO (client + server)
//  Elementi delle card, armi, vestiario, aspetto, economia.
//  Il server usa queste stesse regole per validare prezzi e statistiche.
// =====================================================================

export const ECONOMY = {
    START_COINS: 150,
    DAILY_BONUS: 25,
    WIN_BONUS: 30,
    LOSS_BONUS: 5,
    MAX_STAKE: 500,
    MAX_BET: 1000,
    BET_WINDOW_MS: 15000,
    SCRAP_RATE: 0.3,
    MAX_LIST_PRICE: 99999,
};

// --- ELEMENTI (decisi dalla texture della card) ---
export const ELEMENTS = {
    fuoco: {
        name: 'Fuoco', color: '#ff5a1f', glow: '#ffb347', dark: '#3a0a02', icon: '🔥',
        mods: { hp: 0, atk: 0.15, def: -0.05, spd: 0, weight: 0 },
        passive: { name: 'Furia Ardente', desc: '+15% danni inflitti.' },
        special: { id: 'fiammata', name: 'Fiammata Infernale', desc: 'Scaglia una sfera di lava che incendia il nemico per 3 secondi.' },
    },
    ghiaccio: {
        name: 'Ghiaccio', color: '#7fd8ff', glow: '#e0f7ff', dark: '#06243a', icon: '❄️',
        mods: { hp: 0.05, atk: 0, def: 0.1, spd: -0.05, weight: 0.1 },
        passive: { name: 'Pelle di Brina', desc: '-10% danni subiti.' },
        special: { id: 'gelo', name: 'Prigione di Gelo', desc: 'Una scheggia di ghiaccio congela il nemico sul posto.' },
    },
    spettro: {
        name: 'Spettro', color: '#b06cff', glow: '#e3c8ff', dark: '#1a0633', icon: '👻',
        mods: { hp: -0.1, atk: 0.05, def: 0, spd: 0.15, weight: -0.15 },
        passive: { name: 'Etereo', desc: 'Salto triplo e passo più rapido.' },
        special: { id: 'passo', name: 'Passo Fantasma', desc: 'Svanisce e riappare alle spalle del nemico, colpendolo.' },
    },
    palude: {
        name: 'Palude', color: '#5fbf4a', glow: '#c8ff9e', dark: '#0b2a0e', icon: '🌿',
        mods: { hp: 0.15, atk: -0.05, def: 0, spd: 0, weight: 0.05 },
        passive: { name: 'Linfa Antica', desc: 'Rigenera lentamente i punti vita.' },
        special: { id: 'miasma', name: 'Miasma Velenoso', desc: 'Evoca una nube tossica davanti a sé e recupera vita.' },
    },
    tempesta: {
        name: 'Tempesta', color: '#ffe14a', glow: '#fff7c2', dark: '#1c1a3a', icon: '⚡',
        mods: { hp: -0.05, atk: 0.05, def: -0.05, spd: 0.1, weight: 0 },
        passive: { name: 'Passo del Tuono', desc: 'Scatto più lungo e veloce.' },
        special: { id: 'saetta', name: 'Saetta Celeste', desc: 'Un fulmine si abbatte sul nemico e lo stordisce.' },
    },
    pietra: {
        name: 'Pietra', color: '#a9a39a', glow: '#e8e2d6', dark: '#1e1c1a', icon: '🪨',
        mods: { hp: 0.1, atk: 0, def: 0.2, spd: -0.12, weight: 0.45 },
        passive: { name: 'Inamovibile', desc: 'Subisce meno danni e quasi nessun contraccolpo.' },
        special: { id: 'frana', name: 'Frana del Castello', desc: 'Colpisce il suolo: onde di roccia travolgono il nemico.' },
    },
    fango: {
        name: 'Fango', color: '#a0703c', glow: '#e6c08a', dark: '#2a1806', icon: '🟤',
        mods: { hp: 0.05, atk: 0, def: 0.05, spd: 0, weight: 0.1 },
        passive: { name: 'Infangato', desc: 'Sporco e coriaceo: +5% vita e difesa.' },
        special: { id: 'fango', name: 'Raffica di Fango', desc: 'Tre palle di fango che rallentano il nemico.' },
    },
};
export const ELEMENT_IDS = Object.keys(ELEMENTS);

// --- TEXTURE PREDEFINITE DELLA CARD ---
export const CARD_TEXTURES = [
    { id: 'marmo', name: 'Marmo Antico', element: 'palude', file: 'img/marmo.jpg' },
    { id: 'lava', name: 'Colata di Lava', element: 'fuoco' },
    { id: 'brina', name: 'Lago Ghiacciato', element: 'ghiaccio' },
    { id: 'nebbia', name: 'Nebbia Spettrale', element: 'spettro' },
    { id: 'muschio', name: 'Acquitrino', element: 'palude' },
    { id: 'fulmine', name: 'Cielo in Tempesta', element: 'tempesta' },
    { id: 'mura', name: 'Mura del Castello', element: 'pietra' },
    { id: 'melma', name: 'Melma della Laguna', element: 'fango' },
];

export const CARD_ARTS = [
    { id: 'ritratto', name: 'Ritratto 3D' },
    { id: 'propic:rat', name: 'Ratto', file: 'img/propic_rat.jpg' },
    { id: 'propic:alessandro', name: 'Alessandro', file: 'img/propic_alessandro.jpg' },
    { id: 'propic:francesco', name: 'Francesco', file: 'img/propic_francesco.jpg' },
];

// Colore dominante (HSL) → elemento. Usato per le texture caricate dall'utente.
export function elementFromHSL(h, s, l) {
    if (s < 0.14 || l < 0.07) return 'pietra';
    if (h < 22 || h >= 335) return 'fuoco';
    if (h < 50) return l < 0.5 && s < 0.8 ? 'fango' : 'fuoco'; // marrone scuro = fango, arancio acceso = fuoco
    if (h < 72) return 'tempesta';
    if (h < 165) return 'palude';
    if (h < 245) return 'ghiaccio';
    return 'spettro';
}

// --- ARMI ---
export const WEAPON_TYPES = {
    pugni:    { name: 'Pugni',    icon: '✊', cost: 0,  dmg: 0.9,  speed: 1.15, reach: 0.0,  kb: 0.9 },
    pugnale:  { name: 'Pugnale',  icon: '🔪', cost: 20, dmg: 0.95, speed: 1.3,  reach: 0.25, kb: 0.8 },
    spada:    { name: 'Spada',    icon: '🗡️', cost: 40, dmg: 1.1,  speed: 1.0,  reach: 0.55, kb: 1.0 },
    ascia:    { name: 'Ascia',    icon: '🪓', cost: 50, dmg: 1.3,  speed: 0.85, reach: 0.45, kb: 1.15 },
    martello: { name: 'Martello', icon: '🔨', cost: 60, dmg: 1.45, speed: 0.72, reach: 0.4,  kb: 1.4 },
    lancia:   { name: 'Lancia',   icon: '🔱', cost: 45, dmg: 1.0,  speed: 0.95, reach: 1.1,  kb: 1.0 },
    falce:    { name: 'Falce',    icon: '🌙', cost: 70, dmg: 1.2,  speed: 0.85, reach: 0.9,  kb: 1.1 },
    bastone:  { name: 'Bastone',  icon: '🪄', cost: 35, dmg: 0.95, speed: 1.05, reach: 0.75, kb: 1.05, meter: 0.25 },
};
export const MATERIALS = {
    legno:     { name: 'Legno',             cost: 0,   dmg: -0.1, speed: 0.05, color: '#7a5230', metal: 0 },
    ferro:     { name: 'Ferro',             cost: 20,  dmg: 0,    speed: 0,    color: '#9ea4ab', metal: 0.9 },
    osso:      { name: 'Osso',              cost: 25,  dmg: 0.02, speed: 0.08, color: '#e6dcc3', metal: 0 },
    ossidiana: { name: 'Ossidiana',         cost: 60,  dmg: 0.15, speed: -0.05, color: '#2a1838', metal: 0.6, emissive: '#5a1d8a' },
    argento:   { name: 'Argento Spettrale', cost: 90,  dmg: 0.08, speed: 0.08, color: '#cfe4ff', metal: 1, emissive: '#2a5cff' },
    oro:       { name: 'Oro',               cost: 120, dmg: 0.06, speed: 0.02, color: '#ffc93b', metal: 1 },
};
export const HANDLES = {
    legno: { name: 'Legno grezzo',     cost: 0,  speed: 0,    dmg: 0,    color: '#5a3a1e' },
    cuoio: { name: 'Cuoio',            cost: 10, speed: 0.05, dmg: 0,    color: '#3b2414' },
    osso:  { name: 'Osso',             cost: 15, speed: 0,    dmg: 0.04, color: '#d9ceb2' },
    seta:  { name: 'Seta Nera',        cost: 25, speed: 0.08, dmg: 0,    color: '#18121e' },
    oro:   { name: "Filigrana d'Oro",  cost: 40, speed: 0.03, dmg: 0.03, color: '#e0a92a' },
};
export const GEMS = {
    nessuna:  { name: 'Nessuna',  cost: 0,  element: null,       color: null },
    rubino:   { name: 'Rubino',   cost: 50, element: 'fuoco',    color: '#ff2a3a' },
    zaffiro:  { name: 'Zaffiro',  cost: 50, element: 'ghiaccio', color: '#3a7bff' },
    ametista: { name: 'Ametista', cost: 50, element: 'spettro',  color: '#b44dff' },
    smeraldo: { name: 'Smeraldo', cost: 50, element: 'palude',   color: '#2bdc6a' },
    topazio:  { name: 'Topazio',  cost: 50, element: 'tempesta', color: '#ffd21f' },
    onice:    { name: 'Onice',    cost: 50, element: 'pietra',   color: '#b8b8b8' },
    ambra:    { name: 'Ambra',    cost: 50, element: 'fango',    color: '#ff9a1f' },
};
export const STARTER_WEAPON = { type: 'spada', material: 'legno', handle: 'legno', gem: 'nessuna', name: 'Spada di Legno' };

export function sanitizeWeaponSpec(spec) {
    if (!spec || typeof spec !== 'object') return null;
    if (!WEAPON_TYPES[spec.type] || spec.type === 'pugni') return null;
    if (!MATERIALS[spec.material] || !HANDLES[spec.handle] || !GEMS[spec.gem]) return null;
    const def = `${WEAPON_TYPES[spec.type].name} di ${MATERIALS[spec.material].name}`;
    return { type: spec.type, material: spec.material, handle: spec.handle, gem: spec.gem, name: cleanText(spec.name, 28) || def };
}

export function weaponCost(spec) {
    return WEAPON_TYPES[spec.type].cost + MATERIALS[spec.material].cost + HANDLES[spec.handle].cost + GEMS[spec.gem].cost;
}

// Statistiche finali di un'arma (null = pugni)
export function weaponStats(spec) {
    const t = WEAPON_TYPES[spec?.type] || WEAPON_TYPES.pugni;
    const m = MATERIALS[spec?.material] || { dmg: 0, speed: 0 };
    const h = HANDLES[spec?.handle] || { dmg: 0, speed: 0 };
    const g = GEMS[spec?.gem] || GEMS.nessuna;
    return {
        dmg: +(t.dmg * (1 + m.dmg + h.dmg)).toFixed(3),
        speed: +(t.speed * (1 + m.speed + h.speed)).toFixed(3),
        reach: t.reach,
        kb: t.kb,
        meter: (t.meter || 0) + (g.element ? 0.2 : 0),
        gem: g.element,
    };
}

// --- VESTIARIO (Sartoria) ---
export const SLOTS = ['head', 'face', 'cape', 'torso', 'weapon'];
export const SLOT_NAMES = { head: 'Testa', face: 'Volto', cape: 'Mantello', torso: 'Busto', weapon: 'Arma' };
export const SLOT_ICONS = { head: '🎩', face: '🎭', cape: '🧣', torso: '🛡️', weapon: '⚔️' };

export const ITEMS = {
    cappuccio:       { slot: 'head',  name: 'Cappuccio del Monaco',    price: 40,  color: '#3a2a20', desc: 'Per chi prega in silenzio... o trama.' },
    piuma:           { slot: 'head',  name: 'Cappello con Piuma',      price: 60,  color: '#2f5a2a', color2: '#f2c14e', desc: 'Il preferito dei bardi della laguna.' },
    strega:          { slot: 'head',  name: 'Cappello da Strega',      price: 80,  color: '#1c1424', color2: '#7a3cff', desc: 'Profuma ancora di pozioni.' },
    tricorno:        { slot: 'head',  name: 'Tricorno del Pirata',     price: 90,  color: '#1a1a1a', color2: '#d4af37', desc: 'Ripescato da un relitto.' },
    elmo:            { slot: 'head',  name: 'Elmo del Cavaliere',      price: 120, color: '#8e9399', desc: 'Ammaccato, ma onesto.' },
    corna:           { slot: 'head',  name: 'Corna del Diavolo',       price: 100, color: '#9c1a14', desc: 'Nessuno chiede da dove vengano.' },
    aureola:         { slot: 'head',  name: 'Aureola Perduta',         price: 250, color: '#ffe680', glow: true, desc: 'Un angelo l\'ha persa al Bazar.' },
    corona:          { slot: 'head',  name: 'Corona Spettrale',        price: 300, color: '#9fe8ff', glow: true, desc: 'Appartenuta al re del castello.' },
    peste:           { slot: 'face',  name: 'Maschera della Peste',    price: 150, color: '#e8dcc0', desc: 'Il becco è pieno di erbe profumate.' },
    benda:           { slot: 'face',  name: 'Benda da Pirata',         price: 30,  color: '#111111', desc: 'Un occhio basta e avanza.' },
    monocolo:        { slot: 'face',  name: 'Monocolo',                price: 45,  color: '#d4af37', desc: 'Raffinatezza da nobile decaduto.' },
    mantello_nero:   { slot: 'cape',  name: 'Mantello Nero',           price: 60,  color: '#141218', desc: 'Classico. Svolazza benissimo.' },
    mantello_rosso:  { slot: 'cape',  name: 'Mantello Cremisi',        price: 60,  color: '#7a1018', desc: 'Si nota da un miglio.' },
    mantello_viola:  { slot: 'cape',  name: 'Mantello del Negromante', price: 80,  color: '#3d1466', desc: 'Cucito con fili di nebbia.' },
    mantello_regale: { slot: 'cape',  name: 'Mantello Regale',         price: 200, color: '#5a0d14', color2: '#f3efe6', desc: 'Con collo di ermellino.' },
    ali:             { slot: 'cape',  name: 'Ali di Pipistrello',      price: 220, color: '#1d1420', desc: 'Non fanno volare. Ma quasi.' },
    grembiule:       { slot: 'torso', name: 'Grembiule del Fabbro',    price: 30,  color: '#3d5a2a', desc: 'Resiste alle scintille.' },
    cotta:           { slot: 'torso', name: 'Cotta di Maglia',         price: 100, color: '#8a9096', desc: 'Tintinna a ogni passo.' },
    tunica_mago:     { slot: 'torso', name: 'Veste Stellata',          price: 90,  color: '#1d2a6b', color2: '#ffe680', desc: 'Ricamata con le stelle della laguna.' },
    ossa:            { slot: 'torso', name: "Armatura d'Ossa",         price: 180, color: '#e6dcc3', desc: 'Meglio non chiedere di chi.' },
    corazza:         { slot: 'torso', name: 'Corazza Dorata',          price: 280, color: '#e0b13a', desc: 'Brilla anche al chiaro di luna.' },
};

// --- ASPETTO DEL PERSONAGGIO ---
export const APPEARANCE = {
    species: ['umano', 'elfo', 'ratto', 'scheletro', 'spettro'],
    build: ['snello', 'medio', 'robusto'],
    eyes: ['tondi', 'sottili', 'fieri', 'assonnati', 'luminosi'],
    mouth: ['sorriso', 'neutro', 'ghigno', 'zanne', 'sorpreso'],
    hair: ['calvo', 'corti', 'lunghi', 'cresta', 'codino', 'ciuffo'],
    beard: ['nessuna', 'pizzetto', 'folta', 'baffi'],
    topStyle: ['tunica', 'giacca', 'veste'],
};
export const APPEARANCE_LABELS = {
    species: { umano: 'Umano', elfo: 'Elfo', ratto: 'Ratto', scheletro: 'Scheletro', spettro: 'Spettro' },
    build: { snello: 'Snello', medio: 'Medio', robusto: 'Robusto' },
    eyes: { tondi: 'Tondi', sottili: 'Sottili', fieri: 'Fieri', assonnati: 'Assonnati', luminosi: 'Luminosi' },
    mouth: { sorriso: 'Sorriso', neutro: 'Neutro', ghigno: 'Ghigno', zanne: 'Zanne', sorpreso: 'Sorpreso' },
    hair: { calvo: 'Calvo', corti: 'Corti', lunghi: 'Lunghi', cresta: 'Cresta', codino: 'Codino', ciuffo: 'Ciuffo' },
    beard: { nessuna: 'Nessuna', pizzetto: 'Pizzetto', folta: 'Folta', baffi: 'Baffi' },
    topStyle: { tunica: 'Tunica', giacca: 'Giacca', veste: 'Veste lunga' },
};
export const DEFAULT_APPEARANCE = {
    species: 'umano', build: 'medio', height: 1, skin: '#d9a77c',
    eyes: 'tondi', eyeColor: '#3b6ea5', mouth: 'sorriso',
    hair: 'corti', hairColor: '#3a2414', beard: 'nessuna',
    topStyle: 'tunica', top: '#5a2a6e', bottom: '#2b2633', shoes: '#1e1612',
};
export const PRESETS = {
    ratto: {
        species: 'ratto', build: 'snello', height: 0.9, skin: '#8a8f96',
        eyes: 'tondi', eyeColor: '#b8401e', mouth: 'zanne',
        hair: 'calvo', hairColor: '#6d7177', beard: 'nessuna',
        topStyle: 'tunica', top: '#5b5e63', bottom: '#4a4d52', shoes: '#d98c8c',
    },
    alessandro: {
        species: 'elfo', build: 'medio', height: 1.05, skin: '#e8c9a8',
        eyes: 'sottili', eyeColor: '#5a3b1e', mouth: 'neutro',
        hair: 'corti', hairColor: '#1c2333', beard: 'pizzetto',
        topStyle: 'veste', top: '#1a1a1f', bottom: '#141417', shoes: '#0e0e10',
    },
    francesco: {
        species: 'elfo', build: 'snello', height: 1, skin: '#5a3a24',
        eyes: 'fieri', eyeColor: '#2a1a0e', mouth: 'neutro',
        hair: 'corti', hairColor: '#120c08', beard: 'nessuna',
        topStyle: 'tunica', top: '#2f4a24', bottom: '#3a5a2c', shoes: '#2a4020',
    },
};

const HEX = /^#[0-9a-f]{6}$/i;
export function sanitizeAppearance(a) {
    a = a && typeof a === 'object' ? a : {};
    const o = {};
    for (const k of Object.keys(APPEARANCE)) o[k] = APPEARANCE[k].includes(a[k]) ? a[k] : DEFAULT_APPEARANCE[k];
    for (const k of ['skin', 'eyeColor', 'hairColor', 'top', 'bottom', 'shoes']) {
        o[k] = HEX.test(a[k] || '') ? a[k].toLowerCase() : DEFAULT_APPEARANCE[k];
    }
    o.height = Math.min(1.15, Math.max(0.85, +a.height || 1));
    return o;
}

// --- CARD ---
const MAX_IMG = 260000; // ~190KB in base64
function isDataImage(s) {
    return typeof s === 'string' && s.length < MAX_IMG && /^data:image\/(png|jpeg|webp);base64,/.test(s);
}
export function sanitizeCard(c) {
    c = c && typeof c === 'object' ? c : {};
    const out = {
        title: cleanText(c.title, 24) || 'Viandante',
        type: cleanText(c.type, 40) || 'Creatura — Viandante della Laguna',
        flavor: cleanText(c.flavor, 140),
        texture: 'marmo', textureData: null,
        art: 'ritratto', artData: null,
        element: 'palude',
    };
    const preset = CARD_TEXTURES.find(t => t.id === c.texture);
    if (preset) { out.texture = preset.id; out.element = preset.element; }
    else if (c.texture === 'custom' && isDataImage(c.textureData)) {
        out.texture = 'custom'; out.textureData = c.textureData;
        out.element = ELEMENTS[c.element] ? c.element : 'fango';
    }
    if (CARD_ARTS.find(a => a.id === c.art)) out.art = c.art;
    else if (c.art === 'custom' && isDataImage(c.artData)) { out.art = 'custom'; out.artData = c.artData; }
    return out;
}
export function isCardImage(s) { return typeof s === 'string' && s.length < 400000 && /^data:image\/(jpeg|png|webp);base64,/.test(s); }

export function levelFromWins(w) { return Math.min(12, 1 + Math.floor(Math.sqrt((w || 0) * 1.5))); }

// Numeri ATK/DEF stampati sulla card (stile Yu-Gi-Oh)
export function cardPower(element, weaponSpec, level) {
    const el = ELEMENTS[element] || ELEMENTS.fango;
    const w = weaponStats(weaponSpec);
    const atk = Math.round((1200 * (1 + el.mods.atk) * w.dmg + level * 100) / 50) * 50;
    const def = Math.round((1000 * (1 + el.mods.def + el.mods.hp * 0.5) + level * 80) / 50) * 50;
    return { atk, def };
}

export function cleanText(s, max) {
    if (typeof s !== 'string') return '';
    return s.replace(/[<>\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
