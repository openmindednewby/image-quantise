import { nearestInPalette, type Oklab } from '@dloizides/color-science';

import { pixelOklab } from './pixels';
import type { RgbaImage } from './types';

const LAB_CHANNELS = 3;
const A_OFFSET = 1;
const B_OFFSET = 2;
const RIGHT_WEIGHT = 7 / 16;
const BELOW_LEFT_WEIGHT = 3 / 16;
const BELOW_WEIGHT = 5 / 16;
const BELOW_RIGHT_WEIGHT = 1 / 16;

function addError(row: Float64Array, column: number, error: Oklab, weight: number): void {
  const offset = column * LAB_CHANNELS;
  if (column < 0 || offset >= row.length) {return;}
  row[offset] = (row[offset] ?? 0) + error.L * weight;
  row[offset + A_OFFSET] = (row[offset + A_OFFSET] ?? 0) + error.a * weight;
  row[offset + B_OFFSET] = (row[offset + B_OFFSET] ?? 0) + error.b * weight;
}

function withError(lab: Oklab, row: Float64Array, column: number): Oklab {
  const offset = column * LAB_CHANNELS;
  return {
    L: lab.L + (row[offset] ?? 0),
    a: lab.a + (row[offset + A_OFFSET] ?? 0),
    b: lab.b + (row[offset + B_OFFSET] ?? 0),
  };
}

function difference(target: Oklab, chosen: Oklab): Oklab {
  return { L: target.L - chosen.L, a: target.a - chosen.a, b: target.b - chosen.b };
}

/** Each pixel's index of the nearest centre. */
export function nearestCells(image: RgbaImage, centres: readonly Oklab[]): Uint16Array {
  const cells = new Uint16Array(image.width * image.height);
  for (let position = 0; position < cells.length; position += 1) {
    cells[position] = nearestInPalette(pixelOklab(image, position), centres);
  }
  return cells;
}

/** Each pixel's centre index by Floyd-Steinberg, carrying the error in OKLab. */
export function ditheredCells(image: RgbaImage, centres: readonly Oklab[]): Uint16Array {
  const { width, height } = image;
  const cells = new Uint16Array(width * height);
  let current = new Float64Array(width * LAB_CHANNELS);
  let below = new Float64Array(width * LAB_CHANNELS);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const position = y * width + x;
      const target = withError(pixelOklab(image, position), current, x);
      const index = nearestInPalette(target, centres);
      cells[position] = index;
      const error = difference(target, centres[index] ?? target);
      addError(current, x + 1, error, RIGHT_WEIGHT);
      addError(below, x - 1, error, BELOW_LEFT_WEIGHT);
      addError(below, x, error, BELOW_WEIGHT);
      addError(below, x + 1, error, BELOW_RIGHT_WEIGHT);
    }
    [current, below] = [below, current];
    below.fill(0);
  }
  return cells;
}

/** Renumbers the cells to drop unused colours; `used[new]` is the old index. */
export function compactCells(cells: Uint16Array): { readonly used: number[]; readonly cells: Uint16Array } {
  const renumbered = new Map<number, number>();
  const compacted = cells.map((cell) => {
    const known = renumbered.get(cell);
    if (known !== undefined) {return known;}
    renumbered.set(cell, renumbered.size);
    return renumbered.size - 1;
  });
  return { used: [...renumbered.keys()], cells: compacted };
}
