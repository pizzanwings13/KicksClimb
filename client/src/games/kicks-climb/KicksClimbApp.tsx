import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { useLocation } from "wouter";

import { GameBoard } from "@/components/game/GameBoard";
import { Player } from "@/components/game/Player";
import { Lights } from "@/components/game/Lights";
import { GameCamera } from "@/components/game/GameCamera";
import { ParticleEffectsManager } from "@/components/game/ParticleEffects";
import { MenuScreen } from "@/components/game/MenuScreen";
import { BettingScreen } from "@/components/game/BettingScreen";
import { GameHUD } from "@/components/game/GameHUD";
import { LeaderboardButton } from "@/components/game/Leaderboard";
import { SoundControls } from "@/components/game/SoundControls";
import { MobileNavigation } from "@/components/game/MobileNavigation";
import { useGameState } from "@/lib/stores/useGameState";
import { useWallet } from "@/lib/stores/useWallet";
import { ArrowLeft } from "lucide-react";

function SkyBackdrop() {
  return (
    <mesh position={[0, -5, -150]} rotation={[0, 0, 0]}>
      <planeGeometry args={[600, 100]} />
      <meshBasicMaterial color="#87CEEB" />
    </mesh>
  );
}

function GameScene() {
  const { phase } = useGameState();
  const showGame = phase !== "menu" && phase !== "betting";

  return (
    <>
      <Lights />
      <GameCamera />
      <SkyBackdrop />
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

function BackToHubButton() {
  const [, setLocation] = useLocation();
  const { phase, setPhase } = useGameState();
  
  const handleBack = () => {
    if (phase === "menu" || phase === "betting") {
      setLocation("/");
    } else {
      setPhase("menu");
    }
  };

  if (phase !== "menu" && phase !== "betting") return null;

  return (
    <button
      onClick={handleBack}
      className="fixed top-4 left-4 z-[100] flex items-center gap-2 px-4 py-2 bg-amber-900/80 hover:bg-amber-800 backdrop-blur-sm rounded-lg border border-amber-500/50 text-amber-100 transition-colors touch-manipulation"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <ArrowLeft className="w-4 h-4" />
      <span>Back to Port</span>
    </button>
  );
}

export function TreasureQuestApp() {
  const [isMobile, setIsMobile] = useState(false);
  const { phase } = useGameState();
  const { isConnected } = useWallet();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isConnected) {
      setLocation("/");
    }
  }, [isConnected, setLocation]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isConnected) {
    return null;
  }

  const showCanvas = phase !== "menu" && phase !== "betting";

  return (
    <div style={{ 
      width: '100vw', 
      height: '100dvh', 
      position: 'relative', 
      overflow: 'hidden',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)'
    }}>
      <BackToHubButton />
      
      {showCanvas && (
        <Canvas
          shadows
          camera={{
            position: isMobile ? [0, 8, 10] : [0, 6, 8],
            fov: isMobile ? 65 : 55,
            near: 0.1,
            far: 1000
          }}
          gl={{
            antialias: !isMobile,
            powerPreference: isMobile ? "low-power" : "default"
          }}
          style={{
            background: 'linear-gradient(to bottom, #87CEEB 0%, #4FC3F7 30%, #0288D1 60%, #01579B 100%)'
          }}
        >
          <color attach="background" args={["#4FC3F7"]} />
          <fog attach="fog" args={["#87CEEB", 50, 200]} />
          <GameScene />
        </Canvas>
      )}

      <MenuScreen />
      <BettingScreen />
      <GameHUD />
      <LeaderboardButton />
      <SoundControls />
      <MobileNavigation />
    </div>
  );
}
