import { useRef, useEffect, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
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

function FireEffect({ isOnFire, streak, hasAvatar }: { isOnFire: boolean; streak: number; hasAvatar: boolean }) {
  const flameRefs = useRef<THREE.Mesh[]>([]);
  
  const flamePositions = useMemo(() => [
    { x: 0.35, z: 0, delay: 0 },
    { x: -0.35, z: 0, delay: 0.3 },
    { x: 0, z: 0.35, delay: 0.6 },
    { x: 0, z: -0.35, delay: 0.9 },
    { x: 0.25, z: 0.25, delay: 0.2 },
    { x: -0.25, z: -0.25, delay: 0.5 },
  ], []);
  
  const baseY = hasAvatar ? 0.5 : 0.3;
  
  useFrame((state) => {
    if (!isOnFire) return;
    
    flameRefs.current.forEach((flame, i) => {
      if (flame) {
        const time = state.clock.elapsedTime + flamePositions[i].delay;
        flame.position.y = baseY + Math.sin(time * 8) * 0.15;
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
          position={[pos.x, baseY, pos.z]}
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
        position={[0, baseY + 0.2, 0]}
        intensity={flameIntensity * 2}
        color="#ff6600"
        distance={3}
      />
    </group>
  );
}

function AvatarHead({ avatarUrl, bodyColor, emissiveColor, emissiveIntensity }: { 
  avatarUrl: string | null; 
  bodyColor: string; 
  emissiveColor: string;
  emissiveIntensity: number;
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  
  useEffect(() => {
    if (avatarUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(avatarUrl, (loadedTexture) => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        setTexture(loadedTexture);
      }, undefined, () => {
        setTexture(null);
      });
    } else {
      setTexture(null);
    }
  }, [avatarUrl]);
  
  if (texture) {
    return (
      <Billboard position={[0, 0.7, 0]} follow={true} lockX={false} lockY={false} lockZ={false}>
        <mesh>
          <circleGeometry args={[0.35, 32]} />
          <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0, -0.01]}>
          <circleGeometry args={[0.38, 32]} />
          <meshStandardMaterial color={bodyColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
        </mesh>
      </Billboard>
    );
  }
  
  return (
    <>
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
    </>
  );
}

function WalkingLegs({ isWalking, bodyColor }: { isWalking: boolean; bodyColor: string }) {
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!leftLegRef.current || !rightLegRef.current) return;
    
    if (isWalking) {
      const walkCycle = state.clock.elapsedTime * 6;
      leftLegRef.current.rotation.x = Math.sin(walkCycle) * 0.5;
      rightLegRef.current.rotation.x = Math.sin(walkCycle + Math.PI) * 0.5;
    } else {
      leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0, 0.1);
      rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, 0, 0.1);
    }
  });
  
  return (
    <>
      <mesh ref={leftLegRef} position={[-0.1, -0.35, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.25, 4, 8]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      <mesh ref={rightLegRef} position={[0.1, -0.35, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.25, 4, 8]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
    </>
  );
}

const START_POSITION = getPositionFromStep(0);

export function Player() {
  const meshRef = useRef<THREE.Group>(null);
  const { currentPosition, phase, isMoving, lastStepType, isOnFire, streak, wasReset, user } = useGameState();
  const [targetPosition, setTargetPosition] = useState<[number, number, number]>(START_POSITION);
  const [isWalking, setIsWalking] = useState(false);
  const walkProgress = useRef(0);
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
          setIsWalking(true);
          walkProgress.current = 0;
        }
        lastPosition.current = currentPosition;
      }
    }
    
    if (phase === "won" || phase === "lost" || phase === "cashed_out") {
      setTimeout(() => setIsWalking(false), 500);
    }
  }, [currentPosition, phase]);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const current = meshRef.current.position;
    const [tx, ty, tz] = targetPosition;
    const [px, py, pz] = previousPosition;
    
    if (isWalking) {
      walkProgress.current += delta * 1.0;
      
      if (walkProgress.current >= 1) {
        walkProgress.current = 1;
        setIsWalking(false);
      }
      
      const t = walkProgress.current;
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      
      const hopHeight = Math.sin(t * Math.PI * 4) * 0.04 + Math.sin(t * Math.PI) * 0.08;
      
      current.x = px + (tx - px) * easeT;
      current.z = pz + (tz - pz) * easeT;
      current.y = ty + hopHeight;
      
      const dirX = tx - px;
      const dirZ = tz - pz;
      if (Math.abs(dirX) > 0.01 || Math.abs(dirZ) > 0.01) {
        const targetRotation = Math.atan2(dirX, dirZ);
        meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotation, 0.1);
      }
    } else {
      current.x = THREE.MathUtils.lerp(current.x, tx, delta * 5);
      current.z = THREE.MathUtils.lerp(current.z, tz, delta * 5);
      current.y = ty + Math.sin(state.clock.elapsedTime * 2) * 0.03;
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
  
  const avatarUrl = user?.avatarUrl || null;
  
  return (
    <group ref={meshRef} position={START_POSITION}>
      <mesh castShadow>
        <capsuleGeometry args={[0.2, 0.4, 8, 16]} />
        <meshStandardMaterial 
          color={bodyColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.3}
          roughness={0.6}
        />
      </mesh>
      
      <AvatarHead 
        avatarUrl={avatarUrl} 
        bodyColor={bodyColor} 
        emissiveColor={emissiveColor}
        emissiveIntensity={emissiveIntensity}
      />
      
      <WalkingLegs isWalking={isWalking} bodyColor={bodyColor} />
      
      <FireEffect isOnFire={isOnFire} streak={streak} hasAvatar={!!avatarUrl} />
      
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
