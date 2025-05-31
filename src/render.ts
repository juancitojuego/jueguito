// src/render.ts

import chalk from 'chalk';
import { StoneQualities, SHAPES } from './stone';

const ART_HEIGHT = 10; // Target height for the generated art content
const ART_WIDTH = 20;  // Target width for the generated art content

// Helper to strip ANSI codes (from Phase 1, for length calculation)
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\u001B\u009B][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

interface HSLColor { h: number; s: number; l: number; }

function getBaseHslForColor(colorName: string): HSLColor {
  switch (colorName.toLowerCase()) {
    case 'red':     return { h: 0,   s: 100, l: 50 };
    case 'yellow':  return { h: 60,  s: 100, l: 50 }; // Corrected: was 50, typical yellow is 60
    case 'green':   return { h: 120, s: 100, l: 50 };
    case 'cyan':    return { h: 180, s: 100, l: 50 };
    case 'blue':    return { h: 240, s: 100, l: 50 };
    case 'magenta': return { h: 300, s: 100, l: 50 };
    case 'white':   return { h: 0,   s: 0,   l: 90 };
    case 'black':   return { h: 0,   s: 0,   l: 10 };
    default:        return { h: 0,   s: 0,   l: 50 }; // Default grey
  }
}

export function renderStoneToAscii(qualities: StoneQualities): string[] {
  const { color, shape, rarity } = qualities;
  const baseHsl = getBaseHslForColor(color);

  let shapeArtLines: string[] = [];

  const chars = {
    full: '█',
    threeQuarters: '▓',
    half: '▒',
    quarter: '░',
    space: ' '
  };

  // Helper to apply chalk.hsl with lightness offset, clamping lightness between 0 and 100
  const c = (lOffset: number = 0, char: string = chars.full) => {
    const L = Math.max(0, Math.min(100, baseHsl.l + lOffset));
    // For black/white, saturation should remain 0, otherwise use base saturation
    const S = (baseHsl.s === 0) ? 0 : 100;
    return chalk.hsl(baseHsl.h, S, L)(char);
  }

  // Define shape art using the 'c' helper for shading
  // Art is typically 5 lines high here to fit with padding into ART_HEIGHT=10
  switch (shape) {
    case SHAPES[0]: // Cube
      shapeArtLines = [
        `  ${c(15, chars.half)}${c(10, chars.full)}${c(10, chars.full)}${c(10, chars.full)}${c(15, chars.half)}  `,
        ` ${c(10, chars.half)}${c(5, chars.full)}${c(5, chars.full)}${c(5, chars.full)}${c(10, chars.half)} `,
        `${c(0, chars.threeQuarters)}${c(-5, chars.full)}${c(-5, chars.full)}${c(-5, chars.full)}${c(0, chars.threeQuarters)}`,
        ` ${c(-5, chars.half)}${c(-10, chars.full)}${c(-10, chars.full)}${c(-10, chars.full)}${c(-5, chars.half)} `,
        `  ${c(-10, chars.half)}${c(-15, chars.full)}${c(-15, chars.full)}${c(-15, chars.full)}${c(-10, chars.half)}  `
      ];
      break;
    case SHAPES[1]: // Sphere
      shapeArtLines = [
        `   ${c(10, chars.quarter)}${c(15, chars.half)}${c(10, chars.quarter)}   `,
        ` ${c(5, chars.half)}${c(10, chars.full)}${c(15, chars.full)}${c(10, chars.full)}${c(5, chars.half)} `,
        `${c(0, chars.threeQuarters)}${c(5, chars.full)}${c(10, chars.full)}${c(5, chars.full)}${c(0, chars.threeQuarters)}`,
        ` ${c(-5, chars.half)}${c(0, chars.full)}${c(5, chars.full)}${c(0, chars.full)}${c(-5, chars.half)} `,
        `   ${c(-10, chars.quarter)}${c(-5, chars.half)}${c(-10, chars.quarter)}   `
      ];
      break;
    case SHAPES[2]: // Pyramid
      shapeArtLines = [
        `    ${c(15, chars.half)}    `,
        `   ${c(10, chars.threeQuarters)}${c(10, chars.full)}${c(10, chars.threeQuarters)}   `,
        `  ${c(5, chars.full)}${c(5, chars.full)}${c(5, chars.full)}${c(5, chars.full)}${c(5, chars.full)}  `,
        ` ${c(0, chars.half)}${c(0, chars.threeQuarters)}${c(0, chars.full)}${c(0, chars.threeQuarters)}${c(0, chars.half)} `,
        `${c(-5, chars.full)}${c(-5, chars.full)}${c(-5, chars.full)}${c(-5, chars.full)}${c(-5, chars.full)}`
      ];
      break;
    case SHAPES[3]: // Prism (rectangle)
      shapeArtLines = [
        `${c(10, chars.full)}${c(10, chars.full)}${c(10, chars.full)}${c(10, chars.full)}${c(10, chars.full)}`,
        `${c(0, chars.full)}${c(0, chars.threeQuarters)}${c(0, chars.threeQuarters)}${c(0, chars.threeQuarters)}${c(0, chars.full)}`,
        `${c(0, chars.full)}${c(0, chars.threeQuarters)}${c(0, chars.threeQuarters)}${c(0, chars.threeQuarters)}${c(0, chars.full)}`,
        `${c(-5, chars.full)}${c(-5, chars.full)}${c(-5, chars.full)}${c(-5, chars.full)}${c(-5, chars.full)}`
      ];
      // Pad to 5 lines for consistency with other shapes
      if (shapeArtLines.length < 5) shapeArtLines.push(' '.repeat(stripAnsi(shapeArtLines[0]).length));
      break;
    case SHAPES[4]: // Cylinder
      shapeArtLines = [
        `  ${c(10, chars.half)}${c(15, chars.threeQuarters)}${c(10, chars.half)}  `,
        ` ${c(5, chars.half)}${c(10, chars.full)}${c(5, chars.half)} `,
        ` ${c(0, chars.half)}${c(5, chars.full)}${c(0, chars.half)} `,
        ` ${c(-5, chars.half)}${c(0, chars.full)}${c(-5, chars.half)} `,
        `  ${c(-10, chars.half)}${c(-5, chars.threeQuarters)}${c(-10, chars.half)}  `
      ];
      break;
    default:
      // Corrected default case: provide a char to c()
      shapeArtLines = [
        `  ${c(0, '?')}  `,
        ` ${c(0, '?')}${c(0, '?')}${c(0, '?')} `,
        `  ${c(0, '?')}  `
      ];
  }

  // Add rarity marker (★) to the middle line, on the right
  if (rarity >= 70) {
    const middleLineIndex = Math.floor(shapeArtLines.length / 2);
    if (shapeArtLines[middleLineIndex]) {
        // Ensure not to add star if it would exceed ART_WIDTH significantly
        // (this check is approximate as stripAnsi is on the original line)
        if (stripAnsi(shapeArtLines[middleLineIndex]).length < ART_WIDTH - 2) {
             shapeArtLines[middleLineIndex] = shapeArtLines[middleLineIndex] + chalk.yellowBright(" ★");
        } else {
            // If line is too full, append star as a new line or specific handling
            // For now, just append to line, might overflow ART_WIDTH slightly
             shapeArtLines[middleLineIndex] = shapeArtLines[middleLineIndex] + chalk.yellowBright("★");
        }
    }
  }

  // Center the art within ART_WIDTH x ART_HEIGHT
  const finalArt: string[] = [];
  const artActualHeight = shapeArtLines.length;
  const topPadding = Math.floor((ART_HEIGHT - artActualHeight) / 2);

  for (let i = 0; i < topPadding; i++) {
    finalArt.push(' '.repeat(ART_WIDTH));
  }

  shapeArtLines.forEach(line => {
    const strippedLine = stripAnsi(line); // Get visible length
    const lineLength = strippedLine.length;
    const leftPaddingCount = Math.floor((ART_WIDTH - lineLength) / 2);
    const rightPaddingCount = ART_WIDTH - lineLength - leftPaddingCount;

    // Construct the padded line, ensuring no negative repeats
    const paddedLine =
        ' '.repeat(Math.max(0, leftPaddingCount)) +
        line +
        ' '.repeat(Math.max(0, rightPaddingCount));
    finalArt.push(paddedLine.substring(0, ART_WIDTH)); // Ensure line does not exceed ART_WIDTH
  });

  // Fill remaining lines with bottom padding
  const currentLines = finalArt.length;
  for (let i = 0; i < ART_HEIGHT - currentLines; i++) {
    finalArt.push(' '.repeat(ART_WIDTH));
  }
  // Ensure finalArt has exactly ART_HEIGHT lines
  while(finalArt.length < ART_HEIGHT) finalArt.push(' '.repeat(ART_WIDTH));
  if(finalArt.length > ART_HEIGHT) finalArt.splice(ART_HEIGHT);


  return finalArt;
}
