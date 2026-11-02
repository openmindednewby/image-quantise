import { deltaEOk, nearestInPalette, type Oklab } from '@dloizides/color-science';

const MAX_ITERATIONS = 16;
const ORIGIN: Oklab = { L: 0, a: 0, b: 0 };

function meanOf(samples: readonly Oklab[]): Oklab {
  const sum = samples.reduce(
    (total, sample) => ({ L: total.L + sample.L, a: total.a + sample.a, b: total.b + sample.b }),
    ORIGIN,
  );
  return { L: sum.L / samples.length, a: sum.a / samples.length, b: sum.b / samples.length };
}

function largest(values: readonly number[]): number {
  return values.reduce((best, value) => Math.max(best, value), 0);
}

function farthestFirstCentres(samples: readonly Oklab[], k: number): Oklab[] {
  const start = samples[nearestInPalette(meanOf(samples), samples)] ?? ORIGIN;
  const centres = [start];
  const distances = samples.map((sample) => deltaEOk(sample, start));
  while (centres.length < k) {
    const farthest = largest(distances);
    if (farthest === 0) {return centres;}
    const next = samples[distances.indexOf(farthest)] ?? start;
    centres.push(next);
    samples.forEach((sample, index) => {
      distances[index] = Math.min(distances[index] ?? Infinity, deltaEOk(sample, next));
    });
  }
  return centres;
}

function assign(samples: readonly Oklab[], centres: readonly Oklab[]): number[] {
  return samples.map((sample) => nearestInPalette(sample, centres));
}

function recentre(samples: readonly Oklab[], labels: readonly number[], centres: readonly Oklab[]): Oklab[] {
  return centres.map((centre, centreIndex) => {
    const members = samples.filter((_sample, index) => labels[index] === centreIndex);
    return members.length === 0 ? centre : meanOf(members);
  });
}

function sameLabels(left: readonly number[], right: readonly number[]): boolean {
  return left.every((label, index) => label === right[index]);
}

/** Deterministic k-means in OKLab; fewer than k centres when fewer distinct samples exist. */
export function kMeansOklab(samples: readonly Oklab[], k: number): Oklab[] {
  if (samples.length === 0) {return [];}
  let centres = farthestFirstCentres(samples, k);
  let labels = assign(samples, centres);
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    centres = recentre(samples, labels, centres);
    const nextLabels = assign(samples, centres);
    if (sameLabels(labels, nextLabels)) {return centres;}
    labels = nextLabels;
  }
  return centres;
}
