export interface RgbaImage {
  readonly data: ArrayLike<number>;
  readonly width: number;
  readonly height: number;
}

export interface QuantiseOptions {
  readonly maxColours: number;
  readonly dither?: boolean;
}

export interface PaletteQuantiseOptions extends QuantiseOptions {
  readonly palette: readonly string[];
}

export interface QuantiseResult {
  readonly width: number;
  readonly height: number;
  readonly colours: readonly string[];
  readonly cells: Uint16Array;
}

export interface PaletteQuantiseResult extends QuantiseResult {
  readonly paletteIndices: readonly number[];
}

export interface QuantiseError {
  readonly mean: number;
  readonly max: number;
}
