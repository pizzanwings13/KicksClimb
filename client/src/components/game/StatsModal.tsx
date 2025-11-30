import { useState, useEffect } from "react";
import { X, TrendingUp, TrendingDown, Trophy, Target, Coins, History, BarChart2 } from "lucide-react";
import { useWallet } from "@/lib/stores/useWallet";
import { useGameState } from "@/lib/stores/useGameState";
import { formatDistanceToNow } from "date-fns";

interface GameHistory {
  id: number;
  betAmount: string;
  finalMultiplier: string | null;
  payout: string | null;
  finalPosition: number;
  gameStatus: string;
  startedAt: string;
  endedAt: string | null;
}

interface UserStats {
  totalGamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalKicksWon: string;
  totalKicksLost: string;
  highestMultiplier: string;
  winRate: string;
  netProfit: string;
  averageBet: string;
  biggestWin: string;
}

export function StatsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { walletAddress } = useWallet();
  const [activeTab, setActiveTab] = useState<"stats" | "history">("stats");
  const [stats, setStats] = useState<UserStats | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && walletAddress) {
      fetchData();
    }
  }, [isOpen, walletAddress]);

  const fetchData = async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const [statsRes, historyRes] = await Promise.all([
        fetch(`/api/user/${walletAddress}/stats`),
        fetch(`/api/user/${walletAddress}/games?limit=20`),
      ]);
      
      const statsData = await statsRes.json();
      const historyData = await historyRes.json();
      
      setStats(statsData.stats);
      setGameHistory(historyData.games || []);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatKicks = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "0";
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "won":
      case "cashed_out":
        return "text-green-400";
      case "lost":
        return "text-red-400";
      default:
        return "text-yellow-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "won":
        return "WON";
      case "cashed_out":
        return "CASHED OUT";
      case "lost":
        return "LOST";
      default:
        return status.toUpperCase();
    }
  };

  const netProfit = stats ? parseFloat(stats.netProfit) : 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-b from-gray-900 to-black rounded-2xl border border-purple-500/30 w-full max-w-lg max-h-[85vh] overflow-hidden">
        <div className="p-4 border-b border-purple-500/30 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Player Stats</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-purple-500/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex border-b border-purple-500/30">
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-colors ${
              activeTab === "stats"
                ? "bg-purple-900/30 text-purple-400 border-b-2 border-purple-400"
                : "text-gray-400 hover:bg-purple-900/20"
            }`}
          >
            <Target className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-colors ${
              activeTab === "history"
                ? "bg-purple-900/30 text-purple-400 border-b-2 border-purple-400"
                : "text-gray-400 hover:bg-purple-900/20"
            }`}
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeTab === "stats" && stats ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl ${netProfit >= 0 ? "bg-green-900/20 border border-green-500/30" : "bg-red-900/20 border border-red-500/30"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Net Profit</span>
                  {netProfit >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {netProfit >= 0 ? "+" : ""}{formatKicks(stats.netProfit)} KICKS
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-gray-400">Win Rate</span>
                  </div>
                  <p className="text-xl font-bold text-white">{stats.winRate}%</p>
                </div>

                <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-gray-400">Games Played</span>
                  </div>
                  <p className="text-xl font-bold text-white">{stats.totalGamesPlayed}</p>
                </div>

                <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-400">Total Won</span>
                  </div>
                  <p className="text-lg font-bold text-green-400">{formatKicks(stats.totalKicksWon)}</p>
                </div>

                <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-gray-400">Total Lost</span>
                  </div>
                  <p className="text-lg font-bold text-red-400">{formatKicks(stats.totalKicksLost)}</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-xl p-4 border border-yellow-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="text-gray-300 font-semibold">Personal Records</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Highest Multiplier</p>
                    <p className="text-lg font-bold text-yellow-400">{stats.highestMultiplier}x</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Biggest Win</p>
                    <p className="text-lg font-bold text-green-400">{formatKicks(stats.biggestWin)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Average Bet</p>
                    <p className="text-lg font-bold text-white">{formatKicks(stats.averageBet)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Win/Loss</p>
                    <p className="text-lg font-bold text-white">{stats.gamesWon}/{stats.gamesLost}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "history" ? (
            <div className="space-y-3">
              {gameHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No games played yet</p>
                </div>
              ) : (
                gameHistory.map((game) => (
                  <div
                    key={game.id}
                    className="bg-purple-900/20 rounded-xl p-4 border border-purple-500/20 hover:border-purple-500/40 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className={`text-sm font-semibold ${getStatusColor(game.gameStatus)}`}>
                          {getStatusLabel(game.gameStatus)}
                        </span>
                        {game.endedAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(new Date(game.endedAt), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Step {game.finalPosition}/100</p>
                        {game.finalMultiplier && (
                          <p className="text-sm font-semibold text-purple-400">{game.finalMultiplier}x</p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-purple-500/20">
                      <div>
                        <p className="text-xs text-gray-500">Bet</p>
                        <p className="text-white font-semibold">{formatKicks(game.betAmount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Payout</p>
                        <p className={`font-semibold ${game.payout && parseFloat(game.payout) > 0 ? "text-green-400" : "text-red-400"}`}>
                          {game.payout ? formatKicks(game.payout) : "0"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function StatsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { isConnected } = useWallet();
  const { phase } = useGameState();

  const showButton = isConnected && (phase === "menu" || phase === "playing" || phase === "won" || phase === "lost" || phase === "cashed_out");

  if (!showButton) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-48 z-50 flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full border border-purple-500/30 hover:bg-purple-900/50 transition-all"
      >
        <BarChart2 className="w-5 h-5 text-purple-400" />
        <span className="text-white font-semibold">Stats</span>
      </button>
      <StatsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
