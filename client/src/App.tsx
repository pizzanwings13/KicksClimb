import { useEffect, useState } from "react";
import { Route, Switch } from "wouter";
import "@fontsource/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

import { GameHub } from "./pages/GameHub";
import DashvilleApp from "./games/dashville/DashvilleApp";
import { RabbitRushApp } from "./games/rabbit-rush/RabbitRushApp";
import { EndlessRunnerApp } from "./games/endless-runner/EndlessRunnerApp";
import { BunnyBladeApp } from "./games/bunny-blade/BunnyBladeApp";
import NotFound from "./pages/not-found";
import { WalletConnectModal } from "./components/game/WalletConnectModal";
import { useWallet } from "./lib/stores/useWallet";
import { useGameState } from "./lib/stores/useGameState";
import { useAudio } from "./lib/stores/useAudio";
import { useSoundEffects } from "./lib/hooks/useSoundEffects";
import { WalletType } from "./lib/wagmi-config";
import { ConnectWalletPage } from "./pages/ConnectWalletPage";

function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-purple-900 via-indigo-900 to-black flex items-center justify-center z-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Loading...</h2>
        <p className="text-gray-400">Preparing Token Rush</p>
      </div>
    </div>
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
    const defaultKicksAddress = "0x79F8f881dD05c93Ca230F7E912ae33f7ECAf0d60";
    const defaultHouseAddress = "0xb7AF40c853c20C806EA945EEb5F0f2447b2C02f5";
    
    const savedKicksAddress = localStorage.getItem('kicksTokenAddress') || defaultKicksAddress;
    const savedHouseAddress = localStorage.getItem('houseWalletAddress') || defaultHouseAddress;
    
    setTokenAddresses(savedKicksAddress, savedHouseAddress);
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

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected } = useWallet();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WalletInitializer />
      <SoundManager />
      <SoundEffectsManager />
      <WalletModalManager />
      
      <Switch>
        <Route path="/dashville">
          <DashvilleApp />
        </Route>
        <Route path="/rabbit-rush">
          <RabbitRushApp />
        </Route>
        <Route path="/endless-runner">
          <EndlessRunnerApp />
        </Route>
        <Route path="/bunny-blade">
          <BunnyBladeApp />
        </Route>
        <Route path="/">
          {isConnected ? <GameHub /> : <ConnectWalletPage />}
        </Route>
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </QueryClientProvider>
  );
}

export default App;
