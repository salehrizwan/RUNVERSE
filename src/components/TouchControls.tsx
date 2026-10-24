import React from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Zap, ShieldAlert, Wind } from 'lucide-react';

interface TouchControlsProps {
  onLeft: () => void;
  onRight: () => void;
  onJump: () => void;
  onSlide: () => void;
  onBoost?: (active: boolean) => void;
  onBrake?: (active: boolean) => void;
  isGliding?: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onLeft,
  onRight,
  onJump,
  onSlide,
  onBoost,
  onBrake,
  isGliding = false,
}) => {
  return (
    <div className="absolute inset-x-0 bottom-4 pointer-events-none z-20 flex flex-col gap-2.5 px-4 sm:px-6 select-none">
      {/* Upper Speed Control Bar (Boost & Brake) */}
      <div className="flex justify-between items-center pointer-events-auto max-w-md mx-auto w-full px-2">
        {onBrake && (
          <button
            onTouchStart={(e) => { e.preventDefault(); onBrake(true); }}
            onTouchEnd={(e) => { e.preventDefault(); onBrake(false); }}
            onMouseDown={() => onBrake(true)}
            onMouseUp={() => onBrake(false)}
            onMouseLeave={() => onBrake(false)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900/85 border border-rose-500/50 text-rose-300 text-xs font-bold active:bg-rose-500/30 backdrop-blur-md shadow-lg active:scale-95 transition-all cursor-pointer"
            aria-label="Brake"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>BRAKE (Q)</span>
          </button>
        )}

        {onBoost && (
          <button
            onTouchStart={(e) => { e.preventDefault(); onBoost(true); }}
            onTouchEnd={(e) => { e.preventDefault(); onBoost(false); }}
            onMouseDown={() => onBoost(true)}
            onMouseUp={() => onBoost(false)}
            onMouseLeave={() => onBoost(false)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900/85 border border-amber-500/50 text-amber-300 text-xs font-bold active:bg-amber-500/30 backdrop-blur-md shadow-lg active:scale-95 transition-all cursor-pointer"
            aria-label="Boost"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
            <span>BOOST (SHIFT)</span>
          </button>
        )}
      </div>

      {/* Main Runner Directional & Action Buttons */}
      <div className="flex justify-between items-end w-full">
        {/* Left/Right Lane Buttons */}
        <div className="flex gap-2.5 pointer-events-auto">
          <button
            onTouchStart={(e) => { e.preventDefault(); onLeft(); }}
            onClick={onLeft}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-slate-900/85 border border-cyan-500/50 active:bg-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-xl backdrop-blur-md active:scale-95 cursor-pointer"
            aria-label="Move Left"
          >
            <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); onRight(); }}
            onClick={onRight}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-slate-900/85 border border-cyan-500/50 active:bg-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-xl backdrop-blur-md active:scale-95 cursor-pointer"
            aria-label="Move Right"
          >
            <ArrowRight className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        </div>

        {/* Jump / Slide (or Glider Dive) Buttons */}
        <div className="flex gap-2.5 pointer-events-auto">
          <button
            onTouchStart={(e) => { e.preventDefault(); onJump(); }}
            onClick={onJump}
            disabled={isGliding}
            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl border flex items-center justify-center shadow-xl backdrop-blur-md active:scale-95 cursor-pointer transition-opacity ${
              isGliding
                ? 'bg-slate-900/40 border-slate-700 text-slate-500 opacity-40'
                : 'bg-slate-900/85 border-amber-500/50 text-amber-300 active:bg-amber-500/30'
            }`}
            aria-label="Jump"
          >
            <ArrowUp className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); onSlide(); }}
            onClick={onSlide}
            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl border flex items-center justify-center shadow-xl backdrop-blur-md active:scale-95 cursor-pointer ${
              isGliding
                ? 'bg-purple-950/90 border-purple-400 text-purple-200 active:bg-purple-500/40 animate-pulse'
                : 'bg-slate-900/85 border-pink-500/50 text-pink-300 active:bg-pink-500/30'
            }`}
            aria-label={isGliding ? 'Dive / Drop Glider' : 'Slide'}
            title={isGliding ? 'Dive Down' : 'Slide Under Barrier'}
          >
            {isGliding ? <Wind className="w-6 h-6 sm:w-7 sm:h-7" /> : <ArrowDown className="w-6 h-6 sm:w-7 sm:h-7" />}
          </button>
        </div>
      </div>
    </div>
  );
};
