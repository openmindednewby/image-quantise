import { hexToOklab } from '@dloizides/color-science';

import { compactCells, ditheredCells, nearestCells } from './mapCells';
import type { RgbaImage } from './types';

const BLACK = hexToOklab('#000000');
const WHITE = hexToOklab('#ffffff');

function greyImage(side: number, grey: number): RgbaImage {
  const data = new Uint8ClampedArray(side * side * 4);
  for (let offset = 0; offset < data.length; offset += 4) data.set([grey, grey, grey, 255], offset);
  return { data, width: side, height: side };
}

describe('ditheredCells', () => {
  it('with a flat grey and black and white centres, mixes them to the grey lightness', () => {
    const image = greyImage(32, 119);
    const expectedLightness = hexToOklab('#777777').L;

    const cells = ditheredCells(image, [BLACK, WHITE]);

    const whiteShare = Array.from(cells).filter((cell) => cell === 1).length / cells.length;
    expect(Math.abs(whiteShare - expectedLightness)).toBeLessThan(0.02);
  });
});

describe('nearestCells', () => {
  it('with a flat grey and black and white centres, uses only the nearer centre', () => {
    const image = greyImage(32, 119);

    const cells = nearestCells(image, [BLACK, WHITE]);

    expect(new Set(cells).size).toBe(1);
  });
});

describe('compactCells', () => {
  it('with an unused index, renumbers cells in first-seen order and lists the old indices', () => {
    const cells = new Uint16Array([5, 2, 5, 7]);

    const compacted = compactCells(cells);

    expect(compacted.used).toEqual([5, 2, 7]);
    expect(Array.from(compacted.cells)).toEqual([0, 1, 0, 2]);
  });
});
