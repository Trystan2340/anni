import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__cq?.server);
  await page.evaluate(() => window.__cq.server.resetDemo());
  await page.getByRole('button', { name: /Juju/ }).first().click();
  await page.getByRole('button', { name: 'Mode démo' }).click();
  await page.locator('input[type=password]').fill('noel2026');
  await page.locator('input[type=checkbox]').check();
  await page.getByRole('button', { name: 'Entrer dans le village' }).click();
  await page.waitForFunction(() => window.__cq?.getGame()?.scene?.isActive('Village'));
  for (const game of [
    { house: 'papa', scene: 'PapaTron', game: 'papa-tron', key: 'bleue', elapsed: 19850 },
    { house: 'chacha', scene: 'ChachaRunner', game: 'chacha-runner', key: 'violette', elapsed: 14850 },
  ]) {
    await page.evaluate(({ house, game }) => window.__cq.bus.emit('minigame:open', { houseId: `maison-${house}`, gameId: game }), game);
    await page.waitForFunction((scene) => window.__cq.getGame().scene.getScene(scene)?.over === true, game.scene);
    await page.keyboard.press('Enter');
    await page.waitForFunction((scene) => window.__cq.getGame().scene.getScene(scene)?.over === false, game.scene);
    // Avance le chrono sans forcer la victoire : c'est update() qui décide du résultat.
    await page.evaluate(({ scene, elapsed }) => { window.__cq.getGame().scene.getScene(scene).elapsedMs = elapsed; }, game);
    await page.locator('.key-award').waitFor();
    assert.equal(await page.evaluate((key) => window.__cq.server.progress('u-juju').keys[key].acquired, game.key), true, `${game.key} attribuée après le chrono`);
    await page.getByRole('button', { name: 'Retourner au village' }).click();
    await page.waitForFunction(() => window.__cq.getGame().scene.isActive('Village'));
  }
  assert.match(await page.locator('.hud-keys').innerText(), /En poche\s*2\s*\/\s*4/);
  assert.deepEqual(errors, []);
  console.log('Papa et Chacha : fins des chronos, clés attribuées et inventaire mis à jour.');
} finally { await browser.close(); }
