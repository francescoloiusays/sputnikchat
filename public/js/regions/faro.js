// =====================================================================
//  IL FARO SPENTO (Capitolo II, anticipo)
//  Uno scoglio con un faro in rovina al limite della nebbia. La lanterna
//  in cima non illumina: pulsa, come se qualcuno ci respirasse dentro.
// =====================================================================
import * as THREE from 'three';

export function buildFaro(app) {
    const g = new THREE.Group();
    g.name = 'regione: Faro Spento';
    const X = 138, Z = -150;
    const disposables = [];
    const mat = (o) => { const m = new THREE.MeshStandardMaterial(o); disposables.push(m); return m; };
    const geo = (x) => { disposables.push(x); return x; };

    // lo scoglio
    const rockM = mat({ color: '#3b3644', roughness: 0.95, flatShading: true });
    const rock = new THREE.Mesh(geo(new THREE.DodecahedronGeometry(11, 1)), rockM);
    rock.scale.set(1.25, 0.55, 1); rock.position.set(X, -3.2, Z);
    rock.castShadow = rock.receiveShadow = true;
    g.add(rock);
    for (let i = 0; i < 6; i++) {
        const a = i * 1.1 + 0.3, s = 2 + (i % 3) * 1.3;
        const r = new THREE.Mesh(geo(new THREE.DodecahedronGeometry(s, 0)), rockM);
        r.position.set(X + Math.cos(a) * 13, -0.6, Z + Math.sin(a) * 10);
        r.rotation.set(a, a * 2, 0);
        g.add(r);
    }

    // la torre: tronchi di cono a fasce, come i fari veri
    const white = mat({ color: '#b9b2c4', roughness: 0.85 }), red = mat({ color: '#5a1f2a', roughness: 0.85 });
    let y = 2.2;
    for (let i = 0; i < 5; i++) {
        const h = 3.2, r0 = 2.6 - i * 0.28, r1 = r0 - 0.28;
        const seg = new THREE.Mesh(geo(new THREE.CylinderGeometry(r1, r0, h, 20)), i % 2 ? red : white);
        seg.position.set(X, y + h / 2, Z); seg.castShadow = true;
        g.add(seg);
        y += h;
    }
    // ballatoio e lanterna
    const iron = mat({ color: '#1c1a20', metalness: 0.8, roughness: 0.45 });
    const deck = new THREE.Mesh(geo(new THREE.CylinderGeometry(2.2, 2.2, 0.3, 24)), iron);
    deck.position.set(X, y + 0.15, Z); g.add(deck);
    const cage = new THREE.Mesh(geo(new THREE.CylinderGeometry(1.15, 1.15, 2.2, 8, 1, true)), mat({ color: '#2a2630', metalness: 0.7, roughness: 0.5, wireframe: true }));
    cage.position.set(X, y + 1.4, Z); g.add(cage);
    const cap = new THREE.Mesh(geo(new THREE.ConeGeometry(1.5, 1.4, 8)), iron);
    cap.position.set(X, y + 3.2, Z); g.add(cap);

    // il cuore della lanterna: un bagliore verde che respira
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: app.world.glowTex, color: '#7affd8', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
    disposables.push(core.material);
    core.position.set(X, y + 1.4, Z); core.scale.set(7, 7, 1);
    g.add(core);
    const halo = new THREE.Sprite(core.material.clone());
    disposables.push(halo.material);
    halo.material.opacity = 0.25; halo.position.copy(core.position); halo.scale.set(26, 26, 1);
    g.add(halo);

    let t = 0;
    const tick = (dt) => {
        t += dt;
        const b = 0.5 + 0.5 * Math.sin(t * 0.9) * Math.sin(t * 0.37 + 1);
        core.material.opacity = 0.35 + b * 0.6;
        halo.material.opacity = 0.08 + b * 0.25;
    };
    app.world.animated.push(tick);

    return {
        group: g,
        dispose() {
            const i = app.world.animated.indexOf(tick);
            if (i >= 0) app.world.animated.splice(i, 1);
            for (const d of disposables) d.dispose();
        },
    };
}
