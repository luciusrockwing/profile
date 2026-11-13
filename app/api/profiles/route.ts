import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { OsintTarget } from '@/lib/osint-types';
import { INITIAL_TARGETS } from '@/lib/seed-data';
import {
  validateAvatarUrl,
  removeTargetAndCleanRelationships,
  syncRelationshipTargetNames,
} from '@/lib/osint-engine';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'targets.json');

function ensureDataFile(): OsintTarget[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_TARGETS, null, 2), 'utf8');
      return INITIAL_TARGETS;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return INITIAL_TARGETS;
  } catch (err) {
    console.error('Error reading targets file:', err);
    return INITIAL_TARGETS;
  }
}

function saveDataFile(targets: OsintTarget[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(targets, null, 2), 'utf8');
}

export async function GET() {
  const targets = ensureDataFile();
  return NextResponse.json({ targets, count: targets.length });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const target: OsintTarget = body.target;

    if (!target || typeof target.alias !== 'string' || !target.alias.trim()) {
      return NextResponse.json(
        { error: 'Invalid target data. Target alias is required.' },
        { status: 400 }
      );
    }

    // Strict validation: enforce zero-binary storage policy on server
    const avatarValidation = validateAvatarUrl(target.avatarUrl);
    if (!avatarValidation.valid) {
      return NextResponse.json(
        { error: avatarValidation.reason || 'Invalid avatar URL' },
        { status: 400 }
      );
    }

    let targets = ensureDataFile();
    const existingIndex = targets.findIndex((t) => t.id === target.id);

    const now = new Date().toISOString();
    const cleanTarget: OsintTarget = {
      ...target,
      id: target.id || `tgt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      alias: target.alias.trim(),
      updatedAt: now,
      createdAt: target.createdAt || now,
      handles: Array.isArray(target.handles) ? target.handles : [],
      companies: Array.isArray(target.companies) ? target.companies : [],
      groups: Array.isArray(target.groups) ? target.groups : [],
      tags: Array.isArray(target.tags) ? target.tags : [],
      relationships: Array.isArray(target.relationships) ? target.relationships : [],
      timeline: Array.isArray(target.timeline) ? target.timeline : [],
    };

    if (existingIndex >= 0) {
      targets[existingIndex] = cleanTarget;
      targets = syncRelationshipTargetNames(targets, cleanTarget);
    } else {
      targets.unshift(cleanTarget);
    }

    saveDataFile(targets);
    return NextResponse.json({ success: true, target: cleanTarget, targets, count: targets.length });
  } catch (err) {
    console.error('Failed to save profile:', err);
    return NextResponse.json({ error: 'Server error saving profile' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Target ID is required' }, { status: 400 });
    }

    const existing = ensureDataFile();
    const targets = removeTargetAndCleanRelationships(existing, id);
    saveDataFile(targets);

    return NextResponse.json({ success: true, targets, count: targets.length });
  } catch (err) {
    console.error('Failed to delete profile:', err);
    return NextResponse.json({ error: 'Server error deleting profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.action === 'reset') {
      saveDataFile(INITIAL_TARGETS);
      return NextResponse.json({ success: true, targets: INITIAL_TARGETS, count: INITIAL_TARGETS.length });
    }
    if (body.action === 'import' && Array.isArray(body.targets)) {
      for (const t of body.targets) {
        if (!t || typeof t.id !== 'string' || !t.id.trim() || typeof t.alias !== 'string' || !t.alias.trim()) {
          return NextResponse.json(
            { error: 'Import failed: Every target must include valid id and alias fields.' },
            { status: 400 }
          );
        }
        const val = validateAvatarUrl(t.avatarUrl);
        if (!val.valid) {
          return NextResponse.json(
            { error: `Import failed: Target ${t.alias} has invalid avatar: ${val.reason}` },
            { status: 400 }
          );
        }
      }
      saveDataFile(body.targets);
      return NextResponse.json({ success: true, targets: body.targets, count: body.targets.length });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Failed to handle PUT request:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
