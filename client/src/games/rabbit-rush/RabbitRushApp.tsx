import { useLocation } from "wouter";
import { useWallet } from "@/lib/stores/useWallet";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Rocket, ShoppingCart, Palette, Crosshair, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

type GamePhase = "ship_select" | "shop" | "betting" | "playing" | "ended";

interface ShipConfig {
  id: number;
  name: string;
  price: number;
  speed: number;
  handling: number;
  color1: string;
  color2: string;
  description: string;
}

interface WeaponConfig {
  id: number;
  name: string;
  price: number;
  fireRate: number;
  damage: number;
  bulletColor: string;
  description: string;
}

interface ColorConfig {
  id: number;
  name: string;
  price: number;
  color1: string;
  color2: string;
}

interface GameState {
  wager: number;
  currentMult: number;
  hasShield: boolean;
  shieldTime: number;
  gameActive: boolean;
  hasPickedFirst: boolean;
  shootCooldown: number;
  coinsCollected: number;
  enemiesDestroyed: number;
}

const hitSound = typeof Audio !== 'undefined' ? new Audio('/sounds/hit.mp3') : null;
const successSound = typeof Audio !== 'undefined' ? new Audio('/sounds/success.mp3') : null;

const playHitSound = () => {
  if (hitSound) {
    hitSound.currentTime = 0;
    hitSound.volume = 0.3;
    hitSound.play().catch(() => {});
  }
};

const playSuccessSound = () => {
  if (successSound) {
    successSound.currentTime = 0;
    successSound.volume = 0.5;
    successSound.play().catch(() => {});
  }
};

const SHIPS: ShipConfig[] = [
  { id: 0, name: "Blaze Ship", price: 0, speed: 1.0, handling: 0.25, color1: "#ff6699", color2: "#ff3366", description: "Starter ship - balanced and reliable" },
  { id: 1, name: "Luna Ship", price: 1000, speed: 1.1, handling: 0.28, color1: "#99bbff", color2: "#6699ff", description: "Cool and steady with +10% speed" },
  { id: 2, name: "Thunder Bolt", price: 2500, speed: 1.3, handling: 0.35, color1: "#ffff00", color2: "#ff8800", description: "Fast! +30% speed, better handling" },
  { id: 3, name: "Shadow Phantom", price: 5000, speed: 1.5, handling: 0.4, color1: "#aa00ff", color2: "#5500aa", description: "Elite! +50% speed, superior handling" },
  { id: 4, name: "Golden Eagle", price: 10000, speed: 1.8, handling: 0.5, color1: "#ffd700", color2: "#ff9900", description: "Legendary! +80% speed, max handling" },
  { id: 5, name: "Cosmic Fury", price: 15000, speed: 2.0, handling: 0.6, color1: "#ff00ff", color2: "#00ff88", description: "Ultimate! 2x speed, best handling" },
];

const WEAPONS: WeaponConfig[] = [
  { id: 0, name: "Basic Blaster", price: 0, fireRate: 15, damage: 1, bulletColor: "#ff00ff", description: "Standard weapon - gets the job done" },
  { id: 1, name: "Rapid Fire", price: 1500, fireRate: 8, damage: 1, bulletColor: "#00ffff", description: "Shoots twice as fast!" },
  { id: 2, name: "Power Cannon", price: 3000, fireRate: 12, damage: 2, bulletColor: "#ff8800", description: "Double damage per hit" },
  { id: 3, name: "Plasma Ray", price: 7500, fireRate: 6, damage: 2, bulletColor: "#00ff00", description: "Fast + powerful combo" },
];

const COLORS: ColorConfig[] = [
  { id: 0, name: "Default", price: 0, color1: "#ff6699", color2: "#ff3366" },
  { id: 1, name: "Ocean Blue", price: 500, color1: "#00ccff", color2: "#0066ff" },
  { id: 2, name: "Toxic Green", price: 500, color1: "#00ff88", color2: "#00aa44" },
  { id: 3, name: "Royal Purple", price: 1000, color1: "#cc66ff", color2: "#8800cc" },
  { id: 4, name: "Sunset Orange", price: 1000, color1: "#ff9933", color2: "#ff5500" },
  { id: 5, name: "Diamond White", price: 2000, color1: "#ffffff", color2: "#aaccff" },
  { id: 6, name: "Midnight Black", price: 2000, color1: "#333344", color2: "#111122" },
  { id: 7, name: "Rainbow Shift", price: 5000, color1: "#ff0088", color2: "#00ffff" },
];

const QUICK_AMOUNTS = ["100", "500", "1000", "2500", "5000"];
const MIN_BET = 100;
const MAX_BET = 10000;

export function RabbitRushApp() {
  const { 
    isConnected, 
    walletAddress, 
    kicksBalance, 
    sendKicksToHouse, 
    refreshBalance,
    transactionState,
    resetTransactionState,
    signMessage,
    signClaimMessage,
    requestKicksFromHouse
  } = useWallet();
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const gameStateRef = useRef<GameState>({
    wager: 0,
    currentMult: 1.0,
    hasShield: false,
    shieldTime: 0,
    gameActive: false,
    hasPickedFirst: false,
    shootCooldown: 0,
    coinsCollected: 0,
    enemiesDestroyed: 0
  });
  
  const blazeImageRef = useRef<HTMLImageElement | null>(null);
  const lunaImageRef = useRef<HTMLImageElement | null>(null);
  const thunderImageRef = useRef<HTMLImageElement | null>(null);
  const shadowImageRef = useRef<HTMLImageElement | null>(null);
  const eagleImageRef = useRef<HTMLImageElement | null>(null);
  const cosmicImageRef = useRef<HTMLImageElement | null>(null);
  
  const [phase, setPhase] = useState<GamePhase>("ship_select");
  const [selectedShip, setSelectedShip] = useState(0);
  const [selectedWeapon, setSelectedWeapon] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);
  const [ownedShips, setOwnedShips] = useState<number[]>([0]);
  const [ownedWeapons, setOwnedWeapons] = useState<number[]>([0]);
  const [ownedColors, setOwnedColors] = useState<number[]>([0]);
  const [shopTab, setShopTab] = useState<"ships" | "weapons" | "colors">("ships");
  const [betAmount, setBetAmount] = useState("100");
  const [displayMult, setDisplayMult] = useState("1.00");
  const [displayKicks, setDisplayKicks] = useState(0);
  const [inGameEarnings, setInGameEarnings] = useState(0);
  const [endMessage, setEndMessage] = useState("");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<"daily" | "weekly">("daily");
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [profileStats, setProfileStats] = useState<{totalRuns: number, runsWon: number, bestMultiplier: string}>({ totalRuns: 0, runsWon: 0, bestMultiplier: "0" });
  
  useEffect(() => {
    const blazeImg = new Image();
    blazeImg.src = '/textures/rabbit-blaze.avif';
    blazeImg.onload = () => { blazeImageRef.current = blazeImg; };
    
    const lunaImg = new Image();
    lunaImg.src = '/textures/rabbit-luna.avif';
    lunaImg.onload = () => { lunaImageRef.current = lunaImg; };
    
    const thunderImg = new Image();
    thunderImg.src = '/textures/rabbit-thunder.avif';
    thunderImg.onload = () => { thunderImageRef.current = thunderImg; };
    
    const shadowImg = new Image();
    shadowImg.src = '/textures/rabbit-shadow.avif';
    shadowImg.onload = () => { shadowImageRef.current = shadowImg; };
    
    const eagleImg = new Image();
    eagleImg.src = '/textures/rabbit-eagle.avif';
    eagleImg.onload = () => { eagleImageRef.current = eagleImg; };
    
    const cosmicImg = new Image();
    cosmicImg.src = '/textures/rabbit-cosmic.avif';
    cosmicImg.onload = () => { cosmicImageRef.current = cosmicImg; };
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (!walletAddress) return;
      try {
        const res = await fetch(`/api/rabbit-rush/profile/${walletAddress}`);
        if (res.ok) {
          const data = await res.json();
          if (data.inventory) {
            setOwnedShips(data.inventory.ownedShips);
            setOwnedWeapons(data.inventory.ownedWeapons);
            setOwnedColors(data.inventory.ownedColors);
            setSelectedShip(data.inventory.selectedShip);
            setSelectedWeapon(data.inventory.selectedWeapon);
            setSelectedColor(data.inventory.selectedColor);
            setProfileStats({
              totalRuns: data.inventory.totalRuns || 0,
              runsWon: data.inventory.runsWon || 0,
              bestMultiplier: data.inventory.bestMultiplier || "0",
            });
          }
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    };
    loadProfile();
  }, [walletAddress]);

  const fetchLeaderboard = async (type: "daily" | "weekly") => {
    try {
      const res = await fetch(`/api/rabbit-rush/leaderboard/${type}?limit=10`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboardData(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  useEffect(() => {
    if (showLeaderboard) {
      fetchLeaderboard(leaderboardTab);
    }
  }, [showLeaderboard, leaderboardTab]);
  
  const currentShip = SHIPS[selectedShip];
  const currentWeapon = WEAPONS[selectedWeapon];
  const currentColor = COLORS[selectedColor];
  
  const rocketRef = useRef({
    x: 0,
    y: 0,
    width: 80,
    height: 120,
    speed: 0,
    targetX: 0,
    trail: [] as { x: number; y: number; alpha: number }[],
    baseSpeed: 12
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

  const handleSelectShip = async (shipId: number) => {
    if (ownedShips.includes(shipId)) {
      setSelectedShip(shipId);
      setPhase("shop");
      if (walletAddress) {
        await fetch('/api/rabbit-rush/equip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress, selectedShip: shipId }),
        });
      }
    }
  };

  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isWagering, setIsWagering] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const handleBuyShip = async (ship: ShipConfig) => {
    if (displayKicks >= ship.price && !ownedShips.includes(ship.id) && !isPurchasing) {
      setIsPurchasing(true);
      try {
        const txHash = await sendKicksToHouse(ship.price.toString());
        if (txHash) {
          setOwnedShips(prev => [...prev, ship.id]);
          await refreshBalance();
          setDisplayKicks(parseFloat(kicksBalance) || 0);
          if (walletAddress) {
            await fetch('/api/rabbit-rush/purchase', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ walletAddress, itemType: 'ship', itemId: ship.id, txHash }),
            });
          }
        }
      } catch (error) {
        console.error('Purchase failed:', error);
      } finally {
        setIsPurchasing(false);
        resetTransactionState();
      }
    }
  };

  const handleBuyWeapon = async (weapon: WeaponConfig) => {
    if (displayKicks >= weapon.price && !ownedWeapons.includes(weapon.id) && !isPurchasing) {
      setIsPurchasing(true);
      try {
        const txHash = await sendKicksToHouse(weapon.price.toString());
        if (txHash) {
          setOwnedWeapons(prev => [...prev, weapon.id]);
          await refreshBalance();
          setDisplayKicks(parseFloat(kicksBalance) || 0);
          if (walletAddress) {
            await fetch('/api/rabbit-rush/purchase', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ walletAddress, itemType: 'weapon', itemId: weapon.id, txHash }),
            });
          }
        }
      } catch (error) {
        console.error('Purchase failed:', error);
      } finally {
        setIsPurchasing(false);
        resetTransactionState();
      }
    }
  };

  const handleBuyColor = async (color: ColorConfig) => {
    if (displayKicks >= color.price && !ownedColors.includes(color.id) && !isPurchasing) {
      setIsPurchasing(true);
      try {
        const txHash = await sendKicksToHouse(color.price.toString());
        if (txHash) {
          setOwnedColors(prev => [...prev, color.id]);
          await refreshBalance();
          setDisplayKicks(parseFloat(kicksBalance) || 0);
          if (walletAddress) {
            await fetch('/api/rabbit-rush/purchase', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ walletAddress, itemType: 'color', itemId: color.id, txHash }),
            });
          }
        }
      } catch (error) {
        console.error('Purchase failed:', error);
      } finally {
        setIsPurchasing(false);
        resetTransactionState();
      }
    }
  };

  const handleEquipWeapon = async (weaponId: number) => {
    if (ownedWeapons.includes(weaponId)) {
      setSelectedWeapon(weaponId);
      if (walletAddress) {
        await fetch('/api/rabbit-rush/equip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress, selectedWeapon: weaponId }),
        });
      }
    }
  };

  const handleEquipColor = async (colorId: number) => {
    if (ownedColors.includes(colorId)) {
      setSelectedColor(colorId);
      if (walletAddress) {
        await fetch('/api/rabbit-rush/equip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress, selectedColor: colorId }),
        });
      }
    }
  };

  const [currentGameId, setCurrentGameId] = useState<number | null>(null);

  const handleStartGame = async () => {
    const betValue = parseFloat(betAmount);
    console.log('[RabbitRush] handleStartGame called, betValue:', betValue, 'isWagering:', isWagering);
    
    if (isNaN(betValue) || betValue < MIN_BET || betValue > Math.min(displayKicks, MAX_BET) || isWagering) {
      console.log('[RabbitRush] Early return - validation failed or already wagering');
      return;
    }
    
    setIsWagering(true);
    resetTransactionState();
    
    try {
      console.log('[RabbitRush] Starting game with bet:', betValue);
      const txHash = await sendKicksToHouse(betValue.toString());
      console.log('[RabbitRush] Transaction hash:', txHash);
      
      if (!txHash) {
        console.log('[RabbitRush] No transaction hash, aborting');
        return;
      }
      
      console.log('[RabbitRush] Calling API to start run');
      const res = await fetch('/api/rabbit-rush/run/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, wager: betValue, depositTxHash: txHash }),
      });
      console.log('[RabbitRush] API response status:', res.status);
      
      if (!res.ok) {
        console.log('[RabbitRush] API error:', res.status);
        return;
      }
      
      const data = await res.json();
      console.log('[RabbitRush] Run started with ID:', data.runId);
      setCurrentGameId(data.runId);
      
      console.log('[RabbitRush] Setting up game state...');
      gameStateRef.current.wager = betValue;
      gameStateRef.current.currentMult = 1.0;
      gameStateRef.current.hasShield = false;
      gameStateRef.current.shieldTime = 0;
      gameStateRef.current.gameActive = true;
      gameStateRef.current.hasPickedFirst = false;
      gameStateRef.current.shootCooldown = 0;
      gameStateRef.current.coinsCollected = 0;
      gameStateRef.current.enemiesDestroyed = 0;
      setInGameEarnings(0);
      
      const canvas = canvasRef.current;
      console.log('[RabbitRush] Canvas ref:', canvas ? 'available' : 'null');
      if (!canvas) {
        console.error('[RabbitRush] Canvas not available');
        return;
      }
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
      
      console.log('[RabbitRush] Setting phase to playing...');
      setDisplayMult("1.00");
      setPhase("playing");
      console.log('[RabbitRush] Game started! Phase set to playing');
      
      requestAnimationFrame(gameLoop);
      
      console.log('[RabbitRush] Refreshing balance in background...');
      refreshBalance().then(() => {
        setDisplayKicks(parseFloat(kicksBalance) || 0);
      });
    } catch (error: any) {
      console.error('[RabbitRush] Failed to start game:', error);
      console.error('[RabbitRush] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      if (error?.code === "ACTION_REJECTED") {
        console.log('[RabbitRush] User rejected transaction');
      }
    } finally {
      setIsWagering(false);
    }
  };

  const saveRunResult = useCallback(async (won: boolean, payout: number, runId?: number) => {
    if (!walletAddress) return;
    try {
      await fetch('/api/rabbit-rush/run/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          runId: runId || currentGameId,
          wager: gameStateRef.current.wager,
          finalMultiplier: gameStateRef.current.currentMult,
          payout,
          coinsCollected: gameStateRef.current.coinsCollected,
          enemiesDestroyed: gameStateRef.current.enemiesDestroyed,
          won,
        }),
      });
    } catch (error) {
      console.error('Failed to save run:', error);
    }
  }, [walletAddress, currentGameId]);

  const handleCashout = useCallback(async () => {
    if (!gameStateRef.current.gameActive || !gameStateRef.current.hasPickedFirst || isClaiming) return;
    
    const mult = gameStateRef.current.currentMult;
    const coinsBonus = gameStateRef.current.coinsCollected;
    const payout = Math.floor(gameStateRef.current.wager * mult) + coinsBonus;
    
    gameStateRef.current.gameActive = false;
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    
    setIsClaiming(true);
    setEndMessage(`Processing cashout...`);
    setPhase("ended");
    
    try {
      await saveRunResult(true, payout);
      
      const authMessage = `Request Rabbit Rush claim nonce for run ${currentGameId}`;
      const authSignature = await signMessage(authMessage);
      if (!authSignature) {
        setEndMessage(`Claim cancelled. Won ${payout.toLocaleString()} KICKS - claim manually later.`);
        return;
      }
      
      const nonceRes = await fetch(`/api/rabbit-rush/run/${currentGameId}/claim-nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, authSignature }),
      });
      if (!nonceRes.ok) {
        const errorData = await nonceRes.json();
        throw new Error(errorData.error || 'Failed to get claim nonce');
      }
      const { nonce, expectedPayout } = await nonceRes.json();
      const serverPayout = parseInt(expectedPayout);
      
      setEndMessage(`Claiming ${serverPayout.toLocaleString()} KICKS...`);
      
      const signature = await signClaimMessage(expectedPayout, currentGameId || 0, nonce, "rabbit-rush");
      if (!signature) {
        setEndMessage(`Claim cancelled. Won ${serverPayout.toLocaleString()} KICKS - claim manually later.`);
        return;
      }
      
      const claimed = await requestKicksFromHouse(expectedPayout, currentGameId || 0, signature, nonce, "rabbit-rush");
      
      if (claimed) {
        await refreshBalance();
        playSuccessSound();
        setEndMessage(`CASHED OUT AT ${mult.toFixed(2)}x! Won ${serverPayout.toLocaleString()} KICKS!`);
      } else {
        setEndMessage(`Claim failed. Contact support with game ID: ${currentGameId}`);
      }
    } catch (error: any) {
      console.error('Cashout error:', error);
      setEndMessage(`Error: ${error.message || 'Claim failed'}. Contact support.`);
    } finally {
      setIsClaiming(false);
      resetTransactionState();
    }
  }, [saveRunResult, currentGameId, isClaiming, signMessage, signClaimMessage, requestKicksFromHouse, refreshBalance, resetTransactionState, walletAddress]);

  const endGame = useCallback((message: string) => {
    gameStateRef.current.gameActive = false;
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    saveRunResult(false, 0);
    setEndMessage(message);
    setPhase("ended");
  }, [saveRunResult]);

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
      powerupsRef.current.push({
        x: Math.random() * (canvas.width - 100) + 50,
        y: scrollY - 100,
        type: 'shield',
        emoji: '🛡️',
        color: '#00ffff',
        size: 45,
        pulse: 0
      });
    }
    
    if (Math.random() < 0.03) {
      obstaclesRef.current.push({
        x: Math.random() * (canvas.width - 120) + 60,
        y: scrollY - 100,
        size: 80,
        hp: 2,
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
    
    scrollYRef.current -= 8;
    frameCountRef.current++;
    
    const dx = rocket.targetX - rocket.x;
    rocket.x += dx * currentShip.handling * currentShip.speed;
    rocket.x = Math.max(50, Math.min(canvas.width - 50, rocket.x));
    
    gs.shootCooldown--;
    if (gs.shootCooldown <= 0) {
      bulletsRef.current.push({
        x: rocket.x,
        y: rocket.y - 40,
        vy: -15 * currentShip.speed,
        fromPlayer: true,
        damage: currentWeapon.damage,
        color: currentWeapon.bulletColor
      });
      gs.shootCooldown = currentWeapon.fireRate;
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
      ctx.fillStyle = currentColor.color2;
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
    gradient.addColorStop(0, currentColor.color1);
    gradient.addColorStop(1, currentColor.color2);
    
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
    ctx.arc(rocket.x, rocket.y + 50, 20, 0, Math.PI * 2);
    ctx.fill();
    
    const rabbitImages = [blazeImageRef.current, lunaImageRef.current, thunderImageRef.current, shadowImageRef.current, eagleImageRef.current, cosmicImageRef.current];
    const rabbitImg = rabbitImages[selectedShip] || null;
    if (rabbitImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(rocket.x, rocket.y + 50, 18, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(rabbitImg, rocket.x - 18, rocket.y + 32, 36, 36);
      ctx.restore();
    }
    
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
        playSuccessSound();
        
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
        setInGameEarnings(prev => prev + c.value);
        gs.coinsCollected += c.value;
        gs.hasPickedFirst = true;
        playSuccessSound();
        
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
        gs.hasPickedFirst = true;
        if (p.type === 'shield') {
          gs.hasShield = true;
          gs.shieldTime = 400;
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
      
      ctx.fillStyle = '#330000';
      ctx.fillRect(o.x - 30, oy + o.size/2 + 8, 60, 6);
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(o.x - 30, oy + o.size/2 + 8, (o.hp / 2) * 60, 6);
      
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
      if (e.shootTimer > 45) {
        e.shootTimer = 0;
        bulletsRef.current.push({
          x: e.x,
          y: ey + 20,
          vy: 12,
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
      
      ctx.fillStyle = b.fromPlayer ? (b.color || currentWeapon.bulletColor) : '#ff0000';
      ctx.shadowColor = b.fromPlayer ? (b.color || currentWeapon.bulletColor) : '#ff0000';
      ctx.shadowBlur = 10;
      ctx.fillRect(b.x - 4, b.y - 10, 8, 20);
      ctx.shadowBlur = 0;
      
      if (b.fromPlayer) {
        let bulletHit = false;
        
        for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
          const e = enemiesRef.current[j];
          const ey = e.y - scrollYRef.current;
          if (Math.abs(b.x - e.x) < 35 && Math.abs(b.y - ey) < 35) {
            e.hp -= (b.damage || currentWeapon.damage);
            bulletsRef.current.splice(i, 1);
            bulletHit = true;
            playHitSound();
            
            if (e.hp <= 0) {
              setInGameEarnings(prev => prev + 100);
              gameStateRef.current.enemiesDestroyed++;
              gameStateRef.current.hasPickedFirst = true;
              
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
        
        if (!bulletHit) {
          for (let j = obstaclesRef.current.length - 1; j >= 0; j--) {
            const o = obstaclesRef.current[j];
            const oy = o.y - scrollYRef.current;
            if (Math.abs(b.x - o.x) < 45 && Math.abs(b.y - oy) < 45) {
              o.hp -= (b.damage || currentWeapon.damage);
              bulletsRef.current.splice(i, 1);
              playHitSound();
              
              if (o.hp <= 0) {
                setInGameEarnings(prev => prev + 50);
                gameStateRef.current.hasPickedFirst = true;
                
                for (let k = 0; k < 20; k++) {
                  particlesRef.current.push({
                    x: o.x,
                    y: oy,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    life: 30,
                    color: '#666688'
                  });
                }
                obstaclesRef.current.splice(j, 1);
              }
              break;
            }
          }
        }
      } else {
        if (Math.abs(b.x - rocket.x) < 30 && Math.abs(b.y - rocket.y) < 50) {
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
    if (bulletsRef.current.length > 30) {
      bulletsRef.current = bulletsRef.current.slice(-30);
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
    if (particlesRef.current.length > 50) {
      particlesRef.current = particlesRef.current.slice(-50);
    }
    
    if (gs.gameActive) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
  }, [currentShip, currentWeapon, currentColor, endGame, spawnStuff]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const getCanvasX = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      return (clientX - rect.left) * (canvas.width / rect.width);
    };
    
    const handleTouchStart = (e: TouchEvent) => {
      if (phase !== "playing") return;
      e.preventDefault();
      rocketRef.current.targetX = getCanvasX(e.touches[0].clientX);
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (phase !== "playing") return;
      e.preventDefault();
      rocketRef.current.targetX = getCanvasX(e.touches[0].clientX);
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (phase !== "playing") return;
      if (e.buttons === 1) rocketRef.current.targetX = getCanvasX(e.clientX);
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      if (phase !== "playing") return;
      rocketRef.current.targetX = getCanvasX(e.clientX);
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
    <div className="relative w-screen h-screen overflow-hidden touch-none select-none">
      <canvas ref={canvasRef} className="absolute inset-0 touch-none" style={{ touchAction: 'none' }} />
      
      <div className="absolute top-4 right-4 z-20 bg-black/70 px-3 py-2 rounded-xl border-2 border-pink-500 shadow-lg shadow-pink-500/30">
        <span className="text-white font-bold text-sm md:text-base">
          {phase === "playing" 
            ? `Bet: ${gameStateRef.current.wager.toLocaleString()} | +${inGameEarnings.toLocaleString()}` 
            : `${displayKicks.toLocaleString()} KICKS`}
        </span>
      </div>

      {(isPurchasing || isWagering || isClaiming || transactionState.status !== "idle") && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-pink-500/50 rounded-2xl p-6 max-w-sm w-full mx-4 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              {isPurchasing ? "Processing Purchase..." : 
               isWagering ? "Starting Game..." : 
               isClaiming ? "Claiming Winnings..." : 
               "Processing..."}
            </h3>
            <p className="text-gray-400">
              {transactionState.message || "Please confirm in your wallet"}
            </p>
            {transactionState.status === "error" && (
              <p className="text-red-400 mt-2">{transactionState.message}</p>
            )}
          </div>
        </div>
      )}

      {phase === "playing" && (
        <>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
            <div className="text-4xl font-bold text-white animate-pulse">
              {displayMult}x
            </div>
          </div>
          
          <button
            onClick={handleCashout}
            className={`absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-20 w-11/12 max-w-md h-14 md:h-16 text-lg md:text-xl font-bold rounded-xl transition-all active:scale-95 ${
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
            className="absolute inset-0 bg-black/95 flex flex-col items-center justify-start gap-4 z-30 p-4 overflow-y-auto"
          >
            <button
              onClick={() => setLocation("/")}
              className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-lg border border-pink-500/30 text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Games</span>
            </button>

            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400 bg-clip-text text-transparent mt-12">
              RABBIT RUSH
            </h1>
            
            <div className="flex gap-4 bg-black/60 px-4 py-2 rounded-xl border border-pink-500/30">
              <div className="text-center">
                <div className="text-lg font-bold text-white">{profileStats.totalRuns}</div>
                <div className="text-xs text-gray-400">Runs</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-400">{profileStats.runsWon}</div>
                <div className="text-xs text-gray-400">Wins</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-400">{parseFloat(profileStats.bestMultiplier).toFixed(2)}x</div>
                <div className="text-xs text-gray-400">Best</div>
              </div>
              <button
                onClick={() => setShowLeaderboard(true)}
                className="ml-2 px-3 py-1 bg-pink-500 hover:bg-pink-600 rounded-lg text-white text-sm font-bold transition-colors"
              >
                Leaderboard
              </button>
            </div>
            
            <p className="text-pink-300">Choose your ship!</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
              {SHIPS.map(ship => {
                const owned = ownedShips.includes(ship.id);
                const canBuy = displayKicks >= ship.price;
                return (
                  <div
                    key={ship.id}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      owned 
                        ? "border-green-500 bg-green-900/20 hover:bg-green-900/40" 
                        : canBuy 
                          ? "border-yellow-500 bg-yellow-900/20 hover:bg-yellow-900/40"
                          : "border-gray-600 bg-gray-900/20 opacity-60"
                    }`}
                    onClick={() => owned ? handleSelectShip(ship.id) : canBuy && handleBuyShip(ship)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="w-10 h-10 rounded-full"
                        style={{ background: `linear-gradient(135deg, ${ship.color1}, ${ship.color2})` }}
                      />
                      <div>
                        <h3 className="font-bold text-white">{ship.name}</h3>
                        <p className="text-xs text-gray-400">{ship.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        Speed: {Math.round(ship.speed * 100)}% | Handling: {Math.round(ship.handling * 100)}%
                      </div>
                      {owned ? (
                        <span className="text-green-400 text-sm font-bold">SELECT</span>
                      ) : (
                        <span className="text-yellow-400 text-sm font-bold">{ship.price.toLocaleString()} KICKS</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {phase === "shop" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/95 flex flex-col items-center gap-4 z-30 p-4 overflow-y-auto"
          >
            <button
              onClick={() => setPhase("ship_select")}
              className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-lg border border-pink-500/30 text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Change Ship</span>
            </button>

            <h2 className="text-2xl font-bold text-white mt-12 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              SHOP
            </h2>
            
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setShopTab("weapons")}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${shopTab === "weapons" ? "bg-pink-500" : "bg-gray-700"} text-white`}
              >
                <Crosshair className="w-4 h-4" /> Weapons
              </button>
              <button
                onClick={() => setShopTab("colors")}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${shopTab === "colors" ? "bg-pink-500" : "bg-gray-700"} text-white`}
              >
                <Palette className="w-4 h-4" /> Colors
              </button>
            </div>

            <div className="w-full max-w-md">
              {shopTab === "weapons" && (
                <div className="grid gap-3">
                  {WEAPONS.map(weapon => {
                    const owned = ownedWeapons.includes(weapon.id);
                    const equipped = selectedWeapon === weapon.id;
                    const canBuy = displayKicks >= weapon.price;
                    return (
                      <div
                        key={weapon.id}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          equipped ? "border-purple-500 bg-purple-900/30" :
                          owned ? "border-green-500 bg-green-900/20 hover:bg-green-900/40" : 
                          canBuy ? "border-yellow-500 bg-yellow-900/20 hover:bg-yellow-900/40" :
                          "border-gray-600 bg-gray-900/20 opacity-60"
                        }`}
                        onClick={() => owned ? handleEquipWeapon(weapon.id) : canBuy && handleBuyWeapon(weapon)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-white">{weapon.name}</h3>
                            <p className="text-xs text-gray-400">{weapon.description}</p>
                            <p className="text-xs mt-1" style={{ color: weapon.bulletColor }}>
                              Fire Rate: {Math.round(60 / weapon.fireRate)}/sec | Damage: {weapon.damage}
                            </p>
                          </div>
                          {equipped ? (
                            <span className="text-purple-400 text-sm font-bold">EQUIPPED</span>
                          ) : owned ? (
                            <span className="text-green-400 text-sm font-bold">EQUIP</span>
                          ) : (
                            <span className="text-yellow-400 text-sm font-bold">{weapon.price.toLocaleString()} KICKS</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {shopTab === "colors" && (
                <div className="grid grid-cols-2 gap-3">
                  {COLORS.map(color => {
                    const owned = ownedColors.includes(color.id);
                    const equipped = selectedColor === color.id;
                    const canBuy = displayKicks >= color.price;
                    return (
                      <div
                        key={color.id}
                        className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
                          equipped ? "border-purple-500 bg-purple-900/30" :
                          owned ? "border-green-500 bg-green-900/20 hover:bg-green-900/40" : 
                          canBuy ? "border-yellow-500 bg-yellow-900/20 hover:bg-yellow-900/40" :
                          "border-gray-600 bg-gray-900/20 opacity-60"
                        }`}
                        onClick={() => owned ? handleEquipColor(color.id) : canBuy && handleBuyColor(color)}
                      >
                        <div 
                          className="w-full h-10 rounded-lg mb-2"
                          style={{ background: `linear-gradient(135deg, ${color.color1}, ${color.color2})` }}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium">{color.name}</span>
                          {equipped ? (
                            <span className="text-purple-400 text-xs">✓</span>
                          ) : owned ? (
                            <span className="text-green-400 text-xs">EQUIP</span>
                          ) : (
                            <span className="text-yellow-400 text-xs">{color.price}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              onClick={() => setPhase("betting")}
              className="mt-4 text-xl px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              <Zap className="w-6 h-6 mr-2" />
              READY TO PLAY
            </Button>
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
              onClick={() => setPhase("shop")}
              className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-lg border border-pink-500/30 text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Shop</span>
            </button>

            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
              RABBIT RUSH
            </h1>
            
            <div className="text-center mb-2">
              <p className="text-gray-400 text-sm">Ship: <span className="text-pink-400">{currentShip.name}</span></p>
              <p className="text-gray-400 text-sm">Weapon: <span className="text-cyan-400">{currentWeapon.name}</span></p>
            </div>
            
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
              disabled={isWagering || parseFloat(betAmount) < MIN_BET || parseFloat(betAmount) > Math.min(displayKicks, MAX_BET)}
              className="text-xl px-8 py-4 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 disabled:opacity-50"
            >
              {isWagering ? (
                <>
                  <div className="w-6 h-6 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Rocket className="w-6 h-6 mr-2" />
                  BLAST OFF
                </>
              )}
            </Button>
            
            {transactionState.status !== "idle" && transactionState.message && (
              <p className={`text-sm ${transactionState.status === "error" ? "text-red-400" : "text-yellow-400"}`}>
                {transactionState.message}
              </p>
            )}
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

      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900 border border-pink-500/50 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setLeaderboardTab("daily")}
                className={`flex-1 py-2 rounded-lg font-bold ${leaderboardTab === "daily" ? "bg-pink-500 text-white" : "bg-gray-700 text-gray-300"}`}
              >
                Daily
              </button>
              <button
                onClick={() => setLeaderboardTab("weekly")}
                className={`flex-1 py-2 rounded-lg font-bold ${leaderboardTab === "weekly" ? "bg-pink-500 text-white" : "bg-gray-700 text-gray-300"}`}
              >
                Weekly
              </button>
            </div>
            
            <div className="space-y-2">
              {leaderboardData.length === 0 ? (
                <div className="text-center text-gray-400 py-8">No scores yet. Be the first!</div>
              ) : (
                leaderboardData.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      index === 0 ? "bg-yellow-500/20 border border-yellow-500/50" :
                      index === 1 ? "bg-gray-400/20 border border-gray-400/50" :
                      index === 2 ? "bg-orange-700/20 border border-orange-700/50" :
                      "bg-gray-800"
                    }`}
                  >
                    <div className={`w-8 h-8 flex items-center justify-center font-bold rounded-full ${
                      index === 0 ? "bg-yellow-500 text-black" :
                      index === 1 ? "bg-gray-400 text-black" :
                      index === 2 ? "bg-orange-700 text-white" :
                      "bg-gray-700 text-gray-300"
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-white">{entry.user?.username || 'Unknown'}</div>
                      <div className="text-xs text-gray-400">{entry.runsPlayed} runs</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-400">{parseFloat(entry.totalWinnings).toLocaleString()} KICKS</div>
                      <div className="text-xs text-yellow-400">Best: {parseFloat(entry.bestMultiplier).toFixed(2)}x</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
