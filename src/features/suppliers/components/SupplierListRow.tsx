import { useRef, useEffect } from 'react';
import { View, Pressable, StyleSheet, Linking } from 'react-native';
import { Text } from '@/components/AppText';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from '@/components/Card';
import { PressableScale } from '@/components/PressableScale';
import { useHasRole } from '@/features/auth/hooks/usePermissions';
import { hapticImpactLight, hapticSelection } from '@/lib/haptics';
import type { Supplier } from '@/features/suppliers/services/suppliers.service';
import type { SupplierReliability } from '@/features/suppliers/hooks/useSupplierReliability';

type Theme = ReturnType<typeof useTheme>;

const EDIT_ROLES = ['Owner', 'StoreManager', 'Employee'] as const;

function DeleteActionPanel({
  progress,
  theme,
  label,
  onTriggered,
}: {
  progress: SharedValue<number>;
  theme: Theme;
  label: string;
  onTriggered: () => void;
}) {
  const firedRef = useRef(false);
  const styles = createPanelStyles(theme);

  useAnimatedReaction(
    () => progress.value,
    (value) => {
      if (value >= 1 && !firedRef.current) {
        firedRef.current = true;
        runOnJS(onTriggered)();
      } else if (value < 0.9) {
        firedRef.current = false;
      }
    },
  );

  return (
    <View style={styles.actionContainer}>
      <Pressable style={styles.actionButton} onPress={onTriggered}>
        <Feather name="trash-2" size={20} color="#fff" />
        <Text style={styles.actionLabel} numberOfLines={2}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

function createPanelStyles(theme: Theme) {
  return StyleSheet.create({
    actionContainer: {
      width: 90,
      borderRadius: theme.radius.lg,
      marginLeft: theme.spacing.sm,
      backgroundColor: theme.colors.danger,
      overflow: 'hidden',
    },
    actionButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingHorizontal: theme.spacing.xs,
    },
    actionLabel: {
      color: '#fff',
      fontSize: 11,
      fontWeight: theme.fontWeights.semiBold,
      textAlign: 'center',
    },
  });
}

// Feather icons are all single-weight outline glyphs — there is no
// separate "filled star" variant the way Ionicons had star/star-outline.
// A colored pill behind the star stands in for that fill, with a small
// pop animation on toggle so the state change still reads clearly.
function FavoriteStar({ favorite, theme }: { favorite: boolean; theme: Theme }) {
  const scale = useSharedValue(1);
  const styles = createFavoriteStyles(theme);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.25, { duration: 110 }),
      withTiming(1, { duration: 160 }),
    );
  }, [favorite, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.wrap, favorite && styles.wrapActive, animatedStyle]}>
      <Feather
        name="star"
        size={16}
        color={favorite ? theme.colors.onPrimary : theme.colors.textSecondary}
      />
    </Animated.View>
  );
}

function createFavoriteStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      width: 30,
      height: 30,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    wrapActive: { backgroundColor: theme.colors.warning },
  });
}

type Props = {
  supplier: Supplier;
  returnsTotal: number;
  returnsUrgent: number;
  deliveriesTotal: number;
  reliability?: SupplierReliability;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onRequestDelete: () => void;
};

export function SupplierListRow({
  supplier,
  returnsTotal,
  returnsUrgent,
  deliveriesTotal,
  reliability,
  onEdit,
  onToggleFavorite,
  onRequestDelete,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const canDelete = useHasRole([...EDIT_ROLES]);
  const swipeableRef = useRef<SwipeableMethods>(null);
  const styles = createStyles(theme);

  const trigger = () => {
    hapticImpactLight();
    onRequestDelete();
    swipeableRef.current?.close();
  };

  const handleToggleFavorite = () => {
    hapticSelection();
    onToggleFavorite();
  };

  const initials = supplier.name.slice(0, 2).toUpperCase();
  const metaParts = [supplier.contactName].filter(Boolean);

  const content = (
    <Card>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <PressableScale style={styles.info} onPress={onEdit}>
            <Text style={styles.name} numberOfLines={1}>
              {supplier.name}
            </Text>
          </PressableScale>

          <Pressable onPress={handleToggleFavorite} hitSlop={8}>
            <FavoriteStar favorite={supplier.favorite} theme={theme} />
          </Pressable>
        </View>

        <View style={styles.detailsList}>
          {metaParts.length > 0 ? (
            <Text style={styles.detailLine} numberOfLines={1}>
              {metaParts.join(' · ')}
            </Text>
          ) : null}
          {supplier.phone ? (
            <Pressable onPress={() => Linking.openURL(`tel:${supplier.phone}`)} hitSlop={8}>
              <Text style={styles.detailLine}>{supplier.phone}</Text>
            </Pressable>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Feather name="repeat" size={13} color={theme.colors.textSecondary} />
              <Text style={styles.statText}>
                {t('suppliers.returnsCount', { count: returnsTotal })}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Feather name="download" size={13} color={theme.colors.textSecondary} />
              <Text style={styles.statText}>
                {t('suppliers.deliveriesCount', { count: deliveriesTotal })}
              </Text>
            </View>
            {reliability?.defectRatePercent != null ? (
              <View
                style={[
                  styles.statBadge,
                  reliability.defectRatePercent > 15
                    ? styles.reliabilityBadgeBad
                    : reliability.defectRatePercent > 5
                      ? styles.reliabilityBadgeWarn
                      : styles.reliabilityBadgeGood,
                ]}
              >
                <Feather
                  name="trending-up"
                  size={12}
                  color={
                    reliability.defectRatePercent > 15
                      ? theme.colors.danger
                      : reliability.defectRatePercent > 5
                        ? theme.colors.warning
                        : theme.colors.success
                  }
                />
                <Text
                  style={[
                    styles.statText,
                    {
                      color:
                        reliability.defectRatePercent > 15
                          ? theme.colors.danger
                          : reliability.defectRatePercent > 5
                            ? theme.colors.warning
                            : theme.colors.success,
                      fontWeight: theme.fontWeights.semiBold,
                    },
                  ]}
                >
                  {t('suppliers.defectRate', {
                    percent: reliability.defectRatePercent.toFixed(1),
                  })}
                </Text>
              </View>
            ) : null}
            {returnsUrgent > 0 ? (
              <View style={[styles.statBadge, styles.urgentBadge]}>
                <View style={styles.urgentDot} />
                <Text style={[styles.statText, styles.urgentText]}>
                  {t('suppliers.attentionBadge', { count: returnsUrgent })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Card>
  );

  if (!canDelete) {
    return content;
  }

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      renderRightActions={(progress) => (
        <DeleteActionPanel
          progress={progress}
          theme={theme}
          label={t('suppliers.deleteAction')}
          onTriggered={trigger}
        />
      )}
      overshootRight={false}
    >
      {content}
    </ReanimatedSwipeable>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { padding: theme.spacing.lg, gap: theme.spacing.sm },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: theme.fontSizes.xs,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.primary,
    },
    info: { flex: 1, gap: 2 },
    name: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    detailsList: { marginLeft: 52, gap: theme.spacing.xs },
    detailLine: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSecondary,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginLeft: -theme.spacing.sm,
    },
    statBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
    },
    statText: {
      fontSize: theme.fontSizes.xs,
      color: theme.colors.textSecondary,
      fontWeight: theme.fontWeights.medium,
    },
    urgentBadge: { backgroundColor: theme.colors.danger + '1F' },
    urgentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.danger },
    urgentText: { color: theme.colors.danger, fontWeight: theme.fontWeights.semiBold },
    reliabilityBadgeGood: { backgroundColor: theme.colors.success + '1F' },
    reliabilityBadgeWarn: { backgroundColor: theme.colors.warning + '1F' },
    reliabilityBadgeBad: { backgroundColor: theme.colors.danger + '1F' },
  });
}
