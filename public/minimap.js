// minimap.js

export class Minimap {
    constructor(scene, playerGroup, remotePlayers, mapSize = 300) {
        this.scene = scene;
        this.playerGroup = playerGroup;
        this.remotePlayers = remotePlayers; // Riferimento all'oggetto dei player remoti
        this.mapSize = mapSize; // Dimensione totale del mondo (pavimento)
        
        // Configurazione Minimappa
        this.size = 200; // Grandezza in pixel del box mappa (200x200)
        this.zoom = 5;   // Zoom (più è alto, più vedi area, più è basso più è zoomato)

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.setupDOM();
    }

    setupDOM() {
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        
        // Stile CSS per posizionarla in basso a sinistra (stile GTA)
        Object.assign(this.canvas.style, {
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            width: `${this.size}px`,
            height: `${this.size}px`,
            borderRadius: '50%', // Rotonda
            border: '3px solid #fff',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: '100',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)'
        });

        document.body.appendChild(this.canvas);
    }

    update() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        // Pulisci
        ctx.clearRect(0, 0, w, h);

        // --- 1. Disegna Sfondo/Muri (Semplificato) ---
        // Salviamo il contesto per ruotare tutto attorno al giocatore
        ctx.save();
        
        // Spostiamo l'origine al centro e ruotiamo in base alla rotazione del giocatore
        // (Così la mappa ruota come in GTA)
        // Nota: playerGroup non ruota fisicamente, la rotazione è gestita dalla variabile 'theta' nel main.
        // Dobbiamo passare 'theta' all'update se vogliamo la rotazione, 
        // ALTRIMENTI (più semplice): Mappa fissa (Nord in alto), freccia che gira.
        
        // Facciamo MAPPA FISSA (Nord in alto) per ora, è più chiaro per orientarsi nei castelli.
        
        // Calcola offset per centrare il giocatore
        const scale = this.zoom; 
        const px = this.playerGroup.position.x;
        const pz = this.playerGroup.position.z;

        // Disegna una griglia o bordo del mondo per riferimento
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Disegna un cerchio che rappresenta il raggio visivo della mappa
        ctx.arc(cx, cy, w/2 - 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.clip(); // Disegna solo dentro il cerchio

        // --- 2. Disegna gli ALTRI PLAYER (Remote) ---
        if (this.remotePlayers) {
            Object.values(this.remotePlayers).forEach(mesh => {
                // Posizione relativa al giocatore locale
                const rx = (mesh.position.x - px) * scale;
                const rz = (mesh.position.z - pz) * scale;

                // Disegna pallino Rosso
                ctx.fillStyle = '#ff3333';
                ctx.beginPath();
                ctx.arc(cx + rx, cy + rz, 4, 0, Math.PI * 2);
                ctx.fill();
                
                // (Opzionale) Nome player? Sarebbe complesso passarlo qui, lasciamo solo pallino
            });
        }

        // --- 3. Disegna il GIOCATORE LOCALE (Sempre al centro) ---
        ctx.fillStyle = '#00ff00'; // Verde
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2); // Pallino centrale
        ctx.fill();
        
        // Freccia direzione (Se passiamo la rotazione)
        // Per ora pallino semplice
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }
    
    // Metodo opzionale se volessimo disegnare i muri veri
    // Richiederebbe di passare l'array wallMeshes
}
