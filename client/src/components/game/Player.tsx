import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useGameState } from "@/lib/stores/useGameState";

function calculateTargetX(currentPosition: number, board: { position: number; type: string }[]): number {
  const currentStep = board.find(step => step.position === currentPosition);
  if (!currentStep) return 0;
  
  const index = board.findIndex(step => step.position === currentPosition);
  const xOffset = ((index * 17.3 + currentPosition * 7.1) % 14) - 7;
  return xOffset;
}

function WakeEffect({ intensity = 1 }: { intensity?: number }) {
  const wakeRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (wakeRef.current) {
      wakeRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        const scale = intensity * (1 + i * 0.3);
        mesh.scale.setScalar(scale + Math.sin(state.clock.elapsedTime * 3 - i * 0.5) * 0.1);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = intensity * (0.5 - i * 0.1);
      });
    }
  });

  return (
    <group ref={wakeRef} position={[0, -0.2, -1]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0, -i * 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2 + i * 0.15, 0.3 + i * 0.15, 16]} />
          <meshStandardMaterial 
            color="#E0F7FA" 
            emissive="#4FC3F7" 
            emissiveIntensity={0.3}
            transparent 
            opacity={0.5} 
          />
        </mesh>
      ))}
    </group>
  );
}

function ShipHull() {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.6, 0.25, 1.2]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.08, 0.55]} rotation={[0.4, 0, 0]} castShadow>
        <boxGeometry args={[0.45, 0.15, 0.2]} />
        <meshStandardMaterial color="#A0522D" roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.08, -0.55]} rotation={[-0.4, 0, 0]} castShadow>
        <boxGeometry args={[0.35, 0.15, 0.2]} />
        <meshStandardMaterial color="#A0522D" roughness={0.8} />
      </mesh>
      <mesh position={[0.28, 0.05, 0]} castShadow>
        <boxGeometry args={[0.06, 0.25, 1.1]} />
        <meshStandardMaterial color="#654321" roughness={0.9} />
      </mesh>
      <mesh position={[-0.28, 0.05, 0]} castShadow>
        <boxGeometry args={[0.06, 0.25, 1.1]} />
        <meshStandardMaterial color="#654321" roughness={0.9} />
      </mesh>
    </group>
  );
}

function ShipDeck() {
  return (
    <group position={[0, 0.15, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.55, 0.06, 1.1]} />
        <meshStandardMaterial color="#DEB887" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.12, -0.35]} castShadow>
        <boxGeometry args={[0.4, 0.2, 0.3]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Mast() {
  return (
    <group position={[0, 0.35, 0.1]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.03, 0.04, 1.2, 8]} />
        <meshStandardMaterial color="#5D4037" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 0.6, 6]} />
        <meshStandardMaterial color="#5D4037" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Sail() {
  const sailRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (sailRef.current) {
      sailRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.06;
      sailRef.current.scale.x = 1 + Math.sin(state.clock.elapsedTime * 1.2) * 0.04;
    }
  });

  return (
    <mesh ref={sailRef} position={[0.03, 0.65, 0.15]} castShadow>
      <planeGeometry args={[0.55, 0.6]} />
      <meshStandardMaterial 
        color="#FFFEF0" 
        side={THREE.DoubleSide}
        emissive="#FFF8DC"
        emissiveIntensity={0.15}
      />
    </mesh>
  );
}

function PirateFlag() {
  const flagRef = useRef<THREE.Group>(null);
  const texture = useTexture("/textures/pirate-flag.jpg");

  useFrame((state) => {
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2.5) * 0.2;
    }
  });

  return (
    <group ref={flagRef} position={[0, 1, 0.1]}>
      <mesh position={[0.15, 0, 0]}>
        <planeGeometry args={[0.35, 0.35]} />
        <meshStandardMaterial 
          map={texture} 
          side={THREE.DoubleSide}
          transparent
          alphaTest={0.1}
        />
      </mesh>
    </group>
  );
}

function GoldenBow() {
  return (
    <group position={[0, 0.1, 0.7]}>
      <mesh rotation={[-0.2, 0, 0]} castShadow>
        <boxGeometry args={[0.1, 0.1, 0.25]} />
        <meshStandardMaterial 
          color="#FFD700" 
          metalness={0.7} 
          roughness={0.3}
          emissive="#B8860B"
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  );
}

function FireEffect({ active, intensity = 1 }: { active: boolean; intensity?: number }) {
  const flameRefs = useRef<THREE.Mesh[]>([]);
  
  const flamePositions = useMemo(() => [
    { x: 0.2, z: 0, delay: 0 },
    { x: -0.2, z: 0, delay: 0.3 },
    { x: 0, z: 0.2, delay: 0.6 },
    { x: 0, z: -0.2, delay: 0.9 },
  ], []);
  
  useFrame((state) => {
    if (!active) return;
    
    flameRefs.current.forEach((flame, i) => {
      if (flame) {
        const time = state.clock.elapsedTime + flamePositions[i].delay;
        flame.position.y = 0.5 + Math.sin(time * 8) * 0.1;
        flame.scale.setScalar(0.8 + Math.sin(time * 10) * 0.3);
        flame.rotation.y = time * 3;
      }
    });
  });
  
  if (!active) return null;
  
  return (
    <group>
      {flamePositions.map((pos, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) flameRefs.current[i] = el; }}
          position={[pos.x, 0.5, pos.z]}
        >
          <coneGeometry args={[0.08 * intensity, 0.25 * intensity, 8]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? "#ff6b00" : "#ffaa00"}
            emissive={i % 2 === 0 ? "#ff4400" : "#ff8800"}
            emissiveIntensity={0.8 + intensity * 0.5}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
      <pointLight
        position={[0, 0.6, 0]}
        intensity={intensity * 2}
        color="#ff6600"
        distance={4}
      />
    </group>
  );
}

function GoldenGlow({ active }: { active: boolean }) {
  const glowRef = useRef<THREE.PointLight>(null);
  
  useFrame((state) => {
    if (glowRef.current && active) {
      glowRef.current.intensity = 2 + Math.sin(state.clock.elapsedTime * 4) * 0.5;
    }
  });

  if (!active) return null;

  return (
    <pointLight 
      ref={glowRef}
      position={[0, 0.5, 0]} 
      intensity={2} 
      color="#FFD700" 
      distance={5}
    />
  );
}

export function Player() {
  const groupRef = useRef<THREE.Group>(null);
  const { phase, isMoving, isOnFire, streak, currentPosition, board } = useGameState();
  const targetXRef = useRef(0);
  const currentXRef = useRef(0);

  const targetX = useMemo(() => {
    return calculateTargetX(currentPosition, board);
  }, [currentPosition, board]);

  useEffect(() => {
    targetXRef.current = targetX;
  }, [targetX]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    currentXRef.current = THREE.MathUtils.lerp(currentXRef.current, targetXRef.current, delta * (isMoving ? 2.5 : 1.5));
    
    const bobOffset = Math.sin(state.clock.elapsedTime * 1.2) * 0.15;
    const pitchBob = Math.sin(state.clock.elapsedTime * 1.0) * 0.05;
    const rollBob = Math.sin(state.clock.elapsedTime * 0.7) * 0.08;

    groupRef.current.position.x = currentXRef.current;
    groupRef.current.position.y = 0.6 + bobOffset;
    groupRef.current.rotation.x = pitchBob;
    groupRef.current.rotation.z = rollBob;

    if (isMoving) {
      groupRef.current.rotation.x = pitchBob + 0.12;
      groupRef.current.position.y = 0.8 + bobOffset;
      const turnAngle = (targetXRef.current - currentXRef.current) * 0.05;
      groupRef.current.rotation.y = THREE.MathUtils.clamp(turnAngle, -0.3, 0.3);
    } else {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, delta * 2);
    }
  });

  if (phase === "menu" || phase === "betting") {
    return null;
  }

  const isVictory = phase === "won" || phase === "cashed_out";
  const fireIntensity = Math.min(streak / 5, 1.5);

  return (
    <group ref={groupRef} position={[0, 0.6, 0]} scale={1.3}>
      <ShipHull />
      <ShipDeck />
      <Mast />
      <Sail />
      <PirateFlag />
      <GoldenBow />
      <WakeEffect intensity={isMoving ? 1.8 : 1} />
      <FireEffect active={isOnFire} intensity={fireIntensity} />
      <GoldenGlow active={isVictory} />
    </group>
  );
}
