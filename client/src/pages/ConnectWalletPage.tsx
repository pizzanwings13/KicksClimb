import { motion } from "framer-motion";
import { Wallet, Shield, Trophy, Zap, Gamepad2, Volume2, VolumeX } from "lucide-react";
import { useWallet } from "@/lib/stores/useWallet";
import { useState, useEffect, useRef } from "react";

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
    <div className="fixed bottom-0 left-0 right-0 h-[15vh] overflow-hidden pointer-events-none z-10">
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

function ArcadeCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div 
      className={`bg-[#1a1a1a] border-[5px] border-black ${className}`}
      style={{ boxShadow: '6px 6px 0px black' }}
    >
      {children}
    </div>
  );
}

export function ConnectWalletPage() {
  const { setShowWalletModal, isConnecting, error } = useWallet();
  const [musicPlaying, setMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('/sounds/arcade-theme.wav');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.2;
    
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

  return (
    <div className="min-h-screen bg-[#0d0d0d] relative overflow-x-hidden overflow-y-auto">
      <GlowOrbs />
      <GrainOverlay />
      <CharacterMarquee />
      
      {/* Music Toggle Button */}
      <motion.button
        onClick={toggleMusic}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed top-4 right-4 z-50 w-12 h-12 bg-[#1a1a1a] border-[3px] border-black flex items-center justify-center"
        style={{ boxShadow: '4px 4px 0px black' }}
      >
        {musicPlaying ? (
          <Volume2 className="w-5 h-5 text-[#39FF14]" />
        ) : (
          <VolumeX className="w-5 h-5 text-gray-400" />
        )}
      </motion.button>
      
      <div className="relative z-20 min-h-screen flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <motion.div 
              className="flex flex-col items-center justify-center gap-4 mb-6"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <div 
                className="border-[5px] border-black overflow-hidden rounded-2xl"
                style={{ boxShadow: '6px 6px 0px black' }}
              >
                <img 
                  src="/textures/dashkids-logo.jpg" 
                  alt="DashKids" 
                  className="w-32 h-32 md:w-40 md:h-40"
                />
              </div>
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-wider mb-2">
              TOKEN RUSH
            </h1>
            <p className="text-[#BC13FE] text-lg font-bold uppercase tracking-wide">DIGITAL ARCADE</p>
          </motion.div>

          <ArcadeCard className="p-6 mb-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <motion.div 
                className="text-center"
                whileHover={{ y: -4, x: -4 }}
              >
                <div 
                  className="w-14 h-14 mx-auto mb-2 bg-[#BC13FE] border-[3px] border-black flex items-center justify-center"
                  style={{ boxShadow: '3px 3px 0px black' }}
                >
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <p className="text-xs text-gray-400 font-bold uppercase">Secure</p>
              </motion.div>
              <motion.div 
                className="text-center"
                whileHover={{ y: -4, x: -4 }}
              >
                <div 
                  className="w-14 h-14 mx-auto mb-2 bg-[#FFD700] border-[3px] border-black flex items-center justify-center"
                  style={{ boxShadow: '3px 3px 0px black' }}
                >
                  <Zap className="w-7 h-7 text-black" />
                </div>
                <p className="text-xs text-gray-400 font-bold uppercase">Fast</p>
              </motion.div>
              <motion.div 
                className="text-center"
                whileHover={{ y: -4, x: -4 }}
              >
                <div 
                  className="w-14 h-14 mx-auto mb-2 bg-[#39FF14] border-[3px] border-black flex items-center justify-center"
                  style={{ boxShadow: '3px 3px 0px black' }}
                >
                  <Trophy className="w-7 h-7 text-black" />
                </div>
                <p className="text-xs text-gray-400 font-bold uppercase">Rewards</p>
              </motion.div>
            </div>

            <motion.button
              onClick={() => setShowWalletModal(true)}
              disabled={isConnecting}
              whileHover={{ x: -4, y: -4 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-5 text-xl bg-[#BC13FE] text-white font-black uppercase tracking-wider border-[5px] border-black flex items-center justify-center gap-3 disabled:opacity-50"
              style={{ boxShadow: '6px 6px 0px black' }}
            >
              <Wallet className="w-6 h-6" />
              {isConnecting ? "CONNECTING..." : "CONNECT WALLET"}
            </motion.button>

            {error && (
              <div className="mt-4 p-3 bg-red-500/20 border-[3px] border-red-500 text-red-400 text-sm text-center font-bold">
                {error}
              </div>
            )}
          </ArcadeCard>

          <ArcadeCard className="p-4 mb-6">
            <div className="flex items-center gap-3 text-gray-400">
              <Gamepad2 className="w-5 h-5 text-[#00FFFF]" />
              <p className="text-sm">
                Connect your <span className="text-white font-bold">ApeChain</span> wallet to access all games
              </p>
            </div>
          </ArcadeCard>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-4 text-gray-600 text-xs uppercase">
              <span>MetaMask</span>
              <span className="w-1 h-1 bg-gray-600 rounded-full" />
              <span>Zerion</span>
              <span className="w-1 h-1 bg-gray-600 rounded-full" />
              <span className="text-[#39FF14]">Glyph Soon</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
