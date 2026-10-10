// =====================================================================
//  LA CRONACA DELL'ISOLA (client + server)
//  Gli abitanti, il Pedaggio dello Spettro, le puntate di In Onda!,
//  le Tavolette della Cronaca, le missioni del telefono bianco.
// =====================================================================

// --- IL PEDAGGIO DELLO SPETTRO: a ogni insulto la sua risposta (stesso indice) ---
export const INSULTS = [
    ['Combatti come un pesce fuori dall\'acqua!', 'E tu parli come uno che ci è affogato dentro.'],
    ['Ho visto rane più spaventose di te nella laguna.', 'Erano le tue cugine: ti mandano i saluti.'],
    ['La tua lama è più arrugginita del cancello del cimitero.', 'Eppure basta a farti cigolare come lui.'],
    ['Puzzi più della melma sotto il molo.', 'Almeno la melma, a differenza tua, sta zitta.'],
    ['Il mio bisnonno spettrale tirava di scherma meglio di te.', 'Infatti adesso è uno spettro anche lui.'],
    ['Ti ho visto inciampare sul Ponte dei Sospiri.', 'Sospiravo per la noia di guardare te.'],
    ['Neanche la nebbia vuole starti vicino.', 'Strano, a te si è infilata dritta in testa.'],
    ['Sei lento come una tartaruga col mal di schiena.', 'Arrivo tardi, ma arrivo. Tu resti qui per sempre.'],
    ['Il Becchino ha già preso le tue misure.', 'Gli ho dato le tue: sei tu quello che non si muove da qui.'],
    ['Con quella faccia spaventeresti un fuoco fatuo.', 'E tu con quel fiato lo spegneresti.'],
    ['Ogni volta che parli, in laguna muore un pesce.', 'Allora taci tu, che di cose morte te ne intendi.'],
    ['Ho duellato con scope più pericolose di te.', 'E le scope ti hanno spazzato via, a quanto vedo.'],
    ['Sei così molle che ti useranno per tappare le botti.', 'E tu così vuoto che ti useranno come botte.'],
    ['La tua carta non vale neanche come segnalibro.', 'La tua invece la userei volentieri per accendere il camino.'],
];
export const TOLL_START = [0, 1, 3];   // le risposte che conosce chi arriva sull'isola
export const TOLL_LINES = {
    hello: 'Nessuno passa senza una risposta pronta. Beh, passano tutti, in realtà. Ma senza dignità.',
    right: ['Mmh. Questa me la segno.', 'Fortuna del principiante.', 'Non male, per uno ancora vivo.'],
    wrong: ['Ah! Che risposta è?', 'Patetico. Te la insegno io, quella giusta.', 'Lo Spettro ride, e la nebbia ride con lui.'],
    win: 'Va bene, va bene. Passa, e prendi queste monete prima che cambi idea.',
    lose: 'Torna quando avrai una lingua, viandante.',
};

// --- GLI ABITANTI DELL'ISOLA ---
// pos: dove stanno; look/app: come si vestono; teach: la risposta del Pedaggio che insegnano la prima volta
export const NPCS = {
    traghettatore: {
        name: 'Il Traghettatore', where: 'Il Molo', x: -0.9, z: 92.6, ry: Math.PI / 2, teach: 4,
        app: { species: 'umano', build: 'snello', height: 1.1, skin: '#b9a48e', eyes: 'assonnati', eyeColor: '#7fd8ff', mouth: 'neutro', hair: 'lunghi', hairColor: '#c8c8c8', beard: 'folta', topStyle: 'veste', top: '#1d1b26', bottom: '#14121a', shoes: '#0e0c10' },
        look: { head: 'cappuccio', cape: 'mantello_nero' },
        lines: ['Tutti arrivano dal molo. Pochi ripartono. Nessuno, finora, ha chiesto il biglietto di ritorno.',
            'Di notte, sotto le assi, nuota qualcosa di fatto di nebbia. Usa la lenza, non le mani.',
            'Le bottiglie le porta il mare, non io. Io le leggo soltanto, prima di ributtarle.'],
        actions: [['diario', 'Il Diario del Naufrago']],
    },
    brace: {
        name: 'Mastro Brace', where: 'Forgia di Vulcano', x: -16.2, z: 12.6, ry: Math.PI / 2, teach: 2,
        app: { species: 'umano', build: 'robusto', height: 1.05, skin: '#a8714c', eyes: 'fieri', eyeColor: '#3a2414', mouth: 'ghigno', hair: 'calvo', hairColor: '#1a1210', beard: 'folta', topStyle: 'tunica', top: '#5a2a14', bottom: '#2b2018', shoes: '#1e1612' },
        look: { torso: 'grembiule', weapon: { type: 'martello', material: 'ferro', handle: 'cuoio', gem: 'nessuna', name: 'Martello di Brace' } },
        lines: ['Ferro, legno, osso: tutto si piega se lo scaldi abbastanza. Anche le persone.',
            'I castoni te li apro io, se mi porti le Ossa Antiche del cimitero. Non chiedermi perché le ossa: funziona e basta.',
            'Le rune messe a caso sono sassi colorati. Messe in fila, parlano.'],
        actions: [['forgia', 'Entra in Forgia'], ['castoni', 'Castoni e Parole di Runa']],
    },
    sarta: {
        name: 'La Sarta Spettrale', where: 'Sartoria Spettrale', x: 16.2, z: 7.6, ry: -Math.PI / 2, teach: 6,
        app: { species: 'spettro', build: 'snello', height: 1, skin: '#c8d0ff', eyes: 'luminosi', eyeColor: '#e3c8ff', mouth: 'sorriso', hair: 'codino', hairColor: '#e8e8ff', beard: 'nessuna', topStyle: 'veste', top: '#3d1466', bottom: '#2a1040', shoes: '#14101e' },
        look: { face: 'monocolo', cape: 'mantello_viola' },
        lines: ['Ogni capo va d\'accordo con qualche seme e litiga con altri. Come la gente.',
            'Non si paga per sognare. Si paga per indossare.',
            'Un vestito incantato a +10 si illumina tutto. Io non l\'ho mai visto. Sono qui da trecento anni.'],
        actions: [['sartoria', 'Entra in Sartoria']],
    },
    mercante: {
        name: 'Il Mercante senza Ombra', where: 'Bazar del Ratto', x: 13.4, z: 39.2, ry: -Math.PI / 2, teach: 11,
        app: { species: 'ratto', build: 'snello', height: 0.95, skin: '#7a7068', eyes: 'sottili', eyeColor: '#ffd23a', mouth: 'ghigno', hair: 'calvo', hairColor: '#5a5048', beard: 'baffi', topStyle: 'giacca', top: '#2f4a24', bottom: '#2b2633', shoes: '#3a2414' },
        look: { head: 'tricorno' },
        lines: ['Compro, vendo, trattengo il cinque per cento. È l\'unica tassa onesta dell\'isola.',
            'Hai visto la Bacheca delle Taglie in piazza? Le taglie pagano meglio dei sogni.',
            'Non ho ombra perché l\'ho venduta. Ottimo affare, all\'epoca.'],
        actions: [['bazar', 'Apri il Bazar'], ['bacheca', 'Le tue taglie']],
    },
    custode: {
        name: 'La Custode senza Volto', where: 'Cappella in Rovina', x: 30, z: 58.2, ry: Math.PI, teach: 9,
        app: { species: 'spettro', build: 'medio', height: 1.1, skin: '#0c0a12', eyes: 'luminosi', eyeColor: '#fff4ea', mouth: 'neutro', hair: 'calvo', hairColor: '#0c0a12', beard: 'nessuna', topStyle: 'veste', top: '#e8e2d6', bottom: '#d8d0c0', shoes: '#c8c0b0' },
        look: { head: 'cappuccio', cape: 'mantello_regale' },
        lines: ['Porta qui ciò che hai raccolto. Io non ho volto, ma vedo tutto quello che sei.',
            'In fondo al cammino c\'è la Rinascita: si torna piccoli, con una stella in più sulla carta.',
            'Una carta Viva l\'ho vista una volta sola. Respirava.'],
        actions: [['altare', "All'Altare"]],
    },
    becchino: {
        name: 'Ossobuco il Becchino', where: 'Cimitero Sommerso', x: -29.6, z: 48.6, ry: Math.PI, teach: 3,
        app: { species: 'scheletro', build: 'snello', height: 0.95, skin: '#e9e2cf', eyes: 'tondi', eyeColor: '#ff6a1a', mouth: 'zanne', hair: 'calvo', hairColor: '#e9e2cf', beard: 'nessuna', topStyle: 'giacca', top: '#2b2633', bottom: '#1e1a22', shoes: '#14101a' },
        look: { head: 'cappuccio', weapon: { type: 'lancia', material: 'ferro', handle: 'legno', gem: 'nessuna', name: 'Vanga' } },
        lines: ['Ogni epitaffio dice quante tombe maledette ci sono intorno. Leggi, poi scava. Oppure scava, poi corri.',
            'Il sabato sera i morti si alzano tutti insieme. Fermateli in tanti, prima che salga il Re.',
            'Le Ossa Antiche le vuole sempre Mastro Brace. Io non chiedo. Lui paga.'],
        actions: [['tombe', 'Il Prato dei Morti'], ['veglia', 'La Veglia dei Morti']],
    },
    spettro: {
        name: 'Lo Spettro del Pedaggio', where: 'Ponte dei Sospiri', x: 2.7, z: -30.6, ry: Math.PI, teach: null,
        app: { species: 'spettro', build: 'robusto', height: 1.12, skin: '#9fb0ff', eyes: 'luminosi', eyeColor: '#7affd8', mouth: 'ghigno', hair: 'cresta', hairColor: '#cfe4ff', beard: 'pizzetto', topStyle: 'tunica', top: '#1a2a5a', bottom: '#141a3a', shoes: '#0e1020' },
        look: { head: 'tricorno', face: 'benda', cape: 'ali' },
        lines: [TOLL_LINES.hello, 'Le risposte giuste le sanno gli abitanti dell\'isola. Chiedi in giro, se ne hai il coraggio.'],
        actions: [['pedaggio', 'Sfida a parole']],
    },
    ratto: {
        name: 'Il Ratto dei Cronisti', where: 'Cortile del Castello', x: -4.6, z: -108.4, ry: Math.PI / 2, teach: 13,
        app: { species: 'ratto', build: 'snello', height: 0.9, skin: '#8a8f96', eyes: 'tondi', eyeColor: '#b8401e', mouth: 'zanne', hair: 'calvo', hairColor: '#6d7177', beard: 'nessuna', topStyle: 'tunica', top: '#5b5e63', bottom: '#4a4d52', shoes: '#d98c8c' },
        look: { torso: 'maglia_sh_bianca' },
        lines: ['Porto i messaggi dei Cronisti e le card che vi spedite. Non le leggo. Quasi mai.',
            'Sali nella Stanza Bianca: se ti siedi in poltrona, si va In Onda! Se non c\'è nessun altro, ti faccio io da spalla.',
            'Il telefono bianco squilla quando vuole lui. Rispondi, se hai coraggio.'],
        actions: [],
    },
};

// --- IN ONDA! (la puntata nella Stanza Bianca) ---
export const ONDA_Q = [
    ['Preferiresti avere sempre la sabbia nelle scarpe o i capelli sempre bagnati?', 'Sabbia nelle scarpe', 'Capelli bagnati'],
    ['Preferiresti parlare con i pesci o capire cosa pensano i ratti?', 'Parlare coi pesci', 'Capire i ratti'],
    ['Preferiresti vivere nella Stanza Bianca senza finestre o nel cimitero con una connessione perfetta?', 'Stanza senza finestre', 'Cimitero connesso'],
    ['Preferiresti duellare con un cucchiaio o scommettere tutto su un pareggio?', 'Il cucchiaio', 'Tutto sul pareggio'],
    ['Preferiresti una mappa che mente o una bussola che piange?', 'Mappa bugiarda', 'Bussola che piange'],
    ['Preferiresti che ogni tua frase finisse in rima o che ogni tuo passo squittisse?', 'Tutto in rima', 'Passi che squittiscono'],
    ['Preferiresti pescare solo stivali per un mese o non pescare niente per un giorno?', 'Un mese di stivali', 'Un giorno a vuoto'],
    ['Preferiresti condurre senza pubblico o fare il pubblico senza conduttori?', 'Conduttore solo', 'Pubblico solo'],
    ['Preferiresti essere famoso per un duello perso o sconosciuto con cento vinti?', 'Famoso per la sconfitta', 'Cento vittorie in silenzio'],
    ['Preferiresti un fantasma come coinquilino o un ratto come capo?', 'Il fantasma', 'Il ratto'],
    ['Preferiresti tirare palle di fango per sempre o non poterne tirare mai più?', 'Fango per sempre', 'Mai più fango'],
    ['Preferiresti prevedere solo il meteo o ricordare solo le tue figuracce?', 'Il meteo', 'Le figuracce'],
    ['Preferiresti una spada che canta o uno scudo che si lamenta?', 'Spada che canta', 'Scudo lamentoso'],
    ['Preferiresti ricevere una card al giorno da uno sconosciuto o una lettera all\'anno da un amico?', 'Card dallo sconosciuto', 'Lettera dall\'amico'],
    ['Preferiresti mangiare solo pane raffermo o solo pesce crudo della laguna?', 'Pane raffermo', 'Pesce crudo'],
    ['Preferiresti che la musica di battaglia partisse ogni volta che entri in una stanza o mai più?', 'Sempre', 'Mai più'],
    ['Preferiresti essere sempre in anticipo di un\'ora o in ritardo di cinque minuti?', 'Un\'ora prima', 'Cinque minuti dopo'],
    ['Preferiresti un\'isola senza nebbia o un\'isola senza luna?', 'Senza nebbia', 'Senza luna'],
    ['Preferiresti registrare una puntata al giorno o una sola, ma perfetta?', 'Una al giorno', 'Una perfetta'],
    ['Preferiresti dormire nel letto della Stanza Bianca o sulla barchetta del Molo?', 'Il letto', 'La barchetta'],
    ['Preferiresti conoscere tutte le Parole di Runa o tutte le risposte dello Spettro del Pedaggio?', 'Le Parole di Runa', 'Le risposte'],
    ['Preferiresti indossare per sempre la felpa o per sempre la Corona Spettrale?', 'La felpa', 'La corona'],
    ['Preferiresti volare a due metri da terra o diventare invisibile solo quando nessuno guarda?', 'Volare basso', 'Invisibile a vuoto'],
    ['Preferiresti un duello all\'ultimo colpo o una discussione all\'ultima parola?', 'L\'ultimo colpo', 'L\'ultima parola'],
];
export const ONDA_PLOT = [
    'Il Ratto del Bazar è in realtà tre ratti, uno sopra l\'altro, dentro un mantello.',
    'La luna sopra l\'isola è sempre la stessa da quando il castello è sprofondato.',
    'Mastro Brace compra tutto al Bazar e ci mette sopra la sua firma.',
    'Le carpe della laguna votano alle elezioni dei fantasmi.',
    'La Custode senza Volto ha una faccia, ma la tiene in un cassetto.',
    'I quadri del castello cambiano da soli perché i Cronisti li sostituiscono di notte.',
    'Il Traghettatore non sa nuotare.',
    'Il Re Annegato si è annegato apposta, per non pagare le tasse.',
    'Sotto il Cerchio di Pietre c\'è una cantina piena di spade di legno.',
    'La nebbia esce da una macchina nascosta nel mastio.',
];

// --- LE TAVOLETTE DELLA CRONACA (una per seme, nascoste fra i muretti) ---
export const TABLETS = {
    fuoco: { name: 'Tavoletta della Brace', x: -27.5, z: 3.5, text: 'Il primo seme cadde nella forgia del mondo e la accese. Il Fuoco non chiede permesso: consuma, e da ciò che consuma rinasce. Chi porta il suo seme vive due volte, ma brucia anche la seconda.' },
    ghiaccio: { name: 'Tavoletta della Brina', x: -9.5, z: -25.5, text: 'Il secondo seme si posò sull\'acqua e la fermò. Il Ghiaccio aspetta: non attacca per primo e non perdona per secondo. Sotto la sua crosta la laguna custodisce ancora i segreti del re.' },
    palude: { name: 'Tavoletta della Radice', x: 46, z: 22, text: 'Il terzo seme sprofondò nel fango e ne fece un giardino. La Palude cresce dove gli altri marciscono. Le sue radici arrivano fino alle fondamenta del castello, e lo tengono a galla.' },
    pietra: { name: 'Tavoletta del Masso', x: 9.5, z: -81, text: 'Il quarto seme cadde sulla roccia e ci rimase. La Pietra è il seme più paziente: il castello è fatto di lei. Il Fuoco la odia, perché non riesce a consumarla.' },
    tempesta: { name: 'Tavoletta del Tuono', x: -52, z: 24, text: 'Il quinto seme non toccò mai terra. Rimbalzò fra le nuvole e diventò Tempesta. Non sta mai ferma, ed è per questo che il Ghiaccio non riesce a fermarla.' },
    spettro: { name: 'Tavoletta dell\'Eco', x: -45.5, z: 33.5, text: 'Il sesto seme cadde dove era morto qualcuno, e ne prese la voce. Lo Spettro ricorda ogni cosa, ogni duello, ogni nome. La Palude lo detesta, perché lei per crescere deve dimenticare.' },
    fango: { name: 'Tavoletta della Melma', x: -6.5, z: 83, text: 'Il settimo seme cadde nel fango e non germogliò: divenne il fango stesso. Nessuno lo teme e nessuno lo comanda. La notte in cui la corona fu completa fu lui a spezzarla. Il re aveva dimenticato che il fango sta sotto a tutto.' },
};
export const TABLET_REWARD = 'Sul retro dell\'ultima tavoletta qualcuno ha inciso una ricetta: Brace e Masso, in un martello.';

// --- IL TELEFONO BIANCO: missioni segrete ---
export const MISSIONS = {
    fango: { text: 'Infanga tre viandanti con le palle di fango.', kind: 'mud', n: 3 },
    stivale: { text: 'Pesca lo Stivale del Traghettatore. E non dirglielo.', kind: 'fishId', id: 'stivale', n: 1 },
    tombe: { text: 'Scava tre tombe nel Cimitero Sommerso.', kind: 'dig', n: 3 },
    scommessa: { text: 'Vinci una scommessa nell\'Arena.', kind: 'bet', n: 1 },
    canto: { text: 'Arriva a 8 note nel Canto delle Pietre.', kind: 'canto', n: 8 },
    pedaggio: { text: 'Batti lo Spettro del Pedaggio a parole.', kind: 'toll', n: 1 },
};
export const PHONE_LINES = ['«Pronto? Non dire il tuo nome. Ascolta soltanto.»', '«Ti chiamo dalla nebbia. Ho un lavoro per te.»', '«Sono i Cronisti. Cioè, no. Non siamo noi. Senti qua.»'];

// --- I QUADRI DEL CORTILE ---
// Fotogrammi presi dai video del canale YouTube @SputnikHomies
export const QUADRI = [
    { file: 'q01.jpg', video: '5W3Q_vCkPvg', title: 'EP 10 — Inazuma Eleven, Nicknames e Acquedotti' },
    { file: 'q02.jpg', video: 'D-pDWdZF99s', title: 'EP 13 — Preferiresti essere gay o Vannacci?' },
    { file: 'q03.jpg', video: '08vo4JMP2D8', title: 'Ep. 11 — Complotti contro i supermercati' },
    { file: 'q04.jpg', video: 'isfXnCLVDtw', title: 'EP 7 — Tanti fatti (con ospiti)' },
    { file: 'q05.jpg', video: 'lRMVztSat5I', title: 'EP 12 — Fobie e giochi di parole' },
    { file: 'q06.jpg', video: 'C991RgwapOQ', title: 'Ep. 8 — Parte 2' },
    { file: 'q07.jpg', video: 'R0fcm0J_I6I', title: 'Ep. 9 — Il tempo di una lasagna' },
    { file: 'q08.jpg', video: 'Tb3u5JmWzOw', title: 'EP 10 — Parte 2' },
    { file: 'q09.jpg', video: 'LTYQOfOo6Ds', title: 'Ep. 11 — Complotti contro i superpoteri' },
    { file: 'q10.jpg', video: 'ZheIILSYCWE', title: 'EP 12 — Fobie e giochi di parole, Parte 2' },
    { file: 'q11.jpg', video: 'mw6FeyVxTCM', title: 'Ep. 8 — Parte 1' },
    { file: 'q12.jpg', video: 'D-pDWdZF99s', title: 'EP 13 — Preferiresti essere gay o Vannacci?' },
    { file: 'q13.jpg', video: 'isfXnCLVDtw', title: 'EP 7 — Tanti fatti (con ospiti)' },
    { file: 'q14.jpg', video: '5W3Q_vCkPvg', title: 'EP 10 — Inazuma Eleven, Nicknames e Acquedotti' },
    { file: 'q15.jpg', video: 'lRMVztSat5I', title: 'EP 12 — Fobie e giochi di parole' },
    { file: 'q16.jpg', video: 'C991RgwapOQ', title: 'Ep. 8 — Parte 2' },
];
