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
  findShortestGraphPath,
  getEgoSubgraph,
  analyzeGraphTopology,
  containsBase64Blob,
  normalizeAndValidateTarget,
  validateImportBatch,
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

test('findShortestGraphPath finds zero-hop, direct, and multi-hop bridge paths', () => {
  const sampleTarget3: OsintTarget = {
    ...sampleTarget2,
    id: 'target-003',
    alias: 'GhostRelay',
    organization: undefined,
    companies: [],
    groups: ['RedCell Alpha'], // Connects to target-002 via RedCell Alpha
    tags: [],
    handles: [],
    relationships: [],
  };

  const isolatedTarget: OsintTarget = {
    ...sampleTarget2,
    id: 'target-004',
    alias: 'LoneWolf',
    organization: undefined,
    companies: [],
    groups: [],
    tags: [],
    handles: [],
    relationships: [],
  };

  const graph = buildEntityGraph([sampleTarget1, sampleTarget2, sampleTarget3, isolatedTarget], {
    includeCompanies: true,
    includeGroups: true,
    includeHandles: false,
    includeTags: false,
  });

  // Zero-hop self path
  const selfPath = findShortestGraphPath(graph, 'target_target-001', 'target_target-001');
  assert.ok(selfPath);
  assert.equal(selfPath.hopCount, 0);
  assert.deepEqual(selfPath.nodeIds, ['target_target-001']);

  // Multi-hop path from target-001 -> target-002 -> grp_redcell_alpha -> target-003
  const multiPath = findShortestGraphPath(graph, 'target_target-001', 'target_target-003');
  assert.ok(multiPath);
  assert.equal(multiPath.hopCount, 3);
  assert.equal(multiPath.nodeIds[0], 'target_target-001');
  assert.equal(multiPath.nodeIds[multiPath.nodeIds.length - 1], 'target_target-003');

  // Unreachable isolated target
  const noPath = findShortestGraphPath(graph, 'target_target-001', 'target_target-004');
  assert.equal(noPath, null);

  // Missing node
  assert.equal(findShortestGraphPath(graph, 'nonexistent', 'target_target-001'), null);
});

test('getEgoSubgraph isolates 1-hop and 2-hop neighborhoods cleanly', () => {
  const sampleTarget3: OsintTarget = {
    ...sampleTarget2,
    id: 'target-003',
    alias: 'GhostRelay',
    organization: undefined,
    companies: [],
    groups: ['RedCell Alpha'],
    tags: [],
    handles: [],
    relationships: [],
  };

  const graph = buildEntityGraph([sampleTarget1, sampleTarget2, sampleTarget3], {
    includeCompanies: false,
    includeGroups: true,
    includeHandles: false,
    includeTags: false,
  });

  // 1-hop around target-003 includes only target-003 and grp_redcell_alpha
  const oneHop = getEgoSubgraph(graph, 'target_target-003', 1);
  assert.deepEqual(
    oneHop.nodes.map((n) => n.id).sort(),
    ['grp_redcell_alpha', 'target_target-003']
  );
  assert.equal(oneHop.links.length, 1);

  // 2-hop around target-003 expands to target-002
  const twoHop = getEgoSubgraph(graph, 'target_target-003', 2);
  assert.ok(twoHop.nodes.some((n) => n.id === 'target_target-002'));
  assert.equal(twoHop.nodes.some((n) => n.id === 'target_target-001'), false);

  // Unknown center returns empty graph
  const missing = getEgoSubgraph(graph, 'missing_node', 1);
  assert.equal(missing.nodes.length, 0);
  assert.equal(missing.links.length, 0);
});

test('analyzeGraphTopology detects clusters, isolated nodes, and shared bridge entities', () => {
  const isolatedTarget: OsintTarget = {
    ...sampleTarget2,
    id: 'target-004',
    alias: 'LoneWolf',
    organization: undefined,
    companies: [],
    groups: [],
    tags: [],
    handles: [],
    relationships: [],
  };

  const graph = buildEntityGraph([sampleTarget1, sampleTarget2, isolatedTarget], {
    includeCompanies: true,
    includeGroups: true,
    includeHandles: false,
    includeTags: false,
  });

  const summary = analyzeGraphTopology(graph);
  assert.equal(summary.clusterCount, 2);
  assert.deepEqual(summary.isolatedNodeIds, ['target_target-004']);
  assert.equal(summary.nodeDegrees['target_target-004'], 0);

  // Both 'Aegis Cyber' and 'Aegis Defense' bridge sampleTarget1 & sampleTarget2
  const bridgeLabels = summary.bridgeNodes.map((b) => b.label);
  assert.ok(bridgeLabels.includes('Aegis Cyber'));
  assert.ok(bridgeLabels.includes('Aegis Defense'));
  assert.ok(summary.bridgeNodes.every((b) => b.connectedTargetCount >= 2));
});

test('containsBase64Blob and validateAvatarUrl block case-insensitive data URIs across fields', () => {
  assert.equal(validateAvatarUrl('DATA:image/png;base64,AAAA').valid, false);
  assert.equal(containsBase64Blob('Look at data:image/jpeg;base64,/9j/4AAQ'), true);
  assert.equal(containsBase64Blob('Normal analyst notes without binary blobs.'), false);
});

test('normalizeAndValidateTarget sanitizes partial targets and rejects invalid enums or blobs', () => {
  const validMinimal = normalizeAndValidateTarget({
    alias: '  ShadowBroker  ',
    tags: ['Phishing', '#phishing', 'FinOps'],
  });
  assert.equal(validMinimal.valid, true);
  if (validMinimal.valid) {
    assert.equal(validMinimal.target.alias, 'ShadowBroker');
    assert.equal(validMinimal.target.category, 'individual');
    assert.deepEqual(validMinimal.target.tags, ['#phishing', '#finops']);
    assert.deepEqual(validMinimal.target.handles, []);
  }

  const badEnum = normalizeAndValidateTarget({
    alias: 'BadActor',
    category: 'spacecraft',
  });
  assert.equal(badEnum.valid, false);

  const blobInNotes = normalizeAndValidateTarget({
    alias: 'BlobActor',
    notes: 'evidence: data:image/png;base64,iVBORw0KGgo=',
  });
  assert.equal(blobInNotes.valid, false);
});

test('validateImportBatch rejects duplicate IDs, oversized payloads, and cleans dangling relationships', () => {
  const dupCheck = validateImportBatch([
    { id: 't1', alias: 'Alpha' },
    { id: 't1', alias: 'Beta' },
  ]);
  assert.equal(dupCheck.valid, false);
  if (!dupCheck.valid) {
    assert.match(dupCheck.reason, /Duplicate target id/i);
  }

  const sizeCheck = validateImportBatch([{ id: 't1', alias: 'Alpha', notes: 'x'.repeat(2000) }], 500);
  assert.equal(sizeCheck.valid, false);
  if (!sizeCheck.valid) {
    assert.match(sizeCheck.reason, /exceeds/i);
  }

  const cleanCheck = validateImportBatch([
    {
      id: 't1',
      alias: 'AlphaRenamed',
      relationships: [
        { id: 'r1', targetId: 't2', targetName: 'OldBeta', relationshipType: 'collaborator' },
        { id: 'r2', targetId: 'missing-id', targetName: 'Ghost', relationshipType: 'collaborator' },
      ],
    },
    {
      id: 't2',
      alias: 'BetaCurrent',
      relationships: [],
    },
  ]);
  assert.equal(cleanCheck.valid, true);
  if (cleanCheck.valid) {
    assert.equal(cleanCheck.targets[0].relationships.length, 1);
    assert.equal(cleanCheck.targets[0].relationships[0].targetId, 't2');
    assert.equal(cleanCheck.targets[0].relationships[0].targetName, 'BetaCurrent');
  }
});


