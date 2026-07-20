import { useEffect } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useUnreadCount } from '@/features/notifications/hooks/useUnreadCount';
import { useChatUnreadCount } from '@/features/notifications/hooks/useChatUnreadCount';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';

// Separate component (not inlined in the route.map() below) so the
// shared value/effect follow React's hook rules correctly — you can't
// call useSharedValue conditionally inside a loop callback.
function PulsingBadge({ style }: { style: object }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.3, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
      false,
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return <Animated.View style={[style, animatedStyle]} />;
}

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home-outline',
  stores: 'storefront-outline',
  suppliers: 'cube-outline',
  returns: 'repeat-outline',
  more: 'menu-outline',
};

const ICON_SIZE = 48;

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
};

export function FloatingTabBar({ state, navigation }: TabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const unreadCount = useUnreadCount();
  const chatUnreadCount = useChatUnreadCount();
  const keyboardVisible = useKeyboardVisible();
  const styles = createStyles(theme, insets);

  // Hidden while the keyboard is open, rather than relying on a global
  // OS-level "pan" window mode — pan shifts the ENTIRE screen (including
  // fixed headers on other screens) to make room, which broke screens that
  // have both a top header and a bottom input (e.g. Chat).
  if (keyboardVisible) {
    return null;
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const icon = ICONS[route.name] ?? 'ellipse-outline';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            // The badge lives outside the Pressable's overflow:hidden
            // boundary — the pulse animation scales it up to 1.3x, and
            // if it were still a child of the clipped tab, that growth
            // got cut off at the tab's rounded edge (looked "обрезана").
            <View key={route.key} style={styles.tabOuter}>
              <Pressable
                onPress={onPress}
                style={styles.tab}
                hitSlop={8}
                android_ripple={{ color: 'transparent' }}
              >
                {isFocused ? (
                  <LinearGradient
                    colors={[theme.colors.primary, theme.colors.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconWrap}
                  >
                    <Ionicons name={icon} size={22} color={theme.colors.onPrimary} />
                  </LinearGradient>
                ) : (
                  <View style={styles.iconWrap}>
                    <Ionicons name={icon} size={22} color={theme.colors.textSecondary} />
                  </View>
                )}
              </Pressable>
              {/* Chat and Notifications moved into the "Ещё" (More) menu — the
                  unread badge follows them there so the signal isn't lost. */}
              {route.name === 'more' && unreadCount + chatUnreadCount > 0 ? (
                <PulsingBadge style={styles.badge} />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>, insets: { bottom: number }) {
  return StyleSheet.create({
    wrapper: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: insets.bottom + theme.spacing.md,
      alignItems: 'center',
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.xs,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: theme.scheme === 'dark' ? 0.5 : 0.15,
          shadowRadius: 24,
        },
        android: { elevation: 8 },
        default: {},
      }),
    },
    tabOuter: { position: 'relative' },
    tab: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: ICON_SIZE / 2,
      overflow: 'hidden',
    },
    iconWrap: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      borderRadius: ICON_SIZE / 2,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: theme.colors.danger,
      borderWidth: 1.5,
      borderColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeInner: { display: 'none' },
  });
}
