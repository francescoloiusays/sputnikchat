// =====================================================================
//  LA RIVA VIVA (client + server)
//  Da quando il faro si è riacceso d'oro, alla Riva di Là è tornata
//  gente: chi era partito trecento anni fa e si era perso nel mare
//  della nebbia, e adesso la luce gli ha mostrato la strada.
//  Sei abitanti che vanno e vengono per il villaggio, e tre giochi:
//   - il forno di Tobia (lo tiene acceso Pina): sforna il pane quando è dorato
//   - i sassi sull'acqua, con i gemelli: quanti rimbalzi?
//   - la mappa a memoria, con la Cartografa: ripeti i segni
//  Qui le persone, le loro strade (in coordinate di riva u, v) e i premi.
// =====================================================================
import { RP, rivaPt } from './riva.js';

const [VU, VV] = RP.village;
const ring = (r, n, a0 = 0) => Array.from({ length: n }, (_, i) => { const a = a0 + i / n * Math.PI * 2; return [VU + Math.cos(a) * r, VV + Math.sin(a) * r]; });

// le strade: [u, v, sosta in secondi]; si gira in tondo (l'ultimo punto torna al primo)
export const RIVANI = {
    pina: {
        name: 'Pina, la nipote di Tobia', where: 'Al forno del villaggio', game: 'forno', sex: 'f',
        app: { species: 'umano', build: 'medio', height: 0.95, skin: '#e8b890', eyes: 'tondi', eyeColor: '#5a3a2a', mouth: 'sorriso', hair: 'codino', hairColor: '#6a3a1a', beard: 'nessuna', topStyle: 'veste', top: '#f0e8d8', bottom: '#8a5a3a', shoes: '#3a2a1e' },
        look: { torso: 'grembiule' },
        route: [[VU + 3, VV + 4.8, 40], [VU + 1.5, VV + 3, 6], [VU - 2, VV + 4.5, 12], [VU + 1, VV + 6.2, 4]],
        lines: ["Lo zio Tobia ha impastato trecento anni senza farina. Adesso la farina c'è, e il forno lo tengo acceso io.", 'Il pane va tolto quando canta. Non prima, non dopo: quando canta.', "Se ti avanza un po' di tempo, dammi una mano col forno. Ti pago in monete e in briciole."],
    },
    gemelli: {
        name: 'Gemma e Lapo', where: 'I gemelli della spiaggia', game: 'sassi', sex: 'f', kid: true,
        app: { species: 'umano', build: 'snello', height: 0.72, skin: '#f0c8a0', eyes: 'luminosi', eyeColor: '#3a6a8a', mouth: 'sorriso', hair: 'codino', hairColor: '#c86a2a', beard: 'nessuna', topStyle: 'tunica', top: '#e8b84a', bottom: '#4a6a8a', shoes: '#5a3a24' },
        route: [[RP.spiaggia[0] - 3, RP.spiaggia[1] + 4, 25], [RP.spiaggia[0] + 4, RP.spiaggia[1] + 2, 20], [VU + 14.4, VV - 4.1, 0], [VU + 4.8, VV - 1.4, 15], [VU + 14.4, VV - 4.1, 0]],
        lines: ['Io ne ho fatti nove! Lapo dice sette, ma Lapo non sa contare.', 'Sai fare rimbalzare i sassi? Il segreto è il polso. E il sasso piatto. E la fortuna.', 'Siamo nati qui, dopo che il faro si è acceso. Mamma dice che siamo i primi in trecento anni.'],
    },
    ottavia: {
        name: 'Ottavia la Pescatrice', where: 'Il banco del pesce, sul sentiero', sex: 'f',
        app: { species: 'umano', build: 'medio', height: 1.02, skin: '#c89070', eyes: 'fieri', eyeColor: '#2a4a3a', mouth: 'neutro', hair: 'lunghi', hairColor: '#1a1a20', beard: 'nessuna', topStyle: 'giacca', top: '#2e4a5a', bottom: '#3a3a40', shoes: '#2a1a10' },
        route: [[44, -9, 60], [41, -13, 8], [47, -16, 10]],
        lines: ['Il mare di nebbia è generoso con chi non ha fretta. Io non ho fretta da trecento anni.', 'I pesci di qui hanno gli occhi d\'argento: guardano il faro anche da sott\'acqua.', 'Se vedi due bambini che tirano sassi ai miei gabbiani, sono i gemelli. Digli che li vedo.'],
    },
    rosalba: {
        name: 'Rosalba la Lavandaia', where: 'I panni stesi, fra le case', sex: 'f',
        app: { species: 'umano', build: 'medio', height: 0.96, skin: '#e8c0a0', eyes: 'assonnati', eyeColor: '#5a4a3a', mouth: 'sorriso', hair: 'codino', hairColor: '#8a8a90', beard: 'nessuna', topStyle: 'veste', top: '#a86a8a', bottom: '#5a4a5a', shoes: '#3a2a2a' },
        route: [...ring(6.5, 5, 0.3).map(([u, v], i) => [u, v, i % 2 ? 14 : 4])],
        lines: ['I panni asciugano in fretta, qui: la nebbia ha paura del sole del faro.', 'Ho lavato tutti i nomi che hanno ripescato dal pozzo. Erano sporchi di trecento anni di niente.', 'Tobia canta mentre impasta. Stona, ma il pane viene buono lo stesso.'],
    },
    bastiano: {
        name: 'Il vecchio Bastiano', where: 'Seduto accanto al cippo', sex: 'm',
        app: { species: 'umano', build: 'snello', height: 0.94, skin: '#d8b098', eyes: 'sottili', eyeColor: '#6a6a6a', mouth: 'neutro', hair: 'calvo', hairColor: '#e8e8e8', beard: 'folta', topStyle: 'veste', top: '#5a5040', bottom: '#4a4030', shoes: '#2a2018' },
        route: [[VU + 2.4, VV + 1.2, 120], [VU - 1.5, VV + 2.4, 60]],
        lines: ['Io c\'ero, quando la gente buttava il nome nel pozzo. Il mio l\'ho tenuto in tasca. Bastiano. Pesa poco.', 'Una volta qui c\'era il mercato. Pesce, pane, stoffe, chiacchiere. Le chiacchiere soprattutto.', 'Vai a trovare la Cartografa. Ti farà giocare con le sue mappe: se perdi, ti guarda con compassione.'],
    },
    cupo: {
        name: 'Fra\' Cupo', where: 'Sul sentiero del Monte Storto', sex: 'm',
        app: { species: 'spettro', build: 'medio', height: 1.06, skin: '#c8d0e0', eyes: 'luminosi', eyeColor: '#bfe0ff', mouth: 'neutro', hair: 'calvo', hairColor: '#ffffff', beard: 'nessuna', topStyle: 'veste', top: '#3a3a4a', bottom: '#2a2a3a', shoes: '#1a1a22' },
        look: { head: 'cappuccio' },
        route: [[RP.pozzo[0] - 6, RP.pozzo[1] + 6, 30], [-26, 0, 10], [-32, 5, 40], [-24, -2, 0]],
        lines: ['Salgo e scendo il Monte Storto da quando ero vivo. Adesso salgo più in fretta: non ho le ginocchia.', 'Il pozzo di notte respira ancora. Ma piano, come chi dorme tranquillo.', 'Pregate per i nomi che non sono ancora tornati. O cantate: funziona uguale.'],
    },
};
export const RIVANO_IDS = Object.keys(RIVANI);

// --- i giochi: quanti al giorno, quanto devono durare almeno, e quanto rendono ---
export const RIVA_GAMES = {
    forno: { name: 'Il forno di Tobia', who: 'pina', daily: 3, minMs: 9000, desc: 'Cinque pagnotte: quando la crosta è dorata (la barra sul verde), premi Spazio per sfornare. Troppo presto è crudo, troppo tardi è carbone.' },
    sassi: { name: 'I sassi sull\'acqua', who: 'gemelli', daily: 5, minMs: 2500, desc: 'Tieni premuto Spazio per caricare il tiro e lascia quando la forza è nella fascia d\'oro; poi premi di nuovo quando l\'angolo è basso. Più è preciso, più rimbalzi.' },
    mappa: { name: 'La mappa a memoria', who: 'cartografa', daily: 3, minMs: 6000, desc: 'La Cartografa mostra i segni della mappa uno dopo l\'altro: ripetili nello stesso ordine (clic o tasti 1-4). Ogni giro ne aggiunge uno.' },
};
// il premio: score è 0..1 per il forno, i rimbalzi (0..12) per i sassi, il giro raggiunto (0..12) per la mappa
export function rivaPrize(game, score) {
    if (game === 'forno') { const s = Math.max(0, Math.min(1, +score || 0)); return { coins: Math.round(15 + 45 * s), xp: Math.round(20 + 40 * s), mats: s >= 0.85 ? { perla: 1 } : {} }; }
    if (game === 'sassi') { const n = Math.max(0, Math.min(12, Math.floor(+score || 0))); return { coins: n * 5, xp: 6 + n * 5, mats: n >= 10 ? { frammento: 1 } : {} }; }
    if (game === 'mappa') { const n = Math.max(0, Math.min(12, Math.floor(+score || 0))); return { coins: n * 6, xp: 10 + n * 8, mats: n >= 8 ? { pergamena: 1 } : n >= 5 ? { perla: 1 } : {} }; }
    return { coins: 0, xp: 0, mats: {} };
}

// dove si trova adesso un abitante: gira la sua strada in tondo, con le soste (uguale per tutti i viandanti)
const PLANS = new Map();
function planOf(id) {
    if (PLANS.has(id)) return PLANS.get(id);
    const R = RIVANI[id], sp = R.kid ? 1.9 : 1.25, pts = R.route.map(([u, v, w]) => ({ p: rivaPt(u, v), w }));
    const legs = []; let T = 0;
    for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length], d = Math.hypot(b.p[0] - a.p[0], b.p[1] - a.p[1]);
        legs.push({ t0: T, wait: a.w, a: a.p, b: b.p, walk: d / sp }); T += a.w + d / sp;
    }
    const P = { legs, T: Math.max(1, T), off: [...id].reduce((s, c) => s + c.charCodeAt(0) * 7, 0) };
    PLANS.set(id, P); return P;
}
export function rivanoAt(id, now = Date.now()) {
    const P = planOf(id), t = ((now / 1000 + P.off) % P.T + P.T) % P.T;
    for (const L of P.legs) {
        if (t < L.t0 + L.wait) return { x: L.a[0], z: L.a[1], walking: false };
        if (t < L.t0 + L.wait + L.walk) { const k = (t - L.t0 - L.wait) / L.walk; return { x: L.a[0] + (L.b[0] - L.a[0]) * k, z: L.a[1] + (L.b[1] - L.a[1]) * k, walking: true, yaw: Math.atan2(L.b[0] - L.a[0], L.b[1] - L.a[1]) }; }
    }
    const L = P.legs[0]; return { x: L.a[0], z: L.a[1], walking: false };
}
