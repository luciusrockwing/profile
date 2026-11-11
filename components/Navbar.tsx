'use client';

import React from 'react';
import {
  Network,
  Users,
  UserPlus,
  FileText,
  HardDrive,
  ShieldCheck,
} from 'lucide-react';
import { AstryxButton } from './astryx/Button';
import { AstryxBadge } from './astryx/Badge';

export type ActiveTab = 'graph' | 'profiles' | 'new' | 'reports' | 'data';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  targetCount: number;
  companyCount: number;
  handleCount: number;
}

export function Navbar({
  activeTab,
  setActiveTab,
  targetCount,
  companyCount,
  handleCount,
}: NavbarProps) {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'graph', label: 'Entity Graph', icon: <Network className="w-4 h-4" /> },
    { id: 'profiles', label: 'Dossiers', icon: <Users className="w-4 h-4" /> },
    { id: 'reports', label: 'Forensic Reports', icon: <FileText className="w-4 h-4" /> },
    { id: 'data', label: 'Storage & DB', icon: <HardDrive className="w-4 h-4" /> },
  ];

  return (
    <header className="border-b border-[#121d33] bg-[#070b14]/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Astryx Brand Mark */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-500/10">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold tracking-wider text-slate-100 text-sm sm:text-base">
                  SPECTER <span className="text-cyan-400 font-normal">/</span> OSINT
                </span>
                <AstryxBadge variant="hairline" color="emerald" dot>
                  ZERO-BLOB
                </AstryxBadge>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
                Astryx Cyber Engine • Direct-Link Client Architecture
              </p>
            </div>
          </div>

          {/* Astryx Live Telemetry Bar */}
          <div className="hidden lg:flex items-center space-x-5 text-xs font-mono text-slate-400 border-l border-r border-[#121d33] px-4">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500">TARGETS:</span>
              <span className="text-cyan-400 font-semibold tabular-nums">{targetCount}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500">CORPS:</span>
              <span className="text-amber-400 font-semibold tabular-nums">{companyCount}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500">SLOTS:</span>
              <span className="text-emerald-400 font-semibold tabular-nums">{handleCount}</span>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-2">
            <nav className="flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors relative ${
                      isActive
                        ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#0e1626] border border-transparent'
                    }`}
                    aria-label={item.label}
                  >
                    <span className={isActive ? 'text-cyan-400' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Quick Action Button using AstryxButton */}
            <AstryxButton
              variant={activeTab === 'new' ? 'primary' : 'outline'}
              size="sm"
              icon={<UserPlus className="w-3.5 h-3.5" />}
              onClick={() => setActiveTab('new')}
              aria-label="Add New OSINT Target"
            >
              <span className="font-mono font-medium">+ Add Target</span>
            </AstryxButton>
          </div>
        </div>
      </div>
    </header>
  );
}
