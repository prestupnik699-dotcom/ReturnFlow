import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';

type Props = { onRetry: () => void };

export function ErrorFallback({ onRetry }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('errors.boundary.title')}</Text>
      <Text style={styles.message}>{t('errors.boundary.message')}</Text>
      <Pressable style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>{t('errors.boundary.retry')}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    title: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    message: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      marginTop: theme.spacing.md,
    },
    buttonText: {
      color: theme.colors.onPrimary,
      fontWeight: theme.fontWeights.semiBold,
      fontSize: theme.fontSizes.md,
    },
  });
}
