import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';

function multiplayerWsPlugin(): Plugin {
  return {
    name: 'multiplayer-ws-plugin',
    configureServer(server) {
      if (!server.httpServer) return;
      const wss = new WebSocketServer({ noServer: true });

      server.httpServer.on('upgrade', (req, socket, head) => {
        if (req.url === '/ws') {
          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
          });
        }
      });

      wss.on('connection', (socket) => {
        socket.on('message', (data) => {
          const raw = data.toString();
          wss.clients.forEach((client) => {
            if (client !== socket && client.readyState === WebSocket.OPEN) {
              client.send(raw);
            }
          });
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
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
