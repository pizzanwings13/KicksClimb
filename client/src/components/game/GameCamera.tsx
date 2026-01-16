import { useRef, useState, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGameState } from "@/lib/stores/useGameState";

function calculateTargetX(currentPosition: number, board: { position: number; type: string }[]): number {
  const currentStep = board.find(step => step.position === currentPosition);
  if (!currentStep) return 0;
  
  const index = board.findIndex(step => step.position === currentPosition);
  const xOffset = ((index * 17.3 + currentPosition * 7.1) % 14) - 7;
  return xOffset;
}

export function GameCamera() {
  const { camera } = useThree();
  const { phase, isMoving, currentPosition, board } = useGameState();
  const targetRef = useRef(new THREE.Vector3(0, 5, 6));
  const lookAtRef = useRef(new THREE.Vector3(0, 0, -8));
  const currentCameraX = useRef(0);
  
  const [isMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || window.innerHeight > window.innerWidth;
  });

  const shipTargetX = useMemo(() => {
    return calculateTargetX(currentPosition, board);
  }, [currentPosition, board]);
  
  useFrame((state, delta) => {
    const isGameActive = phase === "playing" || phase === "won" || phase === "lost" || phase === "cashed_out";
    
    currentCameraX.current = THREE.MathUtils.lerp(currentCameraX.current, shipTargetX, delta * 1.5);
    
    if (isMobile && isGameActive) {
      targetRef.current.set(currentCameraX.current, 8, 10);
      lookAtRef.current.set(currentCameraX.current, 0, -15);
    } else if (isGameActive) {
      const cameraY = isMoving ? 5 : 5.5;
      const cameraZ = isMoving ? 6 : 7;
      targetRef.current.set(currentCameraX.current, cameraY, cameraZ);
      lookAtRef.current.set(currentCameraX.current, 0, -15);
    } else {
      targetRef.current.set(0, 8, 12);
      lookAtRef.current.set(0, 0, 0);
    }
    
    camera.position.lerp(targetRef.current, delta * 1.5);
    camera.lookAt(lookAtRef.current);
    
    if (isMoving) {
      camera.position.y += Math.sin(state.clock.elapsedTime * 1.5) * 0.03;
    }
  });
  
  return null;
}
