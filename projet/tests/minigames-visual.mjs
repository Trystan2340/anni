import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const baseUrl = process.env.CQ_BASE_URL ?? 'http://127.0.0.1:5173/';
const outputDir = new URL('../shots/minigames-audit-2026-10-26/', import.meta.url).pathname;
mkdirSync(outputDir, { recursive: true });

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });

const games = [
  { id: 'maman', scene: 'MamanMatch3', gameId: 'maman-match3' },
  { id: 'papa', scene: 'PapaTron', gameId: 'papa-tron' },
  { id: 'juju', scene: 'JujuBlocks', gameId: 'juju-blocks' },
  { id: 'chacha', scene: 'ChachaRunner', gameId: 'chacha-runner' },
];
const viewports = [
  { name: 'ordinateur', width: 1280, height: 720, isMobile: false },
  { name: 'telephone-paysage', width: 844, height: 390, isMobile: false },
  { name: 'telephone-portrait', width: 390, height: 844, isMobile: true },
  { name: 'telephone-compact', width: 320, height: 700, isMobile: true },
];
const selectedViewports = process.env.CQ_VIEWPORT
  ? viewports.filter((viewport) => viewport.name === process.env.CQ_VIEWPORT)
  : viewports;
assert.ok(selectedViewports.length, 'the requested viewport exists');
const tapGamePoint = async (page, x, y) => {
  const bounds = await page.locator('canvas').boundingBox();
  assert.ok(bounds, 'game canvas has a touch target');
  await page.touchscreen.tap(bounds.x + (x * bounds.width) / 720, bounds.y + (y * bounds.height) / 1560);
};

try {
  for (const viewport of selectedViewports) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      isMobile: viewport.isMobile,
      hasTouch: viewport.width < 900,
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Maman/ }).first().click();
    await page.locator('input[type=password]').fill('noel2026');
    await page.locator('input[type=checkbox]').check();
    await page.getByRole('button', { name: /Entrer dans le village/ }).click();
    await page.waitForFunction(() => window.__cq?.getGame()?.scene?.getScene('Village')?.sys.isActive());

    for (const game of games) {
      await page.evaluate(({ id, gameId }) => {
        window.__cq.bus.emit('minigame:open', { houseId: `maison-${id}`, gameId });
      }, game);
      await page.waitForFunction((name) => window.__cq.getGame().scene.getScene(name)?.sys.isActive(), game.scene);
      const portrait = viewport.isMobile;
      const introVisible = await page.evaluate((name) => window.__cq.getGame().scene.getScene(name).over, game.scene);
      if (introVisible) {
        await page.screenshot({ path: `${outputDir}${viewport.name}-intro-${game.id}.png` });
      }
      if (introVisible) {
        if (portrait) {
          const start = await page.evaluate((name) => {
            const scene = window.__cq.getGame().scene.getScene(name);
            const find = (objects) => {
              for (const object of objects) {
                if (object.text === 'Commencer') {
                  const matrix = object.getWorldTransformMatrix();
                  return { x: matrix.tx, y: matrix.ty };
                }
                if (object.list) {
                  const child = find(object.list);
                  if (child) return child;
                }
              }
              return null;
            };
            return find(scene.children.list);
          }, game.scene);
          assert.ok(start, `${game.id}: start button is present`);
          await tapGamePoint(page, start.x, start.y);
        } else await page.keyboard.press('Enter');
      }
      await page.waitForFunction(({ name, id }) => {
        const scene = window.__cq.getGame().scene.getScene(name);
        return id === 'maman' ? !scene.over : id === 'papa' ? scene.roundActive : scene.running;
      }, { name: game.scene, id: game.id });
      if (portrait && game.id === 'papa') {
        // Laisser le temps de photographier l'arène avant que les traîneaux ne se percutent.
        await page.evaluate(() => { window.__cq.getGame().scene.getScene('PapaTron').stepMs = 100_000; });
      }
      await page.waitForTimeout(350);

      assert.equal(await page.locator('#minigame-orientation-prompt').count(), 0, `${viewport.name}/${game.id}: no rotation prompt in the selected layout`);
      assert.equal(
        await page.evaluate((name) => window.__cq.getGame().scene.getScene(name).paused, game.scene),
        false,
        `${viewport.name}/${game.id}: active gameplay is not paused`,
      );

      const canvas = page.locator('canvas');
      const bounds = await canvas.boundingBox();
      assert.ok(bounds && bounds.width > 0 && bounds.height > 0, `${viewport.name}/${game.id}: canvas visible`);
      if (portrait) {
        assert.ok(bounds.width >= viewport.width * 0.95 && bounds.height >= viewport.height * 0.95, `${viewport.name}/${game.id}: portrait canvas fills the phone`);
      }
      await page.screenshot({ path: `${outputDir}${viewport.name}-${game.id}.png` });

      if (portrait) {
        if (game.id === 'maman') {
          await tapGamePoint(page, 73, 461);
          assert.deepEqual(await page.evaluate(() => window.__cq.getGame().scene.getScene('MamanMatch3').selected), { r: 0, c: 0 }, 'Maman accepts a tap on a candy');
          await tapGamePoint(page, 73, 461);
          const move = await page.evaluate(() => window.__cq.getGame().scene.getScene('MamanMatch3').findLegalMove());
          assert.ok(move, 'the match-3 board offers a legal move');
          const before = await page.evaluate(() => window.__cq.getGame().scene.getScene('MamanMatch3').movesLeft);
          const dx = Math.sign(move.second.c - move.first.c), dy = Math.sign(move.second.r - move.first.r);
          const start = { x: 32 + move.first.c * 82 + 41 + dx * 20, y: 420 + move.first.r * 82 + 41 + dy * 20 };
          const end = { x: 32 + move.second.c * 82 + 41 - dx * 20, y: 420 + move.second.r * 82 + 41 - dy * 20 };
          const box = await page.locator('canvas').boundingBox();
          const finger = (point) => ({ id: 1, x: box.x + point.x * box.width / 720, y: box.y + point.y * box.height / 1560 });
          const cdp = await page.context().newCDPSession(page);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger(start)] });
          await page.waitForTimeout(50);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [finger(end)] });
          await page.waitForTimeout(50);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await cdp.detach();
          await page.waitForFunction((moves) => window.__cq.getGame().scene.getScene('MamanMatch3').movesLeft === moves - 1, before, { timeout: 4000 });
        } else if (game.id === 'papa') {
          await tapGamePoint(page, 493, 1470);
          assert.deepEqual(await page.evaluate(() => window.__cq.getGame().scene.getScene('PapaTron').player.nextDir), { x: 0, y: 1 }, 'Papa accepts the vertical direction buttons');
        } else if (game.id === 'juju') {
          const before = await page.evaluate(() => window.__cq.getGame().scene.getScene('JujuBlocks').current.x);
          await tapGamePoint(page, 344, 1466);
          assert.equal(await page.evaluate(() => window.__cq.getGame().scene.getScene('JujuBlocks').current.x), before - 1, 'Juju accepts the bottom direction buttons');
        } else {
          await tapGamePoint(page, 116, 1450);
          assert.equal(await page.evaluate(() => window.__cq.getGame().scene.getScene('ChachaRunner').lane), 0, 'Chacha accepts the bottom lane button');
        }
      }

      if (portrait && game === games[0]) {
        await page.setViewportSize({ width: 844, height: 390 });
        await page.locator('#minigame-orientation-prompt').waitFor({ state: 'visible' });
        assert.equal(await page.evaluate((name) => window.__cq.getGame().scene.getScene(name).paused, game.scene), true, 'rotation pauses the portrait layout');
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.locator('#minigame-orientation-prompt').waitFor({ state: 'hidden' });
        assert.equal(await page.evaluate((name) => window.__cq.getGame().scene.getScene(name).paused, game.scene), false, 'portrait resumes the vertical game');
      }

      if (game !== games.at(-1)) {
        await page.getByRole('button', { name: /Quitter le mini-jeu/ }).click();
        await page.waitForFunction(() => window.__cq.getGame().scene.getScene('Village')?.sys.isActive());
      }
    }

    assert.deepEqual(errors, [], `${viewport.name}: no browser runtime errors`);
    await page.close();
  }
  console.log(`Captures visuelles des quatre mini-jeux enregistrées : ${selectedViewports.map((viewport) => viewport.name).join(', ')}.`);
} finally {
  await browser.close();
}
