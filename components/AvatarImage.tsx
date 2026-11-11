'use client';

import React, { useState } from 'react';
import { User, Building2, Users, Shield, HelpCircle } from 'lucide-react';
import { TargetCategory } from '@/lib/osint-types';

interface AvatarImageProps {
  src?: string;
  alt: string;
  category?: TargetCategory;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'w-9 h-9 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base',
  xl: 'w-24 h-24 text-xl',
};

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

export function AvatarImage({
  src,
  alt,
  category = 'individual',
  className = '',
  size = 'md',
}: AvatarImageProps) {
  const [imageError, setImageError] = useState(false);
  const [loaded, setLoaded] = useState(false);

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
        return <User className={isize} />;
      default:
        return <HelpCircle className={isize} />;
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

  const hasValidUrl = src && src.trim().startsWith('http');

  if (!hasValidUrl || imageError) {
    return (
      <div
        className={`relative flex items-center justify-center font-mono font-bold rounded-lg border border-slate-700/80 bg-slate-900/90 text-slate-300 shadow-inner ${sizeClasses[size]} ${className}`}
        title={`Zero-Blob Client Avatar for ${alt}`}
      >
        <span className="opacity-90">{getFallbackIcon()}</span>
        {alt && size !== 'sm' && (
          <span className="absolute bottom-1 right-1 text-[9px] font-mono text-cyan-400 bg-slate-950/80 px-1 rounded border border-cyan-800/40">
            {getInitials(alt)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950 shadow-inner ${sizeClasses[size]} ${className}`}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 animate-pulse text-slate-500">
          {getFallbackIcon()}
        </div>
      )}
      {/* 
        Direct browser image load from external URL.
        referrerPolicy="no-referrer" prevents client referrer leaks.
        Server never proxies or stores binary image bytes.
      */}
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setImageError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
