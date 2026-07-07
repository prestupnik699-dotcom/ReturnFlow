import { getDatabase } from '@/lib/database';

export type SyncOperationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type SyncOperation = {
  id: string;
  operation: string;
  payload: unknown;
  status: SyncOperationStatus;
  retryCount: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

type SyncOperationRow = {
  id: string;
  operation: string;
  payload: string;
  status: SyncOperationStatus;
  retry_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export async function enqueueOperation(operation: string, payload: unknown): Promise<string> {
  const db = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO sync_queue (id, operation, payload, status, retry_count, created_at, updated_at)
     VALUES (?, ?, ?, 'pending', 0, ?, ?)`,
    [id, operation, JSON.stringify(payload), now, now],
  );

  return id;
}

export async function getPendingOperations(): Promise<SyncOperation[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SyncOperationRow>(
    `SELECT * FROM sync_queue WHERE status IN ('pending', 'failed') ORDER BY created_at ASC`,
  );

  return rows.map(mapRow);
}

export async function markOperationStatus(
  id: string,
  status: SyncOperationStatus,
  errorMessage: string | null = null,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE sync_queue SET status = ?, error_message = ?, updated_at = ? WHERE id = ?`,
    [status, errorMessage, new Date().toISOString(), id],
  );
}

export async function incrementRetryCount(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE sync_queue SET retry_count = retry_count + 1, updated_at = ? WHERE id = ?`,
    [new Date().toISOString(), id],
  );
}

export async function removeOperation(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [id]);
}

function mapRow(row: SyncOperationRow): SyncOperation {
  return {
    id: row.id,
    operation: row.operation,
    payload: JSON.parse(row.payload) as unknown,
    status: row.status,
    retryCount: row.retry_count,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
