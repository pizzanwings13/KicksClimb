import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
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

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  oddseed: text("oddseed").notNull(),
  oddseedHash: text("oddseed_hash").notNull(),
  oddResult: integer("odd_result"),
  userId: integer("user_id").notNull().references(() => users.id),
  betAmount: decimal("bet_amount", { precision: 36, scale: 18 }).notNull(),
  finalMultiplier: decimal("final_multiplier", { precision: 10, scale: 2 }),
  payout: decimal("payout", { precision: 36, scale: 18 }),
  bonusKicks: decimal("bonus_kicks", { precision: 36, scale: 18 }).default("0"),
  finalPosition: integer("final_position").default(0).notNull(),
  gameStatus: text("game_status").default("active").notNull(),
  depositTxHash: text("deposit_tx_hash"),
  claimTxHash: text("claim_tx_hash"),
  claimNonce: text("claim_nonce"),
  claimStatus: text("claim_status").default("pending"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export const gameSteps = pgTable("game_steps", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => games.id),
  stepNumber: integer("step_number").notNull(),
  stepType: text("step_type").notNull(),
  multiplierValue: decimal("multiplier_value", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dailyLeaderboard = pgTable("daily_leaderboard", {
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

export const weeklyLeaderboard = pgTable("weekly_leaderboard", {
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

export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  achievementId: text("achievement_id").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  progress: integer("progress").default(0).notNull(),
  maxProgress: integer("max_progress").default(1).notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  games: many(games),
  dailyLeaderboard: many(dailyLeaderboard),
  weeklyLeaderboard: many(weeklyLeaderboard),
  achievements: many(userAchievements),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
}));

export const gamesRelations = relations(games, ({ one, many }) => ({
  user: one(users, {
    fields: [games.userId],
    references: [users.id],
  }),
  steps: many(gameSteps),
}));

export const gameStepsRelations = relations(gameSteps, ({ one }) => ({
  game: one(games, {
    fields: [gameSteps.gameId],
    references: [games.id],
  }),
}));

export const dailyLeaderboardRelations = relations(dailyLeaderboard, ({ one }) => ({
  user: one(users, {
    fields: [dailyLeaderboard.userId],
    references: [users.id],
  }),
}));

export const weeklyLeaderboardRelations = relations(weeklyLeaderboard, ({ one }) => ({
  user: one(users, {
    fields: [weeklyLeaderboard.userId],
    references: [users.id],
  }),
}));

export const rabbitRushInventories = pgTable("rabbit_rush_inventories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  ownedShips: text("owned_ships").default("[0,1]").notNull(),
  ownedWeapons: text("owned_weapons").default("[0]").notNull(),
  ownedColors: text("owned_colors").default("[0]").notNull(),
  selectedShip: integer("selected_ship").default(0).notNull(),
  selectedWeapon: integer("selected_weapon").default(0).notNull(),
  selectedColor: integer("selected_color").default(0).notNull(),
  totalRuns: integer("total_runs").default(0).notNull(),
  totalKicksWon: decimal("total_kicks_won", { precision: 36, scale: 18 }).default("0").notNull(),
  totalKicksLost: decimal("total_kicks_lost", { precision: 36, scale: 18 }).default("0").notNull(),
  bestMultiplier: decimal("best_multiplier", { precision: 10, scale: 2 }).default("0").notNull(),
  runsWon: integer("runs_won").default(0).notNull(),
  runsLost: integer("runs_lost").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rabbitRushRuns = pgTable("rabbit_rush_runs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  wager: decimal("wager", { precision: 36, scale: 18 }).notNull(),
  finalMultiplier: decimal("final_multiplier", { precision: 10, scale: 2 }),
  payout: decimal("payout", { precision: 36, scale: 18 }),
  coinsCollected: integer("coins_collected").default(0).notNull(),
  enemiesDestroyed: integer("enemies_destroyed").default(0).notNull(),
  runStatus: text("run_status").default("active").notNull(),
  depositTxHash: text("deposit_tx_hash"),
  claimNonce: text("claim_nonce"),
  claimTxHash: text("claim_tx_hash"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export const rabbitRushDailyLeaderboard = pgTable("rabbit_rush_daily_leaderboard", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  totalWinnings: decimal("total_winnings", { precision: 36, scale: 18 }).default("0").notNull(),
  runsPlayed: integer("runs_played").default(0).notNull(),
  bestMultiplier: decimal("best_multiplier", { precision: 10, scale: 2 }).default("0").notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

export const rabbitRushWeeklyLeaderboard = pgTable("rabbit_rush_weekly_leaderboard", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  totalWinnings: decimal("total_winnings", { precision: 36, scale: 18 }).default("0").notNull(),
  runsPlayed: integer("runs_played").default(0).notNull(),
  bestMultiplier: decimal("best_multiplier", { precision: 10, scale: 2 }).default("0").notNull(),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
});

export const rabbitRushInventoriesRelations = relations(rabbitRushInventories, ({ one }) => ({
  user: one(users, {
    fields: [rabbitRushInventories.userId],
    references: [users.id],
  }),
}));

export const rabbitRushRunsRelations = relations(rabbitRushRuns, ({ one }) => ({
  user: one(users, {
    fields: [rabbitRushRuns.userId],
    references: [users.id],
  }),
}));

export const rabbitRushDailyLeaderboardRelations = relations(rabbitRushDailyLeaderboard, ({ one }) => ({
  user: one(users, {
    fields: [rabbitRushDailyLeaderboard.userId],
    references: [users.id],
  }),
}));

export const rabbitRushWeeklyLeaderboardRelations = relations(rabbitRushWeeklyLeaderboard, ({ one }) => ({
  user: one(users, {
    fields: [rabbitRushWeeklyLeaderboard.userId],
    references: [users.id],
  }),
}));

export const bunnyBladeWeeklyLeaderboard = pgTable("bunny_blade_weekly_leaderboard", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  username: text("username").notNull(),
  highScore: integer("high_score").default(0).notNull(),
  totalKicks: integer("total_kicks").default(0).notNull(),
  gamesPlayed: integer("games_played").default(0).notNull(),
  highestLevel: integer("highest_level").default(1).notNull(),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
});

export const bunnyBladeWeeklyLeaderboardRelations = relations(bunnyBladeWeeklyLeaderboard, ({ one }) => ({
  user: one(users, {
    fields: [bunnyBladeWeeklyLeaderboard.userId],
    references: [users.id],
  }),
}));

export const bunnyBladeInventories = pgTable("bunny_blade_inventories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  unlockedBlades: text("unlocked_blades").default('["Wooden"]').notNull(),
  activeBlade: text("active_blade").default('Wooden').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bunnyBladeInventoriesRelations = relations(bunnyBladeInventories, ({ one }) => ({
  user: one(users, {
    fields: [bunnyBladeInventories.userId],
    references: [users.id],
  }),
}));

export const dashvilleMissionSubmissions = pgTable("dashville_mission_submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  missionId: integer("mission_id").notNull(),
  tweetId: text("tweet_id").notNull(),
  tweetUrl: text("tweet_url").notNull(),
  tweetData: text("tweet_data"),
  pointsAwarded: integer("points_awarded").default(10).notNull(),
  status: text("status").default("approved").notNull(),
  weekStart: timestamp("week_start").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const dashvilleMissionProgress = pgTable("dashville_mission_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  weekStart: timestamp("week_start").notNull(),
  totalPoints: integer("total_points").default(0).notNull(),
  completedMissions: text("completed_missions").default("[]").notNull(),
  dailyCount: integer("daily_count").default(0).notNull(),
  lastDailyDate: timestamp("last_daily_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dashvilleMissionPrizes = pgTable("dashville_mission_prizes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  weekStart: timestamp("week_start").notNull(),
  rank: integer("rank").notNull(),
  kicksAmount: decimal("kicks_amount", { precision: 36, scale: 18 }).notNull(),
  nftAwarded: boolean("nft_awarded").default(false).notNull(),
  txHash: text("tx_hash"),
  nftTxHash: text("nft_tx_hash"),
  status: text("status").default("pending").notNull(),
  awardedAt: timestamp("awarded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dashvilleDailyLeaderboard = pgTable("dashville_daily_leaderboard", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  username: text("username").notNull(),
  points: integer("points").default(0).notNull(),
  missionsCompleted: integer("missions_completed").default(0).notNull(),
  date: timestamp("date").notNull(),
}, (table) => ({
  userDateIdx: uniqueIndex("dashville_daily_user_date_idx").on(table.userId, table.date),
}));

export const dashvilleWeeklyLeaderboard = pgTable("dashville_weekly_leaderboard", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  username: text("username").notNull(),
  points: integer("points").default(0).notNull(),
  missionsCompleted: integer("missions_completed").default(0).notNull(),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
}, (table) => ({
  userWeekIdx: uniqueIndex("dashville_weekly_user_week_idx").on(table.userId, table.weekStart),
}));

export const dashvilleMissionSubmissionsRelations = relations(dashvilleMissionSubmissions, ({ one }) => ({
  user: one(users, {
    fields: [dashvilleMissionSubmissions.userId],
    references: [users.id],
  }),
}));

export const dashvilleMissionProgressRelations = relations(dashvilleMissionProgress, ({ one }) => ({
  user: one(users, {
    fields: [dashvilleMissionProgress.userId],
    references: [users.id],
  }),
}));

export const dashvilleMissionPrizesRelations = relations(dashvilleMissionPrizes, ({ one }) => ({
  user: one(users, {
    fields: [dashvilleMissionPrizes.userId],
    references: [users.id],
  }),
}));

export const dashvilleDailyLeaderboardRelations = relations(dashvilleDailyLeaderboard, ({ one }) => ({
  user: one(users, {
    fields: [dashvilleDailyLeaderboard.userId],
    references: [users.id],
  }),
}));

export const dashvilleWeeklyLeaderboardRelations = relations(dashvilleWeeklyLeaderboard, ({ one }) => ({
  user: one(users, {
    fields: [dashvilleWeeklyLeaderboard.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  startedAt: true,
});

export const insertGameStepSchema = createInsertSchema(gameSteps).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type GameStep = typeof gameSteps.$inferSelect;
export type InsertGameStep = z.infer<typeof insertGameStepSchema>;
export type DailyLeaderboardEntry = typeof dailyLeaderboard.$inferSelect;
export type WeeklyLeaderboardEntry = typeof weeklyLeaderboard.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type RabbitRushInventory = typeof rabbitRushInventories.$inferSelect;
export type RabbitRushRun = typeof rabbitRushRuns.$inferSelect;
export type RabbitRushDailyLeaderboardEntry = typeof rabbitRushDailyLeaderboard.$inferSelect;
export type RabbitRushWeeklyLeaderboardEntry = typeof rabbitRushWeeklyLeaderboard.$inferSelect;
export type BunnyBladeWeeklyLeaderboardEntry = typeof bunnyBladeWeeklyLeaderboard.$inferSelect;
export type BunnyBladeInventory = typeof bunnyBladeInventories.$inferSelect;
export type DashvilleMissionSubmission = typeof dashvilleMissionSubmissions.$inferSelect;
export type DashvilleMissionProgress = typeof dashvilleMissionProgress.$inferSelect;
export type DashvilleMissionPrize = typeof dashvilleMissionPrizes.$inferSelect;
export type DashvilleDailyLeaderboardEntry = typeof dashvilleDailyLeaderboard.$inferSelect;
export type DashvilleWeeklyLeaderboardEntry = typeof dashvilleWeeklyLeaderboard.$inferSelect;
