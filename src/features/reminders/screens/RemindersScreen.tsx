import { useState } from 'react';
import { View, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { PressableScale } from '@/components/PressableScale';
import { Text } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { FAB } from '@/components/FAB';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTabBarClearance } from '@/hooks/useTabBarClearance';
import { useReminders } from '@/features/reminders/hooks/useReminders';
import {
  useUpdateReminderStatus,
  useDeleteReminder,
} from '@/features/reminders/hooks/useReminderMutations';
import { ReminderFormSheet } from '@/features/reminders/screens/ReminderFormSheet';
import type { Reminder } from '@/features/reminders/services/reminders.service';

function dateOnly(iso: string): Date {
  const parts = iso.split('-').map(Number);
  const [y, m, d] = [parts[0] ?? 1970, parts[1] ?? 1, parts[2] ?? 1];
  return new Date(y, m - 1, d);
}

function formatDate(iso: string): string {
  const d = dateOnly(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function isOverdue(reminder: Reminder): boolean {
  if (reminder.status !== 'active') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dateOnly(reminder.dueDate) < today;
}

export function RemindersScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const tabBarClearance = useTabBarClearance();
  const { data: reminders, isLoading, isError } = useReminders();
  const statusMutation = useUpdateReminderStatus();
  const deleteMutation = useDeleteReminder();
  const [formVisible, setFormVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Reminder | null>(null);
  const styles = createStyles(theme);

  const active = (reminders ?? []).filter((r) => r.status === 'active');
  const overdue = active.filter(isOverdue);
  const upcoming = active
    .filter((r) => !isOverdue(r))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteMutation.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
  };

  const renderReminder = (reminder: Reminder, index: number, overdueStyle: boolean) => (
    <Animated.View key={reminder.id} entering={FadeInDown.delay(index * 40).duration(220)}>
      <PressableScale
        onLongPress={() => setPendingDelete(reminder)}
        onPress={() => statusMutation.mutate({ reminderId: reminder.id, status: 'done' })}
      >
        <Card>
          <View style={styles.row}>
            <Pressable
              onPress={() => statusMutation.mutate({ reminderId: reminder.id, status: 'done' })}
              hitSlop={8}
            >
              <Feather name="circle" size={22} color={theme.colors.textSecondary} />
            </Pressable>
            <View style={styles.info}>
              <Text style={styles.reminderTitle} numberOfLines={2}>
                {reminder.title}
              </Text>
              {reminder.relatedSupplierName ? (
                <Text style={styles.reminderMeta} numberOfLines={1}>
                  {reminder.relatedSupplierName}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.dateText, overdueStyle && styles.dateTextOverdue]}>
              {formatDate(reminder.dueDate)}
            </Text>
          </View>
        </Card>
      </PressableScale>
    </Animated.View>
  );

  return (
    <Screen>
      <View style={styles.container}>
        <ScreenHeader title={t('reminders.title')} onBack={() => router.back()} />

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : isError ? (
          <Text style={styles.errorText}>{t('organizations.settings.loadError')}</Text>
        ) : active.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="bell"
              title={t('reminders.empty')}
              message={t('reminders.emptyMessage')}
            />
          </View>
        ) : (
          <FlatList
            data={[{ key: 'content' }]}
            keyExtractor={(item) => item.key}
            contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance + 80 }]}
            showsVerticalScrollIndicator={false}
            renderItem={() => (
              <View style={styles.sections}>
                {overdue.length > 0 ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitleOverdue}>
                      {t('reminders.overdueTitle', { count: overdue.length })}
                    </Text>
                    <View style={styles.sectionList}>
                      {overdue.map((r, i) => renderReminder(r, i, true))}
                    </View>
                  </View>
                ) : null}

                {upcoming.length > 0 ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('reminders.upcomingTitle')}</Text>
                    <View style={styles.sectionList}>
                      {upcoming.map((r, i) => renderReminder(r, i, false))}
                    </View>
                  </View>
                ) : null}
              </View>
            )}
          />
        )}

        <FAB
          onPress={() => setFormVisible(true)}
          style={[styles.fab, { bottom: tabBarClearance + theme.spacing.md }]}
        />
      </View>

      <ReminderFormSheet visible={formVisible} onClose={() => setFormVisible(false)} />

      <ConfirmDialog
        visible={!!pendingDelete}
        title={t('reminders.deleteConfirmTitle')}
        message={t('reminders.deleteConfirmMessage')}
        confirmLabel={t('organizations.settings.deleteConfirmButton')}
        cancelLabel={t('organizations.settings.cancelButton')}
        destructive
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { color: theme.colors.danger, textAlign: 'center' },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { flexGrow: 1 },
    sections: { gap: theme.spacing.lg },
    section: { gap: theme.spacing.sm },
    sectionList: { gap: theme.spacing.sm },
    sectionTitle: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textSecondary,
    },
    sectionTitleOverdue: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.danger,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    info: { flex: 1, gap: 2 },
    reminderTitle: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.textPrimary,
    },
    reminderMeta: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
    dateText: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
    dateTextOverdue: { color: theme.colors.danger, fontWeight: theme.fontWeights.semiBold },
    fab: { position: 'absolute', right: 0 },
  });
}
