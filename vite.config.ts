import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';

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

function multiplayerWsPlugin(): Plugin {
  return {
    name: 'multiplayer-ws-plugin',
    configureServer(server) {
      if (!server.httpServer) return;
      const wss = new WebSocketServer({ noServer: true });
      const rooms = new Map<string, ServerRoom>();

      // Clean stale rooms
      setInterval(() => {
        const now = Date.now();
        for (const [code, room] of rooms.entries()) {
          if (now - room.lastActivity > 1000 * 60 * 30) {
            rooms.delete(code);
          }
        }
      }, 1000 * 60 * 5);

      server.httpServer.on('upgrade', (req, socket, head) => {
        if (req.url === '/ws') {
          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
          });
        }
      });

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

              ws.send(JSON.stringify({
                action: 'ROOM_CREATED',
                room: sanitizeRoom(room)
              }));
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

              // Assign contrasting color for Player 2
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

              // Send confirmation to joiner
              ws.send(JSON.stringify({
                action: 'ROOM_JOINED',
                room: sanitizeRoom(room)
              }));

              // Broadcast update to room
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

                // Relay state to opponent with zero delay
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

                // Check if both players eliminated
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
          } catch (err) {
            console.error('Server WS Error:', err);
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
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), multiplayerWsPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
