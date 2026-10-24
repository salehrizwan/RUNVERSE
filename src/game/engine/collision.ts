import { PlayerRunState, ObstacleInstance, CollectibleInstance } from '../../types/game';
import { LANES } from './trackManager';

export interface CollisionResult {
  hitObstacle: boolean;
  obstacleType?: string;
  collectedCoins: number;
  collectedPowerUps: ('shield' | 'magnet' | 'multiplier' | 'hoverboard' | 'glider')[];
}

/**
 * Checks for collision between the player and all nearby obstacles/collectibles.
 * Uses full 3D capsule line-segment distance so airborne coins during jump arcs
 * and ground coins during slides are reliably collected without false misses.
 */
export function checkCollisions(
  player: PlayerRunState,
  playerZ: number,
  obstacles: ObstacleInstance[],
  collectibles: CollectibleInstance[],
  delta: number
): CollisionResult {
  const result: CollisionResult = {
    hitObstacle: false,
    collectedCoins: 0,
    collectedPowerUps: []
  };

  if (!player.isAlive) return result;

  // Player bounding dimensions
  const pHalfW = 0.35;
  const pMinX = player.laneX - pHalfW;
  const pMaxX = player.laneX + pHalfW;

  const pMinY = player.y;
  // If sliding, height is drastically reduced to 0.72m
  const pMaxY = player.isSliding ? player.y + 0.72 : player.y + 1.82;

  const pDepth = player.isSliding ? 0.6 : 0.4;
  const pMinZ = playerZ - pDepth;
  const pMaxZ = playerZ + pDepth;

  // Check Obstacles within reach
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    // Fast distance cull: ignore if > 4m away along Z
    const distZ = Math.abs(obs.z - playerZ);
    if (distZ > 3.2) continue;

    const obsCenterX = LANES[obs.lane + 1];
    const obsHalfW = obs.width / 2;
    const oMinX = obsCenterX - obsHalfW;
    const oMaxX = obsCenterX + obsHalfW;

    const obsHalfD = obs.depth / 2;
    const oMinZ = obs.z - obsHalfD;
    const oMaxZ = obs.z + obsHalfD;

    const oMinY = obs.minY;
    const oMaxY = obs.maxY;

    // AABB Overlap test in 3D:
    const overlapX = pMinX < oMaxX && pMaxX > oMinX;
    const overlapZ = pMinZ < oMaxZ && pMaxZ > oMinZ;
    const overlapY = pMinY < oMaxY && pMaxY > oMinY;

    if (overlapX && overlapZ && overlapY) {
      // Collision detected!
      result.hitObstacle = true;
      result.obstacleType = obs.type;
      break;
    }
  }

  // Check Collectibles with 3D vertical capsule line-segment proximity
  const magnetRadius = player.magnetTimer > 0 ? 9.5 : 1.4;
  for (let i = 0; i < collectibles.length; i++) {
    const col = collectibles[i];
    if (col.collected) continue;

    const colX = LANES[col.lane + 1];
    const dx = colX - player.laneX;
    const dz = col.z - playerZ;

    // Closest vertical point on the player's 3D humanoid capsule:
    // When upright: [player.y, player.y + 1.85]
    // When sliding: [player.y, player.y + 0.75]
    const pCapsuleTop = player.isSliding ? player.y + 0.75 : player.y + 1.85;
    const closestY = Math.max(player.y, Math.min(pCapsuleTop, col.y));
    const dy = col.y - closestY;

    const distSq = dx * dx + dy * dy + dz * dz;

    // Magnet attraction effect: smoothly flies toward player torso
    if (player.magnetTimer > 0 && distSq < magnetRadius * magnetRadius && col.type === 'coin') {
      if (col.mesh) {
        col.mesh.position.x += (player.laneX - colX) * 9 * delta;
        col.mesh.position.y += ((player.y + 0.9) - col.y) * 9 * delta;
        col.mesh.position.z += (playerZ - col.z) * 9 * delta;
      }
    }

    // Direct collection pickup threshold:
    // Fair, forgiving bounds accounting for jump arcs and high speed travel
    const inLaneReach = Math.abs(dx) <= 1.25;
    const inVerticalReach = Math.abs(dy) <= 1.05;
    const inZReach = Math.abs(dz) <= 2.2;

    if ((distSq <= 3.2) || (inLaneReach && inVerticalReach && inZReach)) {
      col.collected = true;
      if (col.mesh) {
        col.mesh.visible = false;
      }
      if (col.type === 'coin') {
        result.collectedCoins += 1;
      } else {
        result.collectedPowerUps.push(col.type);
      }
    }
  }

  return result;
}
