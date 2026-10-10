// =====================================================================
//  IL CIELO DELL'ISOLA: ciclo giorno/notte e meteo
//  Dipende solo dall'orologio (allineato a quello del server), quindi
//  ogni viandante vede la stessa ora e lo stesso tempo.
// =====================================================================
import * as THREE from 'three';

export const DAY_MS = 24 * 60 * 1000;      // un giorno dell'isola dura 24 minuti
export const WEATHER_MS = 7 * 60 * 1000;   // il tempo può cambiare ogni 7 minuti
const EPOCH = Date.UTC(2026, 9, 5, 6);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const hash = (n) => { let h = Math.imul(n | 0, 2654435761) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 15), 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };

// minuti reali → ore dell'isola: 13' di giorno, 2'30" di tramonto, 6' di notte, 2'30" d'alba
const CLOCK = [[0, 7], [13, 18], [15.5, 21], [21.5, 29], [24, 31]];
export function islandHour(now) {
    const m = ((((now - EPOCH) % DAY_MS) + DAY_MS) % DAY_MS) / 60000;
    for (let i = 1; i < CLOCK.length; i++) {
        const [a, ha] = CLOCK[i - 1], [b, hb] = CLOCK[i];
        if (m <= b) return (ha + (hb - ha) * (m - a) / (b - a)) % 24;
    }
    return 7;
}
export const clockText = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;

// --- METEO ---
export const WEATHERS = {
    sereno:    { name: 'Soleggiato', night: 'Sereno', icon: 'sun', cloud: 0.1, dim: 0, rain: 0, snow: 0, storm: 0, wind: 0.2 },
    nuvoloso:  { name: 'Nuvoloso', icon: 'nuvola', cloud: 0.8, dim: 0.36, rain: 0, snow: 0, storm: 0, wind: 0.5 },
    pioggia:   { name: 'Pioggia', icon: 'pioggia', cloud: 1, dim: 0.55, rain: 1, snow: 0, storm: 0, wind: 0.55 },
    temporale: { name: 'Temporale', icon: 'tempesta', cloud: 1, dim: 0.7, rain: 1, snow: 0, storm: 1, wind: 0.9 },
    neve:      { name: 'Nevicata', icon: 'ghiaccio', cloud: 0.9, dim: 0.3, rain: 0, snow: 1, storm: 0, wind: 0.35 },
};
const WKEYS = ['cloud', 'dim', 'rain', 'snow', 'storm', 'wind'];
const RAINY = ['pioggia', 'temporale'];
const rawWeather = (slot) => {
    const r = hash(slot * 7919 + 13);
    return r < 0.42 ? 'sereno' : r < 0.72 ? 'nuvoloso' : r < 0.84 ? 'pioggia' : r < 0.9 ? 'temporale' : 'neve';
};
// mai due acquazzoni di fila
export function slotWeather(slot) {
    const w = rawWeather(slot);
    return RAINY.includes(w) && RAINY.includes(rawWeather(slot - 1)) ? 'nuvoloso' : w;
}
// un acquazzone dura dai 2'30" ai 3'40", poi restano le nuvole
const rainMs = (slot) => (150 + hash(slot * 31 + 7) * 70) * 1000;
export function weatherAt(now) {
    const e = now - EPOCH, slot = Math.floor(e / WEATHER_MS), into = e - slot * WEATHER_MS;
    let cur = slotWeather(slot), prev = slotWeather(slot - 1);
    let k = smooth(0, 50000, into);   // 50 secondi per cambiare tempo
    if (RAINY.includes(prev)) prev = 'nuvoloso';   // l'acquazzone di prima era già finito
    if (RAINY.includes(cur) && into > rainMs(slot)) { prev = cur; cur = 'nuvoloso'; k = smooth(rainMs(slot), rainMs(slot) + 50000, into); }
    const w = { id: cur, prev, k };
    for (const key of WKEYS) w[key] = lerp(WEATHERS[prev][key], WEATHERS[cur][key], k);
    // la neve si posa in un minuto e mezzo e si scioglie in due
    w.cover = cur === 'neve' ? Math.min(1, (prev === 'neve' ? 1 : 0) + into / 90000) : prev === 'neve' ? Math.max(0, 1 - into / 120000) : 0;
    return w;
}

// --- LUCE NELLE ORE DEL GIORNO ---
const P = (o) => ({
    sky: o.sky.map(c => new THREE.Color(c)), fog: new THREE.Color(o.fog), fogD: o.fogD,
    hemiS: new THREE.Color(o.hemi[0]), hemiG: new THREE.Color(o.hemi[1]), hemiI: o.hemi[2],
    amb: new THREE.Color(o.amb[0]), ambI: o.amb[1], dir: new THREE.Color(o.dir[0]), dirI: o.dir[1],
    water: o.water.map(c => new THREE.Color(c)), mist: new THREE.Color(o.mist[0]), mistI: o.mist[1], day: o.day,
});
const NIGHT = { sky: ['#0b001a', '#2d0a45', '#751e5e', '#ffaa00'], fog: '#2d0a45', fogD: 0.0085, hemi: ['#6a4a9a', '#1a1022', 1.2], amb: ['#2a1838', 0.78], dir: ['#b8b0ff', 1.15], water: ['#0d0618', '#2a1d3c', '#3a1458', '#c65a3a'], mist: ['#c8aae6', 1], day: 0 };
const DAWN = { sky: ['#26306a', '#7a4c8c', '#e8807a', '#ffc46e'], fog: '#7a5a86', fogD: 0.0068, hemi: ['#e6b4c8', '#3a2830', 1.3], amb: ['#5a4060', 0.55], dir: ['#ffb27a', 1.8], water: ['#1a1830', '#4a3552', '#7a4a7e', '#f29a66'], mist: ['#f0c0d0', 0.8], day: 0.5 };
const DAY = { sky: ['#3567b5', '#76a3dc', '#b8d2ee', '#f2dcc2'], fog: '#a7bad6', fogD: 0.0042, hemi: ['#d2e2ff', '#5a5244', 1.95], amb: ['#8a90b0', 0.7], dir: ['#fff0d6', 3.1], water: ['#0f3550', '#3a7a86', '#6c9cd0', '#d8e4ee'], mist: ['#ffffff', 0.45], day: 1 };
const DUSK = { sky: ['#1d1a58', '#6a3a80', '#e0607a', '#ffa040'], fog: '#6a3f78', fogD: 0.007, hemi: ['#e0a0c0', '#2a1a2a', 1.25], amb: ['#4a3050', 0.55], dir: ['#ff9a5a', 1.7], water: ['#16122a', '#3e2a4a', '#6a3a70', '#ff8a50'], mist: ['#e0b0d8', 0.85], day: 0.45 };
const KEYS = [[0, NIGHT], [4.6, NIGHT], [6, DAWN], [8.2, DAY], [16.6, DAY], [18.6, DUSK], [20.4, NIGHT], [24, NIGHT]].map(([h, o]) => ({ h, ...P(o) }));
export const MOON_DIR = new THREE.Vector3(-0.32, 0.42, -1).normalize();
const STORM = new THREE.Color('#c8c4ff'), GREY = new THREE.Color();

function greyed(c, amount, dark) {
    const l = c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
    GREY.setRGB(l, l, l * 1.04).multiplyScalar(1 - dark);
    return c.lerp(GREY, amount);
}

export class Environment {
    constructor() {
        const C = () => new THREE.Color();
        this.state = {
            hour: 7, day: 1, sky: [C(), C(), C(), C()], fog: C(), fogD: 0.006, hemiS: C(), hemiG: C(), hemiI: 1, amb: C(), ambI: 0.4,
            dir: C(), dirI: 1, dirVec: new THREE.Vector3(), sunDir: new THREE.Vector3(), water: [C(), C(), C(), C()], mist: C(), mistI: 1,
            sunVis: 0, moonVis: 1, starsVis: 1, cloud: 0, cloudCol: C(), dim: 0, rain: 0, snow: 0, storm: 0, wind: 0, cover: 0, flash: 0,
            weather: 'sereno', weatherName: '', icon: 'sun',
        };
        this.forceNight = false;
        // per le prove: ?ora=13 e ?meteo=neve nell'indirizzo
        const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
        this.debugHour = q.has('ora') ? +q.get('ora') % 24 : null;
        this.debugWeather = WEATHERS[q.get('meteo')] ? q.get('meteo') : null;
        this.nextBolt = 8;
        this.bolts = [];
        this.onThunder = null;
    }
    update(dt, now) {
        const S = this.state;
        const h = this.debugHour ?? (this.forceNight ? 23.2 : islandHour(now));
        S.hour = h;
        let i = 0;
        while (i < KEYS.length - 2 && h >= KEYS[i + 1].h) i++;
        const A = KEYS[i], B = KEYS[i + 1], t = smooth(0, 1, (h - A.h) / (B.h - A.h));
        for (let k = 0; k < 4; k++) { S.sky[k].lerpColors(A.sky[k], B.sky[k], t); S.water[k].lerpColors(A.water[k], B.water[k], t); }
        S.fog.lerpColors(A.fog, B.fog, t); S.fogD = lerp(A.fogD, B.fogD, t);
        S.hemiS.lerpColors(A.hemiS, B.hemiS, t); S.hemiG.lerpColors(A.hemiG, B.hemiG, t); S.hemiI = lerp(A.hemiI, B.hemiI, t);
        S.amb.lerpColors(A.amb, B.amb, t); S.ambI = lerp(A.ambI, B.ambI, t);
        S.dir.lerpColors(A.dir, B.dir, t); S.dirI = lerp(A.dirI, B.dirI, t);
        S.mist.lerpColors(A.mist, B.mist, t); S.mistI = lerp(A.mistI, B.mistI, t);
        S.day = lerp(A.day, B.day, t);
        // il sole sorge a est (+x), passa a sud e tramonta a ovest; la luce scivola dalla luna al sole
        const a = Math.PI * (h - 6) / (18.6 - 6);
        S.sunDir.set(Math.cos(a) * 0.8, Math.sin(a) * 0.85, 0.5).normalize();
        const sunUp = S.sunDir.y;
        const lit = S.sunDir.clone(); lit.y = Math.max(0.2, lit.y); lit.normalize();
        S.dirVec.copy(MOON_DIR).lerp(lit, smooth(0.25, 0.75, S.day)).normalize();
        S.sunVis = smooth(-0.08, 0.08, sunUp);
        S.moonVis = 1 - smooth(0.2, 0.6, S.day);
        S.starsVis = 1 - smooth(0.05, 0.45, S.day);

        // meteo
        const W = this.debugWeather ? { ...WEATHERS[this.debugWeather], id: this.debugWeather, cover: this.debugWeather === 'neve' ? 1 : 0 } : weatherAt(now);
        S.weather = W.id; S.cover = W.cover;
        for (const key of WKEYS) S[key] = W[key];
        const def = WEATHERS[W.id];
        S.weatherName = W.id === 'sereno' && S.day < 0.4 ? def.night : def.name;
        S.icon = W.id === 'sereno' && S.day < 0.4 ? 'moon' : def.icon;
        const c = S.cloud, dim = S.dim;
        for (const col of S.sky) greyed(col, c * 0.62, dim * 0.42);
        greyed(S.fog, c * 0.68, dim * 0.3);
        for (const col of S.water) greyed(col, c * 0.45, dim * 0.3);
        S.fogD *= 1 + c * 0.35 + S.rain * 0.85 + S.snow * 1.05;
        S.dirI *= Math.max(0.12, 1 - dim * 1.15);
        S.hemiI *= 1 - dim * 0.1;
        S.ambI += c * 0.16;
        S.sunVis *= 1 - c * 0.92; S.moonVis *= 1 - c * 0.85; S.starsVis *= 1 - c;
        // nuvole: bianche di giorno, rosate al tramonto, viola scuro di notte
        S.cloudCol.set('#2a1d42').lerp(GREY.set('#f6f3fa'), S.day).lerp(S.sky[3], 0.25 * (1 - Math.abs(S.day - 0.5) * 2));
        S.cloudCol.multiplyScalar(1 - dim * 0.55);

        // fulmini durante il temporale
        this.nextBolt -= dt;
        if (S.storm > 0.6 && this.nextBolt <= 0) {
            this.nextBolt = 9 + Math.random() * 24;
            this.bolts.push({ t: 0 }, { t: -0.12 - Math.random() * 0.1 });
            this.onThunder?.(0.4 + Math.random() * 2.2);
        }
        let flash = 0;
        this.bolts = this.bolts.filter(b => { b.t += dt; if (b.t > 0) flash = Math.max(flash, Math.exp(-b.t * 11)); return b.t < 0.6; });
        S.flash = flash;
        if (flash > 0.01) {
            S.hemiI += flash * 3; S.ambI += flash * 1.4;
            for (const col of S.sky) col.lerp(STORM, flash * 0.5);
        }
        return S;
    }
}

// --- CIELO: cupola, stelle, luna, sole e nuvole ---
function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
}
function cloudTexture(seed) {
    return canvasTex(256, 128, (g, w, h) => {
        let s = seed;
        const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        for (let i = 0; i < 26; i++) {
            const x = 40 + r() * 176, y = 50 + r() * 40 - Math.abs(x - 128) * 0.12, rad = 18 + r() * 30;
            const gr = g.createRadialGradient(x, y, 0, x, y, rad);
            gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
        }
    });
}
export function addSkyExtras(g, seed = 3) {
    const tex = [cloudTexture(seed * 11 + 1), cloudTexture(seed * 11 + 5), cloudTexture(seed * 11 + 9)];
    const clouds = new THREE.Group();
    let s = seed * 977;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 26; i++) {
        const m = new THREE.SpriteMaterial({ map: tex[i % 3], fog: false, depthWrite: false, transparent: true, opacity: 0 });
        const sp = new THREE.Sprite(m);
        const az = r() * Math.PI * 2, el = 0.06 + r() * 0.42, d = 700;
        sp.position.set(Math.cos(az) * Math.cos(el) * d, Math.sin(el) * d, Math.sin(az) * Math.cos(el) * d);
        const k = 0.8 + r() * 0.9;
        sp.scale.set(330 * k, 130 * k, 1);
        sp.renderOrder = -9;
        sp.userData.base = 0.55 + r() * 0.45;
        clouds.add(sp);
    }
    g.add(clouds);
    const sunTex = canvasTex(256, 256, (c) => {
        const gr = c.createRadialGradient(128, 128, 0, 128, 128, 128);
        gr.addColorStop(0, 'rgba(255,252,240,1)'); gr.addColorStop(0.16, 'rgba(255,246,220,1)'); gr.addColorStop(0.22, 'rgba(255,220,160,0.55)');
        gr.addColorStop(0.5, 'rgba(255,190,120,0.14)'); gr.addColorStop(1, 'rgba(255,170,90,0)');
        c.fillStyle = gr; c.fillRect(0, 0, 256, 256);
    });
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, fog: false, depthWrite: false, transparent: true, opacity: 0 }));
    sun.scale.set(260, 260, 1); sun.renderOrder = -9;
    g.add(sun);
    Object.assign(g.userData, { clouds, sun });
}
// applica lo stato del cielo a un gruppo creato da makeSky (isola o arena)
export function applySky(g, S, t) {
    const u = g.userData;
    if (u.mat) { u.mat.uniforms.top.value.copy(S.sky[0]); u.mat.uniforms.mid.value.copy(S.sky[1]); u.mat.uniforms.low.value.copy(S.sky[2]); u.mat.uniforms.hor.value.copy(S.sky[3]); }
    if (u.stars) { u.stars.material.opacity = 0.9 * S.starsVis; u.stars.visible = S.starsVis > 0.01; }
    if (u.moon) { u.moon.material.opacity = S.moonVis; u.moon.visible = S.moonVis > 0.01; }
    if (u.sun) {
        u.sun.position.copy(S.sunDir).multiplyScalar(780);
        u.sun.material.opacity = S.sunVis; u.sun.visible = S.sunVis > 0.01;
        u.sun.material.color.set('#ffffff').lerp(S.dir, 0.5);
    }
    if (u.clouds) {
        u.clouds.rotation.y = t * 0.004 * (1 + S.wind * 2);
        const op = Math.min(1, 0.1 + S.cloud * 0.85);
        for (const c of u.clouds.children) { c.material.opacity = op * c.userData.base; c.material.color.copy(S.cloudCol); }
    }
}

// --- PIOGGIA E NEVE (seguono la camera, calcolate dalla scheda video) ---
const PRECIP_VS = `
    attribute vec3 seed; attribute float tip;
    uniform vec3 uCam; uniform float uTime, uBox, uH, uSpeed, uLen, uSize, uSnow; uniform vec2 uWind;
    varying float vA;
    void main(){
        float fall = fract(seed.y + uTime * uSpeed / uH);
        vec3 p;
        p.y = uCam.y + uH * 0.62 - fall * uH;
        vec2 w = seed.xz * uBox + uWind * (1.0 - fall) * uH / uSpeed * 0.6;
        if (uSnow > 0.5) w += vec2(sin(uTime * 0.9 + seed.y * 31.0), cos(uTime * 0.7 + seed.x * 23.0)) * 0.8;
        vec2 d = w - uCam.xz; d -= uBox * floor(d / uBox + 0.5);
        p.xz = uCam.xz + d;
        vec3 v = normalize(vec3(uWind.x, -uSpeed, uWind.y));
        p += v * uLen * tip;
        vA = (1.0 - smoothstep(uBox * 0.3, uBox * 0.5, length(d))) * smoothstep(0.0, 0.08, fall) * (1.0 - smoothstep(0.9, 1.0, fall));
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * 300.0 / max(1.0, -mv.z);
    }`;
const RAIN_FS = `uniform vec3 uColor; uniform float uOpacity; varying float vA;
    void main(){ gl_FragColor = vec4(uColor, uOpacity * vA); }`;
const SNOW_FS = `uniform vec3 uColor; uniform float uOpacity; varying float vA;
    void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uColor, uOpacity * vA * smoothstep(0.5, 0.18, d)); }`;

export class Precipitation {
    constructor(scene, opts = {}) {
        const n = opts.count || 1400;
        const mk = (snow) => {
            const verts = snow ? 1 : 2, seed = new Float32Array(n * verts * 3), tip = new Float32Array(n * verts);
            for (let i = 0; i < n; i++) {
                const sx = Math.random(), sy = Math.random(), sz = Math.random();
                for (let v = 0; v < verts; v++) { seed.set([sx, sy, sz], (i * verts + v) * 3); tip[i * verts + v] = v; }
            }
            const g = new THREE.BufferGeometry();
            g.setAttribute('seed', new THREE.BufferAttribute(seed, 3));
            g.setAttribute('tip', new THREE.BufferAttribute(tip, 1));
            g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * verts * 3), 3));
            const m = new THREE.ShaderMaterial({
                transparent: true, depthWrite: false,
                uniforms: {
                    uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uBox: { value: snow ? 34 : 30 }, uH: { value: snow ? 22 : 26 },
                    uSpeed: { value: snow ? 1.6 : 19 }, uLen: { value: snow ? 0 : 0.75 }, uSize: { value: snow ? 0.28 : 0 }, uSnow: { value: snow ? 1 : 0 },
                    uWind: { value: new THREE.Vector2(snow ? 0.5 : 2.2, snow ? 0.2 : 0.8) },
                    uColor: { value: new THREE.Color(snow ? '#f4f6ff' : '#b8c4e0') }, uOpacity: { value: 0 },
                },
                vertexShader: PRECIP_VS, fragmentShader: snow ? SNOW_FS : RAIN_FS,
            });
            const o = snow ? new THREE.Points(g, m) : new THREE.LineSegments(g, m);
            o.frustumCulled = false; o.visible = false; o.renderOrder = 5;
            scene.add(o);
            return o;
        };
        this.rain = mk(false);
        this.snow = mk(true);
        this.t = 0;
    }
    update(dt, cam, S, hidden) {
        this.t += dt;
        for (const [o, amt, op] of [[this.rain, S.rain, 0.42], [this.snow, S.snow, 0.9]]) {
            const u = o.material.uniforms;
            o.visible = !hidden && amt > 0.02;
            if (!o.visible) continue;
            u.uCam.value.copy(cam); u.uTime.value = this.t;
            u.uOpacity.value = op * amt * (0.55 + 0.45 * S.day + S.flash);
            u.uWind.value.set(o === this.rain ? 1 + S.wind * 3 : 0.3 + S.wind, o === this.rain ? 0.5 + S.wind : 0.2);
        }
    }
}

// --- NEVE AL SUOLO: imbianca le superfici rivolte verso l'alto ---
export const SNOW_COVER = { value: 0 };
export function addSnowCover(mat, minY = -1e9) {
    mat.onBeforeCompile = (sh) => {
        sh.uniforms.uSnowCover = SNOW_COVER;
        sh.vertexShader = sh.vertexShader
            .replace('#include <common>', '#include <common>\nvarying float vSnowUp; varying float vSnowY;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSnowUp = normalize(mat3(modelMatrix) * objectNormal).y; vSnowY = (modelMatrix * vec4(transformed, 1.0)).y;');
        sh.fragmentShader = sh.fragmentShader
            .replace('#include <common>', `#include <common>\nvarying float vSnowUp; varying float vSnowY; uniform float uSnowCover;`)
            .replace('#include <color_fragment>', `#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.6, 0.63, 0.7), uSnowCover * smoothstep(0.62, 0.9, vSnowUp) * smoothstep(${minY.toFixed(2)}, ${(minY + 0.4).toFixed(2)}, vSnowY));`);
    };
    mat.customProgramCacheKey = () => 'snow' + minY;
    mat.needsUpdate = true;
}
