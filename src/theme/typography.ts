export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 28,
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
} as const;

// 'display' is a sentinel, not a real font name — AppText resolves it
// (together with fontWeight) to the correct static Space Grotesk file.
// Anything that doesn't set fontFamily defaults to Inter via AppText.
export const fontFamily = {
  display: 'display',
} as const;
