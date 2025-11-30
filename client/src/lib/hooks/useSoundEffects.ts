import { useEffect, useRef } from "react";
import { useGameState } from "../stores/useGameState";
import { soundManager } from "../sounds/SoundManager";

export function useSoundEffects() {
  const phase = useGameState((state) => state.phase);
  const lastStepType = useGameState((state) => state.lastStepType);
  const currentPosition = useGameState((state) => state.currentPosition);
  const isMoving = useGameState((state) => state.isMoving);
  
  const prevPhaseRef = useRef(phase);
  const prevPositionRef = useRef(currentPosition);
  const prevStepTypeRef = useRef(lastStepType);

  useEffect(() => {
    if (phase !== prevPhaseRef.current) {
      const prevPhase = prevPhaseRef.current;
      
      if (phase === "playing" && prevPhase !== "playing") {
        soundManager.playRollDice();
      }
      
      if (phase === "won") {
        soundManager.playWin();
      }
      
      if (phase === "lost") {
        soundManager.playLose();
      }
      
      if (phase === "cashed_out") {
        soundManager.playCashout();
      }
      
      prevPhaseRef.current = phase;
    }
  }, [phase]);

  useEffect(() => {
    if (currentPosition !== prevPositionRef.current && currentPosition > 0) {
      if (lastStepType !== prevStepTypeRef.current || currentPosition !== prevPositionRef.current) {
        if (lastStepType === "hazard") {
          soundManager.playHazard();
        } else if (lastStepType?.startsWith("multiplier_") || lastStepType === "finish") {
          soundManager.playMultiplier();
        } else if (lastStepType === "safe" && !isMoving) {
          soundManager.playStep();
        }
      }
      
      prevPositionRef.current = currentPosition;
      prevStepTypeRef.current = lastStepType;
    }
  }, [currentPosition, lastStepType, isMoving]);

  return null;
}
