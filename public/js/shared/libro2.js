// =====================================================================
//  IL ROMANZO DELLA NEBBIA, LIBRO II · IL FARO SPENTO (client + server)
//  Cinque capitoli, ognuno una fila di passi da fare in ordine.
//  Si gioca anche senza aver finito il Libro I: la Guardiana non chiede
//  a nessuno da dove viene.
//
//  Tipi di passo:
//   talk   parla con «who» e premi il bottone
//   give   consegna a «who» n materiali «mat»
//   find   tocca i luoghi «spots» (in qualunque ordine)
//   count  fai n volte una cosa dell'isola («ev»: fish, dig, gather…), da quando il passo è aperto
//   boss   vinci il duello che si apre in «spot»
//   answer rispondi alla domanda di «who»: la risposta resta scritta nel libro
// =====================================================================

// i luoghi che si toccano: «glow» = un bagliore verde li segnala mentre servono
export const L2_SPOTS = {
    faro: { x: 150, z: -163.4, glow: 'coccio', name: 'Il coccio dello scoglio', hint: 'sulla riva del Faro, dalla parte opposta al molo', label: 'Raccogli il Coccio di Lanterna', msg: 'Vetro verde, tiepido, che pulsa piano come un cuore.' },
    spiaggia: { x: 82, z: 26, glow: 'coccio', name: 'Il coccio della spiaggia', hint: 'sulla spiaggia a est dell\'isola grande', label: 'Raccogli il Coccio di Lanterna', msg: 'Era mezzo sepolto nella sabbia nera. Appena lo tocchi smette di tremare.' },
    fossato: { x: 28, z: -76, swim: true, glow: 'coccio', name: 'Il coccio del castello', hint: 'nell\'acqua sotto le mura del castello: ci si arriva solo a nuoto', label: 'Raccogli il Coccio di Lanterna', msg: 'Galleggiava contro le mura come se aspettasse qualcuno. Ti si scalda in mano.' },
    porta: { x: 135.1, z: -145, r: 4.5, name: 'La porta del faro', hint: 'la porta del Faro Spento', msg: '' },
    lanterna: { x: 138, z: -150, r: 5, y: 16, night: true, name: 'La lanterna del faro', hint: 'in cima al Faro Spento, di notte', msg: '' },
    brace_viva: { x: -23.2, z: 5.6, glow: 'lume', name: 'Una brace viva', hint: 'fra i carboni della Forgia di Vulcano', label: 'Prendi una brace viva', msg: 'La prendi a mani nude e non brucia. Brace, da dietro l\'incudine, fa finta di non vedere.' },
    fatuo: { x: -34, z: 39, night: true, glow: 'lume', name: 'Un fuoco fatuo', hint: 'nel Cimitero Sommerso, di notte', label: 'Chiudi il fuoco fatuo nella mano', msg: 'Ti gira intorno tre volte, poi si posa nel palmo. Sa di erba bagnata.' },
    luna: { x: -46.5, z: -6, night: true, glow: 'lume', name: 'Un raggio di luna', hint: 'sulla pietra più alta del Cerchio di Pietre, di notte', label: 'Raccogli il raggio di luna', msg: 'La luce della luna si piega come un nastro e ti si arrotola al polso.' },
    lapide: { x: -27, z: 47, glow: 'lapide', name: 'La lapide senza nome', hint: 'in fondo al Prato dei Morti, la pietra che brilla di verde', label: 'Leggi la lapide senza nome', msg: 'Sulla pietra, graffiato con un coccio di vetro verde: «I. Sono tornato. La luce era spenta.»' },
};

export const L2_CHAPTERS = [
    {
        id: 'porta', title: 'La Porta Chiusa', lv: 2, xp: 300, coins: 120, title_id: 'portinaio',
        steps: [
            { k: 'talk', who: 'guardiana', t: 'Parla con la Guardiana del Faro',
                say: ['La chiave l\'ho data a un fabbro. Uno con le mani nere e la voce di brace. Ma i vetri della lanterna, quando il faro si spense, scoppiarono e la marea se li portò via.',
                    'Una chiave per questa porta si forgia solo col vetro della sua luce. Trovami i cocci, trovami il fabbro. Io aspetto: è l\'unica cosa che so fare bene.'],
                btn: 'Troverò la chiave' },
            { k: 'talk', who: 'brace', t: 'Chiedi a Mastro Brace della chiave del faro (Forgia di Vulcano)',
                say: ['La chiave del faro? Ah. Sì. La fusi io, trecento anni fa: la Guardiana voleva che nessuno entrasse più, e il ferro ubbidisce a chi lo scalda.',
                    'Rifarla si può. Ma il ferro da solo non apre quella serratura: ci vogliono i vetri della lanterna. Tre cocci, li ha presi il mare. Uno è rimasto sullo scoglio del faro, uno sulla spiaggia a est. Il terzo è affondato sotto le mura del castello: dovrai bagnarti.'],
                btn: 'Cercherò i cocci' },
            { k: 'find', spots: ['faro', 'spiaggia', 'fossato'], t: 'Ritrova i tre Cocci di Lanterna' },
            { k: 'talk', who: 'brace', t: 'Porta i tre cocci a Mastro Brace',
                say: ['Eccoli. Senti come scaldano le mani? Il vetro di quella lanterna non si è mai raffreddato. Dammi un momento e un po\' di fuoco.'],
                btn: 'Forgia la chiave', sfx: 'anvil', after: ['La Chiave del Faro', 'Ferro nero e vetro verde, con i denti a forma di corona spezzata. Ronza piano, come un faro lontano.'] },
            { k: 'find', spots: ['porta'], t: 'Torna al Faro Spento e apri la porta',
                after: ['La porta del faro si apre', 'La chiave gira da sola. Dentro c\'è buio e odore di sale, e una scala che sale a spirale. Lassù, qualcosa trattiene il fiato.'] },
        ],
    },
    {
        id: 'scala', title: 'La Scala nel Buio', lv: 3, xp: 350, coins: 140,
        steps: [
            { k: 'talk', who: 'guardiana', t: 'Parla con la Guardiana: che cosa respira lassù?',
                say: ['Lassù c\'è la Fiammella. È quello che resta della luce del faro: un fuoco grande come un pugno, che dorme dentro la lente.',
                    'Di giorno non si sveglia nemmeno se le urli. Sali di notte, e parlale piano. Io non salgo più. Non chiedermi perché.'],
                btn: 'Salirò stanotte' },
            { k: 'find', spots: ['lanterna'], t: 'Sali in cima al faro, di notte, e sveglia la Fiammella',
                after: ['La Fiammella', '«Chi sei? Non sei lei. Lei non sale più.» La fiammella apre un occhio verde. «Ho fame. Mi nutrivo dei ricordi di chi partiva. Portami tre lumi ricordati: una brace viva, un fuoco fatuo, un raggio di luna.»'] },
            { k: 'find', spots: ['brace_viva', 'fatuo', 'luna'], t: 'Raccogli i tre lumi: una brace viva, un fuoco fatuo, un raggio di luna' },
            { k: 'find', spots: ['lanterna'], t: 'Porta i tre lumi alla Fiammella, di notte',
                after: ['La Fiammella mangia', 'Il fuoco cresce fino a riempire mezza lente. «Ora ricordo. È stata lei a spegnermi. Per lui. Chiedile di Ilario, se hai coraggio.»'] },
        ],
    },
    {
        id: 'registro', title: 'Il Nome nel Registro', lv: 4, xp: 400, coins: 160,
        steps: [
            { k: 'talk', who: 'guardiana', t: 'Chiedi alla Guardiana di Ilario',
                say: ['Chi ti ha detto quel nome? La Fiammella. Certo. Le fiamme non sanno tenere niente per sé.', 'Vattene. Torna in barca. Non ho niente da raccontarti.'],
                btn: 'Me ne vado. Per ora.' },
            { k: 'talk', who: 'traghettatore', t: 'Chiedi al Traghettatore di Ilario',
                say: ['Ilario. Lo portai io al faro, l\'ultima notte, prima che si spegnesse. Scrivo tutto nel registro delle partenze: chi va, chi torna.',
                    'Ma la mia vecchia barca è affondata sotto il molo, col registro dentro. Pesca: le pagine tornano a galla, prima o poi.'],
                btn: 'Pescherò le pagine' },
            { k: 'count', ev: 'fish', n: 3, t: 'Pesca tre volte al Molo: con i pesci tornano a galla le pagine del registro' },
            { k: 'talk', who: 'traghettatore', t: 'Porta le pagine bagnate al Traghettatore',
                say: ['Fammi vedere. «Ilario, guardiano del faro. Partito con la luce.» Questa è la mia mano.', 'E sotto, con un\'altra mano, storta: «Tornato. Senza nome.» Questo non l\'ho scritto io. Chiedi al Becchino: lui seppellisce quelli che il mare restituisce.'],
                btn: 'Andrò dal Becchino' },
            { k: 'talk', who: 'becchino', t: 'Chiedi al Becchino dell\'uomo tornato dal mare',
                say: ['Uno tornato dal mare? Ne ricordo uno. Le tasche piene di vetro verde, gli occhi aperti come se cercasse una luce.', 'Lo misi in fondo al Prato dei Morti, senza nome. Scava un po\' con me, e la terra ti dirà dove.'],
                btn: 'Scaviamo' },
            { k: 'count', ev: 'dig', n: 2, t: 'Scava due tombe nel Prato dei Morti' },
            { k: 'find', spots: ['lapide'], t: 'Trova la lapide senza nome, in fondo al Prato dei Morti' },
            { k: 'talk', who: 'guardiana', t: 'Racconta alla Guardiana della lapide',
                say: ['Tornato. È tornato.', 'Era partito con la luce, come tutti quelli che erano pronti. Io no: io volevo che restasse. Così quella notte spensi il faro, perché nessun altro mi lasciasse.',
                    'E lui si perse nella nebbia e tornò indietro, cercando una luce che io avevo spento. Trecento anni ad aspettare uno che era già qui.'],
                btn: 'Riaccendiamola. Per lui.' },
        ],
    },
    {
        id: 'lente', title: 'La Lente Incrinata', lv: 5, xp: 450, coins: 180,
        steps: [
            { k: 'find', spots: ['lanterna'], t: 'Sali dalla Fiammella, di notte: che cosa le serve per bruciare davvero?',
                after: ['La lente incrinata', '«Brucio, ma la mia luce esce storta: la lente è incrinata dalla notte in cui lei mi spense. Brace sa fondere il vetro. Gli serviranno schegge che cantano e perle della laguna.»'] },
            { k: 'give', who: 'brace', mat: 'frammento', n: 3, t: 'Porta tre Frammenti di Runa a Mastro Brace (si raccolgono al Cerchio di Pietre)',
                say: ['Una lente nuova? Il vetro lo fondo con le schegge che cantano: tre Frammenti di Runa. Così la luce, uscendo, canterà anche lei.'],
                btn: 'Dagli tre Frammenti' },
            { k: 'give', who: 'sarta', mat: 'perla', n: 2, t: 'Porta due Perle della Laguna alla Sarta Spettrale: le macinerà per lucidare il vetro',
                say: ['Brace ti manda da me? Sa che solo io so ridurre una perla in polvere senza farla piangere. Due perle, e la lente sarà liscia come acqua ferma.'],
                btn: 'Dalle due Perle' },
            { k: 'talk', who: 'brace', t: 'Torna da Mastro Brace con la polvere di perla',
                say: ['La polvere della Sarta. Bene. Stai indietro: il vetro che canta schizza.'], btn: 'Fondi la lente', sfx: 'anvil',
                after: ['La Lente del Faro', 'Un disco di vetro verde, pesante e tiepido. Se lo avvicini all\'orecchio, canta una nota sola.'] },
            { k: 'find', spots: ['lanterna'], t: 'Monta la lente nuova nella lanterna, di notte',
                after: ['La lente è al suo posto', 'Il vetro si salda da solo, con un suono di campana. Fuori, la nebbia si ritrae di un passo. «Adesso sono pronta» dice la Fiammella. «Ma la nebbia non mi lascerà accendere senza combattere.»'] },
        ],
    },
    {
        id: 'luce', title: 'Chi Resta, Chi Parte', lv: 6, xp: 600, coins: 300, title_id: 'lucefaro', last: true,
        steps: [
            { k: 'talk', who: 'guardiana', t: 'Parla con la Guardiana: è ora di riaccendere il faro',
                say: ['Quando la luce si accenderà, la nebbia proverà a riprendersela. Si prenderà un volto per spaventarti: il suo. Quello di Ilario.', 'Io stavolta salgo con te. Fino all\'ultimo gradino, almeno.'],
                btn: 'Saliamo' },
            { k: 'boss', spot: 'lanterna', t: 'In cima al faro, di notte: affronta l\'Ombra della Nebbia' },
            { k: 'find', spots: ['lanterna'], t: 'Riaccendi il faro',
                after: ['Il faro è acceso', 'La Fiammella sale nella lente e la lente si fa sole. Il fascio esce d\'oro, attraversa la laguna e buca la nebbia fino all\'orizzonte. Per la prima volta in trecento anni, si vede il mare aperto.'] },
            { k: 'answer', who: 'guardiana', t: 'Torna dalla Guardiana: ha una domanda per te',
                say: ['Ora la luce guiderà fuori dalla nebbia chi è pronto ad andarsene. Io resto: qualcuno deve tenerla accesa, e Ilario è qui.'],
                q: 'E tu? Resti o parti?', a: ['Resto: qualcuno deve aspettare chi torna', 'Parto, quando sarò pront{o}', 'Resto finché lei non sarà pronta'] },
        ],
    },
];
export const L2_END = L2_CHAPTERS.length;

export function newL2() { return { ch: 0, i: 0, got: [], cnt: 0, ans: [] }; }
// il vecchio formato (solo capitolo I: { s, cocci }) diventa quello nuovo
export function fixL2(st) {
    if (!st) return newL2();
    if (st.ch != null) return st;
    if ((st.s || 0) >= 5) return { ch: 1, i: 0, got: [], cnt: 0, ans: [] };
    return { ch: 0, i: Math.min(4, st.s || 0), got: st.s === 2 ? [...(st.cocci || [])] : [], cnt: 0, ans: [] };
}
export const l2Step = (st) => L2_CHAPTERS[st?.ch]?.steps[st.i] || null;
// a che punto del libro sei, in un numero solo (per porte, lanterne e luci che cambiano)
export const l2At = (st) => (st?.ch ?? 0) * 100 + (st?.i ?? 0);
export const L2AT = (ch, i = 0) => ch * 100 + i;
// accordo al maschile o al femminile
export const gx2 = (txt, sex) => String(txt).replace(/\{o\}/g, sex === 'f' ? 'a' : 'o');

// la prossima cosa da fare, in una riga
export function l2Next(st) {
    const S = l2Step(st);
    if (!S) return null;
    if (S.k === 'find' && S.spots.length > 1) {
        const left = S.spots.filter(k => !st.got.includes(k));
        return `${S.t} (${S.spots.length - left.length}/${S.spots.length}) · ${L2_SPOTS[left[0]]?.hint || ''}`;
    }
    if (S.k === 'count') return `${S.t} (${Math.min(st.cnt, S.n)}/${S.n})`;
    return S.t;
}
