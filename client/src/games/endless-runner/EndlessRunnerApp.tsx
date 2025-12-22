import React, { useEffect, useRef, useState, useCallback, Suspense, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, useKeyboardControls, KeyboardControls } from '@react-three/drei';
import { useLocation } from 'wouter';
import * as THREE from 'three';
import { ArrowLeft, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/lib/stores/useWallet';

const LANES = [-2, 0, 2];
const LANE_WIDTH = 2;
const PLAYER_SIZE = 1;
const JUMP_FORCE = 0.35;
const GRAVITY = 0.018;

interface DifficultyPreset {
  name: string;
  color: string;
  initialSpeed: number;
  maxSpeed: number;
  speedIncrease: number;
  obstacleSpacing: number;
  doubleObstacleChance: number;
  finishDistance: number;
}

const DIFFICULTY_PRESETS: DifficultyPreset[] = [
  {
    name: 'Easy',
    color: '#22cc55',
    initialSpeed: 0.12,
    maxSpeed: 0.25,
    speedIncrease: 0.0002,
    obstacleSpacing: 14,
    doubleObstacleChance: 0.15,
    finishDistance: 80,
  },
  {
    name: 'Normal',
    color: '#ffaa00',
    initialSpeed: 0.15,
    maxSpeed: 0.32,
    speedIncrease: 0.0003,
    obstacleSpacing: 11,
    doubleObstacleChance: 0.3,
    finishDistance: 120,
  },
  {
    name: 'Hard',
    color: '#ff4444',
    initialSpeed: 0.18,
    maxSpeed: 0.4,
    speedIncrease: 0.0004,
    obstacleSpacing: 8,
    doubleObstacleChance: 0.45,
    finishDistance: 180,
  },
];

enum Controls {
  left = 'left',
  right = 'right',
  jump = 'jump',
}

interface GameState {
  playerLane: number;
  playerY: number;
  isJumping: boolean;
  jumpVelocity: number;
  obstacles: Obstacle[];
  coins: Coin[];
  carrots: Carrot[];
  speed: number;
  distance: number;
  coinsCollected: number;
  multiplier: number;
  wager: number;
  gameActive: boolean;
  lastObstacleZ: number;
  lastCoinZ: number;
  lastCarrotZ: number;
  difficulty: DifficultyPreset;
  finishDistance: number;
  finished: boolean;
}

interface Obstacle {
  id: number;
  x: number;
  y: number;
  z: number;
  size: number;
}

interface Coin {
  id: number;
  x: number;
  y: number;
  z: number;
  value: number;
  rotation: number;
}

interface Carrot {
  id: number;
  x: number;
  y: number;
  z: number;
  mult: number;
}

function CityBuilding({ position, height, width }: { position: [number, number, number]; height: number; width: number }) {
  const windowRows = Math.floor(height / 1.2);
  const windowCols = Math.floor(width / 0.8);
  
  const windows = useMemo(() => {
    const wins = [];
    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        if (Math.random() > 0.3) {
          wins.push({
            x: (col - windowCols / 2 + 0.5) * 0.7,
            y: (row - windowRows / 2 + 0.5) * 1.1 + height / 2,
            lit: Math.random() > 0.4,
          });
        }
      }
    }
    return wins;
  }, [windowRows, windowCols, height]);

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[width, height, width * 0.8]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      {windows.map((win, idx) => (
        <mesh key={idx} position={[win.x, win.y - height / 2, width * 0.41]}>
          <planeGeometry args={[0.5, 0.8]} />
          <meshStandardMaterial
            color={win.lit ? '#ffee88' : '#334455'}
            emissive={win.lit ? '#ffcc44' : '#000000'}
            emissiveIntensity={win.lit ? 0.8 : 0}
          />
        </mesh>
      ))}
    </group>
  );
}

function CityBackground() {
  const leftBuildings = useMemo(() => {
    const buildings = [];
    for (let i = 0; i < 12; i++) {
      buildings.push({
        z: -i * 12 - 5,
        height: 8 + Math.random() * 12,
        width: 3 + Math.random() * 2,
      });
    }
    return buildings;
  }, []);

  const rightBuildings = useMemo(() => {
    const buildings = [];
    for (let i = 0; i < 12; i++) {
      buildings.push({
        z: -i * 12 - 8,
        height: 8 + Math.random() * 12,
        width: 3 + Math.random() * 2,
      });
    }
    return buildings;
  }, []);

  return (
    <group>
      {leftBuildings.map((b, idx) => (
        <CityBuilding
          key={`left-${idx}`}
          position={[-10 - b.width / 2, b.height / 2 - 0.5, b.z]}
          height={b.height}
          width={b.width}
        />
      ))}
      {rightBuildings.map((b, idx) => (
        <CityBuilding
          key={`right-${idx}`}
          position={[10 + b.width / 2, b.height / 2 - 0.5, b.z]}
          height={b.height}
          width={b.width}
        />
      ))}
      <mesh position={[0, 15, -80]}>
        <planeGeometry args={[120, 40]} />
        <meshBasicMaterial color="#0a0a1a" />
      </mesh>
      {Array.from({ length: 50 }).map((_, i) => (
        <mesh key={`star-${i}`} position={[(Math.random() - 0.5) * 100, 10 + Math.random() * 20, -79]}>
          <circleGeometry args={[0.1 + Math.random() * 0.1, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      <mesh position={[30, 25, -78]}>
        <circleGeometry args={[3, 32]} />
        <meshBasicMaterial color="#ffffee" />
      </mesh>
    </group>
  );
}

function CityStreet() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, -50]} receiveShadow>
        <planeGeometry args={[14, 200]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {Array.from({ length: 40 }).map((_, idx) => (
        <mesh key={`line-${idx}`} position={[0, -0.48, -idx * 5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.2, 2]} />
          <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.3} />
        </mesh>
      ))}
      <mesh position={[-7.5, -0.48, -50]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, 200]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[7.5, -0.48, -50]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, 200]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {Array.from({ length: 10 }).map((_, idx) => (
        <group key={`lamp-${idx}`}>
          <mesh position={[-8, 3, -idx * 15 - 5]}>
            <cylinderGeometry args={[0.1, 0.1, 6, 8]} />
            <meshStandardMaterial color="#444444" />
          </mesh>
          <pointLight position={[-8, 5.5, -idx * 15 - 5]} color="#ffaa66" intensity={0.5} distance={15} />
          <mesh position={[8, 3, -idx * 15 - 10]}>
            <cylinderGeometry args={[0.1, 0.1, 6, 8]} />
            <meshStandardMaterial color="#444444" />
          </mesh>
          <pointLight position={[8, 5.5, -idx * 15 - 10]} color="#ffaa66" intensity={0.5} distance={15} />
        </group>
      ))}
    </group>
  );
}

interface FinishLineProps {
  distance: number;
  scrollZ: number;
}

function FinishLine({ distance, scrollZ }: FinishLineProps) {
  const z = -(distance - scrollZ);
  if (z > 10 || z < -100) return null;

  return (
    <group position={[0, 0, z]}>
      <mesh position={[-7, 4, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 8, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[7, 4, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 8, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 7.5, 0]}>
        <boxGeometry args={[14, 1, 0.3]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) =>
        Array.from({ length: 4 }).map((_, j) => (
          <mesh key={`check-${i}-${j}`} position={[-5.25 + i * 1.5, 7 + j * 0.25, 0.2]}>
            <boxGeometry args={[0.7, 0.2, 0.1]} />
            <meshStandardMaterial color={(i + j) % 2 === 0 ? '#000000' : '#ffffff'} />
          </mesh>
        ))
      )}
      <Text
        position={[0, 9, 0]}
        fontSize={1.5}
        color="#00ff00"
        anchorX="center"
        anchorY="middle"
      >
        FINISH
      </Text>
    </group>
  );
}

interface CarPlayerProps {
  lane: number;
  y: number;
  isMoving: boolean;
}

function CarPlayer({ lane, y, isMoving }: CarPlayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetX = LANES[lane];
  const currentX = useRef(targetX);
  const wheelRotation = useRef(0);
  
  useFrame(() => {
    if (!groupRef.current) return;
    
    currentX.current = THREE.MathUtils.lerp(currentX.current, targetX, 0.15);
    groupRef.current.position.x = currentX.current;
    groupRef.current.position.y = y;
    
    if (isMoving) {
      wheelRotation.current += 0.3;
    }
  });

  return (
    <group ref={groupRef} position={[targetX, y, 0]}>
      <pointLight position={[0, 2, 0]} color="#ffffff" intensity={2} distance={8} />
      
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[1.2, 0.4, 2.2]} />
        <meshStandardMaterial color="#ff9999" emissive="#ff6666" emissiveIntensity={0.3} metalness={0.4} roughness={0.4} />
      </mesh>
      
      <mesh position={[0, 0.65, -0.2]} castShadow>
        <boxGeometry args={[1, 0.4, 1.2]} />
        <meshStandardMaterial color="#ff9999" emissive="#ff6666" emissiveIntensity={0.3} metalness={0.4} roughness={0.4} />
      </mesh>
      
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[0.95, 0.35, 0.9]} />
        <meshStandardMaterial color="#aaddff" emissive="#88ccff" emissiveIntensity={0.2} metalness={0.9} roughness={0.1} transparent opacity={0.7} />
      </mesh>
      
      <mesh position={[-0.5, 0.1, 0.7]} rotation={[wheelRotation.current, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.15, 16]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[0.5, 0.1, 0.7]} rotation={[wheelRotation.current, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.15, 16]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[-0.5, 0.1, -0.7]} rotation={[wheelRotation.current, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.15, 16]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[0.5, 0.1, -0.7]} rotation={[wheelRotation.current, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.15, 16]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      
      <mesh position={[0, 0.35, 1.15]}>
        <boxGeometry args={[0.8, 0.15, 0.05]} />
        <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={1} />
      </mesh>
      <mesh position={[-0.35, 0.35, -1.15]}>
        <boxGeometry args={[0.2, 0.1, 0.05]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1} />
      </mesh>
      <mesh position={[0.35, 0.35, -1.15]}>
        <boxGeometry args={[0.2, 0.1, 0.05]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1} />
      </mesh>
    </group>
  );
}

interface ObstacleProps {
  obstacle: Obstacle;
  scrollZ: number;
}

const OBSTACLE_CAR_COLORS = ['#3366ff', '#ffcc00', '#00cc66', '#cc66ff', '#ff6633'];

function ObstacleCar({ obstacle, scrollZ }: ObstacleProps) {
  const z = -(obstacle.z - scrollZ);
  if (z > 5 || z < -60) return null;
  
  const colorIndex = obstacle.id % OBSTACLE_CAR_COLORS.length;
  const carColor = OBSTACLE_CAR_COLORS[colorIndex];
  
  return (
    <group position={[obstacle.x, 0, z]}>
      <pointLight position={[0, 1.5, 0]} color="#ffffff" intensity={0.8} distance={5} />
      
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[1.1, 0.35, 2]} />
        <meshStandardMaterial color={carColor} emissive={carColor} emissiveIntensity={0.2} metalness={0.5} roughness={0.4} />
      </mesh>
      
      <mesh position={[0, 0.6, -0.15]} castShadow>
        <boxGeometry args={[0.95, 0.35, 1.1]} />
        <meshStandardMaterial color={carColor} emissive={carColor} emissiveIntensity={0.2} metalness={0.5} roughness={0.4} />
      </mesh>
      
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[0.9, 0.3, 0.8]} />
        <meshStandardMaterial color="#334455" emissive="#223344" emissiveIntensity={0.1} metalness={0.9} roughness={0.1} transparent opacity={0.6} />
      </mesh>
      
      <mesh position={[-0.45, 0.1, 0.65]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.12, 12]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      <mesh position={[0.45, 0.1, 0.65]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.12, 12]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      <mesh position={[-0.45, 0.1, -0.65]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.12, 12]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      <mesh position={[0.45, 0.1, -0.65]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.12, 12]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      
      <mesh position={[0, 0.3, 1.05]}>
        <boxGeometry args={[0.7, 0.12, 0.05]} />
        <meshStandardMaterial color="#ffff88" emissive="#ffff00" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[-0.3, 0.3, -1.05]}>
        <boxGeometry args={[0.18, 0.1, 0.05]} />
        <meshStandardMaterial color="#ff3333" emissive="#ff0000" emissiveIntensity={1} />
      </mesh>
      <mesh position={[0.3, 0.3, -1.05]}>
        <boxGeometry args={[0.18, 0.1, 0.05]} />
        <meshStandardMaterial color="#ff3333" emissive="#ff0000" emissiveIntensity={1} />
      </mesh>
    </group>
  );
}

interface CoinProps {
  coin: Coin;
  scrollZ: number;
}

function CoinMesh({ coin, scrollZ }: CoinProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const z = -(coin.z - scrollZ);
  const visible = z <= 5 && z >= -60;
  
  useFrame(() => {
    if (meshRef.current && visible) {
      meshRef.current.rotation.y += 0.05;
    }
  });

  if (!visible) return null;

  const color = coin.value >= 100 ? '#FFD700' : coin.value >= 50 ? '#FFA500' : '#FFFF00';
  
  return (
    <mesh ref={meshRef} position={[coin.x, coin.y, z]}>
      <cylinderGeometry args={[0.35, 0.35, 0.12, 16]} />
      <meshStandardMaterial 
        color={color} 
        metalness={0.9} 
        roughness={0.1} 
        emissive={color}
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}

interface CarrotProps {
  carrot: Carrot;
  scrollZ: number;
}

function CarrotMesh({ carrot, scrollZ }: CarrotProps) {
  const meshRef = useRef<THREE.Group>(null);
  const z = -(carrot.z - scrollZ);
  const visible = z <= 5 && z >= -60;
  
  useFrame(() => {
    if (meshRef.current && visible) {
      meshRef.current.rotation.y += 0.03;
      meshRef.current.position.y = carrot.y + Math.sin(Date.now() * 0.005) * 0.1;
    }
  });
  
  if (!visible) return null;
  
  return (
    <group ref={meshRef} position={[carrot.x, carrot.y, z]}>
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.2, 0.6, 8]} />
        <meshStandardMaterial color="#ff6600" />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <coneGeometry args={[0.15, 0.2, 6]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
      <Text
        position={[0, 0.6, 0]}
        fontSize={0.25}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        +{carrot.mult.toFixed(1)}x
      </Text>
    </group>
  );
}

interface GameSceneProps {
  gameState: React.MutableRefObject<GameState>;
  scrollZ: number;
  onCollision: () => void;
  onCoinCollect: (value: number) => void;
  onCarrotCollect: (mult: number) => void;
}

function GameScene({ gameState, scrollZ, onCollision, onCoinCollect, onCarrotCollect }: GameSceneProps) {
  const [, getKeys] = useKeyboardControls<Controls>();
  const gs = gameState.current;
  const lastLaneChange = useRef(0);
  
  useFrame(() => {
    if (!gs.gameActive) return;
    
    const keys = getKeys();
    const now = Date.now();
    
    if (now - lastLaneChange.current > 150) {
      if (keys.left && gs.playerLane > 0) {
        gs.playerLane--;
        lastLaneChange.current = now;
      } else if (keys.right && gs.playerLane < 2) {
        gs.playerLane++;
        lastLaneChange.current = now;
      }
    }
    
    if (keys.jump && !gs.isJumping) {
      gs.isJumping = true;
      gs.jumpVelocity = JUMP_FORCE;
    }
    
    if (gs.isJumping) {
      gs.playerY += gs.jumpVelocity;
      gs.jumpVelocity -= GRAVITY;
      if (gs.playerY <= 0) {
        gs.playerY = 0;
        gs.isJumping = false;
        gs.jumpVelocity = 0;
      }
    }
    
    const playerX = LANES[gs.playerLane];
    const playerY = gs.playerY + PLAYER_SIZE / 2;
    const playerZ = 0;
    
    for (let i = gs.obstacles.length - 1; i >= 0; i--) {
      const obs = gs.obstacles[i];
      const obsVisualZ = -(obs.z - scrollZ);
      if (Math.abs(playerX - obs.x) < 0.8 && 
          Math.abs(playerY - obs.y) < 1 && 
          Math.abs(playerZ - obsVisualZ) < 0.8) {
        onCollision();
        return;
      }
    }
    
    for (let i = gs.coins.length - 1; i >= 0; i--) {
      const coin = gs.coins[i];
      const coinVisualZ = -(coin.z - scrollZ);
      if (Math.abs(playerX - coin.x) < 0.8 && 
          Math.abs(playerY - coin.y) < 0.8 && 
          Math.abs(playerZ - coinVisualZ) < 0.8) {
        onCoinCollect(coin.value);
        gs.coins.splice(i, 1);
      }
    }
    
    for (let i = gs.carrots.length - 1; i >= 0; i--) {
      const carrot = gs.carrots[i];
      const carrotVisualZ = -(carrot.z - scrollZ);
      if (Math.abs(playerX - carrot.x) < 0.8 && 
          Math.abs(playerY - carrot.y) < 0.8 && 
          Math.abs(playerZ - carrotVisualZ) < 0.8) {
        onCarrotCollect(carrot.mult);
        gs.carrots.splice(i, 1);
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.15} color="#4466aa" />
      <directionalLight position={[10, 20, 10]} intensity={0.3} color="#6688cc" castShadow />
      <fog attach="fog" args={['#0a0a1a', 30, 120]} />
      
      <CityBackground />
      <CityStreet />
      
      <CarPlayer lane={gs.playerLane} y={gs.playerY} isMoving={gs.gameActive} />
      
      <FinishLine distance={gs.finishDistance} scrollZ={scrollZ} />
      
      {gs.obstacles.map(obs => (
        <ObstacleCar key={obs.id} obstacle={obs} scrollZ={scrollZ} />
      ))}
      
      {gs.coins.map(coin => (
        <CoinMesh key={coin.id} coin={coin} scrollZ={scrollZ} />
      ))}
      
      {gs.carrots.map(carrot => (
        <CarrotMesh key={carrot.id} carrot={carrot} scrollZ={scrollZ} />
      ))}
    </>
  );
}

function GameCamera() {
  const { camera } = useThree();
  
  useFrame(() => {
    camera.position.set(0, 5, 8);
    camera.lookAt(0, 1, -10);
  });
  
  return null;
}

export function EndlessRunnerApp() {
  const { 
    isConnected, 
    walletAddress, 
    kicksBalance, 
    refreshBalance,
    transactionState,
    signClaimMessage,
    requestKicksFromHouse,
  } = useWallet();
  
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<'loading' | 'menu' | 'playing' | 'ended'>('loading');
  const [isWagering, setIsWagering] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [displayKicks, setDisplayKicks] = useState(0);
  const [displayMult, setDisplayMult] = useState("1.00");
  const [displayCoins, setDisplayCoins] = useState(0);
  const [displayDistance, setDisplayDistance] = useState(0);
  const [endMessage, setEndMessage] = useState("");
  const [scrollZ, setScrollZ] = useState(0);
  const [currentRunId, setCurrentRunId] = useState<number | null>(null);
  const [hasServerRun, setHasServerRun] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentDifficulty, setCurrentDifficulty] = useState<DifficultyPreset>(DIFFICULTY_PRESETS[0]);
  
  const gameStateRef = useRef<GameState>({
    playerLane: 1,
    playerY: 0,
    isJumping: false,
    jumpVelocity: 0,
    obstacles: [],
    coins: [],
    carrots: [],
    speed: DIFFICULTY_PRESETS[0].initialSpeed,
    distance: 0,
    coinsCollected: 0,
    multiplier: 1.0,
    wager: 0,
    gameActive: false,
    lastObstacleZ: 0,
    lastCoinZ: 0,
    lastCarrotZ: 0,
    difficulty: DIFFICULTY_PRESETS[0],
    finishDistance: DIFFICULTY_PRESETS[0].finishDistance,
    finished: false,
  });
  
  const animationRef = useRef<number>();
  const idCounter = useRef(0);
  
  useEffect(() => {
    setPhase('menu');
  }, []);
  
  useEffect(() => {
    setDisplayKicks(parseFloat(kicksBalance) || 0);
  }, [kicksBalance]);
  
  const spawnObjects = useCallback((currentDistance: number) => {
    const gs = gameStateRef.current;
    const diff = gs.difficulty;
    
    while (gs.lastObstacleZ < Math.min(currentDistance + 60, gs.finishDistance - 5)) {
      gs.lastObstacleZ += diff.obstacleSpacing + Math.random() * 4;
      const lane = LANES[Math.floor(Math.random() * 3)];
      gs.obstacles.push({
        id: idCounter.current++,
        x: lane,
        y: PLAYER_SIZE / 2,
        z: gs.lastObstacleZ,
        size: PLAYER_SIZE,
      });
      if (Math.random() < diff.doubleObstacleChance) {
        const otherLanes = LANES.filter(l => l !== lane);
        const secondLane = otherLanes[Math.floor(Math.random() * otherLanes.length)];
        gs.obstacles.push({
          id: idCounter.current++,
          x: secondLane,
          y: PLAYER_SIZE / 2,
          z: gs.lastObstacleZ,
          size: PLAYER_SIZE,
        });
      }
    }
    
    while (gs.lastCoinZ < Math.min(currentDistance + 60, gs.finishDistance)) {
      gs.lastCoinZ += 2 + Math.random() * 2;
      const lane = LANES[Math.floor(Math.random() * 3)];
      const height = Math.random() > 0.5 ? 1.5 : 0.8;
      const rand = Math.random();
      const value = rand > 0.9 ? 100 : rand > 0.5 ? 50 : 10;
      gs.coins.push({
        id: idCounter.current++,
        x: lane,
        y: height,
        z: gs.lastCoinZ,
        value: value,
        rotation: 0,
      });
    }
    
    while (gs.lastCarrotZ < Math.min(currentDistance + 60, gs.finishDistance)) {
      gs.lastCarrotZ += 12 + Math.random() * 8;
      const lane = LANES[Math.floor(Math.random() * 3)];
      const mults = [0.25, 0.5, 0.75];
      gs.carrots.push({
        id: idCounter.current++,
        x: lane,
        y: 1.2,
        z: gs.lastCarrotZ,
        mult: mults[Math.floor(Math.random() * mults.length)],
      });
    }
    
    gs.obstacles = gs.obstacles.filter(o => o.z > currentDistance - 10);
    gs.coins = gs.coins.filter(c => c.z > currentDistance - 10);
    gs.carrots = gs.carrots.filter(c => c.z > currentDistance - 10);
  }, []);
  
  const handleFinish = useCallback(async () => {
    const gs = gameStateRef.current;
    gs.gameActive = false;
    gs.finished = true;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    const totalPayout = Math.floor(gs.coinsCollected * gs.multiplier * 1.5);
    setEndMessage(`FINISHED! Won ${totalPayout.toLocaleString()} KICKS (1.5x bonus!)`);
    setPhase('ended');
    
    if (hasServerRun && currentRunId) {
      try {
        await fetch('/api/rabbit-rush/run/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            runId: currentRunId,
            wager: 0,
            finalMultiplier: gs.multiplier * 1.5,
            payout: totalPayout,
            coinsCollected: gs.coinsCollected,
            enemiesDestroyed: 0,
            won: true,
          }),
        });
      } catch (e) {
        console.error('Failed to save run:', e);
      }
    }
  }, [hasServerRun, currentRunId, walletAddress]);
  
  const gameLoop = useCallback(() => {
    const gs = gameStateRef.current;
    if (!gs.gameActive) return;
    
    gs.distance += gs.speed;
    gs.speed = Math.min(gs.speed + gs.difficulty.speedIncrease * 0.1, gs.difficulty.maxSpeed);
    
    if (gs.distance >= gs.finishDistance && !gs.finished) {
      handleFinish();
      return;
    }
    
    spawnObjects(gs.distance);
    setScrollZ(gs.distance);
    setDisplayDistance(Math.floor(gs.distance * 10));
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [spawnObjects, handleFinish]);
  
  const handleCollision = useCallback(async () => {
    const gs = gameStateRef.current;
    gs.gameActive = false;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    const totalPayout = Math.floor(gs.coinsCollected * gs.multiplier);
    setEndMessage(`CRASHED! Collected ${totalPayout.toLocaleString()} KICKS`);
    setPhase('ended');
    
    if (hasServerRun && currentRunId) {
      try {
        await fetch('/api/rabbit-rush/run/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            runId: currentRunId,
            wager: 0,
            finalMultiplier: gs.multiplier,
            payout: totalPayout,
            coinsCollected: gs.coinsCollected,
            enemiesDestroyed: 0,
            won: gs.coinsCollected > 0,
          }),
        });
      } catch (e) {
        console.error('Failed to save run:', e);
      }
    }
  }, [hasServerRun, currentRunId, walletAddress]);
  
  const handleCoinCollect = useCallback((value: number) => {
    const gs = gameStateRef.current;
    gs.coinsCollected += value;
    setDisplayCoins(gs.coinsCollected);
  }, []);
  
  const handleCarrotCollect = useCallback((mult: number) => {
    const gs = gameStateRef.current;
    gs.multiplier = Math.min(gs.multiplier + mult, 5);
    setDisplayMult(gs.multiplier.toFixed(2));
  }, []);
  
  const handleStartGame = async () => {
    if (isWagering) return;
    
    setIsWagering(true);
    
    let runId = Date.now();
    let serverRunCreated = false;
    
    try {
      const res = await fetch('/api/rabbit-rush/run/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, wager: 0, depositTxHash: 'free-play' }),
      });
      if (res.ok) {
        const data = await res.json();
        runId = data.runId || runId;
        serverRunCreated = true;
      }
    } catch (e) {
      console.warn('API failed, using local ID');
    }
    
    setCurrentRunId(runId);
    setHasServerRun(serverRunCreated);
    
    const difficulty = DIFFICULTY_PRESETS[Math.floor(Math.random() * DIFFICULTY_PRESETS.length)];
    setCurrentDifficulty(difficulty);
    
    gameStateRef.current = {
      playerLane: 1,
      playerY: 0,
      isJumping: false,
      jumpVelocity: 0,
      obstacles: [],
      coins: [],
      carrots: [],
      speed: difficulty.initialSpeed,
      distance: 0,
      coinsCollected: 0,
      multiplier: 1.0,
      wager: 0,
      gameActive: true,
      lastObstacleZ: 0,
      lastCoinZ: 0,
      lastCarrotZ: 0,
      difficulty: difficulty,
      finishDistance: difficulty.finishDistance,
      finished: false,
    };
    
    setScrollZ(0);
    setDisplayMult("1.00");
    setDisplayCoins(0);
    setDisplayDistance(0);
    idCounter.current = 0;
    
    setIsWagering(false);
    setPhase('playing');
    
    setTimeout(() => {
      if (gameStateRef.current.gameActive) {
        gameLoop();
      }
    }, 100);
  };
  
  const handleCashout = useCallback(async () => {
    const gs = gameStateRef.current;
    if (!gs.gameActive || isClaiming) return;
    
    gs.gameActive = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    const mult = gs.multiplier;
    const payout = Math.floor(gs.coinsCollected * mult);
    
    if (payout <= 0) {
      setEndMessage(`No coins collected. Try again!`);
      setPhase('ended');
      return;
    }
    
    setIsClaiming(true);
    
    if (hasServerRun && currentRunId) {
      try {
        await fetch('/api/rabbit-rush/run/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            runId: currentRunId,
            wager: 0,
            finalMultiplier: mult,
            payout,
            coinsCollected: gs.coinsCollected,
            enemiesDestroyed: 0,
            won: true,
          }),
        });
      } catch (e) {
        console.error('Failed to save run:', e);
      }
    }
    
    try {
      const nonceRes = await fetch(`/api/rabbit-rush/run/${currentRunId}/claim-nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });
      
      if (!nonceRes.ok) throw new Error('Failed to get nonce');
      const { nonce } = await nonceRes.json();
      
      const signature = await signClaimMessage(payout.toString(), currentRunId!, nonce, 'rabbit-rush');
      if (!signature) {
        setEndMessage(`Signature cancelled. Collect: ${payout} KICKS`);
        setIsClaiming(false);
        setPhase('ended');
        return;
      }
      
      const success = await requestKicksFromHouse(payout.toString(), currentRunId!, signature, nonce, 'rabbit-rush');
      
      if (success) {
        await refreshBalance();
        setEndMessage(`Claimed ${payout.toLocaleString()} KICKS! (${mult.toFixed(2)}x multiplier)`);
      } else {
        setEndMessage(`Claim failed. Contact support.`);
      }
    } catch (e: any) {
      console.error('Cashout error:', e);
      setEndMessage(`Error: ${e.message?.slice(0, 40) || 'Claim failed'}`);
    }
    
    setIsClaiming(false);
    setPhase('ended');
  }, [hasServerRun, currentRunId, walletAddress, isClaiming, signClaimMessage, requestKicksFromHouse, refreshBalance]);
  
  const handleClaimAfterCrash = useCallback(async () => {
    const gs = gameStateRef.current;
    const payout = Math.floor(gs.coinsCollected * gs.multiplier);
    
    if (payout <= 0) {
      setEndMessage(`No coins to claim`);
      return;
    }
    
    setIsClaiming(true);
    
    try {
      const nonceRes = await fetch(`/api/rabbit-rush/run/${currentRunId}/claim-nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });
      
      if (!nonceRes.ok) throw new Error('Failed to get nonce');
      const { nonce } = await nonceRes.json();
      
      const signature = await signClaimMessage(payout.toString(), currentRunId!, nonce, 'rabbit-rush');
      if (!signature) {
        setEndMessage(`Signature cancelled. Unclaimed: ${payout} KICKS`);
        setIsClaiming(false);
        return;
      }
      
      const success = await requestKicksFromHouse(payout.toString(), currentRunId!, signature, nonce, 'rabbit-rush');
      
      if (success) {
        await refreshBalance();
        setEndMessage(`Claimed ${payout.toLocaleString()} KICKS!`);
      } else {
        setEndMessage(`Claim failed. Contact support.`);
      }
    } catch (e: any) {
      console.error('Claim error:', e);
      setEndMessage(`Error: ${e.message?.slice(0, 40) || 'Claim failed'}`);
    }
    
    setIsClaiming(false);
  }, [currentRunId, walletAddress, signClaimMessage, requestKicksFromHouse, refreshBalance]);
  
  const handleSwipe = (direction: 'left' | 'right' | 'up') => {
    if (phase !== 'playing') return;
    const gs = gameStateRef.current;
    
    if (direction === 'left' && gs.playerLane > 0) {
      gs.playerLane--;
    } else if (direction === 'right' && gs.playerLane < 2) {
      gs.playerLane++;
    } else if (direction === 'up' && !gs.isJumping) {
      gs.isJumping = true;
      gs.jumpVelocity = JUMP_FORCE;
    }
  };
  
  const keyMap = useMemo(() => [
    { name: Controls.left, keys: ['ArrowLeft', 'KeyA'] },
    { name: Controls.right, keys: ['ArrowRight', 'KeyD'] },
    { name: Controls.jump, keys: ['ArrowUp', 'KeyW', 'Space'] },
  ], []);

  useEffect(() => {
    if (!isConnected) {
      setLocation('/');
    }
  }, [isConnected, setLocation]);

  if (!isConnected) {
    return null;
  }

  return (
    <KeyboardControls map={keyMap}>
      <div className="w-full h-screen bg-gradient-to-b from-slate-900 to-indigo-900 relative overflow-hidden">
        <div className="absolute top-4 left-4 z-50 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/')}
            className="bg-black/30 hover:bg-black/50 text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMuted(!muted)}
            className="bg-black/30 hover:bg-black/50 text-white"
          >
            {muted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </Button>
        </div>
        
        <div className="absolute top-4 right-4 z-50 bg-black/50 px-4 py-2 rounded-lg">
          <span className="text-white font-bold">{displayKicks.toLocaleString()} KICKS</span>
        </div>
        
        {phase === 'playing' && (
          <>
            <div className="absolute top-20 left-4 z-50 bg-black/70 px-4 py-2 rounded-lg space-y-1">
              <div className="text-white flex items-center gap-2">
                Difficulty: 
                <span className="font-bold px-2 py-0.5 rounded" style={{ backgroundColor: currentDifficulty.color }}>
                  {currentDifficulty.name}
                </span>
              </div>
              <div className="text-white">
                Progress: <span className="font-bold text-cyan-400">
                  {Math.min(100, Math.floor((gameStateRef.current.distance / gameStateRef.current.finishDistance) * 100))}%
                </span>
              </div>
              <div className="text-white">Multiplier: <span className="font-bold text-orange-400">{displayMult}x</span></div>
              <div className="text-white">Coins: <span className="font-bold text-yellow-300">+{displayCoins}</span></div>
            </div>
            
            <Button
              onClick={handleCashout}
              disabled={isClaiming || displayCoins === 0}
              className="absolute top-20 right-4 z-50 bg-green-500 hover:bg-green-600 text-white text-xl px-6 py-3"
            >
              {isClaiming ? 'Claiming...' : `CLAIM ${Math.floor(displayCoins * parseFloat(displayMult))} KICKS`}
            </Button>
          </>
        )}
        
        <Canvas shadows camera={{ position: [0, 5, 8], fov: 75 }}>
          <Suspense fallback={null}>
            {(phase === 'playing' || phase === 'menu' || phase === 'ended') && (
              <>
                <GameCamera />
                <GameScene 
                  gameState={gameStateRef} 
                  scrollZ={scrollZ}
                  onCollision={handleCollision}
                  onCoinCollect={handleCoinCollect}
                  onCarrotCollect={handleCarrotCollect}
                />
              </>
            )}
          </Suspense>
        </Canvas>
        
        {phase === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40">
            <div className="text-center p-8">
              <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Loading Assets...</h2>
              <p className="text-gray-400">Preparing volcanic cave environment</p>
            </div>
          </div>
        )}
        
        {phase === 'menu' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-40">
            <div className="text-center p-8 bg-slate-900/90 rounded-2xl border border-cyan-500/50 max-w-md">
              <h1 className="text-4xl font-bold text-white mb-2">🌃 NIGHT DRIVE</h1>
              <p className="text-gray-300 mb-2">Race through the city at night!</p>
              <p className="text-cyan-400 text-sm mb-4">Free to play - Collect coins and reach the finish line!</p>
              <div className="text-sm text-gray-400 mb-4">
                Difficulty is randomly selected each game
              </div>
              <Button
                onClick={handleStartGame}
                disabled={isWagering}
                className="text-xl px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              >
                <Play className="w-6 h-6 mr-2" /> {isWagering ? 'Starting...' : 'START RACE'}
              </Button>
            </div>
          </div>
        )}
        
        {phase === 'ended' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-40">
            <div className="text-center p-8 bg-slate-900/90 rounded-2xl border border-cyan-500/50 max-w-md">
              <h2 className="text-2xl font-bold text-white mb-2">{endMessage}</h2>
              <p className="text-gray-300 mb-2">Distance: {displayDistance}m</p>
              <p className="text-yellow-400 mb-4">
                Coins: {displayCoins} × {displayMult}x = {Math.floor(displayCoins * parseFloat(displayMult))} KICKS
              </p>
              <div className="flex flex-col gap-3">
                {displayCoins > 0 && !endMessage.includes('Claimed') && (
                  <Button
                    onClick={handleClaimAfterCrash}
                    disabled={isClaiming}
                    className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    {isClaiming ? 'Claiming...' : `CLAIM ${Math.floor(displayCoins * parseFloat(displayMult))} KICKS`}
                  </Button>
                )}
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={handleStartGame}
                    disabled={isWagering}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500"
                  >
                    <RotateCcw className="w-5 h-5 mr-2" /> Play Again
                  </Button>
                  <Button
                    onClick={() => setLocation('/')}
                    variant="outline"
                    className="px-6 py-3"
                  >
                    Back to Games
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {phase === 'playing' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-4">
            <Button
              onClick={() => handleSwipe('left')}
              className="w-20 h-16 text-2xl bg-orange-500/80 hover:bg-orange-600"
            >
              ←
            </Button>
            <Button
              onClick={() => handleSwipe('up')}
              className="w-20 h-16 text-2xl bg-red-500/80 hover:bg-red-600"
            >
              ↑
            </Button>
            <Button
              onClick={() => handleSwipe('right')}
              className="w-20 h-16 text-2xl bg-orange-500/80 hover:bg-orange-600"
            >
              →
            </Button>
          </div>
        )}
        
        {(isWagering || isClaiming) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
            <div className="bg-gray-900 border border-orange-500/50 rounded-2xl p-6 max-w-sm text-center">
              <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                {isWagering ? 'Starting Game...' : 'Claiming Winnings...'}
              </h3>
              <p className="text-gray-400">
                {transactionState.message || 'Please confirm in your wallet'}
              </p>
            </div>
          </div>
        )}
      </div>
    </KeyboardControls>
  );
}

export default EndlessRunnerApp;
