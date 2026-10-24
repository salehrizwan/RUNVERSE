import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw, Home, Trophy, Coins, Award, Compass } from 'lucide-react';

interface GameOverModalProps {
  score: number;
  distance: number;
  coins: number;
  reason: string;
  isNewBest: boolean;
  personalBest: number;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  distance,
  coins,
  reason,
  isNewBest,
  personalBest,
  onRestart,
  onMainMenu,
}) => {
  useEffect(() => {
    if (isNewBest) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}
    }
  }, [isNewBest]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-md cyber-panel p-6 sm:p-8 rounded-2xl flex flex-col items-center text-center shadow-2xl border border-rose-500/40">
        {/* Run Over Header */}
        <span className="text-xs font-bold tracking-widest text-rose-400 uppercase font-display mb-1">
          TRAJECTORY TERMINATED
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-white font-display mb-2 tracking-wide">
          CRASH DETECTED
        </h2>
        <p className="text-xs text-rose-300/80 mb-6 font-mono">
          Cause: {reason || 'Obstacle Collision'}
        </p>

        {/* New Record Banner if applicable */}
        {isNewBest && (
          <div className="w-full mb-4 bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border border-amber-400/60 rounded-xl py-2 px-4 flex items-center justify-center gap-2 text-amber-300 font-bold text-sm tracking-wide animate-pulse">
            <Trophy className="w-5 h-5 text-amber-400" />
            NEW PERSONAL BEST!
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 w-full mb-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              <span>FINAL SCORE</span>
            </div>
            <span className="text-2xl font-black text-white font-display">
              {score.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              <span>DISTANCE</span>
            </div>
            <span className="text-2xl font-black text-blue-300 font-display">
              {distance}m
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>COINS EARNED</span>
            </div>
            <span className="text-2xl font-black text-amber-300 font-display">
              +{coins}
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Trophy className="w-3.5 h-3.5 text-purple-400" />
              <span>PERSONAL BEST</span>
            </div>
            <span className="text-2xl font-black text-purple-300 font-display">
              {Math.max(score, personalBest).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onRestart}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 font-bold text-slate-950 font-display flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5 fill-slate-950" />
            PLAY AGAIN
          </button>

          <button
            onClick={onMainMenu}
            className="w-full py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 font-semibold text-slate-300 hover:text-white font-display flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            RETURN TO MENU
          </button>
        </div>
      </div>
    </div>
  );
};
