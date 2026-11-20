// =====================================================================
//  IL FARO SPENTO (Libro II)
//  Uno scoglio a nord-est della laguna, con un faro in rovina e un molo.
//  Il terreno sta nella mappa delle altezze (world.js, WORLD.FARO); qui
//  ci sono solo le costruzioni, che si caricano quando ti avvicini.
//  La lanterna in cima non illumina: pulsa, come se qualcuno ci
//  respirasse dentro. La porta è chiusa da trecento anni.
// =====================================================================
import * as THREE from 'three';
import { WORLD } from '../world.js';

// dove si scende dalla barca, e da che parte si guarda
export function faroArrival() {
    const F = WORLD.FARO, D = F.dock, [dx, dz] = D.dir, r = D.r1 - 3.5;
    return { x: F.x + dx * r, z: F.z + dz * r, yaw: Math.atan2(-dx, -dz), camYaw: Math.atan2(dx, dz) };
}

export function buildFaro(app) {
    const W = app.world, F = WORLD.FARO, D = F.dock, [dx, dz] = D.dir;
    const X = F.x, Z = F.z, px = -dz, pz = dx;          // (px, pz) = di lato rispetto al molo
    const g = new THREE.Group();
    g.name = 'regione: Faro Spento';
    const disposables = [], colliders = [], interactables = [], fires = [];
    const mat = (o) => { const m = new THREE.MeshStandardMaterial(o); disposables.push(m); return m; };
    const geo = (x) => { disposables.push(x); return x; };
    const add = (mesh, x, y, z) => { mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; };
    const box = (x, z, w, d, y0, y1, ry, opts = {}) => { const c = { type: 'box', x, z, hw: w / 2, hd: d / 2, cos: Math.cos(ry), sin: Math.sin(ry), y0, y1, region: 'faro', ...opts }; W.colliders.push(c); colliders.push(c); };
    const circ = (x, z, r, y0, y1) => { const c = { type: 'circ', x, z, r, y0, y1, region: 'faro' }; W.colliders.push(c); colliders.push(c); };

    const pad = W.terrainAt(X, Z);

    // --- la torre: fasce bianche e rosso scuro, come i fari veri, ma scrostate ---
    const white = mat({ color: '#b9b2c4', roughness: 0.88 }), red = mat({ color: '#5a1f2a', roughness: 0.85 });
    const stone = mat({ color: '#4a4552', roughness: 0.95, flatShading: true });
    // basamento basso: ci si sale sopra (è un gradino) e si arriva alla porta
    const PL = 0.3;
    add(new THREE.Mesh(geo(new THREE.CylinderGeometry(3.4, 3.6, PL + 0.5, 14)), stone), X, pad + (PL - 0.5) / 2, Z);
    circ(X, Z, 3.45, pad - 2, pad + PL);                  // il basamento: si cammina sopra
    const blockers = [];
    let y = pad + PL;
    for (let i = 0; i < 5; i++) {
        const h = 3.2, r0 = 2.6 - i * 0.28, r1 = r0 - 0.28;
        blockers.push(add(new THREE.Mesh(geo(new THREE.CylinderGeometry(r1, r0, h, 20)), i % 2 ? red : white), X, y + h / 2, Z));
        y += h;
    }
    circ(X, Z, 2.75, pad + PL - 0.1, y + 5);              // la torre: non si attraversa
    // porta, rivolta verso il molo, all'altezza del basamento
    const iron = mat({ color: '#1c1a20', metalness: 0.8, roughness: 0.45 });
    const wood = mat({ color: '#3a281b', roughness: 0.9 });
    const doorX = X + dx * 2.6, doorZ = Z + dz * 2.6, doorRy = Math.atan2(dx, dz), dy = pad + PL;
    const door = add(new THREE.Mesh(geo(new THREE.BoxGeometry(1.25, 2.2, 0.2)), wood), doorX, dy + 1.1, doorZ);
    door.rotation.y = doorRy;
    const arch = add(new THREE.Mesh(geo(new THREE.TorusGeometry(0.72, 0.1, 6, 12, Math.PI)), stone), doorX + dx * 0.06, dy + 2.2, doorZ + dz * 0.06);
    arch.rotation.y = doorRy;
    const lock = add(new THREE.Mesh(geo(new THREE.TorusGeometry(0.11, 0.035, 6, 12)), iron), doorX + dx * 0.12, dy + 1.05, doorZ + dz * 0.12);
    lock.rotation.y = doorRy;
    interactables.push({ id: 'faro_porta', x: doorX + dx * 1.1, z: doorZ + dz * 1.1, y: dy, r: 2.2, label: 'La porta del faro' });

    // ballatoio, gabbia e cupola
    add(new THREE.Mesh(geo(new THREE.CylinderGeometry(2.2, 2.2, 0.3, 24)), iron), X, y + 0.15, Z);
    const railing = add(new THREE.Mesh(geo(new THREE.TorusGeometry(2.1, 0.04, 4, 32)), iron), X, y + 1.0, Z);
    railing.rotation.x = Math.PI / 2;
    add(new THREE.Mesh(geo(new THREE.CylinderGeometry(1.15, 1.15, 2.2, 8, 1, true)), mat({ color: '#2a2630', metalness: 0.7, roughness: 0.5, wireframe: true })), X, y + 1.4, Z);
    add(new THREE.Mesh(geo(new THREE.ConeGeometry(1.5, 1.4, 8)), iron), X, y + 3.2, Z);

    // il cuore della lanterna: un bagliore verde che respira
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: '#7affd8', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
    disposables.push(core.material);
    core.position.set(X, y + 1.4, Z); core.scale.set(7, 7, 1);
    g.add(core);
    const halo = new THREE.Sprite(core.material.clone());
    disposables.push(halo.material);
    halo.position.copy(core.position); halo.scale.set(26, 26, 1);
    g.add(halo);
    const beacon = new THREE.PointLight('#7affd8', 6, 26, 1.6);
    beacon.position.set(X, y + 1.4, Z);
    g.add(beacon);

    // --- il molo: assi su pali, verso la laguna e il castello ---
    const len = D.r1 - D.r0, mx = X + dx * (D.r0 + len / 2), mz = Z + dz * (D.r0 + len / 2), dockRy = Math.atan2(dx, dz);
    const deck = add(new THREE.Mesh(geo(new THREE.BoxGeometry(D.w, 0.16, len)), mat({ color: '#4a3424', roughness: 0.95 })), mx, D.y - 0.08, mz);
    deck.rotation.y = dockRy;
    box(mx, mz, D.w, len, -10, D.y, Math.atan2(-dx, dz), { deck: true });
    const postG = geo(new THREE.CylinderGeometry(0.11, 0.13, 1, 6));
    for (let r = D.r0 + 1; r <= D.r1; r += 2.5) for (const s of [-1, 1]) {
        const x = X + dx * r + px * s * (D.w / 2 - 0.1), z = Z + dz * r + pz * s * (D.w / 2 - 0.1);
        const base = Math.min(W.terrainAt(x, z), -1);
        const p = add(new THREE.Mesh(postG, wood), x, (base + D.y + 0.5) / 2, z);
        p.scale.y = D.y + 0.5 - base;
    }

    // la barca ormeggiata, per tornare al Molo
    const bx = X + dx * (D.r1 - 1.8) + px * (D.w / 2 + 1.1), bz = Z + dz * (D.r1 - 1.8) + pz * (D.w / 2 + 1.1);
    const boat = new THREE.Group();
    const hullG = geo(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2));
    const hull = new THREE.Mesh(hullG, wood); hull.scale.set(0.85, 0.5, 2.3); hull.castShadow = true; boat.add(hull);
    const seat = new THREE.Mesh(geo(new THREE.BoxGeometry(1.4, 0.08, 0.35)), wood); seat.position.y = -0.12; boat.add(seat);
    const oar = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 5)), wood); oar.rotation.z = 1.1; oar.position.set(0.6, 0.05, 0.3); boat.add(oar);
    boat.position.set(bx, 0.15, bz); boat.rotation.y = dockRy;
    g.add(boat);
    interactables.push({ id: 'barca', dest: 'molo', x: X + dx * (D.r1 - 1.8), z: Z + dz * (D.r1 - 1.8), y: D.y, r: 2.4, label: 'Torna al Molo in barca' });

    // --- torce sul molo e davanti alla porta ---
    const torch = (x, z, h) => {
        const base = Math.max(W.terrainAt(x, z), h === 'dock' ? D.y : -9);
        const hh = 1.6;
        add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.05, 0.08, hh, 6)), wood), x, base + hh / 2, z);
        const fire = W.fires.make(0.9);
        fire.position.set(x, base + hh + 0.05, z);
        g.add(fire); fires.push(fire);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: '#ff7a1a', transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
        disposables.push(glow.material);
        glow.position.set(x, base + hh + 0.4, z); glow.scale.set(2.3, 2.3, 1);
        g.add(glow);
        const l = new THREE.PointLight('#ff7a2a', 18, 14, 1.5);
        l.position.set(x, base + hh + 0.4, z);
        g.add(l);
        circ(x, z, 0.15, base, base + hh);
    };
    for (const s of [-1, 1]) torch(X + dx * (D.r0 + 2) + px * s * (D.w / 2 + 0.25), Z + dz * (D.r0 + 2) + pz * s * (D.w / 2 + 0.25), 'dock');
    torch(X + dx * (D.r1 - 0.4) + px * (D.w / 2 - 0.2), Z + dz * (D.r1 - 0.4) + pz * (D.w / 2 - 0.2), 'dock');
    for (const s of [-1, 1]) torch(doorX + dx * 1.6 + px * s * 1.6, doorZ + dz * 1.6 + pz * s * 1.6, 'ground');

    // --- scogli intorno ---
    const rockM = mat({ color: '#3b3644', roughness: 0.95, flatShading: true });
    for (let i = 0; i < 9; i++) {
        const a = i * 0.71 + 0.4, rr = F.r + 1 + (i % 3) * 1.6, s = 1.4 + (i % 4) * 0.7;
        const x = X + Math.cos(a) * rr, z = Z + Math.sin(a) * rr;
        if (Math.abs((x - X) * px + (z - Z) * pz) < 9 && (x - X) * dx + (z - Z) * dz > 0) continue;   // lontano dal molo
        const r = add(new THREE.Mesh(geo(new THREE.DodecahedronGeometry(s, 0)), rockM), x, Math.max(-0.4, W.terrainAt(x, z) + s * 0.25), z);
        r.rotation.set(a, a * 2, 0);
    }

    // il bagliore respira
    let t = 0;
    const tick = (dt) => {
        t += dt;
        const b = 0.5 + 0.5 * Math.sin(t * 0.9) * Math.sin(t * 0.37 + 1);
        core.material.opacity = 0.35 + b * 0.6;
        halo.material.opacity = 0.08 + b * 0.25;
        beacon.intensity = 2 + b * 7;
        boat.position.y = 0.15 + Math.sin(t * 1.3) * 0.05;
        boat.rotation.z = Math.sin(t * 0.9) * 0.03;
    };
    W.animated.push(tick);
    W.interactables.push(...interactables);
    W.cameraBlockers.push(...blockers);          // la telecamera non entra nella torre

    return {
        group: g,
        dispose() {
            const i = W.animated.indexOf(tick);
            if (i >= 0) W.animated.splice(i, 1);
            const drop = (arr, items) => { for (let k = arr.length - 1; k >= 0; k--) if (items.includes(arr[k])) arr.splice(k, 1); };
            drop(W.colliders, colliders);
            drop(W.interactables, interactables);
            drop(W.cameraBlockers, blockers);
            for (const f of fires) { const k = W.fires.mats.indexOf(f.material); if (k >= 0) W.fires.mats.splice(k, 1); f.geometry.dispose(); f.material.dispose(); }
            for (const d of disposables) d.dispose();
        },
    };
}
