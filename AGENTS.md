# 4-Man Survival Simulator — Agent Guidelines

## Overview
A deterministic, 4-player survival simulation engine written in pure TypeScript, fully decoupled from any UI rendering.

## Architecture Principles
1. **Engine Separation**: The game engine is pure business logic with no DOM, browser, or framework dependencies.
2. **Determinism**: Given the same seed and action sequence, the engine MUST produce the exact same state transitions.
3. **Multi-Stream PRNG**: RNG uses separate sub-streams (`init`, `action`, `weather`, `event`, `injury`, `ghost`) to prevent action desync from affecting unrelated rolls.
4. **Immutability**: `GameState` transformations are pure functions returning new state objects (`createGame`, `resolveDay`).
5. **Single Source of Truth**: Condition state is derived from HP and down timers.

## Commands
- Run all tests: `bun test`
- Run unit tests: `bun test tests/unit/`
- Type checking: `bun run typecheck`

## Directory Structure
- `src/engine/`: Core simulation logic
  - `types.ts`: Master domain type definitions
  - `rng/`: Mulberry32 and multi-stream PRNG implementation
  - `config/`: Balance configurations and constants
  - `rules/`: Game rule evaluation and condition helpers
  - `create-game.ts`: Initial game state factory
- `tests/`: Automated test suites
  - `tests/unit/`: Fast, isolated unit tests
