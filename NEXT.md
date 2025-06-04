## Project Setup and Workflow

This project is developed using Node.js and TypeScript to ensure type safety and modern JavaScript features.

-   **Package Manager**: NPM is used for managing project dependencies. Key files include `package.json` and `package-lock.json`.
-   **TypeScript**: Source code is written in TypeScript (`.ts`) and located in the `src/` directory. It is compiled to JavaScript in the `dist/` directory using the settings in `tsconfig.json`. The `rootDir` in `tsconfig.json` is set to `.` which means the `dist` folder will mirror the project structure (e.g. `dist/src/...`, `dist/tests/...`).
-   **Testing**: Jest is used as the testing framework. Test files are also written in TypeScript (`.ts`) and are located in the `tests/` directory, named with the `*.test.ts` pattern. Jest configuration is in `jest.config.js`.
-   **UI**: The user interface is built using `terminal-kit` for command-line interaction.

### Key Development Commands

-   **Install Dependencies**: `npm install`
-   **Compile TypeScript**: `npm run build` (compiles `src` and `tests` to `dist`)
-   **Compile TypeScript (Watch Mode)**: `npm run build:watch`
-   **Run Tests**: `npm run test` (runs tests using Jest, which uses `ts-jest` to compile TypeScript in memory)
-   **Run Game Application**: `npm start` (executes `src/main.ts` using `tsx`)

---

## Core Game Logic (Largely Implemented)

*(This section summarizes features that have functional implementations, even if UI is pending or basic.)*

### Stone Mechanics (Completed)
- Seed-based stone generation (`mulberry32`, quality derivation).
- `StoneQualities` class definition.
- Stone power calculation (`calculateStonePower`).

### Player and Progression Mechanics (Mostly Completed)
- Player Stats (`PlayerStats` class, currency in `GameState`).
- Inventory management (add, remove, sort, duplicate prevention in `GameStateManager`).
- Equipping stones (equip, auto-equip logic in `GameStateManager`).
- Game State: Saving and Loading (Implemented using Node.js `fs` in `GameStateManager`).
- Opponent System (Initial queue generation and access methods in `GameStateManager` and `opponent_system.ts`).

### Core Player Actions/Verbs (Implemented)
- Crack Open Stone (`crackOpenStone` in `player_actions.ts`).
- Salvage Stone (`salvageStone` in `player_actions.ts`).

### Combat and Card System Mechanics (Core Loop Implemented)
- **Interfaces Defined** (`src/combat_interfaces.ts`): `CardType`, `ActiveEffect`, `CombatParticipantState`, `Effect`, `Card`, `FightSessionData`, `TargetType`, `NewRoundInfo`, `CardPlayOutcome`, `RoundResolutionOutcome`, `FightOutcome`.
- **Fight Initiation** (`startFight` in `fight_service.ts`): Creates `FightSessionData`, initializes participant states.
- **Combat Participant State** (`createInitialCombatParticipantState` in `fight_service.ts`).
- **Round Structure** (Implemented in `fight_service.ts`):
    -   A. Start New Round (`startNewRound`): Increments round, applies effects (placeholder `applyActiveEffectsToParticipant`), draws cards.
    -   B. Player Selects Card (`playerSelectsCard`): Moves card from choices to hand, others to discard.
    -   C. Player Plays Card (`playerPlaysCard`): Moves card from hand to discard, applies card's `effect.apply` to target, updates effects and stats.
    -   D. Resolve Current Round (`resolveCurrentRound`): Calculates damage, updates health, cleans up effects, determines winner/fight over.
- **Active Effects**: Basic `applyActiveEffectsToParticipant` for stat calculation, and `updateAndCleanupActiveEffects` for duration management.
- **Card Definitions and Management**:
    -   `PREDEFINED_CARDS` in `src/config/cards.ts` with functional `effect.apply` methods for buffs and heals.
    -   Card/deck/hand/discard management methods (`generateDeck`, `drawCardsFromDeck`, etc.) in `GameStateManager`.
- **Fight Outcome** (`endFight` in `fight_service.ts`): Applies rewards/penalties (currency, stone gain/loss chances), clears session.

---

## User Interface (Terminal-Kit) - In Progress

### Core UI Setup (Completed)
-   Installed `terminal-kit` and type definitions.
-   Basic terminal initialization in `src/ui/index.ts` (screen clearing, cursor handling, Ctrl+C exit).
-   Main application loop in `src/main.ts` using `terminal-kit` to drive interactions.
-   Helper functions for displaying game information using `term` object in `src/ui/ui_helpers.ts`.

### Main Menu (Implemented)
-   Display main menu options using `term.singleColumnMenu` in `src/ui/main_menu.ts`.
-   Connect main menu actions to corresponding game logic functions (`handleMainMenuAction`).

### Next UI Development Tasks

-   **Detailed Game State Display:**
    -   Create a dedicated screen or panel to show comprehensive player stats, equipped stone, inventory summary, and current opponent when not in a specific action/menu (e.g., after completing an action, before returning to main menu).
-   **Inventory Screen (High Priority):**
    -   Implement an interactive inventory screen using `terminal-kit`.
    -   Allow navigation through stones (e.g., using arrow keys, `singleRowMenu` or `singleColumnMenu`).
    -   Display detailed stats for a selected stone.
    -   Provide actions for the selected stone:
        -   Equip stone.
        -   (Contextual) Crack Open Selected Stone (if different from main menu one).
        -   (Contextual) Salvage Selected Stone (if different from main menu one).
-   **Stone Interaction Screens (Refine from `handleMainMenuAction`):**
    -   **Crack Open Stone:**
        -   Confirmation prompt: "Crack open [Stone Name]?".
        -   Clear display of new stones found, their details.
    -   **Salvage Stone:**
        -   Confirmation prompt: "Salvage [Stone Name] for X currency?".
        -   Clear display of currency gained.
-   **Combat UI - Phase by Phase (High Priority):**
    -   **Fight Initiation Display:** Clear presentation when a fight starts (player vs. opponent, initial health/stats).
    -   **Start New Round Display:** Show round number, player/opponent health, power, defense. Display cards for choice clearly.
    -   **Player Selects Card UI:** Allow player to select one of an array of `Card` objects using `term.singleColumnMenu` or similar.
    -   **Player Plays Card UI:**
        -   Display player's hand (e.g., using `singleColumnMenu`).
        -   Allow player to choose a card from hand.
        -   If card requires a target, prompt player to choose target (`term.singleRowMenu` for Player/Opponent).
        -   Display results of card play (effects applied, stat changes, messages from `CardPlayOutcome`).
    -   **Resolve Current Round Display:** Show damage dealt, health changes, effects updated/expired, and if the fight ended. Use `RoundResolutionOutcome`.
    -   **Fight Outcome Display:** Clearly present the winner, rewards (currency, new stones), penalties (lost stone) from `FightOutcome`.
-   **General UI Enhancements:**
    -   Consistent layout (e.g., header, main content area, status/log line).
    -   Use of colors and styles for better readability and emphasis.
    -   Input validation and user-friendly error messages within the UI flow.
    -   Consider using `terminal-kit`'s `Document` model or `ScreenBuffer` for more complex screen compositions if needed.
    -   Status line at bottom for persistent info (Player Name, Currency, Current Equipped Stone Power).
-   **Save/Load Prompts:**
    -   Confirmation before overwriting existing save (if applicable, though current `fs.writeFileSync` overwrites).
    -   Clear feedback on successful save/load.

---
*(Original "Tasks derived from the game design document" section could be reviewed and items marked as complete or integrated into the new structure above if they were very granular. For now, the new "Core Game Logic" and "User Interface" sections provide a good overview of progress.)*
