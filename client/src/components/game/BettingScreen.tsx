import { useState } from "react";
import { useWallet } from "@/lib/stores/useWallet";
import { useGameState } from "@/lib/stores/useGameState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Coins, Anchor, AlertTriangle, Settings, Loader2, CheckCircle, XCircle, Ship } from "lucide-react";

const QUICK_AMOUNTS = ["50", "100", "500", "1000", "2500"];
const MAX_BET = 5000;

export function BettingScreen() {
  const { 
    walletAddress, 
    kicksBalance, 
    sendKicksToHouse, 
    kicksTokenAddress, 
    houseWalletAddress,
    transactionState,
    resetTransactionState
  } = useWallet();
  const { phase, setPhase, betAmount, setBetAmount, startGame } = useGameState();
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (phase !== "betting") return null;

  const isTokenConfigured = kicksTokenAddress && houseWalletAddress;

  const handleBetChange = (value: string) => {
    const numValue = value.replace(/[^0-9.]/g, "");
    setBetAmount(numValue);
    setError(null);
    resetTransactionState();
  };

  const handleQuickAmount = (amount: string) => {
    setBetAmount(amount);
    setError(null);
    resetTransactionState();
  };

  const handleMaxBet = () => {
    const balance = Math.floor(parseFloat(kicksBalance) * 100) / 100;
    const maxBet = Math.min(balance, MAX_BET);
    setBetAmount(maxBet.toString());
    setError(null);
    resetTransactionState();
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

    if (betValue > MAX_BET) {
      setError(`Maximum bet is ${MAX_BET.toLocaleString()} KICKS`);
      return;
    }

    if (betValue < 50) {
      setError("Minimum bet is 50 KICKS");
      return;
    }

    setIsPlacingBet(true);
    setError(null);
    resetTransactionState();

    try {
      let txHash: string | undefined;
      
      if (isTokenConfigured) {
        txHash = await sendKicksToHouse(betAmount) || undefined;
        if (!txHash) {
          setError("Failed to transfer tokens. Please try again.");
          setIsPlacingBet(false);
          return;
        }
      }
      
      const success = await startGame(walletAddress!, betAmount, txHash);
      if (!success) {
        setError("Failed to start game. Please try again.");
      }
    } catch (err: any) {
      const message = err.code === "ACTION_REJECTED" 
        ? "Transaction rejected" 
        : err.message || "Failed to place bet";
      setError(message);
    } finally {
      setIsPlacingBet(false);
    }
  };

  const getTransactionStatusUI = () => {
    const { status, message } = transactionState;
    
    if (status === "idle") return null;
    
    const statusConfig = {
      checking: { icon: Loader2, color: "text-amber-300", bg: "bg-amber-900/30", border: "border-amber-500/30" },
      approving: { icon: Loader2, color: "text-yellow-400", bg: "bg-yellow-900/30", border: "border-yellow-500/30" },
      transferring: { icon: Loader2, color: "text-amber-400", bg: "bg-amber-900/30", border: "border-amber-500/30" },
      signing: { icon: Loader2, color: "text-amber-300", bg: "bg-amber-900/30", border: "border-amber-500/30" },
      claiming: { icon: Loader2, color: "text-emerald-400", bg: "bg-emerald-900/30", border: "border-emerald-500/30" },
      success: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-900/30", border: "border-emerald-500/30" },
      error: { icon: XCircle, color: "text-red-400", bg: "bg-red-900/30", border: "border-red-500/30" },
    };
    
    const config = statusConfig[status];
    if (!config) return null;
    
    const Icon = config.icon;
    const isSpinning = status !== "success" && status !== "error";
    
    return (
      <div className={`flex items-center gap-2 ${config.color} mb-4 p-3 ${config.bg} rounded-lg border ${config.border}`}>
        <Icon className={`w-5 h-5 ${isSpinning ? "animate-spin" : ""}`} />
        <span className="text-sm">{message}</span>
      </div>
    );
  };

  const betValue = parseFloat(betAmount) || 0;
  const balance = parseFloat(kicksBalance) || 0;
  const isValidBet = betValue > 0 && betValue <= balance;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        background: 'linear-gradient(to bottom, #FF7F50 0%, #FF6347 25%, #1E90FF 60%, #0D47A1 100%)'
      }}
    >
      <div className="max-w-md w-full p-8">
        <button
          onClick={() => setPhase("menu")}
          className="flex items-center gap-2 text-amber-200 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Port
        </button>

        <div className="text-center mb-8">
          <Ship className="w-12 h-12 text-amber-300 mx-auto mb-2" />
          <h2 className="text-3xl font-bold text-white mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            Load Your Treasure
          </h2>
          <p className="text-amber-100">How much KICKS will you wager?</p>
        </div>

        <div className="bg-amber-900/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-amber-600/50">
          <div className="flex justify-between items-center mb-4">
            <span className="text-amber-200">Your Treasury</span>
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
              className="pl-12 pr-20 py-6 text-2xl font-bold bg-amber-950/50 border-amber-500/50 text-white text-center rounded-xl"
              placeholder="0"
            />
            <button
              onClick={handleMaxBet}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg transition-colors"
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
                    ? "bg-amber-500 text-amber-900"
                    : "bg-amber-800/50 text-amber-200 hover:bg-amber-700/50"
                }`}
              >
                {amount}
              </button>
            ))}
          </div>

          <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 rounded-xl p-4 mb-6 border border-emerald-500/30">
            <div className="flex justify-between items-center mb-2">
              <span className="text-amber-100">Max Bounty (10x)</span>
              <span className="text-xl font-bold text-emerald-400">
                {(betValue * 10).toLocaleString(undefined, { maximumFractionDigits: 2 })} KICKS
              </span>
            </div>
            <p className="text-xs text-amber-200/70">
              Reach the treasure island for maximum bounty!
            </p>
          </div>

          {!isTokenConfigured && (
            <div className="flex items-center gap-2 text-yellow-300 mb-4 p-3 bg-yellow-900/30 rounded-lg border border-yellow-500/30">
              <Settings className="w-5 h-5" />
              <span className="text-sm">Configure KICKS token address in Settings for real token betting. Demo mode active.</span>
            </div>
          )}

          {getTransactionStatusUI()}

          {error && transactionState.status !== "error" && (
            <div className="flex items-center gap-2 text-red-300 mb-4 p-3 bg-red-900/30 rounded-lg border border-red-500/30">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={handleStartGame}
            disabled={!isValidBet || isPlacingBet}
            className="w-full py-6 text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 disabled:shadow-none border-2 border-emerald-400 disabled:border-gray-500"
          >
            <Anchor className="mr-2 h-5 w-5" />
            {isPlacingBet ? "Setting Sail..." : `Wager ${betValue.toLocaleString()} KICKS`}
          </Button>
        </div>

        <div className="mt-6 text-center text-amber-200/80 text-sm">
          <p>Danger increases as you sail further!</p>
          <p className="text-xs mt-1 text-amber-200/60">Tiles 1-25: Calm | 26-50: Choppy | 51-75: Stormy | 76-100: Treacherous</p>
        </div>
      </div>
    </div>
  );
}
