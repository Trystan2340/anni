import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
mkdirSync('shots/audit-actuel', { recursive: true });
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  for (const mascot of ['Juju', 'Maman', 'Papa', 'Chacha', 'Trystan']) {
    await page.getByRole('button', { name: new RegExp(mascot) }).first().click();
    await page.getByRole('button', { name: 'Mode démo' }).click();
    await page.locator('input[type=password]').fill('noel2026');
    await page.locator('input[type=checkbox]').check();
    await page.getByRole('button', { name: 'Entrer dans le village' }).click();
    await page.waitForFunction(() => window.__cq?.getGame()?.scene?.isActive('Village'));
    await page.evaluate(() => window.__cq.bus.emit('minigame:open', { houseId: 'maison-chacha', gameId: 'chacha-runner' }));
    await page.waitForFunction(() => window.__cq?.getGame()?.scene?.getScene('ChachaRunner')?.player?.texture?.key);
    await page.keyboard.press('Enter');
    const texture = await page.evaluate(() => window.__cq.getGame().scene.getScene('ChachaRunner').player.texture.key);
    assert.equal(texture, `mascot-sheet:${mascot}`, `la course affiche le personnage ${mascot}`);
    if (mascot === 'Juju') {
      await page.screenshot({ path: 'shots/audit-actuel/02-course-juju-mobile.png' });
      await page.evaluate(() => {
        const scene = window.__cq.getGame().scene.getScene('ChachaRunner');
        window.__cq.previousRunnerSprite = scene.player;
        scene.scene.restart();
      });
      await page.waitForFunction(() => {
        const scene = window.__cq.getGame().scene.getScene('ChachaRunner');
        return scene.scene.isActive() && scene.player !== window.__cq.previousRunnerSprite && scene.player?.texture?.key;
      });
      assert.equal(await page.evaluate(() => window.__cq.getGame().scene.getScene('ChachaRunner').player.texture.key), 'mascot-sheet:Juju', 'rejouer conserve le personnage choisi');
    }
    await page.getByRole('button', { name: 'Quitter le mini-jeu' }).click();
    await page.waitForFunction(() => window.__cq?.getGame()?.scene?.isActive('Village'));
    await page.getByRole('button', { name: 'Quitter', exact: true }).click();
    await page.waitForFunction(() => window.__cq?.getGame() === null);
  }
  assert.deepEqual(errors, [], 'aucune erreur JavaScript pendant les changements de personnage');
  console.log('Course : les cinq personnages sélectionnés sont affichés.');
} finally { await browser.close(); }
