'use client';

import React, { useState } from 'react';
import { User, Building2, Users, Shield } from 'lucide-react';
import { TargetCategory, TargetStatus } from '@/lib/osint-types';

export interface AstryxAvatarProps {
  src?: string;
  alt: string;
  category?: TargetCategory;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  statusRing?: 'active' | 'surveillance' | 'monitored' | 'flagged' | 'cold' | 'archived';
  status?: TargetStatus;
  className?: string;
}

export function AstryxAvatar({
  src,
  alt,
  category = 'individual',
  size = 'md',
  statusRing,
  status,
  className = '',
}: AstryxAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const resolvedStatus = status || statusRing;

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 text-xs',
    lg: 'w-16 h-16 text-sm',
    xl: 'w-20 h-20 text-base',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    xl: 'w-10 h-10',
  };

  const ringStyles: Record<string, string> = {
    active: 'ring-2 ring-emerald-500/80 ring-offset-2 ring-offset-[#070b14]',
    surveillance: 'ring-2 ring-amber-500/80 ring-offset-2 ring-offset-[#070b14]',
    monitored: 'ring-2 ring-cyan-500/80 ring-offset-2 ring-offset-[#070b14]',
    flagged: 'ring-2 ring-rose-500/80 ring-offset-2 ring-offset-[#070b14]',
    cold: 'ring-1 ring-slate-700 ring-offset-1 ring-offset-[#070b14]',
    archived: 'ring-1 ring-slate-800 ring-offset-1 ring-offset-[#070b14]',
  };

  const getFallbackIcon = () => {
    const isize = iconSizes[size];
    switch (category) {
      case 'company':
        return <Building2 className={isize} />;
      case 'syndicate':
        return <Users className={isize} />;
      case 'asset':
        return <Shield className={isize} />;
      case 'individual':
      default:
        return <User className={isize} />;
    }
  };

  const getInitials = (name: string) => {
    return name
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('');
  };

  const ringClass = resolvedStatus ? ringStyles[resolvedStatus] || '' : '';
  const hasValidUrl = src && src.trim().startsWith('http');

  if (!hasValidUrl || imageError) {
    return (
      <div
        className={`relative flex items-center justify-center font-mono font-bold rounded-lg border border-[#1e2d4d] bg-[#0c1424] text-slate-300 shadow-inner select-none ${sizeClasses[size]} ${ringClass} ${className}`}
        title={`Astryx Client Avatar: ${alt}`}
      >
        <span className="opacity-90 text-cyan-400">{getFallbackIcon()}</span>
        {alt && size !== 'sm' && (
          <span className="absolute bottom-1 right-1 text-[9px] font-mono text-cyan-300 bg-[#070b14]/90 px-1 rounded border border-cyan-800/40">
            {getInitials(alt)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-[#1e2d4d] bg-[#0c1424] shadow-inner select-none ${sizeClasses[size]} ${ringClass} ${className}`}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0c1424] animate-pulse text-cyan-400/60">
          {getFallbackIcon()}
        </div>
      )}
      {/* 
        Native client image loader for arbitrary external URLs with no-referrer.
        Zero server binary storage or server proxy overhead.
      */}
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setImageError(true)}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
