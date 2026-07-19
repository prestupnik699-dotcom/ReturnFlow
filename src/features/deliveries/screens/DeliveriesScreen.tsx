import { useState } from 'react';
import { View, Text, FlatList, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { useTabBarClearance } from '@/hooks/useTabBarClearance';
import { useDeliveryItems } from '@/features/deliveries/hooks/useDeliveryItems';
import type { DeliveryItem } from '@/features/deliveries/services/deliveries.service';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DeliveriesScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const tabBarClearance = useTabBarClearance();
  const { data: deliveries, isLoading, isError } = useDeliveryItems();
  const [searchInput, setSearchInput] = useState('');
  const styles = createStyles(theme);

  const query = searchInput.trim().toLowerCase();
  const filtered = (deliveries ?? []).filter(
    (d) =>
      !query ||
      d.title.toLowerCase().includes(query) ||
      d.supplierName.toLowerCase().includes(query),
  );

  return (
    <Screen>
      <View style={styles.container}>
        <ScreenHeader title={t('deliveries.title')} onBack={() => router.back()} />

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

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : isError ? (
          <Text style={styles.errorText}>{t('organizations.settings.loadError')}</Text>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            style={styles.flatList}
            contentContainerStyle={[
              styles.list,
              { paddingBottom: tabBarClearance },
              filtered.length === 0 && styles.listEmptyGrow,
            ]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <EmptyState
                  icon="download-outline"
                  title={t('deliveries.empty')}
                  message={t('deliveries.emptyMessage')}
                />
              </View>
            }
            renderItem={({ item, index }: { item: DeliveryItem; index: number }) => (
              <Animated.View entering={FadeInDown.delay(index * 40).duration(220)}>
                <Card>
                  <View style={styles.row}>
                    <View style={styles.iconWrap}>
                      <Ionicons name="download-outline" size={18} color={theme.colors.primary} />
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.title} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {item.supplierName} · ×{item.quantity}
                      </Text>
                    </View>
                    <View style={styles.dateColumn}>
                      {item.pendingSync ? (
                        <Text style={styles.pendingText}>{t('returns.pendingSync')}</Text>
                      ) : null}
                      <Text style={styles.date}>{formatDateTime(item.createdAt)}</Text>
                    </View>
                  </View>
                </Card>
              </Animated.View>
            )}
          />
        )}
      </View>
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    searchInput: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      color: theme.colors.textPrimary,
      fontSize: theme.fontSizes.md,
    },
    errorText: { color: theme.colors.danger, textAlign: 'center' },
    flatList: { flex: 1 },
    list: { gap: theme.spacing.sm },
    listEmptyGrow: { flexGrow: 1 },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: { flex: 1, gap: 2 },
    title: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    meta: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    dateColumn: { alignItems: 'flex-end', gap: 2 },
    date: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
    pendingText: {
      fontSize: theme.fontSizes.xs,
      color: theme.colors.warning,
      fontWeight: theme.fontWeights.medium,
    },
  });
}
