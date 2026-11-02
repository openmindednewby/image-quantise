import { hexToOklab, nearestInPalette, oklabToHex, type Oklab } from '@dloizides/color-science';

import { kMeansOklab } from './kMeansOklab';
import { compactCells, ditheredCells, nearestCells } from './mapCells';
import { assertValidImage, assertValidLimit, pixelOklab } from './pixels';
import type {
  PaletteQuantiseOptions,
  PaletteQuantiseResult,
  QuantiseOptions,
  QuantiseResult,
  RgbaImage,
} from './types';

export const MAX_KMEANS_SAMPLES = 65_536;

function sampleOklab(image: RgbaImage): Oklab[] {
  const step = Math.ceil(Math.sqrt((image.width * image.height) / MAX_KMEANS_SAMPLES));
  const samples: Oklab[] = [];
  for (let y = 0; y < image.height; y += step) {
    for (let x = 0; x < image.width; x += step) {
      samples.push(pixelOklab(image, y * image.width + x));
    }
  }
  return samples;
}

function mapCells(image: RgbaImage, centres: readonly Oklab[], dither: boolean | undefined): Uint16Array {
  return dither === true ? ditheredCells(image, centres) : nearestCells(image, centres);
}

/** Reduces an image to at most `maxColours` colours it chooses itself. */
export function quantise(image: RgbaImage, { maxColours, dither }: QuantiseOptions): QuantiseResult {
  assertValidImage(image);
  assertValidLimit(maxColours);
  const centres = kMeansOklab(sampleOklab(image), maxColours);
  const { used, cells } = compactCells(mapCells(image, centres, dither));
  const colours = used.map((index) => oklabToHex(centres[index] ?? { L: 0, a: 0, b: 0 }));
  return { width: image.width, height: image.height, colours, cells };
}

/** Reduces an image to at most `maxColours` colours taken from `palette`. */
export function quantiseToPalette(
  image: RgbaImage,
  { palette, maxColours, dither }: PaletteQuantiseOptions,
): PaletteQuantiseResult {
  assertValidImage(image);
  assertValidLimit(maxColours);
  if (palette.length === 0) {throw new RangeError('The palette is empty');}
  const labs = palette.map(hexToOklab);
  const centres = kMeansOklab(sampleOklab(image), maxColours);
  const chosen = [...new Set(centres.map((centre) => nearestInPalette(centre, labs)))];
  const chosenLabs = chosen.map((index) => labs[index] ?? { L: 0, a: 0, b: 0 });
  const { used, cells } = compactCells(mapCells(image, chosenLabs, dither));
  const paletteIndices = used.map((index) => chosen[index] ?? 0);
  const colours = paletteIndices.map((index) => palette[index] ?? '');
  return { width: image.width, height: image.height, colours, cells, paletteIndices };
}
