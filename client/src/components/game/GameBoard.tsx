import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
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
      
      {step.multiplier && (
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
          <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.3} />
        </mesh>
      )}
      
      {step.type === "hazard" && (
        <mesh position={[0, 0.3, 0]} rotation={[0, Math.PI / 4, 0]}>
          <boxGeometry args={[0.2, 0.3, 0.2]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
        </mesh>
      )}
      
      {step.type === "finish" && (
        <mesh position={[0, 0.4, 0]}>
          <coneGeometry args={[0.25, 0.4, 4]} />
          <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.5} />
        </mesh>
      )}
      
      {step.type === "powerup_shield" && (
        <mesh position={[0, 0.35, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#63b3ed" emissive="#63b3ed" emissiveIntensity={0.6} transparent opacity={0.8} />
        </mesh>
      )}
      
      {step.type === "powerup_double" && (
        <mesh position={[0, 0.35, 0]}>
          <torusGeometry args={[0.15, 0.06, 8, 16]} />
          <meshStandardMaterial color="#f6e05e" emissive="#f6e05e" emissiveIntensity={0.6} />
        </mesh>
      )}
      
      {step.type === "powerup_skip" && (
        <mesh position={[0, 0.35, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.25, 0.08, 0.08]} />
          <meshStandardMaterial color="#68d391" emissive="#68d391" emissiveIntensity={0.6} />
        </mesh>
      )}
      
      {step.type === "bonus_chest" && (
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[0.25, 0.2, 0.18]} />
          <meshStandardMaterial color="#ed8936" emissive="#ed8936" emissiveIntensity={0.4} />
        </mesh>
      )}
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
