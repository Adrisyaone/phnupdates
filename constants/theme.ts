import { Easing } from 'react-native';
import { AppColors, colors as activeColors, getThemeColors, ThemePreference } from '@/constants/colors';

/**
 * Design tokens & motion system.
 *
 * Central source of truth for spacing, radii, elevation, z-index and animation
 * timing. Colors continue to live in constants/colors.ts (theme-aware proxy);
 * this file layers gradients + motion + rhythm on top so every screen shares
 * one consistent visual language.
 */

// 4pt spacing rhythm -------------------------------------------------------
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

// Corner radius scale ------------------------------------------------------
export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

// Layered z-index scale ----------------------------------------------------
export const zIndex = {
  base: 0,
  raised: 10,
  sticky: 20,
  overlay: 40,
  drawer: 100,
  modal: 1000,
  toast: 2000,
} as const;

// Motion tokens ------------------------------------------------------------
// Durations follow Material/HIG guidance: micro 150-300ms, exits ~65% of enter.
export const motion = {
  duration: {
    instant: 120,
    fast: 200,
    base: 300,
    slow: 420,
  },
  // Exit animations should feel snappier than entrances.
  exit: {
    fast: 140,
    base: 200,
  },
  // Per-item delay when staggering list/grid entrances.
  stagger: 45,
  easing: {
    // Standard "ease-out" for entering elements.
    out: Easing.bezier(0.16, 1, 0.3, 1),
    // "ease-in" for exiting elements.
    in: Easing.bezier(0.4, 0, 1, 1),
    // Smooth in-out for state transitions.
    inOut: Easing.bezier(0.65, 0, 0.35, 1),
    // Gentle spring-like overshoot for playful entrances.
    spring: Easing.bezier(0.34, 1.56, 0.64, 1),
  },
  spring: {
    // Shared react-native Animated.spring config for press / drawer motion.
    gentle: { damping: 18, stiffness: 180, mass: 1 },
    bouncy: { damping: 12, stiffness: 220, mass: 0.9 },
  },
} as const;

// Elevation / shadow presets ----------------------------------------------
export type Elevation = 'none' | 'sm' | 'md' | 'lg' | 'xl';

const shadowColor = '#0F172A';

export const elevation = (level: Elevation) => {
  switch (level) {
    case 'sm':
      return {
        shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 1,
      };
    case 'md':
      return {
        shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
      };
    case 'lg':
      return {
        shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 20,
        elevation: 8,
      };
    case 'xl':
      return {
        shadowColor,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.2,
        shadowRadius: 32,
        elevation: 16,
      };
    case 'none':
    default:
      return {
        shadowColor: 'transparent',
        shadowOpacity: 0,
        elevation: 0,
      };
  }
};

// Colored glow shadow (used on primary CTAs & hero elements) ---------------
export const glow = (hex: string, intensity = 0.35) => ({
  shadowColor: hex,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: intensity,
  shadowRadius: 16,
  elevation: 8,
});

// Gradients ----------------------------------------------------------------
export type GradientTuple = readonly [string, string, ...string[]];

export const buildGradients = (c: AppColors) => ({
  // Signature brand gradient (teal → deep teal). Used on the hero.
  brand: [c.primaryLight, c.primary, c.primaryDark] as GradientTuple,
  brandDiagonal: [c.primary, c.primaryDark] as GradientTuple,
  // Warm accent gradient for secondary CTAs / highlights.
  accent: [c.secondary, '#FB7185'] as GradientTuple,
  // Subtle surface gradient for cards to add depth.
  surface: [c.surface, c.surfaceAlt] as GradientTuple,
  // Aurora / mesh feel for immersive backgrounds.
  aurora: [c.primary + '00', c.primary + '22', c.secondary + '18'] as GradientTuple,
  // Glass overlay used above imagery.
  glassSheen: ['#FFFFFF33', '#FFFFFF00'] as GradientTuple,
  // Dark scrim for legibility over gradients.
  scrimDown: ['#00000000', '#00000055'] as GradientTuple,
});

export const getGradients = (theme?: ThemePreference) => buildGradients(getThemeColors(theme));

// Convenience: gradients bound to the currently active theme.
export const gradients = new Proxy({} as ReturnType<typeof buildGradients>, {
  get(_t, prop: string) {
    return buildGradients(activeColors)[prop as keyof ReturnType<typeof buildGradients>];
  },
});

// Hairline border helper (crisp 1px on all densities).
export const hairline = 1;
