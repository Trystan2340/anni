import type Phaser from 'phaser';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface GesturePoint {
  x: number;
  y: number;
}

/** Returns a cardinal direction only when the gesture is long and unambiguous. */
export function classifySwipe(
  start: GesturePoint,
  end: GesturePoint,
  threshold: number,
): SwipeDirection | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const horizontal = Math.abs(dx);
  const vertical = Math.abs(dy);
  if (Math.hypot(dx, dy) < threshold) return null;
  if (horizontal >= vertical * 1.25) return dx < 0 ? 'left' : 'right';
  if (vertical >= horizontal * 1.25) return dy < 0 ? 'up' : 'down';
  return null;
}

export function screenSwipeThreshold(displayScale: GesturePoint, screenPixels = 36): number {
  const scale = Math.max(0.01, Math.min(Math.abs(displayScale.x), Math.abs(displayScale.y)));
  return screenPixels * scale;
}

/** Binds one-finger swipes using a threshold that stays constant in screen pixels. */
export function bindSceneSwipes(
  scene: Phaser.Scene,
  onSwipe: (direction: SwipeDirection) => void,
  canSwipe: () => boolean,
  minScreenPixels = 36,
): () => void {
  let start: GesturePoint | null = null;
  const pointerDown = (pointer: Phaser.Input.Pointer) => {
    start = canSwipe() ? { x: pointer.x, y: pointer.y } : null;
  };
  const pointerUp = (pointer: Phaser.Input.Pointer) => {
    const origin = start;
    start = null;
    if (!origin || !canSwipe()) return;

    const threshold = screenSwipeThreshold(scene.scale.displayScale, minScreenPixels);
    const direction = classifySwipe(origin, { x: pointer.x, y: pointer.y }, threshold);
    if (direction) onSwipe(direction);
  };

  scene.input.on('pointerdown', pointerDown);
  scene.input.on('pointerup', pointerUp);
  return () => {
    scene.input.off('pointerdown', pointerDown);
    scene.input.off('pointerup', pointerUp);
    start = null;
  };
}
