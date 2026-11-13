import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPlatformUrl,
  validateAvatarUrl,
  filterTargets,
  buildEntityGraph,
  generateForensicChecksum,
  generateDossierReport,
  removeTargetAndCleanRelationships,
  syncRelationshipTargetNames,
} from './osint-engine';
import { OsintTarget } from './osint-types';

const sampleTarget1: OsintTarget = {
  id: 'target-001',
  alias: 'NullPhantom',
  realName: 'Julian Sterling',
  category: 'individual',
  status: 'active',
  priority: 'critical',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  organization: 'Aegis Cyber',
  companies: ['Aegis Defense', 'Vanguard Data'],
  groups: ['APT-39 Cell'],
  tags: ['#ransomware', '#fintech', '#insider'],
  location: 'Zurich, Switzerland',
  handles: [
    {
      id: 'h1',
      platform: 'twitter',
      value: '@phantom_null',
      verified: 'verified',
    },
    {
      id: 'h2',
      platform: 'telegram',
      value: 't.me/nullphantom',
      verified: 'verified',
    },
    {
      id: 'h3',
      platform: 'email',
      value: 'julian@aegis-defense.ch',
      verified: 'suspected',
    },
  ],
  relationships: [
    {
      id: 'r1',
      targetId: 'target-002',
      targetName: 'CipherFox',
      relationshipType: 'collaborator',
      notes: 'Seen trading credential dumps',
    },
  ],
  notes: 'Key broker in banking Trojan campaign.',
  timeline: [
    {
      id: 'tl1',
      date: '2026-03-12',
      event: 'Identified on Russian dark forum',
      source: 'SIGINT-9',
    },
  ],
  createdAt: '2026-03-10T10:00:00Z',
  updatedAt: '2026-03-15T12:00:00Z',
};

const sampleTarget2: OsintTarget = {
  id: 'target-002',
  alias: 'CipherFox',
  realName: 'Elena Rostova',
  category: 'individual',
  status: 'surveillance',
  priority: 'high',
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  organization: 'Aegis Cyber', // Shared organization!
  companies: ['Aegis Defense'], // Shared company!
  groups: ['RedCell Alpha'],
  tags: ['#fintech', '#cryptostealer'],
  location: 'Belgrade, Serbia',
  handles: [
    {
      id: 'h4',
      platform: 'telegram',
      value: '@cipherfox_ops',
      verified: 'verified',
    },
    {
      id: 'h5',
      platform: 'crypto_btc',
      value: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      verified: 'verified',
    },
  ],
  relationships: [],
  notes: 'Financial handler and money launderer.',
  timeline: [],
  createdAt: '2026-03-11T14:00:00Z',
  updatedAt: '2026-03-14T09:30:00Z',
};

test('formatPlatformUrl builds proper external URLs without proxying', () => {
  assert.equal(
    formatPlatformUrl('twitter', '@phantom_null'),
    'https://x.com/phantom_null'
  );
  assert.equal(
    formatPlatformUrl('telegram', 't.me/nullphantom'),
    'https://t.me/nullphantom'
  );
  assert.equal(
    formatPlatformUrl('linkedin', 'company/nexus-dynamics-gmbh'),
    'https://linkedin.com/company/nexus-dynamics-gmbh'
  );
  assert.equal(
    formatPlatformUrl('linkedin', 'in/david-chen-security'),
    'https://linkedin.com/in/david-chen-security'
  );
  assert.equal(
    formatPlatformUrl('youtube', 'c/securitybrief'),
    'https://youtube.com/c/securitybrief'
  );
  assert.equal(
    formatPlatformUrl('youtube', '@cyberintel'),
    'https://youtube.com/@cyberintel'
  );
  assert.equal(
    formatPlatformUrl('reddit', 'r/netsec'),
    'https://reddit.com/r/netsec'
  );
  assert.equal(
    formatPlatformUrl('mastodon', '@analyst@infosec.exchange'),
    'https://infosec.exchange/@analyst'
  );
  assert.equal(formatPlatformUrl('mastodon', 'invalidhandle'), null);
  assert.equal(
    formatPlatformUrl('email', 'investigate@dark.net'),
    'mailto:investigate@dark.net'
  );
  assert.equal(
    formatPlatformUrl('phone', '+1 (555) 019-2834'),
    'tel:+15550192834'
  );
  assert.equal(
    formatPlatformUrl('crypto_btc', 'bc1qtest123'),
    'https://www.blockchain.com/explorer/addresses/btc/bc1qtest123'
  );
  assert.equal(
    formatPlatformUrl('custom', 'https://matrix.to/#/@user:server.org'),
    'https://matrix.to/#/@user:server.org'
  );
});

test('validateAvatarUrl protects server storage by rejecting base64 data blobs', () => {
  const dataBlob = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const checkBlob = validateAvatarUrl(dataBlob);
  assert.equal(checkBlob.valid, false);
  assert.match(checkBlob.reason || '', /base64/i);

  const checkValid = validateAvatarUrl('https://example.com/target.jpg');
  assert.equal(checkValid.valid, true);

  const checkEmpty = validateAvatarUrl('');
  assert.equal(checkEmpty.valid, true);

  const checkMalformed = validateAvatarUrl('not-a-valid-url');
  assert.equal(checkMalformed.valid, false);
});

test('filterTargets matches text queries across aliases, handles, and affiliations', () => {
  const targets = [sampleTarget1, sampleTarget2];

  const matchAlias = filterTargets(targets, { query: 'Cipher' });
  assert.equal(matchAlias.length, 1);
  assert.equal(matchAlias[0].alias, 'CipherFox');

  const matchHandle = filterTargets(targets, { query: 'phantom_null' });
  assert.equal(matchHandle.length, 1);
  assert.equal(matchHandle[0].alias, 'NullPhantom');

  const matchCompany = filterTargets(targets, { query: 'Aegis Defense' });
  assert.equal(matchCompany.length, 2);

  const matchStatus = filterTargets(targets, { status: 'active' });
  assert.equal(matchStatus.length, 1);
  assert.equal(matchStatus[0].id, 'target-001');

  const matchTag = filterTargets(targets, { tag: '#cryptostealer' });
  assert.equal(matchTag.length, 1);
  assert.equal(matchTag[0].alias, 'CipherFox');
});

test('buildEntityGraph correctly links targets and shared organizations', () => {
  const graph = buildEntityGraph([sampleTarget1, sampleTarget2], {
    includeCompanies: true,
    includeGroups: true,
    includeHandles: true,
    includeTags: true,
  });

  // Verify target nodes exist
  const targetNode1 = graph.nodes.find((n) => n.id === 'target_target-001');
  const targetNode2 = graph.nodes.find((n) => n.id === 'target_target-002');
  assert.ok(targetNode1);
  assert.ok(targetNode2);

  // Verify shared company node exists
  const aegisCompanyNode = graph.nodes.find((n) => n.label === 'Aegis Defense');
  assert.ok(aegisCompanyNode);

  // Verify both targets connect to the shared company
  const linksToAegis = graph.links.filter((l) => l.target === aegisCompanyNode.id);
  assert.equal(linksToAegis.length, 2);

  // Verify explicit relationship edge exists
  const relEdge = graph.links.find(
    (l) => l.source === 'target_target-001' && l.target === 'target_target-002'
  );
  assert.ok(relEdge);
  assert.equal(relEdge.label, 'collaborator');
});

test('generateForensicChecksum produces deterministic string', () => {
  const sum1 = generateForensicChecksum(sampleTarget1);
  const sum2 = generateForensicChecksum(sampleTarget1);
  assert.equal(sum1, sum2);
  assert.match(sum1, /^SHA256-[0-9A-F]{8}$/);
});

test('generateDossierReport outputs formatted audit string', () => {
  const report = generateDossierReport(sampleTarget1);
  assert.ok(report.includes('SPECTER OSINT // CONFIDENTIAL DOSSIER REPORT'));
  assert.ok(report.includes('NullPhantom'));
  assert.ok(report.includes('Julian Sterling'));
  assert.ok(report.includes('@phantom_null'));
  assert.ok(report.includes('CipherFox'));
});

test('removeTargetAndCleanRelationships removes target and dangling relationship links', () => {
  const cleaned = removeTargetAndCleanRelationships([sampleTarget1, sampleTarget2], 'target-002');
  assert.equal(cleaned.length, 1);
  assert.equal(cleaned[0].id, 'target-001');
  assert.equal(cleaned[0].relationships.length, 0);
});

test('syncRelationshipTargetNames updates relationship targetName when target alias changes', () => {
  const renamed = { ...sampleTarget2, alias: 'CipherVixen' };
  const synced = syncRelationshipTargetNames([sampleTarget1, renamed], renamed);
  assert.equal(synced[0].relationships[0].targetName, 'CipherVixen');
});
