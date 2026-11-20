// =====================================================================
//  LIBRO II · LA PORTA CHIUSA (solo client)
//  - i dialoghi della Guardiana e di Mastro Brace sulla chiave del faro
//  - i tre Cocci di Lanterna sparsi per la laguna
//  - il filo sotto l'orologio, finché il capitolo è aperto
// =====================================================================
import * as THREE from 'three';
import { L2, COCCI, l2Next } from './shared/libro2.js';
import { h, toast } from './util.js';
import { iconSVG } from './icons.js';

const stOf = (app) => app.me && !app.me.offline ? app.me.libro2 || { s: 0, cocci: [] } : null;

async function act(app, a, extra = {}) {
    const r = await app.net.request('l2:act', { a, ...extra });
    if (!r.ok) { toast(r.msg || 'Non ora', { kind: 'bad' }); return null; }
    if (app.me) app.me.libro2 = r.libro2;
    return r;
}

// --- il blocco del Libro II nei dialoghi ---
function beat(app, who) {
    const st = stOf(app);
    if (!st) return null;
    const lv = app.me.level || 1;
    if (who === 'guardiana') {
        if (st.s === 0) {
            if (lv < L2.lv) return { lines: ['Torna quando la nebbia ti avrà messo un po\' di peso addosso. Al livello ' + L2.lv + ' ti dirò della porta.'] };
            return {
                lines: ['La chiave l\'ho data a un fabbro. Uno con le mani nere e la voce di brace. Ma i vetri della lanterna, quando il faro si spense, scoppiarono e la marea se li portò via.',
                    'Una chiave per questa porta si forgia solo col vetro della sua luce. Trovami i cocci, trovami il fabbro. Io aspetto: è l\'unica cosa che so fare bene.'],
                act: [{ label: 'Troverò la chiave', ic: 'quill', fn: async () => { if (await act(app, 'start')) { app.audio.play('quest'); toast(h('div', {}, h('b', {}, 'Libro II · La Porta Chiusa'), h('div', {}, 'Chiedi a Mastro Brace della chiave del faro.')), { icon: 'openbook', duration: 7000 }); app.panels.render(); } } }],
                ask: true,
            };
        }
        if (st.s >= 1 && st.s <= 3) return { lines: ['Il fabbro, i cocci. Non ho fretta: il faro è spento da trecento anni, può aspettare anche te.'] };
        if (st.s === 4) return { lines: ['Ce l\'hai. La sento da qui, la chiave: ronza come la lanterna, quando era accesa. Vai. Apri.'] };
        return { lines: ['La porta è aperta, ma le scale salgono nel buio. Lassù qualcosa respira ancora. Non salire da solo, non ancora.'] };
    }
    if (who === 'brace') {
        if (st.s === 1) return {
            lines: ['La chiave del faro? Ah. Sì. La fusi io, trecento anni fa: la Guardiana voleva che nessuno entrasse più, e il ferro ubbidisce a chi lo scalda.',
                'Rifarla si può. Ma il ferro da solo non apre quella serratura: ci vogliono i vetri della lanterna. Tre cocci, li ha presi il mare. Uno è rimasto sullo scoglio del faro, uno sulla spiaggia a est. Il terzo è affondato sotto le mura del castello: dovrai bagnarti.'],
            act: [{ label: 'Cercherò i cocci', ic: 'scroll', fn: async () => { if (await act(app, 'ask')) { app.audio.play('quest'); app.l2?.refresh(); app.panels.render(); } } }],
            ask: true,
        };
        if (st.s === 2) return { lines: [`Tre cocci di vetro verde, che brillano anche di giorno. Ne hai ${st.cocci.length}. ${L2.cocci[COCCI.find(k => !st.cocci.includes(k))]?.hint ? 'Il prossimo: ' + L2.cocci[COCCI.find(k => !st.cocci.includes(k))].hint + '.' : ''}`] };
        if (st.s === 3) return {
            lines: ['Eccoli. Senti come scaldano le mani? Il vetro di quella lanterna non si è mai raffreddato. Dammi un momento e un po\' di fuoco.'],
            act: [{ label: 'Forgia la chiave', ic: 'anvil', fn: () => forge(app) }],
            ask: true,
        };
        if (st.s === 4) return { lines: ['È la chiave più strana che abbia mai battuto. Non pesa niente e scotta un poco. Portala alla Guardiana, prima che cambi idea.'] };
    }
    return null;
}
async function forge(app) {
    app.audio.play('anvil');
    const r = await act(app, 'forge');
    if (!r) return;
    setTimeout(() => app.audio.play('special'), 700);
    toast(h('div', {}, h('b', {}, 'La Chiave del Faro'), h('div', {}, 'Ferro nero e vetro verde, con i denti a forma di corona spezzata. Ronza piano, come un faro lontano.')), { kind: 'coin', icon: 'anvil', duration: 9000 });
    app.panels.render();
}

export function l2Box(app, who) {
    const b = beat(app, who);
    if (!b) return null;
    return h('div', { class: 'st-box' + (b.ask ? ' ask' : '') },
        h('div', { class: 'st-head', html: iconSVG('lantern') }, `${L2.sub} · ${L2.title}`),
        b.lines.map(l => h('p', { class: 'st-line' }, `«${l}»`)),
        b.act?.length ? h('div', { class: 'btn-row' }, b.act.map(a => h('button', { class: 'btn btn-primary', html: a.ic ? iconSVG(a.ic) : null, onclick: a.fn }, a.label))) : null);
}

// il filo sotto l'orologio: il Libro II ha la precedenza finché il capitolo è aperto
export function l2Thread(app) {
    const t = l2Next(stOf(app));
    return t ? { text: `${L2.title}: ${t}` } : null;
}

// --- la porta del faro: chiusa, da aprire, aperta ---
export async function l2Door(app) {
    const st = stOf(app);
    if (st?.s === 4) {
        const r = await act(app, 'door');
        if (!r) return;
        app.audio.play('special');
        toast(h('div', {}, h('b', {}, 'La porta del faro si apre'), h('div', {}, 'La chiave gira da sola. Dentro c\'è buio e odore di sale, e una scala che sale a spirale. Lassù, qualcosa trattiene il fiato.')), { kind: 'coin', icon: 'lantern', duration: 11000 });
        setTimeout(() => toast(h('div', {}, h('b', {}, `${L2.sub} chiuso`), h('div', {}, `+${r.xp} esperienza, +${r.coins} monete${r.title ? ' · nuovo titolo: Chi Apre il Faro' : ''}. Il capitolo II arriverà con la prossima marea.`)), { kind: 'ok', icon: 'openbook', duration: 10000 }), 2500);
        return;
    }
    if (st?.s >= 5) {
        app.audio.play('ui');
        return toast(h('div', {}, h('b', {}, 'Le scale salgono nel buio'), h('div', {}, 'Senti il respiro della lanterna, lassù. Non ancora: la Guardiana dice che servirà altro, prima.')), { icon: 'lantern', duration: 8000 });
    }
    return false;   // chiusa: ci pensa il messaggio di sempre
}

// --- i Cocci di Lanterna: visibili solo mentre li cerchi ---
export class Cocci {
    constructor(app) {
        this.app = app;
        const W = app.world;
        this.items = [];
        const glass = new THREE.MeshStandardMaterial({ color: '#9affe0', emissive: '#3affc0', emissiveIntensity: 1.6, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.9 });
        const shardG = new THREE.OctahedronGeometry(0.22, 0);
        shardG.scale(0.6, 1.25, 0.25);
        for (const k of COCCI) {
            const C = L2.cocci[k];
            const g = new THREE.Group();
            const ground = C.swim ? 0.05 : W.terrainAt(C.x, C.z) + 0.3;
            g.position.set(C.x, ground, C.z);
            for (let i = 0; i < 3; i++) {
                const m = new THREE.Mesh(shardG, glass);
                m.position.set((i - 1) * 0.16, i === 1 ? 0.08 : 0, (i % 2) * 0.1);
                m.rotation.set(0.3 * (i - 1), i * 1.7, 0.4 * (i - 1));
                m.scale.setScalar(i === 1 ? 1 : 0.7);
                g.add(m);
            }
            const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: '#7affd8', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
            glow.scale.set(2.2, 2.2, 1);
            g.add(glow);
            g.visible = false;
            W.scene.add(g);
            const it = { id: 'coccio', k, x: C.x, z: C.z, r: 2.2, label: 'Raccogli il Coccio di Lanterna', when: () => this.want(k) };
            if (!C.swim) it.y = ground;
            W.interactables.push(it);
            this.items.push({ k, g, glow, y: ground });
        }
        this.tick = (dt, t) => {
            for (const c of this.items) {
                if (!c.g.visible) continue;
                c.g.position.y = c.y + 0.12 + Math.sin(t * 1.6 + c.g.position.x) * 0.08;
                c.g.rotation.y += dt * 0.7;
                c.glow.material.opacity = 0.45 + Math.sin(t * 2.3 + c.g.position.z) * 0.15;
            }
        };
        W.animated.push(this.tick);
        this.refresh();
    }
    want(k) { const st = stOf(this.app); return st?.s === 2 && !st.cocci.includes(k); }
    refresh() { for (const c of this.items) c.g.visible = this.want(c.k); }
    async pick(k) {
        const app = this.app, r = await act(app, 'coccio', { k });
        if (!r) return;
        this.refresh();
        app.audio.play('special');
        const st = r.libro2, n = st.cocci.length;
        toast(h('div', {}, h('b', {}, `${L2.cocci[k].name} (${n}/${COCCI.length})`),
            h('div', {}, st.s === 3 ? 'Ci sono tutti. Il vetro scalda le mani: portali a Mastro Brace.' : 'Vetro verde, tiepido, che pulsa piano come un cuore.'),
            r.xp ? h('div', { class: 'muted small' }, `+${r.xp} esperienza`) : null), { kind: 'coin', icon: 'lantern', duration: 7000 });
    }
}
