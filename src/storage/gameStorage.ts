import { UserSaveData, CharacterId, WorldId, CombinedHighScoreRecord } from '../types/game';

const STORAGE_KEY = 'runverse_save_data_v1';

const DEFAULT_SAVE: UserSaveData = {
  coins: 100, // Starting bonus
  personalBest: 0,
  bestDistance: 0,
  unlockedCharacters: ['cyber_dash'],
  selectedCharacter: 'cyber_dash',
  selectedWorld: 'neon',
  playerName: 'Runner_' + Math.floor(1000 + Math.random() * 9000),
  musicVolume: 0.7,
  sfxVolume: 0.8,
  graphicsQuality: 'high',
  showTouchControls: false,
  friendsHighScores: [
    {
      id: 'demo-1',
      player1Name: 'NeoRunner',
      player2Name: 'CyberViper',
      score1: 4250,
      score2: 3820,
      combinedScore: 8070,
      worldId: 'neon',
      date: '2026-10-20'
    },
    {
      id: 'demo-2',
      player1Name: 'ApexRider',
      player2Name: 'VoltStrike',
      score1: 3100,
      score2: 2950,
      combinedScore: 6050,
      worldId: 'jungle',
      date: '2026-10-22'
    }
  ]
};

export function loadSaveData(): UserSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SAVE,
      ...parsed,
      // Ensure default character is always unlocked
      unlockedCharacters: Array.from(new Set([...(parsed.unlockedCharacters || []), 'cyber_dash']))
    };
  } catch (err) {
    console.warn('Failed to load save data, using defaults', err);
    return { ...DEFAULT_SAVE };
  }
}

export function saveSaveData(data: UserSaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save to localStorage', err);
  }
}

export function recordRunStats(score: number, distance: number, coinsEarned: number): { isNewPersonalBest: boolean; totalCoins: number } {
  const current = loadSaveData();
  const isNewPersonalBest = score > current.personalBest;
  
  const updated: UserSaveData = {
    ...current,
    personalBest: Math.max(current.personalBest, score),
    bestDistance: Math.max(current.bestDistance, distance),
    coins: current.coins + coinsEarned
  };
  
  saveSaveData(updated);
  return { isNewPersonalBest, totalCoins: updated.coins };
}

export function recordFriendScore(record: CombinedHighScoreRecord): void {
  const current = loadSaveData();
  const updatedList = [record, ...current.friendsHighScores]
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, 20); // Keep top 20
  
  saveSaveData({
    ...current,
    friendsHighScores: updatedList
  });
}

export function unlockCharacter(characterId: CharacterId, cost: number): boolean {
  const current = loadSaveData();
  if (current.unlockedCharacters.includes(characterId)) return true;
  if (current.coins < cost) return false;
  
  const updated: UserSaveData = {
    ...current,
    coins: current.coins - cost,
    unlockedCharacters: [...current.unlockedCharacters, characterId],
    selectedCharacter: characterId
  };
  saveSaveData(updated);
  return true;
}
