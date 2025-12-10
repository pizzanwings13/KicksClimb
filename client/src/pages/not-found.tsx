import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { AlertCircle, Home, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-indigo-900 to-black flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          <Gamepad2 className="w-10 h-10 text-purple-400" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            TOKEN RUSH
          </h1>
        </div>

        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-8 border border-red-500/30 mb-6">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Page Not Found</h2>
          <p className="text-gray-400">
            Oops! This page doesn't exist. Let's get you back to the games.
          </p>
        </div>

        <Button
          onClick={() => setLocation("/")}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold px-8 py-3 rounded-xl"
        >
          <Home className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </motion.div>
    </div>
  );
}
