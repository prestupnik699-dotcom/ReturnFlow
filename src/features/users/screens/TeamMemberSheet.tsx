import { Modal, View, Text, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { useTeamMembers } from '@/features/users/hooks/useTeamMembers';
import {
  useUpdateMemberRole,
  useSetMemberStatus,
  useRemoveMemberAccess,
} from '@/features/users/hooks/useTeamMutations';
import type { ProfileStatus } from '@/features/users/services/team.service';
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

type Props = { visible: boolean; onClose: () => void; membershipId: string | null };

export function TeamMemberSheet({ visible, onClose, membershipId }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: members } = useTeamMembers();
  const currentProfile = useAuthStore((state) => state.profile);
  const roleMutation = useUpdateMemberRole();
  const statusMutation = useSetMemberStatus();
  const removeMutation = useRemoveMemberAccess();
  const styles = createStyles(theme);

  const member = members?.find((m) => m.membershipId === membershipId) ?? null;

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
        onPress: () => removeMutation.mutate(member.membershipId, { onSuccess: onClose }),
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
              <Chip
                key={role}
                label={role}
                selected={member.role === role}
                disabled={isSelf}
                onPress={() => roleMutation.mutate({ membershipId: member.membershipId, role })}
              />
            ))}
          </View>
          {roleMutation.isError ? (
            <Text style={styles.errorText}>{roleMutation.error.message}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('users.team.statusLabel')}</Text>
          <View style={styles.chipRow}>
            {STATUSES.map((status) => (
              <Chip
                key={status}
                label={statusLabels[status]}
                selected={member.status === status}
                disabled={isSelf}
                onPress={() => statusMutation.mutate({ membershipId: member.membershipId, status })}
              />
            ))}
          </View>
          {statusMutation.isError ? (
            <Text style={styles.errorText}>{statusMutation.error.message}</Text>
          ) : null}
        </View>

        {!isSelf ? (
          <Button
            label={t('users.team.removeAccess')}
            variant="danger"
            onPress={handleRemove}
            loading={removeMutation.isPending}
          />
        ) : null}

        {removeMutation.isError ? (
          <Text style={styles.errorText}>{removeMutation.error.message}</Text>
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
      gap: theme.spacing.xl,
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
    errorText: { fontSize: theme.fontSizes.xs, color: theme.colors.danger },
  });
}
