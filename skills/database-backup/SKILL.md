---
name: database-backup
description: Export, import, validate, and restore JSON database backups and enforce zero-storage schema integrity for SPECTER OSINT.
---

# Database Backup & Recovery Skill

Use this skill to safely export investigation databases, import external OSINT feeds, restore seed demonstration data, and validate database integrity.

## Core Rules

1. **Database Location**: Persistent data lives at `data/targets.json`.
2. **Payload Size Auditing**: Since photos are stored as web URL references, the entire database size should stay under ~20 KB for dozens of targets. If `targets.json` exceeds 500 KB, check for corrupted base64 strings or malicious data injections.
3. **Integrity Check**: Always verify that `data/targets.json` parses as an array of valid `OsintTarget` objects before replacing it.

## Quick CLI Backup & Export

```bash
# Timestamped JSON export
node -e "
const fs = require('fs');
const targets = JSON.parse(fs.readFileSync('data/targets.json', 'utf8'));
const filename = 'backup_osint_' + new Date().toISOString().slice(0, 10) + '.json';
fs.writeFileSync(filename, JSON.stringify(targets, null, 2), 'utf8');
console.log('Exported ' + targets.length + ' targets to ' + filename);
"
```

## Restoring Seed Demonstration Data

To reset the database back to standard demonstration intelligence profiles:

```bash
# Reset database to factory seed
node -e "
const fs = require('fs');
const { INITIAL_TARGETS } = require('./lib/seed-data');
fs.writeFileSync('data/targets.json', JSON.stringify(INITIAL_TARGETS, null, 2), 'utf8');
console.log('Database re-seeded with ' + INITIAL_TARGETS.length + ' profiles.');
"
```

Alternatively, invoke the API:
```bash
curl -X PUT http://localhost:3000/api/profiles \
  -H "Content-Type: application/json" \
  -d '{"action":"reset"}'
```

## Schema Validation Check

Run a validation check against the database:

```bash
node -e "
const fs = require('fs');
const raw = fs.readFileSync('data/targets.json', 'utf8');
const data = JSON.parse(raw);
if (!Array.isArray(data)) throw new Error('Root must be an array');
let invalidAvatars = 0;
data.forEach(t => {
  if (t.avatarUrl && t.avatarUrl.startsWith('data:')) invalidAvatars++;
});
if (invalidAvatars > 0) {
  console.error('CRITICAL: Found ' + invalidAvatars + ' invalid base64 avatar URLs!');
} else {
  console.log('Zero-storage validation PASSED for ' + data.length + ' targets.');
}
"
```
