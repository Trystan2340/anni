import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const shots = 'shots/audit-actuel';
mkdirSync(shots, { recursive: true });

async function worldPoint(page, sceneKey, x, y) {
  const box = await page.locator('canvas').boundingBox();
  assert.ok(box, 'le jeu est visible');
  return page.evaluate(({ rect, sceneKey, x, y }) => {
    const camera = window.__cq.getGame().scene.getScene(sceneKey).cameras.main;
    return { x: rect.x + ((x - camera.worldView.x) * camera.zoom / camera.width) * rect.width,
      y: rect.y + ((y - camera.worldView.y) * camera.zoom / camera.height) * rect.height };
  }, { rect: box, sceneKey, x, y });
}
async function tapWorld(page, mobile, scene, x, y) {
  const p = await worldPoint(page, scene, x, y);
  if (mobile) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
}
const houses = [
  { name: 'maman', scene: 'MamanMatch3', x: 170, y: 268 },
  { name: 'papa', scene: 'PapaTron', x: 1110, y: 268 },
  { name: 'juju', scene: 'JujuBlocks', x: 170, y: 490 },
  { name: 'chacha', scene: 'ChachaRunner', x: 1110, y: 490 },
];
try {
  for (const mobile of [false, true]) {
    const name = mobile ? 'mobile' : 'ordinateur';
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__cq?.server);
    await page.evaluate(() => window.__cq.server.resetDemo());
    await page.getByRole('button', { name: /Juju/ }).first().click();
    await page.getByRole('button', { name: 'Mode démo' }).click();
    await page.locator('input[type=password]').fill('noel2026');
    await page.locator('input[type=checkbox]').check();
    await page.getByRole('button', { name: 'Entrer dans le village' }).click();
    await page.waitForFunction(() => window.__cq?.getGame()?.scene?.getScene('Village')?.player?.body);
    await page.waitForFunction(() => !window.__cq.getGame().scene.getScene('Village').cameras.main.fadeEffect.isRunning);
    await page.waitForTimeout(350);
    if (mobile) {
      const layout = await page.evaluate(() => {
        const rect = (selector) => document.querySelector(selector).getBoundingClientRect().toJSON();
        const scene = window.__cq.getGame().scene.getScene('Village');
        return { hud: rect('.hud'), canvas: rect('canvas'), controls: rect('.touch-controls'), width: scene.scale.width, height: scene.scale.height };
      });
      assert.equal(layout.width, 1280);
      assert.equal(layout.height, 760);
      assert.ok(layout.canvas.top >= layout.hud.bottom - 1, 'la carte ne recouvre pas le bandeau des clés');
      assert.ok(layout.canvas.bottom <= layout.controls.top + 1, 'les commandes ne recouvrent pas la carte');
      assert.ok(layout.canvas.width > layout.canvas.height, 'la carte est au format paysage');
    }
    await page.screenshot({ path: `${shots}/01-village-${name}.png` });
    await tapWorld(page, mobile, 'Village', 640, 323);
    await page.waitForFunction(() => window.__cq.getGame().scene.isActive('ChaletInterior'));
    await page.waitForFunction(() => !window.__cq.getGame().scene.getScene('ChaletInterior').cameras.main.fadeEffect.isRunning);
    await page.screenshot({ path: `${shots}/03-chalet-${name}.png` });
    await page.getByRole('button', { name: 'Retour au village' }).click();
    await page.waitForFunction(() => window.__cq.getGame().scene.isActive('Village') && !window.__cq.getGame().scene.isActive('ChaletInterior'));
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.__cq.getGame().scene.getScene('Village').cameras.main.fadeEffect.isComplete), false, 'la caméra du village n’est pas masquée');
    await page.screenshot({ path: `${shots}/04-retour-village-${name}.png` });
    await tapWorld(page, mobile, 'Village', 640, 323);
    await page.waitForFunction(() => window.__cq.getGame().scene.isActive('ChaletInterior'));
    await page.waitForFunction(() => !window.__cq.getGame().scene.getScene('ChaletInterior').cameras.main.fadeEffect.isRunning);
    await tapWorld(page, mobile, 'ChaletInterior', 640, 640);
    await page.waitForFunction(() => window.__cq.getGame().scene.isActive('Village') && !window.__cq.getGame().scene.isActive('ChaletInterior'));
    await page.waitForTimeout(200);
    for (const house of houses) {
      if (house.name === 'juju') {
        await page.evaluate(() => window.__cq.bus.emit('toast', { message: 'Ancien message', tone: 'error' }));
        await page.getByRole('status').getByText('Ancien message').waitFor();
      }
      await tapWorld(page, mobile, 'Village', house.x, house.y);
      await page.waitForFunction((scene) => window.__cq.getGame().scene.isActive(scene), house.scene);
      await page.keyboard.press('Enter');
      await page.waitForFunction((scene) => window.__cq.getGame().scene.getScene(scene).over === false, house.scene);
      await page.waitForTimeout(450);
      if (house.name === 'juju') assert.equal(await page.locator('.toast').count(), 0, 'un ancien message ne cache pas les commandes');
      await page.screenshot({ path: `${shots}/maison-${house.name}-${name}.png` });
      const award = page.locator('.key-award');
      if (await award.isVisible()) {
        await award.getByRole('button', { name: 'Retourner au village' }).click();
      } else {
        try {
          await page.getByRole('button', { name: 'Quitter le mini-jeu' }).click({ timeout: 4000 });
        } catch (error) {
          if (!await award.isVisible()) throw error;
          await award.getByRole('button', { name: 'Retourner au village' }).click();
        }
      }
      await page.waitForFunction(() => window.__cq.getGame().scene.isActive('Village'));
      await page.waitForTimeout(150);
      assert.ok(await page.evaluate(() => Boolean(window.__cq.getGame().scene.getScene('Village').player.body)), `retour depuis ${house.name}`);
    }
    assert.deepEqual(errors, [], `${name} : aucune erreur de scène`);
    await page.close();
    console.log(`${name} : village, chalet, sorties et quatre maisons vérifiés`);
  }
} finally { await browser.close(); }
