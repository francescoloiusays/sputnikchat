// =====================================================================
//  IL ROMANZO DELLA NEBBIA, LIBRO I (client + server)
//  I capitoli: chi li apre, i passi, la domanda finale, e il motore del
//  Nome Vero. Le pagine del libro e i dialoghi stanno in story-text.js.
// =====================================================================

import { STONES } from './catalog.js';

// Ogni capitolo si apre parlando con «who» e si chiude da «end» (se c'è) o di nuovo da «who».
// I passi «state» si leggono dal profilo (contano anche se fatti prima), gli altri si contano
// solo da quando il capitolo è aperto. «max»: vale il risultato migliore, non la somma.
export const STORY = [
    { id: 'approdo', title: "L'Approdo", sub: 'Prologo', seed: null, lv: 1, who: 'ratto_piazza', steps: [] },
    {
        id: 'brace', title: 'La Brace', sub: 'Ciò che vuoi', seed: 'fuoco', lv: 1, who: 'brace',
        steps: [
            { k: 'weapons', n: 2, state: true, t: 'Fatti forgiare un\'arma nuova da Mastro Brace' },
            { k: 'practiceWin', n: 1, t: 'Vinci un duello contro il Fantasma, nell\'Arena' },
        ],
        q: 'Se potessi avere una cosa sola, quale?', a: ['Essere ricordat{o}', 'Essere liber{o}', 'Essere amat{o}'], reward: 'scintilla', xp: 150,
    },
    {
        id: 'brina', title: 'La Brina', sub: 'Ciò che aspetti', seed: 'ghiaccio', lv: 3, who: 'traghettatore', night: true,
        steps: [
            { k: 'fish', n: 3, t: 'Pesca tre pesci al Molo' },
            { k: 'diary', n: 2, state: true, t: 'Ritrova due pagine del Diario del Naufrago (arrivano nelle bottiglie)' },
        ],
        q: 'Che cosa aspetti da tanto tempo?', a: ['Che qualcuno torni', 'Di sentirmi pront{o}', 'Niente: è il tempo che aspetta me'], reward: 'brina', xp: 200,
    },
    {
        id: 'radice', title: 'La Radice', sub: 'Ciò che dimentichi', seed: 'palude', lv: 4, who: 'becchino',
        steps: [{ k: 'dig', n: 5, t: 'Scava cinque tombe nel Prato dei Morti' }],
        q: 'Che cosa vorresti dimenticare?', a: ['Una paura', 'Una persona', 'Niente: voglio ricordare tutto'], reward: 'radice', xp: 250,
    },
    {
        id: 'masso', title: 'Il Masso', sub: 'Ciò che resta', seed: 'pietra', lv: 6, who: 'pietre',
        steps: [
            { k: 'tablet', id: 'pietra', n: 1, state: true, t: 'Leggi la Tavoletta del Masso, in fondo al Ponte dei Sospiri' },
            { k: 'canto', n: 8, max: true, t: 'Arriva a otto note nel Canto delle Pietre' },
        ],
        q: 'Che cosa di te non cambieresti mai?', a: ['La mia testardaggine', 'La mia parola', 'Il mio modo di ridere'], reward: 'masso', xp: 300,
    },
    {
        id: 'tuono', title: 'Il Tuono', sub: 'Ciò che ti muove', seed: 'tempesta', lv: 8, who: 'spettro',
        steps: [
            { k: 'comebacks', n: 6, state: true, t: 'Impara sei risposte per il Pedaggio dagli abitanti' },
            { k: 'toll', n: 1, t: 'Batti lo Spettro del Pedaggio a parole' },
            { k: 'rankedWin', n: 1, t: 'Vinci un duello classificato nell\'Arena' },
        ],
        q: 'Che cosa ti fa partire?', a: ['La rabbia', 'La curiosità', 'La noia'], reward: 'tuono', xp: 350,
    },
    {
        id: 'eco', title: 'L\'Eco', sub: 'Ciò che ricordi', seed: 'spettro', lv: 10, who: 'custode',
        steps: [
            { k: 'phone', n: 1, t: 'Rispondi al telefono bianco della Stanza Bianca' },
            { k: 'drawer', n: 1, t: 'Apri il cassetto della Stanza Bianca' },
        ],
        q: 'Quale ricordo vorresti ritrovare per primo?', a: ['Una voce', 'Un posto', 'Un sapore'], reward: 'eco', xp: 400,
    },
    {
        id: 'melma', title: 'La Melma', sub: 'Ciò che sei', seed: 'fango', lv: 15, who: 'becchino', end: 'specchio', way: true,
        steps: [
            { k: 're', n: 1, t: 'Affronta il Re Annegato' },
            { k: 'fango', n: 1, t: 'Cerca il settimo seme sotto le assi del molo' },
        ],
        q: 'Indossi la corona?', a: ['Sì, la indosso', 'No, la lascio al fango'], reward: 'senzanome', xp: 500,
    },
    { id: 'biglietto', title: 'Il Biglietto', sub: 'Epilogo', seed: null, lv: 15, who: 'traghettatore', steps: [] },
];
export const STORY_END = STORY.length;   // ch === STORY_END: Libro I finito

// Luoghi della storia che non sono abitanti (gli abitanti stanno in NPCS)
export const STORY_SPOTS = {
    ratto_piazza: { x: 3.2, z: 19.2, r: 4, name: 'Il Ratto dei Cronisti' },
    pietre: { x: STONES.x, z: STONES.z, r: 6, name: 'Il Cerchio di Pietre' },
    specchio: { x: 13, z: 2, r: 4, name: 'Lo Specchio Incantato' },
    molo: { x: 0.4, z: 97.5, r: 3.5, name: 'Le assi del molo' },
    cripta: { x: -13, z: -93, r: 3.5, name: 'La cripta del castello' },
};
export const WAYS = { veglia: 'Alla Veglia del sabato, insieme agli altri', cripta: 'Da solo, nella cripta sotto il castello' };

export function newStory(seen) { return { ch: 0, on: false, prog: {}, ans: [], seen: !!seen }; }

// quanto è fatto un passo (dal profilo privato o dal profilo del server: hanno gli stessi campi)
export function stepHave(st, s, P) {
    if (s.state) switch (s.k) {
        case 'weapons': return (P.inventory || []).filter(i => i.kind === 'weapon').length;
        case 'diary': return (P.diary || []).length;
        case 'tablet': return (P.tablets || []).includes(s.id) ? 1 : 0;
        case 'comebacks': return (P.comebacks || []).length;
        default: return 0;
    }
    return st?.prog?.[s.k] || 0;
}
export function chapterReady(st, P) {
    const C = STORY[st?.ch];
    return !!C && !!st.on && C.steps.every(s => stepHave(st, s, P) >= s.n);
}
// accordo al maschile o al femminile: «pront{o}» → pronto / pronta
export const gx = (txt, sex) => String(txt).replace(/\{o\}/g, sex === 'f' ? 'a' : 'o');

// =====================================================================
//  IL MOTORE DEL NOME VERO
//  Un verbo da una risposta su desiderio, attesa o partenza (capitoli I, II, V), un nome da una
//  risposta su oblio, pietra o ricordo (III, IV, VI), una chiusa sulla corona (VII). Quali capitoli
//  parlano e quale forma scelgono dipende dal giocatore stesso: due viandanti con le stesse risposte
//  ricevono nomi diversi, ma veri per entrambi.
// =====================================================================
const VERBS = {
    1: [['Lascia il Segno', 'Incide il Ferro', 'Non Vuole Svanire'], ['Non Porta Catene', 'Corre Sciolt{o}', 'Rompe le Briglie'], ['Apre le Mani', 'Scalda le Mani', 'Cerca un Abbraccio']],
    2: [['Aspetta un Ritorno', 'Tiene Accesa la Lanterna', 'Guarda il Mare'], ['Aspetta di Essere Pront{o}', 'Prepara il Passo', 'Conta i Giorni'], ['Ferma il Tempo', 'Non Ha Fretta', 'Lascia Aspettare le Ore']],
    5: [['Porta il Tuono', 'Spacca le Onde', 'Brucia di Rabbia'], ['Insegue l\'Orizzonte', 'Apre Ogni Porta', 'Segue le Domande'], ['Cerca il Vento', 'Non Sta Mai Ferm{o}', 'Scappa dalla Noia']],
};
const NOUNS = {
    3: [['della Paura Sepolta', 'dell\'Ombra Lasciata', 'del Coraggio Nuovo'], ['del Nome Taciuto', 'del Volto Lontano', 'della Persona Perduta'], ['della Memoria Intera', 'dei Mille Ricordi', 'della Memoria Ostinata']],
    4: [['della Testa Dura', 'del Masso Ostinato', 'della Pietra che Non Cede'], ['della Parola Data', 'della Promessa Tenuta', 'del Patto di Pietra'], ['della Risata Storta', 'del Riso Pronto', 'della Risata Senza Fine']],
    6: [['della Voce Lontana', 'dell\'Eco Gentile', 'della Voce Ritrovata'], ['del Posto Perduto', 'della Casa Lontana', 'della Strada di Casa'], ['del Sapore Dimenticato', 'del Pane Caldo', 'del Sale sulle Labbra']],
};
const CROWN = [
    ['Coronat{o} di Fango', 'con la Corona in Testa', '{re} per una Notte'],
    ['Senza Corona', 'che Lasciò la Corona', 'Liber{o} dalla Corona'],
];
function hash32(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 13; h = Math.imul(h, 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
}
// st.ans[1..7] = indice della risposta; seed = qualcosa di unico del giocatore (il suo id)
// salt: il server prova varianti finché trova un nome che nessun altro porta
export function nomeVero(st, seed, sex, salt = 0) {
    const ans = st?.ans || [];
    const base = String(seed || 'viandante') + (salt ? '#' + salt : '');
    // ogni pezzo del nome ha il suo sorteggio, indipendente dagli altri
    const pick = (table, chapters, key) => {
        const ok = chapters.filter(c => ans[c] != null);
        if (!ok.length) return null;
        const hk = hash32(base + key), c = ok[hk % ok.length];
        const forms = table[c][ans[c]];
        return forms[(hk >>> 8) % forms.length];
    };
    const verb = pick(VERBS, [1, 2, 5], ':verbo') || 'Cerca il Suo Nome';
    const noun = pick(NOUNS, [3, 4, 6], ':nome') || 'della Nebbia';
    const crown = ans[7] != null ? CROWN[ans[7]][hash32(base + ':corona') % 3] : null;
    const who = sex === 'f' ? 'Colei' : 'Colui';
    const txt = `${who} che ${verb}, ${noun}${crown ? ', ' + crown : ''}`;
    return gx(txt, sex).replace('{re}', sex === 'f' ? 'Regina' : 'Re');
}
