import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { OsintTarget } from '@/lib/osint-types';
import { INITIAL_TARGETS } from '@/lib/seed-data';
import {
  MAX_DATABASE_BYTES,
  normalizeAndValidateTarget,
  validateImportBatch,
  removeTargetAndCleanRelationships,
  syncRelationshipTargetNames,
} from '@/lib/osint-engine';
import {
  readTargetsStore,
  writeTargetsAtomic,
  withWriteLock,
} from '@/lib/targets-store';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'targets.json');

export async function GET() {
  try {
    const targets = readTargetsStore(DATA_FILE, INITIAL_TARGETS);
    return NextResponse.json({ targets, count: targets.length });
  } catch (err) {
    console.error(
      'Failed to read targets store:',
      err instanceof Error ? err.message : 'Unknown error'
    );
    return NextResponse.json(
      { error: 'Database file is corrupted or unreadable.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: { target?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request payload.' }, { status: 400 });
  }

  const validation = normalizeAndValidateTarget(body?.target);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  try {
    const result = await withWriteLock(async () => {
      let targets = readTargetsStore(DATA_FILE, INITIAL_TARGETS);
      const existingIndex = targets.findIndex((t) => t.id === validation.target.id);
      const now = new Date().toISOString();

      const cleanTarget: OsintTarget = {
        ...validation.target,
        createdAt:
          existingIndex >= 0
            ? targets[existingIndex].createdAt || validation.target.createdAt
            : validation.target.createdAt || now,
        updatedAt: now,
      };

      if (existingIndex >= 0) {
        targets[existingIndex] = cleanTarget;
        targets = syncRelationshipTargetNames(targets, cleanTarget);
      } else {
        targets.unshift(cleanTarget);
      }

      const payloadBytes = new TextEncoder().encode(JSON.stringify(targets)).length;
      if (payloadBytes > MAX_DATABASE_BYTES) {
        return {
          status: 400 as const,
          error: `Database size limit (${(MAX_DATABASE_BYTES / 1024).toFixed(0)} KB) exceeded.`,
        };
      }

      writeTargetsAtomic(DATA_FILE, targets);
      return { status: 200 as const, target: cleanTarget, targets };
    });

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      target: result.target,
      targets: result.targets,
      count: result.targets.length,
    });
  } catch (err) {
    console.error(
      'Failed to save profile:',
      err instanceof Error ? err.message : 'Unknown error'
    );
    return NextResponse.json({ error: 'Server error saving profile' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.trim();

    if (!id) {
      return NextResponse.json({ error: 'Target ID is required' }, { status: 400 });
    }

    const targets = await withWriteLock(async () => {
      const existing = readTargetsStore(DATA_FILE, INITIAL_TARGETS);
      const nextTargets = removeTargetAndCleanRelationships(existing, id);
      writeTargetsAtomic(DATA_FILE, nextTargets);
      return nextTargets;
    });

    return NextResponse.json({ success: true, targets, count: targets.length });
  } catch (err) {
    console.error(
      'Failed to delete profile:',
      err instanceof Error ? err.message : 'Unknown error'
    );
    return NextResponse.json({ error: 'Server error deleting profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  let body: { action?: unknown; targets?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request payload.' }, { status: 400 });
  }

  if (body?.action === 'reset') {
    try {
      const resetTargets = await withWriteLock(async () => {
        const seedCopy = structuredClone(INITIAL_TARGETS);
        writeTargetsAtomic(DATA_FILE, seedCopy);
        return seedCopy;
      });
      return NextResponse.json({
        success: true,
        targets: resetTargets,
        count: resetTargets.length,
      });
    } catch (err) {
      console.error(
        'Failed to reset database:',
        err instanceof Error ? err.message : 'Unknown error'
      );
      return NextResponse.json({ error: 'Server error resetting database' }, { status: 500 });
    }
  }

  if (body?.action === 'import') {
    const batch = validateImportBatch(body.targets);
    if (!batch.valid) {
      return NextResponse.json({ error: batch.reason }, { status: 400 });
    }

    try {
      const imported = await withWriteLock(async () => {
        writeTargetsAtomic(DATA_FILE, batch.targets);
        return batch.targets;
      });
      return NextResponse.json({
        success: true,
        targets: imported,
        count: imported.length,
      });
    } catch (err) {
      console.error(
        'Failed to import database:',
        err instanceof Error ? err.message : 'Unknown error'
      );
      return NextResponse.json({ error: 'Server error importing database' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
