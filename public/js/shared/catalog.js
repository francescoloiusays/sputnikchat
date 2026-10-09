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
export function gearLines(id, element) {
    const G = GEAR[id];
    if (!G) return [];
    const aff = gearAffinity(id, element), k = aff === 'syn' ? 1.5 : aff === 'rep' ? 0.5 : 1;
    const out = [];
    for (const [s, f] of Object.entries(GEAR_STAT_TEXT)) if (G[s]) out.push(f(G[s] * k));
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
        reach: w.reach, aspd: w.speed, kbm: w.kb,
        maxJumps: el === 'spettro' ? 3 : 2,
        dashMul: el === 'tempesta' ? (tr.eco ? 1.75 : 1.5) : 1,
        startMeter: tr.risonanza || sets.includes('peste') ? 25 : 0,
        leech: g.leech, airAtk: g.airAtk, cleanse: g.cleanse, glide: g.glide, charisma: g.charisma,
        heavyHeal: sets.includes('negromante') ? 3 : 0,
        rep: g.rep, harmony: g.harmony + (gemMatch ? WHEEL.GEM_HARMONY : 0), immune: el === 'fango' || tr.puro,
        load: g.weight, cap, over, atkBonus, defBonus,
    };
}

// Numeri ATK/DEF stampati sulla card (stile Yu-Gi-Oh), dalle statistiche vere
export function cardPower(element, weaponSpec, level, extra = {}) {
    const st = computeStats({ element, weapon: weaponSpec, level, talents: extra.talents, gear: extra.gear });
    const atk = Math.round((1000 * st.atk + level * 40) / 50) * 50;
    const def = Math.round((900 * (1 + st.def) * st.hpMax / 100 + level * 30) / 50) * 50;
    return { atk, def };
}

export function cleanText(s, max) {
    if (typeof s !== 'string') return '';
    return s.replace(/[<>\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
