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
import { hapticImpactLight, hapticSelection } from '@/lib/haptics';
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
            <Ionicons
              name={supplier.favorite ? 'star' : 'star-outline'}
              size={20}
              color={supplier.favorite ? theme.colors.warning : theme.colors.textSecondary}
            />
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
          <Text style={styles.detailLine}>
            {t('suppliers.returnsCount', { count: returnsTotal })}
          </Text>
          <Text style={styles.detailLine}>
            {t('suppliers.deliveriesCount', { count: deliveriesTotal })}
          </Text>
          {reliability?.defectRatePercent != null ? (
            <Text
              style={[
                styles.detailLine,
                reliability.defectRatePercent > 15
                  ? styles.reliabilityLineBad
                  : reliability.defectRatePercent > 5
                    ? styles.reliabilityLineWarn
                    : styles.reliabilityLineGood,
              ]}
            >
              {t('suppliers.defectRate', { percent: reliability.defectRatePercent.toFixed(1) })}
            </Text>
          ) : null}
          {returnsUrgent > 0 ? (
            <Text style={[styles.detailLine, styles.urgentLine]}>
              {t('suppliers.attentionBadge', { count: returnsUrgent })}
            </Text>
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
    detailsList: { marginLeft: 52, gap: 4 },
    detailLine: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSecondary,
    },
    urgentLine: { color: theme.colors.danger, fontWeight: theme.fontWeights.semiBold },
    reliabilityLineGood: { color: theme.colors.success, fontWeight: theme.fontWeights.semiBold },
    reliabilityLineWarn: { color: theme.colors.warning, fontWeight: theme.fontWeights.semiBold },
    reliabilityLineBad: { color: theme.colors.danger, fontWeight: theme.fontWeights.semiBold },
  });
}
