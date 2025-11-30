import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useGameState, BoardStep, StepType } from "@/lib/stores/useGameState";

const STEP_SIZE = 1.2;
const BOARD_COLS = 10;

function getStepColor(type: StepType): string {
  switch (type) {
    case "safe":
      return "#4a5568";
    case "multiplier_2x":
      return "#48bb78";
    case "multiplier_3x":
      return "#38b2ac";
    case "multiplier_5x":
      return "#4299e1";
    case "multiplier_10x":
      return "#9f7aea";
    case "hazard":
      return "#e53e3e";
    case "finish":
      return "#ecc94b";
    case "powerup_shield":
      return "#63b3ed";
    case "powerup_double":
      return "#f6e05e";
    case "powerup_skip":
      return "#68d391";
    case "bonus_chest":
      return "#ed8936";
    default:
      return "#4a5568";
  }
}

function getStepEmissive(type: StepType): string {
  switch (type) {
    case "multiplier_2x":
    case "multiplier_3x":
    case "multiplier_5x":
    case "multiplier_10x":
      return "#22543d";
    case "hazard":
      return "#742a2a";
    case "finish":
      return "#744210";
    case "powerup_shield":
      return "#2b6cb0";
    case "powerup_double":
      return "#d69e2e";
    case "powerup_skip":
      return "#276749";
    case "bonus_chest":
      return "#c05621";
    default:
      return "#000000";
  }
}

interface StepTileProps {
  step: BoardStep;
  isCurrentPosition: boolean;
}

function StepTile({ step, isCurrentPosition }: StepTileProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const row = Math.floor(step.position / BOARD_COLS);
  const colInRow = step.position % BOARD_COLS;
  const col = row % 2 === 0 ? colInRow : BOARD_COLS - 1 - colInRow;
  
  const x = (col - BOARD_COLS / 2 + 0.5) * STEP_SIZE;
  const z = (row - 5) * STEP_SIZE;
  
  const color = getStepColor(step.type);
  const emissive = getStepEmissive(step.type);
  
  useFrame((state) => {
    if (meshRef.current) {
      if (isCurrentPosition) {
        meshRef.current.position.y = 0.15 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
      } else if (step.type === "hazard" || step.type === "finish" || step.multiplier) {
        meshRef.current.position.y = 0.1 + Math.sin(state.clock.elapsedTime * 2 + step.position) * 0.02;
      }
    }
  });

  return (
    <group position={[x, 0, z]}>
      <mesh ref={meshRef} position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[STEP_SIZE * 0.9, 0.2, STEP_SIZE * 0.9]} />
        <meshStandardMaterial 
          color={color} 
          emissive={emissive}
          emissiveIntensity={isCurrentPosition ? 0.5 : 0.2}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>
      
      <Text
        position={[0, 0.25, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.35}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {step.position}
      </Text>
      
      {step.multiplier && step.type !== "finish" && (
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
          <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.3} />
        </mesh>
      )}
      
      {step.type === "hazard" && (
        <mesh position={[0, 0.35, 0]} rotation={[0, Math.PI / 4, 0]}>
          <boxGeometry args={[0.2, 0.3, 0.2]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
        </mesh>
      )}
      
      {step.type === "finish" && (
        <mesh position={[0, 0.45, 0]}>
          <coneGeometry args={[0.25, 0.4, 4]} />
          <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.5} />
        </mesh>
      )}
      
      {step.type === "powerup_shield" && (
        <mesh position={[0, 0.4, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#63b3ed" emissive="#63b3ed" emissiveIntensity={0.6} transparent opacity={0.8} />
        </mesh>
      )}
      
      {step.type === "powerup_double" && (
        <mesh position={[0, 0.4, 0]}>
          <torusGeometry args={[0.15, 0.06, 8, 16]} />
          <meshStandardMaterial color="#f6e05e" emissive="#f6e05e" emissiveIntensity={0.6} />
        </mesh>
      )}
      
      {step.type === "powerup_skip" && (
        <mesh position={[0, 0.4, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.25, 0.08, 0.08]} />
          <meshStandardMaterial color="#68d391" emissive="#68d391" emissiveIntensity={0.6} />
        </mesh>
      )}
      
      {step.type === "bonus_chest" && (
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[0.25, 0.2, 0.18]} />
          <meshStandardMaterial color="#ed8936" emissive="#ed8936" emissiveIntensity={0.4} />
        </mesh>
      )}
    </group>
  );
}

function LogoWall() {
  const logoTexture = useTexture("/textures/dashkids-logo.jpg");
  
  return (
    <group position={[0, 4, -12]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[16, 8, 0.5]} />
        <meshStandardMaterial color="#2d3748" metalness={0.2} roughness={0.8} />
      </mesh>
      
      <mesh position={[0, 0, 0.26]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial 
          map={logoTexture} 
          emissive="#ffffff"
          emissiveIntensity={0.1}
        />
      </mesh>
      
      <pointLight position={[0, 2, 2]} intensity={0.5} color="#f6e05e" />
    </group>
  );
}

function Landscape() {
  const mountainPositions = useMemo(() => [
    { x: -15, z: -20, scale: 4, color: "#4a5568" },
    { x: -8, z: -25, scale: 6, color: "#2d3748" },
    { x: 5, z: -22, scale: 5, color: "#4a5568" },
    { x: 15, z: -18, scale: 4.5, color: "#2d3748" },
    { x: 20, z: -25, scale: 7, color: "#4a5568" },
    { x: -20, z: -28, scale: 5.5, color: "#1a202c" },
  ], []);
  
  const treePositions = useMemo(() => [
    { x: -10, z: -8 },
    { x: -12, z: -6 },
    { x: 10, z: -7 },
    { x: 12, z: -5 },
    { x: -11, z: 8 },
    { x: 11, z: 9 },
    { x: -13, z: 6 },
    { x: 13, z: 7 },
  ], []);
  
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#1a365d" />
      </mesh>
      
      {mountainPositions.map((mt, i) => (
        <mesh key={i} position={[mt.x, mt.scale / 2 - 0.5, mt.z]} castShadow>
          <coneGeometry args={[mt.scale * 0.8, mt.scale, 6]} />
          <meshStandardMaterial color={mt.color} flatShading />
        </mesh>
      ))}
      
      {treePositions.map((tree, i) => (
        <group key={i} position={[tree.x, 0, tree.z]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.2, 1, 8]} />
            <meshStandardMaterial color="#5D4037" />
          </mesh>
          <mesh position={[0, 1.5, 0]} castShadow>
            <coneGeometry args={[0.8, 2, 8]} />
            <meshStandardMaterial color="#2E7D32" />
          </mesh>
          <mesh position={[0, 2.2, 0]} castShadow>
            <coneGeometry args={[0.6, 1.5, 8]} />
            <meshStandardMaterial color="#388E3C" />
          </mesh>
        </group>
      ))}
      
      <mesh position={[15, 8, -30]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial color="#f6e05e" emissive="#f6e05e" emissiveIntensity={0.8} />
      </mesh>
      <pointLight position={[15, 8, -30]} intensity={0.3} color="#f6e05e" distance={50} />
      
      <mesh position={[-8, 6, -35]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="#a0aec0" emissive="#a0aec0" emissiveIntensity={0.2} />
      </mesh>
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
      <Landscape />
      <LogoWall />
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[20, 15]} />
        <meshStandardMaterial color="#1a202c" />
      </mesh>
      
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
