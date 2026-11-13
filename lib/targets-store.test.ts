import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { readTargetsStore, writeTargetsAtomic, withWriteLock } from './targets-store';
import { INITIAL_TARGETS } from './seed-data';

function makeTempFile(): { dir: string; filePath: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'specter-store-test-'));
  return { dir, filePath: path.join(dir, 'targets.json') };
}

test('readTargetsStore seeds only on ENOENT and fails loud on corrupt JSON without overwriting', () => {
  const { dir, filePath } = makeTempFile();
  try {
    // 1. Auto-seeds when file does not exist
    const seeded = readTargetsStore(filePath, INITIAL_TARGETS);
    assert.equal(seeded.length, INITIAL_TARGETS.length);
    assert.equal(fs.existsSync(filePath), true);

    // 2. Corrupt file throws explicitly and preserves original bytes on disk
    const corruptContent = '{"corrupt": true, not valid json';
    fs.writeFileSync(filePath, corruptContent, 'utf8');
    assert.throws(() => readTargetsStore(filePath, INITIAL_TARGETS), /malformed JSON/i);
    assert.equal(fs.readFileSync(filePath, 'utf8'), corruptContent);

    // 3. Non-array root throws explicitly
    fs.writeFileSync(filePath, '{"not": "an array"}', 'utf8');
    assert.throws(() => readTargetsStore(filePath, INITIAL_TARGETS), /JSON array/i);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('writeTargetsAtomic replaces file cleanly without leaving temp files', () => {
  const { dir, filePath } = makeTempFile();
  try {
    writeTargetsAtomic(filePath, [INITIAL_TARGETS[0]]);
    const files = fs.readdirSync(dir);
    assert.deepEqual(files, ['targets.json']);
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].id, INITIAL_TARGETS[0].id);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('withWriteLock serializes concurrent mutations with zero lost updates', async () => {
  const { dir, filePath } = makeTempFile();
  try {
    writeTargetsAtomic(filePath, []);

    await Promise.all(
      Array.from({ length: 8 }, (_, idx) =>
        withWriteLock(async () => {
          const current = readTargetsStore(filePath, []);
          await new Promise((r) => setTimeout(r, idx % 2 === 0 ? 5 : 2));
          current.push({
            ...INITIAL_TARGETS[0],
            id: `concurrent-${idx}`,
            alias: `Target-${idx}`,
          });
          writeTargetsAtomic(filePath, current);
        })
      )
    );

    const finalTargets = readTargetsStore(filePath, []);
    assert.equal(finalTargets.length, 8);
    assert.deepEqual(
      finalTargets.map((t) => t.id),
      Array.from({ length: 8 }, (_, idx) => `concurrent-${idx}`)
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
