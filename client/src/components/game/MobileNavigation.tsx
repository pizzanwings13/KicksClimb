import { useState } from "react";
import { useWallet } from "@/lib/stores/useWallet";
import { useGameState } from "@/lib/stores/useGameState";
import { Trophy } from "lucide-react";
import { Leaderboard } from "./Leaderboard";

export function MobileNavigation() {
  const { isConnected } = useWallet();
  const { phase } = useGameState();
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const showNav = isConnected && (phase === "menu" || phase === "betting");

  if (!showNav) return null;

  return (
    <>
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-purple-500/30 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex justify-center items-center py-3">
          <button
            onClick={() => setShowLeaderboard(true)}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border border-yellow-500/30"
          >
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-yellow-400 font-medium">Leaderboards</span>
          </button>
        </div>
      </div>

      <Leaderboard isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
    </>
  );
}
