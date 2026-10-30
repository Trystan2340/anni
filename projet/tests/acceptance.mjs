/**
 * Tests d'acceptation du prototype (§15 du cahier des charges).
 * Ils s'exécutent contre l'application réelle, via l'API exposée pour les tests.
 */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__cq?.server);

const results = [];
const check = (name, condition, detail = '') => {
  results.push({ name, ok: Boolean(condition), detail });
};

// ------------------------------------------------------------------ jeu de départ propre
await page.evaluate(() => {
  window.__cq.server.resetDemo();
  window.__cq.server.setDemoClock(0);
  window.__cq.server.setSimulatedReveal(false);
});

// 1. Surprise : le propriétaire ne reçoit AUCUN champ de réservation avant Noël
const blind = await page.evaluate(() => {
  const { server } = window.__cq;
  server.signIn('trystan@famille-noel.fr', 'noel2026');
  // l'admin ouvre les listes de Maman (dépôt des 4 clés via l'administration)
  ['rose', 'bleue', 'doree', 'violette'].forEach((key) => server.adminSetKey('u-maman', key, true, true));
  server.submitMysteryGuess('u-trystan', 'juju');
  server.signIn('maman@famille-noel.fr', 'noel2026');
  const list = server.allLists('u-maman').data.find((entry) => entry.ownerId === 'u-maman');
  const raw = JSON.stringify(list);
  return {
    gifts: list.gifts.length,
    hasReservationField: list.gifts.some((gift) => 'reservation' in gift),
    leaksWord: /reservedBy|reservationId|reserved_at|is_reserved/i.test(raw),
    revealed: list.revealed,
  };
});
check('Propriétaire : aucun champ de réservation avant le 25/12', !blind.hasReservationField, JSON.stringify(blind));
check('Propriétaire : aucune fuite textuelle dans le DTO', !blind.leaksWord);
check('Révélation encore verrouillée', blind.revealed === false);

// 2. Les autres destinataires voient le statut et le nom du réservataire
const others = await page.evaluate(() => {
  const { server } = window.__cq;
  server.signIn('trystan@famille-noel.fr', 'noel2026');
  const list = server.allLists('u-trystan').data.find((entry) => entry.ownerId === 'u-maman');
  const reserved = list.gifts.filter((gift) => gift.reservation);
  return { total: list.gifts.length, reserved: reserved.length, firstName: reserved[0]?.reservation?.reservedByMember };
});
check('Autres membres : statut et réservataire visibles', others.reserved > 0 && Boolean(others.firstName), JSON.stringify(others));

// 3. Réservation de sa propre liste refusée
const ownList = await page.evaluate(() => {
  const { server } = window.__cq;
  server.signIn('maman@famille-noel.fr', 'noel2026');
  const ownGift = server.allLists('u-maman').data.find((l) => l.ownerId === 'u-maman').gifts[0];
  return server.reserve('u-maman', ownGift.id);
});
check('Réservation de sa propre liste refusée', ownList.ok === false && ownList.code === 'OWN_LIST', JSON.stringify(ownList));

// 4. Deux réservations simultanées : une seule réussit
const race = await page.evaluate(() => {
  const { server } = window.__cq;
  server.signIn('maman@famille-noel.fr', 'noel2026');
  const target = server.allLists('u-maman').data.find((l) => l.ownerId === 'u-papa').gifts.find((gift) => !gift.reservation);
  const first = server.reserve('u-maman', target.id);
  // second clic simultané : autre membre
  server.signIn('juju@famille-noel.fr', 'noel2026');
  const second = server.reserve('u-juju', target.id);
  return { first, second, giftId: target.id };
});
check(
  'Deux réservations simultanées : une seule passe',
  race.first.ok === true && race.second.ok === false && race.second.code === 'ALREADY_RESERVED',
  JSON.stringify(race),
);

// 5. Annulation : seulement la sienne, et le cadeau redevient libre
const cancelFlow = await page.evaluate(async (giftId) => {
  const { server } = window.__cq;
  server.signIn('juju@famille-noel.fr', 'noel2026');
  const notMine = server.cancelReservation('u-juju', giftId); // réservé par Maman
  server.signIn('maman@famille-noel.fr', 'noel2026');
  const mine = server.cancelReservation('u-maman', giftId);
  const after = server.allLists('u-maman').data.find((l) => l.ownerId === 'u-papa').gifts.find((g) => g.id === giftId);
  return { notMine, mine, freed: after.reservation === null };
}, race.giftId);
check(
  'Annulation réservée à son auteur',
  cancelFlow.notMine.ok === false && cancelFlow.mine.ok === true,
  JSON.stringify(cancelFlow),
);
check('Annulation : le cadeau est libéré', cancelFlow.freed === true);

// 6. Révélation : 10 h 59 masqué, 11 h 00 dévoilé (horloge serveur simulée)
const reveal = await page.evaluate(() => {
  const { server } = window.__cq;
  const target = Date.parse('2026-12-25T10:00:00.000Z');
  const before = target - Date.now() - 60_000; // 10 h 59 Paris
  server.setDemoClock(before);
  const stateBefore = server.revealState();
  server.signIn('maman@famille-noel.fr', 'noel2026');
  const listBefore = server.allLists('u-maman').data.find((l) => l.ownerId === 'u-maman');
  const blindBefore = listBefore.gifts.every((gift) => !('reservation' in gift) && !('is_reserved' in gift));

  const atReveal = target - Date.now(); // 11 h 00 pile
  server.setDemoClock(atReveal);
  const stateAfter = server.revealState();
  const listAfter = server.allLists('u-maman').data.find((l) => l.ownerId === 'u-maman');
  const revealedAfter = listAfter.gifts.some((gift) => 'reservation' in gift);
  const namesVisible = listAfter.gifts.some((gift) => gift.reservation && gift.reservation.reservedByMember);

  server.setDemoClock(0);
  return { stateBefore: stateBefore.revealed, blindBefore, stateAfter: stateAfter.revealed, revealedAfter, namesVisible };
});
check('À 10 h 59 : aucune donnée révélatrice', reveal.stateBefore === false && reveal.blindBefore === true, JSON.stringify(reveal));
check(
  'À 11 h 00 : statuts et noms accessibles au propriétaire',
  reveal.stateAfter === true && reveal.revealedAfter === true && reveal.namesVisible === true,
  JSON.stringify(reveal),
);

// 7. Clés : unicité, dépôt, coffre, persistance après actualisation
const keys = await page.evaluate(() => {
  const { server } = window.__cq;
  // La progression est commune à la famille : remettre les clés à zéro une
  // seule fois permet de vérifier qu'aucun compte ne peut en déposer une avant victoire.
  server.signIn('trystan@famille-noel.fr', 'noel2026');
  ['rose', 'bleue', 'doree', 'violette'].forEach((key) => server.adminSetKey('u-maman', key, false, false));

  server.signIn('maman@famille-noel.fr', 'noel2026');
  const first = server.awardKey('u-maman', 'maman-match3');
  const second = server.awardKey('u-maman', 'maman-match3');
  const wrongGame = server.awardKey('u-maman', 'jeu-inconnu');

  // Une clé d'une autre maison, encore non gagnée, ne peut pas être déposée.
  const depositBeforeWin = server.depositKey('u-maman', 'violette');

  // Les trois autres clés seraient gagnées dans leurs maisons : on les simule côté admin.
  const progress = server.progress('u-maman');
  return {
    first: first.data,
    second: second.data,
    wrongGame,
    depositBeforeWin,
    progress,
  };
});
check('Première victoire : une clé', keys.first?.newKey === true && keys.first?.keyId === 'rose', JSON.stringify(keys.first));
check('Rejouer ne duplique pas la clé', keys.second?.newKey === false);
check('Mini-jeu inconnu refusé', keys.wrongGame.ok === false);
check('Dépôt impossible sans clé gagnée', keys.depositBeforeWin.ok === false, JSON.stringify(keys.depositBeforeWin));

const deposits = await page.evaluate(() => {
  const { server } = window.__cq;
  server.signIn('trystan@famille-noel.fr', 'noel2026');
  ['bleue', 'doree', 'violette'].forEach((key) => server.adminSetKey('u-maman', key, true, false));
  server.signIn('maman@famille-noel.fr', 'noel2026');
  const results = ['rose', 'bleue', 'doree', 'violette'].map((key) => server.depositKey('u-maman', key));
  const solved = server.submitMysteryGuess('u-maman', 'juju');
  const progress = server.progress('u-maman');
  return {
    ok: results.every((entry) => entry.ok) && solved.ok,
    last: results[3].data,
    chestOpened: progress.chestOpened,
    depositedCount: Object.values(progress.keys).filter((k) => k.deposited).length,
  };
});
check('Quatre dépôts ouvrent le coffre', deposits.ok && deposits.chestOpened === true && deposits.depositedCount === 4, JSON.stringify(deposits));

await page.reload({ waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__cq?.server);
const persisted = await page.evaluate(() => {
  const { server } = window.__cq;
  const progress = server.progress('u-maman');
  return {
    deposited: Object.values(progress.keys).filter((k) => k.deposited).length,
    chestOpened: progress.chestOpened,
    session: server.currentProfile()?.member ?? null,
  };
});
check('Coffre et clés conservés après actualisation', persisted.deposited === 4 && persisted.chestOpened === true, JSON.stringify(persisted));

// 8. Administrateur : accès après l'énigme, mais pas aux secrets de sa liste
const admin = await page.evaluate(() => {
  const { server } = window.__cq;
  server.signIn('trystan@famille-noel.fr', 'noel2026');
  const access = server.canAccessLists('u-trystan');
  const own = server.allLists('u-trystan').data.find((l) => l.ownerId === 'u-trystan');
  return {
    access,
    adminProgress: server.progress('u-trystan'),
    ownBlind: own.gifts.every((gift) => !('reservation' in gift)),
    ownTitle: own.title,
  };
});
check('Administrateur : liste accessible après l’énigme', admin.access === true);
check(
  'Administrateur : aucune victoire fictive',
  admin.adminProgress.awardedKeys.length === 1 && admin.adminProgress.awardedKeys[0] === 'rose',
  JSON.stringify(admin.adminProgress.awardedKeys),
);
check('Administrateur : sa propre liste reste masquée avant Noël', admin.ownBlind === true);
check('Liste principale intitulée « Ma liste de Noël »', admin.ownTitle === 'Ma liste de Noël');

// 9. Ordre stable des cinq listes + titres vus par un autre membre
const order = await page.evaluate(() => {
  const { server } = window.__cq;
  server.signIn('papa@famille-noel.fr', 'noel2026');
  const lists = server.allLists('u-papa');
  return lists.ok
    ? { order: lists.data.map((l) => l.ownerId), titles: lists.data.map((l) => l.title) }
    : { error: lists.error };
});
const expectedOrder = ['u-trystan', 'u-maman', 'u-papa', 'u-juju', 'u-chacha'];
check('Ordre stable des cinq listes', JSON.stringify(order.order) === JSON.stringify(expectedOrder), JSON.stringify(order));
check('Titre « Liste de Trystan » pour les autres', order.titles?.[0] === 'Liste de Trystan');
check('« Ma liste » pour sa propre carte secondaire', order.titles?.[2] === 'Ma liste de Noël');

// 10. Édition : messages neutres identiques, réservé ou non
const neutral = await page.evaluate(() => {
  const { server } = window.__cq;
  server.signIn('maman@famille-noel.fr', 'noel2026');
  const own = server.allLists('u-maman').data.find((l) => l.ownerId === 'u-maman');
  const plain = server.updateGift('u-maman', own.gifts[2].id, { description: 'test' }).data.neutralMessage;
  const other = server.allLists('u-maman').data.find((l) => l.ownerId === 'u-papa');
  const target = other.gifts[0];
  const removed = server.deleteGift('u-maman', own.gifts[0].id).data.neutralMessage;
  return { plain, removed, targetStillThere: Boolean(target) };
});
check('Messages neutres et identiques', neutral.plain === 'Cadeau mis à jour.' && neutral.removed === 'Cadeau retiré de la liste.');

// ------------------------------------------------------------------ rapport
const failed = results.filter((entry) => !entry.ok);
console.log('\n=== TESTS D\'ACCEPTATION ===');
for (const entry of results) {
  console.log(`${entry.ok ? '✅' : '❌'} ${entry.name}${entry.ok || !entry.detail ? '' : `\n   → ${entry.detail}`}`);
}
console.log(`\n${results.length - failed.length}/${results.length} tests réussis`);
if (pageErrors.length) console.log('Erreurs de page :', pageErrors);

await browser.close();
process.exit(failed.length > 0 ? 1 : 0);
