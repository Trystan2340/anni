import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const openGame = async (key, sceneName, activeProperty) => {
  const gameIds = { maman: 'maman-match3', papa: 'papa-tron', juju: 'juju-blocks', chacha: 'chacha-runner' };
  await page.evaluate(({ house, gameId }) => window.__cq.bus.emit('minigame:open', { houseId: `maison-${house}`, gameId }), { house: key, gameId: gameIds[key] });
  await page.waitForFunction((name) => window.__cq.getGame().scene.getScene(name)?.sys.isActive(), sceneName);
  const intro = await page.evaluate((name) => window.__cq.getGame().scene.getScene(name).over, sceneName);
  if (intro) {
    await page.keyboard.press('Enter');
    await page.waitForFunction(({ name, property }) => {
      const scene = window.__cq.getGame().scene.getScene(name);
      return property === 'notOver' ? !scene.over : scene[property];
    }, { name: sceneName, property: activeProperty });
  }
};

try {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Maman/ }).first().click();
  await page.locator('input[type=password]').fill('noel2026');
  await page.locator('input[type=checkbox]').check();
  await page.getByRole('button', { name: /Entrer dans le village/ }).click();
  await page.waitForFunction(() => window.__cq?.getGame()?.scene?.getScene('Village')?.sys.isActive());

  const failures = [];
  await openGame('papa', 'PapaTron', 'roundActive');
  const papa = await page.evaluate(() => {
    const scene = window.__cq.getGame().scene.getScene('PapaTron');
    return { stepMs: scene.stepMs, round: scene.roundNumber };
  });
  if (papa.stepMs !== 96) failures.push(`Papa : première manche ${papa.stepMs} ms au lieu de 96 ms`);
  await page.getByRole('button', { name: /Quitter le mini-jeu/ }).click();

  await openGame('juju', 'JujuBlocks', 'running');
  const juju = await page.evaluate(() => {
    const scene = window.__cq.getGame().scene.getScene('JujuBlocks');
    return { dropInterval: scene.dropInterval, instructionY: scene.hudNotice.y };
  });
  if (juju.dropInterval !== 800) failures.push(`Juju : vitesse initiale ${juju.dropInterval} ms au lieu de 800 ms`);
  if (juju.instructionY >= 650) failures.push(`Juju : indication des commandes trop basse (${juju.instructionY})`);
  await page.getByRole('button', { name: /Quitter le mini-jeu/ }).click();

  await openGame('chacha', 'ChachaRunner', 'running');
  const runner = await page.evaluate(() => {
    const scene = window.__cq.getGame().scene.getScene('ChachaRunner');
    scene.distance = 300;
    scene.obstacleTimer = 100_000;
    scene.update(0, 0);
    const middleSpeed = scene.speed;
    scene.distance = 600;
    scene.obstacleTimer = 0;
    scene.update(0, 1);
    return { middleSpeed, lateObstacleInterval: scene.obstacleTimer };
  });
  if (Math.abs(runner.middleSpeed - (4.2 + 300 / 260)) > 0.001) failures.push(`Chacha : vitesse intermédiaire ${runner.middleSpeed}`);
  if (runner.lateObstacleInterval !== 1110) failures.push(`Chacha : intervalle tardif ${runner.lateObstacleInterval} ms au lieu de 1110 ms`);
  await page.getByRole('button', { name: /Quitter le mini-jeu/ }).click();

  await openGame('maman', 'MamanMatch3', 'notOver');
  const hint = await page.evaluate(() => {
    const scene = window.__cq.getGame().scene.getScene('MamanMatch3');
    scene.handleSelect(3, 3);
    scene.idleTimer = 7_000;
    scene.update?.(0, 20);
    const pending = {
      selected: scene.selected,
      shown: scene.hintShown,
      firstVisible: scene.hintHighlight?.visible,
      secondVisible: scene.hintHighlightSecond?.visible,
    };
    scene.handleSelect(3, 3);
    scene.idleTimer = 7_000;
    scene.update?.(0, 20);
    return {
      text: scene.hudHint.text,
      targetVisible: scene.hintHighlight?.visible,
      secondTargetVisible: scene.hintHighlightSecond?.visible,
      cursor: scene.cursor,
      cursorX: scene.highlight.x,
      cursorY: scene.highlight.y,
      pending,
      hintY: scene.hudHint.y,
      progressY: scene.hudCollected.y,
    };
  });
  if (hint.pending.selected?.r !== 3 || hint.pending.selected?.c !== 3 || hint.pending.shown || hint.pending.firstVisible || hint.pending.secondVisible) {
    failures.push('Maman : le conseil interrompt ou efface une sélection en cours');
  }
  if (!hint.text.startsWith('Astuce') || !hint.targetVisible || !hint.secondTargetVisible) failures.push(`Maman : les deux cases de la suggestion ne sont pas visibles (${hint.text})`);
  if (hint.cursorX !== 640 - (8 * 62) / 2 + hint.cursor.c * 62 + 31 || hint.cursorY !== 136 + hint.cursor.r * 62 + 31) {
    failures.push('Maman : le conseil déplace le curseur clavier');
  }
  if (hint.hintY !== 658 || hint.progressY !== 102) failures.push(`Maman : en-tête du plateau mal espacé (${hint.progressY}/${hint.hintY})`);

  const layout = await page.evaluate(async () => {
    try {
      const { PAPA_ARENA } = await import('/src/minigames/papa/layout.ts');
      return PAPA_ARENA;
    } catch {
      return null;
    }
  });
  if (!layout || layout.y + layout.rows * layout.cell > 720) failures.push('Papa : le plateau dépasse toujours la hauteur visible');

  assert.deepEqual(failures, [], 'the four house games use the family-friendly balance settings');
  console.log('Réglages des quatre mini-jeux : OK');
} finally {
  await browser.close();
}
