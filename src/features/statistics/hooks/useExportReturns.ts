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

// Everything here deliberately uses the SAME (legacy) file system module
// throughout — mixing it with the newer File/Paths API caused the two to
// disagree about where a just-written file actually lives, producing a
// FileNotFoundException when the SAF save step tried to read it back.
async function saveOnAndroid(sourceUri: string, filename: string, mimeType: string): Promise<void> {
  const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

  if (!permissions.granted) {
    throw new Error('PERMISSION_DENIED');
  }

  const base64 = await FileSystem.readAsStringAsync(sourceUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const destinationUri = await FileSystem.StorageAccessFramework.createFileAsync(
    permissions.directoryUri,
    filename,
    mimeType,
  );

  await FileSystem.writeAsStringAsync(destinationUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
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
      const localUri = FileSystem.cacheDirectory + filename;

      if (format === 'csv') {
        const csv = generateReturnsCsv(result.data, labels);
        await FileSystem.writeAsStringAsync(localUri, csv, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      } else {
        const html = generateReturnsHtml(result.data, labels);
        const { uri } = await Print.printToFileAsync({ html });
        await FileSystem.copyAsync({ from: uri, to: localUri });
      }

      if (Platform.OS === 'android') {
        await saveOnAndroid(localUri, filename, mimeType);
      } else {
        await Sharing.shareAsync(localUri, {
          mimeType,
          UTI: format === 'csv' ? 'public.comma-separated-values-text' : 'com.adobe.pdf',
        });
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
