import { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { useTeamMembers } from '@/features/users/hooks/useTeamMembers';
import { TeamMemberSheet } from '@/features/users/screens/TeamMemberSheet';
import type { ProfileStatus } from '@/features/users/services/team.service';

export function TeamScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: members, isLoading, isError } = useTeamMembers();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const styles = createStyles(theme);

  const statusLabels: Record<ProfileStatus, string> = {
    active: t('users.team.statusActive'),
    vacation: t('users.team.statusVacation'),
    blocked: t('users.team.statusBlocked'),
  };

  const statusColors: Record<ProfileStatus, string> = {
    active: theme.colors.success,
    vacation: theme.colors.warning,
    blocked: theme.colors.danger,
  };

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>{t('users.team.title')}</Text>

        {isError ? (
          <Text style={styles.errorText}>{t('organizations.settings.loadError')}</Text>
        ) : (
          <FlatList
            data={members}
            keyExtractor={(item) => item.membershipId}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>{t('users.team.empty')}</Text>}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(index * 60).duration(300)}>
                <Card>
                  <View style={styles.row} onTouchEnd={() => setSelectedId(item.membershipId)}>
                    <View style={styles.info}>
                      <Text style={styles.name}>
                        {item.firstName} {item.lastName}
                      </Text>
                      <Text style={styles.role}>{item.role}</Text>
                    </View>
                    <View
                      style={[styles.statusDot, { backgroundColor: statusColors[item.status] }]}
                    />
                    <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
                      {statusLabels[item.status]}
                    </Text>
                  </View>
                </Card>
              </Animated.View>
            )}
          />
        )}
      </View>

      <TeamMemberSheet
        visible={!!selectedId}
        onClose={() => setSelectedId(null)}
        membershipId={selectedId}
      />
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, gap: theme.spacing.md },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    list: { gap: theme.spacing.sm, paddingBottom: theme.spacing.md },
    empty: { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.xl },
    errorText: { color: theme.colors.danger, textAlign: 'center' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
    },
    info: { flex: 1, gap: 2 },
    name: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    role: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: theme.fontSizes.xs, fontWeight: theme.fontWeights.medium },
  });
}
