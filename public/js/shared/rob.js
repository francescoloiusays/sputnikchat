// =====================================================================
//  IL ROMANZO DELLA NEBBIA · IL RIGHELLO DI ROB (client + server)
//  Un ramo della storia che si vive solo con lui: Rob il Righello,
//  il geometra che con il suo maestro ha fatto i rilievi delle Terre
//  Nuove. Calvo, la barba rossa, un metro da falegname sempre in tasca.
//  Quando era vivo andava sott'acqua per il gusto di guardare: la Secca
//  del Relitto l'ha trovata lui, al largo di una spiaggia.
//  È andato via troppo presto. Ha lasciato una moglie, due figli e dei
//  nipoti simpaticissimi, e non ha smesso un giorno di pensarci.
//  Ti prende per mano e ti porta nei posti più nascosti dell'isola,
//  che poi sono i posti più nascosti di te.
//
//  Stessi tipi di passo del Libro II (talk, find, answer); in più
//  «cena»: la grande cena finale, con la sua scena.
// =====================================================================
import { TP } from './terre.js';

export const ROB_LEVEL = 3;

export const ROB_SPOTS = {
    cs1: { x: TP.cs1[0], z: TP.cs1[1], glow: 'caposaldo', name: 'Il primo caposaldo', hint: 'al collo di terra che porta alle Terre Nuove', label: 'Pulisci il caposaldo',
        msg: 'Un blocchetto di cemento con un chiodo d\'ottone in mezzo. Sotto il muschio, inciso con la punta di un chiodo: «R. — qui si comincia».' },
    cs2: { x: TP.cs2[0], z: TP.cs2[1], glow: 'caposaldo', name: 'Il secondo caposaldo', hint: 'in fondo al borgo delle Terre Nuove', label: 'Pulisci il caposaldo',
        msg: 'Accanto al chiodo, piccole piccole, due tacche e una data. Rob, dietro di te, si schiarisce la voce: «Il giorno che mio figlio ha tenuto la palina dritta da solo».' },
    cs3: { x: TP.cs3[0], z: TP.cs3[1], glow: 'caposaldo', name: 'Il terzo caposaldo', hint: 'ai piedi del colle, verso il mare', label: 'Pulisci il caposaldo',
        msg: 'Il più vecchio dei tre. Il cemento è crepato, ma il chiodo è al suo posto. «Le cose fatte bene» dice Rob «stanno ferme anche quando il mondo si muove».' },
    pedagno: { x: -163, z: 125, swim: true, glow: 'boa', name: 'Il pedagno di Rob', hint: 'alla Secca del Relitto, in acqua verso il mare aperto: a nuoto (il Traghettatore ti ci porta in barca)', label: 'Tuffati lungo la cima',
        msg: 'Una boa arancione, scolorita, legata a una cima che scende nel blu. La segui con gli occhi: in fondo, una piccola croce di sassi messa lì apposta, perché qualcuno la trovasse.' },
    maschera: { x: -140, z: 114, glow: 'maschera', name: 'La maschera di Rob', hint: 'sulla sabbia della Secca, dalla parte della barca', label: 'Raccogli la maschera',
        msg: 'Una maschera da sub, il vetro graffiato, un paio di pinne nere. Dentro la maschera un biglietto di plastica: «Profondità massima: 18 metri. Profondità giusta: quella in cui respiri piano».' },
    trig: { x: TP.trig[0], z: TP.trig[1], r: 3.5, night: true, glow: 'trig', name: 'Il Punto Trigonometrico', hint: "in cima al colle delle Terre Nuove, quando sull'isola è sera o notte", label: 'Sali sul pilastrino',
        msg: '' },
    grotta: { x: TP.grotta[0] - 3, z: TP.grotta[1], r: 3.5, glow: 'voci', name: 'La Grotta delle Voci', hint: 'nello sperone di roccia in fondo alle Terre Nuove', label: 'Entra nella grotta',
        msg: '' },
    tavola: { x: TP.tavola[0], z: TP.tavola[1], r: 8, name: 'La Tavola Lunga', hint: 'nel prato delle Terre Nuove, sotto le lucine', msg: '' },
};

export const ROB_CHAPTERS = [
    {
        id: 'geometra', title: 'Il Geometra', xp: 250, coins: 100,
        steps: [
            { k: 'talk', who: 'rob', t: 'Nelle Terre Nuove c\'è un uomo calvo con la barba rossa che misura il prato con un righello',
                say: ['Ah, eccoti. Non fare quella faccia: lo so che misurare un prato col metro da falegname sembra una cosa da matti.',
                    'Mi chiamano Rob il Righello. Ero geometra. Questa parte dell\'isola l\'ho rilevata io, con il mio maestro, quando era ancora tutta da fare: picchetti, paline, la livella, e il caffè nel thermos.',
                    'Poi è arrivata la nebbia e si è mangiata i rilievi. Ma i capisaldi no: quelli non se li mangia nessuno. Me li ritrovi? Sono tre. Così ricominciamo da dove eravamo.'],
                btn: 'Andiamo a cercarli' },
            { k: 'find', spots: ['cs1', 'cs2', 'cs3'], t: 'Ritrova i tre capisaldi di Rob nelle Terre Nuove' },
            { k: 'talk', who: 'rob', t: 'Torna da Rob, allo studio',
                say: ['Tutti e tre. Lo sapevo che erano ancora lì.', 'Un caposaldo è un punto che non si muove. Serve a una cosa sola: a ritrovarsi. Se sai dove sei, puoi andare dove vuoi.',
                    'Ho rimesso a posto la prima tavola. È sul tavolo da disegno: prendila in mano, c\'è scritto anche il tuo nome. Non chiedermi come lo sapevo.'],
                btn: 'Grazie, Rob', after: ['Tavola 1 · Pianta delle Terre Nuove', 'Sul tavolo da disegno dello studio c\'è una tavola nuova, ancora odorosa di china. In basso a destra, nel cartiglio, una firma: «Roberto».'] },
        ],
    },
    {
        id: 'secca', title: 'Il Fondo del Mare', lv: 4, xp: 300, coins: 120,
        steps: [
            { k: 'talk', who: 'rob', t: 'Rob vuole raccontarti della Secca del Relitto',
                say: ['Lo sai chi l\'ha trovata, la Secca del Relitto? Io. Per divertimento. Nuotavo al largo di una spiaggia, con la maschera e le pinne, e sotto di me il blu è diventato verde.',
                    'Il mare mi ha insegnato una cosa che in ufficio non insegnano: si va giù piano, e si respira piano. Chi ha fretta, sott\'acqua, consuma l\'aria e non vede niente.',
                    'Ho lasciato là un pedagno, una boa con la cima, e da qualche parte sulla sabbia la mia maschera. Fatti portare dal Traghettatore. Io ti aspetto: in barca non ci sto, mi fa venire nostalgia.'],
                btn: 'Andrò alla Secca' },
            { k: 'find', spots: ['pedagno', 'maschera'], t: 'Alla Secca del Relitto: trova il pedagno di Rob (a nuoto) e la sua maschera' },
            { k: 'talk', who: 'rob', t: 'Racconta a Rob cosa c\'era in fondo alla cima',
                say: ['La croce di sassi. Ce l\'ho messa io, l\'ultima estate. Non per un morto: per i vivi. Perché chi si tuffa sappia che lì sotto qualcuno è già passato, e che si può tornare su.',
                    'La seconda tavola è il rilievo della Secca, con le quote del fondale. Le ho prese una per una, in apnea, con un piombo e una cordicella. I miei figli dicevano che ero matto. Avevano ragione, ed era bellissimo.'],
                btn: 'Era bellissimo davvero', after: ['Tavola 2 · Rilievo della Secca del Relitto', 'Una carta azzurra piena di numeri piccoli: le profondità, metro per metro. In un angolo, a matita: «qui c\'è il polpo, salutalo».'] },
        ],
    },
    {
        id: 'intemperie', title: 'Le Intemperie', lv: 5, xp: 350, coins: 140,
        steps: [
            { k: 'talk', who: 'rob', t: 'Rob guarda il cielo: dice che stanotte bisogna salire sul colle',
                say: ['Ci sono tempeste che vedi arrivare dal mare, nere, col vento davanti. E ci sono tempeste che non vedi arrivare per niente. A me è capitata una di quelle. Troppo presto.',
                    'Non ti racconto la malinconia, quella la conosci già. Ti racconto un trucco da geometra: quando non vedi niente, sali sul punto più alto e guardi lontano.',
                    'C\'è un pilastrino in cima al colle, il Punto Trigonometrico. Saliamo stanotte, con la nebbia. Dammi la mano: sui sassi bagnati si scivola.'],
                btn: 'Ti do la mano' },
            { k: 'find', spots: ['trig'], t: "Sali con Rob sul Punto Trigonometrico, in cima al colle, quando sull'isola è sera",
                after: ['Il Punto Trigonometrico', 'Rob ti tiene la mano finché non sei sul pilastrino. Da lassù la nebbia è sotto di voi, come un mare di latte, e l\'isola spunta fuori a pezzi: il faro, il castello, la piazza, le Terre Nuove. «L\'ho misurata tutta, quest\'isola» dice. «Lo sai com\'è fatta? È fatta come te. Ha dei posti che non hai ancora visto.»'] },
            { k: 'talk', who: 'rob', t: 'Parla con Rob, scesi dal colle',
                say: ['Visto? Con la nebbia non si vede niente da sotto, e tutto da sopra. È un fatto di quote, non di coraggio.',
                    'Quando torni a casa e ti sembra di non vedere niente, ricordati il pilastrino. Sali. Guarda lontano. E poi riscendi, piano, che i sassi sono bagnati.'],
                btn: 'Me lo ricorderò', after: ['Tavola 3 · Sezione del Colle', 'Il profilo del colle, con le quote e un omino piccolo in cima, disegnato a mano libera. Accanto all\'omino ce n\'è un altro, più grande, che gli tiene la mano.'] },
        ],
    },
    {
        id: 'voci', title: 'La Grotta delle Voci', lv: 6, xp: 400, coins: 160,
        steps: [
            { k: 'talk', who: 'rob', t: 'Rob vuole portarti nello sperone di roccia in fondo alle Terre Nuove',
                say: ['C\'è un posto che non ho mai messo in nessuna tavola. Una grotta nello sperone. Dentro, se stai zitto, senti le voci di chi ti vuole bene.',
                    'Non fa paura. O meglio: fa paura come fanno paura le cose vere. Vieni. Entro io per primo.'],
                btn: 'Entriamo' },
            { k: 'find', spots: ['grotta'], t: 'Entra con Rob nella Grotta delle Voci',
                after: ['La Grotta delle Voci', 'Dentro è buio e caldo. Rob si siede su un sasso e chiude gli occhi. Dopo un po\' sorride: «La sento. Mia moglie che ride di una cosa che ho detto io. I miei due figli che litigano per chi guida. E i nipoti... i nipoti che fanno un chiasso, che non si capisce niente. Quanto mi mancano.»'] },
            { k: 'answer', who: 'rob', t: 'Rob ti guarda: tocca a te',
                say: ['Li avrei voluti riabbracciare. Una volta sola, tutti insieme, a tavola. Mi sarebbe bastato.', 'Adesso ascolta tu. Chi senti?'],
                q: 'Nella Grotta delle Voci, chi senti?', a: ['Qualcuno che mi manca tanto', 'Me stess{o}, da piccol{o}', 'Non lo so ancora, ma c\'è qualcuno'] },
            { k: 'talk', who: 'rob', t: 'Esci dalla grotta con Rob',
                say: ['Visto? Non sono andati via. Stanno qui dentro, come i capisaldi: fermi, mentre tutto il resto si muove.',
                    'Mi è venuta un\'idea. Una cena. Una cena lunga, con tutti quelli dell\'isola, alla Tavola Lunga nel prato. Come quelle d\'estate, quando non si finiva mai. Mi aiuti ad apparecchiare?'],
                btn: 'Apparecchiamo', after: ['Tavola 4 · La Grotta delle Voci', 'Una sezione della grotta, piccola, con una scritta storta sotto: «Rilievo non richiesto dal committente. Fatto lo stesso.»'] },
        ],
    },
    {
        id: 'cena', title: 'La Grande Cena', lv: 7, xp: 800, coins: 400, title_id: 'robcena', last: true,
        steps: [
            { k: 'talk', who: 'rob', t: 'Rob ha già steso la tovaglia: è ora di chiamare tutti',
                say: ['Ho detto a tutti di venire. A tutti. Anche allo Spettro del Pedaggio, che tanto non mangia. Anche al Re Annegato, che si è offeso, ma verrà.',
                    'Tu siediti vicino a me. Stasera non si misura niente. Stasera si mangia, si ride, e si sta.'],
                btn: 'Arrivo' },
            { k: 'cena', spot: 'tavola', t: 'Raggiungi la Tavola Lunga, nel prato delle Terre Nuove: la cena è pronta' },
        ],
    },
];
export const ROB_END = ROB_CHAPTERS.length;
export const newRob = () => ({ ch: 0, i: 0, got: [], ans: [] });
export const robStep = (st) => ROB_CHAPTERS[st?.ch]?.steps[st.i] || null;
export const robAt = (st) => (st?.ch ?? 0) * 100 + (st?.i ?? 0);
export const ROBAT = (ch, i = 0) => ch * 100 + i;
export function robNext(st) {
    const S = robStep(st);
    if (!S) return null;
    if (S.k === 'find' && S.spots.length > 1) {
        const left = S.spots.filter(k => !st.got.includes(k));
        return `${S.t} (${S.spots.length - left.length}/${S.spots.length}) · ${ROB_SPOTS[left[0]]?.hint || ''}`;
    }
    return S.t;
}
// quante tavole ha già ridisegnato Rob (una per capitolo chiuso, la quinta alla fine)
export const robPlates = (st) => Math.min(5, st?.ch ?? 0);

// --- la grande cena: le ultime parole di Rob, e quello che resta ---
export const ROB_LAST = 'Forse questa era davvero l\'ultima cosa che avrei dovuto fare. Penso che tu ora sia davvero pront{o} ad affrontare tutto.';
export const ROB_EPILOGUE = [
    'Ci sono persone che se ne vanno troppo presto.',
    'Non si portano via niente. Lasciano tutto: i sentieri che ci hanno insegnato a percorrere, le misure giuste delle cose, il modo di tenere la palina dritta quando tira vento.',
    'Lasciano una risata in una stanza, una mano sulla spalla, una cena d\'estate che non finiva mai.',
    'Quest\'isola è fatta anche di loro. Ogni volta che ritrovi la strada nella nebbia, è una mano che ti tiene.',
    'Non sono andati via. Sono i nostri capisaldi: fermi, dentro di noi, mentre tutto il resto si muove.',
];
export const ROB_DEDICA = 'A Roberto. E a tutti quelli che restano dentro di noi.';
