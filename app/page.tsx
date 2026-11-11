'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, ActiveTab } from '@/components/Navbar';
import { EntityGraphView } from '@/components/EntityGraphView';
import { ProfilesDashboard } from '@/components/ProfilesDashboard';
import { TargetForm } from '@/components/TargetForm';
import { DossierModal } from '@/components/DossierModal';
import { ReportsView } from '@/components/ReportsView';
import { DataManagementView } from '@/components/DataManagementView';
import { OsintTarget } from '@/lib/osint-types';
import { INITIAL_TARGETS } from '@/lib/seed-data';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('graph');
  const [targets, setTargets] = useState<OsintTarget[]>(INITIAL_TARGETS);
  const [selectedTarget, setSelectedTarget] = useState<OsintTarget | null>(null);
  const [editingTarget, setEditingTarget] = useState<OsintTarget | null>(null);

  // Sync targets with server-side database
  useEffect(() => {
    let isMounted = true;
    fetch('/api/profiles')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && Array.isArray(data?.targets) && data.targets.length > 0) {
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

      setTargets((prev) => {
        const existingIdx = prev.findIndex((t) => t.id === savedTarget.id);
        const updated =
          existingIdx >= 0
            ? prev.map((t) => (t.id === savedTarget.id ? savedTarget : t))
            : [savedTarget, ...prev];
        try {
          localStorage.setItem('specter_osint_targets', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });

      setEditingTarget(null);
      setActiveTab('profiles');
    } catch (err) {
      console.error('Save error:', err);
      throw err;
    }
  };

  // Delete Target
  const handleDeleteTarget = async (id: string) => {
    const targetToDelete = targets.find((t) => t.id === id);
    const targetName = targetToDelete?.alias || 'this target';
    if (!confirm(`Are you sure you want to permanently delete dossier "${targetName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/profiles?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete target');
      }

      setTargets((prev) => {
        const updated = prev.filter((t) => t.id !== id);
        try {
          localStorage.setItem('specter_osint_targets', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });

      if (selectedTarget?.id === id) {
        setSelectedTarget(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete target profile.');
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
    setTargets(data.targets || INITIAL_TARGETS);
    try {
      localStorage.setItem('specter_osint_targets', JSON.stringify(data.targets || INITIAL_TARGETS));
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
    setTargets(data.targets || newTargets);
    try {
      localStorage.setItem('specter_osint_targets', JSON.stringify(data.targets || newTargets));
    } catch {
      // ignore
    }
  };

  // Aggregate metrics
  const uniqueCompanies = new Set<string>();
  let totalHandlesCount = 0;
  targets.forEach((t) => {
    t.companies.forEach((c) => uniqueCompanies.add(c));
    totalHandlesCount += t.handles.length;
  });

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'new') setEditingTarget(null);
        }}
        targetCount={targets.length}
        companyCount={uniqueCompanies.size}
        handleCount={totalHandlesCount}
      />

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
                onDeleteTarget={handleDeleteTarget}
                onAddNew={() => {
                  setEditingTarget(null);
                  setActiveTab('new');
                }}
              />
            )}

            {/* Add / Edit Target Form */}
            {activeTab === 'new' && (
              <TargetForm
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
    </div>
  );
}
