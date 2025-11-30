import { useState } from "react";
import { useWallet } from "@/lib/stores/useWallet";
import { useGameState } from "@/lib/stores/useGameState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, X, Wallet, Trophy, Gamepad2, TrendingUp, TrendingDown } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { walletAddress, kicksBalance } = useWallet();
  const { user, updateProfile } = useGameState();
  const [username, setUsername] = useState(user?.username || "");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !user) return null;

  const handleSave = async () => {
    if (!walletAddress || !username.trim()) return;
    setIsSaving(true);
    await updateProfile(walletAddress, username.trim());
    setIsSaving(false);
    onClose();
  };

  const winRate = user.totalGamesPlayed > 0
    ? ((user.gamesWon / user.totalGamesPlayed) * 100).toFixed(1)
    : "0";

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
      <div className="bg-gradient-to-b from-purple-900/90 to-indigo-900/90 rounded-2xl p-6 max-w-md w-full mx-4 border border-purple-500/30">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <User className="w-6 h-6 text-purple-400" />
            Your Profile
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-black/30 rounded-xl p-4 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-3">
              <Wallet className="w-5 h-5 text-purple-400" />
              <span className="text-gray-400 text-sm">Wallet Address</span>
            </div>
            <p className="text-white font-mono text-sm break-all">
              {walletAddress}
            </p>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="bg-black/30 border-purple-500/30 text-white"
            />
          </div>

          <div className="bg-black/30 rounded-xl p-4 border border-yellow-500/20">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">KICKS Balance</span>
              <span className="text-2xl font-bold text-yellow-400">
                {parseFloat(kicksBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/30 rounded-xl p-4 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Gamepad2 className="w-4 h-4 text-purple-400" />
                <span className="text-gray-400 text-sm">Games Played</span>
              </div>
              <p className="text-2xl font-bold text-white">{user.totalGamesPlayed}</p>
            </div>

            <div className="bg-black/30 rounded-xl p-4 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-gray-400 text-sm">Win Rate</span>
              </div>
              <p className="text-2xl font-bold text-white">{winRate}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/30 rounded-xl p-4 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-gray-400 text-sm">Total Won</span>
              </div>
              <p className="text-xl font-bold text-green-400">
                +{parseFloat(user.totalKicksWon).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>

            <div className="bg-black/30 rounded-xl p-4 border border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-gray-400 text-sm">Total Lost</span>
              </div>
              <p className="text-xl font-bold text-red-400">
                -{parseFloat(user.totalKicksLost).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          <div className="bg-black/30 rounded-xl p-4 border border-yellow-500/20">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Best Multiplier</span>
              <span className="text-2xl font-bold text-yellow-400">
                {parseFloat(user.highestMultiplier).toFixed(2)}x
              </span>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving || !username.trim()}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl"
          >
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProfileButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { isConnected } = useWallet();
  const { phase } = useGameState();

  if (!isConnected || phase !== "menu") return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 p-3 bg-black/50 hover:bg-black/70 rounded-full border border-purple-500/30 transition-all z-50"
      >
        <User className="w-6 h-6 text-purple-400" />
      </button>
      <ProfileModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
