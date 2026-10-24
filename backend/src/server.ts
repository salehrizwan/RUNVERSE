import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

interface Player {
  id: string;
  name: string;
  characterId: string;
  ws?: WebSocket;
  isReady: boolean;
  isAlive: boolean;
  score: number;
  distance: number;
  lane: number;
  y: number;
}

interface Room {
  code: string;
  worldId: string;
  hostId: string;
  players: Record<string, Player>;
  status: 'waiting' | 'countdown' | 'running' | 'completed';
  seed: number;
  createdAt: number;
  lastActivity: number;
}

const rooms: Map<string, Room> = new Map();
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

wss.on('connection', (ws) => {
  let boundPlayerId: string | null = null;
  let boundRoomCode: string | null = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      const now = Date.now();

      if (data.action === 'CREATE_ROOM') {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 5; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const room: Room = {
          code,
          worldId: data.worldId || 'neon',
          hostId: data.playerId,
          players: {
            [data.playerId]: {
              id: data.playerId,
              name: data.playerName,
              characterId: data.characterId,
              ws,
              isReady: false,
              isAlive: true,
              score: 0,
              distance: 0,
              lane: 0,
              y: 0
            }
          },
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
        const code = String(data.code).toUpperCase().trim();
        const room = rooms.get(code);

        if (!room) {
          return ws.send(JSON.stringify({ action: 'ERROR', message: 'Room not found' }));
        }

        if (Object.keys(room.players).length >= 2 && !room.players[data.playerId]) {
          return ws.send(JSON.stringify({ action: 'ERROR', message: 'Room is full' }));
        }

        const player: Player = {
          id: data.playerId,
          name: data.playerName,
          characterId: data.characterId,
          ws,
          isReady: false,
          isAlive: true,
          score: 0,
          distance: 0,
          lane: 0,
          y: 0
        };

        room.players[data.playerId] = player;
        room.lastActivity = now;
        boundPlayerId = data.playerId;
        boundRoomCode = code;

        broadcastToRoom(room, {
          action: 'PLAYER_JOINED',
          player: sanitizePlayer(player),
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
          broadcastToRoom(room, {
            action: 'PLAYER_UPDATE',
            playerId: data.playerId,
            state: data.state
          }, ws); // Skip sender for efficiency
        }
      }

      if (data.action === 'PLAYER_ELIMINATED' && boundRoomCode) {
        const room = rooms.get(boundRoomCode);
        if (room && room.players[data.playerId]) {
          room.players[data.playerId].isAlive = false;
          room.players[data.playerId].score = data.finalScore;
          room.players[data.playerId].distance = data.finalDistance;

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
          message: 'Opponent disconnected'
        });
        if (Object.keys(room.players).length === 0) {
          rooms.delete(boundRoomCode);
        }
      }
    }
  });
});

function sanitizePlayer(p: Player) {
  const { ws, ...rest } = p;
  return rest;
}

function sanitizeRoom(r: Room) {
  const players: Record<string, any> = {};
  for (const [id, p] of Object.entries(r.players)) {
    players[id] = sanitizePlayer(p);
  }
  return { ...r, players };
}

function broadcastToRoom(room: Room, msg: any, excludeWs?: WebSocket) {
  const data = JSON.stringify(msg);
  for (const p of Object.values(room.players)) {
    if (p.ws && p.ws.readyState === WebSocket.OPEN && p.ws !== excludeWs) {
      p.ws.send(data);
    }
  }
}

server.listen(PORT, () => {
  console.log(`RUNVERSE Game Server running on port ${PORT}`);
});
