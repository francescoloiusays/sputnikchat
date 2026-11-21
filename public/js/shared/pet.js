// =====================================================================
//  GLI SPUTNIKPET (client + server)
//  Dal livello 10 ogni viandante può prendere con sé un animaletto
//  dell'isola (uno solo). Lo cura Sàlvia, il Medico delle Bestie, alla
//  Stalla delle Nebbie: lì si adotta, si addestra, si incanta e si cura.
//  Un pet aiuta nei duelli (ogni tanto attacca da solo) o nella pesca,
//  secondo la specie. Sale di livello giocando e con l'addestramento.
//  Si stanca giocando: più è alto di livello e incantato, più dura;
//  a zero di forze non aiuta più finché Sàlvia non lo rimette in piedi.
// =====================================================================
import { ELEMENTS } from './catalog.js';

export const PET_LEVEL = 10;          // dal livello 10 del viandante
export const PET_MAX_LV = 20;
export const PET_ADOPT = 300;         // monete per adottarne uno
export const PET_MAX_ENCH = 5;

// la Stalla delle Nebbie: dove sta Sàlvia (a est della piazza, verso la Cappella)
export const STALLA = { x: 31, z: 28, ry: -2.0 };   // la porta guarda la piazza

// duel: bonus in duello (atk/def/hp/meter/spd in proporzione, al livello massimo) e l'aiuto ogni tanto (assist)
// fish: bonus alla pesca (zone/fill/luck/window/coins, al livello massimo)
export const PETS = {
    corvo: { name: 'Corvo del Cimitero', icon: 'raven', color: '#3a3044', role: 'duello',
        desc: 'Ruba le cose che luccicano e becca gli occhi a chi ti attacca. Viene dal Cimitero Sommerso, e non te lo perdona.',
        duel: { atk: 0.08 }, assist: { kind: 'becco', name: 'Beccata', dmg: 6, every: 7 }, fish: {} },
    cane: { name: 'Cane Alato', icon: 'wind', color: '#c8a070', role: 'duello',
        desc: 'Un cagnone con due ali da pipistrello troppo piccole. Vola male, ma morde benissimo, e ti fa da scudo.',
        duel: { def: 0.08, hp: 0.08 }, assist: { kind: 'morso', name: 'Morso in Volo', dmg: 8, every: 9, kb: 4 }, fish: {} },
    fatuo: { name: 'Fuoco Fatuo', icon: 'ecto', color: '#7affd8', role: 'duello',
        desc: 'Un fuoco fatuo che ha deciso di seguirti. Ti ronza intorno e ti ricarica la SUPER.',
        duel: { meter: 0.15 }, assist: { kind: 'fiammella', name: 'Fiammella', dmg: 4, every: 6, burn: 1.2 }, fish: {} },
    fantasmino: { name: 'Fantasmino', icon: 'skull', color: '#dfe6ff', role: 'duello e pesca',
        desc: 'Piccolo, trasparente e curioso. In duello fa sparire i colpi che stai per prendere; al molo spaventa i pesci verso il tuo amo.',
        duel: { def: 0.05 }, assist: { kind: 'bu', name: 'Bu!', dmg: 3, every: 8, stun: 0.5 }, fish: { window: 0.4, luck: 0.15 } },
    gatto: { name: 'Gatto con gli Stivali', icon: 'person', color: '#e8902a', role: 'duello e pesca',
        desc: 'Un gatto rosso con due stivali rubati al Traghettatore. Agile in duello, furbo al molo: sa sempre dove abboccano.',
        duel: { spd: 0.06, atk: 0.04 }, assist: { kind: 'graffio', name: 'Graffio', dmg: 5, every: 8 }, fish: { coins: 0.3, fill: 0.1 } },
    granchio: { name: 'Granchio del Molo', icon: 'fishbone', color: '#c83a2a', role: 'pesca',
        desc: 'Vive fra i pali del molo da prima che ci fosse il molo. Tiene ferma la lenza con le chele.',
        duel: { def: 0.04 }, assist: null, fish: { zone: 0.25, fill: 0.1 } },
    anguilla: { name: 'Anguilla di Nebbia', icon: 'eel', color: '#9ab8ff', role: 'pesca',
        desc: 'Una piccola anguilla di nebbia che nuota nell\'aria. I pesci rari la seguono come una lanterna.',
        duel: { meter: 0.05 }, assist: null, fish: { luck: 0.5, window: 0.2 } },
};
export const PET_IDS = Object.keys(PETS);

// --- crescita: esperienza per livello, forze, quanto pesa ogni livello e incantamento ---
export const petXpToNext = (lv) => Math.round(60 + lv * lv * 12);
export const petMaxHealth = (pet) => Math.round(60 + (pet.lv || 1) * 6 + (pet.ench || 0) * 15);
// quanto conta il pet adesso: da metà potenza al livello 1 a piena al 20, e ogni incanto +10%
export const petPower = (pet) => (0.5 + 0.5 * ((pet.lv || 1) - 1) / (PET_MAX_LV - 1)) * (1 + 0.1 * (pet.ench || 0));
export const petTired = (pet) => !pet || (pet.health ?? 1) <= 0;
// quante forze consuma: un duello 6, una pescata 1 (meno, se è di livello alto o incantato)
export const petWear = (pet, what) => Math.max(1, Math.round((what === 'duel' ? 6 : 1) * (1 - Math.min(0.5, ((pet.lv || 1) - 1) * 0.02 + (pet.ench || 0) * 0.04))));

// i bonus veri, già pesati sul livello (nulla se è stanco)
export function petDuel(pet) {
    if (!pet || petTired(pet) || !PETS[pet.sp]) return null;
    const P = PETS[pet.sp], k = petPower(pet), mods = {};
    for (const [s, v] of Object.entries(P.duel)) mods[s] = v * k;
    const A = P.assist && { ...P.assist, dmg: Math.round(P.assist.dmg * (0.8 + 0.6 * k)), every: Math.max(4, P.assist.every - (pet.lv || 1) * 0.1) };
    return { sp: pet.sp, name: pet.name || P.name, mods, assist: A };
}
export function petFish(pet) {
    if (!pet || petTired(pet) || !PETS[pet.sp]) return {};
    const k = petPower(pet), out = {};
    for (const [s, v] of Object.entries(PETS[pet.sp].fish)) out[s] = v * k;
    return out;
}

// --- da Sàlvia: addestrare, incantare, curare ---
export const TRAIN = { coins: (lv) => 40 + lv * 15, xp: (lv) => Math.round(petXpToNext(lv) * 0.35), daily: 3 };
export const PET_ENCH = [
    { perla: 3, coins: 150 },
    { perla: 5, frammento: 3, coins: 300 },
    { perla: 8, corallo: 2, coins: 500 },
    { perla: 12, corallo: 4, ecto: 3, coins: 800 },
    { perla: 16, corallo: 6, ecto: 5, pergamena: 1, coins: 1200 },
];
export const PET_ENCH_LV = [3, 6, 10, 14, 18];   // livello del pet per ogni incanto
// la cura costa poco quando è solo stanco, di più quando è sfinito
export const healCost = (pet) => {
    const max = petMaxHealth(pet), miss = Math.max(0, max - (pet.health ?? max));
    if (!miss) return null;
    return { coins: Math.max(5, Math.ceil(miss * (pet.health <= 0 ? 1.6 : 0.8))) };
};
export const newPet = (sp, name) => ({ sp, name: String(name || PETS[sp].name).slice(0, 24), lv: 1, xp: 0, ench: 0, health: 60 + 6, born: Date.now() });
// l'elemento non c'entra con i pet, ma il colore del seme sì: il fuoco fatuo prende il colore della carta
export const petTint = (pet, element) => (pet?.sp === 'fatuo' && ELEMENTS[element] ? ELEMENTS[element].glow : PETS[pet?.sp]?.color);
