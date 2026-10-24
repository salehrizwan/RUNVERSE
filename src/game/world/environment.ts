import * as THREE from 'three';
import { WorldId } from '../../types/game';
import { WORLDS } from './worldThemes';

export interface WorldEnvironment {
  sceneGroup: THREE.Group;
  update: (playerZ: number, delta: number) => void;
  dispose: () => void;
}

/**
 * Creates dynamic environmental scenery (skyscrapers, temple ruins, ice glaciers, or canyon arches)
 * positioned along the endless runner highway.
 */
export function createWorldEnvironment(scene: THREE.Scene, worldId: WorldId): WorldEnvironment {
  const worldDef = WORLDS[worldId] || WORLDS.neon;
  const envGroup = new THREE.Group();
  envGroup.name = `env_${worldId}`;
  scene.add(envGroup);

  // Set scene background & fog
  scene.background = new THREE.Color(worldDef.colors.fog);
  scene.fog = new THREE.FogExp2(worldDef.colors.fog, 0.009);

  // Lighting Rig
  const hemiLight = new THREE.HemisphereLight(worldDef.colors.keyLight, worldDef.colors.ambient, 0.9);
  envGroup.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(worldDef.colors.keyLight, 1.4);
  dirLight.position.set(15, 30, -20);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 120;
  const d = 16;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.bias = -0.0005;
  envGroup.add(dirLight);

  // Decorative side structures pool (placed on left and right flanks of track)
  const sceneryObjects: THREE.Group[] = [];
  const sceneryCount = 28;
  const spacing = 18;

  // Material helpers for each world
  let sideMat1: THREE.Material;
  let sideMat2: THREE.Material;
  let glowMat: THREE.Material;

  if (worldId === 'neon') {
    sideMat1 = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.8, metalness: 0.3 });
    sideMat2 = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6, metalness: 0.5 });
    glowMat = new THREE.MeshStandardMaterial({
      color: worldDef.colors.roadTrim,
      emissive: worldDef.colors.roadTrim,
      emissiveIntensity: 1.5
    });
  } else if (worldId === 'jungle') {
    sideMat1 = new THREE.MeshStandardMaterial({ color: 0x243527, roughness: 0.9, metalness: 0.1 });
    sideMat2 = new THREE.MeshStandardMaterial({ color: 0x14281d, roughness: 0.8, metalness: 0.1 });
    glowMat = new THREE.MeshStandardMaterial({
      color: 0x52b788,
      emissive: 0x2d6a4f,
      emissiveIntensity: 0.6
    });
  } else if (worldId === 'frozen') {
    sideMat1 = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.3, metalness: 0.6 });
    sideMat2 = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.7 });
    glowMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.0
    });
  } else {
    // Desert
    sideMat1 = new THREE.MeshStandardMaterial({ color: 0x4a2810, roughness: 0.9, metalness: 0.1 });
    sideMat2 = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85, metalness: 0.1 });
    glowMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.8
    });
  }

  // Pre-generate reusable side structures
  for (let i = 0; i < sceneryCount; i++) {
    const group = new THREE.Group();
    const side = i % 2 === 0 ? -1 : 1;
    const xOffset = side * (8.5 + (i % 4) * 2.5);
    const zPos = -i * spacing;

    if (worldId === 'neon') {
      // Futuristic skyscraper tower
      const height = 24 + ((i * 7) % 35);
      const width = 6 + (i % 3) * 2;
      const bGeo = new THREE.BoxGeometry(width, height, width);
      const building = new THREE.Mesh(bGeo, (i % 2 === 0) ? sideMat1 : sideMat2);
      building.position.y = height / 2;
      group.add(building);

      // Neon vertical strip or billboard accent
      const stripGeo = new THREE.BoxGeometry(0.3, height * 0.7, 0.4);
      const strip = new THREE.Mesh(stripGeo, glowMat);
      strip.position.set(side * (width / 2 - 0.2), height * 0.5, 0);
      group.add(strip);

      // Holographic roof beacon
      if (i % 3 === 0) {
        const beaconGeo = new THREE.CylinderGeometry(0.2, 0.8, 4, 8);
        const beacon = new THREE.Mesh(beaconGeo, glowMat);
        beacon.position.y = height + 2;
        group.add(beacon);
      }
    } else if (worldId === 'jungle') {
      // Ancient stone temple ruins & jungle flora
      const height = 12 + ((i * 5) % 18);
      const pillarGeo = new THREE.CylinderGeometry(1.8, 2.2, height, 8);
      const pillar = new THREE.Mesh(pillarGeo, sideMat1);
      pillar.position.y = height / 2;
      group.add(pillar);

      // Overgrown stone block
      const ruinGeo = new THREE.BoxGeometry(4, 3, 4);
      const ruin = new THREE.Mesh(ruinGeo, sideMat2);
      ruin.position.set(0, 1.5, 2);
      group.add(ruin);

      // Tree foliage canopy
      const foliageGeo = new THREE.ConeGeometry(5, 7, 7);
      const foliage = new THREE.Mesh(foliageGeo, glowMat);
      foliage.position.y = height + 3.5;
      group.add(foliage);
    } else if (worldId === 'frozen') {
      // Glacial ice spire / crystal monolith
      const height = 18 + ((i * 6) % 24);
      const spireGeo = new THREE.ConeGeometry(3, height, 5);
      const spire = new THREE.Mesh(spireGeo, (i % 2 === 0) ? sideMat1 : sideMat2);
      spire.position.y = height / 2;
      group.add(spire);

      // Ice crystal accent
      const crystalGeo = new THREE.OctahedronGeometry(2);
      const crystal = new THREE.Mesh(crystalGeo, glowMat);
      crystal.position.set(0, height * 0.7, 1);
      group.add(crystal);
    } else {
      // Desert canyon rock monolith & arch
      const height = 14 + ((i * 5) % 20);
      const rockGeo = new THREE.BoxGeometry(7, height, 7);
      const rock = new THREE.Mesh(rockGeo, (i % 2 === 0) ? sideMat1 : sideMat2);
      rock.position.y = height / 2;
      group.add(rock);

      // Sandstone obelisk
      const obeliskGeo = new THREE.ConeGeometry(1.6, height * 0.9, 4);
      const obelisk = new THREE.Mesh(obeliskGeo, glowMat);
      obelisk.position.set(side * 2, height * 0.45, 0);
      group.add(obelisk);
    }

    group.position.set(xOffset, 0, zPos);
    envGroup.add(group);
    sceneryObjects.push(group);
  }

  // Update function to cycle scenery objects smoothly as player moves forward
  const totalSpan = sceneryCount * spacing;
  const update = (playerZ: number, _delta: number) => {
    // Keep directional light aligned with player for sharp shadows
    dirLight.position.z = playerZ - 25;
    dirLight.target.position.z = playerZ;
    dirLight.target.updateMatrixWorld();

    // Recycle scenery objects that have fallen behind the player
    sceneryObjects.forEach((obj) => {
      if (obj.position.z > playerZ + 25) {
        obj.position.z -= totalSpan;
      }
    });
  };

  const dispose = () => {
    scene.remove(envGroup);
    sideMat1.dispose();
    sideMat2.dispose();
    glowMat.dispose();
    sceneryObjects.forEach(obj => {
      obj.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose();
      });
    });
  };

  return {
    sceneGroup: envGroup,
    update,
    dispose
  };
}
