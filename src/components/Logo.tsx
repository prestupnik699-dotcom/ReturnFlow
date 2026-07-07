import Svg, { Rect, Path, Polygon } from 'react-native-svg';

type LogoProps = {
  size?: number;
};

export function Logo({ size = 64 }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 220 220">
      <Rect x="0" y="0" width="220" height="220" rx="54" fill="#4F46E5" />
      <Path
        d="M 139.7 80.3 A 42 42 0 1 1 80.3 80.3"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={14}
        strokeLinecap="round"
      />
      <Polygon points="90.2,70.4 86.0,86.0 74.6,74.6" fill="#FFFFFF" />
    </Svg>
  );
}
