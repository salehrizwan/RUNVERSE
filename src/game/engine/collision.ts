import { PlayerRunState, ObstacleInstance, CollectibleInstance } from '../../types/game';
import { LANES } from './trackManager';

export interface CollisionResult {
  hitObstacle: boolean;
  obstacleType?: string;
  collectedCoins: number;
  collectedPowerUps: ('shield' | 'magnet' | 'multiplier')[];
}

/**
 * Checks for collision between the player and all nearby obstacles/collectibles.
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

  // Check Collectibles
  const magnetRadius = player.magnetTimer > 0 ? 8.5 : 1.35;
  for (let i = 0; i < collectibles.length; i++) {
    const col = collectibles[i];
    if (col.collected) continue;

    const colX = LANES[col.lane + 1];
    const dx = colX - player.laneX;
    const dy = col.y - (player.y + 0.8);
    const dz = col.z - playerZ;
    const distSq = dx * dx + dy * dy + dz * dz;

    // Magnet attraction effect
    if (player.magnetTimer > 0 && distSq < magnetRadius * magnetRadius && col.type === 'coin') {
      // Move coin mesh toward player
      if (col.mesh) {
        col.mesh.position.x += (player.laneX - colX) * 8 * delta;
        col.mesh.position.y += ((player.y + 0.8) - col.y) * 8 * delta;
        col.mesh.position.z += (playerZ - col.z) * 8 * delta;
      }
    }

    // Direct collection pickup threshold (~1.4m)
    if (distSq < 1.95) {
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
