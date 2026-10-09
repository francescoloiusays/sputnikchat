// =====================================================================
//  CREAZIONE DEL PERSONAGGIO + EDITOR DELLA CARD DEL POTERE
// =====================================================================
import { h, toast, fileToDataURL, loadImage, $ } from './util.js';
import {
    APPEARANCE, APPEARANCE_LABELS, DEFAULT_APPEARANCE, PRESETS, ELEMENTS, CARD_TEXTURES, CARD_ARTS,
    sanitizeAppearance, sanitizeCard, cleanText,
} from './shared/catalog.js';
import { generateTexture, analyzeImage, composeCard, defaultType, CARD_W } from './cards.js';
import { icon, iconSVG, elIcon } from './icons.js';

const SPECIES_ICON = { umano: 'umano', elfo: 'elfo', ratto: 'ratto', scheletro: 'scheletro', spettro: 'spettro' };

const PAL = {
    skin: ['#f3d2b3', '#e8c9a8', '#d9a77c', '#b47a52', '#8a5a3a', '#5a3a24', '#3a2416', '#8a8f96', '#c9d6c0', '#9ab0d6', '#7a5a9a', '#5a8a5a'],
    hair: ['#0e0b09', '#3a2414', '#6b3a1e', '#a0522d', '#d9a441', '#e8e0c8', '#9a9aa0', '#5a1a6e', '#1a3a6e', '#8b1a1a', '#2a6a3a', '#ff7ac0'],
    eye: ['#3b6ea5', '#5a3b1e', '#2a7a3a', '#7a7a8a', '#b8401e', '#9a4aff', '#ffcc33', '#2ae0ff', '#ff2a3a', '#1a1a1a'],
    cloth: ['#5a2a6e', '#3d1466', '#1d2a6b', '#2f4a24', '#7a1018', '#1a1a1f', '#4a3424', '#8a6a3a', '#2b2633', '#6b6f75', '#c9c0b0', '#0e3a3a'],
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function chipGroup(label, options, labels, value, onPick, icons) {
    const chips = options.map(o => h('button', { class: 'chip' + (o === value ? ' sel' : ''), html: icons?.[o] ? iconSVG(icons[o]) : null, onclick: (e) => {
        chips.forEach(c => c.classList.remove('sel'));
        e.currentTarget.classList.add('sel');
        onPick(o);
    } }, labels?.[o] ?? o));
    return h('div', { class: 'opt-group' }, h('div', { class: 'opt-label' }, label), h('div', { class: 'chips' }, chips));
}
function swatchGroup(label, palette, value, onPick) {
    const sw = palette.map(c => h('button', { class: 'swatch' + (c === value ? ' sel' : ''), style: { background: c }, title: c, onclick: (e) => {
        sw.forEach(s => s.classList.remove('sel'));
        e.currentTarget.classList.add('sel');
        custom.value = c; onPick(c);
    } }));
    const custom = h('input', { type: 'color', class: 'swatch-custom', value, title: 'Colore personalizzato', oninput: (e) => { sw.forEach(s => s.classList.remove('sel')); onPick(e.target.value); } });
    return h('div', { class: 'opt-group' }, h('div', { class: 'opt-label' }, label), h('div', { class: 'swatches' }, sw, custom));
}

// --- EDITOR DELL'ASPETTO ---
export function appearanceEditor(container, state, onChange) {
    const render = () => {
        const a = state.appearance;
        const L = APPEARANCE_LABELS;
        const skinLabel = { ratto: 'Pelliccia', scheletro: 'Ossa', spettro: 'Ectoplasma' }[a.species] || 'Carnagione';
        const set = (k) => (v) => { a[k] = v; onChange(); if (k === 'species') render(); };
        container.replaceChildren(...[
            h('label', { class: 'field' }, 'Il tuo nome'),
            h('input', { type: 'text', maxlength: 16, value: state.name || '', placeholder: "Come ti chiameranno sull'isola?", style: { width: '100%' }, oninput: (e) => { state.name = e.target.value; onChange('name'); } }),
            h('div', { class: 'opt-group' },
                h('div', { class: 'opt-label' }, 'Parti da un volto noto', h('button', { class: 'btn btn-sm', html: iconSVG('dice'), onclick: () => { state.appearance = randomAppearance(); onChange(); render(); } }, 'A caso')),
                h('div', { class: 'preset-row' }, [['ratto', 'Ratto', 'img/propic_rat.jpg'], ['alessandro', 'Alessandro', 'img/propic_alessandro.jpg'], ['francesco', 'Francesco', 'img/propic_francesco.jpg']].map(([id, nm, img]) =>
                    h('button', { class: 'preset', onclick: () => { state.appearance = { ...PRESETS[id] }; onChange(); render(); } }, h('img', { src: img, alt: '' }), nm)))),
            chipGroup('Stirpe', APPEARANCE.species, L.species, a.species, set('species'), SPECIES_ICON),
            chipGroup('Corporatura', APPEARANCE.build, L.build, a.build, set('build')),
            h('div', { class: 'opt-group' }, h('div', { class: 'opt-label' }, 'Altezza'),
                h('input', { type: 'range', class: 'range', min: 0.85, max: 1.15, step: 0.01, value: a.height, oninput: (e) => { a.height = +e.target.value; onChange(); } })),
            swatchGroup(skinLabel, PAL.skin, a.skin, set('skin')),
            chipGroup('Occhi', APPEARANCE.eyes, L.eyes, a.eyes, set('eyes')),
            swatchGroup('Colore degli occhi', PAL.eye, a.eyeColor, set('eyeColor')),
            a.species === 'scheletro' ? null : chipGroup('Bocca', APPEARANCE.mouth, L.mouth, a.mouth, set('mouth')),
            a.species === 'scheletro' ? null : chipGroup('Capelli', APPEARANCE.hair, L.hair, a.hair, set('hair')),
            swatchGroup('Colore di capelli e barba', PAL.hair, a.hairColor, set('hairColor')),
            ['umano', 'elfo'].includes(a.species) ? chipGroup('Barba', APPEARANCE.beard, L.beard, a.beard, set('beard')) : null,
            chipGroup('Abito', APPEARANCE.topStyle, L.topStyle, a.topStyle, set('topStyle')),
            swatchGroup('Colore abito', PAL.cloth, a.top, set('top')),
            swatchGroup('Pantaloni', PAL.cloth, a.bottom, set('bottom')),
            swatchGroup('Scarpe', PAL.cloth, a.shoes, set('shoes')),
            h('p', { class: 'lore', style: { marginTop: '18px' } }, 'Cappelli, mantelli e armature li troverai alla Sartoria; le armi te le forgia il fabbro in piazza.'),
        ].filter(Boolean));
    };
    render();
    return { render };
}

export function randomAppearance() {
    const a = {};
    for (const [k, v] of Object.entries(APPEARANCE)) a[k] = pick(v);
    a.height = 0.88 + Math.random() * 0.24;
    a.skin = pick(PAL.skin); a.eyeColor = pick(PAL.eye); a.hairColor = pick(PAL.hair);
    a.top = pick(PAL.cloth); a.bottom = pick(PAL.cloth); a.shoes = pick(PAL.cloth);
    if (a.species === 'scheletro') a.skin = '#e9e2cf';
    return sanitizeAppearance(a);
}

// --- EDITOR DELLA CARD ---
export function cardEditor(container, ctx) {
    const card = ctx.card;
    let typeAuto = !card.type || card.type === defaultType(ctx.appearance, card.element);
    const preview = h('canvas', { class: 'card-preview', width: CARD_W, height: 880 });
    let busy = false, again = false, typeInput = null;
    const refresh = async () => {
        if (busy) { again = true; return; }
        busy = true;
        try {
            if (typeAuto) { card.type = defaultType(ctx.appearance, card.element); if (typeInput) { typeInput.value = ""; typeInput.placeholder = card.type; } }
            const c = await composeCard({ ...ctx, card }, ctx.studio, CARD_W);
            preview.getContext('2d').clearRect(0, 0, preview.width, preview.height);
            preview.getContext('2d').drawImage(c, 0, 0);
        } catch (e) { console.warn(e); }
        busy = false;
        if (again) { again = false; refresh(); }
        ctx.onChange?.(card);
    };
    const elBox = h('div', { class: 'element-box' });
    const renderElement = (extra) => {
        const el = ELEMENTS[card.element];
        elBox.replaceChildren(
            h('div', { class: 'element-icon' }, elIcon(card.element)),
            h('div', {},
                h('b', { style: { color: el.color } }, `Elemento: ${el.name}`),
                extra ? h('p', {}, extra) : null,
                h('p', {}, h('b', { style: { fontSize: '16px', color: 'var(--gold-hi)' } }, `${el.special.name}: `), el.special.desc),
                h('p', {}, h('b', { style: { fontSize: '16px', color: 'var(--gold-hi)' } }, `${el.passive.name}: `), el.passive.desc)));
    };
    const texTiles = [];
    const selectTile = (tile) => { texTiles.forEach(t => t.classList.remove('sel')); tile?.classList.add('sel'); };
    const texInput = h('input', { type: 'file', accept: 'image/*', class: 'hidden', onchange: async (e) => {
        const f = e.target.files[0]; if (!f) return;
        try {
            const data = await fileToDataURL(f, 600, 840, 0.8);
            const img = await loadImage(data);
            const res = analyzeImage(img);
            card.texture = 'custom'; card.textureData = data; card.element = res.element;
            uploadTile.style.backgroundImage = `url(${data})`;
            selectTile(uploadTile);
            renderElement(h('span', {}, 'Colore dominante della tua immagine: ', h('span', { style: { display: 'inline-block', width: '14px', height: '14px', borderRadius: '3px', verticalAlign: 'middle', background: `hsl(${res.hue},${Math.round(res.sat * 100)}%,${Math.round(Math.max(0.3, res.light) * 100)}%)` } }), ` → ${ELEMENTS[res.element].name}`));
            refresh();
        } catch { toast('Immagine non valida', { kind: 'bad' }); }
        e.target.value = '';
    } });
    const uploadTile = h('div', { class: 'tex-opt upload' + (card.texture === 'custom' ? ' sel' : ''), title: 'Carica una tua texture', onclick: () => texInput.click(),
        style: card.textureData ? { backgroundImage: `url(${card.textureData})` } : {}, html: iconSVG('portrait') }, h('span', {}, 'La tua immagine'));
    for (const t of CARD_TEXTURES) {
        const bg = t.file || generateTexture(t.id, 120, 168).toDataURL('image/jpeg', 0.7);
        const tile = h('div', { class: 'tex-opt' + (card.texture === t.id ? ' sel' : ''), style: { backgroundImage: `url(${bg})` }, title: `${t.name} → ${ELEMENTS[t.element].name}`, onclick: () => {
            card.texture = t.id; card.textureData = null; card.element = t.element;
            selectTile(tile); renderElement(); refresh();
        } }, h('span', {}, icon(t.element, 'el', `color:${ELEMENTS[t.element].color}`), t.name));
        texTiles.push(tile);
    }
    texTiles.push(uploadTile);
    const artInput = h('input', { type: 'file', accept: 'image/*', class: 'hidden', onchange: async (e) => {
        const f = e.target.files[0]; if (!f) return;
        try { card.artData = await fileToDataURL(f, 600, 460, 0.82); card.art = 'custom'; refresh(); renderArt(); }
        catch { toast('Immagine non valida', { kind: 'bad' }); }
        e.target.value = '';
    } });
    const artBox = h('div', {});
    const renderArt = () => artBox.replaceChildren(chipGroup('Illustrazione', [...CARD_ARTS.map(a => a.id), 'custom'],
        { ...Object.fromEntries(CARD_ARTS.map(a => [a.id, a.name])), custom: 'Carica la tua' }, card.art,
        (v) => { if (v === 'custom') { if (card.artData) { card.art = 'custom'; refresh(); } artInput.click(); } else { card.art = v; refresh(); } }));
    renderArt();
    renderElement(card.texture === 'custom' ? 'Elemento ricavato dal colore dominante della tua texture.' : null);
    if (ctx.previewHost) ctx.previewHost.replaceChildren(preview);
    container.replaceChildren(h('div', { class: 'card-editor' },
        ctx.previewHost ? null : h('div', { class: 'card-preview-wrap' }, preview),
        h('label', { class: 'field' }, 'Nome sulla card'),
        h('input', { type: 'text', maxlength: 24, value: card.title, oninput: (e) => { card.title = e.target.value; refresh(); } }),
        h('label', { class: 'field' }, 'Tipo'),
        typeInput = h('input', { type: 'text', maxlength: 40, value: typeAuto ? '' : card.type, placeholder: card.type, oninput: (e) => { card.type = e.target.value; typeAuto = !e.target.value; refresh(); } }),
        h('label', { class: 'field' }, 'Motto (facoltativo)'),
        h('textarea', { maxlength: 140, placeholder: 'Una frase che ti rappresenta...', oninput: (e) => { card.flavor = e.target.value; refresh(); } }, card.flavor || ''),
        h('div', { class: 'opt-group' }, h('div', { class: 'opt-label' }, 'Texture: decide elemento e poteri'), h('div', { class: 'tex-grid' }, texTiles)),
        texInput, artInput,
        elBox,
        artBox,
    ));
    refresh();
    return { refresh, preview };
}

// --- FLUSSO DI CREAZIONE (overlay a schermo intero) ---
export class Creator {
    constructor(studio) {
        this.studio = studio;
        this.root = $('#creator');
        this.body = $('#creator-body');
        this.btnNext = $('#creator-next');
        this.btnBack = $('#creator-back');
    }
    open(opts) {
        return new Promise((resolve) => {
            const mode = opts.mode || 'new';
            const state = {
                name: opts.name || '',
                appearance: sanitizeAppearance(opts.appearance || randomAppearance()),
                card: sanitizeCard(opts.card || {}),
            };
            if (!opts.card) { state.card.title = state.name || 'Viandante'; state.card.type = ''; }
            const look = opts.look || {};
            this.root.classList.remove('hidden');
            this.studio.setCharacter(state.appearance, look);
            this.studio.yaw = 0.35;
            this.studio.mount($('#creator-preview'), 'full');
            let step = 0;
            let cardEd = null;
            const steps = [...this.root.querySelectorAll('.step')];
            $('.creator-steps', this.root).classList.toggle('hidden', mode !== 'new');
            let rebuildTimer = null;
            const onChange = (what) => {
                if (what === 'name') return;
                clearTimeout(rebuildTimer);
                rebuildTimer = setTimeout(() => this.studio.setCharacter(state.appearance, look), 60);
            };
            const show = () => {
                steps.forEach((s, i) => s.classList.toggle('active', i === step));
                this.body.scrollTop = 0;
                if (step === 0) {
                    appearanceEditor(this.body, state, onChange);
                    this.btnBack.textContent = mode === 'new' ? 'Indietro' : 'Annulla';
                    this.btnBack.disabled = mode === 'new' && !opts.cancelable;
                    this.btnNext.textContent = mode === 'new' ? 'Avanti' : 'Salva';
                } else {
                    if (!state.card.title || state.card.title === 'Viandante') state.card.title = cleanText(state.name, 24) || 'Viandante';
                    cardEd = cardEditor(this.body, { card: state.card, appearance: state.appearance, look, level: 1, id: opts.id, name: state.name, studio: this.studio });
                    this.btnBack.disabled = false;
                    this.btnBack.textContent = 'Indietro';
                    this.btnNext.textContent = "Entra nell'Isola";
                }
            };
            const finish = async (result) => {
                this.btnNext.onclick = this.btnBack.onclick = null;
                this.studio.unmount();
                this.root.classList.add('hidden');
                resolve(result);
            };
            this.btnBack.onclick = () => {
                if (step === 1) { step = 0; show(); }
                else if (mode !== 'new' || opts.cancelable) finish(null);
            };
            this.btnNext.onclick = async () => {
                const name = cleanText(state.name, 16);
                if (name.length < 2) { toast('Scegli un nome di almeno 2 lettere', { kind: 'bad' }); return; }
                state.name = name;
                if (mode === 'new' && step === 0) { step = 1; show(); return; }
                this.btnNext.disabled = true;
                const card = sanitizeCard(state.card);
                let cardImage = null;
                if (mode === 'new') {
                    const c = await composeCard({ card, appearance: state.appearance, look, level: 1, id: opts.id, name }, this.studio, 420);
                    cardImage = c.toDataURL('image/jpeg', 0.86);
                }
                this.btnNext.disabled = false;
                finish({ name, appearance: sanitizeAppearance(state.appearance), card, cardImage });
            };
            show();
        });
    }
}
