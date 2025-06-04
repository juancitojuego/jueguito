// src/player_actions.ts
import { GameState, saveGame } from './game_state';
import { StoneQualities, createStone, generateNewStoneSeed, mulberry32 } from './stone_mechanics';

export interface CrackOpenStoneResult {
    newStones: StoneQualities[];
    message: string;
}

export function crackOpenStone(gameState: GameState): CrackOpenStoneResult {
    if (!gameState.equippedStoneId) {
        return { newStones: [], message: "No stone equipped to crack open." };
    }

    const equippedStone = gameState.getStoneById(gameState.equippedStoneId);
    if (!equippedStone) {
        // This case should ideally not happen if equippedStoneId is always valid
        return { newStones: [], message: "Equipped stone not found in inventory. Cannot crack open." };
    }

    const originalStoneSeed = equippedStone.seed;
    // console.log(`Cracking open: ${equippedStone.name} (Seed: ${originalStoneSeed})`);

    // Remove the equipped stone from inventory.
    gameState.removeStoneFromInventory(originalStoneSeed);

    const newStones: StoneQualities[] = [];

    // Create a deterministic PRNG for this specific action instance
    // It's seeded by a combination of game state elements that were present *before* this action started modifying state
    // (like removing the original stone).
    const deterministicActionPrng = mulberry32(gameState.gameSeed + originalStoneSeed + (gameState.stones.length + 1)); // +1 because original stone was just removed for calculation

    // Always generate one new stone
    const stoneSeed1 = generateNewStoneSeed(deterministicActionPrng);
    const stone1 = createStone(stoneSeed1);
    newStones.push(stone1);
    gameState.addStoneToInventory(stone1);
    // console.log(`Found new stone: ${stone1.name} (Seed: ${stone1.seed})`);

    // 10% chance for a second new stone
    if ((deterministicActionPrng() % 100) < 10) {
        const stoneSeed2 = generateNewStoneSeed(deterministicActionPrng);
        const stone2 = createStone(stoneSeed2);
        newStones.push(stone2);
        gameState.addStoneToInventory(stone2);
        // console.log(`Found a second new stone: ${stone2.name} (Seed: ${stone2.seed})`);
    }

    // 1% chance for a third new stone (independent roll)
    if ((deterministicActionPrng() % 100) < 1) {
        const stoneSeed3 = generateNewStoneSeed(deterministicActionPrng);
        const stone3 = createStone(stoneSeed3);
        newStones.push(stone3);
        gameState.addStoneToInventory(stone3);
        // console.log(`Found a third new stone: ${stone3.name} (Seed: ${stone3.seed})`);
    }

    // Equip the first new stone generated
    if (newStones.length > 0) {
        gameState.equipStone(newStones[0].seed);
        // console.log(`Equipped new stone: ${newStones[0].name}`);
    } else {
        // If somehow no new stones were created (e.g. if logic changes), ensure autoEquip handles it.
        // However, this action guarantees at least one new stone.
        // The removeStoneFromInventory already called autoEquipNextAvailable.
        // If newStones[0] was added, equipStone overrides any prior auto-equip.
    }

    saveGame(gameState); // Auto-save game state

    let message = `Cracked open Stone ${originalStoneSeed}. Found ${newStones.length} new stone(s).`;
    if (newStones.length > 0) {
        message += ` ${newStones[0].name} is now equipped.`;
    } else {
        message += ` Your inventory might have auto-equipped another stone if available.`
    }
    return { newStones, message };
}

export interface SalvageStoneResult {
    currencyGained: number;
    message: string;
}

export function salvageStone(gameState: GameState): SalvageStoneResult {
    if (!gameState.equippedStoneId) {
        return { currencyGained: 0, message: "No stone equipped to salvage." };
    }

    const equippedStone = gameState.getStoneById(gameState.equippedStoneId);
    if (!equippedStone) {
        // This case should ideally not happen if equippedStoneId is always valid
        return { currencyGained: 0, message: "Equipped stone not found in inventory. Cannot salvage." };
    }

    const currencyGained = equippedStone.rarity * 10;
    // console.log(`Salvaging: ${equippedStone.name} (Seed: ${equippedStone.seed}) for ${currencyGained} currency.`);

    gameState.updateCurrency(currencyGained); // Use the method in GameState

    const originalStoneSeed = equippedStone.seed;
    gameState.removeStoneFromInventory(originalStoneSeed); // This handles unequipping and auto-equipping next available

    saveGame(gameState); // Auto-save game state

    let message = `Salvaged Stone ${originalStoneSeed} for ${currencyGained} currency.`;
    const newlyEquippedStone = gameState.equippedStoneId ? gameState.getStoneById(gameState.equippedStoneId) : null;
    if (newlyEquippedStone) {
        message += ` ${newlyEquippedStone.name} is now equipped.`;
    } else {
        message += ` No stone is currently equipped.`;
    }

    return { currencyGained, message };
}
