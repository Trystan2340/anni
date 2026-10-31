import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

const signIn = async () => {
  await page.getByRole('button', { name: /Maman/ }).first().click();
  await page.locator('input[type=password]').fill('noel2026');
  await page.locator('input[type=checkbox]').check();
  await page.getByRole('button', { name: /Entrer dans le village/ }).click();
  await page.waitForFunction(() => window.__cq?.getGame()?.scene?.getScene('Village')?.player?.texture?.key);
};

try {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  assert.equal(await page.evaluate(() => window.__cq.bus.listenerCount('village:ready')), 0);

  for (let cycle = 1; cycle <= 3; cycle++) {
    await signIn();
    assert.equal(
      await page.evaluate(() => window.__cq.bus.listenerCount('village:ready')),
      1,
      `cycle ${cycle} has one ready listener`,
    );
    await page.evaluate(() => {
      const scene = window.__cq.getGame().scene.getScene('Village');
      window.__cq.__lifecycleRefs = {
        scene,
        emitters: scene.sys.displayList.list.filter((object) => object.constructor.name.startsWith('ParticleEmitter')),
        tweens: scene.tweens.getTweens(),
      };
    });

    await page.getByRole('button', { name: /Quitter/ }).click();
    await page.waitForSelector('.login-shell');
    await page.waitForFunction(() => window.__cq.getGame() === null);
    assert.equal(
      await page.evaluate(() => window.__cq.bus.listenerCount('village:ready')),
      0,
      `cycle ${cycle} clears the ready listener`,
    );
    const cleanup = await page.evaluate(() => {
      const { scene, emitters, tweens } = window.__cq.__lifecycleRefs;
      return {
        sceneActive: Boolean(scene?.sys?.isActive?.()),
        activeEmitters: emitters.filter((emitter) => emitter.active && emitter.emitting).length,
        liveTweens: tweens.filter((tween) => !tween.isDestroyed()).length,
      };
    });
    assert.equal(cleanup.sceneActive, false, `cycle ${cycle} destroys the old scene`);
    assert.equal(cleanup.activeEmitters, 0, `cycle ${cycle} stops old particle emitters`);
    assert.equal(cleanup.liveTweens, 0, `cycle ${cycle} stops old tweens`);
  }

  assert.deepEqual(errors, [], 'scene lifecycle changes cause no runtime errors');
  console.log('Trois connexions/déconnexions sans fuite de listener, particule ou tween');
} finally {
  await browser.close();
}
