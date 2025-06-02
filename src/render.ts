// src/render.ts

import chalk from 'chalk';
import { StoneQualities, mulberry32 } from './stone'; // mulberry32 for deterministic glyph placement
import { MASK_HEIGHT, MASK_WIDTH } from './shapeMasks'; // Assuming these are exported

// Keep this function if it's helpful for color manipulation
interface HSLColor {
  h: number;
  s: number;
  l: number;
}
function getBaseHslForColor(colorName: string): HSLColor {
  switch (colorName.toLowerCase()) {
    case 'red':
      return { h: 0, s: 100, l: 50 };
    case 'yellow':
      return { h: 60, s: 100, l: 50 };
    case 'green':
      return { h: 120, s: 100, l: 50 };
    case 'cyan':
      return { h: 180, s: 100, l: 50 };
    case 'blue':
      return { h: 240, s: 100, l: 50 };
    case 'magenta':
      return { h: 300, s: 100, l: 50 };
    case 'white':
      return { h: 0, s: 0, l: 90 }; // Brighter white
    case 'black':
      return { h: 0, s: 0, l: 20 }; // Darker black for contrast
    default:
      return { h: 0, s: 0, l: 50 }; // Default grey
  }
}

const DENSITY_CHARS = ['░', '▒', '▓', '█']; // Lightest to densest
const MAGIC_GLYPHS = ['+', '*', '✦']; // Least to most potent

/**
 * Selects a character based on stone weight and hardness.
 * @param weight Stone weight (1-100).
 * @param hardness Stone hardness (0.00-1.00).
 * @returns A character representing the stone's density.
 */
function selectDensityCharacter(weight: number, hardness: number): string {
  let index = 0;
  if (weight < 25) index = 0;
  else if (weight < 50) index = 1;
  else if (weight < 75) index = 2;
  else index = 3;

  // Hardness can slightly increase density impression
  if (hardness > 0.66 && index < DENSITY_CHARS.length - 1) {
    index++;
  } else if (hardness < 0.33 && index > 0) {
    // Softer stones might appear less dense, but let's not make them too light based on hardness alone.
    // index--; // Optional: uncomment to make soft stones lighter
  }
  return DENSITY_CHARS[index];
}

/**
 * Determines which magic glyph to use and how many.
 * @param magic Stone magic score (0-100).
 * @returns An object with the glyph and count.
 */
function getMagicGlyphDetails(magic: number): { glyph: string; count: number } {
  if (magic < 30) return { glyph: MAGIC_GLYPHS[0], count: magic > 15 ? Math.floor(magic / 10) : 0 }; // 0-2 '+'
  if (magic < 60) return { glyph: MAGIC_GLYPHS[1], count: Math.floor(magic / 15) }; // 2-3 '*'
  if (magic < 90) return { glyph: MAGIC_GLYPHS[2], count: Math.floor(magic / 20) }; // 3-4 '✦'
  return { glyph: MAGIC_GLYPHS[2], count: Math.floor(magic / 15) }; // 5-6 '✦' for very high magic
}

/**
 * Renders a stone to a 60x60 string grid.
 * @param mask The 60x60 boolean shape mask.
 * @param qualities The stone's qualities.
 * @returns A 60x60 string grid representing the rendered stone.
 */
export function renderStone(mask: boolean[][], qualities: StoneQualities): string[][] {
  const { weight, hardness, magic, color, seed } = qualities;
  const outputGrid: string[][] = Array(MASK_HEIGHT)
    .fill(null)
    .map(() => Array(MASK_WIDTH).fill(' '));
  const baseHsl = getBaseHslForColor(color);

  const densityChar = selectDensityCharacter(weight, hardness);
  const { glyph: magicGlyph, count: glyphCount } = getMagicGlyphDetails(magic);

  // Create a PRNG instance for deterministic glyph placement based on the stone's unique seed
  const glyphPrng = mulberry32(seed);

  // Collect all possible glyph positions (where mask is true)
  const possibleGlyphPositions: { y: number; x: number }[] = [];
  for (let y = 0; y < MASK_HEIGHT; y++) {
    for (let x = 0; x < MASK_WIDTH; x++) {
      if (mask[y][x]) {
        possibleGlyphPositions.push({ y, x });
      }
    }
  }

  // Shuffle positions for random distribution if there are positions and glyphs to place
  if (possibleGlyphPositions.length > 0 && glyphCount > 0) {
    for (let i = possibleGlyphPositions.length - 1; i > 0; i--) {
      const j = Math.floor(glyphPrng() * (i + 1));
      [possibleGlyphPositions[i], possibleGlyphPositions[j]] = [possibleGlyphPositions[j], possibleGlyphPositions[i]];
    }
  }

  const glyphPositions = new Set<string>(); // "y,x"
  for (let i = 0; i < Math.min(glyphCount, possibleGlyphPositions.length); i++) {
    glyphPositions.add(`${possibleGlyphPositions[i].y},${possibleGlyphPositions[i].x}`);
  }

  for (let y = 0; y < MASK_HEIGHT; y++) {
    for (let x = 0; x < MASK_WIDTH; x++) {
      if (!mask[y][x]) {
        outputGrid[y][x] = ' ';
        continue;
      }

      let charToRender = densityChar;
      if (glyphPositions.has(`${y},${x}`)) {
        charToRender = magicGlyph;
      }

      // Adjust lightness based on a simple pattern or hardness, for example
      // This is a placeholder for more sophisticated shading if needed.
      // For now, main color comes from baseHsl.
      const lOffset = x % 2 === y % 2 ? 5 : 0; // Subtle checkerboard pattern for texture
      let finalL = baseHsl.l + lOffset;

      // Glyphs could be brighter/different color
      if (charToRender === magicGlyph) {
        finalL = Math.min(100, baseHsl.l + 25); // Make glyphs pop a bit
        outputGrid[y][x] = chalk.hsl(baseHsl.h, Math.max(30, baseHsl.s - 20), finalL).bold(charToRender);
      } else {
        outputGrid[y][x] = chalk.hsl(baseHsl.h, baseHsl.s, finalL)(charToRender);
      }
    }
  }
  return outputGrid;
}

// The old renderStoneToAscii might be removed or updated to use renderStone.
// For now, let's assume it will be replaced or removed in a later step if not needed.
// Remove stripAnsi and the old SHAPES constant if no longer used.
// The ART_HEIGHT and ART_WIDTH constants are also from the old renderer.
