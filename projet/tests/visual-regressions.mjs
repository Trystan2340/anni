import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  args: ['--no-sandbox'],
});
const viewportHeight = Number(process.env.CQ_TEST_HEIGHT ?? 700);
const page = await browser.newPage({ viewport: { width: 320, height: viewportHeight }, isMobile: true, hasTouch: true });
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const shots = 'shots/visual-regressions';
mkdirSync(shots, { recursive: true });

try {
  await page.goto(process.env.CQ_BASE_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__cq?.server);
  await page.evaluate(() => {
    const s = window.__cq.server;
    s.resetDemo(); s.signIn('trystan@famille-noel.fr', 'noel2026');
    ['rose', 'bleue', 'doree', 'violette'].forEach((key) => s.adminSetKey('u-maman', key, true, true));
    s.submitMysteryGuess('u-trystan', 'juju');
    s.signOut();
  });
  await page.getByRole('button', { name: /Maman/ }).first().tap();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: viewportHeight - 100 }] });
  for (const y of [viewportHeight - 180, viewportHeight - 260, 220, 100]) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 300, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(300);
  const scroll = await page.locator('.login-shell').evaluate((el) => el.scrollTop);
  check(scroll > 20, `Connexion : le glissement ne défile pas (scrollTop ${scroll})`);
  for (let swipe = 0; swipe < 3; swipe++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: viewportHeight - 100 }] });
    for (const y of [viewportHeight - 180, viewportHeight - 260, 220, 100]) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 300, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(200);
  }
  const loginButton = await page.getByRole('button', { name: /Entrer dans le village/ }).boundingBox();
  check(loginButton && loginButton.y >= 0 && loginButton.y + loginButton.height <= viewportHeight, 'Connexion : le bouton reste inaccessible après des glissements');
  const loginLayout = await page.evaluate(() => {
    const preview = document.querySelector('.signin-preview');
    const title = preview.querySelector('strong').getBoundingClientRect();
    const bounds = preview.getBoundingClientRect();
    const label = document.querySelector('label.checkbox');
    const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
    let text;
    while (walker.nextNode()) if (walker.currentNode.textContent.includes('Je confirme être')) { text = walker.currentNode; break; }
    const range = document.createRange();
    range.selectNodeContents(text);
    return { titleRight: title.right, previewRight: bounds.right, confirmationLines: range.getClientRects().length };
  });
  check(loginLayout.titleRight <= loginLayout.previewRight, 'Connexion : le titre de la mascotte déborde');
  check(loginLayout.confirmationLines <= 1, 'Connexion : la phrase de confirmation est découpée en colonnes');
  await page.screenshot({ path: `${shots}/connexion-320.png` });
  await cdp.detach();
  await page.locator('input[type=password]').fill('noel2026');
  await page.locator('input[type=checkbox]').check();
  await page.getByRole('button', { name: /Entrer dans le village/ }).click();
  await page.waitForFunction(() => window.__cq?.getGame()?.scene.isActive('Village') && !window.__cq.getGame().scene.getScene('Village').cameras.main.fadeEffect.isRunning);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shots}/village-320.png` });
  const hud = await page.locator('.hud-keys').evaluate((el) => {
    const box = el.getBoundingClientRect();
    const items = [...el.querySelectorAll('.key-chip, .key-counts')].map((node) => node.getBoundingClientRect().toJSON());
    return { text: el.innerText, left: box.left, right: box.right, items };
  });
  check(/En poche\s*0\/4/.test(hud.text), `Inventaire après dépôt : ${hud.text}`);
  check(hud.items.every((item) => item.left >= hud.left - 1 && item.right <= hud.right + 1), 'Bandeau des clés : des éléments sont coupés');
  await page.evaluate(() => {
    const s = window.__cq.server;
    s.signIn('trystan@famille-noel.fr', 'noel2026');
    s.adminSetKey('u-maman', 'violette', true, false);
  });
  await page.waitForFunction(() => /En poche\s*1\/4/.test(document.querySelector('.hud-keys').innerText));
  const partialHud = await page.locator('.hud-keys').innerText();
  check(/Au coffre\s*3\/4/.test(partialHud), `Inventaire partiellement déposé : ${partialHud}`);
  await page.evaluate(() => {
    const s = window.__cq.server;
    s.adminSetKey('u-maman', 'violette', true, true);
    s.submitMysteryGuess('u-trystan', 'juju');
    s.signIn('maman@famille-noel.fr', 'noel2026');
  });
  const sign = await page.evaluate(() => {
    const canvas = document.querySelector('canvas').getBoundingClientRect();
    const cam = window.__cq.getGame().scene.getScene('Village').cameras.main;
    const x = (world) => canvas.x + (world - cam.worldView.x) * cam.zoom / cam.width * canvas.width;
    const y = (world) => canvas.y + (world - cam.worldView.y) * cam.zoom / cam.height * canvas.height;
    const hint = document.querySelector('.mobile-hint').getBoundingClientRect();
    return { left: x(706), right: x(854), top: y(520), bottom: y(572), hint: hint.toJSON(), hintDisplay: getComputedStyle(document.querySelector('.mobile-hint')).display };
  });
  check(sign.left >= 0 && sign.right <= 320, `Panneau de liste coupé : ${JSON.stringify(sign)}`);
  check(sign.hintDisplay === 'none' || sign.bottom <= sign.hint.top || sign.top >= sign.hint.bottom || sign.right <= sign.hint.left || sign.left >= sign.hint.right, 'Aide mobile superposée au panneau de liste');

  const door = await page.evaluate(() => {
    const b = document.querySelector('canvas').getBoundingClientRect();
    const c = window.__cq.getGame().scene.getScene('Village').cameras.main;
    return { x: b.x + (640 - c.worldView.x) * c.zoom / c.width * b.width, y: b.y + (323 - c.worldView.y) * c.zoom / c.height * b.height };
  });
  await page.touchscreen.tap(door.x, door.y);
  await page.waitForFunction(() => window.__cq.getGame().scene.isActive('ChaletInterior'));
  await page.waitForFunction(() => !window.__cq.getGame().scene.getScene('ChaletInterior').cameras.main.fadeEffect.isRunning);
  check(/sapin.*gauche.*coffre/i.test(await page.locator('.mobile-hint').innerText()), 'Chalet : aucune indication pour trouver le sapin et la liste');
  await page.screenshot({ path: `${shots}/chalet-320.png` });
  await page.getByRole('button', { name: /Retour au village/ }).click();
  await page.waitForFunction(() => window.__cq.getGame().scene.isActive('Village'));

  for (const [id, sceneKey, gameId] of [
    ['maman', 'MamanMatch3', 'maman-match3'], ['papa', 'PapaTron', 'papa-tron'],
    ['juju', 'JujuBlocks', 'juju-blocks'], ['chacha', 'ChachaRunner', 'chacha-runner'],
  ]) {
    await page.evaluate(({ id, gameId }) => window.__cq.bus.emit('minigame:open', { houseId: `maison-${id}`, gameId }), { id, gameId });
    await page.waitForFunction((key) => window.__cq.getGame().scene.getScene(key)?.sys.isActive(), sceneKey);
    await page.waitForTimeout(250);
    const layout = await page.evaluate((key) => {
      const scene = window.__cq.getGame().scene.getScene(key);
      const rules = scene.meta().rules;
      const texts = [];
      let start;
      const walk = (objects) => objects.forEach((obj) => { if (rules.includes(obj.text)) texts.push(obj); if (obj.text === 'Commencer') start = obj; if (obj.list) walk(obj.list); });
      walk(scene.children.list);
      const scale = document.querySelector('canvas').getBoundingClientRect().width / scene.scale.width;
      const buttonHeight = start?.parentContainer?.list[0]?.height ?? 0;
      const buttonY = start?.getWorldTransformMatrix().ty ?? 0;
      const last = texts.at(-1);
      return {
        lines: texts.map((text) => ({ text: text.text, top: text.y - text.height * text.originY, bottom: text.y + text.height * (1 - text.originY), font: parseFloat(text.style.fontSize) * scale })),
        buttonHeight: buttonHeight * scale,
        buttonTop: buttonY - buttonHeight / 2,
        buttonBottom: buttonY + buttonHeight / 2,
        lastBottom: last?.getWorldTransformMatrix().ty + last?.height * (1 - last?.originY),
        gameHeight: scene.scale.height,
      };
    }, sceneKey);
    check(layout.lines.length > 1, `${id} : textes du tutoriel introuvables`);
    for (let i = 1; i < layout.lines.length; i++) check(layout.lines[i].top >= layout.lines[i - 1].bottom - 1, `${id} : deux consignes se chevauchent`);
    check(layout.lines.every((line) => line.font >= 11.5), `${id} : texte du tutoriel trop petit (${layout.lines[0]?.font?.toFixed(1)} px)`);
    check(layout.buttonTop >= layout.lastBottom + 10, `${id} : boutons superposés aux consignes`);
    check(layout.buttonTop >= 0 && layout.buttonBottom <= layout.gameHeight && layout.buttonHeight >= 44, `${id} : bouton de démarrage coupé ou trop petit (${JSON.stringify(layout)})`);
    await page.screenshot({ path: `${shots}/${id}-intro-320.png` });
    await page.getByRole('button', { name: 'Quitter le mini-jeu' }).click();
    await page.waitForFunction(() => window.__cq.getGame().scene.isActive('Village'));
  }
  if (failures.length) { console.error(failures.map((failure) => `❌ ${failure}`).join('\n')); process.exitCode = 1; }
  else console.log('Connexion tactile, inventaire, repères et tutoriels portrait vérifiés.');
} finally { await browser.close(); }
