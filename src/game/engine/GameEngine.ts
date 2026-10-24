import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { WorldId, CharacterId, PlayerRunState, GameStatus, MultiplayerPlayerState } from '../../types/game';
import { TrackManager, LANES, LANE_WIDTH } from './trackManager';
import { createWorldEnvironment, WorldEnvironment } from '../world/environment';
import { createCharacterModel, CharacterMeshController, CHARACTERS } from '../characters/characterModels';
import { checkCollisions } from './collision';
import { soundManager } from '../audio/soundManager';

export interface GameEngineCallbacks {
  onScoreUpdate: (score: number, distance: number, coins: number, speed: number) => void;
  onPowerUpUpdate: (shield: boolean, magnetTimer: number, multiplierTimer: number) => void;
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

  private trackManager!: TrackManager;
  private worldEnv!: WorldEnvironment;
  private playerMeshCtrl!: CharacterMeshController;
  private opponentMeshCtrl: CharacterMeshController | null = null;

  // Particle systems
  private coinParticles!: THREE.Points;
  private coinParticlePositions!: Float32Array;
  private coinParticleCount = 60;
  private coinParticleIndex = 0;

  // Player State
  public status: GameStatus = 'menu';
  private playerZ: number = 0;
  private playerState: PlayerRunState = {
    lane: 0,
    laneX: 0,
    y: 0,
    vy: 0,
    isJumping: false,
    isSliding: false,
    slideTimer: 0,
    speed: 18,
    distance: 0,
    score: 0,
    coins: 0,
    activeShield: false,
    magnetTimer: 0,
    multiplierTimer: 0,
    isAlive: true
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
    this.playerMeshCtrl = createCharacterModel(this.characterId, false);
    this.scene.add(this.playerMeshCtrl.rootGroup);
    this.playerMeshCtrl.rootGroup.position.set(0, 0, 0);
  }

  public setOpponent(state: MultiplayerPlayerState | null): void {
    this.opponentState = state;
    if (state && !this.opponentMeshCtrl) {
      // Create opponent runner ghost
      this.opponentMeshCtrl = createCharacterModel(state.characterId || 'cyber_dash', true);
      this.scene.add(this.opponentMeshCtrl.rootGroup);
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
      this.coinParticlePositions[i] = 9999; // Off-screen initially
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

  public startRun(): void {
    this.playerZ = 0;
    const charDef = CHARACTERS[this.characterId] || CHARACTERS.cyber_dash;
    const baseSpeed = 18 * charDef.stats.speedBoost;

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
      coins: 0,
      activeShield: false,
      magnetTimer: 0,
      multiplierTimer: 0,
      isAlive: true
    };

    this.trackManager.reset();
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
      this.clock.start(); // reset delta to prevent huge leap
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
    // Slide can be executed on ground or as a fast dive-drop from air!
    this.playerState.isSliding = true;
    this.playerState.slideTimer = 0.72; // ~0.72 seconds duration

    if (this.playerState.isJumping) {
      // Fast downward stomp to drop immediately under a barrier!
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
        distance: Math.floor(this.playerState.distance),
        score: Math.floor(this.playerState.score),
        isAlive: this.playerState.isAlive
      });
    }
  }

  private startLoop(): void {
    const tick = () => {
      if (this.isDestroyed) return;

      const delta = Math.min(this.clock.getDelta(), 0.1); // Clamp delta against frame spikes
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

      // 1. Forward Speed Acceleration (gradually increases up to 34 m/s)
      const maxSpeed = 34 * charDef.stats.speedBoost;
      const baseStart = 18 * charDef.stats.speedBoost;
      this.playerState.speed = Math.min(maxSpeed, baseStart + this.playerState.distance * 0.012);

      // 2. Advance player forward along -Z axis
      const distTraveled = this.playerState.speed * delta;
      this.playerZ -= distTraveled;
      this.playerState.distance += distTraveled;

      // 3. Score progression (multiplier aware)
      const mult = (this.playerState.multiplierTimer > 0 ? 2 : 1) * charDef.stats.scoreMultiplier;
      this.playerState.score += distTraveled * 3.5 * mult;

      // 4. Smooth horizontal lane transition
      const targetLaneX = LANES[this.playerState.lane + 1];
      this.playerState.laneX = THREE.MathUtils.damp(this.playerState.laneX, targetLaneX, 16, delta);

      // 5. Jump Physics
      if (this.playerState.isJumping) {
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
        this.playerState.score += collision.collectedCoins * 25 * mult;
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
          }
        });
      }

      // Handle Lethal Obstacle Hit
      if (collision.hitObstacle) {
        if (this.playerState.activeShield) {
          // Shield absorbs one hit!
          this.playerState.activeShield = false;
          soundManager.playCrash();
        } else {
          // Run Over!
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
        Math.floor(this.playerState.speed)
      );
      this.callbacks.onPowerUpUpdate(
        this.playerState.activeShield,
        this.playerState.magnetTimer,
        this.playerState.multiplierTimer
      );

      // Sync multiplayer every 0.1s
      if (Math.floor(time * 10) % 2 === 0) {
        this.emitMultiplayerState();
      }
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
      this.playerState.isAlive
    );

    // Update Opponent Ghost Mesh if in multiplayer
    if (this.opponentMeshCtrl && this.opponentState) {
      const oppLaneX = LANES[(this.opponentState.lane ?? 0) + 1];
      const oppZ = -(this.opponentState.distance || 0);
      this.opponentMeshCtrl.rootGroup.position.set(
        oppLaneX,
        this.opponentState.y || 0,
        oppZ
      );
      this.opponentMeshCtrl.updateAnimation(
        time,
        20,
        !!this.opponentState.isJumping,
        !!this.opponentState.isSliding,
        this.opponentState.isAlive !== false
      );
    }

    // Camera follow with smooth damping & slight tilt when lane switching
    const targetCamX = this.playerState.laneX * 0.45;
    const targetCamY = 3.6 + this.playerState.y * 0.35;
    const targetCamZ = this.playerZ + 6.2;

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 12, delta);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 12, delta);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 18, delta);

    // Camera looks slightly ahead of player
    this.camera.lookAt(
      this.playerState.laneX * 0.25,
      1.3 + this.playerState.y * 0.2,
      this.playerZ - 8.0
    );

    // Update track generator and environmental background
    this.trackManager.update(this.playerZ, delta);
    this.worldEnv.update(this.playerZ, delta);
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('keydown', this.onKeyDown);
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
      case 'Escape':
      case 'KeyP':
        this.pause();
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
