import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameState } from "@/lib/stores/useGameState";

const OCEAN_SIZE = 800;
const WAVE_SEGMENTS = 64;

function Ocean() {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  const { currentPosition } = useGameState();
  const scrollOffsetRef = useRef(0);
  
  const initialPositions = useMemo(() => {
    const positions: number[] = [];
    const segmentSize = OCEAN_SIZE / WAVE_SEGMENTS;
    for (let i = 0; i <= WAVE_SEGMENTS; i++) {
      for (let j = 0; j <= WAVE_SEGMENTS; j++) {
        positions.push(i * segmentSize - OCEAN_SIZE / 2);
        positions.push(0);
        positions.push(j * segmentSize - OCEAN_SIZE / 2);
      }
    }
    return new Float32Array(positions);
  }, []);

  useFrame((state, delta) => {
    if (geometryRef.current) {
      const positions = geometryRef.current.attributes.position.array as Float32Array;
      const time = state.clock.elapsedTime;
      
      scrollOffsetRef.current = THREE.MathUtils.lerp(scrollOffsetRef.current, currentPosition * 0.5, delta * 2);
      
      for (let i = 0; i < positions.length; i += 3) {
        const x = initialPositions[i];
        const z = initialPositions[i + 2] + scrollOffsetRef.current;
        positions[i + 1] = 
          Math.sin(x * 0.06 + time * 0.8) * 0.3 +
          Math.sin(z * 0.08 + time * 0.6) * 0.25 +
          Math.sin((x + z) * 0.04 + time * 0.4) * 0.15;
      }
      geometryRef.current.attributes.position.needsUpdate = true;
      geometryRef.current.computeVertexNormals();
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 100]} receiveShadow>
      <planeGeometry ref={geometryRef} args={[OCEAN_SIZE, OCEAN_SIZE, WAVE_SEGMENTS, WAVE_SEGMENTS]} />
      <meshStandardMaterial 
        color="#0088CC"
        emissive="#003366"
        emissiveIntensity={0.2}
        metalness={0.4}
        roughness={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function OceanFoam() {
  const { currentPosition } = useGameState();
  const groupRef = useRef<THREE.Group>(null);
  
  const foamPatches = useMemo(() => {
    const patches: { x: number; z: number; scale: number; offset: number }[] = [];
    for (let i = 0; i < 40; i++) {
      patches.push({
        x: ((i * 17.3) % 60) - 30,
        z: ((i * 23.7) % 100) - 50,
        scale: 0.8 + (i * 0.7) % 1.5,
        offset: (i * 1.3) % (Math.PI * 2)
      });
    }
    return patches;
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      const targetZ = currentPosition * 0.8;
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, delta * 3);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.1, 0]}>
      {foamPatches.map((patch, i) => (
        <FoamPatch key={i} position={[patch.x, 0, patch.z]} scale={patch.scale} offset={patch.offset} />
      ))}
    </group>
  );
}

function FoamPatch({ position, scale, offset }: { position: [number, number, number]; scale: number; offset: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(scale * (0.8 + Math.sin(state.clock.elapsedTime * 1.5 + offset) * 0.2));
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.4 + Math.sin(state.clock.elapsedTime * 2 + offset) * 0.15;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1, 12]} />
      <meshStandardMaterial 
        color="#FFFFFF"
        emissive="#E0F7FA"
        emissiveIntensity={0.3}
        transparent
        opacity={0.45}
      />
    </mesh>
  );
}

function TreasureIsland({ position, discovered }: { position: [number, number, number]; discovered?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + 0.8 + Math.sin(state.clock.elapsedTime * 0.4) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={1.5}>
      <mesh castShadow receiveShadow>
        <coneGeometry args={[2.5, 1.8, 8]} />
        <meshStandardMaterial color="#F4A460" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow>
        <coneGeometry args={[0.35, 2.5, 6]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
      <mesh position={[-0.6, 1.1, 0.5]} castShadow>
        <coneGeometry args={[0.3, 2, 6]} />
        <meshStandardMaterial color="#2E8B57" />
      </mesh>
      
      <mesh position={[0.9, 1, -0.3]} castShadow>
        <boxGeometry args={[0.6, 0.4, 0.4]} />
        <meshStandardMaterial color="#8B4513" metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[0.9, 1.25, -0.3]}>
        <boxGeometry args={[0.15, 0.15, 0.04]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={1} metalness={0.9} />
      </mesh>
      
      <GlowRing position={[0, 3, 0]} color="#FFD700" label="TREASURE" />
      
      {!discovered && (
        <mesh position={[0, 4, 0]}>
          <sphereGeometry args={[0.35, 8, 8]} />
          <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={1.5} />
        </mesh>
      )}
    </group>
  );
}

function MonsterIsland({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + 0.8 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={1.5}>
      <mesh castShadow receiveShadow>
        <coneGeometry args={[2.2, 2, 8]} />
        <meshStandardMaterial color="#4A4A4A" roughness={0.95} />
      </mesh>
      
      <mesh position={[0.4, 1.4, 0]} castShadow>
        <coneGeometry args={[0.3, 1, 5]} />
        <meshStandardMaterial color="#333333" roughness={0.9} />
      </mesh>
      <mesh position={[-0.5, 1.2, 0.3]} castShadow>
        <coneGeometry args={[0.25, 0.8, 5]} />
        <meshStandardMaterial color="#333333" roughness={0.9} />
      </mesh>
      
      <mesh position={[0, 0.7, 0.9]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#FF0000" emissive="#FF0000" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0.35, 0.7, 0.85]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#FF0000" emissive="#FF0000" emissiveIntensity={1.5} />
      </mesh>
      
      <GlowRing position={[0, 3, 0]} color="#FF4444" label="DANGER" />
      
      <pointLight position={[0, 2, 0]} color="#FF4444" intensity={1} distance={6} />
    </group>
  );
}

function SafeIsland({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + 0.8 + Math.sin(state.clock.elapsedTime * 0.35) * 0.04;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={1.5}>
      <mesh castShadow receiveShadow>
        <coneGeometry args={[2, 1.5, 8]} />
        <meshStandardMaterial color="#DEB887" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <coneGeometry args={[0.35, 2.2, 6]} />
        <meshStandardMaterial color="#32CD32" />
      </mesh>
      <mesh position={[0.6, 1, 0.4]} castShadow>
        <coneGeometry args={[0.28, 1.6, 6]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
      <mesh position={[-0.5, 1, -0.3]} castShadow>
        <coneGeometry args={[0.22, 1.3, 6]} />
        <meshStandardMaterial color="#2E8B57" />
      </mesh>
      
      <GlowRing position={[0, 2.8, 0]} color="#4CAF50" label="SAFE" />
    </group>
  );
}

function BonusIsland({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + 0.8 + Math.sin(state.clock.elapsedTime * 0.6) * 0.06;
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={1.5}>
      <mesh castShadow receiveShadow>
        <coneGeometry args={[2.3, 1.6, 8]} />
        <meshStandardMaterial color="#87CEEB" roughness={0.8} />
      </mesh>
      
      <mesh position={[0, 1.7, 0]}>
        <torusGeometry args={[0.9, 0.18, 8, 16]} />
        <meshStandardMaterial color="#00BFFF" emissive="#00BFFF" emissiveIntensity={0.8} />
      </mesh>
      
      <mesh position={[0, 1.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.7, 0.14, 8, 16]} />
        <meshStandardMaterial color="#00CED1" emissive="#00CED1" emissiveIntensity={0.6} />
      </mesh>
      
      <GlowRing position={[0, 3.2, 0]} color="#00BFFF" label="BONUS" />
      
      <pointLight position={[0, 2.5, 0]} color="#00BFFF" intensity={1.2} distance={7} />
    </group>
  );
}

function GlowRing({ position, color, label }: { position: [number, number, number]; color: string; label: string }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 1.5;
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.08, 8, 16]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={1}
          transparent
          opacity={0.9}
        />
      </mesh>
      <pointLight position={[0, 0.2, 0]} color={color} intensity={0.6} distance={4} />
    </group>
  );
}

function Cloud({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const baseX = position[0];
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.x = baseX + Math.sin(state.clock.elapsedTime * 0.05) * 2;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <mesh>
        <sphereGeometry args={[1.8, 12, 12]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#F8F8FF" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[1.4, 0.2, 0]}>
        <sphereGeometry args={[1.3, 12, 12]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#F8F8FF" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[-1.3, 0.15, 0]}>
        <sphereGeometry args={[1.2, 12, 12]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#F8F8FF" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#F8F8FF" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function Seagull({ position, speed = 1 }: { position: [number, number, number]; speed?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const startX = position[0];
  
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime * speed;
      groupRef.current.position.x = startX + Math.sin(t * 0.3) * 10;
      groupRef.current.position.y = position[1] + Math.sin(t * 1.5) * 0.5;
      groupRef.current.rotation.z = Math.sin(t * 2) * 0.2;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.6, 0.05, 0.15]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.6, 0.05, 0.15]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.1, 6, 6]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
    </group>
  );
}

function FloatingIcon({ type, position }: { type: string; position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.3;
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  const getIconContent = () => {
    if (type.includes("multiplier")) {
      const mult = type.replace("multiplier_", "").replace("x", "").replace("_", ".");
      return (
        <group>
          <mesh>
            <cylinderGeometry args={[0.4, 0.4, 0.1, 16]} />
            <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} emissive="#FFD700" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.05, 16]} />
            <meshStandardMaterial color="#FFA500" metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      );
    }
    if (type === "hazard" || type === "reset_trap") {
      return (
        <group>
          <mesh>
            <sphereGeometry args={[0.35, 8, 8]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[0.12, 0.15, 0.25]}>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshStandardMaterial color="#FF0000" emissive="#FF0000" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[-0.12, 0.15, 0.25]}>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshStandardMaterial color="#FF0000" emissive="#FF0000" emissiveIntensity={0.5} />
          </mesh>
        </group>
      );
    }
    if (type === "bonus_chest") {
      return (
        <group>
          <mesh>
            <boxGeometry args={[0.5, 0.35, 0.35]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <boxGeometry args={[0.55, 0.1, 0.38]} />
            <meshStandardMaterial color="#A0522D" />
          </mesh>
          <mesh position={[0, 0.1, 0.18]}>
            <boxGeometry args={[0.1, 0.1, 0.05]} />
            <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      );
    }
    if (type.includes("powerup_shield")) {
      return (
        <mesh>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshStandardMaterial color="#00BFFF" transparent opacity={0.7} emissive="#00BFFF" emissiveIntensity={0.4} />
        </mesh>
      );
    }
    if (type.includes("powerup_skip")) {
      return (
        <group rotation={[0, 0, -Math.PI / 2]}>
          <mesh>
            <coneGeometry args={[0.25, 0.5, 8]} />
            <meshStandardMaterial color="#00FF00" emissive="#00FF00" emissiveIntensity={0.3} />
          </mesh>
        </group>
      );
    }
    if (type === "finish") {
      return (
        <group>
          <mesh>
            <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0.2, 0.25, 0]}>
            <boxGeometry args={[0.4, 0.3, 0.05]} />
            <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.5} />
          </mesh>
        </group>
      );
    }
    return (
      <mesh>
        <torusGeometry args={[0.3, 0.08, 8, 16]} />
        <meshStandardMaterial color="#32CD32" emissive="#32CD32" emissiveIntensity={0.3} />
      </mesh>
    );
  };

  return (
    <group ref={groupRef} position={[position[0], position[1] + 2, position[2]]}>
      {getIconContent()}
      <pointLight position={[0, 0.5, 0]} intensity={0.5} color="#FFFFFF" distance={3} />
    </group>
  );
}

function LandingIndicator({ position, isActive }: { position: [number, number, number]; isActive: boolean; type?: string }) {
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ringRef.current && isActive) {
      ringRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.2);
      const mat = ringRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.6 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
    }
  });

  if (!isActive) return null;

  return (
    <mesh ref={ringRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.5, 2, 24]} />
      <meshStandardMaterial 
        color="#00FF00"
        emissive="#00FF00"
        emissiveIntensity={1}
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function GameBoard() {
  const { currentPosition, board, isMoving } = useGameState();
  const worldGroupRef = useRef<THREE.Group>(null);
  
  const islandPositions = useMemo(() => {
    return board.map((step: { position: number; type: string }, i: number) => {
      const xOffset = ((i * 17.3 + step.position * 7.1) % 14) - 7;
      const showSafeIsland = step.type !== "safe" || (i % 4 === 0);
      return {
        position: step.position,
        type: step.type,
        x: xOffset,
        z: -step.position * 8,
        show: showSafeIsland
      };
    }).filter((item: { show: boolean }) => item.show);
  }, [board]);

  const decorativeElements = useMemo(() => {
    const elements: { type: string; x: number; z: number; scale: number }[] = [];
    
    for (let i = 0; i < 15; i++) {
      elements.push({
        type: "cloud",
        x: ((i * 31.7) % 80) - 40,
        z: -i * 25 - 20,
        scale: 0.8 + (i * 0.4) % 0.6
      });
    }
    
    for (let i = 0; i < 10; i++) {
      elements.push({
        type: "seagull",
        x: ((i * 19.3) % 60) - 30,
        z: -i * 30 - 15,
        scale: 0.8 + (i * 0.3) % 0.5
      });
    }
    
    return elements;
  }, []);

  useFrame((_, delta) => {
    if (worldGroupRef.current) {
      const targetZ = currentPosition * 8;
      worldGroupRef.current.position.z = THREE.MathUtils.lerp(
        worldGroupRef.current.position.z,
        targetZ,
        delta * (isMoving ? 0.8 : 1.5)
      );
    }
  });

  const currentIsland = useMemo(() => {
    return islandPositions.find((island: { position: number }) => island.position === currentPosition);
  }, [currentPosition, islandPositions]);

  return (
    <group>
      <Ocean />
      <OceanFoam />
      
      <group ref={worldGroupRef}>
        {islandPositions.map((island: { position: number; type: string; x: number; z: number; show: boolean }, i: number) => {
          const isCurrentIsland = island.position === currentPosition;
          const pos: [number, number, number] = [island.x, 0.5, island.z];
          
          return (
            <group key={`island-${island.position}`}>
              {island.type === "hazard" && <MonsterIsland position={pos} />}
              {island.type.includes("multiplier") && <TreasureIsland position={pos} discovered={island.position < currentPosition} />}
              {island.type === "bonus_chest" && <BonusIsland position={pos} />}
              {island.type === "reset_trap" && <MonsterIsland position={pos} />}
              {island.type === "safe" && <SafeIsland position={pos} />}
              
              <FloatingIcon type={island.type} position={[island.x, 4, island.z]} />
              {isCurrentIsland && !isMoving && (
                <LandingIndicator 
                  position={[island.x, 0.2, island.z]} 
                  isActive={true}
                  type={island.type}
                />
              )}
            </group>
          );
        })}
        
        {decorativeElements.map((el, i) => {
          if (el.type === "cloud") {
            return <Cloud key={`cloud-${i}`} position={[el.x, 15 + (i % 5), el.z]} scale={el.scale} />;
          }
          if (el.type === "seagull") {
            return <Seagull key={`seagull-${i}`} position={[el.x, 8 + (i % 3), el.z]} speed={el.scale} />;
          }
          return null;
        })}
      </group>
    </group>
  );
}
