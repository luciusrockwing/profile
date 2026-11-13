'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Tag,
  X,
  RotateCcw,
} from 'lucide-react';
import { OsintTarget, TargetCategory, TargetStatus } from '@/lib/osint-types';
import { TargetCard } from './TargetCard';
import { filterTargets } from '@/lib/osint-engine';
import { AstryxButton } from './astryx/Button';
import { AstryxBadge } from './astryx/Badge';
import { AstryxInput } from './astryx/Input';
import { AstryxSelect } from './astryx/Select';

interface ProfilesDashboardProps {
  targets: OsintTarget[];
  onSelectTarget: (target: OsintTarget) => void;
  onEditTarget: (target: OsintTarget) => void;
  onDeleteTarget: (id: string) => void;
  onAddNew: () => void;
}

export function ProfilesDashboard({
  targets,
  onSelectTarget,
  onEditTarget,
  onDeleteTarget,
  onAddNew,
}: ProfilesDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TargetCategory | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<TargetStatus | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [sortBy, setSortBy] = useState<'priority' | 'updated' | 'alias'>('updated');

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    targets.forEach((t) => t.tags.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet);
  }, [targets]);

  // Filtered targets
  const filtered = useMemo(() => {
    const result = filterTargets(targets, {
      query: searchQuery,
      category: selectedCategory,
      status: selectedStatus,
      tag: selectedTag || undefined,
    });

    // Sorting
    return result.sort((a, b) => {
      if (sortBy === 'alias') return a.alias.localeCompare(b.alias);
      if (sortBy === 'priority') {
        const pOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [targets, searchQuery, selectedCategory, selectedStatus, selectedTag, sortBy]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedTag('');
  };

  const hasActiveFilters =
    searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedTag;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#090e18] border border-[#121d33]">
        <div>
          <h2 className="text-base font-mono font-bold text-slate-100 flex items-center space-x-2">
            <span>TARGET INVESTIGATION DOSSIERS</span>
            <AstryxBadge variant="subtle" color="cyan">
              {filtered.length} OF {targets.length} DOSSIERS
            </AstryxBadge>
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Browse active intelligence files, inspect identified handle slots, and manage corporate associations
          </p>
        </div>

        <AstryxButton
          variant="primary"
          icon={<UserPlus className="w-4 h-4" />}
          onClick={onAddNew}
        >
          Add New Target
        </AstryxButton>
      </div>

      {/* Search & Filter Controls Toolbar */}
      <div className="p-4 rounded-xl bg-[#070b14] border border-[#121d33] space-y-3 font-mono text-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <div className="flex-1">
            <AstryxInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by alias, real name, handle (@username), company, email..."
              leftIcon={<Search className="w-4 h-4 text-slate-500" />}
              actionSlot={
                searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : undefined
              }
            />
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-44">
            <AstryxSelect
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as TargetCategory | 'all')}
              options={[
                { value: 'all', label: 'All Categories' },
                { value: 'individual', label: 'Individual' },
                { value: 'company', label: 'Company / Corporate' },
                { value: 'syndicate', label: 'Syndicate / Group' },
                { value: 'asset', label: 'Asset / Infrastructure' },
                { value: 'unknown', label: 'Unknown' },
              ]}
            />
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-40">
            <AstryxSelect
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as TargetStatus | 'all')}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'surveillance', label: 'Surveillance' },
                { value: 'monitored', label: 'Monitored' },
                { value: 'flagged', label: 'Flagged' },
                { value: 'cold', label: 'Cold' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
          </div>

          {/* Sort By */}
          <div className="w-full md:w-36">
            <AstryxSelect
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'priority' | 'updated' | 'alias')}
              options={[
                { value: 'updated', label: 'Sort: Recent' },
                { value: 'priority', label: 'Sort: Priority' },
                { value: 'alias', label: 'Sort: Alias A-Z' },
              ]}
            />
          </div>

          {hasActiveFilters && (
            <AstryxButton
              variant="outline"
              size="md"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={clearFilters}
              title="Reset all search filters"
            >
              Reset
            </AstryxButton>
          )}
        </div>

        {/* Quick Tag Filter Bar */}
        {allTags.length > 0 && (
          <div className="flex items-center space-x-2 pt-2 border-t border-[#121d33] overflow-x-auto pb-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide shrink-0">
              Filter by Tag:
            </span>
            <button
              onClick={() => setSelectedTag('')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors shrink-0 ${
                selectedTag === ''
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono transition-colors shrink-0 border ${
                  selectedTag === tag
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60 font-semibold'
                    : 'bg-[#090e18] text-slate-400 hover:text-slate-200 border-[#16233b]'
                }`}
              >
                <Tag className="w-2.5 h-2.5 text-slate-500" />
                <span>{tag}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Targets Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-[#070b14] border border-[#121d33] space-y-3 font-mono">
          <p className="text-slate-400 text-sm">No target investigation dossiers match active filters.</p>
          {hasActiveFilters && (
            <AstryxButton variant="secondary" size="sm" onClick={clearFilters}>
              Clear Active Filters
            </AstryxButton>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((target) => (
            <TargetCard
              key={target.id}
              target={target}
              onSelect={onSelectTarget}
              onEdit={onEditTarget}
              onDelete={onDeleteTarget}
            />
          ))}
        </div>
      )}
    </div>
  );
}
