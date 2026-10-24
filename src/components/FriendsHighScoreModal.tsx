import React from 'react';
import { X, Trophy, Users, Calendar, Award } from 'lucide-react';
import { CombinedHighScoreRecord } from '../types/game';

interface FriendsHighScoreModalProps {
  records: CombinedHighScoreRecord[];
  personalBest: number;
  bestDistance: number;
  onClose: () => void;
}

export const FriendsHighScoreModal: React.FC<FriendsHighScoreModalProps> = ({
  records,
  personalBest,
  bestDistance,
  onClose,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl cyber-panel p-6 sm:p-8 rounded-2xl flex flex-col shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-950 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-display">
                FRIENDS HIGH SCORES
              </h2>
              <p className="text-xs text-slate-400">
                Co-op combined records & individual hall of fame
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

        {/* Solo Personal Records Strip */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">
                SOLO PERSONAL BEST
              </div>
              <div className="text-xl font-black text-cyan-300 font-display">
                {personalBest.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">
                MAX DISTANCE
              </div>
              <div className="text-xl font-black text-blue-300 font-display">
                {bestDistance}m
              </div>
            </div>
          </div>
        </div>

        {/* Combined Co-Op Session Records */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase font-display">
              TOP 2-PLAYER COMBINED SESSIONS
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Sum of both runners' finalized scores
            </span>
          </div>

          {records.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs font-mono">
              No multiplayer sessions recorded yet. Play with friends to log combined records!
            </div>
          ) : (
            records.map((rec, index) => (
              <div
                key={rec.id || index}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-display font-black text-xs ${
                      index === 0
                        ? 'bg-amber-400 text-slate-950 shadow-md'
                        : index === 1
                        ? 'bg-slate-300 text-slate-950'
                        : index === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    #{index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white font-display flex items-center gap-2">
                      <span>{rec.player1Name}</span>
                      <span className="text-slate-500 text-xs">&</span>
                      <span>{rec.player2Name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                      <span className="text-cyan-400 font-bold uppercase">{rec.worldId}</span>
                      <span>•</span>
                      <span>P1: {rec.score1.toLocaleString()}</span>
                      <span>•</span>
                      <span>P2: {rec.score2.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-amber-300 font-display">
                    {rec.combinedScore.toLocaleString()}
                  </div>
                  <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 font-mono">
                    <Calendar className="w-3 h-3" />
                    <span>{rec.date}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold font-display uppercase tracking-wider transition-all cursor-pointer"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};
