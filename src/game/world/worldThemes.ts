import { WorldDef, WorldId } from '../../types/game';

export const WORLDS: Record<WorldId, WorldDef> = {
  neon: {
    id: 'neon',
    name: 'NEON CITY',
    subtitle: 'Cyberpunk Metropolis',
    description: 'High-speed cyber highway slicing through skyscrapers with holographic billboards, laser grids, and neon underglow.',
    badge: 'CYBERPUNK',
    available: true,
    colors: {
      fog: 0x070b19,
      skyTop: '#050814',
      skyBottom: '#0e1b38',
      road: 0x0f172a,
      roadTrim: 0x06b6d4, // Cyan
      ambient: 0x1e293b,
      keyLight: 0x38bdf8,
      neonGlow: 0xec4899, // Pink
      hazard: 0xf43f5e
    }
  },
  jungle: {
    id: 'jungle',
    name: 'JUNGLE RUINS',
    subtitle: 'Overgrown Temples',
    description: 'Ancient stone pathways woven through colossal mossy temple ruins, towering canopy trees, and mysterious tribal relics.',
    badge: 'ANCIENT',
    available: true,
    colors: {
      fog: 0x081c15,
      skyTop: '#081c15',
      skyBottom: '#1b4332',
      road: 0x2d372e,
      roadTrim: 0x52b788, // Emerald
      ambient: 0x1e3a2f,
      keyLight: 0xd8f3dc,
      neonGlow: 0x74c69d,
      hazard: 0xe07a5f
    }
  },
  frozen: {
    id: 'frozen',
    name: 'FROZEN PEAKS',
    subtitle: 'Glacial Abyss',
    description: 'Blizzard-swept glacial tracks between sheer icy spires, crystalline frost monoliths, and glowing auroras.',
    badge: 'GLACIAL',
    available: true,
    colors: {
      fog: 0x0b192c,
      skyTop: '#0a192f',
      skyBottom: '#1e3e62',
      road: 0x1e293b,
      roadTrim: 0x38bdf8, // Ice blue
      ambient: 0x1e293b,
      keyLight: 0xe0f2fe,
      neonGlow: 0x7dd3fc,
      hazard: 0xf472b6
    }
  },
  desert: {
    id: 'desert',
    name: 'DESERT RUSH',
    subtitle: 'Sunken Canyon',
    description: 'Scorching red rock canyon paths through golden sand dunes, crumbling sandstone arches, and ancient obelisks.',
    badge: 'WASTELAND',
    available: true,
    colors: {
      fog: 0x241408,
      skyTop: '#2b1704',
      skyBottom: '#582f0e',
      road: 0x3d2b1f,
      roadTrim: 0xf59e0b, // Amber
      ambient: 0x3d2b1f,
      keyLight: 0xfef3c7,
      neonGlow: 0xfbbf24,
      hazard: 0xef4444
    }
  }
};
