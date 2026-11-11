'use client';

import React from 'react';

export interface AstryxCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'subtle' | 'interactive';
  hoverable?: boolean;
}

export function AstryxCard({
  children,
  variant = 'default',
  hoverable = false,
  className = '',
  ...props
}: AstryxCardProps) {
  const isInteractive = hoverable || variant === 'interactive';

  const variantStyles = {
    default: 'bg-[#090e18] border border-[#121d33] text-slate-100',
    elevated:
      'bg-[#0d1424] border border-[#16233b] shadow-lg shadow-black/40 text-slate-100',
    subtle: 'bg-[#070b14] border border-[#121d33] text-slate-200',
    interactive:
      'bg-[#090e18] border border-[#121d33] hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-950/20 transition-all duration-200 text-slate-100',
  };

  const activeVariant = isInteractive ? 'interactive' : variant;

  return (
    <div
      className={`rounded-lg ${variantStyles[activeVariant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface AstryxCardHeaderProps {
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function AstryxCardHeader({
  children,
  title,
  subtitle,
  action,
  className = '',
}: AstryxCardHeaderProps) {
  if (title || subtitle || action) {
    return (
      <div
        className={`px-4 py-3.5 border-b border-[#121d33] flex items-center justify-between gap-3 ${className}`}
      >
        <div className="min-w-0">
          {title && (
            <h3 className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider truncate">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="font-mono text-[11px] text-slate-400 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
        {children}
      </div>
    );
  }

  return (
    <div
      className={`px-4 py-3 border-b border-[#121d33] flex items-center justify-between ${className}`}
    >
      {children}
    </div>
  );
}

export function AstryxCardBody({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

export function AstryxCardFooter({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`px-4 py-3 border-t border-[#121d33] flex items-center justify-between bg-[#060a12]/40 ${className}`}
    >
      {children}
    </div>
  );
}
