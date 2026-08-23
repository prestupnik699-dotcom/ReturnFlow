import { useWindowDimensions } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

const NARROW_SCREEN_THRESHOLD = 380;

// Screen-level H1 titles (Возвраты, Магазины, Поставщики, etc.) use
// theme.fontSizes['2xl'] (28px) uniformly, which crowds the header row
// on narrow phones where icons sit right next to the title — same class
// of problem as the store row avatar earlier. Large screens are left
// completely untouched; only screens narrower than the threshold get
// the smaller size.
export function useResponsiveTitleSize(): number {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  return width < NARROW_SCREEN_THRESHOLD ? theme.fontSizes.xl : theme.fontSizes['2xl'];
}
