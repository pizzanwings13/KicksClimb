import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGameState } from "@/lib/stores/useGameState";

const STEP_SIZE = 1.2;
const BOARD_COLS = 10;

export function GameCamera() {
  const { camera } = useThree();
  const { currentPosition, phase } = useGameState();
  const targetRef = useRef(new THREE.Vector3(0, 8, 12));
  const lookAtRef = useRef(new THREE.Vector3(0, 0, 0));
  
  useEffect(() => {
    if (phase === "playing" || phase === "won" || phase === "lost" || phase === "cashed_out") {
      const row = Math.floor(currentPosition / BOARD_COLS);
      const targetZ = (row - 5) * STEP_SIZE;
      
      targetRef.current.set(0, 10, targetZ + 10);
      lookAtRef.current.set(0, 0, targetZ);
    } else {
      targetRef.current.set(0, 12, 15);
      lookAtRef.current.set(0, 0, 0);
    }
  }, [currentPosition, phase]);
  
  useFrame((state, delta) => {
    camera.position.lerp(targetRef.current, delta * 2);
    
    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);
    
    const targetDirection = lookAtRef.current.clone().sub(camera.position).normalize();
    currentLookAt.lerp(targetDirection, delta * 2);
    
    camera.lookAt(lookAtRef.current);
  });
  
  return null;
}
