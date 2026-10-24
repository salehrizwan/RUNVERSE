import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw, Home, Trophy, Coins, Award, Compass, Sparkles, ArrowRight } from 'lucide-react';

interface GameOverModalProps {
  score: number;
  distance: number;
  coins: number;
  reason: string;
  isNewBest: boolean;
  personalBest: number;
  previousBest: number;
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
  previousBest,
  onRestart,
  onMainMenu,
}) => {
  useEffect(() => {
    if (isNewBest) {
      // Check reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReducedMotion) {
        try {
          // Colorful confetti party poppers from left and right
          confetti({
            particleCount: 70,
            angle: 60,
            spread: 55,
            origin: { x: 0.1, y: 0.7 }
          });
          confetti({
            particleCount: 70,
            angle: 120,
            spread: 55,
            origin: { x: 0.9, y: 0.7 }
          });
        } catch {}
      }
    }
  }, [isNewBest]);

  // 1. DEDICATED NEW PERSONAL BEST CELEBRATION POPUP
  if (isNewBest) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-full max-w-lg cyber-panel p-6 sm:p-8 rounded-2xl flex flex-col items-center text-center shadow-[0_0_50px_rgba(245,158,11,0.3)] border-2 border-amber-400">
          {/* Trophy Header Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.6)] mb-4 animate-bounce">
            <Trophy className="w-9 h-9 stroke-[2.2]" />
          </div>

          {/* Required Celebration Text */}
          <span className="text-xs font-bold tracking-widest text-amber-400 uppercase font-display mb-1 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-300" />
            HALL OF FAME RECORD
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-500 font-display mb-1 tracking-wide">
            NEW PERSONAL BEST!
          </h2>
          <p className="text-sm sm:text-base text-slate-200 font-medium mb-6">
            Well done! You've set a new high score!
          </p>

          {/* High Score Comparison Cards */}
          <div className="grid grid-cols-2 gap-3 w-full mb-6">
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 flex flex-col items-center">
              <span className="text-[11px] uppercase font-bold text-slate-400 mb-1">
                Previous Best
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-300 font-display">
                {previousBest.toLocaleString()}
              </span>
            </div>

            <div className="bg-amber-950/40 border-2 border-amber-400/80 rounded-xl p-3.5 flex flex-col items-center shadow-lg">
              <span className="text-[11px] uppercase font-bold text-amber-300 mb-1">
                New Best
              </span>
              <span className="text-2xl sm:text-3xl font-black text-amber-300 font-display">
                {score.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Secondary Stats: Distance & Coins */}
          <div className="flex items-center justify-center gap-6 text-xs text-slate-300 font-mono mb-6 bg-slate-900/60 py-2 px-4 rounded-xl border border-slate-800 w-full">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Distance: <strong>{distance}m</strong></span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Coins: <strong>+{coins}</strong></span>
            </span>
          </div>

          {/* Buttons: Play Again & Continue / Return */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={onRestart}
              className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 font-black text-slate-950 font-display tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-transform active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-5 h-5 fill-slate-950" />
              PLAY AGAIN
            </button>

            <button
              onClick={onMainMenu}
              className="py-3.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 font-bold text-white font-display text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              CONTINUE
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. STANDARD GAME OVER POPUP (When no new record)
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
              {personalBest.toLocaleString()}
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
