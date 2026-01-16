import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sword, ShoppingCart, X, ArrowLeft, Volume2, VolumeX, Heart, Flame, Zap, Clock, Trophy, Loader2 } from 'lucide-react';
import { useWallet } from '../../lib/stores/useWallet';
import { useLocation } from 'wouter';

interface GameState {
  score: number;
  kicks: number;
  level: number;
  streak: number;
  activeBlade: string;
  unlockedBlades: string[];
  gameOver: boolean;
  showShop: boolean;
  lives: number;
  phase: 'menu' | 'playing' | 'levelComplete' | 'victory' | 'ended' | 'claiming';
  timeRemaining: number;
  runId: string | null;
}

interface Blade {
  radius: number;
  color: string;
  cost: number;
  name: string;
}

interface Target {
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  sliced: boolean;
  rotation: number;
  rotSpeed: number;
  hitByThor?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size?: number;
}

interface SlashEffect {
  x: number;
  y: number;
  angle: number;
  life: number;
  length: number;
}

interface LightningBolt {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  life: number;
  segments: { x: number; y: number }[];
}

interface LevelConfig {
  spawnInterval: number;
  maxTargets: number;
  bombChance: number;
  thorChance: number;
  speedMult: number;
  coinChance: number;
  pineappleChance: number;
  heartChance: number;
}

const LEVEL_CONFIGS: Record<number, LevelConfig & { rubyChance: number }> = {
  1: { spawnInterval: 30, maxTargets: 8, bombChance: 0.05, thorChance: 0.01, speedMult: 1.0, coinChance: 0.1, pineappleChance: 0.08, heartChance: 0.05, rubyChance: 0.02 },
  2: { spawnInterval: 28, maxTargets: 9, bombChance: 0.08, thorChance: 0.012, speedMult: 1.1, coinChance: 0.12, pineappleChance: 0.08, heartChance: 0.04, rubyChance: 0.025 },
  3: { spawnInterval: 25, maxTargets: 10, bombChance: 0.10, thorChance: 0.014, speedMult: 1.2, coinChance: 0.14, pineappleChance: 0.07, heartChance: 0.04, rubyChance: 0.03 },
  4: { spawnInterval: 22, maxTargets: 11, bombChance: 0.12, thorChance: 0.016, speedMult: 1.3, coinChance: 0.16, pineappleChance: 0.07, heartChance: 0.03, rubyChance: 0.03 },
  5: { spawnInterval: 20, maxTargets: 12, bombChance: 0.14, thorChance: 0.018, speedMult: 1.4, coinChance: 0.18, pineappleChance: 0.06, heartChance: 0.03, rubyChance: 0.035 },
  6: { spawnInterval: 18, maxTargets: 13, bombChance: 0.16, thorChance: 0.02, speedMult: 1.5, coinChance: 0.2, pineappleChance: 0.06, heartChance: 0.025, rubyChance: 0.035 },
  7: { spawnInterval: 16, maxTargets: 14, bombChance: 0.18, thorChance: 0.022, speedMult: 1.6, coinChance: 0.22, pineappleChance: 0.05, heartChance: 0.025, rubyChance: 0.04 },
  8: { spawnInterval: 14, maxTargets: 15, bombChance: 0.20, thorChance: 0.024, speedMult: 1.7, coinChance: 0.24, pineappleChance: 0.05, heartChance: 0.02, rubyChance: 0.04 },
  9: { spawnInterval: 12, maxTargets: 16, bombChance: 0.22, thorChance: 0.026, speedMult: 1.8, coinChance: 0.26, pineappleChance: 0.04, heartChance: 0.02, rubyChance: 0.045 },
  10: { spawnInterval: 10, maxTargets: 18, bombChance: 0.25, thorChance: 0.03, speedMult: 2.0, coinChance: 0.3, pineappleChance: 0.04, heartChance: 0.015, rubyChance: 0.05 },
};

const LEVEL_TIME = 60;
const MAX_LEVEL = 10;
const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;

const BLADES: Record<string, Blade & { element?: string }> = {
  Wooden: { radius: 30, color: '#8B4513', cost: 0, name: 'Wooden Blade' },
  Steel: { radius: 40, color: '#C0C0C0', cost: 2500, name: 'Steel Blade' },
  Plasma: { radius: 55, color: '#00FFFF', cost: 5000, name: 'Plasma Blade' },
  Ice: { radius: 45, color: '#00BFFF', cost: 10000, name: 'Ice Blade', element: 'ice' },
  Fire: { radius: 45, color: '#FF4500', cost: 10000, name: 'Fire Blade', element: 'fire' }
};

export function BunnyBladeApp() {
  const { isConnected, kicksBalance, walletAddress, signMessage, signClaimMessage, requestKicksFromHouse, refreshBalance, sendKicksToHouse, resetTransactionState } = useWallet();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [muted, setMuted] = useState(false);
  const [displayKicks, setDisplayKicks] = useState(0);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimedKicks, setClaimedKicks] = useState<number | null>(null);
  const thorImageRef = useRef<HTMLImageElement | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const lastTimeRef = useRef<number>(Date.now());
  const sliceSoundRef = useRef<HTMLAudioElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    sliceSoundRef.current = new Audio('/sounds/hit.mp3');
    sliceSoundRef.current.volume = 0.3;
  }, []);

  const playSliceSound = useCallback(() => {
    if (!muted && sliceSoundRef.current) {
      sliceSoundRef.current.currentTime = 0;
      sliceSoundRef.current.play().catch(() => {});
    }
  }, [muted]);
  
  const getStoredBlades = (): { unlockedBlades: string[], activeBlade: string } => {
    try {
      const stored = localStorage.getItem('bunny_blade_inventory');
      if (stored) {
        const data = JSON.parse(stored);
        return {
          unlockedBlades: data.unlockedBlades || ['Wooden'],
          activeBlade: data.activeBlade || 'Wooden'
        };
      }
    } catch (e) {
      console.error('Failed to load blade inventory:', e);
    }
    return { unlockedBlades: ['Wooden'], activeBlade: 'Wooden' };
  };

  const saveBladeInventory = useCallback(async (unlockedBlades: string[], activeBlade: string) => {
    try {
      localStorage.setItem('bunny_blade_inventory', JSON.stringify({ unlockedBlades, activeBlade }));
      if (walletAddress) {
        await fetch(`/api/bunny-blade/inventory/${walletAddress}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unlockedBlades, activeBlade })
        });
      }
    } catch (e) {
      console.error('Failed to save blade inventory:', e);
    }
  }, [walletAddress]);

  const storedBlades = getStoredBlades();
  
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    kicks: 0,
    level: 1,
    streak: 0,
    activeBlade: storedBlades.activeBlade,
    unlockedBlades: storedBlades.unlockedBlades,
    gameOver: false,
    showShop: false,
    lives: 3,
    phase: 'menu',
    timeRemaining: LEVEL_TIME,
    runId: null
  });

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [weekEnd, setWeekEnd] = useState<Date | null>(null);
  const [username, setUsername] = useState('');
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [pendingScore, setPendingScore] = useState<{score: number, kicks: number, level: number} | null>(null);

  useEffect(() => {
    if (!isConnected) {
      setLocation("/");
    }
  }, [isConnected, setLocation]);

  useEffect(() => {
    const fetchSavedUsername = async () => {
      if (!walletAddress) return;
      
      const globalUsername = localStorage.getItem('tokenrush_global_username');
      if (globalUsername) {
        setUsername(globalUsername);
        return;
      }
      
      try {
        const res = await fetch(`/api/user/${walletAddress}`);
        if (res.ok) {
          const data = await res.json();
          if (data.user?.username && !data.user.username.startsWith('Player_')) {
            setUsername(data.user.username);
            localStorage.setItem('tokenrush_global_username', data.user.username);
          }
        }
      } catch (error) {
        console.error('Failed to fetch saved username:', error);
      }
    };
    fetchSavedUsername();
  }, [walletAddress]);

  useEffect(() => {
    const balance = parseFloat(kicksBalance) || 0;
    setDisplayKicks(balance);
  }, [kicksBalance]);

  useEffect(() => {
    if (walletAddress) {
      refreshBalance();
    }
  }, [walletAddress, refreshBalance]);

  useEffect(() => {
    const loadInventoryFromDatabase = async () => {
      if (!walletAddress) return;
      
      const defaultBlades = { unlockedBlades: ['Wooden'], activeBlade: 'Wooden' };
      
      try {
        const res = await fetch(`/api/bunny-blade/inventory/${walletAddress}`);
        if (res.ok) {
          const data = await res.json();
          if (data.inventory && data.inventory.unlockedBlades) {
            const unlockedBlades = typeof data.inventory.unlockedBlades === 'string' 
              ? JSON.parse(data.inventory.unlockedBlades) 
              : data.inventory.unlockedBlades;
            const activeBlade = data.inventory.activeBlade || 'Wooden';
            localStorage.setItem('bunny_blade_inventory', JSON.stringify({ unlockedBlades, activeBlade }));
            setGameState(prev => ({
              ...prev,
              unlockedBlades,
              activeBlade
            }));
          } else {
            localStorage.setItem('bunny_blade_inventory', JSON.stringify(defaultBlades));
            setGameState(prev => ({
              ...prev,
              unlockedBlades: defaultBlades.unlockedBlades,
              activeBlade: defaultBlades.activeBlade
            }));
          }
        } else {
          localStorage.setItem('bunny_blade_inventory', JSON.stringify(defaultBlades));
          setGameState(prev => ({
            ...prev,
            unlockedBlades: defaultBlades.unlockedBlades,
            activeBlade: defaultBlades.activeBlade
          }));
        }
      } catch (error) {
        console.error('Failed to load blade inventory from database:', error);
        localStorage.setItem('bunny_blade_inventory', JSON.stringify(defaultBlades));
        setGameState(prev => ({
          ...prev,
          unlockedBlades: defaultBlades.unlockedBlades,
          activeBlade: defaultBlades.activeBlade
        }));
      }
    };
    loadInventoryFromDatabase();
  }, [walletAddress]);

  useEffect(() => {
    const img = new Image();
    img.src = '/textures/thor-bunny.png';
    img.onload = () => {
      thorImageRef.current = img;
    };
  }, []);

  useEffect(() => {
    const logoImg = new Image();
    logoImg.src = '/textures/rabbits-blade-logo.png';
    logoImg.onload = () => {
      logoImageRef.current = logoImg;
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const gameRef = useRef({
    targets: [] as Target[],
    particles: [] as Particle[],
    trail: [] as { x: number; y: number; time: number }[],
    slashEffects: [] as SlashEffect[],
    spawnTimer: 0,
    mouseDown: false,
    mousePos: { x: 0, y: 0 },
    prevMousePos: { x: 0, y: 0 },
    lightningBolts: [] as LightningBolt[],
    thorActive: false,
    thorTimer: 0,
    thorFlashTimer: 0,
    lastSliceTime: 0,
    frameCount: 0,
    slowMotionTimer: 0,
    slowMotionActive: false
  });

  const createSliceParticles = useCallback((x: number, y: number, color: string, count: number = 12, element?: string) => {
    const blade = BLADES[gameState.activeBlade];
    const activeElement = element || blade.element;
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 4 + Math.random() * 6;
      
      let particleColor = color;
      let particleSize = 3 + Math.random() * 4;
      let particleLife = 25 + Math.random() * 15;
      
      if (activeElement === 'ice') {
        const iceColors = ['#00BFFF', '#87CEEB', '#E0FFFF', '#B0E0E6', '#ADD8E6'];
        particleColor = iceColors[Math.floor(Math.random() * iceColors.length)];
        particleSize = 4 + Math.random() * 6;
        particleLife = 35 + Math.random() * 20;
      } else if (activeElement === 'fire') {
        const fireColors = ['#FF4500', '#FF6347', '#FFA500', '#FFD700', '#FF0000'];
        particleColor = fireColors[Math.floor(Math.random() * fireColors.length)];
        particleSize = 3 + Math.random() * 5;
        particleLife = 20 + Math.random() * 15;
      }
      
      gameRef.current.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (activeElement === 'fire' ? 2 : 0),
        life: particleLife,
        color: particleColor,
        size: particleSize,
        element: activeElement
      } as Particle & { element?: string });
    }
    
    if (activeElement === 'ice') {
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        gameRef.current.particles.push({
          x: x + (Math.random() - 0.5) * 30,
          y: y + (Math.random() - 0.5) * 30,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          life: 40 + Math.random() * 20,
          color: '#FFFFFF',
          size: 6 + Math.random() * 4,
          element: 'ice_crystal'
        } as Particle & { element?: string });
      }
    } else if (activeElement === 'fire') {
      for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        gameRef.current.particles.push({
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * speed,
          vy: -3 - Math.random() * 4,
          life: 30 + Math.random() * 20,
          color: '#FF4500',
          size: 8 + Math.random() * 6,
          element: 'fire_ember'
        } as Particle & { element?: string });
      }
    }
  }, [gameState.activeBlade]);

  const createSlashEffect = useCallback((x: number, y: number) => {
    const dx = gameRef.current.mousePos.x - gameRef.current.prevMousePos.x;
    const dy = gameRef.current.mousePos.y - gameRef.current.prevMousePos.y;
    const angle = Math.atan2(dy, dx);
    
    gameRef.current.slashEffects.push({
      x, y,
      angle,
      life: 15,
      length: 60 + Math.random() * 40
    });
  }, []);

  const generateLightningSegments = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const segments: { x: number; y: number }[] = [];
    const numSegments = 10;
    const dx = (x2 - x1) / numSegments;
    const dy = (y2 - y1) / numSegments;

    segments.push({ x: x1, y: y1 });

    for (let i = 1; i < numSegments; i++) {
      segments.push({
        x: x1 + dx * i + (Math.random() - 0.5) * 50,
        y: y1 + dy * i + (Math.random() - 0.5) * 50
      });
    }

    segments.push({ x: x2, y: y2 });
    return segments;
  }, []);

  const activateThor = useCallback(() => {
    gameRef.current.thorActive = true;
    gameRef.current.thorTimer = 180;
    gameRef.current.thorFlashTimer = 30;

    let pointsEarned = 0;
    let kicksEarned = 0;

    gameRef.current.targets.forEach(target => {
      if (target.type !== 'thor' && !target.sliced) {
        gameRef.current.lightningBolts.push({
          startX: 400,
          startY: 150,
          endX: target.x,
          endY: target.y,
          life: 60,
          segments: generateLightningSegments(400, 150, target.x, target.y)
        });
        
        for (let i = 0; i < 3; i++) {
          const branchX = target.x + (Math.random() - 0.5) * 100;
          const branchY = target.y + (Math.random() - 0.5) * 100;
          gameRef.current.lightningBolts.push({
            startX: target.x,
            startY: target.y,
            endX: branchX,
            endY: branchY,
            life: 40,
            segments: generateLightningSegments(target.x, target.y, branchX, branchY)
          });
        }
        
        createSliceParticles(target.x, target.y, '#00BFFF', 30);
        createSliceParticles(target.x, target.y, '#FFFFFF', 15);
        createSliceParticles(target.x, target.y, '#FFD700', 10);
        target.sliced = true;
        target.hitByThor = true;

        if (target.type !== 'bomb' && target.type !== 'heart') {
          const points = target.type === 'coin' ? 50 : target.type === 'pineapple' ? 25 : target.type === 'carrot' ? 15 : 10;
          pointsEarned += points;
          kicksEarned += Math.floor(points / 2);
        }
      }
    });

    for (let i = 0; i < 8; i++) {
      const randX = Math.random() * 800;
      const randY = Math.random() * 600;
      gameRef.current.lightningBolts.push({
        startX: 400,
        startY: 0,
        endX: randX,
        endY: randY,
        life: 25 + Math.random() * 15,
        segments: generateLightningSegments(400, 0, randX, randY)
      });
    }

    setGameState(prev => ({
      ...prev,
      score: prev.score + pointsEarned,
      kicks: prev.kicks + kicksEarned
    }));
  }, [generateLightningSegments, createSliceParticles]);

  const spawnTarget = useCallback((level: number) => {
    const config = LEVEL_CONFIGS[level] || LEVEL_CONFIGS[10];
    
    if (gameRef.current.targets.filter(t => !t.sliced).length >= config.maxTargets) {
      return;
    }

    if (Math.random() < config.thorChance) {
      gameRef.current.targets.push({
        type: 'thor',
        x: Math.random() * 600 + 100,
        y: 620,
        vx: (Math.random() - 0.5) * 2,
        vy: -(Math.random() * 5 + 12) * config.speedMult,
        color: '#4169E1',
        sliced: false,
        rotation: 0,
        rotSpeed: 0.3
      });
      return;
    }

    let type: string;
    const rand = Math.random();
    let cumulative = 0;
    
    cumulative += config.bombChance;
    if (rand < cumulative) {
      type = 'bomb';
    } else if (rand < (cumulative += config.coinChance)) {
      type = 'coin';
    } else if (rand < (cumulative += config.pineappleChance)) {
      type = 'pineapple';
    } else if (rand < (cumulative += config.heartChance)) {
      type = 'heart';
    } else if (rand < (cumulative += config.rubyChance)) {
      type = 'ruby';
    } else if (rand < cumulative + 0.3) {
      type = 'carrot';
    } else {
      type = 'leaf';
    }

    const colors: Record<string, string> = {
      carrot: '#FF6B00',
      leaf: '#32CD32',
      coin: '#FFD700',
      bomb: '#FF0000',
      pineapple: '#FFD700',
      heart: '#FF69B4',
      ruby: '#E0115F'
    };

    const side = Math.random();
    let startX: number, vx: number;
    
    if (side < 0.3) {
      startX = Math.random() * 150 + 50;
      vx = Math.random() * 3 + 1;
    } else if (side > 0.7) {
      startX = Math.random() * 150 + 600;
      vx = -(Math.random() * 3 + 1);
    } else {
      startX = Math.random() * 500 + 150;
      vx = (Math.random() - 0.5) * 4;
    }

    gameRef.current.targets.push({
      type,
      x: startX,
      y: 620,
      vx,
      vy: -(Math.random() * 6 + 14) * config.speedMult,
      color: colors[type],
      sliced: false,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 0.25
    });
  }, []);

  const saveRunResult = useCallback(async (won: boolean, payout: number) => {
    if (!walletAddress || !gameState.runId) return;
    try {
      await fetch('/api/rabbit-rush/run/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          runId: gameState.runId,
          wager: 0,
          finalMultiplier: 1,
          payout,
          coinsCollected: 0,
          enemiesDestroyed: 0,
          won,
        }),
      });
    } catch (error) {
      console.error('Failed to save run:', error);
    }
  }, [walletAddress, gameState.runId]);

  const claimKicks = useCallback(async () => {
    if (!walletAddress || gameState.kicks <= 0) {
      console.log('[BunnyBlade] Claim blocked: wallet=', walletAddress, 'kicks=', gameState.kicks);
      return;
    }
    
    setClaimError(null);
    setGameState(prev => ({ ...prev, phase: 'claiming' }));

    try {
      let currentRunId = gameState.runId;
      
      if (!currentRunId) {
        console.log('[BunnyBlade] No runId, creating one...');
        const res = await fetch('/api/rabbit-rush/run/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress, wager: 0 }),
        });
        if (res.ok) {
          const data = await res.json();
          currentRunId = data.runId;
          setGameState(prev => ({ ...prev, runId: currentRunId }));
        } else {
          throw new Error('Failed to create run for claim');
        }
      }

      if (!currentRunId) {
        throw new Error('Unable to create claim session');
      }

      await fetch('/api/rabbit-rush/run/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          runId: currentRunId,
          wager: 0,
          finalMultiplier: 1,
          payout: gameState.kicks,
          coinsCollected: 0,
          enemiesDestroyed: 0,
          won: true,
        }),
      });

      const authMessage = `Request Rabbit Rush claim nonce for run ${currentRunId}`;
      const authSignature = await signMessage(authMessage);
      if (!authSignature) {
        throw new Error('Signature cancelled');
      }

      const nonceRes = await fetch(`/api/rabbit-rush/run/${currentRunId}/claim-nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, authSignature })
      });

      if (!nonceRes.ok) {
        const errorData = await nonceRes.json();
        throw new Error(errorData.error || 'Failed to get claim nonce');
      }

      const { nonce, expectedPayout } = await nonceRes.json();
      const runIdNum = parseInt(currentRunId, 10);
      
      const signature = await signClaimMessage(expectedPayout, runIdNum, nonce, 'rabbit-rush');
      if (!signature) {
        throw new Error('Claim signature cancelled');
      }

      const claimed = await requestKicksFromHouse(expectedPayout, runIdNum, signature, nonce, 'rabbit-rush');

      if (claimed) {
        await refreshBalance();
        setClaimedKicks(gameState.kicks);
        setGameState(prev => ({ ...prev, phase: 'ended' }));
      } else {
        throw new Error('Claim failed');
      }
    } catch (error: any) {
      console.error('[BunnyBlade] Claim error:', error);
      setClaimError(error.message || 'Failed to claim KICKS');
      setGameState(prev => ({ ...prev, phase: 'ended' }));
    }
  }, [walletAddress, gameState.kicks, gameState.runId, signMessage, signClaimMessage, requestKicksFromHouse, refreshBalance]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/bunny-blade/leaderboard/weekly');
      if (res.ok) {
        const data = await res.json();
        setLeaderboardData(data.leaderboard || []);
        if (data.weekEnd) {
          setWeekEnd(new Date(data.weekEnd));
        }
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  }, []);

  const submitScore = useCallback(async (playerUsername: string, score: number, kicks: number, level: number) => {
    if (!walletAddress) return;
    try {
      const res = await fetch('/api/bunny-blade/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, username: playerUsername, score, kicks, level })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.leaderboard) {
          setLeaderboardData(data.leaderboard);
        } else {
          await fetchLeaderboard();
        }
      }
    } catch (error) {
      console.error('Failed to submit score:', error);
    }
  }, [walletAddress, fetchLeaderboard]);

  const handleUsernameSubmit = useCallback(async () => {
    if (!username.trim() || !pendingScore) return;
    setShowUsernamePrompt(false);
    
    if (walletAddress) {
      try {
        await fetch(`/api/user/${walletAddress}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim() })
        });
      } catch (error) {
        console.error('Failed to save username:', error);
      }
    }
    
    await submitScore(username.trim(), pendingScore.score, pendingScore.kicks, pendingScore.level);
    setPendingScore(null);
  }, [username, pendingScore, submitScore, walletAddress]);

  const getTimeUntilReset = useCallback(() => {
    if (!weekEnd) return 'Loading...';
    const now = new Date();
    const diff = weekEnd.getTime() - now.getTime();
    if (diff <= 0) return 'Resetting soon...';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }, [weekEnd]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const hasSubmittedScoreRef = useRef(false);
  
  useEffect(() => {
    if (gameState.phase === 'playing') {
      hasSubmittedScoreRef.current = false;
    }
  }, [gameState.phase]);
  
  useEffect(() => {
    const isGameEnded = gameState.phase === 'victory' || gameState.phase === 'ended' || gameState.gameOver;
    if (isGameEnded && gameState.score > 0 && !hasSubmittedScoreRef.current) {
      hasSubmittedScoreRef.current = true;
      if (!username) {
        setPendingScore({ score: gameState.score, kicks: gameState.kicks, level: gameState.level });
        setShowUsernamePrompt(true);
      } else {
        submitScore(username, gameState.score, gameState.kicks, gameState.level);
      }
    }
  }, [gameState.phase, gameState.gameOver, gameState.score, gameState.kicks, gameState.level, username, submitScore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId: number;

    const handleMouseDown = () => {
      gameRef.current.mouseDown = true;
      gameRef.current.lastSliceTime = Date.now();
    };

    const handleMouseUp = () => {
      gameRef.current.mouseDown = false;
      gameRef.current.trail = [];
    };

    const screenToGame = (screenX: number, screenY: number) => {
      const rect = canvas.getBoundingClientRect();
      const canvasX = (screenX - rect.left) * (canvas.width / rect.width);
      const canvasY = (screenY - rect.top) * (canvas.height / rect.height);
      const scaleX = canvas.width / BASE_WIDTH;
      const scaleY = canvas.height / BASE_HEIGHT;
      const scale = Math.min(scaleX, scaleY);
      const offsetX = (canvas.width - BASE_WIDTH * scale) / 2;
      const offsetY = (canvas.height - BASE_HEIGHT * scale) / 2;
      return {
        x: (canvasX - offsetX) / scale,
        y: (canvasY - offsetY) / scale
      };
    };

    const handleMouseMove = (e: MouseEvent) => {
      gameRef.current.prevMousePos = { ...gameRef.current.mousePos };
      gameRef.current.mousePos = screenToGame(e.clientX, e.clientY);
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      gameRef.current.mouseDown = true;
      gameRef.current.lastSliceTime = Date.now();
      const touch = e.touches[0];
      gameRef.current.mousePos = screenToGame(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = () => {
      gameRef.current.mouseDown = false;
      gameRef.current.trail = [];
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      gameRef.current.prevMousePos = { ...gameRef.current.mousePos };
      gameRef.current.mousePos = screenToGame(touch.clientX, touch.clientY);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    const gameLoop = () => {
      const cw = canvas.width;
      const ch = canvas.height;
      const scaleX = cw / BASE_WIDTH;
      const scaleY = ch / BASE_HEIGHT;
      const scale = Math.min(scaleX, scaleY);
      
      if (gameState.phase !== 'playing' || gameState.showShop) {
        const gradient = ctx.createLinearGradient(0, 0, 0, ch);
        gradient.addColorStop(0, '#1a0a2e');
        gradient.addColorStop(1, '#0a0a1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, cw, ch);
        
        if (logoImageRef.current) {
          const logoSize = Math.min(cw, ch) * 0.5;
          const logoX = (cw - logoSize) / 2;
          const logoY = (ch - logoSize) / 2;
          ctx.globalAlpha = 0.15;
          ctx.drawImage(logoImageRef.current, logoX, logoY, logoSize, logoSize);
          ctx.globalAlpha = 1;
        }
        
        animationId = requestAnimationFrame(gameLoop);
        return;
      }

      gameRef.current.frameCount++;

      const now = Date.now();
      const deltaTime = now - lastTimeRef.current;
      lastTimeRef.current = now;
      
      const targetFrameTime = 16.67;
      let timeScale = Math.min(deltaTime / targetFrameTime, 3);
      
      if (gameRef.current.slowMotionActive) {
        gameRef.current.slowMotionTimer--;
        if (gameRef.current.slowMotionTimer <= 0) {
          gameRef.current.slowMotionActive = false;
        }
        timeScale *= 0.3;
      }

      if (gameRef.current.frameCount % 60 === 0) {
        setGameState(prev => {
          const newTime = Math.max(0, prev.timeRemaining - 1);
          
          if (newTime <= 0) {
            if (prev.level >= MAX_LEVEL) {
              return { ...prev, timeRemaining: 0, phase: 'victory' };
            } else {
              return { ...prev, timeRemaining: 0, phase: 'levelComplete' };
            }
          }
          
          return { ...prev, timeRemaining: newTime };
        });
      }

      const gradient = ctx.createLinearGradient(0, 0, 0, ch);
      gradient.addColorStop(0, '#1a0a2e');
      gradient.addColorStop(1, '#0a0a1a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, cw, ch);
      
      if (logoImageRef.current) {
        const logoSize = Math.min(cw, ch) * 0.5;
        const logoX = (cw - logoSize) / 2;
        const logoY = (ch - logoSize) / 2;
        ctx.globalAlpha = 0.12;
        ctx.drawImage(logoImageRef.current, logoX, logoY, logoSize, logoSize);
        ctx.globalAlpha = 1;
      }
      
      ctx.save();
      ctx.translate((cw - BASE_WIDTH * scale) / 2, (ch - BASE_HEIGHT * scale) / 2);
      ctx.scale(scale, scale);

      const config = LEVEL_CONFIGS[gameState.level] || LEVEL_CONFIGS[10];
      gameRef.current.spawnTimer += timeScale;
      if (gameRef.current.spawnTimer > config.spawnInterval) {
        spawnTarget(gameState.level);
        gameRef.current.spawnTimer = 0;
      }

      gameRef.current.particles = gameRef.current.particles.filter((p: any) => {
        p.x += p.vx * timeScale;
        p.y += p.vy * timeScale;
        
        if (p.element === 'fire_ember') {
          p.vy -= 0.1 * timeScale;
          p.vx *= Math.pow(0.95, timeScale);
        } else if (p.element === 'ice_crystal') {
          p.vy += 0.05 * timeScale;
          p.vx *= Math.pow(0.99, timeScale);
        } else {
          p.vy += 0.2 * timeScale;
          p.vx *= Math.pow(0.98, timeScale);
        }
        p.life -= timeScale;
        
        if (p.life > 0) {
          const alpha = p.life / 40;
          const size = (p.size || 4) * (p.life / 40);
          
          if (p.element === 'ice_crystal') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.life * 0.1);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha * 0.9;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00BFFF';
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI * 2 * i) / 6;
              const px = Math.cos(angle) * size;
              const py = Math.sin(angle) * size;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          } else if (p.element === 'fire_ember') {
            ctx.save();
            ctx.translate(p.x, p.y);
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
            gradient.addColorStop(0, '#FFFF00');
            gradient.addColorStop(0.3, p.color);
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.globalAlpha = alpha * 0.8;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#FF4500';
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else if (p.element === 'ice') {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#00BFFF';
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          } else if (p.element === 'fire') {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#FF4500';
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          } else {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
          return true;
        }
        return false;
      });

      gameRef.current.slashEffects = gameRef.current.slashEffects.filter(slash => {
        slash.life -= timeScale;
        if (slash.life > 0) {
          ctx.save();
          ctx.translate(slash.x, slash.y);
          ctx.rotate(slash.angle);
          
          const alpha = slash.life / 15;
          const blade = BLADES[gameState.activeBlade];
          
          if (blade.element === 'ice') {
            const iceGradient = ctx.createLinearGradient(-slash.length / 2, 0, slash.length / 2, 0);
            iceGradient.addColorStop(0, `rgba(135, 206, 250, 0)`);
            iceGradient.addColorStop(0.3, `rgba(0, 191, 255, ${alpha})`);
            iceGradient.addColorStop(0.5, `rgba(224, 255, 255, ${alpha})`);
            iceGradient.addColorStop(0.7, `rgba(0, 191, 255, ${alpha})`);
            iceGradient.addColorStop(1, `rgba(135, 206, 250, 0)`);
            ctx.strokeStyle = iceGradient;
            ctx.lineWidth = 6 * alpha;
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#00BFFF';
          } else if (blade.element === 'fire') {
            const fireGradient = ctx.createLinearGradient(-slash.length / 2, 0, slash.length / 2, 0);
            fireGradient.addColorStop(0, `rgba(255, 69, 0, 0)`);
            fireGradient.addColorStop(0.3, `rgba(255, 140, 0, ${alpha})`);
            fireGradient.addColorStop(0.5, `rgba(255, 255, 0, ${alpha})`);
            fireGradient.addColorStop(0.7, `rgba(255, 140, 0, ${alpha})`);
            fireGradient.addColorStop(1, `rgba(255, 69, 0, 0)`);
            ctx.strokeStyle = fireGradient;
            ctx.lineWidth = 6 * alpha;
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#FF4500';
          } else {
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 4 * alpha;
            ctx.shadowBlur = 20;
            ctx.shadowColor = blade.color;
          }
          
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-slash.length / 2, 0);
          ctx.lineTo(slash.length / 2, 0);
          ctx.stroke();
          
          ctx.restore();
          return true;
        }
        return false;
      });

      gameRef.current.targets.forEach((target, idx) => {
        target.x += target.vx * timeScale;
        target.y += target.vy * timeScale;
        target.vy += 0.55 * timeScale;
        target.rotation += target.rotSpeed * timeScale;

        if (!target.sliced) {
          ctx.save();
          ctx.translate(target.x, target.y);
          ctx.rotate(target.rotation);
          
          ctx.scale(1.35, 1.35);
          
          if (target.type === 'thor') {
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#00BFFF';
            ctx.fillStyle = '#4169E1';
            ctx.fillRect(-12, -28, 24, 35);
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(-6, 7, 12, 25);
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.strokeRect(-12, -28, 24, 35);
            ctx.shadowBlur = 0;
          } else if (target.type === 'bomb') {
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(0, 0, 28, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(0, 0, 23, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FF6600';
            ctx.fillRect(-4, -35, 8, 14);
            ctx.fillStyle = '#FFFF00';
            ctx.beginPath();
            ctx.arc(0, -40, 6, 0, Math.PI * 2);
            ctx.fill();
          } else if (target.type === 'coin') {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#FFD700';
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(0, 0, 26, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.fillStyle = '#DAA520';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', 0, 0);
            ctx.shadowBlur = 0;
          } else if (target.type === 'carrot') {
            ctx.fillStyle = '#FF6B00';
            ctx.beginPath();
            ctx.moveTo(0, -32);
            ctx.lineTo(16, 26);
            ctx.lineTo(-16, 26);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#228B22';
            ctx.fillRect(-10, -38, 20, 12);
          } else if (target.type === 'leaf') {
            ctx.fillStyle = '#32CD32';
            ctx.beginPath();
            ctx.ellipse(0, 0, 16, 28, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#228B22';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, -28);
            ctx.lineTo(0, 28);
            ctx.stroke();
          } else if (target.type === 'pineapple') {
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.ellipse(0, 6, 20, 28, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#DAA520';
            ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
              ctx.beginPath();
              ctx.moveTo(-12 + i * 5, -20 + (i % 2) * 6);
              ctx.lineTo(-12 + i * 5, 32 - (i % 2) * 6);
              ctx.stroke();
            }
            ctx.fillStyle = '#228B22';
            for (let i = 0; i < 6; i++) {
              ctx.beginPath();
              ctx.ellipse(-10 + i * 4, -32, 5, 12, (i - 2.5) * 0.3, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (target.type === 'heart') {
            ctx.fillStyle = '#FF69B4';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#FF69B4';
            ctx.beginPath();
            ctx.moveTo(0, 10);
            ctx.bezierCurveTo(-25, -12, -25, -30, 0, -18);
            ctx.bezierCurveTo(25, -30, 25, -12, 0, 10);
            ctx.fill();
            ctx.fillStyle = '#FFB6C1';
            ctx.beginPath();
            ctx.arc(-10, -15, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          } else if (target.type === 'ruby') {
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#FF0040';
            ctx.fillStyle = '#E0115F';
            ctx.beginPath();
            ctx.moveTo(0, -28);
            ctx.lineTo(22, -8);
            ctx.lineTo(22, 12);
            ctx.lineTo(0, 28);
            ctx.lineTo(-22, 12);
            ctx.lineTo(-22, -8);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#FF6B8A';
            ctx.beginPath();
            ctx.moveTo(0, -20);
            ctx.lineTo(12, -5);
            ctx.lineTo(0, 8);
            ctx.lineTo(-12, -5);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#FF1493';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -28);
            ctx.lineTo(22, -8);
            ctx.lineTo(22, 12);
            ctx.lineTo(0, 28);
            ctx.lineTo(-22, 12);
            ctx.lineTo(-22, -8);
            ctx.closePath();
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
          ctx.restore();
        }

        if (gameRef.current.mouseDown && !target.sliced) {
          const dx = gameRef.current.mousePos.x - target.x;
          const dy = gameRef.current.mousePos.y - target.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          const pdx = gameRef.current.prevMousePos.x - target.x;
          const pdy = gameRef.current.prevMousePos.y - target.y;
          const prevDist = Math.sqrt(pdx * pdx + pdy * pdy);
          
          const bladeRadius = BLADES[gameState.activeBlade].radius;
          const swipeSpeed = Math.sqrt(
            Math.pow(gameRef.current.mousePos.x - gameRef.current.prevMousePos.x, 2) +
            Math.pow(gameRef.current.mousePos.y - gameRef.current.prevMousePos.y, 2)
          );

          if ((dist < bladeRadius + 18 || prevDist < bladeRadius + 18) && swipeSpeed > 3) {
            target.sliced = true;
            createSliceParticles(target.x, target.y, target.color, 15);
            createSlashEffect(target.x, target.y);
            playSliceSound();

            if (target.type === 'thor') {
              activateThor();
              return;
            }

            if (target.type === 'bomb') {
              for (let i = 0; i < 30; i++) {
                const angle = (Math.PI * 2 * i) / 30;
                const speed = 8 + Math.random() * 8;
                gameRef.current.particles.push({
                  x: target.x, y: target.y,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  life: 40,
                  color: i % 2 === 0 ? '#FF0000' : '#FF6600',
                  size: 5 + Math.random() * 5
                });
              }
            }

            setGameState(prev => {
              if (target.type === 'bomb') {
                const newLives = prev.lives - 1;
                return {
                  ...prev,
                  score: Math.max(0, prev.score - 100),
                  streak: 0,
                  lives: newLives,
                  gameOver: newLives <= 0,
                  phase: newLives <= 0 ? 'ended' : prev.phase
                };
              }

              if (target.type === 'heart') {
                return {
                  ...prev,
                  lives: Math.min(prev.lives + 1, 3),
                  streak: prev.streak + 1
                };
              }

              if (target.type === 'ruby') {
                gameRef.current.slowMotionActive = true;
                gameRef.current.slowMotionTimer = 300;
                
                for (let i = 0; i < 40; i++) {
                  const angle = (Math.PI * 2 * i) / 40;
                  const speed = 6 + Math.random() * 8;
                  gameRef.current.particles.push({
                    x: target.x, y: target.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 50,
                    color: i % 3 === 0 ? '#E0115F' : i % 3 === 1 ? '#FF6B8A' : '#FF1493',
                    size: 6 + Math.random() * 6
                  });
                }
                
                for (let i = 0; i < 20; i++) {
                  const angle = Math.random() * Math.PI * 2;
                  const dist = Math.random() * 100;
                  gameRef.current.particles.push({
                    x: target.x + Math.cos(angle) * dist,
                    y: target.y + Math.sin(angle) * dist,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    life: 60 + Math.random() * 30,
                    color: '#FFD700',
                    size: 3 + Math.random() * 3
                  });
                }
                
                return {
                  ...prev,
                  score: prev.score + 100,
                  kicks: prev.kicks + 50,
                  streak: prev.streak + 1
                };
              }

              const newStreak = prev.streak + 1;
              const points = target.type === 'coin' ? 50 : target.type === 'pineapple' ? 25 : target.type === 'carrot' ? 15 : 10;
              const multiplier = 1 + Math.floor(newStreak / 5) * 0.5;
              const reward = Math.floor(points * multiplier);

              return {
                ...prev,
                score: prev.score + reward,
                kicks: prev.kicks + Math.floor(reward / 2),
                streak: newStreak
              };
            });
          }
        }

        if (target.y > 650 && !target.sliced && target.type !== 'bomb' && target.type !== 'thor' && target.type !== 'heart' && target.type !== 'ruby') {
          setGameState(prev => {
            const newLives = prev.lives - 1;
            return {
              ...prev,
              lives: newLives,
              gameOver: newLives <= 0,
              phase: newLives <= 0 ? 'ended' : prev.phase,
              streak: 0
            };
          });
          gameRef.current.targets.splice(idx, 1);
        }
      });

      gameRef.current.targets = gameRef.current.targets.filter(t => t.y < 700 && t.x > -50 && t.x < 850);

      gameRef.current.lightningBolts = gameRef.current.lightningBolts.filter(bolt => {
        bolt.life--;
        
        if (bolt.life > 0) {
          const maxLife = 60;
          const alpha = Math.min(1, bolt.life / 30);
          
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          ctx.strokeStyle = '#87CEEB';
          ctx.lineWidth = 12;
          ctx.shadowBlur = 40;
          ctx.shadowColor = '#00BFFF';
          ctx.globalAlpha = alpha * 0.5;
          ctx.beginPath();
          bolt.segments.forEach((seg, i) => {
            if (i === 0) ctx.moveTo(seg.x, seg.y);
            else ctx.lineTo(seg.x, seg.y);
          });
          ctx.stroke();
          
          ctx.strokeStyle = '#00BFFF';
          ctx.lineWidth = 6;
          ctx.shadowBlur = 30;
          ctx.globalAlpha = alpha * 0.8;
          ctx.beginPath();
          bolt.segments.forEach((seg, i) => {
            if (i === 0) ctx.moveTo(seg.x, seg.y);
            else ctx.lineTo(seg.x, seg.y);
          });
          ctx.stroke();
          
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#FFFFFF';
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          bolt.segments.forEach((seg, i) => {
            if (i === 0) ctx.moveTo(seg.x, seg.y);
            else ctx.lineTo(seg.x, seg.y);
          });
          ctx.stroke();
          
          ctx.restore();
          return true;
        }
        return false;
      });

      if (gameRef.current.thorFlashTimer > 0) {
        gameRef.current.thorFlashTimer--;
        const flashIntensity = gameRef.current.thorFlashTimer / 30;
        ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity * 0.8})`;
        ctx.fillRect(0, 0, 800, 600);
      }

      if (gameRef.current.thorActive) {
        gameRef.current.thorTimer--;
        
        const flashAlpha = 0.15 * (gameRef.current.thorTimer / 180);
        ctx.fillStyle = `rgba(0, 191, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, 800, 600);
        
        const thorY = 150 + Math.sin(gameRef.current.thorTimer * 0.15) * 15;
        ctx.save();
        
        ctx.shadowBlur = 60;
        ctx.shadowColor = '#00BFFF';
        
        if (thorImageRef.current) {
          const imgSize = 200;
          const scale = 1 + Math.sin(gameRef.current.thorTimer * 0.1) * 0.05;
          const drawSize = imgSize * scale;
          ctx.drawImage(
            thorImageRef.current,
            400 - drawSize / 2,
            thorY - drawSize / 2,
            drawSize,
            drawSize
          );
        }
        
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#00BFFF';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00BFFF';
        ctx.fillText('⚡ THOR BUNNY ⚡', 400, thorY + 130);
        
        ctx.restore();
        
        if (gameRef.current.thorTimer <= 0) {
          gameRef.current.thorActive = false;
        }
      }

      if (gameRef.current.mouseDown) {
        const now = Date.now();
        gameRef.current.trail.push({ ...gameRef.current.mousePos, time: now });
        gameRef.current.trail = gameRef.current.trail.filter(p => now - p.time < 150);
      }

      if (gameRef.current.trail.length > 1) {
        const blade = BLADES[gameState.activeBlade];
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        for (let i = 1; i < gameRef.current.trail.length; i++) {
          const t = i / gameRef.current.trail.length;
          ctx.strokeStyle = blade.color;
          ctx.lineWidth = 8 * t;
          ctx.shadowBlur = 20 * t;
          ctx.shadowColor = blade.color;
          ctx.globalAlpha = t;
          
          ctx.beginPath();
          ctx.moveTo(gameRef.current.trail[i - 1].x, gameRef.current.trail[i - 1].y);
          ctx.lineTo(gameRef.current.trail[i].x, gameRef.current.trail[i].y);
          ctx.stroke();
        }
        
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      if (gameRef.current.slowMotionActive) {
        ctx.fillStyle = 'rgba(224, 17, 95, 0.1)';
        ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
        
        ctx.strokeStyle = '#E0115F';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FF1493';
        ctx.strokeRect(10, 10, BASE_WIDTH - 20, BASE_HEIGHT - 20);
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FFD700';
        ctx.fillText('⏱ SLOW MOTION ⏱', BASE_WIDTH / 2, 50);
        ctx.shadowBlur = 0;
      }

      ctx.restore();
      animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, [gameState.phase, gameState.showShop, gameState.level, gameState.activeBlade, spawnTarget, createSliceParticles, createSlashEffect, activateThor, playSliceSound]);

  const buyBlade = async (bladeName: string) => {
    const blade = BLADES[bladeName];
    console.log('buyBlade called:', bladeName, 'cost:', blade.cost, 'displayKicks:', displayKicks, 'isPurchasing:', isPurchasing);
    
    if (displayKicks >= blade.cost && !gameState.unlockedBlades.includes(bladeName) && !isPurchasing) {
      setIsPurchasing(true);
      console.log('Starting purchase, calling sendKicksToHouse...');
      try {
        const txHash = await sendKicksToHouse(blade.cost.toString());
        console.log('sendKicksToHouse result:', txHash);
        if (txHash) {
          const newUnlockedBlades = [...gameState.unlockedBlades, bladeName];
          setGameState(prev => ({
            ...prev,
            unlockedBlades: newUnlockedBlades,
            activeBlade: bladeName
          }));
          saveBladeInventory(newUnlockedBlades, bladeName);
          await refreshBalance();
          setDisplayKicks(parseFloat(kicksBalance) || 0);
          if (walletAddress) {
            await fetch('/api/rabbit-rush/purchase', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ walletAddress, itemType: 'blade', itemId: bladeName, txHash }),
            });
          }
        }
      } catch (error) {
        console.error('Blade purchase failed:', error);
      } finally {
        setIsPurchasing(false);
        resetTransactionState();
      }
    } else {
      console.log('Purchase condition not met');
    }
  };

  const startGame = async () => {
    setClaimedKicks(null);
    setClaimError(null);
    gameRef.current = {
      targets: [],
      particles: [],
      trail: [],
      slashEffects: [],
      spawnTimer: 0,
      mouseDown: false,
      mousePos: { x: 0, y: 0 },
      prevMousePos: { x: 0, y: 0 },
      lightningBolts: [],
      thorActive: false,
      thorTimer: 0,
      thorFlashTimer: 0,
      lastSliceTime: 0,
      frameCount: 0,
      slowMotionTimer: 0,
      slowMotionActive: false
    };
    lastTimeRef.current = Date.now();

    let runId = null;
    if (walletAddress) {
      try {
        const res = await fetch('/api/rabbit-rush/run/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress, wager: 0 })
        });
        if (res.ok) {
          const data = await res.json();
          runId = data.runId;
        }
      } catch (e) {
        console.log('Failed to start run tracking');
      }
    }

    setGameState(prev => ({
      ...prev,
      score: 0,
      kicks: 0,
      level: 1,
      streak: 0,
      lives: 3,
      gameOver: false,
      phase: 'playing',
      timeRemaining: LEVEL_TIME,
      runId
    }));
  };

  const nextLevel = () => {
    gameRef.current.targets = [];
    gameRef.current.particles = [];
    gameRef.current.lightningBolts = [];
    gameRef.current.thorActive = false;
    gameRef.current.spawnTimer = 0;
    gameRef.current.frameCount = 0;
    lastTimeRef.current = Date.now();

    setGameState(prev => ({
      ...prev,
      level: prev.level + 1,
      timeRemaining: LEVEL_TIME,
      phase: 'playing'
    }));
  };

  const resetGame = () => {
    startGame();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden touch-none select-none flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-50 bg-black/70 backdrop-blur-sm border-b border-red-500/30 px-4 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation('/')}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMuted(!muted)}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button
              onClick={() => { fetchLeaderboard(); setShowLeaderboard(true); }}
              className="p-2 bg-yellow-600/80 hover:bg-yellow-500 text-white rounded-lg transition-colors"
            >
              <Trophy className="w-5 h-5" />
            </button>
          </div>
          
          {gameState.phase === 'playing' && (
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2 text-white">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className={`font-bold text-sm sm:text-base ${gameState.timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {formatTime(gameState.timeRemaining)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <span className="text-xs sm:text-sm text-gray-400">Lv</span>
                <span className="font-bold text-red-400">{gameState.level}/{MAX_LEVEL}</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <Zap className="w-4 h-4 text-green-400" />
                <span className="font-bold text-sm sm:text-base">{gameState.score}</span>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <Heart 
                    key={i} 
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${i < gameState.lives ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} 
                  />
                ))}
              </div>
              {gameState.streak >= 3 && (
                <div className="flex items-center gap-1 text-orange-400 animate-pulse">
                  <Flame className="w-4 h-4" />
                  <span className="font-bold text-sm">{gameState.streak}x</span>
                </div>
              )}
            </div>
          )}
          
        </div>
      </div>

      <div className="absolute inset-0 z-0">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="w-full h-full cursor-none touch-none"
          style={{ imageRendering: 'crisp-edges' }}
        />
      </div>
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="relative w-full h-full">

          {gameState.phase === 'menu' && (
            <div className="absolute inset-0 bg-black/85 flex items-center justify-center rounded-xl pointer-events-auto">
              <div className="bg-gradient-to-br from-purple-900/95 to-indigo-900/95 p-6 sm:p-8 rounded-2xl border-4 border-red-500 text-center max-w-md mx-4">
                <img 
                  src="/textures/rabbits-blade-logo.png" 
                  alt="Rabbits Blade" 
                  className="w-32 h-32 mx-auto mb-2 object-contain"
                />
                <h1 className="text-3xl sm:text-4xl font-bold text-red-500 mb-2">RABBITS BLADE</h1>
                <p className="text-gray-300 mb-4 text-sm sm:text-base">Survive 10 levels, 60 seconds each!</p>
                <div className="text-xs sm:text-sm text-gray-400 mb-6 space-y-1">
                  <p>🥕 Carrots = 15pts | 🍃 Leaves = 10pts</p>
                  <p>🍍 Pineapple = 25pts | 🪙 Coins = 50pts</p>
                  <p>💗 Hearts = +1 Life (max 3)</p>
                  <p>💣 Don't slice bombs! ⚡ Thor = Destroy ALL!</p>
                </div>
                <button
                  onClick={startGame}
                  className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold text-lg sm:text-xl rounded-xl transition-all active:scale-95"
                >
                  START GAME
                </button>
              </div>
            </div>
          )}

          {gameState.phase === 'levelComplete' && (
            <div className="absolute inset-0 bg-black/85 flex items-center justify-center rounded-xl pointer-events-auto">
              <div className="bg-gradient-to-br from-green-900/95 to-emerald-900/95 p-6 sm:p-8 rounded-xl text-center border-4 border-green-400 mx-4">
                <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">Level {gameState.level} Complete!</h2>
                <p className="text-xl text-yellow-300 mb-2">Score: {gameState.score}</p>
                <p className="text-lg text-green-400 mb-6">KICKS Earned: {gameState.kicks}</p>
                <button
                  onClick={nextLevel}
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-lg sm:text-xl rounded-xl transition-all active:scale-95"
                >
                  Next Level ({gameState.level + 1}/{MAX_LEVEL})
                </button>
              </div>
            </div>
          )}

          {gameState.phase === 'victory' && (
            <div className="absolute inset-0 bg-black/85 flex items-center justify-center rounded-xl pointer-events-auto">
              <div className="bg-gradient-to-br from-yellow-900/95 to-orange-900/95 p-6 sm:p-8 rounded-xl text-center border-4 border-yellow-400 mx-4">
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-3xl sm:text-4xl font-bold text-yellow-400 mb-2">VICTORY!</h2>
                <p className="text-xl text-white mb-2">All 10 Levels Complete!</p>
                <p className="text-2xl text-yellow-300 mb-2">Final Score: {gameState.score}</p>
                <p className="text-lg text-green-400 mb-4">Total KICKS: {gameState.kicks}</p>
                {claimError && (
                  <p className="text-red-400 text-sm mb-4">{claimError}</p>
                )}
                <div className="flex gap-3 justify-center flex-wrap">
                  {gameState.kicks > 0 && walletAddress && (
                    <button
                      onClick={claimKicks}
                      className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-black rounded-xl font-bold text-base sm:text-lg active:scale-95 transition-transform"
                    >
                      Claim {gameState.kicks} KICKS
                    </button>
                  )}
                  <button
                    onClick={resetGame}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-base sm:text-lg active:scale-95 transition-transform"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={() => setLocation('/')}
                    className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-bold text-base sm:text-lg active:scale-95 transition-transform"
                  >
                    Games
                  </button>
                </div>
              </div>
            </div>
          )}

          {gameState.showShop && (
            <div className="absolute inset-0 bg-black/85 flex items-center justify-center rounded-xl pointer-events-auto">
              <div className="bg-gradient-to-br from-purple-800 to-indigo-900 p-4 sm:p-6 rounded-xl max-w-md w-full mx-4 border-4 border-red-500">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-white">⚔️ Blade Shop</h2>
                  <button
                    onClick={() => setGameState(prev => ({ ...prev, showShop: false }))}
                    className="text-white hover:text-red-400 p-1"
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="text-yellow-300 mb-4">Your Wallet: {displayKicks.toFixed(0)} KICKS</div>
                {isPurchasing && (
                  <div className="text-center text-yellow-400 mb-4 animate-pulse">Processing purchase...</div>
                )}
                {Object.entries(BLADES).sort((a, b) => a[1].cost - b[1].cost).map(([name, blade]) => (
                  <div
                    key={name}
                    className="bg-black/40 p-3 sm:p-4 rounded-lg mb-3 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <Sword className="w-6 h-6" style={{ color: blade.color }} />
                      <div>
                        <h3 className="font-bold text-sm sm:text-base" style={{ color: blade.color }}>
                          {blade.name}
                        </h3>
                        <p className="text-xs text-gray-400">Range: {blade.radius}px</p>
                      </div>
                    </div>
                    {gameState.unlockedBlades.includes(name) ? (
                      <button
                        onClick={() => {
                          setGameState(prev => ({ ...prev, activeBlade: name, showShop: false }));
                          saveBladeInventory(gameState.unlockedBlades, name);
                        }}
                        className={`px-3 py-2 rounded text-white text-sm font-bold ${
                          gameState.activeBlade === name
                            ? 'bg-green-600'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {gameState.activeBlade === name ? '✓ Equipped' : 'Equip'}
                      </button>
                    ) : (
                      <button
                        onClick={() => buyBlade(name)}
                        disabled={displayKicks < blade.cost || isPurchasing}
                        className={`px-3 py-2 rounded text-white text-sm font-bold ${
                          displayKicks >= blade.cost && !isPurchasing
                            ? 'bg-yellow-600 hover:bg-yellow-700'
                            : 'bg-gray-600 cursor-not-allowed opacity-50'
                        }`}
                      >
                        {isPurchasing ? '...' : `${blade.cost} KICKS`}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {gameState.phase === 'claiming' && (
            <div className="absolute inset-0 bg-black/85 flex items-center justify-center rounded-xl pointer-events-auto">
              <div className="bg-gradient-to-br from-purple-900/95 to-indigo-900/95 p-6 sm:p-8 rounded-xl text-center border-4 border-yellow-400 mx-4">
                <Loader2 className="w-12 h-12 text-yellow-400 mx-auto mb-4 animate-spin" />
                <h2 className="text-2xl font-bold text-white mb-2">Claiming KICKS...</h2>
                <p className="text-gray-300">Please sign the message in your wallet</p>
              </div>
            </div>
          )}

          {gameState.phase === 'ended' && (
            <div className="absolute inset-0 bg-black/85 flex items-center justify-center rounded-xl pointer-events-auto">
              <div className="bg-gradient-to-br from-red-900/95 to-purple-900/95 p-6 sm:p-8 rounded-xl text-center border-4 border-red-500 mx-4">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">💀 Game Over!</h2>
                <p className="text-lg text-gray-300 mb-2">Reached Level {gameState.level}/{MAX_LEVEL}</p>
                <p className="text-xl sm:text-2xl text-yellow-300 mb-2">Score: {gameState.score}</p>
                {claimedKicks !== null ? (
                  <p className="text-lg text-green-400 mb-2">Claimed: {claimedKicks} KICKS</p>
                ) : (
                  <p className="text-lg text-green-400 mb-2">KICKS Earned: {gameState.kicks}</p>
                )}
                {claimError && (
                  <p className="text-red-400 text-sm mb-4">{claimError}</p>
                )}
                <div className="flex gap-3 justify-center flex-wrap">
                  {gameState.kicks > 0 && walletAddress && claimedKicks === null && (
                    <button
                      onClick={claimKicks}
                      className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-black rounded-xl font-bold text-base sm:text-lg active:scale-95 transition-transform"
                    >
                      Claim {gameState.kicks} KICKS
                    </button>
                  )}
                  <button
                    onClick={resetGame}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-base sm:text-lg active:scale-95 transition-transform"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={() => setLocation('/')}
                    className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-bold text-base sm:text-lg active:scale-95 transition-transform"
                  >
                    Games
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {gameState.phase === 'playing' && (
        <>
          <div className="fixed bottom-4 right-4 bg-black/80 px-4 py-2 rounded-lg border border-yellow-500/50 z-50">
            <span className="text-yellow-400 font-bold text-lg">{gameState.kicks} KICKS</span>
          </div>
          <button
            onClick={() => setGameState(prev => ({ ...prev, showShop: !prev.showShop }))}
            className="fixed bottom-4 left-4 p-3 bg-red-600/90 hover:bg-red-700 text-white rounded-lg transition-colors z-50 border border-red-400/50"
          >
            <ShoppingCart className="w-6 h-6" />
          </button>
        </>
      )}

      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl border-4 border-yellow-500 max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-yellow-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <h2 className="text-xl font-bold text-white">Weekly Leaderboard</h2>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="p-4 text-center border-b border-yellow-500/30">
              <p className="text-gray-400 text-sm">Resets Saturday at midnight UTC</p>
              <p className="text-yellow-400 font-bold">{getTimeUntilReset()}</p>
            </div>
            <div className="overflow-y-auto max-h-[50vh] p-4">
              {leaderboardData.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No scores yet this week. Be the first!</p>
              ) : (
                <div className="space-y-2">
                  {leaderboardData.map((entry, index) => (
                    <div 
                      key={entry.id} 
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        index === 0 ? 'bg-yellow-500/20 border border-yellow-500/50' :
                        index === 1 ? 'bg-gray-400/20 border border-gray-400/50' :
                        index === 2 ? 'bg-orange-600/20 border border-orange-600/50' :
                        'bg-white/5'
                      }`}
                    >
                      <span className={`font-bold text-lg w-8 ${
                        index === 0 ? 'text-yellow-400' :
                        index === 1 ? 'text-gray-300' :
                        index === 2 ? 'text-orange-400' :
                        'text-gray-500'
                      }`}>
                        #{index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-white font-semibold">{entry.username}</p>
                        <p className="text-gray-400 text-xs">Level {entry.highestLevel} | {entry.gamesPlayed} games</p>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400 font-bold">{entry.highScore.toLocaleString()}</p>
                        <p className="text-green-400 text-xs">{entry.totalKicks} KICKS</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showUsernamePrompt && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl border-4 border-yellow-500 max-w-sm w-full p-6">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">Enter Your Name</h2>
            <p className="text-gray-400 text-sm text-center mb-4">Save your score to the weekly leaderboard!</p>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username..."
              maxLength={20}
              className="w-full px-4 py-3 bg-black/50 border-2 border-yellow-500/50 rounded-xl text-white text-center text-lg focus:outline-none focus:border-yellow-400 mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleUsernameSubmit()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowUsernamePrompt(false); setPendingScore(null); }}
                className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleUsernameSubmit}
                disabled={!username.trim()}
                className="flex-1 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BunnyBladeApp;
