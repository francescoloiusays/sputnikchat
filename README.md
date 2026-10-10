# SputnikChat — L'Isola Fantasma

Gioco multiplayer 3D in terza persona su un'isola fantasma in mezzo a una laguna, con un castello e un'Arena per i duelli.
Client in HTML/JS con Three.js (GitHub Pages), server Node.js con socket.io (Render).

## Cosa c'è

- **Personaggio creato da zero al primo avvio**: specie (umano, elfo, ratto, scheletro, spettro), corporatura, altezza, colori, occhi, bocca, capelli, barba, abito. Ci sono tre preset ispirati ai personaggi originali (Ratto, Alessandro, Francesco). L'aspetto si può cambiare quando vuoi allo **Specchio Incantato** in piazza oppure dalle Impostazioni.
- **Card del Potere** (in alto a sinistra), in stile Magic/Yu-Gi-Oh. **La texture decide l'elemento**, quindi le statistiche di combattimento e il SUPER potere. Puoi scegliere una delle 8 texture (c'è anche il marmo verde originale) oppure **caricare una tua immagine**: il suo colore dominante sceglie l'elemento. La card si può **stampare** (formato carta da gioco 63×88 mm), **scaricare** in PNG o **inviare** agli altri giocatori, che la trovano nella loro **Collezione**.
- **Card del personaggio** (in alto a destra): ritratto 3D, livello, rating, vittorie/sconfitte, Sputnik Coin e i pulsanti dei menu.
- **Armi craftabili** alla **Forgia**: tipo (pugnale, spada, ascia, martello, lancia, falce, bastone), materiale, impugnatura e gemma. Ogni scelta cambia danno, velocità, portata e contraccolpo. Una gemma dello stesso elemento della tua card dà +10% danni.
- **Sartoria**: cappelli, maschere, mantelli e armature, da provare addosso prima di comprarli.
- **Bazar**: compravendita tra giocatori. L'oggetto resta in vendita anche quando sei offline.
- **Sputnik Coin**: 150 all'inizio, +25 al giorno, +30 per ogni vittoria (+5 di consolazione per la sconfitta), poste in palio e scommesse.
- **Duelli nell'Arena del castello**: la visuale passa alla **prospettiva laterale** (stile Mortal Kombat/Smash Bros): barre vita, round al meglio dei 3, piattaforme sospese, cadute fuori dal palco, combo, parata, scatto e SUPER. Il server simula lo scontro (niente trucchi).
- **Spettatori e scommesse**: quando parte un duello, tutti i giocatori della sessione ricevono un avviso e hanno 15 secondi per guardarlo e scommettere. Il montepremi viene diviso tra chi ha indovinato in proporzione alla puntata; se nessuno ha puntato sul vincitore, tutti vengono rimborsati.
- **Allenamento contro il Fantasma**: un avversario controllato dal computer in tre difficoltà. Funziona anche offline.
- **Classifica globale** (rating Elo e più ricchi), visibile anche sull'Obelisco della Gloria in piazza.
- **Amici e sessioni private**: richieste di amicizia, stato online e una copia privata dell'isola dove entrano solo gli amici che inviti.
- **Castello**: torce a muro e bracieri con fiamme generate in tempo reale (le stesse usate su tutta l'isola), finestre ad arco e **quadri con fotogrammi degli episodi di Sputnik Homies** che cambiano da soli ogni tanto. Premi E davanti a un quadro per aprire l'episodio su YouTube.
- **Musica**: la colonna sonora originale sull'isola e, durante i duelli, `battaglia.mp3`, un remix d'azione dello stesso brano (137 BPM con batteria aggiunta).
- **Minimappa** in basso a sinistra (clic o N per la mappa grande), logo che gira in alto al centro, chat, voice chat di prossimità e il lancio di fango del gioco originale.
- **Il castello dentro**: torce a muro in ferro e bracieri con fiamme generate in tempo reale (fuori restano le torce della laguna) e **quadri con fotogrammi degli episodi di Sputnik Homies** che cambiano immagine ogni 10–15 secondi. Premendo E davanti a un quadro si apre l'episodio su YouTube. Le immagini sono in `public/img/quadri/`, l'elenco è in `public/js/decor.js`.
- **La Stanza Bianca**: al piano di sopra del mastio c'è la stanza dei video di Sputnik Homies. Ci si sale con la scala di pietra sul lato ovest del mastio. Entrando trovi il letto matrimoniale a destra, l'armadio a sinistra e, di fronte alla porta, le due poltrone (quella di legno e la sedia da ufficio nera) con il tavolino di OSB e il logo giallo. Dietro ci sono il pannello nero con gli archi, la lampada, il poster e lo specchio. Le due finestre in basso del mastio sono le finestre vere della stanza e danno sul **giardino del castello** (prati, alberi in fiore, fontana e fiori luminosi). Premi E vicino a una poltrona (o a una panchina del giardino) per sederti: gli altri ti vedono seduto. Il tavolino apre il canale YouTube.
- **Armadio degli Sputnik Homies**: dentro l'armadio ci sono le magliette ufficiali (bianca, nera, gialla e grigia) e la felpa con cappuccio, tutte con il logo davanti e la scritta dietro. Si provano addosso e si comprano con gli Sputnik Coin, come in Sartoria.
- **Musica di battaglia**: durante i duelli parte `battaglia.mp3`, un remix d'azione della colonna sonora (più veloce, 137 BPM, con batteria, tamburi e piatti a tempo). Lo script che lo genera è in `tools/remix-battaglia.mjs`.
- **Livelli fino al 30 e Maestria**: l'esperienza arriva da duelli (120 a vittoria, 40 a sconfitta, almeno 20 secondi di combattimento), allenamento col Fantasma, scommesse vinte e tributo del giorno. La prima vittoria del giorno vale doppio, e dopo ogni 8 ore lontano dall'isola un duello vale doppio. Contro lo stesso avversario l'esperienza cala dopo il terzo duello del giorno. A ogni livello dal 2 si guadagna un punto per i rami **Forza**, **Tempra** e **Maestria del Seme** (massimo 15 per ramo, con un tratto speciale a 5, 10 e 15 punti) nel **Libro della Maestria** (tasto L). Il Rito dell'Oblio all'Altare della Cappella in Rovina ridistribuisce i punti: la prima volta è gratis, poi costa 200 monete.
- **La Ruota dei Semi**: Fuoco → Ghiaccio → Palude → Pietra → Tempesta → Spettro → Fuoco. Contro il seme che segue fai il 15% di danni in più e la SUPER si carica il 20% più in fretta; contro quello che ti precede fai il 10% in meno. Gli opposti (Fuoco e Pietra, Ghiaccio e Tempesta, Palude e Spettro) subiscono la **Dissonanza**: il 12% dei colpi sfrigola (metà danno) e la SUPER può dissolversi (25%). Il Fango sta fuori dalla Ruota, non subisce mai la Dissonanza e le sue palle di fango tolgono la SUPER al nemico per 3 secondi.
- **Equipaggiamento per livello e per seme**: ogni capo ha una rarità e un livello richiesto (comune 1, non comune 4, raro 8, epico 14, leggendario 20), piccole statistiche e un seme in **sintonia** (rende una volta e mezza) o in **ripulsa** (rende la metà e aggiunge Dissonanza). Ci sono il peso e quattro **corredi** da tre pezzi. In Forgia osso, ossidiana, argento spettrale, oro e gemme si sbloccano col livello. I capi comprati prima di questo aggiornamento restano indossabili. Talenti e capi insieme non superano il +35% su danni e difesa. Le regole stanno in `public/js/shared/catalog.js` e valgono sia per il gioco sia per il server.
- **Materiali dell'isola**: Frammenti di Runa da raccogliere al Cerchio di Pietre (e uno per ogni duello combattuto), Perle della Laguna dalla pesca, Ectoplasma dai fuochi fatui dorati del cimitero (scappano se ti avvicini), Essenze dei sette semi vincendo contro quel seme (3 al giorno per seme; il Fantasma dal Guerriero in su ne lascia 2 al giorno), Pergamene Benedette nelle bottiglie del Molo. Nella bisaccia ci sono le schede **Materiali** e **Diario**. Raccolte e pescate danno premi pieni per le prime volte del giorno (12 frammenti, 8 fuochi fatui, 8 pescate), poi un quarto.
- **La Pesca nella Nebbia**: in fondo al Molo si lancia la lenza, si ferra quando il galleggiante affonda e poi si tiene il pesce dentro la zona chiara della barra, come in Stardew Valley. Dieci specie, alcune solo di giorno e altre solo di notte (ora italiana, dalle 20 alle 6), con il diario di pesca e i record. Le bottiglie portano le dieci pagine del **Diario del Naufrago**, che raccontano la leggenda dell'isola.
- **L'Altare dei Sette Semi** (Cappella in Rovina, dal livello 2): **risveglio della carta** in Filigrana (livello 5), Aurora (12) e Incisa (20), ognuno con una prova e i suoi materiali e con un riflesso olografico che si vede nella carta in alto a sinistra, nell'album e nei profili; **incantamento** da +1 a +10 di armi (+3% di danni a livello, scia del colore del seme da +5) e vestiti (+1% di difesa a livello, aura a +10), sicuro fino a +3 e rischioso da +6, con la Pergamena Benedetta che protegge; **infusioni** che danno al colpo pesante l'effetto di un seme (doppio se è l'opposto del tuo, ma con la Dissonanza); **fusione** di rune e trasmutazione delle Essenze; quattro **sigilli** da incastonare sulla carta; un'**offerta** al giorno per un'ora di esperienza in più. Chi cambia seme fa scendere la carta di un grado.
- **Gli abitanti dell'isola**: il Traghettatore al Molo, Mastro Brace alla Forgia, la Sarta Spettrale, il Mercante senza Ombra al Bazar, la Custode senza Volto all'Altare, Ossobuco il Becchino al cimitero, lo Spettro del Pedaggio sul ponte e il Ratto dei Cronisti nel cortile del castello. Ti guardano quando ti avvicini, parlano con E e la prima volta ti insegnano una risposta per il Pedaggio.
- **I luoghi**: la **Bacheca delle Taglie** in piazza (tre incarichi al giorno e uno alla settimana, si riscuotono lì; tasto J); il **Canto delle Pietre** al Cerchio di Pietre (dal livello 3: la runa canta una sequenza, la ripeti coi tasti da 1 a 7 e a ogni giro se ne aggiunge una; Frammenti, una Runa ogni 10 note); il **Prato dei Morti** del Becchino (dal livello 3: le tombe sono un Prato fiorito, l'epitaffio dice quante tombe maledette ci sono intorno, da quelle maledette esce uno scheletro da battere in duello; Ossa Antiche, che servono per i castoni e per le armi d'osso); la **Fontana dei Desideri** nel giardino del castello (una moneta al giorno per un'ora di esperienza doppia, una Perla, Frammenti o una Pergamena).
- **La Cronaca**: il **Pedaggio dello Spettro** (dal livello 4, un duello di parole: a ogni insulto la sua risposta, quelle che non sai le impari sbagliando, parlando con gli abitanti e guardando In Onda!; il titolo è Lingua d'Argento); **In Onda!** nella Stanza Bianca (dal livello 6: chi si siede in poltrona avvia la puntata, da solo col Ratto o con un altro viandante; tre domande, il pubblico vota con 1 o 2 e i conduttori guadagnano di più se il pubblico si divide; Carisma e qualche Parola di Runa); il **telefono bianco** che squilla una volta al giorno con una missione segreta; sette **Tavolette della Cronaca** nascoste fra i muretti, che raccontano i sette semi (tutte e sette: titolo Cronista e una ricetta).
- **Castoni e Parole di Runa**: Mastro Brace apre fino a tre castoni (livelli 8, 12 e 20, con Ossa Antiche). Ogni runa dà un piccolo bonus del suo seme; sei sequenze, nell'arma giusta, formano una Parola di Runa (la Mietitrice di Nebbie fa colpire due volte la SUPER, il Cuore di Vulcano lascia lava, Il Primo Lancio tira palle di fango...). Le ricette si trovano nel Diario del Naufrago, nelle Tavolette e nelle puntate, oppure si scoprono provando.
- **Arena classificata, leghe e stagioni**: la gloria si muove solo nei duelli fra viandanti dal livello 5. Leghe Bronzo, Argento (1100), Oro (1300) e Spettro (1500), stagioni di sei settimane: a fine stagione la lega più alta diventa una cornice sulla carta e la gloria riparte da metà strada. Il venerdì si contano le vittorie classificate per il titolo di Campione del Venerdì, e dal livello 25 per il Torneo dei Campioni. Nell'Albo c'è la scheda del venerdì.
- **La Veglia dei Morti**: il sabato dalle 20 a mezzanotte (ora italiana), dal livello 10, ondate di morti sempre più forti nel cimitero. Le vittorie di tutti si sommano: quando bastano, sale il Re Annegato, che chi ha combattuto può sfidare fino a tre volte. Batterlo dà il Cuore del Re Annegato, che con la lega Spettro serve per la **carta Viva**, dove il ritratto 3D si muove dentro la carta. Per provarla fuori orario, in locale: `VEGLIA_ALWAYS=1 npm start`.
- **Titoli e Rinascita**: undici titoli da conquistare (si scelgono nel Libro della Maestria e compaiono sotto il nome). Al livello 30 la Custode offre la Rinascita: si torna al livello 1 tenendo oggetti e carta, con una stella sulla carta e il 5% di esperienza in più per sempre (fino a tre volte).
- **Interfaccia da gioco di ruolo**: finestre in legno scuro con filigrane d'oro, pergamene per registri e notifiche, slot degli oggetti colorati per rarità (comune, non comune, raro, epico, leggendario), barra delle azioni con le scorciatoie, ritratto in cornice dorata, titoli delle zone a tutto schermo e mappa grande su pergamena. Font: Almendra (titoli), Cinzel (etichette), Alegreya (testi); il Planewalker resta per il marchio "SputnikChat".

## Elementi

| Texture | Elemento | Passiva | SUPER |
|---|---|---|---|
| Colata di Lava | 🔥 Fuoco | +15% danni | Fiammata Infernale: sfera di lava che brucia |
| Lago Ghiacciato | ❄️ Ghiaccio | -10% danni subiti | Prigione di Gelo: congela il nemico |
| Nebbia Spettrale | 👻 Spettro | Salto triplo, più veloce | Passo Fantasma: teletrasporto alle spalle |
| Marmo Antico / Acquitrino | 🌿 Palude | Rigenera vita | Miasma Velenoso: nube tossica e cura |
| Cielo in Tempesta | ⚡ Tempesta | Scatto potenziato | Saetta Celeste: fulmine che stordisce |
| Mura del Castello | 🪨 Pietra | Meno danni, quasi immobile | Frana: onde di roccia |
| Melma della Laguna | 🟤 Fango | +5% vita e difesa | Raffica di Fango: rallenta il nemico e gli toglie la SUPER per 3 secondi |

## Comandi

**Isola**: WASD muoviti · Shift corri · Spazio salta · mouse guarda · rotella zoom · E interagisci · R profilo del giocatore vicino · F lancia fango · V prima/terza persona · 1-4 emote · Invio chat · M microfono · B musica · I inventario · C card · L Libro della Maestria · O amici · Tab classifica · K collezione · N mappa · P impostazioni.

**Duello**: A/D muovi · W o Spazio salta (doppio) · S scendi dalle piattaforme · J o clic sinistro attacco leggero · K o clic destro attacco pesante · W+J montante · L o Q SUPER (barra piena a metà) · I o E parata · Shift scatto · Esc ritirati.

**Pesca**: Spazio o clic per lanciare e ferrare, tieni premuto per alzare la zona chiara, Esc per uscire. Su telefono si tocca e si tiene premuto.

**Canto delle Pietre**: tasti da 1 a 7 o clic sulle pietre. **In Onda!**: 1 o 2 per votare. **J**: Bacheca delle Taglie.

Su telefono ci sono joystick e pulsanti a schermo.

## Struttura

```
server.js                 server: file statici, socket.io, economia, duelli, scommesse
server/store.js           salvataggi (MongoDB se c'è MONGODB_URI, altrimenti data/db.json)
public/index.html         pagina del gioco
public/css/style.css
public/js/main.js         avvio, mondo in terza persona, rete, HUD, minimappa, voice chat
public/js/world.js        isola, laguna, castello, arena, botteghe, collisioni
public/js/character.js    personaggi 3D procedurali, vestiti, armi, animazioni
public/js/duel.js         vista del duello 2.5D
public/js/cards.js        disegno, stampa e analisi colore delle card
public/js/creator.js      creazione del personaggio ed editor della card
public/js/panels.js       inventario, botteghe, Bazar, classifica, amici, collezione...
public/js/decor.js        fiamme procedurali, torce a muro, bracieri, quadri del castello
public/js/room.js         mastio, scala, Stanza Bianca con i suoi arredi e giardino del castello
public/js/fishing.js      la Pesca nella Nebbia: canna, galleggiante e barra di cattura
public/js/canto.js        il Canto delle Pietre
public/js/onda.js         In Onda! nella Stanza Bianca
public/js/npcs.js         gli abitanti dell'isola in 3D
public/js/shared/lore.js  dialoghi, Pedaggio, domande di In Onda!, Tavolette, missioni
public/js/icons.js        icone del gioco e ornamenti dell'interfaccia (filigrane, grana della carta)
public/js/icon-paths.js   disegni delle icone (game-icons.net)
tools/remix-battaglia.mjs genera la musica di battaglia dal brano originale
public/js/shared/         regole condivise da client e server (catalogo e motore di combattimento)
```

## Pubblicazione

1. **GitHub Pages**: invariato. Il client resta su `https://francescoloiusays.github.io/sputnikchat/public/` e si collega al server Render `https://sputnikchat-1.onrender.com` (indirizzo in `public/js/util.js`).
2. **Render**: build `npm install`, start `npm start`. Non serve più express: l'unica dipendenza è socket.io (`mongodb` è facoltativo).
3. **Salvataggi permanenti (consigliato)**: sul piano gratuito di Render il disco si azzera a ogni riavvio, quindi monete, inventari e classifica andrebbero persi. Crea un database gratuito su MongoDB Atlas (piano M0) e aggiungi su Render la variabile d'ambiente `MONGODB_URI` con la stringa di connessione. Senza questa variabile il server salva in `data/db.json`.

Il server gratuito di Render si addormenta dopo 15 minuti: al primo accesso può impiegare fino a un minuto a svegliarsi. Nel frattempo il gioco si apre lo stesso e si collega appena il server è pronto.

## Provarlo in locale

```bash
npm install
npm start
```

Apri `http://localhost:3000`. Per simulare un secondo giocatore nello stesso browser usa `http://localhost:3000/?p=2` (profilo separato).

Il personaggio è legato al browser. In Impostazioni trovi il **codice di recupero** per riaprirlo su un altro dispositivo.

## Crediti

- Icone: [game-icons.net](https://game-icons.net) di Lorc, Delapouite e altri autori, licenza [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
- Font: Almendra, Cinzel, Cinzel Decorative e Alegreya da Google Fonts (SIL Open Font License); Planewalker dal gioco originale.
- Fotogrammi dei quadri: episodi del canale YouTube Sputnik Homies.
