import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Pressable,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { RequireRole } from '@/components/RequireRole';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import {
  useDeleteSupplier,
  useToggleSupplierFavorite,
} from '@/features/suppliers/hooks/useSupplierMutations';
import { SupplierFormSheet } from '@/features/suppliers/screens/SupplierFormSheet';
import type { Supplier, SupplierSort } from '@/features/suppliers/services/suppliers.service';

const EDIT_ROLES = ['Owner', 'Administrator', 'StoreManager', 'Receiver'] as const;

export function SuppliersScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [searchInput, setSearchInput] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<SupplierSort>('name');
  const { data: allSuppliers, isLoading, isError } = useSuppliers(favoritesOnly, sort);

  const query = searchInput.trim().toLowerCase();
  const suppliers = query
    ? allSuppliers?.filter((s) => s.name.toLowerCase().includes(query))
    : allSuppliers;
  const deleteMutation = useDeleteSupplier();
  const favoriteMutation = useToggleSupplierFavorite();
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const styles = createStyles(theme);

  const handleAdd = () => {
    setEditingId(null);
    setFormVisible(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setFormVisible(true);
  };

  const handleDelete = (supplier: Supplier) => {
    Alert.alert(t('suppliers.deleteConfirmTitle'), t('suppliers.deleteConfirmMessage'), [
      { text: t('organizations.settings.cancelButton'), style: 'cancel' },
      {
        text: t('organizations.settings.deleteConfirmButton'),
        style: 'destructive',
        onPress: () => deleteMutation.mutate(supplier.id),
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>{t('suppliers.title')}</Text>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('suppliers.searchPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={searchInput}
            onChangeText={setSearchInput}
          />
        </View>

        <View style={styles.filterRow}>
          <Pressable style={styles.favoriteToggle} onPress={() => setFavoritesOnly((v) => !v)}>
            <Ionicons
              name={favoritesOnly ? 'star' : 'star-outline'}
              size={18}
              color={theme.colors.warning}
            />
            <Text style={styles.favoriteToggleText}>{t('suppliers.favoritesOnly')}</Text>
          </Pressable>

          <Pressable
            style={styles.sortToggle}
            onPress={() => setSort((s) => (s === 'name' ? 'recent' : 'name'))}
          >
            <Ionicons name="swap-vertical" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.sortToggleText}>
              {sort === 'name' ? t('suppliers.sortByName') : t('suppliers.sortByRecent')}
            </Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : isError ? (
          <Text style={styles.errorText}>{t('organizations.settings.loadError')}</Text>
        ) : (
          <FlatList
            data={suppliers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>{t('suppliers.empty')}</Text>}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(index * 50).duration(250)}>
                <Card>
                  <View style={styles.row}>
                    <Pressable
                      onPress={() =>
                        favoriteMutation.mutate({ supplierId: item.id, favorite: !item.favorite })
                      }
                      hitSlop={8}
                    >
                      <Ionicons
                        name={item.favorite ? 'star' : 'star-outline'}
                        size={20}
                        color={item.favorite ? theme.colors.warning : theme.colors.textSecondary}
                      />
                    </Pressable>

                    <Pressable style={styles.info} onPress={() => handleEdit(item)}>
                      <Text style={styles.name}>{item.name}</Text>
                      {item.contactName || item.phone ? (
                        <Text style={styles.meta}>
                          {[item.contactName, item.phone].filter(Boolean).join(' · ')}
                        </Text>
                      ) : null}
                    </Pressable>

                    <RequireRole roles={[...EDIT_ROLES]}>
                      <Pressable onPress={() => handleDelete(item)} hitSlop={12}>
                        <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                      </Pressable>
                    </RequireRole>
                  </View>
                </Card>
              </Animated.View>
            )}
          />
        )}

        <RequireRole roles={[...EDIT_ROLES]}>
          <Button
            label={t('suppliers.addButton')}
            icon="add"
            onPress={handleAdd}
            style={{ marginBottom: insets.bottom + theme.spacing.lg }}
          />
        </RequireRole>
      </View>

      <SupplierFormSheet
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        supplierId={editingId}
      />
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, gap: theme.spacing.sm },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      paddingHorizontal: theme.spacing.md,
    },
    searchInput: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      color: theme.colors.textPrimary,
      fontSize: theme.fontSizes.md,
    },
    filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    favoriteToggle: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    favoriteToggleText: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    sortToggle: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    sortToggleText: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    list: { gap: theme.spacing.sm, paddingBottom: theme.spacing.md },
    empty: { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.xl },
    errorText: { color: theme.colors.danger, textAlign: 'center' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    info: { flex: 1, gap: 2 },
    name: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    meta: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
  });
}
