export type TargetCategory = 'individual' | 'syndicate' | 'company' | 'asset' | 'unknown';

export type TargetStatus = 'active' | 'surveillance' | 'monitored' | 'cold' | 'archived' | 'flagged';

export type TargetPriority = 'critical' | 'high' | 'medium' | 'low';

export type HandleVerification = 'verified' | 'suspected' | 'impersonator';

export type SocialPlatform =
  | 'twitter'
  | 'telegram'
  | 'github'
  | 'linkedin'
  | 'instagram'
  | 'tiktok'
  | 'reddit'
  | 'discord'
  | 'youtube'
  | 'facebook'
  | 'mastodon'
  | 'darkweb'
  | 'website'
  | 'email'
  | 'phone'
  | 'crypto_btc'
  | 'crypto_eth'
  | 'crypto_xmr'
  | 'custom';

export interface SocialHandleSlot {
  id: string;
  platform: SocialPlatform;
  customLabel?: string;
  value: string;
  verified: HandleVerification;
  notes?: string;
}

export type RelationshipType =
  | 'member_of'
  | 'operates'
  | 'collaborator'
  | 'aliases_as'
  | 'parent_company_of'
  | 'shared_infrastructure'
  | 'reported_associate';

export interface TargetRelationship {
  id: string;
  targetId: string;
  targetName: string;
  relationshipType: RelationshipType;
  notes?: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  event: string;
  source?: string;
}

export interface OsintTarget {
  id: string;
  alias: string;
  realName?: string;
  category: TargetCategory;
  status: TargetStatus;
  priority: TargetPriority;
  avatarUrl?: string; // Stored strictly as a URL string - server never stores image binaries
  organization?: string;
  companies: string[];
  groups: string[];
  tags: string[];
  location?: string;
  handles: SocialHandleSlot[];
  relationships: TargetRelationship[];
  notes: string;
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'target' | 'company' | 'group' | 'handle' | 'email' | 'tag';
  targetId?: string;
  status?: TargetStatus;
  priority?: TargetPriority;
  avatarUrl?: string;
  details?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  label: string;
  type: 'affiliation' | 'membership' | 'ownership' | 'social' | 'relationship' | 'tag';
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
