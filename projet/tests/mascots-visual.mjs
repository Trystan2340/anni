import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const expected = ['Maman', 'Papa', 'Juju', 'Chacha', 'Trystan'];
mkdirSync('shots', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

try {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: join('shots', 'login-mascots.png') });

  const avatars = await page.locator('.profile-card [data-mascot-id]').evaluateAll((nodes) =>
    Promise.all(
      nodes.map(async (node) => {
        const style = getComputedStyle(node);
        const match = style.backgroundImage.match(/url\(["']?(.*?)["']?\)/);
        if (!match) return { id: node.dataset.mascotId, width: 0, height: 0, pixelated: style.imageRendering };
        const image = new Image();
        image.src = match[1];
        await image.decode();
        return {
          id: node.dataset.mascotId,
          width: image.naturalWidth,
          height: image.naturalHeight,
          pixelated: style.imageRendering,
        };
      }),
    ),
  );
  assert.deepEqual(avatars.map((avatar) => avatar.id), expected, 'profiles render the confirmed mascot order');
  assert.ok(avatars.every((avatar) => avatar.width === 192 && avatar.height === 216), 'each sheet is 192 × 216');
  assert.ok(avatars.every((avatar) => avatar.pixelated === 'pixelated'), 'profile art uses nearest-neighbor scaling');

  await page.getByRole('button', { name: /Maman/ }).first().click();
  await page.locator('input[type=password]').fill('noel2026');
  await page.locator('input[type=checkbox]').check();
  await page.getByRole('button', { name: /Entrer dans le village/ }).click();
  await page.waitForFunction(() => window.__cq?.getGame()?.scene?.getScene('Village')?.player?.texture?.key);
  const textureKey = await page.evaluate(() => window.__cq.getGame().scene.getScene('Village').player.texture.key);
  assert.equal(textureKey, 'mascot-sheet:Maman', 'selected profile uses its mascot in Phaser');
  assert.deepEqual(errors, [], 'page has no runtime errors');
  console.log('5 spritesheets chargés; profil Maman utilise son sprite Phaser');
} finally {
  await browser.close();
}
