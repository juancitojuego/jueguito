# Stone-Arena Game (SolidJS Edition)

This is a web-based game based on procedurally generated stones, now featuring a UI built with SolidJS. This repository contains the game application.

## Features Implemented

*   **Seed & RNG Core**: The game uses a deterministic Random Number Generator (RNG) for game events, seeded either by user input or randomly. Stone properties (color, shape, weight, hardness, magic) are derived deterministically from their own seeds.
*   **Stone Generation**: A system (`createStone`, `deriveStoneQualities`) generates fully-typed stone objects with varied properties and a creation timestamp.
*   **Opponent System**: Opponents with their own stones are generated and managed, providing challenges for the player.
*   **Inventory Management**: Manages a list of player-owned stones. Game state (game seed, player stats, currency, stones, equipped stone, opponent progress) is saved to browser `localStorage`.
*   **Robust Persistence**: Auto-saves can be triggered after key actions. Handles loading from `localStorage` or starting a fresh game.
*   **Testing**: Includes a Jest test suite. Core logic in services is well-tested. (Note: Some UI component tests have known issues with JSDOM/reactivity simulation under Jest).
*   **Visual Stone Rendering**:
    *   **Shape Masks (`shapeMasks.ts`)**: Generates 60x60 boolean masks for various stone shapes (Sphere, Cube, Pyramid, etc.).
    *   **SVG Stone Renderer (`render.tsx`)**: Takes shape masks and stone qualities to produce a deterministic SVG visual representation of the stone, including color, and effects for magic/density.
*   **Decoupled Services**: Core game logic is handled by:
    *   `GameStateManager`: Manages the overall game state, persistence, and core game actions.
    *   `RandomService`: Provides seeded random number generation for deterministic outcomes.
    *   `FightService`: Manages the logic for fights between stones.
*   **Reactive UI**: Built with SolidJS, providing a dynamic and interactive web interface.
    *   **Console Log Panel**: A scrollable panel displays game events, actions, saves, and errors, with timestamped messages.
    *   **Message Line**: Displays temporary messages to the user.

## User Interface (SolidJS Web App)

The game is played in a web browser, with a UI built using SolidJS.

### Main Game View
*   **Stone Info**: Displays details of the currently equipped stone and player currency.
*   **Stone Preview**: Shows an SVG visual representation of the equipped stone.
*   **Main Menu**:
    *   **Crack Open Current Stone**: Consumes the equipped stone to reveal new ones.
    *   **Fight**: Battles the equipped stone against the current opponent.
    *   **Salvage**: Destroys the equipped stone for currency.
    *   **Inventory**: Opens the inventory view.

### Inventory View
*   Lists all player-owned stones.
*   Allows selection of a stone to view its details and preview (using `StonePreview` component).
*   Allows setting a selected stone as the currently equipped stone.
*   Provides a button to close and return to the main game view.

## Gameplay Actions & Economy
(This section largely remains the same as the core game logic is preserved)
*   **Crack Open Current Stone Action**: Consumes equipped stone, generates 1 new stone, with a 10% chance for a second and 1% for a third.
*   **Fight Action**: Player's stone vs. opponent's. Power calculated with +/-15% variance.
    *   **Win**: +10 currency, 20% chance for an extra stone.
    *   **Loss**: 30% chance for player's stone to be destroyed.
    *   **Tie**: No changes.
    *   Advances to the next opponent.
*   **Gold Economy**: Currency earned from fights.
*   **Salvage Action**: Destroy equipped stone for Gold (rarity * 10).

## Tech Stack / Key Technologies

*   **Frontend Framework**: SolidJS
*   **Build Tool / Dev Server**: Vite
*   **Core Services**:
    *   `GameStateManager`
    *   `FightService`
    *   `RandomService`
*   **Language**: TypeScript 5.x
*   **Testing**: Jest (with `ts-jest` and SolidJS testing utilities)
*   **PRNG**: `seedrandom` (used by `RandomService`)

## Prerequisites

*   Node.js (version 20.x or higher recommended)
*   npm (usually comes with Node.js)

## Setup & Running

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    This will start the Vite dev server, typically on `http://localhost:3000`.

4.  **Building the application (for production):**
    ```bash
    npm run build
    ```
    Output will be in the `/dist` directory. You can preview the build with `npm run preview`.

## Development

*   **Run tests:**
    ```bash
    npm test
    ```
    Note: Core logic in services is well-tested. Some UI component tests might have known issues related to JSDOM interactions or advanced reactivity simulation under Jest.

*   **Linting/Formatting**: ESLint and Prettier are set up.
    *   `npm run lint`
    *   `npm run format`

## Continuous Integration (CI)
This project uses GitHub Actions for Continuous Integration. The CI workflow is defined in `.github/workflows/main.yml` and includes the following:
*   **Triggers**: Automatically runs on every `push` and `pull_request` to the `main` branch.
*   **Environment**: Uses Ubuntu latest with Node.js version 20.x.
*   **Steps**:
    1.  Checks out the repository.
    2.  Sets up Node.js and caches npm dependencies.
    3.  Installs dependencies using `npm ci`.
    4.  Runs the linter (`npm run lint`).
    5.  Executes automated tests (`npm test`).
    6.  Performs a project build (`npm run build`).

## Project Structure

*   `/public`: Static assets for Vite.
*   `/src`: Contains the TypeScript source code.
    *   `/components`: SolidJS UI components.
    *   `/interfaces`: TypeScript interface definitions for services and data structures.
    *   `/services`: Core game logic services (`GameStateManager`, `FightService`, `RandomService`, `serviceInstances`).
    *   `App.tsx`: Main SolidJS application component.
    *   `index.html`: Entry point HTML for Vite.
    *   `index.tsx`: Main script to render the SolidJS App.
    *   `store.ts`: SolidJS store providing reactive state and actions bridged from `GameStateManager`.
    *   `stone.ts`: Stone object definition, quality derivation constants (COLORS, SHAPES), and creation utilities.
    *   `shapeMasks.ts`: Generates boolean shape masks for stones.
    *   `render.tsx`: Renders stones to SVG using shape masks and stone qualities.
    *   `utils.ts`: Utility functions (e.g., for UI messages).
    *   `/tests`: Contains Jest unit tests.
        *   `/services`: Tests for service classes.
        *   Other tests for core logic and components.
*   `/dist`: Contains the compiled/built application (after running `npm run build`).
*   `.github/workflows`: Contains GitHub Actions workflow configurations.
*   `jest.config.js`: Jest configuration.
*   `vite.config.ts`: Vite configuration.
*   `tsconfig.json`: TypeScript configuration.

## Coding Standards / Typing

*   The project is written in TypeScript with a focus on strong typing, using ESLint and Prettier for code style.
*   Interfaces for core services and data structures are defined in `src/interfaces/`.

## Deliverables

*   Fully-typed source code for the game.
*   This updated `README.md` file.
*   Unit tests for core logic and components.
*   A functional SolidJS web application.
