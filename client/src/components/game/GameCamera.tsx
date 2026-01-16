import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGameState } from "@/lib/stores/useGameState";

export function GameCamera() {
  const { camera } = useThree();
  const { phase, isMoving } = useGameState();
  const targetRef = useRef(new THREE.Vector3(0, 6, 8));
  const lookAtRef = useRef(new THREE.Vector3(0, 0, -5));
  
  const [isMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || window.innerHeight > window.innerWidth;
  });
  
  useFrame((state, delta) => {
    const isGameActive = phase === "playing" || phase === "won" || phase === "lost" || phase === "cashed_out";
    
    if (isMobile && isGameActive) {
      targetRef.current.set(0, 8, 10);
      lookAtRef.current.set(0, 0, -8);
    } else if (isGameActive) {
      const cameraY = isMoving ? 5.5 : 6;
      const cameraZ = isMoving ? 7 : 8;
      targetRef.current.set(0, cameraY, cameraZ);
      lookAtRef.current.set(0, 0, -10);
    } else {
      targetRef.current.set(0, 8, 12);
      lookAtRef.current.set(0, 0, 0);
    }
    
    camera.position.lerp(targetRef.current, delta * 2);
    camera.lookAt(lookAtRef.current);
    
    if (isMoving) {
      camera.position.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
    }
  });
  
  return null;
}
