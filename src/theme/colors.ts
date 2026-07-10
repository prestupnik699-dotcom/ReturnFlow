export type ThemeColors = {
  background: string;
  surface: string;
  surfaceVariant: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textInverse: string;
  onPrimary: string;
  primary: string;
  primaryPressed: string;
  danger: string;
  success: string;
  warning: string;
};

export const lightColors: ThemeColors = {
  background: '#F7F8FC',
  surface: '#FFFFFF',
  surfaceVariant: '#F0F1F7',
  border: 'rgba(15,23,42,0.08)',
  textPrimary: '#12142B',
  textSecondary: '#6B7280',
  textInverse: '#FFFFFF',
  onPrimary: '#FFFFFF',
  primary: '#6D5DFB',
  primaryPressed: '#5A4AE0',
  danger: '#E11D48',
  success: '#059669',
  warning: '#D97706',
};

export const darkColors: ThemeColors = {
  background: '#0B0F1E',
  surface: '#141A2E',
  surfaceVariant: '#1D2438',
  border: 'rgba(255,255,255,0.08)',
  textPrimary: '#F5F6FA',
  textSecondary: '#9AA3B8',
  textInverse: '#0B0F1E',
  onPrimary: '#FFFFFF',
  primary: '#8B7CFF',
  primaryPressed: '#6C5CE0',
  danger: '#FF6B6B',
  success: '#34D399',
  warning: '#FBBF24',
};
