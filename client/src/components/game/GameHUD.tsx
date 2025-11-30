import { useState } from "react";
import { useGameState } from "@/lib/stores/useGameState";
import { useWallet } from "@/lib/stores/useWallet";
import { Button } from "@/components/ui/button";
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, HandCoins, AlertTriangle, Trophy, RotateCcw, Shield, Zap, SkipForward, Gift, Flame } from "lucide-react";

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
  const { kicksBalance } = useWallet();
  const [diceValue, setDiceValue] = useState<number>(1);
  const [isRolling, setIsRolling] = useState(false);
  const [isCashingOut, setIsCashingOut] = useState(false);

  if (phase === "menu" || phase === "betting") return null;

  const handleRollDice = async () => {
    if (isMoving || isRolling) return;

    setIsRolling(true);
    
    let rollCount = 0;
    const rollInterval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      rollCount++;
      if (rollCount > 10) {
        clearInterval(rollInterval);
        const finalRoll = Math.floor(Math.random() * 6) + 1;
        setDiceValue(finalRoll);
        setIsRolling(false);
        makeMove(finalRoll);
      }
    }, 100);
  };

  const handleCashOut = async () => {
    setIsCashingOut(true);
    await cashOut();
    setIsCashingOut(false);
  };

  const handlePlayAgain = () => {
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
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-auto">
        <div className="bg-black/70 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30">
          <div className="text-sm text-gray-400 mb-1">Current Position</div>
          <div className="text-3xl font-bold text-white">
            Step {currentPosition} <span className="text-gray-500">/ 100</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${currentPosition}%` }}
            />
          </div>
          
          {(collectedPowerUps.length > 0 || activePowerUps.length > 0) && (
            <div className="mt-3 pt-3 border-t border-purple-500/30">
              <div className="text-xs text-gray-400 mb-2">Power-ups</div>
              <div className="flex gap-2 flex-wrap">
                {collectedPowerUps.map((powerup, idx) => {
                  const config = powerUpIcons[powerup];
                  if (!config) return null;
                  const Icon = config.icon;
                  return (
                    <button
                      key={`${powerup}-${idx}`}
                      onClick={() => usePowerUp(powerup as "shield" | "double" | "skip")}
                      className={`p-2 rounded-lg bg-black/50 border border-current/30 ${config.color} hover:bg-black/80 transition-colors`}
                      title={`Use ${config.label}`}
                    >
                      <Icon className="w-5 h-5" />
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
                      className={`p-2 rounded-lg bg-current/20 border border-current ${config.color} animate-pulse`}
                      title={`${config.label} - ACTIVE`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {isOnFire && (
            <div className="bg-gradient-to-r from-orange-600/80 to-red-600/80 backdrop-blur-sm rounded-xl p-4 border border-orange-400/50 animate-pulse">
              <div className="flex items-center gap-2">
                <Flame className="w-8 h-8 text-orange-300 animate-bounce" />
                <div>
                  <div className="text-sm text-orange-200">ON FIRE!</div>
                  <div className="text-2xl font-bold text-white">{streak} streak</div>
                </div>
              </div>
            </div>
          )}
          
          {wasReset && !isOnFire && (
            <div className="bg-purple-900/80 backdrop-blur-sm rounded-xl p-4 border border-purple-400/50 animate-pulse">
              <div className="text-sm text-purple-200">RESET!</div>
              <div className="text-lg font-bold text-white">Back to start</div>
            </div>
          )}
          
          <div className="bg-black/70 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/30 text-right">
            <div className="text-sm text-gray-400 mb-1">Current Multiplier</div>
            <div className="text-3xl font-bold text-yellow-400">
              {currentMultiplier.toFixed(2)}x
            </div>
            <div className="text-sm text-gray-400 mt-1">
              Bet: {parseFloat(betAmount).toLocaleString()} KICKS
            </div>
            {streak > 0 && !isOnFire && (
              <div className="text-sm text-orange-400 mt-1">
                Streak: {streak}
              </div>
            )}
          </div>
        </div>
      </div>

      {stepLabel && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className={`${stepLabel.bg} ${stepLabel.color} px-6 py-3 rounded-xl text-2xl font-bold animate-bounce border border-current/30`}>
            {stepLabel.text}
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 right-4 pointer-events-auto">
        <div className="max-w-lg mx-auto">
          {isGameActive && (
            <div className="bg-black/70 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-gray-400">Potential Payout</div>
                  <div className="text-2xl font-bold text-green-400">
                    {parseFloat(potentialPayout).toLocaleString(undefined, { maximumFractionDigits: 2 })} KICKS
                  </div>
                </div>
                <div className="flex items-center justify-center w-16 h-16 bg-white rounded-xl shadow-lg">
                  <DiceIcon className={`w-12 h-12 text-purple-600 ${isRolling ? 'animate-spin' : ''}`} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleRollDice}
                  disabled={isMoving || isRolling}
                  className="py-6 text-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl"
                >
                  {isRolling ? "Rolling..." : isMoving ? "Moving..." : "Roll Dice"}
                </Button>
                <Button
                  onClick={handleCashOut}
                  disabled={isMoving || isRolling || isCashingOut || currentMultiplier <= 1}
                  className="py-6 text-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl"
                >
                  <HandCoins className="mr-2 h-5 w-5" />
                  {isCashingOut ? "Cashing Out..." : "Cash Out"}
                </Button>
              </div>

              {currentPosition >= 75 && (
                <div className="mt-4 flex items-center gap-2 text-yellow-400 text-sm bg-yellow-500/10 p-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Expert zone! 50% hazard chance. Consider cashing out!</span>
                </div>
              )}
            </div>
          )}

          {isGameOver && (
            <div className={`bg-black/80 backdrop-blur-sm rounded-2xl p-6 border ${
              phase === "lost" ? "border-red-500/50" : "border-green-500/50"
            }`}>
              <div className="text-center mb-6">
                {phase === "lost" ? (
                  <>
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-red-400 mb-2">Game Over!</h2>
                    <p className="text-gray-400">You hit a hazard at step {currentPosition}</p>
                    <p className="text-xl text-red-400 mt-2">
                      Lost {parseFloat(betAmount).toLocaleString()} KICKS
                    </p>
                  </>
                ) : (
                  <>
                    <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-green-400 mb-2">
                      {phase === "won" ? "Victory!" : "Cashed Out!"}
                    </h2>
                    <p className="text-gray-400">
                      {phase === "won" 
                        ? `You reached step ${currentPosition}!`
                        : `Smart move at step ${currentPosition}`
                      }
                    </p>
                    <div className="mt-4">
                      <div className="text-sm text-gray-400">Final Multiplier</div>
                      <div className="text-2xl font-bold text-yellow-400">{currentMultiplier.toFixed(2)}x</div>
                    </div>
                    <div className="mt-2">
                      <div className="text-sm text-gray-400">Winnings</div>
                      <div className="text-3xl font-bold text-green-400">
                        +{parseFloat(currentGame?.payout || "0").toLocaleString(undefined, { maximumFractionDigits: 2 })} KICKS
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Button
                onClick={handlePlayAgain}
                className="w-full py-6 text-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl"
              >
                <RotateCcw className="mr-2 h-5 w-5" />
                Play Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
