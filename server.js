const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ── Message queue ──
let queue = [];
let isPlaying = false;
let playTimeout = null;

// Broadcast to all connected clients
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// Play next message in queue
function playNext() {
  if (queue.length === 0) {
    isPlaying = false;
    broadcast({ type: 'idle' });
    return;
  }

  isPlaying = true;
  const message = queue.shift();

  // Tell everyone: show this message + update queue positions
  broadcast({ type: 'show', text: message.text });

  // Notify each client of their updated queue position
  notifyQueuePositions();

  // After 5 seconds, move to next
  playTimeout = setTimeout(() => {
    broadcast({ type: 'hide' });
    setTimeout(() => playNext(), 400); // wait for exit animation
  }, 5000);
}

// Notify each client of their position in queue
function notifyQueuePositions() {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.queueId) {
      const position = queue.findIndex(m => m.id === client.queueId);
      if (position >= 0) {
        client.send(JSON.stringify({ 
          type: 'queue_position', 
          position: position + 1 
        }));
      } else {
        client.queueId = null;
        client.send(JSON.stringify({ 
          type: 'queue_position', 
          position: -1 
        }));
      }
    }
  });
}

// ── WebSocket connections ──
wss.on('connection', (ws) => {
  // Send current state to new client
  if (isPlaying) {
    ws.send(JSON.stringify({ type: 'status', playing: true, queueLength: queue.length }));
  } else {
    ws.send(JSON.stringify({ type: 'idle' }));
  }

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      if (msg.type === 'submit' && msg.text) {
        const text = msg.text.trim().slice(0, 20);
        if (!text) return;

        const id = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        queue.push({ text, id });

        // Track this client's message
        ws.queueId = id;

        // Tell this client their position
        const position = queue.findIndex(m => m.id === id) + 1;
        ws.send(JSON.stringify({ type: 'queue_position', position }));

        // Start playing if not already
        if (!isPlaying) playNext();
      }
    } catch (e) {
      // ignore bad messages
    }
  });

  ws.on('close', () => {
    // Remove this client's pending messages from queue
    if (ws.queueId) {
      queue = queue.filter(m => m.id !== ws.queueId);
    }
  });
});

// ── Start server ──
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Holler server running on port ${PORT}`);
});
