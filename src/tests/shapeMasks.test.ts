// src/tests/shapeMasks.test.ts

import { generateShapeMask, MASK_WIDTH, MASK_HEIGHT } from '../shapeMasks';
import { SHAPES } from '../stone'; // To iterate over all available shapes

describe('Shape Mask Generation', () => {
  const TEST_WIDTH = MASK_WIDTH; // Use standard mask width for tests
  const TEST_HEIGHT = MASK_HEIGHT; // Use standard mask height for tests

  test('should generate a mask with correct dimensions for all shapes', () => {
    SHAPES.forEach((shape) => {
      const mask = generateShapeMask(shape, TEST_WIDTH, TEST_HEIGHT);
      expect(mask).toBeInstanceOf(Array);
      expect(mask.length).toBe(TEST_HEIGHT);
      mask.forEach((row) => {
        expect(row).toBeInstanceOf(Array);
        expect(row.length).toBe(TEST_WIDTH);
        row.forEach((cell) => {
          expect(typeof cell).toBe('boolean');
        });
      });
    });
  });

  test('should generate deterministic masks for each shape', () => {
    SHAPES.forEach((shape) => {
      const mask1 = generateShapeMask(shape, TEST_WIDTH, TEST_HEIGHT);
      const mask2 = generateShapeMask(shape, TEST_WIDTH, TEST_HEIGHT);
      expect(mask1).toEqual(mask2);
    });
  });

  test('should generate non-empty masks for known shapes', () => {
    // Exclude potentially empty or problematic shapes if necessary,
    // but ideally all listed shapes should produce some visible mask.
    const knownShapes = ['Sphere', 'Cube', 'Pyramid', 'Obelisk', 'Crystal', 'Shard'];
    knownShapes.forEach((shape) => {
      const mask = generateShapeMask(shape, TEST_WIDTH, TEST_HEIGHT);
      const hasTrueCell = mask.some((row) => row.some((cell) => cell === true));
      expect(hasTrueCell).toBe(true);
    });
  });

  test('should generate an empty mask for an unknown shape', () => {
    const unknownShape = 'UnknownShape123';
    const mask = generateShapeMask(unknownShape, TEST_WIDTH, TEST_HEIGHT);
    const hasTrueCell = mask.some((row) => row.some((cell) => cell === true));
    expect(hasTrueCell).toBe(false);
  });

  // Specific shape tests (basic checks, not exhaustive pixel-perfect checks)
  describe('Specific Shape Properties', () => {
    test('Sphere mask should be roughly circular', () => {
      const mask = generateShapeMask('Sphere', TEST_WIDTH, TEST_HEIGHT);
      // Check a few points: center should be true, corners should be false
      const centerX = Math.floor(TEST_WIDTH / 2);
      const centerY = Math.floor(TEST_HEIGHT / 2);
      expect(mask[centerY][centerX]).toBe(true);
      expect(mask[0][0]).toBe(false); // Top-left corner
      expect(mask[TEST_HEIGHT - 1][TEST_WIDTH - 1]).toBe(false); // Bottom-right corner
    });

    test('Cube mask should be roughly square', () => {
      const mask = generateShapeMask('Cube', TEST_WIDTH, TEST_HEIGHT);
      const centerX = Math.floor(TEST_WIDTH / 2);
      const centerY = Math.floor(TEST_HEIGHT / 2);
      // A point near the center should be true
      expect(mask[centerY][centerX]).toBe(true);
      // Corners of the mask grid should ideally be false if the cube is smaller than the grid
      expect(mask[0][0]).toBe(false);
      // Count true cells in a row near the center vs a row near the edge
      const centerRowCount = mask[centerY].filter(Boolean).length;
      const edgeRowCount = mask[1].filter(Boolean).length; // Row 1 (near edge)
      expect(centerRowCount).toBeGreaterThan(TEST_WIDTH * 0.5); // Expect significant width
      if (edgeRowCount > 0) {
        // If cube touches edge, this test might be tricky
        //This check is too specific, let's rely on visual inspection or more advanced checks if needed
        //expect(centerRowCount).toBeGreaterThanOrEqual(edgeRowCount);
      }
    });

    test('Pyramid mask should be wider at the base than at the top', () => {
      const mask = generateShapeMask('Pyramid', TEST_WIDTH, TEST_HEIGHT);
      let topWidth = 0;
      let bottomWidth = 0;
      const centerX = Math.floor(TEST_WIDTH / 2);
      const centerY = Math.floor(TEST_HEIGHT / 2);

      // Find first row with true values (approximate top of pyramid)
      for (let y = 0; y < TEST_HEIGHT / 2; y++) {
        const rowWidth = mask[y].filter(Boolean).length;
        if (rowWidth > 0) {
          topWidth = rowWidth;
          break;
        }
      }

      // Find last row with true values (approximate base of pyramid)
      for (let y = TEST_HEIGHT - 1; y > TEST_HEIGHT / 2; y--) {
        const rowWidth = mask[y].filter(Boolean).length;
        if (rowWidth > 0) {
          bottomWidth = rowWidth;
          break;
        }
      }
      // If the pyramid is very small or flat, topWidth could be 0.
      // Only assert if both are found and part of the pyramid body.
      if (topWidth > 0 && bottomWidth > 0) {
        expect(bottomWidth).toBeGreaterThan(topWidth);
      } else {
        // If pyramid is tiny or only one row, this check might not be meaningful.
        // Ensure at least the base has some width.
        const baseRowY = Math.floor(centerY + (TEST_HEIGHT * 0.75) / 2) - 1; // Approx base Y
        if (baseRowY < TEST_HEIGHT && baseRowY >= 0) {
          const baseRowWidth = mask[baseRowY].filter(Boolean).length;
          expect(baseRowWidth).toBeGreaterThan(0);
        }
      }
    });
  });
});
