// =====================================================================
//  CONFIGURAZIONE, SALVATAGGI LOCALI, RETE E PICCOLE UTILITÀ DOM
// =====================================================================
import { iconSVG } from './icons.js';

const params = new URLSearchParams(location.search);
const isLocalHost = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || location.hostname.endsWith('.localhost');
export const SOCKET_URL = params.get('server') || (isLocalHost ? location.origin : 'https://sputnikchat-1.onrender.com');
// ?p=2 apre un secondo profilo nello stesso browser (utile per provare il multiplayer)
const STORE_KEY = 'sputnik3d' + (params.get('p') ? ':' + params.get('p') : '');
export const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 1 && matchMedia('(pointer: coarse)').matches);

export const store = {
    load() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; } },
    save(data) { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { console.warn('Salvataggio locale fallito', e); } },
};

// --- RETE (socket.io) ---
export class Net {
    constructor(url) { this.url = url; this.socket = null; this.handlers = {}; }
    get connected() { return !!this.socket?.connected; }
    connect() {
        if (typeof io === 'undefined') { console.warn('socket.io non caricato'); return; }
        this.socket = io(this.url, { transports: ['websocket', 'polling'], reconnectionDelay: 1500, timeout: 20000 });
        this.socket.on('connect', () => this.fire('_connect'));
        this.socket.on('disconnect', (r) => this.fire('_disconnect', r));
        this.socket.on('connect_error', (e) => this.fire('_error', e));
        this.socket.onAny((ev, data) => this.fire(ev, data));
    }
    on(ev, fn) { (this.handlers[ev] ||= []).push(fn); }
    fire(ev, data) { for (const fn of this.handlers[ev] || []) { try { fn(data); } catch (e) { console.error(`[net ${ev}]`, e); } } }
    send(ev, data) { if (this.connected) this.socket.emit(ev, data); }
    sendVolatile(ev, data) { if (this.connected) this.socket.volatile.emit(ev, data); }
    request(ev, data = {}, timeout = 9000) {
        return new Promise((resolve) => {
            if (!this.connected) return resolve({ ok: false, msg: 'Sei offline: il server non è raggiungibile' });
            this.socket.timeout(timeout).emit(ev, data, (err, res) => resolve(err ? { ok: false, msg: 'Il server non risponde' } : (res || { ok: false })));
        });
    }
}

// --- DOM ---
export const $ = (s, root = document) => root.querySelector(s);
export function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'html') el.innerHTML = v;
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
    }
    for (const kid of kids.flat(Infinity)) {
        if (kid == null || kid === false) continue;
        el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
}
export const fmt = (n) => Math.round(n).toLocaleString('it-IT');
export const coin = (n, cls = 'price') => h('span', { class: cls }, h('span', { class: 'sc-coin', html: iconSVG('satellite') }), fmt(n));
const SEAL = { coin: 'coins', ok: 'seal', bad: 'skull', duel: 'swords', info: 'scroll' };

export function toast(content, opts = {}) {
    const box = document.getElementById('toasts');
    const kind = opts.kind || 'info';
    const el = h('div', { class: 'toast ' + kind }, h('span', { class: 't-seal', html: iconSVG(opts.icon || SEAL[kind] || 'scroll') }));
    if (typeof content === 'string') el.append(h('div', {}, content)); else el.append(content);
    if (opts.actions?.length) {
        el.append(h('div', { class: 'btn-row' }, opts.actions.map(a => h('button', {
            class: 'btn btn-sm ' + (a.primary ? 'btn-primary' : ''),
            onclick: () => { close(); a.fn?.(); },
        }, a.label))));
    }
    const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
    box.prepend(el);
    while (box.children.length > 5) box.lastChild.remove();
    setTimeout(close, opts.duration || (opts.actions ? 18000 : 4500));
    return { el, close };
}

export function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// Ridimensiona un file immagine caricato dall'utente → dataURL JPEG compatto
export function fileToDataURL(file, maxW, maxH, quality = 0.82) {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onerror = reject;
        fr.onload = async () => {
            try {
                const img = await loadImage(fr.result);
                const k = Math.min(1, maxW / img.width, maxH / img.height);
                const c = document.createElement('canvas');
                c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                resolve(c.toDataURL('image/jpeg', quality));
            } catch (e) { reject(e); }
        };
        fr.readAsDataURL(file);
    });
}
