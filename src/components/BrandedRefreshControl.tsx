import { RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  refreshing: boolean;
  onRefresh: () => void;
};

// Thin themed wrapper so every list's pull-to-refresh spinner uses the
// same brand color instead of the OS default gray, kept in one place the
// same way haptics.ts centralizes haptic choices.
export function BrandedRefreshControl({ refreshing, onRefresh }: Props) {
  const theme = useTheme();

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={theme.colors.primary}
      colors={[theme.colors.primary]}
    />
  );
}
