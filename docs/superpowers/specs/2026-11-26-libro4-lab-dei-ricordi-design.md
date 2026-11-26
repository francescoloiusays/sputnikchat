# Libro IV · Il Lab dei Ricordi — progetto

*SputnikChat · L'Isola Fantasma · 26 novembre 2026*

## Perché

I Libri II e III parlano di nomi perduti: il Libro III finisce con il secchio dei nomi tirato su dal Pozzo e restituito. Il Libro IV fa il passo dopo: i nomi sono tornati, ma **i ricordi attaccati ai nomi stanno svanendo**. In un bosco nuovo, a ovest dell'isola, c'è una locanda dove cinque viandanti di una volta si sono fermati per non dimenticare. La sua cucina è il "laboratorio dei ricordi": **un piatto, cucinato bene, fa tornare un ricordo**.

Il libro deve lasciare al giocatore **dolcezza e serenità**, e chiudersi **in sospeso**: il libro dopo (che Francesco ha già in mente) si riattacca da lì.

## Obiettivi

- Un **bosco grande attaccato all'isola** a ovest, raggiungibile a piedi, con al centro la locanda **Il Tofu della Nebbia**: la "casa di nonna" di tutti gli abitanti.
- **Cinque clienti fissi** e **una cuoca**, con la loro storia.
- **Cinque capitoli** di missioni, come i Libri II e III: parlare, trovare, raccogliere, pescare, cucinare.
- Una **meccanica nuova: il cibo.** Si cucina con un piccolo gioco ai fornelli, e i piatti danno forza per i duelli.
- La pesca entra nelle missioni, insieme ad altri ingredienti nuovi.

## Cosa non fa

- Non chiude la storia: niente finale risolto, nessuno dei cinque riparte, Pippo non ritrova del tutto il suo ricordo.
- Non usa nome, logo o insegne del locale vero di Milano (Tofulab dalle8). Se ne prende solo l'atmosfera degli interni.
- Non obbliga a rifare il gioco ai fornelli: dopo la prima volta, i piatti li cucina la cuoca.

## Cosa non deve succedere (anti-obiettivi)

- **Diventare una fatica.** Se la raccolta degli ingredienti blocca un capitolo per giorni, come succedeva con le Pergamene, il libro ha fallito anche se funziona.
- **Cibo obbligatorio per vincere.** I piatti aiutano un po', non decidono i duelli.
- **Un bosco che fa scattare il telefono.**
- **Tristezza.** I ricordi sono dolci anche quando parlano di cose perse.

## Vincoli

- Si continua lo stato del Romanzo della Nebbia (`p.libro2`): il Libro IV sono i capitoli dopo `L3_END`, con `book: 4`, e gli stessi tipi di passo (`talk`, `give`, `find`, `count`, `boss`, `answer`), più uno nuovo, `cook`.
- Livelli: il Libro III va dal livello 6 al 10, il Libro IV dall'11 al 15.
- Giorno e notte seguono **solo il ciclo dell'isola** (`islandNight`), mai l'ora vera.
- Mappa, minimappa e carta A3 devono mostrare il bosco.
- Va provato anche su telefono.

## Come si costruisce

Abbiamo considerato tre modi.

1. **Terra vera dell'isola, mappa allargata.** Il bosco fa parte del terreno, e alberi e locanda si caricano quando ti avvicini. **Scelto.** Il bosco sembra parte dell'isola, ci si arriva a piedi senza caricamenti, minimappa e carta lo mostrano da sole, e il caricamento a pezzi tiene il gioco leggero.
2. **Una zona a parte, attaccata via terra.** Pesa meno, ma si vedrebbero le giunture fra i due terreni, e minimappa e carta andrebbero rifatte a parte. Scartato.
3. **In barca, come la Riva di Là.** È la più semplice, ma va contro la richiesta: il bosco deve essere attaccato all'isola. Scartato.

### La mappa (scelta di Claude, da verificare)

- Il bordo ovest passa da `MIN_X: -180` a `MIN_X: -300`, e `SEG` da 200 a circa 266, così le celle restano di circa 1,8 m.
- **Il bosco:** centro intorno a (−200, 10), raggio circa 70 m. Lo lega all'isola grande un collo di terra da (−70, 15) a (−135, 10), come `NECK` delle Terre Nuove.
- **La forma** sta in un file condiviso `shared/bosco.js`, come `shared/terre.js`: maschera, rilievo, luoghi `BP`, sentieri. Vale per il client, per il server e per `world.js`.
- **Le cose pesanti** stanno in una regione caricata a parte (`regions/bosco.js`, registrata in `regions/index.js`): gli alberi fitti, il sottobosco, la locanda dentro e fuori, i punti di raccolta. La locanda è un interno con `interiors.add`.
- **Spazio:** la Secca del Relitto (−148, 118) resta fuori dal bosco, a circa 120 m dal centro, e il Cimitero (−33, 40) non viene toccato.

## La lore

### Il bosco

Dall'altra parte dell'isola, dove nessuno va perché "là c'è solo nebbia e alberi", la nebbia è diversa: profuma. Chi segue il profumo trova un bosco fitto di faggi e abeti, con il muschio che attutisce i passi. Al centro c'è una casa bassa di legno con le finestre gialle: **Il Tofu della Nebbia**.

### La locanda

È calda, con il legno, le piante, i barattoli, un bancone aperto sulla cucina e tavoli lunghi dove ci si siede vicini. Il tofu lo fa la cuoca con l'acqua della nebbia, ed è per questo che si chiama così. Chi entra si sente a casa di una nonna: gli danno da mangiare prima ancora di chiedergli come si chiama.

### La cuoca: Nonna Lux (nome di Francesco; è lei l'aggancio del libro dopo)

Non dimentica niente perché **scrive tutto**: ogni piatto ha la sua ricetta, e ogni ricetta ha in margine il ricordo di chi l'ha mangiato la prima volta. Il suo quaderno è il laboratorio. Lo dice lei: "Un sapore è un ricordo che si può rifare." Insegna al giocatore a cucinare.

### I cinque clienti

Sono cinque **viandanti dei giorni passati**. I viandanti dell'isola (`genti.js`) arrivano ogni giorno e ripartono; questi cinque non sono ripartiti. Si sono fermati alla locanda perché lì, finché mangiano insieme e si raccontano le avventure, i ricordi restano. È il contrario della Riva di Là, dove i nomi si buttavano nel Pozzo per dimenticare.

Semi e mestieri sono tirati a sorte; nomi e caratteri li ha proposti Claude.

| Chi | Mestiere | Seme | Com'è |
|---|---|---|---|
| **Ettore** (coppia 1) | Cavaliere Errante | Ghiaccio | Aveva giurato di non tornare a casa finché non avesse perso un duello. Alla locanda ha smesso di duellare. |
| **Rina** (coppia 1) | Tagliaborse | Fango | Gli ha rubato la borsa il giorno che si sono conosciuti, e non gliel'ha mai ridata. Lo prende in giro. |
| **Nando** (coppia 2) | Marinaio | Palude | Parla poco e cucina meglio della cuoca, ma non lo ammette. |
| **Greta** (coppia 2) | Custode del Ponte | Pietra | Le regole sono la sua cosa, e alla locanda ci sono solo le sue. |
| **Pippo** (l'amico) | Ambulante | Pietra | Ha venduto un po' di tutto a tutti, ed è sempre in mezzo alle due coppie. |

**Come si legano i ricordi**

- Nelle coppie, ognuno ricorda **la metà** che l'altro ha perso, e un piatto le rimette insieme.
- Pippo ha i pezzi dei ricordi di tutti, perché c'era sempre. Gli manca solo il suo.

### I capitoli (proposta)

Ogni capitolo finisce con una **pagina del libro**: il ricordo tornato, scritto dai Cronisti.

1. **Il bosco che profuma** (livello 11)
   - Il Traghettatore o la Cartografa raccontano di una nebbia che profuma, a ovest. Il giocatore attraversa il collo di terra, segue il profumo e trova la locanda.
   - Nonna Lux gli dà da mangiare e gli presenta i cinque, che hanno paura di dimenticare.
   - **Primo gioco ai fornelli:** il tofu della nebbia, fatto con l'acqua raccolta all'alba nel bosco. Si apre la cucina.
2. **La borsa rubata** (Ettore e Rina, livello 12)
   - Lei ricorda il furto ma non perché si è fermata; lui ricorda di averla rincorsa ma non dove. Era sul Ponte, e c'era Greta di guardia: un aggancio con la coppia dopo.
   - **Il piatto** usa un pesce del Molo (per esempio il Luccio delle Canne), funghi del bosco e una cosa che Rina ha rubato a qualcuno dell'isola, da ritrovare.
   - **Il ricordo:** la prima cena insieme, pagata con i soldi della borsa.
3. **La barca e il ponte** (Nando e Greta, livello 13)
   - Lui ricorda una barca, lei un ponte; nessuno dei due ricorda come si sono incontrati.
   - **Il piatto** usa il pane di Tobia dal Forno della Riva di Là, un aggancio col Libro III, un pesce di notte (la Carpa Lanterna) ed erbe del bosco.
   - **Il ricordo:** Nando arrivato sotto il ponte con la barca rotta, e Greta che gli ha fatto la multa e poi gli ha portato la cena.
4. **I pezzi di Pippo** (livello 14)
   - Nei ricordi tornati Pippo c'è sempre, ma sempre di lato. Ognuno dei quattro ha un pezzo di lui: un oggetto, una frase, un posto.
   - Il giocatore li raccoglie (passi `talk` e `find`), più un ingrediente raro: l'Anguilla di Nebbia di notte, oppure qualcosa del bosco profondo.
5. **La cena lunga** (livello 15)
   - Tutti e cinque cucinano insieme, con il giocatore e Nonna Lux, il piatto di Pippo, fatto con gli ingredienti di tutto il libro.
   - **Il ricordo torna solo a metà:** Pippo sorride, dice "c'era qualcuno che…", e si ferma. Nessuno insiste. Si mangia.
   - **Passo `answer`:** Nonna Lux chiede al giocatore che cosa vuole che lei scriva in margine. La risposta resta nel libro.
   - **Fine:** Mentre i cinque mangiano, il giocatore sfoglia il quaderno di Nonna Lux. In fondo c'è una ricetta senza nome, con la sua grafia: ingredienti che il giocatore non ha mai sentito, e in margine un ricordo che non riesce a capire di chi sia. Lux se la ricorda benissimo. Gli toglie il quaderno dalle mani, piano, e dice soltanto: «Quella la cuciniamo un'altra volta.» Poi sorride e va a sparecchiare. "Fine del Libro IV." È l'aggancio per il libro dopo, che parte da Lux: lei sa tutto, è il giocatore che non sa ancora come leggerla. Che cosa sia quella ricetta resta di Francesco.

## La cucina

Scelta di Francesco: **il misto**. La prima volta, per il ricordo, cucina il giocatore, con un gioco guidato da Nonna Lux. Le volte dopo, per i duelli, cucina lei.

### Il gioco ai fornelli (primo piatto di ogni ricetta)

È un gioco breve, sul modello della barra della pesca (`fishing.js`): da 3 a 5 fasi, per esempio tagliare a ritmo, mescolare tenendo l'indicatore nella zona giusta, togliere dal fuoco al momento giusto.

- Il risultato va da 1 a 3 stelle.
- Il server controlla tempi e esito, come per la pesca e la palestra.
- **Passo nuovo `cook`:** `{ k: 'cook', dish: 'tofu' }`. Il capitolo va avanti quando il piatto è cucinato, con qualsiasi numero di stelle: il ricordo torna comunque.

### I piatti per i duelli (dalla seconda volta)

- Un piatto imparato si rifà da Nonna Lux portandole gli ingredienti.
- **Proposta di Claude:** un piatto attivo alla volta; vale per i prossimi 3 duelli; massimo 3 piatti al giorno.
- **Effetti piccoli**, sul modello della palestra in `fight.js` (`setup.gym`), con un nuovo `setup.food`. Esempi:
  - più vita massima;
  - più attacco;
  - un po' di vita recuperata col tempo;
  - la barra della super che si carica prima.
- **Le stelle** del primo piatto contano: con 3 stelle l'effetto è un po' più forte.

### Gli ingredienti

- **Pesci del Molo:** quelli che ci sono già.
- **Raccolti nel bosco:** funghi, erbe, bacche, l'acqua della nebbia all'alba. Sono nuovi punti di raccolta, sul modello di `GATHER` (nodi, ricarica, limite al giorno).
- **Dalla Riva di Là:** il pane di Tobia.
- Ogni capitolo deve potersi fare in **1–2 sessioni di gioco**: niente ingredienti rarissimi senza un modo sicuro di averli quando servono (vedi la correzione delle Pergamene).

## Già deciso

- Il laboratorio dei ricordi è la cucina della locanda (Francesco).
- Il bosco è attaccato all'isola, con la mappa allargata (Francesco).
- La cucina è il misto (Francesco).
- Tre ragazzi e due ragazze: due coppie e un amico; semi e mestieri a caso (Francesco).
- La fine è in sospeso, con dolcezza e serenità (Francesco).
- La cuoca si chiama Nonna Lux, ed è lei l'aggancio del libro dopo (Francesco).
- Il bosco è terra vera con il caricamento a pezzi (Francesco, sulla proposta di Claude).

## Lasciato a chi costruisce

- La forma esatta del bosco, del collo di terra e dei sentieri; il numero di alberi e il loro livello di dettaglio.
- Le fasi precise del gioco ai fornelli, e i numeri degli effetti dei piatti, entro "piccoli".
- I testi dei dialoghi, partendo da questa lore.
- Le icone e i luoghi nuovi nella carta A3 e nella minimappa.
