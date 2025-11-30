import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { apiRequest } from "../queryClient";

export type GamePhase = "menu" | "betting" | "playing" | "won" | "lost" | "cashed_out";
export type StepType = "safe" | "multiplier_2x" | "multiplier_3x" | "multiplier_5x" | "multiplier_10x" | "hazard" | "finish";

export interface BoardStep {
  position: number;
  type: StepType;
  multiplier?: number;
}

export interface User {
  id: number;
  walletAddress: string;
  username: string;
  avatarUrl?: string;
  totalGamesPlayed: number;
  totalKicksWon: string;
  totalKicksLost: string;
  highestMultiplier: string;
  gamesWon: number;
  gamesLost: number;
}

export interface Game {
  id: number;
  userId: number;
  betAmount: string;
  finalMultiplier?: string;
  payout?: string;
  finalPosition: number;
  gameStatus: string;
  oddseedHash: string;
}

export interface LeaderboardEntry {
  id: number;
  userId: number;
  totalWinnings: string;
  gamesPlayed: number;
  bestMultiplier: string;
  user: User;
}

interface GameState {
  phase: GamePhase;
  user: User | null;
  currentGame: Game | null;
  board: BoardStep[];
  currentPosition: number;
  currentMultiplier: number;
  betAmount: string;
  potentialPayout: string;
  isMoving: boolean;
  lastStepType: StepType | null;
  dailyLeaderboard: LeaderboardEntry[];
  weeklyLeaderboard: LeaderboardEntry[];
  
  setPhase: (phase: GamePhase) => void;
  setUser: (user: User | null) => void;
  setBetAmount: (amount: string) => void;
  
  connectUser: (walletAddress: string, username?: string) => Promise<User | null>;
  updateProfile: (walletAddress: string, username: string) => Promise<User | null>;
  startGame: (walletAddress: string, betAmount: string) => Promise<boolean>;
  makeMove: (steps: number) => Promise<BoardStep | null>;
  cashOut: () => Promise<{ payout: string; multiplier: number } | null>;
  fetchLeaderboards: () => Promise<void>;
  reset: () => void;
}

export const useGameState = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    phase: "menu",
    user: null,
    currentGame: null,
    board: [],
    currentPosition: 0,
    currentMultiplier: 1,
    betAmount: "10",
    potentialPayout: "10",
    isMoving: false,
    lastStepType: null,
    dailyLeaderboard: [],
    weeklyLeaderboard: [],

    setPhase: (phase) => set({ phase }),
    setUser: (user) => set({ user }),
    setBetAmount: (amount) => {
      const multiplier = get().currentMultiplier;
      set({ 
        betAmount: amount,
        potentialPayout: (parseFloat(amount) * multiplier).toString()
      });
    },

    connectUser: async (walletAddress, username) => {
      try {
        const res = await apiRequest("POST", "/api/auth/connect", { walletAddress, username });
        const data = await res.json();
        set({ user: data.user });
        return data.user;
      } catch (error) {
        console.error("Connect user error:", error);
        return null;
      }
    },

    updateProfile: async (walletAddress, username) => {
      try {
        const res = await apiRequest("PUT", `/api/user/${walletAddress}`, { username });
        const data = await res.json();
        set({ user: data.user });
        return data.user;
      } catch (error) {
        console.error("Update profile error:", error);
        return null;
      }
    },

    startGame: async (walletAddress, betAmount) => {
      try {
        const res = await apiRequest("POST", "/api/game/start", { walletAddress, betAmount });
        const data = await res.json();
        
        set({
          currentGame: data.game,
          board: data.board,
          currentPosition: 0,
          currentMultiplier: 1,
          betAmount,
          potentialPayout: betAmount,
          phase: "playing",
          lastStepType: null,
        });
        
        return true;
      } catch (error) {
        console.error("Start game error:", error);
        return false;
      }
    },

    makeMove: async (steps) => {
      const { currentGame, isMoving, board } = get();
      
      if (!currentGame || isMoving) return null;
      
      set({ isMoving: true });
      
      try {
        const res = await apiRequest("POST", `/api/game/${currentGame.id}/move`, { steps });
        const data = await res.json();
        
        const newPosition = data.game.finalPosition;
        const landedStep = data.landedStep as BoardStep;
        
        set({
          currentGame: data.game,
          currentPosition: newPosition,
          currentMultiplier: data.currentMultiplier,
          potentialPayout: data.potentialPayout,
          lastStepType: landedStep.type,
          isMoving: false,
        });
        
        if (data.game.gameStatus === "lost") {
          set({ phase: "lost" });
        } else if (data.game.gameStatus === "won") {
          set({ phase: "won" });
        }
        
        return landedStep;
      } catch (error) {
        console.error("Move error:", error);
        set({ isMoving: false });
        return null;
      }
    },

    cashOut: async () => {
      const { currentGame } = get();
      
      if (!currentGame) return null;
      
      try {
        const res = await apiRequest("POST", `/api/game/${currentGame.id}/cashout`);
        const data = await res.json();
        
        set({
          currentGame: data.game,
          phase: "cashed_out",
        });
        
        return {
          payout: data.payout,
          multiplier: data.multiplier,
        };
      } catch (error) {
        console.error("Cashout error:", error);
        return null;
      }
    },

    fetchLeaderboards: async () => {
      try {
        const [dailyRes, weeklyRes] = await Promise.all([
          fetch("/api/leaderboard/daily"),
          fetch("/api/leaderboard/weekly"),
        ]);
        
        const [dailyData, weeklyData] = await Promise.all([
          dailyRes.json(),
          weeklyRes.json(),
        ]);
        
        set({
          dailyLeaderboard: dailyData.leaderboard || [],
          weeklyLeaderboard: weeklyData.leaderboard || [],
        });
      } catch (error) {
        console.error("Fetch leaderboards error:", error);
      }
    },

    reset: () => {
      set({
        phase: "menu",
        currentGame: null,
        board: [],
        currentPosition: 0,
        currentMultiplier: 1,
        betAmount: "10",
        potentialPayout: "10",
        isMoving: false,
        lastStepType: null,
      });
    },
  }))
);
