// =====================================================================
//  LA PALESTRA DI SANSONE (client + server)
//  Un porticato di legno nelle Terre Nuove, sul sentiero della Tavola
//  Lunga. Sansone il Gigante allena tutti: vivi, morti e mezzi.
//  - Tu: tre attrezzi (il sacco, i pesi, la corda), ognuno un piccolo
//    gioco di riflessi. Ogni allenamento dà esperienza e «forma»; la
//    forma fa salire il tuo livello di palestra (fino a 10), che in
//    duello vale un po' di vita e un po' di forza in più.
//  - Gli abitanti: puoi pagare un allenamento a chi fa duelli (Tito,
//    Marta, Lino). La sua forma è la stessa per tutti i viandanti: più
//    si allena, più sale di livello, più è duro batterlo e più rende.
// =====================================================================
import { TP } from './terre.js';
import { ERRANTI } from './erranti.js';

export const PALESTRA = { x: TP.palestra[0], z: TP.palestra[1], ry: Math.atan2(114 - TP.palestra[0], 16 - TP.palestra[1]) };   // la facciata guarda il sentiero
export const GYM_DAILY = 6;            // allenamenti al giorno
export const GYM_MAX = 10;             // livello massimo di palestra
export const GYM_MIN_MS = 7000;        // un allenamento dura almeno sette secondi
export const gymToNext = (lv) => 40 + lv * 25;
// quanto vale in duello: +1,5% di vita e +1% di forza per livello
export const gymMods = (lv) => ({ hp: 0.015 * (lv || 0), atk: 0.01 * (lv || 0) });
// un allenamento: punteggio 0..1 → esperienza e forma
export const gymReward = (score) => { const s = Math.max(0, Math.min(1, +score || 0)); return { xp: Math.round(15 + 45 * s), pts: Math.round(4 + 16 * s) }; };

// gli attrezzi: posizione nel porticato (in metri, rispetto al centro; +z = verso il sentiero) e il loro gioco
export const ATTREZZI = {
    sacco: { name: 'Il sacco', at: [-3.6, -1.2], desc: 'Colpisci quando la lancetta passa sul verde. Dieci pugni, sempre più veloci.', game: 'timing' },
    pesi: { name: 'I pesi', at: [0, -2.2], desc: 'Batti i tasti A e D, uno dopo l\'altro, più in fretta che puoi: il bilanciere sale.', game: 'mash' },
    corda: { name: 'La corda', at: [3.6, -1.2], desc: 'Salta quando il cerchio si stringe sull\'anello d\'oro. Dodici giri.', game: 'rhythm' },
};

// --- gli abitanti che si allenano: la loro forma è di tutti ---
export const GYM_NPC_DAILY = 3;        // quanti allenamenti puoi pagare agli abitanti, al giorno
export const GYM_NPC_MAX = 36;         // forma massima di un abitante (+12 livelli)
export const npcGymCost = (lv) => 40 + lv * 6;
export const npcBoost = (forma) => Math.min(12, Math.floor((forma || 0) / 3));
export const npcFighters = () => Object.entries(ERRANTI).filter(([, E]) => E.fight).map(([id]) => id);
export const npcLevel = (id, forma) => (ERRANTI[id]?.fight?.level || 1) + npcBoost(forma?.[id]);
