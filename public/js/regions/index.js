// =====================================================================
//  LE REGIONI DELLA MAPPA
//  Ogni regione è un modulo a parte: il browser lo scarica solo quando
//  il giocatore si avvicina (import dinamico) e lo libera quando si
//  allontana. Qui si aggiungono le zone nuove del Libro II.
// =====================================================================
import { WORLD } from '../world.js';

export function registerRegions(stream, app) {
    // Il Faro Spento: lo scoglio a nord-est, ci si arriva con la barca del Traghettatore
    const F = WORLD.FARO;
    stream.region('Faro Spento', { x: F.x, z: F.z }, F.r + 6, async () => {
        const { buildFaro } = await import('./faro.js');
        return buildFaro(app);
    });
}
