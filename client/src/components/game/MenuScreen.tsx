import { useState, useEffect } from "react";
import { useWallet } from "@/lib/stores/useWallet";
import { useGameState } from "@/lib/stores/useGameState";
import { Button } from "@/components/ui/button";
import { Wallet, Trophy, User, Gamepad2 } from "lucide-react";

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
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-purple-900/90 via-indigo-900/90 to-black/95 z-50">
      <div className="text-center p-8 max-w-md w-full">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-2">
            KICKS CLIMB
          </h1>
          <p className="text-gray-300 text-lg">100 Steps to Glory</p>
        </div>

        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-purple-500/30">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Gamepad2 className="w-6 h-6 text-purple-400" />
            <span className="text-white font-semibold">How to Play</span>
          </div>
          <ul className="text-gray-300 text-sm text-left space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-400">1.</span>
              <span>Connect your ApeChain wallet and wager KICKS tokens</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">2.</span>
              <span>Roll the dice and climb 100 steps</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">3.</span>
              <span>Land on multipliers (2x-10x) to boost your winnings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400">4.</span>
              <span>Avoid hazards or lose what you wager!</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400">5.</span>
              <span>Claim any time or reach step 100 for 10x!</span>
            </li>
          </ul>
        </div>

        {!isConnected ? (
          <div className="space-y-4">
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full py-6 text-lg bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30"
            >
              <Wallet className="mr-2 h-5 w-5" />
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-green-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300 text-sm">
                    {displayUsername || `${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)}`}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">KICKS Balance</p>
                  <p className="text-lg font-bold text-yellow-400">
                    {parseFloat(kicksBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handlePlay}
              className="w-full py-6 text-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/30"
            >
              <Gamepad2 className="mr-2 h-5 w-5" />
              Start Game
            </Button>

            <Button
              variant="outline"
              className="hidden sm:flex w-full py-4 border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
              onClick={() => fetchLeaderboards()}
            >
              <Trophy className="mr-2 h-5 w-5" />
              View Leaderboards
            </Button>
          </div>
        )}

        <div className="mt-8 mb-20 sm:mb-8 flex justify-center gap-8 text-sm text-gray-500">
          <div className="text-center">
            <div className="w-4 h-4 rounded bg-green-500 mx-auto mb-1" />
            <span>Multiplier</span>
          </div>
          <div className="text-center">
            <div className="w-4 h-4 rounded bg-red-500 mx-auto mb-1" />
            <span>Hazard</span>
          </div>
          <div className="text-center">
            <div className="w-4 h-4 rounded bg-yellow-500 mx-auto mb-1" />
            <span>Finish</span>
          </div>
        </div>
      </div>
    </div>
  );
}
