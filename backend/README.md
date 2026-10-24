# RUNVERSE Multiplayer Backend Server

This backend powers the real-time two-player synchronized endless runner rooms, room-code validation, independent player elimination, state relay, and combined Friends High Scores.

## Features
- **Express HTTP API**: Health checks (`/api/health`), High Scores storage (`/api/scores`).
- **WebSocket Protocol**: `/ws` path for sub-15ms player state updates (lane, y, jump, slide, score, distance).
- **Independent Elimination**: When Player A crashes, Player B continues running until they crash.
- **Room Lifecycle**: 5-character alphanumeric room codes with automatic stale room garbage collection.
- **Fair Play**: Generates synchronized random seeds so both runners see the exact same obstacle distribution.

## Running Locally
```bash
npm run dev
# Or run standalone backend:
npx tsx backend/src/server.ts
```

## Free Cloud Deployment
You can deploy this server for free on platforms like Render, Railway, Fly.io, or Glitch:
1. Set the start command to: `npx tsx backend/src/server.ts`
2. Expose port `PORT` (defaults to 3001 or environment variable `PORT`).
3. Point your static frontend client to your deployed WebSocket URL.
