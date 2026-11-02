import { linearToOklab, rgbToLinear, type Oklab } from '@dloizides/color-science';

import type { RgbaImage } from './types';

const BYTES_PER_PIXEL = 4;
const GREEN_OFFSET = 1;
const BLUE_OFFSET = 2;
const ALPHA_OFFSET = 3;
const BYTE_MAX = 255;

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function overWhite(channel: number, alpha: number): number {
  return channel * alpha + BYTE_MAX * (1 - alpha);
}

/** Throws RangeError unless the image has positive dimensions and matching RGBA data. */
export function assertValidImage({ data, width, height }: RgbaImage): void {
  if (!isPositiveInteger(width) || !isPositiveInteger(height)) {
    throw new RangeError(`Invalid image size: ${width}x${height}`);
  }
  if (data.length !== width * height * BYTES_PER_PIXEL) {
    throw new RangeError(`Expected ${width * height * BYTES_PER_PIXEL} bytes, got ${data.length}`);
  }
}

/** Throws RangeError unless the colour limit is a whole number of at least 1. */
export function assertValidLimit(maxColours: number): void {
  if (!isPositiveInteger(maxColours)) {
    throw new RangeError(`Invalid colour limit: ${maxColours}`);
  }
}

/** The pixel at this position in OKLab, flattened onto white. */
export function pixelOklab({ data }: RgbaImage, position: number): Oklab {
  const offset = position * BYTES_PER_PIXEL;
  const alpha = (data[offset + ALPHA_OFFSET] ?? BYTE_MAX) / BYTE_MAX;
  return linearToOklab(
    rgbToLinear({
      r: overWhite(data[offset] ?? 0, alpha),
      g: overWhite(data[offset + GREEN_OFFSET] ?? 0, alpha),
      b: overWhite(data[offset + BLUE_OFFSET] ?? 0, alpha),
    }),
  );
}
