import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Juju/ }).first().click();
  await page.getByRole('button', { name: 'Mode démo' }).click();
  await page.locator('input[type=password]').fill('noel2026');
  await page.locator('input[type=checkbox]').check();
  await page.getByRole('button', { name: 'Entrer dans le village' }).click();
  await page.waitForFunction(() => window.__cq?.getGame()?.scene?.isActive('Village'));
  await page.evaluate(() => window.__cq.bus.emit('chalet:enter', undefined));
  await page.waitForFunction(() => window.__cq.getGame().scene.isActive('ChaletInterior'));
  await page.evaluate(() => window.__cq.bus.emit('chest:interact', undefined));
  await page.locator('.chest-modal').waitFor();
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__cq.getGame().scene.isPaused('ChaletInterior')), true, 'le chalet est en pause pendant l’ouverture du coffre');
  await page.locator('.chest-modal').getByRole('button', { name: 'Fermer' }).click();
  await page.waitForFunction(() => window.__cq.getGame().scene.isActive('ChaletInterior'));
  await page.getByRole('button', { name: 'Retour au village' }).click();
  await page.waitForFunction(() => window.__cq.getGame().scene.isActive('Village') && !window.__cq.getGame().scene.isActive('ChaletInterior'));
  console.log('Coffre : chalet en pause pendant la lecture, puis retour possible au village.');
} finally { await browser.close(); }
