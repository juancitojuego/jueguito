import { render } from '@solidjs/testing-library'; // For rendering JSX components
import { getSvgColor, renderStoneToSVG } from '@src/render';
import { StoneQualities, createStone, SHAPES, COLORS } from '@src/stone';
import { generateShapeMask } from '@src/shapeMasks'; // To verify mask usage indirectly

describe('SVG Stone Rendering', () => {
  describe('getSvgColor', () => {
    test('should return correct hex/named colors for known color names', () => {
      expect(getSvgColor('Red')).toBe('#FF0000');
      expect(getSvgColor('Green')).toBe('#008000');
      expect(getSvgColor('Blue')).toBe('#0000FF');
      expect(getSvgColor('White')).toBe('#FFFFFF');
      expect(getSvgColor('Black')).toBe('#1A1A1A');
    });

    test('should return a default color for undefined or unknown color names', () => {
      expect(getSvgColor(undefined)).toBe('#888888');
      expect(getSvgColor('UnknownColor')).toBe('#888888');
    });
  });

  describe('renderStoneToSVG', () => {
    const testStone: StoneQualities = createStone(123); // A sample stone

    test('should return a valid SolidJS JSX Element for an SVG', () => {
      const svgJSX = renderStoneToSVG(testStone);
      // Basic check that it's an object, typical for JSX elements before rendering
      expect(svgJSX).toBeInstanceOf(Object);
      // More robust checks are done by rendering it, see below.
    });

    test('renders an SVG element with a viewBox', () => {
      const { container } = render(() => renderStoneToSVG(testStone)); // testStone is defined above
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 60 60'); // MASK_WIDTH, MASK_HEIGHT
    });

    test('should generate rect elements for a stone with a solid shape', () => {
      const cubeStone = { ...createStone(456), shape: 'Cube' }; // Seed for a cube or other solid shape
      const { container } = render(() => renderStoneToSVG(cubeStone));
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      if (svg) { // Type guard for svg
        const rects = svg.querySelectorAll('rect'); // Main body of the stone
        expect(rects.length).toBeGreaterThan(10); // Cube should have many rects. Exact count depends on mask.
      }
    });
    
    test('rect elements should have fill attribute from getSvgColor', () => {
      const blueStone = { ...createStone(789), color: 'Blue', shape: 'Sphere' };
      const expectedColor = getSvgColor('Blue');
      
      const { container } = render(() => renderStoneToSVG(blueStone));
      const svg = container.querySelector('svg');
      if (svg) { // Type guard
        const firstRect = svg.querySelector('rect'); // Check one of the rects
        expect(firstRect).toHaveAttribute('fill', expectedColor);
      } else {
        throw new Error("SVG not rendered for blueStone");
      }
    });

    test('should include magic glyphs for stones with magic > 0', () => {
        const magicStone = { ...createStone(101112), shape: 'Crystal', magic: 80 }; // High magic
        
        const { container } = render(() => renderStoneToSVG(magicStone));
        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();
        if (svg) {
          // Glyphs are rendered as paths or other rects. Check if there are more elements than just base rects.
          // This is an indirect check. A more specific check would be to add a class or data-attribute to glyph elements.
          const baseRectsCount = generateShapeMask(magicStone.shape).flat().filter(Boolean).length;
          expect(svg.childNodes[0].childNodes.length).toBeGreaterThan(baseRectsCount); // Group <g> contains base rects + glyphs
        }
    });
    
    test('should apply rarity border for very rare stones', () => {
      const rareStone = { ...createStone(131415), shape: 'Obelisk', rarity: 95 }; // Very rare
      
      const { container } = render(() => renderStoneToSVG(rareStone));
      const groupElement = container.querySelector('svg g'); // The main group element
      expect(groupElement).toBeInTheDocument();
      if (groupElement) {
        expect(groupElement).toHaveAttribute('stroke', 'gold');
        expect(groupElement).toHaveAttribute('stroke-width', '0.25');
      }
    });

    test('should not apply rarity border for common stones', () => {
      const commonStone = { ...createStone(161718), shape: 'Shard', rarity: 30 }; // Common
      
      const { container } = render(() => renderStoneToSVG(commonStone));
      const groupElement = container.querySelector('svg g');
      expect(groupElement).toBeInTheDocument();
      if (groupElement) {
        expect(groupElement).toHaveAttribute('stroke', 'none');
      }
    });

    // Test to ensure different shapes produce different SVG outputs might be too complex/brittle.
    // Rely on shapeMasks tests and visual inspection for shape correctness.
  });
});

// Helper to setup testing environment for SolidJS JSX (if not using a preset that handles it)
// This is usually handled by solid-jest/preset/browser
// if (!globalThis.Solid$$$) {
//   const { createRoot } = await import('solid-js');
//   const { ssr } = await import('solid-js/web');
//   // @ts-ignore
//   globalThis.Solid$$$ = { createRoot, ssr };
// }
