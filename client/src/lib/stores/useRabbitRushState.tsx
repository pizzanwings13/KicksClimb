import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

type GamePhase = "ship_select" | "shop" | "betting" | "playing" | "ended";

interface RabbitRushState {
  phase: GamePhase;
  currentRunId: number | null;
  wager: number;
  currentMult: number;
  coinsCollected: number;
  enemiesDestroyed: number;
  isWagering: boolean;
  isClaiming: boolean;
  endMessage: string;
  
  setPhase: (phase: GamePhase) => void;
  startRun: (runId: number, wager: number) => void;
  endRun: (message: string) => void;
  setEndMessage: (message: string) => void;
  setWagering: (isWagering: boolean) => void;
  setClaiming: (isClaiming: boolean) => void;
  updateMultiplier: (mult: number) => void;
  updateCoins: (coins: number) => void;
  updateEnemies: (enemies: number) => void;
  reset: () => void;
}

export const useRabbitRushState = create<RabbitRushState>()(
  subscribeWithSelector((set) => ({
    phase: "ship_select",
    currentRunId: null,
    wager: 0,
    currentMult: 1.0,
    coinsCollected: 0,
    enemiesDestroyed: 0,
    isWagering: false,
    isClaiming: false,
    endMessage: "",
    
    setPhase: (phase) => set({ phase }),
    
    startRun: (runId, wager) => set({
      phase: "playing",
      currentRunId: runId,
      wager,
      currentMult: 1.0,
      coinsCollected: 0,
      enemiesDestroyed: 0,
      isWagering: false,
      isClaiming: false,
      endMessage: "",
    }),
    
    endRun: (message) => set({
      phase: "ended",
      endMessage: message,
    }),
    
    setEndMessage: (message) => set({ endMessage: message }),
    setWagering: (isWagering) => set({ isWagering }),
    setClaiming: (isClaiming) => set({ isClaiming }),
    updateMultiplier: (mult) => set({ currentMult: mult }),
    updateCoins: (coins) => set({ coinsCollected: coins }),
    updateEnemies: (enemies) => set({ enemiesDestroyed: enemies }),
    
    reset: () => set({
      phase: "ship_select",
      currentRunId: null,
      wager: 0,
      currentMult: 1.0,
      coinsCollected: 0,
      enemiesDestroyed: 0,
      isWagering: false,
      isClaiming: false,
      endMessage: "",
    }),
  }))
);
