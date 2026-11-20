// =====================================================================
//  MOTORE DI STREAMING (come nei game engine veri)
//  1. Celle: gli oggetti del mondo vengono divisi in celle di 32 m e
//     per grandezza. Si disegna solo ciò che è nel campo visivo e
//     abbastanza vicino: gli oggetti piccoli spariscono prima, quelli
//     grandi e le fiamme restano visibili fino all'orizzonte nella nebbia.
//  2. Boschi a pezzi: le istanze sparse su tutta l'isola (alberi, rocce,
//     canne, lapidi) vengono spezzate in blocchi, così la scheda video
//     scarta quelli alle tue spalle.
//  3. Luci a rotazione: tutte le torce hanno una luce vera, ma solo le N
//     più vicine sono accese davvero (il numero non cambia mai, così non
//     si ricompilano gli shader e non ci sono scatti).
//  4. Risoluzione dinamica: se i fotogrammi rallentano, la risoluzione
//     scende un po'; quando torna fluido, risale.
//  5. Regioni: zone intere della mappa che si scaricano come moduli a parte
//     solo quando ti avvicini, e si liberano quando ti allontani.
//  F3 mostra il pannello delle prestazioni.
// =====================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const CELL = 32;
const _box = new THREE.Box3(), _sph = new THREE.Sphere(), _v = new THREE.Vector3(), _m = new THREE.Matrix4();
const _frustum = new THREE.Frustum(), _pv = new THREE.Matrix4();

function isGlowy(o) {
    let g = false;
    o.traverse(c => { const m = c.material; if (c.isSprite || (m && !Array.isArray(m) && m.blending === THREE.AdditiveBlending)) g = true; });
    return g;
}
function sphereOf(o) {
    _box.makeEmpty();
    o.traverse(c => {
        if (c.isLight) return;
        if (c.isInstancedMesh) { if (!c.boundingSphere) c.computeBoundingSphere(); const s = c.boundingSphere.clone().applyMatrix4(c.matrixWorld); _box.expandByPoint(_v.copy(s.center).addScalar(s.radius)); _box.expandByPoint(_v.copy(s.center).addScalar(-s.radius)); return; }
        if (c.isSprite) { c.getWorldPosition(_v); const r = Math.max(c.scale.x, c.scale.y) * 0.6; _box.expandByPoint(_v.clone().addScalar(r)); _box.expandByPoint(_v.addScalar(-r)); return; }
        if (c.geometry) { if (!c.geometry.boundingBox) c.geometry.computeBoundingBox(); _box.union(c.geometry.boundingBox.clone().applyMatrix4(c.matrixWorld)); }
    });
    if (_box.isEmpty()) { o.getWorldPosition(_v); return new THREE.Sphere(_v.clone(), 0.5); }
    return _box.getBoundingSphere(new THREE.Sphere());
}

// Spezza un InstancedMesh esteso in blocchi da `cell` metri
export function splitInstanced(im, cell = 48) {
    const groups = new Map();
    for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, _m);
        _v.setFromMatrixPosition(_m);
        if (_m.elements[0] === 0 && _m.elements[5] === 0 && _m.elements[10] === 0) continue;   // istanza nascosta (scala 0)
        const k = Math.floor(_v.x / cell) + ',' + Math.floor(_v.z / cell);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(i);
    }
    const out = [];
    for (const idx of groups.values()) {
        const part = new THREE.InstancedMesh(im.geometry, im.material, idx.length);
        part.castShadow = im.castShadow; part.receiveShadow = im.receiveShadow;
        part.renderOrder = im.renderOrder; part.name = im.name;
        idx.forEach((src, j) => {
            im.getMatrixAt(src, _m); part.setMatrixAt(j, _m);
            if (im.instanceColor) { const c = new THREE.Color(); im.getColorAt(src, c); part.setColorAt(j, c); }
        });
        part.instanceMatrix.needsUpdate = true;
        part.matrixAutoUpdate = im.matrixAutoUpdate;
        part.position.copy(im.position); part.quaternion.copy(im.quaternion); part.scale.copy(im.scale);
        part.updateMatrix(); part.updateMatrixWorld(true);
        part.computeBoundingSphere();
        out.push(part);
    }
    return out;
}

// --- PERSONAGGI: ombre solo da vicino, mai per i dettagli minuscoli ---
export function characterLod(ch, d) {
    let L = ch._lod;
    if (!L) {
        L = ch._lod = { cast: null, list: [] };
        ch.root.traverse(c => {
            if (!c.isMesh || !c.castShadow) return;
            if (!c.geometry.boundingSphere) c.geometry.computeBoundingSphere();
            const s = c.geometry.boundingSphere.radius * Math.max(c.scale.x, c.scale.y, c.scale.z);
            if (s < 0.07) c.castShadow = false;      // occhi, bottoni, denti: l'ombra non si vede
            else L.list.push(c);
        });
    }
    const cast = d < 18;
    if (cast !== L.cast) { L.cast = cast; for (const m of L.list) m.castShadow = cast; }
}

// --- HLOD: da lontano una cella diventa pochi blocchi fusi (uno per materiale) ---
function plainAttr(a) {
    const s = a.itemSize, arr = new Float32Array(a.count * s);
    for (let i = 0; i < a.count; i++) {
        arr[i * s] = a.getX(i);
        if (s > 1) arr[i * s + 1] = a.getY(i);
        if (s > 2) arr[i * s + 2] = a.getZ(i);
        if (s > 3) arr[i * s + 3] = a.getW(i);
    }
    return new THREE.BufferAttribute(arr, s);
}
function mergeable(c, root) {
    if (!c.isMesh || c.isInstancedMesh || c.isSkinnedMesh || Array.isArray(c.material)) return false;
    const m = c.material;
    if (!m || m.isShaderMaterial || m.blending === THREE.AdditiveBlending || c.frustumCulled === false) return false;
    if (c.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) return false;   // specchi, riflessi
    const g = c.geometry;
    if (!g?.attributes.position || g.morphAttributes?.position || c.userData.noMerge) return false;
    for (let p = c; p && p !== root; p = p.parent) if (!p.visible || p.userData.noMerge) return false;
    return true;
}
// due materiali che si vedono uguali hanno la stessa chiave, anche se sono oggetti diversi
const MAT_PROPS = ['type', 'roughness', 'metalness', 'opacity', 'transparent', 'side', 'flatShading', 'vertexColors', 'alphaTest', 'emissiveIntensity', 'fog', 'depthWrite', 'toneMapped', 'wireframe'];
const MAT_TEX = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap', 'bumpMap'];
function matKey(m) {
    if (m.userData.hlodKey) return m.userData.hlodKey;
    let k = MAT_PROPS.map(p => m[p]).join('|');
    if (m.color) k += '|' + m.color.getHexString();
    if (m.emissive) k += '|' + m.emissive.getHexString();
    for (const t of MAT_TEX) k += '|' + (m[t] ? m[t].uuid : '');
    if (m.onBeforeCompile && m.onBeforeCompile.toString() !== THREE.Material.prototype.onBeforeCompile.toString()) k += '|' + m.uuid;   // shader modificati: restano a parte
    if (m.defines && Object.keys(m.defines).length) k += '|' + JSON.stringify(m.defines);
    // materiali che si accendono (finestre, rune): il gioco li cambia di notte, restano i loro
    if (m.emissive && m.emissive.getHex() !== 0) k += '|' + m.uuid;
    return (m.userData.hlodKey = k);
}
function buildProxy(root) {
    root.updateMatrixWorld(true);
    const groups = new Map();
    root.traverse(c => {
        if (!mergeable(c, root)) return;
        const col = !!c.material.vertexColors && !!c.geometry.attributes.color;
        const k = matKey(c.material) + (col ? '+c' : '');
        if (!groups.has(k)) groups.set(k, { mat: c.material, col, list: [] });
        groups.get(k).list.push(c);
    });
    const proxy = new THREE.Group();
    proxy.name = 'hlod';
    proxy.userData.noMerge = true;
    const hidden = [];
    for (const G of groups.values()) {
        if (G.list.length < 2) continue;
        const geos = [];
        for (const c of G.list) {
            const src = c.geometry, g = new THREE.BufferGeometry();
            g.setAttribute('position', plainAttr(src.attributes.position));
            if (src.attributes.normal) g.setAttribute('normal', plainAttr(src.attributes.normal));
            g.setAttribute('uv', src.attributes.uv ? plainAttr(src.attributes.uv) : new THREE.BufferAttribute(new Float32Array(src.attributes.position.count * 2), 2));
            if (G.col) g.setAttribute('color', plainAttr(src.attributes.color));
            g.setIndex(src.index ? Array.from(src.index.array) : Array.from({ length: src.attributes.position.count }, (_, i) => i));
            if (!src.attributes.normal) g.computeVertexNormals();
            g.applyMatrix4(c.matrixWorld);          // le celle stanno all'origine
            geos.push(g);
        }
        let merged = null;
        try { merged = mergeGeometries(geos, false); } catch (e) { merged = null; }
        for (const g of geos) g.dispose();
        if (!merged) continue;
        merged.computeBoundingSphere();
        const m = new THREE.Mesh(merged, G.mat);
        m.receiveShadow = true;
        m.userData.noMerge = true;
        proxy.add(m);
        hidden.push(...G.list);
    }
    if (!hidden.length) return null;
    proxy.visible = false;
    root.add(proxy);
    return { proxy, hidden };
}

// --- LUCI A ROTAZIONE ---
class LightPool {
    constructor(scene, size) {
        this.slots = [];
        this.sources = [];
        for (let i = 0; i < size; i++) {
            const l = new THREE.PointLight('#ff8a3a', 0, 16, 1.5);
            l.userData.pool = true;
            scene.add(l);
            this.slots.push({ l, src: null, w: 0 });
        }
        this.t = 0;
    }
    // la luce originale resta nella scena come «segnaposto»: si muove col suo oggetto
    // e il codice del gioco può continuare a cambiarne intensità, colore e visibilità.
    // Il renderer però non la conta: sta su un livello (layer) che nessuna telecamera guarda.
    // (Non si usa visible: le ombre di contatto lo salvano e lo ripristinano a ogni fotogramma.)
    capture(l) {
        l.layers.set(31);
        const src = { l, on: () => l.visible, pos: new THREE.Vector3(), score: 0 };
        this.sources.push(src);
        return src;
    }
    enabled(src) {
        if (!src.on() || src.l.intensity <= 0.001) return false;
        for (let p = src.l.parent; p; p = p.parent) { if (p.userData.bucket) break; if (!p.visible) return false; }
        return true;
    }
    update(dt, focus) {
        this.t -= dt;
        if (this.t <= 0) {
            this.t = 0.2;
            const cand = [];
            for (const s of this.sources) {
                if (!this.enabled(s)) continue;
                s.l.getWorldPosition(s.pos);
                const d = s.pos.distanceTo(focus) - (s.l.distance || 20) * 0.35;
                if (d > 70) continue;
                s.score = d; cand.push(s);
            }
            cand.sort((a, b) => a.score - b.score);
            const want = new Set(cand.slice(0, this.slots.length));
            for (const sl of this.slots) if (sl.src && !want.has(sl.src)) { sl.src = null; sl.w = 0; }
            for (const s of want) {
                if (this.slots.some(sl => sl.src === s)) continue;
                const free = this.slots.find(sl => !sl.src);
                if (free) { free.src = s; free.w = 0; }
            }
        }
        for (const sl of this.slots) {
            const s = sl.src, l = sl.l;
            if (!s) { l.intensity = 0; continue; }
            if (!this.enabled(s)) { l.intensity = 0; sl.w = 0; continue; }
            sl.w = Math.min(1, sl.w + dt * 3);
            s.l.getWorldPosition(l.position);
            l.color.copy(s.l.color);
            l.distance = s.l.distance; l.decay = s.l.decay;
            l.intensity = s.l.intensity * sl.w;
        }
    }
    get active() { return this.slots.filter(s => s.src).length; }
}

export class Streamer {
    constructor(app, opts = {}) {
        this.app = app;
        this.scene = app.scene;
        const alta = opts.quality === 'alta';
        this.alta = alta;
        this.dist = alta ? { small: 70, medium: 130, large: 230 } : { small: 45, medium: 90, large: 160 };
        this.near = 36;              // vicino al giocatore tutto resta acceso (ombre, specchio, alle spalle)
        this.hlodDist = alta ? 55 : 40;   // oltre questa distanza le celle diventano blocchi fusi
        this.buckets = new Map();
        this.list = [];
        this.regions = [];
        this.pool = new LightPool(this.scene, alta ? 14 : 6);
        this.stats = { visible: 0, total: 0 };
        // risoluzione dinamica
        this.maxPR = Math.min(devicePixelRatio, alta ? 1.5 : 1);
        this.minPR = Math.min(this.maxPR, 0.65);
        this.pr = this.maxPR;
        this.ft = 16; this.prT = 0;
        this.hud = null;
        addEventListener('keydown', (e) => { if (e.code === 'F3') { e.preventDefault(); this.toggleHud(); } });
    }

    // Prende in carico ciò che il mondo ha appena costruito
    adopt(objects, skip = new Set()) {
        const scene = this.scene;
        scene.updateMatrixWorld(true);
        for (const o of objects) {
            if (skip.has(o) || o.userData.noStream) continue;
            // luci: le PointLight passano alla rotazione, le altre restano
            if (o.isLight) { if (o.isPointLight && !o.userData.pool) this.pool.capture(o); continue; }
            o.traverse(c => { if (c.isPointLight && !c.userData.pool) this.pool.capture(c); });
            // boschi estesi → blocchi
            if (o.isInstancedMesh && o.count > 16) {
                if (!o.boundingSphere) o.computeBoundingSphere();
                if (o.boundingSphere.radius > 40) {
                    const parts = splitInstanced(o);
                    scene.remove(o);
                    for (const p of parts) { scene.add(p); this.place(p); }
                    continue;
                }
            }
            this.place(o);
        }
        for (const b of this.buckets.values()) {
            b.sphere = b.items.reduce((acc, s) => acc ? acc.union(s) : s.clone(), null);
            b.hlod = buildProxy(b.g);     // versione «da lontano» della cella
            b.far = false;
        }
        this.stats.total = this.buckets.size;
    }
    place(o) {
        const s = sphereOf(o);
        if (s.radius > 70) return;                     // terreno, acqua, cupole: sempre visibili
        const glowy = isGlowy(o);
        const cls = glowy || s.radius >= 6 ? 'large' : s.radius >= 1.5 ? 'medium' : 'small';
        const k = `${Math.floor(s.center.x / CELL)},${Math.floor(s.center.z / CELL)},${cls}`;
        let b = this.buckets.get(k);
        if (!b) {
            const g = new THREE.Group();
            g.name = 'cella ' + k; g.userData.bucket = true;
            this.scene.add(g);
            b = { g, cls, items: [], sphere: null };
            this.buckets.set(k, b);
            this.list.push(b);
        }
        g_attach(b.g, o);
        b.items.push(s);
    }

    // Regione: una zona intera caricata come modulo solo quando ti avvicini.
    // load() → Promise<{ group, dispose? }>; la zona si libera oltre radius + 60 m.
    region(name, center, radius, load) {
        this.regions.push({ name, center: new THREE.Vector3(center.x, 0, center.z), radius, load, state: 'off', obj: null });
    }
    loadRegion(R) {
        if (R.promise) return R.promise;
        R.state = 'loading';
        return (R.promise = R.load().then(obj => {
            R.obj = obj; R.state = 'on';
            if (obj.group) {
                this.scene.add(obj.group);
                // le luci della regione entrano nella rotazione
                R.lights = [];
                obj.group.traverse(c => { if (c.isPointLight) R.lights.push(this.pool.capture(c)); });
            }
            return R;
        }).catch(err => { console.warn('[stream] regione', R.name, err); R.state = 'off'; R.promise = null; }));
    }
    unloadRegion(R) {
        if (R.obj.group) this.scene.remove(R.obj.group);
        if (R.lights) {
            this.pool.sources = this.pool.sources.filter(s => !R.lights.includes(s));
            for (const sl of this.pool.slots) if (R.lights.includes(sl.src)) { sl.src = null; sl.w = 0; }
            R.lights = null;
        }
        R.obj.dispose?.();
        R.obj = null; R.state = 'off'; R.promise = null;
    }
    // per i viaggi: carica subito la regione che contiene (x, z) e aspetta che sia pronta
    async ensureAt(x, z) {
        const R = this.regions.find(r => Math.hypot(x - r.center.x, z - r.center.z) < r.radius + 20);
        if (R && R.state !== 'on') await this.loadRegion(R);
        return R;
    }
    updateRegions(focus) {
        for (const R of this.regions) {
            const d = Math.hypot(focus.x - R.center.x, focus.z - R.center.z) - R.radius;
            if (R.state === 'off' && d < this.dist.large) this.loadRegion(R);
            else if (R.state === 'on' && d > this.dist.large + 60) this.unloadRegion(R);
        }
    }

    update(dt, camera, focus) {
        // celle
        _pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        _frustum.setFromProjectionMatrix(_pv);
        const cp = camera.position;
        let vis = 0;
        for (const b of this.list) {
            const s = b.sphere;
            const d = cp.distanceTo(s.center) - s.radius;
            const show = d < this.near || (d < this.dist[b.cls] && _frustum.intersectsSphere(s));
            b.g.visible = show;
            if (show) vis++;
            // da lontano: blocchi fusi al posto dei pezzi singoli
            const far = show && !!b.hlod && d > this.hlodDist;
            if (far !== b.far) {
                b.far = far;
                b.hlod.proxy.visible = far;
                // al ritorno ogni pezzo riprende lo stato che aveva (il gioco può averlo nascosto)
                for (const m of b.hlod.hidden) {
                    if (far) { m.userData.wasVisible = m.visible; m.visible = false; }
                    else m.visible = m.userData.wasVisible ?? true;
                }
            }
        }
        this.stats.visible = vis;
        this.pool.update(dt, focus || cp);
        this.updateRegions(focus || cp);
        this.adaptResolution(dt);
        // con il bloom ci sono più passate per fotogramma: i contatori si azzerano a mano
        const info = this.app.renderer.info;
        if (this.hud) {
            info.autoReset = false;
            this.frameInfo = { calls: info.render.calls, tris: info.render.triangles };
            info.reset();
            this.drawHud(dt);
        } else info.autoReset = true;
    }

    adaptResolution(dt) {
        this.ft += (dt * 1000 - this.ft) * 0.05;
        this.prT -= dt;
        if (this.prT > 0 || document.hidden) return;
        let pr = this.pr;
        if (this.ft > 24 && pr > this.minPR) pr = Math.max(this.minPR, pr - 0.1);
        else if (this.ft < 15 && pr < this.maxPR) pr = Math.min(this.maxPR, pr + 0.05);
        if (pr !== this.pr) {
            this.pr = pr;
            this.prT = 2.5;
            const r = this.app.renderer;
            r.setPixelRatio(pr);
            r.setSize(innerWidth, innerHeight);
            this.app.composer?.setPixelRatio?.(pr);
            this.app.composer?.setSize(innerWidth, innerHeight);
        } else this.prT = 1;
    }

    toggleHud() {
        if (this.hud) { this.hud.remove(); this.hud = null; return; }
        const d = this.hud = document.createElement('div');
        d.id = 'perf-hud';
        d.style.cssText = 'position:fixed;left:12px;top:50%;transform:translateY(-50%);z-index:60;pointer-events:none;font:12px/1.45 Consolas,monospace;color:#e8dcc0;background:rgba(10,6,4,.78);border:1px solid #8a6a2e;border-radius:6px;padding:8px 10px;white-space:pre;';
        document.body.append(d);
        this.hudT = 0;
    }
    drawHud(dt) {
        this.hudT -= dt;
        if (this.hudT > 0) return;
        this.hudT = 0.25;
        const i = this.app.renderer.info;
        const loaded = this.regions.filter(r => r.state === 'on').map(r => r.name);
        this.hud.textContent =
            `FPS        ${Math.round(1000 / this.ft)}  (${this.ft.toFixed(1)} ms)\n` +
            `Risoluzione ${Math.round(this.pr * 100)}%\n` +
            `Draw call  ${this.frameInfo.calls}\n` +
            `Triangoli  ${(this.frameInfo.tris / 1000).toFixed(0)}k\n` +
            `Celle      ${this.stats.visible}/${this.stats.total}\n` +
            `Luci       ${this.pool.active}/${this.pool.slots.length} accese, ${this.pool.sources.length} torce\n` +
            `Geometrie  ${i.memory.geometries}  Texture ${i.memory.textures}\n` +
            `Regioni    ${loaded.length ? loaded.join(', ') : '—'}`;
    }
}

// sposta un oggetto sotto un'altra Group senza cambiarne la posizione (le celle sono all'origine)
function g_attach(group, o) {
    if (o.parent && o.parent !== group) o.parent.remove(o);
    group.add(o);
}
