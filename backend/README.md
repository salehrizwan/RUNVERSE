# RUNVERSE Real-Time Multiplayer Backend Server

This backend powers the real-time two-player online endless runner rooms, room-code validation, synchronized random seed tracks, independent player elimination, state relay, and combined Friends High Scores.

## Features
- **Express HTTP API**: Health check (`/api/health`), High Scores storage (`/api/scores`), and CORS headers enabled.
- **WebSocket Protocol**: `/ws` path for sub-15ms player state relays (lane, y, z / distance, score, isJumping, isSliding, isAlive, assigned colors).
- **Independent Elimination**: When Player A crashes, Player B continues running normally until they crash.
- **Synchronized Race Seed**: Host generates a random seed so both players on separate computers run on the exact same obstacles and coin locations!
- **Assigned Distinct Colors**:
  - Player 1 (Host): Neon Cyan (`#06b6d4`)
  - Player 2 (Guest): Neon Pink (`#ec4899`) or Solar Gold (`#f59e0b`)

## Local Development
```bash
# In the project root:
npm run dev

# Or run the backend independently:
npx tsx backend/src/server.ts
```

## Free Cloud Deployment (Render / Railway / Fly.io)

### Option 1: Render.com (Free Web Service)
1. Create a new **Web Service** pointing to your repository.
2. Runtime: **Node**.
3. Build Command: `npm install`
4. Start Command: `npx tsx backend/src/server.ts`
5. Environment Variables:
   - `PORT`: `10000` (or leave default, Render sets this automatically)
6. Copy the provided URL (e.g. `https://runverse-server.onrender.com`).
7. In your RUNVERSE frontend:
   - Set `VITE_WS_URL=wss://runverse-server.onrender.com/ws` in `.env`
   - Or open **Play With Friends** > **Server Config** in the game UI and paste `wss://runverse-server.onrender.com/ws`!

### Option 2: Railway.app (Free Tier)
1. New Project > Deploy from GitHub Repo.
2. Start Command: `npx tsx backend/src/server.ts`
3. Generate Domain under Service Settings.
4. Set `VITE_WS_URL=wss://<railway-domain>/ws`.
