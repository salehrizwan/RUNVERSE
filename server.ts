import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json());

// Enable CORS and permissive headers for iframe and cross-origin connections
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// --- In-Memory Room & Leaderboard State ---
interface ServerPlayer {
  id: string;
  name: string;
  characterId: string;
  ws?: WebSocket | null;
  isReady: boolean;
  isAlive: boolean;
  score: number;
  distance: number;
  lane: number;
  y: number;
  assignedColor: string;
  colorName: string;
  lastSeen: number;
}

interface ServerRoom {
  code: string;
  worldId: string;
  hostId: string;
  players: Record<string, ServerPlayer>;
  status: 'waiting' | 'countdown' | 'running' | 'completed';
  seed: number;
  createdAt: number;
  lastActivity: number;
}

const rooms: Map<string, ServerRoom> = new Map();
const highScores: any[] = [];

// Clean up stale rooms every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.lastActivity > 1000 * 60 * 30) {
      rooms.delete(code);
    }
  }
}, 1000 * 60 * 5);

function sanitizePlayer(p: ServerPlayer) {
  const { ws, ...rest } = p;
  return rest;
}

function sanitizeRoom(r: ServerRoom) {
  const players: Record<string, any> = {};
  for (const [id, p] of Object.entries(r.players)) {
    players[id] = sanitizePlayer(p);
  }
  return { ...r, players };
}

function broadcastToRoom(room: ServerRoom, msg: any, excludeWs?: WebSocket | null) {
  const data = JSON.stringify(msg);
  for (const p of Object.values(room.players)) {
    if (p.ws && p.ws.readyState === WebSocket.OPEN && p.ws !== excludeWs) {
      p.ws.send(data);
    }
  }
}

// --- REST API Endpoints (Direct Access & Fallback for environments where WS is restricted) ---

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'RUNVERSE Game Server',
    uptime: process.uptime(),
    activeRooms: rooms.size,
    timestamp: Date.now()
  });
});

// High Scores endpoints
app.get('/api/scores', (req, res) => {
  res.json(highScores.slice(0, 25));
});

app.post('/api/scores', (req, res) => {
  const { player1Name, player2Name, score1, score2, worldId } = req.body;
  if (!player1Name || score1 == null) {
    return res.status(400).json({ error: 'Invalid score payload' });
  }

  const record = {
    id: 'hs_' + Date.now(),
    player1Name: String(player1Name).substring(0, 20),
    player2Name: String(player2Name || 'Solo').substring(0, 20),
    score1: Number(score1) || 0,
    score2: Number(score2) || 0,
    combinedScore: (Number(score1) || 0) + (Number(score2) || 0),
    worldId: String(worldId || 'neon'),
    date: new Date().toISOString().split('T')[0]
  };

  highScores.push(record);
  highScores.sort((a, b) => b.combinedScore - a.combinedScore);
  res.json({ success: true, record });
});

// Create Room via HTTP
app.post('/api/rooms/create', (req, res) => {
  const { playerId, playerName, characterId, worldId } = req.body;
  if (!playerId) {
    return res.status(400).json({ error: 'Missing playerId' });
  }

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const now = Date.now();
  const hostPlayer: ServerPlayer = {
    id: playerId,
    name: playerName || 'Runner 1',
    characterId: characterId || 'cyber_dash',
    isReady: false,
    isAlive: true,
    score: 0,
    distance: 0,
    lane: 0,
    y: 0,
    assignedColor: '#06b6d4',
    colorName: 'Neon Cyan',
    lastSeen: now
  };

  const room: ServerRoom = {
    code,
    worldId: worldId || 'neon',
    hostId: playerId,
    players: { [playerId]: hostPlayer },
    status: 'waiting',
    seed: Math.floor(Math.random() * 1000000),
    createdAt: now,
    lastActivity: now
  };

  rooms.set(code, room);
  res.json({ success: true, room: sanitizeRoom(room) });
});

// Join Room via HTTP
app.post('/api/rooms/join', (req, res) => {
  const { code: rawCode, playerId, playerName, characterId } = req.body;
  const code = String(rawCode || '').toUpperCase().trim();
  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ error: 'Room not found. Check the 5-character code.' });
  }

  const playerCount = Object.keys(room.players).length;
  if (playerCount >= 2 && !room.players[playerId]) {
    return res.status(400).json({ error: 'Room is already full (maximum 2 players).' });
  }

  const now = Date.now();
  const joinerPlayer: ServerPlayer = {
    id: playerId,
    name: playerName || 'Runner 2',
    characterId: characterId || 'cyber_dash',
    isReady: false,
    isAlive: true,
    score: 0,
    distance: 0,
    lane: 0,
    y: 0,
    assignedColor: '#ec4899',
    colorName: 'Neon Pink',
    lastSeen: now
  };

  room.players[playerId] = joinerPlayer;
  room.lastActivity = now;

  broadcastToRoom(room, {
    action: 'PLAYER_JOINED',
    player: sanitizePlayer(joinerPlayer),
    room: sanitizeRoom(room)
  });

  res.json({ success: true, room: sanitizeRoom(room) });
});

// Toggle Ready via HTTP
app.post('/api/rooms/:code/ready', (req, res) => {
  const code = req.params.code.toUpperCase().trim();
  const { playerId, isReady } = req.body;
  const room = rooms.get(code);

  if (!room || !room.players[playerId]) {
    return res.status(404).json({ error: 'Player or room not found' });
  }

  room.players[playerId].isReady = !!isReady;
  room.lastActivity = Date.now();

  const plist = Object.values(room.players);
  if (plist.length === 2 && plist.every(p => p.isReady)) {
    room.status = 'countdown';
    broadcastToRoom(room, {
      action: 'SESSION_START',
      countdown: 3,
      room: sanitizeRoom(room)
    });
  } else {
    broadcastToRoom(room, {
      action: 'PLAYER_READY',
      playerId,
      isReady: !!isReady,
      room: sanitizeRoom(room)
    });
  }

  res.json({ success: true, room: sanitizeRoom(room) });
});

// Poll/Sync Room State via HTTP
app.get('/api/rooms/:code/poll', (req, res) => {
  const code = req.params.code.toUpperCase().trim();
  const playerId = String(req.query.playerId || '');
  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ error: 'Room expired or closed' });
  }

  if (playerId && room.players[playerId]) {
    room.players[playerId].lastSeen = Date.now();
    room.lastActivity = Date.now();
  }

  res.json({ success: true, room: sanitizeRoom(room) });
});

// Update Player Position / Telemetry via HTTP
app.post('/api/rooms/:code/update', (req, res) => {
  const code = req.params.code.toUpperCase().trim();
  const { playerId, state } = req.body;
  const room = rooms.get(code);

  if (!room || !room.players[playerId]) {
    return res.status(404).json({ error: 'Room or player not found' });
  }

  Object.assign(room.players[playerId], state);
  room.players[playerId].lastSeen = Date.now();
  room.lastActivity = Date.now();

  broadcastToRoom(room, {
    action: 'PLAYER_UPDATE',
    playerId,
    state
  });

  res.json({ success: true });
});

// Player Eliminated via HTTP
app.post('/api/rooms/:code/eliminate', (req, res) => {
  const code = req.params.code.toUpperCase().trim();
  const { playerId, finalScore, finalDistance } = req.body;
  const room = rooms.get(code);

  if (!room || !room.players[playerId]) {
    return res.status(404).json({ error: 'Room or player not found' });
  }

  room.players[playerId].isAlive = false;
  room.players[playerId].score = finalScore;
  room.players[playerId].distance = finalDistance;
  room.lastActivity = Date.now();

  broadcastToRoom(room, {
    action: 'PLAYER_ELIMINATED',
    playerId,
    finalScore,
    finalDistance
  });

  const plist = Object.values(room.players);
  if (plist.length >= 2 && plist.every(p => !p.isAlive)) {
    const combined = plist.reduce((sum, p) => sum + p.score, 0);
    room.status = 'completed';
    broadcastToRoom(room, {
      action: 'SESSION_COMPLETE',
      combinedScore: combined,
      room: sanitizeRoom(room)
    });
  }

  res.json({ success: true, room: sanitizeRoom(room) });
});

// Leave Room via HTTP
app.post('/api/rooms/:code/leave', (req, res) => {
  const code = req.params.code.toUpperCase().trim();
  const { playerId } = req.body;
  const room = rooms.get(code);

  if (room && playerId) {
    delete room.players[playerId];
    broadcastToRoom(room, {
      action: 'PLAYER_LEFT',
      playerId,
      message: 'Opponent has left the room.'
    });
    if (Object.keys(room.players).length === 0) {
      rooms.delete(code);
    }
  }

  res.json({ success: true });
});

// --- HTTP and WebSocket Server Creation ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  let boundPlayerId: string | null = null;
  let boundRoomCode: string | null = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      const now = Date.now();

      if (data.action === 'PING') {
        return ws.send(JSON.stringify({ action: 'PONG' }));
      }

      if (data.action === 'CREATE_ROOM') {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 5; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const hostPlayer: ServerPlayer = {
          id: data.playerId,
          name: data.playerName || 'Runner 1',
          characterId: data.characterId || 'cyber_dash',
          ws,
          isReady: false,
          isAlive: true,
          score: 0,
          distance: 0,
          lane: 0,
          y: 0,
          assignedColor: '#06b6d4',
          colorName: 'Neon Cyan',
          lastSeen: now
        };

        const room: ServerRoom = {
          code,
          worldId: data.worldId || 'neon',
          hostId: data.playerId,
          players: { [data.playerId]: hostPlayer },
          status: 'waiting',
          seed: Math.floor(Math.random() * 1000000),
          createdAt: now,
          lastActivity: now
        };

        rooms.set(code, room);
        boundPlayerId = data.playerId;
        boundRoomCode = code;

        ws.send(JSON.stringify({ action: 'ROOM_CREATED', room: sanitizeRoom(room) }));
      }

      if (data.action === 'JOIN_ROOM') {
        const code = String(data.code || '').toUpperCase().trim();
        const room = rooms.get(code);

        if (!room) {
          return ws.send(JSON.stringify({
            action: 'ERROR',
            message: 'Room not found. Check the 5-character code or create a new room.'
          }));
        }

        const playerCount = Object.keys(room.players).length;
        if (playerCount >= 2 && !room.players[data.playerId]) {
          return ws.send(JSON.stringify({
            action: 'ERROR',
            message: 'Room is already full (maximum 2 players).'
          }));
        }

        const joinerPlayer: ServerPlayer = {
          id: data.playerId,
          name: data.playerName || 'Runner 2',
          characterId: data.characterId || 'cyber_dash',
          ws,
          isReady: false,
          isAlive: true,
          score: 0,
          distance: 0,
          lane: 0,
          y: 0,
          assignedColor: '#ec4899',
          colorName: 'Neon Pink',
          lastSeen: now
        };

        room.players[data.playerId] = joinerPlayer;
        room.lastActivity = now;
        boundPlayerId = data.playerId;
        boundRoomCode = code;

        ws.send(JSON.stringify({
          action: 'ROOM_JOINED',
          room: sanitizeRoom(room)
        }));

        broadcastToRoom(room, {
          action: 'PLAYER_JOINED',
          player: sanitizePlayer(joinerPlayer),
          room: sanitizeRoom(room)
        });
      }

      if (data.action === 'PLAYER_READY' && boundRoomCode) {
        const room = rooms.get(boundRoomCode);
        if (room && room.players[data.playerId]) {
          room.players[data.playerId].isReady = !!data.isReady;
          room.lastActivity = now;

          broadcastToRoom(room, {
            action: 'PLAYER_READY',
            playerId: data.playerId,
            isReady: !!data.isReady,
            room: sanitizeRoom(room)
          });

          const plist = Object.values(room.players);
          if (plist.length === 2 && plist.every(p => p.isReady)) {
            room.status = 'countdown';
            broadcastToRoom(room, {
              action: 'SESSION_START',
              countdown: 3,
              room: sanitizeRoom(room)
            });
          }
        }
      }

      if (data.action === 'PLAYER_UPDATE' && boundRoomCode) {
        const room = rooms.get(boundRoomCode);
        if (room && room.players[data.playerId]) {
          Object.assign(room.players[data.playerId], data.state);
          room.players[data.playerId].lastSeen = now;
          room.lastActivity = now;

          broadcastToRoom(room, {
            action: 'PLAYER_UPDATE',
            playerId: data.playerId,
            state: data.state
          }, ws);
        }
      }

      if (data.action === 'PLAYER_ELIMINATED' && boundRoomCode) {
        const room = rooms.get(boundRoomCode);
        if (room && room.players[data.playerId]) {
          room.players[data.playerId].isAlive = false;
          room.players[data.playerId].score = data.finalScore;
          room.players[data.playerId].distance = data.finalDistance;
          room.lastActivity = now;

          broadcastToRoom(room, {
            action: 'PLAYER_ELIMINATED',
            playerId: data.playerId,
            finalScore: data.finalScore,
            finalDistance: data.finalDistance
          });

          const plist = Object.values(room.players);
          if (plist.length >= 2 && plist.every(p => !p.isAlive)) {
            const combined = plist.reduce((sum, p) => sum + p.score, 0);
            room.status = 'completed';
            broadcastToRoom(room, {
              action: 'SESSION_COMPLETE',
              combinedScore: combined,
              room: sanitizeRoom(room)
            });
          }
        }
      }

      if (data.action === 'LEAVE_ROOM' && boundRoomCode) {
        const room = rooms.get(boundRoomCode);
        if (room) {
          delete room.players[data.playerId];
          broadcastToRoom(room, {
            action: 'PLAYER_LEFT',
            playerId: data.playerId,
            message: 'Opponent has left the room.'
          });
          if (Object.keys(room.players).length === 0) {
            rooms.delete(boundRoomCode);
          }
        }
        boundRoomCode = null;
      }
    } catch (e) {
      console.error('WS Error:', e);
    }
  });

  ws.on('close', () => {
    if (boundRoomCode && boundPlayerId) {
      const room = rooms.get(boundRoomCode);
      if (room) {
        delete room.players[boundPlayerId];
        broadcastToRoom(room, {
          action: 'PLAYER_LEFT',
          playerId: boundPlayerId,
          message: 'Opponent disconnected from server.'
        });
        if (Object.keys(room.players).length === 0) {
          rooms.delete(boundRoomCode);
        }
      }
    }
  });
});

// --- Vite Middleware in Dev or Static File Serving in Production ---
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`RUNVERSE Full-Stack Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
