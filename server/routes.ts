import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { ethers } from "ethers";
import { TwitterApi } from "twitter-api-v2";

const MISSIONS = [
  { id: 1, title: "Gameplay Screenshot", description: "Post a cool or epic Dashville gameplay screenshot tagging @DashKidsnft and @rabbitsonape", points: 25, requiredMentions: ["dashkidsnft", "rabbitsonape"] },
  { id: 2, title: "Gameplay Video Clip", description: "Share a short (10-30s) Dashville gameplay video clip mentioning @DashKidsnft and @rabbitsonape", points: 45, requiredMentions: ["dashkidsnft", "rabbitsonape"] },
  { id: 3, title: "Funny Moment", description: "Share your funniest Dashville fail, clutch, or WTF moment (image or video) tagging @DashKidsnft and @rabbitsonape", points: 50, requiredMentions: ["dashkidsnft", "rabbitsonape"] },
  { id: 4, title: "High Score / Achievement Brag", description: "Post your best Dashville high score or achievement screenshot tagging @DashKidsnft and @rabbitsonape", points: 20, requiredMentions: ["dashkidsnft", "rabbitsonape"] },
  { id: 5, title: "Fan Art or Meme", description: "Create & post original Dashville fan art or meme tagging @DashKidsnft and @rabbitsonape", points: 30, requiredMentions: ["dashkidsnft", "rabbitsonape"] },
  { id: 6, title: "RabbitsOnApe NFT Showcase", description: "Post your RabbitsOnApe NFT and mention @rabbitsonape", points: 15, requiredMentions: ["rabbitsonape"] },
  { id: 7, title: "DashKidsNFT Showcase", description: "Post your DashKidsNFT and mention @DashKidsnft", points: 15, requiredMentions: ["dashkidsnft"] },
  { id: 8, title: "Squad / Duo Moment", description: "Post a screenshot or clip of you playing Dashville with friends/squad mentioning @DashKidsnft and @rabbitsonape", points: 35, requiredMentions: ["dashkidsnft", "rabbitsonape"] },
  { id: 9, title: "Dashville Retro", description: "Post a picture or video of your Dashville game tagging @dashkidsnft and @rabbitsonape", points: 30, requiredMentions: ["dashkidsnft", "rabbitsonape"] },
  { id: 10, title: "GM Post", description: "Post a GM using your @rabbitsonape or @DashKidsnft NFT and tag the account", points: 30, requiredMentions: ["rabbitsonape", "dashkidsnft"] },
];

const COMBO_BONUSES = [
  { name: "Triple Threat", condition: "3+ different missions completed", requiredCount: 3, bonusPoints: 30 },
  { name: "Viral Power", condition: "Funny Moment + Gameplay Video", requiredMissions: [2, 3], bonusPoints: 25 },
  { name: "Full Send", condition: "5+ missions completed", requiredCount: 5, bonusPoints: 60 },
];

function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const dayOfWeek = d.getUTCDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
  const daysSinceLastSaturday = daysUntilSaturday === 0 ? 0 : 7 - daysUntilSaturday;
  d.setUTCDate(d.getUTCDate() - daysSinceLastSaturday);
  return d;
}

function getWeekEnd(weekStart: Date): Date {
  const end = new Date(weekStart);
  end.setUTCDate(end.getUTCDate() + 7);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

function isWeekday(): boolean {
  const day = new Date().getUTCDay();
  return day >= 1 && day <= 5;
}

function getTodayStart(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function extractTweetId(url: string): string | null {
  const patterns = [
    /twitter\.com\/\w+\/status\/(\d+)/,
    /x\.com\/\w+\/status\/(\d+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

const APECHAIN_RPC = "https://apechain.calderachain.xyz/http";
const APECHAIN_CHAIN_ID = 33139;

const TOTAL_STEPS = 100;

type StepType = "safe" | "multiplier_1x" | "multiplier_1_5x" | "multiplier_2x" | "multiplier_2_5x" | "multiplier_3x" | "multiplier_4x" | "multiplier_5x" | "multiplier_6x" | "multiplier_7x" | "multiplier_8x" | "multiplier_9x" | "multiplier_10x" | "hazard" | "reset_trap" | "finish" | "powerup_shield" | "powerup_double" | "powerup_skip" | "bonus_chest";

interface BoardStep {
  position: number;
  type: StepType;
  multiplier?: number;
  powerup?: string;
}

function generateBoard(seed: string): BoardStep[] {
  const board: BoardStep[] = [];
  
  let hashSeed = seed;
  let hashBuffer = '';
  let bufferIndex = 0;
  
  const getNextRandom = (): number => {
    if (bufferIndex >= hashBuffer.length - 7) {
      hashBuffer = crypto.createHash('sha256').update(hashSeed + bufferIndex.toString()).digest('hex');
      hashSeed = hashBuffer;
      bufferIndex = 0;
    }
    const hex = hashBuffer.substring(bufferIndex, bufferIndex + 8);
    bufferIndex += 8;
    return parseInt(hex, 16) / 0xffffffff;
  };
  
  const precomputeHazardPositions = (): Set<number> => {
    const hazardPositions = new Set<number>();
    const BOARD_COLS = 10;
    const TARGET_HAZARDS = 20;
    const MIN_VISUAL_DISTANCE = 2;
    const MIN_PATH_GAP = 4;
    
    const stepToGrid = (pos: number): { row: number; col: number } => {
      const row = Math.floor(pos / BOARD_COLS);
      const colInRow = pos % BOARD_COLS;
      const col = row % 2 === 0 ? colInRow : BOARD_COLS - 1 - colInRow;
      return { row, col };
    };
    
    const getVisualDistance = (pos1: number, pos2: number): number => {
      const grid1 = stepToGrid(pos1);
      const grid2 = stepToGrid(pos2);
      return Math.abs(grid1.row - grid2.row) + Math.abs(grid1.col - grid2.col);
    };
    
    const isTooCloseVisually = (pos: number): boolean => {
      const existingArray = Array.from(hazardPositions);
      for (let i = 0; i < existingArray.length; i++) {
        if (getVisualDistance(pos, existingArray[i]) < MIN_VISUAL_DISTANCE) {
          return true;
        }
      }
      return false;
    };
    
    const isTooCloseOnPath = (pos: number): boolean => {
      const existingArray = Array.from(hazardPositions);
      for (let i = 0; i < existingArray.length; i++) {
        if (Math.abs(pos - existingArray[i]) < MIN_PATH_GAP) {
          return true;
        }
      }
      return false;
    };
    
    const candidates: number[] = [];
    for (let pos = 5; pos <= 95; pos++) {
      candidates.push(pos);
    }
    
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(getNextRandom() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    
    for (const pos of candidates) {
      if (hazardPositions.size >= TARGET_HAZARDS) break;
      
      if (!isTooCloseVisually(pos) && !isTooCloseOnPath(pos)) {
        hazardPositions.add(pos);
      }
    }
    
    if (hazardPositions.size < TARGET_HAZARDS) {
      for (const pos of candidates) {
        if (hazardPositions.size >= TARGET_HAZARDS) break;
        if (hazardPositions.has(pos)) continue;
        
        let tooClose = false;
        const existingArray = Array.from(hazardPositions);
        for (const existing of existingArray) {
          if (Math.abs(pos - existing) < 3) {
            tooClose = true;
            break;
          }
        }
        
        if (!tooClose) {
          hazardPositions.add(pos);
        }
      }
    }
    
    return hazardPositions;
  };
  
  const hazardPositions = precomputeHazardPositions();
  
  for (let i = 0; i <= TOTAL_STEPS; i++) {
    if (i === 0) {
      board.push({ position: i, type: "safe" });
      continue;
    }
    
    if (i === TOTAL_STEPS) {
      board.push({ position: i, type: "finish", multiplier: 10 });
      continue;
    }
    
    if (hazardPositions.has(i)) {
      board.push({ position: i, type: "hazard" });
      continue;
    }
    
    let multiplierChance: number;
    let powerupChance: number = 0.05;
    let bonusChance: number = 0.02;
    let resetTrapChance: number = 0;
    
    if (i <= 25) {
      multiplierChance = 0.25;
      powerupChance = 0.08;
      resetTrapChance = 0.03;
    } else if (i <= 50) {
      multiplierChance = 0.22;
      powerupChance = 0.06;
      resetTrapChance = 0.04;
    } else if (i <= 75) {
      multiplierChance = 0.20;
      powerupChance = 0.04;
      bonusChance = 0.03;
      resetTrapChance = 0.05;
    } else {
      multiplierChance = 0.18;
      powerupChance = 0.03;
      bonusChance = 0.04;
      resetTrapChance = 0.06;
    }
    
    const roll = getNextRandom();
    
    const lastStep = board.length > 0 ? board[board.length - 1] : null;
    const lastMultiplier = lastStep?.multiplier || 0;
    
    if (roll < resetTrapChance) {
      board.push({ position: i, type: "reset_trap" });
    } else if (roll < resetTrapChance + multiplierChance) {
      let multiplierRoll = getNextRandom();
      let selectedMultiplier: number;
      let stepType: StepType;
      
      if (i >= 76) {
        const options = [
          { mult: 4, type: "multiplier_4x" as StepType, weight: 0.10 },
          { mult: 5, type: "multiplier_5x" as StepType, weight: 0.14 },
          { mult: 6, type: "multiplier_6x" as StepType, weight: 0.16 },
          { mult: 7, type: "multiplier_7x" as StepType, weight: 0.16 },
          { mult: 8, type: "multiplier_8x" as StepType, weight: 0.14 },
          { mult: 9, type: "multiplier_9x" as StepType, weight: 0.12 },
          { mult: 10, type: "multiplier_10x" as StepType, weight: 0.18 },
        ];
        let filtered = options.filter(o => o.mult !== lastMultiplier || o.mult >= 7);
        if (filtered.length === 0) filtered = options;
        const totalWeight = filtered.reduce((sum, o) => sum + o.weight, 0);
        let cumulative = 0;
        const pick = multiplierRoll * totalWeight;
        for (const opt of filtered) {
          cumulative += opt.weight;
          if (pick <= cumulative) {
            selectedMultiplier = opt.mult;
            stepType = opt.type;
            break;
          }
        }
        selectedMultiplier = selectedMultiplier! || 7;
        stepType = stepType! || "multiplier_7x";
      } else if (i >= 51) {
        const options = [
          { mult: 3, type: "multiplier_3x" as StepType, weight: 0.10 },
          { mult: 4, type: "multiplier_4x" as StepType, weight: 0.14 },
          { mult: 5, type: "multiplier_5x" as StepType, weight: 0.18 },
          { mult: 6, type: "multiplier_6x" as StepType, weight: 0.18 },
          { mult: 7, type: "multiplier_7x" as StepType, weight: 0.14 },
          { mult: 8, type: "multiplier_8x" as StepType, weight: 0.12 },
          { mult: 9, type: "multiplier_9x" as StepType, weight: 0.08 },
          { mult: 10, type: "multiplier_10x" as StepType, weight: 0.06 },
        ];
        let filtered = options.filter(o => o.mult !== lastMultiplier || o.mult >= 6);
        if (filtered.length === 0) filtered = options;
        const totalWeight = filtered.reduce((sum, o) => sum + o.weight, 0);
        let cumulative = 0;
        const pick = multiplierRoll * totalWeight;
        for (const opt of filtered) {
          cumulative += opt.weight;
          if (pick <= cumulative) {
            selectedMultiplier = opt.mult;
            stepType = opt.type;
            break;
          }
        }
        selectedMultiplier = selectedMultiplier! || 5;
        stepType = stepType! || "multiplier_5x";
      } else if (i >= 26) {
        const options = [
          { mult: 2, type: "multiplier_2x" as StepType, weight: 0.14 },
          { mult: 2.5, type: "multiplier_2_5x" as StepType, weight: 0.14 },
          { mult: 3, type: "multiplier_3x" as StepType, weight: 0.18 },
          { mult: 4, type: "multiplier_4x" as StepType, weight: 0.18 },
          { mult: 5, type: "multiplier_5x" as StepType, weight: 0.14 },
          { mult: 6, type: "multiplier_6x" as StepType, weight: 0.10 },
          { mult: 7, type: "multiplier_7x" as StepType, weight: 0.07 },
          { mult: 8, type: "multiplier_8x" as StepType, weight: 0.05 },
        ];
        let filtered = options.filter(o => o.mult !== lastMultiplier || o.mult >= 4);
        if (filtered.length === 0) filtered = options;
        const totalWeight = filtered.reduce((sum, o) => sum + o.weight, 0);
        let cumulative = 0;
        const pick = multiplierRoll * totalWeight;
        for (const opt of filtered) {
          cumulative += opt.weight;
          if (pick <= cumulative) {
            selectedMultiplier = opt.mult;
            stepType = opt.type;
            break;
          }
        }
        selectedMultiplier = selectedMultiplier! || 3;
        stepType = stepType! || "multiplier_3x";
      } else {
        const options = [
          { mult: 1, type: "multiplier_1x" as StepType, weight: 0.18 },
          { mult: 1.5, type: "multiplier_1_5x" as StepType, weight: 0.18 },
          { mult: 2, type: "multiplier_2x" as StepType, weight: 0.20 },
          { mult: 2.5, type: "multiplier_2_5x" as StepType, weight: 0.16 },
          { mult: 3, type: "multiplier_3x" as StepType, weight: 0.14 },
          { mult: 4, type: "multiplier_4x" as StepType, weight: 0.08 },
          { mult: 5, type: "multiplier_5x" as StepType, weight: 0.06 },
        ];
        let filtered = options.filter(o => o.mult !== lastMultiplier || o.mult >= 3);
        if (filtered.length === 0) filtered = options;
        const totalWeight = filtered.reduce((sum, o) => sum + o.weight, 0);
        let cumulative = 0;
        const pick = multiplierRoll * totalWeight;
        for (const opt of filtered) {
          cumulative += opt.weight;
          if (pick <= cumulative) {
            selectedMultiplier = opt.mult;
            stepType = opt.type;
            break;
          }
        }
        selectedMultiplier = selectedMultiplier! || 2;
        stepType = stepType! || "multiplier_2x";
      }
      
      board.push({ position: i, type: stepType, multiplier: selectedMultiplier });
    } else if (roll < resetTrapChance + multiplierChance + powerupChance) {
      const powerupRoll = getNextRandom();
      if (powerupRoll < 0.4) {
        board.push({ position: i, type: "powerup_shield", powerup: "shield" });
      } else if (powerupRoll < 0.7) {
        board.push({ position: i, type: "powerup_double", powerup: "double" });
      } else {
        board.push({ position: i, type: "powerup_skip", powerup: "skip" });
      }
    } else if (roll < resetTrapChance + multiplierChance + powerupChance + bonusChance) {
      const bonusMultiplier = Math.floor(getNextRandom() * 3) + 2;
      board.push({ position: i, type: "bonus_chest", multiplier: bonusMultiplier });
    } else {
      board.push({ position: i, type: "safe" });
    }
  }
  
  return board;
}

export async function registerRoutes(
  app: Express,
  httpServer?: Server
): Promise<void> {
  
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
      } else if (username && username !== user.username) {
        // Update username for existing users if a new one is provided
        user = await storage.updateUser(user.id, { username }) || user;
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
      const { steps, useShield, useSkip, useDouble } = req.body;
      
      const game = await storage.getGame(parseInt(gameId));
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      
      if (game.gameStatus !== "active") {
        return res.status(400).json({ error: "Game is not active" });
      }
      
      const board = generateBoard(game.oddseed);
      let newPosition = Math.min(game.finalPosition + steps, TOTAL_STEPS);
      let landedStep = board[newPosition];
      
      await storage.createGameStep({
        gameId: game.id,
        stepNumber: newPosition,
        stepType: landedStep.type,
        multiplierValue: landedStep.multiplier?.toString(),
      });
      
      let gameStatus = game.gameStatus;
      let finalMultiplier = game.finalMultiplier ? parseFloat(game.finalMultiplier) : 1;
      let payout = game.payout;
      let shieldUsed = false;
      let skipUsed = false;
      let doubleUsed = false;
      let skippedPosition: number | null = null;
      
      if (landedStep.type === "hazard" || landedStep.type === "reset_trap") {
        if (useSkip) {
          skipUsed = true;
          skippedPosition = newPosition;
          newPosition = Math.min(newPosition + 1, TOTAL_STEPS);
          landedStep = board[newPosition];
          
          await storage.createGameStep({
            gameId: game.id,
            stepNumber: newPosition,
            stepType: landedStep.type,
            multiplierValue: landedStep.multiplier?.toString(),
          });
        }
      }
      
      if (landedStep.type === "hazard") {
        if (useShield) {
          shieldUsed = true;
          gameStatus = "active";
        } else {
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
        }
      } else if (landedStep.type === "finish") {
        gameStatus = "won";
        finalMultiplier = 10;
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
      } else if (landedStep.type === "reset_trap") {
        if (useShield) {
          shieldUsed = true;
        } else {
          const updatedGame = await storage.updateGame(game.id, {
            finalPosition: 0,
            gameStatus: "active",
            finalMultiplier: finalMultiplier.toString(),
          });
          
          return res.json({
            game: updatedGame,
            landedStep,
            currentMultiplier: finalMultiplier,
            potentialPayout: (parseFloat(game.betAmount) * finalMultiplier).toString(),
            shieldUsed: false,
            resetToStart: true,
          });
        }
      } else if (landedStep.type === "bonus_chest") {
        const bonusMultiplier = landedStep.multiplier || 2;
        finalMultiplier = Math.min(bonusMultiplier, 10);
        
        const givesBonusKicks = Math.random() < 0.3;
        const bonusKicksAmount = givesBonusKicks ? 5 : 0;
        
        const currentBonusKicks = game.bonusKicks ? parseFloat(game.bonusKicks) : 0;
        const newBonusKicks = currentBonusKicks + bonusKicksAmount;
        
        if (useDouble && !doubleUsed) {
          finalMultiplier = Math.min(finalMultiplier * 2, 10);
          doubleUsed = true;
        }
        
        const updatedGame = await storage.updateGame(game.id, {
          finalPosition: newPosition,
          gameStatus,
          finalMultiplier: finalMultiplier.toString(),
          payout,
          bonusKicks: newBonusKicks.toString(),
        });
        
        const basePayout = parseFloat(game.betAmount) * finalMultiplier;
        const totalPotentialPayout = basePayout + newBonusKicks;
        
        return res.json({
          game: updatedGame,
          landedStep,
          currentMultiplier: finalMultiplier,
          potentialPayout: totalPotentialPayout.toString(),
          bonusKicks: newBonusKicks,
          shieldUsed,
          skipUsed,
          doubleUsed,
          skippedPosition,
          bonusChestReward: {
            type: givesBonusKicks ? "kicks" : "multiplier",
            amount: bonusKicksAmount,
            multiplierBonus: bonusMultiplier,
          },
        });
      } else if (landedStep.multiplier) {
        finalMultiplier = Math.min(landedStep.multiplier, 10);
      }
      
      if (useDouble && !doubleUsed) {
        finalMultiplier = Math.min(finalMultiplier * 2, 10);
        doubleUsed = true;
      }
      
      const updatedGame = await storage.updateGame(game.id, {
        finalPosition: newPosition,
        gameStatus,
        finalMultiplier: finalMultiplier.toString(),
        payout,
        ...(gameStatus !== "active" && { endedAt: new Date() }),
      });
      
      const currentBonusKicks = game.bonusKicks ? parseFloat(game.bonusKicks) : 0;
      const basePayout = parseFloat(game.betAmount) * finalMultiplier;
      const totalPotentialPayout = basePayout + currentBonusKicks;
      
      res.json({
        game: updatedGame,
        landedStep,
        currentMultiplier: finalMultiplier,
        potentialPayout: totalPotentialPayout.toString(),
        bonusKicks: currentBonusKicks,
        shieldUsed,
        skipUsed,
        doubleUsed,
        skippedPosition,
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
      const bonusKicks = game.bonusKicks ? parseFloat(game.bonusKicks) : 0;
      const basePayout = parseFloat(game.betAmount) * currentMultiplier;
      const totalPayout = (basePayout + bonusKicks).toString();
      
      const updatedGame = await storage.updateGame(game.id, {
        gameStatus: "cashed_out",
        payout: totalPayout,
        endedAt: new Date(),
      });
      
      const user = await storage.getUser(game.userId);
      if (user) {
        await storage.updateUser(user.id, {
          gamesWon: user.gamesWon + 1,
          totalKicksWon: (parseFloat(user.totalKicksWon) + parseFloat(totalPayout)).toString(),
          highestMultiplier: Math.max(parseFloat(user.highestMultiplier), currentMultiplier).toString(),
        });
        await storage.updateDailyLeaderboard(user.id, totalPayout, currentMultiplier.toString());
        await storage.updateWeeklyLeaderboard(user.id, totalPayout, currentMultiplier.toString());
      }
      
      res.json({
        game: {
          ...updatedGame,
          oddseed: game.oddseed,
        },
        payout: totalPayout,
        bonusKicks,
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
      const { walletAddress, amount, gameId, signature, nonce, kicksTokenAddress } = req.body;
      
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
      
      let txHash: string | null = null;
      
      const houseWalletKey = process.env.HOUSE_WALLET_KEY;
      
      if (houseWalletKey && kicksTokenAddress) {
        try {
          const APECHAIN_RPC = "https://apechain.calderachain.xyz/http";
          const provider = new ethers.JsonRpcProvider(APECHAIN_RPC);
          
          const cleanKey = houseWalletKey.trim();
          let houseWallet;
          
          const wordCount = cleanKey.split(' ').length;
          
          if (wordCount >= 12) {
            const hdWallet = ethers.Wallet.fromPhrase(cleanKey);
            houseWallet = new ethers.Wallet(hdWallet.privateKey, provider);
          } else {
            const privateKey = cleanKey.startsWith('0x') ? cleanKey : `0x${cleanKey}`;
            houseWallet = new ethers.Wallet(privateKey, provider);
          }
          
          const erc20Abi = [
            "function transfer(address to, uint256 amount) returns (bool)",
            "function decimals() view returns (uint8)",
            "function balanceOf(address owner) view returns (uint256)"
          ];
          
          const kicksContract = new ethers.Contract(kicksTokenAddress, erc20Abi, houseWallet);
          
          const decimals = await kicksContract.decimals();
          
          const numericAmount = parseFloat(amount);
          const maxDecimals = Number(decimals);
          const roundedAmount = Number(numericAmount.toFixed(maxDecimals));
          const cleanAmount = roundedAmount.toString();
          
          const amountInWei = ethers.parseUnits(cleanAmount, decimals);
          
          const houseBalance = await kicksContract.balanceOf(houseWallet.address);
          
          if (houseBalance < amountInWei) {
            return res.status(400).json({ 
              error: `House wallet has insufficient KICKS balance` 
            });
          }
          
          const tx = await kicksContract.transfer(walletAddress, amountInWei);
          const receipt = await tx.wait();
          txHash = receipt.hash;
          
        } catch (transferError: any) {
          console.error("Token transfer failed:", transferError);
          return res.status(500).json({ 
            error: `Failed to send KICKS: ${transferError.message || "Unknown error"}` 
          });
        }
      }
      
      await storage.updateGame(game.id, {
        claimStatus: "claimed",
        claimNonce: null,
      });
      
      res.json({ 
        success: true,
        message: txHash 
          ? "KICKS tokens sent successfully!" 
          : "Claim verified successfully.",
        amount: game.payout,
        txHash,
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

  app.get("/api/rabbit-rush/profile/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const user = await storage.getUserByWallet(walletAddress);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      let inventory = await storage.getRabbitRushInventory(user.id);
      if (!inventory) {
        inventory = await storage.createRabbitRushInventory(user.id);
      }
      
      res.json({ 
        user: {
          id: user.id,
          username: user.username,
          walletAddress: user.walletAddress,
        },
        inventory: {
          ...inventory,
          ownedShips: JSON.parse(inventory.ownedShips),
          ownedWeapons: JSON.parse(inventory.ownedWeapons),
          ownedColors: JSON.parse(inventory.ownedColors),
        }
      });
    } catch (error) {
      console.error("Get Rabbit Rush profile error:", error);
      res.status(500).json({ error: "Failed to get profile" });
    }
  });

  app.post("/api/rabbit-rush/purchase", async (req, res) => {
    try {
      const { walletAddress, itemType, itemId, txHash } = req.body;
      
      if (!txHash) {
        return res.status(400).json({ error: "Transaction hash required" });
      }
      
      const user = await storage.getUserByWallet(walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      let inventory = await storage.getRabbitRushInventory(user.id);
      if (!inventory) {
        inventory = await storage.createRabbitRushInventory(user.id);
      }
      
      const ownedShips = JSON.parse(inventory.ownedShips);
      const ownedWeapons = JSON.parse(inventory.ownedWeapons);
      const ownedColors = JSON.parse(inventory.ownedColors);
      
      if (itemType === 'ship' && !ownedShips.includes(itemId)) {
        ownedShips.push(itemId);
        await storage.updateRabbitRushInventory(user.id, { 
          ownedShips: JSON.stringify(ownedShips) 
        });
      } else if (itemType === 'weapon' && !ownedWeapons.includes(itemId)) {
        ownedWeapons.push(itemId);
        await storage.updateRabbitRushInventory(user.id, { 
          ownedWeapons: JSON.stringify(ownedWeapons) 
        });
      } else if (itemType === 'color' && !ownedColors.includes(itemId)) {
        ownedColors.push(itemId);
        await storage.updateRabbitRushInventory(user.id, { 
          ownedColors: JSON.stringify(ownedColors) 
        });
      }
      
      console.log(`Purchase recorded: ${itemType} ${itemId} for user ${user.id}, txHash: ${txHash}`);
      res.json({ success: true, ownedShips, ownedWeapons, ownedColors });
    } catch (error) {
      console.error("Purchase error:", error);
      res.status(500).json({ error: "Failed to process purchase" });
    }
  });

  app.post("/api/rabbit-rush/equip", async (req, res) => {
    try {
      const { walletAddress, selectedShip, selectedWeapon, selectedColor } = req.body;
      
      const user = await storage.getUserByWallet(walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const updates: any = {};
      if (selectedShip !== undefined) updates.selectedShip = selectedShip;
      if (selectedWeapon !== undefined) updates.selectedWeapon = selectedWeapon;
      if (selectedColor !== undefined) updates.selectedColor = selectedColor;
      
      await storage.updateRabbitRushInventory(user.id, updates);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Equip error:", error);
      res.status(500).json({ error: "Failed to equip item" });
    }
  });

  app.post("/api/rabbit-rush/run/start", async (req, res) => {
    try {
      const { walletAddress, wager, depositTxHash } = req.body;
      
      const wagerAmount = parseFloat(wager) || 0;
      if (wagerAmount > 0 && !depositTxHash) {
        return res.status(400).json({ error: "Deposit transaction hash required" });
      }
      
      const user = await storage.getUserByWallet(walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const run = await storage.createRabbitRushRun(user.id, wagerAmount.toString());
      if (depositTxHash) {
        await storage.updateRabbitRushRun(run.id, {
          depositTxHash: depositTxHash,
        });
      }
      
      console.log(`Game run started: runId=${run.id}, wager=${wagerAmount}, depositTxHash=${depositTxHash || 'free-play'}`);
      res.json({ success: true, runId: run.id });
    } catch (error) {
      console.error("Start run error:", error);
      res.status(500).json({ error: "Failed to start run" });
    }
  });

  app.post("/api/rabbit-rush/run/:runId/claim-nonce", async (req, res) => {
    try {
      const runId = parseInt(req.params.runId);
      const { walletAddress, authSignature } = req.body;
      const crypto = await import("crypto");
      const { ethers } = await import("ethers");
      
      if (!walletAddress || !authSignature) {
        return res.status(400).json({ error: "Wallet address and authentication signature required" });
      }
      
      const run = await storage.getRabbitRushRun(runId);
      if (!run) {
        return res.status(404).json({ error: "Run not found" });
      }
      
      const user = await storage.getUser(run.userId);
      if (!user || user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ error: "Not authorized to claim this run" });
      }
      
      const authMessage = `Request Rabbit Rush claim nonce for run ${runId}`;
      let recoveredAddress: string;
      try {
        recoveredAddress = ethers.verifyMessage(authMessage, authSignature);
      } catch (e) {
        return res.status(400).json({ error: "Invalid authentication signature" });
      }
      
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ error: "Authentication failed - signature does not match wallet" });
      }
      
      if (run.runStatus !== "won") {
        return res.status(400).json({ error: "Run must be won to claim" });
      }
      
      if (run.claimStatus === "claimed") {
        return res.status(400).json({ error: "Already claimed" });
      }
      
      // Use the stored payout from run/end (already includes multiplier calculation)
      const storedPayout = parseFloat(run.payout || "0");
      const expectedPayout = Math.floor(storedPayout);
      console.log(`[Rabbit Rush Nonce] Using stored payout: ${expectedPayout} from run ${runId}`);
      
      if (expectedPayout <= 0) {
        return res.status(400).json({ error: "No payout available" });
      }
      
      const nonce = `rabbit-rush-${runId}-${Date.now()}-${crypto.randomUUID()}`;
      
      await storage.updateRabbitRushRun(runId, {
        claimNonce: nonce,
      });
      
      res.json({ nonce, expectedPayout: expectedPayout.toString() });
    } catch (error) {
      console.error("Get claim nonce error:", error);
      res.status(500).json({ error: "Failed to generate nonce" });
    }
  });

  app.post("/api/rabbit-rush/claim", async (req, res) => {
    try {
      const { walletAddress, runId, signature, nonce, kicksTokenAddress } = req.body;
      
      if (!walletAddress || !runId || !signature || !nonce) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const run = await storage.getRabbitRushRun(parseInt(runId));
      if (!run) {
        return res.status(404).json({ error: "Run not found" });
      }
      
      const user = await storage.getUser(run.userId);
      if (!user || user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ error: "Wallet address does not match run owner" });
      }
      
      if (run.claimNonce !== nonce) {
        return res.status(400).json({ error: "Invalid or expired nonce" });
      }
      
      if (run.claimStatus === "claimed") {
        return res.status(400).json({ error: "Run already claimed" });
      }
      
      if (run.runStatus !== "won") {
        return res.status(400).json({ error: "Run must be won to claim" });
      }
      
      // Use the stored payout from run/end (already includes multiplier calculation)
      const storedPayout = parseFloat(run.payout || "0");
      const expectedPayout = Math.floor(storedPayout);
      console.log(`[Rabbit Rush Claim] Using stored payout: ${expectedPayout} for run ${runId}`);
      
      if (expectedPayout <= 0) {
        return res.status(400).json({ error: "No payout available" });
      }
      
      const amount = expectedPayout.toString();
      
      const expectedMessage = `RABBIT RUSH Claim\nAmount: ${amount} KICKS\nRun ID: ${runId}\nWallet: ${walletAddress}\nNonce: ${nonce}`;
      
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
      
      await storage.updateRabbitRushRun(parseInt(runId), {
        claimStatus: "processing",
        claimNonce: null,
      });
      
      let txHash: string | null = null;
      
      const houseWalletKey = process.env.HOUSE_WALLET_KEY;
      
      if (houseWalletKey && kicksTokenAddress) {
        try {
          const APECHAIN_RPC = "https://apechain.calderachain.xyz/http";
          const provider = new ethers.JsonRpcProvider(APECHAIN_RPC);
          const houseWallet = new ethers.Wallet(houseWalletKey, provider);
          
          const tokenContract = new ethers.Contract(
            kicksTokenAddress,
            [
              "function transfer(address to, uint256 amount) returns (bool)",
              "function decimals() view returns (uint8)"
            ],
            houseWallet
          );
          
          const decimals = await tokenContract.decimals();
          const amountInSmallestUnit = ethers.parseUnits(amount, decimals);
          
          const tx = await tokenContract.transfer(walletAddress, amountInSmallestUnit);
          const receipt = await tx.wait();
          txHash = receipt.hash;
          
          console.log(`Rabbit Rush claim sent: ${amount} KICKS to ${walletAddress}, tx: ${txHash}`);
        } catch (transferError: any) {
          console.error("Token transfer error:", transferError);
          await storage.updateRabbitRushRun(parseInt(runId), {
            claimStatus: "pending",
            claimNonce: null,
          });
          return res.status(500).json({ error: "Failed to transfer KICKS: " + transferError.message });
        }
      } else {
        console.warn("House wallet key or token address not configured, skipping transfer");
      }
      
      await storage.updateRabbitRushRun(parseInt(runId), {
        claimStatus: "claimed",
        claimTxHash: txHash || undefined,
      });
      
      res.json({ success: true, txHash });
    } catch (error) {
      console.error("Rabbit Rush claim error:", error);
      res.status(500).json({ error: "Failed to process claim" });
    }
  });

  app.post("/api/rabbit-rush/run/end", async (req, res) => {
    try {
      const { walletAddress, runId, wager, finalMultiplier, payout, coinsCollected, enemiesDestroyed, won } = req.body;
      
      const user = await storage.getUserByWallet(walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      let actualRunId = runId;
      if (!runId) {
        const run = await storage.createRabbitRushRun(user.id, wager.toString());
        actualRunId = run.id;
      }
      
      await storage.updateRabbitRushRun(actualRunId, {
        finalMultiplier: finalMultiplier.toString(),
        payout: payout.toString(),
        coinsCollected: coinsCollected || 0,
        enemiesDestroyed: enemiesDestroyed || 0,
        runStatus: won ? "won" : "lost",
        endedAt: new Date(),
      });
      
      let inventory = await storage.getRabbitRushInventory(user.id);
      if (!inventory) {
        inventory = await storage.createRabbitRushInventory(user.id);
      }
      
      const newTotalRuns = inventory.totalRuns + 1;
      const newBestMultiplier = Math.max(parseFloat(inventory.bestMultiplier), parseFloat(finalMultiplier));
      
      const updates: any = {
        totalRuns: newTotalRuns,
        bestMultiplier: newBestMultiplier.toString(),
      };
      
      if (won) {
        updates.runsWon = inventory.runsWon + 1;
        updates.totalKicksWon = (parseFloat(inventory.totalKicksWon) + parseFloat(payout)).toString();
        await storage.updateRabbitRushDailyLeaderboard(user.id, payout.toString(), finalMultiplier.toString());
        await storage.updateRabbitRushWeeklyLeaderboard(user.id, payout.toString(), finalMultiplier.toString());
      } else {
        updates.runsLost = inventory.runsLost + 1;
        updates.totalKicksLost = (parseFloat(inventory.totalKicksLost) + parseFloat(wager)).toString();
      }
      
      await storage.updateRabbitRushInventory(user.id, updates);
      
      res.json({ success: true, runId: actualRunId });
    } catch (error) {
      console.error("End run error:", error);
      res.status(500).json({ error: "Failed to record run" });
    }
  });

  app.get("/api/rabbit-rush/leaderboard/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      
      let leaderboard;
      if (type === "daily") {
        leaderboard = await storage.getRabbitRushDailyLeaderboard(limit);
      } else if (type === "weekly") {
        leaderboard = await storage.getRabbitRushWeeklyLeaderboard(limit);
      } else {
        return res.status(400).json({ error: "Invalid leaderboard type" });
      }
      
      res.json({ leaderboard });
    } catch (error) {
      console.error("Get leaderboard error:", error);
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  app.get("/api/rabbit-rush/runs/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const user = await storage.getUserByWallet(walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const runs = await storage.getUserRabbitRushRuns(user.id, limit);
      res.json({ runs });
    } catch (error) {
      console.error("Get runs error:", error);
      res.status(500).json({ error: "Failed to get runs" });
    }
  });

  app.get("/api/bunny-blade/leaderboard/weekly", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const leaderboard = await storage.getBunnyBladeWeeklyLeaderboard(limit);
      
      const { weekStart, weekEnd } = storage.getSaturdayWeekBoundaries();
      
      res.json({ 
        leaderboard,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString()
      });
    } catch (error) {
      console.error("Get bunny blade leaderboard error:", error);
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  app.post("/api/bunny-blade/score", async (req, res) => {
    try {
      const { walletAddress, username, score, kicks, level } = req.body;
      
      if (!walletAddress || !username || score === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const user = await storage.getUserByWallet(walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      await storage.updateBunnyBladeWeeklyLeaderboard(
        user.id,
        username,
        score,
        kicks || 0,
        level || 1
      );
      
      const leaderboard = await storage.getBunnyBladeWeeklyLeaderboard(50);
      res.json({ success: true, leaderboard });
    } catch (error) {
      console.error("Submit bunny blade score error:", error);
      res.status(500).json({ error: "Failed to submit score" });
    }
  });

  app.get("/api/bunny-blade/inventory/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      const user = await storage.getUserByWallet(walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const inventory = await storage.getBunnyBladeInventory(user.id);
      res.json({ 
        inventory: inventory || { 
          unlockedBlades: ['Wooden'], 
          activeBlade: 'Wooden' 
        } 
      });
    } catch (error) {
      console.error("Get bunny blade inventory error:", error);
      res.status(500).json({ error: "Failed to get inventory" });
    }
  });

  app.post("/api/bunny-blade/inventory/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const { unlockedBlades, activeBlade } = req.body;
      
      if (!unlockedBlades || !activeBlade) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const user = await storage.getUserByWallet(walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      await storage.updateBunnyBladeInventory(user.id, unlockedBlades, activeBlade);
      res.json({ success: true });
    } catch (error) {
      console.error("Update bunny blade inventory error:", error);
      res.status(500).json({ error: "Failed to update inventory" });
    }
  });

  // Dashville Game Run Endpoints
  app.post("/api/dashville/start", async (req, res) => {
    try {
      const { walletAddress, characterId } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address required" });
      }
      
      const user = await storage.getUserByWallet(walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const run = await storage.createDashvilleRun({
        userId: user.id,
        walletAddress,
        characterId: characterId || 0,
      });
      
      res.json({ runId: run.id, success: true });
    } catch (error) {
      console.error("Start Dashville run error:", error);
      res.status(500).json({ error: "Failed to start game" });
    }
  });

  app.post("/api/dashville/level-complete", async (req, res) => {
    try {
      const { runId, level, score, kicksEarned } = req.body;
      
      if (!runId) {
        return res.status(400).json({ error: "Run ID required" });
      }
      
      const run = await storage.getDashvilleRun(runId);
      if (!run) {
        return res.status(404).json({ error: "Run not found" });
      }
      
      if (run.status !== "playing") {
        return res.status(400).json({ error: "Run is not active" });
      }
      
      const currentKicks = parseFloat(run.kicksEarned as string) || 0;
      const newKicks = currentKicks + (kicksEarned || 0);
      
      await storage.updateDashvilleRun(runId, {
        currentLevel: level,
        score: score,
        kicksEarned: newKicks.toString(),
      });
      
      res.json({ 
        success: true, 
        totalKicks: newKicks,
        level,
      });
    } catch (error) {
      console.error("Level complete error:", error);
      res.status(500).json({ error: "Failed to update level" });
    }
  });

  app.post("/api/dashville/end", async (req, res) => {
    try {
      const { runId, won, finalScore, totalKicks, currentLevel } = req.body;
      
      if (!runId) {
        return res.status(400).json({ error: "Run ID required" });
      }
      
      const run = await storage.getDashvilleRun(runId);
      if (!run) {
        return res.status(404).json({ error: "Run not found" });
      }
      
      await storage.updateDashvilleRun(runId, {
        status: won ? "won" : "lost",
        score: finalScore || run.score,
        kicksEarned: totalKicks?.toString() || run.kicksEarned,
        completedAt: new Date(),
        currentLevel: currentLevel || run.currentLevel,
      });
      
      // Update game leaderboards
      try {
        const user = await storage.getUserByWallet(run.walletAddress);
        if (user) {
          const score = finalScore || run.score || 0;
          const kicks = totalKicks || parseFloat(run.kicksEarned as string) || 0;
          const level = currentLevel || run.currentLevel || 1;
          await storage.updateDashvilleGameLeaderboards(
            user.id,
            user.username,
            score,
            Math.floor(kicks),
            level
          );
        }
      } catch (lbError) {
        console.error("Failed to update leaderboard:", lbError);
      }
      
      res.json({ 
        success: true,
        status: won ? "won" : "lost",
        kicksEarned: totalKicks || parseFloat(run.kicksEarned as string),
      });
    } catch (error) {
      console.error("End game error:", error);
      res.status(500).json({ error: "Failed to end game" });
    }
  });

  app.post("/api/dashville/claim", async (req, res) => {
    try {
      const { runId, walletAddress, signature, message } = req.body;
      
      if (!runId || !walletAddress) {
        return res.status(400).json({ error: "Run ID and wallet address required" });
      }
      
      if (!signature || !message) {
        return res.status(400).json({ error: "Signature required to claim" });
      }
      
      // Verify signature
      try {
        const { ethers } = await import("ethers");
        const recoveredAddress = ethers.verifyMessage(message, signature);
        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          return res.status(403).json({ error: "Invalid signature" });
        }
      } catch (sigError) {
        console.error("Signature verification failed:", sigError);
        return res.status(403).json({ error: "Invalid signature" });
      }
      
      const run = await storage.getDashvilleRun(runId);
      if (!run) {
        return res.status(404).json({ error: "Run not found" });
      }
      
      if (run.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ error: "Not authorized to claim this run" });
      }
      
      if (run.claimStatus === "claimed") {
        return res.status(400).json({ error: "Already claimed" });
      }
      
      const kicksToSend = parseFloat(run.kicksEarned as string) - parseFloat(run.kicksClaimed as string);
      
      if (kicksToSend <= 0) {
        return res.status(400).json({ error: "No kicks to claim" });
      }
      
      // Transfer kicks from house wallet
      let txHash: string | null = null;
      try {
        const housePrivateKey = process.env.HOUSE_WALLET_KEY || process.env.HOUSE_WALLET_PRIVATE_KEY;
        if (!housePrivateKey) {
          console.error("HOUSE_WALLET_KEY not configured");
          return res.status(500).json({ error: "House wallet not configured" });
        }
        
        const { ethers } = await import("ethers");
        const provider = new ethers.JsonRpcProvider("https://apechain.calderachain.xyz/http", 33139);
        const wallet = new ethers.Wallet(housePrivateKey, provider);
        
        const kicksAddress = "0xDfce1e97B2CCB6D89c52f18cdbFFFE104E4F09cc";
        const tokenAbi = ["function transfer(address to, uint256 amount) returns (bool)"];
        const tokenContract = new ethers.Contract(kicksAddress, tokenAbi, wallet);
        
        const amountWei = ethers.parseUnits(kicksToSend.toString(), 18);
        console.log(`Attempting transfer of ${kicksToSend} KICKS (${amountWei} wei) to ${walletAddress}`);
        const tx = await tokenContract.transfer(walletAddress, amountWei);
        txHash = tx.hash;
        console.log(`Dashville claim sent: ${kicksToSend} KICKS to ${walletAddress}, tx: ${txHash}`);
        
        // Wait for transaction confirmation
        await tx.wait();
        console.log(`Dashville claim confirmed: tx ${txHash}`);
      } catch (txError: any) {
        console.error("Transfer error:", txError?.message || txError);
        return res.status(500).json({ error: "Failed to transfer KICKS: " + (txError?.message || "Unknown error") });
      }
      
      await storage.updateDashvilleRun(runId, {
        kicksClaimed: run.kicksEarned,
        claimStatus: "claimed",
        claimTxHash: txHash || undefined,
      });
      
      res.json({
        success: true,
        claimed: kicksToSend,
        txHash,
      });
    } catch (error) {
      console.error("Dashville claim error:", error);
      res.status(500).json({ error: "Failed to claim KICKS" });
    }
  });

  app.get("/api/dashville/run/:runId", async (req, res) => {
    try {
      const runId = parseInt(req.params.runId);
      const run = await storage.getDashvilleRun(runId);
      
      if (!run) {
        return res.status(404).json({ error: "Run not found" });
      }
      
      res.json(run);
    } catch (error) {
      console.error("Get run error:", error);
      res.status(500).json({ error: "Failed to get run" });
    }
  });

  // Dashville Game Leaderboards
  app.get("/api/dashville/leaderboard/daily", async (req, res) => {
    try {
      const today = new Date();
      const leaderboard = await storage.getDashvilleGameDailyLeaderboard(today, 10);
      res.json(leaderboard);
    } catch (error) {
      console.error("Get daily leaderboard error:", error);
      res.status(500).json({ error: "Failed to get daily leaderboard" });
    }
  });

  app.get("/api/dashville/leaderboard/weekly", async (req, res) => {
    try {
      const today = new Date();
      const dayOfWeek = today.getUTCDay();
      const weekStart = new Date(today);
      weekStart.setUTCDate(weekStart.getUTCDate() - ((dayOfWeek + 1) % 7));
      weekStart.setUTCHours(0, 0, 0, 0);
      
      const leaderboard = await storage.getDashvilleGameWeeklyLeaderboard(weekStart, 10);
      res.json(leaderboard);
    } catch (error) {
      console.error("Get weekly leaderboard error:", error);
      res.status(500).json({ error: "Failed to get weekly leaderboard" });
    }
  });

  // Username management
  app.get("/api/user/profile/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const user = await storage.getUserByWallet(walletAddress);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        username: user.username,
        walletAddress: user.walletAddress,
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ error: "Failed to get profile" });
    }
  });

  app.post("/api/user/username", async (req, res) => {
    try {
      const { walletAddress, username } = req.body;
      
      if (!walletAddress || !username) {
        return res.status(400).json({ error: "Wallet address and username required" });
      }
      
      if (username.length < 2 || username.length > 20) {
        return res.status(400).json({ error: "Username must be 2-20 characters" });
      }
      
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ error: "Username can only contain letters, numbers, and underscores" });
      }
      
      let user = await storage.getUserByWallet(walletAddress);
      
      if (!user) {
        user = await storage.createUser({
          walletAddress,
          username,
        });
      } else {
        user = await storage.updateUser(user.id, { username });
      }
      
      res.json({
        success: true,
        username: user?.username,
      });
    } catch (error) {
      console.error("Update username error:", error);
      res.status(500).json({ error: "Failed to update username" });
    }
  });

  app.get("/api/missions", async (req, res) => {
    try {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const weekStart = getWeekStart();
      const weekEnd = getWeekEnd(weekStart);
      
      res.json({
        missions: MISSIONS,
        combos: COMBO_BONUSES,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        maxDailyMissions: 3,
        isActive: true,
        schedule: "All Week",
      });
    } catch (error) {
      console.error("Get missions error:", error);
      res.status(500).json({ error: "Failed to get missions" });
    }
  });

  app.get("/api/missions/progress/:walletAddress", async (req, res) => {
    try {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const { walletAddress } = req.params;
      
      const user = await storage.getUserByWallet(walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const weekStart = getWeekStart();
      const todayStart = getTodayStart();
      
      let progress = await storage.getDashvilleMissionProgress(user.id, weekStart);
      
      if (!progress) {
        progress = await storage.createDashvilleMissionProgress(user.id, weekStart);
      }
      
      const lastDailyDate = progress.lastDailyDate ? new Date(progress.lastDailyDate) : null;
      const isNewDay = !lastDailyDate || lastDailyDate < todayStart;
      const dailyCount = isNewDay ? 0 : progress.dailyCount;
      const completedMissionsToday = isNewDay ? [] : JSON.parse(progress.completedMissions || "[]");
      
      const submissions = await storage.getDashvilleMissionSubmissions(user.id, weekStart);
      
      res.json({
        totalPoints: progress.totalPoints,
        completedMissions: completedMissionsToday,
        dailyCount,
        dailyLimit: 3,
        submissions: submissions.map(s => ({
          missionId: s.missionId,
          tweetUrl: s.tweetUrl,
          submittedAt: s.submittedAt,
        })),
      });
    } catch (error) {
      console.error("Get mission progress error:", error);
      res.status(500).json({ error: "Failed to get mission progress" });
    }
  });

  app.post("/api/missions/submit", async (req, res) => {
    try {
      const { walletAddress, missionId, tweetUrl } = req.body;
      
      
      if (!walletAddress || !missionId || !tweetUrl) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const tweetId = extractTweetId(tweetUrl);
      if (!tweetId) {
        return res.status(400).json({ error: "Invalid tweet URL. Please provide a valid X/Twitter post link." });
      }
      
      const mission = MISSIONS.find(m => m.id === missionId);
      if (!mission) {
        return res.status(400).json({ error: "Invalid mission ID" });
      }
      
      const user = await storage.getUserByWallet(walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const weekStart = getWeekStart();
      const todayStart = getTodayStart();
      
      let progress = await storage.getDashvilleMissionProgress(user.id, weekStart);
      if (!progress) {
        progress = await storage.createDashvilleMissionProgress(user.id, weekStart);
      }
      
      const lastDailyDate = progress.lastDailyDate ? new Date(progress.lastDailyDate) : null;
      const isNewDay = !lastDailyDate || lastDailyDate < todayStart;
      const completedMissionsToday = isNewDay ? [] : JSON.parse(progress.completedMissions || "[]");
      
      if (completedMissionsToday.includes(missionId)) {
        return res.status(400).json({ error: "You have already completed this mission today. Try again tomorrow!" });
      }
      
      const currentDailyCount = isNewDay ? 0 : progress.dailyCount;
      
      if (currentDailyCount >= 3) {
        return res.status(400).json({ error: "You have reached the daily limit of 3 missions. Try again tomorrow!" });
      }
      
      const existingSubmission = await storage.getDashvilleMissionSubmissionByTweetId(tweetId);
      if (existingSubmission) {
        return res.status(400).json({ error: "This tweet has already been submitted." });
      }
      
      let tweetData = null;
      let verificationPassed = false;
      let verificationError = null;
      
      const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;
      
      if (twitterBearerToken) {
        try {
          const twitterClient = new TwitterApi(twitterBearerToken);
          
          const tweet = await twitterClient.v2.singleTweet(tweetId, {
            "tweet.fields": ["created_at", "text", "attachments", "entities"],
            "expansions": ["attachments.media_keys"],
            "media.fields": ["type", "url"],
          });
          
          tweetData = JSON.stringify(tweet.data);
          
          const tweetText = tweet.data.text?.toLowerCase() || "";
          const requiredMentions = mission.requiredMentions || ["dashkidsnft", "rabbitsonape"];
          const missingMentions = requiredMentions.filter(mention => !tweetText.includes(`@${mention}`));
          
          if (missingMentions.length > 0) {
            const mentionsList = missingMentions.map(m => `@${m}`).join(" and ");
            return res.status(400).json({ 
              error: `Tweet must mention ${mentionsList}` 
            });
          }
          
          const hasMedia = tweet.includes?.media && tweet.includes.media.length > 0;
          if (!hasMedia) {
            return res.status(400).json({ 
              error: "Tweet must include an image or video attachment" 
            });
          }
          
          const tweetDate = new Date(tweet.data.created_at || "");
          if (tweetDate < weekStart) {
            return res.status(400).json({ 
              error: "Tweet must be from the current week" 
            });
          }
          
          verificationPassed = true;
        } catch (twitterError: any) {
          console.error("Twitter API error:", twitterError);
          const errorCode = twitterError.code;
          if (errorCode === 429 || errorCode === 'ETIMEDOUT' || errorCode === 'ECONNRESET') {
            verificationPassed = true;
            console.log("Twitter API rate limited or timeout, allowing submission");
          } else {
            return res.status(400).json({ 
              error: "Could not verify tweet. Please check the URL and try again." 
            });
          }
        }
      } else {
        console.log("No TWITTER_BEARER_TOKEN configured, skipping verification");
        verificationPassed = true;
      }
      
      if (!verificationPassed) {
        return res.status(400).json({ error: verificationError || "Tweet verification failed" });
      }
      
      await storage.createDashvilleMissionSubmission({
        userId: user.id,
        missionId,
        tweetId,
        tweetUrl,
        tweetData,
        pointsAwarded: mission.points,
        weekStart,
      });
      
      completedMissionsToday.push(missionId);
      const newDailyCount = currentDailyCount + 1;
      const newTotalPoints = progress.totalPoints + mission.points;
      
      await storage.updateDashvilleMissionProgress(user.id, weekStart, {
        totalPoints: newTotalPoints,
        completedMissions: JSON.stringify(completedMissionsToday),
        dailyCount: newDailyCount,
        lastDailyDate: new Date(),
      });
      
      await storage.updateDashvilleLeaderboards(user.id, user.username, mission.points, weekStart);
      
      res.json({
        success: true,
        pointsAwarded: mission.points,
        totalPoints: newTotalPoints,
        dailyCount: newDailyCount,
        message: `Mission completed! +${mission.points} points`,
      });
    } catch (error) {
      console.error("Submit mission error:", error);
      res.status(500).json({ error: "Failed to submit mission" });
    }
  });

  app.get("/api/missions/leaderboard/daily", async (req, res) => {
    try {
      const todayStart = getTodayStart();
      const leaderboard = await storage.getDashvilleDailyLeaderboard(todayStart, 20);
      res.json({ leaderboard });
    } catch (error) {
      console.error("Get daily leaderboard error:", error);
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  app.get("/api/missions/leaderboard/weekly", async (req, res) => {
    try {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const weekStart = getWeekStart();
      const leaderboard = await storage.getDashvilleWeeklyLeaderboard(weekStart, 50);
      
      const weekEnd = getWeekEnd(weekStart);
      const now = new Date();
      const msRemaining = weekEnd.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
      
      const walletAddress = req.query.walletAddress as string | undefined;
      const userPrize = walletAddress 
        ? await storage.getUserPendingPrize(walletAddress)
        : null;
      
      res.json({ 
        leaderboard,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        daysRemaining,
        prizes: [
          { rank: 1, kicks: 15000, nft: true },
          { rank: 2, kicks: 10000, nft: false },
          { rank: 3, kicks: 5000, nft: false },
        ],
        userPrize,
      });
    } catch (error) {
      console.error("Get weekly leaderboard error:", error);
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  app.post("/api/missions/claim-prize", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address required" });
      }
      
      const user = await storage.getUserByWallet(walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const prize = await storage.getUserPendingPrize(walletAddress);
      if (!prize) {
        return res.status(404).json({ error: "No pending prize to claim" });
      }
      
      const kicksAmount = parseFloat(prize.kicksAmount);
      const KICKS_TOKEN_ADDRESS = "0x79F8f881dD05c93Ca230F7E912ae33f7ECAf0d60";
      const houseWalletKey = process.env.HOUSE_WALLET_KEY || process.env.HOUSE_WALLET_PRIVATE_KEY;
      
      if (!houseWalletKey) {
        return res.status(500).json({ error: "House wallet not configured" });
      }
      
      const { ethers } = await import("ethers");
      const provider = new ethers.JsonRpcProvider("https://rpc.apechain.com");
      const houseWallet = new ethers.Wallet(houseWalletKey, provider);
      
      const kicksContract = new ethers.Contract(
        KICKS_TOKEN_ADDRESS,
        ["function transfer(address to, uint256 amount) returns (bool)"],
        houseWallet
      );
      
      const amountWei = ethers.parseUnits(kicksAmount.toString(), 18);
      const tx = await kicksContract.transfer(walletAddress, amountWei);
      const receipt = await tx.wait();
      
      await storage.markPrizeClaimed(prize.id, receipt.hash);
      
      res.json({
        success: true,
        txHash: receipt.hash,
        kicksAmount,
        rank: prize.rank,
        message: `Successfully claimed ${kicksAmount.toLocaleString()} KICKS!`,
      });
    } catch (error) {
      console.error("Claim prize error:", error);
      res.status(500).json({ error: "Failed to claim prize" });
    }
  });

  app.get("/api/missions/prizes/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const prize = await storage.getUserPendingPrize(walletAddress);
      res.json({ prize });
    } catch (error) {
      console.error("Get prize error:", error);
      res.status(500).json({ error: "Failed to get prize" });
    }
  });

}
