// =====================================================================
//  LA PALESTRA DI SANSONE (client + server)
//  Al secondo piano del mastio, sopra la Stanza Bianca: ci si sale con
//  la seconda rampa della scala di pietra. Sansone il Gigante allena
//  tutti: vivi, morti e mezzi.
//  - Tu: tre attrezzi (il sacco, i pesi, la corda), ognuno un piccolo
//    gioco di riflessi. Ogni allenamento dà esperienza e «forma»; la
//    forma fa salire il tuo livello di palestra (fino a 10), che in
//    duello vale un po' di vita e un po' di forza in più.
//  - Gli abitanti che fanno duelli (Tito, Marta, Lino) si allenano da
//    soli, ogni giorno, ognuno col suo ritmo. La loro forma è la stessa
//    per tutti i viandanti: più passa il tempo, più sono duri da battere
//    (e più rende batterli).
// =====================================================================
import { ERRANTI } from './erranti.js';

// il piano della palestra, nel mastio (WORLD.KEEP in world.js: x 0, z -118.8, 12 x 10; la Stanza Bianca ha il pavimento a 7.6 ed è alta 3.6)
// door: la porta sul lato ovest (z), che dà sul ballatoio in cima alla seconda rampa
export const PALESTRA = { x: 0, z: -118.8, y: 11.6, h: 3.4, w: 10, d: 8, door: -115.5, ry: 0 };
export const inPalestra = (x, y, z) => Math.abs(x - PALESTRA.x) < PALESTRA.w / 2 + 0.3 && Math.abs(z - PALESTRA.z) < PALESTRA.d / 2 + 0.3 && y > PALESTRA.y - 1 && y < PALESTRA.y + PALESTRA.h + 0.5;
export const GYM_DAILY = 6;            // allenamenti al giorno
export const GYM_MAX = 10;             // livello massimo di palestra
export const GYM_MIN_MS = 7000;        // un allenamento dura almeno sette secondi
export const gymToNext = (lv) => 40 + lv * 25;
// quanto vale in duello: +1,5% di vita e +1% di forza per livello
export const gymMods = (lv) => ({ hp: 0.015 * (lv || 0), atk: 0.01 * (lv || 0) });
// un allenamento: punteggio 0..1 → esperienza e forma
export const gymReward = (score) => { const s = Math.max(0, Math.min(1, +score || 0)); return { xp: Math.round(15 + 45 * s), pts: Math.round(4 + 16 * s) }; };

// gli attrezzi: posizione nella sala (in metri, rispetto al centro; -z = il muro nord) e il loro gioco
export const ATTREZZI = {
    sacco: { name: 'Il sacco', at: [-3.6, -1.2], desc: 'Colpisci quando la lancetta passa sul verde. Dieci pugni, sempre più veloci.', game: 'timing' },
    pesi: { name: 'I pesi', at: [0, -2.2], desc: 'Batti i tasti A e D, uno dopo l\'altro, più in fretta che puoi: il bilanciere sale.', game: 'mash' },
    corda: { name: 'La corda', at: [3.6, -1.2], desc: 'Salta quando il cerchio si stringe sull\'anello d\'oro. Dodici giri.', game: 'rhythm' },
};

// --- gli abitanti si allenano da soli: la loro forma cresce col tempo, uguale per tutti ---
export const GYM_NPC_MAX = 36;         // forma massima di un abitante (+12 livelli)
export const GYM_EPOCH = Date.UTC(2026, 10, 16);   // il giorno che Sansone ha aperto la palestra
// quanta forma prende ognuno in un giorno (Marta è una macchina, Lino si distrae)
export const NPC_RITMO = { tito: 1.0, marta: 1.4, lino: 0.75 };
// a che ora (dell'isola) ognuno va in palestra: [dalle, alle]
export const NPC_ORARIO = { tito: [7, 9.5], marta: [15, 18], lino: [10.5, 13] };
export const npcBoost = (forma) => Math.min(12, Math.floor((forma || 0) / 3));
export const npcFighters = () => Object.entries(ERRANTI).filter(([, E]) => E.fight).map(([id]) => id);
export function npcForma(now = Date.now()) {
    const days = Math.max(0, (now - GYM_EPOCH) / 864e5);
    return Object.fromEntries(npcFighters().map(id => [id, Math.min(GYM_NPC_MAX, Math.floor(days * (NPC_RITMO[id] ?? 1)))]));
}
// fra quanto (in ms) l'abitante prende il prossimo punto di forma
export function npcNextForma(id, now = Date.now()) {
    const r = NPC_RITMO[id] ?? 1, days = Math.max(0, (now - GYM_EPOCH) / 864e5), f = Math.floor(days * r);
    return f >= GYM_NPC_MAX ? null : ((f + 1) / r - days) * 864e5;
}
export const npcLevel = (id, forma = npcForma()) => (ERRANTI[id]?.fight?.level || 1) + npcBoost(forma?.[id]);
