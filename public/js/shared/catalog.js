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

// Statistiche finali di un'arma (null = pugni). plus = incantamento dell'Altare, inf = infusione.
export function weaponStats(spec) {
    const t = WEAPON_TYPES[spec?.type] || WEAPON_TYPES.pugni;
    const m = MATERIALS[spec?.material] || { dmg: 0, speed: 0 };
    const h = HANDLES[spec?.handle] || { dmg: 0, speed: 0 };
    const g = GEMS[spec?.gem] || GEMS.nessuna;
    const plus = plusOf(spec);
    return {
        dmg: +(t.dmg * (1 + m.dmg + h.dmg) * (1 + ENCHANT_STEP.weapon * plus)).toFixed(3),
        speed: +(t.speed * (1 + m.speed + h.speed)).toFixed(3),
        reach: t.reach,
        kb: t.kb,
        meter: (t.meter || 0) + (g.element ? 0.2 : 0),
        gem: g.element,
        plus, inf: ELEMENTS[spec?.inf] ? spec.inf : null,
    };
}
export const plusOf = (x) => Math.max(0, Math.min(10, (x?.plus | 0)));

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
    // Armadio della Stanza Bianca: il merch ufficiale di Sputnik Homies
    maglia_sh_bianca: { slot: 'torso', shop: 'armadio', shirt: 'tee',    name: 'Maglietta Sputnik Homies',        price: 35, color: '#ebe8e1', print: '#e3bd00', desc: 'Bianca come la stanza in cui è nata. Logo giallo davanti, scritta dietro.' },
    maglia_sh_nera:   { slot: 'torso', shop: 'armadio', shirt: 'tee',    name: 'Maglietta Sputnik Homies Nera',   price: 35, color: '#18161c', print: '#ffe100', desc: 'Il nero sfina. Il logo giallo si vede anche nella nebbia.' },
    maglia_sh_gialla: { slot: 'torso', shop: 'armadio', shirt: 'tee',    name: 'Maglietta Sputnik Homies Gialla', price: 45, color: '#f2c81e', print: '#1b1720', desc: 'Edizione al contrario: maglia gialla, logo nero.' },
    maglia_sh_grigia: { slot: 'torso', shop: 'armadio', shirt: 'tee',    name: 'Maglietta Sputnik Homies Grigia', price: 40, color: '#8f9198', print: '#ffe100', desc: 'Grigio melange, per le puntate del lunedì.' },
    felpa_sh:         { slot: 'torso', shop: 'armadio', shirt: 'hoodie', name: 'Felpa Sputnik Homies',            price: 90, color: '#1d1b22', print: '#ffe100', desc: 'Con cappuccio e tasca davanti, come quella che si vede in poltrona.' },
};

// --- RARITÀ E LIVELLO RICHIESTO ---
export const TIERS = {
    com: { name: 'Comune', lv: 1 },
    unc: { name: 'Non comune', lv: 4 },
    rar: { name: 'Raro', lv: 8 },
    epi: { name: 'Epico', lv: 14 },
    leg: { name: 'Leggendario', lv: 20 },
};
// Statistiche dei capi: atk/def/spd/sup sono frazioni (0.05 = +5%), hp punti vita, harmony punti di Dissonanza tolti.
// syn = seme in sintonia (rende una volta e mezza), rep = seme in ripulsa (rende la metà, aggiunge Dissonanza).
export const GEAR = {
    cappuccio:       { tier: 'com', sup: 0.05, syn: 'spettro' },
    benda:           { tier: 'com', atk: 0.02, syn: 'fango' },
    monocolo:        { tier: 'com', harmony: 3, syn: 'ghiaccio' },
    grembiule:       { tier: 'com', def: 0.02, syn: 'fuoco' },
    piuma:           { tier: 'unc', spd: 0.03, syn: 'tempesta', rep: 'pietra' },
    strega:          { tier: 'unc', sup: 0.08, syn: 'palude', rep: 'fuoco' },
    mantello_nero:   { tier: 'unc', spd: 0.03, syn: 'spettro' },
    mantello_rosso:  { tier: 'unc', atk: 0.03, syn: 'fuoco', rep: 'ghiaccio' },
    mantello_viola:  { tier: 'unc', sup: 0.06, syn: 'spettro', rep: 'palude' },
    tricorno:        { tier: 'rar', airAtk: 0.04, syn: 'fango', rep: 'ghiaccio' },
    tunica_mago:     { tier: 'rar', sup: 0.10, syn: 'tempesta', rep: 'pietra' },
    cotta:           { tier: 'rar', def: 0.07, weight: 5, syn: 'pietra', rep: 'tempesta' },
    corna:           { tier: 'rar', atk: 0.05, syn: 'fuoco', rep: 'ghiaccio' },
    elmo:            { tier: 'rar', def: 0.06, weight: 3, syn: 'pietra', rep: 'spettro' },
    peste:           { tier: 'epi', cleanse: true, syn: 'palude', rep: 'fuoco' },
    ossa:            { tier: 'epi', def: 0.06, leech: 0.15, syn: 'spettro', rep: 'palude' },
    mantello_regale: { tier: 'epi', def: 0.05, hp: 6, syn: 'pietra', rep: 'tempesta' },
    ali:             { tier: 'epi', glide: true, syn: 'tempesta', rep: 'pietra' },
    aureola:         { tier: 'leg', hp: 8, regen: 0.4, syn: 'tempesta', rep: 'fango' },
    corazza:         { tier: 'leg', def: 0.12, weight: 8, syn: 'pietra', rep: 'tempesta' },
    corona:          { tier: 'leg', sup: 0.12, atk: 0.04, syn: 'spettro', rep: 'palude' },
    maglia_sh_bianca: { tier: 'com', charisma: 0.05 },
    maglia_sh_nera:   { tier: 'com', charisma: 0.05 },
    maglia_sh_gialla: { tier: 'com', charisma: 0.05 },
    maglia_sh_grigia: { tier: 'com', charisma: 0.05 },
    felpa_sh:         { tier: 'unc', charisma: 0.05 },
};
// Tre pezzi (o due più l'arma giusta) dello stesso corredo danno un bonus in più
export const SETS = [
    { id: 'negromante', name: 'Corredo del Negromante', items: ['cappuccio', 'mantello_viola', 'ossa'], desc: 'Ogni colpo pesante a segno ti ridà 3 punti vita.' },
    { id: 'pirata', name: 'Corredo del Pirata', items: ['tricorno', 'benda'], weapon: ['falce', 'pugnale'], desc: 'Con una falce o un pugnale: +15% di danni in aria.' },
    { id: 'peste', name: 'Corredo della Peste', items: ['peste', 'strega', 'tunica_mago'], desc: 'Ogni round comincia con un quarto di barra SUPER.' },
    { id: 'regale', name: 'Corredo Regale', items: ['corona', 'mantello_regale', 'corazza'], desc: '+10% di danni e difesa, +10 punti vita, −10% di velocità.' },
];
export const itemTier = (id) => GEAR[id]?.tier || 'com';
export const itemLevel = (id) => TIERS[itemTier(id)].lv;
// Livello richiesto per i pezzi della Forgia
export const MATERIAL_LEVEL = { legno: 1, ferro: 1, osso: 3, ossidiana: 8, argento: 14, oro: 18 };
export const HANDLE_LEVEL = { legno: 1, cuoio: 1, osso: 3, seta: 6, oro: 12 };
export const GEM_LEVEL = 6;
export function weaponLevel(spec) {
    if (!spec) return 1;
    return Math.max(MATERIAL_LEVEL[spec.material] || 1, HANDLE_LEVEL[spec.handle] || 1, spec.gem && spec.gem !== 'nessuna' ? GEM_LEVEL : 1);
}
// Come si comporta un capo con un seme: 'syn' in sintonia, 'rep' in ripulsa, null neutro
export function gearAffinity(id, element) {
    const G = GEAR[id];
    if (!G) return null;
    return G.syn === element ? 'syn' : G.rep === element ? 'rep' : null;
}
const GEAR_STAT_TEXT = {
    atk: v => `+${pct(v)} di danni`, def: v => `+${pct(v)} di difesa`, spd: v => `+${pct(v)} di velocità`,
    sup: v => `SUPER +${pct(v)} più rapida`, hp: v => `+${fmtN(v)} punti vita`, regen: v => `rigenera ${fmtN(v)} PV al secondo`,
    leech: v => `ruba il ${pct(v)} dei danni inflitti`, airAtk: v => `+${pct(v)} di danni in aria`,
    harmony: v => `Dissonanza −${fmtN(v)}`, charisma: v => `Carisma: +${pct(v)} di monete dalle scommesse vinte`,
};
const pct = v => `${Math.round(v * 1000) / 10}%`.replace('.', ',');
const fmtN = v => `${Math.round(v * 10) / 10}`.replace('.', ',');
// Righe di testo con le statistiche di un capo (già moltiplicate per sintonia o ripulsa)
export function gearLines(id, element, plus = 0) {
    const G = GEAR[id];
    if (!G) return [];
    const aff = gearAffinity(id, element), k = aff === 'syn' ? 1.5 : aff === 'rep' ? 0.5 : 1;
    const out = [];
    for (const [s, f] of Object.entries(GEAR_STAT_TEXT)) if (G[s]) out.push(f(G[s] * k));
    if (plus > 0) out.push(`+${plus}% di difesa dall'incantamento`);
    if (G.weight) out.push(`peso ${G.weight}`);
    if (G.cleanse) out.push('immune a veleno e rallentamento');
    if (G.glide) out.push('planata: tieni premuto su mentre cadi');
    return out;
}

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

// Vecchio calcolo del livello (solo vittorie, massimo 12): serve per convertire i profili esistenti
export function levelFromWins(w) { return Math.min(12, 1 + Math.floor(Math.sqrt((w || 0) * 1.5))); }

// =====================================================================
//  PROGRESSIONE (Il Libro dei Sette Semi, fase 1)
// =====================================================================
export const MAX_LEVEL = 30;
// Esperienza per passare dal livello L al successivo: 50 × L^1,5 (arrotondata alle decine)
export const xpToNext = (L) => Math.round(50 * Math.pow(L, 1.5) / 10) * 10;
const XP_TOTAL = [0, 0];
for (let L = 2; L <= MAX_LEVEL; L++) XP_TOTAL[L] = XP_TOTAL[L - 1] + xpToNext(L - 1);
export const xpForLevel = (L) => XP_TOTAL[Math.max(1, Math.min(MAX_LEVEL, L | 0))];
export function levelFromXp(xp) {
    let L = 1;
    while (L < MAX_LEVEL && (xp || 0) >= XP_TOTAL[L + 1]) L++;
    return L;
}
export function levelProgress(xp) {
    const level = levelFromXp(xp);
    if (level >= MAX_LEVEL) return { level, into: 0, need: 0, pct: 1 };
    const into = (xp || 0) - XP_TOTAL[level], need = XP_TOTAL[level + 1] - XP_TOTAL[level];
    return { level, into, need, pct: into / need };
}
export function titleFor(L) {
    if (L >= 30) return "Leggenda dell'Isola";
    if (L >= 25) return 'Signore dei Semi';
    if (L >= 20) return 'Campione';
    if (L >= 15) return 'Cavaliere della Nebbia';
    if (L >= 10) return 'Cavaliere';
    if (L >= 5) return 'Scudiero';
    return 'Viandante';
}
// Da dove arriva l'esperienza
export const XP = {
    WIN: 120, WIN_PER_LEVEL: 10, WIN_LEVEL_MAX: 60, LOSS: 40, DRAW: 60,
    FIRST_WIN: 2,                 // la prima vittoria del giorno vale doppio
    REST_HOURS: 8, REST_MAX: 3,   // ogni 8 ore lontano dall'isola, un duello vale doppio (massimo 3)
    PRACTICE: { 1: 15, 2: 30, 3: 50 }, PRACTICE_LOSS: 5, PRACTICE_DAILY: 10,
    BET_WIN: 10, DAILY: 50,
};
export const RESPEC_COST = 200;
export const ALTAR = { x: 30, z: 56.5, r: 7 };   // l'altare della Cappella in Rovina

// --- I TRE RAMI DELLA MAESTRIA ---
export const TALENT_CAP = 15;
export const TALENT_IDS = ['forza', 'tempra', 'maestria'];
export const TALENTS = {
    forza: {
        name: 'Forza', icon: 'fist', per: '+1,5% di danni',
        traits: {
            5: { id: 'slancio', name: 'Slancio', desc: 'Dal terzo colpo leggero di una combo fai il 20% di danni in più.' },
            10: { id: 'spaccascudi', name: 'Spaccascudi', desc: 'Il colpo pesante sfonda la parata: la parata ferma solo metà del danno.' },
            15: { id: 'furia', name: 'Furia del Campione', desc: 'Sotto il 30% di vita fai il 15% di danni in più.' },
        },
    },
    tempra: {
        name: 'Tempra', icon: 'shield', per: '+1% di difesa e +2 punti vita',
        traits: {
            5: { id: 'pelledura', name: 'Pelle Dura', desc: 'Cadere dal palco costa il 20% di vita in meno.' },
            10: { id: 'radici', name: 'Radici', desc: 'Subisci il 25% di contraccolpo in meno.' },
            15: { id: 'ultimo', name: 'Ultimo Respiro', desc: 'Una volta per duello resti in piedi con 1 punto vita.' },
        },
    },
    maestria: {
        name: 'Maestria del Seme', icon: 'star', per: 'SUPER +3% più rapida, effetti del seme +5% più lunghi',
        traits: {
            5: { id: 'eco', name: 'Eco del Seme', desc: 'La passiva del tuo seme vale una volta e mezza.' },
            10: { id: 'risonanza', name: 'Risonanza', desc: 'Ogni round comincia con un quarto di barra SUPER.' },
            15: { id: 'puro', name: 'Seme Puro', desc: 'Niente più Dissonanza, e la tua SUPER si accende d\'oro.' },
        },
    },
};
export const talentPoints = (level) => Math.max(0, Math.min(MAX_LEVEL, level) - 1);
export function sanitizeTalents(t, level = MAX_LEVEL) {
    const o = { forza: 0, tempra: 0, maestria: 0 };
    let left = talentPoints(level);
    for (const k of TALENT_IDS) {
        const v = Math.max(0, Math.min(TALENT_CAP, Math.floor(+(t?.[k]) || 0), left));
        o[k] = v; left -= v;
    }
    return o;
}

// --- LA RUOTA DEI SEMI ---
// Ognuno batte il seme che lo segue. Gli opposti si disturbano (Dissonanza). Il Fango sta fuori dalla ruota.
export const RING = ['fuoco', 'ghiaccio', 'palude', 'pietra', 'tempesta', 'spettro'];
export const OPPOSITE = { fuoco: 'pietra', pietra: 'fuoco', ghiaccio: 'tempesta', tempesta: 'ghiaccio', palude: 'spettro', spettro: 'palude' };
export const WHEEL = {
    ADV_DMG: 1.15, ADV_METER: 1.2, DISADV_DMG: 0.9, SAME_METER: 1.1,
    DISS_HIT: 12, DISS_SUPER: 25,         // probabilità (%) che un colpo sfrigoli o che la SUPER si dissolva fra opposti
    REP_HIT: 5, REP_SUPER: 10,            // in più per ogni capo in ripulsa, in qualunque duello
    GEM_HARMONY: 4, MUD_TIME: 3,
};
// Rapporto fra chi attacca (a) e chi si difende (d): 'up' vantaggio, 'down' svantaggio, 'opp' opposti, 'same', 'n' neutro
export function seedRelation(a, d) {
    if (a === d) return 'same';
    const ia = RING.indexOf(a), id = RING.indexOf(d);
    if (ia < 0 || id < 0) return 'n';
    if ((ia + 1) % 6 === id) return 'up';
    if ((id + 1) % 6 === ia) return 'down';
    if (OPPOSITE[a] === d) return 'opp';
    return 'n';
}
export function matchup(a, d) {
    const rel = seedRelation(a, d);
    return { rel, dmg: rel === 'up' ? WHEEL.ADV_DMG : rel === 'down' ? WHEEL.DISADV_DMG : 1, meter: rel === 'up' ? WHEEL.ADV_METER : rel === 'same' ? WHEEL.SAME_METER : 1 };
}
// Probabilità (0..1) che un colpo sfrigoli e che la SUPER si dissolva, per chi ha queste statistiche contro quel seme
export function dissonance(st, foeElement) {
    if (st.immune) return { hit: 0, sp: 0 };
    const opp = OPPOSITE[st.element] === foeElement;
    const hit = (opp ? WHEEL.DISS_HIT : 0) + st.rep * WHEEL.REP_HIT - st.harmony;
    const sp = (opp ? WHEEL.DISS_SUPER : 0) + st.rep * WHEEL.REP_SUPER - st.harmony * 2;
    return { hit: Math.max(0, Math.min(40, hit)) / 100, sp: Math.max(0, Math.min(60, sp)) / 100 };
}

// --- STATISTICHE DI COMBATTIMENTO ---
// Seme, arma, talenti, vestiti e corredi. Le usano il motore dei duelli, il Libro della Maestria e la card.
export const STAT_CAP = 0.35;   // talenti + vestiti insieme non superano il +35% su danni e difesa
export function computeStats(setup = {}) {
    const el = ELEMENTS[setup.element] ? setup.element : 'fango';
    const E = ELEMENTS[el];
    const T = sanitizeTalents(setup.talents, setup.level || MAX_LEVEL);
    const tr = {
        slancio: T.forza >= 5, spaccascudi: T.forza >= 10, furia: T.forza >= 15,
        pelledura: T.tempra >= 5, radici: T.tempra >= 10, ultimo: T.tempra >= 15,
        eco: T.maestria >= 5, risonanza: T.maestria >= 10, puro: T.maestria >= 15,
    };
    const mods = { ...E.mods };
    if (tr.eco) for (const k of Object.keys(mods)) if (mods[k] > 0) mods[k] *= 1.5;
    const w = weaponStats(setup.weapon || null);
    const gemMatch = !!w.gem && w.gem === el;
    const gear = [...new Set((setup.gear || []).filter(id => GEAR[id]))];
    const g = { atk: 0, def: 0, spd: 0, sup: 0, hp: 0, regen: 0, leech: 0, airAtk: 0, harmony: 0, charisma: 0, weight: 0, rep: 0, cleanse: false, glide: false };
    for (const id of gear) {
        const G = GEAR[id], aff = gearAffinity(id, el), k = aff === 'syn' ? 1.5 : aff === 'rep' ? 0.5 : 1;
        if (aff === 'rep') g.rep++;
        for (const s of ['atk', 'def', 'spd', 'sup', 'hp', 'regen', 'leech', 'airAtk', 'harmony', 'charisma']) if (G[s]) g[s] += G[s] * k;
        g.weight += G.weight || 0;
        if (G.cleanse) g.cleanse = true;
        if (G.glide) g.glide = true;
    }
    const sets = SETS.filter(s => s.items.every(i => gear.includes(i)) && (!s.weapon || s.weapon.includes(setup.weapon?.type))).map(s => s.id);
    if (sets.includes('pirata')) g.airAtk += 0.15;
    if (sets.includes('regale')) { g.atk += 0.1; g.def += 0.1; g.hp += 10; g.spd -= 0.1; }
    // Altare: vestiti incantati, sigilli sulla carta, infusione dell'arma (l'opposto del tuo seme rende doppio ma porta Dissonanza)
    g.def += ENCHANT_STEP.gear * Math.max(0, Math.min(40, setup.gearPlus | 0));
    const seals = (setup.seals || []).filter(s => SEALS[s]);
    if (seals.includes('marea')) g.regen += 0.3;
    if (seals.includes('cerchio')) g.sup += 0.05;
    const inf = w.inf ? { el: w.inf, k: OPPOSITE[el] === w.inf ? 2 : 1 } : null;
    if (inf?.k === 2) g.rep++;
    // Forgia: rune nei castoni e Parole di Runa
    let kbBonus = 0;
    for (const r of (setup.weapon?.sockets || []).map(runeEl).filter(x => RUNE_BONUS[x])) {
        const B = RUNE_BONUS[r];
        for (const s of ['atk', 'def', 'hp', 'spd', 'sup', 'harmony']) if (B[s]) g[s] += B[s];
        if (B.kb) kbBonus += B.kb;
    }
    const word = runeWordOf(setup.weapon);
    if (word === 'vulcano') g.rep++;
    if (word === 'radici') g.regen += 0.15;
    const cap = (10 + T.tempra * 0.5) * (el === 'pietra' ? 1.5 : 1);
    const over = Math.max(0, g.weight - cap);
    const atkBonus = Math.min(STAT_CAP, T.forza * 0.015 + g.atk);
    const defBonus = Math.min(STAT_CAP, T.tempra * 0.01 + g.def);
    return {
        element: el, special: E.special.id, talents: T, traits: tr, sets, gear,
        atk: (1 + mods.atk) * w.dmg * (gemMatch ? 1.1 : 1) * (1 + atkBonus),
        def: Math.min(0.6, mods.def + defBonus),
        spd: Math.max(0.5, (1 + mods.spd + g.spd) * (1 - over * 0.02)),
        weight: Math.max(0.6, 1 + mods.weight),
        hpMax: Math.round(100 * (1 + mods.hp) + T.tempra * 2 + g.hp),
        regen: (el === 'palude' ? 0.8 * (tr.eco ? 1.5 : 1) : 0) + g.regen,
        meterGain: (1 + w.meter) * (1 + T.maestria * 0.03 + g.sup),
        effMul: 1 + T.maestria * 0.05,
        reach: w.reach, aspd: w.speed, kbm: w.kb * (1 + kbBonus),
        word, echo: word === 'mietitrice' ? 0.5 : 0, lava: word === 'vulcano', mudThrow: word === 'lancio' ? 0.12 : 0,
        kbRes: word === 'radici' ? 0.15 : 0, lightSlow: word === 'brina' ? 0.5 : 0, dashHit: word === 'tuono' ? 0.3 : 0,
        maxJumps: el === 'spettro' ? 3 : 2,
        dashMul: el === 'tempesta' ? (tr.eco ? 1.75 : 1.5) : 1,
        startMeter: tr.risonanza || sets.includes('peste') ? 25 : 0,
        leech: g.leech, airAtk: g.airAtk, cleanse: g.cleanse, glide: g.glide, charisma: g.charisma,
        heavyHeal: sets.includes('negromante') ? 3 : 0,
        rep: g.rep, harmony: g.harmony + (gemMatch ? WHEEL.GEM_HARMONY : 0), immune: el === 'fango' || tr.puro,
        load: g.weight, cap, over, atkBonus, defBonus, inf, seals, plus: w.plus,
    };
}

// Numeri ATK/DEF stampati sulla card (stile Yu-Gi-Oh), dalle statistiche vere
export function cardPower(element, weaponSpec, level, extra = {}) {
    const st = computeStats({ element, weapon: weaponSpec, level, talents: extra.talents, gear: extra.gear, gearPlus: extra.gearPlus, seals: extra.seals });
    const atk = Math.round((1000 * st.atk + level * 40) / 50) * 50;
    const def = Math.round((900 * (1 + st.def) * st.hpMax / 100 + level * 30) / 50) * 50;
    return { atk, def };
}

// =====================================================================
//  L'ALTARE E I LUOGHI DELL'ISOLA (Il Libro dei Sette Semi, fase 2)
// =====================================================================
// --- MATERIALI DELLA BISACCIA ---
export const RUNE_NAMES = { fuoco: 'Brace', ghiaccio: 'Brina', palude: 'Radice', pietra: 'Masso', tempesta: 'Tuono', spettro: 'Eco', fango: 'Melma' };
export const MATS = {
    frammento: { name: 'Frammento di Runa', icon: 'shard', color: '#b880ff', where: 'Cerchio di Pietre, e uno per ogni duello combattuto', desc: 'Una scheggia che canta piano. Serve per incantare e per risvegliare le carte.' },
    perla: { name: 'Perla della Laguna', icon: 'pearl', color: '#f2e6ff', where: 'Il Molo: la Pesca nella Nebbia', desc: 'Nasce nelle conchiglie sotto il molo. Serve per le carte e per gli incantamenti fino a +5.' },
    ecto: { name: 'Ectoplasma', icon: 'ecto', color: '#7affd8', where: 'Cimitero Sommerso: acchiappa i fuochi fatui dorati', desc: 'Quello che resta di un fuoco fatuo. Serve per la carta Aurora.' },
    pergamena: { name: 'Pergamena Benedetta', icon: 'scroll', color: '#ffe9a8', where: 'Il Molo: a volte nelle bottiglie', desc: 'Protegge un incantamento: se fallisce, il pezzo non scende di livello.' },
};
for (const el of Object.keys(ELEMENTS)) {
    MATS['ess_' + el] = { name: `Essenza di ${ELEMENTS[el].name}`, icon: 'vial', color: ELEMENTS[el].color, el, where: `Vinci un duello contro un seme di ${ELEMENTS[el].name}`, desc: `Infonde l'arma con il potere di ${ELEMENTS[el].name}. Serve anche per gli incantamenti da +6.` };
    MATS['runa_' + el] = { name: `Runa ${RUNE_NAMES[el]}`, icon: 'runestone', color: ELEMENTS[el].color, el, rune: true, where: "Altare: fondi 8 Frammenti con un'Essenza", desc: `La runa del seme di ${ELEMENTS[el].name}. Serve per i +9 e +10 e per la carta Incisa.` };
}
export const MAT_IDS = Object.keys(MATS);
export const ESS_DAILY = 3;           // Essenze di uno stesso seme al giorno dai duelli
export const PRACTICE_ESS_DAILY = 2;  // Essenze al giorno dall'allenamento col Fantasma

// --- I SIGILLI (piccoli poteri da incastonare sulla carta) ---
export const SEALS = {
    corvo: { name: 'Sigillo del Corvo', icon: 'raven', desc: '+5% di esperienza da ogni cosa.', where: 'Cimitero Sommerso: a volte un fuoco fatuo lo lascia cadere' },
    marea: { name: 'Sigillo della Marea', icon: 'wave', desc: 'In duello rigeneri 0,3 punti vita al secondo.', where: 'Il Molo: a volte sale con un pesce raro o una bottiglia' },
    cerchio: { name: 'Sigillo del Cerchio', icon: 'orb', desc: 'La SUPER si carica il 5% più in fretta.', where: 'Cerchio di Pietre: a volte nasce insieme a un frammento' },
    naufrago: { name: 'Sigillo del Naufrago', icon: 'bottle', desc: '+10% di monete dai duelli vinti.', where: 'Ritrova tutte le pagine del Diario del Naufrago' },
};
export const SEAL_CHANCE = 0.03;

// --- RISVEGLIO DELLA CARTA ---
// 'self' nei materiali = del seme della tua carta
export const CARD_GRADES = [
    { id: 'comune', name: 'Comune', lv: 1, seals: 0, color: '#d0d0d0' },
    { id: 'filigrana', name: 'Filigrana', lv: 5, seals: 1, color: '#7fe3c1', coins: 150, mats: { frammento: 3, perla: 1 },
        trial: { kind: 'wins', n: 5, text: '5 duelli vinti con questa carta' }, gives: 'Riflesso olografico e il primo sigillo' },
    { id: 'aurora', name: 'Aurora', lv: 12, seals: 1, color: '#b880ff', coins: 500, mats: { frammento: 8, ecto: 3, ess_self: 2 },
        trial: { kind: 'fish', fish: 'anguilla', text: "Pesca un'Anguilla di Nebbia al Molo (solo di notte)" }, gives: 'Bordo arcobaleno che si muove' },
    { id: 'incisa', name: 'Incisa', lv: 20, seals: 2, color: '#ffc93b', coins: 1500, mats: { runa_self: 1, ess_self: 5 },
        trial: { kind: 'wins', n: 25, text: '25 duelli vinti con questa carta' }, gives: "Cornice d'oro in rilievo, particelle del seme e il secondo sigillo" },
    { id: 'viva', name: 'Viva', lv: 28, seals: 3, color: '#ff6a9a', locked: 'Serve il Cuore del Re Annegato, che si conquista nella Veglia dei Morti. Il cimitero non è ancora pronto.',
        gives: 'Il ritratto si muove dentro la carta e il terzo sigillo' },
];
export const gradeOf = (g) => CARD_GRADES[Math.max(0, Math.min(CARD_GRADES.length - 1, g | 0))];
export const sealSlots = (g) => gradeOf(g).seals;
// Materiali con 'self' risolti per un seme
export function resolveMats(mats, element) {
    const o = {};
    for (const [k, n] of Object.entries(mats || {})) o[k.replace('_self', '_' + element)] = n;
    return o;
}

// --- INCANTAMENTO DA +1 A +10 ---
export const ENCHANT_STEP = { weapon: 0.03, gear: 0.01 };   // a ogni livello: +3% di danni all'arma, +1% di difesa per un vestito
// mats: 'ess' = un'Essenza qualsiasi, 'runa' = una Runa qualsiasi
export const ENCHANT = [null,
    { ok: 1, coins: 50, mats: { frammento: 1 } },
    { ok: 1, coins: 100, mats: { frammento: 1 } },
    { ok: 1, coins: 150, mats: { frammento: 1 } },
    { ok: 0.95, coins: 200, mats: { frammento: 2, perla: 1 } },
    { ok: 0.9, coins: 300, mats: { frammento: 2, perla: 1 } },
    { ok: 0.75, coins: 400, mats: { ess: 1 }, drop: true },
    { ok: 0.6, coins: 550, mats: { ess: 1 }, drop: true },
    { ok: 0.45, coins: 700, mats: { ess: 1 }, drop: true },
    { ok: 0.35, coins: 1000, mats: { runa: 1 }, drop: true },
    { ok: 0.25, coins: 1500, mats: { runa: 1 }, drop: true },
];
// Fin dove si può incantare al tuo livello
export const enchantCap = (L) => L >= 20 ? 10 : L >= 12 ? 8 : L >= 10 ? 5 : L >= 2 ? 3 : 0;
export const enchantCapNext = (L) => L < 2 ? [2, 3] : L < 10 ? [10, 5] : L < 12 ? [12, 8] : L < 20 ? [20, 10] : null;
export const ALTAR_LEVEL = 2;
// I materiali "qualsiasi" (ess, runa) diventano quelli di cui hai di più,
// lasciando per ultimi quelli del tuo seme, che servono per risvegliare la carta
export function enchantMats(step, mats = {}, own = null) {
    const out = {};
    for (const [k, n] of Object.entries(step.mats)) {
        if (k === 'ess' || k === 'runa') {
            const mine = (m) => m === k + '_' + own && (mats[m] || 0) > 0 ? 1 : 0;
            const pool = MAT_IDS.filter(m => m.startsWith(k + '_')).sort((a, b) => (Math.min(1, mats[b] || 0) - Math.min(1, mats[a] || 0)) || (mine(a) - mine(b)) || (mats[b] || 0) - (mats[a] || 0));
            out[pool[0]] = (out[pool[0]] || 0) + n;
        } else out[k] = (out[k] || 0) + n;
    }
    return out;
}

// --- INFUSIONI (l'arma prende un effetto del seme sul colpo pesante) ---
export const INFUSE_LEVEL = 6, INFUSE_COST = 200;
export const INFUSE = {
    fuoco: 'Il colpo pesante incendia per un attimo: 2 danni.',
    ghiaccio: 'Il colpo pesante rallenta per poco più di un secondo.',
    palude: 'Il colpo pesante avvelena per un attimo: 2 danni.',
    pietra: 'Il colpo pesante spinge il 20% più lontano.',
    tempesta: 'Il colpo pesante fa saltare una scintilla: 2 danni in più.',
    spettro: 'Il colpo pesante ti ridà il 20% del danno come vita.',
    fango: 'Il colpo pesante sporca: niente SUPER per poco più di un secondo.',
};

// --- FUSIONE DELLE RUNE E TRASMUTAZIONE ---
export const FUSE = { runa: { frammento: 8, ess: 1, coins: 100 }, trasmuta: { ess: 3, coins: 50 } };

// --- OFFERTA ALLA CUSTODE (una benedizione al giorno) ---
export const BLESSING = { coins: 100, ms: 3600 * 1000, xp: 0.25 };

// --- I LUOGHI DOVE SI RACCOGLIE ---
// Frammenti alla base delle pietre del Cerchio, fuochi fatui dorati fra le tombe
export const STONES = { x: -40, z: -6 };
export const GATHER = {
    nodes: [
        ...Array.from({ length: 9 }, (_, i) => { const a = (i + 0.5) / 9 * Math.PI * 2; return { id: 's' + i, kind: 'frammento', x: STONES.x + Math.cos(a) * 4.6, z: STONES.z + Math.sin(a) * 4.6 }; }),
        ...[[-38.5, 36.5], [-30, 35.8], [-26.5, 42], [-36.5, 43.5], [-33, 39.5], [-40, 40.5]].map(([x, z], i) => ({ id: 'w' + i, kind: 'ecto', x, z })),
    ],
    cooldown: { frammento: 25 * 60 * 1000, ecto: 15 * 60 * 1000 },
    daily: { frammento: 12, ecto: 8 },     // dopo, la raccolta dà qualcosa solo una volta su quattro
    seal: { frammento: 'cerchio', ecto: 'corvo' },
    xp: 3,
};

// --- LA PESCA NELLA NEBBIA ---
export const FISH_SPOT = { x: 0, z: 99.2, r: 3.5 };
export const FISH_DAILY = 8;    // pescate con premi pieni al giorno
export const FISH_RARITY = {
    junk: { name: 'Rottame', color: '#9a8f80', w: 6 },
    com: { name: 'Comune', color: '#d0d0d0', w: 60, xp: 6, coins: 3, perla: 0.3 },
    unc: { name: 'Non comune', color: '#5fd38a', w: 22, xp: 14, coins: 7, perla: 1 },
    rar: { name: 'Raro', color: '#4aa8ff', w: 7, xp: 28, coins: 14, perla: 2 },
    epi: { name: 'Epico', color: '#b37aff', w: 2, xp: 55, coins: 30, perla: 3 },
    special: { name: 'Messaggio', color: '#ffe9a8', w: 4 },
};
// when: 'day' dalle 6 alle 20 (ora italiana), 'night' dalle 20 alle 6, 'any' sempre
export const FISH = {
    alborella: { name: 'Alborella Grigia', rar: 'com', when: 'any', size: [8, 16], diff: 0.2, move: 'calm', desc: 'Piccola, argentata e convinta di essere uno squalo.' },
    carpa: { name: 'Carpa di Laguna', rar: 'com', when: 'any', size: [25, 62], diff: 0.32, move: 'sink', desc: 'Ha visto passare tre re e non si è mai scomposta.' },
    persico: { name: 'Persico Lilla', rar: 'com', when: 'day', size: [15, 34], diff: 0.36, move: 'calm', desc: 'Lilla come il cielo al tramonto. Abbocca solo di giorno, quando la luce filtra nella nebbia.' },
    luccio: { name: 'Luccio delle Canne', rar: 'unc', when: 'any', size: [40, 95], diff: 0.52, move: 'dart', desc: 'Si nasconde tra le canne e morde tutto quello che brilla, dita comprese.' },
    gatto: { name: 'Pesce Gatto Brontolone', rar: 'unc', when: 'night', size: [30, 80], diff: 0.5, move: 'sink', desc: 'Brontola quando lo tiri su e brontola quando lo ributti giù.' },
    lanterna: { name: 'Carpa Lanterna', rar: 'rar', when: 'night', size: [30, 55], diff: 0.66, move: 'float', desc: 'Una carpa che si porta la luce dentro. I pescatori la seguono per tornare a casa.' },
    anguilla: { name: 'Anguilla di Nebbia', rar: 'rar', when: 'night', size: [60, 140], diff: 0.78, move: 'dart', desc: 'Fatta di nebbia, sguscia via dalle mani. Chi la prende vede la propria carta accendersi di tutti i colori.' },
    storione: { name: 'Storione del Re', rar: 'epi', when: 'any', size: [120, 260], diff: 0.86, move: 'sink', desc: 'Il pesce preferito del Re Annegato. Ha ancora un anello infilato nella pinna.' },
    pspettro: { name: 'Pesce Spettro', rar: 'epi', when: 'night', size: [20, 70], diff: 0.92, move: 'dart', desc: 'Trasparente. Lo vedi solo quando l\'hai già perso.' },
    stivale: { name: 'Stivale del Traghettatore', rar: 'junk', when: 'any', size: [28, 30], diff: 0.08, move: 'calm', desc: 'Il Traghettatore giura di non averlo mai perso. Ne ha uno solo.' },
    bottiglia: { name: 'Bottiglia con un messaggio', rar: 'special', when: 'any', size: [22, 30], diff: 0.15, move: 'float', desc: 'Dentro c\'è un foglio arrotolato.' },
};
export const FISH_IDS = Object.keys(FISH);
// Le pagine del Diario del Naufrago, ritrovate nelle bottiglie
export const DIARY = [
    { t: 'Giorno uno', x: 'Mi sono svegliato sul molo con una carta in mano. Il Traghettatore dice che è la mia, che l\'ho sempre avuta. Non ricordo di averla mai vista. È fredda come la laguna.' },
    { t: 'Le stelle sbagliate', x: 'Qui in cielo mancano sette stelle, dice il vecchio della Forgia. Sono cadute tutte la stessa notte e si sono piantate nel fango. Lui le chiama semi. Io le chiamo storie da osteria, ma non riesco a smettere di guardare in alto.' },
    { t: 'La corona in Sartoria', x: 'Ho visto la Corona Spettrale in Sartoria. La Sarta giura che è solo una copia. Allora perché, quando l\'ho toccata, ho sentito l\'acqua salire fino alle ginocchia?' },
    { t: 'La notte del castello', x: 'Il re voleva tutti e sette i semi e li fece incastonare in una corona. Ma il Fuoco non sopporta la Pietra, e la Palude non sopporta lo Spettro. La notte in cui la corona fu completa il castello si spezzò a metà. Lo racconta il Becchino a chiunque gli offra da bere.' },
    { t: 'La Stanza Bianca', x: 'In cima al mastio c\'è una stanza tutta bianca. Due tizi parlano per ore seduti in poltrona e un ratto porta via i loro messaggi. Dicono di essere cronisti. Ho chiesto cosa raccontano. «Tutto», mi hanno risposto. Anche questo diario, immagino.' },
    { t: 'Il canto delle pietre', x: 'Al Cerchio di Pietre le rune cantano quando nessuno ascolta. Ne ho contate sette: Brace, Brina, Radice, Masso, Tuono, Eco e Melma. Mastro Brace dice che, messe in fila dentro un\'arma, formano una parola. Non mi ha voluto dire quale.' },
    { t: 'Ogni seme ha un padrone', x: 'Ho perso un duello contro un ragazzo di Ghiaccio: le mie fiamme gli scivolavano addosso. Poi una ragazza di Tempesta l\'ha steso in un minuto, e con me non ha avuto pietà. Ogni seme ha il suo padrone. Nessuno è il padrone di tutti.' },
    { t: 'Tre volte Melma', x: 'Una storia dei pescatori: tre volte Melma, dentro un pugnale, e l\'arma ricorda com\'era il gioco sull\'isola quando bastava una palla di fango per vincere. Ridono tutti quando la racconto. Io ci credo.' },
    { t: 'L\'anguilla', x: 'Di notte, sotto il molo, nuota un\'anguilla fatta di nebbia. Chi la prende, dicono, vede la propria carta accendersi di tutti i colori. La Custode dell\'altare non conferma e non smentisce. Non ha la faccia per farlo.' },
    { t: 'Ultima pagina', x: 'Il Traghettatore mi ha chiesto se voglio tornare indietro. Gli ho detto di no. Se qualcuno trova questa bottiglia: il re non è morto. Dorme sotto la laguna e aspetta che qualcuno rimetta insieme la corona. Non fatelo.' },
];
// Ora italiana: di notte abboccano pesci diversi
export function isNight(date = new Date()) {
    let h;
    try { h = +new Intl.DateTimeFormat('it-IT', { hour: 'numeric', hour12: false, timeZone: 'Europe/Rome' }).format(date); } catch { h = date.getHours(); }
    return h >= 20 || h < 6;
}
// Sceglie il pesce che abbocca (rnd = funzione 0..1)
export function rollFish(night, rnd = Math.random) {
    const pool = FISH_IDS.filter(id => FISH[id].when === 'any' || FISH[id].when === (night ? 'night' : 'day'));
    const w = id => FISH_RARITY[FISH[id].rar].w / pool.filter(x => FISH[x].rar === FISH[id].rar).length * (night && FISH[id].when === 'night' ? 1.6 : 1);
    let tot = pool.reduce((s, id) => s + w(id), 0), r = rnd() * tot;
    for (const id of pool) { r -= w(id); if (r <= 0) return id; }
    return pool[0];
}

// =====================================================================
//  I LUOGHI E LA CRONACA (Il Libro dei Sette Semi, fasi 3 e 4)
// =====================================================================
MATS.ossa = { name: 'Ossa Antiche', icon: 'skull', color: '#e9e2cf', where: 'Cimitero Sommerso: le tombe del Becchino e la Veglia dei Morti', desc: 'Mastro Brace le usa per aprire i castoni. Servono anche per le armi e le impugnature d\'osso.' };
MATS.cuore = { name: 'Cuore del Re Annegato', icon: 'heart', color: '#7fd8ff', where: 'La Veglia dei Morti: sconfiggi il Re Annegato', desc: 'Batte ancora, piano. Serve per la carta Viva.' };
MAT_IDS.push('ossa', 'cuore');
export const BONE_COST = { material: 2, handle: 1 };   // Ossa Antiche per le armi d'osso della Forgia
export const boneCost = (spec) => (spec?.material === 'osso' ? BONE_COST.material : 0) + (spec?.handle === 'osso' ? BONE_COST.handle : 0);

// La carta Viva: dalla Veglia dei Morti e dalla lega Spettro
Object.assign(CARD_GRADES[4], { coins: 3000, mats: { cuore: 1 }, trial: { kind: 'league', n: 3, text: 'Raggiungi la lega Spettro nell\'Arena classificata' }, locked: null });

// --- ORA ITALIANA: giorni, settimane e stagioni ---
export function romeTime(date = new Date()) {
    try {
        const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', weekday: 'short', hour: 'numeric', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map(x => [x.type, x.value]));
        return { wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), h: +p.hour % 24, day: `${p.year}-${p.month}-${p.day}` };
    } catch { return { wd: date.getDay(), h: date.getHours(), day: date.toISOString().slice(0, 10) }; }
}
const EPOCH = Date.UTC(2026, 9, 5);   // lunedì 5 ottobre 2026: comincia la prima stagione
export const weekOf = (date = new Date()) => Math.floor((Date.parse(romeTime(date).day) - EPOCH) / (7 * 864e5));
export const SEASON_WEEKS = 6;
export const seasonOf = (date = new Date()) => Math.floor(weekOf(date) / SEASON_WEEKS) + 1;
export function seasonEnds(date = new Date()) { return new Date(EPOCH + seasonOf(date) * SEASON_WEEKS * 7 * 864e5); }

// --- LEGHE DELL'ARENA CLASSIFICATA (dal livello 5) ---
export const RANKED_LEVEL = 5;
export const LEAGUES = [
    { id: 'bronzo', name: 'Bronzo', min: 0, color: '#c8844a' },
    { id: 'argento', name: 'Argento', min: 1100, color: '#cfd6de' },
    { id: 'oro', name: 'Oro', min: 1300, color: '#ffc93b' },
    { id: 'spettro', name: 'Spettro', min: 1500, color: '#b880ff' },
];
export const leagueOf = (rating) => { let i = 0; for (let k = 0; k < LEAGUES.length; k++) if ((rating || 0) >= LEAGUES[k].min) i = k; return i; };
export const isFriday = (date = new Date()) => romeTime(date).wd === 5;

// --- TITOLI (si mostrano sotto il nome al posto del titolo di livello) ---
export const TITLES = {
    lingua: { name: "Lingua d'Argento", how: 'Batti lo Spettro del Pedaggio a parole' },
    cronista: { name: 'Cronista', how: 'Leggi tutte e sette le Tavolette della Cronaca' },
    cantore: { name: 'Voce delle Pietre', how: 'Arriva a 15 note nel Canto delle Pietre' },
    becchino: { name: 'Amico del Becchino', how: 'Ripulisci il Prato dei Morti senza farti battere' },
    pescatore: { name: 'Pescatore di Nebbia', how: 'Pesca tutte le specie della laguna' },
    conduttore: { name: 'Voce di In Onda', how: 'Conduci cinque puntate di In Onda!' },
    spezzacorona: { name: 'Spezzacorona', how: 'Sconfiggi il Re Annegato nella Veglia dei Morti' },
    venerdi: { name: 'Campione del Venerdì', how: 'Vinci più duelli classificati di tutti in un venerdì' },
    campioni: { name: 'Campione dei Campioni', how: 'Vinci il Torneo dei Campioni del venerdì (dal livello 25)' },
    rinato: { name: 'Rinato', how: 'Compi la Rinascita al livello 30' },
    spettrale: { name: 'Spettro della Stagione', how: 'Chiudi una stagione in lega Spettro' },
};

// --- IL CANTO DELLE PIETRE (Simon con le sette rune) ---
export const CANTO = { level: 3, daily: 3, notes: [262, 294, 330, 392, 440, 523, 587], runeEvery: 10, titleAt: 15 };
export const CANTO_SEEDS = ['fuoco', 'ghiaccio', 'palude', 'pietra', 'tempesta', 'spettro', 'fango'];
// tempo minimo per cantare n note (sequenze lette e ripetute), in millisecondi
export const cantoMinMs = (n) => { let t = 0; for (let k = 1; k <= n; k++) t += k * 520; return t * 0.75; };
// la sequenza nasce dal seme del server: chi canta e chi controlla ottengono la stessa
export function cantoSeq(seed, n) { const r = srand(seed), out = []; for (let i = 0; i < n; i++) out.push(Math.floor(r() * 7)); return out; }
function srand(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// --- IL PRATO DEI MORTI (le tombe del cimitero diventano Prato fiorito) ---
export const GRAVES_LEVEL = 3, GRAVES_CURSED = 4;
// Le tombe esistono in una griglia 6×4: alcune mancano. Stessa disposizione per il mondo e per il server.
export const GRAVES = (() => {
    const r = srand(5), out = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
        if (r() < 0.15) continue;
        out.push({ k: out.length, i, j, x: -33 - 7.5 + i * 3 + (r() - 0.5) * 0.6, z: 40 - 4.5 + j * 3 + (r() - 0.5) * 0.6, cross: r() < 0.35 });
    }
    return out;
})();
export const graveNeighbors = (k) => { const g = GRAVES[k]; return GRAVES.filter(o => o !== g && Math.abs(o.i - g.i) <= 1 && Math.abs(o.j - g.j) <= 1).map(o => o.k); };

// --- LA BACHECA DELLE TAGLIE (tre al giorno e una alla settimana) ---
export const BOUNTY_BOARD = { x: 7.4, z: 16.2, ry: -1.86, r: 3 };
export const BOUNTIES = {
    winSeed: { lv: 1, n: 1, text: (b) => `Vinci un duello nell'Arena contro un seme di ${ELEMENTS[b.el]?.name}` },
    duel: { lv: 1, n: 2, text: (b) => `Combatti ${b.n} duelli nell'Arena` },
    practice: { lv: 1, n: 2, text: (b) => `Vinci ${b.n} allenamenti col Fantasma, Guerriero o Campione` },
    fish: { lv: 1, n: 3, text: (b) => `Pesca ${b.n} pesci al Molo` },
    fishRar: { lv: 1, n: 1, text: () => 'Pesca un pesce raro o epico' },
    frammento: { lv: 1, n: 4, text: (b) => `Raccogli ${b.n} Frammenti di Runa al Cerchio di Pietre` },
    ecto: { lv: 1, n: 3, text: (b) => `Acchiappa ${b.n} fuochi fatui dorati` },
    canto: { lv: 3, n: 6, max: true, text: (b) => `Arriva a ${b.n} note nel Canto delle Pietre` },
    toll: { lv: 4, n: 1, text: () => 'Batti lo Spettro del Pedaggio a parole' },
    dig: { lv: 3, n: 3, text: (b) => `Scava ${b.n} tombe nel Prato dei Morti` },
    bet: { lv: 1, n: 1, text: () => 'Vinci una scommessa su un duello' },
    enchant: { lv: 2, n: 1, text: () => "Incanta un pezzo all'Altare" },
    onda: { lv: 6, n: 1, text: () => 'Partecipa a una puntata di In Onda!, in poltrona o fra il pubblico' },
};
export const WEEKLY = {
    duelWin: { lv: 1, n: 8, text: (b) => `Vinci ${b.n} duelli nell'Arena` },
    fish: { lv: 1, n: 20, text: (b) => `Pesca ${b.n} pesci` },
    dig: { lv: 3, n: 12, text: (b) => `Scava ${b.n} tombe` },
    canto: { lv: 3, n: 10, max: true, text: (b) => `Arriva a ${b.n} note nel Canto delle Pietre` },
    veglia: { lv: 10, n: 4, text: (b) => `Vinci ${b.n} ondate nella Veglia dei Morti` },
    gather: { lv: 1, n: 25, text: (b) => `Raccogli ${b.n} frammenti o fuochi fatui` },
};
export const BOUNTY_REWARD = { daily: { xp: 80, coins: 30 }, weekly: { xp: 300, coins: 150, pergamena: 1 }, mission: { xp: 150, pergamena: 1 } };
export function rollBounties(seedStr, level, own) {
    let h = 0; for (const c of seedStr) h = (h * 31 + c.charCodeAt(0)) | 0;
    const r = srand(h);
    const pick = (pool, n) => { const ids = Object.keys(pool).filter(k => pool[k].lv <= level); const out = []; while (out.length < n && ids.length) out.push(ids.splice(Math.floor(r() * ids.length), 1)[0]); return out; };
    const make = (k, pool) => { const b = { k, n: pool[k].n, have: 0 }; if (k === 'winSeed') { const els = Object.keys(ELEMENTS).filter(e => e !== own); b.el = els[Math.floor(r() * els.length)]; } return b; };
    return { daily: pick(BOUNTIES, 3).map(k => make(k, BOUNTIES)), weekly: make(pick(WEEKLY, 1)[0], WEEKLY) };
}
export const bountyText = (b, weekly) => (weekly ? WEEKLY : BOUNTIES)[b.k]?.text(b) || b.text || '';

// --- LA FONTANA DEI DESIDERI (una moneta al giorno) ---
export const FOUNTAIN = { x: 12.4, z: -115.6, r: 3.2, coins: 10, ms: 3600 * 1000 };
export const WISHES = [
    { id: 'xp', w: 34, text: "L'acqua si accende: per un'ora l'esperienza raddoppia." },
    { id: 'perla', w: 28, text: 'Dal fondo risale una Perla della Laguna.' },
    { id: 'frammenti', w: 18, text: "Due Frammenti di Runa luccicano sotto il pelo dell'acqua." },
    { id: 'monete', w: 12, text: 'La fontana ti restituisce la moneta, con gli interessi: 30 Sputnik Coin.' },
    { id: 'pergamena', w: 8, text: 'Una Pergamena Benedetta galleggia fino al bordo.' },
];

// --- IL PEDAGGIO DELLO SPETTRO ---
export const TOLL = { level: 4, coins: 40, xp: 25, wins: 3, losses: 3, spot: { x: 2.7, z: -30.6, r: 4 } };

// --- IN ONDA! (Stanza Bianca) ---
export const WHITE_ROOM = { x: 0, z: -118.8, w: 10, d: 8, floor: 7.6 };
export const inWhiteRoom = (x, y, z) => Math.abs(x - WHITE_ROOM.x) < WHITE_ROOM.w / 2 + 0.3 && Math.abs(z - WHITE_ROOM.z) < WHITE_ROOM.d / 2 + 0.3 && y > WHITE_ROOM.floor - 1;
export const PHONE_SPOT = { x: 2.67, z: -117.65 };
// I quadri delle puntate nel cortile del castello: la prima volta che apri una puntata 10 monete,
// poi 1 o 2 ogni volta che la riapri (dopo almeno un minuto, fino a 20 monete al giorno)
export const QUADRI_COINS = { first: 10, cooldown: 60 * 1000, daily: 20, castle: { x: 0, z: -104, half: 21 } };
export const ONDA = { level: 6, questions: 3, voteMs: 14000, hostXp: 20, splitXp: 45, voterXp: 8, charisma: 0.005, charismaMax: 0.1 };

// --- CASTONI E PAROLE DI RUNA (Mastro Brace) ---
export const SOCKETS = [{ lv: 8, coins: 200, ossa: 2 }, { lv: 12, coins: 500, ossa: 4 }, { lv: 20, coins: 1200, ossa: 8 }];
export const SOCKET_CLEAR = 100;
// ogni runa incastonata dà un piccolo bonus del suo seme
export const RUNE_BONUS = {
    fuoco: { atk: 0.02, text: '+2% di danni' }, ghiaccio: { def: 0.02, text: '+2% di difesa' }, palude: { hp: 4, text: '+4 punti vita' },
    pietra: { kb: 0.04, text: '+4% di contraccolpo' }, tempesta: { spd: 0.03, text: '+3% di velocità' }, spettro: { sup: 0.04, text: 'SUPER +4% più rapida' },
    fango: { harmony: 2, text: 'Dissonanza −2' },
};
export const RUNEWORDS = {
    mietitrice: { name: 'Mietitrice di Nebbie', runes: ['spettro', 'tempesta', 'spettro'], weapons: ['falce'], desc: 'La tua SUPER colpisce una seconda volta, per metà danno.' },
    vulcano: { name: 'Cuore di Vulcano', runes: ['fuoco', 'pietra'], weapons: ['martello'], desc: 'Il colpo pesante lascia lava a terra per due secondi. Unisce due opposti: senza Seme Puro porta Dissonanza.' },
    lancio: { name: 'Il Primo Lancio', runes: ['fango', 'fango', 'fango'], weapons: ['pugnale'], desc: 'Ogni tanto un colpo leggero lancia anche una palla di fango, come ai tempi del gioco originale.' },
    radici: { name: 'Radici del Mondo', runes: ['palude', 'pietra', 'palude'], weapons: ['lancia', 'bastone'], desc: "Subisci il 15% di contraccolpo in meno e rigeneri un po' di vita in più." },
    brina: { name: 'Brina Eterna', runes: ['ghiaccio', 'ghiaccio'], weapons: ['spada'], desc: 'I colpi leggeri rallentano per mezzo secondo.' },
    tuono: { name: 'Tuono di Ritorno', runes: ['tempesta', 'fuoco', 'tempesta'], weapons: ['ascia'], desc: 'Dopo uno scatto, il colpo successivo fa il 30% di danni in più.' },
};
export const runeEl = (id) => (id || '').startsWith('runa_') ? id.slice(5) : null;
export function runeWordOf(spec) {
    const r = (spec?.sockets || []).map(runeEl);
    if (!r.length || r.some(x => !x)) return null;
    for (const [id, W] of Object.entries(RUNEWORDS)) if (W.weapons.includes(spec.type) && W.runes.length === r.length && W.runes.every((x, i) => x === r[i])) return id;
    return null;
}

// --- LA VEGLIA DEI MORTI (sabato sera, dal livello 10) ---
export const VEGLIA = { level: 10, wd: 6, from: 20, to: 24, goalBase: 4, goalPer: 5, goalMax: 60, waveMax: 10, minMs: 15000 };   // da soli bastano 9 ondate, in cinque circa 6 a testa
export const vegliaOpen = (date = new Date()) => { const t = romeTime(date); return t.wd === VEGLIA.wd && t.h >= VEGLIA.from && t.h < VEGLIA.to; };
export const KING = { name: 'Il Re Annegato', hp: 1.4, atk: 1, tries: 3 };

// --- RINASCITA (livello 30) ---
export const REBIRTH = { level: 30, max: 3, xp: 0.05 };

export function cleanText(s, max) {
    if (typeof s !== 'string') return '';
    return s.replace(/[<>\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
