import { useState, useRef } from "react";
import { useWallet } from "@/lib/stores/useWallet";
import { useGameState } from "@/lib/stores/useGameState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, X, Wallet, Trophy, Gamepad2, TrendingUp, TrendingDown, Camera, Upload, LogOut } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { walletAddress, kicksBalance, disconnect } = useWallet();
  const { user, updateProfile, reset, setUser, connectUser } = useGameState();
  const [username, setUsername] = useState(user?.username || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRetryConnect = async () => {
    if (!walletAddress) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await connectUser(walletAddress);
      if (!result) {
        setError("Failed to connect. Please try again.");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    }
    setIsLoading(false);
  };

  if (!isOpen) return null;

  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 p-4">
        <div className="bg-gradient-to-b from-purple-900/90 to-indigo-900/90 rounded-xl p-4 max-w-sm w-full border border-purple-500/30">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-purple-400" />
              Profile
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="text-center py-6">
            {isLoading ? (
              <p className="text-gray-300">Loading profile...</p>
            ) : (
              <>
                <p className="text-gray-300 mb-4">
                  {error || "Unable to load profile. Please try again."}
                </p>
                <Button
                  onClick={handleRetryConnect}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  Retry Connection
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be smaller than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!walletAddress || !username.trim()) return;
    setIsSaving(true);
    await updateProfile(walletAddress, username.trim(), avatarPreview || undefined);
    setIsSaving(false);
    onClose();
  };

  const handleSignOut = () => {
    disconnect();
    setUser(null);
    reset();
    onClose();
  };

  const winRate = user.totalGamesPlayed > 0
    ? ((user.gamesWon / user.totalGamesPlayed) * 100).toFixed(1)
    : "0";

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 p-4">
      <div className="bg-gradient-to-b from-purple-900/90 to-indigo-900/90 rounded-xl p-4 max-w-sm w-full border border-purple-500/30 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" />
            Profile
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
          <div className="flex justify-center">
            <div className="relative">
              <div 
                className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center overflow-hidden border-3 border-purple-500/50 cursor-pointer hover:border-purple-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-white/70" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1.5 bg-purple-600 hover:bg-purple-500 rounded-full border-2 border-purple-900 transition-colors"
              >
                <Camera className="w-3 h-3 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="bg-black/30 rounded-lg p-3 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-purple-400" />
              <span className="text-gray-400 text-xs">Wallet</span>
            </div>
            <p className="text-white font-mono text-xs break-all">
              {walletAddress?.slice(0, 10)}...{walletAddress?.slice(-8)}
            </p>
          </div>

          <div>
            <label className="block text-gray-400 text-xs mb-1">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="bg-black/30 border-purple-500/30 text-white h-9 text-sm"
            />
          </div>

          <div className="bg-black/30 rounded-lg p-3 border border-yellow-500/20">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">KICKS Balance</span>
              <span className="text-lg font-bold text-yellow-400">
                {parseFloat(kicksBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-black/30 rounded-lg p-2 border border-purple-500/20">
              <div className="flex items-center gap-1 mb-1">
                <Gamepad2 className="w-3 h-3 text-purple-400" />
                <span className="text-gray-400 text-xs">Games</span>
              </div>
              <p className="text-lg font-bold text-white">{user.totalGamesPlayed}</p>
            </div>

            <div className="bg-black/30 rounded-lg p-2 border border-purple-500/20">
              <div className="flex items-center gap-1 mb-1">
                <Trophy className="w-3 h-3 text-yellow-400" />
                <span className="text-gray-400 text-xs">Win Rate</span>
              </div>
              <p className="text-lg font-bold text-white">{winRate}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-black/30 rounded-lg p-2 border border-green-500/20">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-green-400" />
                <span className="text-gray-400 text-xs">Won</span>
              </div>
              <p className="text-sm font-bold text-green-400">
                +{parseFloat(user.totalKicksWon).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>

            <div className="bg-black/30 rounded-lg p-2 border border-red-500/20">
              <div className="flex items-center gap-1 mb-1">
                <TrendingDown className="w-3 h-3 text-red-400" />
                <span className="text-gray-400 text-xs">Lost</span>
              </div>
              <p className="text-sm font-bold text-red-400">
                -{parseFloat(user.totalKicksLost).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          <div className="bg-black/30 rounded-lg p-2 border border-yellow-500/20">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Best Multiplier</span>
              <span className="text-lg font-bold text-yellow-400">
                {parseFloat(user.highestMultiplier).toFixed(2)}x
              </span>
            </div>
          </div>
        </div>

        <div className="pt-3 space-y-2 border-t border-purple-500/20 mt-3">
          <Button
            onClick={handleSave}
            disabled={isSaving || !username.trim()}
            className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-lg text-sm"
          >
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>

          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full py-2 border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-semibold rounded-lg text-sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProfileButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { isConnected } = useWallet();
  const { phase, user } = useGameState();

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
