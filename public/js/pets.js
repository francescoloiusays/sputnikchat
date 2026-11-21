// =====================================================================
//  GLI SPUTNIKPET: i modelli e il compagno che ti segue
//  Sette animaletti fatti a mano con forme semplici (niente modelli da
//  scaricare): il corvo, il cane alato, il fuoco fatuo, il fantasmino,
//  il gatto con gli stivali, il granchio del molo, l'anguilla di nebbia.
//  PetFollower: nel mondo ti viene dietro, vola o zampetta; se è stanco
//  cammina piano e sbadiglia. Nei duelli sta al bordo del palco.
// =====================================================================
import * as THREE from 'three';
import { PETS, petTint, petTired } from './shared/pet.js';

const M = (o) => new THREE.MeshStandardMaterial({ roughness: 0.7, ...o });
const eyes = (g, y, z, x = 0.05, r = 0.022, col = '#111') => {
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), M({ color: col, roughness: 0.2 })); e.position.set(s * x, y, z); g.add(e); }
};
// ogni modello: un gruppo alto più o meno mezzo metro, che guarda verso +z; userData.fly = vola, userData.parts = cose che si muovono
export function buildPet(sp, tint) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const P = PETS[sp] || PETS.corvo, col = tint || P.color, parts = {};
    let fly = true, h = 0.9;
    switch (sp) {
        case 'corvo': {
            const feather = M({ color: '#1c1822', roughness: 0.5, metalness: 0.15 });
            const b = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 9), feather); b.scale.set(1, 0.9, 1.35); body.add(b);
            const hd = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 9), feather); hd.position.set(0, 0.1, 0.16); body.add(hd);
            const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.11, 6), M({ color: '#3a3430' })); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.09, 0.27); body.add(beak);
            eyes(body, 0.13, 0.22, 0.045, 0.016, '#ffd23a');
            const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 4), feather); tail.rotation.x = -Math.PI / 2 - 0.3; tail.position.set(0, 0.02, -0.22); body.add(tail);
            parts.wings = [-1, 1].map(s => { const w = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 6), feather); w.scale.set(1.2, 0.12, 0.6); w.position.set(s * 0.17, 0.04, -0.02); body.add(w); return w; });
            break;
        }
        case 'cane': {
            const fur = M({ color: col, roughness: 0.9 }), dark = M({ color: '#3a2a20', roughness: 0.9 });
            const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.24, 4, 10), fur); b.rotation.x = Math.PI / 2; body.add(b);
            const hd = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 9), fur); hd.position.set(0, 0.1, 0.22); body.add(hd);
            const snout = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), fur); snout.scale.set(0.9, 0.8, 1.2); snout.position.set(0, 0.07, 0.31); body.add(snout);
            const nose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), dark); nose.position.set(0, 0.09, 0.37); body.add(nose);
            eyes(body, 0.14, 0.31, 0.045, 0.018);
            for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), dark); e.scale.set(0.5, 1.2, 0.3); e.position.set(s * 0.08, 0.13, 0.18); e.rotation.z = s * 0.5; body.add(e); }
            for (const [x, z] of [[-0.07, 0.12], [0.07, 0.12], [-0.07, -0.12], [0.07, -0.12]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 6), fur); l.position.set(x, -0.13, z); body.add(l); }
            const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.18, 6), fur); tail.position.set(0, 0.06, -0.24); tail.rotation.x = -0.9; body.add(tail);
            // due ali da pipistrello, troppo piccole per un cane così
            const wingM = M({ color: '#4a3040', side: THREE.DoubleSide, roughness: 0.8 });
            const wg = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.3, 0.12), new THREE.Vector2(0.26, -0.02), new THREE.Vector2(0.2, 0.04), new THREE.Vector2(0.14, -0.04), new THREE.Vector2(0.08, 0.02)]));
            parts.wings = [-1, 1].map(s => { const w = new THREE.Mesh(wg, wingM); w.position.set(s * 0.06, 0.1, 0.02); w.rotation.set(-Math.PI / 2, 0, s > 0 ? 0 : Math.PI); w.scale.x = 1; body.add(w); return w; });
            break;
        }
        case 'fatuo': {
            const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 2), M({ color: col, emissive: col, emissiveIntensity: 2.2, roughness: 0.3, transparent: true, opacity: 0.9 }));
            body.add(core);
            const flame = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 10), M({ color: col, emissive: col, emissiveIntensity: 1.6, transparent: true, opacity: 0.6 })); flame.position.y = 0.13; body.add(flame);
            eyes(body, 0.02, 0.09, 0.035, 0.016, '#0a0a14');
            parts.flame = flame; parts.glow = true;
            h = 1.1;
            break;
        }
        case 'fantasmino': {
            const sheet = M({ color: '#f2f0ff', emissive: '#9aa8ff', emissiveIntensity: 0.25, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
            const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(Math.sin(t * Math.PI * 0.55) * 0.15 + t * 0.03, 0.2 - t * 0.38)); }
            const lathe = new THREE.LatheGeometry(pts, 20);
            const lp = lathe.attributes.position;
            for (let i = 0; i < lp.count; i++) if (lp.getY(i) < -0.12) { const a = Math.atan2(lp.getZ(i), lp.getX(i)); lp.setY(i, lp.getY(i) + Math.sin(a * 6) * 0.03); }
            lathe.computeVertexNormals();
            body.add(new THREE.Mesh(lathe, sheet));
            const ey = M({ color: '#111', roughness: 0.3 });
            for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), ey); e.scale.set(0.8, 1.3, 0.5); e.position.set(s * 0.055, 0.08, 0.135); body.add(e); }
            const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.02, 10), ey); mouth.position.set(0, 0.0, 0.15); body.add(mouth);
            parts.glow = true; h = 1.0;
            break;
        }
        case 'gatto': {
            fly = false; h = 0;
            const fur = M({ color: col, roughness: 0.9 }), boot = M({ color: '#4a2a14', roughness: 0.6 }), white = M({ color: '#f2e6d6', roughness: 0.9 });
            const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.2, 4, 10), fur); b.rotation.x = Math.PI / 2; b.position.y = 0.2; body.add(b);
            const hd = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 9), fur); hd.position.set(0, 0.32, 0.17); body.add(hd);
            const muz = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), white); muz.scale.set(1.2, 0.8, 0.8); muz.position.set(0, 0.29, 0.26); body.add(muz);
            eyes(body, 0.35, 0.25, 0.04, 0.018, '#7aff4a');
            for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 4), fur); e.position.set(s * 0.06, 0.42, 0.16); e.rotation.z = -s * 0.25; body.add(e); }
            // il cappello piumato
            const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.015, 14), boot); hat.position.set(0, 0.43, 0.15); hat.rotation.z = 0.2; body.add(hat);
            const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.06, 12), boot); crown.position.set(0.01, 0.46, 0.15); crown.rotation.z = 0.2; body.add(crown);
            const plume = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M({ color: '#e8f0ff' })); plume.scale.set(0.3, 1.6, 0.5); plume.position.set(-0.05, 0.52, 0.12); plume.rotation.z = 0.6; body.add(plume);
            parts.legs = [[-0.06, 0.1], [0.06, 0.1], [-0.06, -0.1], [0.06, -0.1]].map(([x, z], i) => {
                const l = new THREE.Group(); l.position.set(x, 0.16, z); body.add(l);
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 6), fur); leg.position.y = -0.06; l.add(leg);
                const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.08, 8), boot); bt.position.y = -0.12; l.add(bt);   // gli stivali, rubati al Traghettatore
                return l;
            });
            parts.tail = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.022, 0.26, 6), fur); parts.tail.position.set(0, 0.3, -0.2); parts.tail.rotation.x = -0.5; body.add(parts.tail);
            break;
        }
        case 'granchio': {
            fly = false; h = 0;
            const shell = M({ color: col, roughness: 0.45, metalness: 0.1 });
            const b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 9), shell); b.scale.set(1.3, 0.55, 1); b.position.y = 0.12; body.add(b);
            for (const s of [-1, 1]) {
                const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 5), shell); st.position.set(s * 0.04, 0.2, 0.08); body.add(st);
                const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), M({ color: '#111', roughness: 0.2 })); e.position.set(s * 0.04, 0.24, 0.08); body.add(e);
                const arm = new THREE.Group(); arm.position.set(s * 0.15, 0.12, 0.08); body.add(arm);
                const up = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 6), shell); up.rotation.z = s * 1.0; up.position.set(s * 0.04, 0.02, 0.02); arm.add(up);
                const claw = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 7), shell); claw.scale.set(1, 0.7, 1.4); claw.position.set(s * 0.09, 0.05, 0.08); arm.add(claw);
                (parts.claws ||= []).push(arm);
                for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.008, 0.13, 5), shell); l.position.set(s * 0.15, 0.06, -0.06 + i * 0.06); l.rotation.z = s * 1.1; body.add(l); (parts.legs ||= []).push(l); }
            }
            break;
        }
        case 'anguilla': {
            const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector3(Math.sin(t * Math.PI * 2) * 0.06, 0, 0.25 - t * 0.55)); }
            const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.035, 8, false), M({ color: col, emissive: col, emissiveIntensity: 0.6, transparent: true, opacity: 0.75, roughness: 0.2 }));
            body.add(tube); parts.tube = tube;
            const hd = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), M({ color: col, emissive: col, emissiveIntensity: 0.6, transparent: true, opacity: 0.8 })); hd.scale.set(0.9, 0.8, 1.3); hd.position.z = 0.27; body.add(hd);
            eyes(body, 0.02, 0.3, 0.025, 0.01, '#ffffff');
            parts.glow = true;
            break;
        }
    }
    g.userData = { fly, h, parts, sp, glowCol: parts.glow ? col : null };
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    return g;
}

// animazione: battito d'ali, fiammella, zampe; t = tempo, moving = 0..1
export function animatePet(g, t, moving, tired) {
    const U = g.userData, P = U.parts, body = g.children[0];
    const slow = tired ? 0.4 : 1;
    if (U.fly) body.position.y = Math.sin(t * 3 * slow) * 0.05;
    if (P.wings) P.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.2 + Math.sin(t * (moving > 0.1 ? 18 : 6) * slow) * 0.55); });
    if (P.flame) { P.flame.scale.y = 1 + Math.sin(t * 11) * 0.2; P.flame.rotation.z = Math.sin(t * 7) * 0.2; }
    if (P.legs && U.sp === 'gatto') P.legs.forEach((l, i) => { l.rotation.x = moving > 0.1 ? Math.sin(t * 12 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.6 : 0; });
    if (P.tail) P.tail.rotation.z = Math.sin(t * 2.4) * 0.4;
    if (P.legs && U.sp === 'granchio') P.legs.forEach((l, i) => { l.rotation.x = moving > 0.1 ? Math.sin(t * 16 + i) * 0.4 : 0; });
    if (P.claws) P.claws.forEach((c, i) => { c.rotation.y = Math.sin(t * 2 + i) * 0.3; });
    if (P.tube) P.tube.rotation.y = Math.sin(t * 4) * 0.25;
    // stanco: si piega un poco in avanti
    body.rotation.x = tired ? 0.35 : 0;
}

// --- il compagno nel mondo ---
export class PetFollower {
    constructor(app) {
        this.app = app;
        this.g = null; this.key = null; this.t = 0;
        this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    }
    // ricostruisce il modello se è cambiata la specie (o il colore della carta)
    sync() {
        const me = this.app.me, pet = me && !me.offline ? me.pet : null;
        const key = pet ? pet.sp + ':' + (me.card?.element || '') : null;
        if (key === this.key) return;
        this.key = key;
        if (this.g) { this.app.scene.remove(this.g); this.g.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); }); this.g = null; this.glow = null; }
        if (!pet) return;
        this.g = buildPet(pet.sp, petTint(pet, me.card?.element));
        if (this.g.userData.glowCol) {
            this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.app.world.glowTex, color: this.g.userData.glowCol, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
            this.glow.scale.set(0.9, 0.9, 1); this.g.add(this.glow);
        }
        const P = this.app.player?.pos;
        if (P) this.pos.set(P.x - 1, P.y, P.z - 1);
        this.app.scene.add(this.g);
    }
    update(dt) {
        this.sync();
        const g = this.g, app = this.app;
        if (!g) return;
        g.visible = app.mode === 'world' || app.mode === 'fish';
        if (!g.visible) return;
        this.t += dt;
        const P = app.player.pos, yaw = app.player.yaw, tired = petTired(app.me?.pet);
        // sta dietro, un po' di lato; al molo, mentre peschi, si siede accanto
        const side = app.mode === 'fish' ? 1.1 : 0.9, back = app.mode === 'fish' ? 0.2 : 1.3;
        const tx = P.x - Math.sin(yaw) * back + Math.cos(yaw) * side, tz = P.z - Math.cos(yaw) * back - Math.sin(yaw) * side;
        const d = Math.hypot(tx - this.pos.x, tz - this.pos.z);
        if (d > 25) this.pos.set(tx, P.y, tz);   // teletrasporti e viaggi in barca: arriva con te
        const speed = Math.min(1, d / 2.5) * (tired ? 3.5 : 7);
        const k = Math.min(1, dt * speed / Math.max(0.01, d));
        this.pos.x += (tx - this.pos.x) * k; this.pos.z += (tz - this.pos.z) * k;
        const ground = app.world.groundAt(this.pos.x, this.pos.z, P.y + 1);
        const fy = g.userData.fly ? Math.max(ground, P.y) + g.userData.h * (tired ? 0.5 : 1) : Math.max(ground, -0.1);
        this.pos.y += (fy - this.pos.y) * Math.min(1, dt * 6);
        g.position.copy(this.pos);
        const moving = Math.min(1, d / 1.5);
        if (d > 0.15) { const want = Math.atan2(tx - this.pos.x, tz - this.pos.z); let diff = want - g.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); g.rotation.y += diff * Math.min(1, dt * 6); }
        animatePet(g, this.t, moving, tired);
        if (this.glow) this.glow.material.opacity = (tired ? 0.2 : 0.45) + Math.sin(this.t * 3) * 0.1;
    }
}
