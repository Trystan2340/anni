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
  await page.getByRole('button', { name: 'Mode démo' }).click();
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
    assert.match(await page.locator('.hud-keys').innerText(), /En poche\s*1\s*\/\s*4/, 'la clé gagnée apparaît en poche');
    await page.evaluate(() => window.__cq.bus.emit('chalet:enter', undefined));
    await page.waitForFunction(() => window.__cq.getGame().scene.isActive('ChaletInterior'));
    await page.evaluate(() => window.__cq.bus.emit('chest:interact', undefined));
    const chest = page.locator('.chest-modal');
    await chest.waitFor();
    assert.equal(await chest.locator('[data-mystery-key][data-revealed="true"]').count(), index);
    await chest.getByRole('button', { name: new RegExp(`Déposer la clé ${game.key === 'doree' ? 'dorée' : game.key}`, 'i') }).click();
    await page.waitForFunction(({ key }) => window.__cq.server.progress('u-maman').keys[key].deposited, game);
    assert.equal(await chest.locator('.chest-feedback').count(), 1, 'confirmation visible dans le coffre');
    assert.equal(await page.locator('.toast').count(), 0, 'aucun message flottant ne masque l’image');
    assert.match(await page.locator('.hud-keys').innerText(), /En poche\s*0\s*\/\s*4/, 'la clé déposée quitte la poche');
    assert.match(await page.locator('.hud-keys').innerText(), new RegExp(`Au coffre\\s*${index + 1}\\s*\\/\\s*4`), 'le compteur du coffre progresse');
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
  try {
    await page.waitForFunction(() => window.__cq.getGame().scene.isActive('ChaletInterior'), null, { timeout: 8000 });
  } catch (error) {
    console.log('État après retour depuis la liste :', await page.evaluate(() => {
      const manager = window.__cq.getGame().scene;
      return { chalet: manager.getScene('ChaletInterior').sys.settings.status, village: manager.getScene('Village').sys.settings.status, dom: document.querySelector('.app-shell')?.className };
    }));
    throw error;
  }
  await page.waitForTimeout(300);
  const canvas = await page.locator('canvas').boundingBox();
  assert.ok(canvas, 'le chalet est visible');
  const note = await page.evaluate((rect) => {
    const camera = window.__cq.getGame().scene.getScene('ChaletInterior').cameras.main;
    return {
      x: rect.x + ((366 - camera.worldView.x) * camera.zoom / camera.width) * rect.width,
      y: rect.y + ((515 - camera.worldView.y) * camera.zoom / camera.height) * rect.height,
    };
  }, canvas);
  await page.touchscreen.tap(note.x, note.y);
  const chaletList = page.locator('.chalet-list-modal');
  await chaletList.waitFor();
  assert.equal(await chaletList.locator('.chalet-wishlist-gift').count(), 6, 'la liste du chalet contient six cadeaux');
  const gift = chaletList.locator('[data-gift-id="g-trystan-amazon-01"]');
  assert.match(await gift.innerText(), /UGREEN Zapix/);
  assert.equal(await gift.locator('a').getAttribute('href'), 'https://amzn.eu/d/07V1UMRH');
  await gift.getByRole('button', { name: 'Réserver' }).click();
  await gift.getByText('Réservé par vous').waitFor();
  await page.screenshot({ path: 'shots/epreuve-mystere/7-liste-chalet.png' });
  await gift.getByRole('button', { name: 'Annuler ma réservation' }).click();
  await gift.getByRole('button', { name: 'Réserver' }).waitFor();
  await chaletList.getByRole('button', { name: 'Fermer la liste de Noël' }).click();
  await page.getByRole('button', { name: /Retour au village/ }).click();
  await page.waitForFunction(() => window.__cq.getGame().scene.isActive('Village'));
  await page.waitForFunction(() => Boolean(window.__cq.getGame().scene.getScene('Village').signpost), null, { timeout: 5000 });
  assert.deepEqual(errors, [], 'no browser errors during the mystery challenge');
  console.log('Parcours mobile : quatre clés, quatre morceaux, réponse et liste vérifiés.');
} finally { await browser.close(); }
