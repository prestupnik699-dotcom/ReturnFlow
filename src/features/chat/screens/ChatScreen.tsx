import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
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
import type { ChatMessage } from '@/features/chat/services/chat.service';
import Animated, { FadeInUp } from 'react-native-reanimated';

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ChatScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const tabBarClearance = useTabBarClearance();
  const keyboardVisible = useKeyboardVisible();
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const profile = useAuthStore((state) => state.profile);
  const hasModeratorRole = useHasRole(['Owner', 'Administrator']);
  const { data: storeName } = useStoreName(activeStoreId);
  const { data: roomId } = useChatRoom();
  const { data: messages, isLoading } = useChatMessages(roomId ?? null);
  const sendMutation = useSendChatMessage(roomId ?? '');
  const deleteMutation = useDeleteChatMessage(roomId ?? null);
  const clearMutation = useClearChat(roomId ?? null);
  const [text, setText] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ChatMessage | null>(null);
  const [clearConfirmVisible, setClearConfirmVisible] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const styles = createStyles(theme);

  const messageCount = messages?.length ?? 0;

  useEffect(() => {
    if (messageCount > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messageCount]);

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

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.authorId === profile?.id;
    return (
      <Pressable onLongPress={() => handleLongPressMessage(item)}>
        <Animated.View
          entering={FadeInUp.duration(220)}
          style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}
        >
          <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
            {!isOwn ? <Text style={styles.author}>{item.authorName}</Text> : null}
            <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>{item.message}</Text>
            <Text style={[styles.time, isOwn && styles.timeOwn]}>{formatTime(item.createdAt)}</Text>
          </View>
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t('chat.title')}</Text>
            {storeName ? <Text style={styles.subtitle}>{storeName}</Text> : null}
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
            data={messages ?? []}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<EmptyState icon="chatbubbles-outline" title={t('chat.empty')} />}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {sendMutation.isError ? (
          <Text style={styles.errorText}>{sendMutation.error.message}</Text>
        ) : null}

        <View
          style={[
            styles.inputRow,
            { marginBottom: keyboardVisible ? theme.spacing.sm : tabBarClearance },
          ]}
        >
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
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
    },
    headerText: { flex: 1 },
    title: {
      fontSize: theme.fontSizes['2xl'],
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    subtitle: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, marginTop: 2 },
    headerIcon: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.danger + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    list: { flexGrow: 1, gap: theme.spacing.xs, paddingVertical: theme.spacing.sm },
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
      marginBottom: 2,
    },
    messageText: { fontSize: theme.fontSizes.md, color: theme.colors.textPrimary },
    messageTextOwn: { color: theme.colors.onPrimary },
    time: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2, alignSelf: 'flex-end' },
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
      paddingTop: theme.spacing.sm,
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
