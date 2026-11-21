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
import { l2At, L2AT } from '../shared/libro2.js';

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

    // =================================================================
    //  LA TORRE: costruita in un sistema «locale» con l'ingresso verso +z,
    //  poi girata verso il molo. y = 0 è il terreno ai piedi del faro.
    // =================================================================
    const T = new THREE.Group();
    T.position.set(X, pad, Z);
    T.rotation.y = Math.atan2(dx, dz);
    g.add(T);
    const put = (mesh, x, y, z, ry = 0) => { mesh.position.set(x, y, z); mesh.rotation.y = ry; mesh.castShadow = mesh.receiveShadow = true; T.add(mesh); return mesh; };
    const toW = (lx, lz) => [X + lx * dz + lz * dx, Z - lx * dx + lz * dz];   // da locale a mondo
    const colRy = Math.atan2(-dx, dz);
    const blockers = [];

    // intonaco a fasce bianche e rosso scuro, scrostato dal salmastro (texture disegnata qui)
    const bandTex = (() => {
        const c = document.createElement('canvas'); c.width = 128; c.height = 1024;
        const q = c.getContext('2d');
        q.fillStyle = '#d4cdd9'; q.fillRect(0, 0, 128, 1024);
        for (const [a, b] of [[0.2, 0.36], [0.52, 0.68], [0.84, 1]]) { q.fillStyle = '#6b2230'; q.fillRect(0, 1024 * (1 - b), 128, 1024 * (b - a)); }
        // colature e macchie
        for (let i = 0; i < 260; i++) {
            const x = Math.random() * 128, y0 = Math.random() * 1024, h = 20 + Math.random() * 140;
            const gr = q.createLinearGradient(0, y0, 0, y0 + h);
            gr.addColorStop(0, 'rgba(40,30,45,0.16)'); gr.addColorStop(1, 'rgba(40,30,45,0)');
            q.fillStyle = gr; q.fillRect(x, y0, 1 + Math.random() * 2.5, h);
        }
        for (let i = 0; i < 900; i++) { q.fillStyle = `rgba(${Math.random() < 0.5 ? '255,250,255' : '20,15,25'},${0.04 + Math.random() * 0.08})`; q.fillRect(Math.random() * 128, Math.random() * 1024, 1 + Math.random() * 4, 1 + Math.random() * 3); }
        const base = q.createLinearGradient(0, 1024, 0, 820); base.addColorStop(0, 'rgba(30,40,30,0.55)'); base.addColorStop(1, 'rgba(30,40,30,0)');
        q.fillStyle = base; q.fillRect(0, 820, 128, 204);   // il verde dell'umido alla base
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4;
        disposables.push(t);
        return t;
    })();
    const plaster = mat({ map: bandTex, roughness: 0.9 });
    const white = mat({ color: '#cfc8d6', roughness: 0.92 });
    const stone = mat({ color: '#56505e', roughness: 0.95, flatShading: true });
    const iron = mat({ color: '#1c1a20', metalness: 0.8, roughness: 0.45 });
    const wood = mat({ color: '#3a281b', roughness: 0.9 });
    const doorWood = mat({ color: '#2e1f15', roughness: 0.85 });
    const copper = mat({ color: '#3d5a52', metalness: 0.55, roughness: 0.5 });
    const brass = mat({ color: '#8a7434', metalness: 0.85, roughness: 0.35 });

    // basamento di pietra: basso, ci si sale sopra
    const PL = 0.3;
    put(new THREE.Mesh(geo(new THREE.CylinderGeometry(3.4, 3.6, PL + 0.5, 18)), stone), 0, (PL - 0.5) / 2, 0);
    circ(X, Z, 3.45, pad - 2, pad + PL);

    // fusto affusolato con un filo di curva, come i fari in muratura
    const H = 15.6, R0 = 2.7, R1 = 1.72;
    const rAt = (t) => R0 - (R0 - R1) * Math.pow(t, 0.85);
    const prof = [];
    for (let i = 0; i <= 16; i++) { const t = i / 16; prof.push(new THREE.Vector2(rAt(t), PL + t * H)); }
    const shaft = put(new THREE.Mesh(geo(new THREE.LatheGeometry(prof, 40)), plaster), 0, 0, 0);
    blockers.push(shaft);
    circ(X, Z, 2.75, pad + PL - 0.1, pad + PL + H - 0.35);
    // fascia di pietra al piede
    put(new THREE.Mesh(geo(new THREE.CylinderGeometry(R0 + 0.06, R0 + 0.1, 0.45, 40)), stone), 0, PL + 0.22, 0);

    // finestrelle a spirale (la scala gira dentro): cornice di pietra e vetro scuro
    const winGlass = mat({ color: '#0d1416', roughness: 0.2, metalness: 0.3, emissive: '#1f6b58', emissiveIntensity: 0.35 });
    for (const [h, a] of [[3.6, 2.2], [6.6, -2.4], [9.6, 2.6], [12.4, -0.9]]) {
        const t = (h - PL) / H, r = rAt(t);
        const fx = Math.sin(a) * r, fz = Math.cos(a) * r;
        put(new THREE.Mesh(geo(new THREE.BoxGeometry(0.62, 1.0, 0.26)), white), fx, h, fz, a);
        put(new THREE.Mesh(geo(new THREE.BoxGeometry(0.42, 0.76, 0.06)), winGlass), Math.sin(a) * (r + 0.12), h, Math.cos(a) * (r + 0.12), a);
        put(new THREE.Mesh(geo(new THREE.BoxGeometry(0.7, 0.08, 0.36)), stone), Math.sin(a) * (r + 0.05), h - 0.54, Math.cos(a) * (r + 0.05), a);
    }

    // cornicione e mensole sotto il ballatoio
    const top = PL + H;
    put(new THREE.Mesh(geo(new THREE.CylinderGeometry(2.5, R1 + 0.02, 0.55, 40)), white), 0, top - 0.27, 0);
    for (let i = 0; i < 20; i++) {
        const a = i / 20 * Math.PI * 2;
        put(new THREE.Mesh(geo(new THREE.BoxGeometry(0.2, 0.6, 0.9)), stone), Math.sin(a) * 2.4, top - 0.4, Math.cos(a) * 2.4, a);
    }
    // ballatoio con ringhiera
    // ballatoio con ringhiera: largo abbastanza da camminarci (Libro II: si sale fin quassù)
    const GR = 3.0;
    put(new THREE.Mesh(geo(new THREE.CylinderGeometry(GR + 0.05, GR + 0.05, 0.22, 48)), iron), 0, top + 0.11, 0);
    const postG = geo(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6));
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; put(new THREE.Mesh(postG, iron), Math.sin(a) * (GR - 0.08), top + 0.72, Math.cos(a) * (GR - 0.08)); }
    for (const hh of [0.62, 1.2]) { const ring = put(new THREE.Mesh(geo(new THREE.TorusGeometry(GR - 0.08, 0.035, 6, 64)), iron), 0, top + hh, 0); ring.rotation.x = Math.PI / 2; }
    // il pavimento del ballatoio, la lanterna che non si attraversa, la ringhiera che non si scavalca
    circ(X, Z, GR, pad + top - 0.35, pad + top + 0.22);
    circ(X, Z, 1.2, pad + top + 0.2, pad + top + 4.5);
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; circ(X + Math.sin(a) * (GR + 0.12), Z + Math.cos(a) * (GR + 0.12), 0.22, pad + top, pad + top + 1.4); }

    // la lanterna: zoccolo, vetri ottagonali con i montanti, cupola di rame e sfiato
    put(new THREE.Mesh(geo(new THREE.CylinderGeometry(1.4, 1.45, 0.7, 8)), white), 0, top + 0.57, 0);
    const glassM = new THREE.MeshStandardMaterial({ color: '#bfeee0', transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0.2, emissive: '#2a8a70', emissiveIntensity: 0.5, side: THREE.DoubleSide, depthWrite: false });
    disposables.push(glassM);
    const glass = put(new THREE.Mesh(geo(new THREE.CylinderGeometry(1.32, 1.32, 1.9, 8, 1, true)), glassM), 0, top + 1.87, 0);
    glass.castShadow = false;
    for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2; put(new THREE.Mesh(geo(new THREE.BoxGeometry(0.07, 1.9, 0.07)), iron), Math.sin(a) * 1.3, top + 1.87, Math.cos(a) * 1.3, a); }
    put(new THREE.Mesh(geo(new THREE.CylinderGeometry(1.5, 1.5, 0.12, 8)), iron), 0, top + 2.86, 0);
    const dome = put(new THREE.Mesh(geo(new THREE.SphereGeometry(1.45, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2)), copper), 0, top + 2.9, 0);
    dome.scale.y = 0.8;
    blockers.push(glass, dome);   // la telecamera resta fuori dalla stanza di vetro (prima ci finiva dentro)
    put(new THREE.Mesh(geo(new THREE.SphereGeometry(0.24, 12, 8)), copper), 0, top + 4.15, 0);
    put(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 5)), iron), 0, top + 4.9, 0);
    put(new THREE.Mesh(geo(new THREE.ConeGeometry(0.06, 0.25, 5)), iron), 0, top + 5.65, 0);
    const y = pad + top + 0.47;   // così y + 1.4 è il centro della lanterna (lo usano bagliore e fascio)

    // =================================================================
    //  LA CASA DEL GUARDIANO: l'ingresso, addossato alla torre
    // =================================================================
    const AW = 2.9, AD = 2.5, AH = 2.7, AZ0 = 2.0, AZ1 = AZ0 + AD;   // da z=2 (dentro la torre) a z=4.5
    const annex = put(new THREE.Mesh(geo(new THREE.BoxGeometry(AW, AH + 0.4, AD)), white), 0, PL + AH / 2 - 0.2, (AZ0 + AZ1) / 2);
    blockers.push(annex);
    put(new THREE.Mesh(geo(new THREE.BoxGeometry(AW + 0.12, 0.4, AD + 0.12)), stone), 0, PL + 0.0, (AZ0 + AZ1) / 2);   // zoccolo
    // tetto a due falde in lastre scure
    const roofShape = new THREE.Shape([new THREE.Vector2(-AW / 2 - 0.3, 0), new THREE.Vector2(AW / 2 + 0.3, 0), new THREE.Vector2(0, 1.15)]);
    const roofG = geo(new THREE.ExtrudeGeometry(roofShape, { depth: AD + 0.4, bevelEnabled: false }));
    const slate = mat({ color: '#2b2732', roughness: 0.8, flatShading: true });
    put(new THREE.Mesh(roofG, slate), 0, PL + AH, AZ0 - 0.1);
    // il timpano davanti, intonacato, e una finestrella tonda
    const gable = new THREE.Shape([new THREE.Vector2(-AW / 2, 0), new THREE.Vector2(AW / 2, 0), new THREE.Vector2(0, 0.95)]);
    put(new THREE.Mesh(geo(new THREE.ShapeGeometry(gable)), white), 0, PL + AH, AZ1 + 0.005);
    put(new THREE.Mesh(geo(new THREE.CircleGeometry(0.17, 16)), winGlass), 0, PL + AH + 0.38, AZ1 + 0.01);
    const [ax, az] = toW(0, (AZ0 + AZ1) / 2);
    box(ax, az, AW, AD, pad - 1, pad + PL + AH + 1.2, colRy);

    // portale di pietra: stipiti, architrave e chiave di volta; la porta sta incassata dentro
    const FZ = AZ1;
    for (const s of [-1, 1]) put(new THREE.Mesh(geo(new THREE.BoxGeometry(0.32, 2.55, 0.34)), stone), s * 0.86, PL + 1.27, FZ + 0.1);
    put(new THREE.Mesh(geo(new THREE.BoxGeometry(2.1, 0.36, 0.38)), stone), 0, PL + 2.72, FZ + 0.1);
    put(new THREE.Mesh(geo(new THREE.BoxGeometry(0.34, 0.5, 0.42)), stone), 0, PL + 2.8, FZ + 0.12);
    put(new THREE.Mesh(geo(new THREE.BoxGeometry(1.42, 2.5, 0.2)), mat({ color: '#0c0a0e', roughness: 1 })), 0, PL + 1.25, FZ - 0.06);   // il buio dietro le assi
    // la porta: cinque assi, due bandelle di ferro, l'anello e la serratura a corona.
    // Sta tutta su un cardine a sinistra, così può aprirsi (Libro II: la chiave del faro)
    const doorG = new THREE.Group();
    doorG.position.set(-0.7, 0, FZ);
    T.add(doorG);
    const dput = (mesh, x, y, z) => { mesh.position.set(x + 0.7, y, z - FZ); mesh.castShadow = mesh.receiveShadow = true; doorG.add(mesh); return mesh; };
    for (let i = 0; i < 5; i++) dput(new THREE.Mesh(geo(new THREE.BoxGeometry(0.26, 2.42, 0.07)), doorWood), -0.56 + i * 0.28, PL + 1.21, FZ - 0.02 + (i % 2) * 0.006);
    for (const hh of [0.45, 1.95]) dput(new THREE.Mesh(geo(new THREE.BoxGeometry(1.3, 0.09, 0.03)), iron), 0, PL + hh, FZ + 0.03);
    for (const hh of [0.45, 1.95]) for (const s of [-1, 1]) dput(new THREE.Mesh(geo(new THREE.SphereGeometry(0.035, 6, 4)), iron), s * 0.6, PL + hh, FZ + 0.05);
    const ring = dput(new THREE.Mesh(geo(new THREE.TorusGeometry(0.09, 0.016, 6, 16)), iron), 0.38, PL + 1.1, FZ + 0.06);
    dput(new THREE.Mesh(geo(new THREE.BoxGeometry(0.2, 0.3, 0.025)), brass), -0.32, PL + 1.15, FZ + 0.04);
    for (const s of [-1, 0, 1]) dput(new THREE.Mesh(geo(new THREE.ConeGeometry(0.025, 0.08 + (s === 0 ? 0.03 : 0), 4)), brass), -0.32 + s * 0.06, PL + 1.35, FZ + 0.045);   // la corona spezzata
    dput(new THREE.Mesh(geo(new THREE.BoxGeometry(0.03, 0.08, 0.03)), iron), -0.32, PL + 1.11, FZ + 0.055);   // il buco della chiave
    // quando la porta è aperta, dal buio filtra il verde della lanterna
    const inGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: '#5affc8', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    disposables.push(inGlow.material);
    inGlow.scale.set(1.6, 2.6, 1); inGlow.position.set(0, PL + 1.5, FZ + 0.06);
    T.add(inGlow);
    let doorA = l2At(app.me?.libro2) >= L2AT(1) ? -1.75 : 0;
    doorG.rotation.y = doorA;
    // due gradini di pietra davanti alla porta
    put(new THREE.Mesh(geo(new THREE.BoxGeometry(2.0, 0.3, 0.55)), stone), 0, 0.0, FZ + 0.35);
    put(new THREE.Mesh(geo(new THREE.BoxGeometry(2.3, 0.15, 0.5)), stone), 0, -0.05, FZ + 0.85);
    const [sx, sz] = toW(0, FZ + 0.35);
    box(sx, sz, 2.0, 0.55, pad - 1, pad + 0.15, colRy);
    // un lanternino sopra la porta, con la stessa luce verde della cima
    put(new THREE.Mesh(geo(new THREE.BoxGeometry(0.06, 0.06, 0.4)), iron), 0, PL + 3.05, FZ + 0.3);
    put(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.1, 0.13, 0.26, 6)), mat({ color: '#9affe0', emissive: '#4affc8', emissiveIntensity: 1.2, roughness: 0.4 })), 0, PL + 2.88, FZ + 0.48);
    const doorGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: '#7affd8', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    disposables.push(doorGlow.material);
    doorGlow.scale.set(1.3, 1.3, 1); doorGlow.position.set(0, PL + 2.88, FZ + 0.48);
    T.add(doorGlow);

    const [doorX, doorZ] = toW(0, FZ);
    const at = () => l2At(app.me?.libro2);
    interactables.push({ id: 'faro_porta', x: X + dx * (FZ + 1.3), z: Z + dz * (FZ + 1.3), y: pad, r: 2.0,
        label: () => { const s = at(); return s === L2AT(0, 4) ? 'Apri la porta con la chiave' : s >= L2AT(1) ? 'Sali le scale del faro' : 'La porta del faro'; } });
    // in cima: dove si arriva, la lanterna e la scala per tornare giù
    const gy = pad + top + 0.22;
    app.faroInfo = { gallery: { x: X + dx * 2.15, z: Z + dz * 2.15, y: gy, yaw: Math.atan2(dx, dz) }, door: { x: X + dx * (FZ + 1.6), z: Z + dz * (FZ + 1.6), y: pad, yaw: Math.atan2(dx, dz) } };
    interactables.push({ id: 'l2spot', k: 'lanterna', x: X + dx * 1.9, z: Z + dz * 1.9, y: gy, r: 1.4,
        label: () => app.l2?.lanternLabel() || 'La lanterna del faro' });
    interactables.push({ id: 'faro_scendi', x: X - dx * 2.1, z: Z - dz * 2.1, y: gy, r: 1.3, label: 'Scendi le scale' });

    // il cuore della lanterna: un bagliore verde che respira
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: '#7affd8', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8, fog: false }));   // la luce di un faro buca la nebbia
    disposables.push(core.material);
    core.position.set(X, y + 1.4, Z); core.scale.set(5, 5, 1);
    g.add(core);
    const halo = new THREE.Sprite(core.material.clone());
    disposables.push(halo.material);
    halo.position.copy(core.position); halo.scale.set(26, 26, 1);
    g.add(halo);
    const beacon = new THREE.PointLight('#7affd8', 6, 26, 1.6);
    beacon.position.set(X, y + 1.4, Z);
    g.add(beacon);
    // la Fiammella: si sveglia nel capitolo II, cresce mangiando i lumi; quando il faro si riaccende diventa d'oro
    const fiamma = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: '#b8ffe8', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, fog: false }));
    disposables.push(fiamma.material);
    fiamma.position.set(X, y + 1.35, Z);
    g.add(fiamma);
    const GOLD = new THREE.Color('#ffd27a'), GREEN = new THREE.Color('#c8fff0'), GOLD_CORE = new THREE.Color('#ffc861'), GREEN_CORE = new THREE.Color('#7affd8');

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
        const x = doorX + dx * 2.3 + px * s * 2.3, z = doorZ + dz * 2.3 + pz * s * 2.3, b = W.terrainAt(x, z);
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
        // il punto del Libro II cambia la luce: spenta e verde, poi la Fiammella, poi l'oro
        const s2 = at(), lit = s2 >= L2AT(4, 3);
        const fz = s2 >= L2AT(4, 3) ? 1.6 : s2 >= L2AT(2) ? 1 : s2 >= L2AT(1, 2) ? 0.5 : 0;
        fiamma.material.opacity = fz ? 0.55 + 0.35 * Math.sin(t * 5.3) * Math.sin(t * 2.1) : 0;
        fiamma.scale.setScalar(fz * (0.9 + 0.12 * Math.sin(t * 7)));
        fiamma.material.color.copy(lit ? GOLD_CORE : GREEN_CORE);
        beamMat.uniforms.uCol.value.copy(lit ? GOLD : GREEN);
        core.material.color.copy(lit ? GOLD_CORE : GREEN_CORE); halo.material.color.copy(core.material.color); beacon.color.copy(core.material.color);
        spin.rotation.y = t * (lit ? 0.6 : 0.45);
        beamMat.uniforms.uI.value = (0.12 + 1.1 * night) * (0.85 + 0.15 * b) * (lit ? 1.5 : 1);
        // quando il fascio punta verso di te, la lanterna abbaglia
        const cam = app.camera.position;
        toCam.set(cam.x - X, 0, cam.z - Z).normalize();
        const facing = Math.max(Math.abs(Math.cos(spin.rotation.y) * toCam.x - Math.sin(spin.rotation.y) * toCam.z), 0);
        const flash = Math.pow(facing, 60);
        // da vicino (in galleria) l'alone e il fascio si attenuano: altrimenti la telecamera ci sta dentro e l'immagine diventa bianca
        const dc = cam.distanceTo(core.position), near = Math.min(1, Math.max(0, (dc - 4) / 12));
        core.material.opacity = (0.35 + b * 0.5 + flash * 0.4) * near;
        halo.material.opacity = ((0.08 + b * 0.2) + flash * 0.6 * (0.3 + 0.7 * night)) * near * near;
        halo.scale.setScalar(26 + flash * 30 * near);
        beamMat.uniforms.uI.value *= 0.15 + 0.85 * near;
        fiamma.material.opacity *= 0.5 + 0.5 * near;
        beacon.intensity = (2 + b * 7 + flash * 6) * (0.3 + 0.7 * near);
        // la porta si apre piano, come se pesasse trecento anni
        const want = s2 >= L2AT(1) ? -1.75 : 0;
        if (doorA !== want) { doorA += Math.sign(want - doorA) * Math.min(Math.abs(want - doorA), dt * 0.6); doorG.rotation.y = doorA; }
        inGlow.material.opacity = (-doorA / 1.75) * (0.35 + b * 0.25);
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
