import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
mkdirSync('shots/audit-actuel', { recursive: true });
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__cq?.server);
  await page.evaluate(() => window.__cq.server.resetDemo());
  await page.getByRole('button', { name: /Juju/ }).first().click();
  await page.getByRole('button', { name: 'Mode démo' }).click();
  await page.locator('input[type=password]').fill('noel2026');
  await page.locator('input[type=checkbox]').check();
  await page.getByRole('button', { name: 'Entrer dans le village' }).click();
  await page.waitForFunction(() => window.__cq.getGame()?.scene?.isActive('Village'));
  await page.evaluate(() => window.__cq.bus.emit('minigame:open', { houseId: 'maison-juju', gameId: 'juju-blocks' }));
  await page.waitForFunction(() => window.__cq.getGame()?.scene?.getScene('JujuBlocks')?.over === true);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const scene = window.__cq.getGame().scene.getScene('JujuBlocks');
    return scene.over === false && scene.current?.type === 'I';
  });
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space');
  await page.locator('.key-award').waitFor();
  assert.match(await page.locator('.key-award').innerText(), /clé dorée/i);
  assert.equal(await page.evaluate(() => window.__cq.server.progress('u-juju').keys.doree.acquired), true);
  await page.screenshot({ path: 'shots/audit-actuel/05-cle-doree-obtenue.png' });
  await page.getByRole('button', { name: 'Retourner au village' }).click();
  await page.waitForFunction(() => window.__cq.getGame().scene.isActive('Village'));
  assert.match(await page.locator('.hud-keys').innerText(), /En poche\s*1\s*\/\s*4/);
  assert.deepEqual(errors, []);
  console.log('Julie : une ligne jouée, clé dorée attribuée et visible en poche.');
} finally { await browser.close(); }
