// src/ui/index.ts
import termkit from 'terminal-kit';

export const term = termkit.terminal;

export function initializeTerminal(): void {
    term.clear();
    term.hideCursor(true); // Hide cursor on init
    term.grabInput(true);

    term.on('key', (name: string, matches: string[], data: any) => {
        if (name === 'CTRL_C') {
            terminateApp(0); // Pass 0 for graceful exit
        }
    });
}

export function terminateApp(exitCode: number = 0): void {
    term.hideCursor(false); // Corrected: false to show cursor
    term.grabInput(false);
    term.moveTo(1, term.height); // Move to bottom before potentially printing more
    term.styleReset();
    // term.clear(); // Optional: clearing screen on exit might hide error messages if process.exit is slow
    console.log('\nExiting Stone Crafter...'); // Ensure this is on a new line after cursor move
    process.exit(exitCode);
}

/**
 * Draws a basic frame or border for the application window.
 * (Placeholder for now, can be expanded later)
 */
export function drawMainFrame(): void {
    // term.drawBuffer();
    // Example: Draw a border around the screen
    // term.clear();
    // term.singleLineBox(
    //     { x: 0, y: 0, width: term.width, height: term.height, title: 'Stone Crafter' }
    // );
    // term.moveTo(2,2);
    // term.defaultColor("Main frame - UI elements will go here.");
}

// Example of how it might be used (will be called from main.ts usually)
/*
if (require.main === module) {
    initializeTerminal();
    drawMainFrame();
    term.moveTo(1, term.height).bgColor('black').color('white')('Press CTRL-C to exit');
}
*/
