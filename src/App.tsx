import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { WorldSelectModal } from './components/WorldSelectModal';
import { CharacterSelectModal } from './components/CharacterSelectModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import { FriendsHighScoreModal } from './components/FriendsHighScoreModal';
import { SettingsModal } from './components/SettingsModal';
import { TouchControls } from './components/TouchControls';

import { GameEngine } from './game/engine/GameEngine';
import { soundManager } from './game/audio/soundManager';
import { MultiplayerManager } from './multiplayer/multiplayerManager';
import {
  loadSaveData,
  saveSaveData,
  recordRunStats,
  recordFriendScore,
  unlockCharacter,
} from './storage/gameStorage';
import {
  GameStatus,
  WorldId,
  CharacterId,
  UserSaveData,
  MultiplayerPlayerState,
  MultiplayerRoom,
} from './types/game';

export default function App() {
  const [saveData, setSaveData] = useState<UserSaveData>(loadSaveData);
  const [gameStatus, setGameStatus] = useState<GameStatus>('menu');
  const [engine, setEngine] = useState<GameEngine | null>(null);

  // Active Modals
  const [showWorldSelect, setShowWorldSelect] = useState(false);
  const [showCharSelect, setShowCharSelect] = useState(false);
  const [showMultiplayer, setShowMultiplayer] = useState(false);
  const [showHighScores, setShowHighScores] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Run Stats
  const [currentScore, setCurrentScore] = useState(0);
  const [currentDistance, setCurrentDistance] = useState(0);
  const [runCoins, setRunCoins] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(18);
  const [activeShield, setActiveShield] = useState(false);
  const [magnetTimer, setMagnetTimer] = useState(0);
  const [multiplierTimer, setMultiplierTimer] = useState(0);

  // GameOver Details
  const [gameOverDetails, setGameOverDetails] = useState<{
    finalScore: number;
    finalDistance: number;
    coinsEarned: number;
    reason: string;
    isNewBest: boolean;
  }>({
    finalScore: 0,
    finalDistance: 0,
    coinsEarned: 0,
    reason: '',
    isNewBest: false,
  });

  // Audio State
  const [isMuted, setIsMuted] = useState(false);

  // Multiplayer Manager & Opponent State
  const mpManagerRef = useRef<MultiplayerManager | null>(null);
  const [opponentState, setOpponentState] = useState<MultiplayerPlayerState | null>(null);
  const [activeRoom, setActiveRoom] = useState<MultiplayerRoom | null>(null);

  // Initialize Multiplayer Manager
  if (!mpManagerRef.current) {
    mpManagerRef.current = new MultiplayerManager(
      saveData.playerName,
      saveData.selectedCharacter
    );
  }

  // Sync Audio Volumes on load & changes
  useEffect(() => {
    soundManager.setVolumes(
      isMuted ? 0 : saveData.musicVolume,
      isMuted ? 0 : saveData.sfxVolume
    );
  }, [saveData.musicVolume, saveData.sfxVolume, isMuted]);

  // Listen for Multiplayer events
  useEffect(() => {
    if (!mpManagerRef.current) return;
    const mp = mpManagerRef.current;

    const unsub = mp.onEvent((event) => {
      if (event.type === 'PLAYER_UPDATE') {
        const opp = mp.getOpponent();
        setOpponentState(opp ? { ...opp } : null);
      } else if (event.type === 'PLAYER_ELIMINATED') {
        const opp = mp.getOpponent();
        setOpponentState(opp ? { ...opp } : null);
      } else if (event.type === 'SESSION_COMPLETE') {
        // Record Friends High Score!
        if (event.room) {
          const players = Object.values(event.room.players);
          if (players.length >= 2) {
            recordFriendScore({
              id: 'sess_' + Date.now(),
              player1Name: players[0].name,
              player2Name: players[1].name,
              score1: players[0].score,
              score2: players[1].score,
              combinedScore: event.combinedScore,
              worldId: event.room.worldId,
              date: new Date().toISOString().split('T')[0],
            });
            setSaveData(loadSaveData());
          }
        }
      }
    });

    return () => {
      unsub();
    };
  }, []);

  // Engine Callbacks
  const handleScoreUpdate = useCallback(
    (score: number, distance: number, coins: number, speed: number) => {
      setCurrentScore(score);
      setCurrentDistance(distance);
      setRunCoins(coins);
      setCurrentSpeed(speed);
    },
    []
  );

  const handlePowerUpUpdate = useCallback(
    (shield: boolean, magnet: number, multiplier: number) => {
      setActiveShield(shield);
      setMagnetTimer(magnet);
      setMultiplierTimer(multiplier);
    },
    []
  );

  const handleGameOver = useCallback(
    (finalScore: number, finalDistance: number, coinsEarned: number, reason: string) => {
      const stats = recordRunStats(finalScore, finalDistance, coinsEarned);
      const updatedSave = loadSaveData();
      setSaveData(updatedSave);

      setGameOverDetails({
        finalScore,
        finalDistance,
        coinsEarned,
        reason,
        isNewBest: stats.isNewPersonalBest,
      });
      setGameStatus('gameover');

      // Notify multiplayer room of elimination
      if (mpManagerRef.current && activeRoom) {
        mpManagerRef.current.sendElimination(finalScore, finalDistance);
      }
    },
    [activeRoom]
  );

  const handlePlayerStateEmit = useCallback(
    (state: Partial<MultiplayerPlayerState>) => {
      if (mpManagerRef.current && activeRoom) {
        mpManagerRef.current.sendStateUpdate(state);
      }
    },
    [activeRoom]
  );

  const callbacks = {
    onScoreUpdate: handleScoreUpdate,
    onPowerUpUpdate: handlePowerUpUpdate,
    onGameOver: handleGameOver,
    onPlayerStateEmit: handlePlayerStateEmit,
  };

  // Game Actions
  const handleStartRun = () => {
    soundManager.ensureContext();
    setShowWorldSelect(false);
    setShowCharSelect(false);
    setShowMultiplayer(false);
    setShowHighScores(false);
    setShowSettings(false);

    if (engine) {
      engine.startRun();
      setGameStatus('running');
    }
  };

  const handlePause = () => {
    if (gameStatus === 'running' && engine) {
      engine.pause();
      setGameStatus('paused');
    }
  };

  const handleResume = () => {
    if (gameStatus === 'paused' && engine) {
      engine.resume();
      setGameStatus('running');
    }
  };

  const handleRestart = () => {
    handleStartRun();
  };

  const handleReturnToMenu = () => {
    soundManager.stopMusic();
    if (activeRoom && mpManagerRef.current) {
      mpManagerRef.current.leaveRoom();
      setActiveRoom(null);
      setOpponentState(null);
    }
    setGameStatus('menu');
  };

  // World & Character Selection
  const handleSelectWorld = (worldId: WorldId) => {
    const updated = { ...saveData, selectedWorld: worldId };
    saveSaveData(updated);
    setSaveData(updated);
    setShowWorldSelect(false);
  };

  const handleSelectCharacter = (charId: CharacterId) => {
    const updated = { ...saveData, selectedCharacter: charId };
    saveSaveData(updated);
    setSaveData(updated);
    if (mpManagerRef.current) {
      mpManagerRef.current.updateProfile(updated.playerName, charId);
    }
  };

  const handleUnlockCharacter = (charId: CharacterId, cost: number) => {
    const success = unlockCharacter(charId, cost);
    if (success) {
      soundManager.playPowerUp();
      const updated = loadSaveData();
      setSaveData(updated);
      if (mpManagerRef.current) {
        mpManagerRef.current.updateProfile(updated.playerName, charId);
      }
    }
  };

  const handleUpdateSettings = (partial: Partial<UserSaveData>) => {
    const updated = { ...saveData, ...partial };
    saveSaveData(updated);
    setSaveData(updated);
    if (partial.playerName && mpManagerRef.current) {
      mpManagerRef.current.updateProfile(partial.playerName, updated.selectedCharacter);
    }
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleStartMultiplayerSession = (room: MultiplayerRoom) => {
    setActiveRoom(room);
    setShowMultiplayer(false);
    handleSelectWorld(room.worldId);
    handleStartRun();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 3D WebGL Canvas Viewport */}
      <GameCanvas
        worldId={saveData.selectedWorld}
        characterId={saveData.selectedCharacter}
        callbacks={callbacks}
        opponent={opponentState}
        onEngineReady={(eng) => setEngine(eng)}
      />

      {/* Main Menu Overlay */}
      {gameStatus === 'menu' && (
        <MainMenu
          saveData={saveData}
          onPlayOffline={handleStartRun}
          onOpenMultiplayer={() => setShowMultiplayer(true)}
          onOpenWorldSelect={() => setShowWorldSelect(true)}
          onOpenCharacterSelect={() => setShowCharSelect(true)}
          onOpenHighScores={() => setShowHighScores(true)}
          onOpenSettings={() => setShowSettings(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* In-Game HUD */}
      {gameStatus === 'running' && (
        <>
          <HUD
            score={currentScore}
            distance={currentDistance}
            coins={runCoins}
            speed={currentSpeed}
            activeShield={activeShield}
            magnetTimer={magnetTimer}
            multiplierTimer={multiplierTimer}
            opponent={opponentState}
            onPause={handlePause}
          />
          {saveData.showTouchControls && engine && (
            <TouchControls
              onLeft={() => engine.moveLeft()}
              onRight={() => engine.moveRight()}
              onJump={() => engine.jump()}
              onSlide={() => engine.slide()}
            />
          )}
        </>
      )}

      {/* Pause Modal */}
      {gameStatus === 'paused' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onMainMenu={handleReturnToMenu}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Game Over Modal */}
      {gameStatus === 'gameover' && (
        <GameOverModal
          score={gameOverDetails.finalScore}
          distance={gameOverDetails.finalDistance}
          coins={gameOverDetails.coinsEarned}
          reason={gameOverDetails.reason}
          isNewBest={gameOverDetails.isNewBest}
          personalBest={saveData.personalBest}
          onRestart={handleRestart}
          onMainMenu={handleReturnToMenu}
        />
      )}

      {/* Modals */}
      {showWorldSelect && (
        <WorldSelectModal
          selectedWorld={saveData.selectedWorld}
          onSelectWorld={handleSelectWorld}
          onClose={() => setShowWorldSelect(false)}
        />
      )}

      {showCharSelect && (
        <CharacterSelectModal
          selectedCharacter={saveData.selectedCharacter}
          unlockedCharacters={saveData.unlockedCharacters}
          userCoins={saveData.coins}
          onSelectCharacter={handleSelectCharacter}
          onUnlockCharacter={handleUnlockCharacter}
          onClose={() => setShowCharSelect(false)}
        />
      )}

      {showMultiplayer && mpManagerRef.current && (
        <MultiplayerModal
          multiplayerManager={mpManagerRef.current}
          selectedWorld={saveData.selectedWorld}
          playerName={saveData.playerName}
          selectedCharacter={saveData.selectedCharacter}
          onStartMultiplayerSession={handleStartMultiplayerSession}
          onClose={() => setShowMultiplayer(false)}
        />
      )}

      {showHighScores && (
        <FriendsHighScoreModal
          records={saveData.friendsHighScores}
          personalBest={saveData.personalBest}
          bestDistance={saveData.bestDistance}
          onClose={() => setShowHighScores(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          saveData={saveData}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
