import React from 'react';
import { X, Volume2, Smartphone, Monitor, Shield, Sparkles } from 'lucide-react';
import { UserSaveData } from '../types/game';

interface SettingsModalProps {
  saveData: UserSaveData;
  onUpdateSettings: (updated: Partial<UserSaveData>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  saveData,
  onUpdateSettings,
  onClose,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl cyber-panel p-6 sm:p-8 rounded-2xl flex flex-col shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-display">
                SETTINGS & CONTROLS
              </h2>
              <p className="text-xs text-slate-400">
                Configure audio, display name, and player controls
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

        {/* Player Name Input */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-300 font-display uppercase tracking-wider mb-2">
            RUNNER DISPLAY CALLSIGN
          </label>
          <input
            type="text"
            maxLength={14}
            value={saveData.playerName}
            onChange={(e) => onUpdateSettings({ playerName: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-display text-sm focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Audio Volume Sliders */}
        <div className="space-y-4 mb-6 pt-4 border-t border-slate-800">
          <span className="text-xs font-bold text-slate-300 uppercase font-display block">
            AUDIO CHANNELS
          </span>

          <div>
            <div className="flex justify-between text-xs text-slate-400 font-mono mb-1.5">
              <span>Music Volume</span>
              <span className="text-cyan-400">{Math.round(saveData.musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={saveData.musicVolume}
              onChange={(e) => onUpdateSettings({ musicVolume: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 font-mono mb-1.5">
              <span>Sound Effects</span>
              <span className="text-amber-400">{Math.round(saveData.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={saveData.sfxVolume}
              onChange={(e) => onUpdateSettings({ sfxVolume: parseFloat(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Touch Controls Toggle */}
        <div className="flex items-center justify-between p-3.5 bg-slate-900 rounded-xl border border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-sm font-bold text-white font-display">
                ON-SCREEN TOUCH BUTTONS
              </div>
              <div className="text-xs text-slate-400">
                Display directional action buttons on mobile screens
              </div>
            </div>
          </div>
          <button
            onClick={() => onUpdateSettings({ showTouchControls: !saveData.showTouchControls })}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
              saveData.showTouchControls ? 'bg-cyan-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                saveData.showTouchControls ? 'left-6.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* Controls Reference Guide */}
        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 mb-6">
          <span className="text-xs font-bold text-slate-300 uppercase font-display block mb-3">
            CONTROLS MANUAL
          </span>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <div className="text-cyan-400 font-bold mb-1 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5" /> KEYBOARD
              </div>
              <ul className="space-y-1 text-slate-400">
                <li><span className="text-slate-200">A / ←</span> : Move Left</li>
                <li><span className="text-slate-200">D / →</span> : Move Right</li>
                <li><span className="text-slate-200">W / ↑ / Space</span> : Jump</li>
                <li><span className="text-slate-200">S / ↓</span> : Slide</li>
                <li><span className="text-slate-200">Esc / P</span> : Pause</li>
              </ul>
            </div>
            <div>
              <div className="text-pink-400 font-bold mb-1 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" /> MOBILE TOUCH
              </div>
              <ul className="space-y-1 text-slate-400">
                <li><span className="text-slate-200">Swipe Left</span> : Move Left</li>
                <li><span className="text-slate-200">Swipe Right</span> : Move Right</li>
                <li><span className="text-slate-200">Swipe Up</span> : Jump</li>
                <li><span className="text-slate-200">Swipe Down</span> : Slide</li>
                <li><span className="text-slate-200">Touch Pad</span> : Virtual D-Pad</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black font-display tracking-wide uppercase transition-all shadow-lg active:scale-95 cursor-pointer"
        >
          SAVE & CLOSE
        </button>
      </div>
    </div>
  );
};
