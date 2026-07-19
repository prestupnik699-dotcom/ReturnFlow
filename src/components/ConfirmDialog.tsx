import { useEffect } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { Button } from '@/components/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { hapticWarning, hapticImpactMedium } from '@/lib/haptics';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  loading,
  onConfirm,
  onCancel,
}: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);

  // A light warning buzz the moment a destructive confirmation appears —
  // reinforces "careful, this one matters" before the person even reads
  // the text, the same way native iOS delete sheets feel.
  useEffect(() => {
    if (visible && destructive) {
      hapticWarning();
    }
  }, [visible, destructive]);

  const handleConfirm = () => {
    hapticImpactMedium();
    onConfirm();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Button
              label={cancelLabel}
              variant="outline"
              onPress={onCancel}
              style={styles.flexButton}
            />
            <Button
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={handleConfirm}
              loading={loading}
              style={styles.flexButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    title: {
      fontSize: theme.fontSizes.lg,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    message: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, lineHeight: 20 },
    actions: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.sm },
    flexButton: { flex: 1 },
  });
}
