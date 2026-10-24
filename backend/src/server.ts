import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
app.use(express.json());

// Enable CORS for external frontend deployment
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const PORT = process.env.PORT || 3001;

interface ServerPlayer {
  id: string;
  name: string;
  characterId: string;
  ws: WebSocket;
  isReady: boolean;
  isAlive: boolean;
  score: number;
  distance: number;
  lane: number;
  y: number;
  assignedColor: string;
  colorName: string;
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
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

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

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

function broadcastToRoom(room: ServerRoom, msg: any, excludeWs?: WebSocket) {
  const data = JSON.stringify(msg);
  for (const p of Object.values(room.players)) {
    if (p.ws && p.ws.readyState === WebSocket.OPEN && p.ws !== excludeWs) {
      p.ws.send(data);
    }
  }
}

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
          colorName: 'Neon Cyan'
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
          colorName: 'Neon Pink'
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

          // Check if both players ready
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

          // Check if all players dead
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

server.listen(PORT, () => {
  console.log(`RUNVERSE Dedicated Game Server listening on port ${PORT}`);
});
