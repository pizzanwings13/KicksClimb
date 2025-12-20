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
const INITIAL_SPEED = 0.15;
const MAX_SPEED = 0.4;
const SPEED_INCREASE = 0.0005;

const QUICK_AMOUNTS = ["100", "250", "500", "1000", "2500"];
const MIN_BET = 100;
const MAX_BET = 2500;

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

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <planeGeometry args={[20, 200]} />
      <meshStandardMaterial color="#2a5a1a" />
    </mesh>
  );
}

function Track() {
  const segments = useMemo(() => {
    const segs = [];
    for (let z = 50; z > -150; z -= 4) {
      segs.push(z);
    }
    return segs;
  }, []);

  return (
    <group>
      {segments.map((z, idx) => (
        <group key={idx}>
          {LANES.map((laneX, laneIdx) => (
            <mesh 
              key={`${idx}-${laneIdx}`} 
              position={[laneX, -0.49, z - 2]} 
              rotation={[-Math.PI / 2, 0, 0]}
              receiveShadow
            >
              <planeGeometry args={[LANE_WIDTH - 0.1, 4]} />
              <meshStandardMaterial color={laneIdx === 1 ? '#4a4a4a' : '#3a3a3a'} />
            </mesh>
          ))}
          {idx % 2 === 0 && (
            <>
              <mesh position={[-1, -0.48, z - 2]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.1, 2]} />
                <meshStandardMaterial color="#ffff00" />
              </mesh>
              <mesh position={[1, -0.48, z - 2]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.1, 2]} />
                <meshStandardMaterial color="#ffff00" />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  );
}

interface PlayerProps {
  lane: number;
  y: number;
  hasShield: boolean;
}

function Player({ lane, y, hasShield }: PlayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetX = LANES[lane];
  const bobTime = useRef(0);
  
  useFrame((_, delta) => {
    bobTime.current += delta * 8;
    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, 0.2);
      groupRef.current.position.y = y + PLAYER_SIZE / 2 + Math.sin(bobTime.current) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={[targetX, y + PLAYER_SIZE / 2, 0]}>
      <mesh castShadow position={[0, 0, 0]}>
        <capsuleGeometry args={[0.35, 0.6, 8, 16]} />
        <meshStandardMaterial color="#ff6b35" />
      </mesh>
      <mesh position={[0, 0.6, 0]} castShadow>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#ffb5a0" />
      </mesh>
      <mesh position={[-0.12, 0.85, 0.1]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh position={[0.12, 0.85, 0.1]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh position={[-0.15, 1.1, -0.05]} rotation={[0.2, 0, -0.2]}>
        <capsuleGeometry args={[0.08, 0.4, 4, 8]} />
        <meshStandardMaterial color="#ffb5a0" />
      </mesh>
      <mesh position={[0.15, 1.1, -0.05]} rotation={[0.2, 0, 0.2]}>
        <capsuleGeometry args={[0.08, 0.4, 4, 8]} />
        <meshStandardMaterial color="#ffb5a0" />
      </mesh>
      {hasShield && (
        <mesh position={[0, 0.3, 0]}>
          <sphereGeometry args={[PLAYER_SIZE * 0.9, 16, 16]} />
          <meshStandardMaterial color="#4da6ff" transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}

interface ObstacleProps {
  obstacle: Obstacle;
  scrollZ: number;
}

function ObstacleMesh({ obstacle, scrollZ }: ObstacleProps) {
  const z = obstacle.z + scrollZ;
  if (z > 10 || z < -50) return null;
  
  return (
    <mesh position={[obstacle.x, obstacle.y, z]} castShadow>
      <boxGeometry args={[obstacle.size, obstacle.size * 1.5, obstacle.size]} />
      <meshStandardMaterial color="#8B0000" />
    </mesh>
  );
}

interface CoinProps {
  coin: Coin;
  scrollZ: number;
}

function CoinMesh({ coin, scrollZ }: CoinProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const z = coin.z + scrollZ;
  const visible = z <= 10 && z >= -50;
  
  useFrame(() => {
    if (meshRef.current && visible) {
      meshRef.current.rotation.y += 0.05;
    }
  });

  if (!visible) return null;

  const color = coin.value >= 100 ? '#FFD700' : coin.value >= 50 ? '#FFA500' : '#FFFF00';
  
  return (
    <mesh ref={meshRef} position={[coin.x, coin.y, z]}>
      <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
      <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
    </mesh>
  );
}

interface CarrotProps {
  carrot: Carrot;
  scrollZ: number;
}

function CarrotMesh({ carrot, scrollZ }: CarrotProps) {
  const meshRef = useRef<THREE.Group>(null);
  const z = carrot.z + scrollZ;
  const visible = z <= 10 && z >= -50;
  
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
      const obsZ = obs.z + scrollZ;
      if (Math.abs(playerX - obs.x) < 0.8 && 
          Math.abs(playerY - obs.y) < 1 && 
          Math.abs(playerZ - obsZ) < 0.8) {
        onCollision();
        return;
      }
    }
    
    for (let i = gs.coins.length - 1; i >= 0; i--) {
      const coin = gs.coins[i];
      const coinZ = coin.z + scrollZ;
      if (Math.abs(playerX - coin.x) < 0.8 && 
          Math.abs(playerY - coin.y) < 0.8 && 
          Math.abs(playerZ - coinZ) < 0.8) {
        onCoinCollect(coin.value);
        gs.coins.splice(i, 1);
      }
    }
    
    for (let i = gs.carrots.length - 1; i >= 0; i--) {
      const carrot = gs.carrots[i];
      const carrotZ = carrot.z + scrollZ;
      if (Math.abs(playerX - carrot.x) < 0.8 && 
          Math.abs(playerY - carrot.y) < 0.8 && 
          Math.abs(playerZ - carrotZ) < 0.8) {
        onCarrotCollect(carrot.mult);
        gs.carrots.splice(i, 1);
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      <fog attach="fog" args={['#87CEEB', 20, 80]} />
      
      <Ground />
      <Track />
      <Scenery scrollZ={scrollZ} />
      
      <Player lane={gs.playerLane} y={gs.playerY} hasShield={false} />
      
      {gs.obstacles.map(obs => (
        <ObstacleMesh key={obs.id} obstacle={obs} scrollZ={scrollZ} />
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

function Scenery({ scrollZ }: { scrollZ: number }) {
  const trees = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 30; i++) {
      arr.push({
        id: i,
        x: i % 2 === 0 ? -5 : 5,
        z: -i * 8,
        height: 2 + Math.random() * 1.5,
      });
    }
    return arr;
  }, []);

  return (
    <>
      {trees.map(tree => {
        const z = (tree.z + scrollZ) % 240 - 20;
        if (z > 15 || z < -60) return null;
        return (
          <group key={tree.id} position={[tree.x, 0, z]}>
            <mesh position={[0, tree.height / 2, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.3, tree.height, 8]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
            <mesh position={[0, tree.height + 0.8, 0]} castShadow>
              <coneGeometry args={[1.2, 2, 8]} />
              <meshStandardMaterial color="#228B22" />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function GameCamera({ scrollZ }: { scrollZ: number }) {
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
    sendKicksToHouse, 
    refreshBalance,
    transactionState,
    resetTransactionState,
    signClaimMessage,
    requestKicksFromHouse,
  } = useWallet();
  
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<'menu' | 'betting' | 'playing' | 'ended'>('menu');
  const [betAmount, setBetAmount] = useState("100");
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
  const [depositTxHash, setDepositTxHash] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  
  const gameStateRef = useRef<GameState>({
    playerLane: 1,
    playerY: 0,
    isJumping: false,
    jumpVelocity: 0,
    obstacles: [],
    coins: [],
    carrots: [],
    speed: INITIAL_SPEED,
    distance: 0,
    coinsCollected: 0,
    multiplier: 1.0,
    wager: 0,
    gameActive: false,
    lastObstacleZ: -10,
    lastCoinZ: -5,
    lastCarrotZ: -8,
  });
  
  const animationRef = useRef<number>();
  const idCounter = useRef(0);
  
  useEffect(() => {
    setDisplayKicks(parseFloat(kicksBalance) || 0);
  }, [kicksBalance]);
  
  const spawnObjects = useCallback(() => {
    const gs = gameStateRef.current;
    
    if (gs.lastObstacleZ > -4) {
      const lane = LANES[Math.floor(Math.random() * 3)];
      const secondLane = Math.random() > 0.7 ? LANES[Math.floor(Math.random() * 3)] : null;
      gs.obstacles.push({
        id: idCounter.current++,
        x: lane,
        y: PLAYER_SIZE / 2,
        z: -50 - scrollZ,
        size: PLAYER_SIZE,
      });
      if (secondLane !== null && secondLane !== lane) {
        gs.obstacles.push({
          id: idCounter.current++,
          x: secondLane,
          y: PLAYER_SIZE / 2,
          z: -50 - scrollZ,
          size: PLAYER_SIZE,
        });
      }
      gs.lastObstacleZ = -50 - scrollZ;
    }
    
    if (gs.lastCoinZ > -3 && Math.random() > 0.3) {
      const lane = LANES[Math.floor(Math.random() * 3)];
      const height = Math.random() > 0.5 ? 1.5 : 0.8;
      const rand = Math.random();
      const value = rand > 0.9 ? 100 : rand > 0.6 ? 50 : 10;
      gs.coins.push({
        id: idCounter.current++,
        x: lane,
        y: height,
        z: -40 - scrollZ,
        value: value,
        rotation: 0,
      });
      gs.lastCoinZ = -40 - scrollZ;
    }
    
    if (gs.lastCarrotZ > -10 && Math.random() > 0.88) {
      const lane = LANES[Math.floor(Math.random() * 3)];
      const mults = [0.25, 0.5, 0.75];
      gs.carrots.push({
        id: idCounter.current++,
        x: lane,
        y: 1.2,
        z: -55 - scrollZ,
        mult: mults[Math.floor(Math.random() * mults.length)],
      });
      gs.lastCarrotZ = -55 - scrollZ;
    }
    
    gs.obstacles = gs.obstacles.filter(o => o.z + scrollZ > -100);
    gs.coins = gs.coins.filter(c => c.z + scrollZ > -100);
    gs.carrots = gs.carrots.filter(c => c.z + scrollZ > -100);
    
    gs.lastObstacleZ += gs.speed;
    gs.lastCoinZ += gs.speed;
    gs.lastCarrotZ += gs.speed;
  }, [scrollZ]);
  
  const gameLoop = useCallback(() => {
    const gs = gameStateRef.current;
    if (!gs.gameActive) return;
    
    setScrollZ(prev => prev + gs.speed);
    gs.distance += gs.speed;
    gs.speed = Math.min(gs.speed + SPEED_INCREASE * 0.1, MAX_SPEED);
    
    spawnObjects();
    
    setDisplayDistance(Math.floor(gs.distance * 10));
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [spawnObjects]);
  
  const handleCollision = useCallback(async () => {
    const gs = gameStateRef.current;
    gs.gameActive = false;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    setEndMessage(`CRASHED! Lost ${gs.wager.toLocaleString()} KICKS`);
    setPhase('ended');
    
    if (hasServerRun && currentRunId) {
      try {
        await fetch('/api/rabbit-rush/run/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            runId: currentRunId,
            wager: gs.wager,
            finalMultiplier: gs.multiplier,
            payout: 0,
            coinsCollected: gs.coinsCollected,
            enemiesDestroyed: 0,
            won: false,
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
    const betValue = parseFloat(betAmount);
    if (isNaN(betValue) || betValue < MIN_BET || betValue > Math.min(displayKicks, MAX_BET) || isWagering) {
      return;
    }
    
    setIsWagering(true);
    resetTransactionState();
    
    try {
      const txHash = await sendKicksToHouse(betValue.toString());
      if (!txHash) {
        setIsWagering(false);
        return;
      }
      
      setDepositTxHash(txHash);
      
      let runId = Date.now();
      let serverRunCreated = false;
      
      try {
        const res = await fetch('/api/rabbit-rush/run/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress, wager: betValue, depositTxHash: txHash }),
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
      
      gameStateRef.current = {
        playerLane: 1,
        playerY: 0,
        isJumping: false,
        jumpVelocity: 0,
        obstacles: [],
        coins: [],
        carrots: [],
        speed: INITIAL_SPEED,
        distance: 0,
        coinsCollected: 0,
        multiplier: 1.0,
        wager: betValue,
        gameActive: true,
        lastObstacleZ: -10,
        lastCoinZ: -5,
        lastCarrotZ: -8,
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
      
      refreshBalance();
    } catch (e) {
      setIsWagering(false);
      resetTransactionState();
    }
  };
  
  const handleCashout = useCallback(async () => {
    const gs = gameStateRef.current;
    if (!gs.gameActive || isClaiming) return;
    
    gs.gameActive = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    setIsClaiming(true);
    
    const mult = gs.multiplier;
    const payout = Math.floor(gs.wager * mult) + gs.coinsCollected;
    
    if (hasServerRun && currentRunId) {
      try {
        await fetch('/api/rabbit-rush/run/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            runId: currentRunId,
            wager: gs.wager,
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
        setEndMessage(`Signature cancelled. Payout: ${payout} KICKS`);
        setIsClaiming(false);
        setPhase('ended');
        return;
      }
      
      const success = await requestKicksFromHouse(payout.toString(), currentRunId!, signature, nonce, 'rabbit-rush');
      
      if (success) {
        await refreshBalance();
        setEndMessage(`CASHED OUT at ${mult.toFixed(2)}x! Won ${payout.toLocaleString()} KICKS!`);
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
      <div className="w-full h-screen bg-gradient-to-b from-sky-400 to-sky-600 relative overflow-hidden">
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
            <div className="absolute top-20 left-4 z-50 bg-black/50 px-4 py-2 rounded-lg space-y-1">
              <div className="text-white">Distance: <span className="font-bold text-yellow-400">{displayDistance}m</span></div>
              <div className="text-white">Multiplier: <span className="font-bold text-orange-400">{displayMult}x</span></div>
              <div className="text-white">Coins: <span className="font-bold text-yellow-300">+{displayCoins}</span></div>
            </div>
            
            <Button
              onClick={handleCashout}
              disabled={isClaiming}
              className="absolute top-20 right-4 z-50 bg-green-500 hover:bg-green-600 text-white text-xl px-6 py-3"
            >
              {isClaiming ? 'Claiming...' : `CASH OUT (${(gameStateRef.current.wager * gameStateRef.current.multiplier + gameStateRef.current.coinsCollected).toFixed(0)} KICKS)`}
            </Button>
          </>
        )}
        
        <Canvas shadows camera={{ position: [0, 5, 8], fov: 75 }}>
          <Suspense fallback={null}>
            {phase === 'playing' && (
              <>
                <GameCamera scrollZ={scrollZ} />
                <GameScene 
                  gameState={gameStateRef} 
                  scrollZ={scrollZ}
                  onCollision={handleCollision}
                  onCoinCollect={handleCoinCollect}
                  onCarrotCollect={handleCarrotCollect}
                />
              </>
            )}
            {phase !== 'playing' && (
              <>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 20, 10]} intensity={1} />
                <Ground />
                <Track />
              </>
            )}
          </Suspense>
        </Canvas>
        
        {phase === 'menu' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-40">
            <div className="text-center p-8 bg-gray-900/90 rounded-2xl border border-orange-500/50 max-w-md">
              <h1 className="text-4xl font-bold text-white mb-2">🏃 ENDLESS RUNNER</h1>
              <p className="text-gray-300 mb-6">Dodge obstacles, collect coins & carrots!</p>
              <Button
                onClick={() => setPhase('betting')}
                className="text-xl px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <Play className="w-6 h-6 mr-2" /> START
              </Button>
            </div>
          </div>
        )}
        
        {phase === 'betting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-40">
            <div className="p-8 bg-gray-900/90 rounded-2xl border border-orange-500/50 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-white mb-4 text-center">Place Your Bet</h2>
              
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {QUICK_AMOUNTS.map(amt => (
                  <Button
                    key={amt}
                    onClick={() => setBetAmount(amt)}
                    variant={betAmount === amt ? "default" : "outline"}
                    className={betAmount === amt ? "bg-orange-500" : ""}
                  >
                    {amt}
                  </Button>
                ))}
              </div>
              
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="Enter wager"
                min={MIN_BET}
                max={Math.min(displayKicks, MAX_BET)}
                className="w-full px-4 py-3 text-lg text-center rounded-xl border-2 border-orange-500 bg-white/10 text-white mb-4"
              />
              
              <Button
                onClick={handleStartGame}
                disabled={isWagering || parseFloat(betAmount) < MIN_BET || parseFloat(betAmount) > Math.min(displayKicks, MAX_BET)}
                className="w-full text-xl py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                {isWagering ? 'Processing...' : `BET ${betAmount} KICKS`}
              </Button>
              
              <Button
                onClick={() => setPhase('menu')}
                variant="ghost"
                className="w-full mt-2 text-gray-400"
              >
                Back
              </Button>
            </div>
          </div>
        )}
        
        {phase === 'ended' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-40">
            <div className="text-center p-8 bg-gray-900/90 rounded-2xl border border-orange-500/50 max-w-md">
              <h2 className="text-2xl font-bold text-white mb-2">{endMessage}</h2>
              <p className="text-gray-300 mb-4">Distance: {displayDistance}m</p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => setPhase('betting')}
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
        )}
        
        {phase === 'playing' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-4">
            <Button
              onClick={() => handleSwipe('left')}
              className="w-20 h-16 text-2xl bg-blue-500/80 hover:bg-blue-600"
            >
              ←
            </Button>
            <Button
              onClick={() => handleSwipe('up')}
              className="w-20 h-16 text-2xl bg-green-500/80 hover:bg-green-600"
            >
              ↑
            </Button>
            <Button
              onClick={() => handleSwipe('right')}
              className="w-20 h-16 text-2xl bg-blue-500/80 hover:bg-blue-600"
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
