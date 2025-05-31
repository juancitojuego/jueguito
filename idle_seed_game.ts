import * as readline from 'readline';
import * as fs from 'fs';
import * as crypto from 'crypto';

// --- Savegame Path ---
const SAVEGAME_PATH = 'savegame.json';

// --- Global Game State ---
let inventory: { seed: string, createdAt: number }[] = [];
let currency: number = 0;
let isInventoryScreenActive = false; // Global flag for inventory screen state

// --- Readline Setup ---
// rl is defined globally so it can be accessed by signal handlers and saveAndExit
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// --- Utility Functions ---
function generateNewUniqueSeed(): string {
    return crypto.randomUUID();
}

// --- ASCII Thumbnail Generation ---
function asciiThumbnail(rockProperties: StoneProperties): string {
    const line1: string[] = [' ', ' ', ' '];
    const line2: string[] = [' ', ' ', ' '];
    const line3: string[] = [' ', ' ', ' '];
    const isRare = rockProperties.magic >= 70;

    switch (rockProperties.shape) {
        case "Cube":    line1[1] = '■'; line2[0] = '■'; line2[1] = ' '; line2[2] = '■'; line3[1] = '■'; break;
        case "Sphere":  line1[1] = '●'; line2[0] = '●'; line2[1] = ' '; line2[2] = '●'; line3[1] = '●'; break;
        case "Pyramid": line1[1] = '▲'; line2[0] = '▲'; line2[1] = '▲'; line2[2] = '▲'; line3[0] = '▲'; line3[1] = '▲'; line3[2] = '▲'; break;
        case "Prism":   line1[0]='▬'; line1[1]='▬'; line1[2]='▬'; line2[0]='|'; line2[1]=' '; line2[2]='|'; line3[0]='▬'; line3[1]='▬'; line3[2]='▬'; break;
        case "Cylinder":line1[1]='⌒'; line2[0]='('; line2[1]=' '; line2[2]=')'; line3[1]='_'; break;
        default:        line2[1] = '?'; break;
    }
    if (isRare) line2[2] = '★';

    return `\n  ${line1.join('')}\n  ${line2.join('')}\n  ${line3.join('')}`;
}

// --- Persistence Functions ---
function loadGame(): void {
    console.log("Attempting to load game...");
    try {
        if (fs.existsSync(SAVEGAME_PATH)) {
            const data = fs.readFileSync(SAVEGAME_PATH, 'utf8');
            const parsedData = JSON.parse(data);
            if (parsedData && Array.isArray(parsedData.inventory) && typeof parsedData.currency === 'number') {
                inventory = parsedData.inventory.map((item: any) => ({
                    seed: String(item.seed || generateNewUniqueSeed()),
                    createdAt: Number(item.createdAt || Date.now())
                }));
                currency = parsedData.currency;
                console.log(`Game loaded. Currency: ${currency}, Inventory items: ${inventory.length}`);
            } else {
                console.log("Save file found but malformed. Starting new game.");
                inventory = [];
                currency = 0;
            }
        } else {
            console.log("No save file found. Starting new game.");
            inventory = [];
            currency = 0;
        }
    } catch (error: any) {
        console.error("Error loading game:", error.message);
        console.log("Starting new game due to error.");
        inventory = [];
        currency = 0;
    }
}

function saveGame(): void {
    try {
        const dataToSave = {
            inventory: inventory.map(item => ({ seed: item.seed, createdAt: item.createdAt })),
            currency: currency
        };
        fs.writeFileSync(SAVEGAME_PATH, JSON.stringify(dataToSave, null, 2), 'utf8');
        // console.log("Game saved."); // Keep this quiet as it's called often with saveAndExit
    } catch (error: any) {
        console.error("Error saving game:", error.message);
    }
}

function saveAndExit(): void {
    console.log("\nExiting and saving game...");
    saveGame();
    if (rl && !(rl as any).closed) {
        rl.close();
    }
    process.exit(0);
}

// --- Process Exit Handlers ---
process.on('uncaughtException', (err) => {
    console.error('\nAn unexpected error occurred:', err.message);
    if (process.stdin.isTTY && process.stdin.isRaw) {
        process.stdin.setRawMode(false);
    }
    if (rl && !(rl as any).closed) {
        try {
            rl.close();
        } catch (closeError) {
            console.error("Error closing readline during uncaughtException:", closeError);
        }
    }
    process.exit(1);
});

process.on('SIGINT', () => {
    if (process.stdin.isTTY && process.stdin.isRaw) {
        process.stdin.setRawMode(false);
        console.log("\nRestored terminal mode.");
    }
    saveAndExit();
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
        }
    };
}

// --- String to Seed Conversion ---
function stringToSeed(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
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

// --- Stone Properties Generation ---
function generateStoneProperties(seedStr: string): StoneProperties {
    const seedNumber = stringToSeed(seedStr);
    const localPrng = mulberry32(seedNumber);

    const color = COLORS[Math.floor(localPrng.next() * COLORS.length)];
    const shape = SHAPES[Math.floor(localPrng.next() * SHAPES.length)];
    const weight = Math.floor(localPrng.next() * 100) + 1;
    const roughness = parseFloat(localPrng.next().toFixed(2));
    const magic = Math.floor(localPrng.next() * 101);

    return { color, shape, weight, roughness, magic };
}

// --- Display Properties ---
function displayStoneProperties(properties: StoneProperties | null, seed: string | null, contextMessage?: string): void {
    if (!properties || !seed) {
        return;
    }
    if(contextMessage) console.log(contextMessage);

    const rareMarker = properties.magic >= 70 ? " ★ Rare!" : "";
    // console.log(`\n--- Stone Properties (Seed: ${seed}) ---`); // This line is often redundant if contextMessage is used
    console.log(`  Color:     ${properties.color}`);
    console.log(`  Shape:     ${properties.shape}`);
    console.log(`  Weight:    ${properties.weight} kg`);
    console.log(`  Roughness: ${properties.roughness.toFixed(2)}`);
    console.log(`  Magic:     ${properties.magic}${rareMarker}`);
    console.log("------------------------------------");
}

// --- Prompts ---
function askQuestion(query: string): Promise<string> {
    return new Promise(resolve => rl.question(query, resolve));
}

// --- Inventory Screen ---
async function showInventoryScreen(): Promise<void> {
    if (isInventoryScreenActive) return;
    isInventoryScreenActive = true;

    if (!process.stdin.isTTY) {
        console.log("\nInteractive inventory requires a TTY environment. Showing basic list instead.");
        displayBasicInventoryList(); // Fallback for non-TTY
        isInventoryScreenActive = false;
        await showMainMenu(); // Return to main menu
        return;
    }

    let selectedIndex = 0;
    const inventorySnapshot = [...inventory].sort((a, b) => { // Fresh snapshot and sort
        if (a.createdAt === 0 && b.createdAt !== 0) return -1;
        if (a.createdAt !== 0 && b.createdAt === 0) return 1;
        return a.createdAt - b.createdAt;
    });

    const inventoryKeypressHandler = (str: string, key: any) => {
        if (key.name === 'escape' || key.name === 'q' || (key.ctrl && key.name === 'c')) {
            cleanupInventoryViewAndShowMenu();
            return;
        }
        if (key.name === 'up') {
            selectedIndex = Math.max(0, selectedIndex - 1);
        } else if (key.name === 'down') {
            selectedIndex = Math.min(inventorySnapshot.length - 1, selectedIndex + 1);
        }
        drawInventoryScreen();
    };

    const drawInventoryScreen = () => {
        console.clear();
        console.log("--- Your Inventory --- (Up/Down to navigate, ESC/Q to return to Main Menu)");
        console.log(`Currency: ${currency}\n`);

        if (inventorySnapshot.length === 0) {
            console.log("Inventory is empty.");
        } else {
            inventorySnapshot.forEach((rock, index) => {
                const cursor = (index === selectedIndex) ? '▶' : ' ';
                const dateString = rock.createdAt === 0 ? "Original" : new Date(rock.createdAt).toLocaleDateString();
                // Show more of the seed for better identification
                const seedDisplay = rock.seed.length > 16 ? rock.seed.substring(0, 8) + "..." + rock.seed.substring(rock.seed.length -4) : rock.seed;
                console.log(`${cursor} ${seedDisplay} (Created: ${dateString})`);
            });

            if (selectedIndex >= 0 && selectedIndex < inventorySnapshot.length) {
                const selectedRockSeed = inventorySnapshot[selectedIndex].seed;
                const rockProperties = generateStoneProperties(selectedRockSeed);

                console.log("\n--- Selected Rock Details ---");
                // Pass seed explicitly to displayStoneProperties
                displayStoneProperties(rockProperties, selectedRockSeed, `Properties for seed: ${selectedRockSeed}`);

                const thumbnail = asciiThumbnail(rockProperties);
                console.log("--- Thumbnail ---");
                console.log(thumbnail);
                console.log("-----------------");
            }
        }
        console.log("\n(Actions on selected rock: To be implemented - e.g., Salvage, Set Active)");
    };

    const cleanupInventoryViewAndShowMenu = () => {
        if (process.stdin.isTTY && process.stdin.isRaw) { // Check TTY before attempting to setRawMode
            process.stdin.setRawMode(false);
        }
        process.stdin.removeListener('keypress', inventoryKeypressHandler);
        isInventoryScreenActive = false;
        console.clear();
        showMainMenu(); // Return to the main menu
    };

    if (process.stdin.isTTY) { // Check TTY before setting up listeners
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', inventoryKeypressHandler);
    }

    drawInventoryScreen();
}

function displayBasicInventoryList() {
    console.log("\n--- Inventory (Basic List) ---");
    if (inventory.length === 0) {
        console.log("Your inventory is empty.");
    } else {
        const displayInventory = [...inventory].sort((a,b) => {
            if (a.createdAt === 0 && b.createdAt !== 0) return -1;
            if (a.createdAt !== 0 && b.createdAt === 0) return 1;
            return a.createdAt - b.createdAt;
        });
        displayInventory.forEach((item, index) => {
            const itemProps = generateStoneProperties(item.seed);
            // Using displayStoneProperties for consistent output
            displayStoneProperties(itemProps, item.seed, `\n[${index + 1}] Rock details:`);
        });
    }
    console.log("-----------------------------");
}


// --- Main Menu (Renamed from showActionMenu for clarity) ---
async function showMainMenu(): Promise<void> {
    if (isInventoryScreenActive) return;

    console.log(`\nCurrency: ${currency}`);
    console.log("Main Menu:");
    console.log("[1] Generate a new rock (adds to inventory)");
    console.log("[2] Open the oldest rock");
    console.log("[3] Inventory (interactive view)");
    console.log("[4] Quit");

    const choice = await askQuestion("> ");

    switch (choice.trim()) {
        case '1':
            const newSeed = generateNewUniqueSeed();
            const newRock = { seed: newSeed, createdAt: Date.now() };
            inventory.push(newRock);
            const props = generateStoneProperties(newSeed);
            displayStoneProperties(props, newSeed, `\nGenerated new rock (Seed: ${newSeed}). Added to inventory.`);
            saveGame(); // Save after adding a rock as it's a persistent change
            break;
        case '2':
            if (inventory.length === 0) {
                console.log("\nYour inventory is empty. Generate some rocks first!");
                // No break here, will fall through to re-show menu
            } else {
                inventory.sort((a, b) => {
                    if (a.createdAt === 0 && b.createdAt !== 0) return -1;
                    if (a.createdAt !== 0 && b.createdAt === 0) return 1;
                    if (a.createdAt === 0 && b.createdAt === 0) return 0;
                    return a.createdAt - b.createdAt;
                });
                const openedRock = inventory.shift();
                if (!openedRock) {
                    console.log("\nError: Could not retrieve rock to open.");
                    // No break here, will fall through
                } else {
                    const openedRockProps = generateStoneProperties(openedRock.seed);
                    displayStoneProperties(openedRockProps, openedRock.seed, `\nOpened rock (Seed: ${openedRock.seed}). Properties:`);

                    const newRocksObtained: { seed: string, createdAt: number }[] = [];
                    newRocksObtained.push({ seed: generateNewUniqueSeed(), createdAt: Date.now() });
                    if (Math.random() < 0.10) newRocksObtained.push({ seed: generateNewUniqueSeed(), createdAt: Date.now() });
                    if (Math.random() < 0.01) newRocksObtained.push({ seed: generateNewUniqueSeed(), createdAt: Date.now() });

                    inventory.push(...newRocksObtained);
                    console.log(`\nYou obtained ${newRocksObtained.length} new rock(s)! Their details:`);
                    for (const newObtainedRock of newRocksObtained) {
                        const properties = generateStoneProperties(newObtainedRock.seed);
                        displayStoneProperties(properties, newObtainedRock.seed);
                    }
                    saveGame(); // Save after opening a rock and getting new ones
                }
            }
            break;
        case '3':
            await showInventoryScreen();
            return; // showInventoryScreen will call showMainMenu upon its exit
        case '4':
            saveAndExit();
            return; // Exit
        default:
            console.log("Invalid choice. Please select a number from the menu.");
            break;
    }
    await showMainMenu(); // Loop back for another action
}

// --- Main Game Function ---
async function startGame(): Promise<void> {
    loadGame(); // First significant call

    const args = process.argv.slice(2);

    if (args.includes("--test")) {
        console.log("Running in --test mode. Save/load functions will run.");
        const testSeed = "test_mode_seed";
        const testProps = generateStoneProperties(testSeed);
        displayStoneProperties(testProps, testSeed, "Generated properties for 'test_mode_seed':");

        if (!inventory.find(item => item.seed === testSeed)) {
            inventory.push({ seed: testSeed, createdAt: Date.now() });
            console.log(`'${testSeed}' added to inventory for testing.`);
        }
        // saveGame(); // Optional: save test changes. For now, --test is read-only unless it uses Quit/SIGINT.
        if (rl && !(rl as any).closed) rl.close();
        process.exit(0);
    } else {
        console.log("\nWelcome to Idle Seed Game!");
        if (inventory.length === 0) {
            console.log("Your inventory is empty. Generating your first rock...");
            const firstSeed = generateNewUniqueSeed();
            inventory.push({ seed: firstSeed, createdAt: Date.now() });
            const firstProps = generateStoneProperties(firstSeed);
            displayStoneProperties(firstProps, firstSeed, "Generated your first rock:");
            saveGame(); // Save after generating the very first rock for a new player.
        }
        await showMainMenu();
    }
}

// --- Entry Point ---
(async () => {
    try {
        await startGame();
    } catch (error: any) {
        console.error("A critical error occurred during game startup or runtime:", error.message);
        if (process.stdin.isTTY && process.stdin.isRaw) {
             process.stdin.setRawMode(false);
        }
        if (rl && !(rl as any).closed) {
            rl.close();
        }
        process.exit(1);
    }
})();
