import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

try {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  const logic = await page.evaluate(async () => {
    try {
      const [{ classifySwipe, screenSwipeThreshold }, { papaStepInterval, jujuDropInterval, runnerSpeed, runnerObstacleInterval }, { PAPA_ARENA }, { isReverseTurn }] =
        await Promise.all([
          import('/src/minigames/common/gesture.ts'),
          import('/src/minigames/common/difficulty.ts'),
          import('/src/minigames/papa/layout.ts'),
          import('/src/minigames/papa/direction.ts'),
        ]);
      const actualDirection = { x: 1, y: 0 };
      let queuedDirection = actualDirection;
      for (const requested of [{ x: 0, y: -1 }, { x: -1, y: 0 }]) {
        if (!isReverseTurn(actualDirection, requested)) queuedDirection = requested;
      }
      return {
        swipes: [
          classifySwipe({ x: 100, y: 100 }, { x: 55, y: 103 }, 36),
          classifySwipe({ x: 100, y: 100 }, { x: 145, y: 97 }, 36),
          classifySwipe({ x: 100, y: 100 }, { x: 102, y: 55 }, 36),
          classifySwipe({ x: 100, y: 100 }, { x: 98, y: 145 }, 36),
          classifySwipe({ x: 100, y: 100 }, { x: 70, y: 100 }, 36),
          classifySwipe({ x: 100, y: 100 }, { x: 145, y: 145 }, 36),
        ],
        thresholds: [screenSwipeThreshold({ x: 1, y: 1 }), screenSwipeThreshold({ x: 2, y: 2 })],
        papa: [1, 2, 3, 9].map(papaStepInterval),
        juju: [1, 3, 10].map(jujuDropInterval),
        runnerMiddle: runnerSpeed(300),
        runnerFast: runnerSpeed(900),
        obstacles: [0, 600, 2000].map(runnerObstacleInterval),
        papaFits: PAPA_ARENA.y + PAPA_ARENA.rows * PAPA_ARENA.cell <= 720,
        papaQueuedAfterRapidInput: queuedDirection,
      };
    } catch {
      return null;
    }
  });

  assert.ok(logic, 'game gesture, balance, and layout helpers are exported');
  assert.deepEqual(logic.swipes, ['left', 'right', 'up', 'down', null, null], 'short and diagonal gestures are ignored');
  assert.deepEqual(logic.thresholds, [36, 72], 'the swipe threshold remains 36 screen pixels at either scale');
  assert.deepEqual(logic.papa, [96, 90, 84, 84]);
  assert.deepEqual(logic.juju, [800, 640, 320]);
  assert.equal(logic.runnerMiddle, 4.2 + 300 / 260);
  assert.equal(logic.runnerFast, 6.6);
  assert.deepEqual(logic.obstacles, [1650, 1110, 960]);
  assert.equal(logic.papaFits, true, 'the full Papa arena fits on screen');
  assert.deepEqual(logic.papaQueuedAfterRapidInput, { x: 0, y: -1 }, 'rapid turns cannot reverse against the committed direction');
  console.log('Gestes, courbes de difficulté et cadrage des mini-jeux : OK');
} finally {
  await browser.close();
}
