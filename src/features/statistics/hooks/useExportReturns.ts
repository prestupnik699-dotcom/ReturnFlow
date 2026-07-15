import { useState } from 'react';
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  fetchReturnsForExport,
  generateReturnsCsv,
  generateReturnsHtml,
  type ExportLabels,
} from '@/features/statistics/services/export.service';

// Android has no shared "Downloads" concept reachable via a plain share
// sheet the way iOS's "Save to Files" is — it needs the Storage Access
// Framework, which pops a real folder picker (the user can choose
// Downloads) and writes the file there directly.
async function saveOnAndroid(sourceUri: string, filename: string, mimeType: string): Promise<void> {
  const permissions =
    await LegacyFileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

  if (!permissions.granted) {
    throw new Error('PERMISSION_DENIED');
  }

  const base64 = await LegacyFileSystem.readAsStringAsync(sourceUri, {
    encoding: LegacyFileSystem.EncodingType.Base64,
  });

  const destinationUri = await LegacyFileSystem.StorageAccessFramework.createFileAsync(
    permissions.directoryUri,
    filename,
    mimeType,
  );

  await LegacyFileSystem.writeAsStringAsync(destinationUri, base64, {
    encoding: LegacyFileSystem.EncodingType.Base64,
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

      let localUri: string;

      if (format === 'csv') {
        const csv = generateReturnsCsv(result.data, labels);
        const file = new File(Paths.cache, filename);
        file.write(csv);
        localUri = file.uri;
      } else {
        const html = generateReturnsHtml(result.data, labels);
        const { uri } = await Print.printToFileAsync({ html });
        const destination = new File(Paths.cache, filename);
        new File(uri).copy(destination);
        localUri = destination.uri;
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
