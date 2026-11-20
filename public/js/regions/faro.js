// =====================================================================
//  IL FARO SPENTO (Libro II)
//  Uno scoglio a nord-est della laguna, con un faro in rovina e un molo.
//  Il terreno sta nella mappa delle altezze (world.js, WORLD.FARO); qui
//  ci sono solo le costruzioni, che si caricano quando ti avvicini.
//  La lanterna in cima non illumina: pulsa, come se qualcuno ci
//  respirasse dentro. La porta è chiusa da trecento anni.
// =====================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
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
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: '#7affd8', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8, fog: false }));   // la luce di un faro buca la nebbia
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

    // --- il molo: lo stesso del Molo dell'isola grande (world.js, buildDock) ---
    // costruito «dritto» lungo z e poi girato verso la laguna: assi da 48 cm ogni 55, pali ogni 3,5 m
    const len = D.r1 - D.r0, dockRy = Math.atan2(dx, dz), w = D.w, yd = D.y - 0.05;
    const toWorld = new THREE.Matrix4().makeRotationY(dockRy).setPosition(X + dx * D.r0, 0, Z + dz * D.r0);
    const dockG = [];
    for (let z = 0; z < len; z += 0.55) dockG.push(new THREE.BoxGeometry(w, 0.1, 0.48).translate(0, yd, z + 0.24));
    for (const s of [-1, 1]) for (let z = 0; z <= len; z += 3.5) dockG.push(new THREE.CylinderGeometry(0.12, 0.14, 4.2, 12).translate(s * (w / 2), yd - 1.8, z));
    // il posto del pescatore: secchio, cassa e due canne appoggiate
    dockG.push(new THREE.CylinderGeometry(0.2, 0.16, 0.34, 18).translate(0.85, yd + 0.22, len - 1.1));
    dockG.push(new THREE.BoxGeometry(0.6, 0.45, 0.5).translate(0.8, yd + 0.28, len - 2.1));
    for (const ox of [0.62, 0.78]) dockG.push(new THREE.CylinderGeometry(0.015, 0.025, 2.3, 10).rotateX(-0.28).translate(ox, yd + 1.1, len - 2.55));
    // il palo della torcia in fondo
    dockG.push(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 12).translate(-w / 2 - 0.1, yd + 0.8, len));
    const dockGeo = geo(mergeGeometries(dockG.map(q => q.applyMatrix4(toWorld))));
    for (const q of dockG) q.dispose();
    const dock = new THREE.Mesh(dockGeo, W.matWood);
    dock.castShadow = dock.receiveShadow = true;
    g.add(dock);
    const L = (lx, lz) => new THREE.Vector3(lx, 0, lz).applyMatrix4(toWorld);   // da coordinate del molo a coordinate del mondo
    const mid = L(0, len / 2);
    box(mid.x, mid.z, w, len + 0.5, -10, D.y, Math.atan2(-dx, dz), { deck: true });
    const crate = L(0.8, len - 2.1);
    box(crate.x, crate.z, 0.6, 0.5, D.y, D.y + 0.5, Math.atan2(-dx, dz));

    // la barchetta, uguale a quella del Molo: serve per tornare
    const boat = new THREE.Group();
    const hullMat = mat({ color: '#3a2618', side: THREE.DoubleSide, roughness: 0.9 });
    const hull = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.9, 0.6, 3.6, 18, 1, true, 0, Math.PI)), hullMat);
    hull.rotation.set(Math.PI / 2, 0, Math.PI); hull.scale.set(1, 1, 0.5); hull.castShadow = true;
    boat.add(hull);
    const bp = L(2.6, len - 3);
    boat.position.set(bp.x, 0.15, bp.z); boat.rotation.y = dockRy + 0.1;
    g.add(boat);
    const bi = L(1.0, len - 3);
    interactables.push({ id: 'barca', dest: 'molo', x: bi.x, z: bi.z, y: D.y, r: 2.2, label: 'Torna al Molo in barca' });

    // --- torce: quella col bacile in fondo al molo, come al Molo, e due davanti alla porta ---
    const torch = (x, y0, z, scale, cup) => {
        const fire = W.fires.make(scale);
        fire.position.set(x, y0 - scale * 0.42, z);
        g.add(fire); fires.push(fire);
        if (cup) add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.16 * scale, 0.09 * scale, 0.14 * scale, 10)), iron), x, y0 - scale * 0.46, z);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: '#ff7a1a', transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
        disposables.push(glow.material);
        glow.position.set(x, y0, z); glow.scale.set(scale * 2.6, scale * 2.6, 1);
        g.add(glow); glows.push(glow);
        const l = new THREE.PointLight('#ff7a2a', 26, 18, 1.5);
        l.position.set(x, y0 + 0.3, z);
        g.add(l);
    };
    const glows = [];
    const tEnd = L(-w / 2 - 0.1, len);
    torch(tEnd.x, yd + 1.95, tEnd.z, 0.9, true);
    for (const s of [-1, 1]) {
        const x = doorX + dx * 1.6 + px * s * 1.6, z = doorZ + dz * 1.6 + pz * s * 1.6, b = W.terrainAt(x, z);
        add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.06, 0.09, 2.2, 6)), wood), x, b + 1.1, z);
        add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.22, 0.12, 0.2, 8)), iron), x, b + 2.2, z);
        torch(x, b + 2.62, z, 1.1, false);
        circ(x, z, 0.2, b, b + 2.2);
    }

    // --- il fascio del faro: due lame di luce che girano, come un faro vero ---
    const LY = y + 1.4;
    const beamMat = new THREE.ShaderMaterial({
        uniforms: { uI: { value: 0.6 }, uCol: { value: new THREE.Color('#c8fff0') } },
        vertexShader: `varying float vT; varying vec3 vN; varying vec3 vV;
            void main(){ vT = position.x / 80.0; vec4 mv = modelViewMatrix * vec4(position, 1.0);
                vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform float uI; uniform vec3 uCol; varying float vT; varying vec3 vN; varying vec3 vV;
            void main(){ float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
                float a = (0.35 + 0.65 * edge) * pow(1.0 - clamp(vT, 0.0, 1.0), 1.4) * smoothstep(0.0, 0.04, vT) * uI;
                gl_FragColor = vec4(uCol * a, a); }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    });
    disposables.push(beamMat);
    const beamGeo = geo(new THREE.CylinderGeometry(7, 0.35, 80, 28, 1, true).translate(0, 40, 0).rotateZ(-Math.PI / 2).rotateZ(-0.04));
    const spin = new THREE.Group();
    spin.position.set(X, LY, Z);
    for (const a of [0, Math.PI]) { const b = new THREE.Mesh(beamGeo, beamMat); b.rotation.y = a; b.frustumCulled = false; b.renderOrder = 6; spin.add(b); }
    g.add(spin);

    // --- le onde che si rompono sullo scoglio (più alte e più bianche di notte) ---
    // la riva si trova girando intorno all'isolotto e cercando dove il terreno entra in acqua
    const NA = 144, NR = 12, shore = [];
    for (let i = 0; i < NA; i++) {
        const a = i / NA * Math.PI * 2, cx = Math.cos(a), cz = Math.sin(a);
        let r = 6;
        while (r < 45 && W.terrainAt(X + cx * r, Z + cz * r) > 0.02) r += 0.25;
        shore.push({ a, cx, cz, r });
    }
    const pos = [], uv = [], idx = [];
    let perim = 0;
    for (let i = 0; i <= NA; i++) {
        const S = shore[i % NA];
        if (i > 0) { const P = shore[i - 1]; perim += Math.hypot(S.cx * S.r - P.cx * P.r, S.cz * S.r - P.cz * P.r); }
        for (let j = 0; j <= NR; j++) {
            const dist = -1.5 + j / NR * 10;                  // metri dalla riva (negativi = sulla spiaggia)
            pos.push(X + S.cx * (S.r + dist), 0.035, Z + S.cz * (S.r + dist));
            uv.push(perim, dist);
        }
    }
    for (let i = 0; i < NA; i++) for (let j = 0; j < NR; j++) {
        const a = i * (NR + 1) + j, b = a + NR + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const surfGeo = geo(new THREE.BufferGeometry());
    surfGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    surfGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    surfGeo.setIndex(idx);
    surfGeo.computeBoundingSphere();
    const surfMat = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uNight: { value: 1 }, uCol: { value: new THREE.Color('#ece6ff') } }]),
        vertexShader: `uniform float uTime, uNight; varying vec2 vUv; varying float vCrest;
            #include <fog_pars_vertex>
            void main(){ vUv = uv; float d = uv.y;
                // creste che arrivano verso riva: il fronte è ripido, la coda lunga
                float w = fract(d * 0.28 + uTime * 0.16 + sin(uv.x * 0.21) * 0.08);
                float crest = smoothstep(0.0, 0.08, w) * (1.0 - smoothstep(0.08, 0.45, w));
                crest *= smoothstep(8.5, 3.0, d) * smoothstep(-0.6, 0.8, d);
                vCrest = crest;
                vec3 p = position; p.y += crest * (0.12 + 0.38 * uNight);
                vec4 mvPosition = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mvPosition;
                #include <fog_vertex>
            }`,
        fragmentShader: `uniform float uTime, uNight; uniform vec3 uCol; varying vec2 vUv; varying float vCrest;
            #include <fog_pars_fragment>
            void main(){ float d = vUv.y, s = vUv.x;
                float breakZone = smoothstep(4.5, 0.6, d);
                float foam = vCrest * (0.35 + 0.65 * breakZone);
                // la risacca: l'acqua che sale e si ritira sulla spiaggia
                float reach = 0.2 + 0.9 * (0.5 + 0.5 * sin(uTime * 0.9 + s * 0.05));
                float wash = (1.0 - smoothstep(reach - 0.6, reach + 0.2, d + 1.5)) * smoothstep(-1.5, -0.6, d);
                float grain = 0.55 + 0.45 * sin(s * 2.3 + uTime * 2.0) * sin(s * 0.9 - d * 3.1 + uTime * 1.3);
                float a = (foam * 0.95 + wash * 0.6) * grain * smoothstep(9.5, 7.0, d) * (0.4 + 0.6 * uNight);
                gl_FragColor = vec4(uCol, clamp(a, 0.0, 0.9));
                #include <fog_fragment>
            }`,
        transparent: true, depthWrite: false, fog: true,
    });
    disposables.push(surfMat);
    const surf = new THREE.Mesh(surfGeo, surfMat);
    surf.renderOrder = 2;
    g.add(surf);
    let surfT = 2;

    // --- scogli intorno ---
    const rockM = mat({ color: '#3b3644', roughness: 0.95, flatShading: true });
    for (let i = 0; i < 9; i++) {
        const a = i * 0.71 + 0.4, rr = F.r + 1 + (i % 3) * 1.6, s = 1.4 + (i % 4) * 0.7;
        const x = X + Math.cos(a) * rr, z = Z + Math.sin(a) * rr;
        if (Math.abs((x - X) * px + (z - Z) * pz) < 7 + s && (x - X) * dx + (z - Z) * dz > 0) continue;   // lontano dal molo (conta anche quanto è grosso)
        const r = add(new THREE.Mesh(geo(new THREE.DodecahedronGeometry(s, 0)), rockM), x, Math.max(-0.4, W.terrainAt(x, z) + s * 0.25), z);
        r.rotation.set(a, a * 2, 0);
    }

    // il bagliore respira, il fascio gira, le onde arrivano
    let t = 0;
    const toCam = new THREE.Vector3();
    const tick = (dt) => {
        t += dt;
        const night = 1 - (W.envS?.day ?? 0);
        const b = 0.5 + 0.5 * Math.sin(t * 0.9) * Math.sin(t * 0.37 + 1);
        spin.rotation.y = t * 0.45;
        beamMat.uniforms.uI.value = (0.12 + 1.1 * night) * (0.85 + 0.15 * b);
        // quando il fascio punta verso di te, la lanterna abbaglia
        const cam = app.camera.position;
        toCam.set(cam.x - X, 0, cam.z - Z).normalize();
        const facing = Math.max(Math.abs(Math.cos(spin.rotation.y) * toCam.x - Math.sin(spin.rotation.y) * toCam.z), 0);
        const flash = Math.pow(facing, 60);
        core.material.opacity = 0.35 + b * 0.5 + flash * 0.4;
        halo.material.opacity = (0.08 + b * 0.2) + flash * 0.6 * (0.3 + 0.7 * night);
        halo.scale.setScalar(26 + flash * 30);
        beacon.intensity = 2 + b * 7 + flash * 6;
        boat.position.y = 0.15 + Math.sin(t * 1.2) * 0.06;
        boat.rotation.z = Math.sin(t * 0.9) * 0.05;
        for (const gl of glows) gl.material.opacity = 0.38 + Math.sin(t * 3 + gl.position.x) * 0.06 + Math.random() * 0.04;
        surfMat.uniforms.uTime.value = t;
        surfMat.uniforms.uNight.value = night;
        // il rumore delle onde, se sei vicino (più forte e più spesso di notte)
        surfT -= dt;
        const P = app.player?.pos;
        if (surfT <= 0 && P && Math.hypot(P.x - X, P.z - Z) < 55) {
            surfT = (night > 0.5 ? 2.2 : 4.5) + Math.random() * 2.5;
            const k = Math.floor(Math.random() * NA), S = shore[k];
            app.audio?.play('surf', { x: X + S.cx * S.r, z: Z + S.cz * S.r, vol: 0.5 + 0.5 * night });
        }
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
