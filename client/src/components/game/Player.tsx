import { useRef, useEffect, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameState } from "@/lib/stores/useGameState";

const STEP_SIZE = 1.2;
const BOARD_COLS = 10;

function getPositionFromStep(stepIndex: number): [number, number, number] {
  const row = Math.floor(stepIndex / BOARD_COLS);
  const colInRow = stepIndex % BOARD_COLS;
  const col = row % 2 === 0 ? colInRow : BOARD_COLS - 1 - colInRow;
  
  const x = (col - BOARD_COLS / 2 + 0.5) * STEP_SIZE;
  const z = (row - 5) * STEP_SIZE;
  const y = 0.6;
  
  return [x, y, z];
}

function FireEffect({ isOnFire, streak }: { isOnFire: boolean; streak: number }) {
  const flameRefs = useRef<THREE.Mesh[]>([]);
  
  const flamePositions = useMemo(() => [
    { x: 0.3, z: 0, delay: 0 },
    { x: -0.3, z: 0, delay: 0.3 },
    { x: 0, z: 0.3, delay: 0.6 },
    { x: 0, z: -0.3, delay: 0.9 },
    { x: 0.2, z: 0.2, delay: 0.2 },
    { x: -0.2, z: -0.2, delay: 0.5 },
  ], []);
  
  useFrame((state) => {
    if (!isOnFire) return;
    
    flameRefs.current.forEach((flame, i) => {
      if (flame) {
        const time = state.clock.elapsedTime + flamePositions[i].delay;
        flame.position.y = 0.3 + Math.sin(time * 8) * 0.15;
        flame.scale.setScalar(0.8 + Math.sin(time * 10) * 0.3);
        flame.rotation.y = time * 3;
      }
    });
  });
  
  if (!isOnFire) return null;
  
  const flameIntensity = Math.min(streak / 5, 1.5);
  
  return (
    <group>
      {flamePositions.map((pos, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) flameRefs.current[i] = el; }}
          position={[pos.x, 0.3, pos.z]}
        >
          <coneGeometry args={[0.08 * flameIntensity, 0.25 * flameIntensity, 8]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? "#ff6b00" : "#ffaa00"}
            emissive={i % 2 === 0 ? "#ff4400" : "#ff8800"}
            emissiveIntensity={0.8 + flameIntensity * 0.5}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
      <pointLight
        position={[0, 0.5, 0]}
        intensity={flameIntensity * 2}
        color="#ff6600"
        distance={3}
      />
    </group>
  );
}

export function Player() {
  const meshRef = useRef<THREE.Group>(null);
  const { currentPosition, phase, isMoving, lastStepType, isOnFire, streak, wasReset } = useGameState();
  const [targetPosition, setTargetPosition] = useState<[number, number, number]>([0, 0.6, -5 * STEP_SIZE]);
  const [isJumping, setIsJumping] = useState(false);
  const jumpProgress = useRef(0);
  
  useEffect(() => {
    if (phase === "playing" || phase === "won" || phase === "lost" || phase === "cashed_out") {
      const newPos = getPositionFromStep(currentPosition);
      setTargetPosition(newPos);
      setIsJumping(true);
      jumpProgress.current = 0;
    }
  }, [currentPosition, phase]);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const current = meshRef.current.position;
    const [tx, ty, tz] = targetPosition;
    
    if (isJumping) {
      jumpProgress.current += delta * 3;
      
      if (jumpProgress.current >= 1) {
        jumpProgress.current = 1;
        setIsJumping(false);
      }
      
      const t = jumpProgress.current;
      const jumpHeight = Math.sin(t * Math.PI) * 0.8;
      
      current.x = THREE.MathUtils.lerp(current.x, tx, t);
      current.z = THREE.MathUtils.lerp(current.z, tz, t);
      current.y = ty + jumpHeight;
      
      meshRef.current.rotation.y += delta * 5;
    } else {
      current.x = THREE.MathUtils.lerp(current.x, tx, delta * 5);
      current.z = THREE.MathUtils.lerp(current.z, tz, delta * 5);
      current.y = ty + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        0,
        delta * 3
      );
    }
    
    if (lastStepType === "hazard" && phase === "lost") {
      meshRef.current.scale.setScalar(
        1 + Math.sin(state.clock.elapsedTime * 10) * 0.1
      );
    } else if (lastStepType?.includes("multiplier") || lastStepType === "finish") {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.05;
      meshRef.current.scale.setScalar(pulse);
    } else {
      meshRef.current.scale.setScalar(1);
    }
  });
  
  if (phase === "menu" || phase === "betting") {
    return null;
  }
  
  let bodyColor = "#f6ad55";
  let emissiveColor = "#dd6b20";
  let emissiveIntensity = 0.2;
  
  if (phase === "lost") {
    bodyColor = "#fc8181";
    emissiveColor = "#e53e3e";
  } else if (phase === "won" || phase === "cashed_out") {
    bodyColor = "#68d391";
    emissiveColor = "#38a169";
  } else if (isOnFire) {
    bodyColor = "#ff8c00";
    emissiveColor = "#ff4500";
    emissiveIntensity = 0.5;
  } else if (wasReset) {
    bodyColor = "#9f7aea";
    emissiveColor = "#805ad5";
  }
  
  return (
    <group ref={meshRef} position={[0, 0.6, -5 * STEP_SIZE]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.25, 0.5, 8, 16]} />
        <meshStandardMaterial 
          color={bodyColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.3}
          roughness={0.6}
        />
      </mesh>
      
      <mesh position={[0, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial 
          color={bodyColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      
      <mesh position={[-0.1, 0.6, 0.15]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#1a202c" />
      </mesh>
      <mesh position={[0.1, 0.6, 0.15]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#1a202c" />
      </mesh>
      
      <FireEffect isOnFire={isOnFire} streak={streak} />
      
      {(phase === "won" || phase === "cashed_out") && (
        <pointLight 
          position={[0, 1, 0]} 
          intensity={2} 
          color="#ffd700" 
          distance={3}
        />
      )}
    </group>
  );
}
