/** Vérification de santé de l'aperçu : rendu réel, village, listes, zéro erreur JS. */
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
page.on('console', (msg) => {
  const text = msg.text();
  if (msg.type() === 'error' && !text.includes('Failed to load resource') && !text.includes('WebSocket')) {
    errors.push(text);
  }
});

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const invites = await page.locator('.profile-card').count();
await page.screenshot({ path: 'shots/60-preview-login.png' });

await page.getByRole('button', { name: /Maman/ }).first().click();
await page.locator('input[type=password]').fill('noel2026');
await page.locator('input[type=checkbox]').check();
await page.getByRole('button', { name: /Entrer dans le village/ }).click();
await page.waitForTimeout(2600);
const canvas = await page.locator('canvas').count();
await page.screenshot({ path: 'shots/61-preview-village.png' });

// marcher puis ouvrir le coffre
await page.keyboard.down('ArrowDown');
await page.waitForTimeout(600);
await page.keyboard.up('ArrowDown');
await page.keyboard.press('e');
await page.waitForTimeout(600);
const chestOpen = await page.locator('.chest-modal').count();
await page.screenshot({ path: 'shots/62-preview-coffre.png' });
if (chestOpen) await page.getByRole('button', { name: /^Fermer$/ }).click();

// un mini-jeu, pour vérifier le chargement des scènes
await page.evaluate(() => window.__cq.openMinigame('maman'));
await page.waitForTimeout(1100);
await page.keyboard.press('Enter');
await page.waitForTimeout(1200);
const gridTiles = await page.evaluate(() => {
  const scene = window.__cq.getGame().scene.getScene('MamanMatch3');
  return scene.grid.flat().filter((v) => v >= 0).length;
});
await page.screenshot({ path: 'shots/63-preview-minigame.png' });
await page.evaluate(() => window.__cq.bus.emit('minigame:quit', { gameId: 'maman-match3' }));

console.log('Invitations affichées :', invites);
console.log('Canvas Phaser :', canvas);
console.log('Modale coffre :', chestOpen);
console.log('Cases de la grille match-3 :', gridTiles);
console.log('Erreurs JS :', errors.length ? errors : 'aucune');
await browser.close();
process.exit(errors.length || invites !== 5 || canvas < 1 || gridTiles !== 64 ? 1 : 0);
