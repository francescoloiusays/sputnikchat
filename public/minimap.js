// minimap.js

export class Minimap {
    constructor(scene, playerGroup, remotePlayers) {
        this.scene = scene;
        this.playerGroup = playerGroup;
        this.remotePlayers = remotePlayers;
        
        // Configurazione
        this.size = 200; // Grandezza 200x200 pixel
        this.zoom = 4;   // Zoom della mappa

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.setupDOM();
    }

    setupDOM() {
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        
        // Stile CSS
        Object.assign(this.canvas.style, {
            position: 'absolute',
            bottom: '80px',     // ALZATA: da 20px a 80px (per evitare sovrapposizioni)
            left: '20px',
            width: `${this.size}px`,
            height: `${this.size}px`,
            // borderRadius: '50%', // RIMOSSO: Ora è quadrata
            border: '2px solid rgba(255, 255, 255, 0.6)', // Bordo semi-trasparente
            backgroundColor: 'rgba(0, 0, 0, 0.5)',        // SFONDO: Opacità al 50%
            zIndex: '100',
            boxShadow: '0 0 10px rgba(0,0,0,0.3)'
        });

        document.body.appendChild(this.canvas);
    }

    update() {
        if (!this.playerGroup) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        // Pulisci tutto
        ctx.clearRect(0, 0, w, h);

        ctx.save();

        // Parametri per disegnare
        const scale = this.zoom; 
        const px = this.playerGroup.position.x;
        const pz = this.playerGroup.position.z;

        // --- 1. Griglia di Riferimento (Opzionale, aiuta a capire il movimento) ---
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Disegna una croce centrale
        ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
        ctx.moveTo(0, cy); ctx.lineTo(w, cy);
        ctx.stroke();

        // --- 2. Disegna gli ALTRI PLAYER (Rossi) ---
        if (this.remotePlayers) {
            Object.values(this.remotePlayers).forEach(mesh => {
                // Calcola distanza relativa
                const rx = (mesh.position.x - px) * scale;
                const rz = (mesh.position.z - pz) * scale;

                // Disegna solo se è dentro la mappa (per evitare pallini fuori dal quadrato)
                if (Math.abs(rx) < w/2 && Math.abs(rz) < h/2) {
                    ctx.fillStyle = '#ff4444'; // Rosso chiaro
                    ctx.beginPath();
                    ctx.arc(cx + rx, cy + rz, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }

        // --- 3. Disegna il GIOCATORE LOCALE (Verde al centro) ---
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Contorno giocatore
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }
}
