'use client';

import React, { forwardRef } from 'react';
import { FOCUS_RING } from './tokens';

export interface AstryxInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  hint?: string;
  errorMessage?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  actionSlot?: React.ReactNode;
}

export const AstryxInput = forwardRef<HTMLInputElement, AstryxInputProps>(
  (
    {
      label,
      helperText,
      hint,
      errorMessage,
      error,
      leftIcon,
      rightIcon,
      actionSlot,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `astryx-input-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined);
    const resolvedError = error || errorMessage;
    const resolvedHint = hint || helperText;
    const resolvedRightSlot = actionSlot || rightIcon;

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-mono text-slate-300 uppercase tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-slate-500 pointer-events-none flex items-center">
              {leftIcon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-[#070b14] border text-slate-100 font-mono text-xs rounded-md py-2 transition-colors placeholder:text-slate-500 ${
              leftIcon ? 'pl-9' : 'pl-3'
            } ${resolvedRightSlot ? 'pr-9' : 'pr-3'} ${
              resolvedError
                ? 'border-rose-500/80 focus:border-rose-400'
                : 'border-[#16233b] hover:border-[#1e2d4d] focus:border-cyan-500'
            } ${FOCUS_RING} ${className}`}
            {...props}
          />
          {resolvedRightSlot && (
            <span className="absolute right-2.5 text-slate-400 flex items-center">
              {resolvedRightSlot}
            </span>
          )}
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

AstryxInput.displayName = 'AstryxInput';
