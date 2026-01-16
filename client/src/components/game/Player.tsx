import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameState } from "@/lib/stores/useGameState";

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

  useFrame((state) => {
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2.5) * 0.2;
    }
  });

  return (
    <group ref={flagRef} position={[0, 1, 0.1]}>
      <mesh position={[0.12, 0, 0]}>
        <planeGeometry args={[0.25, 0.18]} />
        <meshStandardMaterial color="#1a1a1a" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.12, 0, 0.01]}>
        <circleGeometry args={[0.035, 8]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0.08, -0.025, 0.01]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.06, 0.015, 0.01]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0.16, -0.025, 0.01]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[0.06, 0.015, 0.01]} />
        <meshStandardMaterial color="#FFFFFF" />
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
  const { phase, isMoving, isOnFire, streak } = useGameState();
  const bobOffset = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    bobOffset.current = Math.sin(state.clock.elapsedTime * 1.5) * 0.12;
    const pitchBob = Math.sin(state.clock.elapsedTime * 1.2) * 0.04;
    const rollBob = Math.sin(state.clock.elapsedTime * 0.8) * 0.06;

    groupRef.current.position.y = 0.4 + bobOffset.current;
    groupRef.current.rotation.x = pitchBob;
    groupRef.current.rotation.z = rollBob;

    if (isMoving) {
      groupRef.current.rotation.x = pitchBob + 0.08;
      groupRef.current.position.y = 0.5 + bobOffset.current;
    }
  });

  if (phase === "menu" || phase === "betting") {
    return null;
  }

  const isVictory = phase === "won" || phase === "cashed_out";
  const isLost = phase === "lost";
  const fireIntensity = Math.min(streak / 5, 1.5);

  return (
    <group ref={groupRef} position={[0, 0.5, 0]}>
      <ShipHull />
      <ShipDeck />
      <Mast />
      <Sail />
      <PirateFlag />
      <GoldenBow />
      <WakeEffect intensity={isMoving ? 1.5 : 0.8} />
      <FireEffect active={isOnFire} intensity={fireIntensity} />
      <GoldenGlow active={isVictory} />
    </group>
  );
}
