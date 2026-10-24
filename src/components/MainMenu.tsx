import React from 'react';
import { Play, Users, Globe, User, Trophy, Settings, Coins, Volume2, VolumeX, Flame } from 'lucide-react';
import { WorldId, CharacterId, UserSaveData } from '../types/game';
import { WORLDS } from '../game/world/worldThemes';
import { CHARACTERS } from '../game/characters/characterModels';

interface MainMenuProps {
  saveData: UserSaveData;
  onPlayOffline: () => void;
  onOpenMultiplayer: () => void;
  onOpenWorldSelect: () => void;
  onOpenCharacterSelect: () => void;
  onOpenHighScores: () => void;
  onOpenSettings: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  saveData,
  onPlayOffline,
  onOpenMultiplayer,
  onOpenWorldSelect,
  onOpenCharacterSelect,
  onOpenHighScores,
  onOpenSettings,
  isMuted,
  onToggleMute,
}) => {
  const currentWorld = WORLDS[saveData.selectedWorld] || WORLDS.neon;
  const currentChar = CHARACTERS[saveData.selectedCharacter] || CHARACTERS.cyber_dash;

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-8 select-none pointer-events-auto">
      {/* Top Bar: Player Profile & Coin Bank */}
      <div className="flex items-center justify-between w-full">
        {/* Callsign & Personal Best */}
        <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-2 sm:px-4 sm:py-2.5 backdrop-blur-md shadow-xl">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-slate-950 font-display text-base">
            {saveData.playerName.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white font-display tracking-wide">
              {saveData.playerName}
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">
              BEST: {saveData.personalBest.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Coins Bank & Quick Audio Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/80 border border-amber-500/40 px-4 py-2 rounded-2xl shadow-xl backdrop-blur-md">
            <Coins className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="font-display font-black text-amber-300 text-sm sm:text-base">
              {saveData.coins.toLocaleString()}
            </span>
          </div>

          <button
            onClick={onToggleMute}
            className="w-10 h-10 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-all shadow-xl cursor-pointer"
            title="Toggle Mute"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Center Branding & Hero Actions */}
      <div className="flex flex-col items-center justify-center max-w-md mx-auto w-full text-center my-auto">
        {/* Game Title */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 text-xs font-bold font-mono tracking-widest uppercase mb-3 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Flame className="w-3.5 h-3.5" /> 3D ENDLESS RUNNER
          </div>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-200 to-cyan-500 font-display drop-shadow-[0_4px_24px_rgba(6,182,212,0.5)]">
            RUNVERSE
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 tracking-wider font-mono mt-1">
            SPEED • REFLEXES • CO-OP TELEMETRY
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="w-full space-y-3">
          {/* PLAY OFFLINE (Primary CTA) */}
          <button
            onClick={onPlayOffline}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 font-black font-display text-lg tracking-wider uppercase shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center justify-center gap-3 transition-transform active:scale-95 cursor-pointer"
          >
            <Play className="w-6 h-6 fill-slate-950" />
            PLAY OFFLINE
          </button>

          {/* PLAY WITH FRIENDS (Multiplayer) */}
          <button
            onClick={onOpenMultiplayer}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black font-display text-base tracking-wider uppercase shadow-[0_0_20px_rgba(168,85,247,0.3)] flex items-center justify-center gap-3 transition-transform active:scale-95 cursor-pointer"
          >
            <Users className="w-5 h-5" />
            PLAY WITH FRIENDS
          </button>

          {/* Dual Options Grid: World & Character */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* World Select */}
            <button
              onClick={onOpenWorldSelect}
              className="py-3 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 flex flex-col items-center text-center transition-all cursor-pointer shadow-lg active:scale-95"
            >
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" /> WORLD
              </div>
              <span className="font-display font-black text-white text-xs sm:text-sm truncate w-full">
                {currentWorld.name}
              </span>
            </button>

            {/* Character Select */}
            <button
              onClick={onOpenCharacterSelect}
              className="py-3 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 flex flex-col items-center text-center transition-all cursor-pointer shadow-lg active:scale-95"
            >
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
                <User className="w-3.5 h-3.5 text-pink-400" /> CHARACTER
              </div>
              <span className="font-display font-black text-white text-xs sm:text-sm truncate w-full">
                {currentChar.name}
              </span>
            </button>
          </div>

          {/* Secondary Actions: High Scores & Settings */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onOpenHighScores}
              className="py-2.5 px-4 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 font-display flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              HIGH SCORES
            </button>

            <button
              onClick={onOpenSettings}
              className="py-2.5 px-4 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 font-display flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <Settings className="w-3.5 h-3.5 text-cyan-400" />
              SETTINGS
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Footer Controls Hint */}
      <div className="w-full flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span className="hidden sm:inline">CONTROLS: A/D/Arrows (Lane) • W/Space (Jump) • S (Slide)</span>
        <span className="sm:hidden">SWIPE OR USE BUTTONS TO RUN</span>
        <span className="text-cyan-400/80 font-bold">RUNVERSE v1.0 • THREE.JS 3D</span>
      </div>
    </div>
  );
};
