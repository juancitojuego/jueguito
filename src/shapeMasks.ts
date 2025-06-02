// src/shapeMasks.ts

export const MASK_WIDTH = 60;
export const MASK_HEIGHT = 60;

/**
 * Generates a boolean mask for a given shape.
 * @param shape The name of the shape.
 * @param width The width of the mask.
 * @param height The height of the mask.
 * @returns A 2D boolean array representing the shape mask.
 */
export function generateShapeMask(
  shape: string,
  width: number = MASK_WIDTH,
  height: number = MASK_HEIGHT
): boolean[][] {
  const mask: boolean[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));
  const centerX = width / 2;
  const centerY = height / 2;

  switch (shape.toLowerCase()) {
    case 'sphere':
      const radius = Math.min(width, height) / 2 - 2;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const distSq = Math.pow(x - centerX + 0.5, 2) + Math.pow(y - centerY + 0.5, 2);
          if (distSq <= Math.pow(radius, 2)) {
            mask[y][x] = true;
          }
        }
      }
      break;

    case 'cube':
      const sideLength = Math.min(width, height) * 0.7;
      const halfSide = sideLength / 2;
      const startXCube = Math.floor(centerX - halfSide);
      const endXCube = Math.ceil(centerX + halfSide);
      const startYCube = Math.floor(centerY - halfSide);
      const endYCube = Math.ceil(centerY + halfSide);
      for (let y = startYCube; y < endYCube; y++) {
        for (let x = startXCube; x < endXCube; x++) {
          if (x >= 0 && x < width && y >= 0 && y < height) {
            mask[y][x] = true;
          }
        }
      }
      break;

    case 'pyramid':
      const pyramidBaseWidth = width * 0.8;
      const pyramidHeightRatio = 0.75;
      const actualPyramidHeight = height * pyramidHeightRatio;
      const apexY = Math.floor(centerY - actualPyramidHeight / 2);
      const baseY = Math.floor(centerY + actualPyramidHeight / 2);

      for (let y = apexY; y <= baseY; y++) {
        if (y >= 0 && y < height) {
          const progress = baseY - apexY === 0 ? 1 : (y - apexY) / (baseY - apexY);
          const currentWidth = progress * pyramidBaseWidth;
          const startXPyramid = Math.floor(centerX - currentWidth / 2);
          const endXPyramid = Math.ceil(centerX + currentWidth / 2);
          for (let x = startXPyramid; x < endXPyramid; x++) {
            if (x >= 0 && x < width) {
              mask[y][x] = true;
            }
          }
        }
      }
      break;

    case 'obelisk':
      const obeliskBodyH = height * 0.6;
      const obeliskTipH = height * 0.2;
      const obeliskW = width * 0.25;
      const totalObeliskH = obeliskBodyH + obeliskTipH;
      const startYOverall = Math.floor(centerY - totalObeliskH / 2);
      const tipApexY = startYOverall;
      const tipBaseY = startYOverall + obeliskTipH;
      const bodyTopY = tipBaseY;
      const bodyBottomY = bodyTopY + obeliskBodyH;
      const halfObeliskW = obeliskW / 2;
      const startXObeliskRect = Math.floor(centerX - halfObeliskW);
      const endXObeliskRect = Math.ceil(centerX + halfObeliskW);

      for (let y = Math.floor(bodyTopY); y < Math.floor(bodyBottomY); y++) {
        for (let x = startXObeliskRect; x < endXObeliskRect; x++) {
          if (x >= 0 && x < width && y >= 0 && y < height) {
            mask[y][x] = true;
          }
        }
      }
      for (let y = Math.floor(tipApexY); y < Math.floor(tipBaseY); y++) {
        if (y >= 0 && y < height) {
          const progress = obeliskTipH === 0 ? 1 : (y - tipApexY) / obeliskTipH;
          const currentTipWidth = progress * obeliskW;
          const startXTip = Math.floor(centerX - currentTipWidth / 2);
          const endXTip = Math.ceil(centerX + currentTipWidth / 2);
          for (let x = startXTip; x < endXTip; x++) {
            if (x >= 0 && x < width) {
              mask[y][x] = true;
            }
          }
        }
      }
      break;

    case 'crystal':
      const crystalBodyW = width * 0.35;
      const crystalPointH = height * 0.25;
      const crystalMidH = height * 0.5;
      const totalCrystalH = crystalMidH + 2 * crystalPointH;
      const crystalStartY = Math.floor(centerY - totalCrystalH / 2);
      const topPointApexY = crystalStartY;
      const topPointBaseY = crystalStartY + crystalPointH;
      const midBodyTopY = topPointBaseY;
      const midBodyBottomY = midBodyTopY + crystalMidH;
      const bottomPointTopY = midBodyBottomY;
      const bottomPointApexY = bottomPointTopY + crystalPointH;

      for (let y = 0; y < height; y++) {
        let currentW = 0;
        if (y >= topPointApexY && y < topPointBaseY) {
          currentW = crystalPointH === 0 ? crystalBodyW : ((y - topPointApexY) / crystalPointH) * crystalBodyW;
        } else if (y >= midBodyTopY && y < midBodyBottomY) {
          currentW = crystalBodyW;
        } else if (y >= bottomPointTopY && y < bottomPointApexY) {
          currentW = crystalPointH === 0 ? crystalBodyW : ((bottomPointApexY - y) / crystalPointH) * crystalBodyW;
        }

        const startXCrystal = Math.floor(centerX - currentW / 2);
        const endXCrystal = Math.ceil(centerX + currentW / 2);
        for (let x = startXCrystal; x < endXCrystal; x++) {
          if (x >= 0 && x < width) {
            mask[y][x] = true;
          }
        }
      }
      break;

    case 'shard':
      const shardH = height * 0.85;
      const baseW = width * 0.3;
      const tipW = width * 0.05;
      const shardApexActualY = Math.floor(centerY - shardH / 2);
      const shardBaseActualY = Math.floor(centerY + shardH / 2);
      const leanFactor = 0.3;

      for (let y = shardApexActualY; y <= shardBaseActualY; y++) {
        if (y >= 0 && y < height && shardBaseActualY - shardApexActualY !== 0) {
          const progress = (y - shardApexActualY) / (shardBaseActualY - shardApexActualY);
          const currentNominalW = tipW + progress * (baseW - tipW);
          const leanOffset = currentNominalW * leanFactor * (1 - progress);
          const startXShard = Math.floor(centerX - currentNominalW / 2 + leanOffset);
          const endXShard = Math.ceil(centerX + currentNominalW / 2 + leanOffset);

          for (let x = startXShard; x < endXShard; x++) {
            if (x >= 0 && x < width) {
              mask[y][x] = true;
            }
          }
        } else if (y >= 0 && y < height && shardBaseActualY - shardApexActualY === 0 && y === shardApexActualY) {
          const startXShard = Math.floor(centerX - baseW / 2);
          const endXShard = Math.ceil(centerX + baseW / 2);
          for (let x = startXShard; x < endXShard; x++) {
            if (x >= 0 && x < width) {
              mask[y][x] = true;
            }
          }
        }
      }
      break;

    default:
      // console.warn("Unknown shape: " + shape + ". Returning empty mask.");
      break;
  }
  return mask;
}
