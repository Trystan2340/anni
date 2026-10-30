import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

const swipe = async (from, to) => {
  const box = await page.locator('canvas').boundingBox();
  const x = (gameX) => box.x + gameX * (box.width / 1280);
  const y = (gameY) => box.y + gameY * (box.width / 1280);
  await page.mouse.move(x(from.x), y(from.y));
  await page.mouse.down();
  await page.mouse.move(x(to.x), y(to.y), { steps: 4 });
  await page.mouse.up();
};

const closeCurrentGame = async () => page.getByRole('button', { name: /Quitter le mini-jeu/ }).click();
const startGame = async (key, sceneName, runningCheck) => {
  const gameIds = { maman: 'maman-match3', papa: 'papa-tron', juju: 'juju-blocks', chacha: 'chacha-runner' };
  await page.evaluate(({ house, gameId }) => window.__cq.bus.emit('minigame:open', { houseId: `maison-${house}`, gameId }), { house: key, gameId: gameIds[key] });
  await page.waitForFunction((name) => window.__cq.getGame().scene.getScene(name)?.sys.isActive(), sceneName);
  const needsIntro = await page.evaluate((name) => window.__cq.getGame().scene.getScene(name).over, sceneName);
  if (needsIntro) {
    await page.keyboard.press('Enter');
  }
  await page.waitForFunction(runningCheck, sceneName);
  return sceneName;
};

try {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Maman/ }).first().click();
  await page.locator('input[type=password]').fill('noel2026');
  await page.locator('input[type=checkbox]').check();
  await page.getByRole('button', { name: /Entrer dans le village/ }).click();
  await page.waitForFunction(() => window.__cq?.getGame()?.scene?.getScene('Village')?.sys.isActive());

  const failures = [];
  await startGame('papa', 'PapaTron', (name) => window.__cq.getGame().scene.getScene(name).roundActive);

  const beforePapa = await page.evaluate(() => {
    const scene = window.__cq.getGame().scene.getScene('PapaTron');
    return { ...scene.player.nextDir };
  });
  await swipe({ x: 640, y: 410 }, { x: 640, y: 350 });
  await page.waitForTimeout(30);
  const afterPapa = await page.evaluate(() => {
    const scene = window.__cq.getGame().scene.getScene('PapaTron');
    return { ...scene.player.nextDir };
  });
  if (afterPapa.x !== 0 || afterPapa.y !== -1 || afterPapa.x === beforePapa.x && afterPapa.y === beforePapa.y) {
    failures.push('Papa: le swipe vertical ne tourne pas le traîneau');
  }
  await page.screenshot({ path: 'shots/minigame-papa-controls.png' });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__cq.getGame().scene.getScene('PapaTron').paused);
  await swipe({ x: 640, y: 410 }, { x: 580, y: 410 });
  const pausedPapa = await page.evaluate(() => ({ ...window.__cq.getGame().scene.getScene('PapaTron').player.nextDir }));
  if (pausedPapa.x !== afterPapa.x || pausedPapa.y !== afterPapa.y) failures.push('Papa: un geste agit pendant la pause');
  await closeCurrentGame();

  await startGame('juju', 'JujuBlocks', (name) => window.__cq.getGame().scene.getScene(name).running);
  const beforeJuju = await page.evaluate(() => window.__cq.getGame().scene.getScene('JujuBlocks').current.x);
  await swipe({ x: 640, y: 400 }, { x: 570, y: 400 });
  await page.waitForTimeout(20);
  const afterJuju = await page.evaluate(() => window.__cq.getGame().scene.getScene('JujuBlocks').current.x);
  if (afterJuju !== beforeJuju - 1) failures.push('Juju: le swipe gauche ne déplace pas le cadeau');
  await page.evaluate(() => {
    const scene = window.__cq.getGame().scene.getScene('JujuBlocks');
    scene.current.matrix = [[0, 1, 0], [1, 1, 1], [0, 0, 0]];
    scene.current.x = 4;
    scene.current.y = 4;
  });
  const stableMatrixBeforeRotate = await page.evaluate(() => JSON.stringify(window.__cq.getGame().scene.getScene('JujuBlocks').current.matrix));
  await swipe({ x: 640, y: 400 }, { x: 640, y: 330 });
  const matrixAfterRotate = await page.evaluate(() => JSON.stringify(window.__cq.getGame().scene.getScene('JujuBlocks').current.matrix));
  if (matrixAfterRotate === stableMatrixBeforeRotate) failures.push('Juju: le swipe haut ne tourne pas la pièce');
  await page.screenshot({ path: 'shots/minigame-juju-controls.png' });
  await closeCurrentGame();

  await startGame('chacha', 'ChachaRunner', (name) => window.__cq.getGame().scene.getScene(name).running);
  const beforeLane = await page.evaluate(() => window.__cq.getGame().scene.getScene('ChachaRunner').lane);
  await swipe({ x: 640, y: 520 }, { x: 570, y: 520 });
  const afterLane = await page.evaluate(() => window.__cq.getGame().scene.getScene('ChachaRunner').lane);
  if (afterLane !== beforeLane - 1) failures.push('Chacha: le swipe gauche ne change pas de couloir');
  await swipe({ x: 640, y: 520 }, { x: 640, y: 450 });
  const jumping = await page.evaluate(() => window.__cq.getGame().scene.getScene('ChachaRunner').jumping);
  if (!jumping) failures.push('Chacha: le swipe haut ne déclenche pas le saut');
  await page.screenshot({ path: 'shots/minigame-chacha-controls.png' });
  await closeCurrentGame();

  await startGame('maman', 'MamanMatch3', (name) => !window.__cq.getGame().scene.getScene(name).over);
  const swap = await page.evaluate(() => {
    const scene = window.__cq.getGame().scene.getScene('MamanMatch3');
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const r2 = r + dr, c2 = c + dc;
          if (r2 >= 8 || c2 >= 8) continue;
          const grid = scene.grid.map((row) => row.slice());
          [grid[r][c], grid[r2][c2]] = [grid[r2][c2], grid[r][c]];
          for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
            const value = grid[y][x];
            if (x + 2 < 8 && grid[y][x + 1] === value && grid[y][x + 2] === value) return { r, c, r2, c2 };
            if (y + 2 < 8 && grid[y + 1][x] === value && grid[y + 2][x] === value) return { r, c, r2, c2 };
          }
        }
      }
    }
    return null;
  });
  assert.ok(swap, 'match-3 board has a legal move');
  const beforeMoves = await page.evaluate(() => window.__cq.getGame().scene.getScene('MamanMatch3').movesLeft);
  const box = await page.locator('canvas').boundingBox();
  const scale = box.width / 1280;
  const px = (c) => box.x + (392 + c * 62 + 31) * scale;
  const py = (r) => box.y + (136 + r * 62 + 31) * scale;
  await page.mouse.move(px(swap.c), py(swap.r));
  await page.mouse.down();
  await page.mouse.move(px(swap.c2), py(swap.r2), { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(450);
  const afterMoves = await page.evaluate(() => window.__cq.getGame().scene.getScene('MamanMatch3').movesLeft);
  if (afterMoves !== beforeMoves - 1) failures.push('Maman: le glissement vers une case voisine ne fait pas l’échange');
  await page.screenshot({ path: 'shots/minigame-maman-controls.png' });

  await page.setViewportSize({ width: 844, height: 390 });
  await startGame('papa', 'PapaTron', (name) => window.__cq.getGame().scene.getScene(name).roundActive);
  await page.waitForTimeout(150);
  const mobileCanvas = await page.locator('canvas').boundingBox();
  if (!mobileCanvas || mobileCanvas.width >= 1280) failures.push('Papa: le test tactile doit utiliser un canvas redimensionné');
  const direction = await page.evaluate(() => {
    const scene = window.__cq.getGame().scene.getScene('PapaTron');
    scene.player.dir = { x: 1, y: 0 };
    scene.player.nextDir = { x: 1, y: 0 };
    scene.stepMs = 100_000;
    scene.accumulator = 0;
    return { displayScale: { ...scene.scale.displayScale }, paused: scene.paused };
  });
  if (direction.paused) failures.push('Papa: le mini-jeu reste en pause après sa réouverture');
  const screenSwipe = async (distance) => {
    const bounds = await page.locator('canvas').boundingBox();
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - distance, { steps: 2 });
    await page.mouse.up();
  };
  await screenSwipe(20);
  await page.waitForTimeout(15);
  const shortSwipe = await page.evaluate(() => ({ ...window.__cq.getGame().scene.getScene('PapaTron').player.nextDir }));
  if (shortSwipe.x !== 1 || shortSwipe.y !== 0) failures.push(`Papa: un swipe sous le seuil agit sur le petit écran (${JSON.stringify({ direction, shortSwipe })})`);
  await screenSwipe(50);
  await page.waitForTimeout(15);
  const longSwipe = await page.evaluate(() => ({ ...window.__cq.getGame().scene.getScene('PapaTron').player.nextDir }));
  if (longSwipe.x !== 0 || longSwipe.y !== -1) failures.push(`Papa: un swipe de 50 px ne passe pas le seuil sur le petit écran (scale ${JSON.stringify(direction)})`);
  await page.screenshot({ path: 'shots/minigame-papa-mobile-controls.png' });

  assert.deepEqual(failures, [], 'all four minigames accept their touchscreen gestures');
  assert.deepEqual(errors, [], 'touch controls cause no runtime errors');
  console.log('Les quatre mini-jeux acceptent les gestes tactiles et bloquent les gestes en pause');
} finally {
  await browser.close();
}
