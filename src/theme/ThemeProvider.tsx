import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useThemeStore } from '@/stores/theme.store';
import { lightColors, darkColors, type ThemeColors } from './colors';
import { fontSizes, fontWeights, fontFamily } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';

type Theme = {
  colors: ThemeColors;
  fontSizes: typeof fontSizes;
  fontWeights: typeof fontWeights;
  fontFamily: typeof fontFamily;
  spacing: typeof spacing;
  radius: typeof radius;
  scheme: 'light' | 'dark';
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useThemeStore((state) => state.mode);
  const systemScheme = useColorScheme();

  const scheme: 'light' | 'dark' =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo<Theme>(
    () => ({
      colors: scheme === 'dark' ? darkColors : lightColors,
      fontSizes,
      fontWeights,
      fontFamily,
      spacing,
      radius,
      scheme,
    }),
    [scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
