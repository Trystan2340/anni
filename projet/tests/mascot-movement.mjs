import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

const movementState = () =>
  page.evaluate(() => {
    const scene = window.__cq.getGame().scene.getScene('Village');
    return {
      facing: scene.facing,
      animation: scene.player.anims.currentAnim?.key ?? null,
      frame: scene.player.frame?.name,
    };
  });

try {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Maman/ }).first().click();
  await page.locator('input[type=password]').fill('noel2026');
  await page.locator('input[type=checkbox]').check();
  await page.getByRole('button', { name: /Entrer dans le village/ }).click();
  await page.waitForFunction(() => window.__cq?.getGame()?.scene?.getScene('Village')?.player?.texture?.key);

  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(220);
  const side = await movementState();
  assert.equal(side.facing, 'side');
  assert.equal(side.animation, 'mascot-walk:Maman:side');

  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(100);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(120);
  const up = await movementState();
  await page.keyboard.up('ArrowUp');
  assert.equal(up.facing, 'up', 'player direction changes when input changes during movement');
  assert.equal(up.animation, 'mascot-walk:Maman:up', 'walk animation follows the new direction');
  assert.ok([3, 4, 5].includes(up.frame), 'player frame remains in the up-facing row');
  assert.deepEqual(errors, [], 'movement causes no runtime errors');
  console.log('Animation de marche synchronisée avec la direction du joueur');
} finally {
  await browser.close();
}
