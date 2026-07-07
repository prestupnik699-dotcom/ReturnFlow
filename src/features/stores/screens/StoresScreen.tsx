import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Pressable,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { RequireRole } from '@/components/RequireRole';
import { useStores } from '@/features/stores/hooks/useStores';
import { useDeleteStore } from '@/features/stores/hooks/useDeleteStore';
import { StoreFormSheet } from '@/features/stores/screens/StoreFormSheet';
import { useMembershipStore } from '@/stores/membership.store';
import type { Store } from '@/features/stores/services/stores.service';

export function StoresScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data: stores, isLoading, isError } = useStores();
  const deleteMutation = useDeleteStore();
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const setActiveContext = useMembershipStore((state) => state.setActiveContext);
  const [formVisible, setFormVisible] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const styles = createStyles(theme);

  const handleDelete = (store: Store) => {
    Alert.alert(t('stores.deleteConfirmTitle'), t('stores.deleteConfirmMessage'), [
      { text: t('organizations.settings.cancelButton'), style: 'cancel' },
      {
        text: t('organizations.settings.deleteConfirmButton'),
        style: 'destructive',
        onPress: () => deleteMutation.mutate(store.id),
      },
    ]);
  };

  const handleAdd = () => {
    setEditingStore(null);
    setFormVisible(true);
  };

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    setFormVisible(true);
  };

  const handleSelectActive = (store: Store) => {
    setActiveContext(activeOrganizationId, store.id);
  };

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>{t('stores.title')}</Text>
        <Text style={styles.hint}>{t('stores.activeStoreHint')}</Text>

        {isError ? (
          <Text style={styles.errorText}>{t('organizations.settings.loadError')}</Text>
        ) : (
          <FlatList
            data={stores}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>{t('stores.empty')}</Text>}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(index * 60).duration(300)}>
                <Card>
                  <View style={styles.storeRow}>
                    <Pressable onPress={() => handleSelectActive(item)} hitSlop={8}>
                      <Ionicons
                        name={activeStoreId === item.id ? 'radio-button-on' : 'radio-button-off'}
                        size={22}
                        color={
                          activeStoreId === item.id
                            ? theme.colors.primary
                            : theme.colors.textSecondary
                        }
                      />
                    </Pressable>

                    <Pressable style={styles.storeInfo} onPress={() => handleEdit(item)}>
                      <Text style={styles.storeName}>{item.name}</Text>
                      {item.city ? <Text style={styles.storeMeta}>{item.city}</Text> : null}
                    </Pressable>

                    <RequireRole roles={['Owner', 'Administrator']}>
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

        <RequireRole roles={['Owner', 'Administrator']}>
          <Button
            label={t('stores.addButton')}
            icon="add"
            onPress={handleAdd}
            style={{ marginBottom: insets.bottom + theme.spacing.lg }}
          />
        </RequireRole>
      </View>

      <StoreFormSheet
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        store={editingStore}
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
    hint: {
      fontSize: theme.fontSizes.xs,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    list: { gap: theme.spacing.sm, paddingBottom: theme.spacing.md },
    empty: { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.xl },
    errorText: { color: theme.colors.danger, textAlign: 'center' },
    storeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    storeInfo: { flex: 1, gap: 2 },
    storeName: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    storeMeta: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
  });
}
