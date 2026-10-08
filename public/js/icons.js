// =====================================================================
//  ICONE DEL GIOCO (game-icons.net, CC BY 3.0) e piccoli aiuti grafici
// =====================================================================
import { ICON_PATHS } from './icon-paths.js';
import { ITEMS, WEAPON_TYPES, ELEMENTS } from './shared/catalog.js';

export function iconSVG(name, cls = '', style = '') {
    const d = ICON_PATHS[name] || ICON_PATHS.rune;
    return `<svg class="gi ${cls}" viewBox="0 0 512 512" aria-hidden="true"${style ? ` style="${style}"` : ''}><path fill="currentColor" d="${d}"/></svg>`;
}
export function icon(name, cls = '', style = '') {
    const t = document.createElement('template');
    t.innerHTML = iconSVG(name, cls, style);
    return t.content.firstChild;
}
const p2d = new Map();
export function iconPath2D(name) {
    if (!p2d.has(name)) p2d.set(name, new Path2D(ICON_PATHS[name] || ICON_PATHS.rune));
    return p2d.get(name);
}
// Disegna un'icona su canvas (cx, cy = centro, size = lato)
export function drawIcon(g, name, cx, cy, size, color) {
    g.save();
    g.translate(cx - size / 2, cy - size / 2);
    g.scale(size / 512, size / 512);
    g.fillStyle = color;
    g.fill(iconPath2D(name));
    g.restore();
}

// Simbolo colorato di un elemento
export const elIcon = (el, cls = '') => icon(el in ELEMENTS ? el : 'fango', 'el ' + cls, `color:${ELEMENTS[el]?.color || '#c9a24a'}`);

// Icona di un oggetto dell'inventario / del negozio
export function itemIconName(e) {
    if (!e) return 'rune';
    if (e.kind === 'weapon' || e.type) return (e.spec || e).type || 'spada';
    const id = e.itemId || e;
    if (ICON_PATHS[id]) return id;
    if (String(id).startsWith('mantello')) return id === 'mantello_regale' ? 'mantello_regale' : 'mantello';
    return ITEMS[id]?.slot || 'rune';
}
export const weaponIconName = (type) => (WEAPON_TYPES[type] ? type : 'spada');

// Rarità in base al valore (colori alla Diablo)
export function rarityOf(value) {
    if (value > 220) return { id: 'leg', name: 'Leggendario' };
    if (value > 120) return { id: 'epi', name: 'Epico' };
    if (value > 50) return { id: 'rar', name: 'Raro' };
    return { id: 'com', name: 'Comune' };
}

// Sostituisce gli elementi con data-icon="nome" con l'icona SVG
export function hydrateIcons(root = document) {
    root.querySelectorAll('[data-icon]').forEach(el => {
        if (el.querySelector('svg.gi')) return;
        el.insertAdjacentHTML('afterbegin', iconSVG(el.dataset.icon));
    });
}

// Ornamenti dell'interfaccia: filigrane d'oro agli angoli, rombo dei separatori, grana della carta
export function installTheme() {
    const enc = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    const corner = `<g fill='none' stroke='#d9b35c' stroke-linecap='round' stroke-linejoin='round'>`
        + `<path stroke-width='2.4' d='M4 68V16Q4 4 16 4h52'/>`
        + `<path stroke-width='1' opacity='.55' d='M10 68V20q0-10 10-10h48'/>`
        + `<path stroke-width='1.7' d='M16 44c-3-15 7-27 22-28'/>`
        + `<path stroke-width='1.5' d='M38 16c-8 1-11 7-9 12 2 5 9 4 9-1 0-3-3-5-6-3'/>`
        + `<path stroke-width='1.5' d='M16 44c4-1 6 2 4 5'/>`
        + `<path stroke-width='1.2' opacity='.8' d='M48 8c3 3 3 7 0 9M8 48c3 3 7 3 9 0'/>`
        + `</g><path fill='#f4d98a' d='M4 4h12L4 16z'/><path fill='#e8c56a' d='M22 22l4-6 4 6-4 6z'/>`;
    const svg = (tf) => `<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72'><g transform='${tf}'>${corner}</g></svg>`;
    const root = document.documentElement.style;
    root.setProperty('--c-tl', enc(svg('')));
    root.setProperty('--c-tr', enc(svg('translate(72 0) scale(-1 1)')));
    root.setProperty('--c-bl', enc(svg('translate(0 72) scale(1 -1)')));
    root.setProperty('--c-br', enc(svg('translate(72 72) scale(-1 -1)')));
    root.setProperty('--diamond', enc(`<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M6 0l6 6-6 6-6-6z' fill='#e8c56a'/><path d='M6 3l3 3-3 3-3-3z' fill='#7a5a20'/></svg>`));
    root.setProperty('--grain', enc(`<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .22 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`));
    hydrateIcons(document);
}
