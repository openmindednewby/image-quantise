import { deltaEOk, hexToOklab } from '@dloizides/color-science';

import { pixelOklab } from './pixels';
import type { QuantiseError, QuantiseResult, RgbaImage } from './types';

/** Mean and max deltaEOk from each source pixel to its result colour. */
export function measureError(image: RgbaImage, result: QuantiseResult): QuantiseError {
  const labs = result.colours.map(hexToOklab);
  let sum = 0;
  let max = 0;
  result.cells.forEach((cell, position) => {
    const source = pixelOklab(image, position);
    const distance = deltaEOk(source, labs[cell] ?? source);
    sum += distance;
    max = Math.max(max, distance);
  });
  return { mean: sum / result.cells.length, max };
}
