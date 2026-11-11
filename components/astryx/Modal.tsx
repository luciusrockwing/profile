'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { FOCUS_RING } from './tokens';

export interface AstryxModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export function AstryxModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  actions,
  footer,
  maxWidth,
  size,
}: AstryxModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resolvedSize = size === 'sm' ? 'md' : size || maxWidth || '2xl';

  const maxWidthClasses = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className={`relative w-full ${maxWidthClasses[resolvedSize]} bg-[#090e18] border border-[#16233b] rounded-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col`}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#070b14] border-b border-[#121d33] flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-3">
            <h3 className="font-mono font-bold text-slate-100 text-sm sm:text-base truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs font-mono text-slate-400 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            {actions}
            <button
              onClick={onClose}
              className={`p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-[#121d33] transition-colors ${FOCUS_RING}`}
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-3 bg-[#060a12] border-t border-[#121d33] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
