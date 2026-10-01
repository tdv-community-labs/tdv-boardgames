import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: { origin: '*' }
  });

  // A basic matchmaking queue
  let waitingPlayer = null;

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('find_match', (data) => {
      if (waitingPlayer && waitingPlayer.id !== socket.id) {
        // Match found
        const roomId = `room_\${waitingPlayer.id}_\${socket.id}`;
        
        socket.join(roomId);
        waitingPlayer.join(roomId);
        
        // Notify both players
        io.to(roomId).emit('match_found', { 
          roomId, 
          whiteId: waitingPlayer.id, 
          blackId: socket.id 
        });
        
        waitingPlayer = null;
      } else {
        // Wait in queue
        waitingPlayer = socket;
        socket.emit('waiting_for_match');
      }
    });

    socket.on('make_move', (data) => {
      // data: { roomId, move }
      socket.to(data.roomId).emit('opponent_moved', data.move);
    });

    socket.on('disconnect', () => {
      if (waitingPlayer && waitingPlayer.id === socket.id) {
        waitingPlayer = null;
      }
      console.log('User disconnected:', socket.id);
    });
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:\${port} with WebSockets`);
  });
});
