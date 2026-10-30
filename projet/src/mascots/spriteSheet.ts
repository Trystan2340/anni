import type { Direction } from './types';

export const SPRITE_FRAME_WIDTH = 64;
export const SPRITE_FRAME_HEIGHT = 72;

export type MascotFrame = 'idle' | 'walkA' | 'walkB';

const ROW_BY_DIRECTION: Record<Direction, number> = { down: 0, up: 1, side: 2 };
const COLUMN_BY_FRAME: Record<MascotFrame, number> = { idle: 0, walkA: 1, walkB: 2 };

export function mascotFrameIndex(direction: Direction, frame: MascotFrame): number {
  return ROW_BY_DIRECTION[direction] * 3 + COLUMN_BY_FRAME[frame];
}
