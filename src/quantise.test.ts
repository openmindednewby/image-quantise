import { availableDelica, findDelica } from '@dloizides/bead-chart';
import { deltaEOk, hexToOklab } from '@dloizides/color-science';

import { measureError } from './measureError';
import { pixelOklab } from './pixels';
import { MAX_KMEANS_SAMPLES, quantise, quantiseToPalette } from './quantise';
import type { RgbaImage } from './types';

const PHOTO_SIDE = 96;
const MEAN_DELTA_E_BOUND = 0.05;
const MAX_DELTA_E_BOUND = 0.2;

function solidImage(width: number, height: number, rgba: readonly number[]): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let offset = 0; offset < data.length; offset += 4) data.set(rgba, offset);
  return { data, width, height };
}

function scenePixel(x: number, y: number, side: number): readonly number[] {
  const insideSun = Math.hypot(x - side * 0.7, y - side * 0.25) < side * 0.14;
  const grain = ((x * 7 + y * 13) % 9) - 4;
  const row = (y / side) * 96;
  if (insideSun) return [245 + grain, 196 + grain, 72 + grain, 255];
  if (y < side * 0.55) return [70 + row + grain, 120 + row + grain, 205 + grain, 255];
  return [90 - row * 0.3 + grain, 130 - row * 0.4 + grain, 60 + grain, 255];
}

function testPhoto(side: number): RgbaImage {
  const data = new Uint8ClampedArray(side * side * 4);
  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) data.set(scenePixel(x, y, side), (y * side + x) * 4);
  }
  return { data, width: side, height: side };
}

function rampImage(width: number, height: number): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let position = 0; position < width * height; position += 1) {
    const grey = ((position % width) / (width - 1)) * 255;
    data.set([grey, grey, grey, 255], position * 4);
  }
  return { data, width, height };
}

function meanSourceLightness(image: RgbaImage): number {
  let sum = 0;
  const pixels = image.width * image.height;
  for (let position = 0; position < pixels; position += 1) sum += pixelOklab(image, position).L;
  return sum / pixels;
}

function meanLightness(hexes: readonly string[], cells: Uint16Array): number {
  const lightness = hexes.map((hex) => hexToOklab(hex).L);
  let sum = 0;
  cells.forEach((cell) => {
    sum += lightness[cell] ?? 0;
  });
  return sum / cells.length;
}

describe('quantiseToPalette', () => {
  const delica = availableDelica();
  const palette = delica.map((colour) => colour.hex);

  it('with a test photo and a 16-colour limit, every cell is a Delica code', () => {
    const photo = testPhoto(PHOTO_SIDE);

    const result = quantiseToPalette(photo, { palette, maxColours: 16 });

    const codes = Array.from(result.cells, (cell) => delica[result.paletteIndices[cell] ?? -1]?.code);
    expect(codes).toHaveLength(PHOTO_SIDE * PHOTO_SIDE);
    expect(codes.every((code) => code !== undefined && findDelica(code) !== undefined)).toBe(true);
  });

  it('with a test photo and a 16-colour limit, uses at most 16 colours', () => {
    const photo = testPhoto(PHOTO_SIDE);

    const result = quantiseToPalette(photo, { palette, maxColours: 16 });

    expect(result.colours.length).toBeGreaterThan(1);
    expect(result.colours.length).toBeLessThanOrEqual(16);
    expect(new Set(result.cells).size).toBe(result.colours.length);
  });

  it('with a test photo and a 16-colour limit, stays under the stated deltaE bound', () => {
    const photo = testPhoto(PHOTO_SIDE);

    const error = measureError(photo, quantiseToPalette(photo, { palette, maxColours: 16 }));

    expect(error.mean).toBeLessThan(MEAN_DELTA_E_BOUND);
    expect(error.max).toBeLessThan(MAX_DELTA_E_BOUND);
  });

  it('with a 2-colour limit, breaks the deltaE bound the 16-colour run meets', () => {
    const photo = testPhoto(PHOTO_SIDE);

    const error = measureError(photo, quantiseToPalette(photo, { palette, maxColours: 2 }));

    expect(error.mean).toBeGreaterThan(MEAN_DELTA_E_BOUND);
  });

  it('with a palette colour matching the image, returns its position in the palette', () => {
    const image = solidImage(2, 2, [255, 0, 0, 255]);

    const result = quantiseToPalette(image, {
      palette: ['#000000', '#ff0000', '#ffffff'],
      maxColours: 3,
    });

    expect(result.paletteIndices).toEqual([1]);
    expect(result.colours).toEqual(['#ff0000']);
  });

  it('with an empty palette, throws RangeError', () => {
    const image = solidImage(1, 1, [0, 0, 0, 255]);

    const act = (): unknown => quantiseToPalette(image, { palette: [], maxColours: 2 });

    expect(act).toThrow(RangeError);
  });

  it('with dithering on a dark-to-light ramp, mixes both colours mid-ramp and keeps mean lightness', () => {
    const image = rampImage(64, 8);
    const blackWhite = ['#000000', '#ffffff'];
    const sourceLightness = meanSourceLightness(image);

    const result = quantiseToPalette(image, { palette: blackWhite, maxColours: 2, dither: true });

    const midRamp = Array.from(result.cells).filter((_cell, position) => Math.abs(position % 64 - 32) < 4);
    expect(new Set(midRamp).size).toBe(2);
    expect(Math.abs(meanLightness(result.colours, result.cells) - sourceLightness)).toBeLessThan(0.02);
  });

  it('without dithering on a flat mid grey and a black-white palette, uses one colour', () => {
    const image = solidImage(32, 32, [119, 119, 119, 255]);

    const result = quantiseToPalette(image, { palette: ['#000000', '#ffffff'], maxColours: 2 });

    expect(result.colours).toHaveLength(1);
  });
});

describe('quantise', () => {
  it('with two flat colours and room for more, returns exactly those two', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]);

    const result = quantise({ data, width: 2, height: 1 }, { maxColours: 8 });

    expect([...result.colours].sort()).toEqual(['#0000ff', '#ff0000']);
    expect(result.colours[result.cells[0] ?? -1]).toBe('#ff0000');
    expect(result.colours[result.cells[1] ?? -1]).toBe('#0000ff');
  });

  it('with a colour limit, never exceeds it', () => {
    const photo = testPhoto(PHOTO_SIDE);

    const result = quantise(photo, { maxColours: 4 });

    expect(result.colours.length).toBeLessThanOrEqual(4);
  });

  it('run twice on the same image, returns identical output', () => {
    const photo = testPhoto(PHOTO_SIDE);
    const first = quantise(photo, { maxColours: 8, dither: true });

    const second = quantise(photo, { maxColours: 8, dither: true });

    expect(second.colours).toEqual(first.colours);
    expect(Array.from(second.cells)).toEqual(Array.from(first.cells));
  });

  it('with a transparent pixel, flattens it onto white', () => {
    const image = solidImage(1, 1, [0, 0, 0, 0]);

    const result = quantise(image, { maxColours: 2 });

    expect(result.colours).toEqual(['#ffffff']);
  });

  it('with an image larger than the sample cap, still maps every pixel', () => {
    const side = Math.ceil(Math.sqrt(MAX_KMEANS_SAMPLES)) + 1;
    const photo = testPhoto(side);

    const result = quantise(photo, { maxColours: 4 });

    expect(result.cells).toHaveLength(side * side);
    expect(measureError(photo, result).mean).toBeLessThan(0.1);
  });

  it.each([
    ['a data length that does not match', { data: new Uint8ClampedArray(3), width: 1, height: 1 }, 2],
    ['a zero width', { data: new Uint8ClampedArray(0), width: 0, height: 1 }, 2],
    ['a colour limit below 1', { data: new Uint8ClampedArray(4), width: 1, height: 1 }, 0],
  ])('with %s, throws RangeError', (_name, image, maxColours) => {
    const act = (): unknown => quantise(image, { maxColours });

    expect(act).toThrow(RangeError);
  });
});

describe('measureError', () => {
  it('with a result equal to the source, reports zero', () => {
    const image = solidImage(2, 1, [10, 200, 30, 255]);

    const error = measureError(image, { width: 2, height: 1, colours: ['#0ac81e'], cells: new Uint16Array(2) });

    expect(error.mean).toBeCloseTo(0, 5);
    expect(error.max).toBeCloseTo(0, 5);
  });

  it('with black reduced to white, reports the distance between them', () => {
    const image = solidImage(1, 1, [0, 0, 0, 255]);
    const expected = deltaEOk(hexToOklab('#000000'), hexToOklab('#ffffff'));

    const error = measureError(image, { width: 1, height: 1, colours: ['#ffffff'], cells: new Uint16Array(1) });

    expect(error.mean).toBeCloseTo(expected, 5);
  });
});
