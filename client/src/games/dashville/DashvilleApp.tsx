import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';

interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  velX: number;
  velY: number;
  onGround: boolean;
  health: number;
  speed: number;
  jumpPower: number;
  carrotPower: number;
  shootTimer: number;
  color: number[];
}

interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Enemy {
  x: number;
  y: number;
  w: number;
  h: number;
  velX: number;
  velY: number;
  health: number;
  dead: boolean;
}

interface Coin {
  x: number;
  y: number;
  w: number;
  h: number;
  bob: number;
  collected: boolean;
}

interface Carrot {
  x: number;
  y: number;
  w: number;
  h: number;
  collected: boolean;
}

interface Bullet {
  x: number;
  y: number;
  w: number;
  h: number;
  velX: number;
  dead: boolean;
}

const SCREEN_WIDTH = 1024;
const SCREEN_HEIGHT = 576;
const TILE_SIZE = 32;

const CHARS = [
  { color: [255, 192, 203], name: 'Pink Runner' },
  { color: [255, 165, 0], name: 'Orange Runner' },
  { color: [128, 0, 128], name: 'Purple Runner' },
  { color: [0, 255, 0], name: 'Green Runner' }
];

export default function DashvilleApp() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'levelComplete' | 'gameOver'>('menu');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [kicks, setKicks] = useState(0);
  const [selectedChar, setSelectedChar] = useState(0);
  const [musicEnabled, setMusicEnabled] = useState(false);
  
  const gameRef = useRef<{
    player: Player | null;
    platforms: Platform[];
    enemies: Enemy[];
    coins: Coin[];
    carrots: Carrot[];
    bullets: Bullet[];
    cameraX: number;
    keys: { [key: string]: boolean };
    touchControls: { left: boolean; right: boolean; jump: boolean; shoot: boolean };
    levelCompleteTimer: number;
  }>({
    player: null,
    platforms: [],
    enemies: [],
    coins: [],
    carrots: [],
    bullets: [],
    cameraX: 0,
    keys: {},
    touchControls: { left: false, right: false, jump: false, shoot: false },
    levelCompleteTimer: 0
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('/sounds/arcade-theme.wav');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.15;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (musicEnabled) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
      setMusicEnabled(!musicEnabled);
    }
  };

  const createPlayer = useCallback((charIndex: number) => {
    return {
      x: 100,
      y: SCREEN_HEIGHT - 100,
      w: 32,
      h: 48,
      velX: 0,
      velY: 0,
      onGround: false,
      health: 3,
      speed: 5,
      jumpPower: -12,
      carrotPower: 0,
      shootTimer: 0,
      color: CHARS[charIndex].color
    };
  }, []);

  const resetLevel = useCallback((lvl: number) => {
    const game = gameRef.current;
    game.platforms = [];
    game.enemies = [];
    game.coins = [];
    game.carrots = [];
    game.bullets = [];
    game.cameraX = 0;
    game.levelCompleteTimer = 0;

    for (let x = 0; x < SCREEN_WIDTH * 3; x += TILE_SIZE) {
      game.platforms.push({ x, y: SCREEN_HEIGHT - TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE });
    }

    const numPlats = 5 + lvl * 2;
    for (let i = 0; i < numPlats; i++) {
      const x = SCREEN_WIDTH + Math.random() * (SCREEN_WIDTH * 2);
      const y = SCREEN_HEIGHT / 2 + Math.random() * (SCREEN_HEIGHT / 2 - TILE_SIZE * 2);
      game.platforms.push({ x, y, w: TILE_SIZE * 3, h: TILE_SIZE });
    }

    const numEnemies = 3 + lvl * 3;
    for (let i = 0; i < numEnemies; i++) {
      game.enemies.push({
        x: SCREEN_WIDTH + Math.random() * (SCREEN_WIDTH * 2),
        y: SCREEN_HEIGHT - TILE_SIZE * 2,
        w: 24,
        h: 24,
        velX: (Math.random() > 0.5 ? 2 : -2) * (1 + lvl * 0.5),
        velY: 0,
        health: 1 + lvl / 2,
        dead: false
      });
    }

    const numCoins = 10 + lvl * 5;
    for (let i = 0; i < numCoins; i++) {
      game.coins.push({
        x: SCREEN_WIDTH + Math.random() * (SCREEN_WIDTH * 2),
        y: 100 + Math.random() * (SCREEN_HEIGHT - 150),
        w: 16,
        h: 16,
        bob: Math.random() * Math.PI * 2,
        collected: false
      });
    }

    const numCarrots = 3 + lvl;
    for (let i = 0; i < numCarrots; i++) {
      game.carrots.push({
        x: SCREEN_WIDTH + Math.random() * (SCREEN_WIDTH * 2),
        y: 100 + Math.random() * (SCREEN_HEIGHT - 150),
        w: 12,
        h: 20,
        collected: false
      });
    }

    if (game.player) {
      game.player.carrotPower = 0;
      game.player.health = 3;
      game.player.x = 100;
      game.player.y = SCREEN_HEIGHT - 100;
    }
  }, []);

  const startGame = useCallback(() => {
    gameRef.current.player = createPlayer(selectedChar);
    resetLevel(1);
    setLevel(1);
    setScore(0);
    setKicks(0);
    setGameState('playing');
  }, [selectedChar, createPlayer, resetLevel]);

  const collide = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const game = gameRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      game.keys[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      game.keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const gameLoop = () => {
      if (!game.player) return;

      const { keys, touchControls } = game;
      if (keys['KeyA'] || keys['ArrowLeft'] || touchControls.left) {
        game.player.velX = -game.player.speed;
      } else if (keys['KeyD'] || keys['ArrowRight'] || touchControls.right) {
        game.player.velX = game.player.speed;
      } else {
        game.player.velX *= 0.8;
      }

      if ((keys['KeyW'] || keys['ArrowUp'] || keys['Space'] || touchControls.jump) && game.player.onGround) {
        game.player.velY = game.player.jumpPower;
        game.player.onGround = false;
      }

      if ((keys['Enter'] || touchControls.shoot) && game.player.shootTimer <= 0 && game.player.carrotPower > 0) {
        game.bullets.push({
          x: game.player.x + game.player.w / 2,
          y: game.player.y + game.player.h / 2,
          w: 8,
          h: 4,
          velX: 10,
          dead: false
        });
        game.player.carrotPower--;
        game.player.shootTimer = 15;
      }

      game.player.velY += 0.5;
      if (game.player.velY > 10) game.player.velY = 10;

      game.player.x += game.player.velX;
      for (const p of game.platforms) {
        if (collide(game.player, p)) {
          if (game.player.velX > 0) game.player.x = p.x - game.player.w;
          else if (game.player.velX < 0) game.player.x = p.x + p.w;
          game.player.velX = 0;
        }
      }

      game.player.y += game.player.velY;
      game.player.onGround = false;
      for (const p of game.platforms) {
        if (collide(game.player, p)) {
          if (game.player.velY > 0) {
            game.player.y = p.y - game.player.h;
            game.player.onGround = true;
            game.player.velY = 0;
          } else {
            game.player.y = p.y + p.h;
            game.player.velY = 0;
          }
        }
      }

      for (const e of game.enemies) {
        if (!e.dead && collide(game.player, e)) {
          game.player.health--;
          e.dead = true;
        }
      }

      for (const c of game.coins) {
        if (!c.collected && collide(game.player, c)) {
          setScore(s => s + 1);
          setKicks(k => k + 50);
          c.collected = true;
        }
      }

      for (const ca of game.carrots) {
        if (!ca.collected && collide(game.player, ca)) {
          game.player.carrotPower++;
          ca.collected = true;
        }
      }

      if (game.player.shootTimer > 0) game.player.shootTimer--;

      game.cameraX = game.player.x + game.player.w / 2 - SCREEN_WIDTH / 2;
      game.cameraX = Math.max(0, Math.min(game.cameraX, SCREEN_WIDTH * 2));

      for (const b of game.bullets) {
        b.x += b.velX;
        if (b.x > SCREEN_WIDTH * 3 || b.x < 0) {
          b.dead = true;
          continue;
        }
        for (const e of game.enemies) {
          if (!e.dead && collide(b, e)) {
            e.dead = true;
            b.dead = true;
            setScore(s => s + 10);
          }
        }
      }

      for (const e of game.enemies) {
        if (e.dead) continue;
        e.velY += 0.5;
        e.x += e.velX;
        for (const p of game.platforms) {
          if (collide(e, p)) e.velX *= -1;
        }
        e.y += e.velY;
        for (const p of game.platforms) {
          if (collide(e, p)) {
            e.y = p.y - e.h;
            e.velY = 0;
          }
        }
      }

      for (const c of game.coins) {
        c.bob += 0.1;
        c.y += Math.sin(c.bob) * 0.5;
      }

      game.bullets = game.bullets.filter(b => !b.dead);
      game.enemies = game.enemies.filter(e => !e.dead);
      game.coins = game.coins.filter(c => !c.collected);
      game.carrots = game.carrots.filter(c => !c.collected);

      if (game.coins.length === 0 && game.enemies.length === 0) {
        setKicks(k => k + level * 100);
        setGameState('levelComplete');
        return;
      }

      if (game.player.health <= 0) {
        setGameState('gameOver');
        return;
      }

      ctx.fillStyle = '#6496FF';
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

      ctx.save();
      ctx.translate(-game.cameraX, 0);

      ctx.fillStyle = '#808080';
      for (const p of game.platforms) {
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }

      ctx.fillStyle = '#FFFF00';
      for (const c of game.coins) {
        if (!c.collected) {
          ctx.beginPath();
          ctx.arc(c.x + 8, c.y + 8, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const ca of game.carrots) {
        if (!ca.collected) {
          ctx.fillStyle = '#FFA500';
          ctx.fillRect(ca.x, ca.y, ca.w, ca.h);
          ctx.fillStyle = '#00FF00';
          ctx.fillRect(ca.x + 4, ca.y, 4, 4);
        }
      }

      ctx.fillStyle = '#FF0000';
      for (const e of game.enemies) {
        if (!e.dead) {
          ctx.beginPath();
          ctx.arc(e.x + 12, e.y + 12, 12, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.fillStyle = '#FFFF00';
      for (const b of game.bullets) {
        if (!b.dead) {
          ctx.fillRect(b.x, b.y, b.w, b.h);
        }
      }

      const p = game.player;
      ctx.fillStyle = `rgb(${p.color[0]}, ${p.color[1]}, ${p.color[2]})`;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeRect(p.x, p.y, p.w, p.h);

      ctx.restore();

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, level]);

  const nextLevel = useCallback(() => {
    const newLevel = level + 1;
    if (newLevel > 5) {
      setGameState('gameOver');
      return;
    }
    setLevel(newLevel);
    resetLevel(newLevel);
    setGameState('playing');
  }, [level, resetLevel]);

  const restartGame = useCallback(() => {
    gameRef.current.player = createPlayer(selectedChar);
    resetLevel(1);
    setLevel(1);
    setScore(0);
    setKicks(0);
    setGameState('playing');
  }, [selectedChar, createPlayer, resetLevel]);

  const handleTouchStart = (control: 'left' | 'right' | 'jump' | 'shoot') => {
    gameRef.current.touchControls[control] = true;
  };

  const handleTouchEnd = (control: 'left' | 'right' | 'jump' | 'shoot') => {
    gameRef.current.touchControls[control] = false;
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center p-4">
      <div className="fixed top-4 left-4 z-50 flex gap-2">
        <button
          onClick={() => setLocation('/')}
          className="p-3 bg-[#1a1a1a] border-[3px] border-black hover:bg-[#2a2a2a] transition-colors"
          style={{ boxShadow: '4px 4px 0px black' }}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={toggleMusic}
          className="p-3 bg-[#1a1a1a] border-[3px] border-black hover:bg-[#2a2a2a] transition-colors"
          style={{ boxShadow: '4px 4px 0px black' }}
        >
          {musicEnabled ? <Volume2 className="w-5 h-5 text-[#39FF14]" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
        </button>
      </div>

      {gameState === 'menu' && (
        <div className="text-center">
          <h1 className="text-5xl font-black text-[#FFFF00] mb-2 uppercase tracking-wider" style={{ textShadow: '4px 4px 0px #000' }}>
            DASHVILLE
          </h1>
          <p className="text-xl text-white mb-8">Retro Run 'n Gun Adventure</p>
          
          <div className="mb-6">
            <p className="text-gray-400 mb-4">Choose Your Character:</p>
            <div className="flex gap-4 justify-center">
              {CHARS.map((char, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedChar(i)}
                  className={`w-16 h-16 border-[3px] border-black transition-all ${selectedChar === i ? 'scale-110' : ''}`}
                  style={{
                    backgroundColor: `rgb(${char.color[0]}, ${char.color[1]}, ${char.color[2]})`,
                    boxShadow: selectedChar === i ? '0 0 20px rgba(255,255,0,0.5), 4px 4px 0px black' : '4px 4px 0px black'
                  }}
                />
              ))}
            </div>
            <p className="text-white mt-2">{CHARS[selectedChar].name}</p>
          </div>

          <button
            onClick={startGame}
            className="px-8 py-4 bg-[#FF6600] text-black font-black text-xl uppercase border-[4px] border-black hover:bg-[#FF8800] transition-colors"
            style={{ boxShadow: '6px 6px 0px black' }}
          >
            START GAME
          </button>

          <div className="mt-6 text-gray-500 text-sm">
            <p>PC: A/D Move, W/Space Jump, Enter Shoot</p>
            <p>Mobile: Use touch buttons</p>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="relative">
          <div className="absolute top-2 left-2 z-10 bg-black/70 p-3 border-2 border-white text-white font-mono text-sm">
            <div>Level: {level}</div>
            <div>Health: {'❤️'.repeat(gameRef.current.player?.health || 0)}</div>
            <div>Score: {score}</div>
            <div>$KICKS: {kicks}</div>
            <div>Carrots: {gameRef.current.player?.carrotPower || 0} 🥕</div>
          </div>
          
          <canvas
            ref={canvasRef}
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT}
            className="border-4 border-white max-w-full"
            style={{ imageRendering: 'pixelated' }}
          />

          <div className="md:hidden fixed bottom-4 left-0 right-0 flex justify-between px-4">
            <div className="flex gap-2">
              <button
                onTouchStart={() => handleTouchStart('left')}
                onTouchEnd={() => handleTouchEnd('left')}
                onMouseDown={() => handleTouchStart('left')}
                onMouseUp={() => handleTouchEnd('left')}
                className="w-16 h-16 bg-gray-800 border-2 border-white text-white text-2xl font-bold active:bg-gray-600"
              >
                ←
              </button>
              <button
                onTouchStart={() => handleTouchStart('right')}
                onTouchEnd={() => handleTouchEnd('right')}
                onMouseDown={() => handleTouchStart('right')}
                onMouseUp={() => handleTouchEnd('right')}
                className="w-16 h-16 bg-gray-800 border-2 border-white text-white text-2xl font-bold active:bg-gray-600"
              >
                →
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onTouchStart={() => handleTouchStart('shoot')}
                onTouchEnd={() => handleTouchEnd('shoot')}
                onMouseDown={() => handleTouchStart('shoot')}
                onMouseUp={() => handleTouchEnd('shoot')}
                className="w-16 h-16 bg-orange-600 border-2 border-white text-white text-xs font-bold active:bg-orange-500"
              >
                SHOOT
              </button>
              <button
                onTouchStart={() => handleTouchStart('jump')}
                onTouchEnd={() => handleTouchEnd('jump')}
                onMouseDown={() => handleTouchStart('jump')}
                onMouseUp={() => handleTouchEnd('jump')}
                className="w-16 h-16 bg-green-600 border-2 border-white text-white text-xs font-bold active:bg-green-500"
              >
                JUMP
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === 'levelComplete' && (
        <div className="text-center bg-[#00FF00] p-8 border-4 border-black" style={{ boxShadow: '8px 8px 0px black' }}>
          <h2 className="text-4xl font-black text-black mb-4">LEVEL COMPLETE!</h2>
          <p className="text-2xl text-black mb-6">Bonus: {level * 100} $KICKS</p>
          <button
            onClick={nextLevel}
            className="px-8 py-4 bg-black text-white font-black text-xl uppercase border-4 border-white hover:bg-gray-800 transition-colors"
          >
            {level >= 5 ? 'FINISH GAME' : 'NEXT LEVEL'}
          </button>
        </div>
      )}

      {gameState === 'gameOver' && (
        <div className="text-center bg-[#FF0000] p-8 border-4 border-black" style={{ boxShadow: '8px 8px 0px black' }}>
          <h2 className="text-4xl font-black text-white mb-4">
            {level > 5 ? 'YOU WIN!' : 'GAME OVER'}
          </h2>
          <p className="text-2xl text-white mb-2">Final Score: {score}</p>
          <p className="text-2xl text-yellow-300 mb-6">$KICKS Earned: {kicks}</p>
          <button
            onClick={restartGame}
            className="px-8 py-4 bg-black text-white font-black text-xl uppercase border-4 border-white hover:bg-gray-800 transition-colors"
          >
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
