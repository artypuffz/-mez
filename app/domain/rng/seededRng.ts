export interface SeededRng {
  /** Next float in [0, 1). */
  next(): number;
  /** Random integer in [min, max], inclusive on both ends. */
  int(min: number, max: number): number;
  /** Random element from a non-empty array. */
  pick<T>(items: readonly T[]): T;
}

function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32 — tiny, fast, deterministic PRNG. Not cryptographic; that's
// fine, this only drives gameplay RNG, never anything security-sensitive.
function mulberry32(seed: number): () => number {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRng(seed: string): SeededRng {
  const next = mulberry32(hashSeed(seed));
  return {
    next,
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    pick(items) {
      if (items.length === 0) {
        throw new Error("SeededRng.pick() called with an empty array");
      }
      return items[Math.floor(next() * items.length)];
    },
  };
}

// For a brand new game — never shown to the player, only used internally
// and (in debug/test contexts) to reproduce a specific playthrough.
export function generateRandomSeed(): string {
  return Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 0xffffffff).toString(36)
  ).join("-");
}
