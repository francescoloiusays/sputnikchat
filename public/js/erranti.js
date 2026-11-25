// =====================================================================
//  GLI ERRANTI nel mondo (solo client)
//  Quattro abitanti del borgo delle Terre Nuove che vanno e vengono per
//  l'isola. Camminano lungo i sentieri secondo l'ora (shared/erranti.js),
//  si fermano dove hanno da fare, tornano a casa. Ci si parla, si baratta,
//  e con chi ci sta si fa un duello amichevole.
// =====================================================================
import { ERRANTI, ERRANTE_IDS, erranteAt } from './shared/erranti.js';
import { Character } from './character.js';
import { PetFollower } from './pets.js';
import { npcLevel } from './shared/palestra.js';
import { characterLod } from './engine/stream.js';
import { gx2 } from './shared/libro2.js';
import { h, toast } from './util.js';

const lerpAngle = (a, b, t) => { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * t; };

import { walkTo } from './npc-walk.js';
export class Erranti {
    constructor(app) {
        this.app = app;
        this.list = ERRANTE_IDS.map(id => {
            const E = ERRANTI[id];
            const ch = new Character(E.app, E.look || {}, { name: E.name, sub: E.where, color: '#e8c08a' });
            app.scene.add(ch.root);
            const PET = E.pet;
            const petF = PET && new PetFollower(app, { pet: () => PET, element: () => E.fight?.element || 'fuoco', pos: () => ch.root.position, yaw: () => ch.root.rotation.y, show: () => ch.root.visible && (app.mode === 'world' || app.mode === 'fish'), fishing: () => false });
            const it = { id: 'errante', k: id, x: 0, z: 0, r: 2.4, label: `Parla con ${E.name}` };
            app.world.interactables.push(it);
            return { id, E, ch, it, ry: 0, stop: 0, petF };
        });
    }
    update(dt, camPos) {
        const W = this.app.world, P = this.app.player?.pos, now = Date.now();
        for (const n of this.list) {
            if (this.app.cena) { n.ch.root.visible = false; n.petF?.update(dt); continue; }   // durante la grande cena di Rob sono tutti a tavola
            const at = erranteAt(n.id, now), ch = n.ch;
            // se gli parli si ferma a guardarti (solo da te: per gli altri continua la sua strada)
            const near = P && Math.hypot(P.x - ch.root.position.x, P.z - ch.root.position.z) < 3;
            if (near && this.app.panels.current === 'errante') n.stop = 1.5;
            n.stop = Math.max(0, n.stop - dt);
            const far = camPos.distanceTo(ch.root.position) > 90;
            let mv = 0;
            if (n.stop) { /* resta lì */ }
            else if (far) { ch.root.position.set(at.x, W.terrainAt(at.x, at.z), at.z); n.wk = false; }   // lontano nessuno lo vede: niente passi
            else mv = walkTo(W, n, at, dt, n.id.length, erranteAt(n.id, now + 12000));   // guarda dove sarà fra una dozzina di secondi e ci traccia il sentiero
            const walking = !n.stop && (far ? at.walking : mv > dt * 0.35);
            const want = n.stop && P ? Math.atan2(P.x - ch.root.position.x, P.z - ch.root.position.z) : walking ? (n.moveYaw ?? at.yaw ?? n.ry) : at.yaw ?? n.ry;
            n.ry = lerpAngle(n.ry, want, Math.min(1, dt * 6));
            ch.root.rotation.y = n.ry;
            ch.state = walking ? 'walk' : 'idle'; ch.speed = walking ? 1.5 : 0;
            n.it.x = ch.root.position.x; n.it.z = ch.root.position.z; n.it.y = ch.root.position.y;
            const d = camPos.distanceTo(ch.root.position);
            ch.root.visible = d < 80;
            characterLod(ch, d);
            if (ch.tag) ch.tag.visible = d < 26;
            if (d < 80) ch.update(dt);
            n.petF?.update(dt);
        }
    }
}

// --- il dialogo con un errante (pannello) ---
export function erranteView(panels, id) {
    const app = panels.app, E = ERRANTI[id];
    if (!E) return panels.close();
    const n = (panels.errLine = ((panels.errLine ?? -1) + 1)) % E.lines.length;
    const T = E.trade, done = app.me?.errToday?.[id];
    const sex = app.me?.appearance?.sex;
    const btnS = (label, fn, cls = '', disabled) => h('button', { class: 'btn ' + cls, onclick: fn, disabled: disabled || null }, label);
    panels.set('talk', E.name, h('div', { class: 'parchment' },
        h('p', { class: 'npc-say' }, `«${gx2(E.lines[n], sex)}»`),
        h('p', { class: 'muted small' }, E.where + ' · abita nel borgo delle Terre Nuove'),
        T ? h('div', { class: 'ledger-row trade-row' },
            h('div', { class: 'grow' }, h('div', { class: 'nm' }, 'Un baratto'), h('div', { class: 'sub trade-say' }, `«${T.say}»`),
                h('div', { class: 'sub' }, 'In cambio: ' + Object.entries(T.get).map(([k, v]) => `${v} × ${panels.matName(k)}`).join(', '))),
            h('div', { class: 'btn-col' }, panels.costChips(T.give),
                btnS(done ? 'Per oggi basta' : 'Baratta', async () => { const r = await panels.act('errante:trade', { id }, 'Affare fatto'); if (r.ok) { app.me.errToday = { ...(app.me.errToday || {}), [id]: 1 }; } panels.render(); }, 'btn-sm btn-primary', done || !panels.canPay(T.give)))) : null,
        h('div', { class: 'btn-row', style: { marginTop: '10px' } },
            E.fight ? btnS('Duello amichevole', () => { panels.close(); startErranteDuel(app, id); }, 'btn-primary') : h('span', { class: 'muted small' }, `${E.name.split(' ')[0]} non fa duelli: ha altro da fare.`),
            btnS('Altro?', () => panels.render(), ''),
            btnS('Arrivederci', () => panels.close(), ''))));
}

// un duello amichevole: conta come un allenamento
export function startErranteDuel(app, id) {
    const E = ERRANTI[id], F = E.fight, lv = npcLevel(id, app.me?.npcForma), pts = Math.max(0, lv - 1);   // con la forma della palestra
    app.localKind = 'practice'; app.practiceLevel = 0.6 + lv / 25; app.practiceEl = F.element;
    const types = ['spada', 'lancia', 'ascia', 'martello', 'pugnale'];
    const foe = {
        id: 'errante:' + id, name: F.name, element: F.element, rating: 900 + lv * 30, level: lv, cardImage: null, gear: [],
        appearance: E.app, look: { ...(E.look || {}), weapon: { type: types[id.length % types.length], material: lv >= 10 ? 'ferro' : 'legno', handle: 'cuoio', gem: 'nessuna', name: 'Attrezzo da lavoro' } },
        talents: { forza: Math.ceil(pts / 2), tempra: Math.floor(pts / 2), maestria: 0 }, petSp: E.pet?.sp,
    };
    app.enterDuel({ id: 'practice', a: app.myFighterInfo(), b: foe, phase: 'fight', noRematch: true,
        texts: [`${E.name} ride e ti stringe la mano: «Bel duello. Domani rivincita.»`, `${E.name} ti aiuta a rialzarti: «Tutto a posto? Ti offro qualcosa al borgo.»`] }, 'local', 'a');
}
