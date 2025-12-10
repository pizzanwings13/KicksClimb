import { motion } from "framer-motion";
import { Wallet, Shield, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/stores/useWallet";
import { AnimatedBackground } from "@/components/ui/animated-background";

export function ConnectWalletPage() {
  const { setShowWalletModal, isConnecting, error } = useWallet();

  return (
    <AnimatedBackground>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex flex-col items-center justify-center gap-4 mb-4">
            <img 
              src="/textures/dashkids-logo.jpg" 
              alt="DashKids" 
              className="w-32 h-32 md:w-40 md:h-40 rounded-2xl shadow-2xl shadow-orange-500/30"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-400 via-yellow-400 to-red-500 bg-clip-text text-transparent mb-4">
            TOKEN RUSH
          </h1>
          <p className="text-xl text-gray-300 font-medium">Kicks-Powered Games, Timeless Fun</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-purple-500/30"
        >
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <p className="text-xs text-gray-400">Secure</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-yellow-400" />
              </div>
              <p className="text-xs text-gray-400">Fast</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-xs text-gray-400">Rewarding</p>
            </div>
          </div>

          <Button
            onClick={() => setShowWalletModal(true)}
            disabled={isConnecting}
            className="w-full py-6 text-lg bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30"
          >
            <Wallet className="mr-2 h-5 w-5" />
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </Button>

          {error && (
            <p className="text-red-400 text-sm text-center mt-4">{error}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <p className="text-gray-500 text-sm">
            Connect your ApeChain wallet to access all games
          </p>
        </motion.div>
        </div>
      </div>
    </AnimatedBackground>
  );
}
