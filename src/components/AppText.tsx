import { Text as RNText, StyleSheet, type TextProps } from 'react-native';

// Google Fonts ship as separate static files per weight, not a variable
// font — so combining a loaded font with RN's own fontWeight would make
// RN fake-bold a face that's already a specific weight file (looks worse
// than the real hand-designed bold glyphs). This wrapper resolves the
// (family, weight) pair to the correct concrete font file and strips the
// fontWeight style so RN never attempts synthetic bolding on top of it.
//
// Existing code doesn't need to change: any Text with no fontFamily set
// defaults to Inter at the requested weight. Code that wants the display
// face just sets `fontFamily: theme.fontFamily.display` — everything
// else about how it's styled stays the same.
const FONT_FILES: Record<'inter' | 'display', Record<string, string>> = {
  inter: {
    '400': 'Inter_400Regular',
    '500': 'Inter_500Medium',
    '600': 'Inter_600SemiBold',
    '700': 'Inter_700Bold',
  },
  display: {
    '400': 'SpaceGrotesk_400Regular',
    '500': 'SpaceGrotesk_500Medium',
    '600': 'SpaceGrotesk_600SemiBold',
    '700': 'SpaceGrotesk_700Bold',
  },
};

export function Text({ style, ...props }: TextProps) {
  const flat = (StyleSheet.flatten(style) ?? {}) as {
    fontFamily?: string;
    fontWeight?: string | number;
  };
  const family: 'inter' | 'display' = flat.fontFamily === 'display' ? 'display' : 'inter';
  const weightKey = String(flat.fontWeight ?? '400');
  const resolvedFont = FONT_FILES[family][weightKey] ?? FONT_FILES[family]['400'];

  return <RNText {...props} style={[style, { fontFamily: resolvedFont, fontWeight: undefined }]} />;
}
