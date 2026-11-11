'use client';

import React from 'react';

export function AstryxTable({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-[#16233b] ${className}`}>
      <table className="w-full text-left font-mono text-xs divide-y divide-[#16233b]">
        {children}
      </table>
    </div>
  );
}

export function AstryxTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-[#070b14] text-slate-400 font-semibold tracking-wider text-[11px] uppercase border-b border-[#16233b]">
      {children}
    </thead>
  );
}

export const AstryxTableHeader = AstryxTableHead;

export function AstryxTableHeadCell({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`py-2.5 px-3.5 text-slate-400 font-semibold uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
}

export function AstryxTableBody({ children }: { children: React.ReactNode }) {
  return (
    <tbody className="divide-y divide-[#121d33] bg-[#070b14]/50">
      {children}
    </tbody>
  );
}

export function AstryxTableRow({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={`hover:bg-[#0c1424] transition-colors ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </tr>
  );
}

export function AstryxTableCell({
  children,
  className = '',
  align = 'left',
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}) {
  const alignClass =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  return (
    <td
      className={`py-2.5 px-3.5 text-slate-200 tabular-nums ${alignClass} ${className}`}
    >
      {children}
    </td>
  );
}
