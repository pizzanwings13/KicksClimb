import { useState, useEffect } from "react";
import { useWallet } from "@/lib/stores/useWallet";
import { useGameState } from "@/lib/stores/useGameState";
import { Button } from "@/components/ui/button";
import { Wallet, Trophy, User, Anchor, Ship, Skull, Compass } from "lucide-react";

export function MenuScreen() {
  const { isConnected, isConnecting, walletAddress, kicksBalance, setShowWalletModal, error, connectedWalletType } = useWallet();
  const { phase, setPhase, connectUser, user, fetchLeaderboards } = useGameState();
  const [displayUsername, setDisplayUsername] = useState<string>('');
  
  useEffect(() => {
    const globalUsername = localStorage.getItem('tokenrush_global_username');
    if (globalUsername) {
      setDisplayUsername(globalUsername);
    } else if (user?.username && !user.username.startsWith('Player_')) {
      setDisplayUsername(user.username);
    }
  }, [user]);

  if (phase !== "menu") return null;

  const handleConnect = () => {
    setShowWalletModal(true);
  };

  const handlePlay = () => {
    setPhase("betting");
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        background: 'linear-gradient(to bottom, #FF7F50 0%, #FF6347 25%, #1E90FF 60%, #0D47A1 100%)'
      }}
    >
      <div className="text-center p-8 max-w-md w-full">
        <div className="mb-8">
          <div className="flex justify-center mb-4">
            <Ship className="w-16 h-16 text-amber-300 drop-shadow-lg" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 mb-2 drop-shadow-lg"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
          >
            DASHKIDS
          </h1>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
          >
            Treasure Quest
          </h2>
          <p className="text-amber-100 text-lg">Sail the Seas for Glory!</p>
        </div>

        <div className="bg-amber-900/60 backdrop-blur-sm rounded-2xl p-6 mb-6 border-2 border-amber-600/50"
          style={{ boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.1)' }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Compass className="w-6 h-6 text-amber-300" />
            <span className="text-amber-100 font-semibold">How to Play</span>
          </div>
          <ul className="text-amber-100 text-sm text-left space-y-2">
            <li className="flex items-start gap-2">
              <Anchor className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <span>Connect your ApeChain wallet and wager KICKS tokens</span>
            </li>
            <li className="flex items-start gap-2">
              <Ship className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <span>Roll the dice and sail across 100 sea tiles</span>
            </li>
            <li className="flex items-start gap-2">
              <Trophy className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <span>Land on treasure (2x-10x) to boost your bounty!</span>
            </li>
            <li className="flex items-start gap-2">
              <Skull className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <span>Avoid sea monsters or lose your treasure!</span>
            </li>
            <li className="flex items-start gap-2">
              <Compass className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>Claim any time or reach the island for 10x!</span>
            </li>
          </ul>
        </div>

        {!isConnected ? (
          <div className="space-y-4">
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full py-6 text-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-amber-900 font-bold rounded-xl shadow-lg shadow-amber-500/30 border-2 border-amber-400"
            >
              <Wallet className="mr-2 h-5 w-5" />
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
            {error && (
              <p className="text-red-300 text-sm bg-red-900/50 rounded-lg p-2">{error}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-900/60 backdrop-blur-sm rounded-xl p-4 border-2 border-emerald-500/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-400" />
                  <span className="text-amber-100 text-sm">
                    {displayUsername || `${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)}`}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-amber-200">KICKS Balance</p>
                  <p className="text-lg font-bold text-yellow-400">
                    {parseFloat(kicksBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handlePlay}
              className="w-full py-6 text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 border-2 border-emerald-400"
            >
              <Ship className="mr-2 h-5 w-5" />
              Set Sail!
            </Button>

            <Button
              variant="outline"
              className="hidden sm:flex w-full py-4 border-amber-500/50 text-amber-200 hover:bg-amber-500/20 bg-amber-900/40"
              onClick={() => fetchLeaderboards()}
            >
              <Trophy className="mr-2 h-5 w-5" />
              View Leaderboards
            </Button>
          </div>
        )}

        <div className="mt-8 mb-20 sm:mb-8 flex justify-center gap-6 text-sm text-amber-200">
          <div className="text-center">
            <div className="w-6 h-6 rounded-full bg-yellow-500 mx-auto mb-1 flex items-center justify-center text-xs">
              <span>$</span>
            </div>
            <span>Treasure</span>
          </div>
          <div className="text-center">
            <div className="w-6 h-6 rounded-full bg-red-500 mx-auto mb-1 flex items-center justify-center">
              <Skull className="w-4 h-4 text-white" />
            </div>
            <span>Monster</span>
          </div>
          <div className="text-center">
            <div className="w-6 h-6 rounded-full bg-emerald-500 mx-auto mb-1 flex items-center justify-center">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <span>Island</span>
          </div>
        </div>
      </div>
    </div>
  );
}
