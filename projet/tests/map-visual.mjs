import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const shots = join(root, 'shots');
mkdirSync(shots, { recursive: true });

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

try {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__cq?.server);
  await page.getByRole('button', { name: /Maman/ }).first().click();
  await page.locator('input[type=password]').fill('noel2026');
  await page.locator('input[type=checkbox]').check();
  await page.getByRole('button', { name: /Entrer dans le village/ }).click();
  await page.waitForFunction(() => window.__cq?.getGame()?.scene?.getScene('Village')?.player?.texture?.key);
  await page.waitForTimeout(900);

  const canvas = page.locator('canvas');
  assert.equal(await canvas.count(), 1, 'village renders one Phaser canvas');
  const dimensions = await canvas.evaluate((node) => ({ width: node.width, height: node.height }));
  assert.deepEqual(dimensions, { width: 1280, height: 720 }, 'map renders at the game resolution');
  await page.screenshot({ path: join(shots, 'map-refined.png') });
  assert.deepEqual(errors, [], 'map and decoration draw without browser errors');
  console.log(`Carte détaillée capturée (${dimensions.width}×${dimensions.height}), aucune erreur navigateur`);
} finally {
  await browser.close();
}
