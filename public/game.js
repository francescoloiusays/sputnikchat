import * as THREE from 'three';

// --- CONFIGURAZIONE GIOCO ---
const SOCKET_URL = "https://sputnikchat-1.onrender.com"; 
const MUSIC_FILE = "./soundtrack.mp3"; 
// Configurazione Minigioco
const MUD_SPEED = 25.0;     // Velocità palla
const SHOT_COOLDOWN = 500;  // Millisecondi tra un colpo e l'altro
const FREEZE_HITS = 5;      // Quanti colpi subiti prima di congelare
const FREEZE_TIME = 5000;   // Durata congelamento (ms)

// Variabili Globali
let scene, camera, renderer, loader, socket;
let playerGroup, avatarMesh;
let moveForward=false, moveBackward=false, moveLeft=false, moveRight=false;
let canJump=false, isLocked=false, isThirdPerson=false;
let velocity = new THREE.Vector3();
const GRAVITY = 30.0;
let theta = 0, phi = 0;

// Variabili Stato e Multiplayer
let mySkin="plebeo.png", myName="Anonimo", gameInitialized=false;
const remotePlayers = {}; 
const wallMeshes=[], colliders=[], torchLights=[];
let wallTexture, floorTexture, torchAnimatedTexture;
let bullets = []; 

// Stato Minigame
let myScore = 0;
let myHitsTaken = 0;
let isFrozen = false;
let lastShotTime = 0;
let scores = {}; 

// Audio & WebRTC
let localStream=null, bgMusic=null, isMusicOn=false, isMicActive=false;
const peers={};
let currentSkinIndex = 0;
const avatarOptions = [
    { label: "Ratto", file: "Personaggi/Rat.png", propic: "Personaggi/Rat_propic.png" },
    { label: "Alessandro", file: "Personaggi/Alessandro.png", propic: "Personaggi/Alessandro_propic.png" },
    { label: "Francesco", file: "Personaggi/Francesco.png", propic: "Personaggi/Francesco_propic.png" }
];

// --- FUNZIONI GRAFICHE HUD ---
function createNameTagSprite(name) {
    const canvas = document.createElement('canvas'); canvas.width=256; canvas.height=64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "rgba(0,0,0,0.5)"; 
    ctx.beginPath(); ctx.roundRect(4,4,248,56,15); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth=3; ctx.stroke();
    ctx.font="28px Planewalker, sans-serif"; ctx.fillStyle="#ffff00"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(name.slice(0,16), 128, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    spr.scale.set(2.0, 0.5, 1);
    return spr;
}

function createCrownSprite() {
    const canvas = document.createElement('canvas'); canvas.width=64; canvas.height=64;
    const ctx = canvas.getContext('2d');
    ctx.font="50px serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("👑", 32, 36); 
    const tex = new THREE.CanvasTexture(canvas);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    spr.scale.set(1, 1, 1);
    return spr;
}

function setOrUpdateNameTag(parent, name) {
    if(parent.userData.tag) parent.remove(parent.userData.tag);
    const tag = createNameTagSprite(name);
    tag.position.set(0, 1.9, 0);
    parent.add(tag);
    parent.userData.tag = tag;
    
    // Slot Corona (inizialmente nascosta)
    if(!parent.userData.crown) {
        const crown = createCrownSprite();
        crown.position.set(0, 2.4, 0);
        crown.visible = false;
        parent.add(crown);
        parent.userData.crown = crown;
    }
}

// --- AVVIO GIOCO ---
function setupLogin() {
    const btn = document.getElementById('play-btn');
    const input = document.getElementById('nickname-input');
    const start = async () => {
        if(gameInitialized) return; gameInitialized=true;
        myName = input.value.trim() || "Anonimo";
        document.getElementById('hud-name').innerText = myName;
        
        // Init Score
        scores['me'] = 0; 

        try {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localStream.getAudioTracks()[0].enabled = false;
        } catch(e) { console.log("Microfono non disponibile"); }

        document.getElementById('login-overlay').style.display='none';
        document.getElementById('instructions').style.display='block';
        init(); initSocket(); animate();
    };
    btn.onclick = start; input.onkeydown = e => { if(e.key==='Enter') start(); };
}

// --- INIZIALIZZAZIONE THREE.JS ---
function init() {
    scene = new THREE.Scene();
    
    // CIELO CREPUSCOLARE (Stile Mario Kart DS)
    const cvs = document.createElement('canvas'); cvs.width=1; cvs.height=32;
    const ctx = cvs.getContext('2d');
    const grd = ctx.createLinearGradient(0,0,0,32);
    grd.addColorStop(0, '#0b001a'); grd.addColorStop(0.4, '#2d0a45'); 
    grd.addColorStop(0.7, '#751e5e'); grd.addColorStop(1, '#ffaa00');
    ctx.fillStyle = grd; ctx.fillRect(0,0,1,32);
    scene.background = new THREE.CanvasTexture(cvs);
    scene.fog = new THREE.Fog(0x2d0a45, 10, 60);

    camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
    scene.add(camera);

    loader = new THREE.TextureLoader();
    wallTexture = loader.load('./muro.jpg');
    floorTexture = loader.load('./pavimento.jpg');
    if(floorTexture) { floorTexture.wrapS=floorTexture.wrapT=THREE.RepeatWrapping; floorTexture.repeat.set(15,15); }

    const gCvs = document.createElement('canvas'); gCvs.width=512; gCvs.height=512;
    torchAnimatedTexture = new THREE.CanvasTexture(gCvs);
    try { window.gifler('./torcia.gif').animate(gCvs); } catch(e){}

    // Setup Player Locale
    playerGroup = new THREE.Group();
    avatarMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 1.7), 
        new THREE.MeshStandardMaterial({ transparent:true, side:THREE.DoubleSide, alphaTest:0.5 })
    );
    avatarMesh.position.set(0, 0.85, 0);
    avatarMesh.visible = false; 
    playerGroup.add(avatarMesh);
    setOrUpdateNameTag(playerGroup, myName);
    playerGroup.userData.tag.visible = false; 
    scene.add(playerGroup);

    setupAvatarUI(); setupMicButton(); setupMusic();
    buildLevel();

    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    document.body.appendChild(renderer.domElement);

    // Gestione Input Mouse/Tastiera
    document.addEventListener('click', () => {
        if(!isLocked && document.getElementById('login-overlay').style.display==='none') document.body.requestPointerLock();
        else if(isLocked) shootBall(); // CLICK PER SPARARE
    });
    document.addEventListener('pointerlockchange', () => {
        isLocked = (document.pointerLockElement === document.body);
        document.getElementById('instructions').style.display = isLocked ? 'none' : 'block';
    });
    document.addEventListener('mousemove', e => {
        if(isLocked && !isFrozen) {
            theta -= e.movementX * 0.002;
            phi = Math.max(-1.5, Math.min(1.5, phi + e.movementY * 0.002));
        }
    });
    
    const chatIn = document.getElementById('chat-input');
    document.addEventListener('keydown', e => {
        if(document.activeElement===chatIn) {
            if(e.code==='Enter' && chatIn.value.trim()) { socket.emit('chatMessage', chatIn.value.trim()); chatIn.value=''; }
            if(e.code==='Escape') { chatIn.blur(); document.body.requestPointerLock(); }
            return;
        }
        if(e.code==='Enter') { document.exitPointerLock(); chatIn.focus(); return; }
        if(isFrozen) return; // Se congelato, niente input

        if(e.code==='KeyM') toggleMic();
        if(e.code==='KeyB') toggleMusic();
        if(e.code==='KeyF') shootBall(); 

        switch(e.code) {
            case 'KeyW': moveForward=true; break;
            case 'KeyS': moveBackward=true; break;
            case 'KeyA': moveLeft=true; break;
            case 'KeyD': moveRight=true; break;
            case 'Space': if(canJump) { velocity.y+=12; canJump=false; } break;
            case 'KeyV': 
                isThirdPerson=!isThirdPerson; avatarMesh.visible=isThirdPerson; 
                if(playerGroup.userData.tag) playerGroup.userData.tag.visible=isThirdPerson;
                break;
        }
    });
    document.addEventListener('keyup', e => {
        switch(e.code) {
            case 'KeyW': moveForward=false; break;
            case 'KeyS': moveBackward=false; break;
            case 'KeyA': moveLeft=false; break;
            case 'KeyD': moveRight=false; break;
        }
    });
    window.onresize = () => { camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); };
}

// --- LOGICA DEL MINIGIOCO (MudBall) ---

function shootBall() {
    if(isFrozen || !socket) return;
    const now = Date.now();
    if(now - lastShotTime < SHOT_COOLDOWN) return;
    lastShotTime = now;

    // Calcolo direzione
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const startPos = playerGroup.position.clone();
    startPos.y += 1.5; 
    
    // Crea palla visiva locale
    createBullet(startPos, dir, socket.id);

    // Invia "Evento Sparo" via chat nascosta
    socket.emit('chatMessage', `__SHOOT__:${startPos.x},${startPos.y},${startPos.z},${dir.x},${dir.y},${dir.z}`);
}

function createBullet(pos, dir, shooterId) {
    const geo = new THREE.SphereGeometry(0.2, 8, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Colore Fango
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    
    bullets.push({
        mesh: mesh,
        velocity: dir.multiplyScalar(MUD_SPEED),
        shooterId: shooterId,
        life: 2.0 // secondi
    });
}

function handleHit(shooterId) {
    if(isFrozen) return;
    myHitsTaken++;
    
    // Dico a tutti che sono stato colpito
    socket.emit('chatMessage', `__HIT__:${shooterId}:${socket.id}`);
    
    if(myHitsTaken >= FREEZE_HITS) {
        freezePlayer();
    }
}

function freezePlayer() {
    isFrozen = true;
    document.getElementById('freeze-warning').style.display = 'block';
    avatarMesh.material.color.setHex(0x00ffff); // Colore Ghiaccio
    socket.emit('skinChange', "FROZEN"); // Segnale visivo agli altri
    
    setTimeout(() => {
        isFrozen = false;
        myHitsTaken = 0;
        document.getElementById('freeze-warning').style.display = 'none';
        avatarMesh.material.color.setHex(0xffffff);
        socket.emit('skinChange', mySkin); 
    }, FREEZE_TIME);
}

function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.life -= dt;
        
        // Muovi
        b.mesh.position.add(b.velocity.clone().multiplyScalar(dt));

        // Collisione con Giocatore Locale (se la palla non è mia)
        if (b.shooterId !== socket.id && !isFrozen) {
            const myPos = playerGroup.position.clone().add(new THREE.Vector3(0,1,0));
            if(b.mesh.position.distanceTo(myPos) < 0.8) {
                handleHit(b.shooterId);
                scene.remove(b.mesh);
                bullets.splice(i, 1);
                continue;
            }
        }

        if (b.life <= 0) {
            scene.remove(b.mesh);
            bullets.splice(i, 1);
        }
    }
}

function updateCrowns() {
    let maxScore = -1;
    let winnerId = null;
    
    // Includo il mio score locale
    scores[socket.id] = myScore;
    
    for(let id in scores) {
        if(scores[id] > maxScore) {
            maxScore = scores[id];
            winnerId = id;
        }
    }

    // Aggiorna Corona Locale
    if(playerGroup.userData.crown) playerGroup.userData.crown.visible = (winnerId === socket.id && maxScore > 0);

    // Aggiorna Corone Remote
    for(let id in remotePlayers) {
        const p = remotePlayers[id];
        if(p.userData.crown) p.userData.crown.visible = (id === winnerId && maxScore > 0);
    }
}

// --- MAPPA (5 STANZE + VETRI) ---
function buildLevel() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(150,150), new THREE.MeshStandardMaterial({map:floorTexture}));
    floor.rotation.x = -Math.PI/2; 
    if(floorTexture) floorTexture.repeat.set(15,15);
    scene.add(floor);

    const createWindow = (x,y,z,w,rot) => {
        const grp = new THREE.Group(); grp.position.set(x,y,z); grp.rotation.y = rot;
        const mat = new THREE.MeshStandardMaterial({map:wallTexture, color:0xaaaaaa});
        const glass = new THREE.MeshPhysicalMaterial({color:0x111111, metalness:0.9, roughness:0.1, transparent:true, opacity:0.5, side:2});
        
        const bot = new THREE.Mesh(new THREE.BoxGeometry(w,3,1), mat); bot.position.y=-3.5; grp.add(bot);
        const top = new THREE.Mesh(new THREE.BoxGeometry(w,2,1), mat); top.position.y=4.0; grp.add(top);
        const gl = new THREE.Mesh(new THREE.BoxGeometry(w,5,0.2), glass); gl.position.y=0.5; grp.add(gl);
        scene.add(grp);
        
        const col = new THREE.Mesh(new THREE.BoxGeometry(w,10,1), new THREE.MeshBasicMaterial({visible:false}));
        col.position.set(x,y,z); col.rotation.y=rot; scene.add(col);
        colliders.push(new THREE.Box3().setFromObject(col));
    };

    const createWall = (x,y,z,w,h,d) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial({map:wallTexture}));
        m.position.set(x,y,z); scene.add(m); wallMeshes.push(m);
        colliders.push(new THREE.Box3().setFromObject(m));
    };

    // Costruzione Stanze (Mappa Complessa)
    // Atrio
    createWall(-6,5,0,1,10,12); createWall(6,5,0,1,10,12);
    createWall(-4.25,5,6,4.5,10,1); createWall(4.25,5,6,4.5,10,1);
    createWall(-4.25,5,-6,4.5,10,1); createWall(4.25,5,-6,4.5,10,1);
    // Corridoio
    createWall(-4,5,-11,1,10,10); createWall(4,5,-11,1,10,10);
    // Sala Grande
    createWall(-8,5,-16,9,10,1); createWall(8,5,-16,9,10,1);
    createWindow(0,5,-36,22,0); // Finestra Nord
    createWall(-11,5,-21,1,10,10); createWall(-11,5,-33,1,10,6);
    createWall(11,5,-21,1,10,10); createWall(11,5,-33,1,10,6);
    // Armeria
    createWall(-25,5,-36,30,10,1); createWall(-25,5,-16,30,10,1);
    createWindow(-40,5,-26,21,Math.PI/2); // Finestra Ovest
    // Santuario
    createWall(16,5,-25,10,10,1); createWall(16,5,-31,10,10,1);
    createWall(21,5,-19.25,1,10,11.5); createWall(21,5,-34.75,1,10,7.5);
    createWindow(35,5,-26,25,Math.PI/2); // Finestra Est
    createWall(28,5,-39,15,10,1); createWall(28,5,-13,15,10,1); createWall(28,5,-26,4,10,4);
    // Cripta
    createWall(-2.5,5,9,1,10,6); createWall(2.5,5,9,1,10,6);
    createWall(-5,5,12,6,10,1); createWall(5,5,12,6,10,1);
    createWall(-8,5,17,1,10,10); createWall(8,5,17,1,10,10);
    createWall(0,5,22,17,10,1);

    // Luci e Torce
    const addLight = (x,z,rot) => {
        const l = new THREE.PointLight(0xff6600, 2, 15);
        l.position.set(x+Math.sin(rot)*0.2, 2.8, z+Math.cos(rot)*0.2); // Luce dentro la fiamma
        scene.add(l); torchLights.push({light:l, speed:2+Math.random()*3});
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(2,2), new THREE.MeshBasicMaterial({map:torchAnimatedTexture, transparent:true, blending:2, side:2, depthWrite:false}));
        plane.position.set(x,2.5,z); plane.rotation.y=rot; scene.add(plane);
    };
    addLight(-5.4,0,1.57); addLight(5.4,0,-1.57);
    addLight(-10.4,-17,1.57); addLight(10.4,-17,-1.57);
    addLight(-20,-35.4,3.14); addLight(-30,-35.4,3.14); addLight(-39.4,-26,1.57);
    addLight(28,-38.4,3.14); addLight(28,-13.6,0); addLight(0,21.4,3.14);
}

// --- ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const dt = 0.016;
    if(torchAnimatedTexture) torchAnimatedTexture.needsUpdate=true;
    const t = performance.now()*0.001;
    torchLights.forEach(o => o.light.intensity=30+Math.sin(t*o.speed)*5);

    updateBullets(dt);

    if(isLocked && !isFrozen) {
        // Fisica base
        velocity.y -= GRAVITY*dt;
        velocity.x -= velocity.x*10*dt;
        velocity.z -= velocity.z*10*dt;
        
        const dir = new THREE.Vector3(); camera.getWorldDirection(dir); dir.y=0; dir.normalize();
        const right = new THREE.Vector3().crossVectors(camera.up, dir).normalize(); 
        
        if(moveForward) velocity.add(dir.multiplyScalar(150*dt));
        if(moveBackward) velocity.add(dir.multiplyScalar(-150*dt));
        if(moveLeft) velocity.add(right.multiplyScalar(150*dt)); 
        if(moveRight) velocity.add(right.multiplyScalar(-150*dt));

        playerGroup.position.x += velocity.x*dt;
        if(checkCol(playerGroup.position)) { playerGroup.position.x-=velocity.x*dt; velocity.x=0; }
        playerGroup.position.z += velocity.z*dt;
        if(checkCol(playerGroup.position)) { playerGroup.position.z-=velocity.z*dt; velocity.z=0; }
        
        playerGroup.position.y += velocity.y*dt;
        if(playerGroup.position.y < 0) { playerGroup.position.y=0; velocity.y=0; canJump=true; }

        if(socket?.connected) socket.emit('playerMove', { 
            x:playerGroup.position.x, y:playerGroup.position.y+0.85, z:playerGroup.position.z, 
            theta:theta, skin:mySkin, name:myName 
        });
    }

    // Camera 1a/3a persona
    const head = playerGroup.position.clone().add(new THREE.Vector3(0,1.6,0));
    const dist = isThirdPerson ? 3.5 : 0.1;
    const offset = new THREE.Vector3(Math.sin(theta)*Math.cos(phi), Math.sin(phi), Math.cos(theta)*Math.cos(phi)).multiplyScalar(dist);
    camera.position.copy(head).add(offset);
    camera.lookAt(head); 
    if(isThirdPerson) avatarMesh.rotation.y = theta + Math.PI;

    renderer.render(scene, camera);
}

function checkCol(p) { 
    const box = new THREE.Box3(new THREE.Vector3(p.x-0.4,0,p.z-0.4), new THREE.Vector3(p.x+0.4,2,p.z+0.4));
    return colliders.some(c => box.intersectsBox(c)); 
}

// --- GESTIONE SOCKET & EVENTI ---
function initSocket() {
    socket = io(SOCKET_URL);
    socket.on('connect', () => { 
        console.log("Connected"); 
        scores[socket.id] = 0;
    });
    
    // Gestione Messaggi (Chat + Eventi Gioco nascosti)
    socket.on('chatMessage', data => {
        const txt = data.text || "";
        
        // EVENTO SPARO REMOTO
        if(txt.startsWith("__SHOOT__:")) {
            const parts = txt.split(':')[1].split(',').map(parseFloat);
            createBullet(
                new THREE.Vector3(parts[0], parts[1], parts[2]),
                new THREE.Vector3(parts[3], parts[4], parts[5]),
                "remote"
            );
            return; 
        }

        // EVENTO COLPO A SEGNO
        if(txt.startsWith("__HIT__:")) {
            const parts = txt.split(':');
            const shooter = parts[1];
            
            // Incrementa score dello sparatore
            if(!scores[shooter]) scores[shooter] = 0;
            scores[shooter]++;
            
            // Se sono io lo shooter, aggiorno il mio display
            if(shooter === socket.id) {
                myScore++;
                document.getElementById('score-display').innerText = myScore;
            }
            
            updateCrowns();
            return;
        }

        // Chat Normale
        const div = document.createElement('div');
        div.innerHTML = `<span class="chat-name">${data.name}:</span> ${txt}`;
        document.getElementById('chat-messages').appendChild(div);
    });

    socket.on('playerMove', data => {
        if(data.id===socket.id) return;
        let p = remotePlayers[data.id];
        if(!p) {
            // Creo nuovo avatar remoto
            const m = avatarMesh.clone(); 
            m.visible=true;
            scene.add(m); 
            setOrUpdateNameTag(m, data.name || "Anonimo");
            remotePlayers[data.id] = m;
            scores[data.id] = 0; 
            p = m;
            // WebRTC
            if(!peers[data.id]) {
                const peer = new SimplePeer({initiator:true, stream:localStream});
                peer.on('signal', s => socket.emit('sendingSignal',{userToSignal:data.id, callerID:socket.id, signal:s}));
                peer.on('stream', s => { const a=document.createElement('audio'); a.srcObject=s; a.autoplay=true; document.body.appendChild(a); });
                peers[data.id] = peer;
            }
        }
        p.position.set(data.x, data.y, data.z);
        p.rotation.y = data.theta + Math.PI;
        if(data.name) setOrUpdateNameTag(p, data.name);
        
        // Gestione colore Congelamento
        if(data.skin === "FROZEN") p.material.color.setHex(0x00ffff);
        else {
            p.material.color.setHex(0xffffff);
            if(p.userData.skin !== data.skin) {
                loader.load(`./${data.skin||'plebeo.png'}`, t => { t.colorSpace='srgb'; p.material.map=t; p.material.needsUpdate=true; });
                p.userData.skin = data.skin;
            }
        }
    });

    socket.on('playerDisconnected', id => {
        if(remotePlayers[id]) { scene.remove(remotePlayers[id]); delete remotePlayers[id]; }
        if(peers[id]) { peers[id].destroy(); delete peers[id]; }
        delete scores[id];
        updateCrowns();
    });

    socket.on('userJoined', p => {
        const peer = new SimplePeer({initiator:false, stream:localStream});
        peer.on('signal', s => socket.emit('returningSignal',{signal:s, callerID:p.callerID}));
        peer.on('stream', s => { const a=document.createElement('audio'); a.srcObject=s; a.autoplay=true; document.body.appendChild(a); });
        peers[p.callerID] = peer;
    });
    socket.on('receivingReturnedSignal', p => { if(peers[p.id]) peers[p.id].signal(p.signal); });
}

// SETUP UI E AUDIO BASE
function setupAvatarUI() {
    const updateSkin = () => {
        const s = avatarOptions[currentSkinIndex]; mySkin=s.file;
        document.getElementById('skin-label').innerText = "Skin: "+s.label;
        document.getElementById('hud-propic').src = s.propic;
        loader.load(mySkin, t=>{t.colorSpace='srgb'; avatarMesh.material.map=t;});
        if(socket) socket.emit('skinChange', mySkin);
    };
    document.getElementById('prev-skin-btn').onclick = () => { currentSkinIndex=(currentSkinIndex-1+3)%3; updateSkin(); };
    document.getElementById('next-skin-btn').onclick = () => { currentSkinIndex=(currentSkinIndex+1)%3; updateSkin(); };
    updateSkin();
}

function toggleMic() {
    if(!localStream) return; isMicActive=!isMicActive;
    localStream.getAudioTracks()[0].enabled = isMicActive;
    document.getElementById('mic-icon').className = isMicActive ? "fa-solid fa-microphone" : "fa-solid fa-microphone-slash";
    document.getElementById('mic-btn').classList.toggle('active', isMicActive);
}

async function setupMusic() {
    document.getElementById('music-btn').onclick = async () => {
        if(!bgMusic) { bgMusic=new Audio(MUSIC_FILE); bgMusic.loop=true; bgMusic.volume=0.3; }
        isMusicOn = !isMusicOn;
        if(isMusicOn) { await bgMusic.play(); document.getElementById('music-icon').className="fa-solid fa-music"; }
        else { bgMusic.pause(); document.getElementById('music-icon').className="fa-solid fa-music"; document.getElementById('music-icon').style.opacity=0.5; }
        document.getElementById('music-btn').classList.toggle('music-on', isMusicOn);
    };
}

// AVVIO
setupLogin();
