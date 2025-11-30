import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import "@fontsource/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

import { GameBoard } from "./components/game/GameBoard";
import { Player } from "./components/game/Player";
import { Lights } from "./components/game/Lights";
import { GameCamera } from "./components/game/GameCamera";
import { ParticleEffectsManager } from "./components/game/ParticleEffects";
import { MenuScreen } from "./components/game/MenuScreen";
import { BettingScreen } from "./components/game/BettingScreen";
import { GameHUD } from "./components/game/GameHUD";
import { LeaderboardButton } from "./components/game/Leaderboard";
import { ProfileButton } from "./components/game/ProfileModal";
import { TokenConfigButton } from "./components/game/TokenConfig";
import { SoundControls } from "./components/game/SoundControls";
import { StatsButton } from "./components/game/StatsModal";
import { AchievementsButton } from "./components/game/AchievementsModal";
import { AchievementNotification } from "./components/game/AchievementNotification";
import { WalletConnectModal } from "./components/game/WalletConnectModal";
import { useGameState } from "./lib/stores/useGameState";
import { useWallet } from "./lib/stores/useWallet";
import { useAudio } from "./lib/stores/useAudio";
import { useSoundEffects } from "./lib/hooks/useSoundEffects";
import { WalletType } from "./lib/wagmi-config";

function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-purple-900 via-indigo-900 to-black flex items-center justify-center z-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Loading...</h2>
        <p className="text-gray-400">Preparing your adventure</p>
      </div>
    </div>
  );
}

function GameScene() {
  const { phase } = useGameState();
  const showGame = phase !== "menu" && phase !== "betting";

  return (
    <>
      <Lights />
      <GameCamera />
      {showGame && (
        <Suspense fallback={null}>
          <GameBoard />
          <Player />
          <ParticleEffectsManager />
        </Suspense>
      )}
    </>
  );
}

function SoundManager() {
  const { setBackgroundMusic, setHitSound, setSuccessSound } = useAudio();

  useEffect(() => {
    const bgMusic = new Audio("/sounds/background.mp3");
    bgMusic.loop = true;
    bgMusic.volume = 0.3;
    setBackgroundMusic(bgMusic);

    const hit = new Audio("/sounds/hit.mp3");
    hit.volume = 0.5;
    setHitSound(hit);

    const success = new Audio("/sounds/success.mp3");
    success.volume = 0.5;
    setSuccessSound(success);

    return () => {
      bgMusic.pause();
    };
  }, [setBackgroundMusic, setHitSound, setSuccessSound]);

  return null;
}

function WalletInitializer() {
  const { setTokenAddresses } = useWallet();
  const { connectUser, fetchLeaderboards } = useGameState();
  const { walletAddress, isConnected } = useWallet();

  useEffect(() => {
    const savedKicksAddress = localStorage.getItem('kicksTokenAddress') || "";
    const savedHouseAddress = localStorage.getItem('houseWalletAddress') || "";
    if (savedKicksAddress || savedHouseAddress) {
      setTokenAddresses(savedKicksAddress, savedHouseAddress);
    }
  }, [setTokenAddresses]);

  useEffect(() => {
    if (isConnected && walletAddress) {
      connectUser(walletAddress);
      fetchLeaderboards();
    }
  }, [isConnected, walletAddress, connectUser, fetchLeaderboards]);

  return null;
}

function WalletModalManager() {
  const { 
    showWalletModal, 
    setShowWalletModal, 
    connect, 
    isConnecting, 
    connectingWallet, 
    error 
  } = useWallet();

  const handleSelectWallet = async (walletType: WalletType) => {
    await connect(walletType);
  };

  return (
    <WalletConnectModal
      isOpen={showWalletModal}
      onClose={() => setShowWalletModal(false)}
      onSelectWallet={handleSelectWallet}
      isConnecting={isConnecting}
      connectingWallet={connectingWallet}
      error={error}
    />
  );
}

function SoundEffectsManager() {
  useSoundEffects();
  return null;
}

function AchievementsManager() {
  const { phase, checkAchievements, currentGame } = useGameState();
  const { walletAddress } = useWallet();
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const lastCheckedGameRef = useRef<number | null>(null);
  const checkInProgressRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const endPhases = ["won", "lost", "cashed_out"];
    const isEndPhase = endPhases.includes(phase);
    const gameId = currentGame?.id;
    
    if (isEndPhase && walletAddress && gameId && lastCheckedGameRef.current !== gameId && !checkInProgressRef.current) {
      lastCheckedGameRef.current = gameId;
      checkInProgressRef.current = true;
      
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      
      const doCheck = async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 2000));
          if (signal.aborted) return;
          
          const achievements = await checkAchievements(walletAddress);
          if (!signal.aborted && achievements.length > 0) {
            setNewAchievements(achievements);
          }
        } catch (error) {
          if (!signal.aborted) {
            console.error("Failed to check achievements:", error);
          }
        } finally {
          checkInProgressRef.current = false;
        }
      };
      
      doCheck();
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [phase, walletAddress, checkAchievements, currentGame?.id]);

  const handleAchievementsComplete = useCallback(() => {
    setNewAchievements([]);
  }, []);

  if (newAchievements.length === 0) return null;

  return (
    <AchievementNotification 
      achievements={newAchievements} 
      onComplete={handleAchievementsComplete} 
    />
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const { phase } = useGameState();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  const showCanvas = phase !== "menu" && phase !== "betting";

  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
        <WalletInitializer />
        <SoundManager />
        <SoundEffectsManager />
        <AchievementsManager />
        
        {showCanvas && (
          <Canvas
            shadows
            camera={{
              position: [0, 12, 15],
              fov: 50,
              near: 0.1,
              far: 1000
            }}
            gl={{
              antialias: true,
              powerPreference: "default"
            }}
            style={{
              background: 'linear-gradient(to bottom, #1a1a2e, #16213e, #0f0f23)'
            }}
          >
            <color attach="background" args={["#0f0f23"]} />
            <fog attach="fog" args={["#0f0f23", 20, 50]} />
            <GameScene />
          </Canvas>
        )}

        <MenuScreen />
        <BettingScreen />
        <GameHUD />
        <ProfileButton />
        <StatsButton />
        <LeaderboardButton />
        <AchievementsButton />
        <TokenConfigButton />
        <SoundControls />
        <WalletModalManager />
      </div>
    </QueryClientProvider>
  );
}

export default App;
