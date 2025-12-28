const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.static(path.join(__dirname, 'public')));

let players = {};

io.on('connection', (socket) => {
    console.log('Nuovo giocatore:', socket.id);

    // Dati base giocatore
    players[socket.id] = { 
        x: 0, y: 0, z: 0, theta: 0, 
        skin: "plebeo.png", name: "Anonimo" 
    };

    // Invia giocatori esistenti al nuovo arrivato
    socket.emit('currentPlayers', players);
    
    // Avvisa tutti del nuovo arrivato
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // --- LOGICA MOVIMENTO ---
    socket.on('playerMove', (data) => {
        if (players[socket.id]) {
            players[socket.id] = { ...players[socket.id], ...data };
            socket.broadcast.emit('playerMoved', { id: socket.id, ...players[socket.id] });
        }
    });

    socket.on('skinChange', (file) => {
        if (players[socket.id]) {
            players[socket.id].skin = file;
            socket.broadcast.emit('playerSkinChanged', { id: socket.id, skin: file });
        }
    });

    // --- LOGICA CHAT TESTUALE ---
    socket.on('chatMessage', (msg) => {
        const name = players[socket.id] ? players[socket.id].name : "Anonimo";
        io.emit('chatMessage', { id: socket.id, name: name, text: msg });
    });

    // --- LOGICA VOICE CHAT (WebRTC Signaling) ---
    // 1. Un client invia un segnale audio (offerta/risposta) destinato a uno specifico ID
    socket.on("sendingSignal", payload => {
        io.to(payload.userToSignal).emit('userJoined', { signal: payload.signal, callerID: payload.callerID });
    });

    // 2. Il client ricevente risponde
    socket.on("returningSignal", payload => {
        io.to(payload.callerID).emit('receivingReturnedSignal', { signal: payload.signal, id: socket.id });
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
