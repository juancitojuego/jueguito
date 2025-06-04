// src/ui/index.ts
import termkit from 'terminal-kit';

// Global terminal instance
export const term = termkit.terminal;

/**
 * Initializes the terminal for the application.
 * - Clears the screen.
 * - Hides the cursor.
 * - Sets up a graceful exit on Ctrl+C.
 */
export function initializeTerminal(): void {
    term.clear();
    term.hideCursor();
    term.grabInput(true); // Start grabbing input

    term.on('key', (name: string, matches: string[], data: any) => {
        if (name === 'CTRL_C') {
            terminateApp();
        }
    });
}

/**
 * Gracefully terminates the application.
 * - Shows the cursor.
 * - Exits the process.
 */
export function terminateApp(exitCode: number = 0): void {
    term.showCursor(true); // Ensure cursor is shown
    term.grabInput(false); // Release input grabbing
    term.moveTo(1, term.height); // Move to bottom of screen
    term.styleReset(); // Reset styles
    term.clear(); // Optional: clear screen on exit
    console.log('Exiting Stone Crafter...');
    process.exit(exitCode);
}

/**
 * Draws a basic frame or border for the application window.
 * (Placeholder for now, can be expanded later)
 */
export function drawMainFrame(): void {
    // term.drawBuffer(); // Not typically needed before drawing a new frame like this.
    // Example: Draw a border around the screen
    // term.clear(); // Usually called by initializeTerminal or before specific screen redraws
    // term.singleLineBox(
    //     { x: 0, y: 0, width: term.width, height: term.height, title: 'Stone Crafter' }
    // );
    // term.moveTo(2,2); // Example: move cursor inside box
    // term.defaultColor("Main frame - UI elements will go here.");
}

// Example of how it might be used (will be called from main.ts usually)
/*
if (require.main === module) { // This check is for CommonJS, for ES modules it's different
    initializeTerminal();
    drawMainFrame();
    term.moveTo(1, term.height).bgColor('black').color('white')('Press CTRL-C to exit');

    // Keep process alive until CTRL-C, not ideal for main app loop but ok for simple demo
    // A better approach involves handling input or events.
    // process.stdin.resume(); // Keeps node running
    // For terminal-kit, grabInput usually keeps it alive.
}
*/
