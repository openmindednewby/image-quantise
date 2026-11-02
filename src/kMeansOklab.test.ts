import { deltaEOk, type Oklab } from '@dloizides/color-science';

import { kMeansOklab } from './kMeansOklab';

const RED = { L: 0.63, a: 0.22, b: 0.13 };
const BLUE = { L: 0.45, a: -0.03, b: -0.31 };

describe('kMeansOklab', () => {
  it('with two tight clusters and k of 2, returns one centre per cluster', () => {
    const samples = [RED, { ...RED, L: 0.65 }, BLUE, { ...BLUE, L: 0.43 }];

    const centres = kMeansOklab(samples, 2);

    expect(centres).toHaveLength(2);
    expect(centres.filter((centre) => deltaEOk(centre, { ...RED, L: 0.64 }) < 0.001)).toHaveLength(1);
    expect(centres.filter((centre) => deltaEOk(centre, { ...BLUE, L: 0.44 }) < 0.001)).toHaveLength(1);
  });

  it('with k above the number of distinct samples, returns only the distinct ones', () => {
    const samples = [RED, RED, BLUE];

    const centres = kMeansOklab(samples, 5);

    expect(centres).toHaveLength(2);
  });

  it('with no samples, returns no centres', () => {
    const samples: Oklab[] = [];

    const centres = kMeansOklab(samples, 3);

    expect(centres).toEqual([]);
  });
});
