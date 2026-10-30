import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
try {
  await page.goto(process.env.CQ_BASE_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__cq?.server);
  const result = await page.evaluate(() => {
    const s = window.__cq.server;
    s.resetDemo();
    s.signIn('maman@famille-noel.fr', 'noel2026');
    const earlyGuess = s.submitMysteryGuess('u-maman', 'juju');
    const games = ['maman-match3', 'papa-tron', 'juju-blocks', 'chacha-runner'];
    const keys = ['rose', 'bleue', 'doree', 'violette'];
    const wins = games.map((game) => s.awardKey('u-maman', game));
    const duplicate = s.awardKey('u-maman', games[0]);
    const before = s.progress('u-maman');
    const inventory = keys.map((key) => ({ ...before.keys[key] }));
    const deposits = keys.map((key) => s.depositKey('u-maman', key));
    const locked = s.canAccessLists('u-maman');
    const supportsMystery = typeof s.submitMysteryGuess === 'function';
    return { earlyGuess, wins, duplicate, inventory, deposits, locked, supportsMystery, adminLocked: !s.canAccessLists('u-trystan') };
  });
  assert.equal(result.earlyGuess.ok, false, 'the answer cannot be submitted before the four keys are deposited');
  assert.deepEqual(result.wins.map((entry) => entry.ok && entry.data.keyId), ['rose', 'bleue', 'doree', 'violette'], 'a player can win the corresponding key in each of the four houses');
  assert.equal(result.duplicate.data.newKey, false, 'replaying does not duplicate a key');
  assert.ok(result.inventory.every((key) => key.acquired && !key.deposited), 'all four won keys appear in the shared inventory');
  assert.ok(result.deposits.every((entry) => entry.ok), 'all won keys can be placed in the chest');
  assert.equal(result.locked, false, 'four deposited keys alone do not unlock the list');
  assert.equal(result.adminLocked, true, 'the list remains locked for the administrator until the mystery is solved');
  assert.equal(result.supportsMystery, true, 'the mystery answer can be checked');
  const answers = await page.evaluate(() => {
    const s = window.__cq.server;
    const wrong = s.submitMysteryGuess('u-maman', 'mauvaise réponse');
    const stillLocked = s.canAccessLists('u-maman');
    const correct = s.submitMysteryGuess('u-maman', '  JUJU  ');
    return { wrong, stillLocked, correct, unlocked: s.canAccessLists('u-maman') };
  });
  assert.equal(answers.wrong.ok, false, 'an incorrect name does not unlock the list');
  assert.equal(answers.stillLocked, false);
  assert.equal(answers.correct.ok, true, 'the correct name accepts capitalization and spaces');
  assert.equal(answers.unlocked, true);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__cq?.server);
  const persisted = await page.evaluate(() => ({ progress: window.__cq.server.progress('u-maman'), access: window.__cq.server.canAccessLists('u-maman') }));
  assert.equal(persisted.access, true, 'the solved mystery remains unlocked after a reload');
  assert.ok(Object.values(persisted.progress.keys).every((key) => key.acquired && key.deposited), 'deposited keys remain saved after a reload');
  await page.evaluate(() => {
    const storageKey = 'christmas-quest:v3.1';
    const saved = JSON.parse(localStorage.getItem(storageKey));
    delete saved.progress.__family__.mysterySolved;
    localStorage.setItem(storageKey, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__cq?.server);
  const legacy = await page.evaluate(() => ({ progress: window.__cq.server.progress('u-maman'), access: window.__cq.server.canAccessLists('u-maman') }));
  assert.ok(Object.values(legacy.progress.keys).every((key) => key.acquired && key.deposited), 'an older save keeps its four keys');
  assert.equal(legacy.access, false, 'an older save still needs the new mystery answer');
  console.log('Quatre victoires, clés partagées, dépôt, réponse mystère et persistance vérifiés.');
} finally { await browser.close(); }
