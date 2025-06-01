// src/render.ts

import chalk from 'chalk';
import { StoneQualities, SHAPES } from './stone';

const ART_HEIGHT = 25; // New larger height
const ART_WIDTH = 50;  // New larger width

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
    default:        return { h: 0,   s: 0,   l: 50 };
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
    case SHAPES[0]: // Cube - Larger and more detailed
      shapeArtLines = [
        // Top face (lighter) - with perspective
        "        "+c(20,chars.quarter).repeat(18),
        "       "+c(20,chars.half)+c(15,chars.full).repeat(16)+c(20,chars.half),
        "      "+c(20,chars.half)+c(15,chars.full)+" ".repeat(14)+c(15,chars.full)+c(20,chars.half),
        "     "+c(20,chars.threeQuarters)+c(15,chars.full)+" ".repeat(14)+c(15,chars.full)+c(20,chars.threeQuarters),
        "    "+c(20,chars.full)+c(15,chars.full).repeat(16)+c(20,chars.full), // Top edge highlight
        // Front face (medium) and Side face (darker)
        "   "+c(0,chars.full).repeat(18) + c(-10,chars.threeQuarters).repeat(6),
        "  "+c(0,chars.full).repeat(18) + c(-10,chars.threeQuarters).repeat(6),
        " "+c(0,chars.full).repeat(18) + c(-10,chars.threeQuarters).repeat(6),
        ""+c(0,chars.full).repeat(18) + c(-10,chars.threeQuarters).repeat(6),
        ""+c(-5,chars.full).repeat(18) + c(-15,chars.threeQuarters).repeat(6), // Bottom front slightly darker
        ""+c(-5,chars.full).repeat(18) + c(-15,chars.threeQuarters).repeat(6),
        ""+c(-5,chars.full).repeat(18) + c(-15,chars.threeQuarters).repeat(6),
        // Bottom perspective (very dark)
        "    "+c(-20,chars.full)+c(-15,chars.full).repeat(16)+c(-20,chars.full),
      ];
      break;

    case SHAPES[1]: // Sphere - Larger, more shading steps
      shapeArtLines = [
        "           "+c(25,chars.quarter)+c(30,chars.half)+c(30,chars.half)+c(25,chars.quarter)+"           ",
        "        "+c(20,chars.half)+c(25,chars.threeQuarters)+c(30,chars.full)+c(30,chars.full)+c(25,chars.threeQuarters)+c(20,chars.half)+"        ",
        "      "+c(15,chars.threeQuarters)+c(20,chars.full)+c(25,chars.full)+c(25,chars.full)+c(25,chars.full)+c(20,chars.full)+c(15,chars.threeQuarters)+"      ",
        "    "+c(10,chars.full)+c(15,chars.full)+c(20,chars.full)+c(20,chars.full)+c(20,chars.full)+c(15,chars.full)+c(10,chars.full)+"    ",
        "  "+c(5,chars.full)+c(10,chars.full)+c(15,chars.full)+c(15,chars.full)+c(15,chars.full)+c(15,chars.full)+c(10,chars.full)+c(5,chars.full)+"  ",
        " "+c(0,chars.full)+c(5,chars.full)+c(10,chars.full)+c(10,chars.full)+c(10,chars.full)+c(10,chars.full)+c(5,chars.full)+c(0,chars.full)+" ",
        " "+c(-5,chars.full)+c(0,chars.full)+c(5,chars.full)+c(5,chars.full)+c(5,chars.full)+c(0,chars.full)+c(-5,chars.full)+" ", // Shadow area starts
        "  "+c(-10,chars.full)+c(-5,chars.full)+c(0,chars.full)+c(0,chars.full)+c(0,chars.full)+c(-5,chars.full)+c(-10,chars.full)+"  ",
        "    "+c(-15,chars.full)+c(-10,chars.full)+c(-5,chars.full)+c(-5,chars.full)+c(-10,chars.full)+c(-15,chars.full)+"    ",
        "      "+c(-20,chars.threeQuarters)+c(-15,chars.full)+c(-10,chars.full)+c(-15,chars.full)+c(-20,chars.threeQuarters)+"      ",
        "        "+c(-25,chars.half)+c(-20,chars.threeQuarters)+c(-15,chars.full)+c(-20,chars.threeQuarters)+c(-25,chars.half)+"        ",
        "           "+c(-30,chars.quarter)+c(-25,chars.half)+c(-25,chars.half)+c(-30,chars.quarter)+"           ",
      ];
      break;

    case SHAPES[2]: // Pyramid - Larger
      const pyrWidth = 17; // Base width for this pyramid art
      shapeArtLines = [];
      for (let i = 0; i < Math.ceil(pyrWidth / 2) ; i++) {
          const numChars = i * 2 + 1;
          const sidePadding = " ".repeat(Math.floor((pyrWidth - numChars) / 2));
          // Lightness decreases towards the base, increases towards the top/center for highlight
          const lightOffset = 15 - i * 5; // Top is lighter
          let line = sidePadding;
          for (let j = 0; j < numChars; j++) {
              // Shading from center to edges
              const distFromCenter = Math.abs(j - Math.floor(numChars / 2));
              const charLightOffset = lightOffset - distFromCenter * 5;
              line += c(charLightOffset, chars.full);
          }
          line += sidePadding;
          shapeArtLines.push(line);
      }
      // Add a solid base line, slightly darker
      shapeArtLines.push(c(-15,chars.full).repeat(pyrWidth));
      // Example, make it taller by adding more layers
      const extraLayers = 3;
      for(let i=0; i < extraLayers; i++) {
          shapeArtLines.splice(shapeArtLines.length-1, 0, c(-10 - i*2, chars.full).repeat(pyrWidth));
      }
      break;

    case SHAPES[3]: // Prism (scaled rectangle)
      shapeArtLines = [
        c(10,chars.full).repeat(15),
        c(5,chars.full) + c(0,chars.threeQuarters).repeat(13) + c(5,chars.full),
        c(5,chars.full) + c(0,chars.threeQuarters).repeat(13) + c(5,chars.full),
        c(5,chars.full) + c(0,chars.threeQuarters).repeat(13) + c(5,chars.full),
        c(5,chars.full) + c(0,chars.threeQuarters).repeat(13) + c(5,chars.full),
        c(5,chars.full) + c(0,chars.threeQuarters).repeat(13) + c(5,chars.full),
        c(-5,chars.full).repeat(15)
      ];
      break;
    case SHAPES[4]: // Cylinder (scaled)
      shapeArtLines = [
        "   "+c(15,chars.half).repeat(7)+"   ",
        " "+c(10,chars.threeQuarters)+c(15,chars.full).repeat(5)+c(10,chars.threeQuarters)+" ",
        " "+c(5,chars.full)+" ".repeat(9)+c(5,chars.full)+" ", // Hollow center illusion
        " "+c(0,chars.full)+" ".repeat(9)+c(0,chars.full)+" ",
        " "+c(0,chars.full)+" ".repeat(9)+c(0,chars.full)+" ",
        " "+c(0,chars.full)+" ".repeat(9)+c(0,chars.full)+" ",
        " "+c(-5,chars.full)+" ".repeat(9)+c(-5,chars.full)+" ",
        " "+c(-10,chars.threeQuarters)+c(-5,chars.full).repeat(5)+c(-10,chars.threeQuarters)+" ",
        "   "+c(-15,chars.half).repeat(7)+"   ",
      ];
      break;
    default:
      shapeArtLines = [c(0, '?').repeat(ART_WIDTH/2)]; // Simple placeholder
  }

  // Add rarity marker
  if (rarity >= 70) {
    const middleLineIndex = Math.floor(shapeArtLines.length / 2);
    if (shapeArtLines[middleLineIndex]) {
        // Append to the side of the art, trying not to exceed ART_WIDTH too much
        const strippedLine = stripAnsi(shapeArtLines[middleLineIndex]);
        if (strippedLine.length <= ART_WIDTH - 3) { // Space for " ★"
             shapeArtLines[middleLineIndex] = shapeArtLines[middleLineIndex] + " " + chalk.yellowBright("★");
        } else { // Otherwise, add it on a new line below the art
             shapeArtLines.push(" ".repeat(Math.floor(ART_WIDTH/2)-1) + chalk.yellowBright("★"));
        }
    }
  }

  // Center the art within ART_WIDTH x ART_HEIGHT
  const finalArt: string[] = [];
  const artActualHeight = shapeArtLines.length;
  const topPadding = Math.floor(Math.max(0, (ART_HEIGHT - artActualHeight)) / 2);

  for (let i = 0; i < topPadding; i++) {
    finalArt.push(' '.repeat(ART_WIDTH));
  }

  shapeArtLines.forEach(line => {
    if (finalArt.length < ART_HEIGHT) { // Only add lines if we haven't filled ART_HEIGHT
        const strippedLine = stripAnsi(line);
        const lineLength = strippedLine.length;
        const leftPaddingCount = Math.floor(Math.max(0, (ART_WIDTH - lineLength)) / 2);
        const rightPaddingCount = Math.max(0, ART_WIDTH - lineLength - leftPaddingCount);

        const paddedLine =
            ' '.repeat(leftPaddingCount) +
            line +
            ' '.repeat(rightPaddingCount);
        finalArt.push(paddedLine.substring(0, ART_WIDTH)); // Ensure line does not exceed ART_WIDTH by ansi codes making it longer than visible
    }
  });

  while(finalArt.length < ART_HEIGHT) {
    finalArt.push(' '.repeat(ART_WIDTH));
  }

  return finalArt.slice(0, ART_HEIGHT); // Ensure exactly ART_HEIGHT lines
}
