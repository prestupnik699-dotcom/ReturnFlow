import { useState } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTeamMembers } from '@/features/users/hooks/useTeamMembers';
import {
  useUpdateMemberRole,
  useSetMemberStatus,
  useRemoveMemberAccess,
} from '@/features/users/hooks/useTeamMutations';
import type { ProfileStatus } from '@/features/users/services/team.service';
import type { MembershipRole } from '@/features/auth/services/membership.service';
import { useAuthStore } from '@/stores/auth.store';

const ROLES: MembershipRole[] = ['Employee', 'StoreManager', 'Owner'];
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
  const [removeConfirmVisible, setRemoveConfirmVisible] = useState(false);
  const styles = createStyles(theme);

  const member = members?.find((m) => m.membershipId === membershipId) ?? null;

  if (!member) return null;

  const isSelf = currentProfile?.id === member.profileId;
  const statusLabels: Record<ProfileStatus, string> = {
    active: t('users.team.statusActive'),
    vacation: t('users.team.statusVacation'),
    blocked: t('users.team.statusBlocked'),
  };

  const confirmRemove = () => {
    removeMutation.mutate(member.membershipId, {
      onSuccess: () => {
        setRemoveConfirmVisible(false);
        onClose();
      },
    });
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
            onPress={() => setRemoveConfirmVisible(true)}
            loading={removeMutation.isPending}
          />
        ) : null}

        {removeMutation.isError ? (
          <Text style={styles.errorText}>{removeMutation.error.message}</Text>
        ) : null}

        <Button label={t('common.back')} variant="outline" onPress={onClose} />
      </View>

      <ConfirmDialog
        visible={removeConfirmVisible}
        title={t('users.team.removeConfirmTitle')}
        message={t('users.team.removeConfirmMessage')}
        confirmLabel={t('users.team.removeAccess')}
        cancelLabel={t('organizations.settings.cancelButton')}
        destructive
        loading={removeMutation.isPending}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveConfirmVisible(false)}
      />
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
