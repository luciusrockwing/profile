/**
 * Astryx Design System - Theme Tokens & Constants
 * Meta-inspired design system with cyber dark palette and cyan/emerald accents
 */

export const ASTRYX_THEME = {
  colors: {
    bg: '#070b14',
    bgSubtle: '#0a0f1d',
    surface: '#0d131f',
    surfaceElevated: '#111827',
    border: '#1e293b',
    borderSubtle: '#172033',
    borderFocus: '#06b6d4',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#64748b',
    accentCyan: '#06b6d4',
    accentCyanHover: '#22d3ee',
    accentEmerald: '#10b981',
    accentAmber: '#f59e0b',
    accentRose: '#f43f5e',
    accentPurple: '#a855f7',
  },
  radius: {
    sm: '0.25rem', // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
    xl: '0.75rem', // 12px
    full: '9999px',
  },
  typography: {
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
} as const;

export const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070b14]';
