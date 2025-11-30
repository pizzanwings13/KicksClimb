import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { nanoid } from "nanoid";
import crypto from "crypto";

const TOTAL_STEPS = 100;

type StepType = "safe" | "multiplier_1x" | "multiplier_1_5x" | "multiplier_2x" | "multiplier_2_5x" | "multiplier_3x" | "multiplier_5x" | "multiplier_8x" | "multiplier_10x" | "multiplier_11x" | "hazard" | "reset_trap" | "finish" | "powerup_shield" | "powerup_double" | "powerup_skip" | "bonus_chest";

interface BoardStep {
  position: number;
  type: StepType;
  multiplier?: number;
  powerup?: string;
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
    let powerupChance: number = 0.05;
    let bonusChance: number = 0.02;
    let resetTrapChance: number = 0;
    
    if (i <= 25) {
      hazardChance = 0.25;
      multiplierChance = 0.20;
      powerupChance = 0.08;
      resetTrapChance = 0.03;
    } else if (i <= 50) {
      hazardChance = 0.30;
      multiplierChance = 0.18;
      powerupChance = 0.06;
      resetTrapChance = 0.04;
    } else if (i <= 75) {
      hazardChance = 0.40;
      multiplierChance = 0.15;
      powerupChance = 0.04;
      bonusChance = 0.03;
      resetTrapChance = 0.05;
    } else {
      hazardChance = 0.55;
      multiplierChance = 0.12;
      powerupChance = 0.03;
      bonusChance = 0.04;
      resetTrapChance = 0.06;
    }
    
    const roll = getNextRandom();
    
    if (roll < resetTrapChance) {
      board.push({ position: i, type: "reset_trap" });
    } else if (roll < resetTrapChance + hazardChance) {
      board.push({ position: i, type: "hazard" });
    } else if (roll < resetTrapChance + hazardChance + multiplierChance) {
      const multiplierRoll = getNextRandom();
      if (i >= 76) {
        if (multiplierRoll < 0.15) {
          board.push({ position: i, type: "multiplier_3x", multiplier: 3 });
        } else if (multiplierRoll < 0.35) {
          board.push({ position: i, type: "multiplier_5x", multiplier: 5 });
        } else if (multiplierRoll < 0.55) {
          board.push({ position: i, type: "multiplier_8x", multiplier: 8 });
        } else if (multiplierRoll < 0.75) {
          board.push({ position: i, type: "multiplier_10x", multiplier: 10 });
        } else {
          board.push({ position: i, type: "multiplier_11x", multiplier: 11 });
        }
      } else if (i >= 51) {
        if (multiplierRoll < 0.20) {
          board.push({ position: i, type: "multiplier_2x", multiplier: 2 });
        } else if (multiplierRoll < 0.40) {
          board.push({ position: i, type: "multiplier_2_5x", multiplier: 2.5 });
        } else if (multiplierRoll < 0.60) {
          board.push({ position: i, type: "multiplier_3x", multiplier: 3 });
        } else if (multiplierRoll < 0.80) {
          board.push({ position: i, type: "multiplier_5x", multiplier: 5 });
        } else {
          board.push({ position: i, type: "multiplier_8x", multiplier: 8 });
        }
      } else if (i >= 26) {
        if (multiplierRoll < 0.25) {
          board.push({ position: i, type: "multiplier_1_5x", multiplier: 1.5 });
        } else if (multiplierRoll < 0.50) {
          board.push({ position: i, type: "multiplier_2x", multiplier: 2 });
        } else if (multiplierRoll < 0.75) {
          board.push({ position: i, type: "multiplier_2_5x", multiplier: 2.5 });
        } else {
          board.push({ position: i, type: "multiplier_3x", multiplier: 3 });
        }
      } else {
        if (multiplierRoll < 0.35) {
          board.push({ position: i, type: "multiplier_1x", multiplier: 1 });
        } else if (multiplierRoll < 0.65) {
          board.push({ position: i, type: "multiplier_1_5x", multiplier: 1.5 });
        } else if (multiplierRoll < 0.90) {
          board.push({ position: i, type: "multiplier_2x", multiplier: 2 });
        } else {
          board.push({ position: i, type: "multiplier_2_5x", multiplier: 2.5 });
        }
      }
    } else if (roll < resetTrapChance + hazardChance + multiplierChance + powerupChance) {
      const powerupRoll = getNextRandom();
      if (powerupRoll < 0.4) {
        board.push({ position: i, type: "powerup_shield", powerup: "shield" });
      } else if (powerupRoll < 0.7) {
        board.push({ position: i, type: "powerup_double", powerup: "double" });
      } else {
        board.push({ position: i, type: "powerup_skip", powerup: "skip" });
      }
    } else if (roll < resetTrapChance + hazardChance + multiplierChance + powerupChance + bonusChance) {
      const bonusMultiplier = Math.floor(getNextRandom() * 3) + 2;
      board.push({ position: i, type: "bonus_chest", multiplier: bonusMultiplier });
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
      const { walletAddress, betAmount, txHash } = req.body;
      
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
        depositTxHash: txHash || null,
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
        finalMultiplier = 20;
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
        finalMultiplier = Math.max(finalMultiplier, landedStep.multiplier);
        finalMultiplier = Math.min(finalMultiplier, 11);
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

  app.post("/api/game/:gameId/claim-nonce", async (req, res) => {
    try {
      const { gameId } = req.params;
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address required" });
      }
      
      const game = await storage.getGame(parseInt(gameId));
      
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      
      const user = await storage.getUser(game.userId);
      if (!user || user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ error: "Not authorized to claim this game" });
      }
      
      if (game.gameStatus !== "won" && game.gameStatus !== "cashed_out") {
        return res.status(400).json({ error: "Game must be won or cashed out to claim" });
      }
      
      if (game.claimStatus === "claimed") {
        return res.status(400).json({ error: "Game already claimed" });
      }
      
      if (!game.payout || parseFloat(game.payout) <= 0) {
        return res.status(400).json({ error: "No payout available for this game" });
      }
      
      const nonce = nanoid(32);
      const nonceExpiry = new Date(Date.now() + 5 * 60 * 1000);
      
      await storage.updateGame(game.id, {
        claimNonce: nonce,
      });
      
      res.json({ 
        nonce,
        amount: game.payout,
        gameId: game.id,
        expiresAt: nonceExpiry.toISOString(),
      });
    } catch (error) {
      console.error("Claim nonce error:", error);
      res.status(500).json({ error: "Failed to generate claim nonce" });
    }
  });

  app.post("/api/claim", async (req, res) => {
    try {
      const { walletAddress, amount, gameId, signature, nonce } = req.body;
      
      if (!walletAddress || !amount || !gameId || !signature || !nonce) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const game = await storage.getGame(parseInt(gameId));
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      
      const user = await storage.getUser(game.userId);
      if (!user || user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ error: "Wallet address does not match game owner" });
      }
      
      if (game.claimNonce !== nonce) {
        return res.status(400).json({ error: "Invalid or expired nonce" });
      }
      
      if (game.claimStatus === "claimed") {
        return res.status(400).json({ error: "Game already claimed" });
      }
      
      if (game.gameStatus !== "won" && game.gameStatus !== "cashed_out") {
        return res.status(400).json({ error: "Game must be won or cashed out to claim" });
      }
      
      if (!game.payout || parseFloat(game.payout) <= 0) {
        return res.status(400).json({ error: "No payout available" });
      }
      
      if (game.payout !== amount) {
        return res.status(400).json({ error: "Amount mismatch" });
      }
      
      const expectedMessage = `KICKS CLIMB Claim\nAmount: ${amount} KICKS\nGame ID: ${gameId}\nWallet: ${walletAddress}\nNonce: ${nonce}`;
      
      const { ethers } = await import("ethers");
      let recoveredAddress: string;
      
      try {
        recoveredAddress = ethers.verifyMessage(expectedMessage, signature);
      } catch (e) {
        return res.status(400).json({ error: "Invalid signature format" });
      }
      
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(400).json({ error: "Signature verification failed" });
      }
      
      await storage.updateGame(game.id, {
        claimStatus: "claimed",
        claimNonce: null,
      });
      
      res.json({ 
        success: true,
        message: "Claim verified successfully. The house will process your payout.",
        amount: game.payout,
        txHash: null,
      });
    } catch (error) {
      console.error("Claim error:", error);
      res.status(500).json({ error: "Failed to process claim" });
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

  app.get("/api/user/:walletAddress/games", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const user = await storage.getUserByWallet(walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const games = await storage.getUserGames(user.id, limit);
      res.json({ games });
    } catch (error) {
      console.error("Get user games error:", error);
      res.status(500).json({ error: "Failed to get user games" });
    }
  });

  app.get("/api/user/:walletAddress/stats", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      const user = await storage.getUserByWallet(walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const recentGames = await storage.getUserGames(user.id, 100);
      
      const stats = {
        totalGamesPlayed: user.totalGamesPlayed,
        gamesWon: user.gamesWon,
        gamesLost: user.gamesLost,
        totalKicksWon: user.totalKicksWon,
        totalKicksLost: user.totalKicksLost,
        highestMultiplier: user.highestMultiplier,
        winRate: user.totalGamesPlayed > 0 
          ? ((user.gamesWon / user.totalGamesPlayed) * 100).toFixed(1)
          : "0",
        netProfit: (parseFloat(user.totalKicksWon) - parseFloat(user.totalKicksLost)).toString(),
        averageBet: recentGames.length > 0
          ? (recentGames.reduce((sum, g) => sum + parseFloat(g.betAmount), 0) / recentGames.length).toFixed(2)
          : "0",
        biggestWin: recentGames.length > 0
          ? Math.max(...recentGames.filter(g => g.payout).map(g => parseFloat(g.payout || "0"))).toString()
          : "0",
      };
      
      res.json({ stats });
    } catch (error) {
      console.error("Get user stats error:", error);
      res.status(500).json({ error: "Failed to get user stats" });
    }
  });

  app.get("/api/leaderboard/alltime", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const type = req.query.type as string || "winnings";
      
      const leaderboard = await storage.getAllTimeLeaderboard(limit, type);
      res.json({ leaderboard });
    } catch (error) {
      console.error("All-time leaderboard error:", error);
      res.status(500).json({ error: "Failed to get all-time leaderboard" });
    }
  });

  app.get("/api/leaderboard/biggest-wins", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const biggestWins = await storage.getBiggestWins(limit);
      res.json({ biggestWins });
    } catch (error) {
      console.error("Biggest wins error:", error);
      res.status(500).json({ error: "Failed to get biggest wins" });
    }
  });

  app.get("/api/user/:walletAddress/achievements", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const user = await storage.getUserByWallet(walletAddress);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const achievements = await storage.getUserAchievements(user.id);
      res.json({ achievements });
    } catch (error) {
      console.error("Get achievements error:", error);
      res.status(500).json({ error: "Failed to get achievements" });
    }
  });

  app.post("/api/user/:walletAddress/achievements/check", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const user = await storage.getUserByWallet(walletAddress);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const newAchievements: string[] = [];
      
      const achievementChecks = [
        { id: "first_climb", condition: user.totalGamesPlayed >= 1 },
        { id: "veteran_climber", condition: user.totalGamesPlayed >= 10 },
        { id: "dedicated_climber", condition: user.totalGamesPlayed >= 50 },
        { id: "master_climber", condition: user.totalGamesPlayed >= 100 },
        { id: "first_win", condition: user.gamesWon >= 1 },
        { id: "winner", condition: user.gamesWon >= 10 },
        { id: "champion", condition: user.gamesWon >= 50 },
        { id: "multiplier_hunter", condition: parseFloat(user.highestMultiplier) >= 5 },
        { id: "big_multiplier", condition: parseFloat(user.highestMultiplier) >= 10 },
        { id: "legendary_multiplier", condition: parseFloat(user.highestMultiplier) >= 20 },
        { id: "thousand_kicks", condition: parseFloat(user.totalKicksWon) >= 1000 },
        { id: "ten_thousand_kicks", condition: parseFloat(user.totalKicksWon) >= 10000 },
        { id: "hundred_thousand_kicks", condition: parseFloat(user.totalKicksWon) >= 100000 },
      ];

      for (const check of achievementChecks) {
        if (check.condition) {
          const hasIt = await storage.hasAchievement(user.id, check.id);
          if (!hasIt) {
            await storage.unlockAchievement(user.id, check.id);
            newAchievements.push(check.id);
          }
        }
      }
      
      res.json({ newAchievements, total: newAchievements.length });
    } catch (error) {
      console.error("Check achievements error:", error);
      res.status(500).json({ error: "Failed to check achievements" });
    }
  });

  return httpServer;
}
