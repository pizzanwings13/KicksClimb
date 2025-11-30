import { useState } from "react";
import { useWallet } from "@/lib/stores/useWallet";
import { useGameState } from "@/lib/stores/useGameState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Coins, Zap, AlertTriangle, Settings } from "lucide-react";

const QUICK_AMOUNTS = ["10", "50", "100", "500", "1000"];

export function BettingScreen() {
  const { walletAddress, kicksBalance, sendKicksToHouse, kicksTokenAddress, houseWalletAddress } = useWallet();
  const { phase, setPhase, betAmount, setBetAmount, startGame } = useGameState();
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (phase !== "betting") return null;

  const isTokenConfigured = kicksTokenAddress && houseWalletAddress;

  const handleBetChange = (value: string) => {
    const numValue = value.replace(/[^0-9.]/g, "");
    setBetAmount(numValue);
    setError(null);
  };

  const handleQuickAmount = (amount: string) => {
    setBetAmount(amount);
    setError(null);
  };

  const handleMaxBet = () => {
    const maxBet = Math.floor(parseFloat(kicksBalance) * 100) / 100;
    setBetAmount(maxBet.toString());
    setError(null);
  };

  const handleStartGame = async () => {
    const betValue = parseFloat(betAmount);
    const balance = parseFloat(kicksBalance);

    if (isNaN(betValue) || betValue <= 0) {
      setError("Please enter a valid bet amount");
      return;
    }

    if (betValue > balance) {
      setError("Insufficient KICKS balance");
      return;
    }

    setIsPlacingBet(true);
    setError(null);

    try {
      const success = await startGame(walletAddress!, betAmount);
      if (!success) {
        setError("Failed to start game. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to place bet");
    } finally {
      setIsPlacingBet(false);
    }
  };

  const betValue = parseFloat(betAmount) || 0;
  const balance = parseFloat(kicksBalance) || 0;
  const isValidBet = betValue > 0 && betValue <= balance;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-purple-900/90 via-indigo-900/90 to-black/95 z-50">
      <div className="max-w-md w-full p-8">
        <button
          onClick={() => setPhase("menu")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Menu
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Place Your Bet</h2>
          <p className="text-gray-400">How many KICKS will you risk?</p>
        </div>

        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-400">Your Balance</span>
            <span className="text-xl font-bold text-yellow-400">
              {balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} KICKS
            </span>
          </div>

          <div className="relative mb-4">
            <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-500" />
            <Input
              type="text"
              value={betAmount}
              onChange={(e) => handleBetChange(e.target.value)}
              className="pl-12 pr-20 py-6 text-2xl font-bold bg-black/50 border-purple-500/50 text-white text-center rounded-xl"
              placeholder="0"
            />
            <button
              onClick={handleMaxBet}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              MAX
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-6">
            {QUICK_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => handleQuickAmount(amount)}
                className={`py-2 rounded-lg font-semibold transition-all ${
                  betAmount === amount
                    ? "bg-purple-600 text-white"
                    : "bg-purple-900/50 text-purple-300 hover:bg-purple-800/50"
                }`}
              >
                {amount}
              </button>
            ))}
          </div>

          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-xl p-4 mb-6 border border-green-500/30">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Potential Win (20x)</span>
              <span className="text-xl font-bold text-green-400">
                {(betValue * 20).toLocaleString(undefined, { maximumFractionDigits: 2 })} KICKS
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Reach step 100 for maximum multiplier!
            </p>
          </div>

          {!isTokenConfigured && (
            <div className="flex items-center gap-2 text-yellow-400 mb-4 p-3 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
              <Settings className="w-5 h-5" />
              <span className="text-sm">Configure KICKS token address in Settings (bottom right) for real token betting. Demo mode active.</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-400 mb-4 p-3 bg-red-900/20 rounded-lg border border-red-500/30">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={handleStartGame}
            disabled={!isValidBet || isPlacingBet}
            className="w-full py-6 text-lg bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 disabled:shadow-none"
          >
            <Zap className="mr-2 h-5 w-5" />
            {isPlacingBet ? "Starting Game..." : `Bet ${betValue.toLocaleString()} KICKS`}
          </Button>
        </div>

        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>Difficulty increases as you climb higher!</p>
          <p className="text-xs mt-1">Steps 1-25: Easy | 26-50: Medium | 51-75: Hard | 76-100: Expert</p>
        </div>
      </div>
    </div>
  );
}
