const port = process.env.PORT || 3000; // Render ci assegnerà una porta dinamica
const io = require("socket.io")(port, {
  cors: {
    origin: "*", // Accetta connessioni da ovunque
  }
});

let players = {};

console.log(`Server Multiplayer avviato sulla porta ${port}`);

io.on("connection", (socket) => {
  console.log("Nuovo giocatore connesso:", socket.id);

  players[socket.id] = {
    x: 0, y: 0, z: 0, 
    theta: 0, 
    skin: "plebeo.png"
  };

  socket.emit("currentPlayers", players);

  socket.broadcast.emit("newPlayer", { 
    id: socket.id, 
    player: players[socket.id] 
  });

  socket.on("playerMove", (data) => {
    if (players[socket.id]) {
      players[socket.id] = data;
      socket.broadcast.emit("playerMoved", { id: socket.id, ...data });
    }
  });

  socket.on("skinChange", (file) => {
    if (players[socket.id]) {
      players[socket.id].skin = file;
      socket.broadcast.emit("playerSkinChanged", { id: socket.id, skin: file });
    }
  });

  socket.on("disconnect", () => {
    console.log("Disconnesso:", socket.id);
    delete players[socket.id];
    io.emit("playerDisconnected", socket.id);
  });
});
