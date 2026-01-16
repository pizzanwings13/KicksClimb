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

function WakeEffect({ isMoving }: { isMoving: boolean }) {
  const wakeRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (wakeRef.current) {
      wakeRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        const scale = isMoving ? 1 + i * 0.3 : 0.5;
        mesh.scale.setScalar(scale + Math.sin(state.clock.elapsedTime * 3 - i * 0.5) * 0.1);
        (mesh.material as THREE.MeshStandardMaterial).opacity = isMoving ? 0.5 - i * 0.1 : 0.2;
      });
    }
  });

  return (
    <group ref={wakeRef} position={[0, -0.3, 0.5]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0, i * 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.1 + i * 0.1, 0.15 + i * 0.1, 16]} />
          <meshStandardMaterial 
            color="#87CEEB" 
            emissive="#4FC3F7" 
            emissiveIntensity={0.3}
            transparent 
            opacity={0.4} 
          />
        </mesh>
      ))}
    </group>
  );
}

function GoldenGlow({ active, intensity }: { active: boolean; intensity: number }) {
  const glowRef = useRef<THREE.PointLight>(null);
  
  useFrame((state) => {
    if (glowRef.current && active) {
      glowRef.current.intensity = intensity + Math.sin(state.clock.elapsedTime * 4) * 0.5;
    }
  });

  if (!active) return null;

  return (
    <pointLight 
      ref={glowRef}
      position={[0, 0.5, 0]} 
      intensity={intensity} 
      color="#FFD700" 
      distance={4}
    />
  );
}

function PirateFlag({ color, emissive, isOnFire }: { color: string; emissive: string; isOnFire: boolean }) {
  const flagRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 3) * 0.2;
      if (isOnFire) {
        flagRef.current.position.y = 0.8 + Math.sin(state.clock.elapsedTime * 5) * 0.05;
      }
    }
  });

  return (
    <group position={[0, 0.5, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      <mesh ref={flagRef} position={[0.12, 0.2, 0]} castShadow>
        <planeGeometry args={[0.25, 0.2]} />
        <meshStandardMaterial 
          color={color}
          emissive={emissive}
          emissiveIntensity={isOnFire ? 0.8 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function ShipHull({ color, emissive, emissiveIntensity }: { color: string; emissive: string; emissiveIntensity: number }) {
  return (
    <group>
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.35, 0.15, 0.7]} />
        <meshStandardMaterial 
          color="#8B4513"
          metalness={0.2}
          roughness={0.8}
        />
      </mesh>
      
      <mesh position={[0, -0.05, -0.4]} rotation={[0.5, 0, 0]} castShadow>
        <boxGeometry args={[0.25, 0.1, 0.15]} />
        <meshStandardMaterial color="#A0522D" />
      </mesh>
      
      <mesh position={[0, 0.08, 0]} castShadow>
        <boxGeometry args={[0.3, 0.08, 0.5]} />
        <meshStandardMaterial 
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      
      <mesh position={[0.18, 0.05, 0]} castShadow>
        <boxGeometry args={[0.03, 0.15, 0.6]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      <mesh position={[-0.18, 0.05, 0]} castShadow>
        <boxGeometry args={[0.03, 0.15, 0.6]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
    </group>
  );
}

function Sail({ color, isMoving }: { color: string; isMoving: boolean }) {
  const sailRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (sailRef.current) {
      const billowAmount = isMoving ? 0.15 : 0.05;
      sailRef.current.scale.z = 1 + Math.sin(state.clock.elapsedTime * 2) * billowAmount;
    }
  });

  return (
    <group position={[0, 0.35, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.5, 6]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      
      <mesh position={[0, 0.1, 0.05]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.4, 6]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      
      <mesh ref={sailRef} position={[0, 0.05, 0.08]} castShadow>
        <planeGeometry args={[0.35, 0.35]} />
        <meshStandardMaterial 
          color="#FFFEF0"
          emissive="#FFF8DC"
          emissiveIntensity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      <mesh position={[0, 0.05, 0.085]}>
        <circleGeometry args={[0.08, 16]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function FireEffect({ isOnFire, streak }: { isOnFire: boolean; streak: number }) {
  const flameRefs = useRef<THREE.Mesh[]>([]);
  
  const flamePositions = useMemo(() => [
    { x: 0.2, z: 0, delay: 0 },
    { x: -0.2, z: 0, delay: 0.3 },
    { x: 0, z: 0.2, delay: 0.6 },
    { x: 0, z: -0.2, delay: 0.9 },
  ], []);
  
  useFrame((state) => {
    if (!isOnFire) return;
    
    flameRefs.current.forEach((flame, i) => {
      if (flame) {
        const time = state.clock.elapsedTime + flamePositions[i].delay;
        flame.position.y = 0.4 + Math.sin(time * 8) * 0.1;
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
          position={[pos.x, 0.4, pos.z]}
        >
          <coneGeometry args={[0.06 * flameIntensity, 0.2 * flameIntensity, 8]} />
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

const START_POSITION = getPositionFromStep(0);

export function Player() {
  const meshRef = useRef<THREE.Group>(null);
  const { currentPosition, phase, isMoving, lastStepType, isOnFire, streak, wasReset } = useGameState();
  const [targetPosition, setTargetPosition] = useState<[number, number, number]>(START_POSITION);
  const [isAnimating, setIsAnimating] = useState(false);
  const animProgress = useRef(0);
  const [previousPosition, setPreviousPosition] = useState<[number, number, number]>(START_POSITION);
  const lastPosition = useRef(-1);
  const initializedRef = useRef(false);
  
  useEffect(() => {
    if (!initializedRef.current && meshRef.current) {
      meshRef.current.position.set(...START_POSITION);
      meshRef.current.rotation.y = 0;
      initializedRef.current = true;
    }
  }, []);
  
  useEffect(() => {
    if (phase === "playing" || phase === "won" || phase === "lost" || phase === "cashed_out") {
      const newPos = getPositionFromStep(currentPosition);
      
      if (currentPosition !== lastPosition.current) {
        if (lastPosition.current === -1) {
          setPreviousPosition(newPos);
          setTargetPosition(newPos);
          if (meshRef.current) {
            meshRef.current.position.set(...newPos);
          }
        } else {
          setPreviousPosition(targetPosition);
          setTargetPosition(newPos);
          setIsAnimating(true);
          animProgress.current = 0;
        }
        lastPosition.current = currentPosition;
      }
    }
    
    if (phase === "won" || phase === "lost" || phase === "cashed_out") {
      setTimeout(() => setIsAnimating(false), 500);
    }
  }, [currentPosition, phase]);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const current = meshRef.current.position;
    const [tx, ty, tz] = targetPosition;
    const [px, py, pz] = previousPosition;
    
    if (isAnimating) {
      animProgress.current += delta * 1.2;
      
      if (animProgress.current >= 1) {
        animProgress.current = 1;
        setIsAnimating(false);
      }
      
      const t = animProgress.current;
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      
      const bobHeight = Math.sin(t * Math.PI * 3) * 0.06;
      
      current.x = px + (tx - px) * easeT;
      current.z = pz + (tz - pz) * easeT;
      current.y = ty + bobHeight;
      
      const dirX = tx - px;
      const dirZ = tz - pz;
      if (Math.abs(dirX) > 0.01 || Math.abs(dirZ) > 0.01) {
        const targetRotation = Math.atan2(dirX, dirZ);
        meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotation, 0.08);
      }
    } else {
      current.x = THREE.MathUtils.lerp(current.x, tx, delta * 5);
      current.z = THREE.MathUtils.lerp(current.z, tz, delta * 5);
      current.y = ty + Math.sin(state.clock.elapsedTime * 1.5) * 0.04;
      
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.2) * 0.05;
    }
    
    if (lastStepType === "hazard" && phase === "lost") {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 10) * 0.1);
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 5) * 0.3;
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
  
  let hullAccent = "#A0522D";
  let emissiveColor = "#8B4513";
  let emissiveIntensity = 0.15;
  let flagColor = "#1a1a2e";
  
  if (phase === "lost") {
    hullAccent = "#8B0000";
    emissiveColor = "#FF0000";
    emissiveIntensity = 0.4;
    flagColor = "#FF0000";
  } else if (phase === "won" || phase === "cashed_out") {
    hullAccent = "#FFD700";
    emissiveColor = "#FFB300";
    emissiveIntensity = 0.5;
    flagColor = "#FFD700";
  } else if (isOnFire) {
    hullAccent = "#FF6B00";
    emissiveColor = "#FF4500";
    emissiveIntensity = 0.6;
    flagColor = "#FF6B00";
  } else if (wasReset) {
    hullAccent = "#9C27B0";
    emissiveColor = "#7B1FA2";
    emissiveIntensity = 0.4;
    flagColor = "#9C27B0";
  }
  
  return (
    <group ref={meshRef} position={START_POSITION}>
      <ShipHull color={hullAccent} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      <Sail color={flagColor} isMoving={isAnimating} />
      <PirateFlag color={flagColor} emissive={emissiveColor} isOnFire={isOnFire} />
      <WakeEffect isMoving={isAnimating} />
      <FireEffect isOnFire={isOnFire} streak={streak} />
      <GoldenGlow active={phase === "won" || phase === "cashed_out"} intensity={2} />
    </group>
  );
}
