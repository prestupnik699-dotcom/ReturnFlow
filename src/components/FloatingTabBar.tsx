import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  stores: 'storefront-outline',
  suppliers: 'cube-outline',
  returns: 'repeat-outline',
  notifications: 'notifications-outline',
  more: 'menu-outline',
};

const ICON_SIZE = 48;

type TabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  // Loosely typed on purpose: expo-router's navigation object is generic over
  // its own internal event map, which conflicts with any narrower type we try
  // to declare here. Only .emit() and .navigate() are used below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
};

export function FloatingTabBar({ state, navigation }: TabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets);

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
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              hitSlop={8}
              android_ripple={{ color: 'transparent' }}
            >
              <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
                <Ionicons
                  name={icon}
                  size={22}
                  color={isFocused ? theme.colors.onPrimary : theme.colors.textSecondary}
                />
              </View>
            </Pressable>
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
    iconWrapActive: { backgroundColor: theme.colors.primary },
  });
}
