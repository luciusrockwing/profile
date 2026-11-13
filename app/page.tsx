'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Navbar, ActiveTab } from '@/components/Navbar';
import { EntityGraphView } from '@/components/EntityGraphView';
import { ProfilesDashboard } from '@/components/ProfilesDashboard';
import { TargetForm } from '@/components/TargetForm';
import { DossierModal } from '@/components/DossierModal';
import { ReportsView } from '@/components/ReportsView';
import { DataManagementView } from '@/components/DataManagementView';
import { AstryxModal } from '@/components/astryx/Modal';
import { AstryxButton } from '@/components/astryx/Button';
import { OsintTarget } from '@/lib/osint-types';
import { INITIAL_TARGETS } from '@/lib/seed-data';
import {
  removeTargetAndCleanRelationships,
  syncRelationshipTargetNames,
} from '@/lib/osint-engine';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('graph');
  const [targets, setTargets] = useState<OsintTarget[]>(INITIAL_TARGETS);
  const [selectedTarget, setSelectedTarget] = useState<OsintTarget | null>(null);
  const [editingTarget, setEditingTarget] = useState<OsintTarget | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<OsintTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Sync targets with server-side database
  useEffect(() => {
    let isMounted = true;
    fetch('/api/profiles')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && Array.isArray(data?.targets)) {
          setTargets(data.targets);
          try {
            localStorage.setItem('specter_osint_targets', JSON.stringify(data.targets));
          } catch {
            // ignore
          }
        }
      })
      .catch((err) => {
        console.error('API fetch error, falling back to cached local storage:', err);
        if (!isMounted) return;
        try {
          const cached = localStorage.getItem('specter_osint_targets');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              setTargets(parsed);
            }
          }
        } catch {
          // ignore
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Save (Create or Update) Target
  const handleSaveTarget = async (target: OsintTarget) => {
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save profile');
      }

      const data = await res.json();
      const savedTarget: OsintTarget = data.target || target;

      if (Array.isArray(data.targets)) {
        setTargets(data.targets);
        try {
          localStorage.setItem('specter_osint_targets', JSON.stringify(data.targets));
        } catch {
          // ignore
        }
      } else {
        setTargets((prev) => {
          const existingIdx = prev.findIndex((t) => t.id === savedTarget.id);
          const replaced =
            existingIdx >= 0
              ? prev.map((t) => (t.id === savedTarget.id ? savedTarget : t))
              : [savedTarget, ...prev];
          const updated = syncRelationshipTargetNames(replaced, savedTarget);
          try {
            localStorage.setItem('specter_osint_targets', JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        });
      }

      setEditingTarget(null);
      setActiveTab('profiles');
    } catch (err) {
      console.error('Save error:', err);
      throw err;
    }
  };

  // Prompt Delete Target via in-app modal (no window.confirm)
  const handleRequestDeleteTarget = (id: string) => {
    const targetToDelete = targets.find((t) => t.id === id);
    if (targetToDelete) {
      setDeleteCandidate(targetToDelete);
    }
  };

  const handleConfirmDeleteTarget = async () => {
    if (!deleteCandidate) return;
    const id = deleteCandidate.id;
    setIsDeleting(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/profiles?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete target');
      }

      const data = await res.json();
      if (Array.isArray(data.targets)) {
        setTargets(data.targets);
        try {
          localStorage.setItem('specter_osint_targets', JSON.stringify(data.targets));
        } catch {
          // ignore
        }
      } else {
        setTargets((prev) => {
          const updated = removeTargetAndCleanRelationships(prev, id);
          try {
            localStorage.setItem('specter_osint_targets', JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        });
      }

      if (selectedTarget?.id === id) {
        setSelectedTarget(null);
      }
      if (editingTarget?.id === id) {
        setEditingTarget(null);
      }
      setDeleteCandidate(null);
    } catch (err) {
      console.error('Delete error:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to delete target profile.');
      setDeleteCandidate(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset to default sample targets
  const handleResetDatabase = async () => {
    const res = await fetch('/api/profiles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    });

    if (!res.ok) {
      throw new Error('Failed to reset database');
    }

    const data = await res.json();
    const nextTargets = data.targets || INITIAL_TARGETS;
    setTargets(nextTargets);
    setSelectedTarget(null);
    setEditingTarget(null);
    try {
      localStorage.setItem('specter_osint_targets', JSON.stringify(nextTargets));
    } catch {
      // ignore
    }
  };

  // Import JSON backup
  const handleImportDatabase = async (newTargets: OsintTarget[]) => {
    const res = await fetch('/api/profiles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'import', targets: newTargets }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to import targets');
    }

    const data = await res.json();
    const nextTargets = data.targets || newTargets;
    setTargets(nextTargets);
    setSelectedTarget(null);
    setEditingTarget(null);
    try {
      localStorage.setItem('specter_osint_targets', JSON.stringify(nextTargets));
    } catch {
      // ignore
    }
  };

  // Aggregate metrics
  const uniqueCompanies = new Set<string>();
  let totalHandlesCount = 0;
  targets.forEach((t) => {
    t.companies.forEach((c) => {
      if (c.trim()) uniqueCompanies.add(c.trim());
    });
    totalHandlesCount += t.handles.length;
  });

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setEditingTarget(null);
        }}
        targetCount={targets.length}
        companyCount={uniqueCompanies.size}
        handleCount={totalHandlesCount}
      />

      {actionError && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
          <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-950/40 text-rose-300 font-mono text-xs flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-rose-400 hover:text-rose-200"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Front Page: Interactive Entity Graph Link View */}
        {activeTab === 'graph' && (
          <EntityGraphView
            targets={targets}
            onSelectTarget={(t) => setSelectedTarget(t)}
            onAddNewTarget={() => {
              setEditingTarget(null);
              setActiveTab('new');
            }}
          />
        )}

        {/* Target Profiles Dossiers Grid */}
        {activeTab === 'profiles' && (
          <ProfilesDashboard
            targets={targets}
            onSelectTarget={(t) => setSelectedTarget(t)}
            onEditTarget={(t) => {
              setEditingTarget(t);
              setActiveTab('new');
            }}
            onDeleteTarget={handleRequestDeleteTarget}
            onAddNew={() => {
              setEditingTarget(null);
              setActiveTab('new');
            }}
          />
        )}

        {/* Add / Edit Target Form */}
        {activeTab === 'new' && (
          <TargetForm
            key={editingTarget?.id || 'new'}
            initialTarget={editingTarget}
            existingTargets={targets}
            onSave={handleSaveTarget}
            onCancel={() => {
              setEditingTarget(null);
              setActiveTab('profiles');
            }}
          />
        )}

        {/* Forensic Reports Tab */}
        {activeTab === 'reports' && (
          <ReportsView
            targets={targets}
            onSelectTarget={(t) => setSelectedTarget(t)}
          />
        )}

        {/* Data & Storage Management Tab */}
        {activeTab === 'data' && (
          <DataManagementView
            targets={targets}
            onImport={handleImportDatabase}
            onReset={handleResetDatabase}
          />
        )}
      </main>

      {/* Target Dossier Inspection Modal */}
      {selectedTarget && (
        <DossierModal
          target={selectedTarget}
          onClose={() => setSelectedTarget(null)}
          onEdit={(t) => {
            setSelectedTarget(null);
            setEditingTarget(t);
            setActiveTab('new');
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <AstryxModal
        isOpen={!!deleteCandidate}
        onClose={() => !isDeleting && setDeleteCandidate(null)}
        size="md"
        title="CONFIRM DOSSIER DELETION"
        subtitle={deleteCandidate ? `TARGET: ${deleteCandidate.alias} (${deleteCandidate.id})` : undefined}
        footer={
          <div className="flex items-center justify-end space-x-2">
            <AstryxButton
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setDeleteCandidate(null)}
            >
              Cancel
            </AstryxButton>
            <AstryxButton
              variant="destructive"
              size="sm"
              loading={isDeleting}
              onClick={handleConfirmDeleteTarget}
            >
              Delete Permanently
            </AstryxButton>
          </div>
        }
      >
        <div className="flex items-start space-x-3 font-mono text-xs text-slate-300">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Permanently remove dossier <span className="text-slate-100 font-bold">{deleteCandidate?.alias}</span> and clean up any cross-target relationship links pointing to it? This action cannot be undone.
          </p>
        </div>
      </AstryxModal>
    </div>
  );
}
