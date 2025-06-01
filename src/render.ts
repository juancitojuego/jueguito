// src/render.ts

import chalk from 'chalk';
import { StoneQualities, SHAPES } from './stone';

const ART_HEIGHT = 10; // Target height for the generated art content
const ART_WIDTH = 20;  // Target width for the generated art content

// Helper to strip ANSI codes (for length calculation)
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\u001B\u009B][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

interface HSLColor { h: number; s: number; l: number; }

function getBaseHslForColor(colorName: string): HSLColor {
  switch (colorName.toLowerCase()) {
    case 'red':     return { h: 0,   s: 100, l: 50 };
    case 'yellow':  return { h: 60,  s: 100, l: 50 };
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

  const c = (lOffset: number = 0, char: string = chars.full) => {
    const L = Math.max(0, Math.min(100, baseHsl.l + lOffset));
    const S = (baseHsl.s === 0) ? 0 : 100;
    return chalk.hsl(baseHsl.h, S, L)(char);
  }

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
      shapeArtLines = [
        `  ${c(0, '?')}  `,
        ` ${c(0, '?')}${c(0, '?')}${c(0, '?')} `,
        `  ${c(0, '?')}  `
      ];
  }

  if (rarity >= 70) {
    const middleLineIndex = Math.floor(shapeArtLines.length / 2);
    if (shapeArtLines[middleLineIndex]) {
        if (stripAnsi(shapeArtLines[middleLineIndex]).length < ART_WIDTH - 2) {
             shapeArtLines[middleLineIndex] = shapeArtLines[middleLineIndex] + chalk.yellowBright(" ★");
        } else {
             shapeArtLines[middleLineIndex] = shapeArtLines[middleLineIndex] + chalk.yellowBright("★");
        }
    }
  }

  const finalArt: string[] = [];
  const artActualHeight = shapeArtLines.length;
  const topPadding = Math.floor((ART_HEIGHT - artActualHeight) / 2);

  for (let i = 0; i < topPadding; i++) {
    finalArt.push(' '.repeat(ART_WIDTH));
  }

  shapeArtLines.forEach(line => {
    const strippedLine = stripAnsi(line);
    const lineLength = strippedLine.length;
    const leftPaddingCount = Math.floor((ART_WIDTH - lineLength) / 2);
    const rightPaddingCount = ART_WIDTH - lineLength - leftPaddingCount;

    const paddedLine =
        ' '.repeat(Math.max(0, leftPaddingCount)) +
        line + // 'line' here is the original string with ANSI codes
        ' '.repeat(Math.max(0, rightPaddingCount));

    // Apply the FIX: Do not truncate the line if it contains ANSI codes beyond ART_WIDTH.
    // Blessed should handle clipping or wrapping if the content (including ANSI) is too wide for its box.
    // The padding above aims to make the *visible* part fit ART_WIDTH.
    // If the string with ANSI codes is longer than ART_WIDTH, let blessed handle it.
    // However, for strict adherence to returning lines that *should* fit visibily,
    // we might still want to ensure the paddedLine *conceptually* fits.
    // The issue was `substring` on a string with ANSI codes.
    // The current padding logic should make `strippedLine.length` close to ART_WIDTH.
    // If `line` (with ANSI) is much longer than `strippedLine`, and `ART_WIDTH` is based on `strippedLine`,
    // then `paddedLine` could exceed `ART_WIDTH` with its ANSI codes. This is usually fine.
    // The critical part is not to cut an ANSI sequence.
    // The previous `substring(0, ART_WIDTH)` was problematic.
    // Now, we just push `paddedLine`.
    finalArt.push(paddedLine);
  });

  const currentLines = finalArt.length;
  for (let i = 0; i < ART_HEIGHT - currentLines; i++) {
    finalArt.push(' '.repeat(ART_WIDTH));
  }
  while(finalArt.length < ART_HEIGHT) finalArt.push(' '.repeat(ART_WIDTH));
  if(finalArt.length > ART_HEIGHT) finalArt.splice(ART_HEIGHT);

  return finalArt;
}
