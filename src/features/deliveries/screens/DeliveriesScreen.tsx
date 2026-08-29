import { useState } from 'react';
import {
  View,
  FlatList,
  SectionList,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Pressable,
  Modal,
} from 'react-native';
import { Text } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { useBrandedRefreshProps } from '@/components/BrandedRefreshControl';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { useTabBarClearance } from '@/hooks/useTabBarClearance';
import { useDeliveryItems } from '@/features/deliveries/hooks/useDeliveryItems';
import { useDeliveryInvoices } from '@/features/deliveries/hooks/useDeliveryInvoices';
import { DeliveryInvoiceFormSheet } from '@/features/deliveries/components/DeliveryInvoiceFormSheet';
import { FAB } from '@/components/FAB';
import { groupByDate } from '@/features/deliveries/utils/groupByDate';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useExportDeliveryItems } from '@/features/deliveries/hooks/useExportDeliveryItems';
import { SupplierFilterSheet } from '@/features/returns/screens/SupplierFilterSheet';
import { useBulkDeleteDeliveryItems } from '@/features/deliveries/hooks/useBulkDeliveryItemActions';
import { useBulkDeleteDeliveryInvoices } from '@/features/deliveries/hooks/useBulkDeliveryInvoiceActions';
import type { DeliveryItem } from '@/features/deliveries/services/deliveries.service';
import type { DeliveryInvoice } from '@/features/deliveries/services/deliveryInvoices.service';

function formatDatePart(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function formatTimePart(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Tab = 'items' | 'invoices';

// Shared by both tabs — a compact single-line date+time strip that sits
// ABOVE the main card content (not squeezed into the same row as the
// title), so long titles/amounts get the full card width instead of
// competing horizontally with the timestamp.
function DateTimeRow({ iso, theme }: { iso: string; theme: ReturnType<typeof useTheme> }) {
  const styles = createDateTimeStyles(theme);
  return (
    <View style={styles.dateTimeRow}>
      <Feather name="calendar" size={11} color={theme.colors.textSecondary} />
      <Text style={styles.dateTimeText}>{formatDatePart(iso)}</Text>
      <Feather name="clock" size={11} color={theme.colors.textSecondary} style={styles.clockIcon} />
      <Text style={styles.dateTimeText}>{formatTimePart(iso)}</Text>
    </View>
  );
}

function createDateTimeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    dateTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-end',
      gap: 4,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      marginTop: -theme.spacing.xs,
    },
    clockIcon: { marginLeft: 8 },
    dateTimeText: {
      fontSize: theme.fontSizes.xs,
      color: theme.colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
  });
}

export function DeliveriesScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const tabBarClearance = useTabBarClearance();
  const { data: deliveries, isLoading, isError, isRefetching, refetch } = useDeliveryItems();
  const {
    data: invoices,
    isLoading: invoicesLoading,
    isError: invoicesError,
  } = useDeliveryInvoices();
  const refreshProps = useBrandedRefreshProps(isRefetching, refetch);
  const [searchInput, setSearchInput] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('items');
  const [formVisible, setFormVisible] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<DeliveryInvoice | null>(null);
  const bulkDeleteMutation = useBulkDeleteDeliveryItems();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteConfirmVisible, setBulkDeleteConfirmVisible] = useState(false);
  const [supplierFilterId, setSupplierFilterId] = useState<string | null>(null);
  const [supplierFilterVisible, setSupplierFilterVisible] = useState(false);
  const [itemsSort, setItemsSort] = useState<'date' | 'name' | 'quantity'>('date');
  const [exportSheetVisible, setExportSheetVisible] = useState(false);
  const bulkDeleteInvoicesMutation = useBulkDeleteDeliveryInvoices();
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [bulkDeleteInvoicesConfirmVisible, setBulkDeleteInvoicesConfirmVisible] = useState(false);

  const invoiceSelectionMode = selectedInvoiceIds.length > 0;

  const toggleInvoiceSelect = (id: string) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const confirmBulkDeleteInvoices = () => {
    const ids = [...selectedInvoiceIds];
    bulkDeleteInvoicesMutation.mutate(ids, {
      onSuccess: () => {
        setSelectedInvoiceIds([]);
        setBulkDeleteInvoicesConfirmVisible(false);
      },
    });
  };
  const {
    runExport,
    isExporting,
    error: exportError,
  } = useExportDeliveryItems({
    columns: {
      title: t('deliveries.exportColumnTitle'),
      supplier: t('deliveries.exportColumnSupplier'),
      quantity: t('deliveries.exportColumnQuantity'),
      barcode: t('deliveries.exportColumnBarcode'),
      date: t('deliveries.exportColumnDate'),
    },
    reportTitle: t('deliveries.exportReportTitle'),
    totalItemsLabel: t('deliveries.exportTotalItems'),
  });
  const styles = createStyles(theme);

  const selectionMode = selectedIds.length > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const confirmBulkDelete = () => {
    const ids = [...selectedIds];
    bulkDeleteMutation.mutate(ids, {
      onSuccess: () => {
        setSelectedIds([]);
        setBulkDeleteConfirmVisible(false);
      },
    });
  };

  const query = searchInput.trim().toLowerCase();
  const filtered = (deliveries ?? [])
    .filter(
      (d) =>
        !query ||
        d.title.toLowerCase().includes(query) ||
        d.supplierName.toLowerCase().includes(query),
    )
    .filter((d) => !supplierFilterId || d.supplierId === supplierFilterId)
    .sort((a, b) => {
      if (itemsSort === 'name') return a.title.localeCompare(b.title);
      if (itemsSort === 'quantity') return b.quantity - a.quantity;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const sections = groupByDate(filtered);

  const cycleItemsSort = () => {
    setItemsSort((current) =>
      current === 'date' ? 'name' : current === 'name' ? 'quantity' : 'date',
    );
  };

  const itemsSortIcon = itemsSort === 'date' ? 'calendar' : itemsSort === 'name' ? 'type' : 'hash';
  const itemsSortLabel = t(
    `deliveries.sortBy${itemsSort === 'date' ? 'Date' : itemsSort === 'name' ? 'Name' : 'Quantity'}`,
  );

  const handleAddInvoice = () => {
    setEditingInvoice(null);
    setFormVisible(true);
  };

  const handleEditInvoice = (invoice: DeliveryInvoice) => {
    setEditingInvoice(invoice);
    setFormVisible(true);
  };

  return (
    <Screen>
      <View style={styles.container}>
        <ScreenHeader title={t('deliveries.title')} onBack={() => router.back()} />

        <View style={styles.tabRow}>
          <View
            style={[styles.tabChip, activeTab === 'items' && styles.tabChipActive]}
            onTouchEnd={() => setActiveTab('items')}
          >
            <Text style={[styles.tabChipText, activeTab === 'items' && styles.tabChipTextActive]}>
              {t('deliveries.tabItems')}
            </Text>
          </View>
          <View
            style={[styles.tabChip, activeTab === 'invoices' && styles.tabChipActive]}
            onTouchEnd={() => setActiveTab('invoices')}
          >
            <Text
              style={[styles.tabChipText, activeTab === 'invoices' && styles.tabChipTextActive]}
            >
              {t('deliveries.tabInvoices')}
            </Text>
          </View>
        </View>

        {activeTab === 'items' ? (
          <View style={styles.searchFilterRow}>
            <View style={styles.searchRow}>
              <Feather name="search" size={18} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('suppliers.searchPlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                value={searchInput}
                onChangeText={setSearchInput}
              />
            </View>
            <Pressable
              style={[styles.filterButton, supplierFilterId && styles.filterButtonActive]}
              onPress={() => setSupplierFilterVisible(true)}
            >
              <Feather
                name="filter"
                size={18}
                color={supplierFilterId ? theme.colors.primary : theme.colors.textSecondary}
              />
            </Pressable>
            <Pressable style={styles.filterButton} onPress={cycleItemsSort}>
              <Feather name={itemsSortIcon} size={18} color={theme.colors.textSecondary} />
            </Pressable>
            <Pressable style={styles.filterButton} onPress={() => setExportSheetVisible(true)}>
              <Feather name="share" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
        ) : null}

        {activeTab === 'items' ? <Text style={styles.sortLabel}>{itemsSortLabel}</Text> : null}

        {activeTab === 'items' ? (
          isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : isError ? (
            <Text style={styles.errorText}>{t('organizations.settings.loadError')}</Text>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              style={styles.flatList}
              contentContainerStyle={[
                styles.list,
                { paddingBottom: tabBarClearance },
                filtered.length === 0 && styles.listEmptyGrow,
              ]}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl {...refreshProps} />}
              stickySectionHeadersEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <EmptyState
                    icon="download"
                    title={t('deliveries.empty')}
                    message={t('deliveries.emptyMessage')}
                  />
                </View>
              }
              renderSectionHeader={({ section }) => (
                <Text style={styles.sectionHeader}>
                  {section.labelKind === 'today'
                    ? t('deliveries.dateToday')
                    : section.labelKind === 'yesterday'
                      ? t('deliveries.dateYesterday')
                      : formatDatePart(section.dateIso!)}
                </Text>
              )}
              renderItem={({ item, index }: { item: DeliveryItem; index: number }) => (
                <AnimatedListItem index={index} step={40} duration={220}>
                  <Pressable
                    onLongPress={() => !item.pendingSync && toggleSelect(item.id)}
                    onPress={() => selectionMode && !item.pendingSync && toggleSelect(item.id)}
                  >
                    <Card>
                      <View style={styles.row}>
                        {selectionMode ? (
                          <Feather
                            name={selectedIds.includes(item.id) ? 'check-circle' : 'circle'}
                            size={20}
                            color={
                              selectedIds.includes(item.id)
                                ? theme.colors.primary
                                : theme.colors.textSecondary
                            }
                          />
                        ) : (
                          <View style={styles.iconWrap}>
                            <Feather name="download" size={18} color={theme.colors.primary} />
                          </View>
                        )}
                        <View style={styles.info}>
                          <Text style={styles.title} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.meta} numberOfLines={1}>
                            {item.supplierName} · ×{item.quantity}
                          </Text>
                          {item.barcode ? (
                            <View style={styles.barcodeRow}>
                              <Ionicons
                                name="barcode-outline"
                                size={12}
                                color={theme.colors.textSecondary}
                              />
                              <Text style={styles.barcodeText} numberOfLines={1}>
                                {item.barcode}
                              </Text>
                            </View>
                          ) : null}
                          {item.pendingSync ? (
                            <Text style={styles.pendingText}>{t('returns.pendingSync')}</Text>
                          ) : null}
                        </View>
                      </View>
                      <DateTimeRow iso={item.createdAt} theme={theme} />
                    </Card>
                  </Pressable>
                </AnimatedListItem>
              )}
            />
          )
        ) : null}

        {activeTab === 'items' && selectionMode ? (
          <View style={[styles.footerSelectionMode, { paddingBottom: tabBarClearance }]}>
            <View style={styles.bulkBar}>
              <Text style={styles.countText}>
                {t('suppliers.catalog.selectedCount', { count: selectedIds.length })}
              </Text>
              <View style={styles.bulkBarTop}>
                <Pressable style={styles.cancelButton} onPress={() => setSelectedIds([])}>
                  <Text style={styles.cancelText}>{t('suppliers.catalog.cancelSelection')}</Text>
                </Pressable>
                <Pressable
                  style={styles.deleteIconButton}
                  onPress={() => setBulkDeleteConfirmVisible(true)}
                  hitSlop={8}
                >
                  <Feather name="trash-2" size={16} color={theme.colors.danger} />
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        {activeTab === 'invoices' ? (
          invoicesLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : invoicesError ? (
            <Text style={styles.errorText}>{t('organizations.settings.loadError')}</Text>
          ) : (
            <FlatList
              data={invoices ?? []}
              keyExtractor={(item) => item.id}
              style={styles.flatList}
              contentContainerStyle={[
                styles.list,
                { paddingBottom: tabBarClearance },
                (invoices ?? []).length === 0 && styles.listEmptyGrow,
              ]}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <EmptyState
                    icon="file-text"
                    title={t('deliveries.invoice.empty')}
                    message={t('deliveries.invoice.emptyMessage')}
                  />
                </View>
              }
              renderItem={({ item, index }: { item: DeliveryInvoice; index: number }) => (
                <AnimatedListItem index={index} step={40} duration={220}>
                  <Pressable
                    onLongPress={() => toggleInvoiceSelect(item.id)}
                    onPress={() =>
                      invoiceSelectionMode ? toggleInvoiceSelect(item.id) : handleEditInvoice(item)
                    }
                  >
                    <Card>
                      <View style={styles.row}>
                        {invoiceSelectionMode ? (
                          <Feather
                            name={selectedInvoiceIds.includes(item.id) ? 'check-circle' : 'circle'}
                            size={20}
                            color={
                              selectedInvoiceIds.includes(item.id)
                                ? theme.colors.primary
                                : theme.colors.textSecondary
                            }
                          />
                        ) : (
                          <View style={styles.iconWrap}>
                            <Feather name="file-text" size={18} color={theme.colors.primary} />
                          </View>
                        )}
                        <View style={styles.info}>
                          <Text style={styles.title} numberOfLines={1}>
                            {item.distributorName}
                          </Text>
                          <Text style={styles.meta} numberOfLines={1}>
                            {t('deliveries.invoice.numberPrefix')} {item.invoiceNumber}
                            {item.totalAmount != null ? ` · ${item.totalAmount}₾` : ''}
                          </Text>
                          <View style={styles.barcodeRow}>
                            <Feather
                              name={item.hasSignature ? 'check-circle' : 'circle'}
                              size={12}
                              color={
                                item.hasSignature
                                  ? theme.colors.success
                                  : theme.colors.textSecondary
                              }
                            />
                            <Text style={styles.barcodeText}>
                              {item.hasSignature
                                ? t('deliveries.invoice.hasSignature')
                                : t('deliveries.invoice.noSignature')}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <DateTimeRow iso={item.receivedAt} theme={theme} />
                    </Card>
                  </Pressable>
                </AnimatedListItem>
              )}
            />
          )
        ) : null}

        {activeTab === 'invoices' && invoiceSelectionMode ? (
          <View style={[styles.footerSelectionMode, { paddingBottom: tabBarClearance }]}>
            <View style={styles.bulkBar}>
              <Text style={styles.countText}>
                {t('suppliers.catalog.selectedCount', { count: selectedInvoiceIds.length })}
              </Text>
              <View style={styles.bulkBarTop}>
                <Pressable style={styles.cancelButton} onPress={() => setSelectedInvoiceIds([])}>
                  <Text style={styles.cancelText}>{t('suppliers.catalog.cancelSelection')}</Text>
                </Pressable>
                <Pressable
                  style={styles.deleteIconButton}
                  onPress={() => setBulkDeleteInvoicesConfirmVisible(true)}
                  hitSlop={8}
                >
                  <Feather name="trash-2" size={16} color={theme.colors.danger} />
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        {activeTab === 'invoices' && !invoiceSelectionMode ? (
          <FAB
            onPress={handleAddInvoice}
            style={[styles.fab, { bottom: tabBarClearance + theme.spacing.md }]}
          />
        ) : null}
      </View>

      <DeliveryInvoiceFormSheet
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        existingInvoice={editingInvoice}
      />

      <ConfirmDialog
        visible={bulkDeleteConfirmVisible}
        title={t('deliveries.bulkDeleteConfirmTitle', { count: selectedIds.length })}
        message={t('deliveries.deleteConfirmMessage')}
        confirmLabel={t('organizations.settings.deleteConfirmButton')}
        cancelLabel={t('organizations.settings.cancelButton')}
        destructive
        loading={bulkDeleteMutation.isPending}
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkDeleteConfirmVisible(false)}
      />

      <ConfirmDialog
        visible={bulkDeleteInvoicesConfirmVisible}
        title={t('deliveries.bulkDeleteConfirmTitle', { count: selectedInvoiceIds.length })}
        message={t('deliveries.deleteConfirmMessage')}
        confirmLabel={t('organizations.settings.deleteConfirmButton')}
        cancelLabel={t('organizations.settings.cancelButton')}
        destructive
        loading={bulkDeleteInvoicesMutation.isPending}
        onConfirm={confirmBulkDeleteInvoices}
        onCancel={() => setBulkDeleteInvoicesConfirmVisible(false)}
      />

      <SupplierFilterSheet
        visible={supplierFilterVisible}
        onClose={() => setSupplierFilterVisible(false)}
        selectedSupplierId={supplierFilterId}
        onSelect={setSupplierFilterId}
        titleKey="deliveries.filterBySupplier"
      />

      <Modal
        visible={exportSheetVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setExportSheetVisible(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setExportSheetVisible(false)}>
          <Pressable style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>{t('deliveries.exportTitle')}</Text>
            <Pressable
              style={styles.sheetOption}
              disabled={isExporting !== null}
              onPress={() => {
                setExportSheetVisible(false);
                runExport(filtered, 'csv');
              }}
            >
              {isExporting === 'csv' ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Feather name="grid" size={20} color={theme.colors.primary} />
              )}
              <Text style={styles.sheetOptionText}>{t('deliveries.exportCsv')}</Text>
            </Pressable>
            <Pressable
              style={styles.sheetOption}
              disabled={isExporting !== null}
              onPress={() => {
                setExportSheetVisible(false);
                runExport(filtered, 'pdf');
              }}
            >
              {isExporting === 'pdf' ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Feather name="file-text" size={20} color={theme.colors.primary} />
              )}
              <Text style={styles.sheetOptionText}>{t('deliveries.exportPdf')}</Text>
            </Pressable>
            <Pressable style={styles.sheetCancel} onPress={() => setExportSheetVisible(false)}>
              <Text style={styles.sheetCancelText}>{t('organizations.settings.cancelButton')}</Text>
            </Pressable>
            {exportError ? (
              <Text style={styles.exportErrorText}>
                {exportError === 'EMPTY'
                  ? t('deliveries.exportEmpty')
                  : t('deliveries.exportFailed')}
              </Text>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tabRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
    tabChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tabChipActive: {
      backgroundColor: theme.colors.primary + '15',
      borderColor: theme.colors.primary,
    },
    tabChipText: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.textSecondary,
    },
    tabChipTextActive: { color: theme.colors.primary, fontWeight: theme.fontWeights.semiBold },
    fab: { position: 'absolute', right: 0 },
    searchRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
    },
    searchInput: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      color: theme.colors.textPrimary,
      fontSize: theme.fontSizes.md,
    },
    searchFilterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    filterButton: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterButtonActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '15',
    },
    sortLabel: {
      fontSize: theme.fontSizes.xs,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
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
    barcodeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    barcodeText: {
      fontSize: theme.fontSizes.xs,
      color: theme.colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    pendingText: {
      fontSize: theme.fontSizes.xs,
      color: theme.colors.warning,
      fontWeight: theme.fontWeights.medium,
    },
    footerSelectionMode: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      paddingTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
    },
    bulkBar: { gap: theme.spacing.sm },
    bulkBarTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
    },
    cancelButton: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 8,
    },
    cancelText: {
      color: theme.colors.textPrimary,
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.medium,
    },
    countText: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      textAlign: 'center',
    },
    deleteIconButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheetCard: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.radius.lg,
      borderTopRightRadius: theme.radius.lg,
      padding: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    sheetTitle: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    sheetOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    sheetOptionText: { fontSize: theme.fontSizes.md, color: theme.colors.textPrimary },
    sheetCancel: {
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      marginTop: theme.spacing.xs,
    },
    sheetCancelText: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.textSecondary,
    },
    exportErrorText: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.danger,
      textAlign: 'center',
      marginTop: theme.spacing.xs,
    },
    sectionHeader: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textSecondary,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xs,
    },
  });
}
