import { memo, useState } from 'react';
import { View, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Icon } from '@/components/Icon';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  onSend: (text: string) => void;
  sending: boolean;
};

// Owns its own `text` state, isolated from ChatScreen entirely — every
// keystroke used to live in ChatScreen's state, which re-rendered the
// whole message list (and its FadeInUp-animated bubbles) on every single
// character. That heavy re-render competing with the keyboard's own
// UI-thread animation was what made typed characters appear to freeze
// until the keyboard finished animating. Moving `text` down here means a
// keystroke only re-renders this small bar, never the message list.
function ChatInputBarInner({ onSend, sending }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const styles = createStyles(theme);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    onSend(trimmed);
  };

  return (
    <View style={[styles.inputRow, { paddingBottom: theme.spacing.sm }]}>
      <TextInput
        nativeID="chat-input"
        style={styles.input}
        placeholder={t('chat.placeholder')}
        placeholderTextColor={theme.colors.textSecondary}
        value={text}
        onChangeText={setText}
        multiline
      />
      <Pressable style={styles.sendButton} onPress={handleSend} disabled={sending}>
        {sending ? (
          <ActivityIndicator size="small" color={theme.colors.onPrimary} />
        ) : (
          <Icon name="arrow-up" size={20} color={theme.colors.onPrimary} />
        )}
      </Pressable>
    </View>
  );
}

export const ChatInputBar = memo(ChatInputBarInner);

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
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
