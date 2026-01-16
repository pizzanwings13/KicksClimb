import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useGameState, BoardStep, StepType } from "@/lib/stores/useGameState";

const STEP_SIZE = 1.2;
const BOARD_COLS = 10;

function getTileTheme(type: StepType): { color: string; emissive: string; icon: string } {
  switch (type) {
    case "safe":
      return { color: "#2196F3", emissive: "#0D47A1", icon: "~" };
    case "multiplier_1x":
      return { color: "#FFD700", emissive: "#B8860B", icon: "💰" };
    case "multiplier_1_5x":
      return { color: "#FFC107", emissive: "#FF8F00", icon: "💎" };
    case "multiplier_2x":
      return { color: "#FF9800", emissive: "#E65100", icon: "🏴‍☠️" };
    case "multiplier_2_5x":
      return { color: "#FF5722", emissive: "#BF360C", icon: "⚓" };
    case "multiplier_3x":
      return { color: "#E65100", emissive: "#BF360C", icon: "🗺️" };
    case "multiplier_4x":
      return { color: "#D84315", emissive: "#BF360C", icon: "🦜" };
    case "multiplier_5x":
      return { color: "#EF6C00", emissive: "#E65100", icon: "👑" };
    case "multiplier_6x":
      return { color: "#F57C00", emissive: "#EF6C00", icon: "💫" };
    case "multiplier_7x":
      return { color: "#FF8F00", emissive: "#F57C00", icon: "🌊" };
    case "multiplier_8x":
      return { color: "#FFA000", emissive: "#FF8F00", icon: "🔱" };
    case "multiplier_9x":
      return { color: "#FFB300", emissive: "#FFA000", icon: "🌟" };
    case "multiplier_10x":
      return { color: "#FFC107", emissive: "#FFB300", icon: "⭐" };
    case "hazard":
      return { color: "#F44336", emissive: "#B71C1C", icon: "🐙" };
    case "reset_trap":
      return { color: "#00BCD4", emissive: "#006064", icon: "🌀" };
    case "finish":
      return { color: "#FFD700", emissive: "#FFB300", icon: "🏝️" };
    case "powerup_shield":
      return { color: "#03A9F4", emissive: "#01579B", icon: "🛡️" };
    case "powerup_double":
      return { color: "#FFEB3B", emissive: "#F57F17", icon: "⚡" };
    case "powerup_skip":
      return { color: "#4CAF50", emissive: "#1B5E20", icon: "💨" };
    case "bonus_chest":
      return { color: "#8D6E63", emissive: "#4E342E", icon: "📦" };
    default:
      return { color: "#2196F3", emissive: "#0D47A1", icon: "~" };
  }
}

interface StepTileProps {
  step: BoardStep;
  isCurrentPosition: boolean;
}

function WaterTile({ position, index }: { position: [number, number, number]; index: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const offset = (index * 0.7) % (Math.PI * 2);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = -0.05 + Math.sin(state.clock.elapsedTime * 0.8 + offset) * 0.03;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[STEP_SIZE * 0.95, STEP_SIZE * 0.95]} />
      <meshStandardMaterial 
        color="#1565C0"
        emissive="#0D47A1"
        emissiveIntensity={0.15}
        transparent
        opacity={0.7}
        metalness={0.6}
        roughness={0.4}
      />
    </mesh>
  );
}

function TreasureChest({ position, floating = false }: { position: [number, number, number]; floating?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current && floating) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.3, 0.2, 0.2]} />
        <meshStandardMaterial color="#8B4513" metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[0.32, 0.08, 0.22]} />
        <meshStandardMaterial color="#A0522D" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.05, 0.11]}>
        <boxGeometry args={[0.08, 0.08, 0.02]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.5} metalness={0.8} />
      </mesh>
    </group>
  );
}

function SeaMonster({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh castShadow>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial color="#2E7D32" emissive="#1B5E20" emissiveIntensity={0.3} />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <mesh key={i} position={[Math.cos(i * 0.8) * 0.25, -0.1, Math.sin(i * 0.8) * 0.25]} rotation={[0.5, i * 0.8, 0]}>
          <cylinderGeometry args={[0.02, 0.04, 0.25, 6]} />
          <meshStandardMaterial color="#1B5E20" />
        </mesh>
      ))}
      <mesh position={[-0.08, 0.08, 0.15]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#FFEB3B" emissive="#FFEB3B" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.08, 0.08, 0.15]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#FFEB3B" emissive="#FFEB3B" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function Whirlpool({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 2;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.05, 8, 16]} />
        <meshStandardMaterial color="#00BCD4" emissive="#00838F" emissiveIntensity={0.5} transparent opacity={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <torusGeometry args={[0.12, 0.03, 8, 16]} />
        <meshStandardMaterial color="#26C6DA" emissive="#00ACC1" emissiveIntensity={0.6} transparent opacity={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <circleGeometry args={[0.06, 16]} />
        <meshStandardMaterial color="#4DD0E1" emissive="#00BCD4" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function GoldCoin({ position, multiplier }: { position: [number, number, number]; multiplier?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 2;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.03;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <cylinderGeometry args={[0.12, 0.12, 0.04, 16]} />
      <meshStandardMaterial 
        color="#FFD700" 
        emissive="#FFB300" 
        emissiveIntensity={0.6}
        metalness={0.9}
        roughness={0.1}
      />
    </mesh>
  );
}

function DevilFruit({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial 
          color="#E65100" 
          emissive="#BF360C" 
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.06, 6]} />
        <meshStandardMaterial color="#2E7D32" />
      </mesh>
      <mesh position={[0.05, 0.22, 0]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[0.08, 0.04, 0.02]} />
        <meshStandardMaterial color="#4CAF50" />
      </mesh>
    </group>
  );
}

function Shield({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshStandardMaterial 
        color="#03A9F4" 
        emissive="#0288D1" 
        emissiveIntensity={0.6}
        transparent
        opacity={0.7}
        metalness={0.3}
        roughness={0.2}
      />
    </mesh>
  );
}

function TreasureIsland({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime) * 0.02;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.35, 0.4, 0.15, 8]} />
        <meshStandardMaterial color="#D4A574" />
      </mesh>
      <mesh position={[0.1, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      <mesh position={[0.1, 0.35, 0]} castShadow>
        <coneGeometry args={[0.15, 0.2, 8]} />
        <meshStandardMaterial color="#2E7D32" />
      </mesh>
      <mesh position={[0.1, 0.45, 0]} castShadow>
        <coneGeometry args={[0.1, 0.15, 8]} />
        <meshStandardMaterial color="#4CAF50" />
      </mesh>
      <mesh position={[-0.12, 0.1, 0.08]}>
        <boxGeometry args={[0.12, 0.08, 0.08]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      <mesh position={[-0.12, 0.15, 0.08]}>
        <boxGeometry args={[0.04, 0.04, 0.01]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function StepTile({ step, isCurrentPosition }: StepTileProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  const row = Math.floor(step.position / BOARD_COLS);
  const colInRow = step.position % BOARD_COLS;
  const col = row % 2 === 0 ? colInRow : BOARD_COLS - 1 - colInRow;
  
  const x = (col - BOARD_COLS / 2 + 0.5) * STEP_SIZE;
  const z = (row - 5) * STEP_SIZE;
  
  const theme = getTileTheme(step.type);
  
  useFrame((state) => {
    if (meshRef.current) {
      if (isCurrentPosition) {
        meshRef.current.position.y = 0.15 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
      } else {
        meshRef.current.position.y = 0.08 + Math.sin(state.clock.elapsedTime * 0.8 + step.position * 0.5) * 0.02;
      }
    }
    if (glowRef.current && isCurrentPosition) {
      glowRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.1);
    }
  });

  const isSafe = step.type === "safe";
  const isMultiplier = step.type.startsWith("multiplier");
  const isHazard = step.type === "hazard";
  const isResetTrap = step.type === "reset_trap";
  const isFinish = step.type === "finish";
  const isPowerup = step.type.startsWith("powerup");
  const isChest = step.type === "bonus_chest";

  return (
    <group position={[x, 0, z]}>
      <WaterTile position={[0, -0.1, 0]} index={step.position} />
      
      <mesh ref={meshRef} position={[0, 0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[STEP_SIZE * 0.4, STEP_SIZE * 0.42, 0.15, isSafe ? 6 : 8]} />
        <meshStandardMaterial 
          color={theme.color} 
          emissive={theme.emissive}
          emissiveIntensity={isCurrentPosition ? 0.6 : 0.25}
          metalness={0.2}
          roughness={0.6}
        />
      </mesh>
      
      {isCurrentPosition && (
        <mesh ref={glowRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[STEP_SIZE * 0.45, STEP_SIZE * 0.55, 32]} />
          <meshStandardMaterial 
            color="#FFD700"
            emissive="#FFD700"
            emissiveIntensity={1}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}
      
      <Text
        position={[0, 0.22, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.25}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {step.position}
      </Text>
      
      {isMultiplier && step.multiplier && (
        <GoldCoin position={[0, 0.35, 0]} multiplier={step.multiplier} />
      )}
      
      {isHazard && (
        <SeaMonster position={[0, 0.35, 0]} />
      )}
      
      {isResetTrap && (
        <Whirlpool position={[0, 0.25, 0]} />
      )}
      
      {isFinish && (
        <TreasureIsland position={[0, 0.25, 0]} />
      )}
      
      {step.type === "powerup_shield" && (
        <Shield position={[0, 0.4, 0]} />
      )}
      
      {step.type === "powerup_double" && (
        <DevilFruit position={[0, 0.35, 0]} />
      )}
      
      {step.type === "powerup_skip" && (
        <mesh position={[0, 0.35, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.25, 0.08, 0.08]} />
          <meshStandardMaterial color="#4CAF50" emissive="#2E7D32" emissiveIntensity={0.6} />
        </mesh>
      )}
      
      {isChest && (
        <TreasureChest position={[0, 0.25, 0]} floating />
      )}
      
      {step.multiplier && step.type !== "finish" && (
        <Text
          position={[0, 0.55, 0]}
          rotation={[-Math.PI / 4, 0, 0]}
          fontSize={0.18}
          color="#FFD700"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {step.multiplier}x
        </Text>
      )}
    </group>
  );
}

function OceanBackground() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current && meshRef.current.material) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial 
        color="#0D47A1"
        emissive="#1565C0"
        emissiveIntensity={0.1}
        metalness={0.3}
        roughness={0.6}
      />
    </mesh>
  );
}

function ParchmentBoard() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]} receiveShadow>
      <planeGeometry args={[14, 14]} />
      <meshStandardMaterial 
        color="#D4A574"
        emissive="#8B6914"
        emissiveIntensity={0.05}
        metalness={0.1}
        roughness={0.9}
      />
    </mesh>
  );
}

function SunsetSky() {
  return (
    <group>
      <mesh position={[20, 12, -25]}>
        <sphereGeometry args={[4, 32, 32]} />
        <meshStandardMaterial 
          color="#FF6B35"
          emissive="#FF4500"
          emissiveIntensity={1}
        />
      </mesh>
      <pointLight position={[20, 12, -25]} intensity={0.8} color="#FF6B35" distance={80} />
      
      <mesh position={[-15, 8, -20]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshStandardMaterial color="#FFE4B5" emissive="#FFA500" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function DistantIslands() {
  const islands = useMemo(() => [
    { x: -18, z: -15, scale: 2.5 },
    { x: 18, z: -12, scale: 2 },
    { x: -12, z: -20, scale: 3 },
    { x: 15, z: -22, scale: 2.8 },
    { x: 0, z: -25, scale: 4 },
  ], []);

  return (
    <group>
      {islands.map((island, i) => (
        <group key={i} position={[island.x, 0, island.z]}>
          <mesh castShadow>
            <coneGeometry args={[island.scale * 0.8, island.scale * 1.2, 8]} />
            <meshStandardMaterial color="#228B22" flatShading />
          </mesh>
          <mesh position={[0, island.scale * 0.6, 0]} castShadow>
            <coneGeometry args={[island.scale * 0.5, island.scale * 0.8, 8]} />
            <meshStandardMaterial color="#2E8B57" flatShading />
          </mesh>
          <mesh position={[island.scale * 0.3, island.scale * 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, island.scale * 0.8, 6]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          <mesh position={[island.scale * 0.3, island.scale * 0.7, 0]} castShadow>
            <sphereGeometry args={[island.scale * 0.25, 8, 8]} />
            <meshStandardMaterial color="#228B22" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function FloatingShips() {
  const ships = useMemo(() => [
    { x: -10, z: 8 },
    { x: 12, z: 10 },
  ], []);

  return (
    <group>
      {ships.map((ship, i) => (
        <group key={i} position={[ship.x, 0.5, ship.z]}>
          <mesh rotation={[0, i * Math.PI / 3, 0]} castShadow>
            <boxGeometry args={[0.8, 0.3, 0.4]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0, 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.6, 6]} />
            <meshStandardMaterial color="#5D4037" />
          </mesh>
          <mesh position={[0, 0.5, 0.08]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <planeGeometry args={[0.3, 0.4]} />
            <meshStandardMaterial color="#FFFFFF" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function GameBoard() {
  const { board, currentPosition, phase } = useGameState();
  
  const visibleBoard = useMemo(() => {
    if (board.length === 0) return [];
    return board;
  }, [board]);

  if (phase === "menu" || phase === "betting") {
    return null;
  }

  return (
    <group>
      <OceanBackground />
      <ParchmentBoard />
      <SunsetSky />
      <DistantIslands />
      <FloatingShips />
      
      {visibleBoard.map((step) => (
        <StepTile
          key={step.position}
          step={step}
          isCurrentPosition={step.position === currentPosition}
        />
      ))}
    </group>
  );
}
