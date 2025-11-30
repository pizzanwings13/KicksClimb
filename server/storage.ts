import { 
  users, games, gameSteps, dailyLeaderboard, weeklyLeaderboard, userAchievements,
  type User, type InsertUser, type Game, type InsertGame, 
  type GameStep, type InsertGameStep, type DailyLeaderboardEntry, type WeeklyLeaderboardEntry, type UserAchievement
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  createGame(game: InsertGame): Promise<Game>;
  getGame(id: number): Promise<Game | undefined>;
  updateGame(id: number, updates: Partial<Game>): Promise<Game | undefined>;
  getUserGames(userId: number, limit?: number): Promise<Game[]>;
  
  createGameStep(step: InsertGameStep): Promise<GameStep>;
  getGameSteps(gameId: number): Promise<GameStep[]>;
  
  getDailyLeaderboard(limit?: number): Promise<(DailyLeaderboardEntry & { user: User })[]>;
  getWeeklyLeaderboard(limit?: number): Promise<(WeeklyLeaderboardEntry & { user: User })[]>;
  updateDailyLeaderboard(userId: number, winnings: string, multiplier: string): Promise<void>;
  updateWeeklyLeaderboard(userId: number, winnings: string, multiplier: string): Promise<void>;
  
  getAllTimeLeaderboard(limit?: number, type?: string): Promise<User[]>;
  getBiggestWins(limit?: number): Promise<(Game & { user: User })[]>;
  
  getUserAchievements(userId: number): Promise<UserAchievement[]>;
  unlockAchievement(userId: number, achievementId: string): Promise<UserAchievement>;
  updateAchievementProgress(userId: number, achievementId: string, progress: number, maxProgress: number): Promise<UserAchievement>;
  hasAchievement(userId: number, achievementId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByWallet(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress.toLowerCase()));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      walletAddress: insertUser.walletAddress.toLowerCase(),
    }).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async createGame(game: InsertGame): Promise<Game> {
    const [newGame] = await db.insert(games).values(game).returning();
    return newGame;
  }

  async getGame(id: number): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game;
  }

  async updateGame(id: number, updates: Partial<Game>): Promise<Game | undefined> {
    const [game] = await db.update(games)
      .set(updates)
      .where(eq(games.id, id))
      .returning();
    return game;
  }

  async getUserGames(userId: number, limit: number = 10): Promise<Game[]> {
    return db.select()
      .from(games)
      .where(eq(games.userId, userId))
      .orderBy(desc(games.startedAt))
      .limit(limit);
  }

  async createGameStep(step: InsertGameStep): Promise<GameStep> {
    const [newStep] = await db.insert(gameSteps).values(step).returning();
    return newStep;
  }

  async getGameSteps(gameId: number): Promise<GameStep[]> {
    return db.select()
      .from(gameSteps)
      .where(eq(gameSteps.gameId, gameId))
      .orderBy(gameSteps.stepNumber);
  }

  async getDailyLeaderboard(limit: number = 10): Promise<(DailyLeaderboardEntry & { user: User })[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const results = await db.select()
      .from(dailyLeaderboard)
      .innerJoin(users, eq(dailyLeaderboard.userId, users.id))
      .where(and(
        gte(dailyLeaderboard.date, today),
        lte(dailyLeaderboard.date, tomorrow)
      ))
      .orderBy(desc(dailyLeaderboard.totalWinnings))
      .limit(limit);

    return results.map(r => ({ ...r.daily_leaderboard, user: r.users }));
  }

  async getWeeklyLeaderboard(limit: number = 10): Promise<(WeeklyLeaderboardEntry & { user: User })[]> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const results = await db.select()
      .from(weeklyLeaderboard)
      .innerJoin(users, eq(weeklyLeaderboard.userId, users.id))
      .where(and(
        gte(weeklyLeaderboard.weekStart, weekStart),
        lte(weeklyLeaderboard.weekEnd, weekEnd)
      ))
      .orderBy(desc(weeklyLeaderboard.totalWinnings))
      .limit(limit);

    return results.map(r => ({ ...r.weekly_leaderboard, user: r.users }));
  }

  async updateDailyLeaderboard(userId: number, winnings: string, multiplier: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [existing] = await db.select()
      .from(dailyLeaderboard)
      .where(and(
        eq(dailyLeaderboard.userId, userId),
        gte(dailyLeaderboard.date, today),
        lte(dailyLeaderboard.date, tomorrow)
      ));

    if (existing) {
      const newWinnings = (parseFloat(existing.totalWinnings) + parseFloat(winnings)).toString();
      const newMultiplier = Math.max(parseFloat(existing.bestMultiplier), parseFloat(multiplier)).toString();
      await db.update(dailyLeaderboard)
        .set({
          totalWinnings: newWinnings,
          gamesPlayed: existing.gamesPlayed + 1,
          bestMultiplier: newMultiplier,
        })
        .where(eq(dailyLeaderboard.id, existing.id));
    } else {
      await db.insert(dailyLeaderboard).values({
        oddseed: "",
        oddseedHash: "",
        userId,
        totalWinnings: winnings,
        gamesPlayed: 1,
        bestMultiplier: multiplier,
        date: new Date(),
      });
    }
  }

  async updateWeeklyLeaderboard(userId: number, winnings: string, multiplier: string): Promise<void> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const [existing] = await db.select()
      .from(weeklyLeaderboard)
      .where(and(
        eq(weeklyLeaderboard.userId, userId),
        gte(weeklyLeaderboard.weekStart, weekStart),
        lte(weeklyLeaderboard.weekEnd, weekEnd)
      ));

    if (existing) {
      const newWinnings = (parseFloat(existing.totalWinnings) + parseFloat(winnings)).toString();
      const newMultiplier = Math.max(parseFloat(existing.bestMultiplier), parseFloat(multiplier)).toString();
      await db.update(weeklyLeaderboard)
        .set({
          totalWinnings: newWinnings,
          gamesPlayed: existing.gamesPlayed + 1,
          bestMultiplier: newMultiplier,
        })
        .where(eq(weeklyLeaderboard.id, existing.id));
    } else {
      await db.insert(weeklyLeaderboard).values({
        oddseed: "",
        oddseedHash: "",
        userId,
        totalWinnings: winnings,
        gamesPlayed: 1,
        bestMultiplier: multiplier,
        weekStart,
        weekEnd,
      });
    }
  }

  async getAllTimeLeaderboard(limit: number = 10, type: string = "winnings"): Promise<User[]> {
    if (type === "multiplier") {
      return db.select()
        .from(users)
        .orderBy(desc(users.highestMultiplier))
        .limit(limit);
    }
    return db.select()
      .from(users)
      .orderBy(desc(users.totalKicksWon))
      .limit(limit);
  }

  async getBiggestWins(limit: number = 10): Promise<(Game & { user: User })[]> {
    const results = await db.select()
      .from(games)
      .innerJoin(users, eq(games.userId, users.id))
      .where(and(
        sql`${games.payout} IS NOT NULL`,
        sql`CAST(${games.payout} AS DECIMAL) > 0`
      ))
      .orderBy(desc(sql`CAST(${games.payout} AS DECIMAL)`))
      .limit(limit);

    return results.map(r => ({ ...r.games, user: r.users }));
  }

  async getUserAchievements(userId: number): Promise<UserAchievement[]> {
    return db.select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.unlockedAt));
  }

  async unlockAchievement(userId: number, achievementId: string): Promise<UserAchievement> {
    const [existing] = await db.select()
      .from(userAchievements)
      .where(and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievementId)
      ));

    if (existing) {
      return existing;
    }

    const [achievement] = await db.insert(userAchievements).values({
      userId,
      achievementId,
      progress: 1,
      maxProgress: 1,
    }).returning();

    return achievement;
  }

  async updateAchievementProgress(userId: number, achievementId: string, progress: number, maxProgress: number): Promise<UserAchievement> {
    const [existing] = await db.select()
      .from(userAchievements)
      .where(and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievementId)
      ));

    if (existing) {
      const [updated] = await db.update(userAchievements)
        .set({ progress, maxProgress })
        .where(eq(userAchievements.id, existing.id))
        .returning();
      return updated;
    }

    const [achievement] = await db.insert(userAchievements).values({
      userId,
      achievementId,
      progress,
      maxProgress,
    }).returning();

    return achievement;
  }

  async hasAchievement(userId: number, achievementId: string): Promise<boolean> {
    const [existing] = await db.select()
      .from(userAchievements)
      .where(and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievementId)
      ));
    return !!existing && existing.progress >= existing.maxProgress;
  }
}

export const storage = new DatabaseStorage();
