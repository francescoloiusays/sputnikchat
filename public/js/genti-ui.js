// =====================================================================
//  LE GENTI DI PASSAGGIO nel mondo (solo client)
//  I viandanti del giorno (shared/genti.js): camminano per i sentieri,
//  si fermano, se gli parli ti guardano. Si parla, si baratta (una volta
//  al giorno) e ci si sfida: il cartellino dice quanto sono forti per te.
// =====================================================================
import { gentiOf, genteAt, forza, premio, MESTIERI } from './shared/genti.js';
import { Character } from './character.js';
import { characterLod } from './engine/stream.js';
import { h, toast } from './util.js';

const lerpAngle = (a, b, t) => { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * t; };
export const today = () => new Date().toISOString().slice(0, 10);

export class Genti {
    constructor(app) { this.app = app; this.day = null; this.list = []; }
    build() {
        const app = this.app, W = app.world;
        for (const n of this.list) { app.scene.remove(n.ch.root); const i = W.interactables.indexOf(n.it); if (i >= 0) W.interactables.splice(i, 1); }
        this.day = today();
        this.list = gentiOf(this.day).map(G => {
            const ch = new Character(G.app, G.look, { name: G.name, sub: `${MESTIERI[G.mestiere].nome[0]} · livello ${G.level}`, color: '#b8d8a0' });
            app.scene.add(ch.root);
            const it = { id: 'gente', k: G.k, x: 0, z: 0, r: 2.4, label: `Parla con ${G.name}` };
            W.interactables.push(it);
            return { G, ch, it, ry: 0, stop: 0 };
        });
    }
    byK(k) { return this.list.find(n => n.G.k === k)?.G; }
    update(dt, camPos) {
        if (this.day !== today()) this.build();   // a mezzanotte arriva gente nuova
        const app = this.app, W = app.world, P = app.player?.pos, now = Date.now(), lv = app.me?.level || 1;
        for (const n of this.list) {
            const ch = n.ch;
            if (app.cena || app.interior) { ch.root.visible = false; continue; }
            const at = genteAt(n.G, now);
            const near = P && Math.hypot(P.x - ch.root.position.x, P.z - ch.root.position.z) < 3;
            if (near && app.panels.current === 'gente' && app.panels.arg?.k === n.G.k) n.stop = 1.5;
            n.stop = Math.max(0, n.stop - dt);
            if (!n.stop) ch.root.position.set(at.x, W.groundAt(at.x, at.z), at.z);
            const want = n.stop && P ? Math.atan2(P.x - ch.root.position.x, P.z - ch.root.position.z) : at.yaw ?? n.ry;
            n.ry = lerpAngle(n.ry, want, Math.min(1, dt * 6));
            ch.root.rotation.y = n.ry;
            ch.state = at.walking && !n.stop ? 'walk' : 'idle'; ch.speed = at.walking && !n.stop ? 1.4 : 0;
            n.it.x = ch.root.position.x; n.it.z = ch.root.position.z; n.it.y = ch.root.position.y;
            const d = camPos.distanceTo(ch.root.position);
            ch.root.visible = d < 75;
            characterLod(ch, d);
            if (ch.tag) ch.tag.visible = d < 22;
            if (d < 75) ch.update(dt);
        }
    }
}

// --- il dialogo ---
export function genteView(panels, k) {
    const app = panels.app, G = app.genti?.byK(k);
    if (!G) return panels.close();
    const lv = app.me?.level || 1, F = forza(G, lv), Pw = premio(G, lv, true);
    const n = (panels.genLine = ((panels.genLine ?? -1) + 1)) % G.lines.length;
    const done = app.me?.gentiToday?.t?.[G.k], fought = app.me?.gentiToday?.f?.[G.k], left = app.me?.gentiToday?.left ?? 10;
    const T = G.trade, gets = Object.entries(T.get).map(([m, v]) => m === 'coins' ? `${v} monete` : `${v} × ${panels.matName(m)}`).join(', ');
    panels.set('talk', G.name, h('div', { class: 'parchment' },
        h('p', { class: 'npc-say' }, `«${G.lines[n]}»`),
        h('div', { class: 'gente-card' },
            h('span', { class: 'gente-forza', style: { background: F.color } }, F.name),
            h('span', {}, `${MESTIERI[G.mestiere].nome[G.app.sex === 'f' ? 1 : 0]} · livello ${G.level} · seme ${G.element}`)),
        h('div', { class: 'ledger-row trade-row' },
            h('div', { class: 'grow' }, h('div', { class: 'nm' }, 'Un baratto'), h('div', { class: 'sub' }, 'In cambio: ' + gets)),
            h('div', { class: 'btn-col' }, panels.costChips(T.give),
                h('button', { class: 'btn btn-sm btn-primary', disabled: done || !panels.canPay(T.give) || null, onclick: async () => { const r = await panels.act('gente:trade', { k: G.k }, 'Affare fatto'); if (r.ok) app.me.gentiToday = r.today; panels.render(); } }, done ? 'Per oggi basta' : 'Baratta'))),
        h('div', { class: 'ledger-row' },
            h('div', { class: 'grow' }, h('div', { class: 'nm' }, 'Un duello'),
                h('div', { class: 'sub' }, fought ? 'Con lui/lei hai già combattuto oggi: niente premi, solo onore.' : left > 0 ? `Se vinci: circa ${Pw.xp} esperienza, ${Pw.coins} monete e un po' di materiali${Pw.itemChance > 0.15 ? ', forse un oggetto' : ''}. Duelli premiati oggi: ancora ${left}.` : 'Per oggi i duelli premiati sono finiti.')),
            h('button', { class: 'btn btn-sm btn-primary', onclick: () => { panels.close(); startGenteDuel(app, G); } }, 'Sfidalo')),
        h('div', { class: 'btn-row', style: { marginTop: '10px' } },
            h('button', { class: 'btn', onclick: () => panels.render() }, 'Altro?'),
            h('button', { class: 'btn', onclick: () => panels.close() }, 'Arrivederci'))));
}

export async function startGenteDuel(app, G) {
    const r = await app.net.request('gente:sfida', { k: G.k });
    if (!r.ok) return toast(r.msg, { kind: 'bad' });
    const lv = G.level, pts = Math.max(0, lv - 1);
    app.localKind = 'gente'; app.genteK = G.k; app.practiceLevel = 0.5 + Math.min(1.1, lv / 22) * G.fight; app.practiceEl = G.element;
    const foe = { id: 'gente:' + G.id, name: G.name, element: G.element, rating: 900 + lv * 30, level: lv, cardImage: null, gear: [G.look.head, G.look.face, G.look.cape].filter(Boolean),
        appearance: G.app, look: G.look, talents: { forza: Math.ceil(pts / 2), tempra: Math.floor(pts / 2), maestria: 0 } };
    app.enterDuel({ id: 'practice', a: app.myFighterInfo(), b: foe, phase: 'fight', noRematch: true,
        texts: [`${G.name} si inchina: «Ben fatto. Oggi l'isola è tua.»`, `${G.name} ti tende la mano: «Rialzati. Domani magari va meglio.»`] }, 'local', 'a');
}
export async function genteDone(app, won) {
    const r = await app.net.request('gente:esito', { k: app.genteK, won: !!won });
    if (!r.ok) return toast(r.msg, { kind: 'bad' });
    app.me.gentiToday = r.today;
    const parts = [];
    if (r.xp) parts.push(`+${r.xp} esperienza`);
    if (r.coins) parts.push(`+${r.coins} monete`);
    for (const [k, n] of Object.entries(r.loot || {})) if (n) parts.push(`+${n} ${app.panels.matName(k)}`);
    if (r.item) parts.push(`un oggetto: ${r.itemName}`);
    toast(h('div', {}, h('b', {}, won ? 'Duello vinto' : 'Duello perso'), h('div', {}, parts.length ? parts.join(' · ') : 'Niente premi, stavolta: solo onore.')), { kind: won ? 'coin' : 'info', icon: 'swords', duration: 8000 });
}
