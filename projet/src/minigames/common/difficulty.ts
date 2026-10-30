/** Family-friendly, capped difficulty curves shared by the minigame scenes. */

export function papaStepInterval(round: number): number {
  const safeRound = Math.max(1, Math.min(3, Math.floor(round)));
  return 96 - (safeRound - 1) * 6;
}

export function jujuDropInterval(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.max(320, 800 - (safeLevel - 1) * 80);
}

export function runnerSpeed(distance: number): number {
  return Math.min(6.6, 4.2 + Math.max(0, distance) / 260);
}

export function runnerObstacleInterval(distance: number): number {
  return Math.max(960, 1650 - Math.max(0, distance) * 0.9);
}
