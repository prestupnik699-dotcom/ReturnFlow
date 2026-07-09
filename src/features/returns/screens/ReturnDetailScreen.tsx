import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useReturn } from '@/features/returns/hooks/useReturn';
import { useReturnHistory } from '@/features/returns/hooks/useReturnHistory';
import { useReturnComments } from '@/features/returns/hooks/useReturnComments';
import { ReturnPhotos } from '@/features/returns/components/ReturnPhotos';
import { useCreateReturnComment } from '@/features/returns/hooks/useCreateReturnComment';
import {
  useMarkReturned,
  useArchiveReturn,
  useRestoreReturn,
} from '@/features/returns/hooks/useReturnStatusActions';
import { useAuthStore } from '@/stores/auth.store';
import { useHasRole } from '@/features/auth/hooks/usePermissions';
import type { ReturnStatus, ReturnPriority } from '@/features/returns/services/returns.service';

type Props = { returnId: string };

const EDIT_ROLES = ['Owner', 'Administrator', 'StoreManager', 'Receiver'] as const;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ReturnDetailScreen({ returnId }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const profile = useAuthStore((state) => state.profile);
  const { data: item, isLoading, isError } = useReturn(returnId);
  const { data: history } = useReturnHistory(returnId);
  const { data: comments } = useReturnComments(returnId);
  const commentMutation = useCreateReturnComment(returnId);
  const markReturnedMutation = useMarkReturned(returnId);
  const archiveMutation = useArchiveReturn(returnId);
  const restoreMutation = useRestoreReturn(returnId);
  const hasEditRole = useHasRole([...EDIT_ROLES]);
  const [commentText, setCommentText] = useState('');
  const styles = createStyles(theme);

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  if (isError || !item) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.errorText}>{t('organizations.settings.loadError')}</Text>
        </View>
      </Screen>
    );
  }

  const canEdit = hasEditRole || item.createdBy === profile?.id;

  const statusLabels: Record<ReturnStatus, string> = {
    pending: t('returns.statusPending'),
    urgent: t('returns.statusUrgent'),
    returned: t('returns.statusReturned'),
    archived: t('returns.statusArchived'),
  };

  const priorityLabels: Record<ReturnPriority, string> = {
    low: t('returns.priorityLow'),
    normal: t('returns.priorityNormal'),
    high: t('returns.priorityHigh'),
    critical: t('returns.priorityCritical'),
  };

  const historyLabels: Record<string, string> = {
    created: t('returns.history.created'),
    status_changed: t('returns.history.statusChanged'),
    comment_added: t('returns.history.comment_added'),
  };

  const handleSendComment = () => {
    const text = commentText.trim();
    if (!text) return;
    commentMutation.mutate(text, { onSuccess: () => setCommentText('') });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>
          {item.supplierName} · ×{item.quantity}
        </Text>

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{statusLabels[item.status]}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{priorityLabels[item.priority]}</Text>
          </View>
        </View>

        {item.reason ? (
          <Card>
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>{t('returns.create.reasonLabel')}</Text>
              <Text style={styles.reasonText}>{item.reason}</Text>
            </View>
          </Card>
        ) : null}

        <ReturnPhotos returnId={returnId} canEdit={canEdit} />

        {canEdit ? (
          <View style={styles.actions}>
            {item.status === 'pending' || item.status === 'urgent' ? (
              <Button
                label={t('returns.detail.markReturned')}
                onPress={() => markReturnedMutation.mutate()}
                loading={markReturnedMutation.isPending}
              />
            ) : null}
            {item.status === 'returned' ? (
              <Button
                label={t('returns.detail.archive')}
                variant="outline"
                onPress={() => archiveMutation.mutate()}
                loading={archiveMutation.isPending}
              />
            ) : null}
            {item.status === 'archived' ? (
              <Button
                label={t('returns.detail.restore')}
                variant="outline"
                onPress={() => restoreMutation.mutate()}
                loading={restoreMutation.isPending}
              />
            ) : null}
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>{t('returns.detail.commentsTitle')}</Text>
        <Card>
          {comments && comments.length > 0 ? (
            comments.map((c, index) => (
              <View key={c.id} style={[styles.commentRow, index === 0 && styles.rowFirst]}>
                <Text style={styles.commentAuthor}>{c.authorName}</Text>
                <Text style={styles.commentText}>{c.comment}</Text>
                <Text style={styles.commentMeta}>{formatDateTime(c.createdAt)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{t('returns.detail.noComments')}</Text>
            </View>
          )}
        </Card>

        <View style={styles.commentInputRow}>
          <TextInput
            style={styles.commentInput}
            placeholder={t('returns.detail.commentPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <Button
            label={t('returns.detail.commentSend')}
            onPress={handleSendComment}
            loading={commentMutation.isPending}
          />
        </View>

        <Text style={styles.sectionTitle}>{t('returns.detail.historyTitle')}</Text>
        <Card>
          {(history ?? []).map((entry, index) => (
            <View key={entry.id} style={[styles.historyRow, index === 0 && styles.rowFirst]}>
              <Text style={styles.historyAction}>
                {historyLabels[entry.action] ?? entry.action}
              </Text>
              <Text style={styles.historyMeta}>
                {entry.userName} · {formatDateTime(entry.createdAt)}
              </Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { color: theme.colors.danger, textAlign: 'center' },
    title: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    subtitle: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    badgeRow: { flexDirection: 'row', gap: theme.spacing.sm },
    badge: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 10,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
    },
    badgeText: {
      fontSize: theme.fontSizes.xs,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.textPrimary,
    },
    reasonBox: { padding: theme.spacing.lg, gap: 4 },
    reasonLabel: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
    reasonText: { fontSize: theme.fontSizes.md, color: theme.colors.textPrimary },
    actions: { gap: theme.spacing.sm },
    sectionTitle: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
    },
    rowFirst: { borderTopWidth: 0 },
    emptyBox: { padding: theme.spacing.lg },
    emptyText: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    commentRow: {
      padding: theme.spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      gap: 2,
    },
    commentAuthor: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    commentText: { fontSize: theme.fontSizes.md, color: theme.colors.textPrimary },
    commentMeta: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
    commentInputRow: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-end' },
    commentInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      fontSize: theme.fontSizes.md,
      color: theme.colors.textPrimary,
      maxHeight: 100,
    },
    historyRow: {
      padding: theme.spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      gap: 2,
    },
    historyAction: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.textPrimary,
    },
    historyMeta: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
  });
}
