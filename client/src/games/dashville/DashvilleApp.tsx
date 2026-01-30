import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { useWallet } from '@/lib/stores/useWallet';

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
  jumpCount: number;
  charIndex: number;
  weapon: 'normal' | 'heavy' | 'shotgun';
  weaponAmmo: number;
  invincible: number;
  animFrame: number;
  facingRight: boolean;
  crouching: boolean;
}

const LEVEL_THEMES = [
  { name: 'Night City', skyColor: '#0a0a2e', groundColor: '#1a1a3e', accent: '#ff00ff' },
  { name: 'Jungle', skyColor: '#1a3a1a', groundColor: '#2d5a2d', accent: '#39FF14' },
  { name: 'Desert', skyColor: '#ff9966', groundColor: '#c19a6b', accent: '#ffcc00' },
  { name: 'Arctic', skyColor: '#87ceeb', groundColor: '#e0f0ff', accent: '#00bfff' },
  { name: 'Volcano', skyColor: '#330000', groundColor: '#660000', accent: '#ff4400' },
];

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
  type: 'ground' | 'flying' | 'tank' | 'shooter';
  shootTimer?: number;
}

interface Boss {
  x: number;
  y: number;
  w: number;
  h: number;
  health: number;
  maxHealth: number;
  phase: number;
  attackTimer: number;
  dead: boolean;
  velX: number;
  velY: number;
}

interface BackgroundElement {
  x: number;
  y: number;
  type: 'cloud' | 'building' | 'tree' | 'star' | 'mountain';
  layer: number;
  scale: number;
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
  velY?: number;
  dead: boolean;
  type: 'normal' | 'heavy' | 'shotgun';
}

interface Spring {
  x: number;
  y: number;
  w: number;
  h: number;
  power: number;
  compressed: number;
}

interface WeaponPickup {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'heavy' | 'shotgun';
  collected: boolean;
}

interface DroppedCoin {
  x: number;
  y: number;
  velX: number;
  velY: number;
  timer: number;
}

const SCREEN_WIDTH = 1024;
const SCREEN_HEIGHT = 576;
const TILE_SIZE = 32;
const LEVEL_LENGTH = SCREEN_WIDTH * 8;

const CHARS = [
  { image: '/textures/char-dashkid-1.png', name: 'DashKid #1', color: [200, 120, 80] },
  { image: '/textures/char-dashkid-2.png', name: 'DashKid #2', color: [128, 64, 96] },
  { image: '/textures/char-rabbit-1.png', name: 'Rabbit #1', color: [230, 200, 170] },
  { image: '/textures/char-rabbit-2.png', name: 'Rabbit #2', color: [180, 80, 80] }
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
  const [runId, setRunId] = useState<number | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null);
  const [levelKicks, setLevelKicks] = useState(0);
  const kicksRef = useRef(0);
  
  useEffect(() => {
    kicksRef.current = kicks;
  }, [kicks]);
  
  const { walletAddress: connectedWalletAddress } = useWallet();
  
  const getWalletAddress = () => {
    return connectedWalletAddress || localStorage.getItem('walletAddress') || '';
  };
  
  const gameRef = useRef<{
    player: Player | null;
    platforms: Platform[];
    enemies: Enemy[];
    coins: Coin[];
    carrots: Carrot[];
    bullets: Bullet[];
    springs: Spring[];
    weaponPickups: WeaponPickup[];
    droppedCoins: DroppedCoin[];
    boss: Boss | null;
    backgroundElements: BackgroundElement[];
    enemyBullets: Bullet[];
    cameraX: number;
    keys: { [key: string]: boolean };
    keysJustPressed: { [key: string]: boolean };
    touchControls: { left: boolean; right: boolean; jump: boolean; shoot: boolean; down: boolean };
    levelCompleteTimer: number;
    charImages: HTMLImageElement[];
    screenShake: number;
    weaponAnnouncement: string;
    announcementTimer: number;
    bossWarning: boolean;
    gameTime: number;
  }>({
    player: null,
    platforms: [],
    enemies: [],
    coins: [],
    carrots: [],
    bullets: [],
    springs: [],
    weaponPickups: [],
    droppedCoins: [],
    boss: null,
    backgroundElements: [],
    enemyBullets: [],
    cameraX: 0,
    keys: {},
    keysJustPressed: {},
    touchControls: { left: false, right: false, jump: false, shoot: false, down: false },
    levelCompleteTimer: 0,
    charImages: [],
    screenShake: 0,
    weaponAnnouncement: '',
    announcementTimer: 0,
    bossWarning: false,
    gameTime: 0
  });

  useEffect(() => {
    const images: HTMLImageElement[] = [];
    CHARS.forEach((char, i) => {
      const img = new Image();
      img.src = char.image;
      images[i] = img;
    });
    gameRef.current.charImages = images;
  }, []);

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
      w: 40,
      h: 60,
      velX: 0,
      velY: 0,
      onGround: false,
      health: 3,
      speed: 6,
      jumpPower: -13,
      carrotPower: 0,
      shootTimer: 0,
      color: CHARS[charIndex].color,
      jumpCount: 0,
      charIndex: charIndex,
      weapon: 'normal' as const,
      weaponAmmo: 0,
      invincible: 0,
      animFrame: 0,
      facingRight: true,
      crouching: false
    };
  }, []);

  const resetLevel = useCallback((lvl: number) => {
    const game = gameRef.current;
    game.platforms = [];
    game.enemies = [];
    game.coins = [];
    game.carrots = [];
    game.bullets = [];
    game.springs = [];
    game.weaponPickups = [];
    game.droppedCoins = [];
    game.boss = null;
    game.backgroundElements = [];
    game.enemyBullets = [];
    game.cameraX = 0;
    game.levelCompleteTimer = 0;
    game.screenShake = 0;
    game.weaponAnnouncement = '';
    game.announcementTimer = 0;
    game.bossWarning = false;
    game.gameTime = 0;

    const levelLength = LEVEL_LENGTH + lvl * SCREEN_WIDTH;

    for (let x = 0; x < levelLength + SCREEN_WIDTH; x += TILE_SIZE) {
      game.platforms.push({ x, y: SCREEN_HEIGHT - TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE });
    }

    const numPlats = 15 + lvl * 5;
    for (let i = 0; i < numPlats; i++) {
      const x = 200 + (i / numPlats) * (levelLength - 400);
      const y = SCREEN_HEIGHT / 2 + Math.random() * (SCREEN_HEIGHT / 2 - TILE_SIZE * 2);
      game.platforms.push({ x, y, w: TILE_SIZE * (2 + Math.floor(Math.random() * 3)), h: TILE_SIZE });
    }

    const bossZoneStart = levelLength - SCREEN_WIDTH * 1.5;
    for (let i = 0; i < 3; i++) {
      const gapX = SCREEN_WIDTH * 2 + i * SCREEN_WIDTH * 1.5 + Math.random() * SCREEN_WIDTH;
      if (gapX >= bossZoneStart - TILE_SIZE * 5) continue;
      const gapWidth = TILE_SIZE * (3 + Math.floor(Math.random() * 2));
      game.platforms = game.platforms.filter(p => !(p.y === SCREEN_HEIGHT - TILE_SIZE && p.x >= gapX && p.x < gapX + gapWidth));
    }

    const theme = LEVEL_THEMES[(lvl - 1) % LEVEL_THEMES.length];
    for (let i = 0; i < 30; i++) {
      game.backgroundElements.push({
        x: Math.random() * levelLength,
        y: 20 + Math.random() * 100,
        type: 'cloud',
        layer: 0.2 + Math.random() * 0.3,
        scale: 0.5 + Math.random() * 1
      });
    }
    for (let i = 0; i < 50; i++) {
      game.backgroundElements.push({
        x: Math.random() * levelLength,
        y: 10 + Math.random() * 80,
        type: 'star',
        layer: 0.1,
        scale: 0.5 + Math.random() * 0.5
      });
    }
    for (let i = 0; i < 20; i++) {
      game.backgroundElements.push({
        x: i * 400 + Math.random() * 200,
        y: SCREEN_HEIGHT - TILE_SIZE - 80 - Math.random() * 100,
        type: lvl <= 2 ? 'building' : (lvl <= 4 ? 'tree' : 'mountain'),
        layer: 0.5 + Math.random() * 0.3,
        scale: 0.8 + Math.random() * 0.5
      });
    }

    const numEnemies = 10 + lvl * 5;
    for (let i = 0; i < numEnemies; i++) {
      const roll = Math.random();
      let type: 'ground' | 'flying' | 'tank' | 'shooter' = 'ground';
      if (roll > 0.85) type = 'shooter';
      else if (roll > 0.7) type = 'tank';
      else if (roll > 0.5) type = 'flying';

      const enemyX = SCREEN_WIDTH + (i / numEnemies) * (levelLength - SCREEN_WIDTH * 2);
      game.enemies.push({
        x: enemyX,
        y: type === 'flying' ? 100 + Math.random() * 200 : SCREEN_HEIGHT - TILE_SIZE - (type === 'tank' ? 40 : 24),
        w: type === 'tank' ? 48 : (type === 'flying' ? 32 : 24),
        h: type === 'tank' ? 40 : (type === 'flying' ? 20 : 24),
        velX: (Math.random() > 0.5 ? 2 : -2) * (1 + lvl * 0.2),
        velY: type === 'flying' ? Math.sin(Math.random() * Math.PI * 2) * 2 : 0,
        health: type === 'tank' ? 3 + lvl : (1 + Math.floor(lvl / 2)),
        dead: false,
        type,
        shootTimer: type === 'shooter' ? Math.random() * 120 : 0
      });
    }

    game.boss = {
      x: levelLength - 200,
      y: SCREEN_HEIGHT - TILE_SIZE - 120,
      w: 100,
      h: 120,
      health: 20 + lvl * 10,
      maxHealth: 20 + lvl * 10,
      phase: 1,
      attackTimer: 0,
      dead: false,
      velX: 0,
      velY: 0
    };

    const numCoins = 30 + lvl * 10;
    for (let i = 0; i < numCoins; i++) {
      game.coins.push({
        x: 200 + (i / numCoins) * (levelLength - 600),
        y: 100 + Math.random() * (SCREEN_HEIGHT - 180),
        w: 16,
        h: 16,
        bob: Math.random() * Math.PI * 2,
        collected: false
      });
    }

    const numCarrots = 5 + lvl * 2;
    for (let i = 0; i < numCarrots; i++) {
      game.carrots.push({
        x: 300 + (i / numCarrots) * (levelLength - 600),
        y: 100 + Math.random() * (SCREEN_HEIGHT - 180),
        w: 12,
        h: 20,
        collected: false
      });
    }

    const numSprings = 5 + lvl;
    for (let i = 0; i < numSprings; i++) {
      game.springs.push({
        x: 400 + (i / numSprings) * (levelLength - 800),
        y: SCREEN_HEIGHT - TILE_SIZE - 20,
        w: 32,
        h: 20,
        power: -18 - lvl,
        compressed: 0
      });
    }

    const numWeapons = 3 + Math.floor(lvl / 2);
    for (let i = 0; i < numWeapons; i++) {
      game.weaponPickups.push({
        x: 500 + (i / numWeapons) * (levelLength - 1000),
        y: 150 + Math.random() * 200,
        w: 24,
        h: 24,
        type: Math.random() > 0.5 ? 'heavy' : 'shotgun',
        collected: false
      });
    }

    if (game.player) {
      game.player.carrotPower = 0;
      game.player.health = 3;
      game.player.x = 100;
      game.player.y = SCREEN_HEIGHT - 100;
      game.player.weapon = 'normal';
      game.player.weaponAmmo = 0;
      game.player.invincible = 0;
    }
  }, []);

  const startGame = useCallback(async () => {
    const walletAddress = getWalletAddress();
    
    if (walletAddress) {
      try {
        const response = await fetch('/api/dashville/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress, characterId: selectedChar }),
        });
        const data = await response.json();
        if (data.runId) {
          setRunId(data.runId);
        }
      } catch (error) {
        console.error('Failed to start game run:', error);
      }
    }
    
    gameRef.current.player = createPlayer(selectedChar);
    resetLevel(1);
    setLevel(1);
    setScore(0);
    setKicks(0);
    setLevelKicks(0);
    setClaimed(false);
    setClaimTxHash(null);
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
      if (!game.keys[e.code]) {
        game.keysJustPressed[e.code] = true;
      }
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
        game.player.facingRight = false;
      } else if (keys['KeyD'] || keys['ArrowRight'] || touchControls.right) {
        game.player.velX = game.player.speed;
        game.player.facingRight = true;
      } else {
        game.player.velX *= 0.6;
      }
      
      if (game.player.onGround && Math.abs(game.player.velX) > 0.5) {
        game.player.animFrame += 0.3;
      } else if (game.player.onGround) {
        game.player.animFrame = 0;
      }

      game.player.crouching = keys['KeyS'] || keys['ArrowDown'] || touchControls.down;

      const jumpJustPressed = game.keysJustPressed['KeyW'] || game.keysJustPressed['ArrowUp'] || game.keysJustPressed['Space'];
      
      if (jumpJustPressed && game.player.jumpCount < 2) {
        game.player.velY = game.player.jumpPower;
        game.player.jumpCount++;
        game.player.onGround = false;
      }
      
      game.keysJustPressed = {};

      if ((keys['Enter'] || touchControls.shoot) && game.player.shootTimer <= 0) {
        const weapon = game.player.weapon;
        const hasAmmo = weapon === 'normal' || game.player.weaponAmmo > 0;
        const aimingDown = game.player.crouching;
        
        if (hasAmmo) {
          if (weapon === 'shotgun') {
            for (let i = -1; i <= 1; i++) {
              game.bullets.push({
                x: game.player.x + game.player.w / 2,
                y: game.player.y + game.player.h / 2 + (aimingDown ? 20 : i * 8),
                w: 6,
                h: 4,
                velX: aimingDown ? 0 : (game.player.facingRight ? 12 : -12),
                velY: aimingDown ? 12 : 0,
                dead: false,
                type: 'shotgun'
              });
            }
            game.player.weaponAmmo--;
            game.screenShake = 8;
          } else if (weapon === 'heavy') {
            game.bullets.push({
              x: game.player.x + game.player.w / 2,
              y: game.player.y + game.player.h / 2 + (aimingDown ? 20 : 0),
              w: aimingDown ? 8 : 16,
              h: aimingDown ? 16 : 8,
              velX: aimingDown ? 0 : (game.player.facingRight ? 14 : -14),
              velY: aimingDown ? 14 : 0,
              dead: false,
              type: 'heavy'
            });
            game.player.weaponAmmo--;
            game.screenShake = 12;
          } else {
            game.bullets.push({
              x: game.player.x + game.player.w / 2,
              y: game.player.y + game.player.h / 2 + (aimingDown ? 20 : 0),
              w: aimingDown ? 4 : 8,
              h: aimingDown ? 8 : 4,
              velX: aimingDown ? 0 : (game.player.facingRight ? 10 : -10),
              velY: aimingDown ? 10 : 0,
              dead: false,
              type: 'normal'
            });
          }
          game.player.shootTimer = weapon === 'heavy' ? 20 : weapon === 'shotgun' ? 25 : 15;
          
          if (game.player.weaponAmmo <= 0 && weapon !== 'normal') {
            game.player.weapon = 'normal';
          }
        }
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
            game.player.jumpCount = 0;
            game.player.velY = 0;
          } else {
            game.player.y = p.y + p.h;
            game.player.velY = 0;
          }
        }
      }

      for (const spring of game.springs) {
        if (collide(game.player, spring) && game.player.velY > 0) {
          game.player.velY = spring.power;
          game.player.jumpCount = 1;
          spring.compressed = 10;
          game.screenShake = 4;
        }
        if (spring.compressed > 0) spring.compressed--;
      }

      for (const wp of game.weaponPickups) {
        if (!wp.collected && collide(game.player, wp)) {
          game.player.weapon = wp.type;
          game.player.weaponAmmo = 13;
          wp.collected = true;
          game.weaponAnnouncement = wp.type === 'heavy' ? 'HEAVY MACHINE GUN!' : 'SHOTGUN!';
          game.announcementTimer = 90;
          game.screenShake = 6;
        }
      }

      if (game.player.invincible > 0) game.player.invincible--;

      for (const e of game.enemies) {
        if (!e.dead && game.player.invincible <= 0 && collide(game.player, e)) {
          const currentKicks = kicksRef.current;
          const coinsToLose = Math.min(3, Math.floor(currentKicks / 50));
          for (let i = 0; i < coinsToLose; i++) {
            game.droppedCoins.push({
              x: game.player.x + game.player.w / 2,
              y: game.player.y,
              velX: (Math.random() - 0.5) * 8,
              velY: -6 - Math.random() * 4,
              timer: 180
            });
          }
          setKicks(k => Math.max(0, k - coinsToLose * 50));
          setLevelKicks(lk => Math.max(0, lk - coinsToLose * 50));
          game.player.health--;
          game.player.invincible = 60;
          game.screenShake = 15;
          e.dead = true;
        }
      }

      for (const dc of game.droppedCoins) {
        dc.velY += 0.3;
        dc.x += dc.velX;
        dc.y += dc.velY;
        dc.timer--;
        
        if (dc.timer > 60 && collide(game.player, { x: dc.x - 8, y: dc.y - 8, w: 16, h: 16 })) {
          setKicks(k => k + 50);
          setLevelKicks(lk => lk + 50);
          dc.timer = 0;
        }
        
        for (const p of game.platforms) {
          if (dc.velY > 0 && dc.y + 8 > p.y && dc.y < p.y + p.h && dc.x > p.x && dc.x < p.x + p.w) {
            dc.y = p.y - 8;
            dc.velY *= -0.5;
            dc.velX *= 0.8;
          }
        }
      }
      game.droppedCoins = game.droppedCoins.filter(dc => dc.timer > 0);

      for (const c of game.coins) {
        if (!c.collected && collide(game.player, c)) {
          setScore(s => s + 1);
          setKicks(k => k + 50);
          setLevelKicks(lk => lk + 50);
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
      if (game.player.weapon !== 'normal' && game.player.weaponAmmo <= 0) {
        game.player.weapon = 'normal';
      }

      const levelLength = LEVEL_LENGTH + level * SCREEN_WIDTH;
      game.cameraX = game.player.x + game.player.w / 2 - SCREEN_WIDTH / 2;
      game.cameraX = Math.max(0, Math.min(game.cameraX, levelLength - SCREEN_WIDTH));
      game.gameTime++;

      for (const b of game.bullets) {
        b.x += b.velX;
        if (b.velY) b.y += b.velY;
        if (b.x > game.cameraX + SCREEN_WIDTH + 100 || b.x < game.cameraX - 100 || b.y > SCREEN_HEIGHT + 50 || b.y < -50) {
          b.dead = true;
          continue;
        }
        for (const e of game.enemies) {
          if (!e.dead && collide(b, e)) {
            e.health--;
            if (e.health <= 0) {
              e.dead = true;
              setScore(s => s + (e.type === 'tank' ? 30 : e.type === 'shooter' ? 20 : 10));
            }
            b.dead = true;
          }
        }
        if (game.boss && !game.boss.dead && collide(b, game.boss)) {
          game.boss.health--;
          game.screenShake = 8;
          b.dead = true;
          setScore(s => s + 5);
          if (game.boss.health <= 0) {
            game.boss.dead = true;
            game.screenShake = 30;
            setScore(s => s + 500);
          }
        }
      }

      for (const eb of game.enemyBullets) {
        eb.x += eb.velX;
        if (eb.velY) eb.y += eb.velY;
        if (eb.x > game.cameraX + SCREEN_WIDTH + 100 || eb.x < game.cameraX - 100 || eb.y < -50 || eb.y > SCREEN_HEIGHT + 50) {
          eb.dead = true;
          continue;
        }
        if (game.player.invincible <= 0 && collide(game.player, eb)) {
          game.player.health--;
          game.player.invincible = 60;
          game.screenShake = 15;
          eb.dead = true;
        }
      }
      game.enemyBullets = game.enemyBullets.filter(b => !b.dead);

      for (const e of game.enemies) {
        if (e.dead) continue;
        
        if (e.type === 'shooter' && e.shootTimer !== undefined) {
          e.shootTimer--;
          if (e.shootTimer <= 0 && Math.abs(e.x - game.player.x) < SCREEN_WIDTH) {
            const dir = game.player.x > e.x ? 1 : -1;
            game.enemyBullets.push({
              x: e.x + (dir > 0 ? e.w : 0),
              y: e.y + e.h / 2,
              w: 8,
              h: 4,
              velX: dir * 6,
              velY: 0,
              dead: false,
              type: 'normal'
            });
            e.shootTimer = 90;
          }
        }
        
        if (e.type === 'flying') {
          e.velY = Math.sin(game.gameTime * 0.05 + e.x * 0.01) * 2;
          e.x += e.velX;
          e.y += e.velY;
          if (e.x < 0 || e.x > levelLength) e.velX *= -1;
        } else {
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
      }

      if (game.boss && !game.boss.dead) {
        const bossZoneStart = levelLength - SCREEN_WIDTH * 2;
        const playerInBossZone = game.player.x >= bossZoneStart;
        
        if (playerInBossZone && !game.bossWarning) {
          game.bossWarning = true;
          game.weaponAnnouncement = 'WARNING: BOSS FIGHT!';
          game.announcementTimer = 120;
          game.screenShake = 10;
        }
        
        if (playerInBossZone) {
          game.boss.attackTimer++;
          
          if (game.boss.attackTimer % 50 === 0) {
            const bulletCount = game.boss.health < game.boss.maxHealth / 2 ? 5 : 3;
            for (let i = 0; i < bulletCount; i++) {
              const angle = (i - (bulletCount - 1) / 2) * 0.3;
              game.enemyBullets.push({
                x: game.boss.x,
                y: game.boss.y + game.boss.h / 2,
                w: 12,
                h: 8,
                velX: -8 * Math.cos(angle),
                velY: -8 * Math.sin(angle),
                dead: false,
                type: 'heavy'
              });
            }
            game.screenShake = 5;
          }
          
          const targetX = game.player.x + 100;
          if (game.boss.x > targetX + 50) {
            game.boss.velX = -2;
          } else if (game.boss.x < targetX - 50) {
            game.boss.velX = 2;
          } else {
            game.boss.velX = 0;
          }
          game.boss.x += game.boss.velX;
          game.boss.x = Math.max(bossZoneStart, Math.min(game.boss.x, levelLength - game.boss.w));
        }
        
        if (game.player.invincible <= 0 && collide(game.player, game.boss)) {
          game.player.health -= 2;
          game.player.invincible = 90;
          game.screenShake = 20;
          game.player.velX = game.player.x < game.boss.x ? -10 : 10;
          game.player.velY = -8;
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
      game.weaponPickups = game.weaponPickups.filter(w => !w.collected);
      
      if (game.screenShake > 0) game.screenShake--;
      if (game.announcementTimer > 0) game.announcementTimer--;

      if (game.boss && game.boss.dead) {
        const bonus = level * 200;
        setKicks(k => k + bonus);
        setLevelKicks(lk => lk + bonus);
        setGameState('levelComplete');
        return;
      }

      if (game.player.y > SCREEN_HEIGHT + 100) {
        game.player.health = 0;
      }

      if (game.player.health <= 0) {
        if (runId) {
          fetch('/api/dashville/end', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ runId, won: false, finalScore: score, totalKicks: kicks }),
          }).catch(console.error);
        }
        setGameState('gameOver');
        return;
      }

      const theme = LEVEL_THEMES[(level - 1) % LEVEL_THEMES.length];
      
      ctx.save();
      if (game.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * game.screenShake * 2;
        const shakeY = (Math.random() - 0.5) * game.screenShake * 2;
        ctx.translate(shakeX, shakeY);
      }
      
      ctx.fillStyle = theme.skyColor;
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      
      for (const bg of game.backgroundElements.filter(b => b.layer < 0.3)) {
        const parallaxX = bg.x - game.cameraX * bg.layer;
        const wrappedX = ((parallaxX % (SCREEN_WIDTH * 2)) + SCREEN_WIDTH * 2) % (SCREEN_WIDTH * 2) - SCREEN_WIDTH / 2;
        
        if (bg.type === 'star') {
          ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(game.gameTime * 0.1 + bg.x) * 0.3})`;
          ctx.beginPath();
          ctx.arc(wrappedX, bg.y, 2 * bg.scale, 0, Math.PI * 2);
          ctx.fill();
        } else if (bg.type === 'cloud') {
          ctx.fillStyle = theme.skyColor === '#0a0a2e' ? 'rgba(100, 100, 150, 0.3)' : 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.ellipse(wrappedX, bg.y, 60 * bg.scale, 25 * bg.scale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(wrappedX + 40 * bg.scale, bg.y + 5, 40 * bg.scale, 20 * bg.scale, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      for (const bg of game.backgroundElements.filter(b => b.layer >= 0.3 && b.layer < 0.7)) {
        const parallaxX = bg.x - game.cameraX * bg.layer;
        
        if (bg.type === 'building') {
          ctx.fillStyle = theme.groundColor + '80';
          const buildingH = 80 * bg.scale;
          ctx.fillRect(parallaxX, bg.y, 50 * bg.scale, buildingH);
          ctx.fillStyle = theme.accent + '40';
          for (let wy = 0; wy < buildingH - 20; wy += 20) {
            for (let wx = 5; wx < 45 * bg.scale; wx += 15) {
              ctx.fillRect(parallaxX + wx, bg.y + 10 + wy, 8, 12);
            }
          }
        } else if (bg.type === 'tree') {
          ctx.fillStyle = '#3d2817';
          ctx.fillRect(parallaxX + 15 * bg.scale, bg.y + 40 * bg.scale, 10 * bg.scale, 40 * bg.scale);
          ctx.fillStyle = '#228B22';
          ctx.beginPath();
          ctx.moveTo(parallaxX, bg.y + 50 * bg.scale);
          ctx.lineTo(parallaxX + 20 * bg.scale, bg.y);
          ctx.lineTo(parallaxX + 40 * bg.scale, bg.y + 50 * bg.scale);
          ctx.fill();
        } else if (bg.type === 'mountain') {
          ctx.fillStyle = theme.groundColor + 'AA';
          ctx.beginPath();
          ctx.moveTo(parallaxX - 50 * bg.scale, SCREEN_HEIGHT - TILE_SIZE);
          ctx.lineTo(parallaxX + 50 * bg.scale, bg.y);
          ctx.lineTo(parallaxX + 150 * bg.scale, SCREEN_HEIGHT - TILE_SIZE);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.beginPath();
          ctx.moveTo(parallaxX + 50 * bg.scale, bg.y);
          ctx.lineTo(parallaxX + 30 * bg.scale, bg.y + 30 * bg.scale);
          ctx.lineTo(parallaxX + 70 * bg.scale, bg.y + 30 * bg.scale);
          ctx.fill();
        }
      }

      ctx.save();
      ctx.translate(-game.cameraX, 0);

      ctx.fillStyle = theme.groundColor;
      for (const p of game.platforms) {
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y, p.w, p.h);
      }

      ctx.fillStyle = '#FFFF00';
      ctx.shadowColor = '#FFFF00';
      ctx.shadowBlur = 10;
      for (const c of game.coins) {
        if (!c.collected) {
          ctx.beginPath();
          ctx.arc(c.x + 8, c.y + 8, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;

      for (const ca of game.carrots) {
        if (!ca.collected) {
          ctx.fillStyle = '#FFA500';
          ctx.fillRect(ca.x, ca.y, ca.w, ca.h);
          ctx.fillStyle = '#00FF00';
          ctx.fillRect(ca.x + 4, ca.y, 4, 4);
        }
      }

      for (const spring of game.springs) {
        const compression = spring.compressed > 0 ? 8 : 0;
        ctx.fillStyle = '#FF6600';
        ctx.fillRect(spring.x, spring.y + compression, spring.w, spring.h - compression);
        ctx.fillStyle = '#FFCC00';
        ctx.fillRect(spring.x + 4, spring.y + compression, spring.w - 8, 4);
        ctx.fillRect(spring.x + 8, spring.y + compression + 6, spring.w - 16, 4);
      }

      for (const wp of game.weaponPickups) {
        if (!wp.collected) {
          ctx.fillStyle = wp.type === 'heavy' ? '#FF4444' : '#4444FF';
          ctx.shadowColor = wp.type === 'heavy' ? '#FF0000' : '#0000FF';
          ctx.shadowBlur = 15;
          ctx.fillRect(wp.x, wp.y, wp.w, wp.h);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 12px monospace';
          ctx.fillText(wp.type === 'heavy' ? 'H' : 'S', wp.x + 8, wp.y + 17);
          ctx.shadowBlur = 0;
        }
      }

      for (const dc of game.droppedCoins) {
        if (dc.timer > 0) {
          const alpha = dc.timer < 60 ? dc.timer / 60 : 1;
          ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
          ctx.beginPath();
          ctx.arc(dc.x, dc.y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const e of game.enemies) {
        if (!e.dead) {
          if (e.type === 'flying') {
            ctx.fillStyle = '#8800FF';
            ctx.beginPath();
            ctx.ellipse(e.x + e.w/2, e.y + e.h/2, e.w/2, e.h/2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#AA44FF';
            const wingOffset = Math.sin(game.gameTime * 0.2) * 5;
            ctx.beginPath();
            ctx.moveTo(e.x, e.y + e.h/2);
            ctx.lineTo(e.x - 10, e.y + wingOffset);
            ctx.lineTo(e.x, e.y);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(e.x + e.w, e.y + e.h/2);
            ctx.lineTo(e.x + e.w + 10, e.y + wingOffset);
            ctx.lineTo(e.x + e.w, e.y);
            ctx.fill();
          } else if (e.type === 'tank') {
            ctx.fillStyle = '#444444';
            ctx.fillRect(e.x, e.y + 10, e.w, e.h - 10);
            ctx.fillStyle = '#666666';
            ctx.fillRect(e.x + 10, e.y, e.w - 20, 15);
            ctx.fillStyle = '#FF4400';
            ctx.fillRect(e.x + e.w - 5, e.y + 5, 15, 8);
            ctx.fillStyle = '#333333';
            for (let wx = 0; wx < e.w; wx += 12) {
              ctx.beginPath();
              ctx.arc(e.x + wx + 6, e.y + e.h, 6, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (e.type === 'shooter') {
            ctx.fillStyle = '#00AA00';
            ctx.fillRect(e.x, e.y, e.w, e.h);
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(e.x + 4, e.y + 4, 6, 6);
            ctx.fillRect(e.x + 14, e.y + 4, 6, 6);
            const gunDir = game.player.x > e.x ? 1 : -1;
            ctx.fillStyle = '#005500';
            ctx.fillRect(e.x + (gunDir > 0 ? e.w : -8), e.y + 10, 8, 4);
          } else {
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(e.x + 12, e.y + 12, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#CC0000';
            ctx.fillRect(e.x + 4, e.y + 8, 6, 4);
            ctx.fillRect(e.x + 14, e.y + 8, 6, 4);
          }
          
          if (e.health > 1) {
            ctx.fillStyle = '#333';
            ctx.fillRect(e.x, e.y - 8, e.w, 4);
            ctx.fillStyle = '#00FF00';
            const maxHealth = e.type === 'tank' ? 3 + level : (1 + Math.floor(level / 2));
            ctx.fillRect(e.x, e.y - 8, (e.health / maxHealth) * e.w, 4);
          }
        }
      }

      for (const eb of game.enemyBullets) {
        if (!eb.dead) {
          ctx.fillStyle = '#FF00FF';
          ctx.shadowColor = '#FF00FF';
          ctx.shadowBlur = 10;
          ctx.fillRect(eb.x, eb.y, eb.w, eb.h);
          ctx.shadowBlur = 0;
        }
      }

      if (game.boss && !game.boss.dead) {
        const boss = game.boss;
        ctx.fillStyle = '#880000';
        ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(boss.x + 10, boss.y + 10, boss.w - 20, boss.h - 30);
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        ctx.arc(boss.x + 30, boss.y + 40, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(boss.x + 70, boss.y + 40, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(boss.x + 30, boss.y + 40, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(boss.x + 70, boss.y + 40, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(boss.x + 20, boss.y + 70, 60, 20);
        for (let t = 0; t < 6; t++) {
          ctx.fillStyle = '#880000';
          ctx.beginPath();
          ctx.moveTo(boss.x + 25 + t * 10, boss.y + 70);
          ctx.lineTo(boss.x + 30 + t * 10, boss.y + 90);
          ctx.lineTo(boss.x + 35 + t * 10, boss.y + 70);
          ctx.fill();
        }
        
        ctx.fillStyle = '#333';
        ctx.fillRect(boss.x, boss.y - 20, boss.w, 12);
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(boss.x, boss.y - 20, (boss.health / boss.maxHealth) * boss.w, 12);
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(boss.x, boss.y - 20, boss.w, 12);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('BOSS', boss.x + boss.w / 2 - 15, boss.y - 10);
      }

      for (const b of game.bullets) {
        if (!b.dead) {
          if (b.type === 'heavy') {
            ctx.fillStyle = '#FF4400';
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 10;
          } else if (b.type === 'shotgun') {
            ctx.fillStyle = '#4444FF';
            ctx.shadowColor = '#0000FF';
            ctx.shadowBlur = 8;
          } else {
            ctx.fillStyle = '#FFFF00';
            ctx.shadowBlur = 0;
          }
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.shadowBlur = 0;
        }
      }

      const p = game.player;
      if (p.invincible <= 0 || Math.floor(p.invincible / 4) % 2 === 0) {
        const charImg = game.charImages[p.charIndex];
        const isMoving = Math.abs(p.velX) > 0.5;
        const bobOffset = p.onGround && isMoving ? Math.sin(p.animFrame * 2) * 3 : 0;
        const legOffset = p.onGround && isMoving ? Math.sin(p.animFrame * 4) * 4 : 0;
        
        ctx.save();
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2 + bobOffset);
        if (!p.facingRight) ctx.scale(-1, 1);
        
        if (charImg && charImg.complete) {
          ctx.drawImage(charImg, -p.w / 2 - 10, -p.h / 2 - 10, p.w + 20, p.h + 20);
        } else {
          ctx.fillStyle = `rgb(${p.color[0]}, ${p.color[1]}, ${p.color[2]})`;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        
        if (p.onGround && isMoving) {
          ctx.fillStyle = '#333';
          ctx.fillRect(-p.w / 2 + 5, p.h / 2 + legOffset, 8, 10);
          ctx.fillRect(p.w / 2 - 13, p.h / 2 - legOffset, 8, 10);
        }
        
        if (p.weapon === 'heavy') {
          ctx.fillStyle = '#444';
          ctx.fillRect(p.w / 2 - 5, -8, 30, 10);
          ctx.fillStyle = '#666';
          ctx.fillRect(p.w / 2 + 20, -10, 8, 14);
          ctx.fillStyle = '#FF4400';
          ctx.beginPath();
          ctx.arc(p.w / 2 + 28, -3, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.weapon === 'shotgun') {
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(p.w / 2 - 5, -4, 25, 6);
          ctx.fillStyle = '#555';
          ctx.fillRect(p.w / 2 + 15, -6, 12, 10);
        } else if (p.carrotPower > 0) {
          ctx.fillStyle = '#666';
          ctx.fillRect(p.w / 2 - 5, -2, 18, 4);
        }
        
        ctx.restore();
      }

      ctx.restore();

      if (game.announcementTimer > 0) {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.font = 'bold 36px monospace';
        ctx.textAlign = 'center';
        const scale = game.announcementTimer > 80 ? 1 + (90 - game.announcementTimer) * 0.05 : 1;
        ctx.save();
        ctx.translate(SCREEN_WIDTH / 2, 100);
        ctx.scale(scale, scale);
        ctx.strokeText(game.weaponAnnouncement, 0, 0);
        ctx.fillText(game.weaponAnnouncement, 0, 0);
        ctx.restore();
        ctx.textAlign = 'left';
      }

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

  const nextLevel = useCallback(async () => {
    const newLevel = level + 1;
    
    if (runId && levelKicks > 0) {
      try {
        await fetch('/api/dashville/level-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runId, level: newLevel, score, kicksEarned: levelKicks }),
        });
      } catch (error) {
        console.error('Failed to record level complete:', error);
      }
    }
    
    setLevelKicks(0);
    
    if (newLevel > 5) {
      if (runId) {
        try {
          await fetch('/api/dashville/end', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ runId, won: true, finalScore: score, totalKicks: kicks }),
          });
        } catch (error) {
          console.error('Failed to end game:', error);
        }
      }
      setGameState('gameOver');
      return;
    }
    setLevel(newLevel);
    resetLevel(newLevel);
    setGameState('playing');
  }, [level, resetLevel, runId, levelKicks, score, kicks]);

  const claimKicks = useCallback(async () => {
    if (!runId || claiming || claimed) return;
    
    const walletAddress = getWalletAddress();
    if (!walletAddress) {
      console.error('No wallet address found');
      alert('Please connect your wallet first');
      return;
    }
    
    setClaiming(true);
    try {
      const response = await fetch('/api/dashville/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, walletAddress }),
      });
      const data = await response.json();
      if (data.success) {
        setClaimed(true);
        setClaimTxHash(data.txHash);
      } else {
        console.error('Claim failed:', data.error);
        alert(data.error || 'Failed to claim KICKS');
      }
    } catch (error) {
      console.error('Failed to claim kicks:', error);
      alert('Failed to claim KICKS. Please try again.');
    }
    setClaiming(false);
  }, [runId, claiming, claimed]);

  const restartGame = useCallback(async () => {
    const walletAddress = getWalletAddress();
    
    if (walletAddress) {
      try {
        const response = await fetch('/api/dashville/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress, characterId: selectedChar }),
        });
        const data = await response.json();
        if (data.runId) {
          setRunId(data.runId);
        }
      } catch (error) {
        console.error('Failed to start new game run:', error);
      }
    }
    
    const newPlayer = createPlayer(selectedChar);
    gameRef.current.player = newPlayer;
    gameRef.current.cameraX = 0;
    gameRef.current.bullets = [];
    gameRef.current.enemyBullets = [];
    resetLevel(1);
    setLevel(1);
    setScore(0);
    setKicks(0);
    setLevelKicks(0);
    setClaimed(false);
    setClaimTxHash(null);
    setGameState('playing');
  }, [selectedChar, createPlayer, resetLevel]);

  const handleTouchStart = useCallback((control: 'left' | 'right' | 'jump' | 'shoot' | 'down', e?: React.TouchEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (control === 'jump' && !gameRef.current.touchControls.jump) {
      gameRef.current.keysJustPressed['Space'] = true;
    }
    gameRef.current.touchControls[control] = true;
  }, []);

  const handleTouchEnd = useCallback((control: 'left' | 'right' | 'jump' | 'shoot' | 'down', e?: React.TouchEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    gameRef.current.touchControls[control] = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
  }, []);

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
            <div className="flex gap-4 justify-center flex-wrap">
              {CHARS.map((char, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedChar(i)}
                  className={`w-24 h-28 border-[3px] border-black transition-all bg-[#1a1a1a] p-1 ${selectedChar === i ? 'scale-110 ring-2 ring-yellow-400' : ''}`}
                  style={{
                    boxShadow: selectedChar === i ? '0 0 20px rgba(255,255,0,0.5), 4px 4px 0px black' : '4px 4px 0px black'
                  }}
                >
                  <img 
                    src={char.image} 
                    alt={char.name}
                    className="w-full h-full object-contain"
                  />
                </button>
              ))}
            </div>
            <p className="text-white mt-3 text-lg font-bold">{CHARS[selectedChar].name}</p>
          </div>

          <button
            onClick={startGame}
            className="px-8 py-4 bg-[#FF6600] text-black font-black text-xl uppercase border-[4px] border-black hover:bg-[#FF8800] transition-colors"
            style={{ boxShadow: '6px 6px 0px black' }}
          >
            START GAME
          </button>

          <div className="mt-6 text-gray-500 text-sm">
            <p>PC: A/D Move, W/Space Jump (x2 for Double Jump), Enter Shoot</p>
            <p>Mobile: Use touch buttons (tap jump twice for double jump)</p>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="fixed inset-0 bg-black flex items-center justify-center">
          <div className="absolute top-16 left-4 z-10 bg-black/70 p-3 border-2 border-white text-white font-mono text-sm">
            <div>Level: {level}</div>
            <div>Health: {'❤️'.repeat(gameRef.current.player?.health || 0)}</div>
            <div>Score: {score}</div>
            <div>$KICKS: {kicks}</div>
            <div>Carrots: {gameRef.current.player?.carrotPower || 0} 🥕</div>
            {gameRef.current.player?.weapon !== 'normal' && (
              <div className="text-yellow-400">Weapon: {gameRef.current.player?.weapon?.toUpperCase()} ({gameRef.current.player?.weaponAmmo})</div>
            )}
          </div>
          
          <canvas
            ref={canvasRef}
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT}
            className="max-w-full max-h-full object-contain"
            style={{ imageRendering: 'pixelated' }}
          />

          <div 
            className="md:hidden fixed bottom-4 left-0 right-0 flex justify-between px-4 select-none"
            style={{ touchAction: 'none' }}
            onTouchMove={handleTouchMove}
          >
            <div className="flex gap-2">
              <button
                onTouchStart={(e) => handleTouchStart('left', e)}
                onTouchEnd={(e) => handleTouchEnd('left', e)}
                onTouchCancel={(e) => handleTouchEnd('left', e)}
                onContextMenu={(e) => e.preventDefault()}
                className="w-20 h-20 bg-gray-800 border-3 border-white text-white text-3xl font-bold active:bg-gray-600 select-none"
                style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
              >
                ←
              </button>
              <button
                onTouchStart={(e) => handleTouchStart('right', e)}
                onTouchEnd={(e) => handleTouchEnd('right', e)}
                onTouchCancel={(e) => handleTouchEnd('right', e)}
                onContextMenu={(e) => e.preventDefault()}
                className="w-20 h-20 bg-gray-800 border-3 border-white text-white text-3xl font-bold active:bg-gray-600 select-none"
                style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
              >
                →
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onTouchStart={(e) => handleTouchStart('down', e)}
                onTouchEnd={(e) => handleTouchEnd('down', e)}
                onTouchCancel={(e) => handleTouchEnd('down', e)}
                onContextMenu={(e) => e.preventDefault()}
                className="w-20 h-20 bg-purple-600 border-3 border-white text-white text-2xl font-bold active:bg-purple-500 select-none"
                style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
              >
                ↓
              </button>
              <button
                onTouchStart={(e) => handleTouchStart('shoot', e)}
                onTouchEnd={(e) => handleTouchEnd('shoot', e)}
                onTouchCancel={(e) => handleTouchEnd('shoot', e)}
                onContextMenu={(e) => e.preventDefault()}
                className="w-20 h-20 bg-orange-600 border-3 border-white text-white text-sm font-bold active:bg-orange-500 select-none"
                style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
              >
                SHOOT
              </button>
              <button
                onTouchStart={(e) => handleTouchStart('jump', e)}
                onTouchEnd={(e) => handleTouchEnd('jump', e)}
                onTouchCancel={(e) => handleTouchEnd('jump', e)}
                onContextMenu={(e) => e.preventDefault()}
                className="w-20 h-20 bg-green-600 border-3 border-white text-white text-sm font-bold active:bg-green-500 select-none"
                style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
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
          <p className="text-2xl text-yellow-300 mb-4">$KICKS Earned: {kicks}</p>
          
          {kicks > 0 && !claimed && runId && getWalletAddress() && (
            <button
              onClick={claimKicks}
              disabled={claiming}
              className="px-8 py-4 bg-[#39FF14] text-black font-black text-xl uppercase border-4 border-black hover:bg-[#50FF30] transition-colors mb-4 disabled:opacity-50"
              style={{ boxShadow: '4px 4px 0px black' }}
            >
              {claiming ? 'CLAIMING...' : `CLAIM ${kicks} $KICKS`}
            </button>
          )}
          {kicks > 0 && !claimed && (!runId || !getWalletAddress()) && (
            <p className="text-yellow-400 text-sm mb-4">Connect wallet to claim rewards</p>
          )}
          
          {claimed && (
            <div className="mb-4">
              <p className="text-2xl text-[#39FF14] font-bold mb-2">$KICKS CLAIMED!</p>
              {claimTxHash && (
                <a 
                  href={`https://apescan.io/tx/${claimTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white underline"
                >
                  View Transaction
                </a>
              )}
            </div>
          )}
          
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
