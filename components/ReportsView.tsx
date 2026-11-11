'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Copy,
  Check,
  FileDown,
  Shield,
  Lock,
} from 'lucide-react';
import { OsintTarget } from '@/lib/osint-types';
import { generateDossierReport, generateForensicChecksum } from '@/lib/osint-engine';
import { AstryxButton } from './astryx/Button';
import { AstryxSelect } from './astryx/Select';
import { AstryxBadge } from './astryx/Badge';
import { AstryxCard, AstryxCardHeader, AstryxCardBody, AstryxCardFooter } from './astryx/Card';

interface ReportsViewProps {
  targets: OsintTarget[];
  onSelectTarget: (target: OsintTarget) => void;
}

export function ReportsView({ targets, onSelectTarget }: ReportsViewProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    targets[0]?.id || ''
  );
  const [copied, setCopied] = useState(false);

  const selectedTarget = useMemo(() => {
    return targets.find((t) => t.id === selectedTargetId) || targets[0] || null;
  }, [targets, selectedTargetId]);

  const reportText = useMemo(() => {
    if (!selectedTarget) return 'No targets currently recorded.';
    return generateDossierReport(selectedTarget);
  }, [selectedTarget]);

  const checksum = useMemo(() => {
    if (!selectedTarget) return '';
    return generateForensicChecksum(selectedTarget);
  }, [selectedTarget]);

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!selectedTarget) return;
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OSINT_REPORT_${selectedTarget.alias.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-[#090e18] border border-[#121d33]">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-mono font-bold text-slate-100">
              FORENSIC INVESTIGATION REPORTS
            </h2>
            <AstryxBadge variant="hairline" color="emerald" dot>
              SHA-256 SIGNED
            </AstryxBadge>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Generate printable, cryptographic-checksummed intelligence briefs from stored target data
          </p>
        </div>

        {/* Target Select Dropdown */}
        <div className="flex items-center space-x-2 w-full sm:w-72">
          <AstryxSelect
            value={selectedTargetId}
            onChange={(e) => setSelectedTargetId(e.target.value)}
            options={targets.map((t) => ({
              value: t.id,
              label: `${t.alias} (${t.category.toUpperCase()} • ${t.status})`,
            }))}
          />
        </div>
      </div>

      {selectedTarget ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Quick Case Summary Card */}
          <div className="space-y-4">
            <AstryxCard>
              <AstryxCardHeader
                title="TARGET PROFILE SUMMARY"
                subtitle={`ALIAS: ${selectedTarget.alias}`}
              />
              <AstryxCardBody className="space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-[#121d33] pb-2">
                  <span className="text-slate-500">Legal Name:</span>
                  <span className="text-slate-200 font-medium">
                    {selectedTarget.realName || '[Unconfirmed]'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#121d33] pb-2">
                  <span className="text-slate-500">Category:</span>
                  <AstryxBadge variant="subtle" color="cyan">
                    {selectedTarget.category.toUpperCase()}
                  </AstryxBadge>
                </div>
                <div className="flex justify-between border-b border-[#121d33] pb-2">
                  <span className="text-slate-500">Status:</span>
                  <AstryxBadge variant="hairline" color="emerald" dot>
                    {selectedTarget.status.toUpperCase()}
                  </AstryxBadge>
                </div>
                <div className="flex justify-between border-b border-[#121d33] pb-2">
                  <span className="text-slate-500">Priority:</span>
                  <span className="text-amber-400 font-semibold">
                    {selectedTarget.priority.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#121d33] pb-2">
                  <span className="text-slate-500">Handle Slots:</span>
                  <span className="text-cyan-400 font-bold tabular-nums">
                    {selectedTarget.handles.length}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#121d33] pb-2">
                  <span className="text-slate-500">Organizations:</span>
                  <span className="text-slate-200">
                    {selectedTarget.organization || 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Companies:</span>
                  <span className="text-slate-200">
                    {selectedTarget.companies.length > 0 ? selectedTarget.companies.join(', ') : 'None'}
                  </span>
                </div>

                {/* Checksum display */}
                <div className="p-2.5 rounded border border-[#16233b] bg-[#070b14] mt-2 space-y-1">
                  <div className="flex items-center space-x-1 text-[10px] text-cyan-400">
                    <Lock className="w-3 h-3" />
                    <span>AUDIT HASH:</span>
                  </div>
                  <p className="text-[10px] text-slate-400 break-all select-all font-mono">
                    {checksum}
                  </p>
                </div>
              </AstryxCardBody>

              <AstryxCardFooter className="pt-3 border-t border-[#121d33]">
                <AstryxButton
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => onSelectTarget(selectedTarget)}
                >
                  Open Full Interactive Dossier
                </AstryxButton>
              </AstryxCardFooter>
            </AstryxCard>
          </div>

          {/* Right Column: Full Plaintext Report Preview */}
          <div className="lg:col-span-2">
            <AstryxCard>
              <AstryxCardHeader
                title="FORMATTED DOSSIER AUDIT BRIEF"
                subtitle="Deterministic plain text format • Suitable for offline archival"
                action={
                  <div className="flex items-center space-x-2">
                    <AstryxButton
                      variant="outline"
                      size="sm"
                      icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      onClick={handleCopy}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </AstryxButton>
                    <AstryxButton
                      variant="primary"
                      size="sm"
                      icon={<FileDown className="w-3.5 h-3.5" />}
                      onClick={handleDownload}
                    >
                      Download .TXT
                    </AstryxButton>
                  </div>
                }
              />
              <AstryxCardBody className="p-0">
                <pre className="p-4 bg-[#05080f] font-mono text-xs text-slate-300 overflow-x-auto max-h-[580px] leading-relaxed border-t border-[#121d33]">
                  {reportText}
                </pre>
              </AstryxCardBody>
            </AstryxCard>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-xl bg-[#070b14] border border-[#121d33] font-mono text-slate-500">
          No target profiles available to generate reports.
        </div>
      )}
    </div>
  );
}
