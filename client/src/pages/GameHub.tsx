import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@/lib/stores/useWallet";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Rabbit, Mountain, ChevronRight, Wallet, LogOut, Footprints, User, Edit2, Check, X, Target, Trophy, ExternalLink, Clock, Award, CheckCircle2, Send, AlertCircle, Star, Volume2, VolumeX, Gamepad2, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Mission {
  id: number;
  title: string;
  description: string;
  points: number;
  requiredMentions?: string[];
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

const MISSION_COLORS = [
  'bg-[#FF1493]', // Hot Pink
  'bg-[#00FFFF]', // Cyan
  'bg-[#39FF14]', // Lime Green
  'bg-[#FF6B35]', // Orange
  'bg-[#BC13FE]', // Neon Purple
  'bg-[#FFD700]', // Gold
  'bg-[#00FF7F]', // Spring Green
  'bg-[#FF4500]', // Red Orange
  'bg-[#7B68EE]', // Medium Slate Blue
  'bg-[#00CED1]', // Dark Turquoise
];

function GlowOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute w-96 h-96 rounded-full blur-[120px]"
        style={{ background: 'rgba(188, 19, 254, 0.1)', top: '10%', left: '10%' }}
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-80 h-80 rounded-full blur-[100px]"
        style={{ background: 'rgba(0, 255, 255, 0.1)', top: '50%', right: '5%' }}
        animate={{
          x: [0, -40, 0],
          y: [0, 50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute w-72 h-72 rounded-full blur-[80px]"
        style={{ background: 'rgba(57, 255, 20, 0.1)', bottom: '20%', left: '30%' }}
        animate={{
          x: [0, 60, 0],
          y: [0, -40, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />
    </div>
  );
}

function GrainOverlay() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none opacity-[0.03]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}

function CharacterMarquee() {
  const characters = ['🐰', '🚀', '🎮', '💎', '⭐', '🔥', '👑', '🎯', '💰', '🏆', '🎪', '🎲'];
  
  return (
    <div className="fixed bottom-0 left-0 right-0 h-[20vh] overflow-hidden pointer-events-none z-10">
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] to-transparent" />
      <motion.div
        className="flex items-center h-full"
        animate={{ x: [0, -1200] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        {[...characters, ...characters, ...characters, ...characters].map((char, i) => (
          <motion.span
            key={i}
            className="text-6xl mx-8 opacity-20"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
          >
            {char}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}

function ArcadeCard({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <div 
      className={`bg-[#1a1a1a] border-[5px] border-black ${className}`}
      style={{ boxShadow: '6px 6px 0px black' }}
      onClick={onClick}
    >
      {children}
    </div>
  );
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
  setSubmitError: (error: string | null) => void;
  submitSuccess: string | null;
  setSubmitSuccess: (success: string | null) => void;
  showLeaderboard: boolean;
  setShowLeaderboard: (show: boolean) => void;
  onSubmit: () => void;
  onRefresh: () => void;
  onClaimPrize: () => void;
  isClaimingPrize: boolean;
  playBlip: () => void;
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
  setSubmitError,
  submitSuccess,
  setSubmitSuccess,
  showLeaderboard,
  setShowLeaderboard,
  onSubmit,
  onRefresh,
  onClaimPrize,
  isClaimingPrize,
  playBlip,
}: MissionsPanelProps) {
  const completedMissions = missionProgress?.completedMissions || [];
  const dailyCount = missionProgress?.dailyCount || 0;
  const totalPoints = missionProgress?.totalPoints || 0;

  const rankLabels = ["1st", "2nd", "3rd"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {userPrize && userPrize.status === "pending" && (
        <ArcadeCard className="p-4 border-[#FFD700]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-[#FFD700] border-[3px] border-black flex items-center justify-center" style={{ boxShadow: '3px 3px 0px black' }}>
                <Trophy className="w-8 h-8 text-black" />
              </div>
              <div>
                <p className="text-[#FFD700] font-black text-xl uppercase tracking-wider" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                  {rankLabels[userPrize.rank - 1] || `#${userPrize.rank}`} WINNER!
                </p>
                <p className="text-white text-sm mt-1">
                  Claim {parseFloat(userPrize.kicksAmount).toLocaleString()} KICKS
                  {userPrize.nftAwarded && " + NFT"}
                </p>
              </div>
            </div>
            <button
              onClick={() => { playBlip(); onClaimPrize(); }}
              disabled={isClaimingPrize}
              className="px-6 py-3 bg-[#FFD700] text-black font-black uppercase border-[3px] border-black hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform"
              style={{ boxShadow: '4px 4px 0px black' }}
            >
              {isClaimingPrize ? "..." : "CLAIM"}
            </button>
          </div>
        </ArcadeCard>
      )}

      <ArcadeCard className="p-5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#BC13FE] border-[3px] border-black flex items-center justify-center" style={{ boxShadow: '3px 3px 0px black' }}>
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wide">WEEKLY MISSIONS</h2>
              <p className="text-gray-400 text-xs mt-1">Tag @DashKidsnft & @rabbitsonape</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[#39FF14] font-black text-2xl" style={{ fontFamily: "'Press Start 2P', monospace" }}>{totalPoints}</p>
            <p className="text-gray-400 text-xs">{dailyCount}/3 TODAY</p>
          </div>
        </div>

        {weekInfo && (
          <div className="flex items-center gap-2 text-sm text-[#00FFFF] mb-4 bg-black/50 px-3 py-2 border-2 border-[#00FFFF]/30">
            <Clock className="w-4 h-4" />
            <span className="font-bold">{weekInfo.daysRemaining} DAYS LEFT</span>
          </div>
        )}

        <div className="space-y-3 pr-2">
          {missions.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p className="font-bold">LOADING MISSIONS...</p>
            </div>
          )}
          {missions.map((mission, index) => {
            const isCompleted = completedMissions.includes(mission.id);
            const isSelected = selectedMission === mission.id;
            const canSubmit = !isCompleted && dailyCount < 3;
            const colorClass = MISSION_COLORS[index % MISSION_COLORS.length];

            return (
              <div key={mission.id}>
                <motion.button
                  onClick={() => {
                    playBlip();
                    if (canSubmit) {
                      setSelectedMission(isSelected ? null : mission.id);
                      setTweetUrl('');
                      setSubmitError(null);
                      setSubmitSuccess(null);
                    }
                  }}
                  disabled={isCompleted}
                  whileHover={canSubmit ? { x: -4, y: -4 } : {}}
                  className={`w-full text-left p-4 border-[4px] border-black transition-all ${
                    isCompleted
                      ? 'bg-[#2a2a2a] opacity-60'
                      : isSelected
                      ? `${colorClass} text-black`
                      : `${colorClass} text-black hover:brightness-110`
                  }`}
                  style={{ boxShadow: isSelected ? '2px 2px 0px black' : '4px 4px 0px black' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-[#39FF14]" />
                      ) : (
                        <Zap className="w-6 h-6" />
                      )}
                      <div>
                        <p className={`font-black text-sm uppercase ${isCompleted ? 'text-gray-400' : ''}`}>
                          {mission.title}
                        </p>
                        <p className={`text-xs mt-1 ${isCompleted ? 'text-gray-500' : 'opacity-80'}`}>
                          {mission.description}
                        </p>
                      </div>
                    </div>
                    <span className={`text-lg font-black ${isCompleted ? 'text-gray-400' : ''}`} style={{ fontFamily: "'Press Start 2P', monospace" }}>
                      +{mission.points}
                    </span>
                  </div>
                </motion.button>

                <AnimatePresence>
                  {isSelected && !isCompleted && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-[#1a1a1a] border-x-[4px] border-b-[4px] border-black">
                        <p className="text-xs text-gray-400 mb-3">
                          Paste your X post link (must include {mission.requiredMentions?.map(m => `@${m}`).join(' & ') || '@DashKidsnft & @rabbitsonape'} + media)
                        </p>
                        <div className="flex gap-2">
                          <input
                            value={tweetUrl}
                            onChange={(e) => setTweetUrl(e.target.value)}
                            placeholder="https://x.com/..."
                            className="flex-1 bg-black border-[3px] border-gray-700 text-white px-3 py-2 focus:border-[#BC13FE] outline-none"
                          />
                          <button
                            onClick={() => { playBlip(); onSubmit(); }}
                            disabled={!tweetUrl.trim() || isSubmitting}
                            className="px-4 py-2 bg-[#39FF14] text-black font-black border-[3px] border-black hover:brightness-110 disabled:opacity-50"
                            style={{ boxShadow: '3px 3px 0px black' }}
                          >
                            {isSubmitting ? "..." : <Send className="w-5 h-5" />}
                          </button>
                        </div>
                        {submitError && (
                          <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {submitError}
                          </p>
                        )}
                        {submitSuccess && (
                          <p className="text-[#39FF14] text-xs mt-2 flex items-center gap-1">
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
          <div className="mt-4 p-3 bg-[#FF6B35] border-[3px] border-black text-black" style={{ boxShadow: '4px 4px 0px black' }}>
            <p className="text-sm text-center font-bold uppercase">
              DAILY LIMIT REACHED! COME BACK TOMORROW
            </p>
          </div>
        )}
      </ArcadeCard>

      <ArcadeCard className="p-5">
        <button
          onClick={() => { playBlip(); setShowLeaderboard(!showLeaderboard); }}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFD700] border-[3px] border-black flex items-center justify-center" style={{ boxShadow: '2px 2px 0px black' }}>
              <Crown className="w-5 h-5 text-black" />
            </div>
            <span className="text-white font-black uppercase tracking-wide">LEADERBOARD</span>
          </div>
          <ChevronRight className={`w-6 h-6 text-[#FFD700] transition-transform ${showLeaderboard ? 'rotate-90' : ''}`} />
        </button>

        <AnimatePresence>
          {showLeaderboard && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-6 space-y-3">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-[#FFD700] p-3 border-[3px] border-black text-center" style={{ boxShadow: '3px 3px 0px black' }}>
                    <Crown className="w-5 h-5 text-black mx-auto mb-1" />
                    <p className="text-black font-black text-xs">1ST: 15K + NFT</p>
                  </div>
                  <div className="bg-[#C0C0C0] p-3 border-[3px] border-black text-center" style={{ boxShadow: '3px 3px 0px black' }}>
                    <Star className="w-5 h-5 text-black mx-auto mb-1" />
                    <p className="text-black font-black text-xs">2ND: 10K</p>
                  </div>
                  <div className="bg-[#CD7F32] p-3 border-[3px] border-black text-center" style={{ boxShadow: '3px 3px 0px black' }}>
                    <Star className="w-5 h-5 text-black mx-auto mb-1" />
                    <p className="text-black font-black text-xs">3RD: 5K</p>
                  </div>
                </div>

                {weeklyLeaderboard.length === 0 ? (
                  <p className="text-gray-400 text-center py-6 font-bold uppercase">NO ENTRIES YET. BE THE FIRST!</p>
                ) : (
                  weeklyLeaderboard.slice(0, 10).map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center justify-between p-3 border-[3px] border-black ${
                        index === 0 ? 'bg-[#FFD700]' :
                        index === 1 ? 'bg-[#C0C0C0]' :
                        index === 2 ? 'bg-[#CD7F32]' :
                        'bg-[#2a2a2a]'
                      }`}
                      style={{ 
                        boxShadow: '3px 3px 0px black',
                        animation: index === 0 ? 'pulse 2s infinite' : undefined
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 flex items-center justify-center font-black border-[2px] border-black ${
                          index < 3 ? 'text-black bg-white' : 'text-white bg-black'
                        }`}>
                          {index + 1}
                        </span>
                        <span className={`font-bold ${index < 3 ? 'text-black' : 'text-white'}`}>
                          {entry.username}
                        </span>
                        {index === 0 && <Crown className="w-5 h-5 text-black animate-pulse" />}
                      </div>
                      <div className="text-right">
                        <p className={`font-black ${index < 3 ? 'text-black' : 'text-[#39FF14]'}`} style={{ fontFamily: "'Press Start 2P', monospace" }}>
                          {entry.points}
                        </p>
                        <p className={`text-xs ${index < 3 ? 'text-black/70' : 'text-gray-400'}`}>
                          {entry.missionsCompleted} MISSIONS
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ArcadeCard>
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
  bgColor: string;
  available: boolean;
  comingSoon?: boolean;
}

function GameCard({ title, description, icon, route, bgColor, available, comingSoon }: GameCardProps) {
  const [, setLocation] = useLocation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={available ? { x: -4, y: -4 } : {}}
      whileTap={available ? { scale: 0.98 } : {}}
      onClick={() => available && setLocation(route)}
      className={`relative overflow-hidden border-[5px] border-black cursor-pointer ${bgColor} ${
        !available ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      style={{ boxShadow: '6px 6px 0px black' }}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-14 h-14 bg-black/20 border-[3px] border-black flex items-center justify-center" style={{ boxShadow: '3px 3px 0px rgba(0,0,0,0.3)' }}>
            {icon}
          </div>
          {comingSoon && (
            <span className="px-3 py-1 text-xs font-black bg-black text-white uppercase">
              SOON
            </span>
          )}
        </div>
        <h3 className="text-xl font-black text-black mb-2 uppercase tracking-wide">{title}</h3>
        <p className="text-black/70 text-sm mb-4">{description}</p>
        {available && (
          <div className="flex items-center text-black font-black uppercase">
            <span>PLAY NOW</span>
            <ChevronRight className="w-5 h-5 ml-1" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

const GAMES: GameCardProps[] = [
  {
    title: "DASHVILLE",
    description: "Retro run 'n gun! Collect coins, shoot enemies, earn $KICKS!",
    icon: <Gamepad2 className="w-7 h-7 text-white" />,
    route: "/dashville",
    bgColor: "bg-[#FF6600]",
    available: true,
  },
  {
    title: "RABBIT RUSH",
    description: "Pilot through space! Collect multipliers, dodge asteroids!",
    icon: <Rabbit className="w-7 h-7 text-white" />,
    route: "/rabbit-rush",
    bgColor: "bg-[#FF1493]",
    available: true,
  },
  {
    title: "NIGHT DRIVE",
    description: "Race through neon city! Dodge traffic, collect coins!",
    icon: <Footprints className="w-7 h-7 text-white" />,
    route: "/endless-runner",
    bgColor: "bg-[#00FFFF]",
    available: true,
  },
  {
    title: "RABBITS BLADE",
    description: "Slice veggies and coins! Avoid bombs, catch power-ups!",
    icon: <Rabbit className="w-7 h-7 text-white" />,
    route: "/bunny-blade",
    bgColor: "bg-[#39FF14]",
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
  const [musicPlaying, setMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blipRef = useRef<HTMLAudioElement | null>(null);
  
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

  useEffect(() => {
    audioRef.current = new Audio('/sounds/arcade-theme.wav');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.2;
    
    blipRef.current = new Audio('/sounds/hit.mp3');
    blipRef.current.volume = 0.3;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (musicPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
      setMusicPlaying(!musicPlaying);
    }
  };

  const playBlip = () => {
    if (blipRef.current) {
      blipRef.current.currentTime = 0;
      blipRef.current.play().catch(() => {});
    }
  };

  const loadMissionsData = useCallback(async () => {
    try {
      const [missionsRes, leaderboardRes] = await Promise.all([
        fetch('/api/missions'),
        fetch('/api/missions/leaderboard/weekly'),
      ]);
      
      if (missionsRes.ok) {
        const data = await missionsRes.json();
        setMissions(data.missions || []);
      }
      
      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json();
        setWeeklyLeaderboard(data.leaderboard);
        setWeekInfo({
          weekStart: data.weekStart,
          weekEnd: data.weekEnd,
          daysRemaining: data.daysRemaining,
        });
      }
      
      if (walletAddress) {
        const [progressRes, prizeRes] = await Promise.all([
          fetch(`/api/missions/progress/${walletAddress}`),
          fetch(`/api/missions/prizes/${walletAddress}`),
        ]);
        
        if (progressRes.ok) {
          const data = await progressRes.json();
          setMissionProgress(data);
        }
        
        if (prizeRes.ok) {
          const data = await prizeRes.json();
          if (data.prize) {
            setUserPrize(data.prize);
          }
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
    const loadUserData = async () => {
      if (!walletAddress) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/user/${walletAddress}`);
        if (response.ok) {
          const data = await response.json();
          const userData = data.user || data;
          if (userData.username) {
            setUsername(userData.username);
            localStorage.setItem(GLOBAL_USERNAME_KEY, userData.username);
          }
          if (userData.avatarUrl) {
            setAvatar(userData.avatarUrl);
            localStorage.setItem(GLOBAL_AVATAR_KEY, userData.avatarUrl);
          }
        }
      } catch (error) {
        const savedUsername = localStorage.getItem(GLOBAL_USERNAME_KEY);
        const savedAvatar = localStorage.getItem(GLOBAL_AVATAR_KEY);
        if (savedUsername) setUsername(savedUsername);
        if (savedAvatar) setAvatar(savedAvatar);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
    loadMissionsData();
  }, [walletAddress, loadMissionsData]);

  const handleSaveUsername = async () => {
    if (!usernameInput.trim() || !walletAddress) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/user/${walletAddress}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput.trim() })
      });
      
      if (response.ok) {
        setUsername(usernameInput.trim());
        localStorage.setItem(GLOBAL_USERNAME_KEY, usernameInput.trim());
        setEditingUsername(false);
        setUsernameInput('');
      }
    } catch (error) {
      console.error('Failed to save username:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAvatar = async (avatarId: string) => {
    if (!walletAddress) return;
    
    playBlip();
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
    playBlip();
    setUsernameInput(username);
    setEditingUsername(true);
  };

  const cancelEditing = () => {
    playBlip();
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
    <div className="min-h-screen bg-[#0d0d0d] relative overflow-x-hidden overflow-y-auto">
      <GlowOrbs />
      <GrainOverlay />
      <CharacterMarquee />
      
      <div className="relative z-20 max-w-4xl mx-auto px-4 py-8 pb-48 min-h-screen overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <img 
              src="/textures/tokenrush-logo.png" 
              alt="Token Rush" 
              className="w-20 h-20"
            />
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-wider">TOKEN RUSH</h1>
              <p className="text-[#BC13FE] text-sm font-bold">DIGITAL ARCADE</p>
            </div>
          </div>
          <button
            onClick={toggleMusic}
            className="w-12 h-12 bg-[#1a1a1a] border-[3px] border-black flex items-center justify-center hover:bg-[#2a2a2a] transition-colors"
            style={{ boxShadow: '3px 3px 0px black' }}
          >
            {musicPlaying ? (
              <Volume2 className="w-6 h-6 text-[#39FF14]" />
            ) : (
              <VolumeX className="w-6 h-6 text-gray-500" />
            )}
          </button>
        </motion.div>

        <ArcadeCard className="p-5 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => { playBlip(); setShowAvatarPicker(true); }}
                className="relative group"
              >
                <div 
                  className="w-16 h-16 bg-gradient-to-br from-[#BC13FE] to-[#00FFFF] flex items-center justify-center text-3xl border-[4px] border-black group-hover:scale-105 transition-transform"
                  style={{ boxShadow: '4px 4px 0px black' }}
                >
                  {avatar ? getAvatarEmoji(avatar) : '👤'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#39FF14] border-[2px] border-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit2 className="w-3 h-3 text-black" />
                </div>
              </button>
              <div>
                <p className="text-gray-400 text-xs uppercase">PLAYER</p>
                {isLoading ? (
                  <div className="animate-pulse bg-gray-700 h-6 w-32 rounded" />
                ) : hasUsername && !editingUsername ? (
                  <div className="flex items-center gap-2">
                    <p className="text-white font-black text-xl uppercase">{username}</p>
                    <button onClick={startEditing} className="text-gray-500 hover:text-white">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-1">
                    <input
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value.toUpperCase())}
                      placeholder="ENTER NAME..."
                      className="bg-black border-[2px] border-gray-700 text-white px-2 py-1 text-sm uppercase font-bold w-32 focus:border-[#BC13FE] outline-none"
                      maxLength={15}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveUsername()}
                    />
                    <button
                      onClick={() => { playBlip(); handleSaveUsername(); }}
                      disabled={!usernameInput.trim() || isSaving}
                      className="px-2 py-1 bg-[#39FF14] text-black font-black border-[2px] border-black disabled:opacity-50"
                    >
                      {isSaving ? "..." : <Check className="w-4 h-4" />}
                    </button>
                    {editingUsername && (
                      <button onClick={cancelEditing} className="px-2 py-1 bg-red-500 text-white border-[2px] border-black">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-gray-400 text-xs uppercase">KICKS</p>
                <p className="text-[#FFD700] font-black text-xl" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                  {parseFloat(kicksBalance).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="h-10 w-px bg-gray-700" />
              <div className="text-right">
                <p className="text-gray-400 text-xs uppercase">WALLET</p>
                <p className="text-white font-mono text-sm">
                  {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                </p>
              </div>
              <button
                onClick={() => { playBlip(); disconnect(); }}
                className="w-10 h-10 bg-red-500/20 border-[2px] border-red-500 flex items-center justify-center hover:bg-red-500/40 transition-colors"
              >
                <LogOut className="w-5 h-5 text-red-500" />
              </button>
            </div>
          </div>
          
          {hasUsername && (
            <div className="mt-4 pt-4 border-t-[2px] border-gray-800 group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs uppercase font-bold" style={{ fontFamily: "'Inter', sans-serif" }}>LEVEL UP</span>
                <span className="text-[#39FF14] text-xs font-bold" style={{ fontFamily: "'Press Start 2P', monospace" }}>LVL {Math.floor((missionProgress?.totalPoints || 0) / 100) + 1}</span>
              </div>
              <div className="h-5 bg-black border-[3px] border-gray-700 overflow-hidden relative group-hover:border-[#39FF14] transition-colors">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#39FF14] to-[#00FF7F] relative"
                  initial={{ width: 0 }}
                  animate={{ width: `${((missionProgress?.totalPoints || 0) % 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  style={{ boxShadow: '0 0 10px #39FF14' }}
                />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ boxShadow: 'inset 0 0 20px rgba(57, 255, 20, 0.5)' }} />
              </div>
            </div>
          )}
        </ArcadeCard>

        {hasUsername && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex gap-4 mb-8"
            >
              <button
                onClick={() => { playBlip(); setActiveTab('games'); }}
                className={`flex-1 py-4 font-black text-xl uppercase tracking-wider border-[5px] border-black transition-all flex items-center justify-center gap-3 ${
                  activeTab === 'games'
                    ? 'bg-[#BC13FE] text-white'
                    : 'bg-[#2a2a2a] text-gray-500 hover:text-white'
                }`}
                style={{ 
                  boxShadow: activeTab === 'games' ? '2px 2px 0px black' : '6px 6px 0px black',
                  transform: activeTab === 'games' ? 'translate(4px, 4px)' : 'none'
                }}
              >
                <Gamepad2 className="w-6 h-6" />
                GAMES
              </button>
              <button
                onClick={() => { playBlip(); setActiveTab('missions'); }}
                className={`flex-1 py-4 font-black text-xl uppercase tracking-wider border-[5px] border-black transition-all flex items-center justify-center gap-3 ${
                  activeTab === 'missions'
                    ? 'bg-[#BC13FE] text-white'
                    : 'bg-[#2a2a2a] text-gray-500 hover:text-white'
                }`}
                style={{ 
                  boxShadow: activeTab === 'missions' ? '2px 2px 0px black' : '6px 6px 0px black',
                  transform: activeTab === 'missions' ? 'translate(4px, 4px)' : 'none'
                }}
              >
                <Target className="w-6 h-6" />
                MISSIONS
              </button>
            </motion.div>

            <AnimatePresence mode="wait">
              {activeTab === 'games' ? (
                <motion.div
                  key="games"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {GAMES.map((game, index) => (
                    <motion.div
                      key={game.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.1 }}
                      onClick={playBlip}
                    >
                      <GameCard {...game} />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="missions"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
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
                    setSubmitError={setSubmitError}
                    submitSuccess={submitSuccess}
                    setSubmitSuccess={setSubmitSuccess}
                    showLeaderboard={showLeaderboard}
                    setShowLeaderboard={setShowLeaderboard}
                    onSubmit={handleMissionSubmit}
                    onRefresh={loadMissionsData}
                    onClaimPrize={handleClaimPrize}
                    isClaimingPrize={isClaimingPrize}
                    playBlip={playBlip}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {!hasUsername && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-12"
          >
            <ArcadeCard className="p-8 max-w-md mx-auto">
              <User className="w-16 h-16 text-[#BC13FE] mx-auto mb-4" />
              <h3 className="text-2xl font-black text-white mb-2 uppercase">SET YOUR NAME</h3>
              <p className="text-gray-400 text-sm">
                Choose a username above to unlock all games and compete on the leaderboards!
              </p>
            </ArcadeCard>
          </motion.div>
        )}
      </div>
      
      <AnimatePresence>
        {showAvatarPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => { playBlip(); setShowAvatarPicker(false); }}
          >
            <ArcadeCard className="p-6 max-w-sm w-full" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <h3 className="text-xl font-black text-white mb-2 text-center uppercase">CHOOSE AVATAR</h3>
              <p className="text-gray-400 text-sm text-center mb-6">Pick your arcade identity</p>
              
              <div className="grid grid-cols-4 gap-3 mb-6">
                {AVATAR_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectAvatar(opt.id)}
                    className={`w-14 h-14 flex items-center justify-center text-2xl border-[3px] border-black transition-all ${
                      avatar === opt.id
                        ? 'bg-[#BC13FE] scale-110'
                        : 'bg-[#2a2a2a] hover:bg-[#3a3a3a]'
                    }`}
                    style={{ boxShadow: '3px 3px 0px black' }}
                    title={opt.label}
                  >
                    {opt.emoji}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => { playBlip(); setShowAvatarPicker(false); }}
                className="w-full py-3 bg-[#2a2a2a] text-gray-400 font-bold border-[3px] border-black hover:text-white hover:bg-[#3a3a3a] transition-colors uppercase"
                style={{ boxShadow: '3px 3px 0px black' }}
              >
                CANCEL
              </button>
            </ArcadeCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
