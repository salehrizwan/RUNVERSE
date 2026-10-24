import * as THREE from 'three';
import { CharacterDef, CharacterId } from '../../types/game';

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  cyber_dash: {
    id: 'cyber_dash',
    name: 'CYBER DASH',
    title: 'Neon Velocity Operative',
    description: 'Specializes in high-mobility sprint telemetry and swift lane transitions.',
    cost: 0,
    unlockedByDefault: true,
    colorScheme: {
      primary: '#0284c7',   // Sky blue
      secondary: '#0f172a', // Deep slate
      glow: '#06b6d4',      // Neon cyan
      visor: '#f43f5e'      // Rose visor
    },
    stats: {
      speedBoost: 1.0,
      magnetBonus: 0,
      scoreMultiplier: 1.0
    }
  },
  blaze_runner: {
    id: 'blaze_runner',
    name: 'BLAZE RUNNER',
    title: 'Solar Core Sprinter',
    description: 'Powered by a miniature plasma fusion drive that attracts ambient coin energy.',
    cost: 250,
    unlockedByDefault: false,
    colorScheme: {
      primary: '#ea580c',   // Blaze orange
      secondary: '#1c1917', // Dark obsidian
      glow: '#fbbf24',      // Solar amber
      visor: '#fbbf24'
    },
    stats: {
      speedBoost: 1.05,
      magnetBonus: 2.0,
      scoreMultiplier: 1.1
    }
  },
  shadow_ninja: {
    id: 'shadow_ninja',
    name: 'SHADOW NINJA',
    title: 'Infiltrator Protocol',
    description: 'Sleek carbon-weave suit designed for razor-sharp agility and slide clearance.',
    cost: 500,
    unlockedByDefault: false,
    colorScheme: {
      primary: '#18181b',   // Carbon black
      secondary: '#3f3f46', // Gunmetal
      glow: '#ef4444',      // Crimson red
      visor: '#ef4444'
    },
    stats: {
      speedBoost: 1.1,
      magnetBonus: 3.0,
      scoreMultiplier: 1.25
    }
  },
  mecha_titan: {
    id: 'mecha_titan',
    name: 'MECHA TITAN',
    title: 'Heavy Frame Juggernaut',
    description: 'Armored titanium exoskeleton equipped with defensive kinetics and score boosters.',
    cost: 1000,
    unlockedByDefault: false,
    colorScheme: {
      primary: '#475569',   // Steel armor
      secondary: '#0f172a', // Midnight
      glow: '#10b981',      // Emerald plasma
      visor: '#10b981'
    },
    stats: {
      speedBoost: 1.15,
      magnetBonus: 4.0,
      scoreMultiplier: 1.5
    }
  }
};

export interface CharacterMeshController {
  rootGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  torso: THREE.Mesh;
  head: THREE.Group;
  visor: THREE.Mesh;
  nameSprite?: THREE.Sprite;
  jetpackGlow?: THREE.Mesh;
  shieldSphere: THREE.Mesh;
  magnetRings: THREE.Group;
  updateAnimation: (
    time: number,
    speed: number,
    isJumping: boolean,
    isSliding: boolean,
    isAlive: boolean,
    isCelebrating?: boolean,
    celebrationElapsed?: number
  ) => void;
  updateTag: (name: string, relativeDistText: string, color: string) => void;
  dispose: () => void;
}

/**
 * Creates a high-fidelity 3-12 part procedural character mesh group
 * with animated pivots for head, arms, legs, thruster, and shield.
 */
export function createCharacterModel(
  characterId: CharacterId = 'cyber_dash',
  isGhost: boolean = false,
  customAccentColor?: string,
  initialName?: string
): CharacterMeshController {
  const charDef = CHARACTERS[characterId] || CHARACTERS.cyber_dash;
  const root = new THREE.Group();
  root.name = `character_${characterId}`;

  const primaryCol = new THREE.Color(charDef.colorScheme.primary);
  const secondaryCol = new THREE.Color(charDef.colorScheme.secondary);
  const glowCol = customAccentColor ? new THREE.Color(customAccentColor) : new THREE.Color(charDef.colorScheme.glow);
  const visorCol = customAccentColor ? new THREE.Color(customAccentColor) : new THREE.Color(charDef.colorScheme.visor);

  const opacity = isGhost ? 0.85 : 1.0;
  const transparent = isGhost;

  // Shared Materials
  const armorMat = new THREE.MeshStandardMaterial({
    color: primaryCol,
    metalness: 0.65,
    roughness: 0.3,
    transparent,
    opacity
  });

  const undersuitMat = new THREE.MeshStandardMaterial({
    color: secondaryCol,
    metalness: 0.2,
    roughness: 0.7,
    transparent,
    opacity
  });

  const glowMat = new THREE.MeshStandardMaterial({
    color: glowCol,
    emissive: glowCol,
    emissiveIntensity: isGhost ? 1.4 : 1.8,
    roughness: 0.1,
    metalness: 0.8,
    transparent,
    opacity
  });

  const visorMat = new THREE.MeshStandardMaterial({
    color: visorCol,
    emissive: visorCol,
    emissiveIntensity: 2.0,
    roughness: 0.1,
    metalness: 0.9,
    transparent,
    opacity
  });

  // Pelvis / Hips (Base Center Pivot at Y = 0.9)
  const hips = new THREE.Group();
  hips.position.y = 0.88;
  root.add(hips);

  // Torso
  const torsoGeo = new THREE.BoxGeometry(0.55, 0.65, 0.32);
  const torso = new THREE.Mesh(torsoGeo, armorMat);
  torso.position.y = 0.35;
  torso.castShadow = !isGhost;
  hips.add(torso);

  // Chest Core / Arc Reactor (Accent glow)
  const coreGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16);
  coreGeo.rotateX(Math.PI / 2);
  const core = new THREE.Mesh(coreGeo, glowMat);
  core.position.set(0, 0.42, 0.17);
  hips.add(core);

  // Thruster Backpack on back
  const packGeo = new THREE.BoxGeometry(0.38, 0.48, 0.16);
  const pack = new THREE.Mesh(packGeo, undersuitMat);
  pack.position.set(0, 0.38, -0.22);
  hips.add(pack);

  // Thruster Nozzle Glows
  const thrusterGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.12, 12);
  const thrusterL = new THREE.Mesh(thrusterGeo, glowMat);
  thrusterL.position.set(-0.11, 0.18, -0.25);
  hips.add(thrusterL);

  const thrusterR = new THREE.Mesh(thrusterGeo, glowMat);
  thrusterR.position.set(0.11, 0.18, -0.25);
  hips.add(thrusterR);

  // Head Group
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.72; // Relative to hips
  hips.add(headGroup);

  const helmetGeo = new THREE.BoxGeometry(0.36, 0.38, 0.38);
  const helmet = new THREE.Mesh(helmetGeo, armorMat);
  helmet.position.y = 0.18;
  helmet.castShadow = !isGhost;
  headGroup.add(helmet);

  // Cyber Visor Strip
  const visorGeo = new THREE.BoxGeometry(0.34, 0.12, 0.12);
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 0.18, 0.18);
  headGroup.add(visor);

  // Left Leg (Pivot at hip)
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.16, 0, 0);
  hips.add(leftLeg);

  const thighGeo = new THREE.BoxGeometry(0.18, 0.44, 0.2);
  const thighL = new THREE.Mesh(thighGeo, armorMat);
  thighL.position.y = -0.22;
  thighL.castShadow = !isGhost;
  leftLeg.add(thighL);

  const shinGeo = new THREE.BoxGeometry(0.16, 0.44, 0.18);
  const shinL = new THREE.Mesh(shinGeo, undersuitMat);
  shinL.position.y = -0.64;
  shinL.castShadow = !isGhost;
  leftLeg.add(shinL);

  const bootGeo = new THREE.BoxGeometry(0.17, 0.12, 0.28);
  const bootL = new THREE.Mesh(bootGeo, armorMat);
  bootL.position.set(0, -0.82, 0.04);
  bootL.castShadow = !isGhost;
  leftLeg.add(bootL);

  // Right Leg (Pivot at hip)
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.16, 0, 0);
  hips.add(rightLeg);

  const thighR = new THREE.Mesh(thighGeo, armorMat);
  thighR.position.y = -0.22;
  thighR.castShadow = !isGhost;
  rightLeg.add(thighR);

  const shinR = new THREE.Mesh(shinGeo, undersuitMat);
  shinR.position.y = -0.64;
  shinR.castShadow = !isGhost;
  rightLeg.add(shinR);

  const bootR = new THREE.Mesh(bootGeo, armorMat);
  bootR.position.set(0, -0.82, 0.04);
  bootR.castShadow = !isGhost;
  rightLeg.add(bootR);

  // Left Arm (Pivot at shoulder)
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.35, 0.58, 0);
  hips.add(leftArm);

  const armGeo = new THREE.BoxGeometry(0.14, 0.62, 0.14);
  const armL = new THREE.Mesh(armGeo, armorMat);
  armL.position.y = -0.28;
  armL.castShadow = !isGhost;
  leftArm.add(armL);

  // Right Arm (Pivot at shoulder)
  const rightArm = new THREE.Group();
  rightArm.position.set(0.35, 0.58, 0);
  hips.add(rightArm);

  const armR = new THREE.Mesh(armGeo, armorMat);
  armR.position.y = -0.28;
  armR.castShadow = !isGhost;
  rightArm.add(armR);

  // Defensive Kinetic Shield (Hidden by default, activated on shield power-up)
  const shieldGeo = new THREE.SphereGeometry(1.2, 18, 18);
  const shieldMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.8,
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.35,
    wireframe: true
  });
  const shieldSphere = new THREE.Mesh(shieldGeo, shieldMat);
  shieldSphere.position.y = 0.9;
  shieldSphere.visible = false;
  root.add(shieldSphere);

  // Magnet rings indicator
  const magnetRings = new THREE.Group();
  const ringGeo = new THREE.TorusGeometry(0.9, 0.04, 8, 24);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.7 });
  const ring1 = new THREE.Mesh(ringGeo, ringMat);
  ring1.rotateX(Math.PI / 2);
  magnetRings.add(ring1);
  magnetRings.position.y = 0.9;
  magnetRings.visible = false;
  root.add(magnetRings);

  // Overhead Tag Sprite for Multiplayer
  let nameSprite: THREE.Sprite | undefined;
  let tagCanvas: HTMLCanvasElement | null = null;
  let tagCtx: CanvasRenderingContext2D | null = null;
  let tagTexture: THREE.CanvasTexture | null = null;

  if (isGhost) {
    tagCanvas = document.createElement('canvas');
    tagCanvas.width = 256;
    tagCanvas.height = 64;
    tagCtx = tagCanvas.getContext('2d');
    if (tagCtx) {
      tagTexture = new THREE.CanvasTexture(tagCanvas);
      const spriteMat = new THREE.SpriteMaterial({ map: tagTexture, transparent: true });
      nameSprite = new THREE.Sprite(spriteMat);
      nameSprite.scale.set(2.4, 0.6, 1);
      nameSprite.position.set(0, 2.4, 0);
      root.add(nameSprite);
    }
  }

  const updateTag = (name: string, relativeDistText: string, color: string) => {
    if (!tagCtx || !tagCanvas || !tagTexture) return;
    tagCtx.clearRect(0, 0, 256, 64);

    // Rounded background box
    tagCtx.fillStyle = 'rgba(10, 15, 30, 0.85)';
    tagCtx.strokeStyle = color || '#38bdf8';
    tagCtx.lineWidth = 3;
    tagCtx.beginPath();
    tagCtx.roundRect(4, 4, 248, 56, 12);
    tagCtx.fill();
    tagCtx.stroke();

    // Color dot indicator
    tagCtx.fillStyle = color || '#38bdf8';
    tagCtx.beginPath();
    tagCtx.arc(24, 32, 8, 0, Math.PI * 2);
    tagCtx.fill();

    // Name & Distance
    tagCtx.fillStyle = '#ffffff';
    tagCtx.font = 'bold 20px sans-serif';
    tagCtx.fillText(name.slice(0, 10), 40, 28);

    tagCtx.fillStyle = '#38bdf8';
    tagCtx.font = 'bold 16px sans-serif';
    tagCtx.fillText(relativeDistText, 40, 50);

    tagTexture.needsUpdate = true;
  };

  // Animation Update function
  const updateAnimation = (
    time: number,
    speed: number,
    isJumping: boolean,
    isSliding: boolean,
    isAlive: boolean,
    isCelebrating?: boolean,
    celebrationElapsed: number = 0
  ) => {
    // 1. Victory Celebration Animation
    if (isCelebrating) {
      if (celebrationElapsed < 0.6) {
        // Fast energetic run-up
        const sprintSwing = Math.sin(time * 26);
        hips.position.y = 0.88 + Math.abs(Math.cos(time * 26)) * 0.12;
        hips.rotation.x = 0.1;
        hips.rotation.z = 0;
        leftLeg.rotation.x = sprintSwing * 0.9;
        rightLeg.rotation.x = -sprintSwing * 0.9;
        leftArm.rotation.x = -sprintSwing * 1.0;
        rightArm.rotation.x = sprintSwing * 1.0;
        headGroup.rotation.x = -0.1;
      } else if (celebrationElapsed < 1.6) {
        // Upward Victory Jump Arc!
        const jumpProgress = (celebrationElapsed - 0.6) / 1.0;
        const jumpHeight = Math.sin(jumpProgress * Math.PI) * 2.2;
        hips.position.y = 0.88 + jumpHeight;
        hips.rotation.x = THREE.MathUtils.damp(hips.rotation.x, -0.15, 10, 0.016);
        
        // Arms raise high in triumphant 'V' victory pose!
        leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, -2.6, 12, 0.016);
        rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -2.6, 12, 0.016);
        leftArm.rotation.z = -0.4;
        rightArm.rotation.z = 0.4;

        // Legs tuck together
        leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0.5, 10, 0.016);
        rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0.5, 10, 0.016);
        headGroup.rotation.x = -0.3; // Looking up proudly
      } else {
        // Safe athletic triumphant landing pose
        hips.position.y = THREE.MathUtils.damp(hips.position.y, 0.55, 12, 0.016);
        hips.rotation.x = 0.2;
        leftLeg.rotation.x = -0.4;
        rightLeg.rotation.x = 0.6;
        
        // Right fist pumping high in the air
        rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -2.8, 12, 0.016);
        rightArm.rotation.z = 0.2;
        leftArm.rotation.x = 0.4; // Resting on thigh
        leftArm.rotation.z = -0.2;
        headGroup.rotation.x = -0.2;
      }
      return;
    }

    if (!isAlive) {
      // Knockout ragdoll pose
      hips.position.y = THREE.MathUtils.damp(hips.position.y, 0.25, 10, 0.016);
      hips.rotation.x = THREE.MathUtils.damp(hips.rotation.x, -Math.PI / 2.2, 10, 0.016);
      hips.rotation.z = THREE.MathUtils.damp(hips.rotation.z, 0.3, 10, 0.016);
      return;
    }

    if (isSliding) {
      // Slide pose: lower hips, lean back, extend legs forward
      hips.position.y = THREE.MathUtils.damp(hips.position.y, 0.38, 15, 0.016);
      hips.rotation.x = THREE.MathUtils.damp(hips.rotation.x, -0.9, 15, 0.016);
      
      leftLeg.rotation.x = -0.7;
      rightLeg.rotation.x = -0.5;
      leftArm.rotation.x = 0.5;
      rightArm.rotation.x = 0.5;
      headGroup.rotation.x = 0.4;
      return;
    }

    if (isJumping) {
      // Jump pose: legs tucked slightly, arms raised for balance
      hips.position.y = THREE.MathUtils.damp(hips.position.y, 0.88, 12, 0.016);
      hips.rotation.x = THREE.MathUtils.damp(hips.rotation.x, 0.15, 12, 0.016);
      
      leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, -0.5, 12, 0.016);
      rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, -0.6, 12, 0.016);
      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, 0.8, 12, 0.016);
      rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, 0.8, 12, 0.016);
      return;
    }

    // Normal running stride loop
    hips.rotation.x = THREE.MathUtils.damp(hips.rotation.x, 0.05, 12, 0.016);
    hips.rotation.z = THREE.MathUtils.damp(hips.rotation.z, 0, 12, 0.016);

    // Stride cadence scales with running speed
    const strideFreq = Math.min(22, 9 + speed * 0.45);
    const swing = Math.sin(time * strideFreq);

    // Alternate leg and arm swings
    leftLeg.rotation.x = swing * 0.75;
    rightLeg.rotation.x = -swing * 0.75;

    leftArm.rotation.x = -swing * 0.85;
    rightArm.rotation.x = swing * 0.85;
    leftArm.rotation.z = 0;
    rightArm.rotation.z = 0;

    // Slight torso bobbing
    hips.position.y = 0.88 + Math.abs(Math.cos(time * strideFreq)) * 0.08;
    headGroup.rotation.x = -Math.abs(swing) * 0.05;
  };

  const dispose = () => {
    // Dispose geometries and materials
    [torsoGeo, coreGeo, packGeo, thrusterGeo, helmetGeo, visorGeo, thighGeo, shinGeo, bootGeo, armGeo, shieldGeo, ringGeo].forEach(g => g.dispose());
    [armorMat, undersuitMat, glowMat, visorMat, shieldMat, ringMat].forEach(m => m.dispose());
    if (tagTexture) tagTexture.dispose();
  };

  return {
    rootGroup: root,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    torso,
    head: headGroup,
    visor,
    nameSprite,
    shieldSphere,
    magnetRings,
    updateAnimation,
    updateTag,
    dispose
  };
}
