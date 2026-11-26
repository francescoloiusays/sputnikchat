# Libro IV · Il Lab dei Ricordi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un bosco grande attaccato all'isola a ovest, con la locanda Il Tofu della Nebbia, Nonna Lux e i cinque clienti; la cucina come meccanica (gioco ai fornelli, dispensa, piatti che danno forza nei duelli); i cinque capitoli del Libro IV.

**Architecture:** La forma del bosco vive in `shared/bosco.js` (puro, client + server), come `shared/terre.js`, ed entra nel terreno dell'isola (`world.js`), con la mappa allargata a ovest. Alberi fitti, locanda e personaggi stanno in una regione caricata a parte (`regions/bosco.js`). Ricette, ingredienti ed effetti stanno in `shared/cucina.js` (puro). Il server tiene la dispensa, il piatto attivo e i passi del libro. Il Libro IV continua lo stato `p.libro2`, con capitoli `book: 4` dopo `L3_END`.

**Tech Stack:** JavaScript ES modules, Three.js (client), socket.io (server), `node:test` per i moduli condivisi.

**Spec:** `docs/superpowers/specs/2026-11-26-libro4-lab-dei-ricordi-design.md`

## Global Constraints

- Node: `CODE="/c/Users/Francesco Loiudice/AppData/Local/Programs/Microsoft VS Code/Code.exe"`, eseguito con `ELECTRON_RUN_AS_NODE=1 "$CODE" …`. Test: `ELECTRON_RUN_AS_NODE=1 "$CODE" --test tests/`.
- Testi del gioco in italiano. Accordi di genere con `{o}` / `gx2`. Le stringhe con apostrofi vanno tra virgolette doppie.
- Giorno e notte **solo** con `islandNight()` / `islandHour()` di `shared/clock.js`, mai con l'ora vera.
- Nomi fissati: **Nonna Lux** (`lux`), **Ettore** (`ettore`: Cavaliere Errante, ghiaccio), **Rina** (`rina`: Tagliaborse, fango), **Nando** (`nando`: Marinaio, palude), **Greta** (`greta`: Custode del Ponte, pietra), **Pippo** (`pippo`: Ambulante, pietra). Locanda: **Il Tofu della Nebbia**. Zona: **Il Bosco che Profuma**.
- Niente nome, logo o insegne del locale vero di Milano.
- Livelli dei capitoli: 11, 12, 13, 14, 15.
- La fine del libro resta in sospeso. Testo fisso: `end: 'Fine del Libro IV.'`. La scena finale è quella del quaderno, dalla spec.
- Ogni file CRLF resta CRLF. Commit con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push su main solo con il sì di Francesco.
- Server di prova: porta 3001, `DATA_DIR=$S/data3001`. Si riavvia quando cambiano `server.js` o `shared/`.

**Cambiamento rispetto alla spec (scelta di Claude, da dire a Francesco):** il piatto dura **30 minuti veri** invece di "3 duelli". Il motivo: i duelli contro NPC e viandanti si simulano nel browser e il server non li conta in modo affidabile. Il limite resta di 3 piatti al giorno.

## Review Focus

1. **Mappa più larga che alta** (480 × 360 m). Minimappa, carta A3 e `mapToPx` non devono schiacciare né tagliare il bosco. Test: Task 2, passo 6.
2. **Telefono:** alberi del bosco e locanda non devono far scendere il frame rate sotto i 30 fps su un telefono di fascia media (viewport mobile del browser). Test: Task 3, passo 5.
3. **Ingredienti mancanti in un passo `cook`:** il gioco dice cosa manca e dove trovarlo, e non consuma niente. Test: Task 5, `cook:start rifiuta senza ingredienti`.
4. **Acqua della nebbia solo all'alba:** fuori dall'alba un messaggio dice quanto manca, e l'acqua si raccoglie davvero ogni giorno dell'isola. Test: Task 4, `acqua solo all'alba`.
5. **Giocatori a metà dei libri precedenti:** chi non ha finito il Libro III non vede il Libro IV aperto, e chi lo ha finito non perde niente del suo stato (`st.ans` dei libri vecchi resta). Test: Task 7, `il libro IV parte dopo L3_END`.

---

### Task 1: La forma del bosco (`shared/bosco.js`)

**Files:**
- Create: `public/js/shared/bosco.js`
- Test: `tests/bosco.test.mjs`

**Interfaces:**
- Produces:
  - `BOSCO = { x: -200, z: 10, r: 70 }`
  - `NECK_B = { a: [-68, 16], b: [-138, 10], w: 12 }`
  - `BP`: luoghi `[x, z]`, con almeno `locanda`, `soglia` (davanti alla porta), `fonte` (l'acqua della nebbia), `radura`, `fungaia`, `roveto`, `prato_erbe`
  - `BOSCO_PATHS`: segmenti `[[x, z], [x, z]]` dal collo alla locanda e ai luoghi
  - `BOSCO_PADS = [{ at: BP.locanda, r: 13, h: 2.4 }]`
  - `boscoMask(x, z) → number`: stessa scala di `terreMask`; > 0 = terra
  - `boscoRelief(x, z) → number`: metri in più; dolce, al massimo 5
  - `inBosco(x, z) → boolean`
  - `nearBoscoBuild(x, z, m = 0) → boolean`: vicino alla locanda o ai sentieri, cioè niente alberi
  - `pathDistBosco(x, z) → number`

- [ ] **Step 1: Write the failing test** (`tests/bosco.test.mjs`, con `node:test` e `assert`):
  - `centro e collo sono terra`: `boscoMask(BOSCO.x, BOSCO.z) > 0.5`; `boscoMask(-100, 13) > 0`
  - `fuori è mare`: `boscoMask(-290, 10) < 0`; `boscoMask(-200, -95) < 0`
  - `la secca resta fuori`: `boscoMask(-148, 118) < 0`
  - `la locanda è spianata e senza alberi`: `nearBoscoBuild(...BP.locanda)` è `true`
  - `inBosco`: `true` per `BP.locanda`, `false` per `(0, 20)` e per `(128, 24)`
- [ ] **Step 2:** Run: `ELECTRON_RUN_AS_NODE=1 "$CODE" --test tests/bosco.test.mjs`. Expected: FAIL (modulo mancante).
- [ ] **Step 3:** Implement `shared/bosco.js` sul modello di `shared/terre.js`: lobo irregolare con seni, più il collo con `distSeg`. Nessun import di THREE.
- [ ] **Step 4:** Run the test. Expected: PASS.
- [ ] **Step 5: Commit** `Bosco che Profuma: la forma del bosco a ovest (shared/bosco.js)`

### Task 2: La mappa si allarga e il bosco entra nel terreno

**Files:**
- Modify: `public/js/world.js`: `WORLD`, `islandMask`, `computeHeight`, `pathDist` / `SIDE_PATHS`, il filtro di alberi, rocce e canne (righe circa 596, 734, 802, 829), `zoneName`
- Modify: `public/js/atlas.js`: `BASE`, `PPM`, il ciclo a riga circa 681 (`MIN_Z + 352`) e `exportCanvas`

**Interfaces:**
- Consumes: Task 1, tutto.
- Produces:
  - `WORLD.MIN_X = -300`, `WORLD.SEG = 266`
  - `WORLD.BOSCO = BOSCO` (re-export)
  - `zoneName(x, z, y)` restituisce `'Il Bosco che Profuma'` se `inBosco(x, z)`

- [ ] **Step 1:** In `islandMask`, aggiungi `boscoMask(x, z)` al `Math.max`. In `computeHeight`, aggiungi `boscoRelief(x, z) * smooth(0.05, 0.35, m)` e spiana i `BOSCO_PADS` come i `PADS` delle Terre Nuove. Aggiungi `...BOSCO_PATHS` a `SIDE_PATHS`.
- [ ] **Step 2:** Imposta `MIN_X: -300, SEG: 266`. Nei filtri di decorazione aggiungi `nearBoscoBuild(...)` accanto a `nearTerreBuild(...)`, e dentro `inBosco` niente canne.
- [ ] **Step 3:** In `zoneName`, se `inBosco(x, z)` restituisci `'Il Bosco che Profuma'`, prima del ramo di `inTerre`.
- [ ] **Step 4:** Riavvia il server di prova e ricarica. Expected: niente errori in console. `g.world.groundAt(-200, 10) > 0.5`. `g.world.groundAt(-100, 13) > 0`.
- [ ] **Step 5: Walk test.** Parti da `(-60, 15)` con `g.keys.KeyW` verso ovest e arriva a `BP.locanda` senza cadere in acqua: `g.player.pos.y > 0` per tutto il tragitto. La zona in HUD diventa "Il Bosco che Profuma".
- [ ] **Step 6: Mappe.**
  - La minimappa al centro del bosco mostra il bosco, non schiacciato.
  - Nella carta A3, `exportCanvas()` mostra isola, Terre Nuove e bosco interi dentro la cornice, e la legenda non si sovrappone alla carta. Verifica con uno screenshot della pagina A3.
  - Se la carta non è quadrata, la scala orizzontale e quella verticale restano uguali: un cerchio resta un cerchio.
- [ ] **Step 7: Commit** `La mappa si allarga a ovest: il Bosco che Profuma entra nel terreno, minimappa e carta A3`

### Task 3: La regione del bosco e la locanda (`regions/bosco.js`)

**Files:**
- Create: `public/js/regions/bosco.js`, con `export async function buildBosco(app)`, che restituisce `{ group, update(dt, t), dispose() }` come `buildRiva`
- Modify: `public/js/regions/index.js`: `stream.region('Bosco che Profuma', { x: BOSCO.x, z: BOSCO.z }, BOSCO.r + 70, …)`
- Modify: `public/js/shared/lore.js`: `NPCS.lux`, `NPCS.ettore`, `NPCS.rina`, `NPCS.nando`, `NPCS.greta`, `NPCS.pippo`

**Interfaces:**
- Consumes: Task 1 (`BP`, `BOSCO_PADS`), `app.interiors.add(...)`.
- Produces:
  - `NPCS.<id>`: `{ name, where: 'Il Tofu della Nebbia', x, z, y, ry, app, look, lines[3], actions }`. Per `lux`: `actions: [['cucina', 'La cucina di Nonna Lux'], ['dispensa', 'La dispensa']]`.
  - `INN`: export di `shared/bosco.js` aggiunto qui, `{ x, z, ry, y, w: 14, d: 10, h: 4.2 }`. Lo usano il server (raggio di `cook`) e i test.

- [ ] **Step 1: Il bosco.**
  - Faggi e abeti istanziati (`InstancedMesh`), sottobosco, muschio, funghi decorativi, raggi di luce nella nebbia.
  - La densità scende con la distanza dalla camera, come `Grass`.
  - Niente alberi dove `nearBoscoBuild` è vero.
- [ ] **Step 2: La locanda fuori.**
  - Casa bassa di legno, finestre gialle con luce calda, comignolo con fumo.
  - Insegna di legno con incisa la scritta "IL TOFU DELLA NEBBIA", sotto la gronda, che non tocca il tetto: canvas come l'insegna del Forno in `regions/riva.js`.
  - Porta verso `BP.soglia`.
- [ ] **Step 3: La locanda dentro.**
  - Registrata con `app.interiors.add({ name: 'Il Tofu della Nebbia', outName: 'Il Bosco che Profuma', x, z, ry, y, w, d, h, groups: [g], camDist: 2.8 })`.
  - Legno, piante, barattoli, bancone aperto sulla cucina, due tavoli lunghi con panche, luci calde basse.
  - Colliders per bancone, tavoli e muri.
  - I cinque seduti ai tavoli (pose da seduti se `Character` le ha, altrimenti in piedi accanto alle panche); Lux dietro il bancone.
- [ ] **Step 4:** Walk test: entri dalla porta, il nome in HUD diventa "Il Tofu della Nebbia", E vicino a Lux mostra "Parla con Nonna Lux". Fai lo screenshot fuori e dentro e mandalo a Francesco con SendUserFile.
- [ ] **Step 5: Telefono.** Con `resize_window` preset `mobile`, ricarica e resta 20 s davanti alla locanda e 20 s dentro. Expected: media dei frame misurata con `requestAnimationFrame` per 20 s ≥ 30. Se è sotto, riduci densità e ombre del bosco.
- [ ] **Step 6: Commit** `Il Tofu della Nebbia: il bosco fitto, la locanda dentro e fuori, Nonna Lux e i cinque`

### Task 4: La dispensa e gli ingredienti (`shared/cucina.js`, server)

**Files:**
- Create: `public/js/shared/cucina.js`
- Modify: `server.js`: profilo (`p.dispensa = {}`), `privateView` (`dispensa`), `gather:pick`, `fish:reel`, nuova azione del fornaio
- Test: `tests/cucina.test.mjs`

**Interfaces:**
- Produces, in `cucina.js`:
  - `INGR`: `{ id: { name, icon, where } }`. Nuovi: `funghi`, `erbe`, `bacche`, `acqua_nebbia`, `pane_tobia`; più ogni pesce di `FISH` con `rar` diverso da `junk` e da `special`. Questi si generano da `FISH_IDS`, con `name` uguale a quello del pesce.
  - `BOSCO_NODES`: `[{ id: 'b0'…, kind, x, z }]`. Sei nodi per `funghi`, `erbe` e `bacche`; due per `acqua_nebbia` (`BP.fonte`).
  - `BOSCO_GATHER = { cooldown: 15 * 60 * 1000, daily: 10 }`
  - `DISPENSA_MAX = 30` (per ingrediente)
  - `dawn(now) → boolean`: `islandHour(now) >= 5 && < 9`
  - `addIngr(p, id, n) → number` (rispetta `DISPENSA_MAX`, restituisce quanti ne ha aggiunti)
  - `hasIngr(p, need) → string | null`: `null` se ci sono tutti, altrimenti il nome del primo che manca
  - `takeIngr(p, need)`
- Server: `gather:pick` accetta anche gli id di `BOSCO_NODES` e mette nella dispensa. `fish:reel` fa `addIngr(p, F.fish, 1)` per i pesci validi. Nuovo evento `riva:pane` (vicino a `NPCS.fornaio`): 1 `pane_tobia`, al massimo 2 al giorno, solo dopo il capitolo IV.3 passo 3 (Task 7).

- [ ] **Step 1: Write the failing tests:**
  - `addIngr rispetta il massimo`: con `dispensa.funghi = 29`, `addIngr(p, 'funghi', 3)` restituisce 1 e la dispensa vale 30
  - `hasIngr dice cosa manca`: `hasIngr({ dispensa: { funghi: 1 } }, { funghi: 2 })` restituisce `INGR.funghi.name`
  - `i pesci sono ingredienti`: `INGR.luccio.name === FISH.luccio.name`; non esistono `INGR.stivale` né `INGR.bottiglia`
  - `acqua solo all'alba`: `dawn(t)` è `true` per un `t` con `islandHour(t) = 6`, `false` per un `t` con `islandHour(t) = 12` (i `t` si costruiscono con `DAY_MS`)
- [ ] **Step 2:** Run: FAIL.
- [ ] **Step 3:** Implement `cucina.js` e le modifiche al server. Fuori dall'alba, `gather:pick` su `acqua_nebbia` risponde `fail` con "L'acqua della nebbia si raccoglie all'alba: mancano N minuti" (N calcolato con `DAY_MS`).
- [ ] **Step 4:** Run the tests: PASS. Riavvia il server di prova. Nel browser:
  - raccogli un fungo in `BP.fungaia`: `g.me.dispensa.funghi === 1`;
  - pesca un pesce al Molo: la dispensa sale di 1.
- [ ] **Step 5: Il client.**
  - I nodi del bosco sono interattivi in `regions/bosco.js`: funghi, ciuffi d'erba, cespugli di bacche, la fonte che brilla all'alba. Usano `gather:pick` come i frammenti.
  - Pannello "La dispensa" (azione `dispensa` di Lux) con gli ingredienti divisi in "dal bosco" / "dal Molo" / "dalla Riva".
- [ ] **Step 6: Commit** `La dispensa: ingredienti del bosco, pesci del Molo e pane di Tobia`

### Task 5: Ricette, gioco ai fornelli e piatti di Lux

**Files:**
- Modify: `public/js/shared/cucina.js`: `RICETTE`, `COOK`, `foodMods`
- Create: `public/js/cucina-ui.js`: il gioco ai fornelli e il pannello della cucina
- Modify: `server.js`: `cook:start`, `cook:done`, `cook:lux`; `privateView` (`ricette`, `food`, `foodLeft`)
- Modify: `public/js/main.js`: `new Cucina(this)` accanto a `new Palestra(this)`
- Test: `tests/cucina.test.mjs`

**Interfaces:**
- Produces, in `cucina.js`:
  - `RICETTE`:
    - `tofu`: `{ name: 'Tofu della Nebbia', need: { acqua_nebbia: 2, erbe: 1 }, mods: { hp: 0.04 } }`
    - `zuppa`: `{ name: 'Zuppa della Borsa Rubata', need: { luccio: 1, funghi: 3 }, mods: { atk: 0.03 } }`
    - `pane_ponte`: `{ name: 'Pane del Ponte', need: { pane_tobia: 1, lanterna: 1, erbe: 2 }, mods: { regen: 0.25 } }`
    - `cena`: `{ name: 'La Cena Lunga', need: { acqua_nebbia: 1, funghi: 2, erbe: 2, bacche: 2, anguilla: 1, pane_tobia: 1 }, mods: { meter: 0.08, hp: 0.02 } }`
  - `COOK = { phases: ['taglia', 'mescola', 'fuoco'], minMs: 6000, daily: 3, durMs: 30 * 60 * 1000, star: [0.8, 0.9, 1] }`
  - `foodMods(food, now) → mods | null`: `null` se `!food` o `now >= food.until`; altrimenti `RICETTE[food.dish].mods` con ogni valore × `COOK.star[food.stars - 1]`
- Server:
  - `cook:start { dish }`:
    - vicino a `NPCS.lux` (6 m) e dentro la locanda;
    - la ricetta deve essere del passo `cook` attuale del libro, o già imparata (`p.ricette.includes(dish)`);
    - controlla `hasIngr`; altrimenti `fail` con "Ti manca: <nome>";
    - salva `me.cooking = { id, dish, at }`;
    - restituisce `{ ok, id, phases }`.
  - `cook:done { id, score }` con `score` 0..1:
    - rifiuta se `Date.now() - at < COOK.minMs`;
    - `takeIngr`;
    - `stars = score >= 0.85 ? 3 : score >= 0.5 ? 2 : 1`;
    - impara la ricetta;
    - se il passo del libro è `cook` con lo stesso `dish`, `l2Advance`;
    - imposta `p.food = { dish, stars, until: now + COOK.durMs }`;
    - restituisce `{ ok, stars, learned, libro2 }`.
  - `cook:lux { dish }`: solo ricette imparate, al massimo `COOK.daily` al giorno (`dayc(p).cook`), `takeIngr`, `p.food` con le stelle migliori ottenute (`p.ricetteStelle[dish]`).
- Client: `cucina-ui.js` disegna le tre fasi sul modello di `fishing.js`, e Lux le commenta ("Più fine, più fine", "Adesso!").
  - `taglia`: tocchi a ritmo su una linea che scorre.
  - `mescola`: tenere l'indicatore nella zona chiara.
  - `fuoco`: fermare l'ago nella zona dorata.

- [ ] **Step 1: Write the failing tests:**
  - `foodMods scade`: con `food = { dish: 'tofu', stars: 3, until: 1000 }`, `foodMods(food, 999).hp === 0.04` e `foodMods(food, 1000) === null`
  - `le stelle pesano`: `foodMods({ dish: 'zuppa', stars: 1, until: 9e15 }, 0).atk` è circa `0.024`
  - `ogni ricetta usa solo ingredienti esistenti`: ogni chiave di ogni `need` è in `INGR`
- [ ] **Step 2:** Run: FAIL.
- [ ] **Step 3:** Implement cucina.js, the server handlers and `cucina-ui.js`.
- [ ] **Step 4:** Run the tests: PASS.
- [ ] **Step 5: Browser.** Riempi la dispensa del profilo di prova con `addIngr` via una route di prova o modificando `db.json` a server fermo. Poi:
  - `cook:start` senza ingredienti risponde "Ti manca: …" e la dispensa non cambia (Review Focus 3);
  - con gli ingredienti, gioca le tre fasi: arrivano le stelle e `g.me.food` è impostato;
  - `cook:lux` per la quarta volta nello stesso giorno viene rifiutato.
- [ ] **Step 6: Commit** `La cucina di Nonna Lux: ricette, il gioco ai fornelli, i piatti per i duelli`

### Task 6: Il piatto nei duelli (e la palestra nei duelli locali)

**Files:**
- Modify: `public/js/shared/fight.js:60-71` (`makeFighter`)
- Modify: `server.js:575-578` (`fighterSetup`)
- Modify: `public/js/main.js:859` (`_fighterInfo`)
- Modify: `public/js/duel.js:104` (`setup`)
- Test: `tests/fight-food.test.mjs`

**Interfaces:**
- Consumes: `foodMods` (Task 5).
- Produces: il campo `food: mods | null` nel setup di un combattente; `makeFighter` lo applica come `setup.pet.mods`: `atk`, `hp`, `meter`, più `regen` sommato a `st.regen`.

- [ ] **Step 1: Write the failing test:**
  - `il piatto dà vita`: due `createDuel(A, B)` con lo stesso setup, uno con `food: { hp: 0.04 }`; l'`hpMax` del secondo è circa 1,04 volte il primo
  - `la palestra conta anche in locale`: il setup costruito da `duel.js` passa `gym`; si testa estraendo `setup` in una funzione esportata `duelSetup(x)` in `duel.js`, o in un modulo condiviso se `duel.js` importa THREE
- [ ] **Step 2:** Run: FAIL.
- [ ] **Step 3:** Implement.
  - `fighterSetup` aggiunge `food: foodMods(p.food, Date.now())`.
  - `_fighterInfo` aggiunge `food: foodMods(this.me.food, Date.now())`.
  - `setup` in `duel.js` passa `gym` e `food`. **Prima `gym` mancava: era un bug, la palestra non contava nei duelli contro NPC e viandanti.**
- [ ] **Step 4:** Run the test: PASS.
- [ ] **Step 5:** Nell'HUD del duello, accanto al nome, una piccola icona del piatto attivo con il tempo rimasto. Il pannello personaggio mostra il piatto e quanto manca.
- [ ] **Step 6: Commit** `I piatti di Lux nei duelli; la palestra ora conta anche contro NPC e viandanti`

### Task 7: I cinque capitoli del Libro IV

**Files:**
- Modify: `public/js/shared/libro2.js`: nuovi capitoli, `L2_SPOTS` del bosco, `L4_END`, `bookOf`, `chapterNo`; tipo di passo `cook`
- Modify: `server.js` (`l2:act`): `cook` non si fa da `l2:act` (lo fa avanzare `cook:done`), e `l2:act` con `a === 'cook'` risponde `fail('Si cucina da Nonna Lux')`
- Modify: `public/js/libro2-ui.js`: `BOOK[4] = ['IV', 'Il Lab dei Ricordi']`, `bookSection` per il libro 4 (icona `fuoco` o una nuova `pot`), `l2Next` per `cook` ("Cucina con Nonna Lux: <ricetta> · ti manca …")
- Test: `tests/libro4.test.mjs`

**Interfaces:**
- Consumes: Task 3 (`NPCS` dei sei), Task 5 (`RICETTE`).
- Produces:
  - `L4_END = L2_CHAPTERS.length`
  - `bookOf(ch) → 2 | 3 | 4`; `chapterNo(ch) → 0..4`
  - passo `{ k: 'cook', dish, t, say?, after? }`

I capitoli (`id`, `book: 4`, `lv`, `xp`, `coins`). I testi si scrivono dalla lore della spec; i passi sono questi:

1. **`bosco` · Il bosco che profuma** (lv 11, xp 1100, coins 520)
   - `talk traghettatore` (la nebbia che profuma, a ovest)
   - `find ['soglia']`
   - `talk lux` (ti dà da mangiare e ti presenta i cinque)
   - `cook tofu`
   - `talk lux`, con `after`: la prima pagina
2. **`borsa` · La borsa rubata** (lv 12, xp 1150, coins 540)
   - `talk rina`
   - `talk ettore`
   - `find ['borsa_ponte']`: sotto il Ponte, dove Greta faceva la guardia
   - `cook zuppa`
   - `talk rina`, con `after`: il ricordo della prima cena
3. **`ponte` · La barca e il ponte** (lv 13, xp 1200, coins 560)
   - `talk nando`
   - `talk greta`
   - `talk fornaio`: Tobia, sulla Riva, ti dà il primo pane; da qui si apre l'azione `pane`
   - `cook pane_ponte`
   - `talk greta`, con `after`: la barca rotta sotto il ponte, la multa, la cena
4. **`pippo` · I pezzi di Pippo** (lv 14, xp 1250, coins 580)
   - `talk pippo`
   - `find ['pz_ettore', 'pz_rina', 'pz_nando', 'pz_greta']`: quattro luoghi dell'isola che ognuno nomina (per esempio la Forgia, il Molo, il Ponte, la radura del bosco)
   - `talk lux`
5. **`cena` · La cena lunga** (lv 15, xp 1500, coins 800, `title_id: 'lab'`, `end: 'Fine del Libro IV.'`)
   - `talk lux`
   - `cook cena`
   - `talk pippo` (il ricordo a metà: "c'era qualcuno che…")
   - `answer lux`: `q: 'Che cosa scrivo in margine?'`, tre risposte, per esempio "Che eravamo tutti qui", "Il sapore, e basta", "Niente: lo ricorderemo noi"
   - `after`: la scena del quaderno, dalla spec, parola per parola

- [ ] **Step 1: Write the failing tests:**
  - `il libro IV parte dopo L3_END`: `bookOf(L3_END) === 4`, `chapterNo(L3_END) === 0`, `bookOf(L3_END - 1) === 3`
  - `ogni spot esiste`: ogni `find` del libro 4 ha i suoi `spots` in `L2_SPOTS`
  - `ogni cook ha la sua ricetta`: ogni `cook` del libro 4 ha `dish` in `RICETTE`
  - `ogni who esiste`: ogni `who` del libro 4 è in `NPCS`
  - `livelli`: i `lv` dei capitoli del libro 4 sono `[11, 12, 13, 14, 15]`
- [ ] **Step 2:** Run: FAIL.
- [ ] **Step 3:** Implement capitoli, spot e UI. Il titolo `lab` va aggiunto ai titoli (dove sta `nomi`): "Chi Ricorda i Sapori".
- [ ] **Step 4:** Run the tests: PASS.
- [ ] **Step 5: Partita completa sul server di prova.** Profilo a `L3_END`, livello 15, dispensa piena. Gioca i cinque capitoli: ogni passo avanza, le pagine si leggono nel libro, il finale mostra la scena del quaderno. Poi, con un profilo a metà del Libro III, il Libro IV non si apre (Review Focus 5).
- [ ] **Step 6: Commit** `Libro IV · Il Lab dei Ricordi: i cinque capitoli`

### Task 8: Carta, guida e pubblicazione

**Files:**
- Modify: `public/js/atlas.js`: luoghi del bosco nella zona `'Il Bosco che Profuma'`, con icone (`fuoco` per la locanda, `leaf` o `tree` per i nodi, `drop` per la fonte, se esistono in `icon-paths.js`; altrimenti si aggiungono); nuova zona nella legenda
- Modify: `README.md`: una sezione per il Libro IV e la cucina

- [ ] **Step 1:** Aggiungi i luoghi e la zona. Genera il PDF A3: un foglio, legenda senza sovrapposizioni, bosco dentro la cornice. Fai uno screenshot.
- [ ] **Step 2:** Esegui tutti i test: `ELECTRON_RUN_AS_NODE=1 "$CODE" --test tests/`. Expected: PASS.
- [ ] **Step 3: Commit** `Carta A3 e guida: il Bosco che Profuma e il Libro IV`
- [ ] **Step 4:** Manda a Francesco gli screenshot (bosco, locanda fuori e dentro, gioco ai fornelli, carta) e chiedi se pubblicare.
