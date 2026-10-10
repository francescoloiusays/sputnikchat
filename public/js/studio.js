// =====================================================================
//  STUDIO: un piccolo renderer separato per anteprime 3D
//  (creatore, sartoria, forgia, inventario) e ritratti per le card.
// =====================================================================
import * as THREE from 'three';
import { Character, buildWeapon } from './character.js';

export class Studio {
    constructor() {
        const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        r.outputColorSpace = THREE.SRGBColorSpace;
        r.toneMapping = THREE.ACESFilmicToneMapping;
        r.toneMappingExposure = 1.15;
        r.shadowMap.enabled = true;
        r.setClearColor(0x000000, 0);
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
        const s = this.scene;
        s.add(new THREE.HemisphereLight('#8a6ac0', '#1a1022', 1.1));
        const key = new THREE.DirectionalLight('#ffd2a0', 2.2);
        key.position.set(2.5, 3.5, 3); key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        s.add(key);
        const rim = new THREE.DirectionalLight('#b37aff', 2.4);
        rim.position.set(-3, 2.5, -3);
        s.add(rim);
        const fill = new THREE.PointLight('#ff7a2a', 6, 8, 1.5);
        fill.position.set(-1.5, 1, 2);
        s.add(fill);
        // piedistallo
        const ped = this.pedestal = new THREE.Group();
        const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.22, 40), new THREE.MeshStandardMaterial({ color: '#2a2234', roughness: 0.8 }));
        stone.position.y = -0.11; stone.receiveShadow = true;
        ped.add(stone);
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.7, 48), new THREE.MeshBasicMaterial({ color: '#b37aff', transparent: true, opacity: 0.8 }));
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.005;
        ped.add(ring);
        this.ring = ring;
        s.add(ped);
        this.char = null;
        this.weapon = null;
        this.yaw = 0.35;
        this.mode = 'full';
        this.running = false;
        this.clock = new THREE.Clock();
        const el = r.domElement;
        let drag = null;
        el.addEventListener('pointerdown', (e) => { drag = e.clientX; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; });
        el.addEventListener('pointermove', (e) => { if (drag != null) { this.yaw += (e.clientX - drag) * 0.012; drag = e.clientX; } });
        el.addEventListener('pointerup', () => { drag = null; el.style.cursor = 'grab'; });
        el.style.touchAction = 'none';
    }

    setCharacter(appearance, look) {
        if (this.char) this.char.dispose();
        this.char = new Character(appearance, look);
        this.scene.add(this.char.root);
        this.clearWeapon();
    }
    showWeapon(spec) {
        this.clearWeapon();
        if (this.char) this.char.root.visible = false;
        // l'arma, inclinata, viene centrata e ridimensionata per stare tutta nell'inquadratura
        const w = buildWeapon(spec);
        w.rotation.z = -0.55;
        const tilt = new THREE.Group(); tilt.add(w);
        tilt.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(tilt), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
        const k = 1.05 / Math.max(size.x, size.y, 0.3);
        tilt.scale.setScalar(k);
        tilt.position.set(-c.x * k, -c.y * k, -c.z * k);
        this.weapon = new THREE.Group();
        this.weapon.add(tilt);
        this.weapon.position.y = 0.85;
        this.scene.add(this.weapon);
    }
    clearWeapon() {
        if (this.weapon) { this.scene.remove(this.weapon); this.weapon = null; }
        if (this.char) this.char.root.visible = true;
    }

    mount(container, mode = 'full') {
        this.mode = mode;
        container.append(this.renderer.domElement);
        this.container = container;
        this.resize();
        if (!this.running) { this.running = true; this.clock.getDelta(); this.loop(); }
        this.ro?.disconnect();
        this.ro = new ResizeObserver(() => this.resize());
        this.ro.observe(container);
    }
    unmount() {
        this.running = false;
        this.ro?.disconnect();
        this.renderer.domElement.remove();
        this.container = null;
    }
    resize() {
        if (!this.container) return;
        const w = Math.max(10, this.container.clientWidth), h = Math.max(10, this.container.clientHeight);
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
    }
    frame() {
        const top = this.char?.topY || 1.9;
        const a = this.camera.aspect;
        if (this.weapon) {
            this.camera.position.set(0, 0.9, 3.2);
            this.camera.lookAt(0, 0.85, 0);
        } else if (this.mode === 'bust') {
            this.camera.position.set(0, top * 0.82, 2.4);
            this.camera.lookAt(0, top * 0.74, 0);
        } else {
            const dist = (top * 0.5 + 0.3) / Math.tan(THREE.MathUtils.degToRad(15)) / Math.min(1, a * 1.1);
            this.camera.position.set(0, top * 0.55, dist);
            this.camera.lookAt(0, top * 0.47, 0);
        }
    }
    loop() {
        if (!this.running) return;
        requestAnimationFrame(() => this.loop());
        const dt = Math.min(0.05, this.clock.getDelta());
        if (this.char) { this.char.update(dt); this.char.root.rotation.y = this.yaw; }
        if (this.weapon) this.weapon.rotation.y += dt * 0.9;
        this.ring.material.opacity = 0.55 + Math.sin(performance.now() * 0.003) * 0.25;
        this.frame();
        this.renderer.render(this.scene, this.camera);
    }

    // Ritratto con sfondo trasparente (per card e profilo)
    portrait(appearance, look, size = 512, framing = 'bust', pose = null) {
        const wasRunning = this.running;
        const prevSize = new THREE.Vector2(); this.renderer.getSize(prevSize);
        const prevAspect = this.camera.aspect;
        const prevChar = this.char, prevWeapon = this.weapon;
        if (prevChar) prevChar.root.visible = false;
        if (prevWeapon) prevWeapon.visible = false;
        this.pedestal.visible = false;
        const ch = new Character(appearance, look);
        this.scene.add(ch.root);
        for (let i = 0; i < 30; i++) ch.update(1 / 30);
        ch.pose.headRy = pose?.head || 0; ch.pose.headRx = 0.05 + (pose?.tilt || 0);
        ch.root.rotation.y = pose?.ry ?? 0.32;
        ch.update(0.0001);
        this.renderer.setSize(size, size, false);
        this.camera.aspect = 1; this.camera.updateProjectionMatrix();
        const top = ch.topY;
        if (framing === 'bust') { this.camera.position.set(-0.15, top * 0.83, 1.85); this.camera.lookAt(0, top * 0.75, 0); }
        else { this.camera.position.set(-0.3, top * 0.6, 5.2); this.camera.lookAt(0, top * 0.5, 0); }
        this.renderer.render(this.scene, this.camera);
        const out = document.createElement('canvas'); out.width = out.height = size;
        out.getContext('2d').drawImage(this.renderer.domElement, 0, 0, size, size);
        ch.dispose();
        this.pedestal.visible = true;
        if (prevChar) prevChar.root.visible = !prevWeapon;
        if (prevWeapon) prevWeapon.visible = true;
        this.renderer.setSize(prevSize.x, prevSize.y, false);
        this.camera.aspect = prevAspect; this.camera.updateProjectionMatrix();
        this.running = wasRunning;
        return out;
    }
}
