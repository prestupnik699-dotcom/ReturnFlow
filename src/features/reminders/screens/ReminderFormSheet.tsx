import { useEffect, useState } from 'react';
import { Modal, View, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { useCreateReminder } from '@/features/reminders/hooks/useReminderMutations';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import { useTeamMembers } from '@/features/users/hooks/useTeamMembers';
import { useAuthStore } from '@/stores/auth.store';
import { hapticSuccess } from '@/lib/haptics';

type Props = { visible: boolean; onClose: () => void };

function toIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDisplayDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function ReminderFormSheet({ visible, onClose }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const currentProfile = useAuthStore((state) => state.profile);
  const { data: suppliers } = useSuppliers(false, 'name');
  const { data: teamMembers } = useTeamMembers();
  const mutation = useCreateReminder();
  const styles = createStyles(theme);

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [titleError, setTitleError] = useState(false);

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: resetting the form fresh each time the sheet opens
      setTitle('');
      setDueDate(new Date());
      setSupplierId(null);
      setRecipientIds([]);
      setTitleError(false);
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClose = () => {
    onClose();
  };

  const toggleRecipient = (profileId: string) => {
    setRecipientIds((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId],
    );
  };

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError(true);
      return;
    }

    mutation.mutate(
      {
        title: trimmed,
        dueDate: toIsoDate(dueDate),
        relatedSupplierId: supplierId,
        recipientProfileIds: recipientIds,
      },
      {
        onSuccess: () => {
          hapticSuccess();
          handleClose();
        },
      },
    );
  };

  // Teammates other than the creator — the creator is always a recipient
  // automatically, so they don't need their own name in this picker.
  const otherMembers = (teamMembers ?? []).filter((m) => m.profileId !== currentProfile?.id);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{t('reminders.create.title')}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>{t('reminders.create.textLabel')}</Text>
          <TextInput
            style={[styles.input, titleError && styles.inputError]}
            value={title}
            onChangeText={(v) => {
              setTitle(v);
              setTitleError(false);
            }}
            placeholder={t('reminders.create.textPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            multiline
          />
          {titleError ? (
            <Text style={styles.errorText}>{t('reminders.create.textRequired')}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('reminders.create.dateLabel')}</Text>
          <Pressable style={styles.dateRow} onPress={() => setPickerVisible(true)}>
            <Feather name="calendar" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.dateText}>{formatDisplayDate(dueDate)}</Text>
          </Pressable>
          {pickerVisible ? (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(_, selected) => {
                setPickerVisible(false);
                if (selected) setDueDate(selected);
              }}
            />
          ) : null}
        </View>

        {suppliers && suppliers.length > 0 ? (
          <View style={styles.field}>
            <Text style={styles.label}>{t('reminders.create.supplierLabel')}</Text>
            <View style={styles.chipRow}>
              {suppliers.map((s) => (
                <Chip
                  key={s.id}
                  label={s.name}
                  selected={supplierId === s.id}
                  onPress={() => setSupplierId(supplierId === s.id ? null : s.id)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {otherMembers.length > 0 ? (
          <View style={styles.field}>
            <Text style={styles.label}>{t('reminders.create.recipientsLabel')}</Text>
            <Text style={styles.recipientsHint}>{t('reminders.create.recipientsHint')}</Text>
            <View style={styles.chipRow}>
              {otherMembers.map((m) => (
                <Chip
                  key={m.profileId}
                  label={`${m.firstName} ${m.lastName}`}
                  selected={recipientIds.includes(m.profileId)}
                  onPress={() => toggleRecipient(m.profileId)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {mutation.isError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{mutation.error.message}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            label={t('organizations.settings.cancelButton')}
            variant="outline"
            onPress={handleClose}
            style={styles.flexButton}
          />
          <Button
            label={t('reminders.create.submit')}
            onPress={handleSubmit}
            loading={mutation.isPending}
            style={styles.flexButton}
          />
        </View>
      </ScrollView>
    </Modal>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    scrollView: { flex: 1, backgroundColor: theme.colors.background },
    container: { padding: theme.spacing.xl, gap: theme.spacing.lg },
    title: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    field: { gap: theme.spacing.xs },
    label: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.textSecondary,
    },
    recipientsHint: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      fontSize: theme.fontSizes.md,
      color: theme.colors.textPrimary,
      minHeight: 60,
      textAlignVertical: 'top',
    },
    inputError: { borderColor: theme.colors.danger },
    errorText: { fontSize: theme.fontSizes.xs, color: theme.colors.danger },
    errorBanner: {
      backgroundColor: theme.colors.danger + '15',
      borderRadius: theme.radius.sm,
      padding: theme.spacing.md,
    },
    errorBannerText: {
      color: theme.colors.danger,
      fontSize: theme.fontSizes.sm,
      textAlign: 'center',
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    dateText: { fontSize: theme.fontSizes.md, color: theme.colors.textPrimary },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    actions: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md },
    flexButton: { flex: 1 },
  });
}
