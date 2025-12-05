# KICKS CLIMB - ApeChain Token Betting Game

## Overview
A 3D betting game on ApeChain where players connect their wallets to bet KICKS tokens and navigate through 100 steps with multiplier zones, hazard traps, power-ups, and collect achievements.

## Current State
- Full game with all enhanced features implemented
- Database schema with PostgreSQL for users, games, leaderboards, and achievements
- ApeChain wallet integration ready (configure KICKS token contract address via Settings)
- Sound effects and particle animations
- Power-up system with shield, double multiplier, and skip abilities
- Achievement badges with milestone rewards

## Tech Stack
- **Frontend**: React, Three.js, @react-three/fiber, Framer Motion, Tailwind CSS
- **Backend**: Express.js, Drizzle ORM, PostgreSQL
- **Blockchain**: ApeChain (Chain ID: 33139), ethers.js v6
- **Audio**: HTML5 Audio API with Howler.js hooks

## Key Features
1. **Wallet Connection**: MetaMask/Web3 wallet integration for ApeChain
2. **Token Betting**: Bet KICKS tokens on game outcomes
3. **100-Step Board**: Progressive difficulty with multipliers and hazards
4. **Power-Ups**: Shield (protection), Double Multiplier (2x boost), Skip (avoid hazards)
5. **User Profiles**: Stats tracking, username, avatar support
6. **Leaderboards**: Daily, weekly, and all-time (winnings, multipliers, biggest wins)
7. **Achievements**: 13 unlockable badges with milestone rewards
8. **Stats Dashboard**: Transaction history and performance metrics
9. **Sound Effects**: Background music and game event sounds with mute toggle
10. **Particle Effects**: Visual feedback for wins, losses, and multipliers

## Game Mechanics
- **Hazard Distribution**: Visual-aware algorithm prevents clustering
  - ~15 hazards total, randomly placed across steps 5-95
  - Checks VISUAL distance on the 10x10 grid (accounts for serpentine layout)
  - Minimum 2 tiles visual distance between hazards (no adjacent hazards)
  - Minimum 4 steps path distance between hazards
  - Randomized placement ensures variety while maintaining fairness
- **Finish (Step 100)**: 20x multiplier bonus
- **Reset Traps**: Special spaces that send player back to step 0 (keeps multiplier)
- **Streak System**: Land 3+ consecutive safe/multiplier steps to trigger "On Fire" status

## Multiplier System (Additive Stacking)
When landing on a multiplier tile, its value is **added** to your current multiplier:
- Example: Start at 1x → land on 2x tile → total becomes 3x
- Example: Have 3x → land on 1.5x tile → total becomes 4.5x
- Multipliers stack additively throughout the game

### Multiplier Types by Zone
- **Steps 1-25 (Easy)**: 1.5x, 2x, 2.5x, 3x, 4x, 5x
- **Steps 26-50 (Medium)**: 2x, 2.5x, 3x, 4x, 5x, 6x, 8x
- **Steps 51-75 (Hard)**: 3x, 4x, 5x, 6x, 7x, 8x, 10x, 12x
- **Steps 76-99 (Expert)**: 5x, 6x, 7x, 8x, 10x, 12x, 15x, 18x, 20x
- **Step 100 (Finish)**: Automatically becomes 20x

### Multiplier Rules
- Maximum cap: 20x (no multiplier can exceed this)
- Multipliers ADD to your total (e.g., 3x + 2x tile = 5x total)
- Variety system avoids back-to-back same low multipliers
- Win condition: Reaching step 100 automatically sets multiplier to 20x

## Power-Up Types
- **Shield** (Blue): Protects from one hazard - activate before rolling to survive a hazard
- **Double** (Yellow): Doubles your current multiplier when activated - if you have 5x it becomes 10x (capped at 20x)
- **Skip** (Green): Skip over a hazard or reset trap - activate before rolling to jump past danger
- **Bonus Chest**: Random reward - adds multiplier to total + 30% chance for +5 KICKS bonus

## Achievement Categories
- **Games Played**: First Climb (1), Veteran (10), Dedicated (50), Master (100)
- **Wins**: First Victory (1), Winner (10), Champion (50)
- **Multipliers**: Hunter (5x), Big (10x), Legendary (20x)
- **Winnings**: 1K, 10K, 100K KICKS total won

## Project Structure
```
client/
├── src/
│   ├── components/game/     # Game components (Board, Player, HUD, etc.)
│   ├── lib/stores/          # Zustand stores (wallet, game state, audio)
│   ├── lib/hooks/           # Custom hooks (sound effects)
│   └── App.tsx              # Main application
server/
├── db.ts                    # Database connection
├── routes.ts                # API endpoints
└── storage.ts               # Data access layer
shared/
└── schema.ts                # Drizzle database schema
```

## API Endpoints
- `POST /api/auth/connect` - Connect wallet and create/get user
- `GET /api/user/:walletAddress` - Get user profile
- `PUT /api/user/:walletAddress` - Update profile
- `GET /api/user/:walletAddress/games` - Get user game history
- `GET /api/user/:walletAddress/stats` - Get user statistics
- `GET /api/user/:walletAddress/achievements` - Get user achievements
- `POST /api/user/:walletAddress/achievements/check` - Check and unlock new achievements
- `POST /api/game/start` - Start new game
- `POST /api/game/:gameId/move` - Make move (roll dice)
- `POST /api/game/:gameId/cashout` - Cash out current winnings
- `POST /api/game/:gameId/claim-nonce` - Get nonce for claiming winnings
- `POST /api/game/:gameId/claim` - Claim winnings (direct transfer from house wallet)
- `GET /api/leaderboard/daily` - Get daily leaderboard
- `GET /api/leaderboard/weekly` - Get weekly leaderboard
- `GET /api/leaderboard/alltime` - Get all-time leaderboard (by type: winnings or multiplier)
- `GET /api/leaderboard/biggest-wins` - Get biggest single wins

## Configuration
Token addresses are configured in the app:
- KICKS Token: 0x79F8f881dD05c93Ca230F7E912ae33f7ECAf0d60
- House Wallet: 0xb7AF40c853c20C806EA945EEb5F0f2447b2C02f5

Claims are processed via direct transfer using the HOUSE_WALLET_KEY environment variable.

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Random string for session encryption
- `HOUSE_WALLET_KEY` - Private key for the house wallet (used to send KICKS to winners)

## Running the Application
```bash
npm run dev          # Start development server
npm run db:push      # Push database schema changes
```

## Wallet Integration
- **MetaMask**: Full support - connects via browser extension
- **Zerion**: Full support - connects via browser extension  
- **Glyph**: Coming soon - Yuga Labs' wallet for ApeChain social login

Wallet detection automatically identifies which wallets are installed and provides appropriate connection options through the WalletConnectModal component.

## Recent Changes (November 30, 2025)
- Added multi-wallet connection modal (MetaMask, Zerion, Glyph coming soon)
- Added sound effects and background music with mute controls
- Implemented particle effects for game events (win, loss, multipliers)
- Created power-up system with shield, double, skip, and bonus chest
- Built transaction history and stats dashboard
- Added all-time leaderboard with highest multipliers and biggest wins tabs
- Implemented achievement badges system with 13 unlockable badges
- Enhanced UI with Framer Motion animations
- Increased hazard difficulty (25/30/40/55% across zones)
- Added visual step numbers on each block
- Added landscape with mountains, trees, and DashKids logo wall
- Added x15 multiplier appearing rarely in Expert zone
- Added reset trap spaces that send players back to step 0 (keep multiplier)
- Implemented streak/on-fire system with animated flames around player

## User Preferences
- Token: KICKS on ApeChain
- Sound effects enabled by default (can be muted)
- Wallet connection via MetaMask, Zerion, or Glyph (coming soon)
