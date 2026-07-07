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
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { RequireRole } from '@/components/RequireRole';
import { useStores } from '@/features/stores/hooks/useStores';
import { useDeleteStore } from '@/features/stores/hooks/useDeleteStore';
import { CreateStoreSheet } from '@/features/stores/screens/CreateStoreSheet';
import type { Store } from '@/features/stores/services/stores.service';

export function StoresScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: stores, isLoading, isError } = useStores();
  const deleteMutation = useDeleteStore();
  const [createVisible, setCreateVisible] = useState(false);
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

        {isError ? (
          <Text style={styles.errorText}>{t('organizations.settings.loadError')}</Text>
        ) : (
          <FlatList
            data={stores}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>{t('stores.empty')}</Text>}
            renderItem={({ item }) => (
              <Card>
                <View style={styles.storeRow}>
                  <View style={styles.storeInfo}>
                    <Text style={styles.storeName}>{item.name}</Text>
                    {item.city ? <Text style={styles.storeMeta}>{item.city}</Text> : null}
                  </View>
                  <RequireRole roles={['Owner', 'Administrator']}>
                    <Pressable onPress={() => handleDelete(item)} hitSlop={12}>
                      <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                    </Pressable>
                  </RequireRole>
                </View>
              </Card>
            )}
          />
        )}

        <RequireRole roles={['Owner', 'Administrator']}>
          <Button label={t('stores.addButton')} icon="add" onPress={() => setCreateVisible(true)} />
        </RequireRole>
      </View>

      <CreateStoreSheet visible={createVisible} onClose={() => setCreateVisible(false)} />
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, gap: theme.spacing.md },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    list: { gap: theme.spacing.sm, paddingBottom: theme.spacing.md },
    empty: { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.xl },
    errorText: { color: theme.colors.danger, textAlign: 'center' },
    storeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.lg,
    },
    storeInfo: { gap: 2 },
    storeName: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    storeMeta: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
  });
}
