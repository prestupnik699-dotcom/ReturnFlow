import { useRef, useState, useEffect } from 'react';
import {
  View,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '@/components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ChatInputBar } from '@/features/chat/components/ChatInputBar';
import { useChatRoom } from '@/features/chat/hooks/useChatRoom';
import { useChatMessages } from '@/features/chat/hooks/useChatMessages';
import { useSendChatMessage } from '@/features/chat/hooks/useSendChatMessage';
import { useDeleteChatMessage } from '@/features/chat/hooks/useDeleteChatMessage';
import { useClearChat } from '@/features/chat/hooks/useClearChat';
import { useStoreName } from '@/features/stores/hooks/useStoreName';
import { useAuthStore } from '@/stores/auth.store';
import { useMembershipStore } from '@/stores/membership.store';
import { useHasRole } from '@/features/auth/hooks/usePermissions';
import { useMarkChatNotificationsRead } from '@/features/notifications/hooks/useMarkChatNotificationsRead';
import type { ChatMessage } from '@/features/chat/services/chat.service';
import Animated, { FadeInUp } from 'react-native-reanimated';

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

type ListItem =
  | { kind: 'divider'; id: string; label: string }
  | { kind: 'message'; id: string; message: ChatMessage };

export function ChatScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const profile = useAuthStore((state) => state.profile);
  const hasModeratorRole = useHasRole(['Owner']);
  const markChatRead = useMarkChatNotificationsRead();
  const { data: storeName } = useStoreName(activeStoreId);
  const { data: roomId } = useChatRoom();
  const { data: messages, isLoading } = useChatMessages(roomId ?? null);
  const sendMutation = useSendChatMessage(roomId ?? '');
  const deleteMutation = useDeleteChatMessage(roomId ?? null);
  const clearMutation = useClearChat(roomId ?? null);
  const [pendingDelete, setPendingDelete] = useState<ChatMessage | null>(null);
  const [clearConfirmVisible, setClearConfirmVisible] = useState(false);
  const styles = createStyles(theme);

  const messageCount = messages?.length ?? 0;
  // Ref, not state — writing it never triggers a re-render of this
  // screen, which is what keeps this purely a "have we shown this
  // message before" check without interfering with anything else.
  const seenMessageIdsRef = useRef<Set<string>>(new Set());

  // Opening the chat is what "reading" a chat notification means here —
  // clears the badge on the Chat entry point the same way opening the
  // Notification Center clears the bell.
  useEffect(() => {
    markChatRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!activeStoreId) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.noStoreText}>{t('chat.noStore')}</Text>
        </View>
      </Screen>
    );
  }

  const handleSend = (trimmed: string) => {
    if (!roomId) {
      if (__DEV__) console.error('Chat room not found for active store');
      return;
    }
    sendMutation.mutate(trimmed);
  };

  const handleLongPressMessage = (message: ChatMessage) => {
    const canDelete = message.authorId === profile?.id || hasModeratorRole;
    if (!canDelete) return;
    setPendingDelete(message);
  };

  const confirmDeleteMessage = () => {
    if (!pendingDelete) return;
    deleteMutation.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
  };

  const confirmClearChat = () => {
    clearMutation.mutate(undefined, { onSuccess: () => setClearConfirmVisible(false) });
  };

  // Insert a date-divider pill whenever a message falls on a different
  // calendar day than the one before it — the source list is
  // asc-ordered by createdAt (oldest first), so a single forward pass is
  // enough. The whole result is reversed afterward to feed an inverted
  // FlatList, which is what gives us "always anchored at the bottom,
  // newest message visible immediately" behavior for free, without ever
  // calling scrollToEnd manually — that manual scrolling was the root of
  // every timing-related bug we chased (clipped content, delayed
  // appearance, cascading animations).
  const dayLabel = (iso: string): string => {
    const d = new Date(iso);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dayKey(iso) === dayKey(now.toISOString())) return t('chat.dateToday');
    if (dayKey(iso) === dayKey(yesterday.toISOString())) return t('chat.dateYesterday');
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  };

  const chronological: ListItem[] = [];
  let lastDay: string | null = null;
  for (const message of messages ?? []) {
    const day = dayKey(message.createdAt);
    if (day !== lastDay) {
      chronological.push({
        kind: 'divider',
        id: `divider-${day}`,
        label: dayLabel(message.createdAt),
      });
      lastDay = day;
    }
    chronological.push({ kind: 'message', id: message.id, message });
  }
  const invertedListItems = [...chronological].reverse();

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === 'divider') {
      return (
        <View style={[styles.dividerRow, styles.invertedItem]}>
          <View style={styles.dividerPill}>
            <Text style={styles.dividerText}>{item.label}</Text>
          </View>
        </View>
      );
    }

    const message = item.message;
    const isOwn = message.authorId === profile?.id;
    const isNewMessage = !seenMessageIdsRef.current.has(message.id);
    seenMessageIdsRef.current.add(message.id);

    return (
      <Pressable
        style={styles.invertedItem}
        onPress={() => Keyboard.dismiss()}
        onLongPress={() => handleLongPressMessage(message)}
      >
        <Animated.View
          entering={isNewMessage ? FadeInUp.duration(220) : undefined}
          style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}
        >
          <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
            {!isOwn ? <Text style={styles.author}>{message.authorName}</Text> : null}
            <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
              {message.message}
            </Text>
            <Text style={[styles.time, isOwn && styles.timeOwn]}>
              {formatTime(message.createdAt)}
            </Text>
          </View>
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
            <Icon name="chevron-left" size={22} color={theme.colors.textPrimary} />
          </Pressable>
          <View style={styles.headerAvatar}>
            <Icon name="message-circle" size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {t('chat.title')}
            </Text>
            {storeName ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {storeName}
              </Text>
            ) : null}
          </View>
          {hasModeratorRole && messageCount > 0 ? (
            <Pressable
              style={styles.headerIcon}
              onPress={() => setClearConfirmVisible(true)}
              hitSlop={8}
            >
              <Icon name="trash-2" size={18} color={theme.colors.danger} />
            </Pressable>
          ) : null}
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : invertedListItems.length === 0 ? (
          <View style={styles.center}>
            <EmptyState
              icon="message-circle"
              title={t('chat.empty')}
              message={t('chat.emptyMessage')}
            />
          </View>
        ) : (
          <FlatList
            data={invertedListItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            inverted
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
          />
        )}

        {sendMutation.isError ? (
          <Text style={styles.errorText}>{sendMutation.error.message}</Text>
        ) : null}

        <ChatInputBar onSend={handleSend} sending={sendMutation.isPending} />
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={!!pendingDelete}
        title={t('chat.deleteConfirmTitle')}
        message={t('chat.deleteConfirmMessage')}
        confirmLabel={t('chat.deleteAction')}
        cancelLabel={t('organizations.settings.cancelButton')}
        destructive
        loading={deleteMutation.isPending}
        onConfirm={confirmDeleteMessage}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        visible={clearConfirmVisible}
        title={t('chat.clearChatConfirmTitle')}
        message={t('chat.clearChatConfirmMessage')}
        confirmLabel={t('chat.clearChat')}
        cancelLabel={t('organizations.settings.cancelButton')}
        destructive
        loading={clearMutation.isPending}
        onConfirm={confirmClearChat}
        onCancel={() => setClearConfirmVisible(false)}
      />
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    flex: { flex: 1, paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    noStoreText: { color: theme.colors.textSecondary, textAlign: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerAvatar: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: { flex: 1 },
    title: {
      fontSize: theme.fontSizes.lg,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    subtitle: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary, marginTop: 1 },
    headerIcon: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.danger + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    list: { flexGrow: 1, gap: theme.spacing.xs, paddingVertical: theme.spacing.sm },
    // Every row is individually flipped back to right-side-up, since the
    // FlatList itself is upside down (`inverted`) to get automatic
    // bottom-anchoring — without this, the whole row (including text)
    // would render upside down too.
    invertedItem: {},
    dividerRow: { alignItems: 'center', marginVertical: theme.spacing.sm },
    dividerPill: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 4,
    },
    dividerText: {
      fontSize: theme.fontSizes.xs,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.textSecondary,
    },
    bubbleRow: { flexDirection: 'row' },
    bubbleRowOwn: { justifyContent: 'flex-end' },
    bubbleRowOther: { justifyContent: 'flex-start' },
    bubble: {
      maxWidth: '78%',
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    bubbleOwn: { backgroundColor: theme.colors.primary, borderBottomRightRadius: theme.radius.sm },
    bubbleOther: {
      backgroundColor: theme.colors.surfaceVariant,
      borderBottomLeftRadius: theme.radius.sm,
    },
    author: {
      fontSize: theme.fontSizes.xs,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.primary,
      marginBottom: theme.spacing.xxs,
    },
    messageText: { fontSize: theme.fontSizes.md, color: theme.colors.textPrimary },
    messageTextOwn: { color: theme.colors.onPrimary },
    time: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xxs,
      alignSelf: 'flex-end',
    },
    timeOwn: { color: theme.colors.onPrimary, opacity: 0.7 },
    errorText: {
      fontSize: theme.fontSizes.xs,
      color: theme.colors.danger,
      textAlign: 'center',
      marginBottom: 4,
    },
  });
}
