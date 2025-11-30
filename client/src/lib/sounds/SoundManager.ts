import { Howl, Howler } from 'howler';

interface SoundConfig {
  src: string[];
  volume?: number;
  loop?: boolean;
  preload?: boolean;
}

class SoundManager {
  private sounds: Map<string, Howl> = new Map();
  private isMuted: boolean = false;
  private masterVolume: number = 1;
  private musicVolume: number = 0.3;
  private sfxVolume: number = 0.7;
  private backgroundMusic: Howl | null = null;

  constructor() {
    this.loadFromStorage();
    this.initializeSounds();
  }

  private loadFromStorage() {
    if (typeof window !== 'undefined') {
      const savedMuted = localStorage.getItem('soundMuted');
      const savedMasterVolume = localStorage.getItem('masterVolume');
      const savedMusicVolume = localStorage.getItem('musicVolume');
      const savedSfxVolume = localStorage.getItem('sfxVolume');

      if (savedMuted !== null) this.isMuted = savedMuted === 'true';
      if (savedMasterVolume !== null) this.masterVolume = parseFloat(savedMasterVolume);
      if (savedMusicVolume !== null) this.musicVolume = parseFloat(savedMusicVolume);
      if (savedSfxVolume !== null) this.sfxVolume = parseFloat(savedSfxVolume);

      Howler.mute(this.isMuted);
    }
  }

  private saveToStorage() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('soundMuted', String(this.isMuted));
      localStorage.setItem('masterVolume', String(this.masterVolume));
      localStorage.setItem('musicVolume', String(this.musicVolume));
      localStorage.setItem('sfxVolume', String(this.sfxVolume));
    }
  }

  private initializeSounds() {
    const soundConfigs: Record<string, SoundConfig> = {
      background: {
        src: ['/sounds/background.mp3'],
        volume: 0.3,
        loop: true,
        preload: true,
      },
      hit: {
        src: ['/sounds/hit.mp3'],
        volume: 0.7,
        preload: true,
      },
      success: {
        src: ['/sounds/success.mp3'],
        volume: 0.7,
        preload: true,
      },
      step: {
        src: ['/sounds/hit.mp3'],
        volume: 0.4,
        preload: true,
      },
      multiplier: {
        src: ['/sounds/success.mp3'],
        volume: 0.8,
        preload: true,
      },
      hazard: {
        src: ['/sounds/hit.mp3'],
        volume: 0.9,
        preload: true,
      },
      cashout: {
        src: ['/sounds/success.mp3'],
        volume: 0.8,
        preload: true,
      },
      win: {
        src: ['/sounds/success.mp3'],
        volume: 1.0,
        preload: true,
      },
      lose: {
        src: ['/sounds/hit.mp3'],
        volume: 0.8,
        preload: true,
      },
      buttonClick: {
        src: ['/sounds/hit.mp3'],
        volume: 0.3,
        preload: true,
      },
      rollDice: {
        src: ['/sounds/hit.mp3'],
        volume: 0.5,
        preload: true,
      },
    };

    Object.entries(soundConfigs).forEach(([name, config]) => {
      const sound = new Howl({
        src: config.src,
        volume: (config.volume || 0.5) * this.masterVolume * (config.loop ? this.musicVolume : this.sfxVolume),
        loop: config.loop || false,
        preload: config.preload !== false,
      });
      this.sounds.set(name, sound);
      
      if (name === 'background') {
        this.backgroundMusic = sound;
      }
    });
  }

  play(soundName: string): number | undefined {
    const sound = this.sounds.get(soundName);
    if (sound && !this.isMuted) {
      return sound.play();
    }
    return undefined;
  }

  stop(soundName: string) {
    const sound = this.sounds.get(soundName);
    if (sound) {
      sound.stop();
    }
  }

  pause(soundName: string) {
    const sound = this.sounds.get(soundName);
    if (sound) {
      sound.pause();
    }
  }

  startBackgroundMusic() {
    if (this.backgroundMusic && !this.isMuted) {
      this.backgroundMusic.play();
    }
  }

  stopBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.stop();
    }
  }

  pauseBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
    }
  }

  isBackgroundMusicPlaying(): boolean {
    return this.backgroundMusic?.playing() || false;
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    Howler.mute(this.isMuted);
    this.saveToStorage();
    return this.isMuted;
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    Howler.mute(this.isMuted);
    this.saveToStorage();
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
    this.saveToStorage();
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.backgroundMusic) {
      this.backgroundMusic.volume(0.3 * this.masterVolume * this.musicVolume);
    }
    this.saveToStorage();
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  setSfxVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
    this.saveToStorage();
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }

  private updateAllVolumes() {
    this.sounds.forEach((sound, name) => {
      if (name === 'background') {
        sound.volume(0.3 * this.masterVolume * this.musicVolume);
      } else {
        const baseVolume = sound.volume() / (this.masterVolume * this.sfxVolume) || 0.5;
        sound.volume(baseVolume * this.masterVolume * this.sfxVolume);
      }
    });
  }

  playStep() {
    this.play('step');
  }

  playMultiplier() {
    this.play('multiplier');
  }

  playHazard() {
    this.play('hazard');
  }

  playCashout() {
    this.play('cashout');
  }

  playWin() {
    this.play('win');
  }

  playLose() {
    this.play('lose');
  }

  playButtonClick() {
    this.play('buttonClick');
  }

  playRollDice() {
    this.play('rollDice');
  }
}

export const soundManager = new SoundManager();
