// =====================================================================
//  L'OROLOGIO DELL'ISOLA (client + server)
//  Un giorno dell'isola dura 24 minuti reali: 13' di giorno, 2'30" di
//  tramonto, 6' di notte, 2'30" d'alba. Dipende solo dall'ora, quindi
//  tutti (anche il server) vedono la stessa ora sull'isola.
// =====================================================================
export const DAY_MS = 24 * 60 * 1000;
export const EPOCH = Date.UTC(2026, 9, 5, 6);
// minuti reali → ore dell'isola
const CLOCK = [[0, 7], [13, 18], [15.5, 21], [21.5, 29], [24, 31]];
export function islandHour(now = Date.now()) {
    const m = ((((now - EPOCH) % DAY_MS) + DAY_MS) % DAY_MS) / 60000;
    for (let i = 1; i < CLOCK.length; i++) {
        const [a, ha] = CLOCK[i - 1], [b, hb] = CLOCK[i];
        if (m <= b) return (ha + (hb - ha) * (m - a) / (b - a)) % 24;
    }
    return 7;
}
// sera e notte sull'isola: dalle 19:30 alle 6
// (un quarto d'ora di margine: il cielo del gioco si scurisce un filo prima, e chi è arrivato al buio non deve sentirsi dire «torna di notte»)
export const islandNight = (now = Date.now()) => { const h = islandHour(now); return h >= 19.25 || h < 6.25; };
// fra quanti minuti veri si fa notte sull'isola (0 = è già notte)
export function minutesToIslandNight(now = Date.now()) {
    if (islandNight(now)) return 0;
    for (let s = 15; s <= 25 * 60; s += 15) if (islandNight(now + s * 1000)) return Math.max(1, Math.round(s / 60));
    return 0;
}
