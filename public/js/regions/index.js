// =====================================================================
//  LE REGIONI DELLA MAPPA
//  Ogni regione è un modulo a parte: il browser lo scarica solo quando
//  il giocatore si avvicina (import dinamico) e lo libera quando si
//  allontana. Qui si aggiungono le zone nuove del Capitolo II.
// =====================================================================

export function registerRegions(stream, app) {
    // Il Faro Spento: uno scoglio all'orizzonte, a nord-est della laguna.
    // Per ora si vede soltanto da lontano: è il primo indizio del Capitolo II.
    stream.region('Faro Spento', { x: 138, z: -150 }, 14, async () => {
        const { buildFaro } = await import('./faro.js');
        return buildFaro(app);
    });
}
