import { useState } from "react";
import { useWallet } from "@/lib/stores/useWallet";
import { useGameState } from "@/lib/stores/useGameState";
import { User, BarChart2, Award, Trophy } from "lucide-react";
import { ProfileModal } from "./ProfileModal";
import { StatsModal } from "./StatsModal";
import { AchievementsModal } from "./AchievementsModal";
import { Leaderboard } from "./Leaderboard";

export function MobileNavigation() {
  const { isConnected } = useWallet();
  const { phase } = useGameState();
  const [activeModal, setActiveModal] = useState<"profile" | "stats" | "achievements" | "leaderboard" | null>(null);

  const showNav = isConnected && (phase === "menu" || phase === "betting");

  if (!showNav) return null;

  return (
    <>
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-purple-500/30 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex justify-around items-center py-2">
          <button
            onClick={() => setActiveModal("profile")}
            className="flex flex-col items-center gap-1 p-2 min-w-[60px]"
          >
            <User className="w-5 h-5 text-purple-400" />
            <span className="text-[10px] text-gray-400">Profile</span>
          </button>
          
          <button
            onClick={() => setActiveModal("stats")}
            className="flex flex-col items-center gap-1 p-2 min-w-[60px]"
          >
            <BarChart2 className="w-5 h-5 text-purple-400" />
            <span className="text-[10px] text-gray-400">Stats</span>
          </button>
          
          <button
            onClick={() => setActiveModal("achievements")}
            className="flex flex-col items-center gap-1 p-2 min-w-[60px]"
          >
            <Award className="w-5 h-5 text-purple-400" />
            <span className="text-[10px] text-gray-400">Badges</span>
          </button>
          
          <button
            onClick={() => setActiveModal("leaderboard")}
            className="flex flex-col items-center gap-1 p-2 min-w-[60px]"
          >
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-[10px] text-gray-400">Ranks</span>
          </button>
        </div>
      </div>

      <ProfileModal isOpen={activeModal === "profile"} onClose={() => setActiveModal(null)} />
      <StatsModal isOpen={activeModal === "stats"} onClose={() => setActiveModal(null)} />
      <AchievementsModal isOpen={activeModal === "achievements"} onClose={() => setActiveModal(null)} />
      <Leaderboard isOpen={activeModal === "leaderboard"} onClose={() => setActiveModal(null)} />
    </>
  );
}
