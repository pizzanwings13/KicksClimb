import { useLocation } from "wouter";
import { useWallet } from "@/lib/stores/useWallet";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Rabbit, ArrowLeft, Clock, Zap, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RabbitRushApp() {
  const { isConnected } = useWallet();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isConnected) {
      setLocation("/");
    }
  }, [isConnected, setLocation]);

  if (!isConnected) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-900 via-pink-900 to-black">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 px-4 py-2 mb-8 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-lg border border-orange-500/30 text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Games</span>
        </button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl">
              <Rabbit className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-400 via-pink-400 to-red-400 bg-clip-text text-transparent mb-4">
            RABBIT RUSH
          </h1>
          <p className="text-gray-400 text-lg">Coming Soon</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-black/40 backdrop-blur-sm rounded-2xl p-8 border border-orange-500/30 mb-8"
        >
          <h2 className="text-2xl font-bold text-white mb-6 text-center">What to Expect</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-xl flex items-center justify-center border border-orange-500/30">
                <Clock className="w-8 h-8 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Time-Based</h3>
              <p className="text-gray-400 text-sm">Race against the clock to maximize your winnings</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-xl flex items-center justify-center border border-orange-500/30">
                <Zap className="w-8 h-8 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Fast-Paced</h3>
              <p className="text-gray-400 text-sm">Quick decisions lead to big rewards</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-xl flex items-center justify-center border border-orange-500/30">
                <Trophy className="w-8 h-8 text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">High Stakes</h3>
              <p className="text-gray-400 text-sm">Compete for top spots on the leaderboard</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <Button
            onClick={() => setLocation("/")}
            className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold px-8 py-3 rounded-xl"
          >
            Play Kicks Climb While You Wait
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
