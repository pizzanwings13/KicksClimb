import { useState } from "react";
import { useGameState } from "@/lib/stores/useGameState";
import { useWallet } from "@/lib/stores/useWallet";
import { Button } from "@/components/ui/button";
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, HandCoins, AlertTriangle, Trophy, RotateCcw } from "lucide-react";

const DiceIcons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

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
      case "multiplier_2x":
        return { text: "2x MULTIPLIER!", color: "text-green-400", bg: "bg-green-500/20" };
      case "multiplier_3x":
        return { text: "3x MULTIPLIER!", color: "text-teal-400", bg: "bg-teal-500/20" };
      case "multiplier_5x":
        return { text: "5x MULTIPLIER!", color: "text-blue-400", bg: "bg-blue-500/20" };
      case "multiplier_10x":
        return { text: "10x MULTIPLIER!", color: "text-purple-400", bg: "bg-purple-500/20" };
      case "finish":
        return { text: "FINISH! 20x!", color: "text-yellow-400", bg: "bg-yellow-500/20" };
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
        </div>

        <div className="bg-black/70 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/30 text-right">
          <div className="text-sm text-gray-400 mb-1">Current Multiplier</div>
          <div className="text-3xl font-bold text-yellow-400">
            {currentMultiplier.toFixed(2)}x
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Bet: {parseFloat(betAmount).toLocaleString()} KICKS
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
