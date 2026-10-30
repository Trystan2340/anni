/** Test de bout en bout : gagner le mini-jeu de Maman et vérifier la clé attribuée. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHOTS = join(dirname(dirname(fileURLToPath(import.meta.url))), 'shots');
mkdirSync(SHOTS, { recursive: true });

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (error) => console.log('PAGEERROR', error.message));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__cq?.server);
await page.evaluate(() => {
  window.__cq.server.resetDemo();
  window.__cq.server.setDemoClock(0);
});

await page.getByRole('button', { name: /Maman/ }).first().click();
await page.getByRole('button', { name: 'Mode démo' }).click();
await page.locator('input[type=password]').fill('noel2026');
await page.locator('input[type=checkbox]').check();
await page.getByRole('button', { name: /Entrer dans le village/ }).click();
await page.waitForTimeout(1200);

await page.evaluate(() => window.__cq.openMinigame('maman'));
await page.waitForTimeout(900);
await page.keyboard.press('Enter'); // tutoriel -> commencer
await page.waitForTimeout(900);

let canvas = await page.locator('canvas').boundingBox();
let scale = canvas.width / 1280;
let cellX = (c) => canvas.x + (640 - (8 * 62) / 2 + c * 62 + 31) * scale;
let cellY = (r) => canvas.y + (136 + r * 62 + 31) * scale;
const refreshMapping = async () => {
  canvas = await page.locator('canvas').boundingBox();
  scale = canvas.width / 1280;
  cellX = (c) => canvas.x + (640 - (8 * 62) / 2 + c * 62 + 31) * scale;
  cellY = (r) => canvas.y + (136 + r * 62 + 31) * scale;
};
await refreshMapping();

for (let move = 0; move < 40; move++) {
  const state = await page.evaluate(() => {
    const scene = window.__cq.getGame().scene.getScene('MamanMatch3');
    if (!scene.scene.isActive() || scene.over) return { done: true, over: scene.over, collected: scene.collected };
    const grid = scene.grid;
    const C = 8;
    const R = 8;
    const hasMatch = (gr) => {
      for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
          const v = gr[r][c];
          if (v < 0) continue;
          if (c + 2 < C && gr[r][c + 1] === v && gr[r][c + 2] === v) return true;
          if (r + 2 < R && gr[r + 1][c] === v && gr[r + 2][c] === v) return true;
        }
      }
      return false;
    };
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const r2 = r + dr;
          const c2 = c + dc;
          if (r2 >= R || c2 >= C) continue;
          const gr = grid.map((row) => row.slice());
          [gr[r][c], gr[r2][c2]] = [gr[r2][c2], gr[r][c]];
          if (hasMatch(gr)) return { r, c, r2, c2, collected: scene.collected, moves: scene.movesLeft };
        }
      }
    }
    return { none: true };
  });
  if (state.done || state.none) break;
  await page.mouse.click(cellX(state.c), cellY(state.r));
  await page.waitForTimeout(120);
  await page.mouse.click(cellX(state.c2), cellY(state.r2));
  await page.waitForTimeout(1400);
}

await page.waitForTimeout(1200);
await page.screenshot({ path: join(SHOTS, '20-match3-fin.png') });

const after = await page.evaluate(() => {
  const { server } = window.__cq;
  const progress = server.progress('u-maman');
  return {
    rose: progress.keys.rose,
    awarded: progress.awardedKeys,
    movesLeft: window.__cq.getGame().scene.getScene('MamanMatch3').movesLeft,
  };
});
console.log('RESULTAT MATCH3:', JSON.stringify(after));
assert.equal(after.rose.acquired, true, 'une victoire doit attribuer la clé rose');
assert.ok(after.awarded.includes('rose'), 'la clé rose doit figurer dans l’historique des récompenses');

// fenêtre de récompense affichée ?
const awardVisible = await page.locator('.key-award').count();
console.log('FENETRE CLE:', awardVisible);
assert.equal(awardVisible, 1, 'la fenêtre de récompense doit apparaître après la victoire');
await page.screenshot({ path: join(SHOTS, '21-cle-rose.png') });

await browser.close();
