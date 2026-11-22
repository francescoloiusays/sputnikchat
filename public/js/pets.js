// =====================================================================
//  GLI SPUTNIKPET: i modelli e il compagno che ti segue
//  Sette animaletti fatti a mano con forme semplici (niente modelli da
//  scaricare): il corvo, il cane alato, il fuoco fatuo, il fantasmino,
//  il gatto con gli stivali, il granchio del molo, l'anguilla di nebbia.
//  Occhi lucidi che sbattono, piume, zampe, code e chele che si muovono.
//  PetFollower: nel mondo viene dietro al suo padrone (il tuo, e quello
//  degli altri viandanti), vola o zampetta; se è stanco cammina piano.
//  Nei duelli sta al bordo del palco.
// =====================================================================
import * as THREE from 'three';
import { PETS, petTint, petTired } from './shared/pet.js';

const mats = new Map();
const M = (o) => { const k = JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ roughness: 0.7, ...o })); return mats.get(k); };
const G = { s: new Map() };
const sph = (r, w = 12, hh = 9) => { const k = `s${r},${w},${hh}`; if (!G.s.has(k)) G.s.set(k, new THREE.SphereGeometry(r, w, hh)); return G.s.get(k); };
const mesh = (geo, m, parent, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
// un occhio da cartone: il bulbo, l'iride, la pupilla e il puntino di luce. Ritorna il gruppo (per sbattere le palpebre)
function eye(parent, x, y, z, r, iris = '#111', { slit = false, white = true, glow = null } = {}) {
    const e = new THREE.Group(); e.position.set(x, y, z); parent.add(e);
    if (white) mesh(sph(r, 12, 9), M({ color: '#f6f2ea', roughness: 0.25 }), e);
    const ir = mesh(sph(r * (white ? 0.66 : 1), 12, 9), M({ color: iris, roughness: 0.15, emissive: glow || '#000', emissiveIntensity: glow ? 1.4 : 0 }), e, 0, 0, white ? r * 0.45 : 0);
    const pu = mesh(sph(r * (white ? 0.36 : 0.5), 10, 8), M({ color: '#050505', roughness: 0.1 }), e, 0, 0, r * (white ? 0.75 : 0.55));
    if (slit) pu.scale.set(0.35, 1.4, 1);
    mesh(sph(r * 0.18, 6, 5), new THREE.MeshBasicMaterial({ color: '#ffffff' }), e, r * 0.25, r * 0.3, r * (white ? 0.98 : 0.9));
    ir.castShadow = false;
    return e;
}
// due occhi simmetrici
const eyes = (parent, x, y, z, r, iris, o) => [-1, 1].map(s => eye(parent, s * x, y, z, r, iris, o));
// una piuma: un fuso schiacciato
const featherGeo = (() => { const g = new THREE.SphereGeometry(1, 8, 6); g.scale(0.5, 0.08, 1); return g; })();

// ogni modello: un gruppo alto più o meno mezzo metro, che guarda verso +z; userData.fly = vola, userData.parts = cose che si muovono
export function buildPet(sp, tint) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const P = PETS[sp] || PETS.corvo, col = tint || P.color, parts = {};
    let fly = true, h = 0.9;
    switch (sp) {
        case 'corvo': {
            const feather = M({ color: '#1c1822', roughness: 0.45, metalness: 0.25, emissive: '#1a0e2a', emissiveIntensity: 0.4 });
            const belly = M({ color: '#2c2636', roughness: 0.6 });
            const beakM = M({ color: '#4a4440', roughness: 0.35, metalness: 0.2 });
            const b = mesh(sph(0.14), feather, body); b.scale.set(1, 0.92, 1.35);
            mesh(sph(0.11), belly, body, 0, -0.04, 0.05).scale.set(0.85, 0.75, 1.1);
            const hd = mesh(sph(0.095), feather, body, 0, 0.11, 0.17);
            mesh(sph(0.05), feather, body, 0, 0.17, 0.13).scale.set(0.6, 0.8, 1.2);   // il ciuffo
            const up = mesh(new THREE.ConeGeometry(0.032, 0.13, 7), beakM, body, 0, 0.115, 0.29); up.rotation.x = Math.PI / 2 + 0.12; up.scale.z = 0.8;
            const lo = mesh(new THREE.ConeGeometry(0.024, 0.09, 7), beakM, body, 0, 0.085, 0.27); lo.rotation.x = Math.PI / 2 - 0.05; parts.jaw = lo;
            parts.eyes = eyes(hd, 0.052, 0.02, 0.06, 0.021, '#ffc21a', { white: false, glow: '#c88a00' });
            // le ali: tre penne lunghe ciascuna, su un perno che batte
            parts.wings = [-1, 1].map(s => {
                const w = new THREE.Group(); w.position.set(s * 0.12, 0.05, 0.02); body.add(w);
                for (let i = 0; i < 4; i++) { const f = mesh(featherGeo, feather, w, s * (0.08 + i * 0.045), -i * 0.006, -0.02 - i * 0.035); f.scale.setScalar(0.13 + i * 0.012); f.rotation.y = s * (0.25 + i * 0.22); }
                return w;
            });
            // la coda a ventaglio
            parts.tail = new THREE.Group(); parts.tail.position.set(0, 0.03, -0.2); body.add(parts.tail);
            for (let i = -2; i <= 2; i++) { const f = mesh(featherGeo, feather, parts.tail, i * 0.025, 0, -0.08); f.scale.setScalar(0.12); f.rotation.set(0.25, i * 0.22, 0); }
            for (const s of [-1, 1]) { const l = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 5), beakM, body, s * 0.04, -0.15, 0.02); l.rotation.x = 0.5; }
            break;
        }
        case 'cane': {
            const fur = M({ color: col, roughness: 0.95 }), cream = M({ color: '#f0dcc0', roughness: 0.95 }), dark = M({ color: '#3a2a20', roughness: 0.8 });
            const b = mesh(new THREE.CapsuleGeometry(0.11, 0.24, 6, 12), fur, body); b.rotation.x = Math.PI / 2;
            mesh(sph(0.09), cream, body, 0, -0.03, 0.12).scale.set(1, 0.9, 1.2);   // il petto chiaro
            const hd = new THREE.Group(); hd.position.set(0, 0.11, 0.22); body.add(hd); parts.head = hd;
            mesh(sph(0.115), fur, hd);
            const snout = mesh(sph(0.065), cream, hd, 0, -0.035, 0.09); snout.scale.set(0.95, 0.75, 1.15);
            mesh(sph(0.025), dark, hd, 0, -0.01, 0.165).scale.set(1.2, 0.85, 1);   // il naso
            const tongue = mesh(sph(0.025), M({ color: '#e86a7a', roughness: 0.4 }), hd, 0, -0.08, 0.12); tongue.scale.set(0.8, 0.3, 1.2);
            parts.eyes = eyes(hd, 0.048, 0.035, 0.085, 0.022, '#5a3418');
            parts.ears = [-1, 1].map(s => { const e = new THREE.Group(); e.position.set(s * 0.085, 0.07, -0.01); hd.add(e); const m = mesh(sph(0.05), dark, e, s * 0.02, -0.05, 0); m.scale.set(0.45, 1.3, 0.8); e.rotation.z = s * 0.35; return e; });
            // il collare con la medaglietta
            const coll = mesh(new THREE.TorusGeometry(0.085, 0.014, 6, 16), M({ color: '#a8242a', roughness: 0.5 }), body, 0, 0.06, 0.17); coll.rotation.x = Math.PI / 2 - 0.5;
            mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.006, 10), M({ color: '#e8c25a', metalness: 0.9, roughness: 0.25 }), body, 0, -0.01, 0.24).rotation.x = Math.PI / 2;
            parts.legs = [[-0.07, 0.12], [0.07, 0.12], [-0.07, -0.12], [0.07, -0.12]].map(([x, z]) => {
                const l = new THREE.Group(); l.position.set(x, -0.07, z); body.add(l);
                mesh(new THREE.CylinderGeometry(0.026, 0.024, 0.12, 7), fur, l, 0, -0.06, 0);
                mesh(sph(0.03), cream, l, 0, -0.125, 0.01).scale.set(1, 0.6, 1.3);
                return l;
            });
            parts.tail = new THREE.Group(); parts.tail.position.set(0, 0.06, -0.22); body.add(parts.tail);
            const tl = mesh(new THREE.CylinderGeometry(0.014, 0.03, 0.18, 7), fur, parts.tail, 0, 0.07, -0.03); tl.rotation.x = -0.6;
            // due ali da pipistrello, troppo piccole per un cane così: la membrana e le stecche
            const wingM = M({ color: '#4a3040', side: THREE.DoubleSide, roughness: 0.8, transparent: true, opacity: 0.92 });
            const wg = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.32, 0.13), new THREE.Vector2(0.28, -0.02), new THREE.Vector2(0.21, 0.04), new THREE.Vector2(0.15, -0.05), new THREE.Vector2(0.08, 0.02)]));
            parts.wings = [-1, 1].map(s => {
                const w = new THREE.Group(); w.position.set(s * 0.07, 0.09, 0.03); w.rotation.set(-Math.PI / 2, 0, s > 0 ? 0 : Math.PI); body.add(w);
                mesh(wg, wingM, w);
                for (const [x, y] of [[0.32, 0.13], [0.21, 0.04], [0.08, 0.02]]) { const len = Math.hypot(x, y), st = mesh(new THREE.CylinderGeometry(0.005, 0.005, len, 4), dark, w, x / 2, y / 2, 0.002); st.rotation.z = Math.atan2(y, x) - Math.PI / 2; }
                return w;
            });
            break;
        }
        case 'fatuo': {
            const core = mesh(new THREE.IcosahedronGeometry(0.1, 3), M({ color: col, emissive: col, emissiveIntensity: 2.4, roughness: 0.3, transparent: true, opacity: 0.85 }), body);
            mesh(new THREE.IcosahedronGeometry(0.055, 2), new THREE.MeshBasicMaterial({ color: '#ffffff' }), body);   // il cuore bianco
            core.castShadow = false;
            parts.flames = [0, 1, 2].map(i => { const f = mesh(new THREE.ConeGeometry(0.06 - i * 0.012, 0.24 - i * 0.04, 10), M({ color: col, emissive: col, emissiveIntensity: 1.8, transparent: true, opacity: 0.55 - i * 0.1, depthWrite: false }), body, (i - 1) * 0.03, 0.14, -i * 0.02); f.castShadow = false; return f; });
            parts.eyes = eyes(body, 0.036, 0.02, 0.085, 0.017, '#0a0a14', { white: false });
            // tre scintille che gli girano attorno
            parts.orbit = [0, 1, 2].map(i => { const s = mesh(sph(0.018, 6, 5), new THREE.MeshBasicMaterial({ color: col }), body); s.userData.a = i * 2.1; return s; });
            parts.glow = true;
            h = 1.1;
            break;
        }
        case 'fantasmino': {
            const sheet = M({ color: '#f2f0ff', emissive: '#9aa8ff', emissiveIntensity: 0.3, transparent: true, opacity: 0.86, side: THREE.DoubleSide, roughness: 0.4 });
            const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new THREE.Vector2(Math.sin(t * Math.PI * 0.55) * 0.15 + t * 0.04, 0.2 - t * 0.4)); }
            const lathe = new THREE.LatheGeometry(pts, 28);
            const lp = lathe.attributes.position;
            for (let i = 0; i < lp.count; i++) if (lp.getY(i) < -0.12) { const a = Math.atan2(lp.getZ(i), lp.getX(i)); lp.setY(i, lp.getY(i) + Math.sin(a * 7) * 0.035); }
            lathe.computeVertexNormals();
            parts.sheet = mesh(lathe, sheet, body);
            // le braccine
            parts.arms = [-1, 1].map(s => { const a = new THREE.Group(); a.position.set(s * 0.14, -0.02, 0.02); body.add(a); const m = mesh(sph(0.045), sheet, a, s * 0.03, -0.02, 0); m.scale.set(1.2, 0.55, 0.7); return a; });
            parts.eyes = [-1, 1].map(s => { const e = new THREE.Group(); e.position.set(s * 0.055, 0.075, 0.14); body.add(e); const m = mesh(sph(0.03), M({ color: '#141018', roughness: 0.2 }), e); m.scale.set(0.8, 1.3, 0.5); mesh(sph(0.008, 5, 4), new THREE.MeshBasicMaterial({ color: '#fff' }), e, 0.008, 0.016, 0.014); return e; });
            for (const s of [-1, 1]) { const c = mesh(new THREE.CircleGeometry(0.022, 12), M({ color: '#ff9ab8', transparent: true, opacity: 0.6, depthWrite: false }), body, s * 0.09, 0.03, 0.142); c.rotation.y = s * 0.45; }   // le guance rosa
            const mouth = mesh(new THREE.CircleGeometry(0.02, 12), M({ color: '#141018' }), body, 0, 0.005, 0.152); mouth.scale.y = 1.3; parts.mouth = mouth;
            parts.glow = true; h = 1.0;
            break;
        }
        case 'gatto': {
            fly = false; h = 0;
            const fur = M({ color: col, roughness: 0.95 }), stripe = M({ color: '#b8601a', roughness: 0.95 }), boot = M({ color: '#4a2a14', roughness: 0.55 }), white = M({ color: '#f2e6d6', roughness: 0.95 }), pink = M({ color: '#f08a9a', roughness: 0.6 });
            const b = mesh(new THREE.CapsuleGeometry(0.09, 0.2, 6, 12), fur, body, 0, 0.2, 0); b.rotation.x = Math.PI / 2;
            for (let i = 0; i < 3; i++) { const st = mesh(new THREE.TorusGeometry(0.088, 0.012, 5, 14, Math.PI), stripe, body, 0, 0.2, -0.08 + i * 0.07); st.rotation.y = Math.PI / 2; st.rotation.z = Math.PI / 2; }   // le strisce
            mesh(sph(0.075), white, body, 0, 0.17, 0.1).scale.set(0.9, 1, 1.1);   // il petto bianco
            // la mantellina rossa
            const cape = mesh(new THREE.CylinderGeometry(0.06, 0.13, 0.2, 14, 1, true, Math.PI * 0.55, Math.PI * 0.9), M({ color: '#9a1a24', side: THREE.DoubleSide, roughness: 0.7 }), body, 0, 0.22, 0.02); cape.rotation.x = Math.PI / 2 - 0.2; parts.cape = cape;
            const hd = new THREE.Group(); hd.position.set(0, 0.33, 0.16); body.add(hd); parts.head = hd;
            mesh(sph(0.1), fur, hd).scale.set(1.08, 0.95, 1);
            const muz = mesh(sph(0.045), white, hd, 0, -0.03, 0.08); muz.scale.set(1.25, 0.8, 0.8);
            mesh(new THREE.ConeGeometry(0.012, 0.016, 3), pink, hd, 0, -0.008, 0.115).rotation.x = Math.PI / 2 + 1.2;
            parts.eyes = eyes(hd, 0.043, 0.025, 0.075, 0.021, '#7adf3a', { slit: true });
            for (const s of [-1, 1]) {
                const e = new THREE.Group(); e.position.set(s * 0.06, 0.085, 0); e.rotation.z = -s * 0.25; hd.add(e);
                mesh(new THREE.ConeGeometry(0.038, 0.085, 4), fur, e, 0, 0.03, 0);
                mesh(new THREE.ConeGeometry(0.022, 0.05, 4), pink, e, 0, 0.025, 0.012);
                for (let k = 0; k < 3; k++) { const w = mesh(new THREE.BoxGeometry(0.11, 0.002, 0.002), white, hd, s * 0.08, -0.03 + k * 0.012, 0.09); w.rotation.z = s * (k - 1) * 0.15; }   // i baffi
            }
            // il cappello piumato, di sbieco
            const hat = new THREE.Group(); hat.position.set(0.012, 0.1, -0.005); hat.rotation.z = 0.22; hd.add(hat);
            mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.012, 18), boot, hat);
            mesh(new THREE.CylinderGeometry(0.052, 0.062, 0.065, 14), boot, hat, 0, 0.035, 0);
            mesh(new THREE.TorusGeometry(0.058, 0.007, 5, 16), M({ color: '#e8c25a', metalness: 0.8, roughness: 0.3 }), hat, 0, 0.012, 0).rotation.x = Math.PI / 2;
            const plume = mesh(sph(0.05), M({ color: '#f2f4ff', roughness: 0.9 }), hat, -0.06, 0.07, -0.01); plume.scale.set(0.3, 1.7, 0.55); plume.rotation.z = 0.7; parts.plume = plume;
            // la cintura con la fibbia
            const belt = mesh(new THREE.TorusGeometry(0.092, 0.01, 5, 16), boot, body, 0, 0.2, 0.0); belt.rotation.y = Math.PI / 2;
            parts.legs = [[-0.055, 0.1], [0.055, 0.1], [-0.055, -0.1], [0.055, -0.1]].map(([x, z]) => {
                const l = new THREE.Group(); l.position.set(x, 0.16, z); body.add(l);
                mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.08, 7), fur, l, 0, -0.04, 0);
                mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.08, 9), boot, l, 0, -0.11, 0);   // gli stivali, rubati al Traghettatore
                mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.02, 9), boot, l, 0, -0.065, 0);   // il risvolto
                mesh(sph(0.032), boot, l, 0, -0.15, 0.018).scale.set(0.9, 0.5, 1.4);
                return l;
            });
            // la coda: una curva che ondeggia
            const tc = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.08, -0.06), new THREE.Vector3(0, 0.18, -0.06), new THREE.Vector3(0.03, 0.24, 0)]);
            parts.tail = new THREE.Group(); parts.tail.position.set(0, 0.22, -0.18); body.add(parts.tail);
            mesh(new THREE.TubeGeometry(tc, 16, 0.016, 7, false), fur, parts.tail);
            mesh(sph(0.02), stripe, parts.tail, 0.03, 0.24, 0);
            break;
        }
        case 'granchio': {
            fly = false; h = 0;
            const shell = M({ color: col, roughness: 0.4, metalness: 0.1 }), under = M({ color: '#f0b8a0', roughness: 0.6 }), spot = M({ color: '#7a1a12', roughness: 0.5 });
            const b = mesh(sph(0.13, 16, 10), shell, body, 0, 0.12, 0); b.scale.set(1.35, 0.55, 1);
            mesh(sph(0.12, 14, 8), under, body, 0, 0.09, 0).scale.set(1.25, 0.35, 0.92);
            for (const [x, z, r] of [[-0.07, 0.03, 0.022], [0.07, 0.03, 0.022], [0, -0.04, 0.03], [-0.1, -0.04, 0.015], [0.1, -0.04, 0.015]]) mesh(sph(r, 8, 6), spot, body, x, 0.175 - Math.abs(x) * 0.25, z).scale.y = 0.35;
            parts.eyes = [-1, 1].map(s => {
                const st = mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.08, 6), shell, body, s * 0.04, 0.2, 0.09); st.rotation.x = 0.2;
                return eye(body, s * 0.04, 0.245, 0.1, 0.02, '#111', { white: true });
            });
            parts.claws = []; parts.pincers = []; parts.legs = [];
            for (const s of [-1, 1]) {
                const arm = new THREE.Group(); arm.position.set(s * 0.15, 0.12, 0.08); body.add(arm);
                const up = mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.11, 7), shell, arm, s * 0.04, 0.02, 0.02); up.rotation.z = s * 1.0;
                const hand = new THREE.Group(); hand.position.set(s * 0.09, 0.05, 0.08); arm.add(hand);
                mesh(sph(0.05, 12, 8), shell, hand).scale.set(1, 0.7, 1.3);
                const fix = mesh(new THREE.ConeGeometry(0.02, 0.07, 6), shell, hand, 0, 0.01, 0.07); fix.rotation.x = Math.PI / 2;
                const mob = new THREE.Group(); mob.position.set(0, -0.015, 0.035); hand.add(mob);
                const mm = mesh(new THREE.ConeGeometry(0.016, 0.06, 6), shell, mob, 0, 0, 0.03); mm.rotation.x = Math.PI / 2;
                parts.claws.push(arm); parts.pincers.push(mob);
                for (let i = 0; i < 3; i++) {   // tre zampe per lato, in due pezzi
                    const lg = new THREE.Group(); lg.position.set(s * 0.13, 0.1, -0.06 + i * 0.055); lg.rotation.z = s * 0.6; body.add(lg);
                    mesh(new THREE.CylinderGeometry(0.011, 0.01, 0.08, 5), shell, lg, s * 0.0, -0.0, 0).rotation.z = s * Math.PI / 2;
                    const lo = mesh(new THREE.CylinderGeometry(0.009, 0.004, 0.09, 5), shell, lg, s * 0.06, -0.04, 0); lo.rotation.z = s * 0.5;
                    parts.legs.push(lg);
                }
            }
            break;
        }
        case 'anguilla': {
            // un corpo a segmenti che si stringe verso la coda, con le pinne e le macchie che brillano
            const skin = M({ color: col, emissive: col, emissiveIntensity: 0.5, transparent: true, opacity: 0.82, roughness: 0.2 });
            const glowS = new THREE.MeshBasicMaterial({ color: '#e8f4ff' });
            const finM = M({ color: col, emissive: col, emissiveIntensity: 0.8, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
            parts.segs = [];
            let parent = body;
            for (let i = 0; i < 12; i++) {
                const s = new THREE.Group(); s.position.set(0, 0, i ? -0.05 : 0.22); parent.add(s); parts.segs.push(s);
                const r = 0.042 * (1 - i / 14);
                mesh(sph(r, 10, 8), skin, s).scale.set(0.9, 1, 1.6);
                if (i % 2 === 1) mesh(sph(r * 0.25, 5, 4), glowS, s, 0, r * 0.75, 0);
                if (i > 1 && i < 11) { const f = mesh(new THREE.PlaneGeometry(0.004, 0.05), finM, s, 0, r + 0.018, 0); f.scale.set(1, 1 - i / 14, 1); f.rotation.y = Math.PI / 2; f.scale.x = 14; }
                parent = s;
            }
            const hd = parts.segs[0];
            mesh(sph(0.05, 12, 9), skin, hd, 0, 0.005, 0.04).scale.set(0.95, 0.85, 1.3);
            parts.eyes = eyes(hd, 0.028, 0.025, 0.07, 0.014, '#ffffff', { white: false, glow: '#bfe0ff' });
            for (const s of [-1, 1]) { const f = mesh(new THREE.CircleGeometry(0.03, 8, 0, Math.PI), finM, hd, s * 0.045, 0, 0.0); f.rotation.set(0, s * Math.PI / 2, s * 0.6); }   // le pinnette
            parts.glow = true;
            break;
        }
    }
    g.userData = { fly, h, parts, sp, glowCol: parts.glow ? col : null, blink: Math.random() * 4 };
    g.traverse(o => { if (o.isMesh && o.castShadow !== false) o.castShadow = true; });
    return g;
}

// animazione: battito d'ali, fiammelle, zampe, coda, palpebre; t = tempo, moving = 0..1
export function animatePet(g, t, moving, tired) {
    const U = g.userData, P = U.parts, body = g.children[0];
    const slow = tired ? 0.4 : 1, mv = moving > 0.1;
    if (U.fly) body.position.y = Math.sin(t * 3 * slow) * 0.05;
    // gli occhi sbattono ogni tanto
    if (P.eyes) { const b = (t + U.blink) % 4.2, s = b < 0.12 ? 0.15 : tired ? 0.55 : 1; for (const e of P.eyes) e.scale.y = s; }
    if (P.wings) P.wings.forEach((w, i) => {
        const a = Math.sin(t * (mv ? 16 : 6) * slow);
        if (U.sp === 'cane') w.rotation.y = (i ? -1 : 1) * (0.1 + a * 0.6);
        else w.rotation.z = (i ? -1 : 1) * (0.15 + a * 0.6);
    });
    if (P.flames) P.flames.forEach((f, i) => { f.scale.y = 1 + Math.sin(t * (9 + i * 3) + i) * 0.25; f.rotation.z = Math.sin(t * (6 + i) + i * 2) * 0.25; f.position.y = 0.13 + i * 0.02 + Math.sin(t * 5 + i) * 0.01; });
    if (P.orbit) P.orbit.forEach((s, i) => { const a = s.userData.a + t * (2 + i * 0.4); s.position.set(Math.cos(a) * 0.17, Math.sin(t * 2 + i) * 0.06, Math.sin(a) * 0.17); });
    if (P.arms) P.arms.forEach((a, i) => { a.rotation.z = (i ? -1 : 1) * (0.2 + Math.sin(t * 3 + i) * 0.25); });
    if (P.sheet) P.sheet.rotation.y = Math.sin(t * 1.3) * 0.15;
    if (P.mouth) P.mouth.scale.y = 1.2 + Math.sin(t * 2.2) * 0.3;
    if (P.ears) P.ears.forEach((e, i) => { e.rotation.x = Math.sin(t * (mv ? 10 : 2) + i) * (mv ? 0.35 : 0.1); });
    if (P.head) P.head.rotation.y = Math.sin(t * 0.7) * 0.25 * (mv ? 0.3 : 1);
    if (P.legs && (U.sp === 'gatto' || U.sp === 'cane')) P.legs.forEach((l, i) => { l.rotation.x = mv || U.sp === 'cane' ? Math.sin(t * (U.sp === 'cane' && !mv ? 3 : 12) + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * (mv ? 0.6 : 0.25) : 0; });
    if (P.tail) {
        if (U.sp === 'cane') P.tail.rotation.y = Math.sin(t * (tired ? 4 : 14)) * 0.6;          // scodinzola
        else if (U.sp === 'corvo') P.tail.rotation.x = Math.sin(t * 2) * 0.1;
        else P.tail.rotation.z = Math.sin(t * 2.4) * 0.4;
    }
    if (P.cape) P.cape.rotation.z = Math.sin(t * 3) * (mv ? 0.15 : 0.05);
    if (P.plume) P.plume.rotation.x = Math.sin(t * 4) * 0.12;
    if (P.jaw) P.jaw.rotation.x = Math.PI / 2 - 0.05 + Math.max(0, Math.sin(t * 1.7)) * 0.15 * (Math.sin(t * 0.4) > 0.6 ? 1 : 0);
    if (P.legs && U.sp === 'granchio') P.legs.forEach((l, i) => { l.rotation.x = mv ? Math.sin(t * 16 + i * 1.3) * 0.45 : 0; });
    if (P.claws) P.claws.forEach((c, i) => { c.rotation.y = Math.sin(t * 2 + i) * 0.3; });
    if (P.pincers) P.pincers.forEach((p, i) => { p.rotation.x = 0.1 + Math.max(0, Math.sin(t * 3 + i * 1.7)) * 0.45; });
    if (P.segs) P.segs.forEach((s, i) => { if (i) s.rotation.y = Math.sin(t * 4 * slow - i * 0.6) * 0.18; });
    // stanco: si piega un poco in avanti
    body.rotation.x = tired ? 0.35 : 0;
}

// --- il compagno nel mondo: il tuo, o quello di un altro viandante ---
// src: da dove prende il pet e il padrone; senza src è il tuo
export class PetFollower {
    constructor(app, src = null) {
        this.app = app;
        this.src = src || {
            pet: () => { const me = app.me; return me && !me.offline ? me.pet : null; },
            element: () => app.me?.card?.element,
            pos: () => app.player?.pos, yaw: () => app.player?.yaw || 0,
            show: () => app.mode === 'world' || app.mode === 'fish', fishing: () => app.mode === 'fish',
        };
        this.g = null; this.key = null; this.t = Math.random() * 10;
        this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    }
    // ricostruisce il modello se è cambiata la specie (o il colore della carta, o gli incanti)
    sync() {
        const pet = this.src.pet(), el = this.src.element();
        const key = pet ? `${pet.sp}:${el || ''}:${pet.ench || 0}` : null;
        if (key === this.key) return;
        this.key = key;
        this.drop();
        if (!pet) return;
        this.g = buildPet(pet.sp, petTint(pet, el));
        if (this.g.userData.glowCol) {
            this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.app.world.glowTex, color: this.g.userData.glowCol, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
            this.glow.scale.set(0.9, 0.9, 1); this.g.add(this.glow);
        }
        // gli incanti: un alone dorato che pulsa, più grande a ogni incanto
        if (pet.ench > 0) {
            this.aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.app.world.glowTex, color: '#ffd86a', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
            const s = 0.6 + pet.ench * 0.1; this.aura.scale.set(s, s, 1); this.aura.position.y = 0.12; this.g.add(this.aura);
        }
        const P = this.src.pos();
        if (P) this.pos.set(P.x - 1, P.y, P.z - 1);
        this.app.scene.add(this.g);
    }
    drop() {
        if (this.g) { this.app.scene.remove(this.g); this.g.traverse(o => { if (o.isSprite) o.material.dispose(); }); }
        this.g = null; this.glow = null; this.aura = null;
    }
    dispose() { this.drop(); this.key = null; }
    update(dt) {
        this.sync();
        const g = this.g, app = this.app;
        if (!g) return;
        const P = this.src.pos();
        g.visible = !!P && this.src.show();
        if (!g.visible) return;
        this.t += dt;
        const yaw = this.src.yaw(), pet = this.src.pet(), tired = petTired(pet), fishing = this.src.fishing?.();
        // sta dietro, un po' di lato; al molo, mentre peschi, si siede accanto
        const side = fishing ? 1.1 : 0.9, back = fishing ? 0.2 : 1.3;
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
        if (this.aura) this.aura.material.opacity = 0.18 + Math.sin(this.t * 2) * 0.08;
    }
}
