// Constants
const COLORS = ["Red", "Blue", "Green", "Yellow", "Magenta", "Cyan", "White", "Black"];
const SHAPES = ["Cube", "Sphere", "Pyramid", "Prism", "Cylinder"];

// PRNG Functions
/**
 * Mulberry32 PRNG
 * @param {number} seed - A 32-bit integer seed.
 * @returns {function(): number} - A function that returns a pseudo-random number between 0 (inclusive) and 1 (exclusive).
 */
function mulberry32(seed) {
    return function() {
        seed |= 0;
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

/**
 * Generates a new 32-bit integer seed using a PRNG.
 * @param {function(): number} prng - A PRNG function.
 * @returns {number} - A new 32-bit integer seed.
 */
function generateNewStoneSeed(prng) {
    return Math.floor(prng() * 0xFFFFFFFF) | 0;
}

// Stone Quality Derivation
/**
 * Derives stone qualities from a seed.
 * @param {number} seed - A 32-bit integer seed.
 * @returns {object} - An object with stone qualities: { seed, color, rarity, weight, shape, hardness }.
 */
function deriveStoneQualities(seed) {
    const prng = mulberry32(seed);

    const colorIndex = Math.floor(prng() * COLORS.length);
    const color = COLORS[colorIndex];

    const rarity = Math.floor(prng() * 101); // 0-100

    const weight = Math.floor(prng() * 100) + 1; // 1-100

    const shapeIndex = Math.floor(prng() * SHAPES.length);
    const shape = SHAPES[shapeIndex];

    const hardness = parseFloat((prng() * 0.99 + 0.01).toFixed(2)); // 0.01-1.00

    return {
        seed: seed,
        color: color,
        rarity: rarity,
        weight: weight,
        shape: shape,
        hardness: hardness
    };
}

// SaveData structure:
// {
//   stones: number[], // Array of 32-bit integer stone seeds
//   currency: number,
//   currentStoneSeed: number | null // Seed of the currently active stone, or null
// }

// Save/Load Functions
function getDefaultSaveData() {
    return {
        stones: [],
        currency: 0,
        currentStoneSeed: null
    };
}

function loadData() {
    try {
        const savedDataString = localStorage.getItem("stoneCrafterSaveData");
        if (savedDataString) {
            let parsedData = JSON.parse(savedDataString);

            if (typeof parsedData !== 'object' || parsedData === null) {
                console.warn("Invalid saved data format (not an object). Using default data.");
                return getDefaultSaveData();
            }

            parsedData.stones = Array.isArray(parsedData.stones) && parsedData.stones.every(s => typeof s === 'number' && !isNaN(s))
                ? parsedData.stones.map(s => s | 0)
                : [];

            parsedData.currency = (typeof parsedData.currency === 'number' && !isNaN(parsedData.currency))
                ? parsedData.currency
                : 0;

            parsedData.currentStoneSeed = (typeof parsedData.currentStoneSeed === 'number' && !isNaN(parsedData.currentStoneSeed)) || parsedData.currentStoneSeed === null
                ? (parsedData.currentStoneSeed === null ? null : parsedData.currentStoneSeed | 0)
                : null;

            if (parsedData.currentStoneSeed !== null && !parsedData.stones.includes(parsedData.currentStoneSeed)) {
                console.warn("currentStoneSeed not found in stones array during load. Resetting.");
                parsedData.currentStoneSeed = parsedData.stones.length > 0 ? parsedData.stones[0] : null;
            } else if (parsedData.stones.length === 0) {
                parsedData.currentStoneSeed = null;
            }

            return {
                stones: parsedData.stones,
                currency: parsedData.currency,
                currentStoneSeed: parsedData.currentStoneSeed
            };
        }
    } catch (error) {
        console.error("Error loading data from localStorage:", error);
    }
    return getDefaultSaveData();
}

function saveData(data) {
    try {
        if (typeof data !== 'object' || data === null) {
            console.error("Attempted to save invalid data type:", data);
            return;
        }

        const cleanData = {
            stones: Array.isArray(data.stones)
                ? data.stones.filter(s => typeof s === 'number' && !isNaN(s)).map(s => s | 0)
                : [],
            currency: (typeof data.currency === 'number' && !isNaN(data.currency)) ? data.currency : 0,
            currentStoneSeed: (typeof data.currentStoneSeed === 'number' && !isNaN(data.currentStoneSeed)) || data.currentStoneSeed === null
                ? (data.currentStoneSeed === null ? null : data.currentStoneSeed | 0)
                : null
        };

        if (cleanData.currentStoneSeed !== null && !cleanData.stones.includes(cleanData.currentStoneSeed)) {
            console.warn("currentStoneSeed for saving is not in stones array. Setting to first stone or null.");
            cleanData.currentStoneSeed = cleanData.stones.length > 0 ? cleanData.stones[0] : null;
        } else if (cleanData.stones.length === 0) {
             cleanData.currentStoneSeed = null;
        }

        const dataString = JSON.stringify(cleanData);
        localStorage.setItem("stoneCrafterSaveData", dataString);
    } catch (error) {
        console.error("Error saving data to localStorage:", error);
    }
}

// Global Variables and DOM References
let currentSaveData;
let currentStoneDetails;
let gamePrng;

// DOM Elements
let stoneVisualRepresentation, stoneSeed, stoneColor, stoneShape, stoneRarity, stoneHardness, stoneWeight;
let openStoneButton, salvageStoneButton, inventoryButton, closeInventoryButton;
let messageLine, currencyDisplay;
let inventorySection, inventoryList;
let initialSetupSection, seedInput, startGameButton, startRandomGameButton;
let mainGameSection;

function initializeDOMReferences() {
    stoneVisualRepresentation = document.getElementById('stone-visual-representation');
    stoneSeed = document.getElementById('stone-seed');
    stoneColor = document.getElementById('stone-color');
    stoneShape = document.getElementById('stone-shape');
    stoneRarity = document.getElementById('stone-rarity');
    stoneHardness = document.getElementById('stone-hardness');
    stoneWeight = document.getElementById('stone-weight');

    openStoneButton = document.getElementById('open-stone-button');
    salvageStoneButton = document.getElementById('salvage-stone-button');
    inventoryButton = document.getElementById('inventory-button');
    closeInventoryButton = document.getElementById('close-inventory-button');

    messageLine = document.getElementById('message-line');
    currencyDisplay = document.getElementById('currency-display');

    inventorySection = document.getElementById('inventory-section');
    inventoryList = document.getElementById('inventory-list');

    initialSetupSection = document.getElementById('initial-setup-section');
    seedInput = document.getElementById('seed-input');
    startGameButton = document.getElementById('start-game-button');
    startRandomGameButton = document.getElementById('start-random-game-button');

    mainGameSection = document.getElementById('main-game-section');
}

// UI Update Functions
function updateCurrentStoneDetails() {
    const na = "N/A";
    if (currentStoneDetails) {
        if (stoneSeed) stoneSeed.textContent = currentStoneDetails.seed;
        if (stoneColor) stoneColor.textContent = currentStoneDetails.color;
        if (stoneShape) stoneShape.textContent = currentStoneDetails.shape;
        if (stoneRarity) stoneRarity.textContent = currentStoneDetails.rarity;
        if (stoneHardness) stoneHardness.textContent = currentStoneDetails.hardness.toFixed(2);
        if (stoneWeight) stoneWeight.textContent = currentStoneDetails.weight;
    } else {
        if (stoneSeed) stoneSeed.textContent = na;
        if (stoneColor) stoneColor.textContent = na;
        if (stoneShape) stoneShape.textContent = na;
        if (stoneRarity) stoneRarity.textContent = na;
        if (stoneHardness) stoneHardness.textContent = na;
        if (stoneWeight) stoneWeight.textContent = na;
    }
}

function mapColorToHex(colorName) {
    const colorMap = {
        "Red": "#FF0000", "Blue": "#0000FF", "Green": "#008000",
        "Yellow": "#FFFF00", "Magenta": "#FF00FF", "Cyan": "#00FFFF",
        "White": "#FFFFFF", "Black": "#000000"
    };
    return colorMap[colorName] || colorName.toLowerCase(); // Fallback to lowercase name
}

function renderStoneToHTML(qualities) {
    if (!stoneVisualRepresentation) return;
    stoneVisualRepresentation.innerHTML = ''; // Clear previous content

    if (!qualities) {
        stoneVisualRepresentation.textContent = 'No Stone Selected';
        return;
    }

    const stoneElement = document.createElement('div');
    const stoneColorHex = mapColorToHex(qualities.color);

    // Basic styles
    stoneElement.style.width = '100px';
    stoneElement.style.height = '100px';
    stoneElement.style.backgroundColor = stoneColorHex;
    stoneElement.style.margin = 'auto';
    stoneElement.style.border = '2px solid #333';
    stoneElement.style.display = 'flex';
    stoneElement.style.alignItems = 'center';
    stoneElement.style.justifyContent = 'center';
    stoneElement.style.fontSize = '12px';
    stoneElement.style.textAlign = 'center';
    stoneElement.style.overflow = 'hidden'; // Prevents text spill for some shapes

    // Text color based on background
    if (qualities.color === "White" || qualities.color === "Yellow" || qualities.color === "Cyan") {
        stoneElement.style.color = 'black';
    } else {
        stoneElement.style.color = 'white';
    }

    let textContent = `${qualities.shape}\n(H: ${qualities.hardness.toFixed(2)})`;

    // Shape Styling
    switch (qualities.shape) {
        case "Sphere":
            stoneElement.style.borderRadius = '50%';
            break;
        case "Cube":
            stoneElement.style.borderRadius = '0%';
            break;
        case "Pyramid":
            stoneElement.style.width = '0';
            stoneElement.style.height = '0';
            stoneElement.style.borderLeft = '50px solid transparent';
            stoneElement.style.borderRight = '50px solid transparent';
            stoneElement.style.borderBottom = `100px solid ${stoneColorHex}`;
            stoneElement.style.backgroundColor = 'transparent'; // No background color for the div itself
            stoneElement.style.color = mapColorToHex("Black"); // Text color for pyramid (hard to place)
                                                           // Text content might be better omitted or absolutely positioned
            textContent = ""; // Text is hard to position nicely in a CSS triangle
            break;
        case "Prism":
            stoneElement.style.width = '120px';
            stoneElement.style.height = '80px';
            stoneElement.style.borderRadius = '5px';
            break;
        case "Cylinder":
            // Simple rounded rectangle for cylinder
            stoneElement.style.width = '90px';
            stoneElement.style.height = '110px';
            stoneElement.style.borderRadius = '45px / 30px'; // More pill-like
            break;
        default:
            // Default square/rectangle
            break;
    }

    // Rarity Indication
    if (qualities.rarity > 75) {
        stoneElement.style.borderColor = 'gold';
        stoneElement.style.borderWidth = '3px';
    }
    if (qualities.rarity > 90) {
        stoneElement.style.boxShadow = '0 0 15px 5px yellow';
        if (qualities.shape !== "Pyramid") { // Avoid adding star to pyramid text if empty
             textContent += "\n⭐";
        }
    }

    if (textContent) { // Only add text if it's not empty (e.g. for pyramid)
        stoneElement.textContent = textContent;
    }

    stoneVisualRepresentation.appendChild(stoneElement);
}

function refreshCurrentStoneDisplay() {
    if (currentSaveData.currentStoneSeed !== null) {
        currentStoneDetails = deriveStoneQualities(currentSaveData.currentStoneSeed);
    } else {
        currentStoneDetails = null;
    }
    updateCurrentStoneDetails(); // Already has null checks for its elements
    renderStoneToHTML(currentStoneDetails); // Already has null check for stoneVisualRepresentation

    if (currencyDisplay && currentSaveData) {
         currencyDisplay.textContent = `Currency: ${currentSaveData.currency}`;
    }
}

let messageTimeout;
function showMessage(msg, duration = 3000) {
    if (messageLine) {
        messageLine.textContent = msg;
        if (messageTimeout) clearTimeout(messageTimeout);
        if (duration > 0) {
            messageTimeout = setTimeout(() => {
                if (messageLine) messageLine.textContent = "";
            }, duration);
        }
    }
}

// Game Action Functions
function openStoneAction() {
    if (!currentSaveData || currentSaveData.currentStoneSeed === null || !currentStoneDetails) {
        showMessage("No current stone to open!");
        return;
    }

    const openedStoneSeed = currentSaveData.currentStoneSeed;
    if (!currentSaveData.stones) currentSaveData.stones = [];
    currentSaveData.stones = currentSaveData.stones.filter(s => s !== openedStoneSeed);

    const stoneSpecificPrng = mulberry32(openedStoneSeed ^ Date.now());
    let numNewStones = 1;
    if (gamePrng && gamePrng() < 0.10) numNewStones++;
    if (gamePrng && gamePrng() < 0.01) numNewStones++;

    const newStonesGenerated = [];
    for (let i = 0; i < numNewStones; i++) {
        newStonesGenerated.push(generateNewStoneSeed(stoneSpecificPrng));
    }
    currentSaveData.stones.push(...newStonesGenerated);

    if (newStonesGenerated.length > 0) {
        currentSaveData.currentStoneSeed = newStonesGenerated[0];
    } else if (currentSaveData.stones.length > 0) {
        currentSaveData.currentStoneSeed = currentSaveData.stones[0];
    } else {
        currentSaveData.currentStoneSeed = null;
    }

    saveData(currentSaveData);
    refreshCurrentStoneDisplay();
    showMessage(`Opened stone. Obtained ${newStonesGenerated.length} new stone(s).`);
}

function salvageStoneAction() {
    if (!currentSaveData || currentSaveData.currentStoneSeed === null || !currentStoneDetails) {
        showMessage("No current stone to salvage!");
        return;
    }

    const salvagedStoneSeed = currentSaveData.currentStoneSeed;
    const salvageValue = currentStoneDetails.rarity * 10;
    currentSaveData.currency = (currentSaveData.currency || 0) + salvageValue;

    if (!currentSaveData.stones) currentSaveData.stones = [];
    currentSaveData.stones = currentSaveData.stones.filter(s => s !== salvagedStoneSeed);

    if (currentSaveData.stones.length > 0) {
        currentSaveData.currentStoneSeed = currentSaveData.stones[0];
    } else {
        currentSaveData.currentStoneSeed = null;
    }

    saveData(currentSaveData);
    refreshCurrentStoneDisplay();
    showMessage(`Salvaged stone for ${salvageValue}. Currency: ${currentSaveData.currency}`);
}

// Inventory Functions
function displayInventory() {
    if (!inventoryList || !currentSaveData || !currentSaveData.stones) return;
    inventoryList.innerHTML = ""; // Clear previous items

    if (currentSaveData.stones.length === 0) {
        const li = document.createElement('li');
        li.textContent = "No stones in inventory.";
        inventoryList.appendChild(li);
        return;
    }

    currentSaveData.stones.forEach(seed => {
        const qualities = deriveStoneQualities(seed);
        const li = document.createElement('li');
        li.textContent = `${(seed || 0).toString().substring(0, 8)}.. - ${qualities.color} ${qualities.shape} (R${qualities.rarity})`;
        li.style.cursor = 'pointer';
        li.addEventListener('click', () => {
            if (currentSaveData) {
                currentSaveData.currentStoneSeed = seed;
                saveData(currentSaveData);
                refreshCurrentStoneDisplay();
                hideInventory();
            }
        });
        inventoryList.appendChild(li);
    });
}

function showInventory() {
    displayInventory(); // Already has null checks for its elements
    if (inventorySection) inventorySection.style.display = 'block';
}

function hideInventory() {
    if (inventorySection) inventorySection.style.display = 'none';
}

// Initial Setup and Game Initialization
function startGame(initialSeed) {
    const seedToStart = initialSeed >>> 0;

    if (!currentSaveData) currentSaveData = getDefaultSaveData();
    if (!currentSaveData.stones) currentSaveData.stones = [];

    currentSaveData.currentStoneSeed = seedToStart;
    if (!currentSaveData.stones.includes(seedToStart)) {
        currentSaveData.stones.push(seedToStart);
    }

    if (initialSetupSection) initialSetupSection.style.display = 'none';
    if (mainGameSection) mainGameSection.style.display = 'block';

    saveData(currentSaveData);
    refreshCurrentStoneDisplay();
    showMessage(`Game started with seed: ${seedToStart}. Your first stone is active.`);
}

function handleStartGameButton() {
    if (!seedInput) return;
    const seedStr = seedInput.value.trim();
    let seedNum;
    let localPrng = mulberry32(Date.now() + Math.random() * 10000);


    if (seedStr === "" || isNaN(parseInt(seedStr, 10))) {
        seedNum = generateNewStoneSeed(localPrng) >>> 0;
        showMessage(`No valid seed entered, starting with random seed: ${seedNum}`, 4000);
    } else {
        seedNum = parseInt(seedStr, 10) >>> 0;
    }
    startGame(seedNum);
}

function handleStartRandomGameButton() {
    let localPrng = mulberry32(Date.now() + Math.random() * 10000);
    const randomSeed = generateNewStoneSeed(localPrng) >>> 0;
    startGame(randomSeed);
}

function initializeGame() {
    initializeDOMReferences();

    gamePrng = mulberry32(Date.now());
    currentSaveData = loadData(); // Returns default if nothing/invalid is loaded

    // Ensure currency is displayed even on fresh start or load.
    if (currencyDisplay && currentSaveData) {
        currencyDisplay.textContent = `Currency: ${currentSaveData.currency}`;
    }

    if (initialSetupSection) { // Check if initialSetupSection exists
        if (currentSaveData.stones.length === 0 && currentSaveData.currentStoneSeed === null) {
            initialSetupSection.style.display = 'block';
            if (mainGameSection) mainGameSection.style.display = 'none';
            showMessage("Welcome! Enter a seed or start a random game.", 0);
        } else {
            initialSetupSection.style.display = 'none';
            if (mainGameSection) mainGameSection.style.display = 'block';

            if (currentSaveData.currentStoneSeed === null || !currentSaveData.stones.includes(currentSaveData.currentStoneSeed)) {
                if (currentSaveData.stones.length > 0) {
                    currentSaveData.currentStoneSeed = currentSaveData.stones[0];
                } else {
                    currentSaveData.currentStoneSeed = null;
                    // This state means stones array was perhaps empty or became empty.
                    // Revert to setup screen.
                    initialSetupSection.style.display = 'block';
                    if (mainGameSection) mainGameSection.style.display = 'none';
                    showMessage("No active stone. Please start a new game or select one.", 0);
                }
            }
            saveData(currentSaveData);
            refreshCurrentStoneDisplay(); // This will also update currency display
            if (initialSetupSection.style.display === 'none') { // Only show if not reverting to setup
                showMessage("Game loaded successfully!", 3000);
            }
        }
    } else {
        console.error("Initial setup section not found!");
        // Fallback for critical missing element
        if (mainGameSection) mainGameSection.style.display = 'none';
        document.body.innerHTML = "Error: Critical UI element 'initial-setup-section' missing. Cannot start game.";
        return; // Stop further execution
    }


    // Add event listeners only if buttons exist
    if (openStoneButton) openStoneButton.addEventListener('click', openStoneAction);
    if (salvageStoneButton) salvageStoneButton.addEventListener('click', salvageStoneAction);
    if (inventoryButton) inventoryButton.addEventListener('click', showInventory);
    if (closeInventoryButton) closeInventoryButton.addEventListener('click', hideInventory);
    if (startGameButton) startGameButton.addEventListener('click', handleStartGameButton);
    if (startRandomGameButton) startRandomGameButton.addEventListener('click', handleStartRandomGameButton);
}

// Call initializeGame when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeGame);

console.log("script.js loaded and DOM interaction setup initiated.");
