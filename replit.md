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
- **Steps 1-25**: 25% hazard, 25% multiplier chance (Easy)
- **Steps 26-50**: 30% hazard, 20% multiplier chance (Medium)
- **Steps 51-75**: 40% hazard, 15% multiplier chance (Hard)
- **Steps 76-100**: 55% hazard, 10% multiplier chance (Expert)
- **Finish (Step 100)**: 20x multiplier bonus
- **Reset Traps**: Special spaces that send player back to step 0 (keeps multiplier)
- **Streak System**: Land 3+ consecutive safe/multiplier steps to trigger "On Fire" status

## Multiplier Types (progressive by zone)
- **Steps 1-25 (Easy)**: 1x, 1.5x, 2x, 2.5x
- **Steps 26-50 (Medium)**: 1.5x, 2x, 2.5x, 3x
- **Steps 51-75 (Hard)**: 2x, 2.5x, 3x, 5x, 8x
- **Steps 76-99 (Expert)**: 3x, 5x, 8x, 10x, 11x
- **Step 100 (Finish)**: 20x (guaranteed)

## Power-Up Types
- **Shield**: Protects from one hazard
- **Double Multiplier**: Doubles current multiplier for one step
- **Skip**: Skip current step (avoid hazards)
- **Bonus Chest**: Random KICKS reward

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
contracts/
└── KicksClaimVault.sol      # Smart contract for secure claim system
scripts/
└── deploy.cjs               # Hardhat deployment script
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
- `POST /api/game/:gameId/claim` - Claim winnings (direct transfer)
- `POST /api/claim/contract` - Get EIP-712 signature for vault contract claim
- `POST /api/claim/contract/confirm` - Confirm vault contract claim completed
- `GET /api/leaderboard/daily` - Get daily leaderboard
- `GET /api/leaderboard/weekly` - Get weekly leaderboard
- `GET /api/leaderboard/alltime` - Get all-time leaderboard (by type: winnings or multiplier)
- `GET /api/leaderboard/biggest-wins` - Get biggest single wins

## Configuration Required
To fully enable token betting:
1. Click the Settings icon (bottom right)
2. Enter KICKS token contract address on ApeChain
3. Enter house wallet address for receiving/sending KICKS
4. (Optional) Enter Claim Vault contract address for secure smart contract claims

## Smart Contract Claim System
The game supports two claim methods for winnings:

### 1. Direct Transfer (Default)
- House wallet directly sends KICKS tokens to winners
- Requires HOUSE_WALLET_PRIVATE_KEY in environment secrets
- Simple setup, but requires private key exposure to server

### 2. Smart Contract Vault (Recommended for Production)
- Uses KicksClaimVault.sol for secure, trustless claims
- Server signs EIP-712 typed messages authorizing claims
- Player calls contract's `claimWin()` function with signature
- No private key needed for transfers - contract holds and distributes tokens

### Vault Contract Deployment
```bash
# Set environment variables
export KICKS_TOKEN_ADDRESS=0x...  # KICKS token address
export ADMIN_ADDRESS=0x...         # Admin wallet for vault management
export SIGNER_ADDRESS=0x...        # Address matching HOUSE_WALLET_KEY

# Compile and deploy
npx hardhat compile
npx hardhat run scripts/deploy.cjs --network apechain
```

### Vault Contract Features
- **EIP-712 Signatures**: Type-safe, human-readable claim authorization
- **Role-Based Access**: Admin and Signer roles for security
- **Replay Protection**: Nonce-based to prevent double claims
- **Emergency Withdraw**: Admin can recover tokens if needed

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
