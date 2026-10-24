import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onMainMenu,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm cyber-panel p-6 sm:p-8 rounded-2xl flex flex-col items-center text-center shadow-2xl">
        <span className="text-xs font-bold tracking-widest text-cyan-400 uppercase font-display mb-1">
          SIMULATION PAUSED
        </span>
        <h2 className="text-3xl font-black text-white font-display mb-6 tracking-wide">
          SYSTEM HOLD
        </h2>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onResume}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 font-bold text-slate-950 font-display flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            RESUME (ESC)
          </button>

          <button
            onClick={onRestart}
            className="w-full py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 font-semibold text-white font-display flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-cyan-400" />
            RESTART RUN
          </button>

          <button
            onClick={onToggleMute}
            className="w-full py-2.5 px-6 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 font-semibold text-slate-300 font-display flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-rose-400" />
                UNMUTE AUDIO
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                MUTE AUDIO
              </>
            )}
          </button>

          <button
            onClick={onMainMenu}
            className="w-full py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 font-semibold text-slate-300 hover:text-white font-display flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer mt-2"
          >
            <Home className="w-4 h-4" />
            QUIT TO MENU
          </button>
        </div>
      </div>
    </div>
  );
};
