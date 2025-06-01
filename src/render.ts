// src/render.ts

import chalk from 'chalk';
import { StoneQualities, SHAPES } from './stone';

const ART_HEIGHT = 25;
const ART_WIDTH = 50;

function stripAnsi(str: string): string {
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
        "        "+c(20,chars.quarter).repeat(18),
        "       "+c(20,chars.half)+c(15,chars.full).repeat(16)+c(20,chars.half),
        "      "+c(20,chars.half)+c(15,chars.full)+" ".repeat(14)+c(15,chars.full)+c(20,chars.half),
        "     "+c(20,chars.threeQuarters)+c(15,chars.full)+" ".repeat(14)+c(15,chars.full)+c(20,chars.threeQuarters),
        "    "+c(20,chars.full)+c(15,chars.full).repeat(16)+c(20,chars.full),
        "   "+c(0,chars.full).repeat(18) + c(-10,chars.threeQuarters).repeat(6),
        "  "+c(0,chars.full).repeat(18) + c(-10,chars.threeQuarters).repeat(6),
        " "+c(0,chars.full).repeat(18) + c(-10,chars.threeQuarters).repeat(6),
        ""+c(0,chars.full).repeat(18) + c(-10,chars.threeQuarters).repeat(6),
        ""+c(-5,chars.full).repeat(18) + c(-15,chars.threeQuarters).repeat(6),
        ""+c(-5,chars.full).repeat(18) + c(-15,chars.threeQuarters).repeat(6),
        ""+c(-5,chars.full).repeat(18) + c(-15,chars.threeQuarters).repeat(6),
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
        " "+c(-5,chars.full)+c(0,chars.full)+c(5,chars.full)+c(5,chars.full)+c(5,chars.full)+c(0,chars.full)+c(-5,chars.full)+" ",
        "  "+c(-10,chars.full)+c(-5,chars.full)+c(0,chars.full)+c(0,chars.full)+c(0,chars.full)+c(-5,chars.full)+c(-10,chars.full)+"  ",
        "    "+c(-15,chars.full)+c(-10,chars.full)+c(-5,chars.full)+c(-5,chars.full)+c(-10,chars.full)+c(-15,chars.full)+"    ",
        "      "+c(-20,chars.threeQuarters)+c(-15,chars.full)+c(-10,chars.full)+c(-15,chars.full)+c(-20,chars.threeQuarters)+"      ",
        "        "+c(-25,chars.half)+c(-20,chars.threeQuarters)+c(-15,chars.full)+c(-20,chars.threeQuarters)+c(-25,chars.half)+"        ",
        "           "+c(-30,chars.quarter)+c(-25,chars.half)+c(-25,chars.half)+c(-30,chars.quarter)+"           ",
      ];
      break;

    case SHAPES[2]: // Pyramid - Larger
      const pyrWidth = 17;
      shapeArtLines = [];
      for (let i = 0; i < Math.ceil(pyrWidth / 2) ; i++) {
          const numChars = i * 2 + 1;
          const sidePaddingText = " ".repeat(Math.floor((pyrWidth - numChars) / 2)); // Renamed to avoid conflict
          const lightOffset = 15 - i * 5;
          let line = sidePaddingText;
          for (let j = 0; j < numChars; j++) {
              const distFromCenter = Math.abs(j - Math.floor(numChars / 2));
              const charLightOffset = lightOffset - distFromCenter * 5;
              line += c(charLightOffset, chars.full);
          }
          line += sidePaddingText;
          shapeArtLines.push(line);
      }
      shapeArtLines.push(c(-15,chars.full).repeat(pyrWidth));
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
        " "+c(5,chars.full)+" ".repeat(9)+c(5,chars.full)+" ",
        " "+c(0,chars.full)+" ".repeat(9)+c(0,chars.full)+" ",
        " "+c(0,chars.full)+" ".repeat(9)+c(0,chars.full)+" ",
        " "+c(0,chars.full)+" ".repeat(9)+c(0,chars.full)+" ",
        " "+c(-5,chars.full)+" ".repeat(9)+c(-5,chars.full)+" ",
        " "+c(-10,chars.threeQuarters)+c(-5,chars.full).repeat(5)+c(-10,chars.threeQuarters)+" ",
        "   "+c(-15,chars.half).repeat(7)+"   ",
      ];
      break;
    default:
      shapeArtLines = [c(0, '?').repeat(ART_WIDTH/2)];
  }

  if (rarity >= 70) {
    const middleLineIndex = Math.floor(shapeArtLines.length / 2);
    if (shapeArtLines[middleLineIndex]) {
        const strippedLineContent = stripAnsi(shapeArtLines[middleLineIndex]);
        if (strippedLineContent.length <= ART_WIDTH - 3) {
             shapeArtLines[middleLineIndex] = shapeArtLines[middleLineIndex] + " " + chalk.yellowBright("★");
        } else {
             shapeArtLines.push(" ".repeat(Math.floor(ART_WIDTH/2)-1) + chalk.yellowBright("★"));
        }
    }
  }

  const finalArt: string[] = [];
  const artActualHeight = shapeArtLines.length;
  const topPadding = Math.floor(Math.max(0, (ART_HEIGHT - artActualHeight)) / 2);

  for (let i = 0; i < topPadding; i++) {
    finalArt.push(' '.repeat(ART_WIDTH));
  }

  shapeArtLines.forEach(line => {
    if (finalArt.length < ART_HEIGHT) {
        const strippedLine = stripAnsi(line);
        const lineLength = strippedLine.length;
        const leftPaddingCount = Math.floor(Math.max(0, (ART_WIDTH - lineLength)) / 2);
        const rightPaddingCount = Math.max(0, ART_WIDTH - lineLength - leftPaddingCount);

        const paddedLine =
            ' '.repeat(leftPaddingCount) +
            line +
            ' '.repeat(rightPaddingCount);
        // Corrected line: No longer using substring, which caused issues with ANSI codes.
        finalArt.push(paddedLine);
    }
  });

  while(finalArt.length < ART_HEIGHT) {
    finalArt.push(' '.repeat(ART_WIDTH));
  }

  return finalArt.slice(0, ART_HEIGHT);
}
