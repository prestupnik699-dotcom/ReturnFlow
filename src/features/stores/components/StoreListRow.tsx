import { useRef } from 'react';
import { View, Pressable, StyleSheet, Linking } from 'react-native';
import { Text } from '@/components/AppText';
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
import { hapticImpactLight } from '@/lib/haptics';
import type { Store } from '@/features/stores/services/stores.service';

type Theme = ReturnType<typeof useTheme>;

// Same single-panel-progress pattern as ReturnListRow — watches only this
// row's own swipe progress, so there's no shared direction enum that could
// get cross-wired between rows.
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
  store: Store;
  isCurrent: boolean;
  returnsTotal: number;
  returnsUrgent: number;
  deliveriesTotal: number;
  subtitle: string;
  onSelectCurrent: () => void;
  onEdit: () => void;
  onOpenChat: () => void;
  onRequestDelete: () => void;
};

export function StoreListRow({
  store,
  isCurrent,
  returnsTotal,
  returnsUrgent,
  deliveriesTotal,
  subtitle,
  onSelectCurrent,
  onEdit,
  onOpenChat,
  onRequestDelete,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const canDelete = useHasRole(['Owner', 'Administrator']);
  const swipeableRef = useRef<SwipeableMethods>(null);
  const styles = createStyles(theme);

  const trigger = () => {
    hapticImpactLight();
    onRequestDelete();
    swipeableRef.current?.close();
  };

  const content = (
    <Card>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <Pressable onPress={onSelectCurrent} hitSlop={8}>
            <Ionicons
              name={isCurrent ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color={isCurrent ? theme.colors.primary : theme.colors.textSecondary}
            />
          </Pressable>

          <View style={styles.avatar}>
            <Ionicons name="storefront-outline" size={20} color={theme.colors.primary} />
          </View>

          <PressableScale style={styles.info} onPress={onEdit}>
            <Text style={styles.name} numberOfLines={1}>
              {store.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {subtitle}
            </Text>
          </PressableScale>

          <Pressable style={styles.chatButton} onPress={onOpenChat} hitSlop={8}>
            <Ionicons name="chatbubble-outline" size={18} color={theme.colors.primary} />
          </Pressable>
        </View>

        {store.phone ? (
          <Pressable style={styles.phoneRow} onPress={() => Linking.openURL(`tel:${store.phone}`)}>
            <Ionicons name="call-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.phoneText}>{store.phone}</Text>
          </Pressable>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statBadge}>
            <Ionicons name="repeat-outline" size={13} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>{t('stores.returnsCount', { count: returnsTotal })}</Text>
          </View>
          {returnsUrgent > 0 ? (
            <View style={[styles.statBadge, styles.urgentBadge]}>
              <View style={styles.urgentDot} />
              <Text style={[styles.statText, styles.urgentText]}>
                {t('stores.attentionBadge', { count: returnsUrgent })}
              </Text>
            </View>
          ) : null}
          {isCurrent ? (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>{t('stores.currentBadge')}</Text>
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
          label={t('stores.deleteAction')}
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
    info: { flex: 1, gap: 2 },
    name: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    meta: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    chatButton: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    phoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xsPlus,
      marginLeft: 60,
    },
    phoneText: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginLeft: 60,
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
    currentBadge: {
      backgroundColor: theme.colors.primary + '1F',
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
    },
    currentBadgeText: {
      fontSize: theme.fontSizes.xs,
      color: theme.colors.primary,
      fontWeight: theme.fontWeights.semiBold,
    },
  });
}
