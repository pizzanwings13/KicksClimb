import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sword, ShoppingCart, TrendingUp, Zap, X, ArrowLeft, Volume2, VolumeX } from 'lucide-react';
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
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
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
  Wooden: { radius: 30, color: '#8B4513', cost: 0, name: 'Wooden Blade' },
  Steel: { radius: 45, color: '#C0C0C0', cost: 2500, name: 'Steel Blade' },
  Plasma: { radius: 65, color: '#00FFFF', cost: 5000, name: 'Plasma Blade' }
};

const POWERUPS = {
  thor: { color: '#4169E1', cost: 0, name: "Thor's Hammer", spawnChance: 0.015 }
};

export function BunnyBladeApp() {
  const { isConnected, walletAddress, kicksBalance } = useWallet();
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [muted, setMuted] = useState(false);
  const [displayKicks, setDisplayKicks] = useState(0);
  
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
    trail: [] as { x: number; y: number }[],
    spawnTimer: 0,
    mouseDown: false,
    mousePos: { x: 0, y: 0 },
    lightningBolts: [] as LightningBolt[],
    thorActive: false,
    thorTimer: 0
  });

  const createParticles = useCallback((x: number, y: number, color: string) => {
    for (let i = 0; i < 8; i++) {
      gameRef.current.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 30,
        color
      });
    }
  }, []);

  const generateLightningSegments = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const segments: { x: number; y: number }[] = [];
    const numSegments = 8;
    const dx = (x2 - x1) / numSegments;
    const dy = (y2 - y1) / numSegments;

    segments.push({ x: x1, y: y1 });

    for (let i = 1; i < numSegments; i++) {
      segments.push({
        x: x1 + dx * i + (Math.random() - 0.5) * 30,
        y: y1 + dy * i + (Math.random() - 0.5) * 30
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
          startY: 50,
          endX: target.x,
          endY: target.y,
          life: 20,
          segments: generateLightningSegments(400, 50, target.x, target.y)
        });
        target.hitByThor = true;
      }
    });
  }, [generateLightningSegments]);

  const getDifficulty = useCallback((level: number) => {
    const speedMult = 1 + (level * 0.15);
    const spawnRate = Math.max(20, 70 - (level * 5));
    return { speedMult, spawnRate };
  }, []);

  const spawnTarget = useCallback((level: number) => {
    const types = ['carrot', 'leaf'];
    if (level >= 3) types.push('coin');
    if (level >= 5) types.push('bomb');

    if (Math.random() < POWERUPS.thor.spawnChance) {
      const { speedMult } = getDifficulty(level);
      gameRef.current.targets.push({
        type: 'thor',
        x: Math.random() * 600 + 100,
        y: 600,
        vx: (Math.random() - 0.5) * 2,
        vy: -(Math.random() * 4 + 10) * speedMult,
        color: POWERUPS.thor.color,
        sliced: false,
        rotation: 0,
        rotSpeed: 0.3
      });
      return;
    }

    const type = types[Math.floor(Math.random() * types.length)];
    const { speedMult } = getDifficulty(level);

    const colors: Record<string, string> = {
      carrot: '#FF8C00',
      leaf: '#228B22',
      coin: '#FFD700',
      bomb: '#FF0000'
    };

    gameRef.current.targets.push({
      type,
      x: Math.random() * 600 + 100,
      y: 600,
      vx: (Math.random() - 0.5) * 3,
      vy: -(Math.random() * 5 + 12) * speedMult,
      color: colors[type],
      sliced: false,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 0.2
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
    };

    const handleMouseUp = () => {
      gameRef.current.mouseDown = false;
      gameRef.current.trail = [];
      setGameState(prev => ({ ...prev, streak: 0 }));
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      gameRef.current.mousePos = {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      gameRef.current.mouseDown = true;
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
      setGameState(prev => ({ ...prev, streak: 0 }));
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      gameRef.current.mousePos = {
        x: (touch.clientX - rect.left) * (canvas.width / rect.width),
        y: (touch.clientY - rect.top) * (canvas.height / rect.height)
      };
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    const gameLoop = () => {
      if (gameState.phase !== 'playing' || gameState.showShop) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, 800, 600);
        animationId = requestAnimationFrame(gameLoop);
        return;
      }

      ctx.fillStyle = '#1a1a2e';
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
        p.vy += 0.3;
        p.life--;
        
        if (p.life > 0) {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life / 30;
          ctx.fillRect(p.x, p.y, 4, 4);
          ctx.globalAlpha = 1;
          return true;
        }
        return false;
      });

      gameRef.current.targets.forEach((target, idx) => {
        target.x += target.vx;
        target.y += target.vy;
        target.vy += 0.5;
        target.rotation += target.rotSpeed;

        if (target.hitByThor) {
          createParticles(target.x, target.y, target.color);
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
            ctx.fillStyle = '#4169E1';
            ctx.fillRect(-10, -25, 20, 30);
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(-5, 5, 10, 20);
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00BFFF';
            ctx.strokeStyle = '#00BFFF';
            ctx.lineWidth = 2;
            ctx.strokeRect(-10, -25, 20, 30);
            ctx.shadowBlur = 0;
          } else if (target.type === 'bomb') {
            ctx.fillStyle = target.color;
            ctx.fillRect(-15, -15, 30, 30);
            ctx.fillStyle = '#000';
            ctx.fillRect(-5, -20, 3, 10);
          } else if (target.type === 'coin') {
            ctx.fillStyle = target.color;
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 3;
            ctx.stroke();
          } else {
            ctx.fillStyle = target.color;
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        if (gameRef.current.mouseDown && !target.sliced) {
          const dx = gameRef.current.mousePos.x - target.x;
          const dy = gameRef.current.mousePos.y - target.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const bladeRadius = BLADES[gameState.activeBlade].radius;

          if (dist < bladeRadius + 20) {
            target.sliced = true;
            createParticles(target.x, target.y, target.color);

            if (target.type === 'thor') {
              activateThor();
              return;
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
              const points = target.type === 'coin' ? 50 : 10;
              const multiplier = 1 + Math.floor(newStreak / 5);
              const reward = points * multiplier;

              return {
                ...prev,
                score: prev.score + reward,
                kicks: prev.kicks + Math.floor(reward / 2),
                streak: newStreak,
                level: Math.min(10, Math.floor((prev.score + reward) / 1000) + 1)
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

      gameRef.current.targets = gameRef.current.targets.filter(t => t.y < 700);

      gameRef.current.lightningBolts = gameRef.current.lightningBolts.filter(bolt => {
        bolt.life--;
        
        if (bolt.life > 0) {
          ctx.strokeStyle = '#00BFFF';
          ctx.lineWidth = 3;
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#00BFFF';
          ctx.globalAlpha = bolt.life / 20;
          
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
        
        ctx.fillStyle = `rgba(135, 206, 250, ${0.2 * (gameRef.current.thorTimer / 180)})`;
        ctx.fillRect(0, 0, 800, 600);
        
        const thorY = 50 + Math.sin(gameRef.current.thorTimer * 0.1) * 5;
        ctx.save();
        ctx.translate(400, thorY);
        
        ctx.fillStyle = '#4169E1';
        ctx.fillRect(-15, 0, 30, 40);
        
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, -10, 15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#DC143C';
        ctx.fillRect(-25, 5, 10, 35);
        ctx.fillRect(15, 5, 10, 35);
        
        ctx.fillStyle = '#696969';
        ctx.fillRect(25, 15, 30, 8);
        ctx.fillStyle = '#4169E1';
        ctx.fillRect(50, 10, 15, 18);
        
        ctx.restore();
        
        if (gameRef.current.thorTimer <= 0) {
          gameRef.current.thorActive = false;
        }
      }

      if (gameRef.current.mouseDown) {
        gameRef.current.trail.push({ ...gameRef.current.mousePos });
        if (gameRef.current.trail.length > 15) gameRef.current.trail.shift();
      }

      if (gameRef.current.trail.length > 1) {
        const blade = BLADES[gameState.activeBlade];
        ctx.strokeStyle = blade.color;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 15;
        ctx.shadowColor = blade.color;
        ctx.beginPath();
        ctx.moveTo(gameRef.current.trail[0].x, gameRef.current.trail[0].y);
        gameRef.current.trail.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
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
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, [gameState.phase, gameState.showShop, gameState.level, gameState.activeBlade, getDifficulty, spawnTarget, createParticles, activateThor]);

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
      spawnTimer: 0,
      mouseDown: false,
      mousePos: { x: 0, y: 0 },
      lightningBolts: [],
      thorActive: false,
      thorTimer: 0
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
    gameRef.current = {
      targets: [],
      particles: [],
      trail: [],
      spawnTimer: 0,
      mouseDown: false,
      mousePos: { x: 0, y: 0 },
      lightningBolts: [],
      thorActive: false,
      thorTimer: 0
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

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 overflow-hidden touch-none select-none">
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
        <button
          onClick={() => setLocation('/')}
          className="p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          onClick={() => setMuted(!muted)}
          className="p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg transition-colors"
        >
          {muted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>
      </div>

      <div className="absolute top-4 right-4 z-50 bg-black/60 px-4 py-2 rounded-lg">
        <span className="text-yellow-400 font-bold">{displayKicks.toLocaleString()} KICKS</span>
      </div>

      <div className="flex items-center justify-center w-full h-full p-4">
        <div className="relative w-full max-w-4xl aspect-[4/3]">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full h-full border-4 border-yellow-400 rounded-lg shadow-2xl cursor-none touch-none"
            style={{ imageRendering: 'crisp-edges' }}
          />

          {gameState.phase === 'playing' && (
            <>
              <div className="absolute top-4 left-4 bg-black bg-opacity-60 p-3 rounded-lg text-white space-y-1">
                <div className="flex items-center gap-2">
                  <TrendingUp size={20} className="text-green-400" />
                  <span className="font-bold">Score: {gameState.score}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap size={20} className="text-yellow-400" />
                  <span>Level: {gameState.level}</span>
                </div>
                <div className="text-yellow-300">❤️ Lives: {gameState.lives}</div>
                <div className="text-orange-400">🔥 Streak: {gameState.streak}x</div>
              </div>

              <div className="absolute top-4 right-4 bg-black bg-opacity-60 p-3 rounded-lg text-white space-y-1">
                <div className="flex items-center gap-2 text-yellow-400 font-bold">
                  <span>$KICKS: {gameState.kicks}</span>
                </div>
                <div style={{ color: BLADES[gameState.activeBlade].color }}>
                  <Sword size={20} className="inline mr-2" />
                  {gameState.activeBlade}
                </div>
                <button
                  onClick={() => setGameState(prev => ({ ...prev, showShop: !prev.showShop }))}
                  className="mt-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded flex items-center gap-2"
                >
                  <ShoppingCart size={16} /> Shop
                </button>
              </div>
            </>
          )}

          {gameState.phase === 'menu' && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
              <div className="bg-gradient-to-br from-purple-800/90 to-indigo-900/90 p-8 rounded-2xl border-4 border-yellow-400 text-center max-w-md">
                <h1 className="text-4xl font-bold text-white mb-2">🐰 BUNNY BLADE</h1>
                <p className="text-gray-300 mb-4">Slice vegetables, collect coins, avoid bombs!</p>
                <div className="text-sm text-gray-400 mb-6">
                  <p>🥕 Slice veggies = 10pts</p>
                  <p>🪙 Gold coins = 50pts</p>
                  <p>💣 Avoid bombs!</p>
                  <p>⚡ Thor's Hammer destroys all!</p>
                </div>
                <button
                  onClick={startGame}
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-xl rounded-xl transition-all"
                >
                  START GAME
                </button>
              </div>
            </div>
          )}

          {gameState.showShop && (
            <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center rounded-lg">
              <div className="bg-gradient-to-br from-purple-800 to-indigo-900 p-6 rounded-lg max-w-md w-full border-4 border-yellow-400">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-white">Blade Shop</h2>
                  <button
                    onClick={() => setGameState(prev => ({ ...prev, showShop: false }))}
                    className="text-white hover:text-red-400"
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="text-yellow-300 mb-4">Your $KICKS: {gameState.kicks}</div>
                {Object.entries(BLADES).map(([name, blade]) => (
                  <div
                    key={name}
                    className="bg-black bg-opacity-40 p-4 rounded mb-3 flex justify-between items-center"
                  >
                    <div>
                      <h3 className="font-bold" style={{ color: blade.color }}>
                        {blade.name}
                      </h3>
                      <p className="text-sm text-gray-300">Range: {blade.radius}px</p>
                    </div>
                    {gameState.unlockedBlades.includes(name) ? (
                      <button
                        onClick={() => setGameState(prev => ({ ...prev, activeBlade: name, showShop: false }))}
                        className={`px-4 py-2 rounded text-white ${
                          gameState.activeBlade === name
                            ? 'bg-green-600'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {gameState.activeBlade === name ? 'Equipped' : 'Equip'}
                      </button>
                    ) : (
                      <button
                        onClick={() => buyBlade(name)}
                        disabled={gameState.kicks < blade.cost}
                        className={`px-4 py-2 rounded text-white ${
                          gameState.kicks >= blade.cost
                            ? 'bg-yellow-600 hover:bg-yellow-700'
                            : 'bg-gray-600 cursor-not-allowed'
                        }`}
                      >
                        {blade.cost} $KICKS
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {gameState.phase === 'ended' && (
            <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center rounded-lg">
              <div className="bg-gradient-to-br from-red-900 to-purple-900 p-8 rounded-lg text-center border-4 border-yellow-400">
                <h2 className="text-4xl font-bold text-white mb-4">Game Over!</h2>
                <p className="text-2xl text-yellow-300 mb-2">Final Score: {gameState.score}</p>
                <p className="text-xl text-green-400 mb-6">Earned $KICKS: {gameState.kicks}</p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={resetGame}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={() => setLocation('/')}
                    className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-bold text-lg"
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
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-center bg-black/50 px-4 py-2 rounded-lg max-w-2xl">
          <p className="text-sm">Swipe to slice! Build streaks for multipliers!</p>
        </div>
      )}
    </div>
  );
}

export default BunnyBladeApp;
