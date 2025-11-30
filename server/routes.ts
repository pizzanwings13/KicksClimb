import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { nanoid } from "nanoid";
import crypto from "crypto";

const TOTAL_STEPS = 100;

type StepType = "safe" | "multiplier_2x" | "multiplier_3x" | "multiplier_5x" | "multiplier_10x" | "hazard" | "finish";

interface BoardStep {
  position: number;
  type: StepType;
  multiplier?: number;
}

function generateBoard(seed: string): BoardStep[] {
  const board: BoardStep[] = [];
  
  const seedHash = crypto.createHash('sha256').update(seed).digest('hex');
  let hashIndex = 0;
  
  const getNextRandom = (): number => {
    const hex = seedHash.substring(hashIndex % 64, (hashIndex % 64) + 8);
    hashIndex += 8;
    return parseInt(hex, 16) / 0xffffffff;
  };
  
  for (let i = 0; i <= TOTAL_STEPS; i++) {
    if (i === 0) {
      board.push({ position: i, type: "safe" });
      continue;
    }
    
    if (i === TOTAL_STEPS) {
      board.push({ position: i, type: "finish", multiplier: 20 });
      continue;
    }
    
    let hazardChance: number;
    let multiplierChance: number;
    
    if (i <= 25) {
      hazardChance = 0.10;
      multiplierChance = 0.25;
    } else if (i <= 50) {
      hazardChance = 0.20;
      multiplierChance = 0.20;
    } else if (i <= 75) {
      hazardChance = 0.35;
      multiplierChance = 0.15;
    } else {
      hazardChance = 0.50;
      multiplierChance = 0.10;
    }
    
    const roll = getNextRandom();
    
    if (roll < hazardChance) {
      board.push({ position: i, type: "hazard" });
    } else if (roll < hazardChance + multiplierChance) {
      const multiplierRoll = getNextRandom();
      if (multiplierRoll < 0.5) {
        board.push({ position: i, type: "multiplier_2x", multiplier: 2 });
      } else if (multiplierRoll < 0.8) {
        board.push({ position: i, type: "multiplier_3x", multiplier: 3 });
      } else if (multiplierRoll < 0.95) {
        board.push({ position: i, type: "multiplier_5x", multiplier: 5 });
      } else {
        board.push({ position: i, type: "multiplier_10x", multiplier: 10 });
      }
    } else {
      board.push({ position: i, type: "safe" });
    }
  }
  
  return board;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/auth/connect", async (req, res) => {
    try {
      const { walletAddress, username } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      
      let user = await storage.getUserByWallet(walletAddress);
      
      if (!user) {
        const displayName = username || `Player_${walletAddress.slice(0, 6)}`;
        user = await storage.createUser({
          walletAddress,
          username: displayName,
          totalGamesPlayed: 0,
          totalKicksWon: "0",
          totalKicksLost: "0",
          highestMultiplier: "0",
          gamesWon: 0,
          gamesLost: 0,
        });
      }
      
      res.json({ user });
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).json({ error: "Failed to authenticate" });
    }
  });
  
  app.get("/api/user/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const user = await storage.getUserByWallet(walletAddress);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ user });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });
  
  app.put("/api/user/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const { username, avatarUrl } = req.body;
      
      const user = await storage.getUserByWallet(walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const updatedUser = await storage.updateUser(user.id, {
        ...(username && { username }),
        ...(avatarUrl && { avatarUrl }),
      });
      
      res.json({ user: updatedUser });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });
  
  app.post("/api/game/start", async (req, res) => {
    try {
      const { walletAddress, betAmount } = req.body;
      
      if (!walletAddress || !betAmount) {
        return res.status(400).json({ error: "Wallet address and bet amount required" });
      }
      
      const user = await storage.getUserByWallet(walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const oddseed = nanoid(32);
      const oddseedHash = crypto.createHash('sha256').update(oddseed).digest('hex');
      
      const board = generateBoard(oddseed);
      
      const game = await storage.createGame({
        oddseed,
        oddseedHash,
        userId: user.id,
        betAmount: betAmount.toString(),
        gameStatus: "active",
        finalPosition: 0,
      });
      
      await storage.updateUser(user.id, {
        totalGamesPlayed: user.totalGamesPlayed + 1,
      });
      
      res.json({ 
        game: {
          ...game,
          oddseed: undefined,
        },
        oddseedHash,
        board,
      });
    } catch (error) {
      console.error("Start game error:", error);
      res.status(500).json({ error: "Failed to start game" });
    }
  });
  
  app.post("/api/game/:gameId/move", async (req, res) => {
    try {
      const { gameId } = req.params;
      const { steps } = req.body;
      
      const game = await storage.getGame(parseInt(gameId));
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      
      if (game.gameStatus !== "active") {
        return res.status(400).json({ error: "Game is not active" });
      }
      
      const board = generateBoard(game.oddseed);
      const newPosition = Math.min(game.finalPosition + steps, TOTAL_STEPS);
      const landedStep = board[newPosition];
      
      await storage.createGameStep({
        gameId: game.id,
        stepNumber: newPosition,
        stepType: landedStep.type,
        multiplierValue: landedStep.multiplier?.toString(),
      });
      
      let gameStatus = game.gameStatus;
      let finalMultiplier = game.finalMultiplier ? parseFloat(game.finalMultiplier) : 1;
      let payout = game.payout;
      
      if (landedStep.type === "hazard") {
        gameStatus = "lost";
        payout = "0";
        finalMultiplier = 0;
        
        const user = await storage.getUser(game.userId);
        if (user) {
          await storage.updateUser(user.id, {
            gamesLost: user.gamesLost + 1,
            totalKicksLost: (parseFloat(user.totalKicksLost) + parseFloat(game.betAmount)).toString(),
          });
        }
      } else if (landedStep.type === "finish") {
        gameStatus = "won";
        finalMultiplier = finalMultiplier * (landedStep.multiplier || 1);
        payout = (parseFloat(game.betAmount) * finalMultiplier).toString();
        
        const user = await storage.getUser(game.userId);
        if (user) {
          await storage.updateUser(user.id, {
            gamesWon: user.gamesWon + 1,
            totalKicksWon: (parseFloat(user.totalKicksWon) + parseFloat(payout)).toString(),
            highestMultiplier: Math.max(parseFloat(user.highestMultiplier), finalMultiplier).toString(),
          });
          await storage.updateDailyLeaderboard(user.id, payout, finalMultiplier.toString());
          await storage.updateWeeklyLeaderboard(user.id, payout, finalMultiplier.toString());
        }
      } else if (landedStep.multiplier) {
        finalMultiplier = finalMultiplier * landedStep.multiplier;
      }
      
      const updatedGame = await storage.updateGame(game.id, {
        finalPosition: newPosition,
        gameStatus,
        finalMultiplier: finalMultiplier.toString(),
        payout,
        ...(gameStatus !== "active" && { endedAt: new Date() }),
      });
      
      res.json({
        game: updatedGame,
        landedStep,
        currentMultiplier: finalMultiplier,
        potentialPayout: (parseFloat(game.betAmount) * finalMultiplier).toString(),
      });
    } catch (error) {
      console.error("Move error:", error);
      res.status(500).json({ error: "Failed to make move" });
    }
  });
  
  app.post("/api/game/:gameId/cashout", async (req, res) => {
    try {
      const { gameId } = req.params;
      
      const game = await storage.getGame(parseInt(gameId));
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      
      if (game.gameStatus !== "active") {
        return res.status(400).json({ error: "Game is not active" });
      }
      
      const currentMultiplier = game.finalMultiplier ? parseFloat(game.finalMultiplier) : 1;
      const payout = (parseFloat(game.betAmount) * currentMultiplier).toString();
      
      const updatedGame = await storage.updateGame(game.id, {
        gameStatus: "cashed_out",
        payout,
        endedAt: new Date(),
      });
      
      const user = await storage.getUser(game.userId);
      if (user) {
        await storage.updateUser(user.id, {
          gamesWon: user.gamesWon + 1,
          totalKicksWon: (parseFloat(user.totalKicksWon) + parseFloat(payout)).toString(),
          highestMultiplier: Math.max(parseFloat(user.highestMultiplier), currentMultiplier).toString(),
        });
        await storage.updateDailyLeaderboard(user.id, payout, currentMultiplier.toString());
        await storage.updateWeeklyLeaderboard(user.id, payout, currentMultiplier.toString());
      }
      
      res.json({
        game: {
          ...updatedGame,
          oddseed: game.oddseed,
        },
        payout,
        multiplier: currentMultiplier,
      });
    } catch (error) {
      console.error("Cashout error:", error);
      res.status(500).json({ error: "Failed to cash out" });
    }
  });
  
  app.get("/api/game/:gameId", async (req, res) => {
    try {
      const { gameId } = req.params;
      const game = await storage.getGame(parseInt(gameId));
      
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      
      const steps = await storage.getGameSteps(game.id);
      
      res.json({ 
        game: {
          ...game,
          oddseed: game.gameStatus !== "active" ? game.oddseed : undefined,
        },
        steps,
      });
    } catch (error) {
      console.error("Get game error:", error);
      res.status(500).json({ error: "Failed to get game" });
    }
  });
  
  app.get("/api/leaderboard/daily", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await storage.getDailyLeaderboard(limit);
      res.json({ leaderboard });
    } catch (error) {
      console.error("Daily leaderboard error:", error);
      res.status(500).json({ error: "Failed to get daily leaderboard" });
    }
  });
  
  app.get("/api/leaderboard/weekly", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await storage.getWeeklyLeaderboard(limit);
      res.json({ leaderboard });
    } catch (error) {
      console.error("Weekly leaderboard error:", error);
      res.status(500).json({ error: "Failed to get weekly leaderboard" });
    }
  });

  return httpServer;
}
