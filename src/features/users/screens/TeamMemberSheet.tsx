import { Modal, View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/Button';
import {
  useUpdateMemberRole,
  useSetMemberStatus,
  useRemoveMemberAccess,
} from '@/features/users/hooks/useTeamMutations';
import type { TeamMember, ProfileStatus } from '@/features/users/services/team.service';
import type { MembershipRole } from '@/features/auth/services/membership.service';
import { useAuthStore } from '@/stores/auth.store';

const ROLES: MembershipRole[] = [
  'Employee',
  'Receiver',
  'Viewer',
  'StoreManager',
  'Administrator',
  'Owner',
];
const STATUSES: ProfileStatus[] = ['active', 'vacation', 'blocked'];

type Props = { visible: boolean; onClose: () => void; member: TeamMember | null };

export function TeamMemberSheet({ visible, onClose, member }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const currentProfile = useAuthStore((state) => state.profile);
  const roleMutation = useUpdateMemberRole();
  const statusMutation = useSetMemberStatus();
  const removeMutation = useRemoveMemberAccess();
  const styles = createStyles(theme);

  if (!member) return null;

  const isSelf = currentProfile?.id === member.profileId;
  const statusLabels: Record<ProfileStatus, string> = {
    active: t('users.team.statusActive'),
    vacation: t('users.team.statusVacation'),
    blocked: t('users.team.statusBlocked'),
  };

  const handleRemove = () => {
    Alert.alert(t('users.team.removeConfirmTitle'), t('users.team.removeConfirmMessage'), [
      { text: t('organizations.settings.cancelButton'), style: 'cancel' },
      {
        text: t('users.team.removeAccess'),
        style: 'destructive',
        onPress: () => {
          removeMutation.mutate(member.membershipId, { onSuccess: onClose });
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Text style={styles.title}>
          {member.firstName} {member.lastName} {isSelf ? t('users.team.you') : ''}
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>{t('users.team.roleLabel')}</Text>
          <View style={styles.chipRow}>
            {ROLES.map((role) => (
              <Pressable
                key={role}
                disabled={isSelf}
                onPress={() => roleMutation.mutate({ membershipId: member.membershipId, role })}
                style={[
                  styles.chip,
                  member.role === role && styles.chipActive,
                  isSelf && styles.chipDisabled,
                ]}
              >
                <Text style={[styles.chipText, member.role === role && styles.chipTextActive]}>
                  {role}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('users.team.statusLabel')}</Text>
          <View style={styles.chipRow}>
            {STATUSES.map((status) => (
              <Pressable
                key={status}
                disabled={isSelf}
                onPress={() => statusMutation.mutate({ membershipId: member.membershipId, status })}
                style={[
                  styles.chip,
                  member.status === status && styles.chipActive,
                  isSelf && styles.chipDisabled,
                ]}
              >
                <Text style={[styles.chipText, member.status === status && styles.chipTextActive]}>
                  {statusLabels[status]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {!isSelf ? (
          <Button
            label={t('users.team.removeAccess')}
            variant="danger"
            onPress={handleRemove}
            loading={removeMutation.isPending}
          />
        ) : null}

        <Button label={t('common.back')} variant="outline" onPress={onClose} />
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
      fontSize: theme.fontSizes.lg,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    field: { gap: theme.spacing.sm },
    label: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.textSecondary,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    chip: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 20,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    chipDisabled: { opacity: 0.4 },
    chipText: { color: theme.colors.textPrimary, fontSize: theme.fontSizes.sm },
    chipTextActive: { color: theme.colors.onPrimary, fontWeight: theme.fontWeights.semiBold },
  });
}
