import { useEffect, useState } from "react";
import { useWallet } from "@/lib/stores/useWallet";
import { useGameState } from "@/lib/stores/useGameState";
import { Button } from "@/components/ui/button";
import { 
  X, Trophy, Medal, Award, Target, Flame, Crown, 
  Star, Coins, Zap, Shield, Mountain, Lock
} from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_climb",
    name: "First Climb",
    description: "Complete your first game",
    icon: Mountain,
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    rarity: "common",
  },
  {
    id: "veteran_climber",
    name: "Veteran Climber",
    description: "Play 10 games",
    icon: Target,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    rarity: "common",
  },
  {
    id: "dedicated_climber",
    name: "Dedicated Climber",
    description: "Play 50 games",
    icon: Shield,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    rarity: "rare",
  },
  {
    id: "master_climber",
    name: "Master Climber",
    description: "Play 100 games",
    icon: Crown,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
    rarity: "epic",
  },
  {
    id: "first_win",
    name: "First Victory",
    description: "Win your first game",
    icon: Trophy,
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    rarity: "common",
  },
  {
    id: "winner",
    name: "Winner",
    description: "Win 10 games",
    icon: Medal,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    rarity: "rare",
  },
  {
    id: "champion",
    name: "Champion",
    description: "Win 50 games",
    icon: Award,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    rarity: "epic",
  },
  {
    id: "multiplier_hunter",
    name: "Multiplier Hunter",
    description: "Reach a 5x multiplier",
    icon: Zap,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
    rarity: "common",
  },
  {
    id: "big_multiplier",
    name: "Big Multiplier",
    description: "Reach a 10x multiplier",
    icon: Flame,
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    rarity: "rare",
  },
  {
    id: "legendary_multiplier",
    name: "Legendary Multiplier",
    description: "Reach the 10x maximum multiplier",
    icon: Star,
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
    rarity: "legendary",
  },
  {
    id: "thousand_kicks",
    name: "Kick Collector",
    description: "Win 1,000 KICKS total",
    icon: Coins,
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    rarity: "common",
  },
  {
    id: "ten_thousand_kicks",
    name: "Rich Climber",
    description: "Win 10,000 KICKS total",
    icon: Coins,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
    rarity: "rare",
  },
  {
    id: "hundred_thousand_kicks",
    name: "KICKS Whale",
    description: "Win 100,000 KICKS total",
    icon: Crown,
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
    rarity: "legendary",
  },
];

const RARITY_COLORS = {
  common: "border-gray-500/30",
  rare: "border-blue-500/30",
  epic: "border-purple-500/30",
  legendary: "border-yellow-500/30",
};

const RARITY_LABELS = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AchievementsModal({ isOpen, onClose }: AchievementsModalProps) {
  const { walletAddress } = useWallet();
  const [userAchievements, setUserAchievements] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && walletAddress) {
      fetchAchievements();
    }
  }, [isOpen, walletAddress]);

  const fetchAchievements = async () => {
    if (!walletAddress) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/user/${walletAddress}/achievements`);
      const data = await res.json();
      if (data.achievements) {
        setUserAchievements(data.achievements.map((a: any) => a.achievementId));
      }
    } catch (error) {
      console.error("Failed to fetch achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const unlockedCount = userAchievements.length;
  const totalCount = ACHIEVEMENTS.length;
  const progressPercent = (unlockedCount / totalCount) * 100;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
      <div className="bg-gradient-to-b from-purple-900/90 to-indigo-900/90 rounded-2xl p-6 max-w-lg w-full mx-4 border border-purple-500/30 max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Achievements
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Progress</span>
            <span className="text-white font-semibold">{unlockedCount} / {totalCount}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-yellow-500 to-orange-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-400">Loading achievements...</p>
            </div>
          ) : (
            ACHIEVEMENTS.map((achievement) => {
              const isUnlocked = userAchievements.includes(achievement.id);
              const Icon = achievement.icon;
              
              return (
                <div
                  key={achievement.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${
                    isUnlocked 
                      ? `${achievement.bgColor} ${RARITY_COLORS[achievement.rarity]}` 
                      : "bg-black/30 border-gray-600/30 opacity-60"
                  }`}
                >
                  <div className={`p-3 rounded-xl ${isUnlocked ? achievement.bgColor : "bg-gray-700/50"}`}>
                    {isUnlocked ? (
                      <Icon className={`w-6 h-6 ${achievement.color}`} />
                    ) : (
                      <Lock className="w-6 h-6 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${isUnlocked ? "text-white" : "text-gray-400"}`}>
                        {achievement.name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isUnlocked 
                          ? `${achievement.bgColor} ${achievement.color}` 
                          : "bg-gray-700/50 text-gray-500"
                      }`}>
                        {RARITY_LABELS[achievement.rarity]}
                      </span>
                    </div>
                    <p className={`text-sm ${isUnlocked ? "text-gray-300" : "text-gray-500"}`}>
                      {achievement.description}
                    </p>
                  </div>
                  {isUnlocked && (
                    <div className="flex-shrink-0">
                      <Trophy className="w-5 h-5 text-yellow-400" />
                    </div>
                  )}
                </div>
              );
            })
          )}
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

export function AchievementsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { walletAddress, isConnected } = useWallet();
  const { phase } = useGameState();

  const showButton = isConnected && walletAddress && (phase === "menu" || phase === "betting");

  if (!showButton) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="hidden sm:block fixed top-4 right-36 p-3 bg-black/50 hover:bg-black/70 rounded-full border border-purple-500/30 transition-all z-50"
      >
        <Award className="w-6 h-6 text-purple-400" />
      </button>
      <AchievementsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export function AchievementsButtonMobile({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-2"
    >
      <Award className="w-5 h-5 text-purple-400" />
      <span className="text-[10px] text-gray-400">Badges</span>
    </button>
  );
}

