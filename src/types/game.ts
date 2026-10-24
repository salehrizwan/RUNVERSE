/**
 * RUNVERSE Core Types
 */

export type WorldId = 'neon' | 'jungle' | 'frozen' | 'desert';

export type CharacterId = 'cyber_dash' | 'blaze_runner' | 'shadow_ninja' | 'mecha_titan';

export type ObstacleType = 
  | 'low_hurdle'       // Jump over
  | 'high_barrier'     // Slide under
  | 'block_crate'      // Avoid lane
  | 'tall_pillar'      // Avoid lane
  | 'moving_drone'     // Dynamic drone moving down track
  | 'laser_gate';      // Pulsing laser gate (jump or slide based on height)

export type CollectibleType = 'coin' | 'magnet' | 'shield' | 'multiplier' | 'hoverboard' | 'glider';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  title: string;
  description: string;
  cost: number;
  unlockedByDefault: boolean;
  colorScheme: {
    primary: string;
    secondary: string;
    glow: string;
    visor: string;
  };
  stats: {
    speedBoost: number;     // e.g. 1.0 = base
    magnetBonus: number;    // seconds
    scoreMultiplier: number;// bonus multiplier
  };
}

export interface WorldDef {
  id: WorldId;
  name: string;
  subtitle: string;
  description: string;
  badge: string;
  available: boolean;
  colors: {
    fog: number;
    skyTop: string;
    skyBottom: string;
    road: number;
    roadTrim: number;
    ambient: number;
    keyLight: number;
    neonGlow: number;
    hazard: number;
  };
}

export interface ObstacleInstance {
  id: number;
  type: ObstacleType;
  lane: number; // -1 (left), 0 (center), 1 (right)
  z: number;
  width: number;
  height: number;
  depth: number;
  minY: number; // For collision height checking (e.g. high barrier minY is ~1.2m)
  maxY: number;
  moving?: boolean;
  moveSpeed?: number;
  meshGroup?: any; // THREE.Group
}

export interface CollectibleInstance {
  id: number;
  type: CollectibleType;
  lane: number;
  z: number;
  y: number;
  collected: boolean;
  mesh?: any;
}

export interface TrackSegment {
  id: number;
  zStart: number;
  length: number;
  meshGroup: any; // THREE.Group
  obstacles: ObstacleInstance[];
  collectibles: CollectibleInstance[];
}

export interface PlayerRunState {
  lane: number;          // Target lane: -1, 0, 1
  laneX: number;         // Current interpolated X position
  y: number;             // Current Y position (0 = ground, >0 = jumping)
  vy: number;            // Vertical velocity
  isJumping: boolean;
  isSliding: boolean;
  slideTimer: number;    // Remaining slide duration in seconds
  speed: number;         // Current forward speed (m/s)
  distance: number;      // Meters traveled
  score: number;         // Current run score (2 points per second of active gameplay)
  activeRunTime: number; // Exact elapsed active gameplay time in seconds
  coins: number;         // Coins gathered in this run
  activeShield: boolean;
  magnetTimer: number;   // Remaining magnet time
  multiplierTimer: number; // Remaining 2x multiplier time
  hoverboardTimer: number; // Protective hoverboard duration (or until crash absorbed)
  gliderTimer: number;     // Glider / parachute flight duration
  isGliding: boolean;
  speedControlState: 'normal' | 'boost' | 'brake';
  isAlive: boolean;
  deathReason?: string;
  isCelebrating?: boolean;
}

export type GameMode = 'offline' | 'multiplayer';

export type GameStatus = 'menu' | 'countdown' | 'running' | 'paused' | 'gameover';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MultiplayerPlayerState {
  id: string;
  name: string;
  characterId: CharacterId;
  lane: number;
  y: number;
  distance: number;
  score: number;
  isSliding: boolean;
  isJumping: boolean;
  isGliding?: boolean;
  hoverboard?: boolean;
  isAlive: boolean;
  isReady: boolean;
  assignedColor: string;
  colorName: string;
  timestamp?: number;
}

export interface MultiplayerRoom {
  code: string;
  worldId: WorldId;
  hostId: string;
  players: Record<string, MultiplayerPlayerState>;
  status: 'waiting' | 'countdown' | 'running' | 'completed';
  seed: number;
  createdAt: number;
  lastActivity?: number;
}

export interface CombinedHighScoreRecord {
  id: string;
  player1Name: string;
  player2Name: string;
  score1: number;
  score2: number;
  combinedScore: number;
  worldId: WorldId;
  date: string;
}

export interface UserSaveData {
  coins: number;
  personalBest: number;
  bestDistance: number;
  unlockedCharacters: CharacterId[];
  selectedCharacter: CharacterId;
  selectedWorld: WorldId;
  playerName: string;
  musicVolume: number;
  sfxVolume: number;
  graphicsQuality: 'low' | 'medium' | 'high';
  showTouchControls: boolean;
  customWsUrl?: string;
  friendsHighScores: CombinedHighScoreRecord[];
}
