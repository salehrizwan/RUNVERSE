import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { WorldId, CharacterId, PlayerRunState, GameStatus, MultiplayerPlayerState } from '../../types/game';
import { TrackManager, LANES, LANE_WIDTH } from './trackManager';
import { createWorldEnvironment, WorldEnvironment } from '../world/environment';
import { createCharacterModel, CharacterMeshController, CHARACTERS } from '../characters/characterModels';
import { checkCollisions } from './collision';
import { soundManager } from '../audio/soundManager';

export interface GameEngineCallbacks {
  onScoreUpdate: (score: number, distance: number, coins: number, speed: number, activeRunTime: number) => void;
  onPowerUpUpdate: (
    shield: boolean,
    magnetTimer: number,
    multiplierTimer: number,
    hoverboardTimer: number,
    gliderTimer: number
  ) => void;
  onGameOver: (finalScore: number, finalDistance: number, coinsEarned: number, reason: string) => void;
  onPlayerStateEmit?: (state: Partial<MultiplayerPlayerState>) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private isSoftwareGl: boolean = false;
  private frameId: number = 0;
  private isDestroyed: boolean = false;

  private worldId: WorldId;
  private characterId: CharacterId;
  private callbacks: GameEngineCallbacks;
  private assignedColor: string = '#06b6d4';

  private trackManager!: TrackManager;
  private worldEnv!: WorldEnvironment;
  private playerMeshCtrl!: CharacterMeshController;
  private opponentMeshCtrl: CharacterMeshController | null = null;
  private opponentCurrentPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Particle systems
  private coinParticles!: THREE.Points;
  private coinParticlePositions!: Float32Array;
  private coinParticleCount = 80;
  private coinParticleIndex = 0;

  // Celebration Particle System
  private celebrationParticles!: THREE.Points;
  private celebrationPositions!: Float32Array;
  private celebrationColors!: Float32Array;
  private celebrationVelocities: THREE.Vector3[] = [];
  private celebrationCount = 120;
  private isCelebrating: boolean = false;
  private celebrationElapsed: number = 0;

  // Speed Control
  private speedControl: 'normal' | 'boost' | 'brake' = 'normal';

  // Player State
  public status: GameStatus = 'menu';
  private playerZ: number = 0;
  private activeRunTime: number = 0; // In seconds of active gameplay
  private playerState: PlayerRunState = {
    lane: 0,
    laneX: 0,
    y: 0,
    vy: 0,
    isJumping: false,
    isSliding: false,
    slideTimer: 0,
    speed: 16,
    distance: 0,
    score: 0,
    activeRunTime: 0,
    coins: 0,
    activeShield: false,
    magnetTimer: 0,
    multiplierTimer: 0,
    hoverboardTimer: 0,
    gliderTimer: 0,
    isGliding: false,
    speedControlState: 'normal',
    isAlive: true,
    isCelebrating: false
  };

  // Opponent State for Multiplayer
  private opponentState: MultiplayerPlayerState | null = null;

  constructor(
    container: HTMLElement,
    worldId: WorldId,
    characterId: CharacterId,
    callbacks: GameEngineCallbacks
  ) {
    this.container = container;
    this.worldId = worldId;
    this.characterId = characterId;
    this.callbacks = callbacks;
    this.clock = new THREE.Clock();

    this.initRendererAndScene();
    this.setupWorldAndTrack();
    this.setupPlayer();
    this.setupCoinParticles();
    this.setupCelebrationParticles();
    this.setupEventListeners();
    this.startLoop();
  }

  private initRendererAndScene(): void {
    // Detect software WebGL safely
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 400);
    this.camera.position.set(0, 3.8, 6.2);

    // Studio Environment Reflection
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch (e) {
      console.warn('RoomEnvironment fallback', e);
    }
  }

  private setupWorldAndTrack(): void {
    this.worldEnv = createWorldEnvironment(this.scene, this.worldId);
    this.trackManager = new TrackManager(this.scene, this.worldId);
  }

  private setupPlayer(): void {
    this.playerMeshCtrl = createCharacterModel(this.characterId, false, this.assignedColor);
    this.scene.add(this.playerMeshCtrl.rootGroup);
    this.playerMeshCtrl.rootGroup.position.set(0, 0, 0);
  }

  public setOpponent(state: MultiplayerPlayerState | null): void {
    this.opponentState = state;
    if (state && !this.opponentMeshCtrl) {
      // Create opponent runner in shared race with their assigned color and character
      this.opponentMeshCtrl = createCharacterModel(
        state.characterId || 'cyber_dash',
        true,
        state.assignedColor || '#ec4899',
        state.name
      );
      this.scene.add(this.opponentMeshCtrl.rootGroup);
      this.opponentCurrentPos.set(
        LANES[(state.lane ?? 0) + 1],
        state.y || 0,
        -(state.distance || 0)
      );
      this.opponentMeshCtrl.rootGroup.position.copy(this.opponentCurrentPos);
    } else if (state && this.opponentMeshCtrl) {
      // Already exists, position and state are updated in loop
    } else if (!state && this.opponentMeshCtrl) {
      this.scene.remove(this.opponentMeshCtrl.rootGroup);
      this.opponentMeshCtrl.dispose();
      this.opponentMeshCtrl = null;
    }
  }

  private setupCoinParticles(): void {
    const geo = new THREE.BufferGeometry();
    this.coinParticlePositions = new Float32Array(this.coinParticleCount * 3);
    for (let i = 0; i < this.coinParticleCount * 3; i++) {
      this.coinParticlePositions[i] = 9999;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(this.coinParticlePositions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xfbbf24,
      size: 0.25,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.coinParticles = new THREE.Points(geo, mat);
    this.scene.add(this.coinParticles);
  }

  private setupCelebrationParticles(): void {
    const geo = new THREE.BufferGeometry();
    this.celebrationPositions = new Float32Array(this.celebrationCount * 3);
    this.celebrationColors = new Float32Array(this.celebrationCount * 3);
    this.celebrationVelocities = [];

    const palette = [
      new THREE.Color(0xfacc15), // Gold
      new THREE.Color(0x06b6d4), // Cyan
      new THREE.Color(0xec4899), // Pink
      new THREE.Color(0xa855f7), // Purple
      new THREE.Color(0x22c55e)  // Green
    ];

    for (let i = 0; i < this.celebrationCount; i++) {
      this.celebrationPositions[i * 3] = 9999;
      this.celebrationPositions[i * 3 + 1] = 9999;
      this.celebrationPositions[i * 3 + 2] = 9999;

      const col = palette[i % palette.length];
      this.celebrationColors[i * 3] = col.r;
      this.celebrationColors[i * 3 + 1] = col.g;
      this.celebrationColors[i * 3 + 2] = col.b;

      this.celebrationVelocities.push(new THREE.Vector3());
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this.celebrationPositions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.celebrationColors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.95
    });

    this.celebrationParticles = new THREE.Points(geo, mat);
    this.scene.add(this.celebrationParticles);
  }

  private triggerCoinBurst(x: number, y: number, z: number): void {
    const posAttr = this.coinParticles.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < 8; i++) {
      const idx = (this.coinParticleIndex % this.coinParticleCount) * 3;
      this.coinParticleIndex++;
      this.coinParticlePositions[idx] = x + (Math.random() - 0.5) * 0.8;
      this.coinParticlePositions[idx + 1] = y + (Math.random() - 0.5) * 0.8;
      this.coinParticlePositions[idx + 2] = z + (Math.random() - 0.5) * 0.8;
    }
    posAttr.needsUpdate = true;
  }

  public triggerCelebration(isNewRecord: boolean = true): void {
    this.isCelebrating = true;
    this.celebrationElapsed = 0;
    this.playerState.isCelebrating = true;

    if (isNewRecord) {
      soundManager.playVictoryFanfare();
    }

    // Launch confetti fountain around player
    const posAttr = this.celebrationParticles.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < this.celebrationCount; i++) {
      this.celebrationPositions[i * 3] = this.playerState.laneX + (Math.random() - 0.5) * 1.5;
      this.celebrationPositions[i * 3 + 1] = 1.0 + Math.random() * 1.2;
      this.celebrationPositions[i * 3 + 2] = this.playerZ + (Math.random() - 0.5) * 1.5;

      this.celebrationVelocities[i].set(
        (Math.random() - 0.5) * 7,
        5 + Math.random() * 8,
        (Math.random() - 0.5) * 7
      );
    }
    posAttr.needsUpdate = true;
  }

  public startRun(seed?: number, assignedColor?: string): void {
    this.playerZ = 0;
    this.activeRunTime = 0;
    this.isCelebrating = false;
    this.celebrationElapsed = 0;
    this.speedControl = 'normal';

    if (assignedColor && assignedColor !== this.assignedColor) {
      this.assignedColor = assignedColor;
      this.scene.remove(this.playerMeshCtrl.rootGroup);
      this.playerMeshCtrl.dispose();
      this.setupPlayer();
    }

    const charDef = CHARACTERS[this.characterId] || CHARACTERS.cyber_dash;
    const baseSpeed = 16 * charDef.stats.speedBoost;

    this.playerState = {
      lane: 0,
      laneX: 0,
      y: 0,
      vy: 0,
      isJumping: false,
      isSliding: false,
      slideTimer: 0,
      speed: baseSpeed,
      distance: 0,
      score: 0,
      activeRunTime: 0,
      coins: 0,
      activeShield: false,
      magnetTimer: 0,
      multiplierTimer: 0,
      hoverboardTimer: 0,
      gliderTimer: 0,
      isGliding: false,
      speedControlState: 'normal',
      isAlive: true,
      isCelebrating: false
    };

    // Use deterministic shared seed if provided (multiplayer synchronized race track)
    this.trackManager.reset(seed);
    this.status = 'running';
    this.clock.start();
    soundManager.startMusic();
  }

  public pause(): void {
    if (this.status === 'running') {
      this.status = 'paused';
    }
  }

  public resume(): void {
    if (this.status === 'paused') {
      this.status = 'running';
      this.clock.start(); // reset delta to prevent time leap
    }
  }

  // Player Speed Control (Safe Boost and Braking)
  public boost(active: boolean): void {
    if (this.status !== 'running' || !this.playerState.isAlive) return;
    if (active) {
      this.speedControl = 'boost';
      this.playerState.speedControlState = 'boost';
    } else if (this.speedControl === 'boost') {
      this.speedControl = 'normal';
      this.playerState.speedControlState = 'normal';
    }
  }

  public brake(active: boolean): void {
    if (this.status !== 'running' || !this.playerState.isAlive) return;
    if (active) {
      this.speedControl = 'brake';
      this.playerState.speedControlState = 'brake';
    } else if (this.speedControl === 'brake') {
      this.speedControl = 'normal';
      this.playerState.speedControlState = 'normal';
    }
  }

  // Core Runner Actions
  public moveLeft(): void {
    if (this.status !== 'running' || !this.playerState.isAlive) return;
    if (this.playerState.lane > -1) {
      this.playerState.lane -= 1;
      soundManager.playClick();
      this.emitMultiplayerState();
    }
  }

  public moveRight(): void {
    if (this.status !== 'running' || !this.playerState.isAlive) return;
    if (this.playerState.lane < 1) {
      this.playerState.lane += 1;
      soundManager.playClick();
      this.emitMultiplayerState();
    }
  }

  public jump(): void {
    if (this.status !== 'running' || !this.playerState.isAlive) return;
    // Glider flight handles altitude automatically
    if (this.playerState.isGliding) return;

    if (!this.playerState.isJumping) {
      this.playerState.isJumping = true;
      this.playerState.isSliding = false; // Cancel slide when jumping
      this.playerState.vy = 12.8;
      soundManager.playJump();
      this.emitMultiplayerState();
    }
  }

  public slide(): void {
    if (this.status !== 'running' || !this.playerState.isAlive) return;

    // Glider Dive / Rapid Descent on slide
    if (this.playerState.isGliding) {
      this.playerState.isGliding = false;
      this.playerState.gliderTimer = 0;
      this.playerState.vy = -18;
      soundManager.playSlide();
      this.emitMultiplayerState();
      return;
    }

    this.playerState.isSliding = true;
    this.playerState.slideTimer = 0.72; // ~0.72 seconds duration

    if (this.playerState.isJumping) {
      this.playerState.vy = -20;
    }

    soundManager.playSlide();
    this.emitMultiplayerState();
  }

  private emitMultiplayerState(): void {
    if (this.callbacks.onPlayerStateEmit) {
      this.callbacks.onPlayerStateEmit({
        lane: this.playerState.lane,
        y: this.playerState.y,
        isJumping: this.playerState.isJumping,
        isSliding: this.playerState.isSliding,
        isGliding: this.playerState.isGliding,
        hoverboard: this.playerState.hoverboardTimer > 0,
        distance: Math.floor(this.playerState.distance),
        score: Math.floor(this.playerState.score),
        isAlive: this.playerState.isAlive,
        timestamp: Date.now()
      });
    }
  }

  private startLoop(): void {
    const tick = () => {
      if (this.isDestroyed) return;

      const delta = Math.min(this.clock.getDelta(), 0.1);
      this.update(delta);
      this.render();

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.isDestroyed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 40);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private update(delta: number): void {
    const time = this.clock.getElapsedTime();

    if (this.status === 'running') {
      const charDef = CHARACTERS[this.characterId] || CHARACTERS.cyber_dash;

      // 1. TIME-BASED SCORING:
      // Exactly 2 points per second of active gameplay (1s = 2pts, 10s = 20pts, 30s = 60pts)
      this.activeRunTime += delta;
      this.playerState.activeRunTime = this.activeRunTime;
      this.playerState.score = Math.floor(this.activeRunTime * 2);

      // 2. Authoritative Progressive Forward Speed (starts at ~16 m/s, climbs to ~32 m/s over active time)
      const progressiveBase = Math.min(32, 16 + this.activeRunTime * 0.28) * charDef.stats.speedBoost;
      let targetSpeed = progressiveBase;
      if (this.speedControl === 'boost') {
        targetSpeed = Math.min(36, progressiveBase + 5.5);
      } else if (this.speedControl === 'brake') {
        targetSpeed = Math.max(13.5, progressiveBase - 4.5);
      }
      this.playerState.speed = THREE.MathUtils.damp(this.playerState.speed, targetSpeed, 6, delta);

      // 3. Advance player forward along -Z axis
      const distTraveled = this.playerState.speed * delta;
      this.playerZ -= distTraveled;
      this.playerState.distance += distTraveled;

      // 4. Smooth horizontal lane transition
      const targetLaneX = LANES[this.playerState.lane + 1];
      this.playerState.laneX = THREE.MathUtils.damp(this.playerState.laneX, targetLaneX, 16, delta);

      // 5. Jump and Glider Flight Physics
      if (this.playerState.gliderTimer > 0) {
        this.playerState.gliderTimer -= delta;
        if (this.playerState.gliderTimer <= 0) {
          this.playerState.isGliding = false;
          this.playerState.gliderTimer = 0;
          this.playerState.vy = -4.5; // Soft descent back to track
        } else {
          this.playerState.isGliding = true;
          // Smoothly maintain aerial cruising altitude at Y = 3.8m above obstacles
          this.playerState.y = THREE.MathUtils.damp(this.playerState.y, 3.8, 5, delta);
          this.playerState.vy = 0;
          this.playerState.isJumping = false;
        }
      } else if (this.playerState.isJumping || this.playerState.y > 0) {
        this.playerState.y += this.playerState.vy * delta;
        this.playerState.vy -= 34 * delta; // Gravity

        if (this.playerState.y <= 0) {
          this.playerState.y = 0;
          this.playerState.vy = 0;
          this.playerState.isJumping = false;
        }
      }

      // 6. Slide Timer
      if (this.playerState.isSliding) {
        this.playerState.slideTimer -= delta;
        if (this.playerState.slideTimer <= 0) {
          this.playerState.isSliding = false;
        }
      }

      // 7. Power-up timers countdown
      if (this.playerState.magnetTimer > 0) {
        this.playerState.magnetTimer = Math.max(0, this.playerState.magnetTimer - delta);
      }
      if (this.playerState.multiplierTimer > 0) {
        this.playerState.multiplierTimer = Math.max(0, this.playerState.multiplierTimer - delta);
      }
      if (this.playerState.hoverboardTimer > 0) {
        this.playerState.hoverboardTimer = Math.max(0, this.playerState.hoverboardTimer - delta);
      }

      // Update Shield & Magnet visual indicators
      this.playerMeshCtrl.shieldSphere.visible = this.playerState.activeShield;
      if (this.playerState.activeShield) {
        this.playerMeshCtrl.shieldSphere.rotation.y += delta * 2;
      }
      this.playerMeshCtrl.magnetRings.visible = this.playerState.magnetTimer > 0;
      if (this.playerState.magnetTimer > 0) {
        this.playerMeshCtrl.magnetRings.rotation.y += delta * 4;
      }

      // 8. Collision Check
      const collision = checkCollisions(
        this.playerState,
        this.playerZ,
        this.trackManager.getActiveObstacles(),
        this.trackManager.getActiveCollectibles(),
        delta
      );

      // Handle Coin pickups
      if (collision.collectedCoins > 0) {
        this.playerState.coins += collision.collectedCoins;
        soundManager.playCoin();
        this.triggerCoinBurst(this.playerState.laneX, this.playerState.y + 0.8, this.playerZ);
      }

      // Handle Power-up pickups
      if (collision.collectedPowerUps.length > 0) {
        collision.collectedPowerUps.forEach(pu => {
          soundManager.playPowerUp();
          if (pu === 'shield') {
            this.playerState.activeShield = true;
          } else if (pu === 'magnet') {
            this.playerState.magnetTimer = 8 + charDef.stats.magnetBonus;
          } else if (pu === 'multiplier') {
            this.playerState.multiplierTimer = 10;
          } else if (pu === 'hoverboard') {
            this.playerState.hoverboardTimer = 15;
          } else if (pu === 'glider') {
            this.playerState.gliderTimer = 10;
            this.playerState.isGliding = true;
            this.playerState.vy = 8;
          }
        });
      }

      // Handle Obstacle Collision with Hoverboard & Shield Protection
      if (collision.hitObstacle) {
        if (this.playerState.hoverboardTimer > 0) {
          // Protective Hoverboard breaks and absorbs the lethal impact!
          this.playerState.hoverboardTimer = 0;
          soundManager.playCrash();
          this.triggerCoinBurst(this.playerState.laneX, this.playerState.y + 0.4, this.playerZ);
        } else if (this.playerState.activeShield) {
          // Shield absorbs one hit!
          this.playerState.activeShield = false;
          soundManager.playCrash();
        } else {
          // Lethal Crash! Run Over!
          this.playerState.isAlive = false;
          this.playerState.deathReason = collision.obstacleType || 'Obstacle Impact';
          this.status = 'gameover';
          soundManager.playCrash();
          soundManager.playGameOver();
          soundManager.stopMusic();

          this.emitMultiplayerState();
          this.callbacks.onGameOver(
            Math.floor(this.playerState.score),
            Math.floor(this.playerState.distance),
            this.playerState.coins,
            this.playerState.deathReason
          );
        }
      }

      // Emit stats update to UI HUD
      this.callbacks.onScoreUpdate(
        Math.floor(this.playerState.score),
        Math.floor(this.playerState.distance),
        this.playerState.coins,
        Math.floor(this.playerState.speed),
        this.activeRunTime
      );
      this.callbacks.onPowerUpUpdate(
        this.playerState.activeShield,
        this.playerState.magnetTimer,
        this.playerState.multiplierTimer,
        this.playerState.hoverboardTimer,
        this.playerState.gliderTimer
      );

      // Periodic multiplayer synchronization
      if (Math.floor(time * 20) % 2 === 0) {
        this.emitMultiplayerState();
      }
    }

    // Update Celebration Animation and Particles if active
    if (this.isCelebrating) {
      this.celebrationElapsed += delta;
      
      const posAttr = this.celebrationParticles.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < this.celebrationCount; i++) {
        if (this.celebrationPositions[i * 3 + 1] < 9000) {
          this.celebrationPositions[i * 3] += this.celebrationVelocities[i].x * delta;
          this.celebrationPositions[i * 3 + 1] += this.celebrationVelocities[i].y * delta;
          this.celebrationPositions[i * 3 + 2] += this.celebrationVelocities[i].z * delta;
          this.celebrationVelocities[i].y -= 9.8 * delta; // Gravity
        }
      }
      posAttr.needsUpdate = true;
    }

    // Update Player 3D mesh position & animation
    this.playerMeshCtrl.rootGroup.position.set(
      this.playerState.laneX,
      this.playerState.y,
      this.playerZ
    );
    this.playerMeshCtrl.updateAnimation(
      time,
      this.playerState.speed,
      this.playerState.isJumping,
      this.playerState.isSliding,
      this.playerState.isAlive,
      this.isCelebrating,
      this.celebrationElapsed,
      this.playerState.hoverboardTimer > 0,
      this.playerState.isGliding,
      this.playerState.laneX - LANES[this.playerState.lane + 1]
    );

    // Update Opponent Runner in Shared Race
    if (this.opponentMeshCtrl && this.opponentState) {
      const oppTargetX = LANES[(this.opponentState.lane ?? 0) + 1];
      const oppTargetZ = -(this.opponentState.distance || 0);
      const oppTargetY = this.opponentState.y || 0;

      // Smooth lag compensation and damping
      this.opponentCurrentPos.x = THREE.MathUtils.damp(this.opponentCurrentPos.x, oppTargetX, 16, delta);
      this.opponentCurrentPos.y = THREE.MathUtils.damp(this.opponentCurrentPos.y, oppTargetY, 18, delta);
      this.opponentCurrentPos.z = THREE.MathUtils.damp(this.opponentCurrentPos.z, oppTargetZ, 12, delta);

      this.opponentMeshCtrl.rootGroup.position.copy(this.opponentCurrentPos);

      // Relative distance tag
      const relDist = Math.round((this.opponentState.distance || 0) - this.playerState.distance);
      let distText = '';
      if (!this.opponentState.isAlive) {
        distText = 'CRASHED';
      } else if (Math.abs(relDist) < 1) {
        distText = 'TIED';
      } else if (relDist > 0) {
        distText = `+${relDist}m (Ahead)`;
      } else {
        distText = `${relDist}m (Behind)`;
      }

      this.opponentMeshCtrl.updateTag(
        this.opponentState.name || 'Rival',
        distText,
        this.opponentState.assignedColor || '#ec4899'
      );

      this.opponentMeshCtrl.updateAnimation(
        time,
        20,
        !!this.opponentState.isJumping,
        !!this.opponentState.isSliding,
        this.opponentState.isAlive !== false,
        false,
        0,
        !!this.opponentState.hoverboard,
        !!this.opponentState.isGliding
      );
    }

    // Camera follow
    if (this.isCelebrating) {
      // Dynamic celebration low-angle camera
      const heroCamX = this.playerState.laneX + 2.2;
      const heroCamY = 1.3;
      const heroCamZ = this.playerZ - 3.8;
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, heroCamX, 6, delta);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, heroCamY, 6, delta);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, heroCamZ, 6, delta);
      this.camera.lookAt(this.playerState.laneX, 1.4, this.playerZ);
    } else {
      // Normal third-person runner camera
      const targetCamX = this.playerState.laneX * 0.45;
      const targetCamY = 3.6 + this.playerState.y * 0.35;
      const targetCamZ = this.playerZ + 6.2;

      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 12, delta);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 12, delta);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 18, delta);

      this.camera.lookAt(
        this.playerState.laneX * 0.25,
        1.3 + this.playerState.y * 0.2,
        this.playerZ - 8.0
      );
    }

    // Update track and environment
    this.trackManager.update(this.playerZ, delta);
    this.worldEnv.update(this.playerZ, delta);
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onWindowResize = (): void => {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.status !== 'running') return;

    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.moveLeft();
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.moveRight();
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        e.preventDefault();
        this.jump();
        break;
      case 'ArrowDown':
      case 'KeyS':
        e.preventDefault();
        this.slide();
        break;
      // Boost shortcuts (Shift / E)
      case 'ShiftLeft':
      case 'ShiftRight':
      case 'KeyE':
        e.preventDefault();
        this.boost(true);
        break;
      // Brake shortcuts (Q / Ctrl)
      case 'KeyQ':
      case 'ControlLeft':
      case 'ControlRight':
        e.preventDefault();
        this.brake(true);
        break;
      case 'Escape':
      case 'KeyP':
        this.pause();
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'ShiftLeft':
      case 'ShiftRight':
      case 'KeyE':
        this.boost(false);
        break;
      case 'KeyQ':
      case 'ControlLeft':
      case 'ControlRight':
        this.brake(false);
        break;
    }
  };

  public setWorld(worldId: WorldId): void {
    if (this.worldId === worldId) return;
    this.worldId = worldId;
    this.worldEnv.dispose();
    this.trackManager.dispose();
    this.setupWorldAndTrack();
  }

  public setCharacter(charId: CharacterId): void {
    if (this.characterId === charId) return;
    this.characterId = charId;
    this.scene.remove(this.playerMeshCtrl.rootGroup);
    this.playerMeshCtrl.dispose();
    this.setupPlayer();
  }

  public dispose(): void {
    this.isDestroyed = true;
    soundManager.stopMusic();
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
    }

    this.playerMeshCtrl.dispose();
    if (this.opponentMeshCtrl) {
      this.opponentMeshCtrl.dispose();
    }
    this.trackManager.dispose();
    this.worldEnv.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
