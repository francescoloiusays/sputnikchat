// =====================================================================
//  L'ERBA DELL'ISOLA (solo qualità alta)
//  Due tappeti di fili che seguono la telecamera, con posizioni fisse nel mondo: uno fitto
//  nei primi venti metri e uno rado, a fili più larghi, fino a sessanta. Così l'erba nasce
//  lontano, già velata dalla foschia, e non spunta più davanti ai piedi. Altezza del suolo e
//  «dove cresce» arrivano da una texture; vento, calpestio e neve li fa la scheda video.
// =====================================================================
import * as THREE from 'three';

const VS = `
    attribute vec3 seed;
    uniform vec3 uCam, uPlayer; uniform float uTime, uBox, uWind, uSnow, uN, uWide; uniform vec2 uMin, uCell; uniform sampler2D uMap;
    varying float vT; varying float vTint; varying float vNear;
    #include <fog_pars_vertex>
    void main(){
        // posto fisso nel mondo, ripetuto a scacchiera attorno alla telecamera
        vec2 d = (fract((seed.xy * uBox - uCam.xz) / uBox) - 0.5) * uBox;
        vec2 w = uCam.xz + d;
        vec4 m = texture2D(uMap, ((w - uMin) / uCell + 0.5) / uN);
        float edge = 1.0 - smoothstep(uBox * 0.34, uBox * 0.5, length(d));
        float tall = (0.2 + seed.z * 0.34) * smoothstep(0.08, 0.6, m.g) * edge * (1.0 - 0.65 * uSnow);
        if (uWide > 1.5) tall *= smoothstep(11.0, 22.0, length(d));   // i fili larghi servono solo lontano: vicino c'è già il tappeto fitto
        float a = seed.z * 43.98; vec2 dir = vec2(cos(a), sin(a));
        float bend = position.y * position.y;
        vec2 wind = vec2(sin(uTime * 1.3 + w.x * 0.35 + w.y * 0.21), cos(uTime * 1.07 + w.y * 0.31 - w.x * 0.12)) * (0.05 + 0.13 * uWind);
        wind += vec2(sin(uTime * 3.1 + w.x * 1.7), cos(uTime * 2.7 + w.y * 1.9)) * 0.015 * (1.0 + uWind * 2.0);
        // chi cammina scosta i fili
        vec2 away = w - uPlayer.xz; float pd = length(away);
        vec2 push = away / max(pd, 0.001) * (1.0 - smoothstep(0.15, 0.85, pd)) * 0.3 * step(abs(m.r - uPlayer.y), 1.2);
        vec2 lean = vec2(-dir.y, dir.x) * (fract(seed.z * 7.31) - 0.5) * 0.25;
        vec3 p = vec3(w.x, m.r - 0.04, w.y);
        p.xz += dir * position.x * uWide;
        p.y += position.y * tall;
        p.xz += (wind + push + lean) * bend * (tall / 0.4 + 0.2);
        p.y -= length(push) * bend * tall * 1.2;
        vT = position.y; vTint = fract(seed.z * 13.7);
        vNear = 1.0 - smoothstep(1.5, 9.0, pd);   // la luce che accompagna il viandante arriva anche all'erba
        vec4 mvPosition = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
    }`;
const FS = `
    uniform vec3 uRoot, uTip, uDry, uLight, uFill; uniform float uSnow;
    varying float vT; varying float vTint; varying float vNear;
    #include <fog_pars_fragment>
    void main(){
        vec3 tip = mix(uTip, uDry, smoothstep(0.55, 1.0, vTint));
        vec3 c = mix(uRoot, tip, vT) * (0.5 + 0.5 * vT);
        c = mix(c, vec3(0.62, 0.65, 0.72), uSnow * smoothstep(0.35, 1.0, vT) * 0.8);
        gl_FragColor = vec4(c * (uLight + uFill * vNear), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
    }`;

export class Grass {
    // H = altezze del terreno (n×n), mask(ix, iz) = quanto cresce l'erba (0..1), min/cell = griglia del terreno
    constructor(scene, { H, n, mask, minX, minZ, cw, cd }) {
        const data = new Uint16Array(n * n * 4), half = THREE.DataUtils.toHalfFloat;
        for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
            const i = iz * n + ix;
            data[i * 4] = half(H[i]); data[i * 4 + 1] = half(mask(ix, iz)); data[i * 4 + 3] = half(1);
        }
        const map = new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.HalfFloatType);
        this.data = data; this.map = map; this.grid = { n, minX, minZ, cw, cd }; this.holed = new Map();
        map.magFilter = map.minFilter = THREE.LinearFilter; map.needsUpdate = true;
        // un filo: tre tratti che si assottigliano fino alla punta
        const W = 0.028, ys = [0, 0.38, 0.72, 1], ws = [1, 0.8, 0.5, 0], pos = [], idx = [];
        ys.forEach((y, k) => { if (ws[k] > 0) pos.push(-W * ws[k], y, 0, W * ws[k], y, 0); else pos.push(0, y, 0); });
        idx.push(0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6);
        // [quanti fili, lato del riquadro in metri, larghezza del filo]: vicino fitto, lontano rado e più largo
        this.mats = []; this.meshes = [];
        for (const [count, box, wide] of [[52000, 40, 1], [70000, 124, 2.3]]) {
            const g = new THREE.InstancedBufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            g.setIndex(idx);
            const seed = new Float32Array(count * 3);
            for (let i = 0; i < count * 3; i++) seed[i] = Math.random();
            g.setAttribute('seed', new THREE.InstancedBufferAttribute(seed, 3));
            g.instanceCount = count;
            const mat = new THREE.ShaderMaterial({
                side: THREE.DoubleSide, fog: true,
                uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
                    uCam: { value: new THREE.Vector3() }, uPlayer: { value: new THREE.Vector3(0, -99, 0) }, uTime: { value: 0 }, uBox: { value: box }, uWide: { value: wide },
                    uWind: { value: 0.3 }, uSnow: { value: 0 }, uN: { value: n }, uMin: { value: new THREE.Vector2(minX, minZ) }, uCell: { value: new THREE.Vector2(cw, cd) },
                    uMap: { value: null }, uRoot: { value: new THREE.Color('#1a2016') }, uTip: { value: new THREE.Color('#465236') }, uDry: { value: new THREE.Color('#6b6446') },
                    uLight: { value: new THREE.Color(1, 1, 1) }, uFill: { value: new THREE.Color(0, 0, 0) },
                }]),
                vertexShader: VS, fragmentShader: FS,
            });
            mat.uniforms.uMap.value = map;
            const mesh = new THREE.Mesh(g, mat);
            mesh.frustumCulled = false;
            mesh.userData.aoSkip = true;   // i fili si piazzano nel loro shader: nell'ombra di contatto finirebbero tutti nell'origine
            mesh.onBeforeRender = (r, sc, camera) => { mat.uniforms.uCam.value.setFromMatrixPosition(camera.matrixWorld); };
            scene.add(mesh);
            this.mats.push(mat); this.meshes.push(mesh);
        }
    }
    // rects: [x0, z0, x1, z1] in metri: lì l'erba non cresce (quel che c'era prima torna come era)
    setHoles(rects) {
        const { n, minX, minZ, cw, cd } = this.grid, D = this.data, half = THREE.DataUtils.toHalfFloat;
        for (const [i, v] of this.holed) D[i] = v;
        this.holed.clear();
        for (const [x0, z0, x1, z1] of rects) {
            // i punti della griglia dentro il riquadro allargato di mezza casella: dentro non resta un filo
            const i0 = Math.max(0, Math.ceil((x0 - minX) / cw - 0.5)), i1 = Math.min(n - 1, Math.floor((x1 - minX) / cw + 0.5));
            const j0 = Math.max(0, Math.ceil((z0 - minZ) / cd - 0.5)), j1 = Math.min(n - 1, Math.floor((z1 - minZ) / cd + 0.5));
            for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
                const k = (j * n + i) * 4 + 1;
                if (!this.holed.has(k)) this.holed.set(k, D[k]);
                D[k] = half(0);
            }
        }
        this.map.needsUpdate = true;
    }
    update(t, player) { for (const m of this.mats) { m.uniforms.uTime.value = t; if (player) m.uniforms.uPlayer.value.copy(player); } }
    // S = stato del cielo (sky.js)
    applyEnv(S, indoor) {
        const night = 1 - S.day;
        _l.copy(S.hemiS).multiplyScalar(S.hemiI * 0.3).add(_c.copy(S.dir).multiplyScalar(S.dirI * 0.22)).add(_c.copy(S.amb).multiplyScalar(S.ambI * 0.3));
        _l.multiplyScalar(1 + 0.5 * night);   // di notte il suolo è schiarito dalle torce: l'erba non deve restare nera
        for (const m of this.mats) {
            const u = m.uniforms;
            u.uLight.value.copy(_l); u.uFill.value.set('#d8c4ff').multiplyScalar(0.55 * night);
            u.uWind.value = S.wind; u.uSnow.value = S.cover;
        }
        for (const m of this.meshes) m.visible = !indoor;
    }
}
const _c = new THREE.Color(), _l = new THREE.Color();
