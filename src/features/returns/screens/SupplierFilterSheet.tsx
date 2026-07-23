import { Modal, View, ScrollView, Pressable, StyleSheet } from 'react-native';
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
};

export function SupplierFilterSheet({ visible, onClose, selectedSupplierId, onSelect }: Props) {
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
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('returns.filterBySupplier')}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={22} color={theme.colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.list}>
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
    </Modal>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.xl },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    title: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    list: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  });
}
