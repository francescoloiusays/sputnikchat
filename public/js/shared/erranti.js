// =====================================================================
//  GLI ERRANTI (client + server)
//  Abitanti che vivono nel borgo delle Terre Nuove e ogni giorno vanno
//  e vengono dall'isola: al Molo, alla Forgia, al Cimitero, al pontile.
//  Dove sono dipende solo dall'ora, così tutti li vedono nello stesso
//  posto (e il server sa se ci sei davvero vicino).
//  Con loro si parla, si baratta (una volta al giorno) e, con chi ci sta,
//  si fa un duello amichevole.
// =====================================================================
import { TP } from './terre.js';

const B = TP.borgo;
// la soglia di casa: davanti alla porta, verso il pozzo
const home = (i) => { const a = i / 4 * Math.PI * 2 + 0.4; return [B[0] + Math.cos(a) * 4.2, B[1] + Math.sin(a) * 4.2]; };
// la strada che dal borgo porta alla piazza
const TO_PLAZA = [[132, 36], [118, 33], [110, 31], [96, 25], [70, 21], [44, 15], [17, 10], [2, 14]];
const SPEED = 1.5;   // metri al secondo: passo tranquillo

// rotte: [x, z, sosta in secondi]; si va fino in fondo e si torna indietro per la stessa strada
export const ERRANTI = {
    tito: {
        name: 'Tito il Pescivendolo', where: 'Va e viene dal Molo', home: 0,
        route: [[...home(0), 40], ...TO_PLAZA.map(p => [...p, 0]), [0, 32, 0], [0, 60, 0], [1.2, 86, 70]],
        app: { species: 'umano', build: 'robusto', height: 1.0, skin: '#d8a888', eyes: 'tondi', eyeColor: '#4a6a8a', mouth: 'sorriso', hair: 'corti', hairColor: '#2a2018', beard: 'baffi', topStyle: 'tunica', top: '#3a5a7a', bottom: '#4a4038', shoes: '#2a2018' },
        look: { torso: 'grembiule' },
        lines: ['Pesce fresco! Be\', fresco... della nebbia di stamattina.', 'Abito nel borgo delle Terre Nuove. La casa me l\'ha misurata Rob, giusta giusta: non entra una spina.', 'Al Molo c\'è chi pesca per passione e chi per mangiare. Io per tutti e due.'],
        trade: { give: { frammento: 2 }, get: { perla: 2 }, say: 'Due schegge di runa per due perle. Me le danno i pesci, a me: non so che farmene.' },
        fight: { element: 'palude', level: 8, name: 'Tito il Pescivendolo' },
    },
    marta: {
        name: 'Marta la Muratrice', where: 'Va e viene dal cantiere e dalla Forgia', home: 1,
        route: [[...home(1), 30], [132, 36, 0], [131, 46, 90], [132, 36, 0], [118, 33, 0], [110, 31, 0], [96, 25, 0], [70, 21, 0], [44, 15, 0], [17, 10, 0], [-14, 10, 50]],
        app: { sex: 'f', species: 'umano', build: 'robusto', height: 1.0, skin: '#c89878', eyes: 'fieri', eyeColor: '#6a4a2a', mouth: 'neutro', hair: 'codino', hairColor: '#5a3a20', beard: 'nessuna', topStyle: 'giacca', top: '#a05a3a', bottom: '#4a4a4a', shoes: '#2a2018' },
        look: { head: 'elmo' },
        lines: ['Le case a metà del cantiere le tiro su io. Senza fretta: un muro storto resta storto per cent\'anni.', 'Vado da Mastro Brace per i chiodi. Lui dice che li consumo. Io dico che lui li fa corti.', 'Rob passava a misurare quello che avevo fatto. Diceva sempre: «Brava. Un centimetro più in là.»'],
        trade: { give: { coins: 60 }, get: { frammento: 2 }, say: 'Sessanta monete e ti do due schegge del Cerchio. Le uso per segnare i fili a piombo: cantano quando il muro è dritto.' },
        fight: { element: 'pietra', level: 10, name: 'Marta la Muratrice' },
    },
    gilda: {
        name: 'Zia Gilda', where: 'Va e viene dal Cimitero Sommerso', home: 2,
        route: [[...home(2), 60], ...TO_PLAZA.map(p => [...p, 0]), [0, 32, 0], [-14, 36, 0], [-27, 40, 120]],
        app: { sex: 'f', species: 'umano', build: 'snello', height: 0.92, skin: '#e0c0a8', eyes: 'assonnati', eyeColor: '#7a8a9a', mouth: 'sorriso', hair: 'codino', hairColor: '#dcdce6', beard: 'nessuna', topStyle: 'veste', top: '#4a3a5a', bottom: '#2a2030', shoes: '#1a1418' },
        look: { cape: 'mantello_viola' },
        lines: ['Porto i fiori al Cimitero. A chi? A tutti. Nessuno dovrebbe restare senza fiori.', 'Alla mia età si cammina piano. Ma si arriva, eh. Si arriva sempre.', 'Hai mangiato? Sei magr{o}. Te lo dico io che ho cresciuto mezzo borgo.'],
        trade: { give: { perla: 2 }, get: { ecto: 2 }, say: 'Due perle per due ectoplasmi. I fuochi fatui mi vengono dietro come gattini: non so mai cosa farne.' },
        fight: null,
    },
    lino: {
        name: 'Lino il Garzone', where: 'Corre per le Terre Nuove', home: 3,
        route: [[...home(3), 20], [132, 36, 0], [118, 33, 0], [112, 31, 25], [96, 25, 0], [114, 16, 0], [121, 13, 30], [140, 8, 0], [152, 18, 0], [163, 22, 45]],
        app: { species: 'umano', build: 'snello', height: 0.82, skin: '#e8c0a0', eyes: 'tondi', eyeColor: '#5a8a4a', mouth: 'sorriso', hair: 'ciuffo', hairColor: '#c87a3a', beard: 'nessuna', topStyle: 'tunica', top: '#e8c23a', bottom: '#3a4a6a', shoes: '#4a2a1a' },
        look: {},
        lines: ['Porto i rotoli dallo studio al cantiere e dal cantiere al pontile. Di corsa! Così arrivano più dritti.', 'Da grande faccio il geometra. Ho già il metro: me l\'ha regalato Rob. È un po\' rotto, ma misura lo stesso.', 'Lo sai che dal pontile, con la luce giusta, si vede la Riva di Là? Io la vedo sempre. Forse me la invento.'],
        trade: { give: { ecto: 2 }, get: { pergamena: 1 }, say: 'Due ectoplasmi e ti do una pergamena di quelle buone. Le avanzo dallo studio: tanto io disegno sui muri.' },
        fight: { element: 'tempesta', level: 6, name: 'Lino il Garzone' },
    },
};
export const ERRANTE_IDS = Object.keys(ERRANTI);

// la rotta completa (andata, sosta in fondo, ritorno, sosta a casa) con i tempi
const PLANS = {};
function plan(id) {
    if (PLANS[id]) return PLANS[id];
    const R = ERRANTI[id].route, there = R.map(([x, z, w]) => ({ x, z, w })), back = [...there].reverse().map((p, i) => ({ ...p, w: i === 0 ? 0 : p.w }));
    const pts = [...there, ...back.slice(1)];
    const legs = [];
    let t = 0;
    for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (p.w) { legs.push({ t0: t, t1: t + p.w, a: p, b: p, wait: true }); t += p.w; }
        const q = pts[i + 1];
        if (!q) break;
        const d = Math.hypot(q.x - p.x, q.z - p.z) / SPEED;
        legs.push({ t0: t, t1: t + d, a: p, b: q }); t += d;
    }
    return (PLANS[id] = { legs, total: t });
}
// dove sta adesso (now in ms), dove guarda, se cammina
export function erranteAt(id, now = Date.now()) {
    const P = plan(id), off = (id.charCodeAt(0) * 97 + id.length * 31) % P.total;
    const t = ((now / 1000 + off) % P.total + P.total) % P.total;
    const L = P.legs.find(l => t >= l.t0 && t < l.t1) || P.legs[0];
    const k = L.t1 > L.t0 ? (t - L.t0) / (L.t1 - L.t0) : 0;
    const x = L.a.x + (L.b.x - L.a.x) * k, z = L.a.z + (L.b.z - L.a.z) * k;
    return { x, z, yaw: L.wait ? null : Math.atan2(L.b.x - L.a.x, L.b.z - L.a.z), walking: !L.wait };
}
