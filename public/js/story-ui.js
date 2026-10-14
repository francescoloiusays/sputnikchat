// =====================================================================
//  IL ROMANZO DELLA NEBBIA: libro, filo e dialoghi (solo client)
//  - storyBeat(): che cosa dice chi apre o chiude il capitolo, e che cosa si può fare
//  - il Libro dell'Approdo (tasto G), il filo sotto l'orologio dell'isola
//  - i luoghi della storia: il Ratto in piazza, la cripta, il molo, il cassetto
// =====================================================================
import * as THREE from 'three';
import { STORY, STORY_END, STORY_SPOTS, WAYS, chapterReady, stepHave, gx } from './shared/story.js';
import { NPCS } from './shared/lore.js';
import { TEXT, SEME_DI, ritratto } from './story-text.js';
import { Character } from './character.js';
import { h, toast, $ } from './util.js';
import { iconSVG } from './icons.js';

const SEED_COL = { fuoco: '#ff6a2f', ghiaccio: '#7fd8ff', palude: '#6fcf5a', pietra: '#c4bcb2', tempesta: '#ffe14a', spettro: '#c49aff', fango: '#c89660' };
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const whoName = (who) => NPCS[who]?.name || STORY_SPOTS[who]?.name || who;
const whoWhere = (who) => NPCS[who]?.where || STORY_SPOTS[who]?.name || '';

export function storyCtx(app) {
    const me = app.me || {}, st = me.story || {};
    const sex = me.appearance?.sex || app.local?.appearance?.sex || 'm';
    return { name: me.name || app.local?.name || 'Viandante', sex, o: sex === 'f' ? 'a' : 'o', seme: SEME_DI[me.card?.element] || 'della nebbia', ans: st.ans || [], nome: st.name, way: st.way, lv: me.level || 1 };
}
const islandNight = (app) => (app.env?.state?.day ?? 0) < 0.3;

// --- CHE COSA SUCCEDE QUANDO PARLI CON QUALCUNO DELLA STORIA ---
export function storyBeat(app, who) {
    const me = app.me;
    if (!me || me.offline || !me.story) return null;
    const st = me.story;
    // subito dopo una risposta: la reazione di chi te l'ha chiesta
    const A = app.storyAfter;
    if (A && A.who === who && Date.now() - A.at < 120000) return { kind: 'after', lines: A.lines, act: A.act };
    const C = STORY[st.ch];
    if (!C) return null;
    const T = TEXT[C.id], c = storyCtx(app), lv = me.level || 1, endWho = C.end || C.who;
    if (who !== C.who && who !== endWho) return null;
    if (!C.steps.length) {
        if (who !== C.who) return null;
        if (C.id === 'approdo' && !st.seen) return null;
        return { kind: 'close', lines: T.open(c), act: [{ label: C.id === 'approdo' ? 'Prendi il libro' : 'Chiedigli chi è', ic: C.id === 'approdo' ? 'openbook' : 'talk', fn: () => storyAnswer(app, who, null) }] };
    }
    if (!st.on) {
        if (who !== C.who) return null;
        if (lv < C.lv) return { kind: 'early', lines: [`Non ancora. Torna quando sarai più forte: la storia riprende da qui al livello ${C.lv}.`] };
        const lines = [...(T.echo?.(c) || []), ...T.open(c)];
        if (C.way) return { kind: 'way', lines, act: Object.entries(WAYS).map(([k, label]) => ({ label, ic: k === 'cripta' ? 'skull' : 'friends', fn: () => storyStart(app, k) })) };
        return { kind: 'start', lines, act: [{ label: `Comincia: ${C.title}`, ic: 'openbook', fn: () => storyStart(app) }] };
    }
    if (who !== endWho) return who === C.who ? { kind: 'wait', lines: T.wait(c, st), steps: true } : null;
    if (!chapterReady(st, me)) return { kind: 'wait', lines: T.wait(c, st), steps: true };
    if (C.night && !islandNight(app)) return { kind: 'wait', lines: T.night(c) };
    return { kind: 'ask', lines: T.ask(c), q: C.q, act: C.a.map((a, i) => ({ label: gx(a, c.sex), fn: () => storyAnswer(app, who, i) })) };
}

async function storyStart(app, way) {
    const r = await app.net.request('story:start', { way });
    if (!r.ok) return toast(r.msg, { kind: 'bad' });
    app.applyStory(r.story);
    const C = STORY[r.story.ch];
    app.audio.play('quest');
    toast(h('div', {}, h('b', {}, `Capitolo ${ROMAN[r.story.ch]}: ${C.title}`), h('div', {}, 'Una nuova pagina nel libro (tasto G). Il filo sotto l\'orologio ti dice cosa fare.')), { kind: 'ok', icon: 'openbook', duration: 8000 });
    app.panels.render();
}
async function storyAnswer(app, who, a) {
    const r = await app.net.request('story:answer', a == null ? {} : { a });
    if (!r.ok) return toast(r.msg, { kind: 'bad' });
    const C = STORY[r.ch], T = TEXT[C.id];
    app.applyStory(r.story);
    const c = storyCtx(app);
    const lines = [...(a != null && T.reply ? [T.reply[a](c)] : []), ...(T.after?.(c) || [])];
    const act = [{ label: 'Leggi la pagina', ic: 'openbook', fn: () => { app.storyAfter = null; app.panels.tabs.libro = r.ch; app.panels.open('libro'); } }];
    if (r.name) act.unshift({ label: 'Il tuo Nome Vero', ic: 'quill', fn: () => { app.storyAfter = null; app.panels.open('nomevero', { name: r.name }); } });
    app.storyAfter = { who, at: Date.now(), lines, act };
    app.audio.play(C.id === 'biglietto' ? 'special' : 'saved');
    if (r.xp) toast(`Capitolo chiuso: +${r.xp} esperienza${r.title ? '' : ''}`, { kind: 'ok', icon: 'openbook', duration: 5000 });
    if (C.id === 'biglietto') toast(h('div', {}, h('b', {}, 'Fine del Libro I'), h('div', {}, 'La nebbia non finisce mai.')), { kind: 'coin', icon: 'openbook', duration: 12000 });
    app.panels.render();
}

// --- IL FILO: la prossima cosa da fare, in una riga ---
export function storyThread(app) {
    const me = app.me, st = me?.story;
    if (!st || me.offline) return null;
    if (st.ch >= STORY_END) return { text: 'Libro I finito. La nebbia non finisce mai.', done: true };
    const C = STORY[st.ch], lv = me.level || 1;
    if (C.id === 'approdo') return { text: 'Raggiungi la Piazza della Gloria: il Ratto dei Cronisti ha un libro per te' };
    if (!st.on) {
        if (lv < C.lv) return { text: `${C.title}: il prossimo capitolo si apre al livello ${C.lv}`, wait: true };
        return { text: C.who === 'pietre' ? `${C.title}: vai al Cerchio di Pietre` : `${C.title}: parla con ${whoName(C.who)} (${whoWhere(C.who)})` };
    }
    const next = C.steps.find(s => stepHave(st, s, me) < s.n);
    if (next) return { text: `${C.title}: ${next.t}${next.n > 1 ? ` (${Math.min(next.n, stepHave(st, next, me))}/${next.n})` : ''}` };
    const end = C.end || C.who;
    return { text: `${C.title}: torna da ${whoName(end)}${C.night ? ', di notte' : ''}` };
}
export function updateThread(app) {
    const el = $('#story-thread');
    if (!el) return;
    const T = storyThread(app);
    el.classList.toggle('hidden', !T);
    if (!T) return;
    const txt = T.text;
    if (el.dataset.txt === txt) return;
    el.dataset.txt = txt;
    el.classList.toggle('dim', !!T.wait || !!T.done);
    el.innerHTML = iconSVG('openbook') + '<span></span>';
    el.querySelector('span').textContent = txt;
}

// --- IL BLOCCO DELLA STORIA NEI DIALOGHI ---
export function storyBox(app, who, extra) {
    const b = storyBeat(app, who);
    if (!b) return null;
    const me = app.me, st = me.story, C = STORY[st.ch];
    const lines = b.lines.map(l => h('p', { class: 'st-line' }, `«${l}»`));
    const steps = b.steps && C ? h('ul', { class: 'st-steps' }, C.steps.map(s => {
        const have = Math.min(s.n, stepHave(st, s, me)), ok = have >= s.n;
        return h('li', { class: ok ? 'ok' : '' }, h('span', { html: iconSVG(ok ? 'seal' : 'scroll') }), `${s.t}${s.n > 1 ? ` · ${have}/${s.n}` : ''}`);
    })) : null;
    return h('div', { class: 'st-box' + (b.kind === 'ask' ? ' ask' : '') },
        h('div', { class: 'st-head', html: iconSVG('openbook') }, C && b.kind !== 'after' ? `${C.id === 'approdo' ? 'Prologo' : C.id === 'biglietto' ? 'Epilogo' : 'Capitolo ' + ROMAN[st.ch]} · ${C.title}` : 'Il Romanzo della Nebbia'),
        lines,
        b.kind === 'ask' && b.q ? h('p', { class: 'st-q' }, b.q) : null,
        steps,
        b.act?.length || extra?.length ? h('div', { class: 'btn-row' + (b.kind === 'ask' ? ' st-answers' : '') },
            (b.act || []).map(a => h('button', { class: 'btn ' + (b.kind === 'ask' ? 'btn-answer' : 'btn-primary'), html: a.ic ? iconSVG(a.ic) : null, onclick: a.fn }, a.label)),
            extra || []) : null);
}
// la voce di chi parla, la prima volta che si apre il dialogo
export function storyVoice(app, who) {
    const b = storyBeat(app, who);
    if (!b?.lines?.length) return false;
    const voice = NPCS[who] ? who : who === 'ratto_piazza' ? 'ratto' : who === 'specchio' ? 're' : 'spettro';
    app.audio.voice?.(voice, b.lines[0]);
    return true;
}

// --- IL LIBRO DELL'APPRODO ---
export function bookContent(app, panels) {
    const me = app.me, st = me?.story;
    if (!st) return [h('p', { class: 'muted' }, 'Il libro si apre quando il portale è aperto.')];
    const c = storyCtx(app), cur = Math.min(st.ch, STORY_END);
    const chapters = STORY.map((C, i) => ({ C, i, done: i < st.ch, now: i === st.ch, locked: i > st.ch }));
    let sel = panels.tabs.libro ?? Math.min(cur, STORY_END - 1);
    if (sel > cur || sel > STORY_END - 1) sel = Math.min(cur, STORY_END - 1);
    panels.tabs.libro = sel;
    const tabs = h('div', { class: 'bk-tabs' }, chapters.map(({ C, i, done, now, locked }) => h('button', {
        class: 'bk-tab' + (i === sel ? ' sel' : '') + (done ? ' done' : '') + (now ? ' now' : '') + (locked ? ' locked' : ''),
        style: { '--c': SEED_COL[C.seed] || '#c9a24a' }, disabled: locked, title: locked ? 'Ancora da scrivere' : C.title,
        onclick: () => { panels.tabs.libro = i; panels.render(); },
    }, h('i', {}), h('b', {}, C.seed ? ROMAN[i] : i === 0 ? 'P' : 'E'), h('span', {}, C.title))));
    const C = STORY[sel], T = TEXT[C.id], done = sel < st.ch, now = sel === st.ch;
    const pages = [];
    if (T.pages.start && (done || (now && st.on))) pages.push(T.pages.start({ ...c, way: st.way }));
    if (T.pages.end && done) pages.push(T.pages.end({ ...c, way: st.way }));
    const leaf = h('article', { class: 'bk-leaf' },
        h('div', { class: 'bk-lh' }, h('b', {}, C.title), h('span', {}, C.sub)),
        pages.length ? pages.flat().map(p => h('p', {}, p)) : h('p', { class: 'bk-empty' }, now ? (st.on ? 'La pagina si sta scrivendo.' : 'Questa pagina è ancora bianca. Si scrive quando apri il capitolo.') : 'Questa pagina è ancora bianca.'),
        done && T.pages.note ? h('p', { class: 'bk-note' }, `Nota dei Cronisti: ${T.pages.note}`) : null);
    const thread = storyThread(app);
    const showName = st.name && sel >= STORY.findIndex(x => x.id === 'melma');
    return [
        h('div', { class: 'bk-top' },
            thread ? h('div', { class: 'bk-thread', html: iconSVG('scroll') }, h('span', {}, thread.text)) : null,
            h('button', { class: 'btn btn-sm', html: iconSVG('wave'), onclick: () => { panels.close(); app.playPrologue({ replay: true }); } }, 'Rivedi l\'approdo')),
        tabs,
        leaf,
        now && st.on && C.steps.length ? h('ul', { class: 'st-steps bk-steps' }, C.steps.map(s => {
            const have = Math.min(s.n, stepHave(st, s, me)), ok = have >= s.n;
            return h('li', { class: ok ? 'ok' : '' }, h('span', { html: iconSVG(ok ? 'seal' : 'scroll') }), `${s.t}${s.n > 1 ? ` · ${have}/${s.n}` : ''}`);
        })) : null,
        showName ? h('div', { class: 'bk-name' }, h('small', {}, 'Il tuo Nome Vero'), h('b', {}, st.name), h('p', {}, ritratto(c)),
            h('button', { class: 'btn btn-sm', html: iconSVG('quill'), onclick: () => panels.open('nomevero', { name: st.name }) }, 'Cambia il Nome Vero')) : null,
    ];
}

// --- I LUOGHI DELLA STORIA NEL MONDO ---
export function buildStorySpots(app) {
    const W = app.world, S = STORY_SPOTS;
    const st = () => app.me?.story;
    const cur = () => STORY[st()?.ch]?.id;
    // il Ratto dei Cronisti aspetta in piazza chi non ha ancora il libro
    const R = NPCS.ratto, rs = S.ratto_piazza;
    const rat = new Character(R.app, R.look || {}, { name: 'Il Ratto dei Cronisti', sub: 'ha un libro per te', color: '#c9a0ff' });
    const ry = W.groundAt(rs.x, rs.z);
    rat.root.position.set(rs.x, ry, rs.z); rat.root.rotation.y = Math.PI * 0.85;
    rat.root.visible = false;
    app.scene.add(rat.root);
    W.interactables.push({ id: 'storia', who: 'ratto_piazza', x: rs.x, z: rs.z + 0.9, y: ry, r: 2.6, label: 'Parla con il Ratto dei Cronisti', when: () => cur() === 'approdo' });
    // la botola della cripta, nel cortile del castello
    const cs = S.cripta, cy = W.groundAt(cs.x, cs.z);
    const trap = new THREE.Group();
    trap.position.set(cs.x, cy, cs.z);
    const stone = new THREE.MeshStandardMaterial({ color: '#4a4550', roughness: 0.95 });
    const dark = new THREE.MeshStandardMaterial({ color: '#0a0710', roughness: 1 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.16, 1.4), stone); frame.position.y = 0.06; trap.add(frame);
    const hole = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 1.0), dark); hole.position.y = 0.07; trap.add(hole);
    for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.22), stone); s.position.set(0, 0.12 - i * 0.02, -0.32 + i * 0.26); trap.add(s); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 14), new THREE.MeshStandardMaterial({ color: '#2a2628', metalness: 0.8, roughness: 0.4 }));
    ring.rotation.x = Math.PI / 2; ring.position.set(0.5, 0.17, 0.4); trap.add(ring);
    trap.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
    W.scene.add(trap);
    W.interactables.push({ id: 'storia', who: 'cripta', x: cs.x, z: cs.z, y: cy, r: 2.4, label: 'Scendi nella cripta del Re Annegato',
        when: () => cur() === 'melma' && st().on && st().way === 'cripta' && !(st().prog?.re >= 1) });
    // il settimo seme, sotto le assi del molo: una luce fangosa quando è il momento
    const ms = S.molo;
    const glow = new THREE.PointLight('#c89660', 0, 3.5, 2);
    glow.position.set(ms.x, 0.25, ms.z);
    W.scene.add(glow);
    W.interactables.push({ id: 'storia', who: 'molo', x: ms.x, z: ms.z, r: 2.2, label: 'Guarda sotto le assi del molo',
        when: () => cur() === 'melma' && st().on && st().prog?.re >= 1 && !(st().prog?.fango >= 1) });
    // il cassetto del comodino, nella Stanza Bianca
    const room = W.whiteRoomSpot || { x: -4.4, z: -116.9, y: 7.6 };
    W.interactables.push({ id: 'storia', who: 'cassetto', x: room.x, z: room.z, y: room.y, r: 1.6, label: 'Apri il cassetto del comodino',
        when: () => cur() === 'eco' && st().on && !(st().prog?.drawer >= 1) });
    return {
        update(dt, t) {
            const ch = cur();
            rat.root.visible = ch === 'approdo';
            if (rat.root.visible) rat.update(dt);
            glow.intensity = ch === 'melma' && st()?.on && st().prog?.re >= 1 && !(st().prog?.fango >= 1) ? 4 + Math.sin(t * 2.3) * 1.5 : 0;
        },
    };
}

// i luoghi senza abitante: che cosa succede quando ci premi E
export async function storyInteract(app, who) {
    const me = app.me, st = me?.story;
    if (!app.net.connected || !app.helloDone || !st) return toast('Il portale è chiuso: la storia si scrive sul server', { kind: 'bad' });
    if (who === 'cripta') return app.startCrypt();
    if (who === 'molo' || who === 'cassetto') {
        const r = await app.net.request('story:find', { k: who === 'molo' ? 'fango' : 'drawer' });
        if (!r.ok) return toast(r.msg, { kind: 'bad' });
        app.applyStory(r.story);
        app.audio.play('special');
        if (who === 'molo') toast(h('div', {}, h('b', {}, 'Il Seme senza Nome'), h('div', {}, 'Sotto le assi, nel fango, c\'è un seme che non brilla. Lo riconosci subito: è dove hai messo piede il primo giorno. Ora vai allo Specchio Incantato.')), { kind: 'coin', icon: 'triorb', duration: 12000 });
        else toast(h('div', {}, h('b', {}, 'Il cassetto si apre'), h('div', {}, 'Dentro, avvolto in un fazzoletto bianco, c\'è un volto. Portalo alla Custode senza Volto, in cappella.')), { kind: 'coin', icon: 'mirror', duration: 12000 });
        return;
    }
    app.openPanel('storia', { who });
}
