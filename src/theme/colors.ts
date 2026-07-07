export type ThemeColors = {
  background: string;
  surface: string;
  surfaceVariant: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textInverse: string;
  primary: string;
  primaryPressed: string;
  danger: string;
  success: string;
  warning: string;
};

export const lightColors: ThemeColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textInverse: '#FFFFFF',
  primary: '#4F46E5',
  primaryPressed: '#4338CA',
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
};

export const darkColors: ThemeColors = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceVariant: '#334155',
  border: '#334155',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textInverse: '#0F172A',
  primary: '#6366F1',
  primaryPressed: '#818CF8',
  danger: '#F87171',
  success: '#4ADE80',
  warning: '#FBBF24',
};
