import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGameState } from "@/lib/stores/useGameState";

export function GameCamera() {
  const { camera } = useThree();
  const { phase, isMoving } = useGameState();
  const targetRef = useRef(new THREE.Vector3(0, 5, 6));
  const lookAtRef = useRef(new THREE.Vector3(0, 0, -8));
  
  const [isMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || window.innerHeight > window.innerWidth;
  });
  
  useFrame((state, delta) => {
    const isGameActive = phase === "playing" || phase === "won" || phase === "lost" || phase === "cashed_out";
    
    if (isMobile && isGameActive) {
      targetRef.current.set(0, 7, 8);
      lookAtRef.current.set(0, 0, -12);
    } else if (isGameActive) {
      const cameraY = isMoving ? 4.5 : 5;
      const cameraZ = isMoving ? 5 : 6;
      targetRef.current.set(0, cameraY, cameraZ);
      lookAtRef.current.set(0, 0, -12);
    } else {
      targetRef.current.set(0, 8, 12);
      lookAtRef.current.set(0, 0, 0);
    }
    
    camera.position.lerp(targetRef.current, delta * 2.5);
    camera.lookAt(lookAtRef.current);
    
    if (isMoving) {
      camera.position.x = Math.sin(state.clock.elapsedTime * 0.8) * 0.2;
      camera.position.y += Math.sin(state.clock.elapsedTime * 1.5) * 0.05;
    }
  });
  
  return null;
}
