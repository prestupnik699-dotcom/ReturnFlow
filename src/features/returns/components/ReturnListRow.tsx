import { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
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

type ActionSpec = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  run: () => void;
};

type Theme = ReturnType<typeof useTheme>;

// Watches its OWN panel's open-progress only — no left/right direction
// enum involved anywhere, so the two actions structurally cannot get
// cross-wired. Fires once when the panel settles fully open (full drag,
// or drag-past-threshold-then-release, which Swipeable auto-snaps open).
function SwipeActionPanel({
  progress,
  action,
  theme,
  alignLeft,
  onTriggered,
}: {
  progress: SharedValue<number>;
  action: ActionSpec;
  theme: Theme;
  alignLeft: boolean;
  onTriggered: () => void;
}) {
  const firedRef = useRef(false);
  const styles = createPanelStyles(theme, alignLeft);

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
    <View style={[styles.actionContainer, { backgroundColor: action.color }]}>
      <Pressable style={styles.actionButton} onPress={onTriggered}>
        <Ionicons name={action.icon} size={20} color="#fff" />
        <Text style={styles.actionLabel} numberOfLines={2}>
          {action.label}
        </Text>
      </Pressable>
    </View>
  );
}

function createPanelStyles(theme: Theme, alignLeft: boolean) {
  return StyleSheet.create({
    actionContainer: {
      width: 110,
      borderRadius: theme.radius.lg,
      marginLeft: alignLeft ? 0 : theme.spacing.sm,
      marginRight: alignLeft ? theme.spacing.sm : 0,
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
      lineHeight: 14,
    },
  });
}

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

  const rightAction: ActionSpec =
    item.status === 'pending' || item.status === 'urgent'
      ? {
          label: t('returns.detail.markReturned'),
          icon: 'checkmark-circle-outline',
          color: theme.colors.success,
          run: () => markReturnedMutation.mutate(),
        }
      : item.status === 'returned'
        ? {
            label: t('returns.detail.archive'),
            icon: 'archive-outline',
            color: theme.colors.textSecondary,
            run: () => archiveMutation.mutate(),
          }
        : {
            label: t('returns.detail.restore'),
            icon: 'refresh-outline',
            color: theme.colors.primary,
            run: () => restoreMutation.mutate(),
          };

  const leftAction: ActionSpec | null =
    item.status === 'returned'
      ? {
          label: t('returns.detail.cancelReturn'),
          icon: 'arrow-undo-outline',
          color: theme.colors.warning,
          run: () => restoreMutation.mutate(),
        }
      : null;

  const trigger = (action: ActionSpec) => () => {
    action.run();
    swipeableRef.current?.close();
  };

  const renderRightActions = (progress: SharedValue<number>) => (
    <SwipeActionPanel
      progress={progress}
      action={rightAction}
      theme={theme}
      alignLeft={false}
      onTriggered={trigger(rightAction)}
    />
  );

  const renderLeftActions = leftAction
    ? (progress: SharedValue<number>) => (
        <SwipeActionPanel
          progress={progress}
          action={leftAction}
          theme={theme}
          alignLeft={true}
          onTriggered={trigger(leftAction)}
        />
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

function createStyles(theme: Theme) {
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
  });
}
