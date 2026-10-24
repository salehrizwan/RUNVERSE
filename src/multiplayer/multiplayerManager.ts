/**
 * RUNVERSE Real-Time Online Multiplayer Client
 * Handles real WebSocket server connections with seamless HTTP REST sync fallback,
 * room codes, player states, lag-compensated player synchronization, and reconnection.
 */

import { MultiplayerRoom, MultiplayerPlayerState, WorldId, CharacterId, ConnectionStatus } from '../types/game';

export type MultiplayerEvent =
  | { type: 'CONNECTION_STATUS'; status: ConnectionStatus; message?: string }
  | { type: 'ROOM_CREATED'; room: MultiplayerRoom }
  | { type: 'ROOM_JOINED'; room: MultiplayerRoom }
  | { type: 'PLAYER_JOINED'; room: MultiplayerRoom; player: MultiplayerPlayerState }
  | { type: 'PLAYER_READY'; room: MultiplayerRoom; playerId: string; isReady: boolean }
  | { type: 'SESSION_START'; room: MultiplayerRoom; countdown: number }
  | { type: 'PLAYER_UPDATE'; playerId: string; state: Partial<MultiplayerPlayerState> }
  | { type: 'PLAYER_ELIMINATED'; playerId: string; finalScore: number; finalDistance: number }
  | { type: 'SESSION_COMPLETE'; room: MultiplayerRoom; combinedScore: number }
  | { type: 'PLAYER_LEFT'; playerId: string; message: string }
  | { type: 'ERROR'; message: string };

export class MultiplayerManager {
  private localPlayerId: string;
  private playerName: string;
  private characterId: CharacterId;
  private currentRoom: MultiplayerRoom | null = null;
  private ws: WebSocket | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private connectionMode: 'ws' | 'http' = 'ws';
  private customServerUrl: string = '';
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private pingInterval: number | null = null;
  private pollInterval: number | null = null;
  private listeners: ((event: MultiplayerEvent) => void)[] = [];
  private lastKnownOpponentState: Partial<MultiplayerPlayerState> | null = null;

  constructor(playerName: string, characterId: CharacterId) {
    this.localPlayerId = 'p_' + Math.random().toString(36).substring(2, 9);
    this.playerName = playerName;
    this.characterId = characterId;

    try {
      this.customServerUrl = localStorage.getItem('runverse_custom_ws_url') || '';
    } catch {}

    this.connect();
  }

  public getPlayerId(): string {
    return this.localPlayerId;
  }

  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  public getConnectionMode(): 'ws' | 'http' {
    return this.connectionMode;
  }

  public getCurrentRoom(): MultiplayerRoom | null {
    return this.currentRoom;
  }

  public getAssignedColor(): string {
    if (!this.currentRoom) return '#06b6d4';
    const player = this.currentRoom.players[this.localPlayerId];
    return player?.assignedColor || '#06b6d4';
  }

  public getOpponent(): MultiplayerPlayerState | null {
    if (!this.currentRoom) return null;
    const opponent = Object.values(this.currentRoom.players).find(p => p.id !== this.localPlayerId);
    return opponent || null;
  }

  public updateProfile(name: string, characterId: CharacterId): void {
    this.playerName = name;
    this.characterId = characterId;
  }

  public setCustomServerUrl(url: string): void {
    this.customServerUrl = url.trim();
    try {
      localStorage.setItem('runverse_custom_ws_url', this.customServerUrl);
    } catch {}
    this.reconnect();
  }

  public getCustomServerUrl(): string {
    return this.customServerUrl;
  }

  private resolveWebSocketUrl(): string {
    // 1. User configured custom server URL
    if (this.customServerUrl) {
      let url = this.customServerUrl;
      if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
        url = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + url;
      }
      return url;
    }

    // 2. Vite environment variable if provided
    const envWsUrl = import.meta.env.VITE_WS_URL;
    if (envWsUrl) {
      return envWsUrl;
    }

    // 3. Current origin WebSocket endpoint
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setConnectionStatus('connecting', 'Connecting to game server...');
    const url = this.resolveWebSocketUrl();

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.connectionMode = 'ws';
        this.setConnectionStatus('connected', 'Connected via WebSocket');
        this.startHeartbeat();
        this.stopPolling();

        if (this.currentRoom) {
          this.send({
            action: 'GET_ROOM',
            code: this.currentRoom.code,
            playerId: this.localPlayerId
          });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleServerMessage(data);
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        // Fall back to checking HTTP server availability
        this.tryHttpFallback();
      };

      this.ws.onerror = () => {
        this.stopHeartbeat();
        this.tryHttpFallback();
      };
    } catch (e: any) {
      this.tryHttpFallback();
    }
  }

  private async tryHttpFallback(): Promise<void> {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        this.connectionMode = 'http';
        this.setConnectionStatus('connected', 'Connected (HTTP Real-Time Sync)');
        this.startPolling();
        return;
      }
    } catch {}

    this.setConnectionStatus('error', 'Unable to reach game server. Check network or server URL.');
    this.scheduleReconnect();
  }

  public reconnect(): void {
    this.stopPolling();
    this.stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.reconnectAttempts = 0;
    this.connect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    if (this.reconnectAttempts >= 8) {
      this.setConnectionStatus('error', 'Connection failed. Please check server URL or network.');
      return;
    }

    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 8000);
    this.reconnectAttempts++;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = window.setInterval(() => {
      this.send({ action: 'PING' });
    }, 12000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private startPolling(): void {
    this.stopPolling();
    // Fast polling when in active room
    this.pollInterval = window.setInterval(() => {
      this.pollRoomState();
    }, 200);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async pollRoomState(): Promise<void> {
    if (!this.currentRoom) return;

    try {
      const res = await fetch(`/api/rooms/${this.currentRoom.code}/poll?playerId=${this.localPlayerId}`);
      if (!res.ok) {
        if (res.status === 404) {
          this.currentRoom = null;
          this.dispatch({ type: 'ERROR', message: 'Room has expired or was closed.' });
        }
        return;
      }

      const data = await res.json();
      if (data && data.room) {
        const prevRoom = this.currentRoom;
        const newRoom: MultiplayerRoom = data.room;
        this.currentRoom = newRoom;

        // Check for opponent joining
        const newOpponent = Object.values(newRoom.players).find(p => p.id !== this.localPlayerId);
        const prevOpponent = prevRoom ? Object.values(prevRoom.players).find(p => p.id !== this.localPlayerId) : null;

        if (newOpponent && !prevOpponent) {
          this.dispatch({ type: 'PLAYER_JOINED', room: newRoom, player: newOpponent });
        }

        // Check for opponent ready state change
        if (newOpponent && prevOpponent && newOpponent.isReady !== prevOpponent.isReady) {
          this.dispatch({
            type: 'PLAYER_READY',
            room: newRoom,
            playerId: newOpponent.id,
            isReady: newOpponent.isReady
          });
        }

        // Check for session start
        if (newRoom.status === 'countdown' && prevRoom.status !== 'countdown') {
          this.dispatch({ type: 'SESSION_START', room: newRoom, countdown: 3 });
        }

        // Check for session completion
        if (newRoom.status === 'completed' && prevRoom.status !== 'completed') {
          const combined = Object.values(newRoom.players).reduce((sum, p) => sum + (p.score || 0), 0);
          this.dispatch({ type: 'SESSION_COMPLETE', room: newRoom, combinedScore: combined });
        }

        // Update opponent state
        if (newOpponent) {
          this.dispatch({
            type: 'PLAYER_UPDATE',
            playerId: newOpponent.id,
            state: {
              lane: newOpponent.lane,
              y: newOpponent.y,
              distance: newOpponent.distance,
              score: newOpponent.score,
              isJumping: newOpponent.isJumping,
              isSliding: newOpponent.isSliding,
              isGliding: newOpponent.isGliding,
              hoverboard: newOpponent.hoverboard,
              isAlive: newOpponent.isAlive
            }
          });

          if (!newOpponent.isAlive && prevOpponent && prevOpponent.isAlive) {
            this.dispatch({
              type: 'PLAYER_ELIMINATED',
              playerId: newOpponent.id,
              finalScore: newOpponent.score,
              finalDistance: newOpponent.distance
            });
          }
        }
      }
    } catch {}
  }

  private setConnectionStatus(status: ConnectionStatus, message?: string): void {
    this.connectionStatus = status;
    this.dispatch({ type: 'CONNECTION_STATUS', status, message });
  }

  private send(msg: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
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

  // --- Real-time Online Room Actions ---

  public async createRoom(worldId: WorldId): Promise<void> {
    if (this.connectionStatus !== 'connected') {
      this.dispatch({
        type: 'ERROR',
        message: 'Cannot create room: not connected to server. Attempting connection...'
      });
      this.connect();
      return;
    }

    if (this.connectionMode === 'ws' && this.send({
      action: 'CREATE_ROOM',
      playerId: this.localPlayerId,
      playerName: this.playerName,
      characterId: this.characterId,
      worldId
    })) {
      return;
    }

    // HTTP fallback
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.localPlayerId,
          playerName: this.playerName,
          characterId: this.characterId,
          worldId
        })
      });

      if (!res.ok) {
        throw new Error('Failed to create room via server API');
      }

      const data = await res.json();
      if (data.room) {
        this.currentRoom = data.room;
        this.startPolling();
        this.dispatch({ type: 'ROOM_CREATED', room: data.room });
      }
    } catch (e: any) {
      this.dispatch({ type: 'ERROR', message: e.message || 'Error creating room' });
    }
  }

  public async joinRoom(roomCode: string): Promise<void> {
    const code = roomCode.trim().toUpperCase();
    if (!code || code.length !== 5) {
      this.dispatch({ type: 'ERROR', message: 'Room code must be exactly 5 characters.' });
      return;
    }

    if (this.connectionStatus !== 'connected') {
      this.dispatch({
        type: 'ERROR',
        message: 'Cannot join room: not connected to server. Attempting connection...'
      });
      this.connect();
      return;
    }

    if (this.connectionMode === 'ws' && this.send({
      action: 'JOIN_ROOM',
      code,
      playerId: this.localPlayerId,
      playerName: this.playerName,
      characterId: this.characterId
    })) {
      return;
    }

    // HTTP fallback
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          playerId: this.localPlayerId,
          playerName: this.playerName,
          characterId: this.characterId
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to join room');
      }

      const data = await res.json();
      if (data.room) {
        this.currentRoom = data.room;
        this.startPolling();
        this.dispatch({ type: 'ROOM_JOINED', room: data.room });
      }
    } catch (e: any) {
      this.dispatch({ type: 'ERROR', message: e.message || 'Error joining room' });
    }
  }

  public async toggleReady(): Promise<boolean> {
    if (!this.currentRoom) return false;
    const player = this.currentRoom.players[this.localPlayerId];
    if (!player) return false;

    const nextReady = !player.isReady;
    player.isReady = nextReady;

    if (this.connectionMode === 'ws') {
      this.send({
        action: 'PLAYER_READY',
        code: this.currentRoom.code,
        playerId: this.localPlayerId,
        isReady: nextReady
      });
    } else {
      try {
        await fetch(`/api/rooms/${this.currentRoom.code}/ready`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: this.localPlayerId,
            isReady: nextReady
          })
        });
        this.pollRoomState();
      } catch {}
    }

    return nextReady;
  }

  public sendStateUpdate(state: Partial<MultiplayerPlayerState>): void {
    if (!this.currentRoom) return;
    const player = this.currentRoom.players[this.localPlayerId];
    if (player) {
      Object.assign(player, state);
    }

    if (this.connectionMode === 'ws') {
      this.send({
        action: 'PLAYER_UPDATE',
        code: this.currentRoom.code,
        playerId: this.localPlayerId,
        state
      });
    } else {
      // Fire-and-forget HTTP update
      fetch(`/api/rooms/${this.currentRoom.code}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.localPlayerId,
          state
        })
      }).catch(() => {});
    }
  }

  public sendElimination(finalScore: number, finalDistance: number): void {
    if (!this.currentRoom) return;
    const player = this.currentRoom.players[this.localPlayerId];
    if (player) {
      player.isAlive = false;
      player.score = finalScore;
      player.distance = finalDistance;
    }

    if (this.connectionMode === 'ws') {
      this.send({
        action: 'PLAYER_ELIMINATED',
        code: this.currentRoom.code,
        playerId: this.localPlayerId,
        finalScore,
        finalDistance
      });
    } else {
      fetch(`/api/rooms/${this.currentRoom.code}/eliminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.localPlayerId,
          finalScore,
          finalDistance
        })
      }).catch(() => {});
    }
  }

  public leaveRoom(): void {
    if (!this.currentRoom) return;
    const code = this.currentRoom.code;

    if (this.connectionMode === 'ws') {
      this.send({
        action: 'LEAVE_ROOM',
        code,
        playerId: this.localPlayerId
      });
    } else {
      fetch(`/api/rooms/${code}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: this.localPlayerId })
      }).catch(() => {});
      this.stopPolling();
    }

    this.currentRoom = null;
  }

  private handleServerMessage(data: any): void {
    if (!data || !data.action) return;

    switch (data.action) {
      case 'ROOM_CREATED':
        this.currentRoom = data.room;
        this.dispatch({ type: 'ROOM_CREATED', room: data.room });
        break;

      case 'ROOM_JOINED':
        this.currentRoom = data.room;
        this.dispatch({ type: 'ROOM_JOINED', room: data.room });
        break;

      case 'PLAYER_JOINED':
        if (this.currentRoom && data.room) {
          this.currentRoom = data.room;
          this.dispatch({ type: 'PLAYER_JOINED', room: data.room, player: data.player });
        }
        break;

      case 'PLAYER_READY':
        if (this.currentRoom && data.room) {
          this.currentRoom = data.room;
          this.dispatch({
            type: 'PLAYER_READY',
            room: data.room,
            playerId: data.playerId,
            isReady: data.isReady
          });
        }
        break;

      case 'SESSION_START':
        if (this.currentRoom && data.room) {
          this.currentRoom = data.room;
          this.dispatch({
            type: 'SESSION_START',
            room: data.room,
            countdown: data.countdown ?? 3
          });
        }
        break;

      case 'PLAYER_UPDATE':
        if (this.currentRoom && data.playerId !== this.localPlayerId) {
          if (this.currentRoom.players[data.playerId]) {
            Object.assign(this.currentRoom.players[data.playerId], data.state);
          }
          this.dispatch({
            type: 'PLAYER_UPDATE',
            playerId: data.playerId,
            state: data.state
          });
        }
        break;

      case 'PLAYER_ELIMINATED':
        if (this.currentRoom && data.playerId !== this.localPlayerId) {
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
        }
        break;

      case 'SESSION_COMPLETE':
        if (this.currentRoom) {
          this.currentRoom.status = 'completed';
          this.dispatch({
            type: 'SESSION_COMPLETE',
            room: this.currentRoom,
            combinedScore: data.combinedScore
          });
        }
        break;

      case 'PLAYER_LEFT':
        if (this.currentRoom) {
          delete this.currentRoom.players[data.playerId];
          this.dispatch({
            type: 'PLAYER_LEFT',
            playerId: data.playerId,
            message: data.message || 'Opponent has left the room.'
          });
        }
        break;

      case 'ERROR':
        this.dispatch({
          type: 'ERROR',
          message: data.message || 'Server error occurred'
        });
        break;

      case 'PONG':
        // Heartbeat confirmed
        break;
    }
  }
}
