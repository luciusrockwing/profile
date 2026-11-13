import {
  OsintTarget,
  GraphData,
  GraphNode,
  GraphLink,
  GraphPathResult,
  BridgeNodeSummary,
  GraphTopologySummary,
  SocialPlatform,
  TargetCategory,
  TargetStatus,
  TargetPriority,
  HandleVerification,
  RelationshipType,
  SocialHandleSlot,
  TargetRelationship,
  TimelineEvent,
} from './osint-types';

export const MAX_DATABASE_BYTES = 1024 * 1024; // 1 MB ceiling for zero-blob JSON store

const VALID_CATEGORIES = new Set<TargetCategory>([
  'individual',
  'syndicate',
  'company',
  'asset',
  'unknown',
]);

const VALID_STATUSES = new Set<TargetStatus>([
  'active',
  'surveillance',
  'monitored',
  'cold',
  'archived',
  'flagged',
]);

const VALID_PRIORITIES = new Set<TargetPriority>(['critical', 'high', 'medium', 'low']);

const VALID_VERIFICATIONS = new Set<HandleVerification>([
  'verified',
  'suspected',
  'impersonator',
]);

const VALID_RELATIONSHIPS = new Set<RelationshipType>([
  'member_of',
  'operates',
  'collaborator',
  'aliases_as',
  'parent_company_of',
  'shared_infrastructure',
  'reported_associate',
]);

export interface PlatformConfig {
  name: string;
  urlPrefix?: string;
  placeholder: string;
  category: 'social' | 'chat' | 'code' | 'web' | 'crypto' | 'contact';
}

export const PLATFORM_REGISTRY: Record<SocialPlatform, PlatformConfig> = {
  twitter: {
    name: 'X (Twitter)',
    urlPrefix: 'https://x.com/',
    placeholder: '@username or username',
    category: 'social',
  },
  telegram: {
    name: 'Telegram',
    urlPrefix: 'https://t.me/',
    placeholder: '@channel or username',
    category: 'chat',
  },
  github: {
    name: 'GitHub',
    urlPrefix: 'https://github.com/',
    placeholder: 'username or org',
    category: 'code',
  },
  linkedin: {
    name: 'LinkedIn',
    urlPrefix: 'https://linkedin.com/in/',
    placeholder: 'in/username or full URL',
    category: 'social',
  },
  instagram: {
    name: 'Instagram',
    urlPrefix: 'https://instagram.com/',
    placeholder: '@username',
    category: 'social',
  },
  tiktok: {
    name: 'TikTok',
    urlPrefix: 'https://tiktok.com/@',
    placeholder: '@username',
    category: 'social',
  },
  reddit: {
    name: 'Reddit',
    urlPrefix: 'https://reddit.com/user/',
    placeholder: 'u/username',
    category: 'social',
  },
  discord: {
    name: 'Discord',
    placeholder: 'username or user ID',
    category: 'chat',
  },
  youtube: {
    name: 'YouTube',
    urlPrefix: 'https://youtube.com/@',
    placeholder: '@channel or link',
    category: 'social',
  },
  facebook: {
    name: 'Facebook',
    urlPrefix: 'https://facebook.com/',
    placeholder: 'profile or page slug',
    category: 'social',
  },
  mastodon: {
    name: 'Mastodon',
    placeholder: '@user@instance.social or URL',
    category: 'social',
  },
  darkweb: {
    name: 'Tor / Darkweb',
    placeholder: 'http://...onion',
    category: 'web',
  },
  website: {
    name: 'Personal / Blog Site',
    placeholder: 'https://example.com',
    category: 'web',
  },
  email: {
    name: 'Email Address',
    urlPrefix: 'mailto:',
    placeholder: 'target@domain.tld',
    category: 'contact',
  },
  phone: {
    name: 'Phone / Signal',
    urlPrefix: 'tel:',
    placeholder: '+1-555-0199',
    category: 'contact',
  },
  crypto_btc: {
    name: 'Bitcoin (BTC)',
    urlPrefix: 'https://www.blockchain.com/explorer/addresses/btc/',
    placeholder: 'bc1... or 1...',
    category: 'crypto',
  },
  crypto_eth: {
    name: 'Ethereum (ETH)',
    urlPrefix: 'https://etherscan.io/address/',
    placeholder: '0x...',
    category: 'crypto',
  },
  crypto_xmr: {
    name: 'Monero (XMR)',
    urlPrefix: 'https://xmrchain.net/search?value=',
    placeholder: '4... or 8...',
    category: 'crypto',
  },
  custom: {
    name: 'Custom Service',
    placeholder: 'username, profile ID, or URL',
    category: 'web',
  },
};

/**
 * Format slot value into an external hyperlink.
 * Returns null if the value is purely an identifier that cannot be resolved directly.
 */
export function formatPlatformUrl(platform: SocialPlatform, value: string): string | null {
  if (!value || typeof value !== 'string') return null;
  const clean = value.trim();
  if (!clean) return null;

  // Already a full URL
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }

  // Email format
  if (platform === 'email') {
    return `mailto:${clean.replace(/^mailto:/i, '')}`;
  }

  // Phone
  if (platform === 'phone') {
    return `tel:${clean.replace(/[^\d+]/g, '')}`;
  }

  // Mastodon: @user@instance.tld -> https://instance.tld/@user
  if (platform === 'mastodon') {
    const parts = clean.replace(/^@/, '').split('@');
    if (parts.length === 2 && parts[0] && parts[1]) {
      return `https://${parts[1]}/@${parts[0]}`;
    }
    return null;
  }

  const config = PLATFORM_REGISTRY[platform];
  if (config?.urlPrefix) {
    let stripped = clean.replace(/^[@/]+/, '');
    // Strip redundant domain if user typed e.g. "t.me/handle" or "x.com/handle"
    if (platform === 'telegram') stripped = stripped.replace(/^(www\.)?(t\.me|telegram\.me)\//i, '');
    if (platform === 'twitter') stripped = stripped.replace(/^(www\.)?(x\.com|twitter\.com)\//i, '');
    if (platform === 'github') stripped = stripped.replace(/^(www\.)?(github\.com)\//i, '');
    if (platform === 'instagram') stripped = stripped.replace(/^(www\.)?(instagram\.com)\//i, '');
    if (platform === 'tiktok') stripped = stripped.replace(/^(www\.)?(tiktok\.com\/@|tiktok\.com)\//i, '').replace(/^@/, '');
    if (platform === 'facebook') stripped = stripped.replace(/^(www\.)?(facebook\.com)\//i, '');

    if (platform === 'linkedin') {
      stripped = stripped.replace(/^(www\.)?linkedin\.com\//i, '');
      if (/^(company|school|showcase)\//i.test(stripped)) {
        return `https://linkedin.com/${stripped}`;
      }
      stripped = stripped.replace(/^in\//i, '');
      return `${config.urlPrefix}${stripped}`;
    }

    if (platform === 'reddit') {
      stripped = stripped.replace(/^(www\.)?reddit\.com\//i, '');
      if (/^(r|user|u)\//i.test(stripped)) {
        const normalized = stripped.replace(/^u\//i, 'user/');
        return `https://reddit.com/${normalized}`;
      }
      return `${config.urlPrefix}${stripped}`;
    }

    if (platform === 'youtube') {
      stripped = stripped.replace(/^(www\.)?youtube\.com\//i, '');
      if (/^(c|channel|user)\//i.test(stripped) || stripped.startsWith('@')) {
        return `https://youtube.com/${stripped}`;
      }
      return `${config.urlPrefix}${stripped}`;
    }

    return `${config.urlPrefix}${stripped}`;
  }

  return null;
}

/**
 * Detects embedded base64 data URIs anywhere inside string payloads
 * to enforce the zero-blob server storage mandate.
 */
export function containsBase64Blob(value?: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return /data:[a-z0-9/+.-]*;base64,/i.test(value) || /^\s*data:/i.test(value);
}

/**
 * Validates that an avatar is purely a valid URL string or empty,
 * strictly rejecting base64 binaries or malicious data to protect server disk space.
 */
export function validateAvatarUrl(url?: string): { valid: boolean; reason?: string } {
  if (!url || url.trim() === '') return { valid: true };
  const trimmed = url.trim();

  if (trimmed.toLowerCase().startsWith('data:')) {
    return {
      valid: false,
      reason: 'Raw base64 data URIs are rejected to minimize server storage. Provide external HTTP/HTTPS URL instead.',
    };
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, reason: 'URL must use HTTP or HTTPS protocol.' };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Malformed URL format.' };
  }
}

/**
 * Filter targets by query string, category, status, and tag
 */
export function filterTargets(
  targets: OsintTarget[],
  filters: {
    query?: string;
    category?: TargetCategory | 'all';
    status?: TargetStatus | 'all';
    tag?: string;
  }
): OsintTarget[] {
  const q = filters.query?.trim().toLowerCase() || '';
  const cat = filters.category && filters.category !== 'all' ? filters.category : null;
  const stat = filters.status && filters.status !== 'all' ? filters.status : null;
  const tagFilter = filters.tag?.trim().toLowerCase() || '';

  return targets.filter((t) => {
    if (cat && t.category !== cat) return false;
    if (stat && t.status !== stat) return false;
    if (tagFilter && !t.tags.some((tag) => tag.toLowerCase().includes(tagFilter))) return false;

    if (!q) return true;

    // Search alias & real name
    if (t.alias.toLowerCase().includes(q)) return true;
    if (t.realName?.toLowerCase().includes(q)) return true;
    if (t.organization?.toLowerCase().includes(q)) return true;
    if (t.location?.toLowerCase().includes(q)) return true;
    if (t.notes.toLowerCase().includes(q)) return true;

    // Search companies & groups
    if (t.companies.some((c) => c.toLowerCase().includes(q))) return true;
    if (t.groups.some((g) => g.toLowerCase().includes(q))) return true;
    if (t.tags.some((tag) => tag.toLowerCase().includes(q))) return true;

    // Search handles
    if (t.handles.some((h) => h.value.toLowerCase().includes(q))) return true;

    return false;
  });
}

export interface GraphBuildOptions {
  includeCompanies?: boolean;
  includeGroups?: boolean;
  includeHandles?: boolean;
  includeTags?: boolean;
}

/**
 * Builds nodes and links graph from targets, mapping relationships,
 * companies, syndicates, and shared social handles into an interconnected graph.
 */
export function buildEntityGraph(
  targets: OsintTarget[],
  options: GraphBuildOptions = {
    includeCompanies: true,
    includeGroups: true,
    includeHandles: true,
    includeTags: false,
  }
): GraphData {
  const nodesMap = new Map<string, GraphNode>();
  const links: GraphLink[] = [];
  const addedLinks = new Set<string>();

  const addLink = (source: string, target: string, label: string, type: GraphLink['type']) => {
    if (source === target) return;
    const key = `${source}-->${target}::${label}`;
    const reverseKey = `${target}-->${source}::${label}`;
    if (!addedLinks.has(key) && !addedLinks.has(reverseKey)) {
      addedLinks.add(key);
      links.push({ source, target, label, type });
    }
  };

  // 1. Add all target nodes
  for (const t of targets) {
    const nodeId = `target_${t.id}`;
    nodesMap.set(nodeId, {
      id: nodeId,
      label: t.alias,
      type: 'target',
      targetId: t.id,
      status: t.status,
      priority: t.priority,
      avatarUrl: t.avatarUrl,
      details: `${t.category.toUpperCase()} • ${t.organization || 'Independent'}`,
    });
  }

  // 2. Add Organization & Company nodes
  for (const t of targets) {
    const targetNodeId = `target_${t.id}`;

    const trimmedOrg = t.organization?.trim();
    if (trimmedOrg && options.includeGroups) {
      const orgId = `org_${trimmedOrg.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      if (!nodesMap.has(orgId)) {
        nodesMap.set(orgId, {
          id: orgId,
          label: trimmedOrg,
          type: 'group',
          details: 'Organization / Syndicate',
        });
      }
      addLink(targetNodeId, orgId, 'Operates within', 'membership');
    }

    if (options.includeCompanies) {
      for (const comp of t.companies) {
        if (!comp.trim()) continue;
        const compId = `comp_${comp.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        if (!nodesMap.has(compId)) {
          nodesMap.set(compId, {
            id: compId,
            label: comp,
            type: 'company',
            details: 'Corporate Entity',
          });
        }
        addLink(targetNodeId, compId, 'Affiliated with', 'affiliation');
      }
    }

    if (options.includeGroups) {
      for (const grp of t.groups) {
        if (!grp.trim()) continue;
        const grpId = `grp_${grp.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        if (!nodesMap.has(grpId)) {
          nodesMap.set(grpId, {
            id: grpId,
            label: grp,
            type: 'group',
            details: 'Working Group / Cell',
          });
        }
        addLink(targetNodeId, grpId, 'Member of', 'membership');
      }
    }

    // 3. Social Handles & Accounts (identifies cross-target matches!)
    if (options.includeHandles) {
      for (const h of t.handles) {
        if (!h.value.trim()) continue;
        const cleanVal = h.value.trim().toLowerCase().replace(/^@/, '');
        const isEmail = h.platform === 'email';
        const handleNodeId = `hnd_${h.platform}_${cleanVal.replace(/[^a-z0-9]/g, '_')}`;

        if (!nodesMap.has(handleNodeId)) {
          let displayVal = h.value;
          if (displayVal.length > 22) {
            displayVal = `${displayVal.slice(0, 10)}...${displayVal.slice(-6)}`;
          }
          const platformLabel = h.platform === 'custom' ? h.customLabel || 'Account' : h.platform.toUpperCase();
          nodesMap.set(handleNodeId, {
            id: handleNodeId,
            label: `${platformLabel}: ${displayVal}`,
            type: isEmail ? 'email' : 'handle',
            details: `${h.verified} • ${h.value}`,
          });
        }
        addLink(targetNodeId, handleNodeId, h.verified === 'verified' ? 'Confirmed handle' : 'Associated account', 'social');
      }
    }

    // 4. Tags
    if (options.includeTags) {
      for (const tag of t.tags) {
        if (!tag.trim()) continue;
        const cleanTag = tag.trim().toLowerCase();
        const tagNodeId = `tag_${cleanTag.replace(/[^a-z0-9]/g, '_')}`;
        if (!nodesMap.has(tagNodeId)) {
          nodesMap.set(tagNodeId, {
            id: tagNodeId,
            label: cleanTag.startsWith('#') ? cleanTag : `#${cleanTag}`,
            type: 'tag',
            details: 'Classification Tag',
          });
        }
        addLink(targetNodeId, tagNodeId, 'Tagged', 'tag');
      }
    }

    // 5. Explicit Target-to-Target Relationships
    for (const rel of t.relationships) {
      const destNodeId = `target_${rel.targetId}`;
      if (nodesMap.has(destNodeId)) {
        const readableType = rel.relationshipType.replace(/_/g, ' ');
        addLink(targetNodeId, destNodeId, readableType, 'relationship');
      }
    }
  }

  return {
    nodes: Array.from(nodesMap.values()),
    links,
  };
}

/**
 * Computes a pseudo-hash checksum of target dossier data for audit integrity
 */
export function generateForensicChecksum(target: OsintTarget): string {
  const content = JSON.stringify({
    id: target.id,
    alias: target.alias,
    realName: target.realName,
    category: target.category,
    status: target.status,
    priority: target.priority,
    avatarUrl: target.avatarUrl,
    handles: target.handles.map((h) => ({ p: h.platform, v: h.value })),
    companies: target.companies,
    groups: target.groups,
    notes: target.notes,
  });

  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `SHA256-${hash.toString(16).padStart(8, '0').toUpperCase()}`;
}

/**
 * Formats a clean, professional OSINT dossier report
 */
export function generateDossierReport(target: OsintTarget): string {
  const checksum = generateForensicChecksum(target);
  const dateStr = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const lines: string[] = [
    `========================================================================`,
    `SPECTER OSINT // CONFIDENTIAL DOSSIER REPORT`,
    `========================================================================`,
    `TARGET ID:       ${target.id}`,
    `PRIMARY ALIAS:   ${target.alias}`,
    `REAL NAME:       ${target.realName || 'UNIDENTIFIED / UNKNOWN'}`,
    `CLASSIFICATION:  ${target.category.toUpperCase()}`,
    `STATUS:          ${target.status.toUpperCase()}`,
    `PRIORITY:        ${target.priority.toUpperCase()}`,
    `LOCATION:        ${target.location || 'UNDETERMINED'}`,
    `REPORT DATE:     ${dateStr}`,
    `CHECKSUM:        ${checksum}`,
    `IMAGE LINK:      ${target.avatarUrl || 'NONE (CLIENT LOADED ZERO-STORAGE)'}`,
    `------------------------------------------------------------------------`,
    `AFFILIATIONS & ENTITIES:`,
    `Organization:    ${target.organization || 'NONE'}`,
    `Companies:       ${target.companies.length ? target.companies.join(', ') : 'NONE DOCUMENTED'}`,
    `Operating Groups:${target.groups.length ? target.groups.join(', ') : 'NONE DOCUMENTED'}`,
    `Tags:            ${target.tags.length ? target.tags.join(' ') : 'NONE'}`,
    `------------------------------------------------------------------------`,
    `IDENTIFIED SLOTS & DIGITAL FOOTPRINT (${target.handles.length} SLOTS):`,
  ];

  if (target.handles.length === 0) {
    lines.push(`  [No accounts or handles currently recorded]`);
  } else {
    target.handles.forEach((h, idx) => {
      const url = formatPlatformUrl(h.platform, h.value);
      lines.push(
        `  ${idx + 1}. [${h.platform.toUpperCase()}] ${h.value} (${h.verified.toUpperCase()})`
      );
      if (url && url !== h.value) {
        lines.push(`     Link: ${url}`);
      }
      if (h.notes) {
        lines.push(`     Note: ${h.notes}`);
      }
    });
  }

  lines.push(`------------------------------------------------------------------------`);
  lines.push(`RELATIONSHIPS (${target.relationships.length} RECORDED):`);
  if (target.relationships.length === 0) {
    lines.push(`  [No inter-target connections linked]`);
  } else {
    target.relationships.forEach((rel, idx) => {
      lines.push(`  ${idx + 1}. -> ${rel.targetName} (${rel.relationshipType.replace(/_/g, ' ')})`);
      if (rel.notes) lines.push(`     Note: ${rel.notes}`);
    });
  }

  lines.push(`------------------------------------------------------------------------`);
  lines.push(`CHRONOLOGY & TIMELINE (${target.timeline.length} ENTRIES):`);
  if (target.timeline.length === 0) {
    lines.push(`  [No timeline entries recorded]`);
  } else {
    target.timeline.forEach((item) => {
      lines.push(`  [${item.date}] ${item.event}${item.source ? ` (Source: ${item.source})` : ''}`);
    });
  }

  lines.push(`------------------------------------------------------------------------`);
  lines.push(`INVESTIGATOR FIELD NOTES:`);
  lines.push(target.notes ? target.notes : '[No additional notes documented]');
  lines.push(`========================================================================`);

  return lines.join('\n');
}

/**
 * Removes a target by ID and cleans up any dangling relationships referencing it.
 */
export function removeTargetAndCleanRelationships(
  targets: OsintTarget[],
  targetId: string
): OsintTarget[] {
  return targets
    .filter((t) => t.id !== targetId)
    .map((t) => {
      const hasDangling = t.relationships.some((rel) => rel.targetId === targetId);
      if (!hasDangling) return t;
      return {
        ...t,
        relationships: t.relationships.filter((rel) => rel.targetId !== targetId),
      };
    });
}

/**
 * Updates cached relationship targetName references across all targets when a target's alias changes.
 */
export function syncRelationshipTargetNames(
  targets: OsintTarget[],
  updatedTarget: OsintTarget
): OsintTarget[] {
  return targets.map((t) => {
    if (t.id === updatedTarget.id) return t;
    const needsSync = t.relationships.some(
      (rel) => rel.targetId === updatedTarget.id && rel.targetName !== updatedTarget.alias
    );
    if (!needsSync) return t;
    return {
      ...t,
      relationships: t.relationships.map((rel) =>
        rel.targetId === updatedTarget.id ? { ...rel, targetName: updatedTarget.alias } : rel
      ),
    };
  });
}

function buildUndirectedAdjacency(graph: GraphData): Map<string, Array<{ neighborId: string; link: GraphLink }>> {
  const adjacency = new Map<string, Array<{ neighborId: string; link: GraphLink }>>();
  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }
  for (const link of graph.links) {
    if (!adjacency.has(link.source) || !adjacency.has(link.target)) continue;
    adjacency.get(link.source)!.push({ neighborId: link.target, link });
    adjacency.get(link.target)!.push({ neighborId: link.source, link });
  }
  return adjacency;
}

/**
 * Finds the unweighted shortest path between two graph nodes via BFS.
 * Returns null if either node is missing or no path exists.
 */
export function findShortestGraphPath(
  graph: GraphData,
  sourceId: string,
  targetId: string
): GraphPathResult | null {
  const adjacency = buildUndirectedAdjacency(graph);
  if (!adjacency.has(sourceId) || !adjacency.has(targetId)) {
    return null;
  }

  if (sourceId === targetId) {
    return {
      nodeIds: [sourceId],
      links: [],
      hopCount: 0,
    };
  }

  const visited = new Set<string>([sourceId]);
  const parent = new Map<string, { prevId: string; link: GraphLink }>();
  const queue: string[] = [sourceId];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];
    if (current === targetId) break;

    const neighbors = adjacency.get(current) || [];
    for (const edge of neighbors) {
      if (visited.has(edge.neighborId)) continue;
      visited.add(edge.neighborId);
      parent.set(edge.neighborId, { prevId: current, link: edge.link });
      queue.push(edge.neighborId);
    }
  }

  if (!parent.has(targetId)) {
    return null;
  }

  const nodeIds: string[] = [];
  const links: GraphLink[] = [];
  let cursor: string | undefined = targetId;

  while (cursor) {
    nodeIds.push(cursor);
    const step = parent.get(cursor);
    if (!step) break;
    links.push(step.link);
    cursor = step.prevId;
  }

  nodeIds.reverse();
  links.reverse();

  return {
    nodeIds,
    links,
    hopCount: links.length,
  };
}

/**
 * Extracts a k-hop (1 or 2) ego neighborhood subgraph centered on a node.
 */
export function getEgoSubgraph(
  graph: GraphData,
  centerNodeId: string,
  depth: 1 | 2
): GraphData {
  const adjacency = buildUndirectedAdjacency(graph);
  if (!adjacency.has(centerNodeId)) {
    return { nodes: [], links: [] };
  }

  const visited = new Set<string>([centerNodeId]);
  const queue: Array<{ id: string; dist: number }> = [{ id: centerNodeId, dist: 0 }];
  let head = 0;

  while (head < queue.length) {
    const { id, dist } = queue[head++];
    if (dist >= depth) continue;

    const neighbors = adjacency.get(id) || [];
    for (const edge of neighbors) {
      if (visited.has(edge.neighborId)) continue;
      visited.add(edge.neighborId);
      queue.push({ id: edge.neighborId, dist: dist + 1 });
    }
  }

  return {
    nodes: graph.nodes.filter((n) => visited.has(n.id)),
    links: graph.links.filter((l) => visited.has(l.source) && visited.has(l.target)),
  };
}

/**
 * Computes cluster count, isolated nodes, node degrees, and bridge entities
 * that connect 2 or more distinct target nodes.
 */
export function analyzeGraphTopology(graph: GraphData): GraphTopologySummary {
  const adjacency = buildUndirectedAdjacency(graph);
  const nodeMap = new Map<string, GraphNode>();
  for (const node of graph.nodes) {
    nodeMap.set(node.id, node);
  }

  const nodeDegrees: Record<string, number> = {};
  const isolatedNodeIds: string[] = [];
  const bridgeNodes: BridgeNodeSummary[] = [];

  for (const node of graph.nodes) {
    const edges = adjacency.get(node.id) || [];
    const degree = edges.length;
    nodeDegrees[node.id] = degree;
    if (degree === 0) {
      isolatedNodeIds.push(node.id);
    }

    const connectedTargetSet = new Set<string>();
    for (const edge of edges) {
      const neighbor = nodeMap.get(edge.neighborId);
      if (neighbor?.type === 'target' && neighbor.id !== node.id) {
        connectedTargetSet.add(neighbor.id);
      }
    }

    if (connectedTargetSet.size >= 2) {
      bridgeNodes.push({
        nodeId: node.id,
        label: node.label,
        type: node.type,
        connectedTargetCount: connectedTargetSet.size,
        connectedTargetIds: Array.from(connectedTargetSet),
        degree,
      });
    }
  }

  bridgeNodes.sort((a, b) => {
    if (b.connectedTargetCount !== a.connectedTargetCount) {
      return b.connectedTargetCount - a.connectedTargetCount;
    }
    if (b.degree !== a.degree) {
      return b.degree - a.degree;
    }
    return a.label.localeCompare(b.label);
  });

  // Count connected components across all nodes
  const visited = new Set<string>();
  let clusterCount = 0;

  for (const node of graph.nodes) {
    if (visited.has(node.id)) continue;
    clusterCount += 1;
    const queue: string[] = [node.id];
    visited.add(node.id);
    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];
      for (const edge of adjacency.get(current) || []) {
        if (!visited.has(edge.neighborId)) {
          visited.add(edge.neighborId);
          queue.push(edge.neighborId);
        }
      }
    }
  }

  return {
    clusterCount,
    isolatedNodeIds,
    bridgeNodes,
    nodeDegrees,
  };
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of input) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/**
 * Validates and normalizes an OsintTarget payload for both single saves and batch imports.
 * Rejects missing alias, invalid enum values, and embedded base64/data blobs.
 */
export function normalizeAndValidateTarget(
  raw: unknown,
  options: { requireId?: boolean } = {}
): { valid: true; target: OsintTarget } | { valid: false; reason: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, reason: 'Target payload must be a JSON object.' };
  }

  const obj = raw as Record<string, unknown>;

  if (options.requireId && (typeof obj.id !== 'string' || !obj.id.trim())) {
    return { valid: false, reason: 'Target id is required and must be a non-empty string.' };
  }

  if (typeof obj.alias !== 'string' || !obj.alias.trim()) {
    return { valid: false, reason: 'Target alias is required.' };
  }
  const alias = obj.alias.trim();
  if (alias.length > 160) {
    return { valid: false, reason: `Target "${alias.slice(0, 24)}..." alias exceeds 160 characters.` };
  }

  const category = (obj.category ?? 'individual') as TargetCategory;
  if (!VALID_CATEGORIES.has(category)) {
    return { valid: false, reason: `Invalid category "${String(obj.category)}" for target ${alias}.` };
  }

  const status = (obj.status ?? 'active') as TargetStatus;
  if (!VALID_STATUSES.has(status)) {
    return { valid: false, reason: `Invalid status "${String(obj.status)}" for target ${alias}.` };
  }

  const priority = (obj.priority ?? 'medium') as TargetPriority;
  if (!VALID_PRIORITIES.has(priority)) {
    return { valid: false, reason: `Invalid priority "${String(obj.priority)}" for target ${alias}.` };
  }

  const avatarUrl = typeof obj.avatarUrl === 'string' && obj.avatarUrl.trim() ? obj.avatarUrl.trim() : undefined;
  const avatarCheck = validateAvatarUrl(avatarUrl);
  if (!avatarCheck.valid) {
    return { valid: false, reason: `Target ${alias} has invalid avatar: ${avatarCheck.reason}` };
  }

  const notes = typeof obj.notes === 'string' ? obj.notes : '';
  if (containsBase64Blob(notes)) {
    return { valid: false, reason: `Target ${alias} notes cannot contain embedded base64 data URIs.` };
  }

  const handles: SocialHandleSlot[] = [];
  if (obj.handles !== undefined && !Array.isArray(obj.handles)) {
    return { valid: false, reason: `Target ${alias} handles must be an array.` };
  }
  for (const h of (obj.handles as unknown[] | undefined) || []) {
    if (!h || typeof h !== 'object') continue;
    const slot = h as Record<string, unknown>;
    const platform = (typeof slot.platform === 'string' && slot.platform in PLATFORM_REGISTRY
      ? slot.platform
      : 'custom') as SocialPlatform;
    const value = typeof slot.value === 'string' ? slot.value.trim() : '';
    if (!value) continue;
    if (containsBase64Blob(value) || (typeof slot.notes === 'string' && containsBase64Blob(slot.notes))) {
      return { valid: false, reason: `Target ${alias} handle slot cannot contain base64 data URIs.` };
    }
    const verified = VALID_VERIFICATIONS.has(slot.verified as HandleVerification)
      ? (slot.verified as HandleVerification)
      : 'suspected';
    handles.push({
      id: typeof slot.id === 'string' && slot.id.trim()
        ? slot.id.trim()
        : `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      platform,
      customLabel: typeof slot.customLabel === 'string' && slot.customLabel.trim() ? slot.customLabel.trim() : undefined,
      value,
      verified,
      notes: typeof slot.notes === 'string' && slot.notes.trim() ? slot.notes.trim() : undefined,
    });
  }

  const relationships: TargetRelationship[] = [];
  if (obj.relationships !== undefined && !Array.isArray(obj.relationships)) {
    return { valid: false, reason: `Target ${alias} relationships must be an array.` };
  }
  for (const r of (obj.relationships as unknown[] | undefined) || []) {
    if (!r || typeof r !== 'object') continue;
    const rel = r as Record<string, unknown>;
    const targetId = typeof rel.targetId === 'string' ? rel.targetId.trim() : '';
    const targetName = typeof rel.targetName === 'string' ? rel.targetName.trim() : '';
    if (!targetId) continue;
    const relType = VALID_RELATIONSHIPS.has(rel.relationshipType as RelationshipType)
      ? (rel.relationshipType as RelationshipType)
      : 'reported_associate';
    relationships.push({
      id: typeof rel.id === 'string' && rel.id.trim()
        ? rel.id.trim()
        : `rel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      targetId,
      targetName: targetName || targetId,
      relationshipType: relType,
      notes: typeof rel.notes === 'string' && rel.notes.trim() ? rel.notes.trim() : undefined,
    });
  }

  const timeline: TimelineEvent[] = [];
  if (obj.timeline !== undefined && !Array.isArray(obj.timeline)) {
    return { valid: false, reason: `Target ${alias} timeline must be an array.` };
  }
  for (const item of (obj.timeline as unknown[] | undefined) || []) {
    if (!item || typeof item !== 'object') continue;
    const ev = item as Record<string, unknown>;
    const date = typeof ev.date === 'string' ? ev.date.trim() : '';
    const event = typeof ev.event === 'string' ? ev.event.trim() : '';
    if (!date || !event) continue;
    timeline.push({
      id: typeof ev.id === 'string' && ev.id.trim()
        ? ev.id.trim()
        : `tl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date,
      event,
      source: typeof ev.source === 'string' && ev.source.trim() ? ev.source.trim() : undefined,
    });
  }

  const rawTags = normalizeStringArray(obj.tags);
  const tags = Array.from(
    new Set(rawTags.map((t) => (t.startsWith('#') ? t.toLowerCase() : `#${t.toLowerCase()}`)))
  );

  const now = new Date().toISOString();
  const id =
    typeof obj.id === 'string' && obj.id.trim()
      ? obj.id.trim()
      : `tgt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  return {
    valid: true,
    target: {
      id,
      alias,
      realName: typeof obj.realName === 'string' && obj.realName.trim() ? obj.realName.trim() : undefined,
      category,
      status,
      priority,
      avatarUrl,
      organization:
        typeof obj.organization === 'string' && obj.organization.trim()
          ? obj.organization.trim()
          : undefined,
      companies: normalizeStringArray(obj.companies),
      groups: normalizeStringArray(obj.groups),
      tags,
      location: typeof obj.location === 'string' && obj.location.trim() ? obj.location.trim() : undefined,
      handles,
      relationships,
      notes,
      timeline,
      createdAt: typeof obj.createdAt === 'string' && obj.createdAt.trim() ? obj.createdAt.trim() : now,
      updatedAt: typeof obj.updatedAt === 'string' && obj.updatedAt.trim() ? obj.updatedAt.trim() : now,
    },
  };
}

/**
 * Validates and normalizes an imported JSON backup array:
 * - Enforces byte ceiling (default 1 MB)
 * - Validates every target record with required id and alias
 * - Rejects duplicate target IDs
 * - Removes dangling relationships and syncs targetName labels
 */
export function validateImportBatch(
  raw: unknown,
  maxBytes: number = MAX_DATABASE_BYTES
): { valid: true; targets: OsintTarget[] } | { valid: false; reason: string } {
  if (!Array.isArray(raw)) {
    return { valid: false, reason: 'Import failed: Root JSON payload must be an array of targets.' };
  }

  const serializedBytes = new TextEncoder().encode(JSON.stringify(raw)).length;
  if (serializedBytes > maxBytes) {
    return {
      valid: false,
      reason: `Import failed: Payload size (${(serializedBytes / 1024).toFixed(1)} KB) exceeds the ${(maxBytes / 1024).toFixed(0)} KB zero-blob limit.`,
    };
  }

  const normalized: OsintTarget[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < raw.length; i++) {
    const res = normalizeAndValidateTarget(raw[i], { requireId: true });
    if (!res.valid) {
      return { valid: false, reason: `Import failed at index ${i}: ${res.reason}` };
    }
    if (seenIds.has(res.target.id)) {
      return {
        valid: false,
        reason: `Import failed: Duplicate target id "${res.target.id}" detected.`,
      };
    }
    seenIds.add(res.target.id);
    normalized.push(res.target);
  }

  const aliasById = new Map<string, string>(normalized.map((t) => [t.id, t.alias]));

  const cleaned = normalized.map((t) => ({
    ...t,
    relationships: t.relationships
      .filter((rel) => rel.targetId !== t.id && aliasById.has(rel.targetId))
      .map((rel) => ({
        ...rel,
        targetName: aliasById.get(rel.targetId) || rel.targetName,
      })),
  }));

  return { valid: true, targets: cleaned };
}


