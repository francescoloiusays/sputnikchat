// =====================================================================
//  FINESTRE DEL GIOCO: bisaccia, botteghe, Bazar, Albo, Compagnia...
// =====================================================================
import { h, $, coin, fmt, toast, SOCKET_URL, loadImage } from './util.js';
import {
    ITEMS, SLOTS, SLOT_NAMES, WEAPON_TYPES, MATERIALS, HANDLES, GEMS, ELEMENTS, ECONOMY,
    weaponStats, weaponCost, sanitizeWeaponSpec,
} from './shared/catalog.js';
import { cardEditor } from './creator.js';
import { composeCard, printCard, downloadCard, CARD_W } from './cards.js';
import { icon, iconSVG, elIcon, itemIconName, rarityOf } from './icons.js';

export function itemInfo(e) {
    if (e.kind === 'weapon') {
        const s = e.spec, t = WEAPON_TYPES[s.type];
        return { name: s.name, sub: `${t?.name || 'Arma'} di ${MATERIALS[s.material]?.name || '?'}`, slot: 'weapon', value: weaponCost(s) };
    }
    const it = ITEMS[e.itemId] || { name: '???', slot: 'head', price: 0 };
    return { name: it.name, sub: SLOT_NAMES[it.slot], slot: it.slot, value: it.price, desc: it.desc };
}
const SLOT_ICON = { head: 'head', face: 'face', cape: 'cape', torso: 'torso', weapon: 'weapon' };
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
    slot({ ic, rar = 'com', sel, eq, price, count, title, onclick, empty, tint, label, color }) {
        const el = h('button', { class: `slot r-${rar}${sel ? ' sel' : ''}${empty ? ' empty' : ''}`, title, onclick: empty ? null : onclick, style: color ? { color } : null });
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
        const slotOf = (e) => { const inf = itemInfo(e); return this.slot({ ic: itemIconName(e), rar: rarityOf(inf.value).id, sel: e.uid === sel?.uid, eq: equipped.has(e.uid), title: inf.name, onclick: pick(e) }); };
        const doll = h('div', { class: 'doll' },
            this.studioBox(S => S.setCharacter(me.appearance, this.app.look())),
            SLOTS.map(s => {
                const e = inv.find(x => x.uid === eq[s]);
                return h('div', { class: 'eq ' + s }, h('span', { class: 'eq-label' }, SLOT_NAMES[s]), e ? slotOf(e) : this.slot({ ic: SLOT_ICON[s], empty: true, title: `${SLOT_NAMES[s]}: vuoto` }));
            }));
        let detail;
        if (!sel) detail = h('div', { class: 'detail' }, h('div', { class: 'd-empty' }, 'La bisaccia è vuota. La Sartoria e la Forgia ti aspettano in piazza.'));
        else {
            const inf = itemInfo(sel), r = rarityOf(inf.value), on = equipped.has(sel.uid), scrap = Math.floor(inf.value * ECONOMY.SCRAP_RATE);
            const stats = sel.kind === 'weapon' ? weaponLines(sel.spec) : null;
            detail = h('div', { class: 'detail' },
                h('div', { class: 'd-name r-' + r.id }, inf.name),
                h('div', { class: 'd-type' }, `${SLOT_NAMES[inf.slot]} · ${r.name}`),
                stats, inf.desc ? h('div', { class: 'd-flavor' }, inf.desc) : null,
                h('div', { class: 'btn-row', style: { justifyContent: 'space-between', marginTop: '10px' } },
                    h('span', { class: 'muted small' }, 'Valore ', coin(inf.value)),
                    h('div', { class: 'btn-row' },
                        on ? btn('Togli', () => this.act('equip', { slot: inf.slot, uid: null }))
                            : btn('Indossa', () => this.act('equip', { slot: inf.slot, uid: sel.uid }), { cls: 'btn-primary', ic: inf.slot === 'weapon' ? 'swords' : 'shield' }),
                        on ? null : btn(`Rottama · ${scrap}`, () => { if (confirm(`Rottamare "${inf.name}" per ${scrap} Sputnik Coin?`)) this.act('item:scrap', { uid: sel.uid }); }, { cls: 'btn-danger btn-sm', ic: 'anvil' }))));
        }
        this.set('bag', 'Bisaccia', this.needOnline(),
            h('div', { class: 'split' },
                doll,
                h('div', {},
                    h('div', { class: 'bag-head' }, h('h3', { class: 'sect', style: { margin: 0, flex: 1 }, html: iconSVG('bag') }, `Oggetti (${inv.length})`), this.purse()),
                    inv.length ? h('div', { class: 'slot-grid' }, inv.map(slotOf)) : null,
                    detail)));
    }

    // --- SARTORIA (provi il capo selezionato sul manichino) ---
    p_sartoria() {
        const me = this.app.me;
        const [tab, bar] = this.tabBar('shop', [['head', 'Copricapi', 'head'], ['face', 'Maschere', 'face'], ['cape', 'Mantelli', 'cape'], ['torso', 'Armature', 'torso']]);
        const wares = Object.entries(ITEMS).filter(([, it]) => it.slot === tab);
        const owned = (id) => (me.inventory || []).filter(e => e.itemId === id).length;
        const selId = wares.find(([id]) => id === this.selShop)?.[0] || wares[0][0];
        this.selShop = selId;
        const it = ITEMS[selId], r = rarityOf(it.price);
        this.set('needle', 'Sartoria Spettrale', this.needOnline(),
            h('div', { class: 'split' },
                h('div', {}, this.studioBox(S => S.setCharacter(me.appearance, { ...this.app.look(), [it.slot]: selId })),
                    h('p', { class: 'lore center', style: { marginTop: '10px' } }, '«Guardati pure allo specchio, viandante. Non si paga per sognare.»')),
                h('div', {}, bar,
                    h('div', { class: 'slot-grid' }, wares.map(([id, w]) => this.slot({
                        ic: itemIconName(id), rar: rarityOf(w.price).id, sel: id === selId, price: w.price, count: owned(id), title: w.name,
                        onclick: () => { this.selShop = id; this.app.audio.play('ui'); this.render(); },
                    }))),
                    h('div', { class: 'detail' },
                        h('div', { class: 'd-name r-' + r.id }, it.name),
                        h('div', { class: 'd-type' }, `${SLOT_NAMES[it.slot]} · ${r.name}${owned(selId) ? ` · ne possiedi ${owned(selId)}` : ''}`),
                        h('div', { class: 'd-flavor' }, it.desc),
                        h('div', { class: 'btn-row', style: { justifyContent: 'space-between' } }, coin(it.price),
                            h('div', { class: 'btn-row' }, this.purse(),
                                btn('Compra', async () => {
                                    const res = await this.act('shop:buy', { itemId: selId }, `Hai comprato: ${it.name}`);
                                    if (res.ok) this.act('equip', { slot: it.slot, uid: res.uid }, `Indossi: ${it.name}`);
                                }, { cls: 'btn-primary', ic: 'coins', disabled: me.coins < it.price }))),
                        me.coins < it.price ? h('p', { class: 'muted small', style: { margin: '8px 0 0' } }, 'Ti mancano ', coin(it.price - me.coins), '. Vinci qualche duello nell\'Arena!') : null))));
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
        const parts = [
            sect('swords', "Tipo d'arma"),
            h('div', { class: 'part-row' }, Object.entries(WEAPON_TYPES).filter(([k]) => k !== 'pugni').map(([k, v]) => this.slot({ ic: k, sel: spec.type === k, label: v.name, price: v.cost, title: v.name, onclick: choose('type', k) }))),
            sect('anvil', 'Materiale'),
            h('div', { class: 'part-row' }, Object.entries(MATERIALS).map(([k, v]) => this.slot({ tint: v.color, sel: spec.material === k, label: v.name, price: v.cost || null, title: v.name, onclick: choose('material', k) }))),
            sect('fist', 'Impugnatura'),
            h('div', { class: 'part-row' }, Object.entries(HANDLES).map(([k, v]) => this.slot({ tint: v.color, sel: spec.handle === k, label: v.name.split(' ')[0], price: v.cost || null, title: v.name, onclick: choose('handle', k) }))),
            sect('gem', 'Gemma incastonata'),
            h('div', { class: 'part-row' }, Object.entries(GEMS).map(([k, v]) => this.slot({ ic: v.element ? 'gem' : 'close', color: v.color || '#6a5a40', sel: spec.gem === k, label: v.name, price: v.cost || null, title: v.element ? `${v.name}: legata a ${ELEMENTS[v.element].name}` : 'Nessuna gemma', onclick: choose('gem', k) }))),
            h('label', { class: 'field' }, "Nome dell'arma"),
            h('input', { type: 'text', maxlength: 28, value: spec.name, placeholder: `${WEAPON_TYPES[spec.type].name} di ${MATERIALS[spec.material].name}`, style: { width: '100%' }, oninput: (e) => { spec.name = e.target.value; } }),
            h('div', { class: 'btn-row', style: { marginTop: '16px', justifyContent: 'space-between' } },
                h('span', { class: 'purse' }, 'Costo ', coin(cost)),
                btn('Forgia', async () => {
                    const r = await this.act('forge:craft', { spec: sanitizeWeaponSpec(spec) }, `Il fabbro ti consegna: ${spec.name || WEAPON_TYPES[spec.type].name}`);
                    if (r.ok) { this.app.audio.play('heavy'); this.act('equip', { slot: 'weapon', uid: r.uid }, 'Ora la impugni'); }
                }, { cls: 'btn-primary', ic: 'hammer', disabled: me.coins < cost })),
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
                        const r = rarityOf(weaponCost(e.spec));
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
            const inf = itemInfo(e), r = rarityOf(inf.value);
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
                h('div', { class: 'grow' }, h('div', { class: 'nm' }, elIcon(p.element), p.name), h('div', { class: 'sub' }, `Livello ${p.level} · gloria ${p.rating}${p.sameRoom ? '' : ' · altrove'}${p.duel ? ' · in duello' : ''}`)),
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
                p.cardImage ? h('img', { src: p.cardImage, class: 'big-card', alt: p.name }) : h('div', { class: 'empty' }, 'Nessuna card'),
                h('div', {},
                    h('div', { class: 'nm', style: { fontSize: '28px' } }, p.name, h('span', { class: 'gem-dot' + (p.online ? ' on' : ''), title: p.online ? 'Sull\'isola' : 'Lontano' })),
                    h('div', { class: 'sub', style: { display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '10px' } }, elIcon(p.element), `Elemento: ${el?.name}`),
                    h('div', { class: 'detail' }, stat('Livello', p.level), stat('Gloria', p.rating), stat('Vittorie', p.wins), stat('Sconfitte', p.losses),
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
        cardEditor(fields, { card, appearance: me.appearance, look: app.look(), level: me.level || 1, id: me.id, name: me.name, studio: app.studio, previewHost });
        const hiRes = () => composeCard({ card, appearance: me.appearance, look: app.look(), level: me.level || 1, id: me.id, name: me.name }, app.studio, CARD_W * 2);
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
                        btn('Salva', async () => { await app.saveCard(card); this.cardDraft = null; toast('La tua card è stata rilegata', { kind: 'ok', icon: 'card' }); }, { cls: 'btn-primary', ic: 'save' }),
                        btn('Stampa', async () => { if (!printCard(await hiRes(), card.title)) toast('Il browser ha bloccato la finestra di stampa', { kind: 'bad' }); }, { ic: 'print' }),
                        btn('Scarica', async () => downloadCard(await hiRes(), card.title), { ic: 'download' })),
                    h('div', { class: 'btn-row', style: { marginTop: '10px', flexWrap: 'nowrap' } }, sendSel,
                        btn('Invia', async () => {
                            if (!sendSel.value) return toast('Scegli prima il destinatario', { kind: 'bad' });
                            await app.saveCard(card);
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
                h('img', { src: zoom.image, class: 'big-card', alt: '' }),
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
                mine ? h('figure', {}, h('img', { src: mine, onclick: () => this.open('collezione', { image: mine, title: 'La tua card', name: app.me.name }) }), h('figcaption', {}, 'La tua card')) : null,
                list.map(c => h('figure', {}, h('img', { src: c.image, onclick: () => this.open('collezione', { image: c.image, title: c.title, name: c.name, from: c.from }) }), h('figcaption', {}, `${c.name} · ${new Date(c.at).toLocaleDateString('it-IT')}`)))),
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

function weaponLines(spec) {
    const s = weaponStats(spec), g = GEMS[spec.gem];
    return h('div', { class: 'd-stats' },
        h('div', {}, `Danno ×${s.dmg.toFixed(2)} · Velocità ×${s.speed.toFixed(2)}`),
        h('div', {}, `Portata +${s.reach.toFixed(1)} m · Contraccolpo ×${s.kb.toFixed(2)}`),
        g?.element ? h('div', { class: 'up', style: { display: 'flex', gap: '6px', alignItems: 'center' } }, elIcon(g.element), `${g.name}: +20% carica del Super`) : null);
}
