// =====================================================================
//  FINESTRE DEL GIOCO: bisaccia, botteghe, Bazar, Albo, Compagnia...
// =====================================================================
import { h, $, coin, fmt, toast, SOCKET_URL, loadImage } from './util.js';
import {
    ITEMS, SLOTS, SLOT_NAMES, WEAPON_TYPES, MATERIALS, HANDLES, GEMS, ELEMENTS, ECONOMY,
    weaponStats, weaponCost, sanitizeWeaponSpec,
    GEAR, SETS, gearAffinity, gearLines, itemLevel, weaponLevel, MATERIAL_LEVEL, HANDLE_LEVEL, GEM_LEVEL,
    computeStats, dissonance, levelProgress, titleFor, TALENTS, TALENT_IDS, TALENT_CAP, XP, RESPEC_COST, RING, OPPOSITE,
    MATS, MAT_IDS, SEALS, CARD_GRADES, gradeOf, resolveMats, ENCHANT, ENCHANT_STEP, enchantCap, enchantCapNext, enchantMats, ALTAR_LEVEL,
    INFUSE, INFUSE_LEVEL, INFUSE_COST, FUSE, BLESSING, FISH, FISH_IDS, FISH_RARITY, FISH_DAILY, DIARY, GATHER, plusOf, ELEMENT_IDS, RUNE_NAMES,
} from './shared/catalog.js';
import { cardEditor } from './creator.js';
import { composeCard, printCard, downloadCard, CARD_W, holoTrack } from './cards.js';
import { icon, iconSVG, elIcon, itemIconName, rarityOf, tierOf } from './icons.js';

export function itemInfo(e) {
    if (e.kind === 'weapon') {
        const s = e.spec, t = WEAPON_TYPES[s.type], plus = plusOf(s);
        return { name: s.name + (plus ? ` +${plus}` : ''), sub: `${t?.name || 'Arma'} di ${MATERIALS[s.material]?.name || '?'}`, slot: 'weapon', value: weaponCost(s), plus, inf: s.inf };
    }
    const it = ITEMS[e.itemId] || { name: '???', slot: 'head', price: 0 }, plus = plusOf(e);
    return { name: it.name + (plus ? ` +${plus}` : ''), sub: SLOT_NAMES[it.slot], slot: it.slot, value: it.price, desc: it.desc, plus };
}
// Carta con il riflesso olografico del suo grado (album, profili, Altare)
export function holoImg(src, grade, cls = 'big-card') {
    const img = h('img', { src, class: cls, alt: '' });
    if (!(grade > 0)) return img;
    return holoTrack(h('div', { class: `holo-wrap holo g-${gradeOf(grade).id}` }, img));
}
const matChip = (k, n) => h('span', { class: 'mat-chip', title: MATS[k]?.where, style: { color: MATS[k]?.color }, html: iconSVG(MATS[k]?.icon || 'rune') }, h('b', {}, n), MATS[k]?.name);
const SLOT_ICON = { head: 'head', face: 'face', cape: 'cape', torso: 'torso', weapon: 'weapon' };
const pctTxt = (v) => `${Math.round(v * 1000) / 10}%`.replace('.', ',');
// Sigillo verde o rosso: come va d'accordo il capo con il seme della tua carta
function affBadge(id, el) {
    const G = GEAR[id];
    if (!G || (!G.syn && !G.rep)) return null;
    const a = gearAffinity(id, el), name = ELEMENTS[el]?.name || el;
    if (a === 'syn') return h('span', { class: 'aff syn', html: iconSVG(el) }, `In sintonia con ${name}: rende una volta e mezza`);
    if (a === 'rep') return h('span', { class: 'aff rep', html: iconSVG(el) }, `In ripulsa con ${name}: rende la metà e porta Dissonanza`);
    return h('span', { class: 'aff neu' }, 'Neutro per il tuo seme');
}
function gearDetail(id, el, plus = 0) {
    const G = GEAR[id];
    if (!G) return null;
    const lines = gearLines(id, el, plus);
    const set = SETS.find(x => x.items.includes(id));
    const other = [G.syn ? `sintonia con ${ELEMENTS[G.syn].name}` : null, G.rep ? `ripulsa con ${ELEMENTS[G.rep].name}` : null].filter(Boolean).join(' · ');
    return [
        lines.length ? h('ul', { class: 'gear-lines' }, lines.map(l => h('li', {}, l))) : null,
        h('div', { class: 'btn-row', style: { margin: '4px 0' } }, affBadge(id, el)),
        other ? h('div', { class: 'set-line' }, 'Per gli altri semi: ', other) : null,
        set ? h('div', { class: 'set-line' }, h('b', {}, set.name), `: ${set.desc}`) : null,
    ];
}
const lockLabel = (need, level) => need > level ? `livello ${need}` : null;
// icona della maglietta del suo colore (quelle scure restano leggibili sul fondo scuro)
const shirtTint = (hex) => { const n = parseInt(hex.slice(1), 16), l = ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255; return l < 0.25 ? '#8a8494' : hex; };
const ORDER = { weapon: 0, head: 1, face: 2, cape: 3, torso: 4 };
const sect = (ic, text, ...extra) => h('h3', { class: 'sect', html: iconSVG(ic) }, text, ...extra);
const lore = (text) => h('p', { class: 'lore' }, text);
const btn = (label, onclick, { cls = '', ic, disabled, title } = {}) => h('button', { class: 'btn ' + cls, onclick, disabled, title, html: ic ? iconSVG(ic) : null }, label);

export class Panels {
    constructor(app) {
        this.app = app;
        this.root = $('#panel-root');
        this.panel = $('#panel-root .panel');
        this.body = $('#panel-body');
        this.title = $('#panel-title');
        this.current = null;
        this.arg = null;
        this.tabs = {};
        $('#panel-close').onclick = () => this.close();
        this.root.addEventListener('mousedown', (e) => { if (e.target === this.root) this.close(); });
    }
    get isOpen() { return !!this.current; }
    open(id, arg) {
        if (!this['p_' + id]) return;
        if (this.current) this.cleanup();
        this.current = id; this.arg = arg;
        this.root.classList.remove('hidden');
        this.panel.classList.toggle('narrow', ['amici', 'impostazioni', 'classifica', 'bazar', 'arena'].includes(id));
        this.app.onPanelOpen();
        this.render();
        this.app.audio.play('ui');
    }
    render() {
        if (!this.current) return;
        const keepScroll = this.body.scrollTop;
        this.cleanup(true);
        this['p_' + this.current](this.arg);
        this.body.scrollTop = keepScroll;
    }
    refresh(which) { if (this.current && (!which || which.includes(this.current))) this.render(); }
    cleanup(keepStudio) {
        if (!keepStudio && this.studioOn) { this.app.studio.unmount(); this.studioOn = false; }
    }
    close() {
        if (!this.current) return;
        this.cleanup();
        this.current = null;
        this.root.classList.add('hidden');
        this.app.onPanelClose();
    }
    set(ic, title, ...content) {
        this.title.innerHTML = iconSVG(ic);
        this.title.append(title);
        this.body.replaceChildren(...content.flat().filter(c => c != null && c !== ''));
    }
    tabBar(id, list, def) {
        const cur = this.tabs[id] || def || list[0][0];
        this.tabs[id] = cur;
        return [cur, h('div', { class: 'tabs' }, list.map(([k, label, ic]) => h('button', {
            class: 'tab' + (k === cur ? ' active' : ''), html: ic ? iconSVG(ic) : null,
            onclick: () => { this.tabs[id] = k; this.render(); },
        }, label)))];
    }
    studioBox(setup) {
        const box = h('div', { class: 'studio-box' });
        const S = this.app.studio;
        setup(S);
        requestAnimationFrame(() => { if (box.isConnected) { S.mount(box, 'full'); this.studioOn = true; } });
        return box;
    }
    slot({ ic, rar = 'com', sel, eq, price, count, title, onclick, empty, tint, label, color, lock, plus }) {
        const el = h('button', { class: `slot r-${rar}${sel ? ' sel' : ''}${empty ? ' empty' : ''}${lock ? ' locked' : ''}${plus >= 5 ? ' glow' : ''}`, title: lock ? `${title || ''} · serve il ${lock}` : title, onclick: empty ? null : onclick, style: color ? { color } : null });
        if (lock) el.append(h('span', { class: 's-lock' }, lock.replace('livello ', 'Lv ')));
        if (plus) el.append(h('span', { class: 's-plus' }, '+' + plus));
        if (tint) el.append(h('span', { class: 'swatch-in', style: { background: tint } }));
        else el.insertAdjacentHTML('beforeend', iconSVG(ic));
        if (eq) el.append(h('span', { class: 's-eq' }, 'E'));
        if (price != null) el.append(h('span', { class: 's-price' }, fmt(price)));
        if (count) el.append(h('span', { class: 's-count' }, '×' + count));
        if (label) el.append(h('span', { class: 's-label' }, label));
        return el;
    }
    async act(ev, data, okMsg) {
        const r = await this.app.net.request(ev, data);
        if (r.ok) { if (okMsg || r.msg) toast(okMsg || r.msg, { kind: 'ok' }); this.app.audio.play('coin'); }
        else { toast(r.msg || 'Non è andata come previsto', { kind: 'bad' }); this.app.audio.play('error'); }
        return r;
    }
    needOnline() {
        if (this.app.net.connected) return null;
        return h('div', { class: 'empty' }, 'Il portale verso il mondo degli altri viandanti è chiuso.', h('br'), 'Riprova tra qualche istante: si riapre da solo.');
    }
    purse() { return h('span', { class: 'purse' }, h('span', { class: 'sc-coin', html: iconSVG('satellite') }), fmt(this.app.me.coins || 0)); }

    // --- BISACCIA (inventario con manichino) ---
    p_inventario() {
        const me = this.app.me, eq = me.equipment || {}, inv = [...(me.inventory || [])];
        inv.sort((a, b) => ORDER[itemInfo(a).slot] - ORDER[itemInfo(b).slot] || itemInfo(a).name.localeCompare(itemInfo(b).name));
        const equipped = new Set(Object.values(eq));
        let sel = inv.find(e => e.uid === this.selInv) || inv.find(e => equipped.has(e.uid)) || inv[0];
        this.selInv = sel?.uid;
        const pick = (e) => () => { this.selInv = e.uid; this.app.audio.play('ui'); this.render(); };
        const L = me.level || 1, el = me.card?.element;
        const need = (e) => e.kind === 'weapon' ? weaponLevel(e.spec) : itemLevel(e.itemId);
        const slotOf = (e) => { const inf = itemInfo(e); return this.slot({ ic: itemIconName(e), rar: tierOf(e).id, sel: e.uid === sel?.uid, eq: equipped.has(e.uid), title: inf.name, onclick: pick(e), lock: e.legacy ? null : lockLabel(need(e), L), plus: inf.plus }); };
        const [tab, bar] = this.tabBar('bag', [['oggetti', 'Oggetti', 'bag'], ['materiali', 'Materiali', 'shard'], ['diario', 'Diario', 'openbook']]);
        const doll = h('div', { class: 'doll' },
            this.studioBox(S => S.setCharacter(me.appearance, this.app.look())),
            SLOTS.map(s => {
                const e = inv.find(x => x.uid === eq[s]);
                return h('div', { class: 'eq ' + s }, h('span', { class: 'eq-label' }, SLOT_NAMES[s]), e ? slotOf(e) : this.slot({ ic: SLOT_ICON[s], empty: true, title: `${SLOT_NAMES[s]}: vuoto` }));
            }));
        let detail;
        if (!sel) detail = h('div', { class: 'detail' }, h('div', { class: 'd-empty' }, 'La bisaccia è vuota. La Sartoria e la Forgia ti aspettano in piazza.'));
        else {
            const inf = itemInfo(sel), r = tierOf(sel), on = equipped.has(sel.uid), scrap = Math.floor(inf.value * ECONOMY.SCRAP_RATE);
            const stats = sel.kind === 'weapon' ? weaponLines(sel.spec, el) : gearDetail(sel.itemId, el, plusOf(sel));
            const req = need(sel), locked = !sel.legacy && req > L;
            detail = h('div', { class: 'detail' },
                h('div', { class: 'd-name r-' + r.id }, inf.name),
                h('div', { class: 'd-type' }, `${SLOT_NAMES[inf.slot]} · ${r.name} · livello ${req}`),
                stats, inf.desc ? h('div', { class: 'd-flavor' }, inf.desc) : null,
                locked ? h('p', { class: 'req' }, `Lo potrai usare dal livello ${req}.`) : sel.legacy && req > L ? h('p', { class: 'muted small' }, 'Comprato prima dei livelli: puoi usarlo lo stesso.') : null,
                h('div', { class: 'btn-row', style: { justifyContent: 'space-between', marginTop: '10px' } },
                    h('span', { class: 'muted small' }, 'Valore ', coin(inf.value)),
                    h('div', { class: 'btn-row' },
                        on ? btn('Togli', () => this.act('equip', { slot: inf.slot, uid: null }))
                            : btn('Indossa', () => this.act('equip', { slot: inf.slot, uid: sel.uid }), { cls: 'btn-primary', ic: inf.slot === 'weapon' ? 'swords' : 'shield', disabled: locked }),
                        on ? null : btn(`Rottama · ${scrap}`, () => { if (confirm(`Rottamare "${inf.name}" per ${scrap} Sputnik Coin?`)) this.act('item:scrap', { uid: sel.uid }); }, { cls: 'btn-danger btn-sm', ic: 'anvil' }))));
        }
        const right = tab === 'materiali' ? this.matsView() : tab === 'diario' ? this.diaryView() : [
            h('div', { class: 'bag-head' }, h('h3', { class: 'sect', style: { margin: 0, flex: 1 }, html: iconSVG('bag') }, `Oggetti (${inv.length})`), this.purse()),
            inv.length ? h('div', { class: 'slot-grid' }, inv.map(slotOf)) : null,
            detail];
        this.set('bag', 'Bisaccia', this.needOnline(),
            h('div', { class: 'split' }, doll, h('div', {}, bar, right)));
    }
    // Materiali per l'Altare: quanti ne hai e dove si trovano
    matsView() {
        const me = this.app.me, mats = me.mats || {};
        const owned = MAT_IDS.filter(k => mats[k] > 0);
        const base = ['frammento', 'perla', 'ecto', 'pergamena'];
        const gl = me.gatherLeft || {};
        return [
            h('div', { class: 'bag-head' }, h('h3', { class: 'sect', style: { margin: 0, flex: 1 }, html: iconSVG('shard') }, 'Materiali'), this.purse()),
            owned.length ? h('div', { class: 'mat-grid' }, owned.map(k => matChip(k, mats[k]))) : h('p', { class: 'muted' }, 'Ancora niente. Comincia dal Cerchio di Pietre o dal Molo.'),
            sect('map', 'Dove si trovano'),
            h('div', { class: 'list' }, base.map(k => h('div', { class: 'row' }, h('span', { class: 'mat-ic', style: { color: MATS[k].color }, html: iconSVG(MATS[k].icon) }),
                h('div', { class: 'grow' }, h('div', { class: 'nm' }, MATS[k].name, h('span', { class: 'muted small' }, ` · ne hai ${mats[k] || 0}`)), h('div', { class: 'sub' }, MATS[k].where), h('div', { class: 'mat-desc' }, MATS[k].desc))))),
            h('div', { class: 'list' },
                h('div', { class: 'row' }, h('span', { class: 'mat-ic', style: { color: '#ffd76a' }, html: iconSVG('vial') }), h('div', { class: 'grow' }, h('div', { class: 'nm' }, 'Essenze dei sette semi'), h('div', { class: 'mat-desc' }, `Vinci un duello contro un seme e ottieni la sua Essenza (al massimo 3 al giorno per seme). Anche il Fantasma, dal Guerriero in su, ne lascia due al giorno.`))),
                h('div', { class: 'row' }, h('span', { class: 'mat-ic', style: { color: '#ffd76a' }, html: iconSVG('runestone') }), h('div', { class: 'grow' }, h('div', { class: 'nm' }, 'Rune'), h('div', { class: 'mat-desc' }, "All'Altare: 8 Frammenti e un'Essenza fanno la Runa di quel seme.")))),
            h('p', { class: 'muted small' }, `Oggi ancora a premi pieni: ${gl.frammento ?? GATHER.daily.frammento} frammenti, ${gl.ecto ?? GATHER.daily.ecto} fuochi fatui, ${me.fishLeft ?? FISH_DAILY} pescate.`),
        ];
    }
    // Diario del Naufrago e diario di pesca
    diaryView() {
        const me = this.app.me, found = new Set(me.diary || []), log = me.fishLog || {};
        const species = FISH_IDS.filter(id => FISH[id].rar !== 'special');
        const caught = species.filter(id => log[id]?.n).length;
        return [
            sect('bottle', `Diario del Naufrago (${found.size}/${DIARY.length})`),
            lore('Pagine ritrovate nelle bottiglie che salgono al Molo. Chi le ritrova tutte riceve il Sigillo del Naufrago.'),
            found.size ? h('div', { class: 'diary' }, DIARY.map((p, i) => found.has(i)
                ? h('details', { class: 'page' }, h('summary', {}, h('span', { class: 'n' }, i + 1), p.t), h('p', {}, p.x)) : null)) : null,
            found.size < DIARY.length ? h('div', { class: 'diary-missing' }, h('span', {}, found.size ? 'Mancano ancora:' : 'Nessuna pagina, per ora. Mancano:'),
                DIARY.map((_, i) => found.has(i) ? null : h('span', { class: 'n' }, i + 1))) : null,
            sect('fish', `Diario di pesca (${caught}/${species.length})`),
            h('div', { class: 'fish-grid' }, species.map(id => {
                const f = FISH[id], R = FISH_RARITY[f.rar], L = log[id];
                const ic = f.rar === 'junk' ? 'boot' : id === 'anguilla' ? 'eel' : f.rar === 'epi' ? 'angler' : 'fish';
                return h('div', { class: 'fish-card' + (L?.n ? '' : ' unknown'), title: L?.n ? f.desc : 'Non l\'hai ancora pescato' },
                    h('span', { class: 'fc-ic', style: { color: L?.n ? R.color : '#4a4050' }, html: iconSVG(ic) }),
                    h('b', {}, L?.n ? f.name : '???'),
                    h('small', {}, L?.n ? `${L.n} pescati · record ${L.best} cm` : f.when === 'night' ? 'Abbocca di notte' : f.when === 'day' ? 'Abbocca di giorno' : R.name),
                    f.when !== 'any' ? h('span', { class: 'fc-when', html: iconSVG(f.when === 'night' ? 'moon' : 'sun') }) : null);
            })),
        ];
    }

    // --- SARTORIA (provi il capo selezionato sul manichino) ---
    p_sartoria() {
        const [tab, bar] = this.tabBar('shop', [['head', 'Copricapi', 'head'], ['face', 'Maschere', 'face'], ['cape', 'Mantelli', 'cape'], ['torso', 'Armature', 'torso']]);
        this.shopView('needle', 'Sartoria Spettrale', Object.entries(ITEMS).filter(([, it]) => it.slot === tab && !it.shop), bar,
            '«Guardati pure allo specchio, viandante. Non si paga per sognare.»');
    }

    // --- ARMADIO DELLA STANZA BIANCA (merch ufficiale Sputnik Homies) ---
    p_armadio() {
        this.shopView('hanger', 'Armadio degli Sputnik Homies', Object.entries(ITEMS).filter(([, it]) => it.shop === 'armadio'),
            lore('Appese nell\'armadio della Stanza Bianca ci sono le magliette ufficiali, con il logo giallo davanti e la scritta dietro.'),
            '«Taglia unica: va bene a umani, elfi, ratti e scheletri.»');
    }

    shopView(ic, title, wares, bar, motto) {
        const me = this.app.me;
        const owned = (id) => (me.inventory || []).filter(e => e.itemId === id).length;
        const selId = wares.find(([id]) => id === this.selShop)?.[0] || wares[0][0];
        this.selShop = selId;
        const it = ITEMS[selId], r = tierOf(selId), L = me.level || 1, el = me.card?.element;
        const req = itemLevel(selId), tooLow = req > L;
        this.set(ic, title, this.needOnline(),
            h('div', { class: 'split' },
                h('div', {}, this.studioBox(S => S.setCharacter(me.appearance, { ...this.app.look(), [it.slot]: selId })),
                    h('p', { class: 'lore center', style: { marginTop: '10px' } }, motto)),
                h('div', {}, bar,
                    h('div', { class: 'slot-grid' }, wares.map(([id, w]) => this.slot({
                        ic: itemIconName(id), rar: tierOf(id).id, sel: id === selId, price: w.price, count: owned(id), title: w.name, color: w.shirt ? shirtTint(w.color) : null, lock: lockLabel(itemLevel(id), L),
                        onclick: () => { this.selShop = id; this.app.audio.play('ui'); this.render(); },
                    }))),
                    h('div', { class: 'detail' },
                        h('div', { class: 'd-name r-' + r.id }, it.name),
                        h('div', { class: 'd-type' }, `${SLOT_NAMES[it.slot]} · ${r.name} · livello ${req}${owned(selId) ? ` · ne possiedi ${owned(selId)}` : ''}`),
                        gearDetail(selId, el),
                        h('div', { class: 'd-flavor' }, it.desc),
                        h('div', { class: 'btn-row', style: { justifyContent: 'space-between' } }, coin(it.price),
                            h('div', { class: 'btn-row' }, this.purse(),
                                btn('Compra', async () => {
                                    const res = await this.act('shop:buy', { itemId: selId }, `Hai comprato: ${it.name}`);
                                    if (res.ok) this.act('equip', { slot: it.slot, uid: res.uid }, `Indossi: ${it.name}`);
                                }, { cls: 'btn-primary', ic: 'coins', disabled: me.coins < it.price || tooLow }))),
                        tooLow ? h('p', { class: 'req', style: { margin: '8px 0 0' } }, `Torna quando sarai al livello ${req}. Puoi già provarlo addosso.`)
                            : me.coins < it.price ? h('p', { class: 'muted small', style: { margin: '8px 0 0' } }, 'Ti mancano ', coin(it.price - me.coins), '. Vinci qualche duello nell\'Arena!') : null))));
    }

    // --- LIBRO DELLA MAESTRIA (livello, esperienza, i tre rami, statistiche, Rito dell'Oblio) ---
    p_maestria(arg) {
        const app = this.app, me = app.me, off = !!me.offline || !app.net.connected;
        const lp = levelProgress(me.xp || 0), L = me.level || lp.level;
        const t = { forza: 0, tempra: 0, maestria: 0, ...(me.talents || {}) };
        const pts = app.unspentPoints();
        const el = me.card?.element || 'palude', E = ELEMENTS[el];
        const st = computeStats({ element: el, weapon: app.look().weapon, level: L, talents: t, gear: app.gear(), gearPlus: app.gearPlus(), seals: me.sealsOn });
        const head = h('div', { class: 'lvl-head' },
            h('div', { class: 'lvl-badge' }, L),
            h('div', {},
                h('div', { class: 'lvl-title' }, titleFor(L)),
                h('div', { class: 'lvl-bar' }, h('i', { style: { width: `${Math.round(lp.pct * 100)}%` } })),
                h('div', { class: 'lvl-sub' }, lp.need ? `${fmt(lp.into)} / ${fmt(lp.need)} esperienza per il livello ${L + 1}` : 'Hai raggiunto il livello massimo.')),
            h('div', { class: 'pts-big' }, h('b', {}, pts), pts === 1 ? 'punto da spendere' : 'punti da spendere'));
        const path = (k) => {
            const T = TALENTS[k], v = t[k];
            return h('div', { class: 'path' },
                h('div', { class: 'path-head', html: iconSVG(T.icon) }, T.name, h('span', { class: 'n' }, `${v}/${TALENT_CAP}`)),
                h('div', { class: 'path-per' }, `Ogni punto: ${T.per}.`),
                h('div', { class: 'pips' }, Array.from({ length: TALENT_CAP }, (_, i) => h('i', { class: (i < v ? 'on' : '') + ((i + 1) % 5 === 0 ? ' mark' : '') }))),
                Object.entries(T.traits).map(([n, tr]) => h('div', { class: 'trait' + (v >= +n ? ' on' : '') }, h('span', { class: 'n' }, n), h('div', {}, h('strong', {}, tr.name), tr.desc))),
                btn('Un punto qui', () => this.act('talent:add', { path: k }, `${T.name}: ${v + 1}`), { cls: 'btn-primary btn-sm', ic: 'star', disabled: off || pts <= 0 || v >= TALENT_CAP }));
        };
        const opp = OPPOSITE[el], ring = RING.indexOf(el);
        const beats = ring >= 0 ? RING[(ring + 1) % 6] : null, fears = ring >= 0 ? RING[(ring + 5) % 6] : null;
        const dOpp = opp ? dissonance(st, opp) : { hit: 0, sp: 0 }, dAny = dissonance(st, beats || 'fango');
        const row = (label, value, cls) => h('div', {}, h('span', {}, label), h('b', { class: cls || '' }, value));
        const stats = h('div', { class: 'statgrid' },
            row('Danni', `×${st.atk.toFixed(2)}`, st.atkBonus ? 'up' : ''),
            row('Difesa', pctTxt(st.def), st.def > 0 ? 'up' : st.def < 0 ? 'down' : ''),
            row('Punti vita', st.hpMax),
            row('Velocità', pctTxt(st.spd), st.spd > 1 ? 'up' : st.spd < 1 ? 'down' : ''),
            row('Carica SUPER', `×${st.meterGain.toFixed(2)}`),
            row('Durata effetti', `+${pctTxt(st.effMul - 1)}`),
            row('Peso', `${st.load} / ${Math.round(st.cap * 10) / 10}`, st.over ? 'down' : ''),
            st.immune ? row('Dissonanza', 'immune', 'up')
                : row(opp ? `Dissonanza contro ${ELEMENTS[opp].name}` : 'Dissonanza', opp ? `${pctTxt(dOpp.hit)} colpi · ${pctTxt(dOpp.sp)} SUPER` : '—', dOpp.hit > 0.12 ? 'down' : ''),
            dAny.hit > 0 && !st.immune ? row('Dissonanza in ogni duello', `${pctTxt(dAny.hit)} colpi`, 'down') : null);
        const wheel = h('div', { style: { display: 'grid', gap: '6px' } },
            h('div', { class: 'btn-row' }, elIcon(el), h('b', {}, `Il tuo seme: ${E.name}`)),
            ring >= 0 ? h('div', { class: 'set-line' }, 'Batti ', h('b', {}, ELEMENTS[beats].name), ' (+15% di danni e SUPER più rapida), temi ', h('b', {}, ELEMENTS[fears].name), ' (−10%), il tuo opposto è ', h('b', {}, ELEMENTS[opp].name), ': fra voi c\'è Dissonanza.')
                : h('div', { class: 'set-line' }, 'Il Fango sta fuori dalla Ruota: nessun vantaggio, nessuna debolezza e mai Dissonanza. Le tue palle di fango tolgono la SUPER al nemico per qualche secondo.'));
        const sets = h('div', {}, SETS.map(x => {
            const n = x.items.filter(i => st.gear.includes(i)).length, on = st.sets.includes(x.id);
            return h('div', { class: 'set-line' + (on ? ' on' : '') }, h('b', {}, x.name), ` (${n}/${x.items.length}${x.weapon ? ' + arma' : ''})`, `: ${x.desc}`);
        }));
        const xpInfo = h('ul', { class: 'gear-lines' },
            h('li', {}, `Duello vinto ${XP.WIN} (fino a +${XP.WIN_LEVEL_MAX} contro chi ha più livelli), perso ${XP.LOSS}, almeno 20 secondi di combattimento.`),
            h('li', {}, me.firstWin ? 'Prima vittoria del giorno: già presa, torna domani.' : 'Prima vittoria del giorno: vale doppio.'),
            me.rest ? h('li', {}, `Riposo: i prossimi ${me.rest} duelli valgono doppio.`) : h('li', {}, 'Riposo: ogni 8 ore lontano dall\'isola, un duello vale doppio.'),
            h('li', {}, `Allenamento col Fantasma: ${XP.PRACTICE[1]}, ${XP.PRACTICE[2]} o ${XP.PRACTICE[3]} a vittoria (oggi ancora ${me.practiceLeft ?? XP.PRACTICE_DAILY}).`),
            h('li', {}, `Scommessa vinta ${XP.BET_WIN}, tributo del giorno ${XP.DAILY}.`),
            h('li', {}, `Pesca nella Nebbia: da 6 a 55 a pesce (${FISH_DAILY} pescate piene al giorno). Frammenti e fuochi fatui: ${GATHER.xp} ciascuno.`),
            (me.blessUntil || 0) > Date.now() ? h('li', { class: 'up' }, `Benedizione della Custode: +${Math.round(BLESSING.xp * 100)}% fino alle ${new Date(me.blessUntil).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}.`) : null,
            (me.sealsOn || []).includes('corvo') ? h('li', { class: 'up' }, 'Sigillo del Corvo: +5% su tutto.') : null);
        const spent = TALENT_IDS.reduce((a, k) => a + t[k], 0);
        const rite = arg === 'altare'
            ? h('div', { class: 'detail' }, h('div', { class: 'd-name' }, "Il Rito dell'Oblio"),
                lore('«Dimentica ciò che hai imparato, e imparalo di nuovo.» La Custode senza Volto ti restituisce tutti i punti spesi.'),
                h('div', { class: 'btn-row', style: { justifyContent: 'space-between' } },
                    h('span', { class: 'muted small' }, me.respecs ? h('span', {}, 'Costo ', coin(RESPEC_COST)) : 'La prima volta è gratis'),
                    btn('Celebra il rito', async () => { const r = await this.act('talent:reset', {}, "Il rito è compiuto: i tuoi punti sono liberi"); if (r.ok) this.app.audio.play('special'); }, { cls: 'btn-danger', ic: 'rune', disabled: off || !spent || (me.respecs > 0 && me.coins < RESPEC_COST) })))
            : h('p', { class: 'muted small' }, "Per ridistribuire i punti si celebra il Rito dell'Oblio all'Altare della Cappella in Rovina.");
        this.set('star', 'Libro della Maestria', off ? this.needOnline() : null, head,
            h('div', { class: 'paths' }, TALENT_IDS.map(path)),
            h('div', { class: 'split', style: { marginTop: '16px' } },
                h('div', {}, sect('star', 'Le tue statistiche'), stats, sect('crystal', 'La Ruota dei Semi'), wheel),
                h('div', {}, sect('shield', 'Corredi'), sets, sect('scroll', "Da dove arriva l'esperienza"), xpInfo, rite)));
    }

    // --- ALTARE DEI SETTE SEMI (Cappella in Rovina): risveglio, incantamento, infusione, fusione, sigilli, offerta ---
    p_altare() {
        const app = this.app, me = app.me, L = me.level || 1, el = me.card?.element || 'palude';
        const off = !!me.offline || !app.net.connected, mats = me.mats || {};
        const T = 'Altare dei Sette Semi';
        const intro = lore("«Porta qui ciò che hai raccolto sull'isola. Io non ho volto, ma vedo tutto quello che sei.» La Custode senza Volto veglia sull'altare.");
        const maestria = btn("Libro della Maestria e Rito dell'Oblio", () => this.open('maestria', 'altare'), { cls: 'btn-sm', ic: 'star' });
        if (L < ALTAR_LEVEL) return this.set('altar', T, intro, h('div', { class: 'empty' }, `La Custode ti riceverà dal livello ${ALTAR_LEVEL}. Vinci un duello o allenati col Fantasma.`), h('div', { class: 'btn-row mid' }, maestria));
        const [tab, bar] = this.tabBar('altare', [['carta', 'Risveglio', 'card'], ['incanto', 'Incantamento', 'sparkles'], ['infusione', 'Infusione', 'cauldron'], ['fusione', 'Fusione', 'runestone'], ['sigilli', 'Sigilli', 'waxseal'], ['offerta', 'Offerta', 'candle']]);
        // materiali richiesti: verdi se li hai, rossi se mancano
        const needs = (need, coins) => {
            let ok = (me.coins || 0) >= (coins || 0);
            const chips = Object.entries(need).map(([k, n]) => {
                const M = MATS[k], have = mats[k] || 0;
                if (have < n) ok = false;
                return h('span', { class: 'need ' + (have >= n ? 'ok' : 'no'), title: M.where, html: iconSVG(M.icon) }, `${M.name} ${have}/${n}`);
            });
            if (coins) chips.push(h('span', { class: 'need ' + ((me.coins || 0) >= coins ? 'ok' : 'no') }, coin(coins)));
            return { ok, el: h('div', { class: 'needs' }, chips) };
        };
        const check = (ok, text) => h('li', { class: ok ? 'ok' : 'no', html: iconSVG(ok ? 'star' : 'lock') }, text);
        const request = async (ev, data) => {
            const r = await app.net.request(ev, data);
            if (!r.ok) { toast(r.msg || 'La Custode scuote la testa', { kind: 'bad' }); app.audio.play('error'); }
            return r;
        };
        let body;
        if (tab === 'carta') {
            const G = me.grade || 0, cur = gradeOf(G), next = CARD_GRADES[G + 1];
            let nextBox;
            if (!next) nextBox = h('p', { class: 'muted' }, 'La tua carta è al grado più alto.');
            else if (next.locked) nextBox = h('div', { class: 'detail' }, h('div', { class: 'd-name', style: { color: next.color } }, `Prossimo grado: ${next.name}`), h('div', { class: 'd-flavor' }, next.gives), h('p', { class: 'req' }, next.locked));
            else {
                const n = needs(resolveMats(next.mats, el), next.coins);
                const tr = next.trial, trialOk = tr.kind === 'wins' ? (me.cardWins || 0) >= tr.n : !!me.fishLog?.[tr.fish]?.n;
                const lvOk = L >= next.lv;
                nextBox = h('div', { class: 'detail' },
                    h('div', { class: 'd-name', style: { color: next.color } }, `Prossimo grado: ${next.name}`),
                    h('div', { class: 'd-flavor' }, next.gives),
                    h('ul', { class: 'checks' }, check(lvOk, `Livello ${next.lv}${lvOk ? '' : ` (sei al ${L})`}`),
                        check(trialOk, `Prova: ${tr.text}${tr.kind === 'wins' ? ` · ${Math.min(me.cardWins || 0, tr.n)}/${tr.n}` : ''}`)),
                    n.el,
                    h('div', { class: 'btn-row end' }, btn('Risveglia la carta', async () => {
                        const r = await request('altar:awaken', {});
                        if (!r.ok) return;
                        app.audio.play('special');
                        toast(h('div', {}, h('b', {}, `La tua carta è ${r.name}!`), h('div', {}, next.gives + '.')), { kind: 'coin', icon: 'sparkles', duration: 8000 });
                    }, { cls: 'btn-primary', ic: 'sparkles', disabled: off || !lvOk || !trialOk || !n.ok })));
            }
            body = h('div', { class: 'split' },
                h('div', { class: 'center' }, app.local.cardImage ? holoImg(app.local.cardImage, G, 'altar-card') : null,
                    h('p', { class: 'muted small' }, `Grado: ${cur.name}${cur.seals ? ` · ${cur.seals === 1 ? 'un posto' : `${cur.seals} posti`} per i sigilli` : ''}`)),
                h('div', {}, intro, nextBox,
                    sect('star', 'I gradi della carta'),
                    h('div', { class: 'grades' }, CARD_GRADES.slice(1).map((g, i) => h('div', { class: 'grade' + (G >= i + 1 ? ' on' : '') },
                        h('b', { style: { color: g.color } }, g.name), h('span', {}, `livello ${g.lv}`), h('small', {}, g.gives)))),
                    h('p', { class: 'muted small' }, 'Chi cambia seme scende di un grado: la nebbia ricorda.')));
        } else if (tab === 'incanto') {
            const eq = new Set(Object.values(me.equipment || {}));
            const inv = [...(me.inventory || [])].sort((a, b) => (eq.has(b.uid) - eq.has(a.uid)) || ORDER[itemInfo(a).slot] - ORDER[itemInfo(b).slot]);
            const sel = inv.find(e => e.uid === this.selAlt) || inv[0];
            this.selAlt = sel?.uid;
            const cap = enchantCap(L), capNext = enchantCapNext(L);
            let detail = h('p', { class: 'muted' }, 'Non hai niente da incantare.');
            if (sel) {
                const inf = itemInfo(sel), isW = sel.kind === 'weapon', cur = inf.plus || 0, step = ENCHANT[cur + 1];
                const eff = (p) => isW ? `+${Math.round(p * ENCHANT_STEP.weapon * 100)}% di danni` : `+${Math.round(p * ENCHANT_STEP.gear * 100)}% di difesa`;
                let action;
                if (cur >= 10) action = h('p', { class: 'up' }, 'Il pezzo è a +10: la Custode non può fare di più.');
                else if (cur >= cap) action = h('p', { class: 'req' }, `Al tuo livello la Custode incanta fino a +${cap}.${capNext ? ` Dal livello ${capNext[0]} fino a +${capNext[1]}.` : ''}`);
                else {
                    const n = needs(enchantMats(step, mats, el), step.coins);
                    const scroll = this.useScroll && step.drop && (mats.pergamena || 0) > 0;
                    action = [
                        h('div', { class: 'ench-line' }, h('b', {}, `Verso +${cur + 1}`), ` ${eff(cur + 1)} · riesce ${Math.round(step.ok * 100)} volte su 100`),
                        step.drop ? h('p', { class: 'warn' }, 'Se fallisce, il pezzo scende di un livello. Non si rompe mai.') : step.ok < 1 ? h('p', { class: 'muted small' }, 'Se fallisce perdi solo i materiali.') : null,
                        n.el,
                        step.drop ? h('label', { class: 'check-line' }, h('input', { type: 'checkbox', checked: !!this.useScroll, disabled: !(mats.pergamena > 0), onchange: (e) => { this.useScroll = e.target.checked; this.render(); } }),
                            ` Usa una Pergamena Benedetta (ne hai ${mats.pergamena || 0}): se fallisce non scende`) : null,
                        h('div', { class: 'btn-row end' }, btn('Incanta', async () => {
                            const r = await request('altar:enchant', { uid: sel.uid, scroll });
                            if (!r.ok) return;
                            const base = inf.name.replace(/ \+\d+$/, '');
                            if (r.success) { app.audio.play(r.plus >= 5 ? 'special' : 'coin'); toast(h('div', {}, h('b', {}, `Riuscito: ${base} +${r.plus}`), r.plus === 5 && isW ? h('div', {}, "Ora l'arma lascia una scia del colore del tuo seme.") : r.plus === 10 && !isW ? h('div', {}, "Il capo ora ha un'aura.") : null), { kind: 'ok', icon: 'sparkles' }); }
                            else if (r.saved) { app.audio.play('block'); toast('Non è riuscito, ma la Pergamena Benedetta ha protetto il pezzo', { icon: 'scroll' }); }
                            else { app.audio.play('error'); toast(r.plus < r.from ? `Non è riuscito: il pezzo scende a +${r.plus}` : "Non è riuscito, ma il pezzo resta com'era", { kind: 'bad', icon: 'sparkles' }); }
                        }, { cls: 'btn-primary', ic: 'sparkles', disabled: off || !n.ok })),
                    ];
                }
                detail = h('div', { class: 'detail' },
                    h('div', { class: 'd-name r-' + tierOf(sel).id }, inf.name),
                    h('div', { class: 'd-type' }, `${SLOT_NAMES[inf.slot]} · ${cur ? `ora ${eff(cur)}` : 'mai incantato'}${eq.has(sel.uid) ? ' · indossato' : ''}`),
                    action);
            }
            body = [intro,
                h('div', { class: 'split' },
                    h('div', {}, h('div', { class: 'slot-grid' }, inv.map(e => this.slot({ ic: itemIconName(e), rar: tierOf(e).id, sel: e.uid === sel?.uid, eq: eq.has(e.uid), title: itemInfo(e).name, plus: itemInfo(e).plus, onclick: () => { this.selAlt = e.uid; app.audio.play('ui'); this.render(); } })))),
                    h('div', {}, detail,
                        sect('scroll', 'La scala degli incantamenti'),
                        h('table', { class: 'ench-table' }, h('tr', {}, h('th', {}, 'Livello'), h('th', {}, 'Riesce'), h('th', {}, 'Costo'), h('th', {}, 'Se fallisce')),
                            [[1, 3], [4, 5], [6, 8], [9, 10]].map(([a, b]) => {
                                const s = ENCHANT[a], last = ENCHANT[b];
                                const m = Object.entries(s.mats).map(([k, n]) => `${n} ${({ ess: ['Essenza', 'Essenze'], runa: ['Runa', 'Rune'], frammento: ['Frammento', 'Frammenti'], perla: ['Perla', 'Perle'] })[k]?.[n > 1 ? 1 : 0] || MATS[k].name}`).join(', ');
                                return h('tr', { class: b <= cap ? '' : 'locked' }, h('td', {}, `+${a}…+${b}`), h('td', {}, s.ok === last.ok ? `${Math.round(s.ok * 100)}%` : `${Math.round(s.ok * 100)}–${Math.round(last.ok * 100)}%`), h('td', {}, `${s.coins}–${last.coins} monete, ${m}`), h('td', {}, s.drop ? 'scende di uno' : 'niente'));
                            })),
                        h('p', { class: 'muted small' }, `Arma: +${ENCHANT_STEP.weapon * 100}% di danni a livello, da +5 lascia una scia. Vestiti: +${ENCHANT_STEP.gear * 100}% di difesa a livello, a +10 hanno un'aura. Fino a +3 dal livello 2, +5 dal 10, +8 dal 12, +10 dal 20.`)))];
        } else if (tab === 'infusione') {
            const weapons = (me.inventory || []).filter(e => e.kind === 'weapon');
            const sel = weapons.find(e => e.uid === this.selInf) || weapons.find(e => e.uid === me.equipment?.weapon) || weapons[0];
            this.selInf = sel?.uid;
            const pickEl = ELEMENTS[this.infEl] ? this.infEl : el;
            const lvOk = L >= INFUSE_LEVEL;
            const opp = OPPOSITE[el] === pickEl, has = (mats['ess_' + pickEl] || 0) > 0;
            body = [intro,
                lvOk ? null : h('p', { class: 'req' }, `Le infusioni si imparano dal livello ${INFUSE_LEVEL}. Intanto puoi raccogliere le Essenze vincendo i duelli.`),
                h('div', { class: 'split' },
                    h('div', {}, sect('swords', 'Arma da infondere'),
                        weapons.length ? h('div', { class: 'slot-grid' }, weapons.map(e => this.slot({ ic: e.spec.type, rar: tierOf(e).id, sel: e.uid === sel?.uid, eq: me.equipment?.weapon === e.uid, title: itemInfo(e).name, plus: plusOf(e.spec), onclick: () => { this.selInf = e.uid; this.render(); } }))) : h('p', { class: 'muted' }, 'Non hai armi.'),
                        sel ? h('div', { class: 'detail' }, h('div', { class: 'd-name r-' + tierOf(sel).id }, itemInfo(sel).name), weaponLines(sel.spec, el)) : null),
                    h('div', {}, sect('vial', 'Essenza'),
                        h('div', { class: 'el-pick' }, ELEMENT_IDS.map(k => h('button', { class: 'chip' + (k === pickEl ? ' sel' : ''), onclick: () => { this.infEl = k; this.render(); } }, elIcon(k), ELEMENTS[k].name, h('small', {}, `${mats['ess_' + k] || 0}`)))),
                        h('div', { class: 'detail' },
                            h('div', { class: 'd-name' }, `Infusione di ${ELEMENTS[pickEl].name}`),
                            h('div', {}, INFUSE[pickEl]),
                            opp ? h('p', { class: 'warn' }, `${ELEMENTS[pickEl].name} è l'opposto del tuo seme: l'effetto è doppio, ma porti addosso la Dissonanza (+5% di colpi che sfrigolano, +10% di SUPER che si dissolvono).`) : null,
                            sel?.spec.inf ? h('p', { class: 'muted small' }, `L'arma è già infusa di ${ELEMENTS[sel.spec.inf].name}: la nuova infusione prende il suo posto.`) : null,
                            needs({ ['ess_' + pickEl]: 1 }, INFUSE_COST).el,
                            h('div', { class: 'btn-row end' }, btn('Infondi', async () => {
                                const r = await request('altar:infuse', { uid: sel.uid, el: pickEl });
                                if (r.ok) { app.audio.play('special'); toast(`${itemInfo(sel).name} ora porta il seme di ${ELEMENTS[pickEl].name}`, { kind: 'ok', icon: 'cauldron' }); }
                            }, { cls: 'btn-primary', ic: 'cauldron', disabled: off || !lvOk || !sel || !has || sel?.spec.inf === pickEl || (me.coins || 0) < INFUSE_COST })))))];
        } else if (tab === 'fusione') {
            const pickEl = ELEMENTS[this.fuseEl] ? this.fuseEl : (ELEMENT_IDS.find(k => k !== el && (mats['ess_' + k] || 0) > 0) || ELEMENT_IDS.find(k => k !== el));
            const runeN = needs({ frammento: FUSE.runa.frammento, ['ess_' + pickEl]: FUSE.runa.ess }, FUSE.runa.coins);
            const trasN = needs({ ['ess_' + pickEl]: FUSE.trasmuta.ess }, FUSE.trasmuta.coins);
            const go = (recipe) => async () => { const r = await request('altar:fuse', { recipe, el: pickEl }); if (r.ok) { app.audio.play('special'); toast(`La Custode ti consegna: ${MATS[r.out].name}`, { kind: 'ok', icon: MATS[r.out].icon }); } };
            body = [intro,
                sect('vial', 'Scegli il seme'),
                h('div', { class: 'el-pick' }, ELEMENT_IDS.map(k => h('button', { class: 'chip' + (k === pickEl ? ' sel' : ''), onclick: () => { this.fuseEl = k; this.render(); } }, elIcon(k), ELEMENTS[k].name,
                    h('small', {}, `${mats['ess_' + k] || 0} ess. · ${mats['runa_' + k] || 0} rune`)))),
                h('div', { class: 'split', style: { marginTop: '12px' } },
                    h('div', { class: 'detail' }, h('div', { class: 'd-name' }, `Runa ${RUNE_NAMES[pickEl]}`),
                        h('div', { class: 'd-flavor' }, `Otto Frammenti di Runa fusi con un'Essenza di ${ELEMENTS[pickEl].name}. Le rune servono per i +9 e +10 e per la carta Incisa.`),
                        runeN.el, h('div', { class: 'btn-row end' }, btn('Fondi la runa', go('runa'), { cls: 'btn-primary', ic: 'runestone', disabled: off || !runeN.ok }))),
                    h('div', { class: 'detail' }, h('div', { class: 'd-name' }, `Trasmutazione in ${ELEMENTS[el].name}`),
                        pickEl === el ? h('p', { class: 'muted' }, 'Scegli un seme diverso dal tuo: tre sue Essenze diventano una del tuo seme.')
                            : [h('div', { class: 'd-flavor' }, `Tre Essenze di ${ELEMENTS[pickEl].name} diventano un'Essenza di ${ELEMENTS[el].name}, il tuo seme. Servono per risvegliare la carta.`),
                                trasN.el, h('div', { class: 'btn-row end' }, btn('Trasmuta', go('trasmuta'), { cls: 'btn-primary', ic: 'vial', disabled: off || !trasN.ok }))]))];
        } else if (tab === 'sigilli') {
            const G = me.grade || 0, slots = gradeOf(G).seals, on = me.sealsOn || [], owned = new Set(me.seals || []);
            body = [intro,
                h('p', {}, slots ? `La tua carta ${gradeOf(G).name} ha ${slots === 1 ? 'un posto' : `${slots} posti`} per i sigilli: ne usi ${on.length}.` : 'Una carta Comune non ha posti per i sigilli: risvegliala in Filigrana per avere il primo.'),
                h('div', { class: 'list' }, Object.entries(SEALS).map(([id, S]) => h('div', { class: 'row seal-row' + (owned.has(id) ? '' : ' unknown') },
                    h('span', { class: 'seal-ic', html: iconSVG(S.icon) }),
                    h('div', { class: 'grow' }, h('div', { class: 'nm' }, owned.has(id) ? S.name : '???'), h('div', { class: 'sub' }, owned.has(id) ? S.desc : S.where)),
                    owned.has(id) ? (on.includes(id)
                        ? btn('Togli', async () => { const r = await request('altar:seal', { id, on: false }); if (r.ok) app.audio.play('ui'); }, { cls: 'btn-sm' })
                        : btn('Incastona', async () => { const r = await request('altar:seal', { id, on: true }); if (r.ok) { app.audio.play('coin'); toast(`${S.name} incastonato sulla carta`, { kind: 'ok', icon: S.icon }); } }, { cls: 'btn-sm btn-primary', disabled: off || on.length >= slots })) : null)))];
        } else {
            const active = (me.blessUntil || 0) > Date.now();
            const until = active ? new Date(me.blessUntil).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : null;
            body = [intro,
                h('div', { class: 'detail' }, h('div', { class: 'd-name' }, 'Offerta alla Custode'),
                    h('div', { class: 'd-flavor' }, `Lascia ${BLESSING.coins} Sputnik Coin sull'altare: per un'ora ogni cosa ti dà il ${Math.round(BLESSING.xp * 100)}% di esperienza in più. La Custode accetta un'offerta al giorno.`),
                    active ? h('p', { class: 'up' }, `Sei benedetto fino alle ${until}.`) : me.blessedToday ? h('p', { class: 'muted' }, 'Per oggi la Custode ha già accettato la tua offerta.') : null,
                    h('div', { class: 'btn-row end' }, btn("Lascia l'offerta", async () => {
                        const r = await request('altar:offer', {});
                        if (r.ok) { app.audio.play('special'); toast("La fiamma dell'altare si alza: sei benedetto per un'ora", { kind: 'coin', icon: 'candle' }); }
                    }, { cls: 'btn-primary', ic: 'candle', disabled: off || active || me.blessedToday || (me.coins || 0) < BLESSING.coins }))),
                sect('star', "Il Rito dell'Oblio"),
                h('p', { class: 'muted' }, "Nel Libro della Maestria, qui all'altare, puoi ridistribuire i tuoi punti."),
                h('div', { class: 'btn-row' }, maestria)];
        }
        this.set('altar', T, off ? this.needOnline() : null, h('div', { class: 'bag-head' }, h('div', { style: { flex: 1 } }, bar), this.purse()), body);
    }

    // --- FORGIA ---
    p_forgia() {
        const me = this.app.me;
        const spec = this.forgeSpec ||= { type: 'spada', material: 'ferro', handle: 'cuoio', gem: 'nessuna', name: '' };
        const st = weaponStats(spec), cost = weaponCost(spec);
        const view = this.tabs.forgeView || 'arma';
        const choose = (key, k) => () => { spec[key] = k; this.app.audio.play('ui'); this.render(); };
        const statRow = (label, val, max, txt) => h('div', { class: 'stat-row' }, h('span', {}, label), h('div', { class: 'stat-bar' }, h('div', { style: { width: `${Math.min(100, val / max * 100)}%` } })), h('b', {}, txt ?? '×' + val.toFixed(2)));
        const gemEl = GEMS[spec.gem].element;
        const weapons = (me.inventory || []).filter(e => e.kind === 'weapon');
        const L = me.level || 1, req = weaponLevel(spec), tooLow = req > L;
        const parts = [
            sect('swords', "Tipo d'arma"),
            h('div', { class: 'part-row' }, Object.entries(WEAPON_TYPES).filter(([k]) => k !== 'pugni').map(([k, v]) => this.slot({ ic: k, sel: spec.type === k, label: v.name, price: v.cost, title: v.name, onclick: choose('type', k) }))),
            sect('anvil', 'Materiale'),
            h('div', { class: 'part-row' }, Object.entries(MATERIALS).map(([k, v]) => this.slot({ tint: v.color, sel: spec.material === k, label: v.name, price: v.cost || null, title: v.name, lock: lockLabel(MATERIAL_LEVEL[k] || 1, L), onclick: choose('material', k) }))),
            sect('fist', 'Impugnatura'),
            h('div', { class: 'part-row' }, Object.entries(HANDLES).map(([k, v]) => this.slot({ tint: v.color, sel: spec.handle === k, label: v.name.split(' ')[0], price: v.cost || null, title: v.name, lock: lockLabel(HANDLE_LEVEL[k] || 1, L), onclick: choose('handle', k) }))),
            sect('gem', 'Gemma incastonata'),
            h('div', { class: 'part-row' }, Object.entries(GEMS).map(([k, v]) => this.slot({ ic: v.element ? 'gem' : 'close', color: v.color || '#6a5a40', sel: spec.gem === k, label: v.name, price: v.cost || null, title: v.element ? `${v.name}: legata a ${ELEMENTS[v.element].name}` : 'Nessuna gemma', lock: v.element ? lockLabel(GEM_LEVEL, L) : null, onclick: choose('gem', k) }))),
            h('label', { class: 'field' }, "Nome dell'arma"),
            h('input', { type: 'text', maxlength: 28, value: spec.name, placeholder: `${WEAPON_TYPES[spec.type].name} di ${MATERIALS[spec.material].name}`, style: { width: '100%' }, oninput: (e) => { spec.name = e.target.value; } }),
            h('div', { class: 'btn-row', style: { marginTop: '16px', justifyContent: 'space-between' } },
                h('span', { class: 'purse' }, 'Costo ', coin(cost)),
                btn('Forgia', async () => {
                    const r = await this.act('forge:craft', { spec: sanitizeWeaponSpec(spec) }, `Il fabbro ti consegna: ${spec.name || WEAPON_TYPES[spec.type].name}`);
                    if (r.ok) { this.app.audio.play('heavy'); this.act('equip', { slot: 'weapon', uid: r.uid }, 'Ora la impugni'); }
                }, { cls: 'btn-primary', ic: 'hammer', disabled: me.coins < cost || tooLow })),
            tooLow ? h('p', { class: 'req', style: { margin: '8px 0 0', textAlign: 'right' } }, `Mastro Brace lavora questi pezzi solo dal livello ${req}.`) : null,
        ];
        this.set('anvil', 'Forgia di Vulcano', this.needOnline(),
            h('div', { class: 'split' },
                h('div', {},
                    this.studioBox(S => { S.setCharacter(me.appearance, { ...this.app.look(), weapon: { ...spec, name: spec.name || 'Anteprima' } }); if (view === 'arma') S.showWeapon(spec); }),
                    h('div', { class: 'btn-row mid', style: { marginTop: '10px' } },
                        btn(view === 'arma' ? 'Vedila in mano' : "Solo l'arma", () => { this.tabs.forgeView = view === 'arma' ? 'mano' : 'arma'; this.render(); }, { cls: 'btn-sm', ic: view === 'arma' ? 'person' : 'swords' })),
                    h('div', { class: 'detail' },
                        statRow('Danno', st.dmg, 1.8), statRow('Velocità', st.speed, 1.5), statRow('Portata', st.reach, 1.2, `+${st.reach.toFixed(1)} m`), statRow('Contraccolpo', st.kb, 1.5),
                        gemEl ? h('div', { class: 'd-stats', style: { display: 'flex', gap: '8px', alignItems: 'center', margin: '10px 0 0' } }, elIcon(gemEl),
                            h('span', { class: 'up' }, `+20% carica del Super${gemEl === me.card?.element ? ', +10% danni: si accorda con la tua card!' : ''}`)) : h('div', { class: 'd-flavor', style: { margin: '10px 0 0' } }, 'Una gemma carica più in fretta il Super.'))),
                h('div', {}, parts,
                    sect('swords', 'La tua armeria'),
                    weapons.length ? h('div', { class: 'list' }, weapons.map(e => {
                        const r = tierOf(e);
                        return h('div', { class: 'row' }, h('div', { style: { width: '46px' } }, this.slot({ ic: e.spec.type, rar: r.id, eq: me.equipment?.weapon === e.uid })),
                            h('div', { class: 'grow' }, h('div', { class: 'nm d-name r-' + r.id, style: { fontSize: '18px' } }, e.spec.name), h('div', { class: 'sub' }, itemInfo(e).sub)),
                            me.equipment?.weapon === e.uid ? h('span', { class: 'sub' }, 'In pugno') : btn('Impugna', () => this.act('equip', { slot: 'weapon', uid: e.uid }), { cls: 'btn-sm' }));
                    })) : h('p', { class: 'muted' }, 'Ancora nessuna arma forgiata.'))));
    }

    // --- BAZAR (registro su pergamena) ---
    async p_bazar() {
        const me = this.app.me;
        const [tab, bar] = this.tabBar('bazar', [['banco', 'Al banco', 'scales'], ['vendi', 'Vendi', 'coins'], ['miei', 'I tuoi annunci', 'quill']]);
        const off = this.needOnline();
        const T = 'Bazar del Ratto';
        if (off) return this.set('scales', T, off);
        const row = (e, right, sub) => {
            const inf = itemInfo(e), r = tierOf(e);
            return h('div', { class: 'ledger-row' }, this.slot({ ic: itemIconName(e), rar: r.id }),
                h('div', { class: 'grow' }, h('div', { class: 'nm ink-' + r.id }, inf.name), h('div', { class: 'sub' }, sub || `${SLOT_NAMES[inf.slot]} · ${r.name}`)), right);
        };
        if (tab === 'vendi') {
            const eq = Object.values(me.equipment || {});
            const sellable = (me.inventory || []).filter(e => !eq.includes(e.uid));
            return this.set('scales', T, bar, h('div', { class: 'parchment' },
                lore('«Lascia qui la tua merce, viandante. Il Ratto la custodisce anche mentre dormi... per una piccola commissione di zero monete.»'),
                sellable.length ? sellable.map(e => {
                    const inf = itemInfo(e);
                    const price = h('input', { type: 'number', min: 1, max: ECONOMY.MAX_LIST_PRICE, value: Math.max(1, Math.round(inf.value * 0.8)), style: { width: '96px' } });
                    return row(e, h('div', { class: 'btn-row' }, price, btn('Metti al banco', () => this.act('market:list', { uid: e.uid, price: +price.value }, 'La tua merce è sul banco del Bazar').then(() => this.render()), { cls: 'btn-sm', ic: 'scales' })), `In bottega varrebbe ${inf.value} monete`);
                }) : h('div', { class: 'empty' }, 'Nulla da vendere: togliti di dosso ciò che vuoi cedere.')));
        }
        this.set('scales', T, bar, h('div', { class: 'parchment' }, h('div', { class: 'empty' }, 'Il Ratto sfoglia il suo registro...')));
        const r = await this.app.net.request('market:get');
        if (this.current !== 'bazar') return;
        const listings = (r.listings || []).filter(l => tab === 'miei' ? l.seller === me.id : true).sort((a, b) => b.at - a.at);
        this.set('scales', T, bar, h('div', { class: 'parchment' },
            tab === 'banco' ? lore('Oggetti messi in vendita dagli altri viandanti. Il denaro va dritto nelle loro tasche.') : null,
            listings.length ? [h('div', { class: 'ledger-head' }, h('span', { style: { width: '46px' } }), h('span', { class: 'grow', style: { flex: 1 } }, 'Merce'), h('span', {}, 'Prezzo'))].concat(listings.map(l => {
                const mine = l.seller === me.id;
                return row(l.entry, h('div', { class: 'btn-row' }, coin(l.price),
                    mine ? btn('Ritira', () => this.act('market:cancel', { lid: l.lid }, 'Hai ritirato la tua merce').then(() => this.render()), { cls: 'btn-sm' })
                        : btn('Compra', () => this.act('market:buy', { lid: l.lid }, `Affare fatto: ${itemInfo(l.entry).name}`).then(() => this.render()), { cls: 'btn-sm btn-primary', disabled: me.coins < l.price })),
                    `${SLOT_NAMES[itemInfo(l.entry).slot]} · venduto da ${l.sellerName}`);
            })) : h('div', { class: 'empty' }, tab === 'miei' ? 'Non hai merce sul banco.' : 'Il banco è vuoto. Sii il primo a vendere qualcosa!'),
            h('div', { class: 'btn-row end', style: { marginTop: '10px' } }, this.purse())));
    }

    // --- ALBO DEI CAMPIONI ---
    async p_classifica() {
        const [tab, bar] = this.tabBar('lb', [['rating', 'Campioni', 'swords'], ['coins', 'Ricchezze', 'coins']]);
        const T = 'Albo dei Campioni';
        const off = this.needOnline();
        if (off) return this.set('trophy', T, off);
        this.set('trophy', T, bar, h('div', { class: 'parchment' }, h('div', { class: 'empty' }, 'Lo scriba srotola la pergamena...')));
        const r = await this.app.net.request('lb:get');
        if (this.current !== 'classifica') return;
        if (!r.ok) return this.set('trophy', T, bar, h('div', { class: 'empty' }, r.msg));
        this.app.world?.setLeaderboard(r.rating);
        const rows = r[tab] || [], me = this.app.me;
        this.set('trophy', T, bar, h('div', { class: 'parchment' },
            lore(tab === 'rating' ? `I più valorosi tra i ${r.total} viandanti dell'isola. Tu occupi il ${r.myRank}° posto con ${me.rating} punti di gloria.` : 'Chi ha le tasche più piene di Sputnik Coin.'),
            h('div', { class: 'ledger-head' }, h('span', { style: { width: '34px' } }, '#'), h('span', { style: { flex: 1 } }, 'Viandante'), h('span', { class: 'num' }, 'Gloria'), h('span', { class: 'num' }, 'V / S'), h('span', { class: 'num' }, 'Monete')),
            rows.map((p, i) => h('div', { class: 'ledger-row' + (p.id === me.id ? ' me' : '') },
                h('span', { class: 'seal ' + (i < 3 ? 'g' + (i + 1) : 'plain') }, i + 1),
                h('div', { class: 'grow', style: { flex: 1, minWidth: 0 } }, h('a', { href: '#', class: 'nm', style: { textDecoration: 'none' }, onclick: (e) => { e.preventDefault(); this.open('profilo', p.id); } },
                    p.element ? elIcon(p.element) : null, p.name, p.online ? h('span', { class: 'gem-dot on', title: 'Sull\'isola ora' }) : null)),
                h('span', { class: 'num' }, p.rating), h('span', { class: 'num' }, `${p.wins} / ${p.losses}`), h('span', { class: 'num' }, coin(p.coins))))));
    }

    // --- COMPAGNIA (amici e sessioni private) ---
    async p_amici() {
        const me = this.app.me;
        const reqN = (me.requests || []).length;
        const [tab, bar] = this.tabBar('fr', [['online', 'Viandanti', 'person'], ['amici', 'Amici', 'handshake'], ['richieste', `Richieste${reqN ? ` (${reqN})` : ''}`, 'letter'], ['sessione', 'Sessione privata', 'lock']]);
        const T = 'Compagnia';
        const off = this.needOnline();
        if (off) return this.set('friends', T, off);
        const friendIds = new Set((me.friends || []).map(f => f.id));
        const ib = (ic, title, onclick, cls = '') => h('button', { class: 'btn btn-sm ' + cls, title, onclick, html: iconSVG(ic) }, title);
        if (tab === 'online') {
            this.set('friends', T, bar, h('div', { class: 'empty' }, '...'));
            const r = await this.app.net.request('players:get');
            if (this.current !== 'amici') return;
            const list = r.players || [];
            return this.set('friends', T, bar, list.length ? h('div', { class: 'list' }, list.map(p => h('div', { class: 'row' },
                h('span', { class: 'gem-dot on' }),
                h('div', { class: 'grow' }, h('div', { class: 'nm' }, elIcon(p.element), p.name), h('div', { class: 'sub' }, `${titleFor(p.level || 1)} · livello ${p.level} · gloria ${p.rating}${p.sameRoom ? '' : ' · altrove'}${p.duel ? ' · in duello' : ''}`)),
                ib('portrait', 'Profilo', () => this.open('profilo', p.id)),
                friendIds.has(p.id) ? null : ib('handshake', 'Amicizia', () => this.act('friend:request', { id: p.id })),
                p.sameRoom && !p.duel ? ib('swords', 'Sfida', () => this.open('arena', { focus: p.id }), 'btn-primary') : null)))
                : h('div', { class: 'empty' }, 'Sei solo sull\'isola, per ora. Chiama qualche amico!'));
        }
        if (tab === 'amici') {
            const inPriv = this.app.room?.private;
            return this.set('friends', T, bar, (me.friends || []).length ? h('div', { class: 'list' }, me.friends.map(f => h('div', { class: 'row' },
                h('span', { class: 'gem-dot' + (f.online ? ' on' : '') }),
                h('div', { class: 'grow' }, h('div', { class: 'nm' }, f.name), h('div', { class: 'sub' }, f.online ? 'Sull\'isola' : 'Lontano')),
                ib('portrait', 'Profilo', () => this.open('profilo', f.id)),
                f.online && inPriv ? ib('lock', 'Invita', () => this.act('session:invite', { id: f.id }), 'btn-primary') : null,
                ib('letter', 'Card', () => this.act('card:send', { to: f.id })),
                h('button', { class: 'btn btn-sm btn-danger', title: 'Rompi l\'amicizia', html: iconSVG('close'), onclick: () => { if (confirm(`Rompere l'amicizia con ${f.name}?`)) this.act('friend:remove', { id: f.id }, 'Le vostre strade si separano'); } }))))
                : h('div', { class: 'empty' }, 'Ancora nessun amico. Dalla scheda Viandanti puoi stringere amicizia.'));
        }
        if (tab === 'richieste') {
            return this.set('friends', T, bar, reqN ? h('div', { class: 'list' }, me.requests.map(q => h('div', { class: 'row' },
                h('div', { class: 'grow' }, h('div', { class: 'nm' }, q.name), h('div', { class: 'sub' }, 'chiede la tua amicizia')),
                ib('handshake', 'Accetta', () => this.act('friend:respond', { id: q.id, accept: true }), 'btn-primary'),
                ib('close', 'Rifiuta', () => this.act('friend:respond', { id: q.id, accept: false }, 'Richiesta rifiutata')))))
                : h('div', { class: 'empty' }, 'Nessuna lettera in attesa.'));
        }
        const room = this.app.room || {};
        const onlineFriends = (me.friends || []).filter(f => f.online);
        this.set('friends', T, bar,
            lore('Una sessione privata è una copia dell\'isola tutta per voi: entrano solo gli amici che inviti.'),
            h('p', {}, 'Ti trovi in: ', h('b', { style: { fontFamily: 'var(--display)', color: 'var(--gold-hi)', fontSize: '19px' } }, room.name || 'Isola Fantasma')),
            room.private ? [
                sect('person', 'Presenti'),
                h('div', { class: 'list' }, [h('div', { class: 'row' }, h('div', { class: 'grow nm' }, `${me.name} (tu)`)), ...[...this.app.players.values()].map(p => h('div', { class: 'row' }, h('div', { class: 'grow nm' }, p.info.name)))]),
                sect('letter', 'Invita'),
                onlineFriends.length ? h('div', { class: 'list' }, onlineFriends.map(f => h('div', { class: 'row' }, h('div', { class: 'grow nm' }, f.name), ib('lock', 'Invita', () => this.act('session:invite', { id: f.id }), 'btn-primary')))) : h('p', { class: 'muted' }, 'Nessun amico sull\'isola in questo momento.'),
                h('div', { class: 'btn-row', style: { marginTop: '16px' } }, btn("Torna all'isola di tutti", () => this.app.leaveSession(), { ic: 'door' })),
            ] : btn('Apri una sessione privata', () => this.app.createSession(), { cls: 'btn-primary', ic: 'lock' }));
    }

    // --- PROFILO DI UN VIANDANTE ---
    async p_profilo(pid) {
        this.set('portrait', 'Viandante', h('div', { class: 'empty' }, '...'));
        const r = await this.app.net.request('profile:get', { id: pid });
        if (this.current !== 'profilo') return;
        if (!r.ok) return this.set('portrait', 'Viandante', h('div', { class: 'empty' }, r.msg));
        const p = r.profile, me = this.app.me, el = ELEMENTS[p.element];
        const inRoom = this.app.players.has(p.id);
        const stat = (label, val) => h('div', { class: 'stat-row', style: { gridTemplateColumns: '130px 1fr' } }, h('span', {}, label), h('b', { style: { textAlign: 'left' } }, val));
        this.set('portrait', p.name,
            h('div', { class: 'split' },
                p.cardImage ? holoImg(p.cardImage, p.grade) : h('div', { class: 'empty' }, 'Nessuna card'),
                h('div', {},
                    h('div', { class: 'nm', style: { fontSize: '28px' } }, p.name, h('span', { class: 'gem-dot' + (p.online ? ' on' : ''), title: p.online ? 'Sull\'isola' : 'Lontano' })),
                    h('div', { class: 'sub', style: { display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '10px' } }, elIcon(p.element), `Elemento: ${el?.name}`),
                    h('div', { class: 'detail' }, stat('Livello', `${p.level} · ${titleFor(p.level || 1)}`), stat('Gloria', p.rating), stat('Vittorie', p.wins), stat('Sconfitte', p.losses),
                        h('div', { class: 'd-flavor' }, `${el?.passive.name}: ${el?.passive.desc}`)),
                    h('div', { class: 'btn-row', style: { marginTop: '14px' } },
                        p.id === me.id ? null : p.friend ? h('span', { class: 'sub' }, 'Siete amici') : p.requested ? h('span', { class: 'sub' }, 'Richiesta inviata') : btn('Stringi amicizia', () => this.act('friend:request', { id: p.id }).then(() => this.render()), { ic: 'handshake' }),
                        p.id !== me.id && inRoom ? btn('Sfida a duello', () => this.open('arena', { focus: p.id }), { cls: 'btn-primary', ic: 'swords' }) : null,
                        p.id !== me.id ? btn('Mandagli la tua card', () => this.act('card:send', { to: p.id }), { ic: 'letter' }) : null))));
    }

    // --- CARD DEL POTERE ---
    p_card() {
        const app = this.app, me = app.me;
        const card = this.cardDraft ||= structuredClone(me.card || app.local.card);
        const previewHost = h('div', { class: 'card-preview-wrap' }), fields = h('div');
        cardEditor(fields, { ...app.cardOpts(card), studio: app.studio, previewHost });
        const hiRes = () => composeCard(app.cardOpts(card), app.studio, CARD_W * 2);
        const sendSel = h('select', { style: { flex: 1 } }, h('option', { value: '' }, 'Scegli a chi mandarla...'));
        app.net.request('players:get').then(r => {
            const seen = new Set();
            for (const f of me.friends || []) { seen.add(f.id); sendSel.append(h('option', { value: f.id }, `${f.name} (amico${f.online ? '' : ', lontano'})`)); }
            for (const p of r.players || []) if (!seen.has(p.id)) sendSel.append(h('option', { value: p.id }, p.name));
        });
        this.set('card', 'Card del Potere',
            h('div', { class: 'card-layout' },
                h('div', {}, previewHost,
                    h('div', { class: 'btn-row mid', style: { marginTop: '14px' } },
                        btn('Salva', async () => { if (await app.saveCard(card) === false) return; this.cardDraft = null; toast('La tua card è stata rilegata', { kind: 'ok', icon: 'card' }); }, { cls: 'btn-primary', ic: 'save' }),
                        btn('Stampa', async () => { if (!printCard(await hiRes(), card.title)) toast('Il browser ha bloccato la finestra di stampa', { kind: 'bad' }); }, { ic: 'print' }),
                        btn('Scarica', async () => downloadCard(await hiRes(), card.title), { ic: 'download' })),
                    h('div', { class: 'btn-row', style: { marginTop: '10px', flexWrap: 'nowrap' } }, sendSel,
                        btn('Invia', async () => {
                            if (!sendSel.value) return toast('Scegli prima il destinatario', { kind: 'bad' });
                            if (await app.saveCard(card) === false) return;
                            this.act('card:send', { to: sendSel.value });
                        }, { ic: 'letter' }))),
                h('div', {}, lore('La texture decide l\'elemento della card, quindi le tue doti in combattimento e il Super. Se carichi un\'immagine tua, l\'elemento lo sceglie il suo colore dominante.'), fields)));
    }

    // --- ALBUM DELLE CARD ---
    async p_collezione(zoom) {
        const app = this.app;
        if (zoom) {
            const img = await loadImage(zoom.image);
            return this.set('album', zoom.title || 'Card',
                holoImg(zoom.image, zoom.grade),
                h('div', { class: 'btn-row mid', style: { marginTop: '16px' } },
                    btn('Stampa', () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); printCard(c, zoom.title); }, { ic: 'print' }),
                    btn('Scarica', () => { const a = document.createElement('a'); a.href = zoom.image; a.download = `card-${zoom.name || 'sputnik'}.jpg`; a.click(); }, { ic: 'download' }),
                    zoom.from ? btn('Togli dall\'album', async () => { await this.act('collection:remove', { from: zoom.from }, 'Card tolta dall\'album'); this.open('collezione'); }, { cls: 'btn-danger', ic: 'close' }) : null,
                    btn('Torna all\'album', () => this.open('collezione'), { ic: 'album' })));
        }
        const mine = app.local.cardImage;
        this.set('album', 'Album delle Card', h('div', { class: 'empty' }, '...'));
        const r = app.net.connected ? await app.net.request('collection:get') : { collection: [] };
        if (this.current !== 'collezione') return;
        const list = r.collection || [];
        this.set('album', 'Album delle Card',
            lore('Le card che gli altri viandanti ti hanno donato. Per ricambiare, apri la tua Card del Potere e premi Invia.'),
            h('div', { class: 'cards-grid' },
                mine ? h('figure', { onclick: () => this.open('collezione', { image: mine, title: 'La tua card', name: app.me.name, grade: app.me.grade }) }, holoImg(mine, app.me.grade, ''), h('figcaption', {}, 'La tua card')) : null,
                list.map(c => h('figure', { onclick: () => this.open('collezione', { image: c.image, title: c.title, name: c.name, from: c.from, grade: c.grade }) }, holoImg(c.image, c.grade, ''), h('figcaption', {}, `${c.name} · ${new Date(c.at).toLocaleDateString('it-IT')}${c.grade ? ` · ${gradeOf(c.grade).name}` : ''}`)))),
            list.length ? null : h('div', { class: 'empty' }, 'Nessuna card ricevuta, per ora.'));
    }

    // --- ARENA ---
    p_arena(arg) {
        const app = this.app;
        const players = [...app.players.values()].map(p => ({ p, d: p.distTo(app.player.pos) })).sort((a, b) => a.d - b.d);
        const duels = [...app.duels.values()];
        const focus = arg?.focus;
        const skulls = (n) => h('span', { style: { display: 'inline-flex', gap: '2px' }, html: iconSVG('skull').repeat(n) });
        this.set('swords', "Arena dei Duelli",
            lore('Sfida un viandante: appena accetta si combatte, e chi guarda ha 15 secondi per scommettere sul vincitore.'),
            sect('swords', 'Sfidanti sull\'isola'),
            !app.net.connected ? h('p', { class: 'muted' }, 'Il portale è chiuso: per ora puoi solo allenarti col Fantasma.') :
                players.length ? h('div', { class: 'list' }, players.map(({ p, d }) => {
                    const stake = h('input', { type: 'number', min: 0, max: ECONOMY.MAX_STAKE, value: 0, style: { width: '84px' }, title: 'Posta in Sputnik Coin' });
                    return h('div', { class: 'row' + (p.info.id === focus ? ' hl' : '') },
                        h('div', { class: 'grow' }, h('div', { class: 'nm' }, elIcon(p.info.element), p.info.name), h('div', { class: 'sub' }, `Livello ${p.info.level || 1} · gloria ${p.info.rating || 1000} · a ${Math.round(d)} passi${p.info.duel ? ' · sta già combattendo' : ''}`)),
                        h('span', { class: 'sub' }, 'Posta'), stake,
                        btn('Sfida', () => this.act('duel:challenge', { id: p.info.id, stake: +stake.value }), { cls: 'btn-sm btn-primary', ic: 'swords', disabled: p.info.duel }));
                })) : h('p', { class: 'muted' }, 'Nessun altro viandante qui. Allenati col Fantasma intanto!'),
            duels.length ? [sect('eye', 'Duelli in corso'),
                h('div', { class: 'list' }, duels.map(d => h('div', { class: 'row' }, h('div', { class: 'grow' }, h('div', { class: 'nm' }, `${d.a.name} contro ${d.b.name}`), h('div', { class: 'sub' }, d.phase === 'betting' ? 'Scommesse aperte' : 'Si combatte')),
                    btn(d.phase === 'betting' ? 'Guarda e punta' : 'Guarda', () => { this.close(); app.watchDuel(d.id); }, { cls: 'btn-sm btn-primary', ic: 'eye' }))))] : null,
            sect('skull', 'Allenamento col Fantasma'),
            h('p', { class: 'muted', style: { marginTop: 0 } }, 'Un duello di prova contro uno spirito del castello. Niente monete in palio.'),
            h('div', { class: 'btn-row' }, [['Novizio', 0.6, 1], ['Guerriero', 1, 2], ['Campione', 1.6, 3]].map(([l, v, n]) => h('button', { class: 'btn', onclick: () => { this.close(); app.startPractice(v); } }, skulls(n), l))));
    }

    // --- OPZIONI ---
    p_impostazioni() {
        const app = this.app;
        const set = app.local.settings ||= {};
        const token = app.local.token;
        const code = h('input', { type: 'text', placeholder: 'Incolla qui un codice di recupero', style: { flex: 1 } });
        this.set('cog', 'Opzioni',
            h('div', { class: 'parchment' },
                h('h3', { class: 'sect', style: { marginTop: 0 }, html: iconSVG('mirror') }, 'Il tuo viandante'),
                h('div', { class: 'btn-row' },
                    btn('Cambia aspetto e nome', () => { this.close(); app.editAppearance(); }, { ic: 'mirror' }),
                    btn('Modifica la card', () => this.open('card'), { ic: 'card' })),
                h('h3', { class: 'sect', html: iconSVG('lantern') }, 'Grafica'),
                h('div', { class: 'chips' }, [['alta', 'Splendida', 'ombre e bagliori'], ['bassa', 'Leggera', 'più fluida']].map(([k, l, s]) => h('button', {
                    class: 'chip' + ((set.quality || app.defaultQuality) === k ? ' sel' : ''),
                    onclick: () => { set.quality = k; app.saveLocal(); if (confirm('Ricaricare il gioco ora per applicare?')) location.reload(); else this.render(); },
                }, l, h('small', {}, s)))),
                h('h3', { class: 'sect', html: iconSVG('music') }, 'Suoni'),
                h('label', { class: 'field' }, 'Musica'),
                h('input', { type: 'range', class: 'range', min: 0, max: 1, step: 0.05, value: app.audio.musicVol, oninput: (e) => { app.audio.setMusicVolume(+e.target.value); set.musicVol = +e.target.value; app.saveLocal(); } }),
                h('label', { class: 'field' }, 'Effetti'),
                h('input', { type: 'range', class: 'range', min: 0, max: 1, step: 0.05, value: app.audio.sfxVol, oninput: (e) => { app.audio.setSfxVolume(+e.target.value); set.sfxVol = +e.target.value; app.saveLocal(); } }),
                h('h3', { class: 'sect', html: iconSVG('eye') }, 'Controlli'),
                h('label', { class: 'field' }, 'Sensibilità del mouse'),
                h('input', { type: 'range', class: 'range', min: 0.4, max: 2.5, step: 0.1, value: set.sens || 1, oninput: (e) => { set.sens = +e.target.value; app.saveLocal(); } }),
                h('div', { class: 'keys', style: { justifyContent: 'flex-start', marginTop: '12px', fontSize: '15px' } },
                    [['WASD', 'cammina'], ['Shift', 'corri'], ['Spazio', 'salta'], ['E', 'interagisci'], ['R', 'profilo vicino'], ['F', 'fango'], ['V', 'visuale'], ['1-4', 'gesti'], ['Invio', 'parla'], ['M', 'voce'], ['B', 'musica'], ['I', 'bisaccia'], ['C', 'card'], ['O', 'compagnia'], ['Tab', 'albo'], ['K', 'album'], ['N', 'mappa']]
                        .map(([k, t]) => h('span', {}, h('i', { class: 'kbd' }, k), ' ', t))),
                h('h3', { class: 'sect', html: iconSVG('lock') }, 'Codice di recupero'),
                h('p', { class: 'lore' }, 'Il tuo viandante vive in questo browser. Con il codice puoi ritrovarlo su un altro dispositivo: custodiscilo come una chiave, perché chi lo possiede comanda il tuo personaggio e le tue monete.'),
                token ? h('details', {}, h('summary', {}, 'Mostra il codice'), h('div', { class: 'code', style: { marginTop: '8px' } }, token)) : h('p', { class: 'muted' }, 'Il codice comparirà quando il portale sarà aperto.'),
                h('div', { class: 'btn-row', style: { marginTop: '10px', flexWrap: 'nowrap' } }, code, btn('Recupera', () => {
                    const v = code.value.trim();
                    if (!/^[0-9a-f-]{36}$/i.test(v)) return toast('Questo codice non sembra valido', { kind: 'bad' });
                    if (!confirm('Caricare il viandante di questo codice? Quello attuale resta sul server, ma conserva il suo codice per non perderlo.')) return;
                    app.local.token = v; app.saveLocal(); location.reload();
                }, { ic: 'lock' })),
                h('div', { class: 'divider' }),
                h('p', { class: 'muted small center', style: { margin: 0 } },
                    app.net.connected ? 'Il portale è aperto' : 'Il portale è chiuso: si riapre da solo appena il server si sveglia', ' · ', h('span', { title: SOCKET_URL }, 'server'), h('br'),
                    'Icone di game-icons.net (CC BY 3.0) · Caratteri Almendra, Cinzel e Alegreya (SIL OFL)')));
    }
}

function weaponLines(spec, el) {
    const s = weaponStats(spec), g = GEMS[spec.gem];
    const row = { display: 'flex', gap: '6px', alignItems: 'center' };
    return h('div', { class: 'd-stats' },
        h('div', {}, `Danno ×${s.dmg.toFixed(2)} · Velocità ×${s.speed.toFixed(2)}`),
        h('div', {}, `Portata +${s.reach.toFixed(1)} m · Contraccolpo ×${s.kb.toFixed(2)}`),
        g?.element ? h('div', { class: 'up', style: row }, elIcon(g.element), `${g.name}: +20% carica del Super`) : null,
        s.plus ? h('div', { class: 'up', style: row, html: iconSVG('sparkles') }, `Incantata +${s.plus}: +${Math.round(s.plus * ENCHANT_STEP.weapon * 100)}% di danni${s.plus >= 5 ? ', lascia una scia' : ''}`) : null,
        s.inf ? h('div', { class: OPPOSITE[el] === s.inf ? 'down' : 'up', style: row }, elIcon(s.inf), `Infusa di ${ELEMENTS[s.inf].name}: ${INFUSE[s.inf]}${OPPOSITE[el] === s.inf ? ' Doppio, perché è l\'opposto del tuo seme, ma ti porta Dissonanza.' : ''}`) : null);
}
