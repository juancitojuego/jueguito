// src/main.ts
import { GameState } from './game_state';
import { GameStateManager } from './game_state_manager';
import { initializeTerminal, terminateApp, term } from './ui';
import { showMainMenu, handleMainMenuAction, MainMenuOption } from './ui/main_menu';

async function main() {
    initializeTerminal();
    term.brightWhite.bold('Stone Crafter - Terminal Edition\n\n');

    const gameStateRef: { current: GameState | null } = { current: null };

    term.dim('Attempting to load saved game...\n');
    gameStateRef.current = GameStateManager.loadGame();

    if (gameStateRef.current) {
        if (gameStateRef.current.playerStats.name.includes("(New") || gameStateRef.current.playerStats.name.includes("(LoadFail")) {
            term.green(`No valid saved game found. Started a new game for player: ${gameStateRef.current.playerStats.name}\n`);
        } else {
            term.green(`Game loaded for player: ${gameStateRef.current.playerStats.name}\n`);
        }
        if (gameStateRef.current && (gameStateRef.current.deck.length === 0 && gameStateRef.current.hand.length === 0 && gameStateRef.current.discardPile.length === 0)) {
            GameStateManager.generateDeck(gameStateRef.current);
            term.dim('Initial deck generated for the game session.\n');
        }
    } else {
        term.red("Critical error: GameState is null after load/new game attempt. Exiting.\n");
        terminateApp(1);
        return;
    }

    term.dim('Press any key to continue to main menu...\n');
    await term.inputField({echo: false}).promise; // Corrected

    let keepRunning = true;
    while (keepRunning) {
        term.clear();
        const selectedOption = await showMainMenu();

        if (selectedOption === null) {
            term.clear();
            term.yellow('Menu selection cancelled. Press any key to show menu again, or CTRL+C to exit.\n');
            await term.inputField({echo: false}).promise; // Corrected
            continue;
        }

        keepRunning = await handleMainMenuAction(selectedOption, gameStateRef);

        if (!keepRunning) {
            break;
        }
    }

    terminateApp();
}

process.on('unhandledRejection', (reason, promise) => {
    term.hideCursor(false);
    term.styleReset();
    term.red(`\n\nUnhandled Rejection at: ${promise}\nReason: ${reason}\n\n`);
    console.error(reason);
    terminateApp(1);
});

process.on('uncaughtException', (err, origin) => {
    term.hideCursor(false);
    term.styleReset();
    term.red(`\n\nUncaught Exception:\nOrigin: ${origin}\nError: ${err.message}\n\n`);
    console.error(err.stack);
    terminateApp(1);
});

main().catch(error => {
    term.hideCursor(false);
    term.styleReset();
    term.red.bold(`\n\nAn unexpected error occurred in main execution: ${error}\n`);
    if (error instanceof Error && error.stack) {
        console.error(error.stack);
    }
    terminateApp(1);
});
