import React, { useEffect, useRef } from 'react';
import { GameEngine, GameEngineCallbacks } from '../game/engine/GameEngine';
import { WorldId, CharacterId, MultiplayerPlayerState } from '../types/game';

interface GameCanvasProps {
  worldId: WorldId;
  characterId: CharacterId;
  callbacks: GameEngineCallbacks;
  opponent: MultiplayerPlayerState | null;
  onEngineReady: (engine: GameEngine) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  worldId,
  characterId,
  callbacks,
  opponent,
  onEngineReady,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Touch Swipe Gesture State
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Initialize Game Engine once
    const engine = new GameEngine(
      mountRef.current,
      worldId,
      characterId,
      callbacks
    );
    engineRef.current = engine;
    onEngineReady(engine);

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Update world / character dynamically when changed
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setWorld(worldId);
    }
  }, [worldId]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setCharacter(characterId);
    }
  }, [characterId]);

  // Update multiplayer opponent ghost
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setOpponent(opponent);
    }
  }, [opponent]);

  // Mobile Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStartRef.current = {
        x: t.clientX,
        y: t.clientY,
        time: Date.now()
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !engineRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const minSwipeDist = 28; // Minimum swipe travel in pixels

    if (dt < 400 && (absX > minSwipeDist || absY > minSwipeDist)) {
      if (absX > absY) {
        // Horizontal swipe (Lane change)
        if (dx > 0) {
          engineRef.current.moveRight();
        } else {
          engineRef.current.moveLeft();
        }
      } else {
        // Vertical swipe (Jump or Slide)
        if (dy < 0) {
          engineRef.current.jump();
        } else {
          engineRef.current.slide();
        }
      }
    }

    touchStartRef.current = null;
  };

  return (
    <div
      ref={mountRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="absolute inset-0 w-full h-full touch-none overflow-hidden select-none bg-slate-950"
    />
  );
};
