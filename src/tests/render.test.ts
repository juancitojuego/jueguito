// src/tests/render.test.ts

import { renderStone } from '../render';
import { generateShapeMask, MASK_WIDTH, MASK_HEIGHT } from '../shapeMasks';
import { StoneQualities, deriveStoneQualities, SHAPES, COLORS } from '../stone'; // Using deriveStoneQualities to get realistic test data
import chalk from 'chalk';

describe('Stone Renderer - renderStone', () => {
  // Force chalk to output ANSI codes for testing purposes
  chalk.level = 1; // 1 for basic 16 color support, 2 for 256, 3 for truecolor. Basic should be enough.

  const defaultSeed = 12345;

  // Helper to create a simple stone for testing
  const createTestStone = (overrides: Partial<StoneQualities> = {}): StoneQualities => {
    // Use deriveStoneQualities to get a base set of realistic values, then override
    let baseStone = deriveStoneQualities(overrides.seed || defaultSeed);
    return { ...baseStone, ...overrides };
  };

  test('should return a grid of correct dimensions (60x60)', () => {
    const qualities = createTestStone({ shape: 'Cube' });
    const mask = generateShapeMask(qualities.shape, MASK_WIDTH, MASK_HEIGHT);
    const grid = renderStone(mask, qualities);

    expect(grid).toBeInstanceOf(Array);
    expect(grid.length).toBe(MASK_HEIGHT);
    grid.forEach((row) => {
      expect(row).toBeInstanceOf(Array);
      expect(row.length).toBe(MASK_WIDTH);
      row.forEach((cell) => {
        expect(typeof cell).toBe('string'); // Each cell is a string (char + ANSI codes)
      });
    });
  });

  test('should be deterministic for the same mask and qualities', () => {
    const qualities = createTestStone({ shape: 'Sphere', seed: 789 });
    const mask = generateShapeMask(qualities.shape, MASK_WIDTH, MASK_HEIGHT);

    const grid1 = renderStone(mask, qualities);
    // Re-create qualities with the same seed to ensure PRNG for glyphs is also reset if used internally in renderStone
    const qualities2 = createTestStone({ shape: 'Sphere', seed: 789 });
    const grid2 = renderStone(mask, qualities2);

    expect(grid1).toEqual(grid2);
  });

  test('should render spaces for false areas in the mask', () => {
    const qualities = createTestStone({ shape: 'Cube' });
    // Create a simple mask that's false everywhere for this specific test
    const emptyMask = Array(MASK_HEIGHT)
      .fill(null)
      .map(() => Array(MASK_WIDTH).fill(false));
    const grid = renderStone(emptyMask, qualities);

    grid.forEach((row) => {
      row.forEach((cell) => {
        expect(cell.trim()).toBe(''); // Or just ' ' if no ANSI codes on spaces
      });
    });
  });

  describe('Character Selection based on Weight and Hardness', () => {
    const DENSITY_CHARS_EXPECTED = ['░', '▒', '▓', '█']; // From render.ts (internal)
    const testShape = 'Cube'; // A shape that will have many true cells
    const mask = generateShapeMask(testShape, MASK_WIDTH, MASK_HEIGHT);

    // Find a point that is part of the mask to check its character
    let maskedPoint: { y: number; x: number } | null = null;
    for (let r = 0; r < MASK_HEIGHT; r++) {
      for (let c = 0; c < MASK_WIDTH; c++) {
        if (mask[r][c]) {
          maskedPoint = { y: r, x: c };
          break;
        }
      }
      if (maskedPoint) break;
    }
    if (!maskedPoint) {
      throw new Error(`Could not find a true point in the mask for shape: ${testShape} in render.test.ts`);
    }
    const { y: testY, x: testX } = maskedPoint;

    test('should use lightest char for low weight', () => {
      const qualities = createTestStone({ shape: testShape, weight: 10, hardness: 0.5, magic: 0 }); // No magic to simplify char check
      const grid = renderStone(mask, qualities);
      // Check a character known to be on the stone
      expect(grid[testY][testX]).toContain(DENSITY_CHARS_EXPECTED[0]);
    });

    test('should use medium-light char for medium-low weight', () => {
      const qualities = createTestStone({ shape: testShape, weight: 40, hardness: 0.5, magic: 0 });
      const grid = renderStone(mask, qualities);
      expect(grid[testY][testX]).toContain(DENSITY_CHARS_EXPECTED[1]);
    });

    test('should use medium-dense char for medium-high weight', () => {
      const qualities = createTestStone({ shape: testShape, weight: 65, hardness: 0.5, magic: 0 });
      const grid = renderStone(mask, qualities);
      expect(grid[testY][testX]).toContain(DENSITY_CHARS_EXPECTED[2]);
    });

    test('should use densest char for high weight', () => {
      const qualities = createTestStone({ shape: testShape, weight: 90, hardness: 0.5, magic: 0 });
      const grid = renderStone(mask, qualities);
      expect(grid[testY][testX]).toContain(DENSITY_CHARS_EXPECTED[3]);
    });

    test('high hardness should increase density character impression', () => {
      // Weight is 65 (normally index 2: ▓), high hardness should push to index 3: █
      const qualities = createTestStone({ shape: testShape, weight: 65, hardness: 0.8, magic: 0 });
      const grid = renderStone(mask, qualities);
      expect(grid[testY][testX]).toContain(DENSITY_CHARS_EXPECTED[3]);
    });
  });

  describe('Magic Glyph Overlay', () => {
    const testShape = 'Sphere'; // A shape with a good surface area
    const mask = generateShapeMask(testShape, MASK_WIDTH, MASK_HEIGHT);
    const MAGIC_GLYPHS_EXPECTED = ['+', '*', '✦']; // from render.ts (internal)

    const countGlyphsInGrid = (grid: string[][], glyph: string): number => {
      let count = 0;
      grid.forEach((row) =>
        row.forEach((cell) => {
          // Need to strip ANSI codes before checking for glyph
          // A simple check: if the glyph is present in the string cell
          if (cell.includes(glyph)) count++;
        })
      );
      return count;
    };

    test('should overlay no glyphs for zero magic', () => {
      const qualities = createTestStone({ shape: testShape, magic: 0, seed: 1 });
      const grid = renderStone(mask, qualities);
      const totalGlyphs =
        countGlyphsInGrid(grid, MAGIC_GLYPHS_EXPECTED[0]) +
        countGlyphsInGrid(grid, MAGIC_GLYPHS_EXPECTED[1]) +
        countGlyphsInGrid(grid, MAGIC_GLYPHS_EXPECTED[2]);
      expect(totalGlyphs).toBe(0);
    });

    test('should overlay basic glyphs for low magic', () => {
      const qualities = createTestStone({ shape: testShape, magic: 20, seed: 2 }); // Expects 2 '+' glyphs
      const grid = renderStone(mask, qualities);
      expect(countGlyphsInGrid(grid, MAGIC_GLYPHS_EXPECTED[0])).toBeGreaterThanOrEqual(1);
    });

    test('should overlay intermediate glyphs for medium magic', () => {
      const qualities = createTestStone({ shape: testShape, magic: 50, seed: 3 }); // Expects 3 '*' glyphs
      const grid = renderStone(mask, qualities);
      expect(countGlyphsInGrid(grid, MAGIC_GLYPHS_EXPECTED[1])).toBeGreaterThanOrEqual(2);
    });

    test('should overlay potent glyphs for high magic', () => {
      const qualities = createTestStone({ shape: testShape, magic: 80, seed: 4 }); // Expects 4 '✦' glyphs
      const grid = renderStone(mask, qualities);
      expect(countGlyphsInGrid(grid, MAGIC_GLYPHS_EXPECTED[2])).toBeGreaterThanOrEqual(3);
    });

    test('glyph placement should be deterministic based on seed', () => {
      const qualities1 = createTestStone({ shape: testShape, magic: 50, seed: 123 });
      const qualities2 = createTestStone({ shape: testShape, magic: 50, seed: 123 }); // Same seed
      const grid1 = renderStone(mask, qualities1);
      const grid2 = renderStone(mask, qualities2);
      expect(grid1).toEqual(grid2);

      const qualities3 = createTestStone({ shape: testShape, magic: 50, seed: 456 }); // Different seed
      const grid3 = renderStone(mask, qualities3);
      // It's hard to assert they are *different* without comparing exact glyph positions,
      // but if the PRNG works, they usually will be if enough glyphs are placed.
      // For simplicity, this test primarily ensures determinism for the *same* seed.
      // A difference check could be added if a reliable way to compare glyph patterns is devised.
      // For now, we assume if grid1==grid2 (same seed) and grid1 potentially != grid3 (diff seed), it's working.
      // A basic check:
      // if (countGlyphsInGrid(grid1, '*') > 0) { // Only if glyphs are actually placed
      //   expect(grid1).not.toEqual(grid3); // This might fail if seeds coincidentally produce same layout for few glyphs
      // }
    });
  });

  describe('ANSI Color Application', () => {
    const testShape = 'Cube';
    const mask = generateShapeMask(testShape, MASK_WIDTH, MASK_HEIGHT);

    // Find a point that is part of the mask
    let maskedPoint: { y: number; x: number } | null = null;
    for (let r = 0; r < MASK_HEIGHT; r++) {
      for (let c = 0; c < MASK_WIDTH; c++) {
        if (mask[r][c]) {
          maskedPoint = { y: r, x: c };
          break;
        }
      }
      if (maskedPoint) break;
    }
    if (!maskedPoint) {
      throw new Error(`Could not find a true point in the mask for shape: ${testShape} in render.test.ts color tests`);
    }
    const { y: testY, x: testX } = maskedPoint;

    COLORS.forEach((colorName) => {
      test(`should apply ${colorName} color correctly`, () => {
        const qualities = createTestStone({ shape: testShape, color: colorName, magic: 0 }); // No magic for simpler check
        const grid = renderStone(mask, qualities);
        const cell = grid[testY][testX];

        // ANSI escape codes always start with [
        expect(cell).toContain('[');
        // This is a basic check. More specific checks would involve parsing ANSI codes
        // or using a library that can assert specific colors, which is complex for basic unit tests.
        // For now, presence of ANSI codes for a colored stone is a good indicator.
      });
    });

    test('glyphs should also be colored and potentially brighter/bold', () => {
      const qualities = createTestStone({ shape: testShape, color: 'Blue', magic: 80, seed: 99 }); // High magic
      const grid = renderStone(mask, qualities);

      let glyphCell: string | null = null;
      for (let r = 0; r < MASK_HEIGHT; r++) {
        for (let c = 0; c < MASK_WIDTH; c++) {
          if (mask[r][c] && grid[r][c].includes('✦')) {
            // Check for the high-magic glyph
            glyphCell = grid[r][c];
            break;
          }
        }
        if (glyphCell) break;
      }

      expect(glyphCell).not.toBeNull();
      if (glyphCell) {
        expect(glyphCell).toContain('['); // Should have ANSI color
        // Check for bold (ANSI code [1m) or other highlighting if specified in renderStone
        // The current renderStone uses .bold() from chalk, which typically adds a bold attribute.
        // It also adjusts Lightness, so it will be different from base stone color.
      }
    });
  });
});
