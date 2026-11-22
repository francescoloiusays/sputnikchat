// =====================================================================
//  GLI INTERNI: entrare in un edificio è come entrare in un altro livello
//  Quando varchi la porta di un edificio con muri e tetto (botteghe,
//  case, lo studio di Rob; il castello no), lo schermo si fa nero un
//  attimo, il resto dell'isola sparisce e resta solo la stanza, con chi
//  c'è dentro. La telecamera resta chiusa fra le quattro mura: non
//  sbatte più contro i muri. Si esce dalla porta, e torna l'isola.
//  Nascondere l'isola alleggerisce anche il disegno: dentro si disegna
//  solo la stanza.
// =====================================================================
const MARGIN = 0.35;

export class Interiors {
    constructor(app) {
        this.app = app;
        this.list = [];
        this.cur = null;
        this.busy = false;
        this.saved = null;
        this.veil = document.createElement('div');
        this.veil.style.cssText = 'position:fixed;inset:0;z-index:55;background:#07030c;opacity:0;pointer-events:none;transition:opacity .28s ease;display:flex;align-items:flex-end;justify-content:center;';
        this.label = document.createElement('div');
        this.label.style.cssText = 'margin-bottom:14vh;font-family:var(--display,serif);color:#e8d9b8;font-size:clamp(20px,3vw,30px);letter-spacing:.06em;text-shadow:0 2px 8px #000;opacity:.9;';
        this.veil.append(this.label);
        document.body.append(this.veil);
    }
    // un edificio: centro, rotazione, larghezza (x locale), profondità (z locale, la porta è sul lato +z), altezza, quota del pavimento
    add(I) { I.cos = Math.cos(I.ry); I.sin = Math.sin(I.ry); this.list.push(I); return I; }
    remove(I) { const i = this.list.indexOf(I); if (i >= 0) this.list.splice(i, 1); if (this.cur === I) this.leave(true); }
    local(I, x, z) { const dx = x - I.x, dz = z - I.z; return [dx * I.cos - dz * I.sin, dx * I.sin + dz * I.cos]; }
    inside(I, p, m = 0) { const [lx, lz] = this.local(I, p.x, p.z); return Math.abs(lx) < I.w / 2 - m && Math.abs(lz) < I.d / 2 - m && p.y > I.y - 1 && p.y < I.y + I.h; }

    update() {
        const app = this.app;
        if (this.busy || app.mode === 'duel' || app.mode === 'cena' || app.mode === 'cutscene') return;
        const P = app.player?.pos;
        if (!P) return;
        if (this.cur) {
            const [lx, lz] = this.local(this.cur, P.x, P.z);
            if (Math.abs(lx) > this.cur.w / 2 - 0.1 || lz > this.cur.d / 2 - 0.12 || lz < -this.cur.d / 2 || P.y < this.cur.y - 1.5 || P.y > this.cur.y + this.cur.h) this.leave();
            return;
        }
        for (const I of this.list) {
            const [lx, lz] = this.local(I, P.x, P.z);
            if (Math.abs(lx) < I.w / 2 - 0.4 && lz < I.d / 2 - 0.65 && lz > -I.d / 2 && P.y > I.y - 1 && P.y < I.y + I.h) { this.enter(I); break; }
        }
    }
    fade(text, fn) {
        this.busy = true;
        this.label.textContent = text || '';
        this.veil.style.opacity = '1';
        setTimeout(() => { try { fn(); } finally { setTimeout(() => { this.veil.style.opacity = '0'; this.busy = false; }, 140); } }, 290);
    }
    enter(I) {
        const app = this.app;
        app.audio?.play?.('wood');
        this.fade(I.name, () => {
            this.cur = I; app.interior = I;
            this.saved = new Map();
            for (const o of app.scene.children) this.saved.set(o, o.visible);
            this.prevDist = app.cam.wantDist;
            app.cam.wantDist = Math.min(app.cam.wantDist, I.camDist || 3.2);
            app.cam.yaw = I.ry; app.cam.pitch = 0.22;   // dalla porta, guardando dentro
            this.frame();
        });
    }
    leave(now) {
        const app = this.app, I = this.cur;
        const done = () => {
            if (this.saved) for (const o of app.scene.children) o.visible = this.saved.has(o) ? this.saved.get(o) : true;
            this.saved = null; this.cur = null; app.interior = null;
            if (this.prevDist) app.cam.wantDist = this.prevDist;
        };
        if (now) return done();
        app.audio?.play?.('wood');
        this.fade(I?.outName || '', done);
    }
    // ogni fotogramma, dopo tutti gli aggiornamenti: dentro, si vede solo la stanza (e chi ci sta dentro)
    frame() {
        const I = this.cur, app = this.app;
        if (!I) return;
        const keep = new Set([...(I.groups || []), app.myChar?.root, app.petF?.g].filter(Boolean));
        const p = { x: 0, y: 0, z: 0 };
        for (const o of app.scene.children) {
            if (o.isLight || keep.has(o)) continue;
            p.x = o.position.x; p.y = o.position.y; p.z = o.position.z;
            // personaggi e oggetti che stanno davvero nella stanza restano (Mastro Brace, la Sarta, altri viandanti)
            if (o.visible && this.inside(I, p, -0.1) && !o.isSprite && o.position.lengthSq() > 0) continue;
            o.visible = false;
        }
    }
    // la telecamera non esce dalla stanza
    clamp(pos) {
        const I = this.cur;
        if (!I) return;
        let [lx, lz] = this.local(I, pos.x, pos.z);
        const hw = I.w / 2 - MARGIN, hd = I.d / 2 - MARGIN;
        lx = Math.max(-hw, Math.min(hw, lx)); lz = Math.max(-hd, Math.min(hd, lz));
        pos.x = I.x + lx * I.cos + lz * I.sin; pos.z = I.z - lx * I.sin + lz * I.cos;
        pos.y = Math.max(I.y + 0.5, Math.min(I.y + I.h - 0.25, pos.y));
    }
}
