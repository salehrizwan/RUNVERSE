import React from 'react';
import { X, Check, MapPin } from 'lucide-react';
import { WorldId } from '../types/game';
import { WORLDS } from '../game/world/worldThemes';

interface WorldSelectModalProps {
  selectedWorld: WorldId;
  onSelectWorld: (worldId: WorldId) => void;
  onClose: () => void;
}

export const WorldSelectModal: React.FC<WorldSelectModalProps> = ({
  selectedWorld,
  onSelectWorld,
  onClose,
}) => {
  const worldList = Object.values(WORLDS);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl cyber-panel p-6 sm:p-8 rounded-2xl flex flex-col shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-display">
                SELECT WORLD
              </h2>
              <p className="text-xs text-slate-400">
                Choose your track environment & visual aesthetic
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Worlds Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {worldList.map((world) => {
            const isSelected = selectedWorld === world.id;
            return (
              <div
                key={world.id}
                onClick={() => onSelectWorld(world.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                }`}
              >
                {/* World Theme Tag */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded tracking-wider uppercase"
                    style={{
                      backgroundColor: `${world.colors.skyBottom}88`,
                      color: '#ffffff',
                      border: `1px solid ${world.colors.roadTrim.toString(16).padStart(6, '0')}`
                    }}
                  >
                    {world.badge}
                  </span>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-cyan-400 flex items-center justify-center text-slate-950">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* World Info */}
                <div>
                  <h3 className="text-lg font-black text-white font-display mb-0.5">
                    {world.name}
                  </h3>
                  <div className="text-xs text-cyan-400/90 font-medium mb-2">
                    {world.subtitle}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {world.description}
                  </p>
                </div>

                {/* Road Trim Color Bar */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-mono uppercase">
                    Track Lighting
                  </span>
                  <div
                    className="h-2 flex-1 rounded-full shadow-sm"
                    style={{
                      background: `linear-gradient(90deg, #${world.colors.roadTrim.toString(16).padStart(6, '0')}, #${world.colors.neonGlow.toString(16).padStart(6, '0')})`
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black font-display tracking-wide uppercase transition-all shadow-lg active:scale-95 cursor-pointer"
        >
          CONFIRM SELECTION
        </button>
      </div>
    </div>
  );
};
