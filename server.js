const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configurazione CORS per permettere connessioni dal tuo sito GitHub Pages
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Serve i file statici (se usi approccio tutto-in-uno, altrimenti viene ignorato)
app.use(express.static(path.join(__dirname, 'public')));

let players = {};

console.log("Server avviato...");

io.on('connection', (socket) => {
    console.log('Nuovo giocatore:', socket.id);

    // Stato iniziale (Aggiunto campo 'name')
    players[socket.id] = { 
        x: 0, y: 0, z: 0, 
        theta: 0, 
        skin: "plebeo.png",
        name: "Anonimo" // Nome default
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // Gestione Movimento + Dati Player
    socket.on('playerMove', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].z = data.z;
            players[socket.id].theta = data.theta;
            players[socket.id].skin = data.skin;
            players[socket.id].name = data.name; // Aggiorniamo il nome
            
            socket.broadcast.emit('playerMoved', { id: socket.id, ...players[socket.id] });
        }
    });

    socket.on('skinChange', (file) => {
        if (players[socket.id]) {
            players[socket.id].skin = file;
            socket.broadcast.emit('playerSkinChanged', { id: socket.id, skin: file });
        }
    });

    // --- NUOVO: GESTIONE CHAT ---
    socket.on('chatMessage', (msg) => {
        // Manda il messaggio a TUTTI (incluso chi l'ha mandato)
        const name = players[socket.id] ? players[socket.id].name : "Anonimo";
        io.emit('chatMessage', { id: socket.id, name: name, text: msg });
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server attivo su porta ${PORT}`);
});
