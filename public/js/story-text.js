// =====================================================================
//  IL ROMANZO DELLA NEBBIA: le parole
//  Le pagine del Libro dell'Approdo (seconda persona, con nome, seme,
//  sesso e risposte del giocatore) e le battute degli abitanti.
//  La voce che racconta è quella dei Cronisti della Stanza Bianca.
//  Il segreto non si dice mai: ogni abitante, aprendo il suo capitolo,
//  ripete con parole sue la risposta del capitolo prima («eco»).
// =====================================================================

export const SEME_DI = { fuoco: 'del Fuoco', ghiaccio: 'del Ghiaccio', palude: 'della Palude', pietra: 'della Pietra', tempesta: 'della Tempesta', spettro: 'dello Spettro', fango: 'del Fango' };

// c = { name, o ('o' | 'a'), lui, seme, ans[], nome } — vedi ctx() in story-ui.js
const P = (...p) => p;

export const TEXT = {
    approdo: {
        who: 'Il Ratto dei Cronisti',
        open: (c) => ['I Cronisti mi hanno detto di darti questo. È vuoto. Dicono che lo riempirai tu.', 'Si apre col tasto G. Io non lo leggo. Quasi mai.'],
        after: (c) => ['Ecco, la prima pagina si è già scritta da sola. Le altre no: quelle le scrivi andando in giro.', 'Comincia da Mastro Brace, alla Forgia. Di solito si comincia da lì: è l\'unico posto caldo.'],
        pages: {
            end: (c) => P(
                `Non ricordi di essere salit${c.o} sulla barca. Ricordi soltanto il remo, che entrava nell'acqua senza fare rumore, e la nebbia, che si apriva davanti alla prua e si richiudeva dietro di voi come una porta.`,
                `Il Traghettatore non ti ha chiesto il nome. Ti ha chiesto di non parlare, perché la nebbia si offende. Poi, quando la luna è comparsa sopra il castello affondato, ha detto che quel re voleva tutto, e che la laguna se l'era bevuto.`,
                `Avevi in mano una carta del seme ${c.seme}. L'avevi stretta per tutto il viaggio, anche dormendo. Sopra c'era una faccia che hai riconosciuto soltanto dopo, specchiandoti nell'acqua del molo.`,
                `«Il nome lo ritroverai» ha detto lui, spingendo la barca di nuovo nella nebbia. «Qui tutti ritrovano qualcosa.» Così hai cominciato a camminare, ${c.name}. Senza sapere chi eri, ma sapendo da che parte andare.`,
                `In piazza ti aspettava un ratto con un libro vuoto. È questo.`,
            ),
            note: 'Il Traghettatore dice così a tutti. Però a te l\'ha detto più piano.',
        },
    },

    brace: {
        echo: (c) => [`Sei appena arrivat${c.o} e guardi già le lame. La nebbia porta sempre gente con le mani vuote.`],
        open: (c) => ['Ferro, legno, osso: tutto si piega se lo scaldi abbastanza. Anche le persone.', 'Fatti forgiare qualcosa di tuo, e poi fammelo vedere in mano: nell\'Arena c\'è un Fantasma che non aspetta altro.'],
        wait: (c) => ['Non ancora. Prima un\'arma nuova, poi il Fantasma. Il ferro non ha fretta, io sì.'],
        ask: (c) => ['Bene. Adesso dimmi una cosa, e non pensarci troppo.'],
        reply: [
            (c) => 'Allora forgia cose che restano. Le persone dimenticano, il ferro no.',
            (c) => 'Allora non affezionarti a nessuna arma. Nemmeno a questa.',
            (c) => 'Allora smetti di stringerla così forte. Si vede da qui.',
        ],
        after: (c) => ['Lo sai che cosa forgio, la notte? Una chiave. Da trecento anni. Non ricordo più che cosa apriva.', 'E la corona del re… quella l\'ho fatta io. Non dirlo a nessuno. Anzi, dillo pure: tanto non ci crede nessuno.'],
        pages: {
            start: (c) => P(
                `Mastro Brace non ti ha chiesto chi fossi. Ti ha guardato le mani, poi la carta, e ha detto che la nebbia porta sempre gente con le mani vuote.`,
                `La forgia era l'unico posto caldo dell'isola. Lui batteva il ferro come si batte su una porta chiusa, aspettando che qualcuno risponda. Ti ha chiesto di farti forgiare un'arma e di mostrargliela in mano, contro il Fantasma dell'Arena.`,
            ),
            end: (c) => P(
                `Hai vinto, e Brace ha guardato la tua lama come si guarda qualcuno che parte. Poi ti ha chiesto che cosa vorresti, se potessi avere una cosa sola.`,
                `«${gxx(STORY_ANS.brace[c.ans[1]], c)}» hai risposto, senza pensarci. ${['Lui ha detto di forgiare cose che restano, perché le persone dimenticano e il ferro no.', 'Lui ha detto di non affezionarti a nessuna arma, nemmeno a quella.', 'Lui ha detto di smettere di stringerla così forte, perché si vedeva da lontano.'][c.ans[1]]}`,
                `Più tardi, con il fuoco basso, ti ha confessato che da trecento anni prova a forgiare una chiave, e che non ricorda più che cosa apriva. E che la corona del re l'aveva fatta lui. Mentre lo diceva aveva la tua stessa faccia di quando hai risposto. Forse era la luce del fuoco.`,
            ),
            note: 'Brace dice a tutti che la corona l\'ha fatta lui. È l\'unica cosa che dice sempre uguale.',
        },
    },

    brina: {
        echo: (c) => [[
            'Uno che vuole essere ricordato rema piano: la scia dura di più.',
            `Chi vuole essere liber${c.o} non sale mai due volte sulla mia barca. Tu ci sei salit${c.o} una volta sola, per ora.`,
            'Chi vuole essere amato tiene la lanterna accesa anche di giorno. Lo so perché lo faccio anch\'io.',
        ][c.ans[1] ?? 0]],
        open: (c) => ['Di notte, sotto le assi, nuota qualcosa di fatto di nebbia. E ogni tanto il mare porta bottiglie.', 'Pescami tre pesci e ritrova due pagine di quel diario. Poi torna. Di notte: certe cose si dicono solo col buio.'],
        night: (c) => ['È ancora giorno. Torna quando cala il buio: certe cose si dicono solo di notte.'],
        wait: (c) => ['Tre pesci e due pagine. La laguna non ha fretta: aspetta anche te.'],
        ask: (c) => ['Il naufrago aspettava una barca che non ero io. E tu, invece?'],
        reply: [
            (c) => 'Allora resta vicino al molo. Chi torna, passa sempre di qui.',
            (c) => `Nessuno si sente pront${c.o}. Si parte lo stesso, e ci si prepara per strada.`,
            (c) => 'Lo dico anch\'io, da trecento anni. Non so ancora se è vero.',
        ],
        after: (c) => ['Io non so nuotare. E non ho mai messo piede sull\'isola.', 'Il re dorme ancora sotto il ghiaccio della laguna, con la corona in testa. Lo sento, quando ci remo sopra.'],
        pages: {
            start: (c) => P(
                `Sei tornat${c.o} al molo. Il Traghettatore era seduto sulla barca, come se non ne fosse mai sceso. Ha detto che di notte, sotto le assi, nuota qualcosa di fatto di nebbia, e che il mare porta bottiglie con dentro le pagine di un diario.`,
                `Ti ha chiesto tre pesci e due di quelle pagine. Il diario era di un naufrago, l'ultimo che provò a tornare indietro a nuoto.`,
            ),
            end: (c) => P(
                `Era notte. Hai letto le pagine del naufrago a voce alta, e il Traghettatore ascoltava con gli occhi chiusi. Poi ti ha chiesto che cosa aspetti da tanto tempo.`,
                `«${gxx(STORY_ANS.brina[c.ans[2]], c)}» gli hai detto. ${['Lui ha risposto di restare vicino al molo, perché chi torna passa sempre di lì.', 'Lui ha risposto che nessuno si sente pronto: si parte lo stesso, e ci si prepara per strada.', 'Lui ha risposto che lo dice anche lui da trecento anni, e che non sa ancora se è vero.'][c.ans[2]]}`,
                `Poi ti ha confessato di non saper nuotare, e di non aver mai messo piede sull'isola. Sotto il ghiaccio della laguna, ha detto, il re dorme ancora con la corona in testa.`,
            ),
            note: 'Gli abbiamo chiesto perché non scende mai. Ha detto che qualcuno deve pur tenere la barca.',
        },
    },

    radice: {
        echo: (c) => [[
            'Aspetti che qualcuno torni? Da qui non torna nessuno. Però qualcuno arriva sempre.',
            `Pront${c.o} per cosa? Per scavare, spero. Ecco la vanga.`,
            'Il tempo che aspetta te. Bella frase. La scrivo su una lapide, se permetti.',
        ][c.ans[2] ?? 0]],
        open: (c) => ['Ogni epitaffio dice quante tombe maledette ci sono intorno. Scavane cinque.', 'Sotto non ci sono morti, se è questo che temi. Ci sono cose peggio.'],
        wait: (c) => ['Cinque tombe. Ne hai scavate meno. Le conto io, le tombe: è il mio mestiere.'],
        ask: (c) => ['Hai visto la tomba senza epitaffio? Quella con il tuo seme inciso sopra. Dentro c\'è un nome. Il tuo. La terra l\'ha reso illeggibile, ma è lì.', 'Allora te lo chiedo io:'],
        reply: [
            (c) => 'Una paura. La metto qui sotto, accanto alle altre. Non ti seguirà.',
            (c) => 'Una persona. Le persone non si seppelliscono. Si seppelliscono i nomi, e loro restano.',
            (c) => 'Niente? Allora tienilo stretto, quel nome. Io lo ricoprirò piano.',
        ],
        after: (c) => ['Sotto le tombe ci sono i nomi che la nebbia toglie a chi arriva. Li seppellisco io, perché non si perdano del tutto.', 'Le radici della palude li tengono al caldo. Anche il tuo.'],
        pages: {
            start: (c) => P(
                `Ossobuco ti ha prestato la vanga senza chiederti niente, come si presta un ombrello a uno sconosciuto. Ha detto che sotto le tombe del Prato non ci sono morti, ma cose peggio.`,
                `Ti ha chiesto di scavarne cinque. Ogni epitaffio dice quante tombe maledette ci sono intorno: leggi, poi scava, oppure scava, poi corri.`,
            ),
            end: (c) => P(
                `Una delle tombe non aveva epitaffio. Sopra c'era inciso il simbolo del tuo seme, e sotto, nella terra, un nome che non si leggeva più. Il Becchino ha detto che era il tuo.`,
                `Ti ha chiesto che cosa vorresti dimenticare. «${gxx(STORY_ANS.radice[c.ans[3]], c)}» hai risposto. ${['Lui l\'ha messa sotto terra, accanto alle altre paure, e ha detto che non ti avrebbe seguito.', 'Lui ha detto che le persone non si seppelliscono: si seppelliscono i nomi, e le persone restano.', 'Lui ha detto di tenerlo stretto, quel nome, e ha ricoperto la tomba piano.'][c.ans[3]]}`,
                `Sotto il Prato dei Morti, ha spiegato, ci sono i nomi che la nebbia toglie a chi arriva. Le radici della palude li tengono al caldo. Mentre tornavi, ti sei accort${c.o} che fischiettavi la stessa canzone che fischietta lui.`,
            ),
            note: 'Il Becchino giura di non aver mai letto un nome. Però li sa tutti.',
        },
    },

    masso: {
        who: 'Le Pietre',
        echo: (c) => [[
            'Hai lasciato una paura nel prato. Le pietre l\'hanno sentita passare: era leggera.',
            'Hai seppellito un nome. Le pietre ricordano tutti i nomi, ma non li dicono mai.',
            'Vuoi ricordare tutto. Anche noi. È per questo che non ci muoviamo.',
        ][c.ans[3] ?? 0]],
        open: (c) => ['Cantavamo così, prima che il castello affondasse.', 'Leggi la Tavoletta del Masso, in fondo al ponte, davanti al castello. Poi canta con noi: otto note, senza sbagliare.'],
        wait: (c) => ['La tavoletta, e otto note. Le pietre aspettano: è l\'unica cosa che sanno fare bene.'],
        ask: (c) => ['Il castello è rimasto a metà fuori dall\'acqua perché noi non abbiamo mai mollato la presa. E tu…'],
        reply: [
            (c) => `Allora sei fatt${c.o} della nostra stessa pietra. La testa dura regge i castelli.`,
            (c) => 'La parola. Una parola data pesa più di un masso.',
            (c) => 'Il modo di ridere. Anche le pietre ridono, ma ci mettono mille anni.',
        ],
        after: (c) => ['La Pietra è il seme più paziente. Il Fuoco la odia, perché non riesce a consumarla.'],
        pages: {
            start: (c) => P(
                `Nel Cerchio di Pietre il vento non soffiava. Hai sentito una voce fatta di sette voci, bassa come un tuono lontano. Le pietre hanno detto che cantavano così prima che il castello affondasse.`,
                `Ti hanno chiesto di leggere la Tavoletta del Masso e di cantare con loro: otto note, senza sbagliare.`,
            ),
            end: (c) => P(
                `All'ottava nota le pietre hanno smesso di vibrare tutte insieme, come una campana che si ferma. Il castello, hanno detto, è rimasto a metà fuori dall'acqua perché la Pietra non ha mai mollato la presa.`,
                `Ti hanno chiesto che cosa di te non cambieresti mai. «${gxx(STORY_ANS.masso[c.ans[4]], c)}» hai detto. ${['Le pietre hanno risposto che sei della loro stessa pietra.', 'Le pietre hanno risposto che una parola data pesa più di un masso.', 'Le pietre hanno risposto che anche loro ridono, ma ci mettono mille anni.'][c.ans[4]]}`,
                `Uscendo dal cerchio ti sei voltat${c.o}. Per un attimo le pietre erano sette persone ferme in cerchio, e una aveva il tuo modo di stare in piedi.`,
            ),
            note: 'Abbiamo provato a registrare le pietre. Sul nastro c\'era solo il nostro respiro.',
        },
    },

    tuono: {
        echo: (c) => [[
            `Testard${c.o}, eh? Anch'io. Mi hanno esiliato su un ponte e sono ancora qui a parlare.`,
            'Una parola data. Io ne do mille al giorno e non ne mantengo nessuna. Siamo diversi. Forse.',
            'Il tuo modo di ridere? Fammelo sentire. No, aspetta: ridi dopo. Prima perdi.',
        ][c.ans[4] ?? 0]],
        open: (c) => ['Sei risposte. Imparale dagli abitanti, poi battimi a parole.', 'E dopo vai nell\'Arena, quella vera: il tuono si sente solo quando colpisce.'],
        wait: (c) => ['Ti mancano ancora dei pezzi: sei risposte, una vittoria su di me, una nell\'Arena. Le tempeste non si fanno a metà.'],
        ask: (c) => ['Ero il buffone del re. L\'unico che rideva della corona. Mi ha messo su questo ponte, e io parlo per non sparire.', 'Ma tu, dimmi:'],
        reply: [
            (c) => 'La rabbia. Fa partire in fretta, ma arriva male. Portati un ombrello.',
            (c) => 'La curiosità. È il vento migliore: non sai dove porta, ma ci vai.',
            (c) => 'La noia! Finalmente qualcuno di sincero. È lei che ha inventato i viaggi.',
        ],
        after: (c) => ['Io parlo per non sparire. È la stessa cosa che fa la tempesta.'],
        pages: {
            start: (c) => P(
                `Sul Ponte dei Sospiri lo Spettro del Pedaggio ti ha accolt${c.o} come un vecchio rivale. Ha detto che per passare servono sei risposte pronte, una lingua sciolta e una vittoria nell'Arena, perché il tuono si sente solo quando colpisce.`,
            ),
            end: (c) => P(
                `L'hai battuto a parole, e poi hai vinto nell'Arena davanti a tutti. Lo Spettro ha applaudito per primo. Ha detto di essere stato il buffone del re, l'unico che rideva della corona, e che il re l'aveva esiliato sul ponte.`,
                `Ti ha chiesto che cosa ti fa partire. «${gxx(STORY_ANS.tuono[c.ans[5]], c)}» gli hai detto. ${['Lui ha riso e ti ha consigliato un ombrello.', 'Lui ha detto che è il vento migliore: non sai dove porta, ma ci vai.', 'Lui ha detto che finalmente qualcuno era sincero.'][c.ans[5]]}`,
                `«Io parlo per non sparire» ha detto alla fine. Era la stessa frase che avevi pensato tu, arrivando sull'isola, ma non l'avevi mai detta ad alta voce.`,
            ),
            note: 'Lo Spettro ci ha chiesto di non scrivere che è simpatico. Non lo scriviamo.',
        },
    },

    eco: {
        echo: (c) => [[
            'La rabbia ti ha portato fin qui. Lasciala sulla soglia: in cappella non entra.',
            'La curiosità ti ha portato fin qui. Bene: ho una cosa da farti cercare.',
            'La noia ti ha portato fin qui. Allora ti darò qualcosa da fare.',
        ][c.ans[5] ?? 0]],
        open: (c) => ['Il telefono bianco suonerà per te. Rispondi.', 'Poi apri il cassetto che nella Stanza Bianca non si apre per nessuno. Dentro c\'è una cosa mia. Portamela.'],
        wait: (c) => ['Il telefono, e il cassetto. Io non ho volto, ma ho pazienza.'],
        ask: (c) => ['È il mio volto. L\'ho tolto per non ricordare il re. Non lo rimetto: volevo solo sapere che esiste ancora.', 'E tu, che frughi nei cassetti degli altri…'],
        reply: [
            (c) => 'Una voce. Ascolta bene la nebbia: le voci restano più a lungo delle facce.',
            (c) => 'Un posto. I posti aspettano. Sono più fedeli delle persone.',
            (c) => 'Un sapore. È il ricordo più furbo: torna quando non lo chiami.',
        ],
        after: (c) => ['Ero la regina. Adesso sono quella che guarda.'],
        pages: {
            start: (c) => P(
                `La Custode senza Volto ti ha guardat${c.o} senza occhi. Ha detto che il telefono bianco avrebbe suonato per te, e che nella Stanza Bianca c'è un cassetto che non si apre per nessuno, tranne che per chi deve aprirlo.`,
            ),
            end: (c) => P(
                `Il cassetto si è aperto al primo tocco. Dentro c'era un volto, avvolto in un fazzoletto bianco. L'hai portato in cappella, e la Custode l'ha tenuto in grembo senza rimetterselo.`,
                `«Ero la regina» ha detto. «L'ho tolto per non ricordare il re. Volevo solo sapere che esiste ancora.» Poi ti ha chiesto quale ricordo vorresti ritrovare per primo. «${gxx(STORY_ANS.eco[c.ans[6]], c)}» hai detto. ${['Lei ha detto che le voci restano più a lungo delle facce.', 'Lei ha detto che i posti aspettano, e sono più fedeli delle persone.', 'Lei ha detto che è il ricordo più furbo: torna quando non lo chiami.'][c.ans[6]]}`,
                `Prima di uscire hai guardato il volto nel fazzoletto. Ti è sembrato di averlo già visto, da qualche parte. Forse nell'acqua del molo, il primo giorno.`,
            ),
            note: 'Non sappiamo chi abbia messo quel volto nel nostro cassetto. Noi lì teniamo solo le penne.',
        },
    },

    melma: {
        echo: (c) => [[
            'Cerchi una voce? Il re ne ha una sola, e la usa per chiamare chi ha sei semi. Sta chiamando te.',
            'Cerchi un posto? Il re il suo l\'ha perso sott\'acqua. Adesso vuole il tuo.',
            'Cerchi un sapore? Laggiù sa tutto di sale. Il re ha sete da trecento anni.',
        ][c.ans[6] ?? 0]],
        open: (c) => ['Hai sei semi nella cornice della carta. Il Re Annegato lo sente.', 'Come vuoi incontrarlo?'],
        wait: (c, st) => st.prog?.re ? ['Il re ti ha detto dov\'è il settimo seme? No. Ma tu lo sai: dove hai messo piede il primo giorno.']
            : st.way === 'cripta' ? ['La cripta è sotto il castello, a sinistra dell\'Arena. Scendi quando vuoi. Io non vengo.']
                : ['Il sabato sera, alla Veglia. Combatti con gli altri finché il re non si alza, e battilo.'],
        ask: (c) => ['Nello specchio la tua carta ha sette semi nella cornice: è una corona. Dal fondo del vetro sale la voce del re.', '«Indossala. Sarai come me.»'],
        reply: [
            (c) => 'Per un attimo, nello specchio, hai la sua faccia. Poi di nuovo la tua.',
            (c) => 'Il fango se la prende senza rumore. È l\'unico che può tenerla.',
        ],
        pages: {
            start: (c) => P(
                `Ossobuco ti ha aspettat${c.o} al cancello del cimitero, appoggiato alla vanga. Ha detto che hai sei semi nella cornice della carta, e che il Re Annegato lo sente: «Ti sta chiamando.»`,
                `Hai scelto di affrontarlo ${c.way === 'cripta' ? 'da sol' + c.o + ', nella cripta sotto il castello' : 'alla Veglia del sabato, insieme agli altri'}.`,
            ),
            end: (c) => P(
                `Il re ti ha guardato la carta e ha contato sei semi. «Ti manca solo il settimo» ha detto. «Prendilo e sarai come me.» Il Seme senza Nome era dove non l'avresti mai cercato: sotto le assi del molo, dove hai messo piede il primo giorno.`,
                `Davanti allo Specchio Incantato la tua carta aveva sette semi nella cornice, ed era una corona. ${c.ans[7] === 0 ? 'L\'hai indossata. Per un attimo, nel vetro, hai avuto la faccia del re.' : 'L\'hai lasciata cadere nel fango, che se l\'è presa senza rumore.'}`,
                `Poi, per un attimo, dietro la tua faccia sono passati tutti: il cappuccio del Traghettatore, il grembiule di Brace, il ghigno dello Spettro, il volto bianco della Custode, le ossa di Ossobuco, sette pietre in cerchio. Poi c'eri soltanto tu.`,
            ),
            note: 'Ci hanno chiesto chi fossero, tutti quei personaggi. Abbiamo risposto: guarda meglio.',
        },
    },

    biglietto: {
        open: (c) => ['Allora? L\'hai trovato, il nome?', 'Vuoi il biglietto di ritorno?'],
        after: (c) => ['Chi sono io? Quello che ti ha portato fin qui.'],
        pages: {
            end: (c) => P(
                `Sei tornat${c.o} al molo. Il Traghettatore era lì, come la prima notte, con la lanterna accesa a prua. Ti ha chiesto se avevi trovato il nome. Gli hai detto: ${c.nome ? `«${c.nome}»` : 'di sì'}.`,
                `Ti ha chiesto se volevi il biglietto di ritorno. ${c.lv >= 30 ? 'Ti ha detto che lo stacca la Custode, all\'Altare, e che si chiama Rinascita: si torna piccoli, ma con una stella in più sulla carta. E con questo libro in tasca.' : 'Ti ha detto di tornare quando la carta avrà finito di crescere.'}`,
                `Prima che la barca sparisse nella nebbia gli hai chiesto chi fosse. «Quello che ti ha portato fin qui» ha risposto.`,
                `Fine del Libro I. La nebbia non finisce mai.`,
            ),
            note: 'Il Libro II lo stiamo ancora scrivendo. Anzi: lo stai scrivendo tu.',
        },
    },
};

// le risposte come si leggono nel libro (con l'accordo)
export const STORY_ANS = {
    brace: ['Essere ricordat{o}', 'Essere liber{o}', 'Essere amat{o}'],
    brina: ['Che qualcuno torni', 'Di sentirmi pront{o}', 'Niente: è il tempo che aspetta me'],
    radice: ['Una paura', 'Una persona', 'Niente: voglio ricordare tutto'],
    masso: ['La mia testardaggine', 'La mia parola', 'Il mio modo di ridere'],
    tuono: ['La rabbia', 'La curiosità', 'La noia'],
    eco: ['Una voce', 'Un posto', 'Un sapore'],
};
function gxx(s, c) { return String(s ?? '').replace(/\{o\}/g, c.o); }

// il ritratto completo, frase per frase, dalle sette risposte
const LONG = {
    1: ['voleva essere ricordat{o}', 'voleva essere liber{o}', 'voleva essere amat{o}'],
    2: ['aspetta che qualcuno torni', 'aspetta di sentirsi pront{o}', 'non aspetta niente, perché è il tempo ad aspettarl{o}'],
    3: ['ha sepolto una paura', 'ha sepolto un nome', 'non vuole dimenticare niente'],
    4: ['non cambierebbe mai la sua testardaggine', 'non cambierebbe mai la sua parola', 'non cambierebbe mai il suo modo di ridere'],
    5: ['parte per rabbia', 'parte per curiosità', 'parte per noia'],
    6: ['cerca una voce', 'cerca un posto', 'cerca un sapore'],
    7: ['ha indossato la corona', 'ha lasciato la corona al fango'],
};
export function ritratto(c) {
    const parts = [];
    for (let i = 1; i <= 7; i++) if (c.ans[i] != null) parts.push(gxx(LONG[i][c.ans[i]], c));
    if (!parts.length) return '';
    const last = parts.pop();
    return `Sei ${c.o === 'a' ? 'colei' : 'colui'} che ${parts.length ? parts.join(', che ') + ', e che ' : ''}${last}.`;
}
