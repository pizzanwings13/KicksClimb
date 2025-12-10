import { useLocation } from "wouter";
import { useWallet } from "@/lib/stores/useWallet";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rabbit, ArrowLeft, Rocket, Shield, Zap, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";

type GamePhase = "ship_select" | "betting" | "playing" | "ended";
type ShipType = 0 | 1 | 2;

interface GameState {
  wager: number;
  currentMult: number;
  hasShield: boolean;
  hasWeapon: boolean;
  shieldTime: number;
  weaponTime: number;
  gameActive: boolean;
  hasPickedFirst: boolean;
}

const QUICK_AMOUNTS = ["100", "500", "1000", "2500", "5000"];
const MIN_BET = 100;
const MAX_BET = 10000;

export function RabbitRushApp() {
  const { isConnected, walletAddress, kicksBalance } = useWallet();
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const gameStateRef = useRef<GameState>({
    wager: 0,
    currentMult: 1.0,
    hasShield: false,
    hasWeapon: false,
    shieldTime: 0,
    weaponTime: 0,
    gameActive: false,
    hasPickedFirst: false
  });
  
  const [phase, setPhase] = useState<GamePhase>("ship_select");
  const [selectedShip, setSelectedShip] = useState<ShipType>(0);
  const [betAmount, setBetAmount] = useState("100");
  const [displayMult, setDisplayMult] = useState("1.00");
  const [displayKicks, setDisplayKicks] = useState(0);
  const [endMessage, setEndMessage] = useState("");
  
  const rocketRef = useRef({
    x: 0,
    y: 0,
    width: 80,
    height: 120,
    speed: 0,
    targetX: 0,
    trail: [] as { x: number; y: number; alpha: number }[],
    baseSpeed: 6
  });
  
  const obstaclesRef = useRef<any[]>([]);
  const carrotsRef = useRef<any[]>([]);
  const coinsRef = useRef<any[]>([]);
  const powerupsRef = useRef<any[]>([]);
  const enemiesRef = useRef<any[]>([]);
  const bulletsRef = useRef<any[]>([]);
  const particlesRef = useRef<any[]>([]);
  const starsRef = useRef<any[]>([]);
  const scrollYRef = useRef(0);
  const frameCountRef = useRef(0);

  useEffect(() => {
    if (!isConnected) {
      setLocation("/");
    }
  }, [isConnected, setLocation]);

  useEffect(() => {
    setDisplayKicks(parseFloat(kicksBalance) || 0);
  }, [kicksBalance]);

  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      gameStateRef.current.gameActive = false;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (!gameStateRef.current.gameActive) {
        rocketRef.current.x = canvas.width / 2;
        rocketRef.current.targetX = canvas.width / 2;
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    for (let i = 0; i < 100; i++) {
      starsRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 2 + 1
      });
    }
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectShip = (ship: ShipType) => {
    setSelectedShip(ship);
    setPhase("betting");
  };

  const handleStartGame = () => {
    const betValue = parseFloat(betAmount);
    if (isNaN(betValue) || betValue < MIN_BET || betValue > Math.min(displayKicks, MAX_BET)) {
      return;
    }
    
    setDisplayKicks(prev => prev - betValue);
    gameStateRef.current.wager = betValue;
    gameStateRef.current.currentMult = 1.0;
    gameStateRef.current.hasShield = false;
    gameStateRef.current.hasWeapon = false;
    gameStateRef.current.shieldTime = 0;
    gameStateRef.current.weaponTime = 0;
    gameStateRef.current.gameActive = true;
    gameStateRef.current.hasPickedFirst = false;
    
    const canvas = canvasRef.current!;
    rocketRef.current.x = canvas.width / 2;
    rocketRef.current.targetX = canvas.width / 2;
    rocketRef.current.y = canvas.height - 150;
    rocketRef.current.trail = [];
    
    scrollYRef.current = 0;
    frameCountRef.current = 0;
    obstaclesRef.current = [];
    carrotsRef.current = [];
    coinsRef.current = [];
    powerupsRef.current = [];
    enemiesRef.current = [];
    bulletsRef.current = [];
    particlesRef.current = [];
    
    setDisplayMult("1.00");
    setPhase("playing");
    
    requestAnimationFrame(gameLoop);
  };

  const handleCashout = useCallback(() => {
    if (!gameStateRef.current.gameActive || !gameStateRef.current.hasPickedFirst) return;
    
    const win = Math.floor(gameStateRef.current.wager * gameStateRef.current.currentMult);
    setDisplayKicks(prev => prev + win);
    
    gameStateRef.current.gameActive = false;
    setEndMessage(`CASHED OUT AT ${gameStateRef.current.currentMult.toFixed(2)}x! Won ${win.toLocaleString()} KICKS!`);
    setPhase("ended");
  }, []);

  const endGame = useCallback((message: string, isWin: boolean = false) => {
    gameStateRef.current.gameActive = false;
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    setEndMessage(message);
    setPhase("ended");
  }, []);

  const spawnStuff = useCallback(() => {
    const scrollY = scrollYRef.current;
    const canvas = canvasRef.current!;
    
    if (Math.random() < 0.02) {
      const carrotTypes = [
        { emoji: '🥕', mult: 0.1, color: '#ff8800' },
        { emoji: '🥕', mult: 0.2, color: '#ffaa00' },
        { emoji: '✨', mult: 0.5, color: '#ffff00' }
      ];
      const type = carrotTypes[Math.floor(Math.random() * carrotTypes.length)];
      carrotsRef.current.push({
        x: Math.random() * (canvas.width - 100) + 50,
        y: scrollY - 100,
        ...type,
        size: 50,
        pulse: 0
      });
    }
    
    if (Math.random() < 0.03) {
      const coinValues = [50, 100, 150, 200];
      const value = coinValues[Math.floor(Math.random() * coinValues.length)];
      coinsRef.current.push({
        x: Math.random() * (canvas.width - 100) + 50,
        y: scrollY - 100,
        value: value,
        size: 40,
        rotation: 0
      });
    }
    
    if (Math.random() < 0.015) {
      const powerupTypes = [
        { type: 'shield', emoji: '🛡️', color: '#00ffff' },
        { type: 'weapon', emoji: '🔫', color: '#ff00ff' }
      ];
      const powerup = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
      powerupsRef.current.push({
        x: Math.random() * (canvas.width - 100) + 50,
        y: scrollY - 100,
        ...powerup,
        size: 45,
        pulse: 0
      });
    }
    
    if (Math.random() < 0.03) {
      obstaclesRef.current.push({
        x: Math.random() * (canvas.width - 120) + 60,
        y: scrollY - 100,
        size: 80,
        rotation: Math.random() * Math.PI * 2
      });
    }
    
    if (Math.random() < 0.02) {
      enemiesRef.current.push({
        x: Math.random() * (canvas.width - 100) + 50,
        y: scrollY - 100,
        size: 60,
        hp: 3,
        shootTimer: 0,
        vx: (Math.random() - 0.5) * 3
      });
    }
  }, []);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const gs = gameStateRef.current;
    if (!gs.gameActive) return;
    
    const rocket = rocketRef.current;
    const scrollY = scrollYRef.current;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#0a1a3f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (const star of starsRef.current) {
      star.y += star.speed;
      if (star.y > canvas.height) {
        star.y = 0;
        star.x = Math.random() * canvas.width;
      }
      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.random() * 0.5})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    
    scrollYRef.current -= 5;
    frameCountRef.current++;
    
    const dx = rocket.targetX - rocket.x;
    rocket.x += dx * 0.1;
    rocket.x = Math.max(50, Math.min(canvas.width - 50, rocket.x));
    
    if (gs.weaponTime > 0) {
      gs.weaponTime--;
      if (frameCountRef.current % 10 === 0) {
        bulletsRef.current.push({
          x: rocket.x,
          y: rocket.y - 40,
          vy: -12,
          fromPlayer: true
        });
      }
    } else {
      gs.hasWeapon = false;
    }
    
    if (gs.shieldTime > 0) {
      gs.shieldTime--;
    } else {
      gs.hasShield = false;
    }
    
    spawnStuff();
    
    rocket.trail.push({ x: rocket.x, y: rocket.y, alpha: 1 });
    if (rocket.trail.length > 10) rocket.trail.shift();
    
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < rocket.trail.length; i++) {
      const t = rocket.trail[i];
      const alpha = (i / rocket.trail.length) * 0.3;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = gs.hasWeapon 
        ? (selectedShip === 0 ? '#ff00ff' : '#00ffff')
        : (selectedShip === 0 ? '#ff3366' : '#6699ff');
      ctx.fillRect(t.x - 25, t.y + 40, 50, 70);
    }
    ctx.globalAlpha = 1;
    
    if (gs.hasShield) {
      const shieldPulse = Math.sin(frameCountRef.current * 0.1);
      ctx.strokeStyle = `rgba(0, 255, 255, ${0.7 + shieldPulse * 0.3})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(rocket.x, rocket.y + 60, 70 + shieldPulse * 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    const gradient = ctx.createLinearGradient(rocket.x - 30, rocket.y, rocket.x + 30, rocket.y + 120);
    if (gs.hasWeapon) {
      gradient.addColorStop(0, selectedShip === 0 ? '#ff66ff' : '#66ffff');
      gradient.addColorStop(1, selectedShip === 0 ? '#ff00ff' : '#00ffff');
    } else {
      gradient.addColorStop(0, selectedShip === 0 ? '#ff6699' : '#99bbff');
      gradient.addColorStop(1, selectedShip === 0 ? '#ff3366' : '#6699ff');
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(rocket.x, rocket.y);
    ctx.lineTo(rocket.x - 30, rocket.y + 100);
    ctx.lineTo(rocket.x - 40, rocket.y + 120);
    ctx.lineTo(rocket.x - 15, rocket.y + 100);
    ctx.lineTo(rocket.x, rocket.y + 110);
    ctx.lineTo(rocket.x + 15, rocket.y + 100);
    ctx.lineTo(rocket.x + 40, rocket.y + 120);
    ctx.lineTo(rocket.x + 30, rocket.y + 100);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(rocket.x, rocket.y + 50, 15, 0, Math.PI * 2);
    ctx.fill();
    
    const flameGradient = ctx.createLinearGradient(rocket.x, rocket.y + 110, rocket.x, rocket.y + 160);
    flameGradient.addColorStop(0, '#ffff00');
    flameGradient.addColorStop(0.5, '#ff8800');
    flameGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = flameGradient;
    const flameHeight = 40 + Math.random() * 20;
    ctx.beginPath();
    ctx.moveTo(rocket.x - 20, rocket.y + 110);
    ctx.quadraticCurveTo(rocket.x, rocket.y + 110 + flameHeight, rocket.x + 20, rocket.y + 110);
    ctx.closePath();
    ctx.fill();
    
    for (let i = carrotsRef.current.length - 1; i >= 0; i--) {
      const c = carrotsRef.current[i];
      const cy = c.y - scrollYRef.current;
      c.pulse += 0.1;
      const scale = 1 + Math.sin(c.pulse) * 0.1;
      
      ctx.save();
      ctx.translate(c.x, cy);
      ctx.scale(scale, scale);
      ctx.shadowColor = c.color;
      ctx.shadowBlur = 15;
      ctx.font = `${c.size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.emoji, 0, 0);
      ctx.restore();
      
      if (Math.abs(c.x - rocket.x) < 45 && Math.abs(cy - rocket.y - 50) < 60) {
        gs.currentMult += c.mult;
        gs.hasPickedFirst = true;
        setDisplayMult(gs.currentMult.toFixed(2));
        
        for (let j = 0; j < 15; j++) {
          particlesRef.current.push({
            x: c.x,
            y: cy,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 30,
            color: c.color
          });
        }
        carrotsRef.current.splice(i, 1);
      }
    }
    
    for (let i = coinsRef.current.length - 1; i >= 0; i--) {
      const c = coinsRef.current[i];
      const cy = c.y - scrollYRef.current;
      c.rotation += 0.1;
      
      ctx.save();
      ctx.translate(c.x, cy);
      ctx.scale(Math.abs(Math.cos(c.rotation)), 1);
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 15;
      ctx.font = `${c.size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🪙', 0, 0);
      ctx.restore();
      
      if (Math.abs(c.x - rocket.x) < 40 && Math.abs(cy - rocket.y - 50) < 55) {
        setDisplayKicks(prev => prev + c.value);
        
        for (let j = 0; j < 12; j++) {
          particlesRef.current.push({
            x: c.x,
            y: cy,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 25,
            color: '#ffaa00'
          });
        }
        coinsRef.current.splice(i, 1);
      }
    }
    
    for (let i = powerupsRef.current.length - 1; i >= 0; i--) {
      const p = powerupsRef.current[i];
      const py = p.y - scrollYRef.current;
      p.pulse += 0.08;
      const scale = 1 + Math.sin(p.pulse) * 0.15;
      
      ctx.save();
      ctx.translate(p.x, py);
      ctx.scale(scale, scale);
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 20;
      ctx.font = `${p.size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, 0, 0);
      ctx.restore();
      
      if (Math.abs(p.x - rocket.x) < 45 && Math.abs(py - rocket.y - 50) < 60) {
        if (p.type === 'shield') {
          gs.hasShield = true;
          gs.shieldTime = 300;
        } else if (p.type === 'weapon') {
          gs.hasWeapon = true;
          gs.weaponTime = 300;
        }
        
        for (let j = 0; j < 20; j++) {
          particlesRef.current.push({
            x: p.x,
            y: py,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            life: 35,
            color: p.color
          });
        }
        powerupsRef.current.splice(i, 1);
      }
    }
    
    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
      const o = obstaclesRef.current[i];
      const oy = o.y - scrollYRef.current;
      o.rotation += 0.02;
      
      ctx.save();
      ctx.translate(o.x, oy);
      ctx.rotate(o.rotation);
      ctx.fillStyle = '#444466';
      ctx.beginPath();
      for (let j = 0; j < 8; j++) {
        const angle = (j / 8) * Math.PI * 2;
        const r = o.size / 2 + Math.random() * 10;
        if (j === 0) {
          ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        } else {
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#666688';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      
      if (Math.abs(o.x - rocket.x) < 50 && Math.abs(oy - rocket.y - 50) < 70) {
        if (gs.hasShield) {
          gs.hasShield = false;
          gs.shieldTime = 0;
          for (let j = 0; j < 25; j++) {
            particlesRef.current.push({
              x: o.x,
              y: oy,
              vx: (Math.random() - 0.5) * 12,
              vy: (Math.random() - 0.5) * 12,
              life: 35,
              color: '#00ffff'
            });
          }
          obstaclesRef.current.splice(i, 1);
        } else {
          for (let j = 0; j < 30; j++) {
            particlesRef.current.push({
              x: rocket.x,
              y: rocket.y,
              vx: (Math.random() - 0.5) * 15,
              vy: (Math.random() - 0.5) * 15,
              life: 40,
              color: '#ff0000'
            });
          }
          endGame(`HIT ASTEROID! Lost ${gs.wager.toLocaleString()} KICKS`);
          return;
        }
      }
    }
    
    for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
      const e = enemiesRef.current[i];
      const ey = e.y - scrollYRef.current;
      e.x += e.vx;
      
      if (e.x < 50 || e.x > canvas.width - 50) e.vx *= -1;
      
      ctx.save();
      ctx.translate(e.x, ey);
      ctx.fillStyle = '#880088';
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.lineTo(-30, 10);
      ctx.lineTo(-20, 30);
      ctx.lineTo(20, 30);
      ctx.lineTo(30, 10);
      ctx.closePath();
      ctx.fill();
      ctx.font = '30px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('👾', 0, 0);
      ctx.restore();
      
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(e.x - 25, ey + 35, 50, 5);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(e.x - 25, ey + 35, (e.hp / 3) * 50, 5);
      
      e.shootTimer++;
      if (e.shootTimer > 90) {
        e.shootTimer = 0;
        bulletsRef.current.push({
          x: e.x,
          y: ey + 20,
          vy: 6,
          fromPlayer: false
        });
      }
      
      if (Math.abs(e.x - rocket.x) < 50 && Math.abs(ey - rocket.y) < 70) {
        if (gs.hasShield) {
          gs.hasShield = false;
          gs.shieldTime = 0;
          for (let j = 0; j < 25; j++) {
            particlesRef.current.push({
              x: e.x,
              y: ey,
              vx: (Math.random() - 0.5) * 12,
              vy: (Math.random() - 0.5) * 12,
              life: 35,
              color: '#8800ff'
            });
          }
          enemiesRef.current.splice(i, 1);
        } else {
          for (let j = 0; j < 30; j++) {
            particlesRef.current.push({
              x: rocket.x,
              y: rocket.y,
              vx: (Math.random() - 0.5) * 15,
              vy: (Math.random() - 0.5) * 15,
              life: 40,
              color: '#ff0000'
            });
          }
          endGame(`HIT BY ENEMY! Lost ${gs.wager.toLocaleString()} KICKS`);
          return;
        }
      }
    }
    
    for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
      const b = bulletsRef.current[i];
      b.y += b.vy;
      
      ctx.fillStyle = b.fromPlayer ? '#ff00ff' : '#ff0000';
      ctx.shadowColor = b.fromPlayer ? '#ff00ff' : '#ff0000';
      ctx.shadowBlur = 10;
      ctx.fillRect(b.x - 3, b.y - 8, 6, 16);
      ctx.shadowBlur = 0;
      
      if (b.fromPlayer) {
        for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
          const e = enemiesRef.current[j];
          const ey = e.y - scrollYRef.current;
          if (Math.abs(b.x - e.x) < 35 && Math.abs(b.y - ey) < 35) {
            e.hp--;
            bulletsRef.current.splice(i, 1);
            
            if (e.hp <= 0) {
              setDisplayKicks(prev => prev + 100);
              
              for (let k = 0; k < 25; k++) {
                particlesRef.current.push({
                  x: e.x,
                  y: ey,
                  vx: (Math.random() - 0.5) * 12,
                  vy: (Math.random() - 0.5) * 12,
                  life: 35,
                  color: '#8800ff'
                });
              }
              enemiesRef.current.splice(j, 1);
            }
            break;
          }
        }
      } else {
        if (Math.abs(b.x - rocket.x) < 40 && Math.abs(b.y - rocket.y) < 80) {
          if (gs.hasShield) {
            gs.hasShield = false;
            gs.shieldTime = 0;
            bulletsRef.current.splice(i, 1);
            for (let j = 0; j < 20; j++) {
              particlesRef.current.push({
                x: b.x,
                y: b.y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 30,
                color: '#00ffff'
              });
            }
          } else {
            for (let j = 0; j < 30; j++) {
              particlesRef.current.push({
                x: rocket.x,
                y: rocket.y,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                life: 40,
                color: '#ff0000'
              });
            }
            endGame(`SHOT DOWN! Lost ${gs.wager.toLocaleString()} KICKS`);
            return;
          }
        }
      }
      
      if (b.y < -50 || b.y > canvas.height + 50) {
        bulletsRef.current.splice(i, 1);
      }
    }
    
    obstaclesRef.current = obstaclesRef.current.filter(o => o.y - scrollYRef.current < canvas.height + 100);
    carrotsRef.current = carrotsRef.current.filter(c => c.y - scrollYRef.current < canvas.height + 100);
    coinsRef.current = coinsRef.current.filter(c => c.y - scrollYRef.current < canvas.height + 100);
    powerupsRef.current = powerupsRef.current.filter(p => p.y - scrollYRef.current < canvas.height + 100);
    enemiesRef.current = enemiesRef.current.filter(e => e.y - scrollYRef.current < canvas.height + 100);
    
    for (const p of particlesRef.current) {
      ctx.globalAlpha = p.life / 30;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life--;
    }
    ctx.globalAlpha = 1;
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    
    if (gs.gameActive) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
  }, [selectedShip, endGame, spawnStuff]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleTouchStart = (e: TouchEvent) => {
      if (phase !== "playing") return;
      e.preventDefault();
      rocketRef.current.targetX = e.touches[0].clientX;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (phase !== "playing") return;
      e.preventDefault();
      rocketRef.current.targetX = e.touches[0].clientX;
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (phase !== "playing") return;
      if (e.buttons === 1) rocketRef.current.targetX = e.clientX;
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      if (phase !== "playing") return;
      rocketRef.current.targetX = e.clientX;
    };
    
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
    };
  }, [phase]);

  const handlePlayAgain = () => {
    setPhase("betting");
    setEndMessage("");
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />
      
      <div className="absolute top-4 right-4 z-20 bg-black/70 px-4 py-2 rounded-xl border-2 border-pink-500 shadow-lg shadow-pink-500/30">
        <span className="text-white font-bold">{displayKicks.toLocaleString()} KICKS</span>
      </div>

      {phase === "playing" && (
        <>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
            <div className="text-4xl font-bold text-white animate-pulse">
              {displayMult}x
            </div>
          </div>
          
          <button
            onClick={handleCashout}
            className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-20 w-4/5 max-w-md h-16 text-xl font-bold rounded-xl transition-all ${
              gameStateRef.current.hasPickedFirst
                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white opacity-100 cursor-pointer shadow-lg shadow-green-500/40"
                : "bg-gray-600 text-gray-400 opacity-50 cursor-not-allowed"
            }`}
          >
            CASH OUT
          </button>
        </>
      )}

      <AnimatePresence>
        {phase === "ship_select" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center gap-6 z-30"
          >
            <button
              onClick={() => setLocation("/")}
              className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-lg border border-pink-500/30 text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Games</span>
            </button>

            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
              RABBIT RUSH
            </h1>
            <p className="text-pink-300 glow">Choose your ship!</p>
            
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => handleSelectShip(0)}
                className="flex items-center gap-4 text-xl px-8 py-4 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600"
              >
                <Rocket className="w-6 h-6" />
                Blaze Ship
              </Button>
              <Button
                onClick={() => handleSelectShip(1)}
                className="flex items-center gap-4 text-xl px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
              >
                <Rocket className="w-6 h-6" />
                Luna Ship
              </Button>
            </div>
          </motion.div>
        )}

        {phase === "betting" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center gap-6 z-30 px-4"
          >
            <button
              onClick={() => setPhase("ship_select")}
              className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-lg border border-pink-500/30 text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Change Ship</span>
            </button>

            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
              RABBIT RUSH
            </h1>
            
            <p className="text-white">
              Your KICKS: <span className="text-yellow-400 font-bold">{displayKicks.toLocaleString()}</span>
            </p>
            
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Enter wager (min 100 KICKS)"
              min={MIN_BET}
              max={Math.min(displayKicks, MAX_BET)}
              className="w-full max-w-xs px-4 py-3 text-lg text-center rounded-xl border-2 border-pink-500 bg-white/10 text-white"
            />
            
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_AMOUNTS.map(amount => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    betAmount === amount
                      ? "bg-pink-500 text-white"
                      : "bg-pink-900/50 text-pink-300 hover:bg-pink-800/50"
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>
            
            <Button
              onClick={handleStartGame}
              disabled={parseFloat(betAmount) < MIN_BET || parseFloat(betAmount) > Math.min(displayKicks, MAX_BET)}
              className="text-xl px-8 py-4 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 disabled:opacity-50"
            >
              <Rocket className="w-6 h-6 mr-2" />
              BLAST OFF
            </Button>
          </motion.div>
        )}

        {phase === "ended" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-6 z-30"
          >
            <div className="text-center p-8 bg-black/60 rounded-2xl border border-pink-500/30">
              <h2 className="text-3xl font-bold text-white mb-4">{endMessage}</h2>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={handlePlayAgain}
                  className="text-xl px-8 py-4 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600"
                >
                  Play Again
                </Button>
                <Button
                  onClick={() => setLocation("/")}
                  variant="outline"
                  className="border-pink-500/50 text-pink-300 hover:bg-pink-500/20"
                >
                  Back to Games
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
