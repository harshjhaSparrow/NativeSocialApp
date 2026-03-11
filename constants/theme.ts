import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Color Palette ────────────────────────────────────────────────────────────
export const colors = {
  // Backgrounds — layered depth system
  bg0: '#030b18',   // deepest background (root)
  bg1: '#071221',   // primary surface (pages)
  bg2: '#0c1a2e',   // cards
  bg3: '#102038',   // elevated cards
  bg4: '#162840',   // input backgrounds

  // Borders
  border0: '#1a2d44',
  border1: '#1f3555',
  border2: '#274060',

  // Primary accent — electric blue
  primary: '#3b82f6',
  primarySoft: '#2563eb',
  primaryGlow: 'rgba(59,130,246,0.15)',
  primaryText: '#60a5fa',

  // Semantic colors
  success: '#22c55e',
  successGlow: 'rgba(34,197,94,0.15)',
  warning: '#f59e0b',
  warningGlow: 'rgba(245,158,11,0.15)',
  danger: '#ef4444',
  dangerGlow: 'rgba(239,68,68,0.15)',
  purple: '#a855f7',
  purpleGlow: 'rgba(168,85,247,0.15)',
  teal: '#14b8a6',
  orange: '#f97316',

  // Text — legible contrast hierarchy
  textPrimary: '#f0f6ff',
  textSecondary: '#8ba3c1',
  textTertiary: '#4d6a8a',
  textDisabled: '#2d4a6a',

  // Overlays
  overlay0: 'rgba(3,11,24,0.6)',
  overlay1: 'rgba(3,11,24,0.8)',
  overlay2: 'rgba(3,11,24,0.95)',

  // Static
  white: '#ffffff',
  transparent: 'transparent',
};

// ─── Typography ───────────────────────────────────────────────────────────────
export const typography = {
  // Sizes
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 22,
    '2xl': 26,
    '3xl': 32,
    '4xl': 40,
  },
  // Weights  
  weight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  // Line heights
  leading: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
  // Letter spacing
  tracking: {
    tight: -0.4,
    base: 0,
    wide: 0.5,
    wider: 1.0,
    widest: 1.5,
  },
};

// ─── Spacing (4px base) ───────────────────────────────────────────────────────
export const spacing = {
  s0: 2,
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s7: 28,
  s8: 32,
  s9: 40,
  s10: 48,
  s11: 56,
  s12: 64,
};

// ─── Border Radii ─────────────────────────────────────────────────────────────
export const radii = {
  r1: 4,
  r2: 8,
  r3: 12,
  r4: 16,
  r5: 20,
  r6: 24,
  r7: 32,
  rFull: 9999,
};

// ─── Shadows / Elevation ─────────────────────────────────────────────────────
export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    android: { elevation: 3 },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
    },
    android: { elevation: 6 },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
    },
    android: { elevation: 12 },
  }),
  blue: Platform.select({
    ios: {
      shadowColor: '#3b82f6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
    },
    android: { elevation: 6 },
  }),
};

// ─── Z-Index Stack ────────────────────────────────────────────────────────────
export const zIndex = {
  base: 0,
  raised: 10,
  dropdown: 100,
  modal: 200,
  toast: 300,
};

// ─── Animation Configs ────────────────────────────────────────────────────────
export const animation = {
  spring: {
    press: { damping: 18, stiffness: 300, mass: 0.8 },
    bounce: { damping: 12, stiffness: 200, mass: 0.6 },
    soft: { damping: 24, stiffness: 200, mass: 1.0 },
  },
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
};

// ─── Screen Dimensions ────────────────────────────────────────────────────────
export const screen = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
};

// ─── Convenience defaults ─────────────────────────────────────────────────────
// Touch target minimum (WCAG / Apple HIG)
export const MIN_TOUCH = 44;
