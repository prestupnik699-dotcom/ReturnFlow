import type { RefreshControlProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

// NOT a wrapping component on purpose — React Native's refreshControl prop
// must receive an actual <RefreshControl> element as the immediate child;
// wrapping it in a custom component breaks Android's native
// SwipeRefreshLayout attachment and silently renders the list empty. This
// is a props factory instead, spread directly onto <RefreshControl />:
//   <RefreshControl {...useBrandedRefreshProps(refreshing, onRefresh)} />
export function useBrandedRefreshProps(
  refreshing: boolean,
  onRefresh: () => void,
): Pick<RefreshControlProps, 'refreshing' | 'onRefresh' | 'tintColor' | 'colors'> {
  const theme = useTheme();

  return {
    refreshing,
    onRefresh,
    tintColor: theme.colors.primary,
    colors: [theme.colors.primary],
  };
}
