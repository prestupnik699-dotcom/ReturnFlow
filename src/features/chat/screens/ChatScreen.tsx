import { useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { Text } from '@/components/AppText';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTabBarClearance } from '@/hooks/useTabBarClearance';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
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
  const tabBarClearance = useTabBarClearance();
  const keyboardVisible = useKeyboardVisible();
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const profile = useAuthStore((state) => state.profile);
  const hasModeratorRole = useHasRole(['Owner', 'Administrator']);
  const markChatRead = useMarkChatNotificationsRead();
  const { data: storeName } = useStoreName(activeStoreId);
  const { data: roomId } = useChatRoom();
  const { data: messages, isLoading } = useChatMessages(roomId ?? null);
  const sendMutation = useSendChatMessage(roomId ?? '');
  const deleteMutation = useDeleteChatMessage(roomId ?? null);
  const clearMutation = useClearChat(roomId ?? null);
  const [text, setText] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ChatMessage | null>(null);
  const [clearConfirmVisible, setClearConfirmVisible] = useState(false);
  const listRef = useRef<FlatList<ListItem>>(null);
  const styles = createStyles(theme);

  const messageCount = messages?.length ?? 0;

  useEffect(() => {
    if (messageCount > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messageCount]);

  // Keep the latest message visible above the keyboard instead of letting
  // it hide behind it the moment the keyboard opens.
  useEffect(() => {
    if (keyboardVisible) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [keyboardVisible]);

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

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!roomId) {
      if (__DEV__) console.error('Chat room not found for active store');
      return;
    }
    setText('');
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
  // calendar day than the one before it — the list is asc-ordered by
  // createdAt already, so a single forward pass is enough.
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

  const listItems: ListItem[] = [];
  let lastDay: string | null = null;
  for (const message of messages ?? []) {
    const day = dayKey(message.createdAt);
    if (day !== lastDay) {
      listItems.push({ kind: 'divider', id: `divider-${day}`, label: dayLabel(message.createdAt) });
      lastDay = day;
    }
    listItems.push({ kind: 'message', id: message.id, message });
  }

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === 'divider') {
      return (
        <View style={styles.dividerRow}>
          <View style={styles.dividerPill}>
            <Text style={styles.dividerText}>{item.label}</Text>
          </View>
        </View>
      );
    }

    const message = item.message;
    const isOwn = message.authorId === profile?.id;
    return (
      <Pressable
        onPress={() => Keyboard.dismiss()}
        onLongPress={() => handleLongPressMessage(message)}
      >
        <Animated.View
          entering={FadeInUp.duration(220)}
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
    <Screen>
      <View style={styles.flex}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
          </Pressable>
          <View style={styles.headerAvatar}>
            <Ionicons name="chatbubbles-outline" size={18} color={theme.colors.primary} />
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
              <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
            </Pressable>
          ) : null}
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={listItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            ListEmptyComponent={
              <EmptyState
                icon="chatbubbles-outline"
                title={t('chat.empty')}
                message={t('chat.emptyMessage')}
              />
            }
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {sendMutation.isError ? (
          <Text style={styles.errorText}>{sendMutation.error.message}</Text>
        ) : null}

        <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
          <View style={[styles.inputRow, { marginBottom: keyboardVisible ? 0 : tabBarClearance }]}>
            <TextInput
              style={styles.input}
              placeholder={t('chat.placeholder')}
              placeholderTextColor={theme.colors.textSecondary}
              value={text}
              onChangeText={setText}
              multiline
            />
            <Pressable
              style={styles.sendButton}
              onPress={handleSend}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                <ActivityIndicator size="small" color={theme.colors.onPrimary} />
              ) : (
                <Ionicons name="arrow-up" size={20} color={theme.colors.onPrimary} />
              )}
            </Pressable>
          </View>
        </KeyboardStickyView>
      </View>

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
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    flex: { flex: 1 },
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
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.background,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      fontSize: theme.fontSizes.md,
      color: theme.colors.textPrimary,
      maxHeight: 100,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
