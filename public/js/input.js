// =====================================================================
//  COMANDI: tastiera rimappabile e controller (Xbox / PlayStation)
//  Uno strato sottile davanti al gioco: traduce i tasti rimappati e i
//  pulsanti del controller nei tasti che il gioco conosce già (W, Spazio,
//  E, J...), così mondo, pesca e duello non cambiano. Due contesti:
//  «mondo» (anche pesca e canto) e «duello». Le scelte restano su questo
//  dispositivo (impostazioni locali).
// =====================================================================

// ogni azione: [id, nome, tasto di sempre]
export const ACTIONS = {
    world: [
        ['su', 'Avanti', 'KeyW'], ['giu', 'Indietro', 'KeyS'], ['sx', 'Sinistra', 'KeyA'], ['dx', 'Destra', 'KeyD'],
        ['salto', 'Salta', 'Space'], ['corsa', 'Corri (tieni premuto)', 'ShiftLeft'], ['usa', 'Interagisci', 'KeyE'],
        ['fango', 'Lancia fango', 'KeyF'], ['visuale', 'Cambia visuale', 'KeyV'], ['mappa', 'Mappa', 'KeyN'],
        ['libro', 'Libro dell\'Approdo', 'KeyG'], ['borsa', 'Bisaccia', 'KeyI'], ['chiudi', 'Chiudi / indietro', 'Escape'],
        ['saluta', 'Saluta', 'Digit1'], ['balla', 'Balla', 'Digit2'],
    ],
    duel: [
        ['sx', 'Sinistra', 'KeyA'], ['dx', 'Destra', 'KeyD'], ['su', 'Salta / su', 'KeyW'], ['giu', 'Giù', 'KeyS'],
        ['colpo', 'Colpo', 'KeyJ'], ['fendente', 'Fendente', 'KeyK'], ['super', 'SUPER', 'KeyL'],
        ['para', 'Para', 'KeyI'], ['scatto', 'Scatto', 'ShiftLeft'],
    ],
};
// il controller (mappatura «standard» del browser: Xbox e PlayStation hanno gli stessi numeri)
export const PAD_NAMES = ['A / Croce', 'B / Cerchio', 'X / Quadrato', 'Y / Triangolo', 'LB / L1', 'RB / R1', 'LT / L2', 'RT / R2',
    'View / Share', 'Menu / Options', 'Levetta sinistra (premuta)', 'Levetta destra (premuta)', 'Croce su', 'Croce giù', 'Croce sinistra', 'Croce destra'];
export const PAD_DEFAULT = {
    world: { salto: 0, chiudi: 1, usa: 2, fango: 3, borsa: 4, visuale: 5, corsa: 6, mappa: 8, libro: 9, saluta: 14, balla: 15 },
    duel: { su: 0, super: 1, colpo: 2, fendente: 3, para: 4, scatto: 5, giu: 13 },
};
const STICK = 0.32;

export class Input {
    constructor(app) {
        this.app = app;
        this.prev = {};           // pulsanti premuti al giro prima, per contesto
        this.virtual = new Set(); // tasti «finti» tenuti premuti dal controller
        this.capture = null;      // in attesa di un tasto o di un pulsante da assegnare
        this.padName = null;
        // la tastiera rimappata: il tasto scelto diventa quello di sempre
        const onKey = (e) => {
            if (e.__virtual) return;
            if (this.capture?.kind === 'key' && e.type === 'keydown') { e.preventDefault(); e.stopImmediatePropagation(); this.finishCapture(e.code); return; }
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            const to = this.keyTable()[e.code];
            if (!to || to === e.code) return;
            e.preventDefault(); e.stopImmediatePropagation();
            this.fire(e.type, to, e.repeat);
        };
        addEventListener('keydown', onKey, true);
        addEventListener('keyup', onKey, true);
        addEventListener('gamepadconnected', (e) => { this.padName = e.gamepad.id; this.app.toastPad?.(e.gamepad.id, true); });
        addEventListener('gamepaddisconnected', () => { this.padName = null; this.releaseAll(); this.app.toastPad?.(null, false); });
    }
    ctx() { return this.app.mode === 'duel' ? 'duel' : 'world'; }
    settings() { return (this.app.local.settings ||= {}); }
    keyOf(ctx, id) { const def = ACTIONS[ctx].find(a => a[0] === id)?.[2]; return this.settings().keys?.[ctx]?.[id] || def; }
    padOf(ctx, id) { const s = this.settings().pad?.[ctx]; return s && id in s ? s[id] : PAD_DEFAULT[ctx][id]; }
    // tasto premuto → tasto che il gioco si aspetta (solo per le azioni rimappate)
    keyTable() {
        const ctx = this.ctx(), out = {}, custom = this.settings().keys?.[ctx] || {};
        for (const [id, , def] of ACTIONS[ctx]) if (custom[id] && custom[id] !== def) out[custom[id]] = def;
        return out;
    }
    fire(type, code, repeat = false) {
        const ev = new KeyboardEvent(type, { code, key: code === 'Space' ? ' ' : code === 'Escape' ? 'Escape' : code.replace(/^Key|^Digit/, '').toLowerCase(), bubbles: true, cancelable: true, repeat });
        ev.__virtual = true;
        window.dispatchEvent(ev);
    }
    hold(code, on) {
        if (on && !this.virtual.has(code)) { this.virtual.add(code); this.fire('keydown', code); }
        else if (!on && this.virtual.has(code)) { this.virtual.delete(code); this.fire('keyup', code); }
    }
    releaseAll() { for (const c of [...this.virtual]) this.hold(c, false); this.app.padMove = null; }

    // --- ogni fotogramma: leggi il controller ---
    update(dt) {
        const pads = navigator.getGamepads?.() || [], gp = [...pads].find(p => p && p.connected);
        if (!gp) { if (this.virtual.size || this.app.padMove) this.releaseAll(); return; }
        const app = this.app, ctx = this.ctx(), B = gp.buttons.map(b => b.pressed || b.value > 0.5);
        if (this.capture?.kind === 'pad') { const i = B.findIndex((v, k) => v && !this.prev._cap?.[k]); this.prev._cap = B; if (i >= 0) this.finishCapture(i); return; }
        if (B.some(Boolean) && app.mode === 'world') document.getElementById('click-to-play')?.classList.add('hidden');
        // pulsanti → azioni del contesto
        const wanted = new Set();
        for (const [id, , def] of ACTIONS[ctx]) { const b = this.padOf(ctx, id); if (b != null && B[b]) wanted.add(def); }
        // levetta sinistra e croce
        const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);
        if (ctx === 'duel') {
            const dir = (code, on) => { if (on) wanted.add(code); };
            dir('KeyA', ax < -STICK || B[14]); dir('KeyD', ax > STICK || B[15]); dir('KeyW', ay < -0.6 || B[12]); dir('KeyS', ay > 0.6 || B[13]);
            app.padMove = null;
        } else {
            const x = dz(ax) + (B[15] ? 1 : 0) - (B[14] ? 1 : 0), y = -dz(ay) + (B[12] ? 1 : 0) - (B[13] ? 1 : 0);
            app.padMove = x || y ? { x, y } : null;
            // levetta destra: la telecamera
            const rx = dz(gp.axes[2] || 0), ry = dz(gp.axes[3] || 0);
            if (rx || ry) { app.cam.yaw -= rx * dt * 2.6; app.cam.pitch = Math.max(app.cam.first ? -1.3 : -0.45, Math.min(1.25, app.cam.pitch + ry * dt * 1.8)); }
            if (B[10]) wanted.add('ShiftLeft');   // levetta premuta = corri
        }
        for (const c of [...this.virtual]) if (!wanted.has(c)) this.hold(c, false);
        for (const c of wanted) this.hold(c, true);
        this.prev[ctx] = B;
    }

    // --- assegnare un tasto o un pulsante (dalle Opzioni) ---
    startCapture(kind, ctx, id, done) { this.capture = { kind, ctx, id, done }; this.prev._cap = (navigator.getGamepads?.() || []).find(p => p)?.buttons.map(b => b.pressed) || []; }
    finishCapture(v) {
        const C = this.capture; this.capture = null;
        if (!C) return;
        const s = this.settings();
        if (C.kind === 'key') { if (v !== 'Escape' || C.id === 'chiudi') ((s.keys ||= {})[C.ctx] ||= {})[C.id] = v; }
        else ((s.pad ||= {})[C.ctx] ||= {})[C.id] = v;
        this.app.saveLocal();
        C.done?.();
    }
    reset() { const s = this.settings(); delete s.keys; delete s.pad; this.app.saveLocal(); }
}
// un nome leggibile per un tasto
export const keyName = (c) => !c ? '—' : c === 'Space' ? 'Spazio' : c === 'Escape' ? 'Esc' : c.startsWith('Shift') ? 'Maiusc' : c.startsWith('Control') ? 'Ctrl' : c.startsWith('Arrow') ? { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' }[c] : c.replace(/^Key|^Digit|^Numpad/, '');
