'use client';

import React from 'react';
import { X } from 'lucide-react';
import { FOCUS_RING } from './tokens';

export interface AstryxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AstryxDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className = '',
}: AstryxDrawerProps) {
  if (!isOpen) return null;

  return (
    <div
      role="region"
      aria-label="Entity Inspector Panel"
      className={`absolute top-28 md:top-16 right-4 bottom-16 z-30 w-80 sm:w-96 bg-[#0a0e18]/95 backdrop-blur-md border border-cyan-500/40 rounded-xl shadow-2xl p-4 overflow-hidden flex flex-col justify-between ${className}`}
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Drawer Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
          <div className="min-w-0 pr-2">
            <h4 className="font-mono font-bold text-slate-100 text-base truncate">
              {title}
            </h4>
            {subtitle && (
              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className={`text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800 transition-colors shrink-0 ${FOCUS_RING}`}
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">{children}</div>

        {/* Drawer Footer */}
        {footer && (
          <div className="pt-3 mt-3 border-t border-slate-800 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
