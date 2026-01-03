# TOKEN RUSH - Multi-Game Token Betting Platform

## Overview
A multi-game token betting platform on ApeChain where players connect their wallets to play various games using KICKS tokens. The platform serves as a hub for multiple betting games with shared wallet connection and user sessions.

## Current State
- **Platform Hub**: Token Rush serves as the main game selection hub
- **Kicks Climb**: Fully functional 3D betting game (100 steps, multipliers, hazards)
- **Rabbit Rush**: Fully functional 2D canvas flying game (rockets, multipliers, enemies, powerups)
- **Night Drive**: 3D lane-based driving game with procedural city environment
- Shared wallet connection and user session across all games
- Database schema with PostgreSQL for users, games, leaderboards, and achievements
- ApeChain wallet integration (MetaMask, Zerion supported)
- Sound effects and particle animations
- Scalable architecture for adding more games

## Platform Architecture
- **Token Rush Hub** (`/`): Main game selection page after wallet connection
- **Kicks Climb** (`/kicks-climb`): 3D step-climbing betting game
- **Rabbit Rush** (`/rabbit-rush`): 2D canvas flying game with rockets and multipliers
- **Night Drive** (`/endless-runner`): 3D lane-based driving game with city night theme
- Shared authentication: One wallet connection works across all games
- Modular game structure: Each game lives in `client/src/games/{game-name}/`

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
  - 20 hazards total, randomly placed across steps 5-95
  - Checks VISUAL distance on the 10x10 grid (accounts for serpentine layout)
  - Minimum 2 tiles visual distance between hazards (no adjacent hazards)
  - Minimum 4 steps path distance between hazards
  - Randomized placement ensures variety while maintaining fairness
- **Finish (Step 100)**: 10x multiplier bonus
- **Reset Traps**: Special spaces that send player back to step 0 (keeps multiplier)
- **Streak System**: Land 3+ consecutive safe/multiplier steps to trigger "On Fire" status

## Multiplier System (Replacement)
When landing on a multiplier tile, your multiplier is **replaced** with the tile's value:
- Example: Start at 1x → land on 3x tile → multiplier becomes 3x
- Example: Have 5x → land on 2x tile → multiplier becomes 2x
- Your multiplier always equals the last multiplier tile you landed on

### Multiplier Types by Zone
- **Steps 1-25 (Easy)**: 1x, 1.5x, 2x, 2.5x, 3x, 4x, 5x
- **Steps 26-50 (Medium)**: 2x, 2.5x, 3x, 4x, 5x, 6x, 7x, 8x
- **Steps 51-75 (Hard)**: 3x, 4x, 5x, 6x, 7x, 8x, 9x, 10x
- **Steps 76-99 (Expert)**: 4x, 5x, 6x, 7x, 8x, 9x, 10x
- **Step 100 (Finish)**: Automatically becomes 10x

### Multiplier Rules
- Maximum cap: 10x (no multiplier can exceed this)
- Multipliers REPLACE your current value (e.g., have 5x, land on 2x = 2x)
- Variety system avoids back-to-back same low multipliers
- Win condition: Reaching step 100 automatically sets multiplier to 10x

## Power-Up Types
- **Shield** (Blue): Protects from one hazard - activate before rolling to survive a hazard
- **Double** (Yellow): Doubles your current multiplier when activated - if you have 5x it becomes 10x (capped at 10x)
- **Skip** (Green): Skip over a hazard or reset trap - activate before rolling to jump past danger
- **Bonus Chest**: Random reward - sets multiplier + 30% chance for +5 KICKS bonus

## Achievement Categories
- **Games Played**: First Climb (1), Veteran (10), Dedicated (50), Master (100)
- **Wins**: First Victory (1), Winner (10), Champion (50)
- **Multipliers**: Hunter (5x), Big (8x), Legendary (10x)
- **Winnings**: 1K, 10K, 100K KICKS total won

## Project Structure
```
client/
├── src/
│   ├── components/game/     # Shared game components (modals, HUD, etc.)
│   ├── games/
│   │   ├── kicks-climb/     # Kicks Climb game module
│   │   │   └── KicksClimbApp.tsx
│   │   └── rabbit-rush/     # Rabbit Rush game module (coming soon)
│   │       └── RabbitRushApp.tsx
│   ├── pages/
│   │   ├── GameHub.tsx      # Main game selection page
│   │   └── ConnectWalletPage.tsx  # Wallet connection landing
│   ├── lib/stores/          # Zustand stores (wallet, game state, audio)
│   ├── lib/hooks/           # Custom hooks (sound effects)
│   └── App.tsx              # Router hub with shared providers
server/
├── db.ts                    # Database connection
├── routes.ts                # API endpoints
└── storage.ts               # Data access layer
shared/
└── schema.ts                # Drizzle database schema
```

## Routes
- `/` - Connect wallet page (if not connected) or Game Hub (if connected)
- `/kicks-climb` - Kicks Climb game (requires wallet connection)
- `/rabbit-rush` - Rabbit Rush placeholder (requires wallet connection)

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

## Rabbit Rush Game
A 2D canvas-based flying game where players pilot rockets, dodge obstacles, collect coins, and cash out at the right time.

### Game Features
- **Ship Selection**: 2 starter ships (Blaze & Luna), additional ships unlockable via KICKS
- **Weapon System**: Multiple weapons with different fire rates and damage
- **Color Customization**: Custom rocket trail and engine colors
- **Shop System**: Purchase ships, weapons, and colors that persist to profile
- **Destructible Obstacles**: Shoot asteroids to clear paths
- **Enemy Ships**: Hostile targets that can be destroyed for points
- **Powerups**: Speed boost, shield, multiplier boosts
- **Daily/Weekly Leaderboards**: Compete for top scores

### Rabbit Rush Database Schema
- `rabbitRushInventories`: Player inventory (ships, weapons, colors, stats)
- `rabbitRushRuns`: Individual game run history
- `rabbitRushDailyLeaderboard`: Daily leaderboard entries
- `rabbitRushWeeklyLeaderboard`: Weekly leaderboard entries

### Rabbit Rush API Endpoints
- `GET /api/rabbit-rush/profile/:walletAddress` - Get player profile and inventory
- `POST /api/rabbit-rush/profile/:walletAddress/purchase` - Purchase shop item
- `POST /api/rabbit-rush/profile/:walletAddress/run` - Save completed run
- `GET /api/rabbit-rush/leaderboard/daily` - Get daily leaderboard
- `GET /api/rabbit-rush/leaderboard/weekly` - Get weekly leaderboard

## Rabbits Blade Game
A 2D canvas-based fruit-ninja style slicing game where players slice fruits and avoid bombs to earn KICKS.

### Game Features
- **10 Level System**: Progress through 10 increasingly difficult levels
- **60-Second Timer**: Each level lasts 60 seconds - survive to advance
- **Slicing Mechanics**: Swipe/drag to slice targets for points
- **Target Types**: Carrots (15pts), Leaves (10pts), Gold Coins (50pts)
- **Hazards**: Bombs (-1 life), Thor Hammer (destroys ALL targets on screen)
- **Blade Upgrades**: Purchase different blades with earned KICKS
- **KICKS Claiming**: Claim earned KICKS via wallet signing at victory

### Level Difficulty Scaling (LEVEL_CONFIGS)
- **Level 1-3 (Easy)**: Low spawn rate, few bombs, slow speed
- **Level 4-6 (Medium)**: Moderate spawns, 10-15% bomb chance
- **Level 7-9 (Hard)**: Fast spawns, 20% bomb chance, 8-10% Thor chance
- **Level 10 (Expert)**: Maximum difficulty, high coin chance (10%)

### Rabbits Blade Mechanics
- **Lives System**: Start with 3 lives, lose 1 per bomb sliced
- **Streak System**: Consecutive slices without missing increase streak multiplier
- **Thor Lightning**: Slicing Thor hammer triggers lightning to ALL targets, destroying them for points
- **Victory Condition**: Complete level 10 to win and claim KICKS
- **Weekly Leaderboard**: Compete for top scores, resets every Saturday at midnight UTC

### Rabbits Blade Database Schema
- `bunnyBladeWeeklyLeaderboard`: Weekly leaderboard entries with username, high score, total kicks, games played

### Rabbits Blade API Endpoints
- `GET /api/bunny-blade/leaderboard/weekly` - Get weekly leaderboard with reset countdown
- `POST /api/bunny-blade/score` - Submit score with username for leaderboard

### Rabbits Blade Files
- `client/src/games/bunny-blade/BunnyBladeApp.tsx` - Main game component
- `client/public/textures/rabbits-blade-logo.png` - Game logo
- `client/public/textures/thor-bunny.png` - Thor hammer powerup sprite

## Recent Changes (January 3, 2026)
- Added weekly leaderboard for Rabbits Blade (resets Saturday at midnight UTC)
- Added username prompt to save player names to leaderboard
- Enhanced Thor lightning effect with screen flash, thicker bolts, branch lightning
- Fixed claimed KICKS display to show earned amount after claiming
- Rabbits Blade fully implemented with 10-level system
- Added 60-second timer per level with visual countdown
- Implemented Thor lightning effect that destroys all targets
- Added wallet claiming flow using Rabbit Rush API pattern
- Level configs define spawn rates, bomb/thor chances, and speed multipliers

## Recent Changes (December 10, 2025)
- Rabbit Rush fully implemented with 2D canvas flying game
- Added destructible obstacles with HP system
- Integrated rabbit character images (Blaze/Luna) in ship cockpits
- Added sound effects (hit sounds, success chimes, background music)
- Created dedicated database tables for Rabbit Rush inventory and leaderboards
- Built complete API layer for profile persistence and leaderboards
- Added player stats display (runs, wins, best multiplier) on ship select screen
- Implemented daily/weekly leaderboard modal with rankings

## Previous Changes (December 7, 2025)
- Increased hazards from 15 to 20 for more competitive gameplay
- Reduced finish line multiplier from 20x to 10x
- Changed multiplier system from additive stacking to replacement (landing sets your multiplier)
- Updated multiplier range to 1x-10x (removed 12x, 15x, 18x)
- Added 9x multiplier tier in Hard and Expert zones
- Added 1x multiplier in Easy zone for balanced risk/reward

## Previous Changes (November 30, 2025)
- Added multi-wallet connection modal (MetaMask, Zerion, Glyph coming soon)
- Added sound effects and background music with mute controls
- Implemented particle effects for game events (win, loss, multipliers)
- Created power-up system with shield, double, skip, and bonus chest
- Built transaction history and stats dashboard
- Added all-time leaderboard with highest multipliers and biggest wins tabs
- Implemented achievement badges system with 13 unlockable badges
- Enhanced UI with Framer Motion animations
- Added visual step numbers on each block
- Added landscape with mountains, trees, and DashKids logo wall
- Added reset trap spaces that send players back to step 0 (keep multiplier)
- Implemented streak/on-fire system with animated flames around player

## User Preferences
- Token: KICKS on ApeChain
- Sound effects enabled by default (can be muted)
- Wallet connection via MetaMask, Zerion, or Glyph (coming soon)
