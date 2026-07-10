import { useState } from 'react';
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
import { useTabBarClearance } from '@/hooks/useTabBarClearance';
import { useChatRoom } from '@/features/chat/hooks/useChatRoom';
import { useChatMessages } from '@/features/chat/hooks/useChatMessages';
import { useSendChatMessage } from '@/features/chat/hooks/useSendChatMessage';
import { useAuthStore } from '@/stores/auth.store';
import { useMembershipStore } from '@/stores/membership.store';
import type { ChatMessage } from '@/features/chat/services/chat.service';

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ChatScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const tabBarClearance = useTabBarClearance();
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const profile = useAuthStore((state) => state.profile);
  const { data: roomId } = useChatRoom();
  const { data: messages, isLoading } = useChatMessages(roomId ?? null);
  const sendMutation = useSendChatMessage(roomId ?? '');
  const [text, setText] = useState('');
  const styles = createStyles(theme);

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
    if (!trimmed || !roomId) return;
    setText('');
    sendMutation.mutate(trimmed);
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.authorId === profile?.id;
    return (
      <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
          {!isOwn ? <Text style={styles.author}>{item.authorName}</Text> : null}
          <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>{item.message}</Text>
          <Text style={[styles.time, isOwn && styles.timeOwn]}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.title}>{t('chat.title')}</Text>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={[...(messages ?? [])].reverse()}
            inverted
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<EmptyState icon="chatbubbles-outline" title={t('chat.empty')} />}
          />
        )}

        <View style={[styles.inputRow, { marginBottom: tabBarClearance }]}>
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
            <Ionicons name="arrow-up" size={20} color={theme.colors.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    flex: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    noStoreText: { color: theme.colors.textSecondary, textAlign: 'center' },
    title: {
      fontSize: theme.fontSizes['2xl'],
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
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
