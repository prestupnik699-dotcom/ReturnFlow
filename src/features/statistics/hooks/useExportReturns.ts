import { useState } from 'react';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  fetchReturnsForExport,
  generateReturnsCsv,
  generateReturnsHtml,
  type ExportLabels,
} from '@/features/statistics/services/export.service';

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

      if (format === 'csv') {
        const csv = generateReturnsCsv(result.data, labels);
        const file = new File(Paths.cache, `returnflow-export-${Date.now()}.csv`);
        file.write(csv);
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        const html = generateReturnsHtml(result.data, labels);
        const { uri } = await Print.printToFileAsync({ html });

        // expo-print writes to a location expo-sharing can't always read
        // directly on Android ("Not allowed to read file under given URL").
        // Copying into our own cache directory — the same one CSV already
        // shares from successfully — fixes it.
        const sourceFile = new File(uri);
        const destination = new File(Paths.cache, `returnflow-export-${Date.now()}.pdf`);
        sourceFile.copy(destination);

        await Sharing.shareAsync(destination.uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
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
