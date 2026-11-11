'use client';

import React from 'react';

export type AstryxBadgeColor = 'emerald' | 'cyan' | 'amber' | 'rose' | 'slate' | 'purple';
export type AstryxBadgeVariant = 'hairline' | 'subtle' | 'unboxed';

export interface AstryxBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: AstryxBadgeVariant | AstryxBadgeColor;
  color?: AstryxBadgeColor;
  styleType?: AstryxBadgeVariant;
  hasDot?: boolean;
  dot?: boolean;
}

export function AstryxBadge({
  children,
  variant,
  color,
  styleType,
  hasDot,
  dot,
  className = '',
  ...props
}: AstryxBadgeProps) {
  // Normalize color and styleType
  let resolvedColor: AstryxBadgeColor = 'slate';
  let resolvedStyle: AstryxBadgeVariant = 'hairline';

  if (color) {
    resolvedColor = color;
  } else if (
    variant === 'emerald' ||
    variant === 'cyan' ||
    variant === 'amber' ||
    variant === 'rose' ||
    variant === 'slate' ||
    variant === 'purple'
  ) {
    resolvedColor = variant;
  }

  if (styleType) {
    resolvedStyle = styleType;
  } else if (
    variant === 'hairline' ||
    variant === 'subtle' ||
    variant === 'unboxed'
  ) {
    resolvedStyle = variant;
  }

  const showDot = hasDot || dot;

  const dotColors: Record<AstryxBadgeColor, string> = {
    emerald: 'bg-emerald-400',
    cyan: 'bg-cyan-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    slate: 'bg-slate-400',
    purple: 'bg-purple-400',
  };

  const styleTypeClasses: Record<AstryxBadgeVariant, Record<AstryxBadgeColor, string>> = {
    hairline: {
      emerald: 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30',
      cyan: 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30',
      amber: 'bg-amber-950/60 text-amber-300 border border-amber-500/30',
      rose: 'bg-rose-950/60 text-rose-300 border border-rose-500/30',
      slate: 'bg-[#0c1424] text-slate-300 border border-[#1e2d4d]',
      purple: 'bg-purple-950/60 text-purple-300 border border-purple-500/30',
    },
    subtle: {
      emerald: 'bg-emerald-950/40 text-emerald-400',
      cyan: 'bg-cyan-950/40 text-cyan-400',
      amber: 'bg-amber-950/40 text-amber-400',
      rose: 'bg-rose-950/40 text-rose-400',
      slate: 'bg-[#0f172a] text-slate-300',
      purple: 'bg-purple-950/40 text-purple-400',
    },
    unboxed: {
      emerald: 'text-emerald-400 bg-transparent p-0',
      cyan: 'text-cyan-400 bg-transparent p-0',
      amber: 'text-amber-400 bg-transparent p-0',
      rose: 'text-rose-400 bg-transparent p-0',
      slate: 'text-slate-400 bg-transparent p-0',
      purple: 'text-purple-400 bg-transparent p-0',
    },
  };

  const padClass = resolvedStyle === 'unboxed' ? '' : 'px-2 py-0.5 rounded text-[11px]';

  return (
    <span
      className={`inline-flex items-center font-mono font-medium tracking-tight whitespace-nowrap select-none ${padClass} ${styleTypeClasses[resolvedStyle][resolvedColor]} ${className}`}
      {...props}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${dotColors[resolvedColor]}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
}
