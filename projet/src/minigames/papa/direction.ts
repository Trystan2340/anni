export interface Direction {
  x: number;
  y: number;
}

/** Prevent a queued input from reversing the direction currently in motion. */
export function isReverseTurn(actual: Direction, requested: Direction): boolean {
  return actual.x === -requested.x && actual.y === -requested.y;
}
