# @dloizides/image-quantise

Reduce an image to a few colours, in OKLab. Pure TypeScript: no DOM, no canvas, no React.

## Quick start

```ts
import { quantise, quantiseToPalette } from '@dloizides/image-quantise';

const free = quantise(imageData, { maxColours: 16 });
const beads = quantiseToPalette(imageData, { palette: hexes, maxColours: 16, dither: true });
const code = codes[beads.paletteIndices[beads.cells[0]]];
```

`imageData` is anything shaped `{ data, width, height }` with RGBA bytes, such as a canvas `ImageData`.

## API

| Export | Purpose |
|---|---|
| `quantise(image, { maxColours, dither? })` | Picks the colours itself |
| `quantiseToPalette(image, { palette, maxColours, dither? })` | Uses only colours from `palette`; `paletteIndices` maps each result colour back to its position in `palette` |
| `kMeansOklab(samples, k)` | Deterministic cluster centres: farthest-first start, then Lloyd iterations |
| `measureError(image, result)` | Mean and max `deltaEOk` from source to result |
| `MAX_KMEANS_SAMPLES` | Pixels used for clustering; larger images are sampled evenly |

`cells` holds one index into `colours` per pixel, row by row. `colours` lists only colours in use, so it can be shorter than `maxColours`.

## Behaviour

- Same input, same output: there is no randomness.
- Pixels with alpha are flattened onto white, so every cell has a colour.
- Dithering is Floyd-Steinberg with the error carried in OKLab.
- Invalid dimensions, a data length other than `width * height * 4`, `maxColours` below 1 or an empty palette throw `RangeError`.
- Resize the image to the chart size first: the work grows with the pixel count.
