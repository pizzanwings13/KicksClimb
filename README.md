# KICKS CLIMB - ApeChain Token Betting Game

A 3D betting game on ApeChain where players connect their wallets to bet KICKS tokens and navigate through 100 steps with multiplier zones, hazard traps, and power-ups.

## Features

- **Wallet Connection**: MetaMask and Zerion wallet support
- **Token Betting**: Bet KICKS tokens on game outcomes
- **100-Step Board**: Progressive difficulty with multipliers (up to 20x)
- **Power-Ups**: Shield, Double Multiplier, Skip abilities
- **Leaderboards**: Daily, weekly, and all-time rankings
- **Achievements**: 13 unlockable badges
- **Direct Claims**: House wallet sends winnings directly to players

## Tech Stack

- **Frontend**: React, Three.js, @react-three/fiber, Tailwind CSS
- **Backend**: Express.js, Drizzle ORM, PostgreSQL
- **Blockchain**: ApeChain (Chain ID: 33139), ethers.js v6

## Deployment on Vercel

### Prerequisites

1. A PostgreSQL database (Neon, Supabase, or similar)
2. A house wallet with KICKS tokens for payouts

### Environment Variables

Set these in your Vercel project settings:

```
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=your-random-session-secret
HOUSE_WALLET_KEY=your-house-wallet-private-key
```

**Important**: 
- `HOUSE_WALLET_KEY` is the private key of the wallet that holds KICKS tokens and sends them to winners
- Fund this wallet with enough KICKS tokens to cover player winnings

### Deploy Steps

1. Push this repository to GitHub
2. Connect your GitHub repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Custom Domain Setup

After deployment:
1. Go to your Vercel project settings > Domains
2. Add your custom domain
3. Configure DNS records as instructed by Vercel

## Token Configuration

The following addresses are pre-configured:
- **KICKS Token**: `0x79F8f881dD05c93Ca230F7E912ae33f7ECAf0d60`
- **House Wallet**: `0xb7AF40c853c20C806EA945EEb5F0f2447b2C02f5`

## Local Development

```bash
npm install
npm run dev
```

## Game Mechanics

- **Steps 1-25 (Easy)**: 25% hazard, 25% multiplier chance
- **Steps 26-50 (Medium)**: 30% hazard, 20% multiplier chance
- **Steps 51-75 (Hard)**: 40% hazard, 15% multiplier chance
- **Steps 76-100 (Expert)**: 55% hazard, 10% multiplier chance
- **Step 100**: 20x multiplier bonus

## How Claims Work

1. Player wins or cashes out with a multiplier > 0
2. Player clicks "Claim Winnings" and signs a message with their wallet
3. Server verifies the signature and sends KICKS from the house wallet to the player
4. Transaction is recorded and balance updates

## License

MIT
