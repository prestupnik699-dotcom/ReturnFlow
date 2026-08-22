import { useMemo, useState } from 'react';
import {
  Modal,
  View,
  TextInput,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/Button';
import { useCreateCatalogItem } from '@/features/suppliers/hooks/useCatalogMutations';
import { hapticSuccess } from '@/lib/haptics';

type ParsedLine = { name: string; price: number | null };

// Matches a trailing number on the line — separated from the name by a
// tab, comma, dash, em-dash, or plain whitespace — as an optional price.
// A line with no such trailing number is treated as a name-only entry.
// This handles both plain lists ("Domestos 1000ml") and price lists
// ("Domestos 1000ml - 12.50" / "Domestos 1000ml\t12.50") without asking
// the person to pick a format up front.
const PRICE_LINE_PATTERN = /^(.+?)[\s\t,;\-—]+(\d+(?:[.,]\d+)?)\s*$/;

function parseLines(raw: string): ParsedLine[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const match = line.match(PRICE_LINE_PATTERN);
      if (match && match[1] && match[2]) {
        const name = match[1].trim();
        const price = parseFloat(match[2].replace(',', '.'));
        if (name && !isNaN(price)) {
          return { name, price };
        }
      }
      return { name: line, price: null };
    });
}

type Props = {
  visible: boolean;
  onClose: () => void;
  supplierId: string;
};

export function CatalogImportSheet({ visible, onClose, supplierId }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const createMutation = useCreateCatalogItem(supplierId);
  const [rawText, setRawText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const styles = createStyles(theme);

  const parsedLines = useMemo(() => parseLines(rawText), [rawText]);

  const handleClose = () => {
    setRawText('');
    setImportedCount(0);
    onClose();
  };

  // Sequential, not Promise.all — importing 30+ items at once in parallel
  // risks overwhelming the request queue and makes a mid-import failure
  // (e.g. connection drops halfway through) impossible to reason about.
  // One at a time is slower but every success is immediately reflected
  // in importedCount, so the person can see real progress on a long list.
  const handleImport = async () => {
    setIsImporting(true);
    setImportedCount(0);

    for (const line of parsedLines) {
      try {
        await createMutation.mutateAsync({
          name: line.name,
          defaultPrice: line.price,
          barcode: null,
        });
        setImportedCount((count) => count + 1);
      } catch {
        // Continue importing the rest of the list even if one line
        // fails — better to get 29 of 30 items in than to abandon the
        // whole batch over a single bad row.
      }
    }

    setIsImporting(false);
    hapticSuccess();
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('suppliers.catalog.importTitle')}</Text>
            <Feather
              name="x"
              size={22}
              color={theme.colors.textPrimary}
              onPress={handleClose}
              suppressHighlighting
            />
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.hint}>{t('suppliers.catalog.importHint')}</Text>

            <TextInput
              style={styles.textArea}
              value={rawText}
              onChangeText={setRawText}
              placeholder={t('suppliers.catalog.importPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              textAlignVertical="top"
            />

            {parsedLines.length > 0 ? (
              <View style={styles.previewSection}>
                <Text style={styles.previewTitle}>
                  {t('suppliers.catalog.importPreviewCount', { count: parsedLines.length })}
                </Text>
                {parsedLines.slice(0, 8).map((line, index) => (
                  <View key={index} style={styles.previewRow}>
                    <Text style={styles.previewName} numberOfLines={1}>
                      {line.name}
                    </Text>
                    {line.price != null ? (
                      <Text style={styles.previewPrice}>{line.price}</Text>
                    ) : null}
                  </View>
                ))}
                {parsedLines.length > 8 ? (
                  <Text style={styles.previewMore}>
                    {t('suppliers.catalog.importPreviewMore', { count: parsedLines.length - 8 })}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {isImporting ? (
              <Text style={styles.progressText}>
                {t('suppliers.catalog.importProgress', {
                  done: importedCount,
                  total: parsedLines.length,
                })}
              </Text>
            ) : null}

            <Button
              label={t('suppliers.catalog.importButton')}
              onPress={handleImport}
              loading={isImporting}
              disabled={parsedLines.length === 0}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    flex: { flex: 1 },
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.md,
    },
    title: {
      fontSize: theme.fontSizes.lg,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    content: { padding: theme.spacing.xl, gap: theme.spacing.md },
    hint: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    textArea: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textPrimary,
      minHeight: 160,
    },
    previewSection: {
      gap: 4,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    previewTitle: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    previewRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    previewName: { flex: 1, fontSize: theme.fontSizes.sm, color: theme.colors.textPrimary },
    previewPrice: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    previewMore: {
      fontSize: theme.fontSizes.xs,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    progressText: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.primary,
      textAlign: 'center',
    },
  });
}
