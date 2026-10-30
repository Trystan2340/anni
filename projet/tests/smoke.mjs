import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHOTS = join(dirname(dirname(fileURLToPath(import.meta.url))), 'shots');
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.screenshot({ path: join(SHOTS, '01-login.png') });

// connexion Maman
await page.getByRole('button', { name: /Maman/ }).first().click();
await page.locator('input[type=password]').fill('noel2026');
await page.locator('input[type=checkbox]').check();
await page.screenshot({ path: join(SHOTS, '02-login-maman.png') });
await page.getByRole('button', { name: /Entrer dans le village/ }).click();
await page.waitForTimeout(2500);
await page.screenshot({ path: join(SHOTS, '03-village.png') });

// marche vers le coffre
await page.keyboard.down('ArrowDown');
await page.waitForTimeout(650);
await page.keyboard.up('ArrowDown');
await page.waitForTimeout(300);
await page.screenshot({ path: join(SHOTS, '04-village-marche.png') });
await page.keyboard.press('e');
await page.waitForTimeout(700);
await page.screenshot({ path: join(SHOTS, '05-coffre.png') });
const chestOpen = await page.locator('.chest-modal').count();
console.log('MODALE COFFRE:', chestOpen);
if (chestOpen) await page.getByRole('button', { name: /^Fermer$/ }).click();

// mini-jeu Maman
await page.evaluate(() => window.__cq.openMinigame('maman'));
await page.waitForTimeout(1200);
await page.screenshot({ path: join(SHOTS, '06-match3-intro.png') });
await page.keyboard.press('Enter');
await page.waitForTimeout(1500);
await page.screenshot({ path: join(SHOTS, '07a-match3-jeu.png') });
// jouer quelques échanges au clavier pour vérifier l'absence d'erreur
for (let i = 0; i < 6; i++) {
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
}
await page.screenshot({ path: join(SHOTS, '07-match3-jeu.png') });

// mini-jeu Papa
await page.evaluate(() => {
  window.__cq.bus.emit('minigame:quit', { gameId: 'maman-match3' });
});
await page.waitForTimeout(500);
await page.evaluate(() => window.__cq.openMinigame('papa'));
await page.waitForTimeout(1000);
await page.keyboard.press('Enter');
await page.waitForTimeout(2200);
await page.screenshot({ path: join(SHOTS, '08-tron.png') });

// mini-jeu Juju
await page.evaluate(() => window.__cq.bus.emit('minigame:quit', { gameId: 'papa-tron' }));
await page.waitForTimeout(400);
await page.evaluate(() => window.__cq.openMinigame('juju'));
await page.waitForTimeout(800);
await page.keyboard.press('Enter');
await page.waitForTimeout(1200);
await page.keyboard.press('Space');
await page.waitForTimeout(600);
await page.screenshot({ path: join(SHOTS, '09-tetris.png') });

// mini-jeu Chacha
await page.evaluate(() => window.__cq.bus.emit('minigame:quit', { gameId: 'juju-blocks' }));
await page.waitForTimeout(400);
await page.evaluate(() => window.__cq.openMinigame('chacha'));
await page.waitForTimeout(800);
await page.keyboard.press('Enter');
await page.waitForTimeout(4000);
await page.screenshot({ path: join(SHOTS, '10-runner.png') });

// retour village + listes (admin Trystan)
await page.evaluate(() => window.__cq.bus.emit('minigame:quit', { gameId: 'chacha-runner' }));
await page.waitForTimeout(600);
await page.evaluate(() => {
  const s = window.__cq.server;
  s.signOut();
  s.signIn('trystan@famille-noel.fr', 'noel2026');
  ['rose', 'bleue', 'doree', 'violette'].forEach((k) => s.adminSetKey('u-trystan', k, true, true));
});
await page.waitForTimeout(600);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: join(SHOTS, '11-login-admin.png') });
await page.getByRole('button', { name: /Trystan/ }).first().click();
await page.locator('input[type=password]').fill('noel2026');
await page.locator('input[type=checkbox]').check();
await page.getByRole('button', { name: /Entrer dans le village/ }).click();
await page.waitForTimeout(2500);
await page.getByRole('button', { name: /Mes listes/ }).click();
await page.waitForTimeout(1200);
await page.screenshot({ path: join(SHOTS, '12-listes.png'), fullPage: false });

// mobile
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await mobile.getByRole('button', { name: /Maman/ }).first().click();
await mobile.locator('input[type=password]').fill('noel2026');
await mobile.locator('input[type=checkbox]').check();
await mobile.getByRole('button', { name: /Entrer dans le village/ }).click();
await mobile.waitForTimeout(2000);
await mobile.screenshot({ path: join(SHOTS, '13-mobile-village.png') });

console.log('ERREURS CONSOLE:', errors.length ? errors : 'aucune');
await browser.close();
