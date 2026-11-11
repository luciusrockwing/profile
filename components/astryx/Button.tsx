'use client';

import React, { forwardRef } from 'react';
import { FOCUS_RING } from './tokens';

export interface AstryxButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const AstryxButton = forwardRef<HTMLButtonElement, AstryxButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      loading = false,
      icon,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const isBusy = isLoading || loading;
    const resolvedLeftIcon = icon || leftIcon;

    // Astryx button variants
    const variantStyles = {
      primary:
        'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold border border-cyan-400/30 shadow-sm shadow-cyan-500/20 active:translate-y-[0.5px]',
      secondary:
        'bg-[#0c1424] hover:bg-[#121d33] text-slate-200 border border-[#1e2d4d] active:translate-y-[0.5px]',
      destructive:
        'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 active:translate-y-[0.5px]',
      ghost:
        'bg-transparent hover:bg-[#0c1424] text-slate-400 hover:text-slate-100 border border-transparent',
      outline:
        'bg-transparent hover:bg-cyan-950/30 text-cyan-400 border border-cyan-500/40 hover:border-cyan-400 active:translate-y-[0.5px]',
    };

    const sizeStyles = {
      sm: 'text-xs px-2.5 py-1 gap-1.5 rounded',
      md: 'text-xs px-3.5 py-1.5 gap-2 rounded-md',
      lg: 'text-sm px-4 py-2 gap-2.5 rounded-md font-semibold',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isBusy}
        className={`inline-flex items-center justify-center font-mono whitespace-nowrap shrink-0 transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${FOCUS_RING} ${className}`}
        {...props}
      >
        {isBusy ? (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          resolvedLeftIcon && <span className="shrink-0">{resolvedLeftIcon}</span>
        )}
        {children ? <span>{children}</span> : null}
        {!isBusy && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

AstryxButton.displayName = 'AstryxButton';
