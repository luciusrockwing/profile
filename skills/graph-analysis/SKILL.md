---
name: graph-analysis
description: Analyze entity link topologies, organizational clustering, and social handle convergence across target dossiers on the SPECTER OSINT canvas.
---

# Graph Analysis Skill

Use this skill to inspect entity connections, identify shared shell companies or syndicate affiliations, and debug the 2D force-directed link graph simulation.

## Graph Topology Principles

The SPECTER graph engine (`lib/osint-engine.ts`) models four node categories:
1. **Target Nodes (`target`)**: Represents recorded threat actors or persons of interest (rendered with target avatar and emerald status indicator).
2. **Company Nodes (`company`)**: Formed by extracting all strings from `target.companies`. Automatically connects multiple targets that operate within the same firm.
3. **Group Nodes (`group`)**: Formed by extracting all strings from `target.groups` (e.g. syndicates, forums, hacking collectives).
4. **Account Slot Nodes (`handle`)**: Formed from identified social handles (Twitter/X, Telegram, crypto addresses, etc.).

## CLI Graph Topology Audit

To compute connectivity statistics across recorded targets:

```bash
node -e "
const fs = require('fs');
const targets = JSON.parse(fs.readFileSync('data/targets.json', 'utf8'));

const companyMap = new Map();
const groupMap = new Map();

targets.forEach(t => {
  (t.companies || []).forEach(c => {
    if (!companyMap.has(c)) companyMap.set(c, []);
    companyMap.get(c).push(t.alias);
  });
  (t.groups || []).forEach(g => {
    if (!groupMap.has(g)) groupMap.set(g, []);
    groupMap.get(g).push(t.alias);
  });
});

console.log('--- COMPANY TOPOLOGY BRIDGES ---');
for (const [comp, members] of companyMap.entries()) {
  if (members.length > 1) {
    console.log('[SHARED CORPS]', comp, '->', members.join(' <-> '));
  }
}

console.log('\n--- SYNDICATE BRIDGES ---');
for (const [group, members] of groupMap.entries()) {
  if (members.length > 1) {
    console.log('[SHARED GROUP]', group, '->', members.join(' <-> '));
  }
}
"
```
