import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';

export type ReturnHistoryEntry = {
  id: string;
  action: string;
  createdAt: string;
  userName: string;
};

type HistoryRow = {
  id: string;
  action: string;
  created_at: string;
  profiles: { first_name: string; last_name: string } | null;
};

export async function fetchReturnHistory(
  returnItemId: string,
): Promise<ServiceResult<ReturnHistoryEntry[]>> {
  const { data, error } = await supabase
    .from('return_history')
    .select('id, action, created_at, profiles(first_name, last_name)')
    .eq('return_item_id', returnItemId)
    .order('created_at', { ascending: false });

  if (error) {
    return fromCaughtError(error, 'FETCH_HISTORY_FAILED');
  }

  const rows = data as unknown as HistoryRow[];

  return {
    success: true,
    data: rows.map((row) => ({
      id: row.id,
      action: row.action,
      createdAt: row.created_at,
      userName: row.profiles ? `${row.profiles.first_name} ${row.profiles.last_name}` : '',
    })),
  };
}
