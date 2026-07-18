import { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useAnimatedReaction, runOnJS, type SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from '@/components/Card';
import { PressableScale } from '@/components/PressableScale';
import { useHasRole } from '@/features/auth/hooks/usePermissions';
import type { Supplier } from '@/features/suppliers/services/suppliers.service';
import type { SupplierReliability } from '@/features/suppliers/hooks/useSupplierReliability';

type Theme = ReturnType<typeof useTheme>;

const EDIT_ROLES = ['Owner', 'Administrator', 'StoreManager', 'Receiver'] as const;

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
        <Ionicons name="trash-outline" size={20} color="#fff" />
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
    onRequestDelete();
    swipeableRef.current?.close();
  };

  const initials = supplier.name.slice(0, 2).toUpperCase();
  const metaParts = [supplier.contactName, supplier.phone].filter(Boolean);

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
            {metaParts.length > 0 ? (
              <Text style={styles.meta} numberOfLines={1}>
                {metaParts.join(' · ')}
              </Text>
            ) : null}
          </PressableScale>

          <Pressable onPress={onToggleFavorite} hitSlop={8}>
            <Ionicons
              name={supplier.favorite ? 'star' : 'star-outline'}
              size={20}
              color={supplier.favorite ? theme.colors.warning : theme.colors.textSecondary}
            />
          </Pressable>
        </View>

        {supplier.phone ? (
          <Pressable
            style={styles.phoneRow}
            onPress={() => Linking.openURL(`tel:${supplier.phone}`)}
          >
            <Ionicons name="call-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.phoneText}>{supplier.phone}</Text>
          </Pressable>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statBadge}>
            <Ionicons name="repeat-outline" size={13} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>
              {t('suppliers.returnsCount', { count: returnsTotal })}
            </Text>
          </View>
          <View style={styles.statBadge}>
            <Ionicons name="download-outline" size={13} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>
              {t('suppliers.deliveriesCount', { count: deliveriesTotal })}
            </Text>
          </View>
          {returnsUrgent > 0 ? (
            <View style={[styles.statBadge, styles.urgentBadge]}>
              <View style={styles.urgentDot} />
              <Text style={[styles.statText, styles.urgentText]}>
                {t('suppliers.attentionBadge', { count: returnsUrgent })}
              </Text>
            </View>
          ) : null}
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
              <Ionicons
                name="analytics-outline"
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
                {t('suppliers.defectRate', { percent: reliability.defectRatePercent.toFixed(1) })}
              </Text>
            </View>
          ) : null}
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
    meta: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    phoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginLeft: 52,
    },
    phoneText: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginLeft: 52,
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
