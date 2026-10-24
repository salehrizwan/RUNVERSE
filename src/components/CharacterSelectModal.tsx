import React from 'react';
import { X, Check, Lock, Coins, Zap, Shield, Flame, Gauge } from 'lucide-react';
import { CharacterId } from '../types/game';
import { CHARACTERS } from '../game/characters/characterModels';

interface CharacterSelectModalProps {
  selectedCharacter: CharacterId;
  unlockedCharacters: CharacterId[];
  userCoins: number;
  onSelectCharacter: (charId: CharacterId) => void;
  onUnlockCharacter: (charId: CharacterId, cost: number) => void;
  onClose: () => void;
}

export const CharacterSelectModal: React.FC<CharacterSelectModalProps> = ({
  selectedCharacter,
  unlockedCharacters,
  userCoins,
  onSelectCharacter,
  onUnlockCharacter,
  onClose,
}) => {
  const charList = Object.values(CHARACTERS);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl cyber-panel p-6 sm:p-8 rounded-2xl flex flex-col shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-display">
              CHARACTER ARSENAL
            </h2>
            <p className="text-xs text-slate-400">
              Select or unlock operatives with unique telemetry stats
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-amber-500/50 px-3 py-1 rounded-full">
              <Coins className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="font-display font-black text-amber-300 text-sm">
                {userCoins}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Characters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {charList.map((char) => {
            const isUnlocked = unlockedCharacters.includes(char.id);
            const isSelected = selectedCharacter === char.id;
            const canAfford = userCoins >= char.cost;

            return (
              <div
                key={char.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                    : isUnlocked
                    ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-950/60 border-slate-900 opacity-90'
                }`}
              >
                {/* Character Silhouette Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full border-2 border-slate-800 shadow-sm"
                      style={{ backgroundColor: char.colorScheme.primary }}
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: char.colorScheme.glow }}
                    />
                  </div>
                  {isSelected ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/40">
                      <Check className="w-3 h-3" /> EQUIPPED
                    </span>
                  ) : !isUnlocked ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                      <Lock className="w-3 h-3" /> {char.cost} COINS
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400">
                      UNLOCKED
                    </span>
                  )}
                </div>

                {/* Character Name & Info */}
                <div className="mb-4">
                  <h3 className="text-lg font-black text-white font-display">
                    {char.name}
                  </h3>
                  <div className="text-xs text-cyan-400 font-medium mb-1">
                    {char.title}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {char.description}
                  </p>
                </div>

                {/* Stats Breakdown */}
                <div className="space-y-1.5 pt-3 border-t border-slate-800/80 mb-4 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Speed Boost
                    </span>
                    <span className="font-bold text-cyan-300">
                      +{Math.round((char.stats.speedBoost - 1.0) * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> Magnet Range
                    </span>
                    <span className="font-bold text-amber-300">
                      +{char.stats.magnetBonus}s
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Flame className="w-3.5 h-3.5 text-pink-400" /> Score Mult
                    </span>
                    <span className="font-bold text-pink-300">
                      {char.stats.scoreMultiplier}x
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                {isUnlocked ? (
                  <button
                    onClick={() => onSelectCharacter(char.id)}
                    disabled={isSelected}
                    className={`w-full py-2.5 rounded-lg font-bold font-display text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 cursor-default'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    {isSelected ? 'CURRENTLY EQUIPPED' : 'SELECT OPERATIVE'}
                  </button>
                ) : (
                  <button
                    onClick={() => onUnlockCharacter(char.id, char.cost)}
                    disabled={!canAfford}
                    className={`w-full py-2.5 rounded-lg font-bold font-display text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      canAfford
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5 fill-current" />
                    {canAfford ? `UNLOCK FOR ${char.cost} COINS` : `NEED ${char.cost - userCoins} MORE COINS`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black font-display tracking-wide uppercase transition-all shadow-lg active:scale-95 cursor-pointer"
        >
          CONFIRM & RETURN
        </button>
      </div>
    </div>
  );
};
