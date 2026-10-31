import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const baseUrl = process.env.CQ_BASE_URL ?? 'http://127.0.0.1:5173/';
const shots = new URL('../shots/mobile-fullscreen-2026-10-27/', import.meta.url).pathname;
mkdirSync(shots, { recursive: true });
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

async function canvasBounds() {
  const box = await page.locator('.game-host canvas').boundingBox();
  assert.ok(box, 'the game canvas is visible');
  return box;
}

async function screenPointForWorld(x, y) {
  const box = await canvasBounds();
  return page.evaluate(({ box, x, y }) => {
    const camera = window.__cq.getGame().scene.getScene('Village').cameras.main;
    return {
      x: box.x + ((x - camera.worldView.x) * camera.zoom / camera.width) * box.width,
      y: box.y + ((y - camera.worldView.y) * camera.zoom / camera.height) * box.height,
    };
  }, { box, x, y });
}

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__cq?.server);
  await page.getByRole('button', { name: /Maman/ }).first().click();
  await page.locator('input[type=password]').fill('noel2026');
  await page.locator('input[type=checkbox]').check();
  await page.getByRole('button', { name: /Entrer dans le village/ }).click();
  await page.waitForFunction(() => window.__cq?.getGame()?.scene?.getScene('Village')?.player?.texture?.key);
  await page.waitForFunction(() => !window.__cq.getGame().scene.getScene('Village').cameras.main.fadeEffect?.isRunning);

  const villageBounds = await canvasBounds();
  await page.screenshot({ path: `${shots}01-village.png` });
  assert.ok(villageBounds.width >= 389 && villageBounds.height >= 843,
    `mobile village fills the portrait viewport (${villageBounds.width}×${villageBounds.height})`);
  assert.equal(await page.locator('.touch-controls').isVisible(), true,
    'mobile movement and action controls are visible in the village');

  const chaletDoor = await screenPointForWorld(640, 323);
  await page.touchscreen.tap(chaletDoor.x, chaletDoor.y);
  await page.waitForFunction(() => window.__cq?.getGame()?.scene?.isActive('ChaletInterior'));
  await page.waitForFunction(() => !window.__cq.getGame().scene.getScene('ChaletInterior').cameras.main.fadeEffect?.isRunning);
  const chaletBounds = await canvasBounds();
  await page.screenshot({ path: `${shots}02-chalet.png` });
  assert.ok(chaletBounds.width >= 389 && chaletBounds.height >= 843,
    `mobile chalet fills the portrait viewport (${chaletBounds.width}×${chaletBounds.height})`);
  assert.equal(await page.locator('.chalet-return-button').isVisible(), true,
    'the chalet has a visible return-to-village button');

  // Une interruption pendant un appui tactile ne doit pas laisser marcher le personnage.
  const touchSession = await page.context().newCDPSession(page);
  const heldBounds = await page.locator('[data-touch-direction="left"]').boundingBox();
  assert.ok(heldBounds);
  await touchSession.send('Input.dispatchTouchEvent', {
    type: 'touchStart', touchPoints: [{ x: heldBounds.x + heldBounds.width / 2, y: heldBounds.y + heldBounds.height / 2 }],
  });
  await page.waitForFunction(() => window.__cq.getGame().scene.getScene('ChaletInterior').touchDirections.left);
  await page.getByRole('button', { name: /Pause/ }).evaluate((button) => button.click());
  await page.getByRole('button', { name: /Reprendre la partie/ }).waitFor();
  assert.equal(await page.locator('.touch-controls').getAttribute('aria-hidden'), 'true', 'touch controls are disabled while the pause window is open');
  await page.waitForFunction(() => !window.__cq.getGame().scene.getScene('ChaletInterior').touchDirections.left);
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.getByRole('button', { name: /Reprendre la partie/ }).click();
  await touchSession.send('Input.dispatchTouchEvent', {
    type: 'touchStart', touchPoints: [{ x: heldBounds.x + heldBounds.width / 2, y: heldBounds.y + heldBounds.height / 2 }],
  });
  await page.waitForFunction(() => window.__cq.getGame().scene.getScene('ChaletInterior').touchDirections.left);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForFunction(() => !window.__cq.getGame().scene.getScene('ChaletInterior').touchDirections.left);
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const firstFinger = { id: 11, x: heldBounds.x + 14, y: heldBounds.y + 20 };
  const secondFinger = { id: 12, x: heldBounds.x + 32, y: heldBounds.y + 20 };
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [firstFinger] });
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [firstFinger, secondFinger] });
  await page.waitForFunction(() => window.__cq.getGame().scene.getScene('ChaletInterior').touchDirections.left);
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [secondFinger] });
  assert.equal(await page.evaluate(() => window.__cq.getGame().scene.getScene('ChaletInterior').touchDirections.left), true,
    'releasing one finger keeps the direction active while another finger holds it');
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(() => !window.__cq.getGame().scene.getScene('ChaletInterior').touchDirections.left);
  await touchSession.detach();
  await page.getByRole('button', { name: /Pause/ }).click();
  await page.getByRole('button', { name: /Reprendre la partie/ }).waitFor();
  await page.touchscreen.tap(3, 200);
  await page.getByRole('button', { name: /Reprendre la partie/ }).waitFor({ state: 'hidden' });

  const chaletPlayerX = await page.evaluate(() => window.__cq.getGame().scene.getScene('ChaletInterior').player.x);
  const leftButton = page.locator('[data-touch-direction="left"]');
  const leftBounds = await leftButton.boundingBox();
  assert.ok(leftBounds, 'the chalet movement pad is visible');
  await page.mouse.move(leftBounds.x + leftBounds.width / 2, leftBounds.y + leftBounds.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(700);
  assert.equal(
    await page.evaluate(() => window.__cq.getGame().scene.getScene('ChaletInterior').touchDirections.left),
    true,
    'the touch direction stays active while the control is held',
  );
  await page.mouse.up();
  await page.waitForTimeout(100);
  const movedPlayerX = await page.evaluate(() => window.__cq.getGame().scene.getScene('ChaletInterior').player.x);
  assert.ok(movedPlayerX < chaletPlayerX - 5,
    `holding a touch direction moves the mascot (${chaletPlayerX} → ${movedPlayerX})`);

  await page.getByRole('button', { name: /Retour au village/ }).click();
  await page.waitForFunction(() =>
    window.__cq?.getGame()?.scene?.isActive('Village') &&
    !document.querySelector('.app-shell')?.classList.contains('in-chalet'),
  );
  await page.waitForFunction(() => !window.__cq.getGame().scene.getScene('Village').cameras.main.fadeEffect?.isRunning);
  const returnedBounds = await canvasBounds();
  await page.screenshot({ path: `${shots}03-retour-village.png` });
  assert.ok(returnedBounds.width >= 389 && returnedBounds.height >= 843,
    'returning from the chalet keeps the village fullscreen on mobile');

  await page.evaluate(() => {
    const scene = window.__cq.getGame().scene.getScene('Village');
    scene.cameras.main.stopFollow();
    scene.cameras.main.centerOn(170, 490);
  });
  const lowerHouseDoor = await screenPointForWorld(170, 490);
  await page.touchscreen.tap(lowerHouseDoor.x, lowerHouseDoor.y);
  await page.waitForFunction(() => window.__cq?.getGame()?.scene?.isActive('JujuBlocks'));
  await page.waitForTimeout(200);
  const minigameBounds = await canvasBounds();
  await page.screenshot({ path: `${shots}04-mini-jeu.png` });
  assert.ok(minigameBounds.width >= 389 && minigameBounds.height >= 843,
    'a bottom-house mini-game also fills the mobile viewport');
  await page.getByRole('button', { name: 'Quitter le mini-jeu' }).click();
  await page.waitForFunction(() => window.__cq?.getGame()?.scene?.isActive('Village'));
  await page.waitForTimeout(200);
  const afterMinigameBounds = await canvasBounds();
  await page.screenshot({ path: `${shots}05-retour-mini-jeu.png` });
  assert.ok(afterMinigameBounds.width >= 389 && afterMinigameBounds.height >= 843,
    'leaving a portrait mini-game keeps the village fullscreen');
  assert.deepEqual(errors, [], 'the mobile visit and return do not produce browser errors');
  console.log('Village mobile plein écran, commandes tactiles et retour du chalet vérifiés.');
} finally {
  await browser.close();
}
