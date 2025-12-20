import { useWallet } from "@/lib/stores/useWallet";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Rabbit, Mountain, ChevronRight, Wallet, LogOut, Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/animated-background";

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
    title: "Endless Runner",
    description: "Run through lanes, jump over obstacles, collect coins & carrots. How far can you go?",
    icon: <Footprints className="w-6 h-6 text-white" />,
    route: "/endless-runner",
    gradient: "bg-gradient-to-br from-sky-500 to-blue-600",
    available: true,
  },
];

export function GameHub() {
  const { walletAddress, kicksBalance, disconnect, isConnected } = useWallet();

  if (!isConnected) {
    return null;
  }

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
        </motion.div>

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
    </AnimatedBackground>
  );
}
