import { useState, useEffect } from "react";
import { useGameState } from "@/lib/stores/useGameState";
import { useWallet } from "@/lib/stores/useWallet";
import { Button } from "@/components/ui/button";
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, HandCoins, AlertTriangle, Trophy, RotateCcw, Shield, Zap, SkipForward, Gift, Flame, Loader2, CheckCircle, Wallet } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const DiceIcons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

const powerUpIcons: Record<string, { icon: typeof Shield; color: string; label: string }> = {
  shield: { icon: Shield, color: "text-blue-400", label: "Shield (Blocks 1 hazard)" },
  double: { icon: Zap, color: "text-yellow-400", label: "Double (2x next multiplier)" },
  skip: { icon: SkipForward, color: "text-green-400", label: "Skip (Jump over hazard)" },
};

export function GameHUD() {
  const {
    phase,
    currentPosition,
    currentMultiplier,
    betAmount,
    potentialPayout,
    isMoving,
    lastStepType,
    makeMove,
    cashOut,
    reset,
    currentGame,
    collectedPowerUps,
    activePowerUps,
    usePowerUp,
    streak,
    isOnFire,
    wasReset,
  } = useGameState();
  const { 
    kicksBalance, 
    signClaimMessage, 
    requestKicksFromHouse, 
    transactionState, 
    resetTransactionState,
    kicksTokenAddress,
    houseWalletAddress,
    walletAddress,
    refreshBalance
  } = useWallet();
  const [diceValue, setDiceValue] = useState<number>(1);
  const [isRolling, setIsRolling] = useState(false);
  const [isCashingOut, setIsCashingOut] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const isTokenConfigured = kicksTokenAddress && houseWalletAddress;

  useEffect(() => {
    if (phase === "playing" || phase === "won" || phase === "lost" || phase === "cashed_out") {
      refreshBalance();
    }
  }, [phase, refreshBalance]);

  if (phase === "menu" || phase === "betting") return null;

  const handleRollDice = async () => {
    if (isMoving || isRolling) return;

    setIsRolling(true);
    
    let rollCount = 0;
    const rollInterval = setInterval(async () => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      rollCount++;
      if (rollCount > 10) {
        clearInterval(rollInterval);
        const finalRoll = Math.floor(Math.random() * 6) + 1;
        setDiceValue(finalRoll);
        setIsRolling(false);
        await makeMove(finalRoll);
        refreshBalance();
      }
    }, 100);
  };

  const handleCashOut = async () => {
    setIsCashingOut(true);
    await cashOut();
    setIsCashingOut(false);
    refreshBalance();
  };

  const handleClaimWinnings = async () => {
    if (!currentGame || !walletAddress || !isTokenConfigured) return;
    
    setIsClaiming(true);
    setClaimError(null);
    resetTransactionState();
    
    try {
      const nonceRes = await apiRequest("POST", `/api/game/${currentGame.id}/claim-nonce`, { walletAddress });
      const { nonce, amount, gameId } = await nonceRes.json();
      
      const signature = await signClaimMessage(amount, gameId, nonce);
      if (!signature) {
        setClaimError("Failed to sign claim message");
        setIsClaiming(false);
        return;
      }
      
      const success = await requestKicksFromHouse(amount, gameId, signature, nonce);
      if (success) {
        setHasClaimed(true);
      } else {
        setClaimError("Failed to claim winnings");
      }
    } catch (err: any) {
      const message = err.code === "ACTION_REJECTED" 
        ? "Signature rejected" 
        : err.message || "Failed to claim winnings";
      setClaimError(message);
    } finally {
      setIsClaiming(false);
    }
  };

  const handlePlayAgain = () => {
    setHasClaimed(false);
    setClaimError(null);
    resetTransactionState();
    reset();
  };

  const DiceIcon = DiceIcons[diceValue - 1];
  const isGameActive = phase === "playing";
  const isGameOver = phase === "won" || phase === "lost" || phase === "cashed_out";

  const getStepTypeLabel = () => {
    if (!lastStepType) return null;
    switch (lastStepType) {
      case "hazard":
        return { text: "HAZARD!", color: "text-red-500", bg: "bg-red-500/20" };
      case "reset_trap":
        return { text: "RESET TRAP! BACK TO START!", color: "text-purple-500", bg: "bg-purple-500/20" };
      case "multiplier_1x":
        return { text: "1x MULTIPLIER!", color: "text-green-300", bg: "bg-green-500/20" };
      case "multiplier_1_5x":
        return { text: "1.5x MULTIPLIER!", color: "text-green-400", bg: "bg-green-500/20" };
      case "multiplier_2x":
        return { text: "2x MULTIPLIER!", color: "text-green-500", bg: "bg-green-500/20" };
      case "multiplier_2_5x":
        return { text: "2.5x MULTIPLIER!", color: "text-teal-400", bg: "bg-teal-500/20" };
      case "multiplier_3x":
        return { text: "3x MULTIPLIER!", color: "text-teal-500", bg: "bg-teal-500/20" };
      case "multiplier_5x":
        return { text: "5x MULTIPLIER!", color: "text-blue-400", bg: "bg-blue-500/20" };
      case "multiplier_8x":
        return { text: "8x MULTIPLIER!", color: "text-indigo-400", bg: "bg-indigo-500/20" };
      case "multiplier_10x":
        return { text: "10x MULTIPLIER!", color: "text-purple-400", bg: "bg-purple-500/20" };
      case "multiplier_11x":
        return { text: "11x MULTIPLIER!", color: "text-purple-300", bg: "bg-purple-500/20" };
      case "finish":
        return { text: "FINISH! 20x!", color: "text-yellow-400", bg: "bg-yellow-500/20" };
      case "powerup_shield":
        return { text: "SHIELD COLLECTED!", color: "text-blue-400", bg: "bg-blue-500/20" };
      case "powerup_double":
        return { text: "DOUBLE COLLECTED!", color: "text-yellow-400", bg: "bg-yellow-500/20" };
      case "powerup_skip":
        return { text: "SKIP COLLECTED!", color: "text-green-400", bg: "bg-green-500/20" };
      case "bonus_chest":
        return { text: "BONUS CHEST!", color: "text-orange-400", bg: "bg-orange-500/20" };
      default:
        return null;
    }
  };

  const stepLabel = getStepTypeLabel();

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 flex justify-between items-start pointer-events-auto gap-2">
        <div className="flex-shrink-0">
          <div className="bg-black/80 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-4 border border-purple-500/30">
            <div className="text-xs sm:text-sm text-gray-400">Current Position</div>
            <div className="text-lg sm:text-2xl font-bold text-white">
              Step {currentPosition} <span className="text-gray-500 text-sm sm:text-lg">/ 100</span>
            </div>
            <div className="w-20 sm:w-full bg-gray-700 rounded-full h-1.5 sm:h-2 mt-1">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-400 h-1.5 sm:h-2 rounded-full transition-all duration-500"
                style={{ width: `${currentPosition}%` }}
              />
            </div>
          </div>
          {(collectedPowerUps.length > 0 || activePowerUps.filter(p => p.active).length > 0) && (
            <div className="bg-black/80 backdrop-blur-sm rounded-lg px-2 py-1.5 border border-purple-500/30 mt-1 flex gap-1.5">
              {collectedPowerUps.map((powerup, idx) => {
                const config = powerUpIcons[powerup];
                if (!config) return null;
                const Icon = config.icon;
                return (
                  <button
                    key={`${powerup}-${idx}`}
                    onClick={() => usePowerUp(powerup as "shield" | "double" | "skip")}
                    className={`p-1.5 rounded-lg bg-black/50 border border-current/50 ${config.color} hover:bg-black/80 active:scale-95 transition-all`}
                    title={`Use ${config.label}`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
              {activePowerUps.filter(p => p.active).map((powerup, idx) => {
                const config = powerUpIcons[powerup.type];
                if (!config) return null;
                const Icon = config.icon;
                return (
                  <div
                    key={`active-${powerup.type}-${idx}`}
                    className={`p-1.5 rounded-lg bg-current/20 border border-current ${config.color} animate-pulse`}
                    title={`${config.label} - ACTIVE`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          {isOnFire && (
            <div className="bg-gradient-to-r from-orange-600/80 to-red-600/80 backdrop-blur-sm rounded-lg p-2 border border-orange-400/50 animate-pulse">
              <div className="flex items-center gap-1">
                <Flame className="w-5 h-5 text-orange-300 animate-bounce" />
                <div>
                  <div className="text-xs text-orange-200">ON FIRE!</div>
                  <div className="text-sm font-bold text-white">{streak}x</div>
                </div>
              </div>
            </div>
          )}
          
          {wasReset && !isOnFire && (
            <div className="bg-purple-900/80 backdrop-blur-sm rounded-lg p-2 border border-purple-400/50 animate-pulse">
              <div className="text-xs text-purple-200">RESET!</div>
            </div>
          )}
          
          <div className="bg-black/80 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-4 border border-yellow-500/30 text-right">
            <div className="text-xs sm:text-sm text-gray-400">Multiplier</div>
            <div className="text-xl sm:text-2xl font-bold text-yellow-400">
              {currentMultiplier.toFixed(2)}x
            </div>
            <div className="text-xs sm:text-sm text-gray-400">
              Bet: {parseFloat(betAmount).toLocaleString()} KICKS
            </div>
            {streak > 0 && !isOnFire && (
              <div className="text-xs text-orange-400">
                Streak: {streak}
              </div>
            )}
          </div>
        </div>
      </div>


      {stepLabel && (
        <div className="absolute top-20 sm:top-1/4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className={`${stepLabel.bg} ${stepLabel.color} px-3 sm:px-6 py-1.5 sm:py-3 rounded-xl text-base sm:text-2xl font-bold animate-bounce border border-current/30`}>
            {stepLabel.text}
          </div>
        </div>
      )}

      <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 pointer-events-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-lg mx-auto">
          {isGameActive && (
            <div className="bg-black/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-purple-500/30">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div>
                  <div className="text-xs sm:text-sm text-gray-400">Potential Payout</div>
                  <div className="text-lg sm:text-2xl font-bold text-green-400">
                    {parseFloat(potentialPayout).toLocaleString(undefined, { maximumFractionDigits: 2 })} KICKS
                  </div>
                </div>
                <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-xl shadow-lg">
                  <DiceIcon className={`w-8 h-8 sm:w-12 sm:h-12 text-purple-600 ${isRolling ? 'animate-spin' : ''}`} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <Button
                  onClick={handleRollDice}
                  disabled={isMoving || isRolling}
                  className="py-4 sm:py-6 text-sm sm:text-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl"
                >
                  {isRolling ? "Rolling..." : isMoving ? "Moving..." : "Roll Dice"}
                </Button>
                <Button
                  onClick={handleCashOut}
                  disabled={isMoving || isRolling || isCashingOut || currentMultiplier <= 1}
                  className="py-4 sm:py-6 text-sm sm:text-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl"
                >
                  <HandCoins className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  {isCashingOut ? "Cashing..." : "Cash Out"}
                </Button>
              </div>

              {currentPosition >= 75 && (
                <div className="mt-2 sm:mt-4 flex items-center gap-2 text-yellow-400 text-xs sm:text-sm bg-yellow-500/10 p-2 rounded-lg">
                  <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span>Expert zone! 50% hazard chance.</span>
                </div>
              )}
            </div>
          )}

          {isGameOver && (
            <div className={`bg-black/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border ${
              phase === "lost" ? "border-red-500/50" : "border-green-500/50"
            }`}>
              <div className="text-center mb-4 sm:mb-6">
                {phase === "lost" ? (
                  <>
                    <AlertTriangle className="w-10 h-10 sm:w-16 sm:h-16 text-red-500 mx-auto mb-2 sm:mb-4" />
                    <h2 className="text-xl sm:text-3xl font-bold text-red-400 mb-1 sm:mb-2">Game Over!</h2>
                    <p className="text-sm sm:text-base text-gray-400">Hazard at step {currentPosition}</p>
                    <p className="text-lg sm:text-xl text-red-400 mt-1 sm:mt-2">
                      Lost {parseFloat(betAmount).toLocaleString()} KICKS
                    </p>
                  </>
                ) : (
                  <>
                    <Trophy className="w-10 h-10 sm:w-16 sm:h-16 text-yellow-400 mx-auto mb-2 sm:mb-4" />
                    <h2 className="text-xl sm:text-3xl font-bold text-green-400 mb-1 sm:mb-2">
                      {phase === "won" ? "Victory!" : "Cashed Out!"}
                    </h2>
                    <p className="text-sm sm:text-base text-gray-400">
                      {phase === "won" 
                        ? `Reached step ${currentPosition}!`
                        : `Step ${currentPosition}`
                      }
                    </p>
                    <div className="mt-2 sm:mt-4 flex justify-center gap-6">
                      <div>
                        <div className="text-xs sm:text-sm text-gray-400">Multiplier</div>
                        <div className="text-lg sm:text-2xl font-bold text-yellow-400">{currentMultiplier.toFixed(2)}x</div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-gray-400">Winnings</div>
                        <div className="text-lg sm:text-2xl font-bold text-green-400">
                          +{parseFloat(currentGame?.payout || "0").toLocaleString(undefined, { maximumFractionDigits: 2 })} KICKS
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {phase !== "lost" && isTokenConfigured && !hasClaimed && (
                <div className="mb-3 sm:mb-4">
                  {transactionState.status !== "idle" && transactionState.status !== "success" && (
                    <div className={`flex items-center gap-2 mb-2 sm:mb-3 p-2 sm:p-3 rounded-lg ${
                      transactionState.status === "error" 
                        ? "bg-red-900/20 text-red-400 border border-red-500/30" 
                        : "bg-blue-900/20 text-blue-400 border border-blue-500/30"
                    }`}>
                      {transactionState.status === "error" ? (
                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      ) : (
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin flex-shrink-0" />
                      )}
                      <span className="text-xs sm:text-sm">{transactionState.message}</span>
                    </div>
                  )}
                  
                  {claimError && transactionState.status !== "error" && (
                    <div className="flex items-center gap-2 mb-2 sm:mb-3 p-2 sm:p-3 bg-red-900/20 text-red-400 border border-red-500/30 rounded-lg">
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">{claimError}</span>
                    </div>
                  )}
                  
                  <Button
                    onClick={handleClaimWinnings}
                    disabled={isClaiming}
                    className="w-full py-4 sm:py-6 text-sm sm:text-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl mb-2 sm:mb-3"
                  >
                    {isClaiming ? (
                      <>
                        <Loader2 className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        Claiming...
                      </>
                    ) : (
                      <>
                        <Wallet className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        Claim {parseFloat(currentGame?.payout || "0").toLocaleString(undefined, { maximumFractionDigits: 2 })} KICKS
                      </>
                    )}
                  </Button>
                </div>
              )}

              {phase !== "lost" && isTokenConfigured && hasClaimed && (
                <div className="flex items-center gap-2 mb-3 sm:mb-4 p-2 sm:p-3 bg-green-900/20 text-green-400 border border-green-500/30 rounded-lg">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">KICKS will be sent to your wallet.</span>
                </div>
              )}

              <Button
                onClick={handlePlayAgain}
                className="w-full py-4 sm:py-6 text-sm sm:text-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl"
              >
                <RotateCcw className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Play Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
