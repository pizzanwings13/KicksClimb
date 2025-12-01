import { useState, useEffect } from "react";
import { Volume2, VolumeX, Music, Settings2, X } from "lucide-react";
import { soundManager } from "@/lib/sounds/SoundManager";
import { Slider } from "@/components/ui/slider";
import { useGameState } from "@/lib/stores/useGameState";

export function SoundControls() {
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  const [showSettings, setShowSettings] = useState(false);
  const [masterVolume, setMasterVolume] = useState(soundManager.getMasterVolume());
  const [musicVolume, setMusicVolume] = useState(soundManager.getMusicVolume());
  const [sfxVolume, setSfxVolume] = useState(soundManager.getSfxVolume());
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const { phase } = useGameState();

  const isGameActive = phase === "playing" || phase === "won" || phase === "lost" || phase === "cashed_out";

  useEffect(() => {
    const checkMusic = setInterval(() => {
      setIsMusicPlaying(soundManager.isBackgroundMusicPlaying());
    }, 500);
    return () => clearInterval(checkMusic);
  }, []);

  const handleToggleMute = () => {
    const newMuted = soundManager.toggleMute();
    setIsMuted(newMuted);
    soundManager.playButtonClick();
  };

  const handleToggleMusic = () => {
    if (isMusicPlaying) {
      soundManager.stopBackgroundMusic();
    } else {
      soundManager.startBackgroundMusic();
    }
    setIsMusicPlaying(!isMusicPlaying);
    soundManager.playButtonClick();
  };

  const handleMasterVolumeChange = (value: number[]) => {
    const vol = value[0];
    setMasterVolume(vol);
    soundManager.setMasterVolume(vol);
  };

  const handleMusicVolumeChange = (value: number[]) => {
    const vol = value[0];
    setMusicVolume(vol);
    soundManager.setMusicVolume(vol);
  };

  const handleSfxVolumeChange = (value: number[]) => {
    const vol = value[0];
    setSfxVolume(vol);
    soundManager.setSfxVolume(vol);
  };

  return (
    <div className={`fixed z-50 flex flex-col gap-2 ${
      isGameActive 
        ? "top-24 sm:top-auto sm:bottom-4 left-2 sm:left-4" 
        : "bottom-4 left-4"
    }`}>
      <div className="flex gap-1.5 sm:gap-2">
        <button
          onClick={handleToggleMute}
          className="p-2 sm:p-3 bg-black/70 backdrop-blur-sm rounded-full border border-purple-500/30 hover:bg-purple-900/50 transition-all"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          ) : (
            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
          )}
        </button>

        <button
          onClick={handleToggleMusic}
          className={`p-2 sm:p-3 bg-black/70 backdrop-blur-sm rounded-full border transition-all ${
            isMusicPlaying 
              ? "border-green-500/50 hover:bg-green-900/30" 
              : "border-purple-500/30 hover:bg-purple-900/50"
          }`}
          title={isMusicPlaying ? "Stop Music" : "Play Music"}
        >
          <Music className={`w-4 h-4 sm:w-5 sm:h-5 ${isMusicPlaying ? "text-green-400" : "text-gray-400"}`} />
        </button>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 sm:p-3 bg-black/70 backdrop-blur-sm rounded-full border transition-all ${
            showSettings 
              ? "border-yellow-500/50 bg-yellow-900/30" 
              : "border-purple-500/30 hover:bg-purple-900/50"
          }`}
          title="Sound Settings"
        >
          <Settings2 className={`w-4 h-4 sm:w-5 sm:h-5 ${showSettings ? "text-yellow-400" : "text-gray-400"}`} />
        </button>
      </div>

      {showSettings && (
        <div className="bg-black/90 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-purple-500/30 min-w-[180px] sm:min-w-[200px]">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs sm:text-sm text-white font-medium">Sound Settings</span>
            <button 
              onClick={() => setShowSettings(false)}
              className="p-1 hover:bg-purple-900/50 rounded-full"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-2">Master Volume</label>
              <Slider
                value={[masterVolume]}
                onValueChange={handleMasterVolumeChange}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-2">Music</label>
              <Slider
                value={[musicVolume]}
                onValueChange={handleMusicVolumeChange}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-2">Sound Effects</label>
              <Slider
                value={[sfxVolume]}
                onValueChange={handleSfxVolumeChange}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
