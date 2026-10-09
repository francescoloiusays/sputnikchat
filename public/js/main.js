// =====================================================================
//  SPUTNIKCHAT 3D — L'Isola Fantasma
//  Avvio, mondo in terza persona, rete, HUD, duelli.
// =====================================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { World, WORLD, makeSky } from './world.js';
import { Character } from './character.js';
import { Studio } from './studio.js';
import { Creator, randomAppearance } from './creator.js';
import { Panels } from './panels.js';
import { DuelView } from './duel.js';
import { GameAudio } from './audio.js';
import { composeCard } from './cards.js';
import { Net, SOCKET_URL, IS_MOBILE, store, $, h, toast, fmt } from './util.js';
import { installTheme, icon, iconSVG, drawIcon } from './icons.js';
import { ITEMS, ELEMENTS, ELEMENT_IDS, WEAPON_TYPES, MATERIALS, GEMS, sanitizeCard, sanitizeAppearance, STARTER_WEAPON, levelProgress, titleFor, talentPoints, TALENT_IDS } from './shared/catalog.js';

const ANIMS = ['idle', 'walk', 'run', 'air', 'sit'];
const EMOTES = { Digit1: ['saluta', 2], Digit2: ['balla', 4], Digit3: ['inchino', 1.8], Digit4: ['ride', 2] };
const EMOTE_DUR = { saluta: 2, balla: 4, inchino: 1.8, ride: 2 };
const lerpAngle = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };

// --- GIOCATORE REMOTO ---
class RemotePlayer {
    constructor(app, info) {
        this.app = app;
        this.info = info;
        this.ch = new Character(info.appearance, info.look, {});
        this.updateTag();
        const p = info.pos || [WORLD.SPAWN.x, 2, WORLD.SPAWN.z, 0, 0];
        this.target = new THREE.Vector3(p[0], p[1], p[2]);
        this.ch.root.position.copy(this.target);
        this.ry = p[3]; this.anim = p[4] | 0;
        this.ch.root.rotation.y = this.ry;
        this.speed = 0;
        app.scene.add(this.ch.root);
    }
    updateTag() {
        const friend = this.app.isFriend(this.info.id);
        this.ch.setNameTag(this.info.name, `${this.info.duel ? '⚔ ' : ''}${titleFor(this.info.level || 1)} · Lv ${this.info.level || 1}`, friend ? '#7aff9a' : '#ffff00');
    }
    setState(s) { this.target.set(s[0], s[1], s[2]); this.ry = s[3]; this.anim = s[4] | 0; }
    setLook(d) {
        Object.assign(this.info, d);
        this.ch.setAppearance(d.appearance || this.info.appearance, d.look || this.info.look);
        this.updateTag();
    }
    distTo(v) { return this.ch.root.position.distanceTo(v); }
    update(dt, camPos) {
        const r = this.ch.root;
        const before = r.position.clone();
        const far = r.position.distanceTo(this.target) > 12;
        if (far) r.position.copy(this.target); else r.position.lerp(this.target, 1 - Math.exp(-dt * 10));
        const moved = Math.hypot(r.position.x - before.x, r.position.z - before.z) / Math.max(dt, 1e-3);
        this.speed += (moved - this.speed) * Math.min(1, dt * 8);
        r.rotation.y = lerpAngle(r.rotation.y, this.ry, Math.min(1, dt * 10));
        const a = ANIMS[this.anim] || 'idle';
        this.ch.state = a === 'air' || a === 'sit' ? a : this.speed > 6 ? 'run' : this.speed > 0.4 ? 'walk' : 'idle';
        this.ch.speed = this.speed;
        const d = camPos.distanceTo(r.position);
        if (this.ch.tag) this.ch.tag.visible = d < 40;
        if (d < 120) this.ch.update(dt);
    }
    dispose() { this.ch.dispose(); }
}

// =====================================================================
class Game {
    constructor() {
        installTheme();
        this.local = store.load();
        this.local.settings ||= {};
        this.defaultQuality = IS_MOBILE ? 'bassa' : 'alta';
        this.quality = this.local.settings.quality || this.defaultQuality;
        this.audio = new GameAudio();
        if (this.local.settings.musicVol != null) this.audio.musicVol = this.local.settings.musicVol;
        if (this.local.settings.sfxVol != null) this.audio.sfxVol = this.local.settings.sfxVol;
        this.net = new Net(SOCKET_URL);
        this.studio = new Studio();
        this.creator = new Creator(this.studio);
        this.panels = new Panels(this);
        this.players = new Map();
        this.duels = new Map();
        this.room = { id: 'pub', name: 'Isola Fantasma', private: false };
        this.mode = 'title';
        this.keys = {};
        this.mud = [];
        this.peers = new Map();
        this.localStream = null;
        this.micOn = false;
        this.helloDone = false;
        this.me = null;
        this.mudTex = new THREE.TextureLoader().load('./mudball.png');
        this.mudTex.colorSpace = THREE.SRGBColorSpace;
        this.bindNet();
        this.net.connect();
        this.titleScreen();
    }

    // --- SCHERMATA INIZIALE ---
    async titleScreen() {
        const status = $('#title-status'), btn = $('#play-btn');
        try { await Promise.all(['40px Planewalker', '700 30px Almendra', '30px Almendra', '700 20px Cinzel', '900 20px Cinzel', '18px Alegreya', 'italic 18px Alegreya', '900 40px "Cinzel Decorative"'].map(f => document.fonts.load(f))); } catch { /* ok */ }
        const upd = () => { if (this.mode === 'title') status.textContent = this.net.connected ? 'Il portale è aperto: gli altri viandanti ti aspettano' : 'Il traghettatore attraversa la nebbia... puoi già entrare'; };
        upd(); this.titleTimer = setInterval(upd, 1000);
        const go = async () => {
            if (this.mode !== 'title') return;
            this.mode = 'menu';
            clearInterval(this.titleTimer);
            this.audio.unlock();
            $('#title-screen').classList.add('hidden');
            if (!this.local.appearance && !this.local.token) {
                const res = await this.creator.open({ mode: 'new', name: '', appearance: randomAppearance() });
                Object.assign(this.local, { name: res.name, appearance: res.appearance, card: res.card, cardImage: res.cardImage, look: { weapon: STARTER_WEAPON } });
                this.saveLocal();
            }
            this.enterWorld();
        };
        btn.onclick = go;
        addEventListener('keydown', (e) => { if (e.key === 'Enter' && this.mode === 'title') go(); });
    }
    saveLocal() { store.save(this.local); }

    // --- INGRESSO NEL MONDO ---
    async enterWorld() {
        $('#loading').classList.remove('hidden');
        await new Promise(r => setTimeout(r, 30));
        this.setupRenderer();
        this.world = new World(this.scene, { quality: this.quality });
        if (!this.me) this.me = this.offlineMe();
        const S = WORLD.SPAWN;
        this.player = {
            pos: new THREE.Vector3(S.x, this.world.groundAt(S.x, S.z) , S.z),
            vel: new THREE.Vector3(), yaw: Math.PI, grounded: true, stepT: 0, lastSend: 0, lastSent: null, mudCd: 0,
        };
        this.cam = { yaw: 0, pitch: 0.28, dist: 9, wantDist: innerWidth < innerHeight ? 6.2 : 4.6, first: false };
        this.buildMyCharacter();
        // luce di riempimento: il personaggio non resta mai in controluce
        this.fillLight = new THREE.PointLight('#d8c4ff', 9, 10, 1.4);
        this.scene.add(this.fillLight);
        this.setupInput();
        this.setupHud();
        $('#loading').classList.add('hidden');
        $('#hud').classList.remove('hidden');
        if (IS_MOBILE) { $('#mobile-controls').classList.remove('hidden'); this.setupMobile(); }
        else $('#click-to-play').classList.remove('hidden');
        this.mode = 'world';
        this.updatePowerCard();
        this.updateProfileCard();
        this.tryHello();
        toast(h('div', {}, h('b', {}, `Bentornato, ${this.me.name}`), h('div', {}, 'Il castello e la sua Arena sono a nord, oltre il Ponte dei Sospiri. Le botteghe circondano la piazza.')), { duration: 9000, icon: 'castle' });
        this.clock = new THREE.Clock();
        this.loop();
        if (this.local.settings.musicOn !== false) this.audio.toggleMusic(true).then(on => this.setMusicBtn(on));
    }

    setupRenderer() {
        const alta = this.quality === 'alta';
        const r = this.renderer = new THREE.WebGLRenderer({ antialias: alta, powerPreference: 'high-performance' });
        r.setPixelRatio(Math.min(devicePixelRatio, alta ? 1.5 : 1));
        r.setSize(innerWidth, innerHeight);
        r.outputColorSpace = THREE.SRGBColorSpace;
        r.toneMapping = THREE.ACESFilmicToneMapping;
        r.toneMappingExposure = 1.05;
        r.shadowMap.enabled = alta;
        r.shadowMap.type = THREE.PCFSoftShadowMap;
        r.setClearColor('#0b001a');
        r.domElement.id = 'game-canvas';
        document.body.prepend(r.domElement);
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2('#2d0a45', 0.0085);
        this.sky = makeSky();
        this.scene.add(this.sky);
        this.camera = new THREE.PerspectiveCamera(innerWidth < innerHeight ? 78 : 62, innerWidth / innerHeight, 0.1, 2000);
        if (alta) {
            this.composer = new EffectComposer(r);
            this.composer.addPass(new RenderPass(this.scene, this.camera));
            this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.55, 0.86));
            this.composer.addPass(new OutputPass());
        }
        this.raycaster = new THREE.Raycaster();
        addEventListener('resize', () => {
            this.camera.aspect = innerWidth / innerHeight; this.camera.fov = innerWidth < innerHeight ? 78 : 62; this.camera.updateProjectionMatrix();
            r.setSize(innerWidth, innerHeight);
            this.composer?.setSize(innerWidth, innerHeight);
            this.duel?.resize();
        });
    }

    // --- PROFILO E ASPETTO ---
    offlineMe() {
        return {
            id: 'offline', name: this.local.name || 'Viandante', appearance: sanitizeAppearance(this.local.appearance), card: sanitizeCard(this.local.card),
            coins: 0, rating: 1000, wins: 0, losses: 0, level: 1, xp: 0, talents: { forza: 0, tempra: 0, maestria: 0 }, inventory: [], equipment: {}, friends: [], requests: [], offline: true,
        };
    }
    look() {
        if (!this.me || this.me.offline) return this.local.look || {};
        const o = {};
        for (const [slot, uid] of Object.entries(this.me.equipment || {})) {
            const it = this.me.inventory.find(i => i.uid === uid);
            if (it) o[slot] = it.kind === 'weapon' ? it.spec : it.itemId;
        }
        return o;
    }
    // id dei vestiti indossati (servono a statistiche, corredi e card)
    gear() { const l = this.look(); return ['head', 'face', 'cape', 'torso'].map(s => l[s]).filter(Boolean); }
    unspentPoints() { const t = this.me?.talents || {}; return Math.max(0, talentPoints(this.me?.level || 1) - TALENT_IDS.reduce((a, k) => a + (t[k] || 0), 0)); }
    isFriend(id) { return !!this.me?.friends?.some(f => f.id === id); }
    buildMyCharacter() {
        if (this.myChar) this.myChar.dispose();
        this.myChar = new Character(this.me.appearance, this.look(), { name: this.me.name, sub: `${titleFor(this.me.level || 1)} · Lv ${this.me.level || 1}`, color: '#ffd23a' });
        this.myChar.root.position.copy(this.player.pos);
        this.myChar.root.rotation.y = this.player.yaw;
        if (this.myChar.tag) this.myChar.tag.visible = false;
        this.scene.add(this.myChar.root);
    }
    cardSignature() {
        const l = this.look();
        return JSON.stringify([this.me.card, this.me.appearance, l, this.me.level, this.me.name, this.me.talents]);
    }
    async regenerateCard(upload = true) {
        const card = sanitizeCard(this.me.card || this.local.card);
        const c = await composeCard({ card, appearance: this.me.appearance, look: this.look(), level: this.me.level || 1, talents: this.me.talents, id: this.me.id, name: this.me.name }, this.studio, 420);
        this.local.cardImage = c.toDataURL('image/jpeg', 0.86);
        this.local.cardSig = this.cardSignature();
        this.saveLocal();
        this.updatePowerCard();
        if (upload && this.net.connected && this.helloDone) this.net.request('profile:update', { cardImage: this.local.cardImage });
    }
    async saveCard(card) {
        card = sanitizeCard(card);
        this.local.card = card;
        this.me.card = card;
        await this.regenerateCard(false);
        if (this.net.connected) {
            const r = await this.net.request('profile:update', { card, cardImage: this.local.cardImage });
            if (r.ok) this.applyMe(r.profile);
        }
    }
    async editAppearance() {
        this.mode = 'menu';
        document.exitPointerLock?.();
        $('#hud').classList.add('hidden');
        const res = await this.creator.open({ mode: 'edit', name: this.me.name, appearance: this.me.appearance, look: this.look(), cancelable: true });
        $('#hud').classList.remove('hidden');
        this.mode = 'world';
        if (!res) return;
        this.local.name = res.name; this.local.appearance = res.appearance;
        this.me.name = res.name; this.me.appearance = res.appearance;
        this.saveLocal();
        this.buildMyCharacter();
        this.updateProfileCard();
        if (this.net.connected) await this.net.request('profile:update', { name: res.name, appearance: res.appearance });
        this.regenerateCard(true);
        toast('Lo specchio ti restituisce un volto nuovo', { kind: 'ok', icon: 'mirror' });
    }
    applyMe(p) {
        const prev = this.me;
        const oldCoins = prev && !prev.offline ? prev.coins : null;
        const oldLook = prev ? JSON.stringify(this.look()) : '';
        this.me = p;
        if (oldCoins != null && p.coins !== oldCoins) this.coinPop(p.coins - oldCoins);
        const newLook = JSON.stringify(this.look());
        this.local.look = this.look();
        this.saveLocal();
        if (this.myChar && (oldLook !== newLook || prev?.offline)) this.buildMyCharacter();
        this.updateProfileCard();
        const reqN = (p.requests || []).length;
        $('#req-badge').textContent = reqN; $('#req-badge').classList.toggle('hidden', !reqN);
        if (this.local.cardSig !== this.cardSignature()) { clearTimeout(this.cardTimer); this.cardTimer = setTimeout(() => this.regenerateCard(true), 800); }
        this.panels.refresh(['inventario', 'sartoria', 'armadio', 'forgia', 'amici', 'maestria']);
    }

    // --- RETE ---
    tryHello() {
        if (!this.net.connected || this.helloDone || this.mode === 'title' || !this.world) return;
        this.helloDone = true;
        const hasLocal = !!this.local.appearance;
        this.net.request('hello', {
            token: this.local.token,
            name: hasLocal ? this.local.name : undefined, appearance: hasLocal ? this.local.appearance : undefined,
            card: hasLocal ? this.local.card : undefined, cardImage: hasLocal ? this.local.cardImage : undefined,
        }, 15000).then(r => {
            if (!r.ok) { this.helloDone = false; console.warn('hello fallito', r.msg); return; }
            this.local.token = r.token;
            if (!hasLocal) {
                Object.assign(this.local, { name: r.profile.name, appearance: r.profile.appearance, card: r.profile.card });
            }
            this.saveLocal();
            const wasOffline = this.me?.offline;
            this.applyMe(r.profile);
            if (wasOffline || !hasLocal) this.buildMyCharacter();
            if (r.daily) { toast(h('div', {}, h('b', {}, 'Tributo del giorno'), h('div', {}, `Il tesoriere dell'isola ti consegna ${r.daily} Sputnik Coin${r.dailyXp ? ` e ${r.dailyXp} punti esperienza` : ''}.`)), { kind: 'coin' }); this.audio.play('coin'); }
            if (r.profile.rest > 0) toast(h('div', {}, h('b', {}, 'Ben riposato'), h('div', {}, `Sei stato lontano dall'isola: i prossimi ${r.profile.rest} duelli valgono doppia esperienza.`)), { kind: 'ok', icon: 'lantern' });
            if (r.created) toast(h('div', {}, h('b', {}, 'Il tuo nome è inciso nell\'Albo'), h('div', {}, 'Ricevi 150 Sputnik Coin e una Spada di Legno. La Sartoria e la Forgia ti aspettano.')), { kind: 'coin', duration: 9000 });
            if (!this.local.cardImage || !hasLocal) this.regenerateCard(true);
            this.net.request('lb:get').then(lb => { if (lb.ok) this.world.setLeaderboard(lb.rating); });
        });
    }
    bindNet() {
        const N = this.net;
        N.on('_connect', () => { this.setNet(true); this.tryHello(); });
        N.on('_disconnect', () => {
            this.setNet(false); this.helloDone = false;
            for (const p of this.players.values()) p.dispose();
            this.players.clear(); this.duels.clear(); this.renderTicker();
            this.destroyPeers();
            if (this.duel && this.duel.role !== 'local') { toast('Il portale si è chiuso nel mezzo del duello', { kind: 'bad' }); this.exitDuel(); }
        });
        N.on('kicked', () => { toast('Sei entrato da un\'altra finestra: questa resta fuori dal portale.', { kind: 'bad', duration: 20000 }); this.net.socket.io.opts.reconnection = false; });
        N.on('me', (p) => this.applyMe(p));
        N.on('notify', (n) => { toast(n.text, { kind: n.kind === 'coin' ? 'coin' : n.kind === 'friend' ? 'ok' : 'info' }); this.audio.play('notify'); });
        N.on('room:state', (s) => {
            for (const p of this.players.values()) p.dispose();
            this.players.clear();
            this.destroyPeers();
            this.room = { id: s.room, name: s.name, private: s.private };
            for (const info of s.players) this.players.set(info.id, new RemotePlayer(this, info));
            this.duels.clear();
            for (const d of s.duels || []) this.duels.set(d.id, d);
            this.renderTicker();
            const rn = $('#room-name');
            rn.replaceChildren(...(s.private ? [icon('lock'), s.name] : []));
            rn.classList.toggle('hidden', !s.private);
            if (this.micOn) for (const id of this.players.keys()) this.callPeer(id);
            this.panels.refresh(['amici', 'arena']);
        });
        N.on('player:join', (info) => {
            if (this.players.has(info.id)) this.players.get(info.id).dispose();
            this.players.set(info.id, new RemotePlayer(this, info));
            this.addChat(null, `${info.name} è arrivato sull'isola`, 'sys');
            if (this.micOn) this.callPeer(info.id);
        });
        N.on('player:leave', ({ id }) => {
            const p = this.players.get(id);
            if (p) { this.addChat(null, `${p.info.name} se n'è andato`, 'sys'); p.dispose(); this.players.delete(id); }
            this.dropPeer(id);
        });
        N.on('mv', ({ i, s }) => this.players.get(i)?.setState(s));
        N.on('player:look', (d) => {
            if (d.id === this.me?.id) return;
            this.players.get(d.id)?.setLook(d);
        });
        N.on('levelup', (u) => {
            this.audio.play('special');
            toast(h('div', {}, h('b', {}, `Livello ${u.level}: ${u.title}`), h('div', {}, u.points > 0 ? `Hai ${u.points} ${u.points === 1 ? 'punto' : 'punti'} Maestria da spendere nel Libro della Maestria (L).` : 'Nuovi capi e materiali ti aspettano nelle botteghe.')),
                { kind: 'coin', icon: 'star', duration: 9000, actions: u.points > 0 ? [{ label: 'Apri il Libro', primary: true, fn: () => this.openPanel('maestria') }] : null });
        });
        N.on('player:stats', (s) => {
            const p = this.players.get(s.id);
            if (p) { Object.assign(p.info, s); p.updateTag(); }
        });
        N.on('chat', (m) => this.addChat(m.name, m.text, m.sys ? 'sys' : this.isFriend(m.id) ? 'fr' : ''));
        N.on('emote', ({ i, e }) => this.players.get(i)?.ch.play(e, EMOTE_DUR[e] || 2));
        N.on('mud', ({ i, o, v }) => this.spawnMud(new THREE.Vector3(...o), new THREE.Vector3(...v), i));
        N.on('mud:splat', ({ i, by }) => {
            const p = this.players.get(i);
            if (p) {
                p.ch.setTint('#5a3a1a');
                clearTimeout(p.tintT); p.tintT = setTimeout(() => p.ch.setTint(null), 3000);
                if (by === this.me?.id) { toast(`Centro! Hai infangato ${p.info.name}`, { duration: 2500, icon: 'fango' }); this.audio.play('splash'); }
            }
        });
        N.on('friend:request', (f) => {
            this.audio.play('notify');
            toast(h('div', {}, h('b', {}, f.name), ' vuole essere tuo amico'), { kind: 'ok', actions: [
                { label: 'Accetta', primary: true, fn: () => this.panels.act('friend:respond', { id: f.id, accept: true }) },
                { label: 'Rifiuta', fn: () => this.net.request('friend:respond', { id: f.id, accept: false }) }] });
        });
        N.on('friend:status', (f) => {
            const fr = this.me?.friends?.find(x => x.id === f.id);
            if (fr) fr.online = f.online;
            toast(`${f.name} ${f.online ? 'è approdato sull\'isola' : 'ha lasciato l\'isola'}`, { duration: 3000, kind: f.online ? 'ok' : 'info', icon: 'handshake' });
            this.panels.refresh(['amici']);
        });
        N.on('card:received', (c) => {
            this.audio.play('notify');
            toast(h('div', {}, h('b', {}, c.name), ` ti ha inviato la sua card "${c.title}"!`), { kind: 'ok', actions: [{ label: 'Apri l\'album', primary: true, fn: () => this.openPanel('collezione') }] });
        });
        N.on('session:invite', (s) => {
            this.audio.play('notify');
            toast(h('div', {}, h('b', {}, s.from), ' ti invita nella sua sessione privata'), { kind: 'ok', actions: [
                { label: 'Entra', primary: true, fn: async () => { const r = await this.net.request('session:join', { room: s.room }); if (!r.ok) toast(r.msg, { kind: 'bad' }); } },
                { label: 'No grazie' }] });
        });
        // duelli
        N.on('duel:invite', (d) => {
            this.audio.play('notify');
            toast(h('div', {}, h('b', {}, d.from.name), ` (gloria ${d.from.rating}) ti sfida a duello nell'Arena!`, d.stake ? h('div', {}, `Posta: ${d.stake} Sputnik Coin a testa`) : null), {
                kind: 'duel', actions: [
                    { label: 'Accetta', primary: true, fn: async () => { const r = await this.net.request('duel:respond', { cid: d.cid, accept: true }); if (!r.ok) toast(r.msg, { kind: 'bad' }); } },
                    { label: 'Rifiuta', fn: () => this.net.request('duel:respond', { cid: d.cid, accept: false }) }],
            });
        });
        N.on('duel:announce', (d) => {
            this.duels.set(d.id, d);
            this.renderTicker();
            for (const s of ['a', 'b']) { const p = this.players.get(d[s].id); if (p) { p.info.duel = true; p.updateTag(); } }
            if (d.a.id === this.me?.id || d.b.id === this.me?.id) return;
            this.audio.play('notify');
            toast(h('div', {}, h('b', {}, `${d.a.name} contro ${d.b.name}`), h('div', {}, 'Si combatte nell\'Arena: hai 15 secondi per scommettere.')), {
                kind: 'duel', duration: 14000, actions: [{ label: 'Guarda e scommetti', primary: true, fn: () => this.watchDuel(d.id) }],
            });
        });
        N.on('duel:update', (u) => {
            const d = this.duels.get(u.id);
            if (!d) return;
            if (u.phase === 'done') {
                this.duels.delete(u.id);
                for (const s of ['a', 'b']) { const p = this.players.get(d[s].id); if (p) { p.info.duel = false; p.updateTag(); } }
            } else { d.phase = u.phase; if (u.pool) d.pool = u.pool; }
            this.renderTicker();
        });
        N.on('duel:pool', (u) => {
            const d = this.duels.get(u.id);
            if (d) { d.pool = u.pool; d.spectators = u.spectators; }
            if (this.duel?.info.id === u.id) this.duel.updatePool(u.pool, u.spectators);
        });
        N.on('duel:start', (info) => this.enterDuel(info, 'fighter', info.side));
        N.on('duel:begin', ({ id }) => { if (this.duel?.info.id === id) { this.duel.info.phase = 'fight'; this.duel.onBegin(); } });
        N.on('duel:state', (s) => this.duel?.pushSnap(s));
        N.on('duel:end', (r) => { if (this.duel?.info.id === r.id) this.duel.showResult(r); });
        N.on('duel:cancel', (c) => { if (this.duel?.info.id === c.id) { toast(`Duello annullato: ${c.reason}`, { kind: 'bad' }); this.exitDuel(); } });
        N.on('bet:result', (b) => {
            if (b.won) { toast(h('div', {}, h('b', {}, 'Scommessa vinta!'), ` Avevi puntato ${b.amount} su ${b.name}: il banco te ne paga ${b.payout}.`), { kind: 'coin', duration: 8000 }); this.audio.play('coin'); }
            else toast(h('div', {}, h('b', {}, 'Scommessa persa.'), ` Ha vinto ${b.name}: addio ${b.amount} Sputnik Coin.`), { kind: 'bad', duration: 8000 });
        });
        // voice
        N.on('voice:offer', ({ from, signal }) => this.answerPeer(from, signal));
        N.on('voice:answer', ({ from, signal }) => { const p = this.peers.get(from); if (p) try { p.peer.signal(signal); } catch { /* ok */ } });
    }
    setNet(ok) { $('#net-dot')?.classList.toggle('ok', ok); $('#net-dot')?.classList.toggle('bad', !ok); }

    // --- SESSIONI PRIVATE ---
    async createSession() {
        const r = await this.net.request('session:create');
        if (!r.ok) return toast(r.msg, { kind: 'bad' });
        toast('La vostra isola privata è pronta: invita gli amici dalla Compagnia.', { kind: 'ok', icon: 'lock' });
        this.panels.refresh(['amici']);
    }
    async leaveSession() {
        const r = await this.net.request('session:leave');
        if (!r.ok) return toast(r.msg, { kind: 'bad' });
        this.panels.refresh(['amici']);
    }

    // --- DUELLI ---
    myFighterInfo() {
        return { id: this.me.id, name: this.me.name, appearance: this.me.appearance, look: this.look(), element: this.me.card?.element || 'palude', rating: this.me.rating, level: this.me.level || 1, talents: this.me.talents, gear: this.gear(), cardImage: this.local.cardImage };
    }
    enterDuel(info, role, side) {
        if (this.duel) this.exitDuel(true);
        this.panels.close();
        document.exitPointerLock?.();
        this.keys = {};
        if (role !== 'spectator') this.standUp();
        this.mode = 'duel';
        $('#hud').classList.add('duel-mode');
        $('#click-to-play').classList.add('hidden');
        this.duel = new DuelView(this, info, { role, side, botLevel: this.practiceLevel });
        this.audio.setBattle(true);
    }
    exitDuel(silent) {
        if (!this.duel) return;
        if (this.duel.role === 'spectator') this.net.request('duel:unwatch');
        this.duel.dispose();
        if (!silent) this.audio.setBattle(false);
        this.duel = null;
        this.mode = 'world';
        $('#hud').classList.remove('duel-mode');
        if (!IS_MOBILE && !silent) $('#click-to-play').classList.remove('hidden');
        if (IS_MOBILE) $('#mobile-controls').classList.remove('hidden');
    }
    async watchDuel(id) {
        const r = await this.net.request('duel:watch', { id });
        if (!r.ok) return toast(r.msg, { kind: 'bad' });
        this.enterDuel({ ...r.duel, snapshot: r.snapshot }, 'spectator');
    }
    startPractice(level = 1) {
        this.practiceLevel = level;
        const el = ELEMENT_IDS[Math.floor(Math.random() * ELEMENT_IDS.length)];
        const types = Object.keys(WEAPON_TYPES).filter(t => t !== 'pugni');
        const ghost = {
            id: 'fantasma', name: 'Il Fantasma', element: el, rating: Math.round(800 + level * 300), level: Math.round(level * 4),
            appearance: { ...randomAppearance(), species: 'spettro', eyes: 'luminosi', eyeColor: ELEMENTS[el].glow, top: '#1a1030' },
            look: { weapon: { type: types[Math.floor(Math.random() * types.length)], material: level > 1.2 ? 'ossidiana' : 'ferro', handle: 'osso', gem: 'nessuna', name: 'Lama Spettrale' }, cape: 'mantello_nero' },
            gear: ['mantello_nero'],
            cardImage: null,
        };
        const pts = Math.max(0, ghost.level - 1);
        ghost.talents = { forza: Math.ceil(pts / 2), tempra: Math.floor(pts / 2), maestria: 0 };
        this.enterDuel({ id: 'practice', a: this.myFighterInfo(), b: ghost, phase: 'fight' }, 'local', 'a');
    }
    restartPractice() { this.exitDuel(true); this.startPractice(this.practiceLevel); }
    async practiceDone(won) {
        if (!this.net.connected || !this.helloDone) return;
        const tier = this.practiceLevel < 0.8 ? 1 : this.practiceLevel < 1.3 ? 2 : 3;
        const r = await this.net.request('practice:done', { tier, won });
        if (r.ok && r.xp) toast(`+${r.xp} esperienza dall'allenamento`, { kind: 'ok', icon: 'star', duration: 3000 });
        else if (r.msg) toast(r.msg, { duration: 3500 });
    }
    renderTicker() {
        const box = $('#duel-ticker');
        if (!box) return;
        box.replaceChildren(...[...this.duels.values()].slice(0, 3).map(d => h('div', { class: 'ticker', html: iconSVG('swords') },
            h('b', {}, `${d.a.name} contro ${d.b.name}`), h('div', { class: 'sub' }, d.phase === 'betting' ? 'Scommesse aperte' : 'Si combatte nell\'Arena'),
            d.a.id === this.me?.id || d.b.id === this.me?.id ? null : h('button', { class: 'btn btn-sm', onclick: () => this.watchDuel(d.id) }, d.phase === 'betting' ? 'Guarda e punta' : 'Guarda'))));
    }

    // --- PANNELLI ---
    openPanel(id, arg) { if (this.mode === 'world') this.panels.open(id, arg); }
    onPanelOpen() { document.exitPointerLock?.(); this.keys = {}; $('#click-to-play').classList.add('hidden'); }
    onPanelClose() { if (this.mode === 'world' && !IS_MOBILE) $('#click-to-play').classList.remove('hidden'); }

    // --- INPUT ---
    setupInput() {
        const canvas = this.renderer.domElement;
        // Se il browser non permette il blocco del puntatore, si guarda trascinando col mouse
        const lock = () => {
            if (this.mode !== 'world' || this.panels.isOpen || IS_MOBILE) return;
            $('#click-to-play').classList.add('hidden');
            if (this.noLock) return;
            try {
                const p = canvas.requestPointerLock?.();
                if (p?.catch) p.catch(() => { this.noLock = true; });
            } catch { this.noLock = true; }
        };
        $('#click-to-play').addEventListener('click', lock);
        canvas.addEventListener('click', lock);
        canvas.addEventListener('mousedown', (e) => { if (!this.locked) this.dragLook = { x: e.clientX, y: e.clientY }; });
        addEventListener('mouseup', () => { this.dragLook = null; });
        document.addEventListener('mousemove', (e) => {
            if (this.locked || !this.dragLook || !e.buttons || this.mode !== 'world') return;
            const s = 0.005 * (this.local.settings.sens || 1);
            this.cam.yaw -= (e.clientX - this.dragLook.x) * s;
            this.cam.pitch = Math.max(this.cam.first ? -1.3 : -0.45, Math.min(1.25, this.cam.pitch + (e.clientY - this.dragLook.y) * s));
            this.dragLook = { x: e.clientX, y: e.clientY };
        });
        document.addEventListener('pointerlockchange', () => {
            this.locked = document.pointerLockElement === canvas;
            $('#click-to-play').classList.toggle('hidden', this.locked || this.panels.isOpen || this.mode !== 'world' || IS_MOBILE);
            $('#crosshair').classList.toggle('hidden', !this.locked);
        });
        document.addEventListener('mousemove', (e) => {
            if (!this.locked) return;
            const s = 0.0024 * (this.local.settings.sens || 1);
            this.cam.yaw -= e.movementX * s;
            this.cam.pitch = Math.max(this.cam.first ? -1.3 : -0.45, Math.min(1.25, this.cam.pitch + e.movementY * s));
        });
        document.addEventListener('mousedown', (e) => {
            if (this.locked && this.mode === 'world' && e.button === 0) { this.myChar.play('light', 0.45); this.audio.play('swing'); }
        });
        canvas.addEventListener('wheel', (e) => { this.cam.wantDist = Math.max(2.2, Math.min(11, this.cam.wantDist * (1 + e.deltaY * 0.001))); }, { passive: true });
        const chat = $('#chat-input');
        chat.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                const t = chat.value.trim();
                if (t) { if (this.net.connected) this.net.send('chat', { text: t }); else this.addChat(this.me.name, t + ' (offline)'); }
                chat.value = ''; chat.blur();
                if (!IS_MOBILE && !this.noLock) canvas.requestPointerLock?.()?.catch?.(() => { this.noLock = true; });
            } else if (e.key === 'Escape') chat.blur();
        });
        addEventListener('keydown', (e) => {
            if (this.mode !== 'world') return;
            if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                if (e.key === 'Escape') document.activeElement.blur();
                return;
            }
            if (this.panels.isOpen) { if (e.key === 'Escape') this.panels.close(); return; }
            if (!$('#bigmap').classList.contains('hidden')) { if (['Escape', 'KeyN'].includes(e.code) || e.key === 'Escape') this.toggleBigMap(false); return; }
            this.keys[e.code] = true;
            if (e.repeat) return;
            const P = { KeyI: 'inventario', KeyC: 'card', KeyO: 'amici', Tab: 'classifica', KeyK: 'collezione', KeyP: 'impostazioni', KeyL: 'maestria' };
            if (P[e.code]) { e.preventDefault(); this.openPanel(P[e.code]); return; }
            switch (e.code) {
                case 'Enter': e.preventDefault(); document.exitPointerLock?.(); chat.focus(); break;
                case 'Space': e.preventDefault(); this.jump(); break;
                case 'KeyE': this.interact(); break;
                case 'KeyR': if (this.nearPlayer) this.openPanel('profilo', this.nearPlayer.info.id); break;
                case 'KeyF': this.throwMud(); break;
                case 'KeyV': this.cam.first = !this.cam.first; break;
                case 'KeyM': this.toggleMic(); break;
                case 'KeyB': this.audio.toggleMusic().then(on => { this.setMusicBtn(on); this.local.settings.musicOn = on; this.saveLocal(); }); break;
                case 'KeyN': this.toggleBigMap(true); break;
            }
            if (EMOTES[e.code]) this.emote(EMOTES[e.code][0]);
        });
        addEventListener('keyup', (e) => { this.keys[e.code] = false; });
        addEventListener('blur', () => { this.keys = {}; });
    }
    setupMobile() {
        this.joy = { x: 0, y: 0 };
        if (window.nipplejs) {
            const m = nipplejs.create({ zone: $('#joystick-zone'), mode: 'static', position: { left: '50%', top: '50%' }, color: 'white' });
            m.on('move', (e, d) => { if (d.vector) { this.joy.x = d.vector.x; this.joy.y = d.vector.y; this.joy.run = d.force > 1.2; } });
            m.on('end', () => { this.joy.x = this.joy.y = 0; this.joy.run = false; });
            this.worldJoy = m;
        }
        let last = null;
        const skip = (t) => t.closest('#joystick-zone, .mob-btn, #chat, #profile-card, #power-card, #minimap-wrap, #panel-root, #duel-hud, .toast, #duel-ticker');
        document.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; if (!skip(t.target) && this.mode === 'world') last = { id: t.identifier, x: t.clientX, y: t.clientY }; }, { passive: true });
        document.addEventListener('touchmove', (e) => {
            if (!last) return;
            for (const t of e.changedTouches) if (t.identifier === last.id) {
                this.cam.yaw -= (t.clientX - last.x) * 0.006;
                this.cam.pitch = Math.max(-0.45, Math.min(1.25, this.cam.pitch + (t.clientY - last.y) * 0.005));
                last.x = t.clientX; last.y = t.clientY;
            }
        }, { passive: true });
        document.addEventListener('touchend', (e) => { for (const t of e.changedTouches) if (last && t.identifier === last.id) last = null; });
        const tap = (id, fn) => $(id).addEventListener('touchstart', (e) => { e.preventDefault(); if (this.mode === 'world') fn(); }, { passive: false });
        tap('#mb-jump', () => this.jump());
        tap('#mb-use', () => this.interact());
        tap('#mb-mud', () => this.throwMud());
        tap('#mb-cam', () => { this.cam.first = !this.cam.first; });
    }

    jump() {
        const P = this.player;
        if (P.sit) return this.standUp();
        if (P.grounded) { P.vel.y = 8.4; P.grounded = false; this.audio.play('jump'); this.myChar.stop(); }
    }
    interact() {
        const it = this.nearInteract;
        if (!it) { if (this.nearPlayer) this.openPanel('profilo', this.nearPlayer.info.id); return; }
        if (it.id === 'specchio') this.editAppearance();
        else if (it.id === 'quadro') { document.exitPointerLock?.(); window.open('https://www.youtube.com/watch?v=' + this.world.gallery.current(it.painting).video, '_blank', 'noopener'); }
        else if (it.id === 'canale') { document.exitPointerLock?.(); window.open('https://www.youtube.com/@SputnikHomies', '_blank', 'noopener'); }
        else if (it.id === 'altare') this.openPanel('maestria', 'altare');
        else if (it.id === 'siedi') this.player.sit === it.seat ? this.standUp() : this.sitDown(it.seat);
        else this.openPanel(it.id);
    }
    // poltrone della Stanza Bianca e panchine del giardino
    sitDown(seat) {
        const P = this.player;
        if (this.players.size && [...this.players.values()].some(p => p.anim === 4 && Math.hypot(p.target.x - seat.x, p.target.z - seat.z) < 0.3)) return toast('Qualcuno è già seduto qui', { kind: 'bad' });
        P.sit = seat; P.vel.set(0, 0, 0); P.grounded = true;
        P.pos.set(seat.x, seat.y, seat.z); P.yaw = seat.ry;
        this.myChar.stop();
    }
    standUp() {
        const P = this.player, s = P.sit;
        if (!s) return;
        P.sit = null;
        P.pos.set(s.x + Math.sin(s.ry) * 0.8, s.floor, s.z + Math.cos(s.ry) * 0.8);
    }
    emote(name) {
        this.myChar.play(name, EMOTE_DUR[name]);
        this.net.send('emote', { e: name });
    }

    // --- FANGO (dal gioco originale) ---
    throwMud() {
        const P = this.player;
        if (P.mudCd > 0) return;
        P.mudCd = 0.6;
        this.myChar.play('throw', 0.5);
        this.audio.play('throw');
        const origin = P.pos.clone().add(new THREE.Vector3(Math.sin(P.yaw) * 0.4, 1.55, Math.cos(P.yaw) * 0.4));
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const target = this.raycaster.ray.at(35, new THREE.Vector3());
        const v = target.sub(origin).normalize().multiplyScalar(24);
        v.y += 2;
        this.spawnMud(origin, v, this.me.id);
        this.net.send('mud', { o: origin.toArray().map(n => +n.toFixed(2)), v: v.toArray().map(n => +n.toFixed(2)) });
    }
    spawnMud(o, v, owner) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.mudTex, transparent: true }));
        s.scale.set(0.5, 0.5, 1);
        s.position.copy(o);
        this.scene.add(s);
        this.mud.push({ s, v, owner, life: 3 });
    }
    updateMud(dt) {
        const me = this.player.pos;
        for (let i = this.mud.length - 1; i >= 0; i--) {
            const m = this.mud[i];
            m.v.y -= 12 * dt;
            m.s.position.addScaledVector(m.v, dt);
            m.life -= dt;
            let hit = false;
            const p = m.s.position;
            if (m.owner !== this.me.id && this.mode === 'world') {
                const dx = p.x - me.x, dz = p.z - me.z, dy = p.y - (me.y + 1);
                if (dx * dx + dz * dz < 0.5 && Math.abs(dy) < 1) {
                    hit = true;
                    this.net.send('mud:hit', { by: m.owner });
                    const el = $('#mud-splat');
                    el.classList.add('hidden'); void el.offsetWidth; el.classList.remove('hidden');
                    clearTimeout(this.splatT); this.splatT = setTimeout(() => el.classList.add('hidden'), 2500);
                    this.audio.play('splash');
                }
            } else {
                for (const rp of this.players.values()) {
                    const q = rp.ch.root.position;
                    if (rp.info.id !== m.owner && Math.hypot(p.x - q.x, p.z - q.z) < 0.7 && Math.abs(p.y - q.y - 1) < 1) { hit = true; break; }
                }
            }
            if (!hit && p.y < this.world.groundAt(p.x, p.z) + 0.1) hit = true;
            if (hit || m.life <= 0) { this.scene.remove(m.s); m.s.material.dispose(); this.mud.splice(i, 1); }
        }
    }

    // --- VOICE CHAT (WebRTC, solo nella stessa stanza) ---
    async toggleMic() {
        if (!this.localStream) {
            try {
                this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            } catch { toast('Il browser non concede il microfono', { kind: 'bad', icon: 'mic' }); return; }
            this.micOn = true;
            for (const id of this.players.keys()) this.callPeer(id);
        } else this.micOn = !this.micOn;
        this.localStream.getAudioTracks().forEach(t => { t.enabled = this.micOn; });
        const b = $('#btn-mic');
        b.classList.toggle('on', this.micOn);
        b.classList.toggle('off', !this.micOn);
        toast(this.micOn ? 'Voce accesa: chi ti sta vicino ti sente' : 'Voce spenta', { duration: 2000, icon: 'mic' });
    }
    makePeer(id, initiator) {
        if (typeof SimplePeer === 'undefined') return null;
        this.dropPeer(id);
        const peer = new SimplePeer({ initiator, trickle: false, stream: this.localStream || undefined });
        const entry = { peer, audio: null };
        peer.on('signal', (signal) => this.net.send(initiator ? 'voice:offer' : 'voice:answer', { to: id, signal }));
        peer.on('stream', (st) => { const a = new Audio(); a.srcObject = st; a.autoplay = true; a.play().catch(() => {}); entry.audio = a; });
        peer.on('error', () => this.dropPeer(id));
        peer.on('close', () => { if (this.peers.get(id) === entry) this.peers.delete(id); });
        this.peers.set(id, entry);
        return peer;
    }
    callPeer(id) { this.makePeer(id, true); }
    answerPeer(from, signal) { const p = this.makePeer(from, false); try { p?.signal(signal); } catch { /* ok */ } }
    dropPeer(id) { const e = this.peers.get(id); if (!e) return; try { e.peer.destroy(); } catch { /* ok */ } if (e.audio) e.audio.srcObject = null; this.peers.delete(id); }
    destroyPeers() { for (const id of [...this.peers.keys()]) this.dropPeer(id); }
    updateVoiceVolumes() {
        for (const [id, e] of this.peers) {
            const p = this.players.get(id);
            if (e.audio && p) e.audio.volume = Math.max(0, Math.min(1, 1.15 - p.distTo(this.player.pos) / 35));
        }
    }

    // --- HUD ---
    setupHud() {
        document.querySelectorAll('#profile-card [data-panel]').forEach(b => b.addEventListener('click', () => this.openPanel(b.dataset.panel)));
        $('#btn-mic').onclick = () => this.toggleMic();
        $('#btn-music').onclick = () => this.audio.toggleMusic().then(on => { this.setMusicBtn(on); this.local.settings.musicOn = on; this.saveLocal(); });
        $('#power-card').onclick = () => this.openPanel('card');
        $('#minimap-wrap').onclick = () => this.toggleBigMap(true);
        $('#bigmap-close').onclick = () => this.toggleBigMap(false);
        $('#bigmap').addEventListener('click', (e) => { if (e.target.id === 'bigmap') this.toggleBigMap(false); });
        this.mm = $('#minimap').getContext('2d');
        this.mmT = 0;
    }
    setMusicBtn(on) { $('#btn-music').classList.toggle('off', !on); }
    updatePowerCard() {
        const c = $('#power-card-canvas'), g = c.getContext('2d');
        if (!this.local.cardImage) return;
        const img = new Image();
        img.onload = () => { g.clearRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); };
        img.src = this.local.cardImage;
    }
    updateProfileCard() {
        const me = this.me;
        if (!me) return;
        $('#pc-name').textContent = me.name;
        $('#pc-meta').textContent = me.offline ? 'Lontano dal portale' : `Gloria ${me.rating} · ${me.wins} V · ${me.losses} S`;
        $('#pc-level').textContent = me.level || 1;
        const lp = levelProgress(me.xp || 0);
        $('#pc-xp-fill').style.width = `${Math.round(lp.pct * 100)}%`;
        $('#pc-xp').title = lp.need ? `${titleFor(lp.level)} · ${fmt(lp.into)} / ${fmt(lp.need)} esperienza per il livello ${lp.level + 1}` : `${titleFor(lp.level)} · livello massimo`;
        const pts = this.unspentPoints();
        $('#pts-badge').textContent = pts; $('#pts-badge').classList.toggle('hidden', !pts || !!me.offline);
        $('#pc-coins').textContent = me.offline ? '—' : fmt(me.coins);
        const sig = JSON.stringify([me.appearance, this.look()]);
        if (sig !== this.portraitSig) {
            this.portraitSig = sig;
            const p = this.studio.portrait(me.appearance, this.look(), 128, 'bust');
            const g = $('#pc-portrait').getContext('2d');
            g.clearRect(0, 0, 128, 128); g.drawImage(p, 0, 0);
        }
        if (this.myChar) this.myChar.setNameTag(me.name, `${titleFor(me.level || 1)} · Lv ${me.level || 1}`, '#ffd23a');
        if (this.myChar?.tag) this.myChar.tag.visible = false;
    }
    coinPop(delta) {
        const el = h('div', { class: 'coin-pop' + (delta < 0 ? ' neg' : '') }, `${delta > 0 ? '+' : ''}${fmt(delta)} SC`);
        $('#profile-card').append(el);
        setTimeout(() => el.remove(), 1700);
        if (delta > 0) this.audio.play('coin');
    }
    addChat(name, text, cls = '') {
        const box = $('#chat-messages');
        const row = h('div', { class: cls });
        if (name && cls !== 'sys') row.append(h('span', { class: 'cn' }, name + ':'));
        row.append(document.createTextNode(text));
        box.append(row);
        while (box.children.length > 120) box.firstChild.remove();
        box.scrollTop = box.scrollHeight;
    }
    toggleBigMap(on) {
        $('#bigmap').classList.toggle('hidden', !on);
        if (on) { document.exitPointerLock?.(); this.drawBigMap(); }
    }
    showZoneBanner(zone) {
        if (zone === this.lastBanner || this.mode !== 'world') return;
        this.lastBanner = zone;
        const b = $('#zone-banner');
        $('#zone-banner-text').textContent = zone;
        b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    }
    drawBigMap() {
        const c = $('#bigmap-canvas'), g = c.getContext('2d'), S = c.width, W = this.world, M = 34, I = S - M * 2;
        const at = (x, z) => { const [px, py] = W.mapToPx(x, z, I); return [M + px, M + py]; };
        // pergamena
        const pg = g.createRadialGradient(S / 2, S / 2, S * 0.2, S / 2, S / 2, S * 0.75);
        pg.addColorStop(0, '#efe2c0'); pg.addColorStop(0.7, '#dcc595'); pg.addColorStop(1, '#a8874f');
        g.fillStyle = pg; g.fillRect(0, 0, S, S);
        g.save();
        g.filter = 'sepia(0.85) saturate(0.75) contrast(1.15) brightness(1.08)';
        g.globalAlpha = 0.88;
        g.drawImage(W.mapImage, M, M, I, I);
        g.restore();
        const vg = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.72);
        vg.addColorStop(0, 'rgba(120,80,30,0)'); vg.addColorStop(1, 'rgba(90,55,20,0.55)');
        g.fillStyle = vg; g.fillRect(0, 0, S, S);
        g.strokeStyle = '#3a2410'; g.lineWidth = 3; g.strokeRect(M - 10, M - 10, I + 20, I + 20);
        g.lineWidth = 1; g.strokeRect(M - 4, M - 4, I + 8, I + 8);
        // rosa dei venti
        g.save(); g.translate(S - 92, 98); g.fillStyle = '#5a1a10'; g.strokeStyle = '#3a2410'; g.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(0, -42); g.lineTo(8, 0); g.lineTo(-8, 0); g.closePath(); if (i % 2) g.stroke(); else g.fill(); }
        g.restore();
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#3a1a08';
        g.font = '900 22px Cinzel, serif'; g.fillText('N', S - 92, 44);
        g.font = '700 34px Almendra, serif'; g.fillText("L'Isola Fantasma", S / 2, 58);
        g.font = 'italic 17px Alegreya, serif'; g.fillText('e la Laguna dei Sospiri', S / 2, 86);
        for (const m of W.mapMarkers) {
            const [x, y] = at(m.x, m.z);
            g.fillStyle = 'rgba(240,226,190,0.92)'; g.beginPath(); g.arc(x, y, 17, 0, Math.PI * 2); g.fill();
            g.strokeStyle = '#3a2410'; g.lineWidth = 1.5; g.stroke();
            drawIcon(g, m.ic, x, y, 22, '#3a1a08');
            g.font = 'italic 700 18px Almendra, serif'; g.fillStyle = '#2b1606';
            g.fillText(m.label, x, y + 30);
        }
        for (const p of this.players.values()) {
            const q = p.ch.root.position, [x, y] = at(q.x, q.z);
            g.fillStyle = this.isFriend(p.info.id) ? '#2a6a1a' : '#7a3a08';
            g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
        }
        const [px, py] = at(this.player.pos.x, this.player.pos.z);
        g.save(); g.translate(px, py); g.rotate(Math.PI - this.player.yaw);
        g.fillStyle = '#a3271c'; g.strokeStyle = '#2a0a04'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, -13); g.lineTo(9, 10); g.lineTo(0, 5); g.lineTo(-9, 10); g.closePath(); g.fill(); g.stroke();
        g.restore();
    }
    drawMinimap() {
        const g = this.mm, S = 360, W = this.world, P = this.player.pos;
        const ppm = 3.2;
        const k = ppm / (W.mapImage.width / (WORLD.MAX_X - WORLD.MIN_X));
        const [mx, mz] = W.mapToPx(P.x, P.z, W.mapImage.width);
        g.save();
        g.fillStyle = '#160a24'; g.fillRect(0, 0, S, S);
        g.translate(S / 2, S / 2);
        g.drawImage(W.mapImage, -mx * k, -mz * k, W.mapImage.width * k, W.mapImage.height * k);
        g.font = '26px Planewalker, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        const R = S / 2 - 18;
        for (const m of W.mapMarkers) {
            let x = (m.x - P.x) * ppm, y = (m.z - P.z) * ppm;
            const d = Math.hypot(x, y);
            if (d > R) { x *= R / d; y *= R / d; }
            g.fillStyle = 'rgba(10,6,4,0.72)'; g.beginPath(); g.arc(x, y, 16, 0, Math.PI * 2); g.fill();
            g.strokeStyle = '#8a6a2e'; g.lineWidth = 2; g.stroke();
            drawIcon(g, m.ic, x, y, 22, '#ffd76a');
        }
        for (const p of this.players.values()) {
            const q = p.ch.root.position;
            let x = (q.x - P.x) * ppm, y = (q.z - P.z) * ppm;
            const d = Math.hypot(x, y);
            if (d > R) { x *= R / d; y *= R / d; }
            g.fillStyle = p.info.duel ? '#ff4a4a' : this.isFriend(p.info.id) ? '#5aff7a' : '#ffff00';
            g.strokeStyle = '#000'; g.lineWidth = 2;
            g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill(); g.stroke();
        }
        g.rotate(Math.PI - this.player.yaw);
        g.fillStyle = '#ff4a4a'; g.strokeStyle = '#000'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(0, -16); g.lineTo(12, 13); g.lineTo(0, 6); g.lineTo(-12, 13); g.closePath(); g.fill(); g.stroke();
        g.restore();
    }

    // --- CICLO PRINCIPALE ---
    loop() {
        requestAnimationFrame(() => this.loop());
        const dt = Math.min(0.05, this.clock.getDelta());
        if (this.mode === 'duel' && this.duel) { this.duel.update(dt); return; }
        if (!this.world) return;
        if (this.mode === 'world') this.updatePlayer(dt);
        this.updateCamera(dt);
        this.world.update(dt, this.player.pos);
        this.myChar.update(dt);
        for (const p of this.players.values()) p.update(dt, this.camera.position);
        this.updateMud(dt);
        this.mmT -= dt;
        if (this.mmT <= 0) {
            this.mmT = 0.08;
            this.drawMinimap();
            this.updateVoiceVolumes();
            const zone = this.world.zoneName(this.player.pos.x, this.player.pos.z);
            if (zone !== this.zone) { this.zone = zone; $('#zone-name').textContent = zone; this.zoneSince = performance.now(); this.zoneShown = false; }
            else if (!this.zoneShown && performance.now() - this.zoneSince > 700) { this.zoneShown = true; this.showZoneBanner(zone); }
            this.updatePrompt();
        }
        if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
    }

    updatePlayer(dt) {
        const P = this.player, K = this.keys, W = this.world;
        P.mudCd = Math.max(0, P.mudCd - dt);
        let fwd = 0, right = 0;
        const typing = this.panels.isOpen;
        if (!typing) {
            if (K.KeyW || K.ArrowUp) fwd += 1;
            if (K.KeyS || K.ArrowDown) fwd -= 1;
            if (K.KeyD || K.ArrowRight) right += 1;
            if (K.KeyA || K.ArrowLeft) right -= 1;
            if (this.joy) { fwd += this.joy.y; right += this.joy.x; }
        }
        const cy = this.cam.yaw;
        const f = new THREE.Vector3(-Math.sin(cy), 0, -Math.cos(cy)), r = new THREE.Vector3(Math.cos(cy), 0, -Math.sin(cy));
        const wish = f.multiplyScalar(fwd).add(r.multiplyScalar(right));
        const len = Math.min(1, wish.length());
        if (len > 0.01) wish.normalize();
        if (P.sit) {
            if (len > 0.2) this.standUp();
            else {
                const ch = this.myChar;
                ch.root.position.copy(P.pos); ch.root.rotation.y = P.yaw;
                ch.state = 'sit'; ch.speed = 0; ch.root.visible = !this.cam.first;
                this.updateFill(P);
                this.sendPos(dt, 4);
                return;
            }
        }
        const terrainH = W.terrainAt(P.pos.x, P.pos.z);
        const inWater = terrainH < -0.05 && !W.onBridge(P.pos.x, P.pos.z);
        const running = (K.ShiftLeft || K.ShiftRight || this.joy?.run) && !inWater;
        const speed = (running ? 8.6 : 4.6) * (inWater ? 0.55 : 1) * len;
        const accel = P.grounded ? 14 : 3.5;
        P.vel.x += (wish.x * speed - P.vel.x) * Math.min(1, accel * dt);
        P.vel.z += (wish.z * speed - P.vel.z) * Math.min(1, accel * dt);
        P.vel.y -= 24 * dt;
        const next = P.pos.clone();
        next.x += P.vel.x * dt; next.z += P.vel.z * dt;
        if (!W.collide(next, 0.35, P.pos.y)) { next.x = P.pos.x; next.z = P.pos.z; P.vel.x = P.vel.z = 0; }
        next.y += P.vel.y * dt;
        const ground = W.groundAt(next.x, next.z, P.pos.y);
        if (next.y <= ground + 0.02 || (P.grounded && P.vel.y <= 0 && next.y - ground < 0.45)) {
            next.y = ground;
            if (!P.grounded && P.vel.y < -6) this.audio.play('step');
            P.vel.y = 0; P.grounded = true;
        } else P.grounded = false;
        P.pos.copy(next);
        const hs = Math.hypot(P.vel.x, P.vel.z);
        if (len > 0.05) {
            P.yaw = lerpAngle(P.yaw, Math.atan2(wish.x, wish.z), Math.min(1, dt * 12));
            if (this.myChar.action && ['saluta', 'balla', 'inchino', 'ride'].includes(this.myChar.action.name)) this.myChar.stop();
        }
        if (this.cam.first) P.yaw = this.cam.yaw + Math.PI;
        const ch = this.myChar;
        ch.root.position.copy(P.pos);
        ch.root.rotation.y = P.yaw;
        ch.state = !P.grounded ? 'air' : hs > 6 ? 'run' : hs > 0.4 ? 'walk' : 'idle';
        ch.speed = hs;
        ch.root.visible = !this.cam.first;
        this.updateFill(P);
        if (P.grounded && hs > 0.5) { P.stepT -= dt * hs; if (P.stepT <= 0) { P.stepT = 2.2; this.audio.play('step'); } }
        this.sendPos(dt, !P.grounded ? 3 : hs > 6 ? 2 : hs > 0.4 ? 1 : 0);
    }
    // luce di riempimento: lilla all'aperto, bianca e calda nella Stanza Bianca
    updateFill(P) {
        this.fillLight.position.set(P.pos.x + Math.sin(this.cam.yaw) * 2, P.pos.y + 2.6, P.pos.z + Math.cos(this.cam.yaw) * 2);
        const inRoom = this.world.inRoom(P.pos);
        if (inRoom !== this.fillInRoom) {
            this.fillInRoom = inRoom;
            this.fillLight.color.set(inRoom ? '#fff1e2' : '#d8c4ff');
            this.fillLight.intensity = inRoom ? 1.5 : 9;
            this.world.setIndoor(inRoom);
        }
    }
    // invio posizione (~15Hz)
    sendPos(dt, anim) {
        const P = this.player;
        P.lastSend -= dt;
        const st = [+P.pos.x.toFixed(2), +P.pos.y.toFixed(2), +P.pos.z.toFixed(2), +P.yaw.toFixed(2), anim];
        const changed = !P.lastSent || st.some((v, i) => v !== P.lastSent[i]);
        if (P.lastSend <= 0 && (changed || P.lastSend < -1)) {
            P.lastSend = 1 / 15; P.lastSent = st;
            this.net.sendVolatile('mv', st);
        }
    }

    updateCamera(dt) {
        const P = this.player, C = this.cam;
        const h = (this.me?.appearance?.height || 1);
        C.dist += (C.wantDist - C.dist) * Math.min(1, dt * 3);
        const head = P.pos.clone().add(new THREE.Vector3(0, 1.6 * h, 0));
        if (C.first) {
            this.camera.position.copy(head).add(new THREE.Vector3(Math.sin(P.yaw) * 0.18, 0.05, Math.cos(P.yaw) * 0.18));
            const dir = new THREE.Vector3(-Math.sin(C.yaw) * Math.cos(C.pitch), -Math.sin(C.pitch), -Math.cos(C.yaw) * Math.cos(C.pitch));
            this.camera.lookAt(this.camera.position.clone().add(dir));
            return;
        }
        const off = new THREE.Vector3(Math.sin(C.yaw) * Math.cos(C.pitch), Math.sin(C.pitch), Math.cos(C.yaw) * Math.cos(C.pitch));
        const target = head.clone().add(new THREE.Vector3(Math.cos(C.yaw) * 0.35, 0, -Math.sin(C.yaw) * 0.35));
        let dist = C.dist;
        this.raycaster.set(target, off);
        this.raycaster.far = dist;
        const hit = this.raycaster.intersectObjects(this.world.cameraBlockers, false)[0];
        if (hit) dist = Math.max(0.6, hit.distance - 0.3);
        const pos = target.clone().addScaledVector(off, dist);
        const gh = Math.max(this.world.terrainAt(pos.x, pos.z), 0) + 0.35;
        if (pos.y < gh) pos.y = gh;
        this.camera.position.lerp(pos, hit ? 1 : 1 - Math.exp(-dt * 18));
        this.camera.lookAt(target);
    }

    updatePrompt() {
        const P = this.player.pos;
        const it = this.world.nearestInteractable(P.x, P.z, P.y);
        this.nearInteract = it;
        let near = null, nd = 3.5;
        for (const p of this.players.values()) { const d = p.distTo(P); if (d < nd) { nd = d; near = p; } }
        this.nearPlayer = near;
        const el = $('#prompt');
        const label = it ? String(it.id === 'siedi' && this.player.sit === it.seat ? 'Alzati' : typeof it.label === "function" ? it.label() : it.label).replace(/[<>&]/g, "") : "";
        const html = it ? `<kbd>E</kbd>${label}` : near ? `<kbd>${IS_MOBILE ? 'E' : 'R'}</kbd>Profilo di ${near.info.name.replace(/[<>&]/g, '')}` : '';
        if (el.dataset.html !== html) { el.dataset.html = html; el.innerHTML = html; el.classList.toggle('hidden', !html || this.panels.isOpen); }
        else el.classList.toggle('hidden', !html || this.panels.isOpen);
    }
}

window.__game = new Game();
