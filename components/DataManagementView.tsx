'use client';

import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Server,
  Zap,
} from 'lucide-react';
import { OsintTarget } from '@/lib/osint-types';
import { AstryxButton } from './astryx/Button';
import { AstryxBadge } from './astryx/Badge';
import { AstryxCard, AstryxCardHeader, AstryxCardBody, AstryxCardFooter } from './astryx/Card';

interface DataManagementViewProps {
  targets: OsintTarget[];
  onImport: (newTargets: OsintTarget[]) => Promise<void>;
  onReset: () => Promise<void>;
}

export function DataManagementView({
  targets,
  onImport,
  onReset,
}: DataManagementViewProps) {
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Compute storage statistics
  const totalHandles = targets.reduce((acc, t) => acc + t.handles.length, 0);
  const totalCompanies = targets.reduce((acc, t) => acc + t.companies.length, 0);
  const totalGroups = targets.reduce((acc, t) => acc + t.groups.length, 0);

  // Approximate JSON byte size
  const jsonSizeEstimateBytes = new TextEncoder().encode(JSON.stringify(targets)).length;
  const jsonSizeKb = (jsonSizeEstimateBytes / 1024).toFixed(2);

  // Export JSON
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(targets, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `specter_osint_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage({
      type: 'success',
      text: `Successfully exported ${targets.length} target dossiers (${jsonSizeKb} KB).`,
    });
  };

  // Import JSON
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed)) {
        throw new Error('Imported JSON file must contain an array of target profiles.');
      }

      await onImport(parsed);
      setStatusMessage({
        type: 'success',
        text: `Successfully imported ${parsed.length} target profiles into database.`,
      });
    } catch (err: unknown) {
      console.error('Import failed:', err);
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Invalid JSON file format.',
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Trigger file dialog
  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  // Reset to default sample seed data
  const handleResetData = async () => {
    if (!confirm('Reset investigation database to factory seed targets? All custom target profiles will be overwritten.')) {
      return;
    }

    setIsResetting(true);
    try {
      await onReset();
      setStatusMessage({
        type: 'success',
        text: 'Database successfully re-seeded with factory intelligence profiles.',
      });
    } catch (err) {
      console.error('Reset error:', err);
      setStatusMessage({
        type: 'error',
        text: 'Failed to reset database.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-[#090e18] border border-[#121d33]">
        <div>
          <div className="flex items-center space-x-2">
            <HardDrive className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-mono font-bold text-slate-100">
              DATABASE & STORAGE EFFICIENCY MANAGEMENT
            </h2>
            <AstryxBadge variant="hairline" color="emerald" dot>
              OPTIMIZED
            </AstryxBadge>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Zero-binary server storage telemetry, portable JSON backups, and database re-seeding
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <AstryxButton
            variant="outline"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportJson}
          >
            Export Database (JSON)
          </AstryxButton>

          <AstryxButton
            variant="secondary"
            size="sm"
            icon={<Upload className="w-4 h-4" />}
            onClick={triggerImport}
          >
            Import Backup
          </AstryxButton>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            className="hidden"
          />
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-lg border font-mono text-xs flex items-center space-x-2 ${
            statusMessage.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
              : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Storage Architecture Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AstryxCard>
          <AstryxCardBody className="space-y-1">
            <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
              <span>TOTAL DOSSIERS</span>
              <HardDrive className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-mono font-bold text-slate-100 tabular-nums">
              {targets.length}
            </div>
            <p className="text-[10px] font-mono text-slate-400">
              Profiles registered
            </p>
          </AstryxCardBody>
        </AstryxCard>

        <AstryxCard>
          <AstryxCardBody className="space-y-1">
            <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
              <span>HANDLE SLOTS</span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-mono font-bold text-slate-100 tabular-nums">
              {totalHandles}
            </div>
            <p className="text-[10px] font-mono text-slate-400">
              Direct social/web slots
            </p>
          </AstryxCardBody>
        </AstryxCard>

        <AstryxCard>
          <AstryxCardBody className="space-y-1">
            <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
              <span>ORGANIZATIONS</span>
              <Server className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-mono font-bold text-slate-100 tabular-nums">
              {totalCompanies + totalGroups}
            </div>
            <p className="text-[10px] font-mono text-slate-400">
              Companies & syndicates
            </p>
          </AstryxCardBody>
        </AstryxCard>

        <AstryxCard>
          <AstryxCardBody className="space-y-1">
            <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
              <span>ESTIMATED PAYLOAD</span>
              <ShieldCheck className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-mono font-bold text-slate-100 tabular-nums">
              {jsonSizeKb} <span className="text-xs text-slate-400 font-normal">KB</span>
            </div>
            <p className="text-[10px] font-mono text-emerald-400">
              Zero binary storage
            </p>
          </AstryxCardBody>
        </AstryxCard>
      </div>

      {/* Architecture Explanation Card */}
      <AstryxCard>
        <AstryxCardHeader
          title="ZERO-STORAGE ARCHITECTURAL CONSTITUTION"
          subtitle="How this self-hosted OSINT platform preserves host resources and privacy"
        />
        <AstryxCardBody className="space-y-4 font-mono text-xs text-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-lg border border-[#16233b] bg-[#070b14] space-y-2">
              <span className="text-cyan-400 font-bold uppercase block text-xs">
                1. No Server Photo Storage
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                When you input an avatar image link, the server only records the raw string URL in the JSON document. No binary blobs, file uploads, or object storage buckets exist on the host server.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-[#16233b] bg-[#070b14] space-y-2">
              <span className="text-emerald-400 font-bold uppercase block text-xs">
                2. Direct Browser Image Fetching
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                The operator&apos;s web browser requests images directly from source endpoints with <code className="text-cyan-300">referrerPolicy=&quot;no-referrer&quot;</code>, ensuring no HTTP referer headers leak back to the target host.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-[#16233b] bg-[#070b14] space-y-2">
              <span className="text-amber-400 font-bold uppercase block text-xs">
                3. Lightweight Portability
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Because all profiles, handles, entities, and linkages are stored strictly as normalized structured text, thousands of target dossiers fit into a few hundred kilobytes for fast JSON exports and offline analysis.
              </p>
            </div>
          </div>
        </AstryxCardBody>

        <AstryxCardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#121d33] pt-4">
          <span className="text-xs font-mono text-slate-500">
            Database File: <code className="text-cyan-400">data/targets.json</code>
          </span>

          <AstryxButton
            variant="destructive"
            size="sm"
            loading={isResetting}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={handleResetData}
          >
            Reset DB to Seed Data
          </AstryxButton>
        </AstryxCardFooter>
      </AstryxCard>
    </div>
  );
}
