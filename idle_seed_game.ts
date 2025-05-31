import * as readline from 'readline';

// --- Readline Setup ---
// Defined globally so it can be accessed by signal handlers
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// --- Process Exit Handlers ---
// Ensures readline is closed properly on unexpected exits or CTRL-C
process.on('uncaughtException', (err) => {
    console.error('\nAn unexpected error occurred:', err.message);
    console.error("If the error is 'Cannot read properties of null (reading 'Symbol(Symbol.asyncDispose)')', it might be due to an issue with Node.js versions or readline internal state. Ensure rl.close() is called before exiting.");
    if (rl && !(rl as any).closed) { // Check if rl exists and is not already closed
        try {
            rl.close();
        } catch (closeError) {
            console.error("Error closing readline:", closeError);
        }
    }
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\nCaught interrupt signal (CTRL-C). Exiting.');
    if (rl && !(rl as any).closed) {
        rl.close();
    }
    process.exit(0);
});


// --- Mulberry32 PRNG ---
function mulberry32(seed: number) {
    let currentSeed = seed;
    return {
        next: function() {
            let t = currentSeed += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        },
        deriveSeed: function(modifier: number): number {
            // Create a new seed based on current and modifier
            return stringToSeed(currentSeed.toString() + String(modifier));
        }
    };
}

// --- String to Seed Conversion ---
function stringToSeed(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

// --- Interfaces/Types ---
interface StoneProperties {
    color: string;
    shape: string;
    weight: number;
    roughness: number;
    magic: number;
}

// --- Constants ---
const COLORS: string[] = ["Red", "Blue", "Green", "Yellow", "Purple", "Orange", "Black", "White"];
const SHAPES: string[] = ["Cube", "Sphere", "Pyramid", "Prism", "Cylinder"];

// --- Global Game State ---
let currency: number = 0;
let currentSeedString: string = ""; // The string used to generate the current stone
let currentStoneProperties: StoneProperties | null = null;
let prng = mulberry32(0); // PRNG instance, re-initialized with each new primary seed

// --- Stone Generation ---
function generateAndSetCurrentStone(seedStr: string): StoneProperties {
    currentSeedString = seedStr;
    const seedNumber = stringToSeed(seedStr);
    prng = mulberry32(seedNumber); // Re-initialize PRNG for this stone lineage

    const color = COLORS[Math.floor(prng.next() * COLORS.length)];
    const shape = SHAPES[Math.floor(prng.next() * SHAPES.length)];
    const weight = Math.floor(prng.next() * 100) + 1; // 1 - 100
    const roughness = parseFloat(prng.next().toFixed(2)); // 0.00 - 1.00
    const magic = Math.floor(prng.next() * 101); // 0 - 100

    currentStoneProperties = { color, shape, weight, roughness, magic };
    return currentStoneProperties;
}

// --- Display Properties ---
function displayCurrentStoneInfo(): void {
    if (!currentStoneProperties) {
        console.log("No stone to display.");
        return;
    }
    const { color, shape, weight, roughness, magic } = currentStoneProperties;
    const rareMarker = magic >= 70 ? " ★ Rare!" : "";
    console.log(`\n--- Stone Properties (Seed: ${currentSeedString}) ---`);
    console.log(`Color:     ${color}`);
    console.log(`Shape:     ${shape}`);
    console.log(`Weight:    ${weight} kg`);
    console.log(`Roughness: ${roughness.toFixed(2)}`);
    console.log(`Magic:     ${magic}${rareMarker}`);
    console.log(`Currency:  ${currency}`);
    console.log("------------------------------------");
}

// --- Prompts ---
function askQuestion(query: string): Promise<string> {
    // The global rl instance is used here.
    // SIGINT and uncaughtException handlers will manage rl.close() on abrupt exits.
    return new Promise(resolve => rl.question(query, resolve));
}

// --- Action Menu ---
async function showActionMenu(): Promise<void> {
    if (!currentStoneProperties) {
        console.log("No current stone available. Generating a default one to start.");
        generateAndSetCurrentStone("initial_default");
        displayCurrentStoneInfo();
    }

    console.log("\nActions:");
    console.log("[1] Generate a new stone (enter a new seed)");
    console.log("[2] Open current stone (reveals a new stone)");
    console.log("[3] Salvage current stone (gain currency, reveals a new stone)");
    console.log("[4] Quit");

    const choice = await askQuestion("> ");
    let newSeedString: string;

    switch (choice.trim()) {
        case '1':
            newSeedString = await askQuestion("Enter a new stone seed: ");
            if (newSeedString.trim() === "") {
                console.log("No seed entered. Using a random one.");
                newSeedString = "random_" + Math.random().toString(36).substring(7);
            }
            generateAndSetCurrentStone(newSeedString);
            displayCurrentStoneInfo();
            break;
        case '2':
            console.log("Opening the stone...");
            const openedSeedNum = prng.deriveSeed(1); // Use PRNG's internal state + modifier
            newSeedString = "opened_" + openedSeedNum.toString(16).slice(-6); // Create a somewhat unique seed string
            generateAndSetCurrentStone(newSeedString);
            displayCurrentStoneInfo();
            break;
        case '3':
            if (currentStoneProperties) {
                const amountGained = currentStoneProperties.weight + Math.floor(currentStoneProperties.magic / 5);
                currency += amountGained;
                console.log(`Salvaged the stone. Gained ${amountGained} currency. Total currency: ${currency}.`);

                const salvagedSeedNum = prng.deriveSeed(2);
                newSeedString = "salvaged_" + salvagedSeedNum.toString(16).slice(-6);
                generateAndSetCurrentStone(newSeedString);
                displayCurrentStoneInfo();
            } else {
                // This case should ideally not be reached if menu logic is correct
                console.log("Error: No stone was available to salvage.");
            }
            break;
        case '4':
            console.log("Quitting game. Final currency: " + currency);
            if (rl && !(rl as any).closed) { // Ensure rl is available and not closed
                 rl.close();
            }
            process.exit(0);
            // No recursive call here due to process.exit()
        default:
            console.log("Invalid choice. Please select a number from the menu (1-4).");
            break;
    }
    await showActionMenu(); // Loop back to the menu for choices 1, 2, 3 and default
}

// --- Main Game Function ---
async function startGame(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.includes("--test")) {
        console.log("Running in --test mode.");
        generateAndSetCurrentStone("test_seed_123");
        displayCurrentStoneInfo();
        // Example: Test salvaging
        // if (currentStoneProperties) {
        //     const amount = currentStoneProperties.weight;
        //     currency += amount;
        //     console.log(`Test salvage: Gained ${amount}. Total: ${currency}`);
        // }
        if (rl && !(rl as any).closed) rl.close();
        process.exit(0);
    } else {
        let initialSeed = await askQuestion("Enter a stone seed (any string) to begin: ");
        if (initialSeed.trim() === "") {
            console.log("No seed entered. Using 'default_start' as seed.");
            initialSeed = "default_start";
        }
        generateAndSetCurrentStone(initialSeed);
        displayCurrentStoneInfo();
        await showActionMenu(); // Start the interactive action menu loop
    }
}

// --- Entry Point ---
// Wrapped in a try-catch to handle errors during initial startup before global handlers might be fully effective.
(async () => {
    try {
        await startGame();
    } catch (error: any) {
        console.error("A critical error occurred during game startup:", error.message);
        if (rl && !(rl as any).closed) {
            rl.close();
        }
        process.exit(1);
    }
})();
