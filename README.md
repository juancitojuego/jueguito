# Stone-Arena CLI Game

This is a command-line interface (CLI) game based on procedurally generated stones. This repository contains the foundational layer for the game.

## Features Implemented

*   **Seed & RNG Core**: Prompts for a seed on the first run (or loads from save). Initializes a deterministic RNG for all game events. Stone properties (color, shape, weight, hardness, magic) are derived deterministically from their own seeds.
*   **Stone Generator Utility**: A `createStone()` function generates fully-typed stone objects with random properties and a creation timestamp.
*   **Global Opponent Queue**: A pre-seeded list of opponent stones is built at game start and persisted. The queue regenerates when exhausted.
*   **Inventory Manager**: Manages an in-memory list of player-owned stones, sorted by creation date. Game state (seed, gold, stones, opponent index, salt) is saved to a JSON file (`~/.stone-crafter.json`).
*   **Robust Persistence**: Auto-saves after most state changes and on exit. Handles missing or corrupted save files gracefully.
*   **Testing**: Includes a Jest test suite with high coverage for core logic.

## Prerequisites

*   Node.js (version 20 or higher recommended)
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

3.  **Build the TypeScript code:**
    ```bash
    npm run build
    ```

4.  **Run the game:**
    ```bash
    npm start
    ```
    Alternatively, if you've linked the package or installed it globally (after `npm link` or `npm install -g .` from the project root):
    ```bash
    stone-crafter
    ```

## Development

*   **Run in development mode (auto-rebuild on changes):**
    ```bash
    npm run dev
    ```
    This typically requires `nodemon` or similar, which is not explicitly in `package.json` but implied by the script. (Note: The `dev` script `tsc -w & nodemon dist/index.js` might need `nodemon` installed globally or as a dev dependency).

*   **Run tests:**
    ```bash
    npm test
    ```

*   **Linting/Formatting**: ESLint and Prettier are intended for use (configuration may be needed).

## Project Structure

*   `/src`: Contains the TypeScript source code.
    *   `index.ts`: Main game logic and blessed UI.
    *   `stone.ts`: Stone object definition, quality derivation, PRNG.
    *   `store.ts`: Save/load game data logic.
    *   `render.ts`: ASCII art rendering for stones.
    *   `/tests`: Contains Jest unit tests.
*   `/dist`: Contains the compiled JavaScript code (after running `npm run build`).

## Language & Tools

*   TypeScript 5.x
*   Node.js 20
*   blessed (for terminal UI)
*   seedrandom (for deterministic RNG)
*   chalk (for terminal colors)
*   Jest (for testing)
