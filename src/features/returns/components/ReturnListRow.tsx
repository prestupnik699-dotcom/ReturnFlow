import { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
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
  onLongPress: () => void;
  selectionMode: boolean;
  selected: boolean;
};

function SelectionCheckbox({
  selected,
  color,
  inactiveColor,
}: {
  selected: boolean;
  color: string;
  inactiveColor: string;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSequence(
      withTiming(1.3, { duration: 100 }),
      withTiming(1, { duration: 150 }),
    );
  }, [selected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={selected ? color : inactiveColor}
      />
    </Animated.View>
  );
}

export function ReturnListRow({
  item,
  statusLabels,
  priorityColors,
  statusColors,
  pendingLabel,
  onPress,
  onLongPress,
  selectionMode,
  selected,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const swipeableRef = useRef<SwipeableMethods>(null);
  const markReturnedMutation = useMarkReturned(item.id);
  const archiveMutation = useArchiveReturn(item.id);
  const restoreMutation = useRestoreReturn(item.id);
  const styles = createStyles(theme);

  const rightAction =
    item.status === 'pending' || item.status === 'urgent'
      ? {
          label: t('returns.detail.markReturned'),
          icon: 'checkmark-circle-outline' as const,
          color: theme.colors.success,
          run: () => markReturnedMutation.mutate(),
        }
      : item.status === 'returned'
        ? {
            label: t('returns.detail.archive'),
            icon: 'archive-outline' as const,
            color: theme.colors.textSecondary,
            run: () => archiveMutation.mutate(),
          }
        : {
            label: t('returns.detail.restore'),
            icon: 'refresh-outline' as const,
            color: theme.colors.primary,
            run: () => restoreMutation.mutate(),
          };

  const leftAction =
    item.status === 'returned'
      ? {
          label: t('returns.detail.cancelReturn'),
          icon: 'arrow-undo-outline' as const,
          color: theme.colors.warning,
          run: () => restoreMutation.mutate(),
        }
      : null;

  const runAndClose = (run: () => void) => () => {
    run();
    swipeableRef.current?.close();
  };

  const renderRightActions = () => (
    <View style={[styles.actionContainer, { backgroundColor: rightAction.color }]}>
      <Pressable style={styles.actionButton} onPress={runAndClose(rightAction.run)}>
        <Ionicons name={rightAction.icon} size={20} color="#fff" />
        <Text style={styles.actionLabel} numberOfLines={2}>
          {rightAction.label}
        </Text>
      </Pressable>
    </View>
  );

  const renderLeftActions = leftAction
    ? () => (
        <View
          style={[
            styles.actionContainer,
            styles.actionContainerLeft,
            { backgroundColor: leftAction.color },
          ]}
        >
          <Pressable style={styles.actionButton} onPress={runAndClose(leftAction.run)}>
            <Ionicons name={leftAction.icon} size={20} color="#fff" />
            <Text style={styles.actionLabel} numberOfLines={2}>
              {leftAction.label}
            </Text>
          </Pressable>
        </View>
      )
    : undefined;

  const content = (
    <Pressable onPress={onPress} onLongPress={onLongPress}>
      <Card>
        <View style={styles.row}>
          {selectionMode ? (
            <SelectionCheckbox
              selected={selected}
              color={theme.colors.primary}
              inactiveColor={theme.colors.textSecondary}
            />
          ) : (
            <View
              style={[styles.priorityDot, { backgroundColor: priorityColors[item.priority] }]}
            />
          )}
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

  if (item.pendingSync || selectionMode) {
    return content;
  }

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      leftThreshold={40}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      overshootRight={false}
      overshootLeft={false}
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
      width: 110,
      borderRadius: theme.radius.lg,
      marginLeft: theme.spacing.sm,
      overflow: 'hidden',
    },
    actionContainerLeft: { marginLeft: 0, marginRight: theme.spacing.sm },
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
      lineHeight: 14,
    },
  });
}
