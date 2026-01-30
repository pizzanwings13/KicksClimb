import { 
  users, games, gameSteps, dailyLeaderboard, weeklyLeaderboard, userAchievements,
  rabbitRushInventories, rabbitRushRuns, rabbitRushDailyLeaderboard, rabbitRushWeeklyLeaderboard,
  bunnyBladeWeeklyLeaderboard, bunnyBladeInventories,
  dashvilleRuns, dashvilleMissionSubmissions, dashvilleMissionProgress, dashvilleMissionPrizes,
  dashvilleDailyLeaderboard, dashvilleWeeklyLeaderboard,
  type User, type InsertUser, type Game, type InsertGame, 
  type GameStep, type InsertGameStep, type DailyLeaderboardEntry, type WeeklyLeaderboardEntry, type UserAchievement,
  type RabbitRushInventory, type RabbitRushRun, type RabbitRushDailyLeaderboardEntry, type RabbitRushWeeklyLeaderboardEntry,
  type BunnyBladeWeeklyLeaderboardEntry, type BunnyBladeInventory,
  type DashvilleRun, type DashvilleMissionSubmission, type DashvilleMissionProgress, type DashvilleMissionPrize,
  type DashvilleDailyLeaderboardEntry, type DashvilleWeeklyLeaderboardEntry
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

  async getRabbitRushInventory(userId: number): Promise<RabbitRushInventory | undefined> {
    const [inventory] = await db.select()
      .from(rabbitRushInventories)
      .where(eq(rabbitRushInventories.userId, userId));
    return inventory;
  }

  async createRabbitRushInventory(userId: number): Promise<RabbitRushInventory> {
    const [inventory] = await db.insert(rabbitRushInventories).values({
      userId,
      ownedShips: "[0,1]",
      ownedWeapons: "[0]",
      ownedColors: "[0]",
      selectedShip: 0,
      selectedWeapon: 0,
      selectedColor: 0,
    }).returning();
    return inventory;
  }

  async updateRabbitRushInventory(userId: number, updates: Partial<RabbitRushInventory>): Promise<RabbitRushInventory | undefined> {
    const [inventory] = await db.update(rabbitRushInventories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(rabbitRushInventories.userId, userId))
      .returning();
    return inventory;
  }

  async createRabbitRushRun(userId: number, wager: string): Promise<RabbitRushRun> {
    const [run] = await db.insert(rabbitRushRuns).values({
      userId,
      wager,
      runStatus: "active",
    }).returning();
    return run;
  }

  async getRabbitRushRun(runId: number): Promise<RabbitRushRun | undefined> {
    const [run] = await db.select()
      .from(rabbitRushRuns)
      .where(eq(rabbitRushRuns.id, runId));
    return run;
  }

  async updateRabbitRushRun(runId: number, updates: Partial<RabbitRushRun>): Promise<RabbitRushRun | undefined> {
    const [run] = await db.update(rabbitRushRuns)
      .set(updates)
      .where(eq(rabbitRushRuns.id, runId))
      .returning();
    return run;
  }

  async getUserRabbitRushRuns(userId: number, limit: number = 10): Promise<RabbitRushRun[]> {
    return db.select()
      .from(rabbitRushRuns)
      .where(eq(rabbitRushRuns.userId, userId))
      .orderBy(desc(rabbitRushRuns.startedAt))
      .limit(limit);
  }

  async getRabbitRushDailyLeaderboard(limit: number = 10): Promise<(RabbitRushDailyLeaderboardEntry & { user: User })[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const results = await db.select()
      .from(rabbitRushDailyLeaderboard)
      .innerJoin(users, eq(rabbitRushDailyLeaderboard.userId, users.id))
      .where(and(
        gte(rabbitRushDailyLeaderboard.date, today),
        lte(rabbitRushDailyLeaderboard.date, tomorrow)
      ))
      .orderBy(desc(rabbitRushDailyLeaderboard.totalWinnings))
      .limit(limit);

    return results.map(r => ({ ...r.rabbit_rush_daily_leaderboard, user: r.users }));
  }

  async getRabbitRushWeeklyLeaderboard(limit: number = 10): Promise<(RabbitRushWeeklyLeaderboardEntry & { user: User })[]> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const results = await db.select()
      .from(rabbitRushWeeklyLeaderboard)
      .innerJoin(users, eq(rabbitRushWeeklyLeaderboard.userId, users.id))
      .where(and(
        gte(rabbitRushWeeklyLeaderboard.weekStart, weekStart),
        lte(rabbitRushWeeklyLeaderboard.weekEnd, weekEnd)
      ))
      .orderBy(desc(rabbitRushWeeklyLeaderboard.totalWinnings))
      .limit(limit);

    return results.map(r => ({ ...r.rabbit_rush_weekly_leaderboard, user: r.users }));
  }

  async updateRabbitRushDailyLeaderboard(userId: number, winnings: string, multiplier: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [existing] = await db.select()
      .from(rabbitRushDailyLeaderboard)
      .where(and(
        eq(rabbitRushDailyLeaderboard.userId, userId),
        gte(rabbitRushDailyLeaderboard.date, today),
        lte(rabbitRushDailyLeaderboard.date, tomorrow)
      ));

    if (existing) {
      const newWinnings = (parseFloat(existing.totalWinnings) + parseFloat(winnings)).toString();
      const newMultiplier = Math.max(parseFloat(existing.bestMultiplier), parseFloat(multiplier)).toString();
      await db.update(rabbitRushDailyLeaderboard)
        .set({
          totalWinnings: newWinnings,
          runsPlayed: existing.runsPlayed + 1,
          bestMultiplier: newMultiplier,
        })
        .where(eq(rabbitRushDailyLeaderboard.id, existing.id));
    } else {
      await db.insert(rabbitRushDailyLeaderboard).values({
        userId,
        totalWinnings: winnings,
        runsPlayed: 1,
        bestMultiplier: multiplier,
        date: today,
      });
    }
  }

  async updateRabbitRushWeeklyLeaderboard(userId: number, winnings: string, multiplier: string): Promise<void> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const [existing] = await db.select()
      .from(rabbitRushWeeklyLeaderboard)
      .where(and(
        eq(rabbitRushWeeklyLeaderboard.userId, userId),
        gte(rabbitRushWeeklyLeaderboard.weekStart, weekStart),
        lte(rabbitRushWeeklyLeaderboard.weekEnd, weekEnd)
      ));

    if (existing) {
      const newWinnings = (parseFloat(existing.totalWinnings) + parseFloat(winnings)).toString();
      const newMultiplier = Math.max(parseFloat(existing.bestMultiplier), parseFloat(multiplier)).toString();
      await db.update(rabbitRushWeeklyLeaderboard)
        .set({
          totalWinnings: newWinnings,
          runsPlayed: existing.runsPlayed + 1,
          bestMultiplier: newMultiplier,
        })
        .where(eq(rabbitRushWeeklyLeaderboard.id, existing.id));
    } else {
      await db.insert(rabbitRushWeeklyLeaderboard).values({
        userId,
        totalWinnings: winnings,
        runsPlayed: 1,
        bestMultiplier: multiplier,
        weekStart,
        weekEnd,
      });
    }
  }

  getSaturdayWeekBoundaries(): { weekStart: Date; weekEnd: Date } {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
    const daysSinceLastSaturday = daysUntilSaturday === 0 ? 0 : 7 - daysUntilSaturday;
    
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() - daysSinceLastSaturday);
    weekStart.setUTCHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 7);
    
    return { weekStart, weekEnd };
  }

  async getBunnyBladeWeeklyLeaderboard(limit: number = 50): Promise<(BunnyBladeWeeklyLeaderboardEntry & { user: User })[]> {
    const { weekStart, weekEnd } = this.getSaturdayWeekBoundaries();
    
    const results = await db.select()
      .from(bunnyBladeWeeklyLeaderboard)
      .innerJoin(users, eq(bunnyBladeWeeklyLeaderboard.userId, users.id))
      .where(and(
        gte(bunnyBladeWeeklyLeaderboard.weekStart, weekStart),
        lte(bunnyBladeWeeklyLeaderboard.weekEnd, weekEnd)
      ))
      .orderBy(desc(bunnyBladeWeeklyLeaderboard.highScore))
      .limit(limit);

    return results.map(r => ({ ...r.bunny_blade_weekly_leaderboard, user: r.users }));
  }

  async updateBunnyBladeWeeklyLeaderboard(
    userId: number, 
    username: string, 
    score: number, 
    kicks: number, 
    level: number
  ): Promise<void> {
    const { weekStart, weekEnd } = this.getSaturdayWeekBoundaries();

    const [existing] = await db.select()
      .from(bunnyBladeWeeklyLeaderboard)
      .where(and(
        eq(bunnyBladeWeeklyLeaderboard.userId, userId),
        gte(bunnyBladeWeeklyLeaderboard.weekStart, weekStart),
        lte(bunnyBladeWeeklyLeaderboard.weekEnd, weekEnd)
      ));

    if (existing) {
      await db.update(bunnyBladeWeeklyLeaderboard)
        .set({
          username,
          highScore: Math.max(existing.highScore, score),
          totalKicks: existing.totalKicks + kicks,
          gamesPlayed: existing.gamesPlayed + 1,
          highestLevel: Math.max(existing.highestLevel, level),
        })
        .where(eq(bunnyBladeWeeklyLeaderboard.id, existing.id));
    } else {
      await db.insert(bunnyBladeWeeklyLeaderboard).values({
        userId,
        username,
        highScore: score,
        totalKicks: kicks,
        gamesPlayed: 1,
        highestLevel: level,
        weekStart,
        weekEnd,
      });
    }
  }

  async getBunnyBladeInventory(userId: number): Promise<BunnyBladeInventory | null> {
    const [inventory] = await db.select()
      .from(bunnyBladeInventories)
      .where(eq(bunnyBladeInventories.userId, userId));
    return inventory || null;
  }

  async updateBunnyBladeInventory(userId: number, unlockedBlades: string[], activeBlade: string): Promise<void> {
    const [existing] = await db.select()
      .from(bunnyBladeInventories)
      .where(eq(bunnyBladeInventories.userId, userId));

    if (existing) {
      await db.update(bunnyBladeInventories)
        .set({
          unlockedBlades: JSON.stringify(unlockedBlades),
          activeBlade,
          updatedAt: new Date(),
        })
        .where(eq(bunnyBladeInventories.userId, userId));
    } else {
      await db.insert(bunnyBladeInventories).values({
        userId,
        unlockedBlades: JSON.stringify(unlockedBlades),
        activeBlade,
      });
    }
  }

  async createDashvilleRun(data: { userId: number; walletAddress: string; characterId: number }): Promise<DashvilleRun> {
    const [run] = await db.insert(dashvilleRuns)
      .values({
        userId: data.userId,
        walletAddress: data.walletAddress,
        characterId: data.characterId,
        currentLevel: 1,
        score: 0,
        kicksEarned: "0",
        kicksClaimed: "0",
        status: "playing",
        claimStatus: "none",
      })
      .returning();
    return run;
  }

  async getDashvilleRun(runId: number): Promise<DashvilleRun | null> {
    const [run] = await db.select().from(dashvilleRuns).where(eq(dashvilleRuns.id, runId));
    return run || null;
  }

  async getActiveDashvilleRun(userId: number): Promise<DashvilleRun | null> {
    const [run] = await db.select()
      .from(dashvilleRuns)
      .where(and(eq(dashvilleRuns.userId, userId), eq(dashvilleRuns.status, "playing")))
      .orderBy(desc(dashvilleRuns.startedAt))
      .limit(1);
    return run || null;
  }

  async updateDashvilleRun(runId: number, updates: Partial<DashvilleRun>): Promise<DashvilleRun | null> {
    const [run] = await db.update(dashvilleRuns)
      .set(updates)
      .where(eq(dashvilleRuns.id, runId))
      .returning();
    return run || null;
  }

  async getDashvilleMissionProgress(userId: number, weekStart: Date): Promise<DashvilleMissionProgress | null> {
    const [progress] = await db.select()
      .from(dashvilleMissionProgress)
      .where(and(
        eq(dashvilleMissionProgress.userId, userId),
        eq(dashvilleMissionProgress.weekStart, weekStart)
      ));
    return progress || null;
  }

  async createDashvilleMissionProgress(userId: number, weekStart: Date): Promise<DashvilleMissionProgress> {
    const [progress] = await db.insert(dashvilleMissionProgress)
      .values({
        userId,
        weekStart,
        totalPoints: 0,
        completedMissions: "[]",
        dailyCount: 0,
      })
      .returning();
    return progress;
  }

  async updateDashvilleMissionProgress(
    userId: number, 
    weekStart: Date, 
    updates: { totalPoints: number; completedMissions: string; dailyCount: number; lastDailyDate: Date }
  ): Promise<void> {
    await db.update(dashvilleMissionProgress)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(
        eq(dashvilleMissionProgress.userId, userId),
        eq(dashvilleMissionProgress.weekStart, weekStart)
      ));
  }

  async getDashvilleMissionSubmissions(userId: number, weekStart: Date): Promise<DashvilleMissionSubmission[]> {
    return await db.select()
      .from(dashvilleMissionSubmissions)
      .where(and(
        eq(dashvilleMissionSubmissions.userId, userId),
        eq(dashvilleMissionSubmissions.weekStart, weekStart)
      ))
      .orderBy(desc(dashvilleMissionSubmissions.submittedAt));
  }

  async getDashvilleMissionSubmissionByTweetId(tweetId: string): Promise<DashvilleMissionSubmission | null> {
    const [submission] = await db.select()
      .from(dashvilleMissionSubmissions)
      .where(eq(dashvilleMissionSubmissions.tweetId, tweetId));
    return submission || null;
  }

  async createDashvilleMissionSubmission(data: {
    userId: number;
    missionId: number;
    tweetId: string;
    tweetUrl: string;
    tweetData: string | null;
    pointsAwarded: number;
    weekStart: Date;
  }): Promise<DashvilleMissionSubmission> {
    const [submission] = await db.insert(dashvilleMissionSubmissions)
      .values(data)
      .returning();
    return submission;
  }

  async getDashvilleDailyLeaderboard(date: Date, limit: number = 20): Promise<DashvilleDailyLeaderboardEntry[]> {
    return await db.select()
      .from(dashvilleDailyLeaderboard)
      .where(eq(dashvilleDailyLeaderboard.date, date))
      .orderBy(desc(dashvilleDailyLeaderboard.points))
      .limit(limit);
  }

  async getDashvilleWeeklyLeaderboard(weekStart: Date, limit: number = 50): Promise<DashvilleWeeklyLeaderboardEntry[]> {
    return await db.select()
      .from(dashvilleWeeklyLeaderboard)
      .where(eq(dashvilleWeeklyLeaderboard.weekStart, weekStart))
      .orderBy(desc(dashvilleWeeklyLeaderboard.points))
      .limit(limit);
  }

  async updateDashvilleLeaderboards(userId: number, username: string, points: number, weekStart: Date): Promise<void> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    const [existingDaily] = await db.select()
      .from(dashvilleDailyLeaderboard)
      .where(and(
        eq(dashvilleDailyLeaderboard.userId, userId),
        eq(dashvilleDailyLeaderboard.date, today)
      ));

    if (existingDaily) {
      await db.update(dashvilleDailyLeaderboard)
        .set({
          points: existingDaily.points + points,
          missionsCompleted: existingDaily.missionsCompleted + 1,
        })
        .where(eq(dashvilleDailyLeaderboard.id, existingDaily.id));
    } else {
      await db.insert(dashvilleDailyLeaderboard).values({
        userId,
        username,
        points,
        missionsCompleted: 1,
        date: today,
      });
    }

    const [existingWeekly] = await db.select()
      .from(dashvilleWeeklyLeaderboard)
      .where(and(
        eq(dashvilleWeeklyLeaderboard.userId, userId),
        eq(dashvilleWeeklyLeaderboard.weekStart, weekStart)
      ));

    if (existingWeekly) {
      await db.update(dashvilleWeeklyLeaderboard)
        .set({
          points: existingWeekly.points + points,
          missionsCompleted: existingWeekly.missionsCompleted + 1,
        })
        .where(eq(dashvilleWeeklyLeaderboard.id, existingWeekly.id));
    } else {
      await db.insert(dashvilleWeeklyLeaderboard).values({
        userId,
        username,
        points,
        missionsCompleted: 1,
        weekStart,
        weekEnd,
      });
    }
  }

  async getUserPendingPrize(walletAddress: string): Promise<DashvilleMissionPrize | null> {
    const user = await this.getUserByWallet(walletAddress);
    if (!user) return null;
    
    const [prize] = await db.select()
      .from(dashvilleMissionPrizes)
      .where(and(
        eq(dashvilleMissionPrizes.userId, user.id),
        eq(dashvilleMissionPrizes.status, "pending")
      ))
      .orderBy(desc(dashvilleMissionPrizes.createdAt))
      .limit(1);
    
    return prize || null;
  }

  async markPrizeClaimed(prizeId: number, txHash: string): Promise<void> {
    await db.update(dashvilleMissionPrizes)
      .set({
        status: "claimed",
        txHash,
        awardedAt: new Date(),
      })
      .where(eq(dashvilleMissionPrizes.id, prizeId));
  }

  async createWeeklyPrizes(weekStart: Date): Promise<void> {
    const prizeAmounts = [
      { rank: 1, kicks: "15000", nft: true },
      { rank: 2, kicks: "10000", nft: false },
      { rank: 3, kicks: "5000", nft: false },
    ];

    const topUsers = await db.select()
      .from(dashvilleWeeklyLeaderboard)
      .where(eq(dashvilleWeeklyLeaderboard.weekStart, weekStart))
      .orderBy(desc(dashvilleWeeklyLeaderboard.points))
      .limit(3);

    for (let i = 0; i < topUsers.length; i++) {
      const user = topUsers[i];
      const prizeInfo = prizeAmounts[i];
      
      await db.insert(dashvilleMissionPrizes).values({
        userId: user.userId,
        weekStart,
        rank: prizeInfo.rank,
        kicksAmount: prizeInfo.kicks,
        nftAwarded: prizeInfo.nft,
        status: "pending",
      });
    }
  }

  async getTopWeeklyUsers(weekStart: Date, limit: number = 3) {
    return await db.select()
      .from(dashvilleWeeklyLeaderboard)
      .where(eq(dashvilleWeeklyLeaderboard.weekStart, weekStart))
      .orderBy(desc(dashvilleWeeklyLeaderboard.points))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
