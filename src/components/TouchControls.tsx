import React from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';

interface TouchControlsProps {
  onLeft: () => void;
  onRight: () => void;
  onJump: () => void;
  onSlide: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onLeft,
  onRight,
  onJump,
  onSlide,
}) => {
  return (
    <div className="absolute inset-x-0 bottom-6 pointer-events-none z-20 flex justify-between px-6 select-none">
      {/* Left/Right Lane Buttons */}
      <div className="flex gap-3 pointer-events-auto">
        <button
          onTouchStart={(e) => { e.preventDefault(); onLeft(); }}
          onClick={onLeft}
          className="w-14 h-14 rounded-2xl bg-slate-900/80 border border-cyan-500/50 active:bg-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-xl backdrop-blur-md active:scale-95"
          aria-label="Move Left"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
        <button
          onTouchStart={(e) => { e.preventDefault(); onRight(); }}
          onClick={onRight}
          className="w-14 h-14 rounded-2xl bg-slate-900/80 border border-cyan-500/50 active:bg-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-xl backdrop-blur-md active:scale-95"
          aria-label="Move Right"
        >
          <ArrowRight className="w-7 h-7" />
        </button>
      </div>

      {/* Jump / Slide Buttons */}
      <div className="flex gap-3 pointer-events-auto">
        <button
          onTouchStart={(e) => { e.preventDefault(); onJump(); }}
          onClick={onJump}
          className="w-14 h-14 rounded-2xl bg-slate-900/80 border border-amber-500/50 active:bg-amber-500/30 flex items-center justify-center text-amber-300 shadow-xl backdrop-blur-md active:scale-95"
          aria-label="Jump"
        >
          <ArrowUp className="w-7 h-7" />
        </button>
        <button
          onTouchStart={(e) => { e.preventDefault(); onSlide(); }}
          onClick={onSlide}
          className="w-14 h-14 rounded-2xl bg-slate-900/80 border border-pink-500/50 active:bg-pink-500/30 flex items-center justify-center text-pink-300 shadow-xl backdrop-blur-md active:scale-95"
          aria-label="Slide"
        >
          <ArrowDown className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};
