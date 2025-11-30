import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Mountain, Target, Shield, Crown, Medal, Award, Zap, Flame, Star, Coins } from "lucide-react";

interface AchievementDef {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const ACHIEVEMENTS: Record<string, AchievementDef> = {
  first_climb: { id: "first_climb", name: "First Climb", icon: Mountain, color: "text-green-400", bgColor: "bg-green-500/20" },
  veteran_climber: { id: "veteran_climber", name: "Veteran Climber", icon: Target, color: "text-blue-400", bgColor: "bg-blue-500/20" },
  dedicated_climber: { id: "dedicated_climber", name: "Dedicated Climber", icon: Shield, color: "text-purple-400", bgColor: "bg-purple-500/20" },
  master_climber: { id: "master_climber", name: "Master Climber", icon: Crown, color: "text-yellow-400", bgColor: "bg-yellow-500/20" },
  first_win: { id: "first_win", name: "First Victory", icon: Trophy, color: "text-green-400", bgColor: "bg-green-500/20" },
  winner: { id: "winner", name: "Winner", icon: Medal, color: "text-blue-400", bgColor: "bg-blue-500/20" },
  champion: { id: "champion", name: "Champion", icon: Award, color: "text-purple-400", bgColor: "bg-purple-500/20" },
  multiplier_hunter: { id: "multiplier_hunter", name: "Multiplier Hunter", icon: Zap, color: "text-yellow-400", bgColor: "bg-yellow-500/20" },
  big_multiplier: { id: "big_multiplier", name: "Big Multiplier", icon: Flame, color: "text-orange-400", bgColor: "bg-orange-500/20" },
  legendary_multiplier: { id: "legendary_multiplier", name: "Legendary Multiplier", icon: Star, color: "text-pink-400", bgColor: "bg-pink-500/20" },
  thousand_kicks: { id: "thousand_kicks", name: "Kick Collector", icon: Coins, color: "text-green-400", bgColor: "bg-green-500/20" },
  ten_thousand_kicks: { id: "ten_thousand_kicks", name: "Rich Climber", icon: Coins, color: "text-yellow-400", bgColor: "bg-yellow-500/20" },
  hundred_thousand_kicks: { id: "hundred_thousand_kicks", name: "KICKS Whale", icon: Crown, color: "text-pink-400", bgColor: "bg-pink-500/20" },
};

interface AchievementNotificationProps {
  achievements: string[];
  onComplete: () => void;
}

export function AchievementNotification({ achievements, onComplete }: AchievementNotificationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setCurrentIndex(0);
    setVisible(true);
  }, [achievements]);

  useEffect(() => {
    if (achievements.length === 0) return;

    timerRef.current = setTimeout(() => {
      if (currentIndex < achievements.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setVisible(false);
        timerRef.current = setTimeout(() => {
          onComplete();
        }, 400);
      }
    }, 3500);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentIndex, achievements.length, onComplete]);

  if (achievements.length === 0) return null;

  const achievementId = achievements[currentIndex];
  const achievement = ACHIEVEMENTS[achievementId];

  if (!achievement) return null;

  const Icon = achievement.icon;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[100]"
        >
          <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl border-2 ${achievement.bgColor} border-yellow-500/50 backdrop-blur-md shadow-2xl shadow-yellow-500/20`}>
            <div className={`p-3 rounded-xl ${achievement.bgColor}`}>
              <Icon className={`w-8 h-8 ${achievement.color}`} />
            </div>
            <div>
              <div className="text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-1">
                Achievement Unlocked!
              </div>
              <div className="text-white font-bold text-lg">
                {achievement.name}
              </div>
            </div>
            <div className="ml-4">
              <Trophy className="w-8 h-8 text-yellow-400 animate-bounce" />
            </div>
          </div>
          {achievements.length > 1 && (
            <div className="flex justify-center gap-1 mt-2">
              {achievements.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full ${
                    idx === currentIndex ? "bg-yellow-400" : "bg-gray-500"
                  }`}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
