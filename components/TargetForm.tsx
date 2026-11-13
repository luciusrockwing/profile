'use client';

import React, { useState } from 'react';
import {
  Save,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  OsintTarget,
  SocialHandleSlot,
  SocialPlatform,
  TargetCategory,
  TargetPriority,
  TargetStatus,
  TargetRelationship,
  TimelineEvent,
  RelationshipType,
} from '@/lib/osint-types';
import { PLATFORM_REGISTRY, validateAvatarUrl } from '@/lib/osint-engine';
import { AstryxButton } from './astryx/Button';
import { AstryxInput } from './astryx/Input';
import { AstryxSelect } from './astryx/Select';
import { AstryxCard, AstryxCardHeader, AstryxCardBody, AstryxCardFooter } from './astryx/Card';
import { AstryxBadge } from './astryx/Badge';

interface TargetFormProps {
  initialTarget?: OsintTarget | null;
  existingTargets: OsintTarget[];
  onSave: (target: OsintTarget) => Promise<void>;
  onCancel: () => void;
}

const SAMPLE_AVATAR_LINKS = [
  { label: 'Analyst Profile', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&auto=format&fit=crop&q=80' },
  { label: 'Executive Female', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=256&auto=format&fit=crop&q=80' },
  { label: 'Corporate HQ', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=256&auto=format&fit=crop&q=80' },
  { label: 'Abstract Syndicate', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=256&auto=format&fit=crop&q=80' },
];

export function TargetForm({
  initialTarget,
  existingTargets,
  onSave,
  onCancel,
}: TargetFormProps) {
  const [alias, setAlias] = useState(initialTarget?.alias || '');
  const [realName, setRealName] = useState(initialTarget?.realName || '');
  const [category, setCategory] = useState<TargetCategory>(initialTarget?.category || 'individual');
  const [status, setStatus] = useState<TargetStatus>(initialTarget?.status || 'active');
  const [priority, setPriority] = useState<TargetPriority>(initialTarget?.priority || 'medium');
  const [avatarUrl, setAvatarUrl] = useState(initialTarget?.avatarUrl || '');
  const [organization, setOrganization] = useState(initialTarget?.organization || '');
  const [location, setLocation] = useState(initialTarget?.location || '');
  const [notes, setNotes] = useState(initialTarget?.notes || '');

  // Tag inputs
  const [tagInput, setTagInput] = useState(initialTarget?.tags?.join(', ') || '');

  // Companies & Groups
  const [companyInput, setCompanyInput] = useState(initialTarget?.companies?.join(', ') || '');
  const [groupInput, setGroupInput] = useState(initialTarget?.groups?.join(', ') || '');

  // Handle Slots
  const [handles, setHandles] = useState<SocialHandleSlot[]>(() =>
    initialTarget?.handles || [
      { id: `slot-${Date.now()}-1`, platform: 'twitter', value: '', verified: 'verified' },
      { id: `slot-${Date.now()}-2`, platform: 'telegram', value: '', verified: 'verified' },
    ]
  );

  // Relationships
  const [relationships, setRelationships] = useState<TargetRelationship[]>(
    initialTarget?.relationships || []
  );

  // Timeline
  const [timeline, setTimeline] = useState<TimelineEvent[]>(
    initialTarget?.timeline || []
  );

  // Avatar preview test state
  const [avatarStatus, setAvatarStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate avatar link
  const handleAvatarChange = (val: string) => {
    setAvatarUrl(val);
    if (!val.trim()) {
      setAvatarStatus('idle');
      setErrorMessage('');
      return;
    }
    const check = validateAvatarUrl(val);
    if (!check.valid) {
      setAvatarStatus('invalid');
      setErrorMessage(check.reason || 'Invalid URL');
    } else {
      setAvatarStatus('valid');
      setErrorMessage('');
    }
  };

  // Add handle slot
  const addHandleSlot = () => {
    setHandles([
      ...handles,
      {
        id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        platform: 'twitter',
        value: '',
        verified: 'verified',
      },
    ]);
  };

  const removeHandleSlot = (id: string) => {
    setHandles(handles.filter((h) => h.id !== id));
  };

  const updateHandleSlot = (id: string, updates: Partial<SocialHandleSlot>) => {
    setHandles(handles.map((h) => (h.id === id ? { ...h, ...updates } : h)));
  };

  // Add relationship
  const addRelationship = () => {
    const availableTargets = existingTargets.filter((t) => t.id !== initialTarget?.id);
    if (availableTargets.length === 0) return;

    setRelationships([
      ...relationships,
      {
        id: `rel-${Date.now()}`,
        targetId: availableTargets[0].id,
        targetName: availableTargets[0].alias,
        relationshipType: 'collaborator',
      },
    ]);
  };

  const removeRelationship = (id: string) => {
    setRelationships(relationships.filter((r) => r.id !== id));
  };

  // Add timeline entry
  const addTimelineEvent = () => {
    const today = new Date().toISOString().slice(0, 10);
    setTimeline([
      ...timeline,
      {
        id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: today,
        event: '',
        source: '',
      },
    ]);
  };

  const updateTimelineEvent = (id: string, updates: Partial<TimelineEvent>) => {
    setTimeline(timeline.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const removeTimelineEvent = (id: string) => {
    setTimeline(timeline.filter((t) => t.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!alias.trim()) {
      setErrorMessage('Target Alias/Codename is required.');
      return;
    }

    if (avatarUrl) {
      const avatarCheck = validateAvatarUrl(avatarUrl);
      if (!avatarCheck.valid) {
        setErrorMessage(avatarCheck.reason || 'Invalid photo link.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Process and normalize tags (trimmed, lowercase, # prefixed, deduplicated)
      const cleanTags = Array.from(
        new Set(
          tagInput
            .split(',')
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
            .map((t) => (t.startsWith('#') ? t : `#${t}`))
        )
      );

      // Process companies & groups
      const cleanCompanies = companyInput
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const cleanGroups = groupInput
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean);

      // Filter out empty handles
      const validHandles = handles.filter((h) => h.value.trim() !== '');

      // Construct target payload
      const targetPayload: OsintTarget = {
        id: initialTarget?.id || `tgt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        alias: alias.trim(),
        realName: realName.trim() || undefined,
        category,
        status,
        priority,
        avatarUrl: avatarUrl.trim() || undefined,
        organization: organization.trim() || undefined,
        location: location.trim() || undefined,
        companies: cleanCompanies,
        groups: cleanGroups,
        tags: cleanTags,
        handles: validHandles,
        relationships,
        timeline: timeline.filter((tl) => tl.event.trim() !== ''),
        notes: notes.trim(),
        createdAt: initialTarget?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSave(targetPayload);
    } catch (err: unknown) {
      console.error('Save failed:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      <AstryxCard>
        <AstryxCardHeader
          title={initialTarget ? `EDIT DOSSIER // ${initialTarget.alias}` : 'NEW TARGET INVESTIGATION DOSSIER'}
          subtitle="Direct-link profile slots • Zero-blob server architecture"
          action={
            <AstryxBadge variant="hairline" color="cyan" dot>
              LIVE SCHEMA
            </AstryxBadge>
          }
        />

        <form onSubmit={handleSubmit}>
          <AstryxCardBody className="space-y-6">
            {errorMessage && (
              <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-950/40 text-rose-300 font-mono text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Zero-Storage Direct Photo Slot */}
            <div className="p-4 rounded-lg border border-[#16233b] bg-[#070b14]/70 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-medium text-slate-200 flex items-center space-x-2">
                  <span>PROFILE PHOTO URL (DIRECT CLIENT ASSET)</span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    [ZERO SERVER STORAGE]
                  </span>
                </label>
                <div className="flex items-center space-x-1 text-[11px] font-mono text-slate-500">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Browser loads direct via referrer-stripped link</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex-1 w-full">
                  <AstryxInput
                    value={avatarUrl}
                    onChange={(e) => handleAvatarChange(e.target.value)}
                    placeholder="https://example.com/photo.jpg (Direct URL only - No upload required)"
                    error={avatarStatus === 'invalid' ? 'Invalid URL' : undefined}
                    hint="Server strictly stores URL text. Browser fetches direct with referrerPolicy=no-referrer."
                  />
                  {/* Preset Sample Avatar Links */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] font-mono text-slate-500">Quick Test Slots:</span>
                    {SAMPLE_AVATAR_LINKS.map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAvatarChange(sample.url)}
                        className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#1e2d4d] bg-[#0c1424] text-cyan-300 hover:border-cyan-500/50 transition-colors"
                      >
                        {sample.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Client Preview Avatar */}
                <div className="w-20 h-20 rounded-lg border border-[#1e2d4d] bg-[#0c1424] flex items-center justify-center overflow-hidden shrink-0">
                  {avatarUrl.trim() ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar slot preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={() => setAvatarStatus('invalid')}
                      onLoad={() => setAvatarStatus('valid')}
                    />
                  ) : (
                    <div className="text-center font-mono text-[10px] text-slate-600 p-1">
                      No URL slot
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Core Identification */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AstryxInput
                label="Target Alias / Codename *"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="e.g. Phantom, Cipher, BlueHawk"
                required
              />
              <AstryxInput
                label="Real Name (If Confirmed)"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                placeholder="e.g. John Doe, Sarah Connor"
              />
            </div>

            {/* Classification & Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AstryxSelect
                label="Target Category"
                value={category}
                onChange={(e) => setCategory(e.target.value as TargetCategory)}
                options={[
                  { value: 'individual', label: 'Individual Person' },
                  { value: 'company', label: 'Company / Corporate' },
                  { value: 'syndicate', label: 'Syndicate / Group' },
                  { value: 'asset', label: 'Asset / Infrastructure' },
                  { value: 'unknown', label: 'Unknown / Unclassified' },
                ]}
              />

              <AstryxSelect
                label="Surveillance Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TargetStatus)}
                options={[
                  { value: 'active', label: 'Active Investigation' },
                  { value: 'surveillance', label: 'Under Surveillance' },
                  { value: 'monitored', label: 'Monitored (Passive)' },
                  { value: 'flagged', label: 'Flagged High Risk' },
                  { value: 'cold', label: 'Cold Lead' },
                  { value: 'archived', label: 'Archived Dossier' },
                ]}
              />

              <AstryxSelect
                label="Priority Level"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TargetPriority)}
                options={[
                  { value: 'critical', label: 'Priority 1 - Critical' },
                  { value: 'high', label: 'Priority 2 - High' },
                  { value: 'medium', label: 'Priority 3 - Medium' },
                  { value: 'low', label: 'Priority 4 - Low' },
                ]}
              />
            </div>

            {/* Corporate & Organizational Affiliations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AstryxInput
                label="Primary Organization"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. CyberSec Dynamics, Apex Holding"
              />
              <AstryxInput
                label="Known Location / Geo"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Geneva, Switzerland; Tallinn, Estonia"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AstryxInput
                label="Associated Companies (comma-separated)"
                value={companyInput}
                onChange={(e) => setCompanyInput(e.target.value)}
                placeholder="Apex Corp, Nexus Ltd, Vault Tech"
                hint="Used to construct link graph nodes and organizational bridges"
              />
              <AstryxInput
                label="Affiliated Groups / Syndicates (comma-separated)"
                value={groupInput}
                onChange={(e) => setGroupInput(e.target.value)}
                placeholder="RedCell, DarkNet Syndicate, FinSec Group"
                hint="Groups link multiple targets into shared clusters on graph view"
              />
            </div>

            {/* Social Media & Online Identity Handle Slots */}
            <div className="space-y-3 pt-2 border-t border-[#121d33]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-bold text-slate-200">
                    ONLINE HANDLE & PLATFORM SLOTS ({handles.length})
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    Add usernames, email addresses, crypto wallets, or website handles.
                  </p>
                </div>
                <AstryxButton
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={addHandleSlot}
                >
                  Add Slot
                </AstryxButton>
              </div>

              <div className="space-y-2">
                {handles.map((slot) => {
                  return (
                    <div
                      key={slot.id}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-lg border border-[#16233b] bg-[#070b14]"
                    >
                      <div className="w-full sm:w-40">
                        <AstryxSelect
                          value={slot.platform}
                          onChange={(e) =>
                            updateHandleSlot(slot.id, {
                              platform: e.target.value as SocialPlatform,
                            })
                          }
                          options={Object.entries(PLATFORM_REGISTRY).map(([key, val]) => ({
                            value: key,
                            label: val.name,
                          }))}
                        />
                      </div>

                      {slot.platform === 'custom' && (
                        <div className="w-full sm:w-32">
                          <AstryxInput
                            value={slot.customLabel || ''}
                            onChange={(e) =>
                              updateHandleSlot(slot.id, { customLabel: e.target.value })
                            }
                            placeholder="Label (e.g. Keybase)"
                          />
                        </div>
                      )}

                      <div className="flex-1">
                        <AstryxInput
                          value={slot.value}
                          onChange={(e) =>
                            updateHandleSlot(slot.id, { value: e.target.value })
                          }
                          placeholder={PLATFORM_REGISTRY[slot.platform]?.placeholder || 'Handle / Username / Identifier'}
                        />
                      </div>

                      <div className="w-full sm:w-32">
                        <AstryxSelect
                          value={slot.verified}
                          onChange={(e) =>
                            updateHandleSlot(slot.id, {
                              verified: e.target.value as 'verified' | 'suspected' | 'impersonator',
                            })
                          }
                          options={[
                            { value: 'verified', label: 'Verified' },
                            { value: 'suspected', label: 'Suspected' },
                            { value: 'impersonator', label: 'Impersonator' },
                          ]}
                        />
                      </div>

                      <AstryxButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 className="w-4 h-4 text-slate-500 hover:text-rose-400" />}
                        onClick={() => removeHandleSlot(slot.id)}
                        aria-label="Remove Slot"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Target Relationships (Cross-Target Links) */}
            {existingTargets.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-[#121d33]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-mono font-bold text-slate-200">
                      ENTITY RELATIONSHIPS ({relationships.length})
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400">
                      Link this dossier directly to other recorded targets on the graph.
                    </p>
                  </div>
                  <AstryxButton
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={addRelationship}
                  >
                    Link Entity
                  </AstryxButton>
                </div>

                <div className="space-y-2">
                  {relationships.map((rel) => (
                    <div
                      key={rel.id}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-lg border border-[#16233b] bg-[#070b14]"
                    >
                      <div className="flex-1">
                        <AstryxSelect
                          value={rel.targetId}
                          onChange={(e) => {
                            const found = existingTargets.find((t) => t.id === e.target.value);
                            setRelationships(
                              relationships.map((r) =>
                                r.id === rel.id
                                  ? {
                                      ...r,
                                      targetId: e.target.value,
                                      targetName: found?.alias || 'Unknown',
                                    }
                                  : r
                              )
                            );
                          }}
                          options={existingTargets
                            .filter((t) => t.id !== initialTarget?.id)
                            .map((t) => ({
                              value: t.id,
                              label: `${t.alias} (${t.category})`,
                            }))}
                        />
                      </div>

                      <div className="w-full sm:w-52">
                        <AstryxSelect
                          value={rel.relationshipType}
                          onChange={(e) => {
                            setRelationships(
                              relationships.map((r) =>
                                r.id === rel.id
                                  ? {
                                      ...r,
                                      relationshipType: e.target.value as RelationshipType,
                                    }
                                  : r
                              )
                            );
                          }}
                          options={[
                            { value: 'collaborator', label: 'Collaborator' },
                            { value: 'member_of', label: 'Member Of' },
                            { value: 'operates', label: 'Operates' },
                            { value: 'aliases_as', label: 'Aliases As' },
                            { value: 'parent_company_of', label: 'Parent Company Of' },
                            { value: 'shared_infrastructure', label: 'Shared Infrastructure' },
                            { value: 'reported_associate', label: 'Reported Associate' },
                          ]}
                        />
                      </div>

                      <AstryxButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 className="w-4 h-4 text-slate-500 hover:text-rose-400" />}
                        onClick={() => removeRelationship(rel.id)}
                        aria-label="Remove Relationship"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chronology & Timeline Events */}
            <div className="space-y-3 pt-2 border-t border-[#121d33]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-bold text-slate-200">
                    CHRONOLOGY &amp; TIMELINE ({timeline.length})
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    Log timestamped intelligence sightings, domain registrations, or incidents.
                  </p>
                </div>
                <AstryxButton
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={addTimelineEvent}
                >
                  Add Event
                </AstryxButton>
              </div>

              {timeline.length > 0 && (
                <div className="space-y-2">
                  {timeline.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-lg border border-[#16233b] bg-[#070b14]"
                    >
                      <div className="w-full sm:w-36">
                        <AstryxInput
                          type="date"
                          value={item.date}
                          onChange={(e) =>
                            updateTimelineEvent(item.id, { date: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <AstryxInput
                          value={item.event}
                          onChange={(e) =>
                            updateTimelineEvent(item.id, { event: e.target.value })
                          }
                          placeholder="Observed activity or intelligence event..."
                        />
                      </div>
                      <div className="w-full sm:w-40">
                        <AstryxInput
                          value={item.source || ''}
                          onChange={(e) =>
                            updateTimelineEvent(item.id, { source: e.target.value })
                          }
                          placeholder="Source (optional)"
                        />
                      </div>
                      <AstryxButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 className="w-4 h-4 text-slate-500 hover:text-rose-400" />}
                        onClick={() => removeTimelineEvent(item.id)}
                        aria-label="Remove Timeline Event"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tags & Metadata */}
            <div className="space-y-3 pt-2 border-t border-[#121d33]">
              <AstryxInput
                label="Tags & Classifiers (comma-separated)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="apt29, financial_fraud, vip, ransomware, crypto_launderer"
                hint="Use tags to categorize investigation targets across multiple vectors"
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-slate-300">
                  Forensic Notes & Intelligence Summary
                </label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record investigative findings, operational history, observed aliases, or verified associations..."
                  className="w-full px-3 py-2 rounded-md font-mono text-xs bg-[#070b14] border border-[#16233b] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40"
                />
              </div>
            </div>
          </AstryxCardBody>

          <AstryxCardFooter className="flex items-center justify-between border-t border-[#121d33] pt-4 mt-4">
            <AstryxButton
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </AstryxButton>

            <AstryxButton
              type="submit"
              variant="primary"
              loading={isSubmitting}
              icon={<Save className="w-4 h-4" />}
            >
              Save Target Dossier
            </AstryxButton>
          </AstryxCardFooter>
        </form>
      </AstryxCard>
    </div>
  );
}
