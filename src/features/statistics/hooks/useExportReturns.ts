import { useState } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  fetchReturnsForExport,
  generateReturnsCsv,
  generateReturnsHtml,
  type ExportLabels,
} from '@/features/statistics/services/export.service';

async function saveOnAndroid(
  base64OrText: string,
  filename: string,
  mimeType: string,
  isBase64: boolean,
): Promise<void> {
  const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

  if (!permissions.granted) {
    throw new Error('PERMISSION_DENIED');
  }

  const destinationUri = await FileSystem.StorageAccessFramework.createFileAsync(
    permissions.directoryUri,
    filename,
    mimeType,
  );

  await FileSystem.writeAsStringAsync(destinationUri, base64OrText, {
    encoding: isBase64 ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8,
  });
}

export function useExportReturns(
  storeId: string | null,
  sinceIso: string | null,
  labels: ExportLabels,
) {
  const [isExporting, setIsExporting] = useState<'csv' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runExport = async (format: 'csv' | 'pdf') => {
    if (!storeId) return;
    setError(null);
    setIsExporting(format);

    try {
      const result = await fetchReturnsForExport(storeId, sinceIso);
      if (!result.success) throw new Error(result.error.message);

      if (result.data.length === 0) {
        throw new Error('EMPTY');
      }

      const filename = `returnflow-export-${Date.now()}.${format}`;
      const mimeType = format === 'csv' ? 'text/csv' : 'application/pdf';

      if (format === 'csv') {
        const csv = generateReturnsCsv(result.data, labels);
        const localUri = FileSystem.cacheDirectory + filename;
        await FileSystem.writeAsStringAsync(localUri, csv, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (Platform.OS === 'android') {
          await saveOnAndroid(csv, filename, mimeType, false);
        } else {
          await Sharing.shareAsync(localUri, {
            mimeType,
            UTI: 'public.comma-separated-values-text',
          });
        }
      } else {
        const html = generateReturnsHtml(result.data, labels);
        // Getting the PDF content directly as base64 avoids ever needing to
        // read back expo-print's own temp file — that location isn't
        // reliably readable by other modules, especially in Expo Go.
        const printResult = await Print.printToFileAsync({ html, base64: true });

        if (!printResult.base64) {
          throw new Error('PDF_GENERATION_FAILED');
        }

        if (Platform.OS === 'android') {
          await saveOnAndroid(printResult.base64, filename, mimeType, true);
        } else {
          await Sharing.shareAsync(printResult.uri, { mimeType, UTI: 'com.adobe.pdf' });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsExporting(null);
    }
  };

  return { runExport, isExporting, error };
}
