'use client';

import React from 'react';
import {
  ExternalLink,
  Shield,
  Building,
  Users as UsersIcon,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Edit2,
  Trash2,
  MapPin,
  Tag,
} from 'lucide-react';
import { OsintTarget, TargetStatus, TargetPriority } from '@/lib/osint-types';
import { AstryxAvatar } from './astryx/Avatar';
import { AstryxBadge } from './astryx/Badge';
import { AstryxButton } from './astryx/Button';
import { AstryxCard, AstryxCardBody, AstryxCardFooter } from './astryx/Card';
import { formatPlatformUrl, PLATFORM_REGISTRY } from '@/lib/osint-engine';

interface TargetCardProps {
  target: OsintTarget;
  onSelect: (target: OsintTarget) => void;
  onEdit: (target: OsintTarget) => void;
  onDelete: (id: string) => void;
  onQuickLink?: (target: OsintTarget) => void;
}

export function TargetCard({
  target,
  onSelect,
  onEdit,
  onDelete,
}: TargetCardProps) {
  const getStatusBadge = (status: TargetStatus) => {
    switch (status) {
      case 'active':
        return (
          <AstryxBadge variant="hairline" color="emerald" dot>
            ACTIVE
          </AstryxBadge>
        );
      case 'surveillance':
        return (
          <AstryxBadge variant="hairline" color="amber" dot>
            SURVEILLANCE
          </AstryxBadge>
        );
      case 'flagged':
        return (
          <AstryxBadge variant="hairline" color="rose" dot>
            FLAGGED
          </AstryxBadge>
        );
      case 'monitored':
        return (
          <AstryxBadge variant="hairline" color="cyan" dot>
            MONITORED
          </AstryxBadge>
        );
      case 'cold':
      case 'archived':
      default:
        return (
          <AstryxBadge variant="hairline" color="slate">
            {status.toUpperCase()}
          </AstryxBadge>
        );
    }
  };

  const getPriorityBadge = (priority: TargetPriority) => {
    switch (priority) {
      case 'critical':
        return (
          <AstryxBadge variant="subtle" color="rose">
            P-1 CRITICAL
          </AstryxBadge>
        );
      case 'high':
        return (
          <AstryxBadge variant="subtle" color="amber">
            P-2 HIGH
          </AstryxBadge>
        );
      case 'medium':
        return (
          <AstryxBadge variant="subtle" color="slate">
            P-3 MED
          </AstryxBadge>
        );
      case 'low':
      default:
        return (
          <AstryxBadge variant="unboxed" color="slate">
            P-4 LOW
          </AstryxBadge>
        );
    }
  };

  return (
    <AstryxCard hoverable className="flex flex-col justify-between group">
      <AstryxCardBody className="space-y-3.5">
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <AstryxAvatar
              src={target.avatarUrl}
              alt={target.alias}
              category={target.category}
              status={target.status}
              size="md"
            />
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => onSelect(target)}
                  className="font-mono font-bold text-slate-100 hover:text-cyan-400 cursor-pointer truncate text-base text-left transition-colors"
                  title="Click to view full dossier"
                >
                  {target.alias}
                </button>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border border-[#1e2d4d] bg-[#0c1424] text-slate-400">
                  {target.category}
                </span>
              </div>
              {target.realName ? (
                <p className="text-xs text-slate-400 font-mono truncate">
                  {target.realName}
                </p>
              ) : (
                <p className="text-xs text-slate-600 font-mono italic">
                  [Identity Unconfirmed]
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end space-y-1.5 shrink-0">
            {getStatusBadge(target.status)}
            {getPriorityBadge(target.priority)}
          </div>
        </div>

        {/* Affiliations & Geography */}
        <div className="space-y-1.5 text-xs font-mono text-slate-400 border-t border-b border-[#121d33] py-2.5">
          {target.organization && (
            <div className="flex items-center space-x-2 truncate">
              <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-slate-500">Org:</span>
              <span className="text-slate-200 font-medium truncate">
                {target.organization}
              </span>
            </div>
          )}

          {target.companies.length > 0 && (
            <div className="flex items-center space-x-2 truncate">
              <Building className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-500">Company:</span>
              <span className="text-slate-300 truncate">
                {target.companies.join(', ')}
              </span>
            </div>
          )}

          {target.groups.length > 0 && (
            <div className="flex items-center space-x-2 truncate">
              <UsersIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="text-slate-500">Group:</span>
              <span className="text-slate-300 truncate">
                {target.groups.join(', ')}
              </span>
            </div>
          )}

          {target.location && (
            <div className="flex items-center space-x-2 truncate">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-slate-500">Loc:</span>
              <span className="text-slate-300 truncate">{target.location}</span>
            </div>
          )}
        </div>

        {/* Identified Handle Slots */}
        <div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase tracking-wide mb-1.5">
            <span>Identified Slots ({target.handles.length})</span>
            {target.relationships.length > 0 && (
              <span className="text-cyan-400">
                {target.relationships.length} linked {target.relationships.length === 1 ? 'entity' : 'entities'}
              </span>
            )}
          </div>

          {target.handles.length === 0 ? (
            <p className="text-xs font-mono text-slate-600 italic">
              No slots recorded
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {target.handles.map((h) => {
                const url = formatPlatformUrl(h.platform, h.value);
                const platformMeta = PLATFORM_REGISTRY[h.platform];
                const shortLabel =
                  h.platform === 'custom'
                    ? h.customLabel || 'slot'
                    : h.platform.startsWith('crypto_')
                    ? h.platform.replace('crypto_', '')
                    : h.platform.slice(0, 4);
                return (
                  <div
                    key={h.id}
                    className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded border border-[#16233b] bg-[#070b14] text-xs font-mono group/slot hover:border-cyan-500/40 transition-colors"
                    title={`${platformMeta?.name || h.platform}: ${h.value} (${h.verified})`}
                  >
                    <span className="text-[10px] text-cyan-400 uppercase font-semibold">
                      {shortLabel}:
                    </span>
                    <span className="text-slate-300 max-w-[120px] truncate">
                      {h.value}
                    </span>
                    {h.verified === 'verified' ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-amber-400/80 shrink-0" />
                    )}

                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-slate-500 hover:text-cyan-300 shrink-0"
                        title={`Open direct link: ${url}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tags */}
        {target.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {target.tags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded border border-[#16233b] bg-[#0c1424] text-slate-400"
              >
                <Tag className="w-2.5 h-2.5 mr-1 text-slate-500" />
                {tag.startsWith('#') ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}
      </AstryxCardBody>

      {/* Card Actions Footer */}
      <AstryxCardFooter className="flex items-center justify-between border-t border-[#121d33] pt-3 mt-3">
        <AstryxButton
          variant="secondary"
          size="sm"
          icon={<FileText className="w-3.5 h-3.5" />}
          onClick={() => onSelect(target)}
          aria-label={`Inspect ${target.alias} Dossier`}
        >
          <span>Dossier</span>
        </AstryxButton>

        <div className="flex items-center space-x-1">
          <AstryxButton
            variant="ghost"
            size="sm"
            icon={<Edit2 className="w-3.5 h-3.5" />}
            onClick={() => onEdit(target)}
            aria-label={`Edit ${target.alias}`}
          />
          <AstryxButton
            variant="ghost"
            size="sm"
            icon={<Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-rose-400" />}
            onClick={() => onDelete(target.id)}
            aria-label={`Delete ${target.alias}`}
          />
        </div>
      </AstryxCardFooter>
    </AstryxCard>
  );
}
