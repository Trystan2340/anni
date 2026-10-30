const GAME_WIDTH = 1280;

export const PAPA_ARENA = {
  columns: 46,
  rows: 26,
  cell: 21,
  x: (GAME_WIDTH - 46 * 21) / 2,
  y: 118,
} as const;
