import type { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";
import { pgTable, text, serial, integer, timestamp, decimal, varchar } from "drizzle-orm/pg-core";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { ethers } from "ethers";

neonConfig.webSocketConstructor = globalThis.WebSocket;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const users = pgTable("users", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().unique(),
  username: text("username").notNull(),
  avatarUrl: text("avatar_url"),
  totalGamesPlayed: integer("total_games_played").default(0).notNull(),
  totalKicksWon: decimal("total_kicks_won", { precision: 36, scale: 18 }).default("0").notNull(),
  totalKicksLost: decimal("total_kicks_lost", { precision: 36, scale: 18 }).default("0").notNull(),
  highestMultiplier: decimal("highest_multiplier", { precision: 10, scale: 2 }).default("0").notNull(),
  gamesWon: integer("games_won").default(0).notNull(),
  gamesLost: integer("games_lost").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

const games = pgTable("games", {
  id: serial("id").primaryKey(),
  oddseed: text("oddseed").notNull(),
  oddseedHash: text("oddseed_hash").notNull(),
  oddResult: integer("odd_result"),
  userId: integer("user_id").notNull().references(() => users.id),
  betAmount: decimal("bet_amount", { precision: 36, scale: 18 }).notNull(),
  finalMultiplier: decimal("final_multiplier", { precision: 10, scale: 2 }),
  payout: decimal("payout", { precision: 36, scale: 18 }),
  finalPosition: integer("final_position").default(0).notNull(),
  gameStatus: text("game_status").default("active").notNull(),
  depositTxHash: text("deposit_tx_hash"),
  claimTxHash: text("claim_tx_hash"),
  claimNonce: text("claim_nonce"),
  claimStatus: text("claim_status").default("pending"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

const gameSteps = pgTable("game_steps", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => games.id),
  stepNumber: integer("step_number").notNull(),
  stepType: text("step_type").notNull(),
  multiplierValue: decimal("multiplier_value", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const dailyLeaderboard = pgTable("daily_leaderboard", {
  id: serial("id").primaryKey(),
  oddseed: text("oddseed").notNull(),
  oddseedHash: text("oddseed_hash").notNull(),
  oddResult: integer("odd_result"),
  userId: integer("user_id").notNull().references(() => users.id),
  totalWinnings: decimal("total_winnings", { precision: 36, scale: 18 }).default("0").notNull(),
  gamesPlayed: integer("games_played").default(0).notNull(),
  bestMultiplier: decimal("best_multiplier", { precision: 10, scale: 2 }).default("0").notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

const weeklyLeaderboard = pgTable("weekly_leaderboard", {
  id: serial("id").primaryKey(),
  oddseed: text("oddseed").notNull(),
  oddseedHash: text("oddseed_hash").notNull(),
  oddResult: integer("odd_result"),
  userId: integer("user_id").notNull().references(() => users.id),
  totalWinnings: decimal("total_winnings", { precision: 36, scale: 18 }).default("0").notNull(),
  gamesPlayed: integer("games_played").default(0).notNull(),
  bestMultiplier: decimal("best_multiplier", { precision: 10, scale: 2 }).default("0").notNull(),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
});

const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  achievementId: text("achievement_id").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  progress: integer("progress").default(0).notNull(),
  maxProgress: integer("max_progress").default(1).notNull(),
});

const schema = { users, games, gameSteps, dailyLeaderboard, weeklyLeaderboard, userAchievements };
const db = drizzle(pool, { schema });

type User = typeof users.$inferSelect;
type Game = typeof games.$inferSelect;
type GameStep = typeof gameSteps.$inferSelect;

const TOTAL_STEPS = 100;
type StepType = "safe" | "multiplier_1x" | "multiplier_1_5x" | "multiplier_2x" | "multiplier_2_5x" | "multiplier_3x" | "multiplier_4x" | "multiplier_5x" | "multiplier_6x" | "multiplier_7x" | "multiplier_8x" | "multiplier_10x" | "multiplier_12x" | "multiplier_15x" | "multiplier_18x" | "hazard" | "reset_trap" | "finish" | "powerup_shield" | "powerup_double" | "powerup_skip" | "bonus_chest";

interface BoardStep {
  position: number;
  type: StepType;
  multiplier?: number;
  powerup?: string;
}

function getGridPosition(step: number): { row: number; col: number } {
  const row = Math.floor(step / 10);
  const col = row % 2 === 0 ? step % 10 : 9 - (step % 10);
  return { row, col };
}

function getVisualDistance(step1: number, step2: number): number {
  const pos1 = getGridPosition(step1);
  const pos2 = getGridPosition(step2);
  return Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col);
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
  
  const TOTAL_HAZARDS = 15;
  const MIN_PATH_GAP = 4;
  const MIN_VISUAL_DISTANCE = 2;
  
  const hazardPositions: number[] = [];
  const candidatePositions: number[] = [];
  for (let i = 5; i <= 95; i++) {
    candidatePositions.push(i);
  }
  
  for (let i = candidatePositions.length - 1; i > 0; i--) {
    const randomIdx = Math.floor(getNextRandom() * (i + 1));
    [candidatePositions[i], candidatePositions[randomIdx]] = [candidatePositions[randomIdx], candidatePositions[i]];
  }
  
  for (const pos of candidatePositions) {
    if (hazardPositions.length >= TOTAL_HAZARDS) break;
    
    let tooClose = false;
    for (const existingHazard of hazardPositions) {
      const pathDistance = Math.abs(pos - existingHazard);
      const visualDistance = getVisualDistance(pos, existingHazard);
      if (pathDistance < MIN_PATH_GAP || visualDistance < MIN_VISUAL_DISTANCE) {
        tooClose = true;
        break;
      }
    }
    
    if (!tooClose) {
      hazardPositions.push(pos);
    }
  }
  
  if (hazardPositions.length < TOTAL_HAZARDS) {
    for (const pos of candidatePositions) {
      if (hazardPositions.length >= TOTAL_HAZARDS) break;
      if (hazardPositions.includes(pos)) continue;
      
      let tooClose = false;
      for (const existingHazard of hazardPositions) {
        const pathDistance = Math.abs(pos - existingHazard);
        if (pathDistance < 3) {
          tooClose = true;
          break;
        }
      }
      
      if (!tooClose) {
        hazardPositions.push(pos);
      }
    }
  }
  
  const hazardSet = new Set(hazardPositions);
  
  for (let i = 0; i <= TOTAL_STEPS; i++) {
    if (i === 0) {
      board.push({ position: i, type: "safe" });
      continue;
    }
    if (i === TOTAL_STEPS) {
      board.push({ position: i, type: "finish", multiplier: 20 });
      continue;
    }
    
    if (hazardSet.has(i)) {
      board.push({ position: i, type: "hazard" });
      continue;
    }
    
    const roll = getNextRandom();
    let multiplierChance: number, powerupChance = 0.05, bonusChance = 0.02, resetTrapChance = 0;
    
    if (i <= 25) {
      multiplierChance = 0.25; powerupChance = 0.08; resetTrapChance = 0.03;
    } else if (i <= 50) {
      multiplierChance = 0.22; powerupChance = 0.06; resetTrapChance = 0.04;
    } else if (i <= 75) {
      multiplierChance = 0.20; powerupChance = 0.04; bonusChance = 0.03; resetTrapChance = 0.05;
    } else {
      multiplierChance = 0.18; powerupChance = 0.03; bonusChance = 0.04; resetTrapChance = 0.06;
    }
    
    const lastStep = board.length > 0 ? board[board.length - 1] : null;
    const lastMultiplier = lastStep?.multiplier || 0;
    
    if (roll < resetTrapChance) {
      board.push({ position: i, type: "reset_trap" });
    } else if (roll < resetTrapChance + multiplierChance) {
      const multiplierRoll = getNextRandom();
      let selectedMultiplier: number;
      let stepType: StepType;
      
      if (i >= 76) {
        const options = [
          { mult: 5, type: "multiplier_5x" as StepType, weight: 0.12 },
          { mult: 6, type: "multiplier_6x" as StepType, weight: 0.12 },
          { mult: 7, type: "multiplier_7x" as StepType, weight: 0.14 },
          { mult: 8, type: "multiplier_8x" as StepType, weight: 0.16 },
          { mult: 10, type: "multiplier_10x" as StepType, weight: 0.16 },
          { mult: 12, type: "multiplier_12x" as StepType, weight: 0.12 },
          { mult: 15, type: "multiplier_15x" as StepType, weight: 0.10 },
          { mult: 18, type: "multiplier_18x" as StepType, weight: 0.08 },
        ];
        let filtered = options.filter(o => o.mult !== lastMultiplier || o.mult >= 10);
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
        selectedMultiplier = selectedMultiplier! || 8;
        stepType = stepType! || "multiplier_8x";
      } else if (i >= 51) {
        const options = [
          { mult: 3, type: "multiplier_3x" as StepType, weight: 0.12 },
          { mult: 4, type: "multiplier_4x" as StepType, weight: 0.15 },
          { mult: 5, type: "multiplier_5x" as StepType, weight: 0.18 },
          { mult: 6, type: "multiplier_6x" as StepType, weight: 0.15 },
          { mult: 7, type: "multiplier_7x" as StepType, weight: 0.12 },
          { mult: 8, type: "multiplier_8x" as StepType, weight: 0.12 },
          { mult: 10, type: "multiplier_10x" as StepType, weight: 0.10 },
          { mult: 12, type: "multiplier_12x" as StepType, weight: 0.06 },
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
          { mult: 2, type: "multiplier_2x" as StepType, weight: 0.15 },
          { mult: 2.5, type: "multiplier_2_5x" as StepType, weight: 0.15 },
          { mult: 3, type: "multiplier_3x" as StepType, weight: 0.20 },
          { mult: 4, type: "multiplier_4x" as StepType, weight: 0.18 },
          { mult: 5, type: "multiplier_5x" as StepType, weight: 0.15 },
          { mult: 6, type: "multiplier_6x" as StepType, weight: 0.10 },
          { mult: 8, type: "multiplier_8x" as StepType, weight: 0.07 },
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
          { mult: 1.5, type: "multiplier_1_5x" as StepType, weight: 0.15 },
          { mult: 2, type: "multiplier_2x" as StepType, weight: 0.25 },
          { mult: 2.5, type: "multiplier_2_5x" as StepType, weight: 0.20 },
          { mult: 3, type: "multiplier_3x" as StepType, weight: 0.18 },
          { mult: 4, type: "multiplier_4x" as StepType, weight: 0.12 },
          { mult: 5, type: "multiplier_5x" as StepType, weight: 0.10 },
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
      board.push({ position: i, type: stepType!, multiplier: selectedMultiplier! });
    } else if (roll < resetTrapChance + multiplierChance + powerupChance) {
      const powerupRoll = getNextRandom();
      if (powerupRoll < 0.4) board.push({ position: i, type: "powerup_shield", powerup: "shield" });
      else if (powerupRoll < 0.7) board.push({ position: i, type: "powerup_double", powerup: "double" });
      else board.push({ position: i, type: "powerup_skip", powerup: "skip" });
    } else if (roll < resetTrapChance + multiplierChance + powerupChance + bonusChance) {
      const bonusMultiplier = Math.floor(getNextRandom() * 3) + 2;
      board.push({ position: i, type: "bonus_chest", multiplier: bonusMultiplier });
    } else {
      board.push({ position: i, type: "safe" });
    }
  }
  return board;
}

async function getUserByWallet(walletAddress: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress.toLowerCase()));
  return user;
}

async function createUser(insertUser: any): Promise<User> {
  const [user] = await db.insert(users).values({
    ...insertUser,
    walletAddress: insertUser.walletAddress.toLowerCase(),
  }).returning();
  return user;
}

async function getUser(id: number): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

async function updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
  const [user] = await db.update(users).set({ ...updates, updatedAt: new Date() }).where(eq(users.id, id)).returning();
  return user;
}

async function createGame(game: any): Promise<Game> {
  const [newGame] = await db.insert(games).values(game).returning();
  return newGame;
}

async function getGame(id: number): Promise<Game | undefined> {
  const [game] = await db.select().from(games).where(eq(games.id, id));
  return game;
}

async function updateGame(id: number, updates: Partial<Game>): Promise<Game | undefined> {
  const [game] = await db.update(games).set(updates).where(eq(games.id, id)).returning();
  return game;
}

async function getUserGames(userId: number, limit: number = 10): Promise<Game[]> {
  return db.select().from(games).where(eq(games.userId, userId)).orderBy(desc(games.startedAt)).limit(limit);
}

async function createGameStep(step: any): Promise<GameStep> {
  const [newStep] = await db.insert(gameSteps).values(step).returning();
  return newStep;
}

async function getDailyLeaderboard(limit: number = 10) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const results = await db.select().from(dailyLeaderboard).innerJoin(users, eq(dailyLeaderboard.userId, users.id))
    .where(and(gte(dailyLeaderboard.date, today), lte(dailyLeaderboard.date, tomorrow)))
    .orderBy(desc(dailyLeaderboard.totalWinnings)).limit(limit);
  return results.map(r => ({ ...r.daily_leaderboard, user: r.users }));
}

async function getWeeklyLeaderboard(limit: number = 10) {
  const now = new Date(); const dayOfWeek = now.getDay();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - dayOfWeek); weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
  const results = await db.select().from(weeklyLeaderboard).innerJoin(users, eq(weeklyLeaderboard.userId, users.id))
    .where(and(gte(weeklyLeaderboard.weekStart, weekStart), lte(weeklyLeaderboard.weekEnd, weekEnd)))
    .orderBy(desc(weeklyLeaderboard.totalWinnings)).limit(limit);
  return results.map(r => ({ ...r.weekly_leaderboard, user: r.users }));
}

async function updateDailyLeaderboard(userId: number, winnings: string, multiplier: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const [existing] = await db.select().from(dailyLeaderboard)
    .where(and(eq(dailyLeaderboard.userId, userId), gte(dailyLeaderboard.date, today), lte(dailyLeaderboard.date, tomorrow)));
  if (existing) {
    await db.update(dailyLeaderboard).set({
      totalWinnings: (parseFloat(existing.totalWinnings) + parseFloat(winnings)).toString(),
      gamesPlayed: existing.gamesPlayed + 1,
      bestMultiplier: Math.max(parseFloat(existing.bestMultiplier), parseFloat(multiplier)).toString(),
    }).where(eq(dailyLeaderboard.id, existing.id));
  } else {
    await db.insert(dailyLeaderboard).values({ oddseed: "", oddseedHash: "", userId, totalWinnings: winnings, gamesPlayed: 1, bestMultiplier: multiplier, date: new Date() });
  }
}

async function updateWeeklyLeaderboard(userId: number, winnings: string, multiplier: string) {
  const now = new Date(); const dayOfWeek = now.getDay();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - dayOfWeek); weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
  const [existing] = await db.select().from(weeklyLeaderboard)
    .where(and(eq(weeklyLeaderboard.userId, userId), gte(weeklyLeaderboard.weekStart, weekStart), lte(weeklyLeaderboard.weekEnd, weekEnd)));
  if (existing) {
    await db.update(weeklyLeaderboard).set({
      totalWinnings: (parseFloat(existing.totalWinnings) + parseFloat(winnings)).toString(),
      gamesPlayed: existing.gamesPlayed + 1,
      bestMultiplier: Math.max(parseFloat(existing.bestMultiplier), parseFloat(multiplier)).toString(),
    }).where(eq(weeklyLeaderboard.id, existing.id));
  } else {
    await db.insert(weeklyLeaderboard).values({ oddseed: "", oddseedHash: "", userId, totalWinnings: winnings, gamesPlayed: 1, bestMultiplier: multiplier, weekStart, weekEnd });
  }
}

async function getAllTimeLeaderboard(limit: number = 10, type: string = "winnings") {
  if (type === "multiplier") return db.select().from(users).orderBy(desc(users.highestMultiplier)).limit(limit);
  return db.select().from(users).orderBy(desc(users.totalKicksWon)).limit(limit);
}

async function getBiggestWins(limit: number = 10) {
  const results = await db.select().from(games).innerJoin(users, eq(games.userId, users.id))
    .where(and(sql`${games.payout} IS NOT NULL`, sql`CAST(${games.payout} AS DECIMAL) > 0`))
    .orderBy(desc(sql`CAST(${games.payout} AS DECIMAL)`)).limit(limit);
  return results.map(r => ({ ...r.games, user: r.users }));
}

async function getUserAchievements(userId: number) {
  return db.select().from(userAchievements).where(eq(userAchievements.userId, userId)).orderBy(desc(userAchievements.unlockedAt));
}

async function unlockAchievement(userId: number, achievementId: string) {
  const [existing] = await db.select().from(userAchievements)
    .where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementId, achievementId)));
  if (existing) return existing;
  const [achievement] = await db.insert(userAchievements).values({ userId, achievementId, progress: 1, maxProgress: 1 }).returning();
  return achievement;
}

async function hasAchievement(userId: number, achievementId: string) {
  const [existing] = await db.select().from(userAchievements)
    .where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementId, achievementId)));
  return !!existing && existing.progress >= existing.maxProgress;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawUrl = req.url || '';
  const url = rawUrl.split('?')[0];
  const method = req.method || 'GET';
  
  console.log('[API Request]', method, url);

  try {
    if ((url === '/api/auth/connect' || url.endsWith('/api/auth/connect')) && method === 'POST') {
      const { walletAddress, username } = req.body;
      if (!walletAddress) return res.status(400).json({ error: "Wallet address is required" });
      let user = await getUserByWallet(walletAddress);
      if (!user) {
        const displayName = username || `Player_${walletAddress.slice(0, 6)}`;
        user = await createUser({ walletAddress, username: displayName, totalGamesPlayed: 0, totalKicksWon: "0", totalKicksLost: "0", highestMultiplier: "0", gamesWon: 0, gamesLost: 0 });
      }
      return res.json({ user });
    }

    const userMatch = url.match(/\/api\/user\/([^\/]+)$/);
    if (userMatch && method === 'GET') {
      const walletAddress = userMatch[1];
      const user = await getUserByWallet(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json({ user });
    }

    if (userMatch && method === 'PUT') {
      const walletAddress = userMatch[1];
      const { username, avatarUrl } = req.body;
      const user = await getUserByWallet(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const updatedUser = await updateUser(user.id, { ...(username && { username }), ...(avatarUrl && { avatarUrl }) });
      return res.json({ user: updatedUser });
    }

    if ((url === '/api/game/start' || url.endsWith('/api/game/start')) && method === 'POST') {
      const { walletAddress, betAmount, txHash } = req.body;
      if (!walletAddress || !betAmount) return res.status(400).json({ error: "Wallet address and bet amount required" });
      const user = await getUserByWallet(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const oddseed = nanoid(32);
      const oddseedHash = crypto.createHash('sha256').update(oddseed).digest('hex');
      const board = generateBoard(oddseed);
      const game = await createGame({ oddseed, oddseedHash, userId: user.id, betAmount: betAmount.toString(), gameStatus: "active", finalPosition: 0, depositTxHash: txHash || null });
      await updateUser(user.id, { totalGamesPlayed: user.totalGamesPlayed + 1 });
      return res.json({ game: { ...game, oddseed: undefined }, oddseedHash, board });
    }

    const moveMatch = url.match(/\/api\/game\/(\d+)\/move$/);
    if (moveMatch && method === 'POST') {
      const gameId = parseInt(moveMatch[1]);
      const { steps, useShield, useSkip } = req.body;
      const game = await getGame(gameId);
      if (!game) return res.status(404).json({ error: "Game not found" });
      if (game.gameStatus !== "active") return res.status(400).json({ error: "Game is not active" });
      
      const board = generateBoard(game.oddseed);
      let newPosition = Math.min(game.finalPosition + steps, TOTAL_STEPS);
      let landedStep = board[newPosition];
      await createGameStep({ gameId: game.id, stepNumber: newPosition, stepType: landedStep.type, multiplierValue: landedStep.multiplier?.toString() });
      
      let gameStatus = game.gameStatus;
      let finalMultiplier = game.finalMultiplier ? parseFloat(game.finalMultiplier) : 1;
      let payout = game.payout;
      let shieldUsed = false, skipUsed = false;
      
      if ((landedStep.type === "hazard" || landedStep.type === "reset_trap") && useSkip) {
        skipUsed = true;
        newPosition = Math.min(newPosition + 1, TOTAL_STEPS);
        landedStep = board[newPosition];
        await createGameStep({ gameId: game.id, stepNumber: newPosition, stepType: landedStep.type, multiplierValue: landedStep.multiplier?.toString() });
      }
      
      if (landedStep.type === "hazard") {
        if (useShield) { shieldUsed = true; }
        else {
          gameStatus = "lost"; payout = "0"; finalMultiplier = 0;
          const user = await getUser(game.userId);
          if (user) await updateUser(user.id, { gamesLost: user.gamesLost + 1, totalKicksLost: (parseFloat(user.totalKicksLost) + parseFloat(game.betAmount)).toString() });
        }
      } else if (landedStep.type === "finish") {
        gameStatus = "won"; finalMultiplier = 20; payout = (parseFloat(game.betAmount) * finalMultiplier).toString();
        const user = await getUser(game.userId);
        if (user) {
          await updateUser(user.id, { gamesWon: user.gamesWon + 1, totalKicksWon: (parseFloat(user.totalKicksWon) + parseFloat(payout)).toString(), highestMultiplier: Math.max(parseFloat(user.highestMultiplier), finalMultiplier).toString() });
          await updateDailyLeaderboard(user.id, payout, finalMultiplier.toString());
          await updateWeeklyLeaderboard(user.id, payout, finalMultiplier.toString());
        }
      } else if (landedStep.type === "reset_trap") {
        if (useShield) { shieldUsed = true; }
        else {
          const updatedGame = await updateGame(game.id, { finalPosition: 0, gameStatus: "active", finalMultiplier: finalMultiplier.toString() });
          return res.json({ game: updatedGame, landedStep, currentMultiplier: finalMultiplier, potentialPayout: (parseFloat(game.betAmount) * finalMultiplier).toString(), shieldUsed: false, resetToStart: true });
        }
      } else if (landedStep.multiplier) {
        finalMultiplier = Math.min(finalMultiplier + landedStep.multiplier, 20);
      }
      
      const updatedGame = await updateGame(game.id, { finalPosition: newPosition, gameStatus, finalMultiplier: finalMultiplier.toString(), payout, ...(gameStatus !== "active" && { endedAt: new Date() }) });
      return res.json({ game: updatedGame, landedStep, currentMultiplier: finalMultiplier, potentialPayout: (parseFloat(game.betAmount) * finalMultiplier).toString(), shieldUsed, skipUsed });
    }

    const cashoutMatch = url.match(/\/api\/game\/(\d+)\/cashout$/);
    if (cashoutMatch && method === 'POST') {
      const gameId = parseInt(cashoutMatch[1]);
      const game = await getGame(gameId);
      if (!game) return res.status(404).json({ error: "Game not found" });
      if (game.gameStatus !== "active") return res.status(400).json({ error: "Game is not active" });
      const currentMultiplier = game.finalMultiplier ? parseFloat(game.finalMultiplier) : 1;
      const payout = (parseFloat(game.betAmount) * currentMultiplier).toString();
      const updatedGame = await updateGame(game.id, { gameStatus: "cashed_out", payout, endedAt: new Date() });
      const user = await getUser(game.userId);
      if (user) {
        await updateUser(user.id, { gamesWon: user.gamesWon + 1, totalKicksWon: (parseFloat(user.totalKicksWon) + parseFloat(payout)).toString(), highestMultiplier: Math.max(parseFloat(user.highestMultiplier), currentMultiplier).toString() });
        await updateDailyLeaderboard(user.id, payout, currentMultiplier.toString());
        await updateWeeklyLeaderboard(user.id, payout, currentMultiplier.toString());
      }
      return res.json({ game: { ...updatedGame, oddseed: game.oddseed }, payout, multiplier: currentMultiplier });
    }

    const claimNonceMatch = url.match(/\/api\/game\/(\d+)\/claim-nonce$/);
    if (claimNonceMatch && method === 'POST') {
      const gameId = parseInt(claimNonceMatch[1]);
      const { walletAddress } = req.body;
      if (!walletAddress) return res.status(400).json({ error: "Wallet address required" });
      const game = await getGame(gameId);
      if (!game) return res.status(404).json({ error: "Game not found" });
      const user = await getUser(game.userId);
      if (!user || user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) return res.status(403).json({ error: "Not authorized" });
      if (game.gameStatus !== "won" && game.gameStatus !== "cashed_out") return res.status(400).json({ error: "Game must be won or cashed out" });
      if (game.claimStatus === "claimed") return res.status(400).json({ error: "Already claimed" });
      if (!game.payout || parseFloat(game.payout) <= 0) return res.status(400).json({ error: "No payout available" });
      const nonce = nanoid(32);
      await updateGame(game.id, { claimNonce: nonce });
      return res.json({ nonce, amount: game.payout, gameId: game.id, expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() });
    }

    if ((url === '/api/claim' || url.endsWith('/api/claim')) && method === 'POST') {
      const { walletAddress, amount, gameId, signature, nonce, kicksTokenAddress } = req.body;
      if (!walletAddress || !amount || !gameId || !signature || !nonce) return res.status(400).json({ error: "Missing required fields" });
      const game = await getGame(parseInt(gameId));
      if (!game) return res.status(404).json({ error: "Game not found" });
      const user = await getUser(game.userId);
      if (!user || user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) return res.status(403).json({ error: "Wallet mismatch" });
      if (game.claimNonce !== nonce) return res.status(400).json({ error: "Invalid nonce" });
      if (game.claimStatus === "claimed") return res.status(400).json({ error: "Already claimed" });
      if (game.payout !== amount) return res.status(400).json({ error: "Amount mismatch" });
      
      const expectedMessage = `KICKS CLIMB Claim\nAmount: ${amount} KICKS\nGame ID: ${gameId}\nWallet: ${walletAddress}\nNonce: ${nonce}`;
      let recoveredAddress: string;
      try { recoveredAddress = ethers.verifyMessage(expectedMessage, signature); }
      catch { return res.status(400).json({ error: "Invalid signature" }); }
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) return res.status(400).json({ error: "Signature verification failed" });
      
      let txHash: string | null = null;
      const houseWalletKey = process.env.HOUSE_WALLET_KEY;
      if (houseWalletKey && kicksTokenAddress) {
        try {
          const provider = new ethers.JsonRpcProvider("https://apechain.calderachain.xyz/http");
          const cleanKey = houseWalletKey.trim();
          let houseWallet;
          if (cleanKey.split(' ').length >= 12) {
            const hdWallet = ethers.Wallet.fromPhrase(cleanKey);
            houseWallet = new ethers.Wallet(hdWallet.privateKey, provider);
          } else {
            const privateKey = cleanKey.startsWith('0x') ? cleanKey : `0x${cleanKey}`;
            houseWallet = new ethers.Wallet(privateKey, provider);
          }
          const erc20Abi = ["function transfer(address to, uint256 amount) returns (bool)", "function decimals() view returns (uint8)", "function balanceOf(address owner) view returns (uint256)"];
          const kicksContract = new ethers.Contract(kicksTokenAddress, erc20Abi, houseWallet);
          const decimals = await kicksContract.decimals();
          const amountInWei = ethers.parseUnits(parseFloat(amount).toFixed(Number(decimals)), decimals);
          const houseBalance = await kicksContract.balanceOf(houseWallet.address);
          if (houseBalance < amountInWei) return res.status(400).json({ error: "Insufficient house balance" });
          const tx = await kicksContract.transfer(walletAddress, amountInWei);
          const receipt = await tx.wait();
          txHash = receipt.hash;
        } catch (e: any) {
          return res.status(500).json({ error: `Transfer failed: ${e.message}` });
        }
      }
      await updateGame(game.id, { claimStatus: "claimed", claimNonce: null });
      return res.json({ success: true, message: txHash ? "KICKS sent!" : "Claim verified", amount: game.payout, txHash });
    }

    if ((url === '/api/leaderboard/daily' || url.endsWith('/api/leaderboard/daily')) && method === 'GET') {
      const leaderboard = await getDailyLeaderboard(10);
      return res.json({ leaderboard });
    }

    if ((url === '/api/leaderboard/weekly' || url.endsWith('/api/leaderboard/weekly')) && method === 'GET') {
      const leaderboard = await getWeeklyLeaderboard(10);
      return res.json({ leaderboard });
    }

    if ((url === '/api/leaderboard/alltime' || url.endsWith('/api/leaderboard/alltime')) && method === 'GET') {
      const urlParams = new URL(rawUrl, 'http://localhost');
      const type = urlParams.searchParams.get('type') || 'winnings';
      const leaderboard = await getAllTimeLeaderboard(10, type);
      return res.json({ leaderboard });
    }

    if ((url === '/api/leaderboard/biggest-wins' || url.endsWith('/api/leaderboard/biggest-wins')) && method === 'GET') {
      const biggestWins = await getBiggestWins(10);
      return res.json({ biggestWins });
    }

    const userGamesMatch = url.match(/\/api\/user\/([^\/]+)\/games$/);
    if (userGamesMatch && method === 'GET') {
      const walletAddress = userGamesMatch[1];
      const user = await getUserByWallet(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const userGames = await getUserGames(user.id, 20);
      return res.json({ games: userGames });
    }

    const userStatsMatch = url.match(/\/api\/user\/([^\/]+)\/stats$/);
    if (userStatsMatch && method === 'GET') {
      const walletAddress = userStatsMatch[1];
      const user = await getUserByWallet(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const recentGames = await getUserGames(user.id, 100);
      const stats = {
        totalGamesPlayed: user.totalGamesPlayed, gamesWon: user.gamesWon, gamesLost: user.gamesLost,
        totalKicksWon: user.totalKicksWon, totalKicksLost: user.totalKicksLost, highestMultiplier: user.highestMultiplier,
        winRate: user.totalGamesPlayed > 0 ? ((user.gamesWon / user.totalGamesPlayed) * 100).toFixed(1) : "0",
        netProfit: (parseFloat(user.totalKicksWon) - parseFloat(user.totalKicksLost)).toString(),
        averageBet: recentGames.length > 0 ? (recentGames.reduce((s, g) => s + parseFloat(g.betAmount), 0) / recentGames.length).toFixed(2) : "0",
        biggestWin: recentGames.length > 0 ? Math.max(...recentGames.filter(g => g.payout).map(g => parseFloat(g.payout || "0"))).toString() : "0",
      };
      return res.json({ stats });
    }

    const userAchievementsMatch = url.match(/\/api\/user\/([^\/]+)\/achievements$/);
    if (userAchievementsMatch && method === 'GET') {
      const walletAddress = userAchievementsMatch[1];
      const user = await getUserByWallet(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const achievements = await getUserAchievements(user.id);
      return res.json({ achievements });
    }

    const achievementsCheckMatch = url.match(/\/api\/user\/([^\/]+)\/achievements\/check$/);
    if (achievementsCheckMatch && method === 'POST') {
      const walletAddress = achievementsCheckMatch[1];
      const user = await getUserByWallet(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const newAchievements: string[] = [];
      const checks = [
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
      for (const check of checks) {
        if (check.condition && !(await hasAchievement(user.id, check.id))) {
          await unlockAchievement(user.id, check.id);
          newAchievements.push(check.id);
        }
      }
      return res.json({ newAchievements, total: newAchievements.length });
    }

    return res.status(404).json({ error: "Not found" });
  } catch (error: any) {
    console.error('[API Error]', error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
