import { Stone, StoneProperties, RNG } from '../types';
import { initializeRNG } from './seed'; // For stone-specific RNG

export const GRID_WIDTH = 60;
export const GRID_HEIGHT = 60;

export type Grid = string[][];
export type FillCharacter = '█' | '▓' | '▒' | '░' | ' ';

export const CHAR_SET = {
  full: '█' as FillCharacter,
  threeQuarters: '▓' as FillCharacter,
  half: '▒' as FillCharacter,
  quarter: '░' as FillCharacter,
  space: ' ' as FillCharacter,
  magic1: '✦',
  magic2: '∗',
  magic3: '+',
};

export function createEmptyGrid(): Grid {
  const grid: Grid = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    grid[y] = Array(GRID_WIDTH).fill(CHAR_SET.space);
  }
  return grid;
}

export function selectFillCharacter(
  stoneProperties: StoneProperties,
  cellRngValue: number // A random number (0-1) specific to the cell
): FillCharacter {
  const { weight, hardness } = stoneProperties;

  // Determine base character set based on weight
  let primaryChar: FillCharacter = CHAR_SET.quarter;
  let secondaryChar: FillCharacter = CHAR_SET.space;

  if (weight > 85) {
    primaryChar = CHAR_SET.full;
    secondaryChar = CHAR_SET.threeQuarters;
  } else if (weight > 70) {
    primaryChar = CHAR_SET.threeQuarters;
    secondaryChar = CHAR_SET.half;
  } else if (weight > 50) {
    primaryChar = CHAR_SET.half;
    secondaryChar = CHAR_SET.quarter;
  } else if (weight > 30) {
    primaryChar = CHAR_SET.quarter;
    secondaryChar = CHAR_SET.space; // More sparse for lower weight
  } else { // Very light
    primaryChar = CHAR_SET.quarter; // Mostly space or very light fill
    if (cellRngValue < 0.3) return CHAR_SET.quarter;
    return CHAR_SET.space;
  }

  // Hardness influences the mix and consistency.
  // Low hardness (smooth) = more primaryChar.
  // High hardness (rough) = more mix, potentially more secondaryChar or even lighter.
  // Roughness factor: 0 (smoothest) to 1 (roughest)
  const roughness = hardness / 100;

  // If very smooth, mostly primary
  if (roughness < 0.2) {
    return cellRngValue < 0.85 ? primaryChar : secondaryChar;
  }
  // If very rough, more chance of secondary or even lighter
  if (roughness > 0.8) {
    if (cellRngValue < 0.33) return primaryChar;
    if (cellRngValue < 0.66) return secondaryChar;
    return CHAR_SET.quarter; // Introduce even lighter for very rough
  }

  // Default mixing based on cellRngValue
  return cellRngValue < (0.7 - roughness * 0.2) ? primaryChar : secondaryChar;
}

// --- Shape Drawing Functions ---

// Helper to generate a deterministic RNG for a cell based on stone's RNG and cell coordinates
function getCellRNGValue(shapeRNG: RNG, x: number, y: number): number {
    // Simple way to mix coordinates into RNG sequence if shapeRNG is stateful.
    // This isn't perfect; a hash would be better if shapeRNG was very simple.
    // Assuming shapeRNG is a good PRNG, calling it is usually enough.
    // To make it more coordinate-dependent without complex hashing:
    // shapeRNG(); // advance state
    // return (shapeRNG() * (x+1) * (y+1)) % 1; // A bit ad-hoc
    return shapeRNG(); // Simplest approach: rely on sequential calls to the stone's RNG
}

export function drawSphere(grid: Grid, stone: Stone, shapeRNG: RNG): void {
  const centerX = GRID_WIDTH / 2 - 0.5; // Adjusted for 0-indexed grid
  const centerY = GRID_HEIGHT / 2 - 0.5;
  const radius = Math.min(GRID_WIDTH, GRID_HEIGHT) / 2 - 1; // Leave a small padding

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      if (distance <= radius) {
        const cellRngValue = getCellRNGValue(shapeRNG, x, y);
        grid[y][x] = selectFillCharacter(stone.properties, cellRngValue);
      }
    }
  }
}

export function drawCube(grid: Grid, stone: Stone, shapeRNG: RNG): void {
  const padding = 5; // Keep cube slightly smaller than grid
  const startX = padding;
  const endX = GRID_WIDTH - padding;
  const startY = padding;
  const endY = GRID_HEIGHT - padding;

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      // Ensure x, y are within grid bounds, though loop condition should handle this.
      if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
        const cellRngValue = getCellRNGValue(shapeRNG, x, y);
        grid[y][x] = selectFillCharacter(stone.properties, cellRngValue);
      }
    }
  }
}

export function drawPyramid(grid: Grid, stone: Stone, shapeRNG: RNG): void {
  const apexY = 5;
  const baseY = GRID_HEIGHT - 6; // 54
  const pyramidHeight = baseY - apexY;
  const maxHalfWidth = GRID_WIDTH / 2 - 5; // e.g. 25 for a base width of 50

  for (let y = 0; y < GRID_HEIGHT; y++) {
    if (y >= apexY && y <= baseY) {
      const progress = (y - apexY) / pyramidHeight;
      const halfWidth = Math.floor(progress * maxHalfWidth);
      const centerX = GRID_WIDTH / 2;
      const startX = Math.floor(centerX - halfWidth);
      const endX = Math.floor(centerX + halfWidth -1); // -1 for inclusive end

      for (let x = startX; x <= endX; x++) {
        if (x >= 0 && x < GRID_WIDTH) { // Ensure within grid bounds
          const cellRngValue = getCellRNGValue(shapeRNG, x, y);
          grid[y][x] = selectFillCharacter(stone.properties, cellRngValue);
        }
      }
    }
  }
}

export function drawObelisk(grid: Grid, stone: Stone, shapeRNG: RNG): void {
  const paddingX = Math.floor(GRID_WIDTH * 0.3); // e.g., 18
  const width = GRID_WIDTH - 2 * paddingX; // e.g., 24
  const startX = paddingX;
  const endX = GRID_WIDTH - paddingX;

  const paddingY = Math.floor(GRID_HEIGHT * 0.1); // e.g. 6
  const startY = paddingY;
  const endY = GRID_HEIGHT - paddingY;
  const obeliskBodyHeight = endY - startY;

  // Taper the top slightly for obelisk feel
  const taperHeight = Math.floor(obeliskBodyHeight * 0.2); // Taper over top 20% of body
  const apexYObelisk = startY; // Start of the taper
  const topBaseYObelisk = startY + taperHeight; // End of taper, start of main body

  for (let y = startY; y < endY; y++) {
    let currentStartX = startX;
    let currentEndX = endX;

    if (y < topBaseYObelisk) { // Tapering part
        const progress = (y - apexYObelisk) / taperHeight;
        const taperAmount = Math.floor(progress * (width / 4)); // Taper inwards by up to 1/4 width on each side
        currentStartX = startX + taperAmount;
        currentEndX = endX - taperAmount;
    }
    // Middle part is full width (currentStartX, currentEndX are already set)
    // No specific bottom taper for this simple obelisk, just straight sides.

    for (let x = currentStartX; x < currentEndX; x++) {
      if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
        const cellRngValue = getCellRNGValue(shapeRNG, x, y);
        grid[y][x] = selectFillCharacter(stone.properties, cellRngValue);
      }
    }
  }
}

export function drawCrystal(grid: Grid, stone: Stone, shapeRNG: RNG): void {
  const centerX = GRID_WIDTH / 2;
  const totalHeight = GRID_HEIGHT - 10; // Use 50 rows (5 to 54)
  const topY = 5;
  const bottomY = GRID_HEIGHT - 6; // 54

  const band1Height = Math.floor(totalHeight * 0.3); // Approx 15 rows
  const band2Height = Math.floor(totalHeight * 0.4); // Approx 20 rows
  // Band3Height is the remainder

  const midWidth = GRID_WIDTH - 20; // Max width of 40 (cols 10 to 49)
  const pointWidth = Math.floor(midWidth * 0.25); // Width at very top/bottom points, e.g. 10

  for (let y = 0; y < GRID_HEIGHT; y++) {
    if (y >= topY && y <= bottomY) {
      let currentHalfWidth = 0;
      // Band 1: Top point expanding downwards (trapezoid)
      if (y < topY + band1Height) {
        const progress = (y - topY) / (band1Height -1); // -1 for inclusive end
        currentHalfWidth = Math.floor(pointWidth / 2 + progress * (midWidth / 2 - pointWidth / 2));
      }
      // Band 2: Middle section (rectangle)
      else if (y < topY + band1Height + band2Height) {
        currentHalfWidth = Math.floor(midWidth / 2);
      }
      // Band 3: Bottom point contracting downwards (trapezoid)
      else {
        const progress = (bottomY - y) / (totalHeight - band1Height - band2Height -1); // -1 for inclusive end
        currentHalfWidth = Math.floor(pointWidth / 2 + progress * (midWidth / 2 - pointWidth / 2));
      }

      const startX = Math.floor(centerX - currentHalfWidth);
      const endX = Math.floor(centerX + currentHalfWidth -1); // -1 for inclusive

      for (let x = startX; x <= endX; x++) {
        if (x >= 0 && x < GRID_WIDTH) {
          const cellRngValue = getCellRNGValue(shapeRNG, x, y);
          grid[y][x] = selectFillCharacter(stone.properties, cellRngValue);
        }
      }
    }
  }
}

export function drawShard(grid: Grid, stone: Stone, shapeRNG: RNG): void {
  const apexY = 5;
  const baseY = GRID_HEIGHT - 6; // 54
  const shardHeight = baseY - apexY;
  const maxBaseHalfWidth = GRID_WIDTH / 3; // Shards are narrower, e.g., base 40

  for (let y = 0; y < GRID_HEIGHT; y++) {
    if (y >= apexY && y <= baseY) {
      const progress = (y - apexY) / shardHeight; // 0 to 1
      const baseHalfWidth = Math.floor(progress * maxBaseHalfWidth);

      // Noise: more jagged at base, less at apex. Max noise effect e.g. +/- 5 pixels
      const noiseMagnitude = Math.floor((shapeRNG() - 0.5) * (5 + progress * 10));
      const jaggedOffset = Math.floor((shapeRNG() - 0.5) * 4); // General x-offset for entire row

      const currentHalfWidth = Math.max(1, baseHalfWidth + noiseMagnitude); // Ensure at least 1 halfWidth

      const centerX = GRID_WIDTH / 2 + jaggedOffset;
      let startX = Math.floor(centerX - currentHalfWidth);
      let endX = Math.floor(centerX + currentHalfWidth -1);

      // Additional random "chips" or "spikes"
      if (shapeRNG() < 0.1 + progress * 0.2) { // More chance of chips towards the base
          const chipSide = shapeRNG() < 0.5 ? -1 : 1;
          const chipSize = Math.floor(shapeRNG() * 5 + 2);
          if (chipSide === -1) startX -= chipSize;
          else endX += chipSize;
      }

      startX = Math.max(0, Math.min(GRID_WIDTH -1, startX));
      endX = Math.max(0, Math.min(GRID_WIDTH -1, endX));
      if (startX > endX) continue;


      for (let x = startX; x <= endX; x++) {
         if (x >= 0 && x < GRID_WIDTH) {
          const cellRngValue = getCellRNGValue(shapeRNG, x, y);
          grid[y][x] = selectFillCharacter(stone.properties, cellRngValue);
        }
      }
    }
  }
}

// --- Grid Rendering ---
export function renderGrid(grid: Grid): string {
  return grid.map(row => row.join('')).join('\n');
}

// --- Main Orchestration Function ---
export function drawStoneShape(stone: Stone, globalSeed: string): Grid {
  const grid = createEmptyGrid();

  // Create a deterministic RNG unique to this stone using the global seed and stone's ID
  const stoneSpecificSeed = `${globalSeed}_${stone.id}_${stone.properties.shape}`;
  const shapeRNG = initializeRNG(stoneSpecificSeed);

  // Call the appropriate drawing function based on shape
  switch (stone.properties.shape) {
    case "Sphere":
      drawSphere(grid, stone, shapeRNG);
      break;
    case "Cube":
      drawCube(grid, stone, shapeRNG);
      break;
    case "Pyramid":
      drawPyramid(grid, stone, shapeRNG);
      break;
    case "Obelisk":
      drawObelisk(grid, stone, shapeRNG);
      break;
    case "Crystal":
      drawCrystal(grid, stone, shapeRNG);
      break;
    case "Shard":
      drawShard(grid, stone, shapeRNG);
      break;
    // Add cases for Geode, Rock when implemented
    // For now, they will result in an empty grid or could default to a simple shape.
    default:
      // console.warn(`Unsupported shape: ${stone.properties.shape}. Drawing a cube as default.`);
      // drawCube(grid, stone, shapeRNG); // Optionally draw a default
      break;
  }

  // Add magic symbols based on rarity
  // This should be done *after* the main shape is drawn to overlay symbols.
  const rarity = stone.properties.rarity;
  if (rarity > 5) { // Example threshold for magic symbols
    const numSymbols = Math.floor(shapeRNG() * (rarity - 4)); // e.g., 1 to (rarity-4) symbols
    const magicSymbols: string[] = [CHAR_SET.magic1, CHAR_SET.magic2, CHAR_SET.magic3];

    for (let i = 0; i < numSymbols; i++) {
      // Try a few times to find a spot inside the drawn shape
      for (let attempt = 0; attempt < 10; attempt++) {
        const randX = Math.floor(shapeRNG() * GRID_WIDTH);
        const randY = Math.floor(shapeRNG() * GRID_HEIGHT);

        if (grid[randY][randX] !== CHAR_SET.space) { // Check if the spot is part of the shape
          grid[randY][randX] = magicSymbols[Math.floor(shapeRNG() * magicSymbols.length)];
          break; // Placed one symbol, move to the next
        }
      }
    }
  }
  return grid;
}

// Final export to ensure module treatment if nothing else is exported at the very end.
// Not strictly necessary if other exports are present.
// export {}; // Removed as functions are exported
