# TOKEN RUSH - Multi-Game Token Betting Platform

## Overview
TOKEN RUSH is a multi-game token betting platform built on ApeChain, designed to provide a centralized hub for various betting games. Players connect their wallets to engage in different games using KICKS tokens. The platform aims to offer a shared, seamless experience across multiple gaming experiences, fostering a vibrant ecosystem for token-based gaming. Key capabilities include a shared wallet connection, user session management, and a robust backend for tracking game data, leaderboards, and achievements. The project's vision is to become a leading destination for on-chain gaming on ApeChain, continually expanding its game offerings and community engagement features.

## User Preferences
- Token: KICKS on ApeChain
- Sound effects enabled by default (can be muted)
- Wallet connection via MetaMask, Zerion, or Glyph (coming soon)

## System Architecture
The platform is structured as a hub for multiple modular games, each residing in its own directory (`client/src/games/{game-name}/`). A shared authentication system ensures a single wallet connection works across all games.

**UI/UX Decisions:**
- **Game Hub**: Main selection page after wallet connection (`/`).
- **Game-Specific Pages**: Each game has a dedicated route (e.g., `/kicks-climb`, `/rabbit-rush`, `/endless-runner`).
- **Animations**: Framer Motion is used for enhanced UI animations.
- **Visuals**: Three.js and @react-three/fiber for 3D game rendering, Tailwind CSS for styling.

**Technical Implementations & Features:**
- **Wallet Connection**: Integration with ApeChain (MetaMask, Zerion, with Glyph planned) using ethers.js v6.
- **Token Betting**: Core mechanic allowing KICKS token bets on game outcomes.
- **User Profiles**: Tracks stats, username, and avatar.
- **Leaderboards**: Daily, weekly, and all-time leaderboards based on winnings, multipliers, and biggest wins.
- **Achievements**: 13 unlockable badges with milestone rewards.
- **Stats Dashboard**: Displays transaction history and performance metrics.
- **Audio/Visuals**: HTML5 Audio API with Howler.js hooks for sound effects, and particle effects for game events.

**Core Games:**
- **Kicks Climb**: A 3D step-climbing betting game with 100 steps, multipliers, hazards, power-ups (Shield, Double, Skip), and a unique hazard distribution algorithm. The multiplier system is replacement-based, with values tiered by game zone.
- **Rabbit Rush**: A 2D canvas-based flying game featuring ship selection, weapon systems, color customization, a shop, destructible obstacles, enemy ships, and power-ups.
- **Night Drive**: A 3D lane-based driving game set in a procedural city environment.
- **Rabbits Blade**: A 2D canvas-based fruit-ninja style slicing game with 10 levels, various target types, hazards (bombs, Thor Hammer), and a life system. It includes blade upgrades and KICKS claiming upon victory.

**Engagement System:**
- **DashvilleMissions**: A weekly X/Twitter engagement system where users earn points for posting about games, tagging specific accounts, and including media. Features 5 weekly missions, a daily limit, and weekly prizes (KICKS + NFT for 1st place).

**Backend & Database:**
- **Tech Stack**: React, Express.js, Drizzle ORM, PostgreSQL.
- **Database Schema**: Comprehensive schema for users, games, leaderboards, achievements, and specific game-related inventories and runs.
- **API Endpoints**: A robust set of RESTful APIs for user management, game actions (start, move, cashout, claim), leaderboards, achievements, and mission-specific interactions.
- **Configuration**: KICKS token and House Wallet addresses are configurable. Claims are processed via direct transfer from the house wallet.
- **Scheduler**: node-cron is used for weekly resets of missions and leaderboards.

## External Dependencies
- **Blockchain**: ApeChain (Chain ID: 33139)
- **Wallet Integrations**: MetaMask, Zerion (with Glyph planned)
- **Web3 Library**: ethers.js v6
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Frontend Framework**: React
- **3D Graphics**: Three.js, @react-three/fiber
- **UI Animations**: Framer Motion
- **Styling**: Tailwind CSS
- **Backend Framework**: Express.js
- **Audio Library**: Howler.js
- **State Management**: Zustand
- **Job Scheduler**: node-cron (for weekly resets)