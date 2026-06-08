import { StyleSheet } from 'react-native';

export type ThemePreference = 'light' | 'dark';

export interface AppColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  textLight: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  protein: string;
  carbs: string;
  fat: string;
}

export const lightColors: AppColors = {
  primary: '#2DD4BF',
  primaryDark: '#14B8A6',
  primaryLight: '#5EEAD4',
  secondary: '#F97316',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#64748B',
  textLight: '#94A3B8',
  border: '#E2E8F0',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  protein: '#3B82F6',
  carbs: '#F59E0B',
  fat: '#EC4899',
};

export const darkColors: AppColors = {
  primary: '#2DD4BF',
  primaryDark: '#14B8A6',
  primaryLight: '#99F6E4',
  secondary: '#FB923C',
  background: '#020617',
  surface: '#0F172A',
  surfaceAlt: '#1E293B',
  text: '#E2E8F0',
  textSecondary: '#94A3B8',
  textLight: '#64748B',
  border: '#334155',
  success: '#4ADE80',
  warning: '#FBBF24',
  error: '#F87171',
  protein: '#60A5FA',
  carbs: '#FBBF24',
  fat: '#F472B6',
};

const palettes: Record<ThemePreference, AppColors> = {
  light: lightColors,
  dark: darkColors,
};

let activeTheme: ThemePreference = 'light';

const themedStyleCache = new WeakMap<Function, { theme: ThemePreference; styles: Record<string, any> }>();

const getCachedStyles = <T extends Record<string, any>>(factory: (palette: AppColors) => T): T => {
  const cached = themedStyleCache.get(factory);

  if (cached && cached.theme === activeTheme) {
    return cached.styles as T;
  }

  const styles = StyleSheet.create(factory(palettes[activeTheme]) as any) as T;
  themedStyleCache.set(factory, { theme: activeTheme, styles });
  return styles;
};

export const getThemeColors = (theme: ThemePreference = activeTheme): AppColors => palettes[theme];

export const setColorTheme = (theme: ThemePreference) => {
  activeTheme = theme;
};

export const colors: AppColors = new Proxy({} as AppColors, {
  get(_target, prop: string | symbol) {
    return palettes[activeTheme][prop as keyof AppColors];
  },
}) as AppColors;

export const createThemedStyles = <T extends Record<string, any>>(factory: (palette: AppColors) => T): T => {
  return new Proxy({} as T, {
    get(_target, prop: string | symbol) {
      return getCachedStyles(factory)[prop as keyof T];
    },
    ownKeys() {
      return Reflect.ownKeys(getCachedStyles(factory));
    },
    getOwnPropertyDescriptor() {
      return {
        enumerable: true,
        configurable: true,
      };
    },
  });
};
