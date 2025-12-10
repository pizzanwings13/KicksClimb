import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

export function AnimatedBackground({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollUp, setShowScrollUp] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollUp(scrollTop > 50);
      setShowScrollDown(scrollTop < scrollHeight - clientHeight - 50);
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollUp = () => {
    containerRef.current?.scrollBy({ top: -200, behavior: 'smooth' });
  };

  const scrollDown = () => {
    containerRef.current?.scrollBy({ top: 200, behavior: 'smooth' });
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen h-screen bg-[#0a0a0f] relative overflow-x-hidden overflow-y-auto"
      style={{ 
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        overscrollBehavior: 'contain'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-black to-black pointer-events-none" />
      
      <motion.div
        className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[150px] pointer-events-none"
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -50, 100, 0],
          opacity: [0.15, 0.25, 0.15, 0.15],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute top-1/3 right-1/4 w-80 h-80 bg-orange-500/15 rounded-full blur-[150px] pointer-events-none"
        animate={{
          x: [0, -80, 40, 0],
          y: [0, 60, -40, 0],
          opacity: [0.1, 0.2, 0.15, 0.1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />
      
      <motion.div
        className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-500/10 rounded-full blur-[100px] pointer-events-none"
        animate={{
          x: [0, 60, -30, 0],
          y: [0, -40, 60, 0],
          opacity: [0.08, 0.18, 0.12, 0.08],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
      />
      
      <motion.div
        className="absolute top-1/2 right-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"
        animate={{
          x: [0, -40, 80, 0],
          y: [0, 80, -60, 0],
          opacity: [0.05, 0.15, 0.1, 0.05],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />
      
      <motion.div
        className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[180px] pointer-events-none"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_transparent_0%,_rgba(0,0,0,0.5)_100%)] pointer-events-none" />
      
      <div className="relative z-10">{children}</div>

      <div className="fixed right-2 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
        {showScrollUp && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollUp}
            className="w-10 h-10 rounded-full bg-purple-600/80 backdrop-blur-sm border border-purple-400/50 flex items-center justify-center text-white shadow-lg"
          >
            <ChevronUp className="w-5 h-5" />
          </motion.button>
        )}
        {showScrollDown && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollDown}
            className="w-10 h-10 rounded-full bg-purple-600/80 backdrop-blur-sm border border-purple-400/50 flex items-center justify-center text-white shadow-lg"
          >
            <ChevronDown className="w-5 h-5" />
          </motion.button>
        )}
      </div>
    </div>
  );
}
