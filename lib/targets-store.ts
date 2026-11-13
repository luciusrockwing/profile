import fs from 'fs';
import path from 'path';
import { OsintTarget } from './osint-types';

let writeQueue: Promise<unknown> = Promise.resolve();

/**
 * Serializes asynchronous read-modify-write mutations within the Node.js process
 * so concurrent API requests never race or drop updates.
 */
export function withWriteLock<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

/**
 * Reads the canonical JSON targets store.
 * - Seeds automatically ONLY when the file does not exist (ENOENT).
 * - Fails loudly with an Error when the file exists but is unreadable,
 *   contains malformed JSON, or is not a JSON array (preventing silent overwrites).
 */
export function readTargetsStore(filePath: string, seedTargets: OsintTarget[]): OsintTarget[] {
  if (!fs.existsSync(filePath)) {
    const initial = structuredClone(seedTargets);
    writeTargetsAtomic(filePath, initial);
    return initial;
  }

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(
      `Failed to read targets store: ${err instanceof Error ? err.message : 'I/O error'}`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Targets database file contains malformed JSON.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Targets database root payload must be a JSON array.');
  }

  return parsed as OsintTarget[];
}

/**
 * Writes the JSON targets store atomically by writing to a sibling temp file
 * in the same directory and renaming over the canonical file path.
 */
export function writeTargetsAtomic(filePath: string, targets: OsintTarget[]): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tmpFile = path.join(
    dir,
    `.${path.basename(filePath)}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  try {
    const payload = JSON.stringify(targets, null, 2);
    fs.writeFileSync(tmpFile, payload, 'utf8');
    fs.renameSync(tmpFile, filePath);
  } catch (err) {
    if (fs.existsSync(tmpFile)) {
      try {
        fs.unlinkSync(tmpFile);
      } catch {
        // ignore temp cleanup failure
      }
    }
    throw err;
  }
}
