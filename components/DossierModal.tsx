'use client';

import React, { useState } from 'react';
import {
  ExternalLink,
  Shield,
  Building,
  Users,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  FileDown,
  Edit2,
  MapPin,
  Tag,
  Lock,
} from 'lucide-react';
import { OsintTarget } from '@/lib/osint-types';
import { AstryxAvatar } from './astryx/Avatar';
import { AstryxBadge } from './astryx/Badge';
import { AstryxButton } from './astryx/Button';
import { AstryxModal } from './astryx/Modal';
import {
  AstryxTable,
  AstryxTableHeader,
  AstryxTableBody,
  AstryxTableRow,
  AstryxTableCell,
  AstryxTableHeadCell,
} from './astryx/Table';
import {
  formatPlatformUrl,
  generateForensicChecksum,
  generateDossierReport,
  PLATFORM_REGISTRY,
} from '@/lib/osint-engine';

interface DossierModalProps {
  target: OsintTarget;
  onClose: () => void;
  onEdit: (target: OsintTarget) => void;
}

export function DossierModal({ target, onClose, onEdit }: DossierModalProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  const checksum = generateForensicChecksum(target);

  const copyChecksum = () => {
    navigator.clipboard.writeText(checksum);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const copyFullReport = () => {
    const report = generateDossierReport(target);
    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const downloadReport = () => {
    const report = generateDossierReport(target);
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DOSSIER_${target.alias.toUpperCase().replace(/[^A-Z0-9]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AstryxModal
      isOpen={true}
      onClose={onClose}
      size="xl"
      title={`CLASSIFIED DOSSIER // ${target.alias}`}
      subtitle={`ID: ${target.id} • ZERO-BLOB STORAGE RECORD`}
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Forensic Checksum:</span>
            <button
              onClick={copyChecksum}
              className="text-cyan-400 hover:text-cyan-300 font-mono text-[11px] underline flex items-center space-x-1"
              title="Click to copy SHA-256 fingerprint"
            >
              <span>{checksum.slice(0, 16)}...</span>
              {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <AstryxButton
              variant="outline"
              size="sm"
              icon={copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              onClick={copyFullReport}
            >
              {copiedReport ? 'Copied' : 'Copy Plaintext'}
            </AstryxButton>

            <AstryxButton
              variant="outline"
              size="sm"
              icon={<FileDown className="w-3.5 h-3.5" />}
              onClick={downloadReport}
            >
              Download TXT
            </AstryxButton>

            <AstryxButton
              variant="primary"
              size="sm"
              icon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => onEdit(target)}
            >
              Edit Dossier
            </AstryxButton>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Profile Summary Card */}
        <div className="p-4 rounded-lg border border-[#16233b] bg-[#070b14] flex flex-col md:flex-row gap-5 items-start">
          <AstryxAvatar
            src={target.avatarUrl}
            alt={target.alias}
            category={target.category}
            status={target.status}
            size="xl"
          />

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-xl font-bold text-slate-100">
                {target.alias}
              </h2>
              <AstryxBadge variant="subtle" color="cyan">
                {target.category.toUpperCase()}
              </AstryxBadge>
              <AstryxBadge variant="hairline" color="emerald" dot>
                {target.status.toUpperCase()}
              </AstryxBadge>
              <AstryxBadge variant="subtle" color="amber">
                PRIORITY: {target.priority.toUpperCase()}
              </AstryxBadge>
            </div>

            {target.realName ? (
              <p className="font-mono text-sm text-slate-300">
                Real Identity: <span className="text-slate-100 font-semibold">{target.realName}</span>
              </p>
            ) : (
              <p className="font-mono text-xs text-slate-500 italic">
                [True legal identity remains unconfirmed]
              </p>
            )}

            {/* Target Direct Link Info */}
            <div className="pt-2 text-[11px] font-mono text-slate-400 space-y-1">
              {target.avatarUrl && (
                <div className="flex items-center space-x-1.5 truncate">
                  <span className="text-slate-500">Avatar URL:</span>
                  <a
                    href={target.avatarUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-cyan-400 hover:underline truncate"
                  >
                    {target.avatarUrl}
                  </a>
                  <span className="text-[10px] text-emerald-400 shrink-0">(Direct Browser Link)</span>
                </div>
              )}
              <div className="flex items-center space-x-4 text-slate-500">
                <span>Created: {new Date(target.createdAt).toLocaleString()}</span>
                <span>Updated: {new Date(target.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Affiliation Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-lg border border-[#16233b] bg-[#070b14] space-y-2">
            <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Affiliations & Organization</span>
            </h4>
            <div className="text-xs font-mono space-y-1.5">
              <div className="flex justify-between border-b border-[#121d33] pb-1">
                <span className="text-slate-500">Organization:</span>
                <span className="text-slate-200 font-medium">{target.organization || 'None declared'}</span>
              </div>
              <div className="flex justify-between border-b border-[#121d33] pb-1">
                <span className="text-slate-500">Companies:</span>
                <span className="text-slate-200">{target.companies.length > 0 ? target.companies.join(', ') : 'None'}</span>
              </div>
              <div className="flex justify-between border-b border-[#121d33] pb-1">
                <span className="text-slate-500">Syndicates / Groups:</span>
                <span className="text-slate-200">{target.groups.length > 0 ? target.groups.join(', ') : 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Location:</span>
                <span className="text-slate-200">{target.location || 'Unknown / Global'}</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-[#16233b] bg-[#070b14] space-y-2">
            <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Tag className="w-3.5 h-3.5" />
              <span>Classification Tags & Indicators</span>
            </h4>
            {target.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {target.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center text-xs font-mono px-2 py-0.5 rounded border border-[#1e2d4d] bg-[#0c1424] text-cyan-300"
                  >
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-slate-500 italic">No classifier tags assigned.</p>
            )}
          </div>
        </div>

        {/* Identified Handle Slots Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              Identified Handle Slots ({target.handles.length})
            </h4>
            <span className="text-[10px] font-mono text-slate-500">
              Direct external endpoints
            </span>
          </div>

          {target.handles.length === 0 ? (
            <div className="p-4 rounded-lg border border-[#16233b] bg-[#070b14] text-xs font-mono text-slate-500 text-center">
              No handle slots recorded for this entity.
            </div>
          ) : (
            <AstryxTable>
              <AstryxTableHeader>
                <AstryxTableRow>
                  <AstryxTableHeadCell>Platform</AstryxTableHeadCell>
                  <AstryxTableHeadCell>Handle / Identifier</AstryxTableHeadCell>
                  <AstryxTableHeadCell>Verification</AstryxTableHeadCell>
                  <AstryxTableHeadCell className="text-right">Action</AstryxTableHeadCell>
                </AstryxTableRow>
              </AstryxTableHeader>
              <AstryxTableBody>
                {target.handles.map((slot) => {
                  const url = formatPlatformUrl(slot.platform, slot.value);
                  const platformMeta = PLATFORM_REGISTRY[slot.platform];
                  return (
                    <AstryxTableRow key={slot.id}>
                      <AstryxTableCell className="text-cyan-400 font-semibold uppercase">
                        {platformMeta?.name || slot.platform}
                      </AstryxTableCell>
                      <AstryxTableCell className="text-slate-100 font-medium">
                        {slot.value}
                      </AstryxTableCell>
                      <AstryxTableCell>
                        {slot.verified === 'verified' ? (
                          <AstryxBadge variant="hairline" color="emerald" dot>
                            VERIFIED
                          </AstryxBadge>
                        ) : slot.verified === 'impersonator' ? (
                          <AstryxBadge variant="hairline" color="rose" dot>
                            IMPERSONATOR
                          </AstryxBadge>
                        ) : (
                          <AstryxBadge variant="hairline" color="amber">
                            SUSPECTED
                          </AstryxBadge>
                        )}
                      </AstryxTableCell>
                      <AstryxTableCell className="text-right">
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center space-x-1 text-xs font-mono text-cyan-400 hover:text-cyan-300 underline"
                          >
                            <span>Open URL</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-slate-600 font-mono">No direct URL</span>
                        )}
                      </AstryxTableCell>
                    </AstryxTableRow>
                  );
                })}
              </AstryxTableBody>
            </AstryxTable>
          )}
        </div>

        {/* Notes & Intelligence Summary */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            Investigative Notes
          </h4>
          <div className="p-3.5 rounded-lg border border-[#16233b] bg-[#070b14] font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
            {target.notes || 'No investigative notes recorded.'}
          </div>
        </div>
      </div>
    </AstryxModal>
  );
}
