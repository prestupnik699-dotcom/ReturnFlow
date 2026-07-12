import { View, Text, Pressable, StyleSheet } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from '@/components/Card';
import {
  useMarkReturned,
  useArchiveReturn,
  useRestoreReturn,
} from '@/features/returns/hooks/useReturnStatusActions';
import type {
  ReturnItem,
  ReturnStatus,
  ReturnPriority,
} from '@/features/returns/services/returns.service';

type Props = {
  item: ReturnItem;
  statusLabels: Record<ReturnStatus, string>;
  priorityColors: Record<ReturnPriority, string>;
  statusColors: Record<ReturnStatus, string>;
  pendingLabel: string;
  onPress: () => void;
};

export function ReturnListRow({
  item,
  statusLabels,
  priorityColors,
  statusColors,
  pendingLabel,
  onPress,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const markReturnedMutation = useMarkReturned(item.id);
  const archiveMutation = useArchiveReturn(item.id);
  const restoreMutation = useRestoreReturn(item.id);
  const styles = createStyles(theme);

  const swipeAction =
    item.status === 'pending' || item.status === 'urgent'
      ? {
          label: t('returns.detail.markReturned'),
          icon: 'checkmark-circle-outline' as const,
          color: theme.colors.success,
          onPress: () => markReturnedMutation.mutate(),
        }
      : item.status === 'returned'
        ? {
            label: t('returns.detail.archive'),
            icon: 'archive-outline' as const,
            color: theme.colors.textSecondary,
            onPress: () => archiveMutation.mutate(),
          }
        : {
            label: t('returns.detail.restore'),
            icon: 'refresh-outline' as const,
            color: theme.colors.primary,
            onPress: () => restoreMutation.mutate(),
          };

  const renderRightActions = () => (
    <View style={[styles.actionContainer, { backgroundColor: swipeAction.color }]}>
      <Pressable style={styles.actionButton} onPress={swipeAction.onPress}>
        <Ionicons name={swipeAction.icon} size={22} color="#fff" />
        <Text style={styles.actionLabel}>{swipeAction.label}</Text>
      </Pressable>
    </View>
  );

  const content = (
    <Pressable onPress={onPress}>
      <Card>
        <View style={styles.row}>
          <View style={[styles.priorityDot, { backgroundColor: priorityColors[item.priority] }]} />
          <View style={styles.info}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {item.supplierName} · ×{item.quantity}
            </Text>
          </View>
          {item.pendingSync ? (
            <View style={styles.pendingBadge}>
              <Ionicons name="cloud-upload-outline" size={12} color={theme.colors.warning} />
              <Text style={styles.pendingBadgeText}>{pendingLabel}</Text>
            </View>
          ) : (
            <View
              style={[styles.statusPill, { backgroundColor: statusColors[item.status] + '22' }]}
            >
              <Text style={[styles.statusPillText, { color: statusColors[item.status] }]}>
                {statusLabels[item.status]}
              </Text>
            </View>
          )}
        </View>
      </Card>
    </Pressable>
  );

  if (item.pendingSync) {
    return content;
  }

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      {content}
    </ReanimatedSwipeable>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    priorityDot: { width: 8, height: 8, borderRadius: 4 },
    info: { flex: 1, gap: 4 },
    itemTitle: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    meta: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    statusPill: {
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
    },
    statusPillText: { fontSize: theme.fontSizes.xs, fontWeight: theme.fontWeights.semiBold },
    pendingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.warning + '22',
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
    },
    pendingBadgeText: {
      fontSize: theme.fontSizes.xs,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.warning,
    },
    actionContainer: {
      width: 90,
      borderRadius: theme.radius.lg,
      marginLeft: theme.spacing.sm,
      overflow: 'hidden',
    },
    actionButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
    actionLabel: {
      color: '#fff',
      fontSize: theme.fontSizes.xs,
      fontWeight: theme.fontWeights.semiBold,
      textAlign: 'center',
    },
  });
}
