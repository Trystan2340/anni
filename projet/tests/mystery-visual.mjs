import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
mkdirSync('shots/epreuve-mystere', { recursive: true });
const games = [
  { house: 'maman', scene: 'MamanMatch3', game: 'maman-match3', key: 'rose' },
  { house: 'papa', scene: 'PapaTron', game: 'papa-tron', key: 'bleue' },
  { house: 'juju', scene: 'JujuBlocks', game: 'juju-blocks', key: 'doree' },
  { house: 'chacha', scene: 'ChachaRunner', game: 'chacha-runner', key: 'violette' },
];
async function login() {
  await page.getByRole('button', { name: /Maman/ }).first().click();
  await page.locator('input[type=password]').fill('noel2026');
  await page.locator('input[type=checkbox]').check();
  await page.getByRole('button', { name: /Entrer dans le village/ }).click();
  await page.waitForFunction(() => window.__cq?.getGame()?.scene?.isActive('Village'));
}
try {
  await page.goto(process.env.CQ_BASE_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__cq?.server);
  await page.evaluate(() => window.__cq.server.resetDemo());
  await login();

  for (const [index, game] of games.entries()) {
    await page.evaluate(({ house, game }) => window.__cq.bus.emit('minigame:open', { houseId: `maison-${house}`, gameId: game }), game);
    await page.waitForFunction((key) => window.__cq.getGame().scene.getScene(key)?.over === true, game.scene);
    await page.keyboard.press('Enter');
    await page.waitForFunction((key) => window.__cq.getGame().scene.getScene(key)?.over === false, game.scene);
    // Simule la victoire de la scène pour vérifier son chemin réel vers l'inventaire.
    await page.evaluate((key) => window.__cq.getGame().scene.getScene(key).finish(true), game.scene);
    await page.locator('.key-award').waitFor();
    assert.match(await page.locator('.key-award h2').innerText(), new RegExp(`clé ${game.key === 'doree' ? 'dorée' : game.key}`, 'i'));
    assert.equal(await page.evaluate((key) => window.__cq.server.progress('u-maman').keys[key].acquired, game.key), true);
    await page.getByRole('button', { name: 'Retourner au village' }).click();
    await page.waitForFunction(() => window.__cq.getGame().scene.isActive('Village'));
    await page.evaluate(() => window.__cq.bus.emit('chalet:enter', undefined));
    await page.waitForFunction(() => window.__cq.getGame().scene.isActive('ChaletInterior'));
    await page.evaluate(() => window.__cq.bus.emit('chest:interact', undefined));
    const chest = page.locator('.chest-modal');
    await chest.waitFor();
    assert.equal(await chest.locator('[data-mystery-key][data-revealed="true"]').count(), index);
    await chest.getByRole('button', { name: new RegExp(`Déposer la clé ${game.key === 'doree' ? 'dorée' : game.key}`, 'i') }).click();
    await page.waitForFunction(({ key }) => window.__cq.server.progress('u-maman').keys[key].deposited, game);
    assert.equal(await chest.locator('[data-mystery-key][data-revealed="true"]').count(), index + 1);
    assert.equal(await chest.locator(`[data-mystery-key="${game.key}"]`).getAttribute('data-revealed'), 'true');
    assert.equal(await page.evaluate(() => window.__cq.server.canAccessLists('u-maman')), false);
    await chest.locator('.mystery-section').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `shots/epreuve-mystere/${index + 1}-cle.png` });
    if (index === 0) {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.__cq?.server);
      assert.equal(await page.evaluate(() => window.__cq.server.progress('u-maman').keys.rose.deposited), true, 'first deposited key survives reload');
      await login();
    } else if (index < games.length - 1) {
      await chest.getByRole('button', { name: 'Fermer' }).click();
      await page.getByRole('button', { name: /Retour au village/ }).click();
      await page.waitForFunction(() => window.__cq.getGame().scene.isActive('Village'));
    }
  }

  const chest = page.locator('.chest-modal');
  await chest.getByLabel('Qui est cette personne ?').fill('autre personne');
  await chest.getByRole('button', { name: 'Valider ma réponse' }).click();
  await chest.getByRole('alert').waitFor();
  assert.equal(await page.evaluate(() => window.__cq.server.canAccessLists('u-maman')), false);
  await chest.getByLabel('Qui est cette personne ?').fill('JUJU');
  await chest.getByRole('button', { name: 'Valider ma réponse' }).click();
  await page.getByRole('button', { name: /Découvrir la liste de Noël/ }).waitFor();
  assert.equal(await page.evaluate(() => window.__cq.server.canAccessLists('u-maman')), true);
  await page.screenshot({ path: 'shots/epreuve-mystere/5-victoire.png' });
  await page.getByRole('button', { name: /Découvrir la liste de Noël/ }).click();
  await page.locator('.lists-page h1').waitFor();
  assert.match(await page.locator('.lists-page').innerText(), /Trystan/);
  await page.screenshot({ path: 'shots/epreuve-mystere/6-liste.png' });
  await page.getByRole('button', { name: 'Retour au village' }).click();
  await page.getByRole('button', { name: /Retour au village/ }).click();
  await page.waitForFunction(() => window.__cq.getGame().scene.isActive('Village'));
  await page.waitForFunction(() => Boolean(window.__cq.getGame().scene.getScene('Village').signpost), null, { timeout: 5000 });
  assert.deepEqual(errors, [], 'no browser errors during the mystery challenge');
  console.log('Parcours mobile : quatre clés, quatre morceaux, réponse et liste vérifiés.');
} finally { await browser.close(); }
