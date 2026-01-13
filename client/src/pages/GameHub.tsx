import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/lib/stores/useWallet";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Rabbit, Mountain, ChevronRight, Wallet, LogOut, Footprints, User, Edit2, Check, X, Target, Trophy, ExternalLink, Clock, Award, CheckCircle2, Send, AlertCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatedBackground } from "@/components/ui/animated-background";

interface Mission {
  id: number;
  title: string;
  description: string;
  points: number;
}

interface MissionProgress {
  totalPoints: number;
  completedMissions: number[];
  dailyCount: number;
  dailyLimit: number;
  submissions: { missionId: number; tweetUrl: string; submittedAt: string }[];
}

interface LeaderboardEntry {
  id: number;
  userId: number;
  username: string;
  points: number;
  missionsCompleted: number;
}

interface UserPrize {
  id: number;
  rank: number;
  kicksAmount: string;
  nftAwarded: boolean;
  status: string;
}

interface MissionsPanelProps {
  walletAddress: string | null;
  missions: Mission[];
  missionProgress: MissionProgress | null;
  weeklyLeaderboard: LeaderboardEntry[];
  weekInfo: { weekStart: string; weekEnd: string; daysRemaining: number } | null;
  userPrize: UserPrize | null;
  selectedMission: number | null;
  setSelectedMission: (id: number | null) => void;
  tweetUrl: string;
  setTweetUrl: (url: string) => void;
  isSubmitting: boolean;
  submitError: string | null;
  submitSuccess: string | null;
  showLeaderboard: boolean;
  setShowLeaderboard: (show: boolean) => void;
  onSubmit: () => void;
  onRefresh: () => void;
  onClaimPrize: () => void;
  isClaimingPrize: boolean;
}

function MissionsPanel({
  walletAddress,
  missions,
  missionProgress,
  weeklyLeaderboard,
  weekInfo,
  userPrize,
  selectedMission,
  setSelectedMission,
  tweetUrl,
  setTweetUrl,
  isSubmitting,
  submitError,
  submitSuccess,
  showLeaderboard,
  setShowLeaderboard,
  onSubmit,
  onRefresh,
  onClaimPrize,
  isClaimingPrize,
}: MissionsPanelProps) {
  const completedMissions = missionProgress?.completedMissions || [];
  const dailyCount = missionProgress?.dailyCount || 0;
  const totalPoints = missionProgress?.totalPoints || 0;

  const rankLabels = ["1st", "2nd", "3rd"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {userPrize && userPrize.status === "pending" && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-r from-yellow-500/30 to-orange-500/30 backdrop-blur-sm rounded-2xl p-4 border-2 border-yellow-400"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-black" />
              </div>
              <div>
                <p className="text-yellow-400 font-bold text-lg">
                  {rankLabels[userPrize.rank - 1] || `#${userPrize.rank}`} Place Winner!
                </p>
                <p className="text-white text-sm">
                  Claim {parseFloat(userPrize.kicksAmount).toLocaleString()} KICKS
                  {userPrize.nftAwarded && " + NFT Reward"}
                </p>
              </div>
            </div>
            <Button
              onClick={onClaimPrize}
              disabled={isClaimingPrize}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold"
            >
              {isClaimingPrize ? (
                <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
              ) : (
                <>Claim Prize</>
              )}
            </Button>
          </div>
          {userPrize.nftAwarded && (
            <div className="mt-3 pt-3 border-t border-yellow-400/30">
              <p className="text-yellow-300 text-xs flex items-center gap-2">
                <Star className="w-4 h-4" />
                NFT will be airdropped to your wallet after KICKS claim
              </p>
            </div>
          )}
        </motion.div>
      )}
      <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-yellow-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Weekly Missions</h2>
              <p className="text-gray-400 text-xs">Mon-Fri | Tag @DashKidsnft & @rabbitsonape on X</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-yellow-400 font-bold text-lg">{totalPoints} pts</p>
            <p className="text-gray-400 text-xs">{dailyCount}/3 today</p>
          </div>
        </div>

        {weekInfo && (
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
            <Clock className="w-3 h-3" />
            <span>{weekInfo.daysRemaining} days left this week</span>
          </div>
        )}

        <div className="space-y-2">
          {missions.map((mission) => {
            const isCompleted = completedMissions.includes(mission.id);
            const isSelected = selectedMission === mission.id;
            const canSubmit = !isCompleted && dailyCount < 3;

            return (
              <div key={mission.id}>
                <button
                  onClick={() => canSubmit && setSelectedMission(isSelected ? null : mission.id)}
                  disabled={isCompleted}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    isCompleted
                      ? 'bg-green-500/20 border border-green-500/30'
                      : isSelected
                      ? 'bg-yellow-500/20 border border-yellow-500/50'
                      : 'bg-black/30 border border-gray-700/50 hover:border-yellow-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : (
                        <Target className="w-5 h-5 text-yellow-400" />
                      )}
                      <div>
                        <p className={`font-semibold text-sm ${isCompleted ? 'text-green-400' : 'text-white'}`}>
                          {mission.title}
                        </p>
                        <p className="text-gray-400 text-xs">{mission.description}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${isCompleted ? 'text-green-400' : 'text-yellow-400'}`}>
                      +{mission.points}
                    </span>
                  </div>
                </button>

                <AnimatePresence>
                  {isSelected && !isCompleted && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 bg-black/20 rounded-b-xl border-x border-b border-yellow-500/30">
                        <p className="text-xs text-gray-400 mb-2">
                          Paste your X post link below (must include @DashKidsnft & @rabbitsonape + image/video)
                        </p>
                        <div className="flex gap-2">
                          <Input
                            value={tweetUrl}
                            onChange={(e) => setTweetUrl(e.target.value)}
                            placeholder="https://x.com/yourname/status/..."
                            className="bg-black/30 border-yellow-500/30 text-white text-sm flex-1"
                          />
                          <Button
                            onClick={onSubmit}
                            disabled={!tweetUrl.trim() || isSubmitting}
                            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                          >
                            {isSubmitting ? (
                              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        {submitError && (
                          <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {submitError}
                          </p>
                        )}
                        {submitSuccess && (
                          <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> {submitSuccess}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {dailyCount >= 3 && (
          <div className="mt-4 p-3 bg-orange-500/20 rounded-xl border border-orange-500/30">
            <p className="text-orange-400 text-sm text-center">
              Daily limit reached! Come back tomorrow for more missions.
            </p>
          </div>
        )}
      </div>

      <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-purple-500/30">
        <button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-400" />
            <span className="text-white font-bold">Weekly Leaderboard</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Top 3 win KICKS!</span>
            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showLeaderboard ? 'rotate-90' : ''}`} />
          </div>
        </button>

        <AnimatePresence>
          {showLeaderboard && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-yellow-500/20 rounded-lg p-2 text-center border border-yellow-500/30">
                    <Star className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                    <p className="text-yellow-400 font-bold text-xs">1st: 15K KICKS + NFT</p>
                  </div>
                  <div className="bg-gray-400/20 rounded-lg p-2 text-center border border-gray-400/30">
                    <Star className="w-4 h-4 text-gray-300 mx-auto mb-1" />
                    <p className="text-gray-300 font-bold text-xs">2nd: 10K KICKS</p>
                  </div>
                  <div className="bg-orange-500/20 rounded-lg p-2 text-center border border-orange-500/30">
                    <Star className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                    <p className="text-orange-400 font-bold text-xs">3rd: 5K KICKS</p>
                  </div>
                </div>

                {weeklyLeaderboard.length === 0 ? (
                  <p className="text-gray-400 text-center text-sm py-4">No entries yet. Be the first!</p>
                ) : (
                  weeklyLeaderboard.slice(0, 10).map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        index === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' :
                        index === 1 ? 'bg-gray-400/10 border border-gray-400/20' :
                        index === 2 ? 'bg-orange-500/10 border border-orange-500/20' :
                        'bg-black/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-400 text-black' :
                          index === 2 ? 'bg-orange-500 text-black' :
                          'bg-gray-700 text-white'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="text-white text-sm">{entry.username}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400 font-bold text-sm">{entry.points} pts</p>
                        <p className="text-gray-400 text-xs">{entry.missionsCompleted} missions</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

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
  
  const [missions, setMissions] = useState<Mission[]>([]);
  const [missionProgress, setMissionProgress] = useState<MissionProgress | null>(null);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [weekInfo, setWeekInfo] = useState<{ weekStart: string; weekEnd: string; daysRemaining: number } | null>(null);
  const [selectedMission, setSelectedMission] = useState<number | null>(null);
  const [tweetUrl, setTweetUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [userPrize, setUserPrize] = useState<UserPrize | null>(null);
  const [isClaimingPrize, setIsClaimingPrize] = useState(false);

  const loadMissionsData = useCallback(async () => {
    if (!walletAddress) return;
    
    try {
      const [missionsRes, progressRes, leaderboardRes] = await Promise.all([
        fetch('/api/missions'),
        fetch(`/api/missions/progress/${walletAddress}`),
        fetch('/api/missions/leaderboard/weekly'),
      ]);
      
      if (missionsRes.ok) {
        const data = await missionsRes.json();
        setMissions(data.missions);
      }
      
      if (progressRes.ok) {
        const data = await progressRes.json();
        setMissionProgress(data);
      }
      
      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json();
        setWeeklyLeaderboard(data.leaderboard);
        setWeekInfo({
          weekStart: data.weekStart,
          weekEnd: data.weekEnd,
          daysRemaining: data.daysRemaining,
        });
        if (data.userPrize) {
          setUserPrize(data.userPrize);
        }
      }
      
      const prizeRes = await fetch(`/api/missions/prizes/${walletAddress}`);
      if (prizeRes.ok) {
        const data = await prizeRes.json();
        if (data.prize) {
          setUserPrize(data.prize);
        }
      }
    } catch (error) {
      console.error('Failed to load missions data:', error);
    }
  }, [walletAddress]);

  const handleClaimPrize = useCallback(async () => {
    if (!walletAddress || !userPrize) return;
    
    setIsClaimingPrize(true);
    try {
      const res = await fetch('/api/missions/claim-prize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setUserPrize(null);
        loadMissionsData();
        alert(`Successfully claimed ${data.kicksAmount.toLocaleString()} KICKS!`);
      } else {
        alert(data.error || 'Failed to claim prize');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setIsClaimingPrize(false);
    }
  }, [walletAddress, userPrize, loadMissionsData]);

  const handleMissionSubmit = useCallback(async () => {
    if (!walletAddress || !selectedMission || !tweetUrl.trim()) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    
    try {
      const res = await fetch('/api/missions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          missionId: selectedMission,
          tweetUrl: tweetUrl.trim(),
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSubmitSuccess(data.message);
        setTweetUrl('');
        setSelectedMission(null);
        loadMissionsData();
      } else {
        setSubmitError(data.error || 'Failed to submit mission');
      }
    } catch (error) {
      setSubmitError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [walletAddress, selectedMission, tweetUrl, loadMissionsData]);

  useEffect(() => {
    if (activeTab === 'missions' && walletAddress) {
      loadMissionsData();
    }
  }, [activeTab, walletAddress, loadMissionsData]);

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
              <MissionsPanel
                walletAddress={walletAddress}
                missions={missions}
                missionProgress={missionProgress}
                weeklyLeaderboard={weeklyLeaderboard}
                weekInfo={weekInfo}
                userPrize={userPrize}
                selectedMission={selectedMission}
                setSelectedMission={setSelectedMission}
                tweetUrl={tweetUrl}
                setTweetUrl={setTweetUrl}
                isSubmitting={isSubmitting}
                submitError={submitError}
                submitSuccess={submitSuccess}
                showLeaderboard={showLeaderboard}
                setShowLeaderboard={setShowLeaderboard}
                onSubmit={handleMissionSubmit}
                onRefresh={loadMissionsData}
                onClaimPrize={handleClaimPrize}
                isClaimingPrize={isClaimingPrize}
              />
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
