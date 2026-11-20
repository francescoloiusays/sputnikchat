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
    // raggio largo: il fascio del faro si vede da quasi tutta la laguna
    stream.region('Faro Spento', { x: F.x, z: F.z }, F.r + 80, async () => {
        const { buildFaro } = await import('./faro.js');
        return buildFaro(app);
    });
    // la Secca del Relitto: il banco di sabbia a sud-ovest, con la barca arenata del Traghettatore
    const R = WORLD.RELITTO;
    stream.region('Secca del Relitto', { x: R.x, z: R.z }, R.r + 60, async () => {
        const { buildRelitto } = await import('./relitto.js');
        return buildRelitto(app);
    });
}
