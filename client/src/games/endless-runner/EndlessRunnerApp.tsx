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
    initialSpeed: 0.22,
    maxSpeed: 0.4,
    speedIncrease: 0.0003,
    obstacleSpacing: 14,
    doubleObstacleChance: 0.15,
    finishDistance: 200,
  },
  {
    name: 'Normal',
    color: '#ffaa00',
    initialSpeed: 0.28,
    maxSpeed: 0.5,
    speedIncrease: 0.0004,
    obstacleSpacing: 11,
    doubleObstacleChance: 0.3,
    finishDistance: 300,
  },
  {
    name: 'Hard',
    color: '#ff4444',
    initialSpeed: 0.35,
    maxSpeed: 0.6,
    speedIncrease: 0.0005,
    obstacleSpacing: 8,
    doubleObstacleChance: 0.45,
    finishDistance: 400,
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

function CityBuilding({ position, height, width, seed }: { position: [number, number, number]; height: number; width: number; seed: number }) {
  const litColor = useMemo(() => {
    const colors = ['#ffee88', '#88ccff', '#ff88aa', '#88ff88'];
    return colors[seed % colors.length];
  }, [seed]);

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[width, height, width * 0.8]} />
        <meshBasicMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[0, 0, width * 0.41]}>
        <planeGeometry args={[width * 0.8, height * 0.9]} />
        <meshBasicMaterial color={litColor} opacity={0.3} transparent />
      </mesh>
    </group>
  );
}

function CityBackground() {
  const leftBuildings = useMemo(() => {
    const buildings = [];
    for (let i = 0; i < 8; i++) {
      const seed = i * 3 + 1;
      buildings.push({
        z: -i * 15 - 5,
        height: 8 + (seed % 5) * 2.5,
        width: 3 + (seed % 3) * 0.7,
        seed,
      });
    }
    return buildings;
  }, []);

  const rightBuildings = useMemo(() => {
    const buildings = [];
    for (let i = 0; i < 8; i++) {
      const seed = i * 3 + 2;
      buildings.push({
        z: -i * 15 - 10,
        height: 8 + (seed % 5) * 2.5,
        width: 3 + (seed % 3) * 0.7,
        seed,
      });
    }
    return buildings;
  }, []);

  const stars = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      x: ((i * 17) % 100) - 50,
      y: 10 + ((i * 13) % 20),
      size: 0.1 + ((i * 7) % 3) * 0.05,
    }));
  }, []);

  return (
    <group>
      {leftBuildings.map((b, idx) => (
        <CityBuilding
          key={`left-${idx}`}
          position={[-10 - b.width / 2, b.height / 2 - 0.5, b.z]}
          height={b.height}
          width={b.width}
          seed={b.seed}
        />
      ))}
      {rightBuildings.map((b, idx) => (
        <CityBuilding
          key={`right-${idx}`}
          position={[10 + b.width / 2, b.height / 2 - 0.5, b.z]}
          height={b.height}
          width={b.width}
          seed={b.seed}
        />
      ))}
      <mesh position={[0, 15, -80]}>
        <planeGeometry args={[120, 40]} />
        <meshBasicMaterial color="#0a0a1a" />
      </mesh>
      {stars.map((star, i) => (
        <mesh key={`star-${i}`} position={[star.x, star.y, -79]}>
          <circleGeometry args={[star.size, 6]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      <mesh position={[30, 25, -78]}>
        <circleGeometry args={[3, 16]} />
        <meshBasicMaterial color="#ffffee" />
      </mesh>
    </group>
  );
}

function CityStreet() {
  const laneLines = useMemo(() => 
    Array.from({ length: 20 }).map((_, idx) => ({ z: -idx * 10 })), 
  []);
  
  const lamps = useMemo(() => 
    Array.from({ length: 6 }).map((_, idx) => ({ z: -idx * 25 })), 
  []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, -50]}>
        <planeGeometry args={[14, 200]} />
        <meshBasicMaterial color="#2a2a2a" />
      </mesh>
      {laneLines.map((line, idx) => (
        <mesh key={`line-${idx}`} position={[0, -0.48, line.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.2, 4]} />
          <meshBasicMaterial color="#ffff00" />
        </mesh>
      ))}
      <mesh position={[-7.5, -0.48, -50]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, 200]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[7.5, -0.48, -50]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, 200]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {lamps.map((lamp, idx) => (
        <group key={`lamp-${idx}`}>
          <mesh position={[-8, 3, lamp.z - 5]}>
            <boxGeometry args={[0.2, 6, 0.2]} />
            <meshBasicMaterial color="#444444" />
          </mesh>
          <pointLight position={[-8, 5.5, lamp.z - 5]} color="#ffaa66" intensity={0.3} distance={12} />
          <mesh position={[8, 3, lamp.z - 10]}>
            <boxGeometry args={[0.2, 6, 0.2]} />
            <meshBasicMaterial color="#444444" />
          </mesh>
          <pointLight position={[8, 5.5, lamp.z - 10]} color="#ffaa66" intensity={0.3} distance={12} />
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

  const checkerPattern = useMemo(() => {
    const pattern = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 2; j++) {
        pattern.push({ x: -3 + i * 2, y: 7 + j * 0.5, black: (i + j) % 2 === 0 });
      }
    }
    return pattern;
  }, []);

  return (
    <group position={[0, 0, z]}>
      <mesh position={[-7, 4, 0]}>
        <boxGeometry args={[0.4, 8, 0.4]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[7, 4, 0]}>
        <boxGeometry args={[0.4, 8, 0.4]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 7.5, 0]}>
        <boxGeometry args={[14, 1, 0.3]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {checkerPattern.map((c, i) => (
        <mesh key={`check-${i}`} position={[c.x, c.y, 0.2]}>
          <boxGeometry args={[1.5, 0.4, 0.1]} />
          <meshBasicMaterial color={c.black ? '#000000' : '#ffffff'} />
        </mesh>
      ))}
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

  const mainColor = '#e10600';
  const accentColor = '#ffffff';
  const darkColor = '#1a1a1a';

  return (
    <group ref={groupRef} position={[targetX, y, 0]}>
      <pointLight position={[0, 2, 0]} color="#ffffff" intensity={1.5} distance={6} />
      
      {/* F1 Main body - long narrow nose */}
      <mesh position={[0, 0.25, 0.3]}>
        <boxGeometry args={[0.5, 0.2, 2.4]} />
        <meshBasicMaterial color={mainColor} />
      </mesh>
      
      {/* F1 Nose cone */}
      <mesh position={[0, 0.22, 1.6]}>
        <boxGeometry args={[0.3, 0.15, 0.4]} />
        <meshBasicMaterial color={mainColor} />
      </mesh>
      
      {/* Cockpit area */}
      <mesh position={[0, 0.35, -0.3]}>
        <boxGeometry args={[0.6, 0.25, 0.8]} />
        <meshBasicMaterial color={darkColor} />
      </mesh>
      
      {/* Driver helmet */}
      <mesh position={[0, 0.55, -0.3]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      
      {/* Halo protection */}
      <mesh position={[0, 0.52, -0.1]}>
        <boxGeometry args={[0.5, 0.06, 0.06]} />
        <meshBasicMaterial color="#333333" />
      </mesh>
      <mesh position={[0, 0.52, -0.5]}>
        <boxGeometry args={[0.5, 0.06, 0.06]} />
        <meshBasicMaterial color="#333333" />
      </mesh>
      <mesh position={[0, 0.52, -0.3]}>
        <boxGeometry args={[0.06, 0.06, 0.5]} />
        <meshBasicMaterial color="#333333" />
      </mesh>
      
      {/* Side pods */}
      <mesh position={[-0.45, 0.22, 0]}>
        <boxGeometry args={[0.35, 0.18, 1.2]} />
        <meshBasicMaterial color={mainColor} />
      </mesh>
      <mesh position={[0.45, 0.22, 0]}>
        <boxGeometry args={[0.35, 0.18, 1.2]} />
        <meshBasicMaterial color={mainColor} />
      </mesh>
      
      {/* Front wing */}
      <mesh position={[0, 0.1, 1.7]}>
        <boxGeometry args={[1.4, 0.04, 0.25]} />
        <meshBasicMaterial color={mainColor} />
      </mesh>
      <mesh position={[-0.6, 0.14, 1.7]}>
        <boxGeometry args={[0.08, 0.12, 0.2]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      <mesh position={[0.6, 0.14, 1.7]}>
        <boxGeometry args={[0.08, 0.12, 0.2]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      
      {/* Rear wing */}
      <mesh position={[0, 0.5, -1.1]}>
        <boxGeometry args={[1.1, 0.2, 0.08]} />
        <meshBasicMaterial color={mainColor} />
      </mesh>
      <mesh position={[-0.45, 0.38, -1.1]}>
        <boxGeometry args={[0.05, 0.25, 0.15]} />
        <meshBasicMaterial color={darkColor} />
      </mesh>
      <mesh position={[0.45, 0.38, -1.1]}>
        <boxGeometry args={[0.05, 0.25, 0.15]} />
        <meshBasicMaterial color={darkColor} />
      </mesh>
      
      {/* Engine cover */}
      <mesh position={[0, 0.35, -0.8]}>
        <boxGeometry args={[0.4, 0.15, 0.5]} />
        <meshBasicMaterial color={mainColor} />
      </mesh>
      
      {/* Front wheels */}
      <mesh position={[-0.7, 0.15, 1.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.15, 12]} />
        <meshBasicMaterial color={darkColor} />
      </mesh>
      <mesh position={[0.7, 0.15, 1.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.15, 12]} />
        <meshBasicMaterial color={darkColor} />
      </mesh>
      
      {/* Rear wheels - larger */}
      <mesh position={[-0.65, 0.18, -0.8]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.2, 12]} />
        <meshBasicMaterial color={darkColor} />
      </mesh>
      <mesh position={[0.65, 0.18, -0.8]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.2, 12]} />
        <meshBasicMaterial color={darkColor} />
      </mesh>
      
      {/* Headlights / front lights */}
      <mesh position={[0, 0.2, 1.85]}>
        <boxGeometry args={[0.2, 0.06, 0.02]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>
      
      {/* Rear lights */}
      <mesh position={[0, 0.35, -1.2]}>
        <boxGeometry args={[0.3, 0.08, 0.02]} />
        <meshBasicMaterial color="#ff0000" />
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
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.1, 0.35, 2]} />
        <meshBasicMaterial color={carColor} />
      </mesh>
      
      <mesh position={[0, 0.6, -0.15]}>
        <boxGeometry args={[0.95, 0.35, 1.1]} />
        <meshBasicMaterial color={carColor} />
      </mesh>
      
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[0.9, 0.3, 0.8]} />
        <meshBasicMaterial color="#445566" transparent opacity={0.6} />
      </mesh>
      
      <mesh position={[-0.45, 0.1, 0.65]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.25, 0.12, 0.25]} />
        <meshBasicMaterial color="#222222" />
      </mesh>
      <mesh position={[0.45, 0.1, 0.65]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.25, 0.12, 0.25]} />
        <meshBasicMaterial color="#222222" />
      </mesh>
      <mesh position={[-0.45, 0.1, -0.65]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.25, 0.12, 0.25]} />
        <meshBasicMaterial color="#222222" />
      </mesh>
      <mesh position={[0.45, 0.1, -0.65]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.25, 0.12, 0.25]} />
        <meshBasicMaterial color="#222222" />
      </mesh>
      
      <mesh position={[0, 0.3, 1.05]}>
        <boxGeometry args={[0.7, 0.12, 0.05]} />
        <meshBasicMaterial color="#ffff88" />
      </mesh>
      <mesh position={[-0.3, 0.3, -1.05]}>
        <boxGeometry args={[0.18, 0.1, 0.05]} />
        <meshBasicMaterial color="#ff3333" />
      </mesh>
      <mesh position={[0.3, 0.3, -1.05]}>
        <boxGeometry args={[0.18, 0.1, 0.05]} />
        <meshBasicMaterial color="#ff3333" />
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
      <boxGeometry args={[0.5, 0.5, 0.12]} />
      <meshBasicMaterial color={color} />
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
    }
  });
  
  if (!visible) return null;
  
  return (
    <group ref={meshRef} position={[carrot.x, carrot.y, z]}>
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI]}>
        <boxGeometry args={[0.3, 0.6, 0.3]} />
        <meshBasicMaterial color="#ff6600" />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[0.25, 0.2, 0.25]} />
        <meshBasicMaterial color="#228B22" />
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
    signMessage,
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
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const lastFrameTimeRef = useRef<number>(Date.now());
  
  useEffect(() => {
    const audio = new Audio('/sounds/background.mp3');
    audio.loop = true;
    audio.volume = 0.3;
    bgMusicRef.current = audio;
    console.log('[Night Drive] Background music initialized');
    
    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
    };
  }, []);
  
  useEffect(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.muted = muted;
      console.log('[Night Drive] Muted:', muted);
    }
  }, [muted]);
  
  useEffect(() => {
    if (phase === 'playing' && bgMusicRef.current) {
      console.log('[Night Drive] Attempting to play background music...');
      bgMusicRef.current.play()
        .then(() => console.log('[Night Drive] Background music playing'))
        .catch((err) => console.log('[Night Drive] Music play failed:', err.message));
    } else if (phase !== 'playing' && bgMusicRef.current) {
      bgMusicRef.current.pause();
      bgMusicRef.current.currentTime = 0;
    }
  }, [phase]);
  
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
    
    const now = Date.now();
    const deltaTime = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;
    
    const targetFrameTime = 16.67;
    const timeScale = Math.min(deltaTime / targetFrameTime, 3);
    
    gs.distance += gs.speed * timeScale;
    gs.speed = Math.min(gs.speed + gs.difficulty.speedIncrease * 0.1 * timeScale, gs.difficulty.maxSpeed);
    
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
    
    lastFrameTimeRef.current = Date.now();
    setTimeout(() => {
      if (gameStateRef.current.gameActive) {
        lastFrameTimeRef.current = Date.now();
        gameLoop();
      }
    }, 100);
  };
  
  const handleCashout = useCallback(async () => {
    console.log('[Night Drive] handleCashout called');
    const gs = gameStateRef.current;
    if (!gs.gameActive || isClaiming) {
      console.log('[Night Drive] handleCashout early return - gameActive:', gs.gameActive, 'isClaiming:', isClaiming);
      return;
    }
    
    gs.gameActive = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    const mult = gs.multiplier;
    const payout = Math.floor(gs.coinsCollected * mult);
    console.log('[Night Drive] Cashout payout:', payout, 'runId:', currentRunId);
    
    if (payout <= 0) {
      setEndMessage(`No coins collected. Try again!`);
      setPhase('ended');
      return;
    }
    
    setIsClaiming(true);
    setEndMessage(`Processing cashout...`);
    setPhase('ended');
    
    try {
      if (hasServerRun && currentRunId) {
        const endRes = await fetch('/api/rabbit-rush/run/end', {
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
        
        if (!endRes.ok) {
          const errData = await endRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to end run');
        }
      }
      
      const authMessage = `Request Rabbit Rush claim nonce for run ${currentRunId}`;
      console.log('[Night Drive] Requesting auth signature for:', authMessage);
      const authSignature = await signMessage(authMessage);
      console.log('[Night Drive] Auth signature result:', authSignature ? 'success' : 'null/cancelled');
      if (!authSignature) {
        setEndMessage(`Signature cancelled. Won: ${payout} KICKS`);
        setIsClaiming(false);
        return;
      }
      
      const nonceRes = await fetch(`/api/rabbit-rush/run/${currentRunId}/claim-nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, authSignature }),
      });
      
      if (!nonceRes.ok) {
        const errData = await nonceRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get nonce');
      }
      const { nonce, expectedPayout } = await nonceRes.json();
      const serverPayout = parseInt(expectedPayout) || payout;
      
      setEndMessage(`Claiming ${serverPayout.toLocaleString()} KICKS...`);
      
      const signature = await signClaimMessage(expectedPayout || payout.toString(), currentRunId!, nonce, 'rabbit-rush');
      if (!signature) {
        setEndMessage(`Signature cancelled. Won: ${serverPayout} KICKS`);
        setIsClaiming(false);
        return;
      }
      
      const success = await requestKicksFromHouse(expectedPayout || payout.toString(), currentRunId!, signature, nonce, 'rabbit-rush');
      
      if (success) {
        await refreshBalance();
        setEndMessage(`Claimed ${serverPayout.toLocaleString()} KICKS! (${mult.toFixed(2)}x)`);
      } else {
        setEndMessage(`Claim failed. Contact support.`);
      }
    } catch (e: any) {
      console.error('Cashout error:', e);
      setEndMessage(`Error: ${e.message?.slice(0, 50) || 'Claim failed'}`);
    }
    
    setIsClaiming(false);
  }, [hasServerRun, currentRunId, walletAddress, isClaiming, signMessage, signClaimMessage, requestKicksFromHouse, refreshBalance]);
  
  const handleClaimAfterCrash = useCallback(async () => {
    console.log('[Night Drive] handleClaimAfterCrash called');
    const gs = gameStateRef.current;
    const payout = Math.floor(gs.coinsCollected * gs.multiplier);
    console.log('[Night Drive] Claim payout:', payout, 'runId:', currentRunId, 'hasServerRun:', hasServerRun);
    
    if (payout <= 0) {
      setEndMessage(`No coins to claim`);
      return;
    }
    
    setIsClaiming(true);
    setEndMessage(`Processing claim...`);
    
    try {
      if (hasServerRun && currentRunId) {
        const endRes = await fetch('/api/rabbit-rush/run/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            runId: currentRunId,
            wager: 0,
            finalMultiplier: gs.multiplier,
            payout,
            coinsCollected: gs.coinsCollected,
            enemiesDestroyed: 0,
            won: true,
          }),
        });
        
        if (!endRes.ok) {
          const errData = await endRes.json().catch(() => ({}));
          if (!errData.error?.includes('already ended')) {
            throw new Error(errData.error || 'Failed to end run');
          }
        }
      }
      
      const authMessage = `Request Rabbit Rush claim nonce for run ${currentRunId}`;
      console.log('[Night Drive Claim] Requesting auth signature...');
      const authSignature = await signMessage(authMessage);
      console.log('[Night Drive Claim] Auth signature result:', authSignature ? 'success' : 'null/cancelled');
      if (!authSignature) {
        setEndMessage(`Signature cancelled. Unclaimed: ${payout} KICKS`);
        setIsClaiming(false);
        return;
      }
      
      const nonceRes = await fetch(`/api/rabbit-rush/run/${currentRunId}/claim-nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, authSignature }),
      });
      
      if (!nonceRes.ok) {
        const errData = await nonceRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get nonce');
      }
      const { nonce, expectedPayout } = await nonceRes.json();
      const serverPayout = parseInt(expectedPayout) || payout;
      
      setEndMessage(`Claiming ${serverPayout.toLocaleString()} KICKS...`);
      
      const signature = await signClaimMessage(expectedPayout || payout.toString(), currentRunId!, nonce, 'rabbit-rush');
      if (!signature) {
        setEndMessage(`Signature cancelled. Unclaimed: ${serverPayout} KICKS`);
        setIsClaiming(false);
        return;
      }
      
      const success = await requestKicksFromHouse(expectedPayout || payout.toString(), currentRunId!, signature, nonce, 'rabbit-rush');
      
      if (success) {
        await refreshBalance();
        setEndMessage(`Claimed ${serverPayout.toLocaleString()} KICKS!`);
      } else {
        setEndMessage(`Claim failed. Contact support.`);
      }
    } catch (e: any) {
      console.error('Claim error:', e);
      setEndMessage(`Error: ${e.message?.slice(0, 50) || 'Claim failed'}`);
    }
    
    setIsClaiming(false);
  }, [hasServerRun, currentRunId, walletAddress, signMessage, signClaimMessage, requestKicksFromHouse, refreshBalance]);
  
  const handleSwipe = useCallback((direction: 'left' | 'right' | 'up') => {
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
  }, [phase]);
  
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);
  
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const minSwipe = 40;
    
    const isSwipe = Math.abs(deltaX) > minSwipe || Math.abs(deltaY) > minSwipe;
    
    if (isSwipe && phase === 'playing') {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > minSwipe) {
          handleSwipe('right');
        } else if (deltaX < -minSwipe) {
          handleSwipe('left');
        }
      } else {
        if (deltaY < -minSwipe) {
          handleSwipe('up');
        }
      }
    }
    touchStartRef.current = null;
  }, [handleSwipe, phase]);
  
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
      <div 
        className="w-full h-screen bg-gradient-to-b from-slate-900 to-indigo-900 relative overflow-hidden"
        onTouchStart={phase === 'playing' ? handleTouchStart : undefined}
        onTouchEnd={phase === 'playing' ? handleTouchEnd : undefined}
      >
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
            <div className="absolute top-16 sm:top-20 left-2 sm:left-4 z-50 bg-black/70 px-2 sm:px-4 py-1 sm:py-2 rounded-lg space-y-0.5 sm:space-y-1 text-xs sm:text-base">
              <div className="text-white flex items-center gap-1 sm:gap-2">
                <span className="hidden sm:inline">Difficulty:</span>
                <span className="font-bold px-1 sm:px-2 py-0.5 rounded text-xs sm:text-sm" style={{ backgroundColor: currentDifficulty.color }}>
                  {currentDifficulty.name}
                </span>
              </div>
              <div className="text-white">
                <span className="font-bold text-cyan-400">
                  {Math.min(100, Math.floor((gameStateRef.current.distance / gameStateRef.current.finishDistance) * 100))}%
                </span>
                <span className="hidden sm:inline"> Progress</span>
              </div>
              <div className="text-white"><span className="font-bold text-orange-400">{displayMult}x</span><span className="hidden sm:inline"> Mult</span></div>
              <div className="text-white"><span className="font-bold text-yellow-300">+{displayCoins}</span><span className="hidden sm:inline"> Coins</span></div>
            </div>
            
            <button
              onClick={handleCashout}
              disabled={isClaiming || displayCoins === 0}
              className="absolute top-16 sm:top-20 right-2 sm:right-4 z-50 bg-gradient-to-r from-green-500 to-emerald-500 active:from-green-700 active:to-emerald-700 active:scale-95 text-white font-bold text-sm sm:text-xl px-3 sm:px-6 py-2 sm:py-3 rounded-xl border-2 border-green-400 shadow-lg shadow-green-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClaiming ? '...' : `${Math.floor(displayCoins * parseFloat(displayMult))} KICKS`}
            </button>
          </>
        )}
        
        <Canvas camera={{ position: [0, 5, 8], fov: 75 }} dpr={[1, 1.5]}>
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-40 p-4">
            <div className="text-center p-4 sm:p-8 bg-slate-900/90 rounded-2xl border border-cyan-500/50 max-w-md w-full mx-4">
              <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">🌃 NIGHT DRIVE</h1>
              <p className="text-gray-300 mb-2 text-sm sm:text-base">Race through the city at night!</p>
              <p className="text-cyan-400 text-xs sm:text-sm mb-4">Free to play - Collect coins and reach the finish!</p>
              <div className="text-xs sm:text-sm text-gray-400 mb-4">
                Swipe to control
              </div>
              <button
                onClick={handleStartGame}
                disabled={isWagering}
                className="mx-auto text-lg sm:text-xl px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-cyan-500 to-blue-500 active:from-cyan-700 active:to-blue-700 active:scale-95 text-white font-bold rounded-xl border-2 border-cyan-400 shadow-lg shadow-cyan-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2" /> {isWagering ? 'Starting...' : 'START RACE'}
              </button>
            </div>
          </div>
        )}
        
        {phase === 'ended' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-40 p-4">
            <div className="text-center p-4 sm:p-8 bg-slate-900/90 rounded-2xl border border-cyan-500/50 max-w-md w-full mx-4">
              <h2 className="text-lg sm:text-2xl font-bold text-white mb-2">{endMessage}</h2>
              <p className="text-gray-300 mb-2 text-sm sm:text-base">Distance: {displayDistance}m</p>
              <p className="text-yellow-400 mb-4 text-sm sm:text-base">
                {displayCoins} × {displayMult}x = {Math.floor(displayCoins * parseFloat(displayMult))} KICKS
              </p>
              <div className="flex flex-col gap-3">
                {displayCoins > 0 && !endMessage.includes('Claimed') && (
                  <button
                    onClick={handleClaimAfterCrash}
                    disabled={isClaiming}
                    className="w-full px-4 sm:px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 active:from-green-700 active:to-emerald-700 active:scale-95 text-white font-bold text-sm sm:text-base rounded-xl border-2 border-green-400 shadow-lg shadow-green-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isClaiming ? 'Claiming...' : `CLAIM ${Math.floor(displayCoins * parseFloat(displayMult))} KICKS`}
                  </button>
                )}
                <div className="flex gap-2 sm:gap-4 justify-center">
                  <button
                    onClick={handleStartGame}
                    disabled={isWagering}
                    className="px-4 sm:px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 active:from-orange-700 active:to-red-700 active:scale-95 text-white font-bold text-sm sm:text-base rounded-xl border-2 border-orange-400 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Play </span>Again
                  </button>
                  <button
                    onClick={() => setLocation('/')}
                    className="px-4 sm:px-6 py-3 bg-slate-700 active:bg-slate-800 active:scale-95 text-white font-bold text-sm sm:text-base rounded-xl border-2 border-slate-500 transition-all"
                  >
                    <span className="hidden sm:inline">Back to </span>Games
                  </button>
                </div>
              </div>
            </div>
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
