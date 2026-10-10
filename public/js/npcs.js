// =====================================================================
//  GLI ABITANTI DELL'ISOLA
//  Il Traghettatore, Mastro Brace, la Sarta, il Mercante, la Custode,
//  il Becchino, lo Spettro del Pedaggio e il Ratto dei Cronisti.
//  Stanno al loro posto, ti guardano quando ti avvicini e parlano con E.
// =====================================================================
import { Character } from './character.js';
import { NPCS } from './shared/lore.js';

const lerpAngle = (a, b, t) => { const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };

export class Npcs {
    constructor(app) {
        this.app = app;
        this.list = [];
        const W = app.world;
        for (const [id, N] of Object.entries(NPCS)) {
            const ch = new Character(N.app, N.look || {}, { name: N.name, sub: N.where, color: '#c9a0ff' });
            const y = W.groundAt(N.x, N.z);
            ch.root.position.set(N.x, y, N.z);
            ch.root.rotation.y = N.ry;
            app.scene.add(ch.root);
            W.addCirc(N.x, N.z, 0.38, y - 0.5, y + 1.9);
            W.interactables.push({ id: 'npc', npc: id, x: N.x + Math.sin(N.ry) * 1.1, z: N.z + Math.cos(N.ry) * 1.1, y, r: 2.4, label: `Parla con ${N.name}` });
            this.list.push({ id, N, ch, ry: N.ry, talkT: 0 });
        }
    }
    // gesto di saluto quando gli parli
    greet(id) {
        const n = this.list.find(x => x.id === id);
        if (n) { n.ch.play('saluta', 2); n.talkT = 4; }
    }
    update(dt, player, camPos) {
        for (const n of this.list) {
            const p = n.ch.root.position, d = camPos.distanceTo(p);
            if (d > 90) { if (n.ch.tag) n.ch.tag.visible = false; continue; }
            const dp = Math.hypot(player.x - p.x, player.z - p.z);
            const want = dp < 6 ? Math.atan2(player.x - p.x, player.z - p.z) : n.N.ry;
            n.ry = lerpAngle(n.ry, want, Math.min(1, dt * 3));
            n.ch.root.rotation.y = n.ry;
            n.ch.state = 'idle';
            if (n.ch.tag) n.ch.tag.visible = d < 26;
            n.talkT = Math.max(0, n.talkT - dt);
            n.ch.update(dt);
        }
    }
}
