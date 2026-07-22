import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

export type QueuedScanItem = {
  id: string;
  barcode: string;
  title: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
};

type Props = {
  visible: boolean;
  items: QueuedScanItem[];
  isSubmitting: boolean;
  onChangeQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function BatchScanReviewSheet({
  visible,
  items,
  isSubmitting,
  onChangeQuantity,
  onRemove,
  onConfirm,
  onCancel,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        <Text style={styles.title}>{t('scanner.batchReviewTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('scanner.batchReviewSubtitle', { count: items.length })}
        </Text>

        <View style={styles.list}>
          {items.map((item) => (
            <Card key={item.id}>
              <View style={styles.row}>
                <View style={styles.info}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.itemMeta} numberOfLines={1}>
                    {item.supplierName}
                  </Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() => onChangeQuantity(item.id, Math.max(1, item.quantity - 1))}
                    hitSlop={8}
                  >
                    <Feather name="minus" size={16} color={theme.colors.primary} />
                  </Pressable>
                  <Text style={styles.stepperValue}>{item.quantity}</Text>
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() => onChangeQuantity(item.id, item.quantity + 1)}
                    hitSlop={8}
                  >
                    <Feather name="plus" size={16} color={theme.colors.primary} />
                  </Pressable>
                </View>
                <Pressable
                  style={styles.removeButton}
                  onPress={() => onRemove(item.id)}
                  hitSlop={8}
                >
                  <Feather name="x" size={18} color={theme.colors.danger} />
                </Pressable>
              </View>
            </Card>
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            label={t('organizations.settings.cancelButton')}
            variant="outline"
            onPress={onCancel}
            style={styles.flexButton}
          />
          <Button
            label={isSubmitting ? t('scanner.batchSubmitting') : t('scanner.batchConfirmAll')}
            onPress={onConfirm}
            loading={isSubmitting}
            disabled={items.length === 0}
            style={styles.flexButton}
          />
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    title: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    subtitle: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    list: { gap: theme.spacing.sm, flex: 1 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    info: { flex: 1, gap: 2 },
    itemTitle: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    itemMeta: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
    },
    stepperButton: { padding: 2 },
    stepperValue: {
      minWidth: 20,
      textAlign: 'center',
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    removeButton: { padding: 4 },
    actions: { flexDirection: 'row', gap: theme.spacing.md },
    flexButton: { flex: 1 },
  });
}
