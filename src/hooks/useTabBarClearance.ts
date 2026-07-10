import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Mirrors FloatingTabBar's own geometry (icon circle + vertical padding +
// its bottom margin), so any screen inside the tabs group can reserve
// exactly enough space to never be covered by the floating bar.
const TAB_BAR_HEIGHT = 48 + 16;
const TAB_BAR_BOTTOM_MARGIN = 12;
const EXTRA_GAP = 12;

export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + TAB_BAR_BOTTOM_MARGIN + TAB_BAR_HEIGHT + EXTRA_GAP;
}
