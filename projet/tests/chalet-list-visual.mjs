import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const baseUrl = process.env.CQ_BASE_URL ?? 'http://127.0.0.1:5173/';
const shots = new URL('../shots/', import.meta.url).pathname;
mkdirSync(shots, { recursive: true });
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });

async function preparePage(width, height, prefix) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
    isMobile: width < 600,
    hasTouch: width < 600,
  });
  page.setDefaultTimeout(8000);
  page.setDefaultNavigationTimeout(12000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__cq?.server);
  await page.evaluate(() => {
    const server = window.__cq.server;
    server.resetDemo(); server.setDemoClock(0); server.setSimulatedReveal(false);
    server.signIn('trystan@famille-noel.fr', 'noel2026');
    ['rose', 'bleue', 'doree', 'violette'].forEach((key) => server.adminSetKey('u-trystan', key, true, true));
    server.submitMysteryGuess('u-trystan', 'juju');
    server.signOut();
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Maman/ }).first().click();
  await page.locator('input[type=password]').fill('noel2026');
  await page.locator('input[type=checkbox]').check();
  await page.getByRole('button', { name: /Entrer dans le village/ }).click();
  await page.waitForFunction(() => window.__cq?.getGame()?.scene?.getScene('Village')?.player?.texture?.key);
  await page.waitForFunction(() => !window.__cq.getGame().scene.getScene('Village').cameras.main.fadeEffect?.isRunning);
  await page.waitForTimeout(120);
  const number = prefix === 'desktop' ? '01' : prefix === 'mobile' ? '05' : '09';
  await page.screenshot({ path: `${shots}/audit-${number}-village-${prefix}.png` });

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  assert.ok(box, 'game canvas is visible');
  const chaletDoor = await pointForWorld(page, canvas, 'Village', 640, 323);
  if (width < 600) await page.touchscreen.tap(chaletDoor.x, chaletDoor.y);
  else await page.mouse.click(chaletDoor.x, chaletDoor.y);
  await page.waitForFunction(() => window.__cq?.getGame()?.scene?.isActive('ChaletInterior'));
  await page.waitForFunction(() => !window.__cq.getGame().scene.getScene('ChaletInterior').cameras.main.fadeEffect?.isRunning);
  await page.waitForTimeout(100);
  const interiorNumber = prefix === 'desktop' ? '02' : prefix === 'mobile' ? '06' : '10';
  await page.screenshot({ path: `${shots}/audit-${interiorNumber}-chalet-${prefix}.png` });
  assert.deepEqual(errors, [], `${prefix}: no browser runtime errors`);
  return { page, canvas, box };
}

async function pointForWorld(page, canvas, sceneKey, x, y) {
  const box = await canvas.boundingBox();
  assert.ok(box, 'game canvas remains visible');
  return page.evaluate(({ rect, sceneKey, x, y }) => {
    const scene = window.__cq.getGame().scene.getScene(sceneKey);
    const camera = scene.cameras.main;
    const view = camera.worldView;
    return {
      x: rect.x + ((x - view.x) * camera.zoom / camera.width) * rect.width,
      y: rect.y + ((y - view.y) * camera.zoom / camera.height) * rect.height,
    };
  }, { rect: box, sceneKey, x, y });
}

try {
  const desktop = await preparePage(1440, 900, 'desktop');
  const noteX = desktop.box.x + (366 / 1280) * desktop.box.width;
  const noteY = desktop.box.y + (515 / 720) * desktop.box.height;
  await desktop.page.mouse.click(noteX, noteY);
  const desktopModal = desktop.page.locator('.chalet-list-modal');
  await desktopModal.waitFor();
  assert.match(await desktopModal.getByRole('heading', { level: 2 }).innerText(), /Liste de Noël de Trystan/);
  assert.equal(await desktopModal.locator('.chalet-wishlist-gift').count(), 4, 'only Trystan gifts appear');
  assert.equal(await desktopModal.getByText('Pluviomètre en cuivre').count(), 0, 'another member list is hidden');
  assert.equal(await desktopModal.locator('a[href="https://example.com/casque"]').count(), 1, 'gift links are visible');
  const focusable = desktopModal.locator('a[href], button:not([disabled])');
  await focusable.last().focus();
  await desktop.page.keyboard.press('Tab');
  assert.equal(
    await desktop.page.evaluate(() => document.activeElement?.getAttribute('aria-label')),
    'Fermer la liste de Noël',
    'Tab wraps to the first control inside the dialog',
  );
  await desktop.page.screenshot({ path: `${shots}/audit-03-liste-desktop.png` });
  const keyboardGift = desktopModal.locator('[data-gift-id="g-t2"]');
  await keyboardGift.getByRole('button', { name: 'Réserver' }).click();
  await keyboardGift.getByText('Réservé par vous').waitFor();
  await desktop.page.screenshot({ path: `${shots}/audit-04-reservation-desktop.png` });
  await keyboardGift.getByRole('button', { name: 'Annuler ma réservation' }).click();
  await keyboardGift.getByRole('button', { name: 'Réserver' }).waitFor();
  const scenePaused = await desktop.page.evaluate(() => window.__cq.getGame().scene.getScene('ChaletInterior').scene.isPaused());
  assert.equal(scenePaused, true, 'the chalet scene pauses while the list is open');
  await desktopModal.getByRole('button', { name: 'Fermer la liste de Noël' }).click();
  await desktop.page.evaluate(() => {
    const scene = window.__cq.getGame().scene.getScene('ChaletInterior');
    scene.player.setPosition(455, 515);
    scene.update(performance.now());
  });
  await desktop.page.screenshot({ path: `${shots}/audit-10-proche-du-papier-desktop.png` });
  await desktop.page.keyboard.press('e');
  await desktop.page.locator('.chalet-list-modal').waitFor();
  await desktop.page.keyboard.press('Escape');
  await desktop.page.locator('.chalet-list-modal').waitFor({ state: 'detached' });
  await desktop.page.waitForFunction(() =>
    !window.__cq.getGame().scene.getScene('ChaletInterior').scene.isPaused(),
  );
  assert.equal(
    await desktop.page.evaluate(() => !window.__cq.getGame().scene.getScene('ChaletInterior').scene.isPaused()),
    true,
    'Escape closes the list and resumes the chalet',
  );
  await desktop.page.evaluate(() => window.__cq.bus.emit('chalet:exit', undefined));
  await desktop.page.waitForFunction(() => window.__cq?.getGame()?.scene?.isActive('Village'));
  await desktop.page.waitForFunction(() => !window.__cq.getGame().scene.getScene('Village').cameras.main.fadeEffect?.isRunning);
  const villageBox = await desktop.canvas.boundingBox();
  assert.ok(villageBox, 'village canvas remains visible after leaving the chalet');
  await desktop.page.mouse.click(villageBox.x + (640 / 1280) * villageBox.width, villageBox.y + (323 / 720) * villageBox.height);
  await desktop.page.waitForFunction(() => window.__cq?.getGame()?.scene?.isActive('ChaletInterior'));
  await desktop.page.waitForFunction(() => !window.__cq.getGame().scene.getScene('ChaletInterior').cameras.main.fadeEffect?.isRunning);
  await desktop.page.screenshot({ path: `${shots}/audit-11-retour-au-chalet-desktop.png` });

  const mobile = await preparePage(390, 844, 'mobile');
  const mobileInteriorBox = await mobile.canvas.boundingBox();
  assert.ok(mobileInteriorBox && mobileInteriorBox.height >= 450,
    'mobile chalet is enlarged to use the portrait screen');
  await mobile.page.evaluate(() => {
    const scene = window.__cq.getGame().scene.getScene('ChaletInterior');
    scene.cameras.main.stopFollow();
    scene.cameras.main.centerOn(366, 515);
  });
  const mobileNote = await pointForWorld(mobile.page, mobile.canvas, 'ChaletInterior', 366, 515);
  const mobileTargetSize = await mobile.page.evaluate(() => {
    const scene = window.__cq.getGame().scene.getScene('ChaletInterior');
    const target = scene.data.get('listNoteHitArea');
    const scale = scene.sys.game.canvas.getBoundingClientRect().width / scene.cameras.main.width;
    return Math.min(target.width, target.height) * scene.cameras.main.zoom * scale;
  });
  assert.ok(mobileTargetSize >= 44, `mobile paper target is at least 44px (actual ${mobileTargetSize.toFixed(1)}px)`);
  await mobile.page.touchscreen.tap(mobileNote.x, mobileNote.y);
  const mobileModal = mobile.page.locator('.chalet-list-modal');
  await mobileModal.waitFor();
  await mobile.page.screenshot({ path: `${shots}/audit-07-liste-mobile.png` });
  const overflow = await mobile.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(overflow, false, 'mobile list popup has no horizontal overflow');
  await mobile.page.locator('.chalet-list-scroll').evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await mobile.page.screenshot({ path: `${shots}/audit-08-liste-mobile-bas.png` });

  await mobileModal.getByRole('button', { name: 'Fermer la liste de Noël' }).click();
  await mobile.page.evaluate(() => {
    const scene = window.__cq.getGame().scene.getScene('ChaletInterior');
    scene.player.setPosition(455, 515);
  });
  await mobile.page.waitForTimeout(350);
  await mobile.page.evaluate(() => {
    const server = window.__cq.server;
    server.resetDemo();
    server.signIn('maman@famille-noel.fr', 'noel2026');
    window.__cq.bus.emit('chalet:list', undefined);
  });
  await mobile.page.getByText('Dépose les quatre clés dans le coffre pour dévoiler l’image mystère.').waitFor();
  assert.equal(await mobile.page.locator('.chalet-list-modal').count(), 0, 'locked players do not see the list');
  const toastBox = await mobile.page.locator('.toast').boundingBox();
  const hintBox = await mobile.page.locator('.mobile-hint').boundingBox();
  const hudBox = await mobile.page.locator('.hud').boundingBox();
  assert.ok(toastBox && hudBox && toastBox.y >= hudBox.y + hudBox.height,
    'the locked access message stays below the mobile HUD');
  assert.ok(toastBox && hintBox && toastBox.y + toastBox.height <= hintBox.y,
    'locked access message stays above the touch hint on mobile');
  await mobile.page.screenshot({ path: `${shots}/audit-09-verrouillage-mobile.png` });
  console.log('Parcours tactile du chalet et de la liste vérifié sur ordinateur et téléphone.');
} finally {
  await browser.close();
}
