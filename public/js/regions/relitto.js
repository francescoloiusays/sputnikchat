// =====================================================================
//  LA SECCA DEL RELITTO (Libro II, capitolo III)
//  Un banco di sabbia a sud-ovest, nella laguna aperta. Qui si è arenata
//  la vecchia barca del Traghettatore, con il registro delle partenze:
//  costole nere, l'albero spezzato, la vela a brandelli, le botti.
//  Ci si arriva solo in barca; il modulo si scarica quando sei lontano.
// =====================================================================
import * as THREE from 'three';
import { WORLD } from '../world.js';

export function relittoArrival() {
    const R = WORLD.RELITTO, [dx, dz] = R.dir, r = R.r * 0.5;
    return { x: R.x + dx * r, z: R.z + dz * r, yaw: Math.atan2(-dx, -dz), camYaw: Math.atan2(dx, dz) };
}

export function buildRelitto(app) {
    const W = app.world, R = WORLD.RELITTO, [dx, dz] = R.dir, X = R.x, Z = R.z;
    const g = new THREE.Group();
    g.name = 'regione: Secca del Relitto';
    const disposables = [], colliders = [], interactables = [], fires = [], glows = [];
    const mat = (o) => { const m = new THREE.MeshStandardMaterial(o); disposables.push(m); return m; };
    const geo = (x) => { disposables.push(x); return x; };
    const add = (mesh, x, y, z, parent = g) => { mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    const box = (x, z, w, d, y0, y1, ry) => { const c = { type: 'box', x, z, hw: w / 2, hd: d / 2, cos: Math.cos(ry), sin: Math.sin(ry), y0, y1, region: 'relitto' }; W.colliders.push(c); colliders.push(c); };
    const circ = (x, z, r, y0, y1) => { const c = { type: 'circ', x, z, r, y0, y1, region: 'relitto' }; W.colliders.push(c); colliders.push(c); };
    const ground = (x, z) => W.terrainAt(x, z);

    const tarred = mat({ color: '#1f1712', roughness: 0.95 });
    const rotten = mat({ color: '#3b2b1f', roughness: 0.95 });
    const bleached = mat({ color: '#8c8070', roughness: 1 });
    const iron = mat({ color: '#2a2422', metalness: 0.6, roughness: 0.7 });
    const rope = mat({ color: '#6b5a40', roughness: 1 });
    const rockM = mat({ color: '#3b3644', roughness: 0.95, flatShading: true });

    // =================================================================
    //  IL RELITTO: costruito dritto lungo z, poi coricato su un fianco
    //  e mezzo affondato nella sabbia, con la prua verso il mare aperto
    // =================================================================
    const H = new THREE.Group();
    const hx = X - dx * 2.5 + dz * 1.5, hz = Z - dz * 2.5 - dx * 1.5;
    H.position.set(hx, ground(hx, hz) + 0.15, hz);
    H.scale.setScalar(1.25);
    H.rotation.set(0, Math.atan2(dz, -dx) + 0.6, 0.38, 'YXZ');
    g.add(H);
    const LEN = 10, NR = 11;
    // la chiglia, la ruota di prua e il dritto di poppa
    add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.28, 0.32, LEN + 0.6)), tarred), 0, 0, 0, H);
    const stem = add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.24, 3.0, 0.3)), tarred), 0, 1.3, LEN / 2 + 0.55, H); stem.rotation.x = 0.35;
    const post = add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.24, 2.4, 0.3)), tarred), 0, 1.05, -LEN / 2 - 0.25, H); post.rotation.x = -0.15;
    // le costole: archi che si stringono verso prua e poppa; qualcuna è spezzata
    const ribR = [];
    for (let i = 0; i < NR; i++) {
        const t = (i + 0.5) / NR, rr = 0.6 + 1.5 * Math.pow(Math.sin(Math.PI * t), 0.6);
        ribR.push(rr);
        const broken = i === 3 || i === 7 || i === 8;
        const arc = broken ? Math.PI * (0.45 + 0.2 * (i % 2)) : Math.PI;
        const rib = add(new THREE.Mesh(geo(new THREE.TorusGeometry(rr, 0.08, 5, 14, arc)), tarred), 0, rr * 0.9, -LEN / 2 + t * LEN, H);
        rib.rotation.z = Math.PI + (broken ? (i % 2 ? 0.3 : Math.PI - arc - 0.3) : 0);
        rib.scale.y = 0.9;
    }
    // il fasciame: resta solo sul fianco coricato e in fondo, a strisce
    for (const [ang, from, to] of [[-2.6, 0, NR], [-2.25, 1, NR - 1], [-1.9, 0, 6], [-1.9, 8, NR], [-1.55, 2, 5], [2.6, 0, 4], [2.6, 9, NR], [2.25, 1, 3]]) {
        for (let i = from; i < to; i++) {
            const t = (i + 0.5) / NR, rr = ribR[i];
            const p = add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.06, 0.26, LEN / NR + 0.04)), i % 3 ? rotten : tarred),
                Math.sin(ang) * rr, rr * 0.9 + Math.cos(ang) * rr * 0.9, -LEN / 2 + t * LEN, H);
            p.rotation.z = -ang;
        }
    }
    // un pezzo di ponte ancora in piedi a poppa, e la barra del timone
    add(new THREE.Mesh(geo(new THREE.BoxGeometry(2.3, 0.1, 2.0)), rotten), 0, 1.75, -LEN / 2 + 1.3, H);
    const tiller = add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.1, 0.1, 1.6)), tarred), 0, 2.0, -LEN / 2 - 0.4, H); tiller.rotation.x = 0.2;
    // il relitto si attraversa solo dove lo scafo è sfondato: due fianchi pieni come collider
    const wreckRy = H.rotation.y;
    const along = (s) => [hx + Math.sin(wreckRy) * s, hz + Math.cos(wreckRy) * s];
    const side = (k) => [Math.cos(wreckRy) * k, -Math.sin(wreckRy) * k];
    for (const [s, len] of [[-4.0, 4.4], [4.2, 4.0]]) {
        const [cx, cz] = along(s), [ox, oz] = side(-1.8);
        box(cx + ox, cz + oz, 0.5, len, -2, ground(cx, cz) + 1.6, -wreckRy);
    }
    const [bx, bz] = along((LEN / 2 + 0.6) * 1.25);
    circ(bx, bz, 0.5, -2, ground(bx, bz) + 2.4);

    // l'albero maestro, spezzato e caduto sulla sabbia, con la vela a brandelli
    const mx = hx + dz * 3.6 - dx * 0.5, mz = hz - dx * 3.6 - dz * 0.5;
    const mast = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.13, 0.19, 7.5, 10)), tarred), mx, ground(mx, mz) + 0.45, mz);
    mast.rotation.set(Math.PI / 2 - 0.12, 0, 0); mast.rotation.order = 'YXZ'; mast.rotation.y = wreckRy - 0.9;
    const yard = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.07, 0.07, 3.6, 8)), tarred), 0, 1.5, 0, mast);
    yard.rotation.z = Math.PI / 2;
    const sailTex = (() => {
        const c = document.createElement('canvas'); c.width = 128; c.height = 128;
        const q = c.getContext('2d');
        q.fillStyle = '#8a8070'; q.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 400; i++) { q.fillStyle = `rgba(30,22,18,${Math.random() * 0.25})`; q.fillRect(Math.random() * 128, Math.random() * 128, 2 + Math.random() * 6, 1 + Math.random() * 3); }
        q.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 9; i++) { q.beginPath(); q.ellipse(Math.random() * 128, 40 + Math.random() * 88, 6 + Math.random() * 14, 4 + Math.random() * 18, Math.random() * 3, 0, Math.PI * 2); q.fill(); }
        q.beginPath(); q.moveTo(0, 128); q.lineTo(40, 70); q.lineTo(70, 128); q.fill();
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; disposables.push(t); return t;
    })();
    const sailM = mat({ map: sailTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 1 });
    const sailG = geo(new THREE.PlaneGeometry(3.4, 3.0, 8, 6));
    const sp = sailG.attributes.position;
    for (let i = 0; i < sp.count; i++) sp.setZ(i, Math.sin(sp.getX(i) * 1.3) * 0.25 + Math.sin(sp.getY(i) * 2) * 0.15);
    sailG.computeVertexNormals();
    const sail = add(new THREE.Mesh(sailG, sailM), 0, 0.2, -0.7, mast);
    sail.rotation.set(-1.2, 0, 0);

    // botti, casse, una cima arrotolata, la lanterna di bordo
    const barrelG = geo(new THREE.CylinderGeometry(0.34, 0.34, 0.85, 12));
    const hoopG = geo(new THREE.TorusGeometry(0.35, 0.025, 4, 16));
    const barrel = (x, z, lying, ry) => {
        const b = new THREE.Group();
        b.add(new THREE.Mesh(barrelG, rotten));
        for (const y of [-0.28, 0.28]) { const hp = new THREE.Mesh(hoopG, iron); hp.rotation.x = Math.PI / 2; hp.position.y = y; b.add(hp); }
        b.traverse(c => { c.castShadow = c.receiveShadow = true; });
        b.position.set(x, ground(x, z) + (lying ? 0.28 : 0.4), z);
        b.rotation.set(lying ? Math.PI / 2 : 0, ry, 0, 'YXZ');
        g.add(b);
        circ(x, z, 0.38, -1, ground(x, z) + 0.8);
    };
    const pt = (a, r) => [X + Math.cos(a) * r, Z + Math.sin(a) * r];
    barrel(...pt(2.2, 5.5), true, 0.4); barrel(...pt(2.35, 6.4), false, 0); barrel(...pt(-0.6, 8), true, 1.6);
    for (const [a, r, s] of [[1.6, 7.5, 0.7], [1.75, 8.2, 0.5], [-1.2, 6, 0.6]]) {
        const [x, z] = pt(a, r);
        const c = add(new THREE.Mesh(geo(new THREE.BoxGeometry(s, s * 0.8, s)), bleached), x, ground(x, z) + s * 0.35, z);
        c.rotation.set(0.15, a * 3, 0.1);
        circ(x, z, s * 0.6, -1, ground(x, z) + s * 0.75);
    }
    { const [x, z] = pt(2.0, 4.2); const c = add(new THREE.Mesh(geo(new THREE.TorusGeometry(0.32, 0.09, 6, 16)), rope), x, ground(x, z) + 0.08, z); c.rotation.x = Math.PI / 2; }
    // legni portati dal mare, sbiancati dal sale
    for (let i = 0; i < 7; i++) {
        const a = i * 0.9 + 0.3, r = R.r * (0.55 + (i % 3) * 0.12);
        const [x, z] = pt(a, r);
        const lg = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.08 + (i % 2) * 0.05, 0.12, 1.6 + (i % 3) * 0.9, 6)), bleached), x, ground(x, z) + 0.1, z);
        lg.rotation.set(Math.PI / 2, a * 2.1, 0, 'YXZ');
    }
    // scogli sul lato del mare aperto
    for (let i = 0; i < 6; i++) {
        const a = Math.atan2(-dz, -dx) + (i - 2.5) * 0.35, rr = R.r + 2 + (i % 2) * 2.5, s = 1.1 + (i % 3) * 0.6;
        const x = X + Math.cos(a) * rr, z = Z + Math.sin(a) * rr;
        const r = add(new THREE.Mesh(geo(new THREE.DodecahedronGeometry(s, 0)), rockM), x, Math.max(-0.6, ground(x, z) + s * 0.2), z);
        r.rotation.set(a, a * 2, 0);
    }

    // il fuoco del naufrago: chi ha scritto «tornato» sul registro ha dormito qui
    const [fx, fz] = pt(0.9, 4.0), fy = ground(fx, fz);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; add(new THREE.Mesh(geo(new THREE.DodecahedronGeometry(0.16, 0)), rockM), fx + Math.cos(a) * 0.45, fy + 0.06, fz + Math.sin(a) * 0.45); }
    const fire = W.fires.make(0.7);
    fire.position.set(fx, fy - 0.1, fz);
    g.add(fire); fires.push(fire);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: '#ff7a1a', transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
    disposables.push(glow.material);
    glow.position.set(fx, fy + 0.35, fz); glow.scale.set(2.2, 2.2, 1);
    g.add(glow); glows.push(glow);
    const fl = new THREE.PointLight('#ff7a2a', 20, 16, 1.5);
    fl.position.set(fx, fy + 0.7, fz);
    g.add(fl);
    circ(fx, fz, 0.5, -1, fy + 0.3);

    // la barchetta, tirata in secca: serve per tornare
    const A = relittoArrival();
    const boat = new THREE.Group();
    const hullMat = mat({ color: '#3a2618', side: THREE.DoubleSide, roughness: 0.9 });
    const hull = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.9, 0.6, 3.6, 18, 1, true, 0, Math.PI)), hullMat);
    hull.rotation.set(Math.PI / 2, 0, Math.PI); hull.scale.set(1, 1, 0.5); hull.castShadow = true;
    boat.add(hull);
    const bpx = A.x + dx * 4.6 + dz * 1.2, bpz = A.z + dz * 4.6 - dx * 1.2;
    boat.position.set(bpx, Math.max(0.15, ground(bpx, bpz) + 0.35), bpz); boat.rotation.y = Math.atan2(dx, dz) + 0.3;
    g.add(boat);
    interactables.push({ id: 'barca', dest: 'molo', x: bpx - dx * 1.2, z: bpz - dz * 1.2, r: 2.4, label: 'Torna al Molo in barca' });

    // la risacca: le onde che muoiono sulla secca si sentono anche da qui
    let t = 0, surfT = 2;
    const tick = (dt) => {
        t += dt;
        boat.rotation.z = Math.sin(t * 0.9) * 0.02;
        sail.rotation.y = Math.sin(t * 0.7) * 0.08;
        for (const gl of glows) gl.material.opacity = 0.38 + Math.sin(t * 3 + gl.position.x) * 0.06 + Math.random() * 0.04;
        surfT -= dt;
        const P = app.player?.pos;
        if (surfT <= 0 && P && Math.hypot(P.x - X, P.z - Z) < 50) {
            surfT = 3 + Math.random() * 3;
            const a = Math.random() * Math.PI * 2;
            app.audio?.play('surf', { x: X + Math.cos(a) * R.r, z: Z + Math.sin(a) * R.r, vol: 0.6 });
        }
    };
    W.animated.push(tick);
    W.interactables.push(...interactables);

    return {
        group: g,
        dispose() {
            const i = W.animated.indexOf(tick);
            if (i >= 0) W.animated.splice(i, 1);
            const drop = (arr, items) => { for (let k = arr.length - 1; k >= 0; k--) if (items.includes(arr[k])) arr.splice(k, 1); };
            drop(W.colliders, colliders);
            drop(W.interactables, interactables);
            for (const f of fires) { const k = W.fires.mats.indexOf(f.material); if (k >= 0) W.fires.mats.splice(k, 1); f.geometry.dispose(); f.material.dispose(); }
            for (const d of disposables) d.dispose();
        },
    };
}
