'use client';

import React from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
}

export interface AstryxSegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
}

export function AstryxSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
  ariaLabel = 'Segmented options',
}: AstryxSegmentedControlProps<T>) {
  const sizeStyles = {
    sm: 'p-0.5 text-xs',
    md: 'p-1 text-xs',
  };

  const itemSizeStyles = {
    sm: 'px-2 py-1 gap-1',
    md: 'px-3 py-1.5 gap-1.5',
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex items-center rounded-lg bg-[#080d17] border border-slate-800/80 font-mono select-none ${sizeStyles[size]} ${className}`}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center justify-center font-medium whitespace-nowrap shrink-0 rounded transition-all duration-150 ${
              itemSizeStyles[size]
            } ${
              isSelected
                ? 'bg-slate-800 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
            }`}
          >
            {option.icon && <span className="shrink-0">{option.icon}</span>}
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span
                className={`text-[10px] px-1 rounded ${
                  isSelected ? 'bg-cyan-950 text-cyan-400' : 'text-slate-500'
                }`}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
