// =====================================================================
//  CARD DEL POTERE (stile Magic / Yu-Gi-Oh)
//  La texture scelta decide l'elemento → statistiche e super potere.
// =====================================================================
import { ELEMENTS, CARD_TEXTURES, CARD_ARTS, APPEARANCE_LABELS, elementFromHSL, cardPower, weaponStats, SEALS, gradeOf } from './shared/catalog.js';
import { loadImage } from './util.js';
import { drawIcon } from './icons.js';

export const CARD_W = 630, CARD_H = 880;

function srand(seed) {
    return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// --- TEXTURE PROCEDURALI DEGLI ELEMENTI ---
const genCache = new Map();
export function generateTexture(id, W = 600, H = 840) {
    const key = id + W;
    if (genCache.has(key)) return genCache.get(key);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const r = srand(id.length * 977 + id.charCodeAt(0) * 31);
    const blob = (x, y, rad, col, a = 1) => {
        const gr = g.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); g.globalAlpha = 1;
    };
    const walk = (x, y, steps, len, col, w, glow) => {
        g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
        g.shadowColor = glow || 'transparent'; g.shadowBlur = glow ? 14 : 0;
        g.beginPath(); g.moveTo(x, y);
        let a = r() * Math.PI * 2;
        for (let i = 0; i < steps; i++) { a += (r() - 0.5) * 1.2; x += Math.cos(a) * len; y += Math.sin(a) * len; g.lineTo(x, y); }
        g.stroke(); g.shadowBlur = 0;
    };
    switch (id) {
        case 'lava':
            g.fillStyle = '#1a0503'; g.fillRect(0, 0, W, H);
            for (let i = 0; i < 70; i++) blob(r() * W, r() * H, 40 + r() * 120, ['#5a0d04', '#3a0802', '#7a1a04'][i % 3], 0.8);
            for (let i = 0; i < 46; i++) walk(r() * W, r() * H, 8 + r() * 14, 10 + r() * 14, i % 4 ? '#ff6a10' : '#ffd27a', 1.5 + r() * 3.5, '#ff4a00');
            for (let i = 0; i < 40; i++) blob(r() * W, r() * H, 6 + r() * 16, '#ffcf6a', 0.7);
            break;
        case 'brina': {
            const gr = g.createLinearGradient(0, 0, W * 0.3, H);
            gr.addColorStop(0, '#d8f2ff'); gr.addColorStop(0.45, '#5aa0d8'); gr.addColorStop(1, '#0b2a4a');
            g.fillStyle = gr; g.fillRect(0, 0, W, H);
            for (let i = 0; i < 90; i++) {
                g.beginPath();
                const x = r() * W, y = r() * H;
                g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 220, y + (r() - 0.5) * 220); g.lineTo(x + (r() - 0.5) * 220, y + (r() - 0.5) * 220); g.closePath();
                g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.09})`; g.fill();
                g.strokeStyle = `rgba(255,255,255,${0.15 + r() * 0.25})`; g.lineWidth = 1; g.stroke();
            }
            for (let i = 0; i < 60; i++) blob(r() * W, r() * H, 3 + r() * 8, '#ffffff', 0.9);
            break;
        }
        case 'nebbia':
            g.fillStyle = '#12051f'; g.fillRect(0, 0, W, H);
            for (let i = 0; i < 90; i++) blob(r() * W, r() * H, 50 + r() * 160, ['#4a1a7a', '#2a1a6a', '#6a2a9a', '#1a2a5a'][i % 4], 0.45);
            for (let i = 0; i < 26; i++) {
                g.strokeStyle = `rgba(210,170,255,${0.08 + r() * 0.12})`; g.lineWidth = 2 + r() * 6;
                g.beginPath(); g.arc(r() * W, r() * H, 40 + r() * 200, r() * 6, r() * 6 + 1.5 + r() * 2); g.stroke();
            }
            for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`; g.fillRect(r() * W, r() * H, 1.5, 1.5); }
            break;
        case 'muschio':
            g.fillStyle = '#0c1f0b'; g.fillRect(0, 0, W, H);
            for (let i = 0; i < 140; i++) blob(r() * W, r() * H, 20 + r() * 80, ['#2e5a22', '#4a7a2a', '#1a3a14', '#3a6a3a'][i % 4], 0.7);
            for (let i = 0; i < 26; i++) walk(r() * W, r() * H, 14, 14, 'rgba(60,40,20,0.8)', 2 + r() * 4);
            for (let i = 0; i < 120; i++) blob(r() * W, r() * H, 2 + r() * 4, '#c8ff6a', 0.6);
            break;
        case 'fulmine': {
            const gr = g.createLinearGradient(0, 0, 0, H);
            gr.addColorStop(0, '#2a2050'); gr.addColorStop(1, '#0a0a24');
            g.fillStyle = gr; g.fillRect(0, 0, W, H);
            for (let i = 0; i < 50; i++) blob(r() * W, r() * H * 0.6, 60 + r() * 120, '#4a4a6a', 0.4);
            for (let b = 0; b < 7; b++) {
                let x = r() * W, y = -10;
                g.strokeStyle = '#fff6a0'; g.lineWidth = 2 + r() * 3; g.shadowColor = '#ffe14a'; g.shadowBlur = 18;
                g.beginPath(); g.moveTo(x, y);
                while (y < H) {
                    x += (r() - 0.5) * 70; y += 20 + r() * 40; g.lineTo(x, y);
                    if (r() < 0.15) { g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 120, y + 60); g.moveTo(x, y); }
                }
                g.stroke(); g.shadowBlur = 0;
            }
            break;
        }
        case 'mura': {
            g.fillStyle = '#1e1c1a'; g.fillRect(0, 0, W, H);
            const bh = 52;
            for (let y = 0, row = 0; y < H; y += bh, row++) {
                for (let x = -(row % 2) * 55; x < W;) {
                    const w = 90 + r() * 40;
                    const v = 70 + r() * 40;
                    g.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
                    g.fillRect(x + 3, y + 3, w - 6, bh - 6);
                    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 3, y + bh - 10, w - 6, 7);
                    x += w;
                }
            }
            for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.12})`; g.fillRect(r() * W, r() * H, 2, 2); }
            for (let i = 0; i < 26; i++) blob(r() * W, r() * H, 20 + r() * 50, '#3a5a2a', 0.45);
            break;
        }
        case 'melma':
            g.fillStyle = '#3a2410'; g.fillRect(0, 0, W, H);
            for (let i = 0; i < 120; i++) blob(r() * W, r() * H, 25 + r() * 90, ['#5a3a1a', '#2a1808', '#6e4a22', '#4a2e12'][i % 4], 0.75);
            for (let i = 0; i < 70; i++) {
                const x = r() * W, y = r() * H, rad = 3 + r() * 14;
                g.strokeStyle = 'rgba(255,220,160,0.35)'; g.lineWidth = 1.5;
                g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.stroke();
                g.fillStyle = 'rgba(255,240,210,0.4)'; g.beginPath(); g.arc(x - rad * 0.35, y - rad * 0.35, rad * 0.25, 0, Math.PI * 2); g.fill();
            }
            break;
        default:
            g.fillStyle = '#222'; g.fillRect(0, 0, W, H);
    }
    genCache.set(key, c);
    return c;
}

const imgCache = new Map();
async function cachedImage(src) {
    const key = src.length > 200 ? src.length + ':' + src.slice(-120) : src;
    if (!imgCache.has(key)) imgCache.set(key, loadImage(src));
    return imgCache.get(key);
}
export async function textureImage(card) {
    if (card.texture === 'custom' && card.textureData) return cachedImage(card.textureData);
    const preset = CARD_TEXTURES.find(t => t.id === card.texture) || CARD_TEXTURES[0];
    if (preset.file) return cachedImage(preset.file);
    return generateTexture(preset.id);
}

// Colore dominante → elemento
export function analyzeImage(img) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, 64, 64);
    const d = g.getImageData(0, 0, 64, 64).data;
    const bins = new Float32Array(36);
    let sS = 0, sL = 0, sR = 0, sG = 0, sB = 0;
    const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
        const R = d[i] / 255, G = d[i + 1] / 255, B = d[i + 2] / 255;
        const mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = (mx + mn) / 2, dd = mx - mn;
        let h = 0, s = 0;
        if (dd > 1e-4) {
            s = dd / (1 - Math.abs(2 * l - 1));
            h = mx === R ? ((G - B) / dd) % 6 : mx === G ? (B - R) / dd + 2 : (R - G) / dd + 4;
            h = (h * 60 + 360) % 360;
        }
        bins[Math.floor(h / 10) % 36] += s * (1 - Math.abs(2 * l - 1)) + 0.0001;
        sS += s; sL += l; sR += R; sG += G; sB += B;
    }
    let best = 0;
    for (let i = 0; i < 36; i++) {
        const v = bins[i] + 0.5 * (bins[(i + 35) % 36] + bins[(i + 1) % 36]);
        const bv = bins[best] + 0.5 * (bins[(best + 35) % 36] + bins[(best + 1) % 36]);
        if (v > bv) best = i;
    }
    const hue = best * 10 + 5, sat = sS / n, light = sL / n;
    const avg = `rgb(${Math.round(sR / n * 255)},${Math.round(sG / n * 255)},${Math.round(sB / n * 255)})`;
    return { element: elementFromHSL(hue, sat, light), hue, sat, light, avg };
}

// --- DISEGNO DELLA CARD ---
function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function cover(g, img, x, y, w, h, contain = false, anchorBottom = false) {
    const iw = img.width, ih = img.height;
    const k = contain ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
    const dw = iw * k, dh = ih * k;
    g.drawImage(img, x + (w - dw) / 2, anchorBottom ? y + h - dh : y + (h - dh) / 2, dw, dh);
}
function wrap(g, text, x, y, maxW, lh, maxLines = 99) {
    const words = String(text || '').split(' ');
    let line = '', lines = 0;
    for (let i = 0; i < words.length; i++) {
        const test = line ? line + ' ' + words[i] : words[i];
        if (g.measureText(test).width > maxW && line) {
            if (++lines >= maxLines) { g.fillText(line + '…', x, y); return y + lh; }
            g.fillText(line, x, y); line = words[i]; y += lh;
        } else line = test;
    }
    if (line) { g.fillText(line, x, y); y += lh; }
    return y;
}
function star(g, cx, cy, r) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r;
        g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    g.closePath();
}
function bar(g, x, y, w, h, k, gold = '#c99a2e') {
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, 'rgba(48,32,20,0.92)'); gr.addColorStop(1, 'rgba(20,12,8,0.92)');
    rr(g, x, y, w, h, 12 * k); g.fillStyle = gr; g.fill();
    g.lineWidth = 3 * k; g.strokeStyle = gold; g.stroke();
    rr(g, x + 4 * k, y + 4 * k, w - 8 * k, h - 8 * k, 9 * k); g.lineWidth = 1 * k; g.strokeStyle = 'rgba(255,230,160,0.25)'; g.stroke();
}
export const rarity = (lvl) => lvl >= 10 ? { name: 'Leggendaria', color: '#ffb000' } : lvl >= 7 ? { name: 'Epica', color: '#b37aff' } : lvl >= 4 ? { name: 'Rara', color: '#4aa8ff' } : { name: 'Comune', color: '#d0d0d0' };

export function drawCard(g, W, H, info) {
    const k = W / CARD_W;
    const el = ELEMENTS[info.element] || ELEMENTS.fango;
    g.save();
    g.clearRect(0, 0, W, H);
    rr(g, 0, 0, W, H, 30 * k); g.fillStyle = '#060408'; g.fill();
    // cornice con la texture scelta
    g.save();
    rr(g, 18 * k, 18 * k, W - 36 * k, H - 36 * k, 20 * k); g.clip();
    if (info.tex) cover(g, info.tex, 18 * k, 18 * k, W - 36 * k, H - 36 * k);
    const vg = g.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, H * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    g.restore();
    rr(g, 18 * k, 18 * k, W - 36 * k, H - 36 * k, 20 * k); g.lineWidth = 3 * k; g.strokeStyle = el.glow; g.globalAlpha = 0.6; g.stroke(); g.globalAlpha = 1;

    // titolo
    bar(g, 40 * k, 38 * k, W - 80 * k, 64 * k, k);
    let fs = 40;
    g.font = `700 ${fs * k}px Almendra, Georgia, serif`;
    while (g.measureText(info.title).width > W - 210 * k && fs > 20) { fs -= 2; g.font = `700 ${fs * k}px Almendra, Georgia, serif`; }
    g.fillStyle = '#ffff00'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.shadowColor = '#000'; g.shadowBlur = 6 * k; g.shadowOffsetY = 2 * k;
    g.fillText(info.title, 60 * k, 72 * k);
    g.shadowBlur = 0; g.shadowOffsetY = 0;
    // sfera dell'elemento (come il costo di mana)
    const ox = W - 76 * k, oy = 70 * k, orr = 22 * k;
    const og = g.createRadialGradient(ox - 6 * k, oy - 6 * k, 2 * k, ox, oy, orr);
    og.addColorStop(0, el.glow); og.addColorStop(0.6, el.color); og.addColorStop(1, el.dark);
    g.beginPath(); g.arc(ox, oy, orr, 0, Math.PI * 2); g.fillStyle = og; g.fill();
    g.lineWidth = 2 * k; g.strokeStyle = '#000'; g.stroke();
    drawIcon(g, info.element, ox, oy, 28 * k, "#140a04");
    g.textAlign = "center";
    // stelle di livello (stile Yu-Gi-Oh)
    for (let i = 0; i < Math.min(12, info.level); i++) {
        star(g, W - 62 * k - i * 24 * k, 122 * k, 10 * k);
        const sg = g.createRadialGradient(W - 62 * k - i * 24 * k, 118 * k, 1, W - 62 * k - i * 24 * k, 122 * k, 11 * k);
        sg.addColorStop(0, '#fff6c0'); sg.addColorStop(1, '#d08a10');
        g.fillStyle = sg; g.fill(); g.lineWidth = 1.5 * k; g.strokeStyle = '#3a1a00'; g.stroke();
    }
    // illustrazione
    const ax = 52 * k, ay = 140 * k, aw = W - 104 * k, ah = 400 * k;
    g.save();
    rr(g, ax, ay, aw, ah, 6 * k); g.clip();
    const bg = g.createRadialGradient(ax + aw / 2, ay + ah * 0.4, 10 * k, ax + aw / 2, ay + ah / 2, ah * 0.8);
    bg.addColorStop(0, el.color); bg.addColorStop(0.45, el.dark); bg.addColorStop(1, '#000');
    g.fillStyle = bg; g.fillRect(ax, ay, aw, ah);
    g.globalAlpha = 0.18;
    for (let i = 0; i < 9; i++) {
        g.beginPath(); g.moveTo(ax + aw / 2, ay + ah * 0.35);
        const a = -Math.PI / 2 + (i - 4) * 0.32;
        g.lineTo(ax + aw / 2 + Math.cos(a - 0.06) * ah, ay + ah * 0.35 + Math.sin(a - 0.06) * ah);
        g.lineTo(ax + aw / 2 + Math.cos(a + 0.06) * ah, ay + ah * 0.35 + Math.sin(a + 0.06) * ah);
        g.fillStyle = el.glow; g.fill();
    }
    g.globalAlpha = 1;
    if (info.art) {
        if (info.artIsPortrait) cover(g, info.art, ax - aw * 0.05, ay + 10 * k, aw * 1.1, ah - 10 * k, true, true);
        else cover(g, info.art, ax, ay, aw, ah);
    }
    g.restore();
    rr(g, ax, ay, aw, ah, 6 * k); g.lineWidth = 6 * k; g.strokeStyle = '#140c06'; g.stroke();
    g.lineWidth = 2 * k; g.strokeStyle = '#c99a2e'; g.stroke();

    // riga del tipo + rarità
    bar(g, 40 * k, 552 * k, W - 80 * k, 46 * k, k);
    g.font = `700 ${23 * k}px Almendra, Georgia, serif`; g.textAlign = 'left'; g.fillStyle = '#f2e6c8';
    let type = info.type;
    while (g.measureText(type).width > W - 160 * k && type.length > 4) type = type.slice(0, -2);
    g.fillText(type, 58 * k, 576 * k);
    const rar = rarity(info.level);
    g.save(); g.translate(W - 70 * k, 575 * k); g.rotate(Math.PI / 4);
    g.fillStyle = rar.color; g.fillRect(-9 * k, -9 * k, 18 * k, 18 * k); g.lineWidth = 2 * k; g.strokeStyle = '#000'; g.strokeRect(-9 * k, -9 * k, 18 * k, 18 * k);
    g.restore();

    // riquadro testo (pergamena)
    const tx = 52 * k, ty = 606 * k, tw = W - 104 * k, th = 196 * k;
    const pg = g.createLinearGradient(0, ty, 0, ty + th);
    pg.addColorStop(0, '#efe5cd'); pg.addColorStop(1, '#d8c7a2');
    rr(g, tx, ty, tw, th, 8 * k); g.fillStyle = pg; g.fill();
    g.lineWidth = 3 * k; g.strokeStyle = '#3a2412'; g.stroke();
    const px = tx + 14 * k, pw = tw - 28 * k;
    let y = ty + 28 * k;
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#2a1206'; g.font = `bold ${20 * k}px Alegreya, Georgia, serif`;
    g.fillText(`✦ ${el.special.name}`, px, y);
    g.font = `bold ${14 * k}px Alegreya, Georgia, serif`; g.textAlign = 'right'; g.fillStyle = '#7a3a10';
    g.fillText('SUPER', tx + tw - 14 * k, y); g.textAlign = 'left';
    y += 23 * k;
    g.font = `${16.5 * k}px Alegreya, Georgia, serif`; g.fillStyle = '#2a1a0a';
    y = wrap(g, el.special.desc, px, y, pw, 20 * k, 2);
    g.font = `italic ${15 * k}px Alegreya, Georgia, serif`; g.fillStyle = '#3a2a14';
    y = wrap(g, `${el.passive.name}: ${el.passive.desc}${info.weaponName ? '  ·  Arma: ' + info.weaponName : ''}`, px, y + 2 * k, pw, 18 * k, 2);
    if (info.flavor) {
        g.strokeStyle = 'rgba(58,36,18,0.4)'; g.lineWidth = 1 * k;
        g.beginPath(); g.moveTo(px + pw * 0.2, y - 4 * k); g.lineTo(px + pw * 0.8, y - 4 * k); g.stroke();
        g.font = `italic ${14.5 * k}px Alegreya, Georgia, serif`; g.fillStyle = '#5a4428';
        wrap(g, `“${info.flavor}”`, px, y + 14 * k, pw, 17 * k, 2);
    }
    // piè di pagina
    g.font = `${13 * k}px Alegreya, Georgia, serif`; g.fillStyle = '#e8dcf0'; g.textAlign = 'left';
    g.shadowColor = '#000'; g.shadowBlur = 4 * k;
    const G = info.grade || 0, GR = gradeOf(G);
    g.fillText(`SPUTNIK · ${info.number || '#0000'}`, 46 * k, H - 50 * k);
    g.fillText(`© Sputnik Homies · ${G ? `Carta ${GR.name}` : rar.name}`, 46 * k, H - 33 * k);
    g.shadowBlur = 0;
    const bx = W - 246 * k, by = H - 76 * k, bw = 204 * k, bh = 44 * k;
    rr(g, bx, by, bw, bh, 8 * k); g.fillStyle = 'rgba(12,6,16,0.9)'; g.fill();
    g.lineWidth = 2.5 * k; g.strokeStyle = '#c99a2e'; g.stroke();
    g.font = `700 ${19 * k}px Cinzel, Georgia, serif`; g.fillStyle = "#fff"; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(`ATK/${info.atk}   DEF/${info.def}`, bx + bw / 2, by + bh / 2 + 1 * k);
    // sigilli incastonati: piccoli bolli di ceralacca sull'illustrazione
    (info.seals || []).filter(s => SEALS[s]).forEach((s, i) => {
        const cx = ax + 30 * k + i * 46 * k, cy = ay + ah - 30 * k, r = 19 * k;
        const wg = g.createRadialGradient(cx - 5 * k, cy - 6 * k, 2 * k, cx, cy, r);
        wg.addColorStop(0, '#d8483a'); wg.addColorStop(0.7, '#8a1a14'); wg.addColorStop(1, '#4a0a08');
        g.beginPath(); for (let j = 0; j < 14; j++) { const a = j / 14 * Math.PI * 2, rad = r * (j % 2 ? 0.92 : 1.04); g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); } g.closePath();
        g.fillStyle = wg; g.fill(); g.lineWidth = 1.5 * k; g.strokeStyle = '#2a0402'; g.stroke();
        drawIcon(g, SEALS[s].icon, cx, cy, 24 * k, '#ffd9a0');
    });
    // gradi del risveglio (Altare): Filigrana olografica, bordo Aurora, cornice d'oro Incisa
    if (G >= 1) {
        g.save();
        rr(g, 0, 0, W, H, 30 * k); g.clip();
        g.globalCompositeOperation = 'screen';
        g.strokeStyle = 'rgba(200,255,240,0.05)'; g.lineWidth = 2 * k;
        for (let x = -H; x < W; x += 9 * k) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + H, H); g.stroke(); }
        const hg = g.createLinearGradient(0, 0, W, H);
        hg.addColorStop(0.2, 'rgba(255,255,255,0)'); hg.addColorStop(0.38, 'rgba(255,245,210,0.16)'); hg.addColorStop(0.46, 'rgba(130,220,255,0.14)');
        hg.addColorStop(0.54, 'rgba(255,130,230,0.12)'); hg.addColorStop(0.62, 'rgba(255,255,255,0)');
        g.fillStyle = hg; g.fillRect(0, 0, W, H);
        g.restore();
    }
    if (G >= 2) {
        const stops = ['#ff5a1f', '#ffe14a', '#5fbf4a', '#7fd8ff', '#b880ff', '#ff5a1f'];
        const cg = g.createConicGradient ? g.createConicGradient(0, W / 2, H / 2) : g.createLinearGradient(0, 0, W, H);
        stops.forEach((c, i) => cg.addColorStop(i / (stops.length - 1), c));
        rr(g, 8 * k, 8 * k, W - 16 * k, H - 16 * k, 26 * k); g.lineWidth = 9 * k; g.strokeStyle = cg; g.stroke();
    }
    if (G >= 3) {
        const gold = g.createLinearGradient(0, 0, W, H);
        gold.addColorStop(0, '#fff6c0'); gold.addColorStop(0.3, '#c99a2e'); gold.addColorStop(0.5, '#ffe9a8'); gold.addColorStop(0.75, '#a8741a'); gold.addColorStop(1, '#fff0b0');
        rr(g, 3 * k, 3 * k, W - 6 * k, H - 6 * k, 28 * k); g.lineWidth = 5 * k; g.strokeStyle = gold; g.stroke();
        rr(g, 15 * k, 15 * k, W - 30 * k, H - 30 * k, 21 * k); g.lineWidth = 3 * k; g.stroke();
        for (const [x, y] of [[22, 22], [W / k - 22, 22], [22, H / k - 22], [W / k - 22, H / k - 22]]) {
            g.save(); g.translate(x * k, y * k); g.rotate(Math.PI / 4);
            g.fillStyle = gold; g.fillRect(-9 * k, -9 * k, 18 * k, 18 * k); g.strokeStyle = '#3a2400'; g.lineWidth = 1.5 * k; g.strokeRect(-9 * k, -9 * k, 18 * k, 18 * k);
            g.restore();
        }
        const rnd = srand(77);
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 46; i++) {
            const side = rnd(), t = rnd(), x = side < 0.5 ? ax + t * aw : (side < 0.75 ? ax : ax + aw), y = side < 0.5 ? (side < 0.25 ? ay : ay + ah) : ay + t * ah;
            const pr = (2 + rnd() * 5) * k, pg = g.createRadialGradient(x, y, 0, x, y, pr * 2);
            pg.addColorStop(0, el.glow); pg.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = pg; g.fillRect(x - pr * 2, y - pr * 2, pr * 4, pr * 4);
        }
        g.restore();
    }
    g.restore();
}

// Il riflesso olografico (CSS) segue il puntatore sopra la carta
export function holoTrack(el) {
    if (!el || el.dataset.holo) return el;
    el.dataset.holo = '1';
    const move = (e) => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', () => { el.style.removeProperty('--mx'); el.style.removeProperty('--my'); });
    return el;
}

export function cardNumber(id) {
    let h = 0;
    for (const ch of String(id || 'x')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return '#' + String(h % 10000).padStart(4, '0');
}
export function defaultType(appearance, element) {
    const sp = APPEARANCE_LABELS.species[appearance?.species] || 'Viandante';
    return `Creatura — ${sp} di ${ELEMENTS[element]?.name || 'Fango'}`;
}

// Compone la card completa su un canvas. studio serve per il ritratto 3D.
export async function composeCard(opts, studio, W = CARD_W) {
    const { card, appearance, look, level = 1, talents, id, name, grade = 0, seals = [], gearPlus = 0 } = opts;
    const tex = await textureImage(card).catch(() => generateTexture('mura'));
    let art = null, artIsPortrait = false;
    try {
        if (card.art === 'custom' && card.artData) art = await cachedImage(card.artData);
        else if (card.art && card.art.startsWith('propic:')) art = await cachedImage(CARD_ARTS.find(a => a.id === card.art).file);
        else { art = studio.portrait(appearance, look, 512, 'bust'); artIsPortrait = true; }
    } catch { art = null; }
    const gear = ['head', 'face', 'cape', 'torso'].map(s => look?.[s]).filter(Boolean);
    const pw = cardPower(card.element, look?.weapon, level, { talents, gear, gearPlus, seals });
    const w = look?.weapon;
    const ws = weaponStats(w);
    const c = document.createElement('canvas');
    c.width = W; c.height = Math.round(W * CARD_H / CARD_W);
    drawCard(c.getContext('2d'), c.width, c.height, {
        title: card.title || name || 'Viandante', type: card.type || defaultType(appearance, card.element), flavor: card.flavor,
        element: card.element, tex, art, artIsPortrait, level, atk: pw.atk, def: pw.def,
        weaponName: w ? `${w.name}${ws.plus ? ` +${ws.plus}` : ''} (×${ws.dmg.toFixed(2)})` : null, number: cardNumber(id), grade, seals,
    });
    return c;
}

// Stampa (formato carta da gioco 63×88 mm)
export function printCard(canvas, title = 'Card') {
    const url = canvas.toDataURL('image/png');
    const w = window.open('', '_blank');
    if (!w) return false;
    w.document.write(`<!doctype html><html><head><title>${title.replace(/[<>&"]/g, '')}</title><style>
        @page { size: A4; margin: 15mm; } body { margin: 0; display: flex; gap: 6mm; flex-wrap: wrap; justify-content: center; padding-top: 10mm; background: #fff; }
        img { width: 63mm; height: 88mm; } p { width: 100%; text-align: center; font: 12px Alegreya, Georgia, serif; color: #555; }
        @media print { p { display: none; } }
        </style></head><body><p>Formato carta da gioco 63×88 mm — ritaglia lungo il bordo nero.</p><img src="${url}">
        <script>window.onload = () => setTimeout(() => window.print(), 300);<\/script></body></html>`);
    w.document.close();
    return true;
}
export function downloadCard(canvas, name = 'card') {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `sputnik-card-${String(name).replace(/[^\w-]+/g, '_')}.png`;
    a.click();
}
