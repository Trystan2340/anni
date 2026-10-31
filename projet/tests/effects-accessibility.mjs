import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

const activeEmitters = async (sceneKey = 'Village') =>
  page.evaluate((key) => {
    const scene = window.__cq.getGame().scene.getScene(key);
    return scene.sys.displayList.list
      .filter((object) => object.constructor.name.startsWith('ParticleEmitter'))
      .filter((emitter) => emitter.active && emitter.emitting)
      .map((emitter) => emitter.texture.key);
  }, sceneKey);

const enterMamanGame = async () => {
  await page.waitForFunction(() => window.__cq.getGame().scene.isActive('MamanMatch3'));
  await page.waitForTimeout(250);
  const needsIntro = await page.evaluate(() => window.__cq.getGame().scene.getScene('MamanMatch3').over);
  if (needsIntro) await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__cq.getGame().scene.getScene('MamanMatch3').over === false);
};

const startMaman = async () => {
  await page.evaluate(() => window.__cq.openMinigame('maman'));
  await enterMamanGame();
};

try {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Maman/ }).first().click();
  await page.locator('input[type=password]').fill('noel2026');
  await page.locator('input[type=checkbox]').check();
  await page.getByRole('button', { name: /Entrer dans le village/ }).click();
  await page.waitForFunction(() => window.__cq?.getGame()?.scene?.getScene('Village')?.player?.texture?.key);

  const originalEmitters = await activeEmitters();
  assert.ok(originalEmitters.length >= 2, 'normal motion keeps both snow layers active');
  const readyEmitters = await page.evaluate(() => {
    const scene = window.__cq.getGame().scene.getScene('Village');
    const progress = structuredClone(window.__cq.server.progress('u-maman'));
    progress.keys.rose.acquired = true;
    progress.keys.rose.ownerId = 'u-maman';
    progress.chestOpened = true;
    scene.applyState(scene.design, progress);
    return scene.sys.displayList.list
      .filter((object) => object.constructor.name.startsWith('ParticleEmitter'))
      .filter((emitter) => emitter.active && emitter.emitting)
      .map((emitter) => emitter.texture.key);
  });
  assert.ok(readyEmitters.includes('fx-spark'), 'ready chest can emit its reward sparkle in normal motion');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(350);
  assert.deepEqual(await activeEmitters(), [], 'reduced motion stops continuous village emitters');
  const signpost = await page.evaluate(() => {
    const container = window.__cq.getGame().scene.getScene('Village').signpost;
    return { alpha: container.alpha, scale: container.scaleX };
  });
  assert.ok(signpost.alpha >= 0.99 && Math.abs(signpost.scale - 1) < 0.01, 'reduced motion settles the signpost entrance');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(350);
  const stableShutdownListeners = await page.evaluate(() =>
    window.__cq.getGame().scene.getScene('Village').events.listenerCount('shutdown'),
  );
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(120);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(160);
    const current = await page.evaluate(() =>
      window.__cq.getGame().scene.getScene('Village').events.listenerCount('shutdown'),
    );
    assert.equal(current, stableShutdownListeners, 'motion toggles do not accumulate scene shutdown listeners');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(350);
  const promptScaleBefore = await page.evaluate(() => {
    const prompt = window.__cq.getGame().scene.getScene('Village').prompt.container;
    return { visible: prompt.visible, x: prompt.scaleX, y: prompt.scaleY };
  });
  await page.waitForTimeout(160);
  const promptScaleAfter = await page.evaluate(() => {
    const prompt = window.__cq.getGame().scene.getScene('Village').prompt.container;
    return { visible: prompt.visible, x: prompt.scaleX, y: prompt.scaleY };
  });
  assert.equal(promptScaleBefore.visible, true, 'interaction prompt is visible near the chest');
  assert.deepEqual(
    { x: promptScaleAfter.x, y: promptScaleAfter.y },
    { x: promptScaleBefore.x, y: promptScaleBefore.y },
    'reduced motion keeps the interaction prompt static',
  );

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(350);
  assert.deepEqual(
    (await activeEmitters()).sort(),
    readyEmitters.sort(),
    'normal motion resumes without duplicate emitters',
  );

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startMaman();
  const reducedLoss = await page.evaluate(() => {
    const scene = window.__cq.getGame().scene.getScene('MamanMatch3');
    const camera = scene.cameras.main;
    let shakeCalls = 0;
    const shake = camera.shake.bind(camera);
    camera.shake = (...args) => {
      shakeCalls++;
      return shake(...args);
    };
    scene.finish(false);
    return {
      shakeCalls,
      confetti: scene.sys.displayList.list.filter(
        (object) => object.constructor.name.startsWith('ParticleEmitter') && object.texture.key === 'fx-confetti',
      ).length,
      flashes: scene.sys.displayList.list.filter((object) => object.type === 'Rectangle' && object.depth === 9600).length,
    };
  });
  assert.equal(reducedLoss.shakeCalls, 0, 'reduced motion suppresses defeat shake');
  assert.equal(reducedLoss.confetti, 0, 'reduced motion does not start confetti');
  assert.equal(reducedLoss.flashes, 0, 'reduced motion does not start a flash');

  await page.evaluate(() => window.__cq.getGame().scene.getScene('MamanMatch3').scene.restart());
  await enterMamanGame();
  await page.evaluate(() => window.__cq.getGame().scene.getScene('MamanMatch3').finish(true));
  assert.equal((await activeEmitters('MamanMatch3')).filter((key) => key === 'fx-confetti').length, 0);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => window.__cq.getGame().scene.getScene('MamanMatch3').scene.restart());
  await enterMamanGame();
  await page.evaluate(() => window.__cq.getGame().scene.getScene('MamanMatch3').finish(true));
  assert.ok((await activeEmitters('MamanMatch3')).includes('fx-confetti'), 'normal motion shows victory confetti');
  const victoryFlash = await page.evaluate(() =>
    window.__cq
      .getGame()
      .scene.getScene('MamanMatch3')
      .sys.displayList.list.some((object) => object.type === 'Rectangle' && object.depth === 9600),
  );
  assert.ok(victoryFlash, 'normal motion keeps its victory flash');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(350);
  assert.equal(
    (await activeEmitters('MamanMatch3')).filter((key) => key === 'fx-confetti').length,
    0,
    'changing to reduced motion stops existing victory confetti',
  );
  assert.deepEqual(errors, [], 'effect changes cause no runtime errors');

  const startupReducedPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  startupReducedPage.on('pageerror', (error) => errors.push(error.message));
  await startupReducedPage.emulateMedia({ reducedMotion: 'reduce' });
  await startupReducedPage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await startupReducedPage.getByRole('button', { name: /Maman/ }).first().click();
  await startupReducedPage.locator('input[type=password]').fill('noel2026');
  await startupReducedPage.locator('input[type=checkbox]').check();
  await startupReducedPage.getByRole('button', { name: /Entrer dans le village/ }).click();
  await startupReducedPage.waitForFunction(
    () => window.__cq?.getGame()?.scene?.getScene('Village')?.player?.texture?.key,
  );
  const startupAmbient = await startupReducedPage.evaluate(() => {
    const scene = window.__cq.getGame().scene.getScene('Village');
    return {
      emitters: scene.sys.displayList.list
        .filter((object) => object.constructor.name.startsWith('ParticleEmitter'))
        .filter((emitter) => emitter.active && emitter.emitting).length,
      tweenScale: scene.tweens.timeScale,
    };
  });
  assert.deepEqual(startupAmbient, { emitters: 0, tweenScale: 0 }, 'startup reduced motion disables village effects');
  await startupReducedPage.close();
  assert.deepEqual(errors, [], 'effect changes cause no runtime errors');
  console.log('Mouvement réduit et effets de victoire vérifiés');
} finally {
  await browser.close();
}
