import React from 'react';
import { Pause, Shield, Magnet, Zap, Coins, Flame, Trophy, Sparkles, Timer, Wind } from 'lucide-react';
import { MultiplayerPlayerState } from '../types/game';

interface HUDProps {
  score: number;
  distance: number;
  coins: number;
  speed: number;
  activeRunTime: number;
  personalBest: number;
  activeShield: boolean;
  magnetTimer: number;
  multiplierTimer: number;
  hoverboardTimer: number;
  gliderTimer: number;
  opponent: MultiplayerPlayerState | null;
  onPause: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  score,
  distance,
  coins,
  speed,
  activeRunTime,
  personalBest,
  activeShield,
  magnetTimer,
  multiplierTimer,
  hoverboardTimer,
  gliderTimer,
  opponent,
  onPause,
}) => {
  const isFirstRun = personalBest === 0;
  const countdown = Math.max(0, personalBest - score);
  const isRecordBroken = !isFirstRun && countdown === 0;

  // Relative distance in multiplayer
  const relDist = opponent ? Math.round((opponent.distance || 0) - distance) : 0;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-6 select-none z-10 overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-start justify-between w-full gap-2">
        {/* Left: Score, Time & Speed Progression */}
        <div className="flex flex-col gap-0.5 sm:gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] sm:text-xs uppercase tracking-widest text-cyan-400 font-semibold font-display">
              SCORE (2 PTS / SEC)
            </span>
            {multiplierTimer > 0 && (
              <span className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider animate-pulse">
                2X TIME BOOST
              </span>
            )}
            {gliderTimer > 0 && (
              <span className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                GLIDER FLIGHT
              </span>
            )}
          </div>
          <div className="text-3xl sm:text-5xl font-black tracking-tight text-white font-display drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            {score.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-300 font-medium">
            <span className="flex items-center gap-1">
              <span className="text-cyan-400 font-bold">{distance}m</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-400 font-mono">
              <Timer className="w-3 h-3 text-cyan-400" />
              <span>{activeRunTime.toFixed(1)}s</span>
            </span>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-400 font-bold font-mono">{speed}</span>
              <span className="text-[11px] text-slate-400">m/s</span>
            </div>
          </div>
        </div>

        {/* Center: Record Countdown Widget */}
        <div className="pointer-events-auto flex flex-col items-center">
          {isFirstRun ? (
            <div className="bg-slate-900/90 border border-cyan-500/40 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-lg backdrop-blur-md">
              <Trophy className="w-4 h-4 text-cyan-400" />
              <div className="flex flex-col text-center">
                <span className="text-[9px] uppercase font-bold text-cyan-400 tracking-wider">
                  FIRST RUN
                </span>
                <span className="text-xs font-black text-white font-display">
                  SET YOUR RECORD!
                </span>
              </div>
            </div>
          ) : isRecordBroken ? (
            <div className="bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border-2 border-amber-400 rounded-xl px-3.5 py-1.5 flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] backdrop-blur-md animate-pulse">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <div className="flex flex-col text-center">
                <span className="text-[10px] uppercase font-black text-amber-300 tracking-widest font-display">
                  NEW SCORE RECORD!
                </span>
                <span className="text-xs font-black text-white font-display">
                  +{score - personalBest} PTS LEAD
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-1.5 flex items-center gap-2.5 shadow-lg backdrop-blur-md">
              <Trophy className="w-4 h-4 text-amber-400" />
              <div className="flex flex-col text-center">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-display">
                  RECORD TO BEAT ({personalBest} PTS)
                </span>
                <div className="flex items-baseline justify-center gap-1 font-display">
                  <span className="text-lg sm:text-xl font-black text-amber-300">
                    {countdown}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    PTS TO BEAT
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Opponent Telemetry (if in MP), Coins, & Pause */}
        <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
          {opponent && (
            <div className="hidden md:flex bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-1.5 items-center gap-2.5 backdrop-blur-sm shadow-xl">
              <div
                className="w-3 h-3 rounded-full shadow-sm"
                style={{ backgroundColor: opponent.assignedColor || '#ec4899' }}
              />
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white max-w-[80px] truncate">
                    {opponent.name}
                  </span>
                  {opponent.isAlive ? (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-1 rounded">
                      LIVE
                    </span>
                  ) : (
                    <span className="text-[9px] bg-rose-500/20 text-rose-400 font-bold px-1 rounded">
                      CRASHED
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono font-bold" style={{ color: relDist > 0 ? '#34d399' : '#f43f5e' }}>
                  {opponent.isAlive
                    ? relDist > 0
                      ? `+${relDist}m (Ahead)`
                      : `${relDist}m (Behind)`
                    : `Eliminated (${opponent.score} pts)`}
                </div>
              </div>
            </div>
          )}

          {/* Coin Badge */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-amber-500/40 px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
            <Coins className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="font-display font-black text-amber-300 text-xs sm:text-base">
              {coins}
            </span>
          </div>

          {/* Pause Button */}
          <button
            onClick={onPause}
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-900/80 hover:bg-cyan-950 border border-cyan-500/40 hover:border-cyan-400 flex items-center justify-center text-slate-200 hover:text-white transition-all shadow-lg active:scale-95 cursor-pointer"
            title="Pause Game (Esc)"
          >
            <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Opponent Bar (if in MP and on small screens) */}
      {opponent && (
        <div className="md:hidden pointer-events-auto self-center bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-1 flex items-center gap-2 backdrop-blur-sm shadow-lg mt-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: opponent.assignedColor || '#ec4899' }}
          />
          <span className="text-xs font-bold text-white max-w-[70px] truncate">{opponent.name}</span>
          <span className="text-xs font-mono font-bold" style={{ color: relDist > 0 ? '#34d399' : '#f43f5e' }}>
            {opponent.isAlive ? (relDist > 0 ? `+${relDist}m` : `${relDist}m`) : 'CRASHED'}
          </span>
        </div>
      )}

      {/* Bottom Floating Power-Up HUD Indicators */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 pb-2 sm:pb-4 pointer-events-none">
        {hoverboardTimer > 0 && (
          <div className="flex items-center gap-2 bg-emerald-950/90 border border-emerald-400/80 px-3.5 py-1.5 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] text-emerald-300 text-xs font-bold tracking-wide backdrop-blur-md">
            <span className="text-sm">🛹</span>
            <span>HOVERBOARD SHIELD ({Math.ceil(hoverboardTimer)}s)</span>
          </div>
        )}

        {gliderTimer > 0 && (
          <div className="flex items-center gap-2 bg-purple-950/90 border border-purple-400/80 px-3.5 py-1.5 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.3)] text-purple-300 text-xs font-bold tracking-wide backdrop-blur-md">
            <Wind className="w-4 h-4 text-purple-300 animate-pulse" />
            <span>GLIDER FLIGHT ({Math.ceil(gliderTimer)}s)</span>
          </div>
        )}

        {activeShield && (
          <div className="flex items-center gap-2 bg-cyan-950/90 border border-cyan-400/80 px-3.5 py-1.5 rounded-xl shadow-lg text-cyan-300 text-xs font-bold tracking-wide backdrop-blur-md">
            <Shield className="w-4 h-4 text-cyan-400 fill-cyan-400/20 animate-pulse" />
            <span>KINETIC SHIELD</span>
          </div>
        )}

        {magnetTimer > 0 && (
          <div className="flex items-center gap-2 bg-amber-950/90 border border-amber-400/80 px-3.5 py-1.5 rounded-xl shadow-lg text-amber-300 text-xs font-bold tracking-wide backdrop-blur-md">
            <Magnet className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>MAGNET ({Math.ceil(magnetTimer)}s)</span>
          </div>
        )}

        {multiplierTimer > 0 && (
          <div className="flex items-center gap-2 bg-pink-950/90 border border-pink-400/80 px-3.5 py-1.5 rounded-xl shadow-lg text-pink-300 text-xs font-bold tracking-wide backdrop-blur-md">
            <Zap className="w-4 h-4 text-pink-400 fill-pink-400/30" />
            <span>2X TIME BOOST ({Math.ceil(multiplierTimer)}s)</span>
          </div>
        )}
      </div>
    </div>
  );
};
