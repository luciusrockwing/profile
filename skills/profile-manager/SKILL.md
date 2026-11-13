---
name: profile-manager
description: Create, query, validate, update, and delete target investigation dossiers and handle slots in the SPECTER OSINT database without binary server storage.
---

# Profile Manager Skill

Use this skill to programmatically manage OSINT target dossiers, social media handles, and cross-entity relationships in compliance with zero-storage architectural rules.

## Core Directives

1. **Avatar Verification**: Profile photo links must be valid HTTP/HTTPS URLs. Reject any `data:image/...` or base64 strings.
2. **Handle Slots**: Each slot must have a supported platform (`twitter`, `telegram`, `github`, `linkedin`, `darkweb`, `crypto_btc`, `crypto_xmr`, `email`, `custom`), a non-empty `value`, and a verification status (`verified`, `suspected`, `impersonator`).
3. **Graph Consistency**: When a target lists associated `companies` or `groups`, the link engine in `lib/osint-engine.ts` automatically builds graph nodes connecting targets that share the same organization.

## Adding a Target via Node CLI Script

To add a new target profile without using the web UI:

```javascript
const fs = require('fs');
const path = './data/targets.json';

const targets = JSON.parse(fs.readFileSync(path, 'utf8'));

const newTarget = {
  id: `tgt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  alias: 'NightStalker',
  realName: 'Victor K.',
  category: 'individual',
  status: 'surveillance',
  priority: 'high',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&auto=format&fit=crop&q=80',
  organization: 'ShadowGrid Syndicate',
  companies: ['Apex Cyber Solutions'],
  groups: ['FIN7 Affiliates'],
  tags: ['#ransomware', '#fin-fraud'],
  handles: [
    {
      id: `slot-${Date.now()}-1`,
      platform: 'telegram',
      value: '@nightstalker_ops',
      verified: 'verified'
    },
    {
      id: `slot-${Date.now()}-2`,
      platform: 'twitter',
      value: '@nightstalker_sec',
      verified: 'suspected'
    }
  ],
  relationships: [],
  timeline: [],
  notes: 'Key operator in automated credential spraying and extortion.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

targets.unshift(newTarget);
fs.writeFileSync(path, JSON.stringify(targets, null, 2), 'utf8');
console.log(`Target ${newTarget.alias} successfully registered.`);
```

## Modifying or Deleting Targets

- **Update**: Find by `id` or `alias`, apply field updates, and update `updatedAt`.
- **Delete**: Filter out matching `id`. Also clean any items in other targets' `relationships` where `targetId` equals the deleted ID.
- **REST Alternative**: Call `DELETE /api/profiles?id=<target-id>` on `http://localhost:3000`.
