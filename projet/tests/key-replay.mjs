import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
async function login() {
  await page.getByRole('button', { name: /Maman/ }).first().click();
  await page.locator('input[type=password]').fill('noel2026');
  await page.locator('input[type=checkbox]').check();
  await page.getByRole('button', { name: /Entrer dans le village/ }).click();
  await page.waitForFunction(() => window.__cq?.getGame()?.scene?.isActive('Village'));
}
try {
  await page.goto(process.env.CQ_BASE_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__cq?.server);
  await page.evaluate(() => window.__cq.server.resetDemo());
  await login();
  await page.evaluate(() => window.__cq.bus.emit('minigame:result', { gameId: 'maman-match3', won: true }));
  await page.locator('.key-award').waitFor();
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__cq?.server);
  assert.equal(await page.evaluate(() => window.__cq.server.progress('u-maman').keys.rose.acquired), true, 'la clé gagnée reste en poche après actualisation');
  assert.equal(await page.evaluate(() => window.__cq.server.progress('u-maman').keys.rose.deposited), false);
  await login();
  await page.evaluate(() => window.__cq.bus.emit('minigame:result', { gameId: 'maman-match3', won: true }));
  assert.match(await page.locator('.key-award').innerText(), /déjà dans l.inventaire/i);
  await page.getByRole('button', { name: 'Retourner au village' }).click();
  assert.equal(await page.evaluate(() => window.__cq.server.depositKey('u-maman', 'rose').ok), true);
  await page.evaluate(() => window.__cq.bus.emit('minigame:result', { gameId: 'maman-match3', won: true }));
  assert.match(await page.locator('.key-award').innerText(), /déjà déposée dans le coffre/i, 'le message indique le bon emplacement après dépôt');
  assert.equal(await page.evaluate(() => window.__cq.server.progress('u-maman').keys.rose.deposited), true);
  console.log('Clé conservée avant dépôt et emplacement correct après une nouvelle victoire.');
} finally { await browser.close(); }
