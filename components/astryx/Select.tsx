'use client';

import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { FOCUS_RING } from './tokens';

export interface AstryxSelectOption {
  value: string | number;
  label: string;
}

export interface AstryxSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  hint?: string;
  errorMessage?: string;
  error?: string;
  options?: AstryxSelectOption[];
}

export const AstryxSelect = forwardRef<HTMLSelectElement, AstryxSelectProps>(
  (
    {
      label,
      helperText,
      hint,
      errorMessage,
      error,
      options,
      className = '',
      children,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? `astryx-select-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined);
    const resolvedError = error || errorMessage;
    const resolvedHint = hint || helperText;

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-mono text-slate-300 uppercase tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={`w-full appearance-none bg-[#070b14] border text-slate-100 font-mono text-xs rounded-md pl-3 pr-8 py-2 transition-colors cursor-pointer ${
              resolvedError
                ? 'border-rose-500/80 focus:border-rose-400'
                : 'border-[#16233b] hover:border-[#1e2d4d] focus:border-cyan-500'
            } ${FOCUS_RING} ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#070b14] text-slate-100">
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <ChevronDown className="w-4 h-4" />
          </span>
        </div>
        {resolvedError ? (
          <p className="text-[11px] font-mono text-rose-400 mt-1">{resolvedError}</p>
        ) : resolvedHint ? (
          <p className="text-[11px] font-mono text-slate-500 mt-1">{resolvedHint}</p>
        ) : null}
      </div>
    );
  }
);

AstryxSelect.displayName = 'AstryxSelect';
