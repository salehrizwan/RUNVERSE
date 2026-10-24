import * as THREE from 'three';
import { WorldId, ObstacleType, CollectibleType, TrackSegment, ObstacleInstance, CollectibleInstance } from '../../types/game';
import { WORLDS } from '../world/worldThemes';

export const LANE_WIDTH = 2.6;
export const LANES = [-LANE_WIDTH, 0, LANE_WIDTH]; // Left (-1), Center (0), Right (1)
export const SEGMENT_LENGTH = 40;
export const ACTIVE_SEGMENTS_COUNT = 8;

export class TrackManager {
  private scene: THREE.Scene;
  private worldId: WorldId;
  private segments: TrackSegment[] = [];
  private nextSegmentZ: number = 0;
  private segmentCounter: number = 0;
  private nextObstacleId: number = 1;
  private nextCollectibleId: number = 1;

  // Shared Geometries & Materials for high performance pooling
  private roadGeo: THREE.PlaneGeometry;
  private curbGeo: THREE.BoxGeometry;
  private laneMarkerGeo: THREE.PlaneGeometry;
  private coinGeo: THREE.CylinderGeometry;
  private powerupGeo: THREE.IcosahedronGeometry;

  private roadMat: THREE.MeshStandardMaterial;
  private curbMat: THREE.MeshStandardMaterial;
  private laneMarkerMat: THREE.MeshBasicMaterial;
  private coinMat: THREE.MeshStandardMaterial;
  private obstacleMats: Record<string, THREE.MeshStandardMaterial> = {};

  constructor(scene: THREE.Scene, worldId: WorldId) {
    this.scene = scene;
    this.worldId = worldId;
    const worldDef = WORLDS[worldId] || WORLDS.neon;

    // Road plane (lying flat on XZ plane)
    this.roadGeo = new THREE.PlaneGeometry(8.6, SEGMENT_LENGTH);
    this.roadGeo.rotateX(-Math.PI / 2);

    this.curbGeo = new THREE.BoxGeometry(0.35, 0.45, SEGMENT_LENGTH);
    this.laneMarkerGeo = new THREE.PlaneGeometry(0.12, 4);
    this.laneMarkerGeo.rotateX(-Math.PI / 2);

    this.coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 16);
    this.coinGeo.rotateZ(Math.PI / 2);

    this.powerupGeo = new THREE.IcosahedronGeometry(0.55);

    // Materials
    this.roadMat = new THREE.MeshStandardMaterial({
      color: worldDef.colors.road,
      roughness: 0.7,
      metalness: 0.2
    });

    this.curbMat = new THREE.MeshStandardMaterial({
      color: worldDef.colors.roadTrim,
      emissive: worldDef.colors.roadTrim,
      emissiveIntensity: 0.9,
      roughness: 0.3
    });

    this.laneMarkerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4
    });

    this.coinMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.8,
      metalness: 0.95,
      roughness: 0.15
    });

    this.initObstacleMaterials(worldDef);
    this.reset();
  }

  private initObstacleMaterials(worldDef: any) {
    this.obstacleMats = {
      hurdle: new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.6,
        roughness: 0.4
      }),
      barrier: new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0x991b1b,
        emissiveIntensity: 0.7,
        roughness: 0.3
      }),
      crate: new THREE.MeshStandardMaterial({
        color: worldDef.colors.hazard || 0x3b82f6,
        roughness: 0.5,
        metalness: 0.5
      }),
      drone: new THREE.MeshStandardMaterial({
        color: 0x8b5cf6,
        emissive: 0x7c3aed,
        emissiveIntensity: 1.0,
        roughness: 0.2
      })
    };
  }

  private rng: () => number = Math.random;

  private createPRNG(seed: number): () => number {
    let s = (seed >>> 0) || 123456789;
    return () => {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  public reset(seed?: number): void {
    if (seed != null) {
      this.rng = this.createPRNG(seed);
    } else {
      this.rng = Math.random;
    }

    // Clear existing segments
    this.segments.forEach(seg => {
      this.scene.remove(seg.meshGroup);
    });
    this.segments = [];
    this.nextSegmentZ = 0;
    this.segmentCounter = 0;
    this.nextObstacleId = 1;
    this.nextCollectibleId = 1;

    // Spawn initial active segments
    for (let i = 0; i < ACTIVE_SEGMENTS_COUNT; i++) {
      // First 2 segments are runway with no obstacles
      const isRunway = i < 2;
      this.spawnSegment(isRunway);
    }
  }

  private spawnSegment(isRunway: boolean): void {
    const zCenter = this.nextSegmentZ - SEGMENT_LENGTH / 2;
    const meshGroup = new THREE.Group();
    meshGroup.name = `segment_${this.segmentCounter}`;
    meshGroup.position.z = zCenter;

    // Road surface
    const road = new THREE.Mesh(this.roadGeo, this.roadMat);
    road.receiveShadow = true;
    meshGroup.add(road);

    // Left and Right Curbs with neon glow
    const leftCurb = new THREE.Mesh(this.curbGeo, this.curbMat);
    leftCurb.position.set(-4.3, 0.2, 0);
    meshGroup.add(leftCurb);

    const rightCurb = new THREE.Mesh(this.curbGeo, this.curbMat);
    rightCurb.position.set(4.3, 0.2, 0);
    meshGroup.add(rightCurb);

    // Dashed Lane dividers (between lane -1 and 0, and between 0 and 1)
    const markerCount = 5;
    for (let m = 0; m < markerCount; m++) {
      const zOffset = -SEGMENT_LENGTH / 2 + (m + 0.5) * (SEGMENT_LENGTH / markerCount);
      
      const divL = new THREE.Mesh(this.laneMarkerGeo, this.laneMarkerMat);
      divL.position.set(-LANE_WIDTH / 2, 0.02, zOffset);
      meshGroup.add(divL);

      const divR = new THREE.Mesh(this.laneMarkerGeo, this.laneMarkerMat);
      divR.position.set(LANE_WIDTH / 2, 0.02, zOffset);
      meshGroup.add(divR);
    }

    const obstacles: ObstacleInstance[] = [];
    const collectibles: CollectibleInstance[] = [];

    if (!isRunway) {
      this.populateSegmentContents(meshGroup, zCenter, obstacles, collectibles);
    }

    this.scene.add(meshGroup);

    this.segments.push({
      id: this.segmentCounter++,
      zStart: this.nextSegmentZ,
      length: SEGMENT_LENGTH,
      meshGroup,
      obstacles,
      collectibles
    });

    this.nextSegmentZ -= SEGMENT_LENGTH;
  }

  private populateSegmentContents(
    meshGroup: THREE.Group,
    zCenter: number,
    obstacles: ObstacleInstance[],
    collectibles: CollectibleInstance[]
  ) {
    // Generate 1 or 2 obstacle events per 40m segment
    const eventOffsets = [-10, 10]; // Relative to zCenter

    eventOffsets.forEach((localZ) => {
      const worldZ = zCenter + localZ;
      const pattern = Math.floor(this.rng() * 6);

      // GUARANTEED FAIRNESS:
      // Pattern 0: Single Hurdle (Jump) in one lane, coins in other lanes
      // Pattern 1: High Barrier (Slide) across 1 or 2 lanes, 1 lane completely open
      // Pattern 2: Crate block in lane -1 and 0, lane 1 open
      // Pattern 3: Crate block in lane 0 and 1, lane -1 open
      // Pattern 4: Moving drone down center, sides open
      // Pattern 5: Hurdle with arch of coins above it!

      if (pattern === 0 || pattern === 5) {
        // Low hurdle in a random lane
        const targetLane = Math.floor(this.rng() * 3) - 1; // -1, 0, or 1
        const hurdleGroup = this.createHurdleMesh();
        hurdleGroup.position.set(LANES[targetLane + 1], 0, localZ);
        meshGroup.add(hurdleGroup);

        obstacles.push({
          id: this.nextObstacleId++,
          type: 'low_hurdle',
          lane: targetLane,
          z: worldZ,
          width: 1.8,
          height: 0.8,
          depth: 0.5,
          minY: 0,
          maxY: 0.85,
          meshGroup: hurdleGroup
        });

        // Add coin arch over the hurdle!
        for (let c = -2; c <= 2; c++) {
          const coinZ = worldZ + c * 1.5;
          const coinY = 1.0 + Math.cos((c / 2) * (Math.PI / 2.5)) * 1.1; // Arch curve
          const coinMesh = new THREE.Mesh(this.coinGeo, this.coinMat);
          coinMesh.position.set(LANES[targetLane + 1], coinY, localZ + c * 1.5);
          meshGroup.add(coinMesh);

          collectibles.push({
            id: this.nextCollectibleId++,
            type: 'coin',
            lane: targetLane,
            z: coinZ,
            y: coinY,
            collected: false,
            mesh: coinMesh
          });
        }
      } else if (pattern === 1) {
        // High barrier (slide underneath)
        const targetLane = Math.floor(this.rng() * 3) - 1;
        const barrierGroup = this.createBarrierMesh();
        barrierGroup.position.set(LANES[targetLane + 1], 0, localZ);
        meshGroup.add(barrierGroup);

        obstacles.push({
          id: this.nextObstacleId++,
          type: 'high_barrier',
          lane: targetLane,
          z: worldZ,
          width: 2.2,
          height: 1.2,
          depth: 0.6,
          minY: 1.15, // Head must be under 1.15m (sliding height is 0.75m)
          maxY: 2.4,
          meshGroup: barrierGroup
        });

        // Coins under the barrier at ground level
        for (let c = -1; c <= 1; c++) {
          const coinMesh = new THREE.Mesh(this.coinGeo, this.coinMat);
          coinMesh.position.set(LANES[targetLane + 1], 0.45, localZ + c * 1.6);
          meshGroup.add(coinMesh);

          collectibles.push({
            id: this.nextCollectibleId++,
            type: 'coin',
            lane: targetLane,
            z: worldZ + c * 1.6,
            y: 0.45,
            collected: false,
            mesh: coinMesh
          });
        }
      } else if (pattern === 2 || pattern === 3) {
        // 2 Block crates, 1 guaranteed open lane!
        const openLane = pattern === 2 ? 1 : -1;
        const blockedLanes = [-1, 0, 1].filter(l => l !== openLane);

        blockedLanes.forEach(lane => {
          const crateGroup = this.createCrateMesh();
          crateGroup.position.set(LANES[lane + 1], 0, localZ);
          meshGroup.add(crateGroup);

          obstacles.push({
            id: this.nextObstacleId++,
            type: 'block_crate',
            lane,
            z: worldZ,
            width: 1.9,
            height: 2.2,
            depth: 1.2,
            minY: 0,
            maxY: 2.3,
            meshGroup: crateGroup
          });
        });

        // Golden coins guiding through the open safe lane!
        for (let c = -2; c <= 2; c++) {
          const coinMesh = new THREE.Mesh(this.coinGeo, this.coinMat);
          coinMesh.position.set(LANES[openLane + 1], 0.7, localZ + c * 1.8);
          meshGroup.add(coinMesh);

          collectibles.push({
            id: this.nextCollectibleId++,
            type: 'coin',
            lane: openLane,
            z: worldZ + c * 1.8,
            y: 0.7,
            collected: false,
            mesh: coinMesh
          });
        }
      } else {
        // Moving drone in center or side
        const droneLane = 0;
        const droneGroup = this.createDroneMesh();
        droneGroup.position.set(LANES[droneLane + 1], 0, localZ);
        meshGroup.add(droneGroup);

        obstacles.push({
          id: this.nextObstacleId++,
          type: 'moving_drone',
          lane: droneLane,
          z: worldZ,
          width: 1.8,
          height: 1.6,
          depth: 1.0,
          minY: 0.2,
          maxY: 2.0,
          moving: true,
          moveSpeed: 3.5,
          meshGroup: droneGroup
        });
      }

      // Rare Power-Up Spawn (10% chance per segment event)
      if (this.rng() < 0.14) {
        const pTypes: CollectibleType[] = ['shield', 'magnet', 'multiplier'];
        const pType = pTypes[Math.floor(this.rng() * pTypes.length)];
        const pLane = Math.floor(this.rng() * 3) - 1;

        const pColor = pType === 'shield' ? 0x06b6d4 : (pType === 'magnet' ? 0xf59e0b : 0xa855f7);
        const pMat = new THREE.MeshStandardMaterial({
          color: pColor,
          emissive: pColor,
          emissiveIntensity: 1.2,
          roughness: 0.2
        });

        const pMesh = new THREE.Mesh(this.powerupGeo, pMat);
        pMesh.position.set(LANES[pLane + 1], 1.1, localZ - 6);
        meshGroup.add(pMesh);

        collectibles.push({
          id: this.nextCollectibleId++,
          type: pType,
          lane: pLane,
          z: worldZ - 6,
          y: 1.1,
          collected: false,
          mesh: pMesh
        });
      }
    });
  }

  private createHurdleMesh(): THREE.Group {
    const group = new THREE.Group();
    // 3-part composite hurdle: 2 posts and crossbar
    const postGeo = new THREE.BoxGeometry(0.18, 0.75, 0.18);
    const barGeo = new THREE.BoxGeometry(2.0, 0.2, 0.12);

    const postL = new THREE.Mesh(postGeo, this.obstacleMats.hurdle);
    postL.position.set(-0.9, 0.375, 0);
    postL.castShadow = true;
    group.add(postL);

    const postR = new THREE.Mesh(postGeo, this.obstacleMats.hurdle);
    postR.position.set(0.9, 0.375, 0);
    postR.castShadow = true;
    group.add(postR);

    const bar = new THREE.Mesh(barGeo, this.obstacleMats.hurdle);
    bar.position.set(0, 0.65, 0);
    bar.castShadow = true;
    group.add(bar);

    return group;
  }

  private createBarrierMesh(): THREE.Group {
    const group = new THREE.Group();
    // High overhead gantry: tall side legs, high horizontal hazard barrier
    const legGeo = new THREE.BoxGeometry(0.2, 2.5, 0.2);
    const overheadGeo = new THREE.BoxGeometry(2.2, 0.7, 0.3);

    const legL = new THREE.Mesh(legGeo, this.obstacleMats.barrier);
    legL.position.set(-1.0, 1.25, 0);
    group.add(legL);

    const legR = new THREE.Mesh(legGeo, this.obstacleMats.barrier);
    legR.position.set(1.0, 1.25, 0);
    group.add(legR);

    const overhead = new THREE.Mesh(overheadGeo, this.obstacleMats.barrier);
    overhead.position.set(0, 1.9, 0);
    overhead.castShadow = true;
    group.add(overhead);

    return group;
  }

  private createCrateMesh(): THREE.Group {
    const group = new THREE.Group();
    // Industrial freight container / techno crate
    const crateGeo = new THREE.BoxGeometry(1.85, 2.1, 1.2);
    const crate = new THREE.Mesh(crateGeo, this.obstacleMats.crate);
    crate.position.set(0, 1.05, 0);
    crate.castShadow = true;
    group.add(crate);

    // Hazard stripes / trim
    const trimGeo = new THREE.BoxGeometry(1.88, 0.2, 1.22);
    const trimMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(0, 1.05, 0);
    group.add(trim);

    return group;
  }

  private createDroneMesh(): THREE.Group {
    const group = new THREE.Group();
    // Futuristic floating hover hazard drone
    const bodyGeo = new THREE.BoxGeometry(1.2, 0.45, 0.9);
    const body = new THREE.Mesh(bodyGeo, this.obstacleMats.drone);
    body.position.set(0, 1.1, 0);
    body.castShadow = true;
    group.add(body);

    const eyeGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 1.1, 0.45);
    group.add(eye);

    return group;
  }

  public update(playerZ: number, delta: number): void {
    // Rotate all visible coins and power-ups
    const coinSpin = delta * 3.5;
    this.segments.forEach(seg => {
      seg.collectibles.forEach(col => {
        if (!col.collected && col.mesh) {
          col.mesh.rotation.y += coinSpin;
          if (col.type !== 'coin') {
            col.mesh.rotation.x += delta * 2;
          }
        }
      });

      // Move dynamic drone obstacles
      seg.obstacles.forEach(obs => {
        if (obs.moving && obs.meshGroup) {
          obs.z += (obs.moveSpeed || 3.0) * delta;
          obs.meshGroup.position.z += (obs.moveSpeed || 3.0) * delta;
          // Floating bobbing motion
          obs.meshGroup.position.y = Math.sin(obs.z * 0.5) * 0.25;
        }
      });
    });

    // Check if the oldest segment is far behind the player (e.g. player is > 50m past it)
    if (this.segments.length > 0) {
      const oldest = this.segments[0];
      if (playerZ < oldest.zStart - oldest.length - 20) {
        // Remove oldest from scene
        this.scene.remove(oldest.meshGroup);
        this.segments.shift();

        // Spawn a brand new segment ahead at nextSegmentZ
        this.spawnSegment(false);
      }
    }
  }

  public getActiveObstacles(): ObstacleInstance[] {
    const list: ObstacleInstance[] = [];
    this.segments.forEach(s => {
      list.push(...s.obstacles);
    });
    return list;
  }

  public getActiveCollectibles(): CollectibleInstance[] {
    const list: CollectibleInstance[] = [];
    this.segments.forEach(s => {
      list.push(...s.collectibles);
    });
    return list;
  }

  public dispose(): void {
    this.segments.forEach(seg => {
      this.scene.remove(seg.meshGroup);
    });
    this.segments = [];
    this.roadGeo.dispose();
    this.curbGeo.dispose();
    this.laneMarkerGeo.dispose();
    this.coinGeo.dispose();
    this.powerupGeo.dispose();
    this.roadMat.dispose();
    this.curbMat.dispose();
    this.laneMarkerMat.dispose();
    this.coinMat.dispose();
    Object.values(this.obstacleMats).forEach(m => m.dispose());
  }
}
