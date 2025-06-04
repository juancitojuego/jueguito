# Stone Crafter - Development Tasks

This document outlines the tasks required to develop the Stone Crafter game.

## Core Mechanics

- [ ] **Stone Mechanics**
  - [ ] Implement Stone Generation (Mulberry32 PRNG)
  - [ ] Define Stone Properties (StoneQualities interface)
  - [ ] Implement Stone Power Calculation
  - [ ] Define Special Abilities/Keywords (Initial implementation: none beyond stats)

- [ ] **Player and Progression Mechanics**
  - [ ] Implement Player Stats (name, currency)
  - [ ] Implement Inventory System (add, remove, sort stones)
  - [ ] Implement Stone Equipping Logic
  - [ ] Implement Game State Saving and Loading (localStorage or JSON file)
  - [ ] Implement Opponent System (generation, queue, advancement)

- [ ] **Core Player Actions/Verbs**
  - [ ] Implement "Crack Open Stone" action
  - [ ] Implement "Salvage Stone" action

- [ ] **Combat and Card System Mechanics**
  - [ ] Implement Fight Initiation (FightSession, CombatParticipantState)
  - [ ] Implement Combat Participant State
  - [ ] Implement Round Structure
    - [ ] Implement Start New Round (draw cards)
    - [ ] Implement Player Selects Card
    - [ ] Implement Player Plays Card (apply card effect)
    - [ ] Implement Resolve Current Round (damage calculation, health update, effect cleanup)
  - [ ] Implement Active Effects system
  - [ ] Define and Implement Card Definitions and Management (Deck, Hand, Discard Pile)
  - [ ] Implement Fight Outcome (rewards, penalties)

## UI (Ink Components)

- [ ] **Main Menu**
  - [ ] Display Player Stats
  - [ ] Display Equipped Stone
  - [ ] Option: Crack Open Stone
  - [ ] Option: Salvage Stone
  - [ ] Option: Fight Opponent
  - [ ] Option: View Inventory
  - [ ] Option: Save Game
  - [ ] Option: Load Game
  - [ ] Option: Exit Game

- [ ] **Inventory Screen**
  - [ ] List all stones
  - [ ] Allow equipping a stone
  - [ ] Display stone details

- [ ] **Combat Screen**
  - [ ] Display Player and Opponent health, power, defense
  - [ ] Display active effects for Player and Opponent
  - [ ] Display cards for choice at the start of a round
  - [ ] Allow player to select a card to play from hand
  - [ ] Display combat log/events

- [ ] **Stone Display Component**
  - [ ] Reusable component to display stone properties

- [ ] **Game Over/Fight Outcome Screen**

## Game Logic Implementation (Services and Utils)

- [ ] **GameStateManager Service**
  - [ ] Manage all aspects of `GameState` (player stats, inventory, equipped stone, currency, seeds, deck, hand, discard pile, opponent queue index).
  - [ ] Methods for:
    - `createStone`
    - `addStoneToInventory`
    - `removeStoneFromInventory`
    - `equipStone`
    - `updateCurrency`
    - `generateNewStoneSeed` (using global PRNG)
    - `saveGame`
    - `loadGame`
    - `resetGameDefaults`
    - `generateNewOpponentQueue`
    - `getCurrentOpponent`
    - `advanceOpponent`
    - `generateDeck`
    - `drawCardsFromDeck`
    - `addCardsToHand`
    - `removeCardFromHand`
    - `addCardsToDiscardPile`
    - `updatePlayerActiveCombatEffects`
    - `applyActiveEffectsToParticipant` (may move to FightService or be a shared util)
    - `updateAndCleanupActiveEffects` (may move to FightService or be a shared util)

- [ ] **RandomService (PRNG)**
  - [ ] Implement `mulberry32` PRNG function.
  - [ ] Provide instances for global game events and stone generation.

- [ ] **FightService**
  - [ ] Manage `FightSession`.
  - [ ] Methods for:
    - `startFight`
    - `createInitialCombatParticipantState`
    - `startNewRound`
    - `playerSelectsCard`
    - `playerPlaysCard`
    - `resolveCurrentRound`
    - `applyActiveEffectsToParticipant` (if not in GameStateManager)
    - `updateAndCleanupActiveEffects` (if not in GameStateManager)
    - `endFight`
    - `calculateStonePower` (may be a util or part of Stone mechanics)

- [ ] **Stone Utils**
  - [ ] `deriveStoneQualities(seed)`: Generates stone properties from a seed using Mulberry32.
  - [ ] `calculateStonePower(stone)`: Calculates combat power.

- [ ] **Card Definitions (`src/config/cards.ts`)**
  - [ ] Define `PREDEFINED_CARDS` array with initial card set.
  - [ ] Define `Card` interface and `Effect` interface.
  - [ ] Define `CardType` enum.
  - [ ] Define `ActiveEffect` interface.

## Entry Point (`src/index.ts`)

- [ ] Initialize game state (load or new game).
- [ ] Render main UI component (e.g., Main Menu).
- [ ] Handle game loop and user input.

## Testing (Optional - but recommended for core logic)

- [ ] Unit tests for `RandomService` (PRNG).
- [ ] Unit tests for `Stone Utils` (`deriveStoneQualities`, `calculateStonePower`).
- [ ] Unit tests for `GameStateManager` core logic (inventory, equipping, saving/loading).
- [ ] Unit tests for `FightService` combat calculations and round flow.
