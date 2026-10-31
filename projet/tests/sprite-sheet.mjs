import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const source = 'src/mascots/spriteSheet.ts';
assert.ok(existsSync(source), `${source} must define the pure sprite frame mapping`);

const out = mkdtempSync(join(tmpdir(), 'cq-sprite-sheet-'));
const target = join(out, 'spriteSheet.mjs');
const compile = spawnSync('npx', ['esbuild', source, '--format=esm', '--platform=node', '--outfile=' + target], {
  encoding: 'utf8',
});
assert.equal(compile.status, 0, compile.stderr || compile.stdout);

const { mascotFrameIndex } = await import(pathToFileURL(target));
const frames = ['idle', 'walkA', 'walkB'];
const rows = { down: 0, up: 1, side: 2 };
for (const [direction, row] of Object.entries(rows)) {
  frames.forEach((frame, column) => {
    assert.equal(mascotFrameIndex(direction, frame), row * 3 + column, `${direction}/${frame}`);
  });
}
console.log('9/9 index de sprite corrects');
