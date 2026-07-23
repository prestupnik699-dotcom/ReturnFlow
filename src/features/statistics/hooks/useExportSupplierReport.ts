import { useState } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  fetchReturnsForSupplierExport,
  generateSupplierDefectReportHtml,
  type SupplierReportLabels,
} from '@/features/statistics/services/export.service';

async function saveOnAndroid(base64: string, filename: string): Promise<void> {
  const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permissions.granted) {
    throw new Error('PERMISSION_DENIED');
  }
  const destinationUri = await FileSystem.StorageAccessFramework.createFileAsync(
    permissions.directoryUri,
    filename,
    'application/pdf',
  );
  await FileSystem.writeAsStringAsync(destinationUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

type SummaryInput = {
  deliveredQuantity: number;
  returnedQuantity: number;
  defectRatePercent: number | null;
};

export function useExportSupplierReport(
  organizationId: string | null,
  supplierId: string | null,
  supplierName: string,
  summary: SummaryInput | null,
  labels: SupplierReportLabels,
) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runExport = async () => {
    if (!organizationId || !supplierId || !summary) return;
    setError(null);
    setIsExporting(true);

    try {
      const result = await fetchReturnsForSupplierExport(organizationId, supplierId);
      if (!result.success) throw new Error(result.error.message);

      if (result.data.length === 0) {
        throw new Error('EMPTY');
      }

      const html = generateSupplierDefectReportHtml(supplierName, summary, result.data, labels);
      const printResult = await Print.printToFileAsync({ html, base64: true });

      if (!printResult.base64) {
        throw new Error('PDF_GENERATION_FAILED');
      }

      const filename = `${supplierName.replace(/[^a-zA-Z0-9а-яА-Я ]/g, '')}-report-${Date.now()}.pdf`;

      if (Platform.OS === 'android') {
        await saveOnAndroid(printResult.base64, filename);
      } else {
        await Sharing.shareAsync(printResult.uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsExporting(false);
    }
  };

  return { runExport, isExporting, error };
}
