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
