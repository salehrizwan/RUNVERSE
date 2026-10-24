import React, { useState, useEffect } from 'react';
import { X, Users, Copy, Check, Play, UserPlus, LogIn, ArrowRight } from 'lucide-react';
import { MultiplayerRoom, MultiplayerPlayerState, WorldId, CharacterId } from '../types/game';
import { MultiplayerManager } from '../multiplayer/multiplayerManager';

interface MultiplayerModalProps {
  multiplayerManager: MultiplayerManager;
  selectedWorld: WorldId;
  playerName: string;
  selectedCharacter: CharacterId;
  onStartMultiplayerSession: (room: MultiplayerRoom) => void;
  onClose: () => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  multiplayerManager,
  selectedWorld,
  playerName,
  selectedCharacter,
  onStartMultiplayerSession,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [currentRoom, setCurrentRoom] = useState<MultiplayerRoom | null>(multiplayerManager.getCurrentRoom());
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    multiplayerManager.updateProfile(playerName, selectedCharacter);

    const unsubscribe = multiplayerManager.onEvent((event) => {
      if (event.type === 'ROOM_CREATED' || event.type === 'PLAYER_JOINED' || event.type === 'PLAYER_READY') {
        setCurrentRoom({ ...event.room });
      } else if (event.type === 'SESSION_START') {
        setCurrentRoom({ ...event.room });
        setCountdown(event.countdown);
      } else if (event.type === 'PLAYER_LEFT') {
        setCurrentRoom(multiplayerManager.getCurrentRoom());
      }
    });

    return () => {
      unsubscribe();
    };
  }, [multiplayerManager, playerName, selectedCharacter]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      if (currentRoom) {
        onStartMultiplayerSession(currentRoom);
      }
    }
  }, [countdown, currentRoom, onStartMultiplayerSession]);

  const handleCreateRoom = () => {
    setErrorMsg('');
    const code = multiplayerManager.createRoom(selectedWorld);
    setCurrentRoom(multiplayerManager.getCurrentRoom());
  };

  const handleJoinRoom = () => {
    if (!roomCodeInput.trim()) {
      setErrorMsg('Please enter a room code.');
      return;
    }
    setErrorMsg('');
    const res = multiplayerManager.joinRoom(roomCodeInput);
    if (!res.success) {
      setErrorMsg(res.message);
    } else {
      setCurrentRoom(multiplayerManager.getCurrentRoom());
    }
  };

  const handleCopyCode = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleReady = () => {
    multiplayerManager.toggleReady();
    setCurrentRoom(multiplayerManager.getCurrentRoom());
  };

  const handleLeaveRoom = () => {
    multiplayerManager.leaveRoom();
    setCurrentRoom(null);
    setCountdown(null);
  };

  const localId = multiplayerManager.getPlayerId();
  const players = currentRoom ? Object.values(currentRoom.players) : [];
  const localPlayer = currentRoom ? currentRoom.players[localId] : null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl cyber-panel p-6 sm:p-8 rounded-2xl flex flex-col shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-500/50 flex items-center justify-center text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-display">
                MULTIPLAYER RUNNERS
              </h2>
              <p className="text-xs text-slate-400">
                Live 2-player synchronized endless run session
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (currentRoom) handleLeaveRoom();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Countdown Overlay when starting */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-black/90 rounded-2xl flex flex-col items-center justify-center z-20 animate-in fade-in">
            <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase font-display mb-2">
              SESSION LAUNCH IN
            </span>
            <span className="text-8xl font-black text-white font-display animate-ping">
              {countdown > 0 ? countdown : 'GO!'}
            </span>
          </div>
        )}

        {/* Mode Selector Tabs (if not yet in a room) */}
        {!currentRoom ? (
          <div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl mb-6 border border-slate-800">
              <button
                onClick={() => { setActiveTab('create'); setErrorMsg(''); }}
                className={`py-2.5 rounded-lg text-xs font-bold font-display uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'create'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                CREATE ROOM
              </button>
              <button
                onClick={() => { setActiveTab('join'); setErrorMsg(''); }}
                className={`py-2.5 rounded-lg text-xs font-bold font-display uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'join'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-4 h-4" />
                JOIN WITH CODE
              </button>
            </div>

            {activeTab === 'create' ? (
              <div className="flex flex-col items-center text-center py-4">
                <p className="text-sm text-slate-300 mb-6 max-w-sm">
                  Host an endless runner session in <span className="text-cyan-400 font-bold uppercase">{selectedWorld}</span>. A unique 5-letter code will be generated for your friend.
                </p>
                <button
                  onClick={handleCreateRoom}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-bold text-white font-display tracking-wide uppercase shadow-lg transition-transform active:scale-95 cursor-pointer"
                >
                  GENERATE ROOM CODE & HOST
                </button>
              </div>
            ) : (
              <div className="flex flex-col py-2">
                <label className="text-xs font-bold text-slate-300 font-display mb-2 uppercase tracking-wide">
                  ENTER 5-CHARACTER ROOM CODE
                </label>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    maxLength={5}
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. RNV7X"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 font-display text-center font-bold text-xl tracking-widest text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={handleJoinRoom}
                    className="px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 font-bold text-slate-950 font-display uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    JOIN
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                {errorMsg && (
                  <p className="text-xs text-rose-400 font-medium mb-2">{errorMsg}</p>
                )}
                <p className="text-xs text-slate-500 text-center">
                  Tip: Open a second tab in your browser and enter the host code to test simultaneous runs!
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Active Room Lobby */
          <div className="flex flex-col">
            {/* Room Code Display */}
            <div className="bg-slate-900/90 border border-purple-500/40 rounded-xl p-4 flex items-center justify-between mb-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                  ROOM CODE (SHARE WITH FRIEND)
                </span>
                <div className="text-3xl font-black text-white font-display tracking-widest">
                  {currentRoom.code}
                </div>
              </div>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold font-display uppercase tracking-wider transition-all cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'COPIED!' : 'COPY CODE'}
              </button>
            </div>

            {/* Players Status Box */}
            <div className="space-y-3 mb-6">
              <span className="text-xs font-bold text-slate-400 uppercase font-display">
                RUNNERS IN LOBBY ({players.length}/2)
              </span>

              {/* Player 1 (Host) */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-400/50 flex items-center justify-center font-black text-cyan-400 font-display text-xs">
                    P1
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white font-display">
                      {players[0]?.name || 'Waiting for host...'}
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">
                      Host • {players[0]?.characterId}
                    </span>
                  </div>
                </div>
                <div>
                  {players[0]?.isReady ? (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                      READY
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
                      NOT READY
                    </span>
                  )}
                </div>
              </div>

              {/* Player 2 (Guest) */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-pink-950 border border-pink-400/50 flex items-center justify-center font-black text-pink-400 font-display text-xs">
                    P2
                  </div>
                  <div>
                    {players[1] ? (
                      <>
                        <div className="text-sm font-bold text-white font-display">
                          {players[1].name}
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          Guest • {players[1].characterId}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-bold text-slate-500 font-display italic">
                          Waiting for friend to join...
                        </div>
                        <span className="text-[10px] text-slate-600 font-mono">
                          Share code {currentRoom.code}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  {players[1] ? (
                    players[1].isReady ? (
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                        READY
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
                        NOT READY
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-slate-500 font-mono">SLOT OPEN</span>
                  )}
                </div>
              </div>
            </div>

            {/* Ready / Start Action */}
            <div className="flex gap-3">
              <button
                onClick={handleToggleReady}
                className={`flex-1 py-3.5 rounded-xl font-bold font-display uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer ${
                  localPlayer?.isReady
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                {localPlayer?.isReady ? 'READY! WAITING FOR FRIEND' : 'SET AS READY'}
              </button>

              <button
                onClick={handleLeaveRoom}
                className="px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold font-display text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                LEAVE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
