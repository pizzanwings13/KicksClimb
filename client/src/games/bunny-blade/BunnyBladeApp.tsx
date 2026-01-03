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

const LEVEL_CONFIGS: Record<number, LevelConfig> = {
  1: { spawnInterval: 30, maxTargets: 8, bombChance: 0.05, thorChance: 0.01, speedMult: 1.0, coinChance: 0.1, pineappleChance: 0.08, heartChance: 0.05 },
  2: { spawnInterval: 28, maxTargets: 9, bombChance: 0.08, thorChance: 0.012, speedMult: 1.1, coinChance: 0.12, pineappleChance: 0.08, heartChance: 0.04 },
  3: { spawnInterval: 25, maxTargets: 10, bombChance: 0.10, thorChance: 0.014, speedMult: 1.2, coinChance: 0.14, pineappleChance: 0.07, heartChance: 0.04 },
  4: { spawnInterval: 22, maxTargets: 11, bombChance: 0.12, thorChance: 0.016, speedMult: 1.3, coinChance: 0.16, pineappleChance: 0.07, heartChance: 0.03 },
  5: { spawnInterval: 20, maxTargets: 12, bombChance: 0.14, thorChance: 0.018, speedMult: 1.4, coinChance: 0.18, pineappleChance: 0.06, heartChance: 0.03 },
  6: { spawnInterval: 18, maxTargets: 13, bombChance: 0.16, thorChance: 0.02, speedMult: 1.5, coinChance: 0.2, pineappleChance: 0.06, heartChance: 0.025 },
  7: { spawnInterval: 16, maxTargets: 14, bombChance: 0.18, thorChance: 0.022, speedMult: 1.6, coinChance: 0.22, pineappleChance: 0.05, heartChance: 0.025 },
  8: { spawnInterval: 14, maxTargets: 15, bombChance: 0.20, thorChance: 0.024, speedMult: 1.7, coinChance: 0.24, pineappleChance: 0.05, heartChance: 0.02 },
  9: { spawnInterval: 12, maxTargets: 16, bombChance: 0.22, thorChance: 0.026, speedMult: 1.8, coinChance: 0.26, pineappleChance: 0.04, heartChance: 0.02 },
  10: { spawnInterval: 10, maxTargets: 18, bombChance: 0.25, thorChance: 0.03, speedMult: 2.0, coinChance: 0.3, pineappleChance: 0.04, heartChance: 0.015 },
};

const LEVEL_TIME = 60;
const MAX_LEVEL = 10;

const BLADES: Record<string, Blade> = {
  Wooden: { radius: 25, color: '#8B4513', cost: 0, name: 'Wooden Blade' },
  Steel: { radius: 35, color: '#C0C0C0', cost: 2500, name: 'Steel Blade' },
  Plasma: { radius: 50, color: '#00FFFF', cost: 5000, name: 'Plasma Blade' }
};

export function BunnyBladeApp() {
  const { kicksBalance, walletAddress, signMessage, signClaimMessage, requestKicksFromHouse, refreshBalance } = useWallet();
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [muted, setMuted] = useState(false);
  const [displayKicks, setDisplayKicks] = useState(0);
  const [claimError, setClaimError] = useState<string | null>(null);
  const thorImageRef = useRef<HTMLImageElement | null>(null);
  const lastTimeRef = useRef<number>(Date.now());
  
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    kicks: 0,
    level: 1,
    streak: 0,
    activeBlade: 'Wooden',
    unlockedBlades: ['Wooden'],
    gameOver: false,
    showShop: false,
    lives: 3,
    phase: 'menu',
    timeRemaining: LEVEL_TIME,
    runId: null
  });

  useEffect(() => {
    setDisplayKicks(parseFloat(kicksBalance) || 0);
  }, [kicksBalance]);

  useEffect(() => {
    const img = new Image();
    img.src = '/textures/thor-bunny.png';
    img.onload = () => {
      thorImageRef.current = img;
    };
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
    lastSliceTime: 0,
    frameCount: 0
  });

  const createSliceParticles = useCallback((x: number, y: number, color: string, count: number = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 4 + Math.random() * 6;
      gameRef.current.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 25 + Math.random() * 15,
        color,
        size: 3 + Math.random() * 4
      });
    }
  }, []);

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

    let pointsEarned = 0;
    let kicksEarned = 0;

    gameRef.current.targets.forEach(target => {
      if (target.type !== 'thor' && !target.sliced) {
        gameRef.current.lightningBolts.push({
          startX: 400,
          startY: 150,
          endX: target.x,
          endY: target.y,
          life: 40,
          segments: generateLightningSegments(400, 150, target.x, target.y)
        });
        
        createSliceParticles(target.x, target.y, '#00BFFF', 20);
        target.sliced = true;
        target.hitByThor = true;

        if (target.type !== 'bomb' && target.type !== 'heart') {
          const points = target.type === 'coin' ? 50 : target.type === 'pineapple' ? 25 : target.type === 'carrot' ? 15 : 10;
          pointsEarned += points;
          kicksEarned += Math.floor(points / 2);
        }
      }
    });

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
      heart: '#FF69B4'
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
    if (!walletAddress || gameState.kicks <= 0 || !gameState.runId) return;
    
    setClaimError(null);
    setGameState(prev => ({ ...prev, phase: 'claiming' }));

    try {
      await saveRunResult(true, gameState.kicks);

      const authMessage = `Request Rabbit Rush claim nonce for run ${gameState.runId}`;
      const authSignature = await signMessage(authMessage);
      if (!authSignature) {
        throw new Error('Signature cancelled');
      }

      const nonceRes = await fetch(`/api/rabbit-rush/run/${gameState.runId}/claim-nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, authSignature })
      });

      if (!nonceRes.ok) {
        const errorData = await nonceRes.json();
        throw new Error(errorData.error || 'Failed to get claim nonce');
      }

      const { nonce, expectedPayout } = await nonceRes.json();
      const runIdNum = parseInt(gameState.runId, 10);
      
      const signature = await signClaimMessage(expectedPayout, runIdNum, nonce, 'rabbit-rush');
      if (!signature) {
        throw new Error('Claim signature cancelled');
      }

      const claimed = await requestKicksFromHouse(expectedPayout, runIdNum, signature, nonce, 'rabbit-rush');

      if (claimed) {
        await refreshBalance();
        setGameState(prev => ({ ...prev, phase: 'ended', kicks: 0 }));
      } else {
        throw new Error('Claim failed');
      }
    } catch (error: any) {
      setClaimError(error.message || 'Failed to claim KICKS');
      setGameState(prev => ({ ...prev, phase: 'ended' }));
    }
  }, [walletAddress, gameState.kicks, gameState.runId, saveRunResult, signMessage, signClaimMessage, requestKicksFromHouse, refreshBalance]);

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

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      gameRef.current.prevMousePos = { ...gameRef.current.mousePos };
      gameRef.current.mousePos = {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      gameRef.current.mouseDown = true;
      gameRef.current.lastSliceTime = Date.now();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      gameRef.current.mousePos = {
        x: (touch.clientX - rect.left) * (canvas.width / rect.width),
        y: (touch.clientY - rect.top) * (canvas.height / rect.height)
      };
    };

    const handleTouchEnd = () => {
      gameRef.current.mouseDown = false;
      gameRef.current.trail = [];
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      gameRef.current.prevMousePos = { ...gameRef.current.mousePos };
      gameRef.current.mousePos = {
        x: (touch.clientX - rect.left) * (canvas.width / rect.width),
        y: (touch.clientY - rect.top) * (canvas.height / rect.height)
      };
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    const gameLoop = () => {
      if (gameState.phase !== 'playing' || gameState.showShop) {
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, 800, 600);
        animationId = requestAnimationFrame(gameLoop);
        return;
      }

      gameRef.current.frameCount++;

      const now = Date.now();
      const deltaTime = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

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

      const gradient = ctx.createLinearGradient(0, 0, 0, 600);
      gradient.addColorStop(0, '#1a0a2e');
      gradient.addColorStop(1, '#0a0a1a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 600);

      const config = LEVEL_CONFIGS[gameState.level] || LEVEL_CONFIGS[10];
      gameRef.current.spawnTimer++;
      if (gameRef.current.spawnTimer > config.spawnInterval) {
        spawnTarget(gameState.level);
        gameRef.current.spawnTimer = 0;
      }

      gameRef.current.particles = gameRef.current.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.vx *= 0.98;
        p.life--;
        
        if (p.life > 0) {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life / 40;
          const size = p.size || 4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * (p.life / 40), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          return true;
        }
        return false;
      });

      gameRef.current.slashEffects = gameRef.current.slashEffects.filter(slash => {
        slash.life--;
        if (slash.life > 0) {
          ctx.save();
          ctx.translate(slash.x, slash.y);
          ctx.rotate(slash.angle);
          
          const alpha = slash.life / 15;
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 4 * alpha;
          ctx.lineCap = 'round';
          ctx.shadowBlur = 20;
          ctx.shadowColor = BLADES[gameState.activeBlade].color;
          
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
        target.x += target.vx;
        target.y += target.vy;
        target.vy += 0.55;
        target.rotation += target.rotSpeed;

        if (!target.sliced) {
          ctx.save();
          ctx.translate(target.x, target.y);
          ctx.rotate(target.rotation);
          
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
            ctx.arc(0, 0, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FF6600';
            ctx.fillRect(-3, -28, 6, 12);
            ctx.fillStyle = '#FFFF00';
            ctx.beginPath();
            ctx.arc(0, -32, 5, 0, Math.PI * 2);
            ctx.fill();
          } else if (target.type === 'coin') {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#FFD700';
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.fillStyle = '#DAA520';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', 0, 0);
            ctx.shadowBlur = 0;
          } else if (target.type === 'carrot') {
            ctx.fillStyle = '#FF6B00';
            ctx.beginPath();
            ctx.moveTo(0, -25);
            ctx.lineTo(12, 20);
            ctx.lineTo(-12, 20);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#228B22';
            ctx.fillRect(-8, -30, 16, 10);
          } else if (target.type === 'leaf') {
            ctx.fillStyle = '#32CD32';
            ctx.beginPath();
            ctx.ellipse(0, 0, 12, 22, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#228B22';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -22);
            ctx.lineTo(0, 22);
            ctx.stroke();
          } else if (target.type === 'pineapple') {
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.ellipse(0, 5, 16, 22, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#DAA520';
            ctx.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
              ctx.beginPath();
              ctx.moveTo(-10 + i * 5, -15 + (i % 2) * 5);
              ctx.lineTo(-10 + i * 5, 25 - (i % 2) * 5);
              ctx.stroke();
            }
            ctx.fillStyle = '#228B22';
            for (let i = 0; i < 5; i++) {
              ctx.beginPath();
              ctx.ellipse(-8 + i * 4, -25, 4, 10, (i - 2) * 0.3, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (target.type === 'heart') {
            ctx.fillStyle = '#FF69B4';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#FF69B4';
            ctx.beginPath();
            ctx.moveTo(0, 8);
            ctx.bezierCurveTo(-20, -10, -20, -25, 0, -15);
            ctx.bezierCurveTo(20, -25, 20, -10, 0, 8);
            ctx.fill();
            ctx.fillStyle = '#FFB6C1';
            ctx.beginPath();
            ctx.arc(-8, -12, 4, 0, Math.PI * 2);
            ctx.fill();
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
                  lives: Math.min(prev.lives + 1, 5),
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

        if (target.y > 650 && !target.sliced && target.type !== 'bomb' && target.type !== 'thor' && target.type !== 'heart') {
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
          ctx.strokeStyle = '#00BFFF';
          ctx.lineWidth = 4;
          ctx.shadowBlur = 25;
          ctx.shadowColor = '#00BFFF';
          ctx.globalAlpha = bolt.life / 40;
          
          ctx.beginPath();
          bolt.segments.forEach((seg, i) => {
            if (i === 0) ctx.moveTo(seg.x, seg.y);
            else ctx.lineTo(seg.x, seg.y);
          });
          ctx.stroke();
          
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.beginPath();
          bolt.segments.forEach((seg, i) => {
            if (i === 0) ctx.moveTo(seg.x, seg.y);
            else ctx.lineTo(seg.x, seg.y);
          });
          ctx.stroke();
          
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
          return true;
        }
        return false;
      });

      if (gameRef.current.thorActive) {
        gameRef.current.thorTimer--;
        
        const flashAlpha = 0.3 * (gameRef.current.thorTimer / 180);
        ctx.fillStyle = `rgba(135, 206, 250, ${flashAlpha})`;
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
  }, [gameState.phase, gameState.showShop, gameState.level, gameState.activeBlade, spawnTarget, createSliceParticles, createSlashEffect, activateThor]);

  const buyBlade = (bladeName: string) => {
    const blade = BLADES[bladeName];
    if (gameState.kicks >= blade.cost && !gameState.unlockedBlades.includes(bladeName)) {
      setGameState(prev => ({
        ...prev,
        kicks: prev.kicks - blade.cost,
        unlockedBlades: [...prev.unlockedBlades, bladeName],
        activeBlade: bladeName
      }));
    }
  };

  const startGame = async () => {
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
      lastSliceTime: 0,
      frameCount: 0
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

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-purple-900 via-indigo-900 to-black overflow-hidden touch-none select-none flex flex-col">
      <div className="flex-shrink-0 bg-black/80 border-b border-red-500/30 px-4 py-2">
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
                {[...Array(5)].map((_, i) => (
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
          
          <div className="flex items-center gap-3">
            {gameState.phase === 'playing' && (
              <button
                onClick={() => setGameState(prev => ({ ...prev, showShop: !prev.showShop }))}
                className="p-2 bg-red-600/80 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-2 sm:p-4">
        <div className="relative w-full max-w-4xl" style={{ aspectRatio: '4/3' }}>
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full h-full border-4 border-red-500/50 rounded-xl shadow-2xl cursor-none touch-none"
            style={{ imageRendering: 'crisp-edges' }}
          />

          {gameState.phase === 'playing' && (
            <div className="absolute bottom-4 left-4 bg-black/70 px-4 py-2 rounded-lg border border-yellow-500/50">
              <span className="text-yellow-400 font-bold text-lg">{gameState.kicks} KICKS</span>
            </div>
          )}

          {gameState.phase === 'menu' && (
            <div className="absolute inset-0 bg-black/85 flex items-center justify-center rounded-xl">
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
                  <p>💗 Hearts = +1 Life (max 5)</p>
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
            <div className="absolute inset-0 bg-black/85 flex items-center justify-center rounded-xl">
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
            <div className="absolute inset-0 bg-black/85 flex items-center justify-center rounded-xl">
              <div className="bg-gradient-to-br from-yellow-900/95 to-orange-900/95 p-6 sm:p-8 rounded-xl text-center border-4 border-yellow-400 mx-4">
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-3xl sm:text-4xl font-bold text-yellow-400 mb-2">VICTORY!</h2>
                <p className="text-xl text-white mb-2">All 10 Levels Complete!</p>
                <p className="text-2xl text-yellow-300 mb-2">Final Score: {gameState.score}</p>
                <p className="text-lg text-green-400 mb-6">Total KICKS: {gameState.kicks}</p>
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
                </div>
              </div>
            </div>
          )}

          {gameState.showShop && (
            <div className="absolute inset-0 bg-black/85 flex items-center justify-center rounded-xl">
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
                <div className="text-yellow-300 mb-4">Your KICKS: {gameState.kicks}</div>
                {Object.entries(BLADES).map(([name, blade]) => (
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
                        onClick={() => setGameState(prev => ({ ...prev, activeBlade: name, showShop: false }))}
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
                        disabled={gameState.kicks < blade.cost}
                        className={`px-3 py-2 rounded text-white text-sm font-bold ${
                          gameState.kicks >= blade.cost
                            ? 'bg-yellow-600 hover:bg-yellow-700'
                            : 'bg-gray-600 cursor-not-allowed opacity-50'
                        }`}
                      >
                        {blade.cost} KICKS
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {gameState.phase === 'claiming' && (
            <div className="absolute inset-0 bg-black/85 flex items-center justify-center rounded-xl">
              <div className="bg-gradient-to-br from-purple-900/95 to-indigo-900/95 p-6 sm:p-8 rounded-xl text-center border-4 border-yellow-400 mx-4">
                <Loader2 className="w-12 h-12 text-yellow-400 mx-auto mb-4 animate-spin" />
                <h2 className="text-2xl font-bold text-white mb-2">Claiming KICKS...</h2>
                <p className="text-gray-300">Please sign the message in your wallet</p>
              </div>
            </div>
          )}

          {gameState.phase === 'ended' && (
            <div className="absolute inset-0 bg-black/85 flex items-center justify-center rounded-xl">
              <div className="bg-gradient-to-br from-red-900/95 to-purple-900/95 p-6 sm:p-8 rounded-xl text-center border-4 border-red-500 mx-4">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">💀 Game Over!</h2>
                <p className="text-lg text-gray-300 mb-2">Reached Level {gameState.level}/{MAX_LEVEL}</p>
                <p className="text-xl sm:text-2xl text-yellow-300 mb-2">Score: {gameState.score}</p>
                <p className="text-lg text-green-400 mb-2">KICKS Earned: {gameState.kicks}</p>
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
        </div>
      </div>
    </div>
  );
}

export default BunnyBladeApp;
