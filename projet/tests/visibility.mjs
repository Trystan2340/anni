/**
 * Tests unitaires des règles pures de visibilité (aucun navigateur requis).
 * Ces règles décident de la surprise de Noël : elles sont testées directement.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// compilation à la volée du module TypeScript isolé
const out = mkdtempSync(join(tmpdir(), 'cq-visibility-'));
const compile = spawnSync(
  'npx',
  ['esbuild', 'src/data/mock/visibility.ts', '--format=esm', '--platform=node', '--outfile=' + join(out, 'visibility.mjs')],
  { encoding: 'utf8' },
);
if (compile.status !== 0) {
  console.error(compile.stderr || compile.stdout);
  process.exit(1);
}

const { isRevealed, projectGift, listTitle, canSeeReservationStatus } = await import(join(out, 'visibility.mjs'));

const results = [];
const check = (name, condition, detail = '') => results.push({ name, ok: Boolean(condition), detail });

const gift = {
  id: 'g1',
  ownerId: 'u-maman',
  title: 'Pluviomètre',
  description: '',
  imageUrl: null,
  priority: 2,
  priceHint: '45 €',
  shopUrl: null,
  updatedAt: '2026-12-01T00:00:00.000Z',
  deleted: false,
};
const reservation = { id: 'r1', giftId: 'g1', reservedById: 'u-papa', createdAt: '2026-12-05T00:00:00.000Z', active: true };
const memberOf = (id) => ({ 'u-maman': 'Maman', 'u-papa': 'Papa', 'u-trystan': 'Trystan' }[id] ?? 'Maman');

// 1. révélation à l'heure serveur
const revealAt = '2026-12-25T10:00:00.000Z';
check('10 h 59 : non révélé', isRevealed(revealAt, new Date('2026-12-25T09:59:00.000Z')) === false);
check('11 h 00 pile : révélé', isRevealed(revealAt, new Date('2026-12-25T10:00:00.000Z')) === true);
check('Simulation de démo : révélé', isRevealed(revealAt, new Date('2026-12-01T00:00:00.000Z'), true) === true);

// 2. propriétaire avant révélation : aucun champ de réservation
const blind = projectGift(gift, reservation, { viewerId: 'u-maman', ownerId: 'u-maman', revealed: false, memberOf });
check('Propriétaire masqué : pas de champ reservation', !('reservation' in blind), JSON.stringify(blind));
check('Propriétaire masqué : aucun identifiant du réservataire', !JSON.stringify(blind).includes('u-papa'));
check('Propriétaire masqué : indicateur constant', blind.isPrioritised === false);

// 3. propriétaire après révélation
const revealedGift = projectGift(gift, reservation, { viewerId: 'u-maman', ownerId: 'u-maman', revealed: true, memberOf });
check('Propriétaire révélé : nom du réservataire', revealedGift.reservation?.reservedByMember === 'Papa');
check('Propriétaire révélé : pas de champ mine', !('mine' in revealedGift.reservation));

// 4. autre destinataire
const other = projectGift(gift, reservation, { viewerId: 'u-trystan', ownerId: 'u-maman', revealed: false, memberOf });
check('Autre membre : statut visible avant Noël', other.reservation?.reservedByMember === 'Papa');
check('Autre membre : indicateur mine = false', other.reservation?.mine === false);
const otherMine = projectGift(gift, reservation, { viewerId: 'u-papa', ownerId: 'u-maman', revealed: false, memberOf });
check('Réservataire : mine = true', otherMine.reservation?.mine === true);

// 5. cadeau libre
const free = projectGift(gift, null, { viewerId: 'u-maman', ownerId: 'u-maman', revealed: true, memberOf });
check('Cadeau libre (propriétaire révélé) : reservation null', free.reservation === null);
const freeBlind = projectGift(gift, null, { viewerId: 'u-maman', ownerId: 'u-maman', revealed: false, memberOf });
check('Cadeau libre (masqué) : toujours aucun champ', !('reservation' in freeBlind));

// 6. titres et règle générale
check('Titre principal du propriétaire', listTitle('u-trystan', 'u-trystan', 'Trystan') === 'Ma liste de Noël');
check('Titre vu par les autres', listTitle('u-maman', 'u-trystan', 'Trystan') === 'Liste de Trystan');
check('Titre liste secondaire', listTitle('u-maman', 'u-papa', 'Papa') === 'Liste de Papa');
check(
  'Visibilité du statut : règle unique',
  canSeeReservationStatus({ viewerId: 'u-maman', ownerId: 'u-maman', revealed: false, memberOf }) === false &&
    canSeeReservationStatus({ viewerId: 'u-maman', ownerId: 'u-maman', revealed: true, memberOf }) === true &&
    canSeeReservationStatus({ viewerId: 'u-papa', ownerId: 'u-maman', revealed: false, memberOf }) === true,
);

const failed = results.filter((entry) => !entry.ok);
console.log('\n=== RÈGLES DE VISIBILITÉ (unitaires) ===');
for (const entry of results) console.log(`${entry.ok ? '✅' : '❌'} ${entry.name}${entry.ok || !entry.detail ? '' : `\n   → ${entry.detail}`}`);
console.log(`\n${results.length - failed.length}/${results.length} tests réussis`);
process.exit(failed.length ? 1 : 0);
