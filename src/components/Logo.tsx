import Svg, { Defs, LinearGradient, Stop, Rect, Path } from 'react-native-svg';

type LogoProps = {
  size?: number;
};

export function Logo({ size = 64 }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1254 1254">
      <Defs>
        <LinearGradient id="logoGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#25D9FF" />
          <Stop offset="45%" stopColor="#315BFF" />
          <Stop offset="75%" stopColor="#8B35FF" />
          <Stop offset="100%" stopColor="#20D7FF" />
        </LinearGradient>
      </Defs>
      <Rect x={130} y={120} width={995} height={995} rx={220} fill="#0C0A1A" />
      <Path
        d="M 997 469 L 970 484 L 925 495 L 717 509 L 655 519 L 618 531 L 593 543 L 557 566 L 538 582 L 503 621 L 473 670 L 445 740 L 386 922 L 360 993 L 341 1026 L 308 1058 L 369 1054 L 423 1042 L 479 1017 L 527 982 L 567 940 L 606 881 L 634 821 L 675 708 L 689 703 L 811 684 L 846 672 L 880 653 L 917 621 L 950 578 L 978 523 Z"
        fill="url(#logoGradient)"
      />
      <Path
        d="M 1134 166 L 1071 194 L 1005 212 L 900 227 L 695 238 L 650 248 L 604 268 L 566 295 L 541 320 L 511 362 L 483 422 L 439 549 L 473 510 L 510 479 L 562 449 L 601 434 L 649 422 L 695 416 L 907 405 L 951 394 L 988 377 L 1036 343 L 1063 315 L 1084 287 L 1111 238 Z"
        fill="url(#logoGradient)"
      />
    </Svg>
  );
}
