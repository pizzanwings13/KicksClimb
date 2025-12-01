import { useEffect, useState } from "react";
import { useGameState, LeaderboardEntry } from "@/lib/stores/useGameState";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, X, Calendar, CalendarDays, Crown, Flame, Star } from "lucide-react";

interface AllTimeEntry {
  id: number;
  username: string;
  totalKicksWon: string;
  highestMultiplier: string;
  gamesWon: number;
  totalGamesPlayed: number;
}

interface BiggestWin {
  id: number;
  payout: string;
  finalMultiplier: string;
  betAmount: string;
  user: {
    username: string;
  };
}

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Leaderboard({ isOpen, onClose }: LeaderboardProps) {
  const { dailyLeaderboard, weeklyLeaderboard, fetchLeaderboards } = useGameState();
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "alltime" | "multipliers" | "biggest">("daily");
  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<AllTimeEntry[]>([]);
  const [multipliersLeaderboard, setMultipliersLeaderboard] = useState<AllTimeEntry[]>([]);
  const [biggestWins, setBiggestWins] = useState<BiggestWin[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboards();
      fetchAllTimeData();
    }
  }, [isOpen, fetchLeaderboards]);

  const fetchAllTimeData = async () => {
    setLoading(true);
    try {
      const [allTimeRes, multipliersRes, biggestRes] = await Promise.all([
        fetch("/api/leaderboard/alltime?type=winnings"),
        fetch("/api/leaderboard/alltime?type=multiplier"),
        fetch("/api/leaderboard/biggest-wins"),
      ]);
      
      const [allTimeData, multipliersData, biggestData] = await Promise.all([
        allTimeRes.json(),
        multipliersRes.json(),
        biggestRes.json(),
      ]);
      
      setAllTimeLeaderboard(allTimeData.leaderboard || []);
      setMultipliersLeaderboard(multipliersData.leaderboard || []);
      setBiggestWins(biggestData.biggestWins || []);
    } catch (error) {
      console.error("Failed to fetch all-time data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const leaderboard = activeTab === "daily" ? dailyLeaderboard : activeTab === "weekly" ? weeklyLeaderboard : null;

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 1:
        return <Medal className="w-6 h-6 text-gray-300" />;
      case 2:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-gray-400 font-bold">{index + 1}</span>;
    }
  };

  const getRankBg = (index: number) => {
    switch (index) {
      case 0:
        return "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30";
      case 1:
        return "bg-gradient-to-r from-gray-400/20 to-gray-300/20 border-gray-400/30";
      case 2:
        return "bg-gradient-to-r from-amber-600/20 to-amber-500/20 border-amber-600/30";
      default:
        return "bg-black/30 border-purple-500/20";
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
      <div className="bg-gradient-to-b from-purple-900/90 to-indigo-900/90 rounded-2xl p-6 max-w-md w-full mx-4 border border-purple-500/30 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Leaderboard
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            onClick={() => setActiveTab("daily")}
            className={`flex-1 py-2 text-sm ${
              activeTab === "daily"
                ? "bg-purple-600 text-white"
                : "bg-purple-900/50 text-purple-300 hover:bg-purple-800/50"
            }`}
          >
            <Calendar className="mr-1 h-3 w-3" />
            Daily
          </Button>
          <Button
            onClick={() => setActiveTab("weekly")}
            className={`flex-1 py-2 text-sm ${
              activeTab === "weekly"
                ? "bg-purple-600 text-white"
                : "bg-purple-900/50 text-purple-300 hover:bg-purple-800/50"
            }`}
          >
            <CalendarDays className="mr-1 h-3 w-3" />
            Weekly
          </Button>
          <Button
            onClick={() => setActiveTab("alltime")}
            className={`flex-1 py-2 text-sm ${
              activeTab === "alltime"
                ? "bg-purple-600 text-white"
                : "bg-purple-900/50 text-purple-300 hover:bg-purple-800/50"
            }`}
          >
            <Crown className="mr-1 h-3 w-3" />
            All-Time
          </Button>
          <Button
            onClick={() => setActiveTab("multipliers")}
            className={`flex-1 py-2 text-sm ${
              activeTab === "multipliers"
                ? "bg-purple-600 text-white"
                : "bg-purple-900/50 text-purple-300 hover:bg-purple-800/50"
            }`}
          >
            <Flame className="mr-1 h-3 w-3" />
            Top X
          </Button>
          <Button
            onClick={() => setActiveTab("biggest")}
            className={`flex-1 py-2 text-sm ${
              activeTab === "biggest"
                ? "bg-purple-600 text-white"
                : "bg-purple-900/50 text-purple-300 hover:bg-purple-800/50"
            }`}
          >
            <Star className="mr-1 h-3 w-3" />
            Biggest
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {loading && (activeTab === "alltime" || activeTab === "multipliers" || activeTab === "biggest") ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-400">Loading...</p>
            </div>
          ) : (activeTab === "daily" || activeTab === "weekly") && leaderboard ? (
            leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No entries yet</p>
                <p className="text-gray-500 text-sm">Be the first to climb!</p>
              </div>
            ) : (
              leaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${getRankBg(index)}`}
                >
                  <div className="flex-shrink-0">
                    {getRankIcon(index)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">
                      {entry.user.username}
                    </div>
                    <div className="text-xs text-gray-400">
                      {entry.gamesPlayed} games | Best: {parseFloat(entry.bestMultiplier).toFixed(2)}x
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-green-400">
                      +{parseFloat(entry.totalWinnings).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-gray-400">KICKS</div>
                  </div>
                </div>
              ))
            )
          ) : activeTab === "alltime" ? (
            allTimeLeaderboard.length === 0 ? (
              <div className="text-center py-12">
                <Crown className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No all-time records yet</p>
                <p className="text-gray-500 text-sm">Start climbing to be the first!</p>
              </div>
            ) : (
              allTimeLeaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${getRankBg(index)}`}
                >
                  <div className="flex-shrink-0">
                    {getRankIcon(index)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">
                      {entry.username}
                    </div>
                    <div className="text-xs text-gray-400">
                      {entry.gamesWon}/{entry.totalGamesPlayed} wins
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-green-400">
                      +{parseFloat(entry.totalKicksWon).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-gray-400">KICKS Total</div>
                  </div>
                </div>
              ))
            )
          ) : activeTab === "multipliers" ? (
            multipliersLeaderboard.length === 0 ? (
              <div className="text-center py-12">
                <Flame className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No multiplier records yet</p>
                <p className="text-gray-500 text-sm">Land big multipliers to rank!</p>
              </div>
            ) : (
              multipliersLeaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${getRankBg(index)}`}
                >
                  <div className="flex-shrink-0">
                    {getRankIcon(index)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">
                      {entry.username}
                    </div>
                    <div className="text-xs text-gray-400">
                      {entry.totalGamesPlayed} games played
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-yellow-400 text-xl">
                      {parseFloat(entry.highestMultiplier).toFixed(2)}x
                    </div>
                    <div className="text-xs text-gray-400">Best Multiplier</div>
                  </div>
                </div>
              ))
            )
          ) : activeTab === "biggest" ? (
            biggestWins.length === 0 ? (
              <div className="text-center py-12">
                <Star className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No big wins yet</p>
                <p className="text-gray-500 text-sm">Win big to get on this board!</p>
              </div>
            ) : (
              biggestWins.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${getRankBg(index)}`}
                >
                  <div className="flex-shrink-0">
                    {getRankIcon(index)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">
                      {entry.user.username}
                    </div>
                    <div className="text-xs text-gray-400">
                      Bet: {parseFloat(entry.betAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })} | {parseFloat(entry.finalMultiplier || "0").toFixed(2)}x
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-green-400 text-xl">
                      +{parseFloat(entry.payout || "0").toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-gray-400">KICKS Won</div>
                  </div>
                </div>
              ))
            )
          ) : null}
        </div>

        <div className="mt-4 pt-4 border-t border-purple-500/30">
          <Button
            onClick={onClose}
            className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LeaderboardButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { phase } = useGameState();

  if (phase !== "menu") return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="hidden sm:block fixed top-4 right-4 p-3 bg-black/50 hover:bg-black/70 rounded-full border border-yellow-500/30 transition-all z-50"
      >
        <Trophy className="w-6 h-6 text-yellow-400" />
      </button>
      <Leaderboard isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export function LeaderboardButtonMobile({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-2"
    >
      <Trophy className="w-5 h-5 text-yellow-400" />
      <span className="text-[10px] text-gray-400">Ranks</span>
    </button>
  );
}

