import React from 'react';
import { Pause, Shield, Magnet, Zap, Coins, Flame, User, Trophy } from 'lucide-react';
import { MultiplayerPlayerState } from '../types/game';

interface HUDProps {
  score: number;
  distance: number;
  coins: number;
  speed: number;
  activeShield: boolean;
  magnetTimer: number;
  multiplierTimer: number;
  opponent: MultiplayerPlayerState | null;
  onPause: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  score,
  distance,
  coins,
  speed,
  activeShield,
  magnetTimer,
  multiplierTimer,
  opponent,
  onPause,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-6 select-none z-10">
      {/* Top Header Bar */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Score & Multiplier */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-cyan-400 font-semibold font-display">
              SCORE
            </span>
            {multiplierTimer > 0 && (
              <span className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                2X MULTIPLIER
              </span>
            )}
          </div>
          <div className="text-3xl sm:text-5xl font-black tracking-tight text-white font-display drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            {score.toLocaleString()}
          </div>
          <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-300 font-medium">
            <span className="flex items-center gap-1">
              <span className="text-cyan-400 font-bold">{distance}m</span> DISTANCE
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-400 font-bold">{speed}</span> m/s
            </span>
          </div>
        </div>

        {/* Center / Opponent Status Bar if in Multiplayer */}
        {opponent && (
          <div className="pointer-events-auto bg-slate-900/90 border border-cyan-500/40 rounded-xl px-4 py-2 flex items-center gap-3 backdrop-blur-sm shadow-xl">
            <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-400/60 flex items-center justify-center">
              <User className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white max-w-[90px] truncate">
                  {opponent.name}
                </span>
                {opponent.isAlive ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.2 rounded border border-emerald-500/40">
                    RUNNING
                  </span>
                ) : (
                  <span className="text-[10px] bg-rose-500/20 text-rose-400 font-bold px-1.5 py-0.2 rounded border border-rose-500/40">
                    CRASHED
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-300 font-display">
                Score: <span className="text-cyan-400 font-bold">{opponent.score}</span> ({opponent.distance}m)
              </div>
            </div>
          </div>
        )}

        {/* Right: Coins Bank & Pause Button */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Coin Badge */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-amber-500/40 px-3.5 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
            <Coins className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="font-display font-black text-amber-300 text-sm sm:text-base">
              {coins}
            </span>
          </div>

          {/* Pause Button */}
          <button
            onClick={onPause}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-900/80 hover:bg-cyan-950 border border-cyan-500/40 hover:border-cyan-400 flex items-center justify-center text-slate-200 hover:text-white transition-all shadow-lg active:scale-95"
            title="Pause Game (Esc)"
          >
            <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Bottom Floating Power-Up HUD Indicators */}
      <div className="flex items-center justify-center gap-3 pb-2 sm:pb-4 pointer-events-none">
        {activeShield && (
          <div className="flex items-center gap-2 bg-cyan-950/90 border border-cyan-400/80 px-3.5 py-1.5 rounded-lg shadow-lg text-cyan-300 text-xs font-bold tracking-wide">
            <Shield className="w-4 h-4 text-cyan-400 fill-cyan-400/20 animate-pulse" />
            <span>KINETIC SHIELD</span>
          </div>
        )}

        {magnetTimer > 0 && (
          <div className="flex items-center gap-2 bg-amber-950/90 border border-amber-400/80 px-3.5 py-1.5 rounded-lg shadow-lg text-amber-300 text-xs font-bold tracking-wide">
            <Magnet className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>MAGNET ({Math.ceil(magnetTimer)}s)</span>
          </div>
        )}

        {multiplierTimer > 0 && (
          <div className="flex items-center gap-2 bg-pink-950/90 border border-pink-400/80 px-3.5 py-1.5 rounded-lg shadow-lg text-pink-300 text-xs font-bold tracking-wide">
            <Zap className="w-4 h-4 text-pink-400 fill-pink-400/30" />
            <span>2X BOOST ({Math.ceil(multiplierTimer)}s)</span>
          </div>
        )}
      </div>
    </div>
  );
};
