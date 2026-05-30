// Seeded PRNG (mulberry32). A single 32-bit integer of state makes runs
// reproducible and easy to serialize into the saved game.

export class Rng {
  state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  next(): number {
    let a = this.state;
    a = (a + 0x6d2b79f5) | 0;
    this.state = a;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Float in [min, max).
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  // Integer in [0, maxExclusive).
  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)];
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  // Weighted pick. `weights[i]` corresponds to `items[i]`.
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
    if (total <= 0) return this.pick(items);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= Math.max(0, weights[i]);
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }
}

// Derive a seed from a string (e.g. from the URL) so shared seeds are stable.
export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
