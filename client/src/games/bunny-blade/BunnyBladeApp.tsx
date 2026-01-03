import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sword, ShoppingCart, X, ArrowLeft, Volume2, VolumeX, Heart, Flame, Zap } from 'lucide-react';
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
  phase: 'menu' | 'playing' | 'ended';
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
  sliceAngle?: number;
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

const BLADES: Record<string, Blade> = {
  Wooden: { radius: 25, color: '#8B4513', cost: 0, name: 'Wooden Blade' },
  Steel: { radius: 35, color: '#C0C0C0', cost: 2500, name: 'Steel Blade' },
  Plasma: { radius: 50, color: '#00FFFF', cost: 5000, name: 'Plasma Blade' }
};

export function BunnyBladeApp() {
  const { kicksBalance } = useWallet();
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [muted, setMuted] = useState(false);
  const [displayKicks, setDisplayKicks] = useState(0);
  const thorImageRef = useRef<HTMLImageElement | null>(null);
  
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
    phase: 'menu'
  });

  useEffect(() => {
    setDisplayKicks(parseFloat(kicksBalance) || 0);
  }, [kicksBalance]);

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
    lastSliceTime: 0
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

    gameRef.current.targets.forEach(target => {
      if (target.type !== 'thor' && !target.sliced) {
        gameRef.current.lightningBolts.push({
          startX: 400,
          startY: 80,
          endX: target.x,
          endY: target.y,
          life: 30,
          segments: generateLightningSegments(400, 80, target.x, target.y)
        });
        target.hitByThor = true;
      }
    });
  }, [generateLightningSegments]);

  const getDifficulty = useCallback((level: number) => {
    const speedMult = 1.2 + (level * 0.2);
    const spawnRate = Math.max(15, 50 - (level * 4));
    return { speedMult, spawnRate };
  }, []);

  const spawnTarget = useCallback((level: number) => {
    const { speedMult } = getDifficulty(level);
    
    if (Math.random() < 0.012) {
      gameRef.current.targets.push({
        type: 'thor',
        x: Math.random() * 600 + 100,
        y: 600,
        vx: (Math.random() - 0.5) * 2,
        vy: -(Math.random() * 5 + 12) * speedMult,
        color: '#4169E1',
        sliced: false,
        rotation: 0,
        rotSpeed: 0.3
      });
      return;
    }

    const types: string[] = [];
    types.push('carrot', 'carrot', 'carrot');
    types.push('leaf', 'leaf');
    if (level >= 2) types.push('coin', 'coin');
    if (level >= 3) types.push('bomb');
    if (level >= 5) types.push('bomb');

    const type = types[Math.floor(Math.random() * types.length)];

    const colors: Record<string, string> = {
      carrot: '#FF6B00',
      leaf: '#32CD32',
      coin: '#FFD700',
      bomb: '#FF0000'
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
      vy: -(Math.random() * 6 + 14) * speedMult,
      color: colors[type],
      sliced: false,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 0.25
    });
  }, [getDifficulty]);

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

      const gradient = ctx.createLinearGradient(0, 0, 0, 600);
      gradient.addColorStop(0, '#1a0a2e');
      gradient.addColorStop(1, '#0a0a1a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 600);

      const { spawnRate } = getDifficulty(gameState.level);
      gameRef.current.spawnTimer++;
      if (gameRef.current.spawnTimer > spawnRate) {
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

        if (target.hitByThor) {
          createSliceParticles(target.x, target.y, target.color, 20);
          target.sliced = true;
          
          if (target.type !== 'bomb') {
            setGameState(prev => ({
              ...prev,
              score: prev.score + (target.type === 'coin' ? 50 : 10),
              kicks: prev.kicks + (target.type === 'coin' ? 25 : 5)
            }));
          }
          target.hitByThor = false;
        }

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

              const newStreak = prev.streak + 1;
              const points = target.type === 'coin' ? 50 : target.type === 'carrot' ? 15 : 10;
              const multiplier = 1 + Math.floor(newStreak / 5) * 0.5;
              const reward = Math.floor(points * multiplier);

              return {
                ...prev,
                score: prev.score + reward,
                kicks: prev.kicks + Math.floor(reward / 2),
                streak: newStreak,
                level: Math.min(10, Math.floor((prev.score + reward) / 800) + 1)
              };
            });
          }
        }

        if (target.y > 650 && !target.sliced && target.type !== 'bomb' && target.type !== 'thor') {
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
          ctx.globalAlpha = bolt.life / 30;
          
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
        
        const thorY = 100 + Math.sin(gameRef.current.thorTimer * 0.15) * 10;
        ctx.save();
        ctx.translate(400, thorY);
        
        ctx.shadowBlur = 40;
        ctx.shadowColor = '#00BFFF';
        
        ctx.fillStyle = '#4169E1';
        ctx.fillRect(-20, 0, 40, 50);
        
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, -15, 20, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#DC143C';
        ctx.beginPath();
        ctx.moveTo(-20, 10);
        ctx.lineTo(-35, 50);
        ctx.lineTo(-20, 50);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(20, 10);
        ctx.lineTo(35, 50);
        ctx.lineTo(20, 50);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#696969';
        ctx.fillRect(30, 20, 40, 10);
        ctx.fillStyle = '#4169E1';
        ctx.fillRect(65, 12, 20, 26);
        
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ THOR ⚡', 0, -45);
        
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
  }, [gameState.phase, gameState.showShop, gameState.level, gameState.activeBlade, getDifficulty, spawnTarget, createSliceParticles, createSlashEffect, activateThor]);

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

  const startGame = () => {
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
      lastSliceTime: 0
    };
    setGameState(prev => ({
      ...prev,
      score: 0,
      level: 1,
      streak: 0,
      lives: 3,
      gameOver: false,
      phase: 'playing'
    }));
  };

  const resetGame = () => {
    startGame();
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-purple-900 via-indigo-900 to-black overflow-hidden touch-none select-none flex flex-col">
      <div className="flex-shrink-0 bg-black/80 border-b border-purple-500/30 px-4 py-2">
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
                <Zap className="w-4 h-4 text-green-400" />
                <span className="font-bold text-sm sm:text-base">{gameState.score}</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <span className="text-xs sm:text-sm text-gray-400">Lv</span>
                <span className="font-bold text-purple-400">{gameState.level}</span>
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
          
          <div className="flex items-center gap-3">
            {gameState.phase === 'playing' && (
              <button
                onClick={() => setGameState(prev => ({ ...prev, showShop: !prev.showShop }))}
                className="p-2 bg-purple-600/80 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
              </button>
            )}
            <div className="bg-yellow-500/20 px-3 py-1 rounded-lg">
              <span className="text-yellow-400 font-bold text-sm sm:text-base">{gameState.kicks} KICKS</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-2 sm:p-4">
        <div className="relative w-full max-w-4xl" style={{ aspectRatio: '4/3' }}>
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full h-full border-4 border-purple-500/50 rounded-xl shadow-2xl cursor-none touch-none"
            style={{ imageRendering: 'crisp-edges' }}
          />

          {gameState.phase === 'menu' && (
            <div className="absolute inset-0 bg-black/85 flex items-center justify-center rounded-xl">
              <div className="bg-gradient-to-br from-purple-900/95 to-indigo-900/95 p-6 sm:p-8 rounded-2xl border-4 border-yellow-400 text-center max-w-md mx-4">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">🐰 BUNNY BLADE</h1>
                <p className="text-gray-300 mb-4 text-sm sm:text-base">Slice to survive!</p>
                <div className="text-xs sm:text-sm text-gray-400 mb-6 space-y-1">
                  <p>🥕 Carrots = 15pts</p>
                  <p>🍃 Leaves = 10pts</p>
                  <p>🪙 Gold coins = 50pts</p>
                  <p>💣 Don't slice bombs!</p>
                  <p>⚡ Thor's Hammer = Destroy ALL!</p>
                </div>
                <button
                  onClick={startGame}
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-lg sm:text-xl rounded-xl transition-all active:scale-95"
                >
                  START GAME
                </button>
              </div>
            </div>
          )}

          {gameState.showShop && (
            <div className="absolute inset-0 bg-black/85 flex items-center justify-center rounded-xl">
              <div className="bg-gradient-to-br from-purple-800 to-indigo-900 p-4 sm:p-6 rounded-xl max-w-md w-full mx-4 border-4 border-yellow-400">
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

          {gameState.phase === 'ended' && (
            <div className="absolute inset-0 bg-black/85 flex items-center justify-center rounded-xl">
              <div className="bg-gradient-to-br from-red-900/95 to-purple-900/95 p-6 sm:p-8 rounded-xl text-center border-4 border-yellow-400 mx-4">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">💀 Game Over!</h2>
                <p className="text-xl sm:text-2xl text-yellow-300 mb-2">Score: {gameState.score}</p>
                <p className="text-lg text-green-400 mb-6">Earned: {gameState.kicks} KICKS</p>
                <div className="flex gap-3 justify-center flex-wrap">
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
