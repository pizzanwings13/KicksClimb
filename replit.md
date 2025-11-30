# KICKS CLIMB - ApeChain Token Betting Game

## Overview
A 3D betting game on ApeChain where players connect their wallets to bet KICKS tokens and navigate through 100 steps with multiplier zones and hazard traps.

## Current State
- MVP complete with all core features implemented
- Database schema set up with PostgreSQL for users, games, and leaderboards
- ApeChain wallet integration ready (needs KICKS token contract address configuration)

## Tech Stack
- **Frontend**: React, Three.js, @react-three/fiber, Tailwind CSS
- **Backend**: Express.js, Drizzle ORM, PostgreSQL
- **Blockchain**: ApeChain (Chain ID: 33139), ethers.js v6

## Key Features
1. **Wallet Connection**: MetaMask/Web3 wallet integration for ApeChain
2. **Token Betting**: Bet KICKS tokens on game outcomes
3. **100-Step Board**: Progressive difficulty with multipliers and hazards
4. **User Profiles**: Stats tracking, username, avatar support
5. **Leaderboards**: Daily and weekly top winners

## Game Mechanics
- **Steps 1-25**: 10% hazard chance, 25% multiplier chance (Easy)
- **Steps 26-50**: 20% hazard chance, 20% multiplier chance (Medium)
- **Steps 51-75**: 35% hazard chance, 15% multiplier chance (Hard)
- **Steps 76-100**: 50% hazard chance, 10% multiplier chance (Expert)
- **Finish (Step 100)**: 20x multiplier bonus

## Multiplier Types
- 2x (50% of multipliers)
- 3x (30% of multipliers)
- 5x (15% of multipliers)
- 10x (5% of multipliers)

## Project Structure
```
client/
├── src/
│   ├── components/game/     # Game components (Board, Player, HUD, etc.)
│   ├── lib/stores/          # Zustand stores (wallet, game state)
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
- `POST /api/game/start` - Start new game
- `POST /api/game/:gameId/move` - Make move (roll dice)
- `POST /api/game/:gameId/cashout` - Cash out current winnings
- `GET /api/leaderboard/daily` - Get daily leaderboard
- `GET /api/leaderboard/weekly` - Get weekly leaderboard

## Configuration Required
To fully enable token betting:
1. Click the Settings icon (bottom right)
2. Enter KICKS token contract address on ApeChain
3. Enter house wallet address for receiving/sending KICKS

## Running the Application
```bash
npm run dev          # Start development server
npm run db:push      # Push database schema changes
```

## Recent Changes (November 30, 2025)
- Initial MVP implementation
- Database schema with users, games, game_steps, daily_leaderboard, weekly_leaderboard
- ApeChain wallet integration with ethers.js
- 3D game board with Three.js visualization
- Progressive difficulty system
- Daily and weekly leaderboards
- User profile management

## User Preferences
- Token: KICKS on ApeChain
- Custom character support planned
- Wallet connection via MetaMask/compatible wallets
