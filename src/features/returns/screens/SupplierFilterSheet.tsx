import { Modal, View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Chip } from '@/components/Chip';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';

type Props = {
  visible: boolean;
  onClose: () => void;
  selectedSupplierId: string | null;
  onSelect: (supplierId: string | null) => void;
  // Defaults to the returns-screen wording so every existing call site
  // (unaware of this prop) keeps behaving exactly as before.
  titleKey?: string;
};

export function SupplierFilterSheet({
  visible,
  onClose,
  selectedSupplierId,
  onSelect,
  titleKey = 'returns.filterBySupplier',
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: suppliers } = useSuppliers(false, 'name');
  const styles = createStyles(theme);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{t(titleKey)}</Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
              <Feather name="x" size={20} color={theme.colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            <Chip
              label={t('returns.statusAll')}
              selected={selectedSupplierId === null}
              onPress={() => {
                onSelect(null);
                onClose();
              }}
            />
            {(suppliers ?? []).map((s) => (
              <Chip
                key={s.id}
                label={s.name}
                selected={selectedSupplierId === s.id}
                onPress={() => {
                  onSelect(s.id);
                  onClose();
                }}
              />
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.xl },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    list: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  });
}
