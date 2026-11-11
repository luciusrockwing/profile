import {
  OsintTarget,
  GraphData,
  GraphNode,
  GraphLink,
  SocialPlatform,
  TargetCategory,
  TargetStatus,
} from './osint-types';

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
    if (parts.length === 2) {
      return `https://${parts[1]}/@${parts[0]}`;
    }
  }

  const config = PLATFORM_REGISTRY[platform];
  if (config?.urlPrefix) {
    let stripped = clean.replace(/^[@/]/, '');
    // Strip redundant domain if user typed e.g. "t.me/handle" or "x.com/handle"
    if (platform === 'telegram') stripped = stripped.replace(/^(t\.me|telegram\.me)\//i, '');
    if (platform === 'twitter') stripped = stripped.replace(/^(x\.com|twitter\.com)\//i, '');
    if (platform === 'github') stripped = stripped.replace(/^(github\.com)\//i, '');
    if (platform === 'linkedin') stripped = stripped.replace(/^(https?:\/\/)?(www\.)?linkedin\.com\/(in\/)?/i, '').replace(/^in\//i, '');
    if (platform === 'instagram') stripped = stripped.replace(/^(instagram\.com)\//i, '');
    if (platform === 'tiktok') stripped = stripped.replace(/^(tiktok\.com\/@|tiktok\.com)\//i, '');
    if (platform === 'reddit') stripped = stripped.replace(/^(reddit\.com\/user|reddit\.com\/u|u\/)/i, '');
    if (platform === 'youtube') stripped = stripped.replace(/^(youtube\.com\/@|youtube\.com\/c|youtube\.com)\//i, '');
    if (platform === 'facebook') stripped = stripped.replace(/^(facebook\.com)\//i, '');

    return `${config.urlPrefix}${stripped}`;
  }

  return null;
}

/**
 * Validates that an avatar is purely a valid URL string or empty,
 * strictly rejecting base64 binaries or malicious data to protect server disk space.
 */
export function validateAvatarUrl(url?: string): { valid: boolean; reason?: string } {
  if (!url || url.trim() === '') return { valid: true };
  const trimmed = url.trim();

  if (trimmed.startsWith('data:')) {
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

    if (t.organization && options.includeGroups) {
      const orgId = `org_${t.organization.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      if (!nodesMap.has(orgId)) {
        nodesMap.set(orgId, {
          id: orgId,
          label: t.organization,
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
