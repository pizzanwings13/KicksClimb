# KICKS CLIMB - ApeChain Token Betting Game

A 3D betting game on ApeChain where players connect their wallets to bet KICKS tokens and navigate through 100 steps with multiplier zones, hazard traps, and power-ups.

## Features

- **Wallet Connection**: MetaMask and Zerion wallet support
- **Token Betting**: Bet KICKS tokens on game outcomes
- **100-Step Board**: Progressive difficulty with multipliers (up to 20x)
- **Power-Ups**: Shield, Double Multiplier, Skip abilities
- **Leaderboards**: Daily, weekly, and all-time rankings
- **Achievements**: 13 unlockable badges
- **Smart Contract Claims**: Secure EIP-712 signature-based claim system

## Tech Stack

- **Frontend**: React, Three.js, @react-three/fiber, Tailwind CSS
- **Backend**: Express.js, Drizzle ORM, PostgreSQL
- **Blockchain**: ApeChain (Chain ID: 33139), ethers.js v6

## Deployment on Vercel

### Prerequisites

1. A PostgreSQL database (Neon, Supabase, or similar)
2. Deploy the KicksClaimVault contract to ApeChain
3. A signing key for EIP-712 claim authorization

### Environment Variables

Set these in your Vercel project settings:

```
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=your-random-session-secret
CLAIM_SIGNER_KEY=your-signer-private-key
```

**Note**: `CLAIM_SIGNER_KEY` is used only for signing claim authorizations (EIP-712), not for holding or transferring funds. The vault contract handles all token transfers.

### Deploy Steps

1. Push this repository to GitHub
2. Connect your GitHub repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Smart Contract Setup

1. Deploy the `KicksClaimVault.sol` contract to ApeChain
2. Set the signer address in the contract to match your `CLAIM_SIGNER_KEY`
3. Fund the vault contract with KICKS tokens for payouts

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

## License

MIT
