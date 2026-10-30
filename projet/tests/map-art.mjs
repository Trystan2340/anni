import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const source = 'src/game/village/villageArt.ts';
const out = mkdtempSync(join(tmpdir(), 'cq-map-art-'));
const target = join(out, 'villageArt.mjs');
const compile = spawnSync('npx', ['esbuild', source, '--format=esm', '--platform=node', '--outfile=' + target], {
  encoding: 'utf8',
});
assert.equal(compile.status, 0, compile.stderr || compile.stdout);

const art = await import(pathToFileURL(target));
const { CHALET, CHEST, HOUSES, VILLAGE_OBSTACLES } = art;
assert.deepEqual(
  HOUSES.map(({ id, x, y, doorX, doorY, entryFacing }) => ({ id, x, y, doorX, doorY, entryFacing })),
  [
    { id: 'maison-maman', x: 60, y: 60, doorX: 170, doorY: 268, entryFacing: 'south' },
    { id: 'maison-papa', x: 1000, y: 60, doorX: 1110, doorY: 268, entryFacing: 'south' },
    { id: 'maison-juju', x: 60, y: 500, doorX: 170, doorY: 490, entryFacing: 'north' },
    { id: 'maison-chacha', x: 1000, y: 500, doorX: 1110, doorY: 490, entryFacing: 'north' },
  ],
  'house and door positions remain fixed',
);
assert.deepEqual(CHEST, { x: 930, y: 486, w: 132, h: 100 }, 'chest position remains fixed');
assert.deepEqual(CHALET, { x: 540, y: 248, w: 200, h: 150 }, 'chalet position remains fixed');

const allowed = new Set([
  'wreath', 'garland', 'lantern', 'star', 'gift', 'candy-cane',
  'cookie', 'medal', 'stocking', 'race-flag',
]);
const combinations = new Set();
for (const [index, house] of HOUSES.entries()) {
  assert.ok(Array.isArray(house.decorations), `${house.id} declares its decorations`);
  assert.ok(house.decorations.length >= 2, `${house.id} has at least two decorations`);
  assert.ok(house.decorations.every((decoration) => allowed.has(decoration)), `${house.id} uses valid decorations`);
  combinations.add([...house.decorations].sort().join('|'));
  const approach = art.houseApproachRect(house);
  const expectedEntryY = house.entryFacing === 'north' ? house.y - 12 : house.y + 150;
  assert.equal(approach.x, house.doorX - 34, `${house.id} path lines up with its door`);
  assert.equal(approach.y <= expectedEntryY && approach.y + approach.h >= expectedEntryY, true,
    `${house.id} path reaches its threshold`);
  const wallRects = art.houseCollisionRects(house);
  const coversDoor = wallRects.some((obstacle) =>
    house.doorX >= obstacle.x && house.doorX < obstacle.x + obstacle.w &&
    house.doorY >= obstacle.y && house.doorY < obstacle.y + obstacle.h,
  );
  assert.equal(coversDoor, false, `${house.id} collision leaves its door approach open`);
}
assert.equal(combinations.size, HOUSES.length, 'each house has a distinct decoration combination');
assert.deepEqual(art.houseApproachRect(HOUSES[2]), { x: 136, y: 440, w: 68, h: 48 },
  'the Juju path connects the main road to the north-facing door');
assert.deepEqual(art.houseApproachRect(HOUSES[3]), { x: 1076, y: 440, w: 68, h: 48 },
  'the Chacha path connects the main road to the north-facing door');
assert.equal(typeof art.paintHouse, 'function', 'paintHouse is exported for deterministic visual tests');

function recordingContext() {
  const commands = [];
  const state = { fillStyle: '', globalAlpha: 1 };
  const ctx = new Proxy(
    {},
    {
      get(_target, key) {
        if (key === 'fillStyle' || key === 'globalAlpha') return state[key];
        return (...args) => commands.push([key, ...args, state.fillStyle, state.globalAlpha]);
      },
      set(_target, key, value) {
        state[key] = value;
        return true;
      },
    },
  );
  return { ctx, commands };
}

for (const house of HOUSES) {
  const undecorated = recordingContext();
  art.paintHouse(undecorated.ctx, { ...house, decorations: [] });
  const baseRectangles = undecorated.commands.filter(([name]) => name === 'fillRect').length;
  for (const decoration of house.decorations) {
    const decorated = recordingContext();
    art.paintHouse(decorated.ctx, { ...house, decorations: [decoration] });
    const detailRectangles = decorated.commands.filter(([name]) => name === 'fillRect').length;
    assert.ok(detailRectangles > baseRectangles, `${house.id} paints ${decoration}`);
  }
}

const first = recordingContext();
const second = recordingContext();
art.paintVillage(first.ctx);
art.paintVillage(second.ctx);
assert.deepEqual(second.commands, first.commands, 'same map seed gives identical drawing commands');
console.log('Coordonnées des maisons, portes, obstacles et décor déterministes vérifiés');
