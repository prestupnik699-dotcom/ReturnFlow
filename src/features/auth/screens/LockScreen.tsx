import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { hapticSuccess, hapticError } from '@/lib/haptics';

type Props = { onUnlock: () => Promise<boolean> };

export function LockScreen({ onUnlock }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const styles = createStyles(theme);

  const attempt = async () => {
    setFailed(false);
    const success = await onUnlock();
    if (success) {
      hapticSuccess();
    } else {
      hapticError();
      setFailed(true);
    }
  };

  // Prompt automatically on mount — matches how banking apps behave,
  // rather than making the person tap a button first every single time.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: prompt for auth once on mount, same as a banking app would
    attempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Feather name="lock" size={40} color={theme.colors.primary} />
        </View>
        <Text style={styles.title}>{t('profile.security.unlockTitle')}</Text>
        {failed ? (
          <Text style={styles.failedText}>{t('profile.security.unlockFailed')}</Text>
        ) : null}
        <Button
          label={t('profile.security.unlockButton')}
          onPress={attempt}
          style={styles.button}
        />
      </View>
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg },
    iconWrap: {
      width: 80,
      height: 80,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: theme.fontSizes.lg,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    failedText: { fontSize: theme.fontSizes.sm, color: theme.colors.danger, textAlign: 'center' },
    button: { marginTop: theme.spacing.md },
  });
}
