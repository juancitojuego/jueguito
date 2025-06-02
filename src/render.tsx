// src/render.ts

import { StoneQualities, mulberry32 } from './stone';
import { MASK_HEIGHT, MASK_WIDTH, generateShapeMask } from './shapeMasks';
import type { JSX } from 'solid-js'; // For SolidJS JSX types

// --- Color Mapping for SVG ---
// Maps stone color names to SVG compatible color values (hex, named colors)
export function getSvgColor(colorName: string | undefined): string {
  if (!colorName) return '#888888'; // Default to grey if no color
  switch (colorName.toLowerCase()) {
    case 'red': return '#FF0000';
    case 'yellow': return '#FFFF00';
    case 'green': return '#008000'; // DarkGreen for better visibility than Lime
    case 'cyan': return '#00FFFF';
    case 'blue': return '#0000FF';
    case 'magenta': return '#FF00FF';
    case 'white': return '#FFFFFF';
    case 'black': return '#1A1A1A'; // Slightly off-black
    default: return '#888888'; // Default grey for unknown colors
  }
}

// --- SVG Stone Renderer ---

// Constants for SVG rendering
const SVG_VIEWBOX_WIDTH = MASK_WIDTH; // Using mask dimensions for viewBox
const SVG_VIEWBOX_HEIGHT = MASK_HEIGHT;
const CELL_SIZE = 1; // Each cell in the mask becomes a 1x1 unit in SVG

// Magic Glyphs as simple SVG paths or symbols
const SVG_MAGIC_GLYPHS = {
  plus: (x: number, y: number, size: number, color: string): JSX.Element => {
    const dValue = `M${x-size/2},${y} H${x+size/2} M${x},${y-size/2} V${y+size/2}`;
    const strokeW = size * 0.2;
    return <path d={dValue} stroke={color} stroke-width={strokeW} />;
  },
  star: (x: number, y: number, size: number, color: string): JSX.Element => {
    // Simple 4-point star
    const dValue = `M${x},${y-size/2} L${x+size/4},${y-size/4} L${x+size/2},${y} L${x+size/4},${y+size/4} L${x},${y+size/2} L${x-size/4},${y+size/4} L${x-size/2},${y} L${x-size/4},${y-size/4} Z`;
    return <path d={dValue} fill={color} />;
  },
  diamond: (x: number, y: number, size: number, color: string): JSX.Element => {
    const halfSize = size / 2;
    const xVal = x - halfSize;
    const yVal = y - halfSize;
    const transformVal = `rotate(45 ${x} ${y})`;
    return <rect x={xVal} y={yVal} width={size} height={size} fill={color} transform={transformVal} />;
  },
};

function getMagicGlyphDetails(magic: number): { type: keyof typeof SVG_MAGIC_GLYPHS; count: number } {
  if (magic < 30) return { type: 'plus', count: magic > 15 ? Math.floor(magic / 10) : 0 };
  if (magic < 60) return { type: 'star', count: Math.floor(magic / 15) };
  if (magic < 90) return { type: 'diamond', count: Math.floor(magic / 20) };
  return { type: 'diamond', count: Math.floor(magic / 15) };
}

export function renderStoneToSVG(stone: StoneQualities): JSX.Element {
  const { weight, hardness, magic, color, seed, shape } = stone;
  const mask = generateShapeMask(shape, MASK_WIDTH, MASK_HEIGHT);
  const baseSvgColor = getSvgColor(color);

  const elements: JSX.Element[] = [];
  const glyphPrng = mulberry32(seed); // For deterministic glyph placement

  // Collect all possible glyph positions
  const possibleGlyphPositions: { y: number; x: number }[] = [];
  for (let r = 0; r < MASK_HEIGHT; r++) {
    for (let c = 0; c < MASK_WIDTH; c++) {
      if (mask[r][c]) {
        possibleGlyphPositions.push({ y: r, x: c });
      }
    }
  }

  // Shuffle positions for random distribution
  if (possibleGlyphPositions.length > 0) {
    for (let i = possibleGlyphPositions.length - 1; i > 0; i--) {
      const j = Math.floor(glyphPrng() * (i + 1));
      [possibleGlyphPositions[i], possibleGlyphPositions[j]] = [possibleGlyphPositions[j], possibleGlyphPositions[i]];
    }
  }
  
  const { type: magicGlyphType, count: glyphCount } = getMagicGlyphDetails(magic);
  const glyphPositions = new Set<string>();
  for (let i = 0; i < Math.min(glyphCount, possibleGlyphPositions.length); i++) {
    glyphPositions.add(`${possibleGlyphPositions[i].y},${possibleGlyphPositions[i].x}`);
  }

  for (let r = 0; r < MASK_HEIGHT; r++) {
    for (let c = 0; c < MASK_WIDTH; c++) {
      if (mask[r][c]) {
        // Base cell color and properties
        let cellFill = baseSvgColor;
        let cellOpacity = 0.6 + (weight / 100) * 0.4; // Weight influences base opacity (0.6 to 1.0)
        if (hardness > 0.75) cellOpacity = Math.min(1, cellOpacity + 0.1);
        if (hardness < 0.25) cellOpacity = Math.max(0.4, cellOpacity - 0.1);

        elements.push(
          <rect
            x={c * CELL_SIZE}
            y={r * CELL_SIZE}
            width={CELL_SIZE}
            height={CELL_SIZE}
            fill={cellFill}
            opacity={String(cellOpacity)} // Ensure opacity is a string
          />
        );

        // Add magic glyph if this position is chosen
        if (glyphPositions.has(`${r},${c}`)) {
          const glyphColor = kontrast.isLight(baseSvgColor) ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)';
          // Ensure type compatibility if JSX.Element is strictly enforced by a stricter tsconfig in test
          const glyphElement: JSX.Element = SVG_MAGIC_GLYPHS[magicGlyphType](
            (c + CELL_SIZE / 2), 
            (r + CELL_SIZE / 2), 
            CELL_SIZE * 0.8,    
            glyphColor
          );
          elements.push(glyphElement);
        }
      }
    }
  }
  
  // Add a subtle border to the whole stone based on rarity
  let svgStrokeColor = "none"; // Renamed to avoid conflict with JSX stroke prop
  let svgStrokeWidth = "0"; // Ensure string for SVG attribute
  if (stone.rarity > 75) {
    svgStrokeColor = stone.rarity > 90 ? "gold" : "silver";
    svgStrokeWidth = String(0.25 * CELL_SIZE); 
  }

  const svgStyle: JSX.CSSProperties = {
    border: '1px solid #eee',
    "background-color": "#f0f0f0",
  };

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${SVG_VIEWBOX_WIDTH} ${SVG_VIEWBOX_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      style={svgStyle}
    >
      <g stroke={svgStrokeColor} stroke-width={svgStrokeWidth}>
        {elements}
      </g>
    </svg>
  );
}

/**
 * Kontrast is a tiny utility library for color contrast checking.
 * It's useful for determining if text (or glyphs) should be light or dark
 * based on the background color.
 * Source: https://github.com/matvp91/kontrast
 */
const kontrast = {
  getLuminance: (hexColor: string) => {
    const rgb = parseInt(hexColor.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  },
  isLight: (hexColor: string) => kontrast.getLuminance(hexColor) > 0.5,
};


// The old text-based renderStone and related functions (selectDensityCharacter, getBaseHslForColor)
// can be kept for reference or removed if no longer needed.
// For now, they are effectively replaced by renderStoneToSVG and getSvgColor.
// chalk dependency can be removed after this.

// Old text based renderStone (can be removed)
/*
export function renderStone(mask: boolean[][], qualities: StoneQualities): string[][] {
    // ... original implementation using chalk ...
}
*/
// ... (other old functions like selectDensityCharacter, getBaseHslForColor, etc.)
    
// Ensure MASK_WIDTH and MASK_HEIGHT are used consistently or passed as parameters if variable sizes are needed.
// For SVG, fixed viewBox is fine, and outer width/height="100%" makes it scale.
