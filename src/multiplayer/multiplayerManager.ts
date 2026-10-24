/**
 * RUNVERSE Real-Time Multiplayer Manager
 * Supports WebSockets & BroadcastChannel for seamless 2-player co-op running
 * across tabs, windows, and remote devices.
 */

import { MultiplayerRoom, MultiplayerPlayerState, WorldId, CharacterId } from '../types/game';

export type MultiplayerEvent =
  | { type: 'ROOM_CREATED'; room: MultiplayerRoom }
  | { type: 'PLAYER_JOINED'; room: MultiplayerRoom; player: MultiplayerPlayerState }
  | { type: 'PLAYER_READY'; room: MultiplayerRoom; playerId: string; isReady: boolean }
  | { type: 'SESSION_START'; room: MultiplayerRoom; countdown: number }
  | { type: 'PLAYER_UPDATE'; playerId: string; state: Partial<MultiplayerPlayerState> }
  | { type: 'PLAYER_ELIMINATED'; playerId: string; finalScore: number; finalDistance: number }
  | { type: 'SESSION_COMPLETE'; room: MultiplayerRoom; combinedScore: number }
  | { type: 'PLAYER_LEFT'; playerId: string; message: string };

export class MultiplayerManager {
  private localPlayerId: string;
  private playerName: string;
  private characterId: CharacterId;
  private currentRoom: MultiplayerRoom | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private ws: WebSocket | null = null;
  private listeners: ((event: MultiplayerEvent) => void)[] = [];

  constructor(playerName: string, characterId: CharacterId) {
    this.localPlayerId = 'p_' + Math.random().toString(36).substring(2, 9);
    this.playerName = playerName;
    this.characterId = characterId;

    this.initBroadcastChannel();
    this.initWebSocket();
  }

  public updateProfile(name: string, characterId: CharacterId): void {
    this.playerName = name;
    this.characterId = characterId;
  }

  public getPlayerId(): string {
    return this.localPlayerId;
  }

  public getCurrentRoom(): MultiplayerRoom | null {
    return this.currentRoom;
  }

  private initBroadcastChannel(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('runverse_mp_network');
        this.broadcastChannel.onmessage = (e) => {
          this.handleIncomingMessage(e.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported', err);
      }
    }
  }

  private initWebSocket(): void {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch {}
      };

      this.ws.onerror = () => {
        // BroadcastChannel provides instantaneous local/cross-tab multiplayer fallback
      };
    } catch {
      // WS unavailable, fallback to BroadcastChannel
    }
  }

  private postMessage(msg: any): void {
    // Send via WebSocket if open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
    // Also broadcast locally across browser windows
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(msg);
    }
  }

  public onEvent(callback: (event: MultiplayerEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private dispatch(event: MultiplayerEvent): void {
    this.listeners.forEach(l => l(event));
  }

  public createRoom(worldId: WorldId): string {
    // Generate clean 5-character alphanumeric room code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const hostState: MultiplayerPlayerState = {
      id: this.localPlayerId,
      name: this.playerName,
      characterId: this.characterId,
      lane: 0,
      y: 0,
      isSliding: false,
      isJumping: false,
      distance: 0,
      score: 0,
      isAlive: true,
      isReady: false
    };

    const room: MultiplayerRoom = {
      code,
      worldId,
      hostId: this.localPlayerId,
      players: {
        [this.localPlayerId]: hostState
      },
      status: 'waiting',
      seed: Math.floor(Math.random() * 1000000),
      createdAt: Date.now()
    };

    this.currentRoom = room;

    // Save to shared localStorage so cross-tab joiners find it immediately
    localStorage.setItem(`runverse_room_${code}`, JSON.stringify(room));

    this.postMessage({
      action: 'ROOM_CREATED',
      room
    });

    this.dispatch({ type: 'ROOM_CREATED', room });
    return code;
  }

  public joinRoom(roomCode: string): { success: boolean; message: string } {
    const code = roomCode.trim().toUpperCase();
    
    // Check localStorage room registry
    let room: MultiplayerRoom | null = null;
    try {
      const raw = localStorage.getItem(`runverse_room_${code}`);
      if (raw) {
        room = JSON.parse(raw);
      }
    } catch {}

    if (!room) {
      // Request room lookup across network
      this.postMessage({
        action: 'QUERY_ROOM',
        code,
        requesterId: this.localPlayerId
      });
      return { success: false, message: 'Room not found. Check code or create a new room.' };
    }

    const playerCount = Object.keys(room.players).length;
    if (playerCount >= 2 && !room.players[this.localPlayerId]) {
      return { success: false, message: 'Room is already full (max 2 players).' };
    }

    const joinerState: MultiplayerPlayerState = {
      id: this.localPlayerId,
      name: this.playerName,
      characterId: this.characterId,
      lane: 0,
      y: 0,
      isSliding: false,
      isJumping: false,
      distance: 0,
      score: 0,
      isAlive: true,
      isReady: false
    };

    room.players[this.localPlayerId] = joinerState;
    this.currentRoom = room;
    localStorage.setItem(`runverse_room_${code}`, JSON.stringify(room));

    this.postMessage({
      action: 'PLAYER_JOINED',
      code,
      player: joinerState,
      room
    });

    this.dispatch({ type: 'PLAYER_JOINED', room, player: joinerState });
    return { success: true, message: 'Successfully joined room!' };
  }

  public toggleReady(): boolean {
    if (!this.currentRoom) return false;
    const player = this.currentRoom.players[this.localPlayerId];
    if (!player) return false;

    player.isReady = !player.isReady;
    localStorage.setItem(`runverse_room_${this.currentRoom.code}`, JSON.stringify(this.currentRoom));

    this.postMessage({
      action: 'PLAYER_READY',
      code: this.currentRoom.code,
      playerId: this.localPlayerId,
      isReady: player.isReady,
      room: this.currentRoom
    });

    this.dispatch({
      type: 'PLAYER_READY',
      room: this.currentRoom,
      playerId: this.localPlayerId,
      isReady: player.isReady
    });

    // Check if both players are ready
    const players = Object.values(this.currentRoom.players);
    if (players.length === 2 && players.every(p => p.isReady)) {
      this.startCountdown();
    }

    return player.isReady;
  }

  private startCountdown(): void {
    if (!this.currentRoom) return;
    this.currentRoom.status = 'countdown';
    localStorage.setItem(`runverse_room_${this.currentRoom.code}`, JSON.stringify(this.currentRoom));

    this.postMessage({
      action: 'SESSION_START',
      code: this.currentRoom.code,
      countdown: 3,
      room: this.currentRoom
    });

    this.dispatch({
      type: 'SESSION_START',
      room: this.currentRoom,
      countdown: 3
    });
  }

  public sendStateUpdate(state: Partial<MultiplayerPlayerState>): void {
    if (!this.currentRoom) return;
    const player = this.currentRoom.players[this.localPlayerId];
    if (player) {
      Object.assign(player, state);
    }

    this.postMessage({
      action: 'PLAYER_UPDATE',
      code: this.currentRoom.code,
      playerId: this.localPlayerId,
      state
    });
  }

  public sendElimination(finalScore: number, finalDistance: number): void {
    if (!this.currentRoom) return;
    const player = this.currentRoom.players[this.localPlayerId];
    if (player) {
      player.isAlive = false;
      player.score = finalScore;
      player.distance = finalDistance;
    }

    this.postMessage({
      action: 'PLAYER_ELIMINATED',
      code: this.currentRoom.code,
      playerId: this.localPlayerId,
      finalScore,
      finalDistance
    });

    this.dispatch({
      type: 'PLAYER_ELIMINATED',
      playerId: this.localPlayerId,
      finalScore,
      finalDistance
    });

    this.checkSessionCompletion();
  }

  private checkSessionCompletion(): void {
    if (!this.currentRoom) return;
    const players = Object.values(this.currentRoom.players);
    // If all players are eliminated, calculate combined score!
    if (players.length >= 2 && players.every(p => !p.isAlive)) {
      const combined = players.reduce((sum, p) => sum + p.score, 0);
      this.currentRoom.status = 'completed';

      this.postMessage({
        action: 'SESSION_COMPLETE',
        code: this.currentRoom.code,
        combinedScore: combined,
        room: this.currentRoom
      });

      this.dispatch({
        type: 'SESSION_COMPLETE',
        room: this.currentRoom,
        combinedScore: combined
      });
    }
  }

  public leaveRoom(): void {
    if (!this.currentRoom) return;
    const code = this.currentRoom.code;

    this.postMessage({
      action: 'PLAYER_LEFT',
      code,
      playerId: this.localPlayerId,
      message: `${this.playerName} has left the session.`
    });

    localStorage.removeItem(`runverse_room_${code}`);
    this.currentRoom = null;
  }

  private handleIncomingMessage(data: any): void {
    if (!data || !data.action) return;

    if (data.action === 'QUERY_ROOM' && this.currentRoom && this.currentRoom.code === data.code) {
      // Respond to room lookup
      this.postMessage({
        action: 'ROOM_ANNOUNCE',
        room: this.currentRoom
      });
    }

    if (data.action === 'ROOM_ANNOUNCE' && data.room) {
      localStorage.setItem(`runverse_room_${data.room.code}`, JSON.stringify(data.room));
    }

    if (this.currentRoom && data.code === this.currentRoom.code) {
      if (data.action === 'PLAYER_JOINED' && data.player.id !== this.localPlayerId) {
        this.currentRoom.players[data.player.id] = data.player;
        this.dispatch({ type: 'PLAYER_JOINED', room: this.currentRoom, player: data.player });
      }

      if (data.action === 'PLAYER_READY') {
        if (this.currentRoom.players[data.playerId]) {
          this.currentRoom.players[data.playerId].isReady = data.isReady;
        }
        this.dispatch({
          type: 'PLAYER_READY',
          room: this.currentRoom,
          playerId: data.playerId,
          isReady: data.isReady
        });
      }

      if (data.action === 'SESSION_START') {
        this.currentRoom.status = 'countdown';
        this.dispatch({
          type: 'SESSION_START',
          room: this.currentRoom,
          countdown: data.countdown
        });
      }

      if (data.action === 'PLAYER_UPDATE' && data.playerId !== this.localPlayerId) {
        if (this.currentRoom.players[data.playerId]) {
          Object.assign(this.currentRoom.players[data.playerId], data.state);
        }
        this.dispatch({
          type: 'PLAYER_UPDATE',
          playerId: data.playerId,
          state: data.state
        });
      }

      if (data.action === 'PLAYER_ELIMINATED' && data.playerId !== this.localPlayerId) {
        if (this.currentRoom.players[data.playerId]) {
          this.currentRoom.players[data.playerId].isAlive = false;
          this.currentRoom.players[data.playerId].score = data.finalScore;
          this.currentRoom.players[data.playerId].distance = data.finalDistance;
        }
        this.dispatch({
          type: 'PLAYER_ELIMINATED',
          playerId: data.playerId,
          finalScore: data.finalScore,
          finalDistance: data.finalDistance
        });
        this.checkSessionCompletion();
      }

      if (data.action === 'SESSION_COMPLETE') {
        this.currentRoom.status = 'completed';
        this.dispatch({
          type: 'SESSION_COMPLETE',
          room: this.currentRoom,
          combinedScore: data.combinedScore
        });
      }

      if (data.action === 'PLAYER_LEFT' && data.playerId !== this.localPlayerId) {
        delete this.currentRoom.players[data.playerId];
        this.dispatch({
          type: 'PLAYER_LEFT',
          playerId: data.playerId,
          message: data.message
        });
      }
    }
  }

  public getOpponent(): MultiplayerPlayerState | null {
    if (!this.currentRoom) return null;
    const opponent = Object.values(this.currentRoom.players).find(p => p.id !== this.localPlayerId);
    return opponent || null;
  }
}
