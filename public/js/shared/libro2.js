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

import { RP, rivaPt, hutInside } from './riva.js';
const R3 = (k) => rivaPt(...RP[k]);
const HUT3 = (i) => rivaPt(...hutInside(i));

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
    // la Secca del Relitto (capitolo III): le pagine del registro delle partenze
    pag_scafo: { x: -151.2, z: 118.2, glow: 'pagina', name: 'Una pagina nello scafo', hint: 'alla Secca del Relitto, dentro lo scafo sfondato (il Traghettatore ti ci porta in barca)', label: 'Prendi la pagina bagnata', msg: 'Incastrata fra due costole, gonfia d\'acqua. L\'inchiostro si legge ancora: «Partenze dell\'ultimo inverno».' },
    pag_albero: { x: -154.3, z: 112.1, glow: 'pagina', name: 'Una pagina nella vela', hint: 'alla Secca, impigliata nella vela dell\'albero spezzato', label: 'Sfila la pagina dalla vela', msg: 'Il vento l\'aveva cucita alla vela. C\'è un nome cancellato tre volte e riscritto una quarta.' },
    pag_acqua: { x: -159.8, z: 128.8, swim: true, glow: 'pagina', name: 'Una pagina in mare', hint: 'alla Secca, in acqua dalla parte del mare aperto: a nuoto', label: 'Ripesca la pagina', msg: 'Galleggia a faccia in giù, come un annegato. La giri: è la pagina con il suo nome.' },
    terra: { x: -24.5, z: 43.5, glow: 'terra', name: 'La terra smossa', hint: 'in fondo al Prato dei Morti, il mucchio di terra che brilla', label: 'Scava la terra smossa', msg: 'Sotto due palmi di terra trovi una manciata di vetro verde, e una pietra rovesciata a faccia in giù, poco più in là.' },
    lapide: { x: -27, z: 47, glow: 'lapide', name: 'La lapide senza nome', hint: 'in fondo al Prato dei Morti, la pietra che brilla di verde', label: 'Leggi la lapide senza nome', msg: 'Sulla pietra, graffiato con un coccio di vetro verde: «I. Sono tornato. La luce era spenta.»' },
    // ---------------- LIBRO III · LA RIVA DI LÀ ----------------
    lume_riva: { x: R3('lume')[0], z: R3('lume')[1], r: 3.5, name: 'La lanterna della riva', hint: 'sulla Riva di Là, accanto al pontile (il Traghettatore ti ci porta dal Molo)', msg: '' },
    cippo_spiaggia: { x: R3('spiaggia')[0], z: R3('spiaggia')[1], glow: 'cippo', name: 'Il cippo della spiaggia', hint: 'sulla spiaggia lunga della Riva, dalla parte del villaggio', label: 'Tocca il cippo della spiaggia', msg: 'Una pietra alta come un bambino, con una freccia incisa che punta verso il faro. È calda, come se qualcuno ci avesse appena appoggiato la mano.' },
    cippo_villaggio: { x: R3('village')[0], z: R3('village')[1], glow: 'cippo', name: 'Il cippo del villaggio', hint: 'in mezzo al villaggio dei Senza Nome', label: 'Tocca il cippo del villaggio', msg: 'Sulla pietra ci sono decine di tacche, una sopra l\'altra. Ognuna, forse, una persona arrivata.' },
    cippo_monte: { x: R3('monte')[0], z: R3('monte')[1], r: 4, glow: 'cippo', name: 'Il cippo del Monte Storto', hint: 'in cima al Monte Storto', label: 'Tocca il cippo della cima', msg: 'Da quassù si vede tutto: la riva, il villaggio, il pozzo che fuma. E lontano, piccolissimo, il faro d\'oro.' },
    ricordo_nodo: { x: HUT3(0)[0], z: HUT3(0)[1], glow: 'ricordo', name: 'Un nodo da marinaio', hint: 'in una delle case vuote del villaggio', label: 'Prendi il nodo da marinaio', msg: 'Una corda annodata così stretta che non si scioglie più. Profuma di sale e di tabacco.' },
    ricordo_scarpa: { x: HUT3(2)[0], z: HUT3(2)[1], glow: 'ricordo', name: 'Una scarpa piccola', hint: 'in un\'altra casa vuota del villaggio', label: 'Prendi la scarpa piccola', msg: 'Una scarpa da bambina, con la fibbia rotta e la suola consumata solo da una parte, come chi saltava sempre sullo stesso piede.' },
    ricordo_pane: { x: HUT3(3)[0], z: HUT3(3)[1], glow: 'ricordo', name: 'Un odore di pane', hint: 'nell\'ultima casa vuota del villaggio', label: 'Raccogli l\'odore di pane', msg: 'Non c\'è niente sul tavolo. Ma l\'aria sopra il tavolo è tiepida, e sa di pane appena sfornato. La chiudi nel pugno.' },
    pozzo: { x: R3('pozzo')[0], z: R3('pozzo')[1], r: 4, night: true, name: 'Il Pozzo dei Nomi', hint: 'ai piedi del Monte Storto, di notte', msg: '' },
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
                    'Ma la mia vecchia barca si è arenata sulla Secca, a sud-ovest, la notte della tempesta, col registro dentro. Non ci torno volentieri. Però ti ci porto: chiedimelo e remiamo.'],
                btn: 'Cercherò il registro' },
            { k: 'find', spots: ['pag_scafo', 'pag_albero', 'pag_acqua'], t: 'Alla Secca del Relitto: ritrova tre pagine del registro delle partenze' },
            { k: 'talk', who: 'traghettatore', t: 'Porta le pagine bagnate al Traghettatore',
                say: ['Fammi vedere. «Ilario, guardiano del faro. Partito con la luce.» Questa è la mia mano.', 'E sotto, con un\'altra mano, storta: «Tornato. Senza nome.» Questo non l\'ho scritto io. Chiedi al Becchino: lui seppellisce quelli che il mare restituisce.'],
                btn: 'Andrò dal Becchino' },
            { k: 'talk', who: 'becchino', t: 'Chiedi al Becchino dell\'uomo tornato dal mare',
                say: ['Uno tornato dal mare? Ne ricordo uno. Le tasche piene di vetro verde, gli occhi aperti come se cercasse una luce.', 'Lo misi in fondo al Prato dei Morti, senza nome. Ma la sua terra non sta ferma: ogni notte qualcuno la smuove da sotto. Scava lì, dove brilla.'],
                btn: 'Scaverò' },
            { k: 'find', spots: ['terra'], t: 'Scava la terra smossa in fondo al Prato dei Morti' },
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
        id: 'luce', title: 'Chi Resta, Chi Parte', lv: 6, xp: 600, coins: 300, title_id: 'lucefaro', end: 'Fine del Libro II. Il faro è acceso, e la nebbia per la prima volta ha paura.',
        steps: [
            { k: 'talk', who: 'guardiana', t: 'Parla con la Guardiana: è ora di riaccendere il faro',
                say: ['Quando la luce si accenderà, la nebbia proverà a riprendersela. Si prenderà un volto per spaventarti: il suo. Quello di Ilario.', 'Io stavolta salgo con te. Fino all\'ultimo gradino, almeno.'],
                btn: 'Saliamo' },
            { k: 'boss', spot: 'lanterna', t: 'In cima al faro, di notte: affronta l\'Ombra della Nebbia' },
            { k: 'find', spots: ['lanterna'], t: 'Riaccendi il faro',
                after: ['Il faro è acceso', 'La Fiammella sale nella lente e la lente si fa sole. Il fascio esce d\'oro, attraversa la laguna e buca la nebbia fino all\'orizzonte. Per la prima volta in trecento anni si vede il mare aperto. E laggiù, dove la nebbia finiva, c\'è una terra che nessuno ricordava. Una luce piccola, sulla sua costa, risponde.'] },
            { k: 'answer', who: 'guardiana', t: 'Torna dalla Guardiana: ha una domanda per te',
                say: ['Ora la luce guiderà fuori dalla nebbia chi è pronto ad andarsene. Io resto: qualcuno deve tenerla accesa, e Ilario è qui.'],
                q: 'E tu? Resti o parti?', a: ['Resto: qualcuno deve aspettare chi torna', 'Parto, quando sarò pront{o}', 'Resto finché lei non sarà pronta'] },
        ],
    },

    // =================================================================
    //  LIBRO III · LA RIVA DI LÀ
    //  La terra oltre la nebbia: ci arrivava chi il faro guidava fuori.
    //  Da trecento anni non arriva più nessuno, e chi era già arrivato
    //  ha cominciato a dimenticare. I nomi sono finiti in un pozzo,
    //  e dal pozzo nasce la nebbia.
    // =================================================================
    {
        id: 'approdo', book: 3, title: 'L\'Altra Riva', lv: 6, xp: 650, coins: 300, title_id: 'approdato',
        steps: [
            { k: 'talk', who: 'guardiana', t: 'Parla con la Guardiana: la luce laggiù ha risposto',
                say: ['L\'hai vista anche tu. Quella luce, laggiù, oltre il mare. Ha risposto al faro.', 'Trecento anni che guardo il mare da questo molo, e nessuno ha mai risposto. Io non posso andare: il faro non si lascia solo. Ma tu sì.'],
                btn: 'Andrò a vedere' },
            { k: 'talk', who: 'traghettatore', t: 'Chiedi al Traghettatore di portarti oltre il mare aperto',
                say: ['Il mare aperto? Nessuno lo attraversa. Là fuori la nebbia è un muro, e chi ci entra rema in tondo finché non si scorda perché remava.',
                    'Però adesso c\'è il fascio d\'oro. Se remo dentro la luce, la nebbia si scosta. Chiedimelo, e andiamo. Portati qualcosa di caldo.'],
                btn: 'Remiamo dentro la luce' },
            { k: 'find', spots: ['lume_riva'], t: 'Arriva alla Riva di Là e guarda la lanterna accanto al pontile',
                after: ['La lanterna della riva', 'Una lanterna di latta su un palo storto, accesa da poco: lo stoppino è ancora lungo. Sulla latta qualcuno ha inciso una rosa dei venti. Dietro, nella casa accanto al pontile, una finestra è illuminata.'] },
            { k: 'talk', who: 'cartografa', t: 'Parla con chi abita la casa sul pontile',
                say: ['Sei venut{o} dal faro. Lo sapevo. Ho acceso la lanterna appena ho visto il fascio: trecento anni che la tengo pronta, con lo stoppino asciutto.',
                    'Questa è la Riva di Là. Ci arrivava chi il faro guidava fuori dalla nebbia. Poi il faro si è spento, e non è arrivato più nessuno. E quelli che erano già qui hanno cominciato a dimenticare.'],
                btn: 'Che cosa dimenticano?' },
        ],
    },
    {
        id: 'mappa', book: 3, title: 'La Mappa Bianca', lv: 7, xp: 700, coins: 320,
        steps: [
            { k: 'talk', who: 'cartografa', t: 'Ascolta la Cartografa: che cosa si dimentica, sulla Riva?',
                say: ['Tutto. Da dove vengono, chi hanno lasciato. Io disegno l\'isola da cui venite, a memoria, perché chi arriva non si scordi la strada. Ma ogni mattina la nebbia mi cancella la carta. Guarda: bianca.',
                    'Una mappa, per restare, ha bisogno di punti fermi. Ne piantai tre quando ero giovane: un cippo sulla spiaggia, uno nel villaggio, uno in cima al Monte Storto. Vai a toccarli, e dimmi che ci sono ancora.'],
                btn: 'Andrò ai cippi' },
            { k: 'find', spots: ['cippo_spiaggia', 'cippo_villaggio', 'cippo_monte'], t: 'Tocca i tre cippi della Riva: la spiaggia, il villaggio, la cima del Monte Storto' },
            { k: 'give', who: 'cartografa', mat: 'pergamena', n: 3, t: 'Porta tre Pergamene Benedette alla Cartografa: la nebbia non le mangia',
                say: ['I cippi reggono. Adesso mi serve una carta che la nebbia non mangi. Sul vostro molo arrivano bottiglie con dentro Pergamena Benedetta: tre fogli, e la mappa terrà.'],
                btn: 'Dalle tre Pergamene' },
            { k: 'talk', who: 'cartografa', t: 'Guarda la Cartografa disegnare',
                say: ['Il molo. Il ponte. Il castello con la sua torre storta. La forgia di quel brontolone. Il faro, d\'oro.', 'Resta. Non sparisce. Per la prima volta in trecento anni, la carta tiene.',
                    'Ma guarda qui, in fondo: le case del villaggio. Le so disegnare, ma non so scriverci sopra i nomi. Nessuno qui se li ricorda più.'],
                btn: 'Andrò al villaggio', sfx: 'quill',
                after: ['La Mappa della Riva', 'Sulla pergamena l\'isola c\'è tutta, piccola e precisa, con una freccia d\'oro che parte dal faro e attraversa il mare. In fondo, cinque case senza nome.'] },
        ],
    },
    {
        id: 'senzanome', book: 3, title: 'I Senza Nome', lv: 8, xp: 750, coins: 340,
        steps: [
            { k: 'talk', who: 'fornaio', t: 'Al villaggio dei Senza Nome: parla con l\'uomo che impasta senza farina',
                say: ['Buongiorno. O buonasera. Qui non si capisce mai.', 'Come mi chiamo? Lo avevo ieri. Lo tenevo in tasca, come una chiave. Adesso la tasca è bucata.',
                    'Mi restano tre cose, che ho nascosto nelle case vuote per non perderle: un nodo da marinaio, una scarpa piccola, un odore di pane. Me le riporti? Forse, tutte insieme, fanno un nome.'],
                btn: 'Te le riporto' },
            { k: 'find', spots: ['ricordo_nodo', 'ricordo_scarpa', 'ricordo_pane'], t: 'Ritrova nelle case vuote i tre ricordi dell\'uomo senza nome' },
            { k: 'talk', who: 'fornaio', t: 'Riporta i tre ricordi all\'uomo senza nome',
                say: ['Il nodo. Lo faceva mio padre, sul molo, per legare le barche. La scarpa era di mia figlia: saltava sempre sullo stesso piede. E il pane lo facevo io, la mattina presto, prima che salisse la nebbia.',
                    'Il mio nome però non c\'è. Era scritto da qualche parte. Lo scriveva un uomo con la barca, quando partivamo, in un libro grosso.'],
                btn: 'Il registro del Traghettatore' },
            { k: 'talk', who: 'traghettatore', t: 'Torna all\'isola: chiedi al Traghettatore il nome del fornaio',
                say: ['Un fornaio, con un padre marinaio e una figlia piccola? Dammi le pagine che hai ripescato alla Secca.',
                    '«Tobia, fornaio. Partito con la luce, la terza notte di marzo. Ha lasciato il pane caldo per il viaggio del barcaiolo.» Sì. Il pane me lo lasciò davvero. Era buono.'],
                btn: 'Porterò il nome a Tobia' },
            { k: 'talk', who: 'fornaio', t: 'Riporta il suo nome all\'uomo del villaggio',
                say: ['Tobia.', 'Tobia. Ma certo. Come si fa a perdere una cosa così corta?',
                    'Grazie. Adesso guarda gli altri: si sono messi tutti sulla porta, al buio. Hanno sentito un nome tornare e lo vogliono anche loro. Ma i loro non sono nel registro. Li hanno buttati nel Pozzo. Lo facevamo tutti, appena arrivati.'],
                btn: 'Che cos\'è il Pozzo?',
                after: ['Tobia', 'Dalla casa di Tobia esce, per la prima volta da trecento anni, odore di pane vero. Nelle altre case qualcuno accende una candela, e aspetta.'] },
        ],
    },
    {
        id: 'pozzo', book: 3, title: 'Il Pozzo dei Nomi', lv: 9, xp: 800, coins: 360,
        steps: [
            { k: 'talk', who: 'cartografa', t: 'Chiedi alla Cartografa del Pozzo',
                say: ['Ai piedi del Monte Storto c\'è un pozzo. Chi arriva qui ci butta dentro il proprio nome: così il dolore di quello che ha lasciato non lo segue. Lo facevano tutti. L\'ho fatto anch\'io.',
                    'Ma un nome nel pozzo non muore. Diventa nebbia. Trecento anni di nomi buttati: ecco da dove viene la nebbia che copre la tua isola. Scendi a guardare, di notte, quando il pozzo respira.'],
                btn: 'Scenderò al pozzo' },
            { k: 'find', spots: ['pozzo'], t: 'Scendi al Pozzo dei Nomi, di notte',
                after: ['Il Pozzo dei Nomi', 'Dal pozzo sale la nebbia, lenta, come il fiato di un animale che dorme. Dentro, mille voci sussurrano ognuna una parola sola. Sul bordo c\'è un secchio senza corda. E qualcosa, sotto, ti ha sentito arrivare.'] },
            { k: 'give', who: 'cartografa', mat: 'ecto', n: 3, t: 'Porta tre Ectoplasmi alla Cartografa: farà una corda che la nebbia non può tagliare',
                say: ['Un secchio senza corda. Certo: la nebbia le mangia tutte. Ma non può mangiare sé stessa.', 'Portami tre Ectoplasmi, quelli dei fuochi fatui del tuo cimitero, e li filo in una corda. Poi scendi. E stai attent{o}: il pozzo ha una madre.'],
                btn: 'Dalle tre Ectoplasmi' },
            { k: 'boss', spot: 'pozzo', t: 'Al Pozzo dei Nomi, di notte: affronta la Madre della Nebbia' },
            { k: 'find', spots: ['pozzo'], t: 'Cala il secchio nel Pozzo dei Nomi',
                after: ['I nomi', 'Cali il secchio con la corda di ectoplasma. Torna su pesante, pieno di una luce grigia che si muove e sussurra. Sono i nomi. Tutti. Fra le dita ti si posa una parola sola, leggera come cenere: è il nome di qualcuno che non hai mai conosciuto, e per un attimo ti manca.'] },
        ],
    },
    {
        id: 'nives', book: 3, title: 'Il Nome della Cartografa', lv: 10, xp: 1000, coins: 500, title_id: 'nomi',
        end: 'Fine del Libro III. I nomi tornano a casa, e la nebbia si fa più sottile, da una riva all\'altra.',
        steps: [
            { k: 'talk', who: 'cartografa', t: 'Porta il secchio dei nomi alla Cartografa',
                say: ['Li hai presi. Tutti quei nomi, in un secchio.', 'Il mio è lì dentro, da qualche parte. Ma non saprei riconoscerlo: l\'ho buttato troppo tempo fa. Ricordo solo che avevo una sorella, e che lei non partì.'],
                btn: 'Una sorella che non partì?' },
            { k: 'talk', who: 'guardiana', t: 'Torna al Faro: chiedi alla Guardiana di una donna che disegna mappe',
                say: ['Una donna che disegna mappe? Con la mano sinistra, e una macchia d\'inchiostro sul pollice che non va più via?',
                    'Mia sorella. Partì con la luce, la primavera prima di Ilario. Io restai, perché qualcuno doveva tenere acceso il faro. Le dissi che l\'avrei raggiunta. Poi spensi tutto.',
                    'Si chiama Nives. Diglielo. Non per me: per lei.'],
                btn: 'Le porterò il suo nome' },
            { k: 'find', spots: ['lume_riva'], t: 'Sulla Riva di Là: versa i nomi nella lanterna, e il primo sarà il suo',
                after: ['La lanterna dei nomi', 'Versi la luce grigia nella lanterna di latta. La fiamma diventa d\'oro come il faro, e fra le due rive si tende un filo di luce sopra il mare. Lungo il filo la nebbia si apre, e per la prima volta dal faro si vede la Riva, e dalla Riva si vede il faro.'] },
            { k: 'answer', who: 'cartografa', t: 'Di\' alla Cartografa il suo nome',
                say: ['Nives.', 'Nives. Me lo diceva lei, così, con l\'accento sulla prima. Aveva i capelli bianchi già a vent\'anni, e non sapeva stare ferma. E io sono partita senza voltarmi.',
                    'Il secchio è ancora mezzo pieno. Li hai tirati su tu: decidi tu.'],
                q: 'Che ne facciamo degli altri nomi del pozzo?', a: ['Ridiamoli a tutti: anche il dolore fa parte di un nome', 'Solo a chi viene a chiederlo', 'Al faro: li tenga accesi la luce, finché qualcuno li cerca'] },
        ],
    },
];
// dove finisce ciascun libro (il Libro III continua lo stesso stato, dal capitolo 5)
export const L2_END = 5;
export const L3_END = L2_CHAPTERS.length;
export const bookOf = (ch) => (ch < L2_END ? 2 : 3);
export const chapterNo = (ch) => (ch < L2_END ? ch : ch - L2_END);

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
