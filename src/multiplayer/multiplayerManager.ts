/**
 * RUNVERSE Real-Time Online Multiplayer Client
 * Handles real WebSocket server connections, room codes, state relays,
 * lag-compensated player synchronization, and graceful reconnects.
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
  private customServerUrl: string = '';
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private pingInterval: number | null = null;
  private listeners: ((event: MultiplayerEvent) => void)[] = [];

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
        this.setConnectionStatus('connected', 'Connected to online game server');
        this.startHeartbeat();

        // If we were in a room, re-query room state
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
        this.setConnectionStatus('disconnected', 'Disconnected from server');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.stopHeartbeat();
        this.setConnectionStatus('error', 'Unable to reach game server');
      };
    } catch (e: any) {
      this.setConnectionStatus('error', e?.message || 'Connection error');
      this.scheduleReconnect();
    }
  }

  public reconnect(): void {
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

  public createRoom(worldId: WorldId): void {
    if (this.connectionStatus !== 'connected') {
      this.dispatch({
        type: 'ERROR',
        message: 'Cannot create room: not connected to server. Connecting...'
      });
      this.connect();
      return;
    }

    this.send({
      action: 'CREATE_ROOM',
      playerId: this.localPlayerId,
      playerName: this.playerName,
      characterId: this.characterId,
      worldId
    });
  }

  public joinRoom(roomCode: string): void {
    const code = roomCode.trim().toUpperCase();
    if (!code || code.length !== 5) {
      this.dispatch({ type: 'ERROR', message: 'Room code must be exactly 5 characters.' });
      return;
    }

    if (this.connectionStatus !== 'connected') {
      this.dispatch({
        type: 'ERROR',
        message: 'Cannot join room: not connected to server. Connecting...'
      });
      this.connect();
      return;
    }

    this.send({
      action: 'JOIN_ROOM',
      code,
      playerId: this.localPlayerId,
      playerName: this.playerName,
      characterId: this.characterId
    });
  }

  public toggleReady(): boolean {
    if (!this.currentRoom) return false;
    const player = this.currentRoom.players[this.localPlayerId];
    if (!player) return false;

    const nextReady = !player.isReady;
    player.isReady = nextReady;

    this.send({
      action: 'PLAYER_READY',
      code: this.currentRoom.code,
      playerId: this.localPlayerId,
      isReady: nextReady
    });

    return nextReady;
  }

  public sendStateUpdate(state: Partial<MultiplayerPlayerState>): void {
    if (!this.currentRoom) return;
    const player = this.currentRoom.players[this.localPlayerId];
    if (player) {
      Object.assign(player, state);
    }

    this.send({
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

    this.send({
      action: 'PLAYER_ELIMINATED',
      code: this.currentRoom.code,
      playerId: this.localPlayerId,
      finalScore,
      finalDistance
    });
  }

  public leaveRoom(): void {
    if (!this.currentRoom) return;
    const code = this.currentRoom.code;

    this.send({
      action: 'LEAVE_ROOM',
      code,
      playerId: this.localPlayerId
    });

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
