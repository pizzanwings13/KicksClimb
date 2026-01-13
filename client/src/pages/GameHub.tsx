import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/lib/stores/useWallet";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Rabbit, Mountain, ChevronRight, Wallet, LogOut, Footprints, User, Edit2, Check, X, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatedBackground } from "@/components/ui/animated-background";

const GLOBAL_USERNAME_KEY = 'tokenrush_global_username';
const GLOBAL_AVATAR_KEY = 'tokenrush_global_avatar';

const AVATAR_OPTIONS = [
  { id: 'rabbit1', emoji: '🐰', label: 'Bunny' },
  { id: 'rocket', emoji: '🚀', label: 'Rocket' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'star', emoji: '⭐', label: 'Star' },
  { id: 'diamond', emoji: '💎', label: 'Diamond' },
  { id: 'crown', emoji: '👑', label: 'Crown' },
  { id: 'ninja', emoji: '🥷', label: 'Ninja' },
  { id: 'alien', emoji: '👽', label: 'Alien' },
  { id: 'robot', emoji: '🤖', label: 'Robot' },
  { id: 'skull', emoji: '💀', label: 'Skull' },
  { id: 'ghost', emoji: '👻', label: 'Ghost' },
  { id: 'wolf', emoji: '🐺', label: 'Wolf' },
];

interface GameCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  gradient: string;
  available: boolean;
  comingSoon?: boolean;
}

function GameCard({ title, description, icon, route, gradient, available, comingSoon }: GameCardProps) {
  const [, setLocation] = useLocation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={available ? { scale: 1.02 } : {}}
      whileTap={available ? { scale: 0.98 } : {}}
      className={`relative overflow-hidden rounded-2xl border ${
        available 
          ? "border-purple-500/30 cursor-pointer" 
          : "border-gray-700/30 opacity-60"
      }`}
      onClick={() => available && setLocation(route)}
    >
      <div className={`absolute inset-0 ${gradient} opacity-20`} />
      <div className="relative p-6 backdrop-blur-sm">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl ${gradient}`}>
            {icon}
          </div>
          {comingSoon && (
            <span className="px-3 py-1 text-xs font-semibold bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30">
              Coming Soon
            </span>
          )}
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm mb-4">{description}</p>
        {available && (
          <div className="flex items-center text-purple-400 font-semibold">
            <span>Play Now</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

const GAMES: GameCardProps[] = [
  {
    title: "Kicks Climb",
    description: "Bet KICKS tokens and climb 100 steps. Land on multipliers to boost winnings, avoid hazards, or cash out anytime!",
    icon: <Mountain className="w-6 h-6 text-white" />,
    route: "/kicks-climb",
    gradient: "bg-gradient-to-br from-purple-600 to-indigo-600",
    available: true,
  },
  {
    title: "Rabbit Rush",
    description: "Pilot your rocket through space! Collect multipliers, avoid asteroids and enemies, cash out before you crash!",
    icon: <Rabbit className="w-6 h-6 text-white" />,
    route: "/rabbit-rush",
    gradient: "bg-gradient-to-br from-orange-500 to-pink-500",
    available: true,
  },
  {
    title: "Night Drive",
    description: "Race through the neon city at night! Dodge traffic, collect coins & carrots, reach the finish line!",
    icon: <Footprints className="w-6 h-6 text-white" />,
    route: "/endless-runner",
    gradient: "bg-gradient-to-br from-sky-500 to-blue-600",
    available: true,
  },
  {
    title: "Rabbits Blade",
    description: "Slice vegetables and coins! Avoid bombs, catch Thor's Hammer for ultimate destruction!",
    icon: <Rabbit className="w-6 h-6 text-white" />,
    route: "/bunny-blade",
    gradient: "bg-gradient-to-br from-red-600 to-red-800",
    available: true,
  },
];

export function GameHub() {
  const { walletAddress, kicksBalance, disconnect, isConnected } = useWallet();
  const [username, setUsername] = useState<string>('');
  const [avatar, setAvatar] = useState<string>('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'games' | 'missions'>('games');

  const loadProfile = useCallback(async () => {
    if (!walletAddress) return;
    
    setIsLoading(true);
    
    const savedGlobalUsername = localStorage.getItem(GLOBAL_USERNAME_KEY);
    const savedGlobalAvatar = localStorage.getItem(GLOBAL_AVATAR_KEY);
    
    try {
      const res = await fetch(`/api/user/${walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        const dbUsername = data.user?.username;
        const dbAvatar = data.user?.avatarUrl;
        
        if (dbUsername && !dbUsername.startsWith('Player_')) {
          setUsername(dbUsername);
          localStorage.setItem(GLOBAL_USERNAME_KEY, dbUsername);
        } else if (savedGlobalUsername) {
          setUsername(savedGlobalUsername);
          await fetch(`/api/user/${walletAddress}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: savedGlobalUsername })
          });
        } else {
          setUsername('');
        }
        
        if (dbAvatar) {
          setAvatar(dbAvatar);
          localStorage.setItem(GLOBAL_AVATAR_KEY, dbAvatar);
        } else if (savedGlobalAvatar) {
          setAvatar(savedGlobalAvatar);
          await fetch(`/api/user/${walletAddress}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatarUrl: savedGlobalAvatar })
          });
        }
      } else {
        await fetch('/api/auth/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            walletAddress, 
            username: savedGlobalUsername || undefined 
          })
        });
        
        if (savedGlobalUsername) {
          setUsername(savedGlobalUsername);
        }
        if (savedGlobalAvatar) {
          setAvatar(savedGlobalAvatar);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      if (savedGlobalUsername) {
        setUsername(savedGlobalUsername);
      }
      if (savedGlobalAvatar) {
        setAvatar(savedGlobalAvatar);
      }
    }
    
    setIsLoading(false);
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) {
      loadProfile();
    }
  }, [walletAddress, loadProfile]);

  const handleSaveUsername = async () => {
    if (!usernameInput.trim() || !walletAddress) return;
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/user/${walletAddress}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput.trim() })
      });
      
      if (res.ok) {
        setUsername(usernameInput.trim());
        localStorage.setItem(GLOBAL_USERNAME_KEY, usernameInput.trim());
        setEditingUsername(false);
      }
    } catch (error) {
      console.error('Failed to save username:', error);
    }
    setIsSaving(false);
  };

  const handleSelectAvatar = async (avatarId: string) => {
    if (!walletAddress) return;
    
    try {
      const res = await fetch(`/api/user/${walletAddress}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: avatarId })
      });
      
      if (res.ok) {
        setAvatar(avatarId);
        localStorage.setItem(GLOBAL_AVATAR_KEY, avatarId);
        setShowAvatarPicker(false);
      }
    } catch (error) {
      console.error('Failed to save avatar:', error);
    }
  };

  const startEditing = () => {
    setUsernameInput(username);
    setEditingUsername(true);
  };

  const cancelEditing = () => {
    setUsernameInput('');
    setEditingUsername(false);
  };
  
  const getAvatarEmoji = (avatarId: string) => {
    const found = AVATAR_OPTIONS.find(a => a.id === avatarId);
    return found?.emoji || '👤';
  };

  if (!isConnected) {
    return null;
  }

  const hasUsername = username && username.trim().length > 0;

  return (
    <AnimatedBackground>
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex flex-col items-center justify-center">
            <img 
              src="/textures/tokenrush-logo.png" 
              alt="Token Rush" 
              className="w-48 h-48 md:w-56 md:h-56"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 mb-8 border border-purple-500/30"
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Wallet className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Connected Wallet</p>
                  <p className="text-white font-medium">
                    {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center sm:text-right">
                  <p className="text-gray-400 text-xs">KICKS Balance</p>
                  <p className="text-xl font-bold text-yellow-400">
                    {parseFloat(kicksBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={disconnect}
                  className="text-gray-400 hover:text-white hover:bg-red-500/20"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="border-t border-purple-500/20 pt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-2">
                  <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full" />
                  <span className="ml-2 text-gray-400 text-sm">Loading...</span>
                </div>
              ) : hasUsername && !editingUsername ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowAvatarPicker(true)}
                      className="relative group"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-2xl border-2 border-purple-400/50 group-hover:border-purple-400 transition-colors">
                        {avatar ? getAvatarEmoji(avatar) : '👤'}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center border border-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit2 className="w-2.5 h-2.5 text-white" />
                      </div>
                    </button>
                    <div>
                      <p className="text-gray-400 text-xs">Profile</p>
                      <p className="text-white font-bold text-lg">{username}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startEditing}
                    className="text-gray-400 hover:text-white hover:bg-purple-500/20"
                    title="Edit username"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-400" />
                    <p className="text-white font-semibold">
                      {editingUsername ? "Change Username" : "Choose Your Username"}
                    </p>
                  </div>
                  <p className="text-gray-400 text-sm">
                    {editingUsername 
                      ? "Enter a new display name for your profile"
                      : "Set a display name to appear on leaderboards across all games"
                    }
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="Enter username..."
                      className="bg-black/30 border-purple-500/30 text-white flex-1"
                      maxLength={20}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveUsername()}
                    />
                    <Button
                      onClick={handleSaveUsername}
                      disabled={!usernameInput.trim() || isSaving}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                      {isSaving ? (
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </Button>
                    {editingUsername && (
                      <Button
                        variant="ghost"
                        onClick={cancelEditing}
                        className="text-gray-400 hover:text-white hover:bg-red-500/20"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {hasUsername ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="flex gap-2 mb-6"
            >
              <Button
                onClick={() => setActiveTab('games')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  activeTab === 'games'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                    : 'bg-black/40 text-gray-400 hover:text-white border border-purple-500/30'
                }`}
              >
                <Rabbit className="w-5 h-5 mr-2" />
                Games
              </Button>
              <Button
                onClick={() => setActiveTab('missions')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  activeTab === 'missions'
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                    : 'bg-black/40 text-gray-400 hover:text-white border border-yellow-500/30'
                }`}
              >
                <Target className="w-5 h-5 mr-2" />
                Missions
              </Button>
            </motion.div>

            {activeTab === 'games' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {GAMES.map((game, index) => (
                  <motion.div
                    key={game.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <GameCard {...game} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-yellow-500/30"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Trophy className="w-8 h-8 text-yellow-400" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">Daily Missions</h2>
                    <p className="text-gray-400 text-sm">Complete missions to earn bonus KICKS!</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-black/30 rounded-xl p-4 border border-gray-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <Target className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-white font-semibold">Missions Coming Soon</p>
                        <p className="text-gray-400 text-sm">Check back for daily challenges!</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-12"
          >
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20 max-w-md mx-auto">
              <User className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Set Your Username</h3>
              <p className="text-gray-400 text-sm">
                Choose a username above to unlock all games and compete on the leaderboards!
              </p>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-500 text-sm">
            More games coming soon! Stay tuned for new ways to win.
          </p>
        </motion.div>
        </div>
      </div>
      
      <AnimatePresence>
        {showAvatarPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAvatarPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-purple-500/30"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-2 text-center">Choose Your Avatar</h3>
              <p className="text-gray-400 text-sm text-center mb-6">Pick an avatar to represent you on the leaderboards</p>
              
              <div className="grid grid-cols-4 gap-3 mb-6">
                {AVATAR_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectAvatar(opt.id)}
                    className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl transition-all ${
                      avatar === opt.id
                        ? 'bg-purple-600 border-2 border-purple-400 scale-110'
                        : 'bg-gray-800 border border-gray-700 hover:border-purple-500 hover:bg-gray-700'
                    }`}
                    title={opt.label}
                  >
                    {opt.emoji}
                  </button>
                ))}
              </div>
              
              <Button
                variant="ghost"
                onClick={() => setShowAvatarPicker(false)}
                className="w-full text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedBackground>
  );
}
